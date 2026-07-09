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

def generate_insights(summary: dict) -> str:
    prompt = (
        "You are a personal finance assistant. Based on this JSON summary of the user's recent transactions "
        "(spending by category, monthly trend, income vs expenses, and any flagged anomalies), write concise, "
        "friendly, actionable financial advice in 3-5 sentences of plain prose. Reference specific numbers "
        "from the summary. No markdown, no bullet points, no headers — just natural language paragraphs.\n\n"
        f"Summary:\n{json.dumps(summary, indent=2, default=str)}"
    )
    return _generate(prompt)
