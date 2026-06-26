"""
Cryptographic password hashing module using modern bcrypt.
Implements secure salted hashing for officer authentication.
"""

import bcrypt

def hash_password(password: str) -> str:
    """
    Hash a plain-text password using bcrypt with a secure auto-generated salt.
    
    Args:
        password: Plain-text password string (must be <= 72 bytes)
        
    Returns:
        Cryptographically salted hash string
    """
    # 1. Truncate password to 72 bytes to prevent bcrypt 72-byte limit errors
    password_bytes = password.encode('utf-8')[:72]
    
    # 2. Generate salt and hash
    # gensalt(12) matches your previous bcrypt__rounds=12 setting
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    
    # 3. Return as a UTF-8 string for database storage
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain-text password against its stored bcrypt hash.
    
    Args:
        plain_password: Plain-text password to verify
        hashed_password: Stored cryptographic hash string
        
    Returns:
        True if password matches, False otherwise
    """
    # 1. Prepare passwords
    # Truncate input to 72 bytes just like in hash_password
    plain_password_bytes = plain_password.encode('utf-8')[:72]
    hashed_password_bytes = hashed_password.encode('utf-8')
    
    # 2. Compare using bcrypt
    return bcrypt.checkpw(plain_password_bytes, hashed_password_bytes)