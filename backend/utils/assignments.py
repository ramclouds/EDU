import os
import re
from datetime import datetime

from flask import request, jsonify
from flask.views import MethodView
from werkzeug.utils import secure_filename
import traceback
from sqlalchemy import text

from utils.auth import db, Student
from utils.auth_middleware import login_required
from utils.studentDetails import (
    StudentAcademicRecord,
    AcademicClass,
    Batch,
    Division,
    Section,
)

from utils.teacherDetails import TeacherClass, Subject

# =============================
# CONFIG
# =============================
ALLOWED_EXTENSIONS = {"pdf", "doc", "docx"}
UPLOAD_BASE = "Submitted_Assignments"


# =============================
# MODELS
# =============================
class Assignment(db.Model):
    __tablename__ = "assignments"

    id = db.Column(db.Integer, primary_key=True)

    academic_class_id = db.Column(
        db.Integer,
        db.ForeignKey("academic_classes.id", ondelete="CASCADE"),
        nullable=False,
    )

    subject_id = db.Column(
        db.Integer, db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False
    )

    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)

    assigned_date = db.Column(db.Date, nullable=False)
    due_date = db.Column(db.Date, nullable=False)

    total_marks = db.Column(db.Integer, default=100)

    created_by = db.Column(
        db.Integer, db.ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False
    )

    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(
        db.DateTime, server_default=db.func.now(), onupdate=db.func.now()
    )

    # ✅ RELATIONSHIPS (IMPORTANT)
    submissions = db.relationship(
        "AssignmentSubmission",
        backref="assignment",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    files = db.relationship(
        "AssignmentFile",
        backref="assignment",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class AssignmentSubmission(db.Model):
    __tablename__ = "assignment_submissions"

    id = db.Column(db.Integer, primary_key=True)

    assignment_id = db.Column(
        db.Integer, db.ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False
    )

    student_id = db.Column(
        db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )

    submission_file_url = db.Column(db.Text)

    status = db.Column(
        db.Enum("New", "Submitted", "Late", "Needs Resubmission"), default="New"
    )

    submitted_at = db.Column(db.DateTime)

    marks_obtained = db.Column(db.Numeric(5, 2), nullable=True)
    feedback = db.Column(db.Text, nullable=True)

    graded_by = db.Column(
        db.Integer, db.ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True
    )

    graded_at = db.Column(db.DateTime)

    # ✅ RELATIONSHIP (optional but good)
    student = db.relationship("Student", backref="submissions")


class AssignmentFile(db.Model):
    __tablename__ = "assignment_files"

    id = db.Column(db.Integer, primary_key=True)

    assignment_id = db.Column(
        db.Integer, db.ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False
    )

    file_name = db.Column(db.String(255))
    file_url = db.Column(db.Text, nullable=False)


# =============================
# HELPERS
# =============================
def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def sanitize_filename(name):
    return re.sub(r"[^a-zA-Z0-9]", "", name)


def calculate_status(due_date, submitted_at):
    if not due_date:
        return "New"

    now = datetime.utcnow()

    if isinstance(due_date, datetime):
        due_dt = due_date
    else:
        due_dt = datetime.combine(due_date, datetime.max.time())

    if not submitted_at:
        return "New" if now <= due_dt else "Late"

    return "Submitted" if submitted_at <= due_dt else "Late"


def get_student_class_info(student_id):
    record = StudentAcademicRecord.query.filter_by(
        student_id=student_id, is_current=True
    ).first()

    if not record:
        return None

    academic = AcademicClass.query.get(record.academic_class_id)

    batch = Batch.query.get(academic.batch_id)
    division = Division.query.get(academic.division_id)
    section = Section.query.get(academic.section_id)

    return {
        "batch": batch.batch_name,
        "division": division.division_name,
        "section": section.section_name,
        "roll_number": record.roll_number,
    }


def create_folder_structure(info):
    folder_name = f"{info['batch']}_{info['division']}_{info['section']}"
    folder_path = os.path.join(UPLOAD_BASE, folder_name)

    os.makedirs(folder_path, exist_ok=True)

    return folder_path, folder_name


# =============================
# SUBMIT ASSIGNMENT API
# =============================
class SubmitAssignmentAPI(MethodView):

    @login_required
    def post(self, student_id, assignment_id):
        try:
            file = request.files.get("file")

            if not file:
                return jsonify({"error": "File required"}), 400

            if not allowed_file(file.filename):
                return jsonify({"error": "Invalid file type"}), 400

            student = Student.query.get(student_id)
            assignment = Assignment.query.get(assignment_id)

            if not student or not assignment:
                return jsonify({"error": "Invalid student or assignment"}), 404

            info = get_student_class_info(student_id)

            if not info:
                return jsonify({"error": "Student class not found"}), 400

            folder_path, folder_name = create_folder_structure(info)

            clean_title = sanitize_filename(assignment.title)
            ext = file.filename.rsplit(".", 1)[1].lower()

            filename = f"{info['roll_number']}_{info['division']}_{info['section']}_{clean_title}.{ext}"
            filename = secure_filename(filename)

            file_path = os.path.join(folder_path, filename)
            file.save(file_path)

            file_url = f"/{UPLOAD_BASE}/{folder_name}/{filename}"

            submission = AssignmentSubmission.query.filter_by(
                assignment_id=assignment_id, student_id=student_id
            ).first()

            now = datetime.utcnow()
            status = calculate_status(assignment.due_date, now)

            if submission:
                submission.submission_file_url = file_url  # ✅ FIXED
                submission.status = status
                submission.submitted_at = now
            else:
                submission = AssignmentSubmission(
                    assignment_id=assignment_id,
                    student_id=student_id,
                    submission_file_url=file_url,  # ✅ FIXED
                    status=status,
                    submitted_at=now,
                )
                db.session.add(submission)

            db.session.commit()

            total_students = db.session.execute(
                text("""
                    SELECT COUNT(*)
                    FROM student_academic_records
                    WHERE academic_class_id=:cid
                    AND is_current=1
                """),
                {"cid": assignment.academic_class_id},
            ).scalar()

            submitted_count = db.session.execute(
                text("""
                    SELECT COUNT(DISTINCT student_id)
                    FROM assignment_submissions
                    WHERE assignment_id=:aid
                    AND submission_file_url IS NOT NULL
                """),
                {"aid": assignment_id},
            ).scalar()

            return (
                jsonify(
                    {
                        "message": "Assignment submitted successfully",
                        "submission_file": file_url,
                        "status": status,
                        "completion": (
                            round((submitted_count / total_students) * 100)
                            if total_students
                            else 0
                        ),
                    }
                ),
                200,
            )

        except Exception:
            traceback.print_exc()
            return jsonify({"error": "Upload failed"}), 500


# =============================
# GET STUDENT ASSIGNMENTS API
# =============================
class GetStudentAssignmentsAPI(MethodView):

    @login_required
    def get(self, student_id):
        try:
            record = StudentAcademicRecord.query.filter_by(
                student_id=student_id, is_current=True
            ).first()

            if not record:
                return jsonify({"assignments": []}), 200

            class_id = record.academic_class_id

            # ✅ UPDATED QUERY WITH marks + feedback
            query = text("""
                SELECT 
                    a.id,
                    a.title,
                    a.due_date,
                    s.subject_name,

                    af.file_url AS assignment_file_url,

                    sub.submission_file_url,
                    sub.submitted_at,
                    sub.status,

                    sub.marks_obtained,     -- 🔥 ADDED
                    sub.feedback            -- 🔥 ADDED

                FROM assignments a

                LEFT JOIN subjects s 
                    ON a.subject_id = s.id

                LEFT JOIN assignment_files af
                    ON af.assignment_id = a.id

                LEFT JOIN assignment_submissions sub
                    ON sub.assignment_id = a.id
                    AND sub.student_id = :student_id

                WHERE a.academic_class_id = :class_id
                ORDER BY a.due_date ASC
            """)

            result = (
                db.session.execute(
                    query, {"student_id": student_id, "class_id": class_id}
                )
                .mappings()
                .all()
            )

            assignments = []

            for row in result:
                due_date = row.get("due_date")
                submitted_at = row.get("submitted_at")

                raw_status = row.get("status")

                if raw_status == "Needs Resubmission":
                    status = "Needs Resubmission"
                elif submitted_at:
                    status = "Submitted"
                else:
                    status = calculate_status(due_date, submitted_at)

                days_left = None
                if due_date:
                    due_dt = (
                        due_date
                        if isinstance(due_date, datetime)
                        else datetime.combine(due_date, datetime.max.time())
                    )
                    days_left = (due_dt - datetime.utcnow()).days

                assignments.append(
                    {
                        "id": row.get("id"),
                        "title": row.get("title"),
                        "subject": row.get("subject_name"),
                        "due_date": str(due_date) if due_date else None,
                        "assignment_file": row.get("assignment_file_url"),
                        "submission_file": row.get("submission_file_url"),
                        "submitted_at": str(submitted_at) if submitted_at else None,
                        "status": status,
                        # 🔥 NEW FIELDS
                        "marks": row.get("marks_obtained"),
                        "feedback": row.get("feedback"),
                        "is_submitted": bool(submitted_at),
                        "is_late": status in ["Late", "Late Submitted"],
                        "days_left": days_left,
                    }
                )

            return jsonify({"assignments": assignments}), 200

        except Exception as e:
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500


# Get only Teacher Assigned Classes
class TeacherAssignedClassesAPI(MethodView):

    @login_required
    def get(self, teacher_id):

        mappings = (
            db.session.query(
                TeacherClass.id,
                TeacherClass.academic_class_id,
                TeacherClass.subject_id,
                Division.division_name,
                Section.section_name,
                Subject.subject_name,
            )
            .join(AcademicClass, TeacherClass.academic_class_id == AcademicClass.id)
            .join(Division, AcademicClass.division_id == Division.id)
            .join(Section, AcademicClass.section_id == Section.id)
            .join(Subject, TeacherClass.subject_id == Subject.id)
            .filter(TeacherClass.teacher_id == teacher_id)
            .all()
        )

        data = []

        for m in mappings:
            data.append(
                {
                    "academic_class_id": m.academic_class_id,
                    "subject_id": m.subject_id,
                    "class_name": f"{m.division_name} {m.section_name}",
                    "subject_name": m.subject_name,
                }
            )

        return jsonify(data)


# Create Assignment API
class CreateAssignmentAPI(MethodView):

    @login_required
    def post(self, teacher_id):

        try:
            title = request.form.get("title")
            description = request.form.get("description")

            academic_class_id = int(request.form.get("academic_class_id"))

            subject_id = int(request.form.get("subject_id"))

            assigned_date = datetime.strptime(
                request.form.get("assigned_date"), "%Y-%m-%d"
            ).date()

            due_date = datetime.strptime(
                request.form.get("due_date"), "%Y-%m-%d"
            ).date()

            total_marks = int(request.form.get("total_marks", 100))

            allowed = TeacherClass.query.filter_by(
                teacher_id=teacher_id,
                academic_class_id=academic_class_id,
                subject_id=subject_id,
            ).first()

            if not allowed:
                return jsonify({"error": "Not authorized"}), 403

            assignment = Assignment(
                title=title,
                description=description,
                academic_class_id=academic_class_id,
                subject_id=subject_id,
                assigned_date=assigned_date,
                due_date=due_date,
                total_marks=total_marks,
                created_by=teacher_id,
            )

            db.session.add(assignment)
            db.session.flush()

            file = request.files.get("file")

            if file:

                os.makedirs("Assignment_Files", exist_ok=True)

                filename = secure_filename(file.filename)

                file.save(os.path.join("Assignment_Files", filename))

                db.session.add(
                    AssignmentFile(
                        assignment_id=assignment.id,
                        file_name=filename,
                        file_url=f"/Assignment_Files/{filename}",
                    )
                )

            db.session.commit()

            return jsonify({"message": "Assignment created", "id": assignment.id}), 201

        except Exception as e:
            db.session.rollback()
            traceback.print_exc()

            return jsonify({"error": str(e)}), 500


# Teacher Assignment Dashboard API (Accordion Data)
class TeacherAssignmentsAPI(MethodView):

    @login_required
    def get(self, teacher_id):

        query = text("""
SELECT
a.id,
a.title,
a.due_date,
s.subject_name,
ac.id class_id,
d.division_name,
sec.section_name,

COUNT(DISTINCT sar.student_id) total_students,

COUNT(
DISTINCT CASE
WHEN sub.submission_file_url IS NOT NULL
THEN sub.student_id
END
) submitted

FROM assignments a

JOIN academic_classes ac
ON a.academic_class_id=ac.id

JOIN divisions d
ON ac.division_id=d.id

JOIN sections sec
ON ac.section_id=sec.id

JOIN subjects s
ON a.subject_id=s.id

JOIN teacher_classes tc
ON tc.academic_class_id=ac.id
AND tc.subject_id=a.subject_id

LEFT JOIN student_academic_records sar
ON sar.academic_class_id=ac.id
AND sar.is_current=1

LEFT JOIN assignment_submissions sub
ON sub.assignment_id=a.id

WHERE tc.teacher_id=:teacher_id

GROUP BY a.id
ORDER BY due_date DESC
""")

        rows = db.session.execute(query, {"teacher_id": teacher_id}).mappings().all()

        data = []

        for r in rows:

            pending = r.total_students - r.submitted

            data.append(
                {
                    "id": r.id,
                    "title": r.title,
                    "class_name": f"{r.division_name} {r.section_name}",
                    "subject": r.subject_name,
                    "submitted": int(r.submitted or 0),
                    "pending": int(pending or 0),
                    "total_students": int(r.total_students or 0),  # ✅ ADD THIS
                    "completion": (
                        round(r.submitted / r.total_students * 100)
                        if r.total_students
                        else 0
                    ),
                }
            )

        return jsonify(data)


# Assignment Detail Modal API (Submitted/Pending)
class AssignmentSubmissionListAPI(MethodView):

    @login_required
    def get(self, assignment_id):

        query = text("""
SELECT
    st.id,
    CONCAT(st.first_name,' ',st.last_name) AS student_name,

    COALESCE(sub.status, 'Pending') AS status,
    sub.submission_file_url,
    sub.marks_obtained,
    sub.feedback

FROM student_academic_records sar

JOIN students st
    ON sar.student_id = st.id

LEFT JOIN assignment_submissions sub
    ON sub.student_id = st.id
   AND sub.assignment_id = :aid   -- ✅ DIRECT JOIN (CORRECT)

WHERE sar.academic_class_id = (
    SELECT academic_class_id
    FROM assignments
    WHERE id = :aid
)
""")

        rows = db.session.execute(query, {"aid": assignment_id}).mappings().all()

        students = []

        for r in rows:
            students.append(
                {
                    "id": r["id"],
                    "student_name": r["student_name"],
                    "status": r["status"] if r["status"] else "Pending",
                    "submission_file_url": r["submission_file_url"],
                    # ✅ proper null-safe casting
                    "marks_obtained": (
                        float(r["marks_obtained"])
                        if r["marks_obtained"] is not None
                        else None
                    ),
                    "feedback": r["feedback"] if r["feedback"] else None,
                }
            )

        return jsonify(students), 200


# Grading API
class GradeAssignmentAPI(MethodView):

    @login_required
    def put(self, submission_id):

        data = request.get_json()

        sub = AssignmentSubmission.query.get(submission_id)

        sub.marks_obtained = data.get("marks")
        sub.feedback = data.get("feedback")
        sub.graded_at = datetime.utcnow()
        sub.graded_by = data.get("graded_by")

        db.session.commit()

        # 🔥 FORCE FRESH LOAD FROM DB
        db.session.refresh(sub)

        return jsonify(
            {
                "message": "Graded",
                "id": sub.id,
                "marks": (
                    float(sub.marks_obtained)
                    if sub.marks_obtained is not None
                    else None
                ),
                "feedback": sub.feedback,
            }
        )


# Add Edit/Delete for assignments
class UpdateAssignmentAPI(MethodView):

    @login_required
    def put(self, teacher_id, assignment_id):

        try:
            assignment = Assignment.query.get_or_404(assignment_id)

            if assignment.created_by != teacher_id:
                return jsonify({"error": "Unauthorized"}), 403

            data = request.get_json()

            assignment.title = data.get("title", assignment.title)

            assignment.description = data.get("description", assignment.description)

            if data.get("due_date"):
                assignment.due_date = datetime.strptime(
                    data["due_date"], "%Y-%m-%d"
                ).date()

            if data.get("total_marks"):
                assignment.total_marks = data["total_marks"]

            db.session.commit()

            return jsonify({"message": "Updated"})

        except Exception as e:
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500


class DeleteAssignmentAPI(MethodView):

    @login_required
    def delete(self, teacher_id, assignment_id):

        try:
            assignment = Assignment.query.get_or_404(assignment_id)

            if assignment.created_by != teacher_id:
                return jsonify({"error": "Unauthorized"}), 403

            # =============================
            # 🔥 DELETE FILES FROM DISK
            # =============================

            # 1. Assignment files (teacher uploads)
            for f in assignment.files:
                if f.file_url:
                    file_path = f.file_url.lstrip("/")
                    if os.path.exists(file_path):
                        os.remove(file_path)

            # 2. Submission files (single file field)
            for sub in assignment.submissions:
                if sub.submission_file_url:
                    file_path = sub.submission_file_url.lstrip("/")
                    if os.path.exists(file_path):
                        os.remove(file_path)

                # 3. SubmissionFile table (multi-files)
                for sf in getattr(sub, "files", []):
                    if sf.assignment_file_url:
                        file_path = sf.assignment_file_url.lstrip("/")
                        if os.path.exists(file_path):
                            os.remove(file_path)

            # =============================
            # 🔥 DELETE DB (CASCADE)
            # =============================
            db.session.delete(assignment)
            db.session.commit()

            return jsonify({"message": "Assignment deleted successfully"}), 200

        except Exception as e:
            db.session.rollback()
            traceback.print_exc()

            return jsonify({"error": "Delete failed", "details": str(e)}), 500


# =============================
# RECHECK / FORCE RESUBMIT API
# =============================
class ForceResubmitAPI(MethodView):

    @login_required
    def post(self, submission_id):
        try:
            sub = AssignmentSubmission.query.get(submission_id)

            if not sub:
                return jsonify({"error": "Submission not found"}), 404

            # 🔥 Update status to recheck
            sub.status = "Needs Resubmission"

            # optional: clear marks (recommended)
            sub.marks_obtained = None

            # optional: keep feedback OR reset
            # sub.feedback = None

            db.session.commit()

            return jsonify({"message": "Marked for recheck", "status": sub.status}), 200

        except Exception as e:
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500
