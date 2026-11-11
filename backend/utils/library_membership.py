"""Library membership for students: only members see the Library section.

Set by an administrator (school office or library staff), one student at a time.
"""
from flask import jsonify, request
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError

from utils.auth import Student, db
from utils.auth_middleware import login_required


class StudentLibraryMembershipAPI(MethodView):
    decorators = [login_required]

    def put(self, student_id):
        if getattr(request, "user_type", None) != "admin":
            return jsonify({"error": "Only administrators can change library membership"}), 403
        data = request.get_json(silent=True) or {}
        if not isinstance(data.get("member"), bool):
            return jsonify({"error": "Send {\"member\": true} or {\"member\": false}"}), 400
        student = Student.query.get(student_id)
        if student is None:
            return jsonify({"error": "Student not found"}), 404
        try:
            student.library_member = data["member"]
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            return jsonify({"error": "Internal server error"}), 500
        return jsonify({"message": "Library membership updated", "library_member": student.library_member}), 200
