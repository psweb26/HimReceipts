import os
from pathlib import Path

from dotenv import dotenv_values
from sqlalchemy import MetaData, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = (BASE_DIR.parent / ".env").resolve()
DOTENV_DEBUG = os.getenv("DOTENV_DEBUG", "1").lower() not in {"0", "false", "no"}
UTF8_BOM = b"\xef\xbb\xbf"
UTF16_LE_BOM = b"\xff\xfe"
UTF16_BE_BOM = b"\xfe\xff"


def _debug_env_file(path: Path) -> None:
    if not DOTENV_DEBUG:
        return

    print(f"[dotenv debug] checking: {path}")
    print(f"[dotenv debug] exists: {path.exists()}")
    print(f"[dotenv debug] is_file: {path.is_file()}")

    if not path.exists():
        return

    raw = path.read_bytes()
    print(f"[dotenv debug] size_bytes: {len(raw)}")
    print(f"[dotenv debug] first_bytes_hex: {raw[:16].hex(' ')}")
    print(f"[dotenv debug] utf8_bom: {raw.startswith(UTF8_BOM)}")
    print(f"[dotenv debug] utf16_le_bom: {raw.startswith(UTF16_LE_BOM)}")
    print(f"[dotenv debug] utf16_be_bom: {raw.startswith(UTF16_BE_BOM)}")

    try:
        decoded = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        print(f"[dotenv debug] utf-8-sig decode failed: {exc}")
        return

    if "\x00" in decoded:
        print("[dotenv debug] warning: NUL bytes detected; file may be UTF-16 or binary.")

    suspicious_lines = []
    for line_number, line in enumerate(decoded.splitlines(), start=1):
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" not in stripped:
            suspicious_lines.append(line_number)
    if suspicious_lines:
        print(f"[dotenv debug] lines without '=': {suspicious_lines}")


def _load_env_file(path: Path) -> dict[str, str]:
    _debug_env_file(path)

    if not path.exists():
        return {}

    parsed = dotenv_values(path, encoding="utf-8-sig")
    loaded: dict[str, str] = {}

    if DOTENV_DEBUG:
        print(f"[dotenv debug] parsed_keys_repr: {[repr(key) for key in parsed.keys()]}")

    for key, value in parsed.items():
        if key is None or value is None:
            continue

        normalized_key = key.strip().lstrip("\ufeff")
        if DOTENV_DEBUG and normalized_key != key:
            print(f"[dotenv debug] normalized key {key!r} -> {normalized_key!r}")

        os.environ[normalized_key] = value
        loaded[normalized_key] = value

    if DOTENV_DEBUG:
        print(f"[dotenv debug] injected_keys: {sorted(loaded.keys())}")
        print(f"[dotenv debug] DATABASE_URL in os.environ: {'DATABASE_URL' in os.environ}")

    return loaded


LOADED_ENV = _load_env_file(ENV_PATH)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL is not set in the environment variables. "
        f"Checked {ENV_PATH}; loaded keys: {sorted(LOADED_ENV.keys())}"
    )

if DOTENV_DEBUG:
    print("[dotenv debug] DATABASE_URL loaded successfully.")

metadata = MetaData(
    naming_convention={
        "ix": "ix_%(column_0_label)s",
        "uq": "uq_%(table_name)s_%(column_0_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    }
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base(metadata=metadata)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
