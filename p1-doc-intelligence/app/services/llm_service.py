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

PROMPTS = {
    "resume": """Extract from this resume: name, email, phone, 
education (list with institution/degree/duration), 
experience (list with company/position/duration/achievements), 
skills (list). Return ONLY valid JSON, no markdown, no backticks.""",

    "bank_statement": """Extract from this bank statement: 
account_holder, account_number, bank_name,
transactions (list with date/description/debit/credit),
opening_balance, closing_balance, total_debits, total_credits.
Return ONLY valid JSON, no markdown, no backticks.""",

    "invoice": """Extract from this invoice:
vendor_name, vendor_address, invoice_number, invoice_date, due_date,
line_items (list with description/quantity/unit_price/total),
subtotal, tax, total_amount, currency.
Return ONLY valid JSON, no markdown, no backticks.""",

    "general": """Extract key information from this document:
document_type, key_entities (list), important_dates (list),
amounts_mentioned (list), summary (2 sentences).
Return ONLY valid JSON, no markdown, no backticks."""
}

def extract_structured_data(raw_text: str, doc_type: str = "general") -> dict:
    prompt = PROMPTS.get(doc_type, PROMPTS["general"])
    full_prompt = f"{prompt}\n\nDocument text:\n{raw_text[:6000]}"

    try:
        response = model.generate_content(
            full_prompt,
            request_options={"timeout": LLM_TIMEOUT_SECONDS}
        )
        result = response.text
    except DeadlineExceeded:
        raise HTTPException(status_code=504, detail="LLM request timed out, please try again")
    except GoogleAPIError as e:
        raise HTTPException(status_code=502, detail=f"LLM service error: {e}")
    except ValueError:
        # response had no usable candidate (e.g. blocked by safety filters)
        raise HTTPException(status_code=502, detail="LLM returned no usable output")

    result = result.strip()

    # Clean markdown if Gemini adds it
    if result.startswith("```"):
        result = result.split("```")[1]
        if result.startswith("json"):
            result = result[4:]
    result = result.strip()

    try:
        return json.loads(result)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="LLM returned invalid JSON")