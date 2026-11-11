"""Password reset by email, using the school's own email settings.

  * Forgot password: anyone may ask. The reply is the same whether or not an account
    matches, so the form cannot be used to find out which emails have accounts.
  * Each link is random, valid for 30 minutes, usable once, and stored only as a fingerprint.
  * Requests are rate limited per address. Only schools that switched on self-service reset
    (Sign-in page settings) send emails.
  * A successful reset signs the person out everywhere.
"""
import hashlib
import logging
import os
import secrets
import time
from datetime import datetime, timedelta

from flask import g, jsonify, request
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError

from utils.auth import Admin, NonTeachingStaff, Student, Teacher, bcrypt, db
from utils.login_branding import SchoolBranding
from utils.mail_admin import send_school_notification
from utils.rate_limit import store
from utils.tenant_routing import current_tenant_slug, school_urls

logger = logging.getLogger(__name__)

RESET_MINUTES = 30
FORGOT_LIMIT = 5          # requests per address
FORGOT_WINDOW = 900       # seconds (15 minutes)
GENERIC_REPLY = "If an account matches that email, a reset link has been sent."


class PasswordReset(db.Model):
    __tablename__ = "password_resets"

    id = db.Column(db.Integer, primary_key=True)
    user_type = db.Column(db.String(20), nullable=False)
    user_id = db.Column(db.Integer, nullable=False)
    token_hash = db.Column(db.String(64), nullable=False, unique=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


USER_MODELS = {"admin": Admin, "teacher": Teacher, "student": Student, "staff": NonTeachingStaff}


def _hash(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _throttled(ip):
    """True when this address has used up its forgot-password requests for the window."""
    key = f"reset:ip:{ip}"
    count, _left = store().status(key)
    if count >= FORGOT_LIMIT:
        return True
    store().fail(key, FORGOT_WINDOW)
    return False


def _reset_link(request_base):
    """The school's own address for the reset page, or this request's address in development."""
    urls = school_urls(current_tenant_slug()) or {}
    login_url = urls.get("login_url")
    base = login_url[: -len("/Login")] if login_url and login_url.endswith("/Login") else request_base
    return f"{base.rstrip('/')}/reset-password"


def _school_branding_allows_reset():
    row = SchoolBranding.query.first()
    return bool(row and row.show_self_service_reset)


class ForgotPasswordAPI(MethodView):
    def post(self):
        data = request.get_json(silent=True) or {}
        email = str(data.get("email") or "").strip().lower()[:200]
        if not email or "@" not in email:
            return jsonify({"message": GENERIC_REPLY}), 200

        if _throttled(request.remote_addr or "unknown"):
            return jsonify({"error": "Too many requests. Please wait a few minutes and try again."}), 429

        # Public request: the school comes from the address it was sent to.
        school_id = g.get("tenant_school_id")
        if school_id is None or not _school_branding_allows_reset():
            return jsonify({"message": GENERIC_REPLY}), 200

        account, user_type = None, None
        for kind, model in USER_MODELS.items():
            row = model.query.filter(db.func.lower(model.email) == email).first()
            if row is not None:
                account, user_type = row, kind
                break
        if account is None:
            return jsonify({"message": GENERIC_REPLY}), 200

        token = secrets.token_urlsafe(32)
        try:
            db.session.add(PasswordReset(
                user_type=user_type,
                user_id=account.id,
                token_hash=_hash(token),
                expires_at=datetime.utcnow() + timedelta(minutes=RESET_MINUTES),
            ))
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Could not save a password reset")
            return jsonify({"message": GENERIC_REPLY}), 200

        base = f"{os.getenv('TENANT_URL_SCHEME') or request.scheme}://{request.host}"
        link = f"{_reset_link(base)}?token={token}"
        name = getattr(account, "first_name", "") or "there"
        body = (
            f"Hello {name},\n\n"
            "We received a request to reset your password. Open this link within "
            f"{RESET_MINUTES} minutes to choose a new one:\n\n{link}\n\n"
            "If you did not ask for this, ignore this email. Your password will not change.\n"
        )
        ok, error = send_school_notification(school_id, account.email, "Reset your password", body)
        if not ok:
            logger.warning("Password reset email not sent: %s", error)
        return jsonify({"message": GENERIC_REPLY}), 200


class ResetPasswordAPI(MethodView):
    def post(self):
        data = request.get_json(silent=True) or {}
        token = str(data.get("token") or "")
        password = str(data.get("new_password") or "")
        if len(password) < 8:
            return jsonify({"error": "The new password must be at least 8 characters"}), 400

        record = PasswordReset.query.filter_by(token_hash=_hash(token), used_at=None).first() if token else None
        if record is None or record.expires_at < datetime.utcnow():
            return jsonify({"error": "This reset link is invalid or has expired. Ask for a new one."}), 400

        model = USER_MODELS.get(record.user_type)
        account = model.query.get(record.user_id) if model else None
        if account is None:
            return jsonify({"error": "This reset link is invalid or has expired. Ask for a new one."}), 400

        try:
            account.password = bcrypt.generate_password_hash(password).decode("utf-8")
            account.auth_token = None        # signs out every session
            if hasattr(account, "token_expires_at"):
                account.token_expires_at = None
            now = datetime.utcnow()
            record.used_at = now
            PasswordReset.query.filter_by(
                user_type=record.user_type, user_id=record.user_id, used_at=None
            ).update({"used_at": now})
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            return jsonify({"error": "Internal server error"}), 500
        return jsonify({"message": "Your password has been reset. Sign in with the new password."}), 200
