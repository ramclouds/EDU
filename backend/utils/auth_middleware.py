from datetime import datetime, timedelta
from functools import wraps

from flask import jsonify, request

from utils.auth import TOKEN_EXPIRY_HOURS, Admin, Student, Teacher, db

try:
    from utils.auth import Staff
except ImportError:
    Staff = None


def _extract_bearer_token():
    auth_header = str(request.headers.get("Authorization") or "").strip()

    if not auth_header:
        return None

    if auth_header.lower().startswith("bearer "):
        return auth_header[7:].strip()

    return auth_header


def _find_user_by_token(token):
    models = [Student, Teacher, Admin]

    if Staff is not None:
        models.append(Staff)

    for model in models:
        if not hasattr(model, "auth_token"):
            continue

        user = model.query.filter_by(auth_token=token).first()
        if user is not None:
            return user

    return None


def login_required(function):
    @wraps(function)
    def wrapper(*args, **kwargs):
        if request.method == "OPTIONS":
            return jsonify({"message": "OK"}), 200

        token = _extract_bearer_token()
        if not token:
            return jsonify({"error": "Unauthorized - Token missing"}), 401

        try:
            user = _find_user_by_token(token)

            if user is None:
                return jsonify({"error": "Invalid token"}), 401

            expires_at = getattr(user, "token_expires_at", None)
            if expires_at is not None and datetime.utcnow() > expires_at:
                # Session expired — revoke it so the stale token can't be
                # reused, rather than leaving it dangling in the database.
                user.auth_token = None
                user.token_expires_at = None
                db.session.commit()
                return jsonify({"error": "Session expired, please log in again"}), 401

            if str(getattr(user, "status", "Active")).lower() != "active":
                return jsonify({"error": "Account inactive"}), 403

            # Sliding expiry: any authenticated activity extends the
            # session instead of forcing a re-login mid-task.
            if hasattr(user, "token_expires_at"):
                user.token_expires_at = datetime.utcnow() + timedelta(
                    hours=TOKEN_EXPIRY_HOURS
                )
                db.session.commit()

            request.user = user
            request.auth_token = token

            if isinstance(user, Admin):
                request.user_type = "admin"
            elif isinstance(user, Teacher):
                request.user_type = "teacher"
            elif isinstance(user, Student):
                request.user_type = "student"
            elif Staff is not None and isinstance(user, Staff):
                request.user_type = "staff"
            else:
                request.user_type = None

        except Exception:
            db.session.rollback()
            return jsonify({"error": "Unable to validate authentication token"}), 401

        return function(*args, **kwargs)

    return wrapper


def get_current_user():
    return getattr(request, "user", None)


def get_current_user_type():
    return getattr(request, "user_type", None)
