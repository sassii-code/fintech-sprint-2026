import os
import json
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

PROMPTS = {
    "resume": """Extract from this resume: name, email, phone, 
education (list with institution/degree/duration), 
experience (list with company/position/duration/achievements), 
skills (list). Return ONLY valid JSON.""",

    "bank_statement": """Extract from this bank statement: 
account_holder, account_number, bank_name,
transactions (list with date/description/debit/credit),
opening_balance, closing_balance, total_debits, total_credits.
Return ONLY valid JSON.""",

    "invoice": """Extract from this invoice:
vendor_name, vendor_address, invoice_number, invoice_date, due_date,
line_items (list with description/quantity/unit_price/total),
subtotal, tax, total_amount, currency.
Return ONLY valid JSON.""",

    "general": """Extract key information from this document:
document_type, key_entities (list), important_dates (list),
amounts_mentioned (list), summary (2 sentences).
Return ONLY valid JSON."""
}

def extract_structured_data(raw_text: str, doc_type: str = "general") -> dict:
    prompt = PROMPTS.get(doc_type, PROMPTS["general"])
    
    full_prompt = f"{prompt}\n\nDocument text:\n{raw_text[:6000]}"

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": full_prompt}],
        temperature=0.1,
        response_format={"type": "json_object"}
    )

    return json.loads(response.choices[0].message.content)