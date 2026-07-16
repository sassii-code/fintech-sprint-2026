"""Public demo mode: authentication is disabled. Every request is treated as
the shared demo account (see app/seed_data.py) so the app works with no
login step. Kept as a dependency (rather than deleting it from every router)
so all endpoint signatures stay unchanged."""

DEMO_CLIENT_ID = "demo"


def verify_token() -> dict:
    return {"client_id": DEMO_CLIENT_ID}
