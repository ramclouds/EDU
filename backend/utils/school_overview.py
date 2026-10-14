import logging
from datetime import datetime

from flask import jsonify, request
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError

from utils.auth import Admin, Student, db
from utils.auth_middleware import login_required
from utils.tenancy import current_school_id

logger = logging.getLogger(__name__)

EVENT_CATEGORIES = ("Academic", "Sports", "Cultural", "Holiday", "Meeting", "Other")


class Event(db.Model):
    __tablename__ = "school_events"

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(
        db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True
    )
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    event_date = db.Column(db.Date, nullable=False)
    location = db.Column(db.String(200))
    category = db.Column(db.String(30), nullable=False, default="Other")
    created_by = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


def _event_dict(e):
    return {
        "id": e.id,
        "title": e.title,
        "description": e.description,
        "event_date": e.event_date.isoformat() if e.event_date else None,
        "location": e.location,
        "category": e.category,
    }


def _require_admin():
    user = getattr(request, "user", None)
    if not isinstance(user, Admin):
        return None, (jsonify({"error": "Admin access required"}), 403)
    return user, None


class ParentsAPI(MethodView):
    """Guardian directory: one row per student in the caller's school."""

    @login_required
    def get(self):
        _, err = _require_admin()
        if err:
            return err
        try:
            search = (request.args.get("search") or "").strip()
            query = Student.query.filter(Student.school_id == current_school_id())
            if search:
                like = f"%{search}%"
                query = query.filter(
                    db.or_(
                        Student.first_name.ilike(like),
                        Student.last_name.ilike(like),
                        Student.father_name.ilike(like),
                        Student.mother_name.ilike(like),
                        Student.parent_name.ilike(like),
                    )
                )
            students = query.order_by(Student.first_name.asc()).all()

            rows = []
            for s in students:
                rows.append({
                    "student_id": s.student_id,
                    "student_name": " ".join(
                        p for p in [s.first_name, s.middle_name, s.last_name] if p
                    ),
                    "father_name": s.father_name,
                    "father_mobile": s.father_mobile,
                    "mother_name": s.mother_name,
                    "mother_mobile": s.mother_mobile,
                    "parent_name": s.parent_name,
                    "parent_mobile": s.parent_mobile,
                    "parent_email": s.parent_email or s.father_email or s.mother_email,
                    "has_guardian": bool(
                        s.father_name or s.mother_name or s.parent_name
                    ),
                })

            stats = {
                "students": len(rows),
                "with_guardian": sum(1 for r in rows if r["has_guardian"]),
                "without_guardian": sum(1 for r in rows if not r["has_guardian"]),
            }
            return jsonify({"success": True, "parents": rows, "stats": stats}), 200

        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Database error while listing guardians")
            return jsonify({"error": "Database error"}), 500
        except Exception:
            logger.exception("Unexpected error while listing guardians")
            return jsonify({"error": "Something went wrong"}), 500


class EventsAPI(MethodView):
    @login_required
    def get(self):
        _, err = _require_admin()
        if err:
            return err
        try:
            events = (
                Event.query.filter(Event.school_id == current_school_id())
                .order_by(Event.event_date.asc())
                .all()
            )
            return jsonify({"success": True, "events": [_event_dict(e) for e in events]}), 200
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Database error while listing events")
            return jsonify({"error": "Database error"}), 500

    @login_required
    def post(self):
        user, err = _require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}

        title = (data.get("title") or "").strip()
        if not title:
            return jsonify({"error": "title is required"}), 400

        try:
            event_date = datetime.strptime(str(data.get("event_date") or ""), "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "event_date must be YYYY-MM-DD"}), 400

        category = data.get("category") or "Other"
        if category not in EVENT_CATEGORIES:
            return jsonify({"error": "category must be one of: " + ", ".join(EVENT_CATEGORIES)}), 400

        try:
            event = Event(
                school_id=current_school_id(),
                title=title,
                description=(data.get("description") or "").strip() or None,
                event_date=event_date,
                location=(data.get("location") or "").strip() or None,
                category=category,
                created_by=user.id,
            )
            db.session.add(event)
            db.session.commit()
            return jsonify({"success": True, "event": _event_dict(event)}), 201
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Database error while creating event")
            return jsonify({"error": "Database error"}), 500


class EventDetailAPI(MethodView):
    @login_required
    def delete(self, event_id):
        _, err = _require_admin()
        if err:
            return err
        try:
            event = Event.query.filter_by(
                id=event_id, school_id=current_school_id()
            ).first()
            if not event:
                return jsonify({"error": "Event not found"}), 404
            db.session.delete(event)
            db.session.commit()
            return jsonify({"success": True, "message": "Event deleted"}), 200
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Database error while deleting event")
            return jsonify({"error": "Database error"}), 500
