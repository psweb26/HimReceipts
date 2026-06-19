"""
Cryptographic password hashing module using passlib with bcrypt backend.
Implements secure salted hashing for officer authentication.
"""

from passlib.context import CryptContext

# Initialize password hashing context with bcrypt + optional Argon2
pwd_context = CryptContext(
    schemes=["bcrypt", "argon2"],
    deprecated="auto",
    bcrypt__rounds=12,
    argon2__rounds=3,
)


def hash_password(password: str) -> str:
    """
    Hash a plain-text password using bcrypt with secure salt.
    
    Args:
        password: Plain-text password string
        
    Returns:
        Cryptographically salted hash string
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain-text password against its bcrypt hash.
    Automatically updates hash if deprecated scheme detected.
    
    Args:
        plain_password: Plain-text password to verify
        hashed_password: Stored cryptographic hash
        
    Returns:
        True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)
