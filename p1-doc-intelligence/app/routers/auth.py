from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.auth_service import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

# Simple hardcoded clients for now — we'll move to DB later
VALID_CLIENTS = {
    "client_tanishka": "sprint2026",
    "client_demo": "demo123"
}

class TokenRequest(BaseModel):
    client_id: str
    client_secret: str

@router.post("/token")
def get_token(request: TokenRequest):
    if request.client_id not in VALID_CLIENTS:
        raise HTTPException(status_code=401, detail="Invalid client_id")
    if VALID_CLIENTS[request.client_id] != request.client_secret:
        raise HTTPException(status_code=401, detail="Invalid client_secret")
    
    token = create_access_token({"client_id": request.client_id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": "30 days"
    }