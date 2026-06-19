# backend/security.py
from passlib.context import CryptContext

# Instantiate a reusable hashing engine context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Computes a secure, salted cryptographic hash of a plain text string."""
    return pwd_context.hash(password)

def verify_password(plain_text_password: str, hashed_password: str) -> bool:
    """Verifies an inbound plain text string against a stored database hash signature."""
    return pwd_context.verify(plain_text_password, hashed_password)