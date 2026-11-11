"""Encrypts secrets that must be stored (SMTP passwords) and decrypts them when used.

Uses Fernet (AES-128-CBC + HMAC) from the `cryptography` package. The key comes from the
SMTP_ENCRYPTION_KEY setting, never from the database. Generate one with:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
Keep that key safe. If it is lost, stored SMTP passwords cannot be read and must be re-entered.
"""
import os


class SecretKeyMissing(Exception):
    """No usable encryption key is configured, or the stored value cannot be opened with it."""


def _fernet():
    key = (os.getenv("SMTP_ENCRYPTION_KEY") or "").strip()
    if not key:
        raise SecretKeyMissing("SMTP_ENCRYPTION_KEY is not set on the server, so passwords cannot be saved.")
    try:
        from cryptography.fernet import Fernet
    except ImportError as exc:
        raise SecretKeyMissing("The 'cryptography' package is not installed on the server.") from exc
    try:
        return Fernet(key.encode())
    except (ValueError, TypeError) as exc:
        raise SecretKeyMissing("SMTP_ENCRYPTION_KEY is not a valid Fernet key.") from exc


def encrypt(text):
    return _fernet().encrypt(text.encode("utf-8")).decode("ascii")


def decrypt(token):
    from cryptography.fernet import InvalidToken
    try:
        return _fernet().decrypt(token.encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise SecretKeyMissing("The stored SMTP password cannot be read with the current key. Re-enter it.") from exc
