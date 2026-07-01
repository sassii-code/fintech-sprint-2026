import os
import json
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def extract_structured_data(raw_text: str, doc_type: str = "general") -> dict:
    prompt = f"""You are a financial document parser. Extract structured data from the text below.

Return ONLY valid JSON, no explanation, no markdown formatting.

If this is a resume, extract: name, email, phone, education (list), experience (list), skills (list).
If this is a bank statement, extract: account_holder, account_number, transactions (list of date/description/amount), opening_balance, closing_balance.
If this is an invoice, extract: vendor, invoice_number, amount, date, line_items (list).
If none of these match, extract: document_type, key_entities (list), summary.

Document text:
{raw_text[:6000]}
"""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        response_format={"type": "json_object"}
    )

    result = response.choices[0].message.content
    return json.loads(result)