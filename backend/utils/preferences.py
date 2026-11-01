"""Saved preferences per account: the dark theme today, room for more later.

School users keep theirs in their own school database (table user_preferences).
The platform owner keeps theirs in the platform database (table developer_preferences).
Only the keys listed below are accepted, and each value must be one of its allowed choices.
"""
from datetime import datetime

from flask import jsonify, request
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError

from utils.auth import db
from utils.auth_middleware import login_required
from utils.platform import developer_required

ALLOWED = {
    "theme": ("light", "dark", "system"),
}


class UserPreference(db.Model):
    """School database."""

    __tablename__ = "user_preferences"
    __table_args__ = (db.UniqueConstraint("user_type", "user_id", "pref_key", name="uq_user_preference"),)

    id = db.Column(db.Integer, primary_key=True)
    user_type = db.Column(db.String(20), nullable=False)
    user_id = db.Column(db.Integer, nullable=False)
    pref_key = db.Column(db.String(40), nullable=False)
    pref_value = db.Column(db.String(200))
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)


class DeveloperPreference(db.Model):
    """Platform database (listed in PLATFORM_ONLY_TABLES)."""

    __tablename__ = "developer_preferences"
    __table_args__ = (db.UniqueConstraint("developer_id", "pref_key", name="uq_developer_preference"),)

    id = db.Column(db.Integer, primary_key=True)
    developer_id = db.Column(db.Integer, nullable=False)
    pref_key = db.Column(db.String(40), nullable=False)
    pref_value = db.Column(db.String(200))
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)


def _validate(data):
    clean, errors = {}, []
    for key, value in (data or {}).items():
        if key not in ALLOWED:
            continue  # unknown keys are ignored
        if value not in ALLOWED[key]:
            errors.append(f"{key} must be one of: {', '.join(ALLOWED[key])}")
        else:
            clean[key] = value
    return clean, errors


def _as_dict(rows):
    return {row.pref_key: row.pref_value for row in rows}


class MyPreferencesAPI(MethodView):
    decorators = [login_required]

    def get(self):
        user = request.user
        rows = UserPreference.query.filter_by(user_type=request.user_type, user_id=user.id).all()
        return jsonify(_as_dict(rows)), 200

    def put(self):
        clean, errors = _validate(request.get_json(silent=True) or {})
        if errors:
            return jsonify({"error": "; ".join(errors)}), 400
        user = request.user
        try:
            for key, value in clean.items():
                row = UserPreference.query.filter_by(
                    user_type=request.user_type, user_id=user.id, pref_key=key
                ).first()
                if row is None:
                    row = UserPreference(user_type=request.user_type, user_id=user.id, pref_key=key)
                    db.session.add(row)
                row.pref_value = value
                row.updated_at = datetime.utcnow()
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            return jsonify({"error": "Internal server error"}), 500
        rows = UserPreference.query.filter_by(user_type=request.user_type, user_id=user.id).all()
        return jsonify(_as_dict(rows)), 200


class DeveloperPreferencesAPI(MethodView):
    decorators = [developer_required]

    def get(self):
        rows = DeveloperPreference.query.filter_by(developer_id=request.developer_id).all()
        return jsonify(_as_dict(rows)), 200

    def put(self):
        clean, errors = _validate(request.get_json(silent=True) or {})
        if errors:
            return jsonify({"error": "; ".join(errors)}), 400
        try:
            for key, value in clean.items():
                row = DeveloperPreference.query.filter_by(developer_id=request.developer_id, pref_key=key).first()
                if row is None:
                    row = DeveloperPreference(developer_id=request.developer_id, pref_key=key)
                    db.session.add(row)
                row.pref_value = value
                row.updated_at = datetime.utcnow()
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            return jsonify({"error": "Internal server error"}), 500
        rows = DeveloperPreference.query.filter_by(developer_id=request.developer_id).all()
        return jsonify(_as_dict(rows)), 200
