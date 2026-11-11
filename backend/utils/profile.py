"""Self-service profiles: every signed-in user edits their own details, and the platform owner edits theirs.

What a person may change is listed per user type below. Medical details, roles, status,
codes, school and login identity are NOT editable here (school administrators handle those).
Every value is checked before it is saved. Passwords need the current password.
"""
import re
from datetime import date, datetime

from flask import jsonify, request
from flask.views import MethodView
from sqlalchemy import inspect as sa_inspect
from sqlalchemy.exc import SQLAlchemyError

from utils.auth import Admin, NonTeachingStaff, Student, Teacher, bcrypt, db
from utils.auth_middleware import login_required
from utils.platform import Developer, audit, developer_required

GENDERS = ["Male", "Female", "Other", "Prefer not to say"]
BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?)+$")
PHONE_RE = re.compile(r"^\+?[0-9][0-9 ()\-]{6,18}[0-9]$")

PERSON = ["first_name", "middle_name", "last_name", "gender", "date_of_birth", "blood_group", "address"]
CONTACT = ["email", "mobile"]

# user type -> (model, editable fields)
PROFILE_SPECS = {
    "student": (Student, PERSON + CONTACT + [
        "father_name", "father_mobile", "father_email", "mother_name", "mother_mobile", "mother_email",
        "emergency_contact_name", "emergency_contact_number", "emergency_contact_relation",
    ]),
    "teacher": (Teacher, PERSON + CONTACT + [
        "city", "state", "pincode", "emergency_name", "emergency_relation", "emergency_phone",
        "degree", "university", "specialization",
    ]),
    "admin": (Admin, PERSON + CONTACT + ["alternate_mobile", "city", "state", "country", "pincode"]),
    "staff": (NonTeachingStaff, PERSON + CONTACT),
}

# label, and optional kind/limit for each field
LABELS = {
    "first_name": "First name", "middle_name": "Middle name", "last_name": "Last name",
    "gender": "Gender", "date_of_birth": "Date of birth", "blood_group": "Blood group",
    "address": "Address", "email": "Email", "mobile": "Mobile",
    "alternate_mobile": "Alternate mobile", "city": "City", "state": "State", "country": "Country",
    "pincode": "Postal code", "father_name": "Father's name", "father_mobile": "Father's mobile",
    "father_email": "Father's email", "mother_name": "Mother's name", "mother_mobile": "Mother's mobile",
    "mother_email": "Mother's email", "emergency_contact_name": "Emergency contact name",
    "emergency_contact_number": "Emergency contact number", "emergency_contact_relation": "Emergency contact relation",
    "emergency_name": "Emergency contact name", "emergency_relation": "Emergency contact relation",
    "emergency_phone": "Emergency contact phone", "degree": "Degree", "university": "University",
    "specialization": "Specialisation",
}
REQUIRED = {"first_name", "last_name"}


def _kind(field):
    if field == "email" or field.endswith("_email"):
        return "email"
    if "mobile" in field or "phone" in field or field.endswith("_number"):
        return "phone"
    if field == "date_of_birth":
        return "date"
    if field == "gender":
        return "select"
    if field == "blood_group":
        return "select"
    if field == "address":
        return "textarea"
    return "text"


def _meta(field):
    kind = _kind(field)
    entry = {
        "name": field,
        "label": LABELS.get(field, field.replace("_", " ").capitalize()),
        "kind": kind,
        "required": field in REQUIRED,
        "max": 300 if kind == "textarea" else 254 if kind == "email" else 20 if kind == "phone" else 100,
    }
    if field == "gender":
        entry["options"] = GENDERS
    if field == "blood_group":
        entry["options"] = BLOOD_GROUPS
    return entry


def _model_fields(model, wanted):
    """Only the fields this model really has (so an older database never breaks the page)."""
    columns = {c.key for c in sa_inspect(model).mapper.column_attrs}
    return [f for f in wanted if f in columns]


def _clean(field, value):
    """(clean value, error). Empty is allowed for optional fields."""
    meta = _meta(field)
    if value is None:
        value = ""
    if not isinstance(value, (str, int)):
        return None, f"{meta['label']} must be text"
    text = " ".join(str(value).split()) if meta["kind"] != "textarea" else str(value).strip()
    if text == "":
        if meta["required"]:
            return None, f"{meta['label']} is required"
        return None, None
    if len(text) > meta["max"]:
        return None, f"{meta['label']} must be at most {meta['max']} characters"

    kind = meta["kind"]
    if kind == "email" and not EMAIL_RE.match(text):
        return None, f"Enter a valid {meta['label'].lower()}"
    if kind == "phone" and not PHONE_RE.match(text):
        return None, f"Enter a valid {meta['label'].lower()} (digits, spaces, + and brackets only)"
    if kind == "select" and text not in meta["options"]:
        return None, f"Choose a valid {meta['label'].lower()}"
    if kind == "date":
        try:
            day = datetime.strptime(text, "%Y-%m-%d").date()
        except ValueError:
            return None, "Date of birth must look like 2010-05-31"
        if day > date.today() or day.year < 1900:
            return None, "Enter a real date of birth"
        return day, None
    return text, None


def _profile_payload(user, model, fields, user_type):
    values = {}
    for f in fields:
        v = getattr(user, f, None)
        values[f] = v.isoformat() if hasattr(v, "isoformat") else v
    return {
        "user_type": user_type,
        "id": user.id,
        "login_name": getattr(user, "username", None) or getattr(user, "email", None),
        "role": getattr(user, "role", None),
        "identity": {
            "code": getattr(user, "student_id", None) or getattr(user, "teacher_id", None)
            or getattr(user, "admin_id", None) or getattr(user, "staff_id", None),
        },
        "values": values,
        "fields": [_meta(f) for f in fields],
    }


def _resolve_user():
    user = getattr(request, "user", None)
    user_type = getattr(request, "user_type", None)
    if user is None or user_type not in PROFILE_SPECS:
        return None, None, None, None
    model, fields = PROFILE_SPECS[user_type]
    return user, user_type, model, _model_fields(model, fields)


# ----------------------------------------------------------------- school people
class MyProfileAPI(MethodView):
    decorators = [login_required]

    def get(self):
        user, user_type, model, fields = _resolve_user()
        if user is None:
            return jsonify({"error": "Your profile is not available for this account"}), 404
        return jsonify(_profile_payload(user, model, fields, user_type)), 200

    def put(self):
        user, user_type, model, fields = _resolve_user()
        if user is None:
            return jsonify({"error": "Your profile is not available for this account"}), 404
        data = request.get_json(silent=True) or {}

        cleaned, errors = {}, {}
        for f in fields:
            if f not in data:
                continue
            value, err = _clean(f, data[f])
            if err:
                errors[f] = err
            else:
                cleaned[f] = value
        if errors:
            return jsonify({"error": "Please check the highlighted fields", "errors": errors}), 400

        # email must not be used by another person of the same type in this school
        if "email" in cleaned and cleaned["email"]:
            clash = (
                model.query.filter(db.func.lower(model.email) == cleaned["email"].lower(), model.id != user.id)
                .first()
            )
            if clash is not None:
                return jsonify({"error": "Another account already uses this email", "errors": {"email": "Already in use"}}), 409

        try:
            for f, value in cleaned.items():
                setattr(user, f, value if value is not None else None)
            for f in fields:
                if f in data and f not in cleaned:
                    setattr(user, f, None)
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            return jsonify({"error": "Internal server error"}), 500
        return jsonify({"message": "Profile saved", "profile": _profile_payload(user, model, fields, user_type)}), 200


class MyPasswordAPI(MethodView):
    decorators = [login_required]

    def post(self):
        user, _user_type, _model, _fields = _resolve_user()
        if user is None:
            return jsonify({"error": "Password change is not available for this account"}), 404
        data = request.get_json(silent=True) or {}
        current, new = data.get("current_password") or "", data.get("new_password") or ""
        if not bcrypt.check_password_hash(user.password, current):
            return jsonify({"error": "Your current password is not correct"}), 400
        if len(new) < 8:
            return jsonify({"error": "The new password must be at least 8 characters"}), 400
        if new == current:
            return jsonify({"error": "Choose a password different from the current one"}), 400
        try:
            user.password = bcrypt.generate_password_hash(new).decode("utf-8")
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            return jsonify({"error": "Internal server error"}), 500
        return jsonify({"message": "Password changed"}), 200


# ----------------------------------------------------------------- platform owner
DEVELOPER_FIELDS = ["first_name", "last_name", "email"]


def _developer_meta():
    return [
        {"name": "first_name", "label": "First name", "kind": "text", "required": True, "max": 100},
        {"name": "last_name", "label": "Last name", "kind": "text", "required": False, "max": 100},
        {"name": "email", "label": "Email", "kind": "email", "required": True, "max": 120},
    ]


class DeveloperProfileAPI(MethodView):
    decorators = [developer_required]

    def get(self):
        dev = Developer.query.get(request.developer_id)
        if dev is None:
            return jsonify({"error": "Account not found"}), 404
        return jsonify({
            "user_type": "developer",
            "login_name": dev.username,
            "values": {"first_name": dev.first_name, "last_name": dev.last_name or "", "email": dev.email},
            "fields": _developer_meta(),
            "identity": {"code": dev.developer_id},
        }), 200

    def put(self):
        dev = Developer.query.get(request.developer_id)
        if dev is None:
            return jsonify({"error": "Account not found"}), 404
        data = request.get_json(silent=True) or {}
        cleaned, errors = {}, {}
        for meta in _developer_meta():
            name = meta["name"]
            if name not in data:
                continue
            raw = data[name]
            if name == "email":
                text = " ".join(str(raw or "").split())
                if not EMAIL_RE.match(text):
                    errors[name] = "Enter a valid email address"
                    continue
                cleaned[name] = text
            elif name == "first_name":
                value, err = _clean_required(meta, raw)
                if err:
                    errors[name] = err
                else:
                    cleaned[name] = value
            else:  # last name is optional
                text = " ".join(str(raw or "").split())
                if len(text) > meta["max"]:
                    errors[name] = f"{meta['label']} must be at most {meta['max']} characters"
                else:
                    cleaned[name] = text
        if errors:
            return jsonify({"error": "Please check the highlighted fields", "errors": errors}), 400
        if "email" in cleaned:
            clash = Developer.query.filter(db.func.lower(Developer.email) == cleaned["email"].lower(), Developer.id != dev.id).first()
            if clash is not None:
                return jsonify({"error": "Another platform account uses this email", "errors": {"email": "Already in use"}}), 409
        try:
            for f, v in cleaned.items():
                setattr(dev, f, v)
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            return jsonify({"error": "Internal server error"}), 500
        audit("developer.profile_update", detail=", ".join(sorted(cleaned)) or None)
        return jsonify({"message": "Profile saved", "values": {"first_name": dev.first_name, "last_name": dev.last_name or "", "email": dev.email}}), 200


def _clean_required(meta, value):
    text = " ".join(str(value or "").split())
    if not text:
        return None, f"{meta['label']} is required"
    if len(text) > meta["max"]:
        return None, f"{meta['label']} must be at most {meta['max']} characters"
    return text, None


class DeveloperPasswordAPI(MethodView):
    decorators = [developer_required]

    def post(self):
        dev = Developer.query.get(request.developer_id)
        if dev is None:
            return jsonify({"error": "Account not found"}), 404
        data = request.get_json(silent=True) or {}
        current, new = data.get("current_password") or "", data.get("new_password") or ""
        if not bcrypt.check_password_hash(dev.password, current):
            return jsonify({"error": "Your current password is not correct"}), 400
        if len(new) < 10:
            return jsonify({"error": "The platform owner password must be at least 10 characters"}), 400
        if new == current:
            return jsonify({"error": "Choose a password different from the current one"}), 400
        try:
            dev.password = bcrypt.generate_password_hash(new).decode("utf-8")
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            return jsonify({"error": "Internal server error"}), 500
        audit("developer.password_change")
        return jsonify({"message": "Password changed"}), 200
