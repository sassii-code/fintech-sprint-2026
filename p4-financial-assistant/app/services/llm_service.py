import os
import json
from dotenv import load_dotenv
import google.generativeai as genai
from google.api_core.exceptions import DeadlineExceeded, GoogleAPIError
from fastapi import HTTPException

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY not found in environment/.env")

genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-2.5-flash")

LLM_TIMEOUT_SECONDS = 30
CATEGORIZE_BATCH_SIZE = 40

CATEGORIES = [
    "Food", "Rent", "Transport", "Subscriptions", "Income",
    "Shopping", "Utilities", "Entertainment", "Other"
]

def _generate(parts) -> str:
    try:
        response = model.generate_content(
            parts,
            request_options={"timeout": LLM_TIMEOUT_SECONDS}
        )
        return response.text.strip()
    except DeadlineExceeded:
        raise HTTPException(status_code=504, detail="LLM request timed out, please try again")
    except GoogleAPIError as e:
        raise HTTPException(status_code=502, detail=f"LLM service error: {e}")
    except ValueError:
        # response had no usable candidate (e.g. blocked by safety filters)
        raise HTTPException(status_code=502, detail="LLM returned no usable output")

def _strip_markdown_json(result: str) -> str:
    result = result.strip()
    if result.startswith("```"):
        result = result.split("```")[1]
        if result.startswith("json"):
            result = result[4:]
    return result.strip()

def _categorize_batch(rows: list[dict]) -> list[dict]:
    items = [{"description": r["description"], "amount": r["amount"], "type": r["type"]} for r in rows]
    prompt = (
        f"Classify each of these {len(items)} bank transactions into exactly one category from this list: "
        f"{', '.join(CATEGORIES)}.\n\n"
        "Also extract a short, normalized merchant/payee name for each (e.g. 'Amazon', 'Uber', 'Landlord') — "
        "use null if no clear merchant can be identified (e.g. a generic transfer).\n\n"
        "Return ONLY a valid JSON array with exactly one object per transaction, in the same order as the input, "
        'each shaped like {"category": "...", "merchant": "..." | null}. No markdown, no backticks, no commentary.\n\n'
        f"Transactions:\n{json.dumps(items, indent=2)}"
    )

    result = _strip_markdown_json(_generate(prompt))
    try:
        parsed = json.loads(result)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="LLM returned invalid JSON while categorizing transactions")

    if not isinstance(parsed, list) or len(parsed) != len(rows):
        raise HTTPException(status_code=502, detail="LLM returned a mismatched number of categorized transactions")

    for entry in parsed:
        category = entry.get("category") if isinstance(entry, dict) else None
        if category not in CATEGORIES:
            entry["category"] = "Other"

    return parsed

def categorize_transactions(rows: list[dict]) -> list[dict]:
    """Batches large uploads to keep each prompt/response a manageable size."""
    results = []
    for i in range(0, len(rows), CATEGORIZE_BATCH_SIZE):
        chunk = rows[i:i + CATEGORIZE_BATCH_SIZE]
        results.extend(_categorize_batch(chunk))
    return results

def extract_transactions_from_pdf(pdf_bytes: bytes) -> list[dict]:
    """Uses Gemini's native document understanding (the PDF bytes are sent
    directly as a multimodal part, not pre-extracted to text locally) to pull
    transaction line items out of a bank/card statement PDF."""
    prompt = (
        "You are analyzing a bank or credit card statement PDF. Extract every individual "
        "transaction line item you can find in the statement (ignore headers, running "
        "balances, summaries, and marketing content).\n\n"
        "For each transaction, extract:\n"
        "- date: the transaction date, normalized to YYYY-MM-DD\n"
        "- description: the transaction description/merchant text as it appears on the statement\n"
        "- amount: the transaction amount as a positive number (magnitude only — no currency symbols, commas, or minus signs)\n"
        '- type: "income" for money coming in (deposits, credits, refunds, payroll) or "expense" for money going out '
        "(purchases, debits, fees, withdrawals)\n\n"
        'Return ONLY a valid JSON array of objects shaped like {"date": "YYYY-MM-DD", "description": "...", '
        '"amount": 12.34, "type": "income" | "expense"}, in the order they appear in the statement. '
        "No markdown, no backticks, no commentary. If no transactions can be found, return an empty array []."
    )

    result = _strip_markdown_json(_generate([prompt, {"mime_type": "application/pdf", "data": pdf_bytes}]))
    try:
        parsed = json.loads(result)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="LLM returned invalid JSON while extracting transactions from the PDF")

    if not isinstance(parsed, list):
        raise HTTPException(status_code=502, detail="LLM returned an unexpected response shape while extracting transactions from the PDF")

    return parsed

def generate_insights(summary: dict) -> str:
    prompt = (
        "You are a personal finance assistant. Based on this JSON summary of the user's recent transactions "
        "(spending by category, monthly trend, income vs expenses, and any flagged anomalies), write concise, "
        "friendly, actionable financial advice in 3-5 sentences of plain prose. Reference specific numbers "
        "from the summary. No markdown, no bullet points, no headers — just natural language paragraphs.\n\n"
        f"Summary:\n{json.dumps(summary, indent=2, default=str)}"
    )
    return _generate(prompt)

def answer_question(question: str, data: dict) -> dict:
    """Returns {"answerable": bool, "answer": str}. The model is asked to say so
    explicitly when the provided data can't support a confident answer, rather
    than free-text refusals we'd have to guess at parsing."""
    prompt = (
        "You are a personal finance assistant answering a user's question about their own transaction data. "
        "Answer using ONLY the JSON data provided below — never invent numbers, transactions, or trends that "
        "aren't present in it. If the data doesn't contain enough information to answer confidently, set "
        '"answerable" to false and explain what\'s missing instead of guessing.\n\n'
        'Return ONLY a valid JSON object shaped like {"answerable": true | false, "answer": "..."}. '
        "The answer should be plain conversational English, 1-4 sentences, no markdown, no backticks.\n\n"
        f"User's question: {question}\n\n"
        f"Transaction data:\n{json.dumps(data, indent=2, default=str)}"
    )

    result = _strip_markdown_json(_generate(prompt))
    try:
        parsed = json.loads(result)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="LLM returned invalid JSON while answering the question")

    if not isinstance(parsed, dict) or "answer" not in parsed:
        raise HTTPException(status_code=502, detail="LLM returned an unexpected response shape")

    return {"answerable": bool(parsed.get("answerable", True)), "answer": str(parsed["answer"])}

def explain_health_score(score: int, breakdown: dict) -> str:
    prompt = (
        "You are a personal finance assistant. A user's financial health score (0-100) was just computed from "
        "these four weighted components: savings rate, spending consistency, expense-to-income ratio, and "
        "emergency fund buffer (in months of expenses covered). Write a 2-3 sentence explanation of what's "
        "mainly driving their score, plus exactly one specific, actionable suggestion to improve it. "
        "Reference the actual numbers. No markdown, no bullet points, no headers — plain prose only.\n\n"
        f"Score: {score}/100\n"
        f"Breakdown:\n{json.dumps(breakdown, indent=2, default=str)}"
    )
    return _generate(prompt)
