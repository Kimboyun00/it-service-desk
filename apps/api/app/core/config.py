from pydantic import BaseModel
import os

class Settings(BaseModel):
    database_url: str = os.getenv("DATABASE_URL", "")
    jwt_secret: str = os.getenv("JWT_SECRET", "dev-secret")
    jwt_expires_min: int = int(os.getenv("JWT_EXPIRES_MIN", "120"))
    allowed_email_domains: list[str] = [
        d.strip().lower()
        for d in os.getenv("ALLOWED_EMAIL_DOMAINS", "").split(",")
        if d.strip()
    ]

settings = Settings()
