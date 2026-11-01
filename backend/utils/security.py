"""Security helpers shared by the login and file code."""
import hashlib


def hash_token(token):
    """A login token is stored only as this fingerprint. A copy of the database cannot be
    used to sign in, because the raw token is shown to the browser once, at sign-in."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
