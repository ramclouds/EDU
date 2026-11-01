"""Time-based one-time codes (RFC 6238), as used by authenticator apps.

30-second steps, 6 digits, HMAC-SHA1. A code is accepted for its own step and the step
either side (clock drift), and a code cannot be used twice: the last accepted step is stored.
"""
import base64
import hashlib
import hmac
import secrets
import struct
import time
from urllib.parse import quote

STEP = 30
DIGITS = 6


def new_secret():
    return base64.b32encode(secrets.token_bytes(20)).decode("ascii").rstrip("=")


def _code_for(secret, counter):
    key = base64.b32decode(secret + "=" * (-len(secret) % 8), casefold=True)
    digest = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    value = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return f"{value % (10 ** DIGITS):0{DIGITS}d}"


def verify(secret, code, last_counter=None, now=None, window=1):
    """The step the code matched, or None. Steps at or before last_counter are refused."""
    code = str(code or "").replace(" ", "")
    if len(code) != DIGITS or not code.isdigit() or not secret:
        return None
    current = int((now if now is not None else time.time()) // STEP)
    for delta in range(-window, window + 1):
        counter = current + delta
        if last_counter is not None and counter <= last_counter:
            continue
        if hmac.compare_digest(_code_for(secret, counter), code):
            return counter
    return None


def provisioning_uri(secret, account, issuer="EDU System"):
    label = quote(f"{issuer}:{account}")
    return f"otpauth://totp/{label}?secret={secret}&issuer={quote(issuer)}&digits={DIGITS}&period={STEP}"
