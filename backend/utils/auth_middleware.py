from functools import wraps
from flask import request, jsonify
from utils.auth import Student, Teacher


def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):

        # ✅ IMPORTANT: Allow CORS preflight
        if request.method == "OPTIONS":
            return jsonify({"message": "OK"}), 200

        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return jsonify({"error": "Unauthorized - Token missing"}), 401

        try:
            # Extract token
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
            else:
                token = auth_header

            # Check Student
            user = Student.query.filter_by(auth_token=token).first()

            # Check Teacher
            if not user:
                user = Teacher.query.filter_by(auth_token=token).first()

            if not user:
                return jsonify({"error": "Invalid token"}), 401

            # ✅ Attach user to request
            request.user = user

        except Exception:
            return jsonify({"error": "Invalid token format"}), 401

        return f(*args, **kwargs)

    return wrapper


# ✅ KEEP THIS
def get_current_user():
    return getattr(request, "user", None)
