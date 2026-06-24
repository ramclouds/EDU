from functools import wraps
from flask import request, jsonify
from utils.auth import Student, Teacher, Admin

def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):

        # ✅ Allow CORS preflight
        if request.method == "OPTIONS":
            return jsonify({"message": "OK"}), 200

        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return jsonify({"error": "Unauthorized - Token missing"}), 401

        try:
            # ✅ Extract token
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
            else:
                token = auth_header

            user = None

            # ✅ Student
            user = Student.query.filter_by(auth_token=token).first()

            # ✅ Teacher
            if not user:
                user = Teacher.query.filter_by(auth_token=token).first()

            # ✅ Admin
            if not user:
                user = Admin.query.filter_by(auth_token=token).first()

            if not user:
                return jsonify({"error": "Invalid token"}), 401

            # ✅ Attach current user
            request.user = user

        except Exception as e:
            return jsonify({"error": str(e)}), 401

        return f(*args, **kwargs)

    return wrapper


def get_current_user():
    return getattr(request, "user", None)