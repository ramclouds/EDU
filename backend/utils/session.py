"""Browser sessions: secure cookies plus a CSRF check.

The sign-in token lives in an HttpOnly cookie, so page scripts cannot read it. A second
cookie holds a CSRF value that the page must send back in a header with every change
(POST, PUT, PATCH, DELETE). A site on another domain cannot read that cookie, so it cannot
send the header, and the server refuses its requests.

API clients (scripts, mobile apps) may send the token as "Authorization: Bearer <token>".
A valid bearer token is used as is and needs no CSRF header.
"""
import os
import secrets

from flask import g, request

SCHOOL_COOKIE = "edu_session"
SCHOOL_CSRF_COOKIE = "edu_csrf"
SCHOOL_CSRF_HEADER = "X-CSRF-Token"
DEV_COOKIE = "edu_dev_session"
DEV_CSRF_COOKIE = "edu_dev_csrf"
DEV_CSRF_HEADER = "X-Dev-CSRF-Token"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}


def cookies_secure():
    """Secure cookies (HTTPS only) in production. Local development uses http."""
    flag = (os.getenv("COOKIE_SECURE") or "").strip().lower()
    if flag:
        return flag in ("1", "true", "yes")
    return (os.getenv("FLASK_ENV") or "development") == "production"


def bearer_token():
    header = str(request.headers.get("Authorization") or "").strip()
    if header.lower().startswith("bearer "):
        return header[7:].strip() or None
    return None


def wants_token_in_body():
    """Only API clients ask for the token in the response body. Browsers never do."""
    return request.headers.get("X-Token-Transport", "").lower() == "body"


def csrf_passes(csrf_cookie, csrf_header):
    if request.method in SAFE_METHODS:
        return True
    expected = request.cookies.get(csrf_cookie)
    given = request.headers.get(csrf_header)
    return bool(expected and given and secrets.compare_digest(expected, given))


def write_session_cookies(response, cookie, csrf_cookie, token, max_age):
    secure = cookies_secure()
    response.set_cookie(
        cookie, token, max_age=max_age, httponly=True, secure=secure, samesite="Lax", path="/"
    )
    response.set_cookie(
        csrf_cookie, secrets.token_urlsafe(32), max_age=max_age, httponly=False,
        secure=secure, samesite="Lax", path="/",
    )


def clear_session_cookies(response, cookie, csrf_cookie):
    secure = cookies_secure()
    response.delete_cookie(cookie, path="/", secure=secure, httponly=True, samesite="Lax")
    response.delete_cookie(csrf_cookie, path="/", secure=secure, samesite="Lax")


def apply_pending_session_cookies(response, max_age):
    """Called once per response. Sign-in and sign-out handlers queue their change in g."""
    pending = g.get("pending_session")
    if pending:
        kind, token = pending
        if kind == "school":
            write_session_cookies(response, SCHOOL_COOKIE, SCHOOL_CSRF_COOKIE, token, max_age)
        elif kind == "developer":
            write_session_cookies(response, DEV_COOKIE, DEV_CSRF_COOKIE, token, max_age)
    cleared = g.get("pending_clear")
    if cleared == "school":
        clear_session_cookies(response, SCHOOL_COOKIE, SCHOOL_CSRF_COOKIE)
    elif cleared == "developer":
        clear_session_cookies(response, DEV_COOKIE, DEV_CSRF_COOKIE)
    return response
