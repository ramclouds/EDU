# Header search for every dashboard

import logging
from datetime import date

from flask import jsonify, request
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError

from utils.auth import Admin, NonTeachingStaff, Student, Teacher, db
from utils.auth_middleware import login_required
from utils.rolePermissionManagement import user_has_permission
from utils.tenancy import current_school_id

logger = logging.getLogger(__name__)

MIN_CHARS = 2
MAX_CHARS = 80
PER_GROUP = 6


def _like(term):
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


class GlobalSearchAPI(MethodView):
    @login_required
    def get(self):
        term = (request.args.get("q") or "").strip()[:MAX_CHARS]
        if len(term) < MIN_CHARS:
            return jsonify({"success": True, "query": term, "groups": [],
                            "message": f"Type at least {MIN_CHARS} characters"}), 200
        try:
            return jsonify({"success": True, "query": term, "groups": search(term, request.user)}), 200
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Database error during global search")
            return jsonify({"error": "Search failed. Please try again."}), 500
        except Exception:
            logger.exception("Unexpected error during global search")
            return jsonify({"error": "Search failed. Please try again."}), 500


def search(term, user):
    school_id = current_school_id()
    pattern = _like(term)
    today = date.today()
    groups = []

    def sc(model):
        return model.query.filter(model.school_id == school_id)

    def add(kind, label, items):
        if items:
            groups.append({"type": kind, "label": label, "items": items})

    is_admin = isinstance(user, Admin)
    is_teacher = isinstance(user, Teacher)
    is_student = isinstance(user, Student)

    # ---- people (admins with the right permission) ----
    if is_admin and (user.role == "super_admin" or user_has_permission(user, "academic", "view")):
        rows = sc(Student).filter(
            Student.status == "Active",
            db.or_(Student.first_name.ilike(pattern, escape="\\"),
                   Student.last_name.ilike(pattern, escape="\\"),
                   Student.student_id.ilike(pattern, escape="\\"),
                   Student.father_name.ilike(pattern, escape="\\"))
        ).order_by(Student.first_name).limit(PER_GROUP).all()
        add("student", "Students", [{"id": s.id, "title": f"{s.first_name} {s.last_name or ''}".strip(),
                                     "subtitle": f"ID {s.student_id}"} for s in rows])

    if is_teacher:
        from utils.teacherDetails import TeacherClass
        class_ids = [tc.academic_class_id for tc in TeacherClass.query.filter_by(teacher_id=user.id).all()]
        from utils.studentDetails import StudentAcademicRecord
        student_ids = [r.student_id for r in StudentAcademicRecord.query.filter(
            StudentAcademicRecord.academic_class_id.in_(class_ids), StudentAcademicRecord.is_current.is_(True)).all()] if class_ids else []
        rows = sc(Student).filter(
            Student.id.in_(student_ids), Student.status == "Active",
            db.or_(Student.first_name.ilike(pattern, escape="\\"),
                   Student.last_name.ilike(pattern, escape="\\"),
                   Student.student_id.ilike(pattern, escape="\\"))
        ).order_by(Student.first_name).limit(PER_GROUP).all() if student_ids else []
        add("student", "Students in your classes", [{"id": s.id, "title": f"{s.first_name} {s.last_name or ''}".strip(),
                                                     "subtitle": f"ID {s.student_id}"} for s in rows])

    if is_admin and (user.role == "super_admin" or user_has_permission(user, "academic", "view")):
        rows = sc(Teacher).filter(
            db.or_(Teacher.first_name.ilike(pattern, escape="\\"),
                   Teacher.last_name.ilike(pattern, escape="\\"),
                   Teacher.teacher_id.ilike(pattern, escape="\\"),
                   Teacher.username.ilike(pattern, escape="\\"))
        ).order_by(Teacher.first_name).limit(PER_GROUP).all()
        add("teacher", "Teachers", [{"id": t.id, "title": f"{t.first_name} {t.last_name or ''}".strip(),
                                     "subtitle": f"ID {t.teacher_id}"} for t in rows])

    if is_admin and (user.role == "super_admin" or user_has_permission(user, "hr", "view") or user_has_permission(user, "staff", "view")):
        rows = sc(NonTeachingStaff).filter(
            NonTeachingStaff.is_deleted.is_(False),
            db.or_(NonTeachingStaff.first_name.ilike(pattern, escape="\\"),
                   NonTeachingStaff.last_name.ilike(pattern, escape="\\"),
                   NonTeachingStaff.staff_id.ilike(pattern, escape="\\"))
        ).order_by(NonTeachingStaff.first_name).limit(PER_GROUP).all()
        add("staff", "Staff", [{"id": s.id, "title": f"{s.first_name} {s.last_name or ''}".strip(),
                                "subtitle": f"ID {s.staff_id or '—'}"} for s in rows])

    # ---- library catalogue (everyone; admins need library view) ----
    if not is_admin or user.role == "super_admin" or user_has_permission(user, "library", "view"):
        from utils.library import Book
        rows = sc(Book).filter(
            Book.is_deleted.is_(False),
            db.or_(Book.title.ilike(pattern, escape="\\"),
                   Book.author.ilike(pattern, escape="\\"),
                   Book.isbn.ilike(pattern, escape="\\"),
                   Book.book_code.ilike(pattern, escape="\\"))
        ).order_by(Book.title).limit(PER_GROUP).all()
        add("book", "Books", [{"id": b.id, "title": b.title,
                               "subtitle": f"{b.author or 'Unknown author'} · {b.book_code or ''}".strip(" ·")} for b in rows])

    # ---- assets (admins with assets view) ----
    if is_admin and (user.role == "super_admin" or user_has_permission(user, "assets", "view")):
        from utils.assets import Asset
        rows = sc(Asset).filter(
            Asset.is_deleted.is_(False),
            db.or_(Asset.asset_name.ilike(pattern, escape="\\"),
                   Asset.asset_code.ilike(pattern, escape="\\"),
                   Asset.asset_id.ilike(pattern, escape="\\"),
                   Asset.serial_number.ilike(pattern, escape="\\"))
        ).order_by(Asset.asset_name).limit(PER_GROUP).all()
        add("asset", "Assets", [{"id": a.id, "title": a.asset_name or a.asset_code,
                                 "subtitle": f"{a.asset_code or ''} · {a.category or ''}".strip(" ·")} for a in rows])

    # ---- notices (audience-aware) ----
    from utils.announcement import Notice
    if is_admin:
        audiences = None
    elif is_teacher:
        audiences = ["All", "Teachers"]
    else:
        audiences = ["All", "Students"]
    notice_q = sc(Notice).filter(
        Notice.is_active.is_(True),
        db.or_(Notice.title.ilike(pattern, escape="\\"), Notice.description.ilike(pattern, escape="\\")),
        db.or_(Notice.expiry_date.is_(None), Notice.expiry_date >= today),
    )
    if audiences:
        notice_q = notice_q.filter(Notice.audience.in_(audiences))
    rows = notice_q.order_by(Notice.notice_date.desc()).limit(PER_GROUP).all()
    add("notice", "Notices", [{"id": n.id, "title": n.title,
                               "subtitle": f"{n.audience} · {n.notice_date.isoformat() if n.notice_date else ''}"} for n in rows])

    # ---- events (everyone) ----
    from utils.school_overview import Event
    rows = sc(Event).filter(
        db.or_(Event.title.ilike(pattern, escape="\\"), Event.location.ilike(pattern, escape="\\"))
    ).order_by(Event.event_date.desc()).limit(PER_GROUP).all()
    add("event", "Events", [{"id": e.id, "title": e.title,
                             "subtitle": f"{e.event_date.isoformat()} · {e.category}"} for e in rows])

    return groups
