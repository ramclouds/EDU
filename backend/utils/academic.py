from flask import jsonify, send_file
from flask.views import MethodView
import re
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
import logging
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from flask import request
from utils.auth import db, Teacher
from utils.auth_middleware import login_required
from utils.rolePermissionManagement import permission_required
from utils.subjects import Subject
from utils.studentDetails import (
    StudentAcademicRecord,
    Student,
    AcademicClass,
    Division,
    Section,
    Batch,
)

logger = logging.getLogger(__name__)


from utils.tenancy import (
    caller_can_access_student,
    caller_can_access_teacher,
    current_school_id as _current_school_id,
)



# MODELS
class Exam(db.Model):
    __tablename__ = "exams"

    id = db.Column(db.Integer, primary_key=True)
    # Denormalized (see AcademicClass.school_id) — the (class, year, name)
    # unique constraint below is already effectively per-school because
    # academic_class_id belongs to exactly one school.
    school_id = db.Column(
        db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True
    )
    academic_class_id = db.Column(
        db.Integer, db.ForeignKey("academic_classes.id"), nullable=False, index=True
    )
    academic_year = db.Column(db.String(20), nullable=False, index=True)
    exam_name = db.Column(db.String(100), nullable=False)
    exam_type = db.Column(db.String(50))
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    is_published = db.Column(db.Boolean, default=False)
    is_verified = db.Column(db.Boolean, default=False)
    publish_at = db.Column(db.DateTime)
    published_at = db.Column(db.DateTime)
    verified_at = db.Column(db.DateTime)
    # Admin permission for teachers to enter/update marks
    marks_entry_enabled = db.Column(db.Boolean, default=False, nullable=False)
    verified_by = db.Column(db.Integer, db.ForeignKey("teachers.id"))
    created_at = db.Column(db.DateTime, server_default=func.now())
    updated_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        db.UniqueConstraint(
            "academic_class_id", "academic_year", "exam_name", name="uq_exam"
        ),
    )


class ExamSubject(db.Model):
    __tablename__ = "exam_subjects"

    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey("exams.id"), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id"), nullable=False)
    internal_max = db.Column(db.Float, default=20)
    external_max = db.Column(db.Float, default=50)
    oral_max = db.Column(db.Float, default=10)
    practical_max = db.Column(db.Float, default=20)
    passing_marks = db.Column(db.Float, default=35)
    __table_args__ = (
        db.UniqueConstraint("exam_id", "subject_id", name="uq_exam_subject"),
    )


class ExamResult(db.Model):
    __tablename__ = "exam_results"

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(
        db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True
    )
    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.id"),
        nullable=False,
        index=True,
    )
    exam_id = db.Column(
        db.Integer,
        db.ForeignKey("exams.id"),
        nullable=False,
        index=True,
    )
    subject_id = db.Column(
        db.Integer,
        db.ForeignKey("subjects.id"),
        nullable=False,
        index=True,
    )

    # MARKS
    internal_marks = db.Column(db.Float, default=0)
    external_marks = db.Column(db.Float, default=0)
    oral_marks = db.Column(db.Float, default=0)
    practical_marks = db.Column(db.Float, default=0)

    # OUT OF
    internal_out_of = db.Column(db.Float, default=0)
    external_out_of = db.Column(db.Float, default=0)
    oral_out_of = db.Column(db.Float, default=0)
    practical_out_of = db.Column(db.Float, default=0)

    # RESULT
    total_marks = db.Column(db.Float, default=0)
    percentage = db.Column(db.Float, default=0)
    grade = db.Column(db.String(5))

    status = db.Column(db.String(20), default="Draft")
    remarks = db.Column(db.Text)
    created_by = db.Column(
        db.Integer,
        db.ForeignKey("teachers.id"),
    )
    created_at = db.Column(
        db.DateTime,
        server_default=func.now(),
    )
    updated_at = db.Column(
        db.DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
    __table_args__ = (
        db.UniqueConstraint(
            "student_id",
            "exam_id",
            "subject_id",
            name="uq_student_exam_subject",
        ),
    )


# RESULT AUDIT LOG TABLE
class ExamResultAudit(db.Model):
    __tablename__ = "exam_result_audit"

    id = db.Column(db.Integer, primary_key=True)
    result_id = db.Column(db.Integer, db.ForeignKey("exam_results.id"))
    updated_by = db.Column(db.Integer, db.ForeignKey("teachers.id"))
    old_total = db.Column(db.Float)
    new_total = db.Column(db.Float)
    action = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, server_default=func.now())


# MAIN API
class StudentExamResultsAPI(MethodView):
    @login_required
    def get(self, student_id):
        try:
            allowed, _ = caller_can_access_student(student_id)
            if not allowed:
                return jsonify({"error": "Forbidden"}), 403

            year = request.args.get("year")
            exam = request.args.get("exam")

            record = StudentAcademicRecord.query.filter_by(
                student_id=student_id, is_current=True
            ).first()

            if not record:
                return jsonify({"error": "Academic record not found"}), 404

            query = (
                db.session.query(
                    Exam.academic_year,
                    Exam.exam_name,
                    Subject.subject_name,
                    ExamResult.internal_marks,
                    ExamResult.external_marks,
                    ExamResult.oral_marks,
                    ExamResult.practical_marks,
                    ExamResult.internal_out_of,
                    ExamResult.external_out_of,
                    ExamResult.oral_out_of,
                    ExamResult.practical_out_of,
                    ExamResult.total_marks,
                    ExamResult.percentage,
                    ExamResult.grade,
                    ExamResult.status,
                    ExamResult.remarks,
                )
                .join(Exam, Exam.id == ExamResult.exam_id)
                .join(Subject, Subject.id == ExamResult.subject_id)
                .filter(ExamResult.student_id == student_id)
            )

            if year and year != "all":
                query = query.filter(Exam.academic_year == year)

            if exam and exam != "all":
                query = query.filter(Exam.exam_name == exam)

            results = query.order_by(Exam.academic_year.desc()).all()

            data = [
                {
                    "year": r.academic_year,
                    "exam": r.exam_name,
                    "subject": r.subject_name,
                    "internal": r.internal_marks or 0,
                    "external": r.external_marks or 0,
                    "oral": r.oral_marks or 0,
                    "practical": r.practical_marks or 0,
                    "internalOutOf": r.internal_out_of or 0,
                    "externalOutOf": r.external_out_of or 0,
                    "oralOutOf": r.oral_out_of or 0,
                    "practicalOutOf": r.practical_out_of or 0,
                    "marks": float(r.total_marks or 0),
                    "percentage": float(r.percentage or 0),
                    "grade": r.grade,
                    "status": r.status,
                    "remarks": r.remarks,
                }
                for r in results
            ]

            return jsonify(data), 200

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Something went wrong"}), 500


# PERFORMANCE (CHART DATA)
class PerformanceAPI(MethodView):
    @login_required
    def get(self, student_id):
        try:
            allowed, _ = caller_can_access_student(student_id)
            if not allowed:
                return jsonify({"error": "Forbidden"}), 403

            results = (
                db.session.query(
                    Exam.exam_name, func.avg(ExamResult.total_marks).label("avg_marks")
                )
                .join(Exam, Exam.id == ExamResult.exam_id)
                .filter(ExamResult.student_id == student_id)
                .group_by(Exam.exam_name)
                .all()
            )

            data = {
                "labels": [r.exam_name for r in results],
                "marks": [float(r.avg_marks) for r in results],
            }

            return jsonify(data), 200

        except Exception as e:
            logger.exception(f"Performance error: {e}")
            return jsonify({"error": "Something went wrong"}), 500


# UPCOMING EXAMS
class UpcomingExamsAPI(MethodView):
    @login_required
    def get(self, student_id):
        try:
            allowed, _ = caller_can_access_student(student_id)
            if not allowed:
                return jsonify({"error": "Forbidden"}), 403

            record = StudentAcademicRecord.query.filter_by(
                student_id=student_id, is_current=True
            ).first()

            if not record:
                return jsonify([]), 200

            exams = (
                Exam.query.filter(Exam.academic_class_id == record.academic_class_id)
                .order_by(Exam.start_date.asc())
                .limit(5)
                .all()
            )

            data = [
                {
                    "subject": "N/A",  # can map later if needed
                    "exam": e.exam_name,
                    "start_date": str(e.start_date),
                    "end_date": str(e.end_date),
                }
                for e in exams
            ]

            return jsonify(data), 200

        except Exception as e:
            logger.exception(f"Upcoming exams error: {e}")
            return jsonify({"error": "Something went wrong"}), 500


class TeacherExamsAPI(MethodView):
    @login_required
    def get(self):
        try:
            from utils.teacherDetails import TeacherClass

            teacher_id = request.args.get("teacher_id")
            class_id = request.args.get("class_id")
            subject_id = request.args.get("subject_id")

            if not teacher_id:
                return jsonify({"error": "teacher_id required"}), 400

            allowed, _ = caller_can_access_teacher(teacher_id)
            if not allowed:
                return jsonify({"error": "Forbidden"}), 403

            teacher_classes = TeacherClass.query.filter_by(teacher_id=teacher_id).all()
            assigned_class_ids = list(
                set([tc.academic_class_id for tc in teacher_classes])
            )

            query = Exam.query.filter(
                Exam.academic_class_id.in_(assigned_class_ids),
                Exam.school_id == _current_school_id(),
            )

            if class_id and class_id != "all":
                query = query.filter(Exam.academic_class_id == int(class_id))

            exams = query.order_by(Exam.created_at.desc()).all()

            data = [
                {
                    "id": exam.id,
                    "exam_id": exam.id,
                    "exam_name": exam.exam_name,
                    "academic_year": exam.academic_year,
                    "exam_type": exam.exam_type,
                    "academic_class_id": exam.academic_class_id,
                    "label": f"{exam.exam_name} - {exam.exam_type or 'Exam'} - {exam.academic_year}",
                    "marks_entry_enabled": bool(
                        getattr(exam, "marks_entry_enabled", False)
                    ),
                    "is_verified": bool(getattr(exam, "is_verified", False)),
                    "is_published": bool(getattr(exam, "is_published", False)),
                }
                for exam in exams
            ]

            return jsonify(data), 200

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Failed to load teacher exams"}), 500


# FILTER OPTIONS API
class ExamFilterOptionsAPI(MethodView):
    @login_required
    def get(self, student_id):
        try:
            allowed, _ = caller_can_access_student(student_id)
            if not allowed:
                return jsonify({"error": "Forbidden"}), 403

            years = (
                db.session.query(Exam.academic_year)
                .join(ExamResult, Exam.id == ExamResult.exam_id)
                .filter(ExamResult.student_id == student_id)
                .distinct()
                .order_by(Exam.academic_year.desc())
                .all()
            )

            exams = (
                db.session.query(Exam.exam_name)
                .join(ExamResult, Exam.id == ExamResult.exam_id)
                .filter(ExamResult.student_id == student_id)
                .distinct()
                .all()
            )

            return (
                jsonify(
                    {"years": [y[0] for y in years], "exams": [e[0] for e in exams]}
                ),
                200,
            )

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Failed to load filters"}), 500


# DOWNLOAD PDF (UPDATED - MATCH TEACHER SYSTEM)
class DownloadResultPDF(MethodView):
    @login_required
    def get(self, student_id):
        try:
            allowed, student = caller_can_access_student(student_id)
            if not allowed:
                return jsonify({"error": "Forbidden"}), 403

            if not student:
                return jsonify({"error": "Student not found"}), 404

            record = StudentAcademicRecord.query.filter_by(
                student_id=student_id, is_current=True
            ).first()

            if not record:
                return jsonify({"error": "Academic record not found"}), 404

            academic = AcademicClass.query.get(record.academic_class_id)

            division = Division.query.get(academic.division_id)
            section = Section.query.get(academic.section_id)

            roll_no = record.roll_number or "N/A"

            # ================= FETCH RESULTS (JOINED PROPERLY) =================
            results = (
                db.session.query(ExamResult, Exam, Subject)
                .join(Exam, Exam.id == ExamResult.exam_id)
                .join(Subject, Subject.id == ExamResult.subject_id)
                .filter(ExamResult.student_id == student_id)
                .order_by(Exam.id.desc())
                .all()
            )

            if not results:
                return jsonify({"error": "No results found"}), 404

            # ================= CALCULATIONS =================
            total_obtained = 0
            total_out_of = 0

            for res, exam, subject in results:
                total_obtained += res.total_marks or 0

                total_out_of += (
                    (res.internal_out_of or 0)
                    + (res.external_out_of or 0)
                    + (res.oral_out_of or 0)
                    + (res.practical_out_of or 0)
                )

            percentage = (
                round((total_obtained / total_out_of) * 100, 2)
                if total_out_of > 0
                else 0
            )

            # ================= RESULT STATUS =================
            result_status = "Pass"
            if percentage < 35:
                result_status = "Fail"

            year = results[0][1].academic_year
            exam_name = results[0][1].exam_name

            # ================= PDF SETUP =================
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4)

            elements = []

            center_bold = ParagraphStyle(
                name="center_bold", alignment=TA_CENTER, fontSize=16, spaceAfter=8
            )

            small_center = ParagraphStyle(
                name="small_center", alignment=TA_CENTER, fontSize=10
            )

            # ================= HEADER =================
            elements.append(Paragraph("<b>SCHOOL NAME</b>", center_bold))
            elements.append(Paragraph(f"<b>{exam_name} - {year}</b>", small_center))
            elements.append(Spacer(1, 12))

            # ================= STUDENT INFO =================
            student_info = [
                [
                    "Student Name",
                    f"{student.first_name} {student.last_name}",
                    "Roll No",
                    roll_no,
                ],
                [
                    "Class",
                    division.division_name,
                    "Section",
                    section.section_name,
                ],
                [
                    "Result",
                    result_status,
                    "Percentage",
                    f"{percentage}%",
                ],
            ]

            student_table = Table(student_info, colWidths=[120, 140, 80, 120])
            student_table.setStyle(
                TableStyle(
                    [
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                        ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
                    ]
                )
            )

            elements.append(student_table)
            elements.append(Spacer(1, 15))

            # ================= MARKS TABLE =================
            marks_data = [
                [
                    "Subject",
                    "Internal (I/O)",
                    "External (I/O)",
                    "Oral (I/O)",
                    "Practical (I/O)",
                    "Total",
                    "Grade",
                ]
            ]

            for res, exam, subject in results:
                marks_data.append(
                    [
                        subject.subject_name.upper(),
                        f"{res.internal_marks}/{res.internal_out_of}",
                        f"{res.external_marks}/{res.external_out_of}",
                        f"{res.oral_marks}/{res.oral_out_of}",
                        f"{res.practical_marks}/{res.practical_out_of}",
                        f"{res.total_marks}",
                        res.grade,
                    ]
                )

            marks_table = Table(marks_data, colWidths=[90, 70, 70, 70, 70, 60, 50])

            marks_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2E86C1")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                    ]
                )
            )

            elements.append(marks_table)
            elements.append(Spacer(1, 15))

            # ================= SUMMARY =================
            summary_table = Table(
                [
                    ["Total Obtained", total_obtained],
                    ["Total Out Of", total_out_of],
                    ["Final Percentage", f"{percentage}%"],
                ],
                colWidths=[200, 200],
            )

            summary_table.setStyle(
                TableStyle(
                    [
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                        ("BACKGROUND", (0, 0), (-1, -1), colors.whitesmoke),
                    ]
                )
            )

            elements.append(summary_table)

            # ================= BUILD PDF =================
            doc.build(elements)
            buffer.seek(0)

            safe_name = re.sub(
                r"[^a-zA-Z0-9]", "_", student.first_name + student.last_name
            )

            filename = f"{safe_name}_{year}_result.pdf"

            return send_file(
                buffer,
                as_attachment=True,
                download_name=filename,
                mimetype="application/pdf",
            )

        except Exception as e:
            logger.exception(f"PDF error: {e}")
            return jsonify({"error": "Failed to generate PDF"}), 500


# ========================= GET TEACHER ASSIGNED STUDENTS =========================
class TeacherStudentsAPI(MethodView):

    @login_required
    def get(self):
        try:
            from utils.teacherDetails import TeacherClass

            teacher_id = request.args.get("teacher_id")

            allowed, _ = caller_can_access_teacher(teacher_id)
            if not allowed:
                return jsonify({"error": "Forbidden"}), 403

            teacher_classes = TeacherClass.query.filter_by(teacher_id=teacher_id).all()

            academic_class_ids = [tc.academic_class_id for tc in teacher_classes]

            records = (
                db.session.query(
                    StudentAcademicRecord,
                    Student,
                    AcademicClass,
                    Division,
                    Section,
                )
                .join(Student, Student.id == StudentAcademicRecord.student_id)
                .join(
                    AcademicClass,
                    AcademicClass.id == StudentAcademicRecord.academic_class_id,
                )
                .join(Division, Division.id == AcademicClass.division_id)
                .join(Section, Section.id == AcademicClass.section_id)
                .filter(
                    StudentAcademicRecord.is_current == True,
                    StudentAcademicRecord.academic_class_id.in_(academic_class_ids),
                )
                .all()
            )

            data = []

            for record, student, academic, division, section in records:

                # ✅ CHECK IF RESULT EXISTS
                published_result = (
                    db.session.query(ExamResult)
                    .filter(
                        ExamResult.student_id == student.id,
                        ExamResult.status == "Published",
                    )
                    .first()
                )

                status = "Completed" if published_result else "Pending"

                data.append(
                    {
                        "id": student.id,
                        "name": f"{student.first_name} {student.last_name}",
                        "rollNo": record.roll_number,
                        "className": f"{division.division_name}-{section.section_name}",
                        "division": division.division_name,
                        "section": section.section_name,
                        "academic_class_id": academic.id,
                        "status": status,  # ✅ FIXED
                    }
                )

            return jsonify(data), 200

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Failed to load students"}), 500


# ========================= TEACHER SUBJECTS =========================
class TeacherSubjectsAPI(MethodView):

    @login_required
    def get(self):
        try:
            from utils.teacherDetails import TeacherClass

            teacher_id = request.args.get("teacher_id")

            if not teacher_id:
                return jsonify({"error": "teacher_id required"}), 400

            allowed, _ = caller_can_access_teacher(teacher_id)
            if not allowed:
                return jsonify({"error": "Forbidden"}), 403

            teacher_classes = TeacherClass.query.filter_by(teacher_id=teacher_id).all()
            subject_ids = list(set([tc.subject_id for tc in teacher_classes]))
            subjects = Subject.query.filter(Subject.id.in_(subject_ids)).all()

            data = [
                {
                    "id": s.id,
                    "name": s.subject_name,
                }
                for s in subjects
            ]

            return jsonify(data), 200

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Failed to load subjects"}), 500


# ========================= TEACHER CLASSES =========================
class TeacherClassesAPI(MethodView):

    @login_required
    def get(self):
        try:
            from utils.teacherDetails import TeacherClass

            teacher_id = request.args.get("teacher_id")

            if not teacher_id:
                return jsonify({"error": "teacher_id required"}), 400

            allowed, _ = caller_can_access_teacher(teacher_id)
            if not allowed:
                return jsonify({"error": "Forbidden"}), 403

            teacher_classes = TeacherClass.query.filter_by(teacher_id=teacher_id).all()

            class_data = []

            for tc in teacher_classes:

                academic = AcademicClass.query.get(tc.academic_class_id)

                if not academic:
                    continue

                division = Division.query.get(academic.division_id)
                section = Section.query.get(academic.section_id)
                class_data.append(
                    {
                        "id": academic.id,
                        "name": f"{division.division_name}-{section.section_name}",
                    }
                )

            return jsonify(class_data), 200

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Failed to load classes"}), 500


# ========================= GET SINGLE STUDENT MARKS =========================
class TeacherStudentMarksAPI(MethodView):

    @login_required
    def get(self, student_id):
        try:
            allowed, _ = caller_can_access_student(student_id)
            if not allowed:
                return jsonify({"error": "Forbidden"}), 403

            subject = request.args.get("subject")
            exam = request.args.get("exam")

            result = (
                db.session.query(
                    ExamResult,
                    Exam,
                    Subject,
                )
                .join(
                    Exam,
                    Exam.id == ExamResult.exam_id,
                )
                .join(
                    Subject,
                    Subject.id == ExamResult.subject_id,
                )
                .filter(
                    ExamResult.student_id == student_id,
                    Subject.subject_name == subject,
                    Exam.exam_name == exam,
                )
                .first()
            )

            if not result:
                return jsonify(
                    {
                        "internal": 0,
                        "external": 0,
                        "oral": 0,
                        "practical": 0,
                    }
                )

            exam_result = result[0]

            internal = exam_result.internal_marks or 0
            external = exam_result.external_marks or 0
            oral = exam_result.oral_marks or 0
            practical = exam_result.practical_marks or 0
            return jsonify(
                {
                    "internal": internal,
                    "external": external,
                    "oral": oral,
                    "practical": practical,
                    "internalOutOf": exam_result.internal_out_of or 0,
                    "externalOutOf": exam_result.external_out_of or 0,
                    "oralOutOf": exam_result.oral_out_of or 0,
                    "practicalOutOf": exam_result.practical_out_of or 0,
                    "marks": exam_result.total_marks,
                    "percentage": exam_result.percentage,
                    "status": exam_result.status,
                    "grade": exam_result.grade,
                    "remarks": exam_result.remarks or "",
                }
            )

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Failed to load marks"}), 500


# ========================= SAVE STUDENT MARKS =========================
class SaveTeacherMarksAPI(MethodView):

    @login_required
    def post(self):
        try:
            data = request.get_json()

            student_id = data.get("studentId")
            subject_name = data.get("subject")
            exam_name = data.get("examType")

            allowed, _ = caller_can_access_student(student_id)
            if not allowed:
                return jsonify({"error": "Forbidden"}), 403

            school_id = _current_school_id()

            # MARKS
            internal = float(data.get("internal", 0))
            external = float(data.get("external", 0))
            oral = float(data.get("oral", 0))
            practical = float(data.get("practical", 0))

            # OUT OF
            internal_out_of = float(data.get("internalOutOf", 0))
            external_out_of = float(data.get("externalOutOf", 0))
            oral_out_of = float(data.get("oralOutOf", 0))
            practical_out_of = float(data.get("practicalOutOf", 0))

            remarks = data.get("remarks", "")

            # ================= VALIDATIONS =================

            if internal < 0 or external < 0 or oral < 0 or practical < 0:
                return jsonify({"error": "Negative marks not allowed"}), 400

            if internal > internal_out_of:
                return jsonify({"error": "Internal marks exceed OutOf"}), 400

            if external > external_out_of:
                return jsonify({"error": "External marks exceed OutOf"}), 400

            if oral > oral_out_of:
                return jsonify({"error": "Oral marks exceed OutOf"}), 400

            if practical > practical_out_of:
                return jsonify({"error": "Practical marks exceed OutOf"}), 400

            # ================= TOTAL =================

            total = internal + external + oral + practical

            total_out_of = (
                internal_out_of + external_out_of + oral_out_of + practical_out_of
            )

            percentage = (
                round((total / total_out_of) * 100, 2) if total_out_of > 0 else 0
            )

            # ================= GRADE =================

            if percentage >= 90:
                grade = "A+"
            elif percentage >= 80:
                grade = "A"
            elif percentage >= 70:
                grade = "B+"
            elif percentage >= 60:
                grade = "B"
            elif percentage >= 50:
                grade = "C"
            elif percentage >= 35:
                grade = "Pass"
            else:
                grade = "Fail"

            # ================= SUBJECT =================

            subject = Subject.query.filter_by(
                subject_name=subject_name, school_id=school_id
            ).first()

            if not subject:
                return jsonify({"error": "Subject not found"}), 404

            # ================= STUDENT RECORD =================

            academic_record = StudentAcademicRecord.query.filter_by(
                student_id=student_id,
                is_current=True,
            ).first()

            if not academic_record:
                return jsonify({"error": "Student academic record missing"}), 404

            # ================= EXAM =================
            academic_year = data.get("academicYear") or data.get("academic_year")
            exam_query = Exam.query.filter_by(
                academic_class_id=academic_record.academic_class_id,
                exam_name=exam_name,
                school_id=school_id,
            )

            if academic_year:
                exam_query = exam_query.filter_by(academic_year=academic_year)

            exam = exam_query.order_by(Exam.created_at.desc()).first()

            if not exam:
                return (
                    jsonify(
                        {
                            "error": "Exam is not created by admin for this class and academic year."
                        }
                    ),
                    404,
                )

            if not exam.marks_entry_enabled:
                return (
                    jsonify(
                        {
                            "error": "Marks entry is currently disabled by admin for this exam."
                        }
                    ),
                    403,
                )

            if exam.is_published:
                return (
                    jsonify({"error": "Published exam results cannot be edited."}),
                    403,
                )

            # ================= CHECK EXISTING =================

            result = ExamResult.query.filter_by(
                student_id=student_id,
                exam_id=exam.id,
                subject_id=subject.id,
            ).first()

            if result:

                old_total = result.total_marks

                result.internal_marks = internal
                result.external_marks = external
                result.oral_marks = oral
                result.practical_marks = practical

                result.internal_out_of = internal_out_of
                result.external_out_of = external_out_of
                result.oral_out_of = oral_out_of
                result.practical_out_of = practical_out_of

                result.total_marks = total
                result.percentage = percentage
                result.grade = grade
                result.status = "Submitted"
                result.remarks = remarks

                audit = ExamResultAudit(
                    result_id=result.id,
                    updated_by=data.get("teacherId"),
                    old_total=old_total,
                    new_total=total,
                    action="UPDATED",
                )

                db.session.add(audit)

            else:

                result = ExamResult(
                    student_id=student_id,
                    exam_id=exam.id,
                    subject_id=subject.id,
                    internal_marks=internal,
                    external_marks=external,
                    oral_marks=oral,
                    practical_marks=practical,
                    internal_out_of=internal_out_of,
                    external_out_of=external_out_of,
                    oral_out_of=oral_out_of,
                    practical_out_of=practical_out_of,
                    total_marks=total,
                    percentage=percentage,
                    grade=grade,
                    status="Submitted",
                    remarks=remarks,
                    created_by=data.get("teacherId"),
                    school_id=school_id,
                )

                db.session.add(result)

            db.session.commit()

            return (
                jsonify(
                    {
                        "message": "Marks saved successfully",
                        "percentage": percentage,
                        "grade": grade,
                    }
                ),
                200,
            )

        except Exception as e:
            logger.exception(e)

            db.session.rollback()

            return jsonify({"error": "Failed to save marks"}), 500


# ========================= REPORT CARD =========================
class TeacherReportCardAPI(MethodView):

    @login_required
    def get(self, student_id):
        try:
            allowed, student = caller_can_access_student(student_id)
            if not allowed:
                return jsonify({"error": "Forbidden"}), 403

            if not student:
                return jsonify({"error": "Student not found"}), 404

            academic_record = StudentAcademicRecord.query.filter_by(
                student_id=student_id,
                is_current=True,
            ).first()

            if not academic_record:
                return jsonify({"error": "Academic record missing"}), 404

            academic = AcademicClass.query.get(academic_record.academic_class_id)
            division = Division.query.get(academic.division_id)
            section = Section.query.get(academic.section_id)

            results = (
                db.session.query(
                    ExamResult,
                    Subject,
                )
                .join(
                    Subject,
                    Subject.id == ExamResult.subject_id,
                )
                .filter(ExamResult.student_id == student_id)
                .all()
            )

            subjects = []
            total_marks = 0

            for result, subject in results:

                internal = result.internal_marks or 0
                external = result.external_marks or 0
                oral = result.oral_marks or 0
                practical = result.practical_marks or 0
                total_marks += result.total_marks
                subjects.append(
                    {
                        "subject": subject.subject_name,
                        "internal": internal,
                        "external": external,
                        "practical": practical,
                        "oral": oral,
                        "internalOutOf": result.internal_out_of,
                        "externalOutOf": result.external_out_of,
                        "practicalOutOf": result.practical_out_of,
                        "oralOutOf": result.oral_out_of,
                        "total": result.total_marks,
                        "percentage": result.percentage,
                        "status": result.status,
                        "grade": result.grade,
                        "remarks": result.remarks,
                    }
                )

            max_marks = len(subjects) * 100

            percentage = (
                round((total_marks / max_marks) * 100, 2) if max_marks > 0 else 0
            )

            final_grade = "A+"

            if percentage < 90:
                final_grade = "A"

            if percentage < 80:
                final_grade = "B"

            if percentage < 70:
                final_grade = "C"

            if percentage < 35:
                final_grade = "Fail"

            return (
                jsonify(
                    {
                        "year": "2025-26",
                        "student": {
                            "name": (f"{student.first_name} " f"{student.last_name}"),
                            "rollNo": academic_record.roll_number,
                            "className": (
                                f"{division.division_name}-" f"{section.section_name}"
                            ),
                            "division": division.division_name,
                        },
                        "subjects": subjects,
                        "summary": {
                            "total": (f"{int(total_marks)} / " f"{max_marks}"),
                            "percentage": percentage,
                            "grade": final_grade,
                        },
                    }
                ),
                200,
            )

        except Exception as e:
            logger.exception(e)

            return jsonify({"error": "Failed to load report card"}), 500


# ========================= TEACHER ANALYTICS API =========================
class TeacherAnalyticsAPI(MethodView):

    @login_required
    def get(self):
        try:
            from utils.teacherDetails import TeacherClass

            teacher_id = request.args.get("teacher_id")
            class_id = request.args.get("class_id")
            subject_id = request.args.get("subject_id")

            if not teacher_id:
                return jsonify({"error": "teacher_id required"}), 400

            allowed, _ = caller_can_access_teacher(teacher_id)
            if not allowed:
                return jsonify({"error": "Forbidden"}), 403

            # ================= GET ASSIGNED CLASSES =================
            teacher_classes = TeacherClass.query.filter_by(teacher_id=teacher_id).all()

            assigned_class_ids = [tc.academic_class_id for tc in teacher_classes]

            assigned_subject_ids = [tc.subject_id for tc in teacher_classes]

            # ================= BASE QUERY =================
            query = (
                db.session.query(
                    ExamResult,
                    Student,
                    Subject,
                    AcademicClass,
                    Division,
                    Section,
                )
                .join(Student, Student.id == ExamResult.student_id)
                .join(Subject, Subject.id == ExamResult.subject_id)
                .join(
                    StudentAcademicRecord,
                    StudentAcademicRecord.student_id == Student.id,
                )
                .join(
                    AcademicClass,
                    AcademicClass.id == StudentAcademicRecord.academic_class_id,
                )
                .join(Division, Division.id == AcademicClass.division_id)
                .join(Section, Section.id == AcademicClass.section_id)
                .filter(
                    StudentAcademicRecord.is_current == True,
                    AcademicClass.id.in_(assigned_class_ids),
                    Subject.id.in_(assigned_subject_ids),
                    ExamResult.status == "Published",
                )
            )

            # ================= FILTERS =================
            if class_id and class_id != "all":
                query = query.filter(AcademicClass.id == class_id)

            if subject_id and subject_id != "all":
                query = query.filter(Subject.id == subject_id)

            results = query.all()

            # ================= EMPTY =================
            if not results:
                return (
                    jsonify(
                        {
                            "kpis": {
                                "avgMarks": 0,
                                "passRate": 0,
                                "topScore": 0,
                                "lowScore": 0,
                            },
                            "topStudents": [],
                            "weakStudents": [],
                            "performanceChart": {
                                "labels": [],
                                "data": [],
                            },
                            "subjectChart": {
                                "labels": [],
                                "data": [],
                            },
                            "insight": "No analytics data available",
                        }
                    ),
                    200,
                )

            # ================= KPI =================
            percentages = [r[0].percentage or 0 for r in results]
            avg_marks = round(sum(percentages) / len(percentages), 2)
            pass_students = len([p for p in percentages if p >= 35])
            pass_rate = round((pass_students / len(percentages)) * 100, 2)
            top_score = round(max(percentages), 2)
            low_score = round(min(percentages), 2)

            # ================= STUDENT-WISE ANALYTICS =================
            student_map = {}
            for res, student, subject, academic, division, section in results:
                student_id = student.id
                if student_id not in student_map:

                    student_map[student_id] = {
                        "student": f"{student.first_name} {student.last_name}",
                        "className": f"{division.division_name}-{section.section_name}",
                        "percentages": [],
                    }

                student_map[student_id]["percentages"].append(res.percentage or 0)

            # ================= CALCULATE AVERAGES =================
            student_analytics = []
            for _, data in student_map.items():
                avg_percentage = round(
                    sum(data["percentages"]) / len(data["percentages"]),
                    2,
                )

                student_analytics.append(
                    {
                        "student": data["student"],
                        "className": data["className"],
                        "percentage": avg_percentage,
                    }
                )

            # ================= TOP STUDENTS =================
            top_students = sorted(
                student_analytics,
                key=lambda x: x["percentage"],
                reverse=True,
            )[:5]

            # ================= WEAK STUDENTS =================
            top_student_names = [s["student"] for s in top_students]

            weak_students = sorted(
                [s for s in student_analytics if s["student"] not in top_student_names],
                key=lambda x: x["percentage"],
            )[:5]

            if len(student_analytics) <= 1:
                weak_students = []
            # ================= CLASS PERFORMANCE =================
            class_map = {}

            for res, student, subject, academic, division, section in results:

                class_name = f"{division.division_name}-{section.section_name}"

                if class_name not in class_map:
                    class_map[class_name] = []

                class_map[class_name].append(res.percentage or 0)

            performance_labels = []
            performance_data = []

            for cls, values in class_map.items():

                performance_labels.append(cls)

                performance_data.append(round(sum(values) / len(values), 2))

            # ================= SUBJECT ANALYTICS =================
            subject_map = {}

            for res, student, subject, academic, division, section in results:

                if subject.subject_name not in subject_map:
                    subject_map[subject.subject_name] = []

                subject_map[subject.subject_name].append(res.percentage or 0)

            subject_labels = []
            subject_data = []

            for sub, vals in subject_map.items():

                subject_labels.append(sub)

                subject_data.append(round(sum(vals) / len(vals), 2))

            # ================= AI INSIGHTS =================
            insight = "Overall class performance is stable."

            if avg_marks >= 85:
                insight = "Excellent performance across assigned classes."

            elif avg_marks >= 70:
                insight = "Students are performing well with room for improvement."

            elif avg_marks >= 50:
                insight = "Average performance detected. Focus on weaker students."

            else:
                insight = "Critical improvement required in multiple subjects."

            return (
                jsonify(
                    {
                        "kpis": {
                            "avgMarks": avg_marks,
                            "passRate": pass_rate,
                            "topScore": top_score,
                            "lowScore": low_score,
                        },
                        "topStudents": top_students,
                        "weakStudents": weak_students,
                        "performanceChart": {
                            "labels": performance_labels,
                            "data": performance_data,
                        },
                        "subjectChart": {
                            "labels": subject_labels,
                            "data": subject_data,
                        },
                        "insight": insight,
                    }
                ),
                200,
            )

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Failed to load analytics"}), 500


# ========================= TEACHER ANALYTICS PDF =========================
class TeacherAnalyticsPDFAPI(MethodView):

    @login_required
    def get(self):

        try:
            from utils.teacherDetails import TeacherClass

            teacher_id = request.args.get("teacher_id")
            class_id = request.args.get("class_id")
            subject_id = request.args.get("subject_id")

            if not teacher_id:
                return jsonify({"error": "teacher_id required"}), 400

            allowed, _ = caller_can_access_teacher(teacher_id)
            if not allowed:
                return jsonify({"error": "Forbidden"}), 403

            # ================= ASSIGNED CLASSES =================
            teacher_classes = TeacherClass.query.filter_by(teacher_id=teacher_id).all()

            assigned_class_ids = [tc.academic_class_id for tc in teacher_classes]

            assigned_subject_ids = [tc.subject_id for tc in teacher_classes]

            # ================= QUERY =================
            query = (
                db.session.query(
                    ExamResult,
                    Student,
                    Subject,
                    AcademicClass,
                    Division,
                    Section,
                )
                .join(Student, Student.id == ExamResult.student_id)
                .join(Subject, Subject.id == ExamResult.subject_id)
                .join(
                    StudentAcademicRecord,
                    StudentAcademicRecord.student_id == Student.id,
                )
                .join(
                    AcademicClass,
                    AcademicClass.id == StudentAcademicRecord.academic_class_id,
                )
                .join(Division, Division.id == AcademicClass.division_id)
                .join(Section, Section.id == AcademicClass.section_id)
                .filter(
                    StudentAcademicRecord.is_current == True,
                    AcademicClass.id.in_(assigned_class_ids),
                    Subject.id.in_(assigned_subject_ids),
                    ExamResult.status == "Published",
                )
            )

            # ================= FILTERS =================
            if class_id and class_id != "all":
                query = query.filter(AcademicClass.id == class_id)

            if subject_id and subject_id != "all":
                query = query.filter(Subject.id == subject_id)

            results = query.all()

            if not results:
                return jsonify({"error": "No analytics data found"}), 404

            # ================= KPI =================
            percentages = [r[0].percentage or 0 for r in results]

            avg_marks = round(sum(percentages) / len(percentages), 2)

            pass_students = len([p for p in percentages if p >= 35])

            pass_rate = round(
                (pass_students / len(percentages)) * 100,
                2,
            )

            top_score = max(percentages)
            low_score = min(percentages)

            # ================= STUDENT ANALYTICS =================
            student_map = {}

            for res, student, subject, academic, division, section in results:

                if student.id not in student_map:

                    student_map[student.id] = {
                        "student": (f"{student.first_name} " f"{student.last_name}"),
                        "className": (
                            f"{division.division_name}-" f"{section.section_name}"
                        ),
                        "percentages": [],
                    }

                student_map[student.id]["percentages"].append(res.percentage or 0)

            student_analytics = []

            for _, data in student_map.items():

                avg_percentage = round(
                    sum(data["percentages"]) / len(data["percentages"]),
                    2,
                )

                student_analytics.append(
                    {
                        "student": data["student"],
                        "className": data["className"],
                        "percentage": avg_percentage,
                    }
                )

            # ================= TOP =================
            top_students = sorted(
                student_analytics,
                key=lambda x: x["percentage"],
                reverse=True,
            )[:5]

            # ================= WEAK =================
            top_names = [s["student"] for s in top_students]

            weak_students = sorted(
                [s for s in student_analytics if s["student"] not in top_names],
                key=lambda x: x["percentage"],
            )[:5]

            # ================= INSIGHT =================
            insight = "Overall class performance is stable."

            if avg_marks >= 85:
                insight = "Excellent performance across assigned classes."

            elif avg_marks >= 70:
                insight = "Students are performing well with room for improvement."

            elif avg_marks >= 50:
                insight = "Average performance detected."

            else:
                insight = "Critical improvement required."

            # ================= PDF =================
            buffer = BytesIO()

            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
            )

            elements = []

            styles = getSampleStyleSheet()

            title_style = ParagraphStyle(
                name="title",
                alignment=TA_CENTER,
                fontSize=18,
                spaceAfter=20,
            )

            # ================= HEADER =================
            elements.append(
                Paragraph(
                    "<b>Teacher Analytics Report</b>",
                    title_style,
                )
            )

            # ================= KPI TABLE =================
            kpi_data = [
                ["Metric", "Value"],
                ["Average Marks", f"{avg_marks}%"],
                ["Pass Rate", f"{pass_rate}%"],
                ["Top Score", f"{top_score}%"],
                ["Low Score", f"{low_score}%"],
            ]

            kpi_table = Table(
                kpi_data,
                colWidths=[220, 220],
            )

            kpi_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ]
                )
            )

            elements.append(kpi_table)

            elements.append(Spacer(1, 20))

            # ================= TOP STUDENTS =================
            elements.append(
                Paragraph(
                    "<b>Top Students</b>",
                    styles["Heading2"],
                )
            )

            top_data = [["Student", "Class", "Percentage"]]

            for student in top_students:

                top_data.append(
                    [
                        student["student"],
                        student["className"],
                        f"{student['percentage']}%",
                    ]
                )

            top_table = Table(top_data)

            top_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.green),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                    ]
                )
            )

            elements.append(top_table)

            elements.append(Spacer(1, 20))

            # ================= WEAK STUDENTS =================
            elements.append(
                Paragraph(
                    "<b>Needs Improvement</b>",
                    styles["Heading2"],
                )
            )

            weak_data = [["Student", "Class", "Percentage"]]

            for student in weak_students:

                weak_data.append(
                    [
                        student["student"],
                        student["className"],
                        f"{student['percentage']}%",
                    ]
                )

            weak_table = Table(weak_data)

            weak_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.red),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                    ]
                )
            )

            elements.append(weak_table)

            elements.append(Spacer(1, 20))

            # ================= AI INSIGHT =================
            elements.append(
                Paragraph(
                    f"<b>AI Insight:</b> {insight}",
                    styles["BodyText"],
                )
            )

            # ================= BUILD =================
            doc.build(elements)

            buffer.seek(0)

            return send_file(
                buffer,
                as_attachment=True,
                download_name="teacher_analytics_report.pdf",
                mimetype="application/pdf",
            )

        except Exception as e:
            logger.exception(e)

            return jsonify({"error": "Failed to generate analytics PDF"}), 500


# ============================================================
# ADMIN EXAM & RESULT CONTROL CENTER APIs
# Supports admin dashboard JSX:
# - KPI cards
# - class progress cards
# - detailed subject status
# - verify all data
# - bulk edit marks
# - publish now / schedule publish
# - export all reports PDF
# ============================================================

PASS_MARK_PERCENTAGE = 35


def _safe_float(value, default=0.0):
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _parse_int(value, default=None):
    try:
        if value is None or value == "" or value == "all":
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def _parse_datetime(value):
    if not value:
        return None
    try:
        # accepts "2026-06-27T10:30:00" and "2026-06-27 10:30:00"
        return datetime.fromisoformat(
            str(value).replace("Z", "+00:00").replace(" ", "T")
        )
    except Exception:
        return None


def _grade_from_percentage(percentage):
    percentage = _safe_float(percentage)
    if percentage >= 90:
        return "A+"
    if percentage >= 80:
        return "A"
    if percentage >= 70:
        return "B+"
    if percentage >= 60:
        return "B"
    if percentage >= 50:
        return "C"
    if percentage >= PASS_MARK_PERCENTAGE:
        return "Pass"
    return "Fail"


def _class_label(division, section, batch=None):
    division_name = getattr(division, "division_name", None) or ""
    section_name = getattr(section, "section_name", None) or ""
    batch_name = getattr(batch, "batch_name", None) or ""
    label = f"{division_name}-{section_name}".strip("-")
    return label or batch_name or "Class"


def _student_name(student):
    return (
        " ".join(
            [
                str(getattr(student, "first_name", "") or "").strip(),
                str(getattr(student, "middle_name", "") or "").strip(),
                str(getattr(student, "last_name", "") or "").strip(),
            ]
        )
        .replace("  ", " ")
        .strip()
        or f"Student #{student.id}"
    )


def _result_out_of(result):
    return (
        _safe_float(result.internal_out_of)
        + _safe_float(result.external_out_of)
        + _safe_float(result.oral_out_of)
        + _safe_float(result.practical_out_of)
    )


def _recalculate_result(result):
    total = (
        _safe_float(result.internal_marks)
        + _safe_float(result.external_marks)
        + _safe_float(result.oral_marks)
        + _safe_float(result.practical_marks)
    )
    out_of = _result_out_of(result)
    percentage = round((total / out_of) * 100, 2) if out_of > 0 else 0
    result.total_marks = total
    result.percentage = percentage
    result.grade = _grade_from_percentage(percentage)
    return result


def _current_students_for_class(academic_class_id):
    return (
        db.session.query(StudentAcademicRecord, Student)
        .join(Student, Student.id == StudentAcademicRecord.student_id)
        .filter(
            StudentAcademicRecord.academic_class_id == academic_class_id,
            StudentAcademicRecord.is_current == True,
        )
        .order_by(StudentAcademicRecord.roll_number.asc(), Student.first_name.asc())
        .all()
    )


def _exam_subject_ids(exam_id):
    ids = [
        row[0]
        for row in db.session.query(ExamSubject.subject_id)
        .filter(ExamSubject.exam_id == exam_id)
        .all()
    ]
    if ids:
        return ids
    ids = [
        row[0]
        for row in db.session.query(ExamResult.subject_id)
        .filter(ExamResult.exam_id == exam_id)
        .distinct()
        .all()
    ]
    if ids:
        return ids
    return [row[0] for row in db.session.query(Subject.id).all()]


def _exam_progress(exam):
    students = _current_students_for_class(exam.academic_class_id)
    student_count = len(students)
    subject_ids = _exam_subject_ids(exam.id)
    subject_count = len(subject_ids)
    expected = student_count * subject_count

    submitted_statuses = ["Submitted", "Verified", "Published"]
    marked = (
        ExamResult.query.filter(
            ExamResult.exam_id == exam.id,
            ExamResult.subject_id.in_(subject_ids) if subject_ids else True,
            ExamResult.status.in_(submitted_statuses),
        ).count()
        if expected
        else 0
    )

    percentage = round((marked / expected) * 100, 2) if expected else 0
    pending = max(expected - marked, 0)

    if getattr(exam, "is_published", False):
        state = "Published"
    elif getattr(exam, "is_verified", False):
        state = "Ready to Publish"
    elif pending == 0 and expected > 0:
        state = "Ready to Verify"
    else:
        state = f"{pending} Pending"

    return {
        "student_count": student_count,
        "subject_count": subject_count,
        "expected": expected,
        "marked": marked,
        "pending": pending,
        "percentage": percentage,
        "state": state,
    }


class AdminExamMarksEntryPermissionAPI(MethodView):
    @login_required
    def put(self, exam_id):
        try:
            data = request.get_json(silent=True) or {}

            enabled = data.get("marks_entry_enabled")

            if enabled is None:
                return jsonify({"error": "marks_entry_enabled is required"}), 400

            exam = Exam.query.filter_by(
                id=exam_id, school_id=_current_school_id()
            ).first()

            if not exam:
                return jsonify({"error": "Exam not found"}), 404

            # Do not allow marks editing after final publishing
            if exam.is_published:
                return (
                    jsonify(
                        {
                            "error": "Published exam results cannot be changed. Unpublish or create a correction workflow first."
                        }
                    ),
                    400,
                )

            exam.marks_entry_enabled = bool(enabled)

            db.session.commit()

            return (
                jsonify(
                    {
                        "message": (
                            "Marks entry enabled for teachers"
                            if exam.marks_entry_enabled
                            else "Marks entry disabled for teachers"
                        ),
                        "exam_id": exam.id,
                        "marks_entry_enabled": bool(exam.marks_entry_enabled),
                    }
                ),
                200,
            )

        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"error": "Failed to update marks entry permission"}), 500


class AdminExamBulkEditAPI(MethodView):
    @login_required
    def put(self):
        try:
            data = request.get_json(silent=True) or {}
            updates = data.get("updates") or []
            admin_id = data.get("admin_id") or data.get("user_id")

            if not isinstance(updates, list) or not updates:
                return jsonify({"error": "updates must be a non-empty list"}), 400

            allowed = {
                "internal_marks",
                "external_marks",
                "oral_marks",
                "practical_marks",
                "internal_out_of",
                "external_out_of",
                "oral_out_of",
                "practical_out_of",
                "remarks",
                "status",
            }

            changed = 0
            for item in updates:
                result_id = _parse_int(item.get("result_id"))
                fields = item.get("fields") or {}
                result = ExamResult.query.filter_by(
                    id=result_id, school_id=_current_school_id()
                ).first()
                if not result:
                    continue

                old_total = result.total_marks
                for key, value in fields.items():
                    if key in allowed:
                        setattr(
                            result,
                            key,
                            (
                                value
                                if key in ["remarks", "status"]
                                else _safe_float(value)
                            ),
                        )

                _recalculate_result(result)
                db.session.add(
                    ExamResultAudit(
                        result_id=result.id,
                        updated_by=_parse_int(admin_id),
                        old_total=old_total,
                        new_total=result.total_marks,
                        action="ADMIN_BULK_EDIT",
                    )
                )
                changed += 1

            db.session.commit()
            return (
                jsonify({"message": "Bulk edit completed", "updated_results": changed}),
                200,
            )
        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"error": "Failed to bulk edit marks"}), 500


class AdminExamReportsPDFAPI(MethodView):
    @login_required
    def get(self):
        try:
            academic_year = request.args.get("academic_year")
            exam_name = request.args.get("exam_name")

            # reuse dashboard logic manually to avoid HTTP call
            exam_query = Exam.query.filter(Exam.school_id == _current_school_id())
            if academic_year and academic_year != "all":
                exam_query = exam_query.filter(Exam.academic_year == academic_year)
            if exam_name and exam_name != "all":
                exam_query = exam_query.filter(Exam.exam_name == exam_name)
            exams = exam_query.order_by(
                Exam.academic_year.desc(), Exam.exam_name.asc()
            ).all()

            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4)
            styles = getSampleStyleSheet()
            elements = [
                Paragraph("<b>Exam & Result Admin Report</b>", styles["Title"]),
                Spacer(1, 12),
            ]

            rows = [
                ["Exam", "Year", "Class", "Status", "Marked", "Expected", "Progress"]
            ]
            for exam in exams:
                academic = AcademicClass.query.get(exam.academic_class_id)
                division = (
                    Division.query.get(academic.division_id) if academic else None
                )
                section = Section.query.get(academic.section_id) if academic else None
                batch = Batch.query.get(academic.batch_id) if academic else None
                progress = _exam_progress(exam)
                rows.append(
                    [
                        exam.exam_name,
                        exam.academic_year,
                        _class_label(division, section, batch),
                        progress["state"],
                        progress["marked"],
                        progress["expected"],
                        f'{progress["percentage"]}%',
                    ]
                )

            table = Table(rows, repeatRows=1)
            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
                        ("ALIGN", (4, 1), (-1, -1), "CENTER"),
                    ]
                )
            )
            elements.append(table)
            doc.build(elements)
            buffer.seek(0)

            return send_file(
                buffer,
                as_attachment=True,
                download_name="admin_exam_result_report.pdf",
                mimetype="application/pdf",
            )
        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Failed to export admin exam report"}), 500


# ============================================================
# PRODUCTION OVERRIDES - REAL WORLD ADMIN EXAM RESULT SYSTEM
# (The stale first-draft versions of these classes were removed - this
# is now the only definition of each.)
# They keep your existing DB tables but return richer, frontend-ready data.
# ============================================================

EXAM_STATUS_FLOW = [
    "Draft",
    "Scheduled",
    "Conducting",
    "Marks Entry",
    "Verification",
    "Ready to Publish",
    "Published",
    "Archived",
]


def _parse_date_value(value):
    if not value:
        return None
    if hasattr(value, "year") and hasattr(value, "month") and hasattr(value, "day"):
        return value
    raw = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(raw[:10], fmt).date()
        except Exception:
            pass
    return None


def _teacher_name(teacher):
    if not teacher:
        return None
    parts = [
        getattr(teacher, "first_name", "") or "",
        getattr(teacher, "middle_name", "") or "",
        getattr(teacher, "last_name", "") or "",
    ]
    name = " ".join([p.strip() for p in parts if p and p.strip()]).strip()
    return (
        name
        or getattr(teacher, "name", None)
        or getattr(teacher, "email", None)
        or f"Teacher #{teacher.id}"
    )


def _exam_status(exam, progress=None):
    if getattr(exam, "is_published", False):
        return "Published"
    if getattr(exam, "is_verified", False):
        return "Ready to Publish"
    if progress and progress.get("expected", 0) > 0 and progress.get("pending", 0) == 0:
        return "Verification"
    if progress and progress.get("marked", 0) > 0:
        return "Marks Entry"
    today = datetime.utcnow().date()
    if exam.start_date and exam.end_date and exam.start_date <= today <= exam.end_date:
        return "Conducting"
    if exam.start_date and exam.start_date > today:
        return "Scheduled"
    return "Draft"


def _subject_config_map(exam_id):
    rows = ExamSubject.query.filter_by(exam_id=exam_id).all()
    return {r.subject_id: r for r in rows}


def _get_subject_ids_from_payload(data):
    subject_ids = data.get("subject_ids") or data.get("subjects") or []
    normalized = []
    for item in subject_ids:
        if isinstance(item, dict):
            sid = _parse_int(item.get("subject_id") or item.get("id"))
        else:
            sid = _parse_int(item)
        if sid and sid not in normalized:
            normalized.append(sid)
    return normalized


def _get_class_ids_from_payload(data):
    class_ids = (
        data.get("academic_class_ids")
        or data.get("class_ids")
        or data.get("classes")
        or []
    )
    single = data.get("academic_class_id") or data.get("class_id")
    if single and not class_ids:
        class_ids = [single]
    normalized = []
    for item in class_ids:
        if isinstance(item, dict):
            cid = _parse_int(
                item.get("academic_class_id") or item.get("class_id") or item.get("id")
            )
        else:
            cid = _parse_int(item)
        if cid and cid not in normalized:
            normalized.append(cid)
    return normalized


def _class_lookup():
    rows = (
        db.session.query(AcademicClass, Division, Section, Batch)
        .join(Division, Division.id == AcademicClass.division_id)
        .join(Section, Section.id == AcademicClass.section_id)
        .join(Batch, Batch.id == AcademicClass.batch_id)
        .filter(AcademicClass.school_id == _current_school_id())
        .all()
    )
    return {
        academic.id: {
            "academic": academic,
            "division": division,
            "section": section,
            "batch": batch,
            "label": _class_label(division, section, batch),
        }
        for academic, division, section, batch in rows
    }


class AdminExamOptionsAPI(MethodView):
    @login_required
    def get(self):
        try:
            school_id = _current_school_id()

            batches = Batch.query.filter_by(school_id=school_id).order_by(
                Batch.batch_name.desc()
            ).all()
            years = [b.batch_name for b in batches]
            exam_names = [
                r[0]
                for r in db.session.query(Exam.exam_name)
                .filter(Exam.school_id == school_id)
                .distinct()
                .order_by(Exam.exam_name.asc())
                .all()
            ]
            class_rows = (
                db.session.query(AcademicClass, Division, Section, Batch)
                .join(Division, Division.id == AcademicClass.division_id)
                .join(Section, Section.id == AcademicClass.section_id)
                .join(Batch, Batch.id == AcademicClass.batch_id)
                .filter(AcademicClass.school_id == school_id)
                .order_by(Division.division_name.asc(), Section.section_name.asc())
                .all()
            )
            subjects = Subject.query.filter_by(school_id=school_id).order_by(
                Subject.subject_name.asc()
            ).all()
            teachers = Teacher.query.filter_by(school_id=school_id).order_by(
                Teacher.id.asc()
            ).all()

            return (
                jsonify(
                    {
                        "years": years,
                        "batches": [
                            {
                                "id": b.id,
                                "batch_name": b.batch_name,
                                "start_date": (
                                    b.start_date.isoformat() if b.start_date else None
                                ),
                                "end_date": (
                                    b.end_date.isoformat() if b.end_date else None
                                ),
                            }
                            for b in batches
                        ],
                        "exams": exam_names,
                        "statuses": EXAM_STATUS_FLOW,
                        "classes": [
                            {
                                "id": academic.id,
                                "academic_class_id": academic.id,
                                "batch_id": academic.batch_id,
                                "batch_name": batch.batch_name if batch else None,
                                "division_id": academic.division_id,
                                "division_name": (
                                    division.division_name if division else None
                                ),
                                "section_id": academic.section_id,
                                "section_name": (
                                    section.section_name if section else None
                                ),
                                "display_name": _class_label(division, section, batch),
                            }
                            for academic, division, section, batch in class_rows
                        ],
                        "subjects": [
                            {
                                "id": s.id,
                                "name": s.subject_name,
                                "subject_name": s.subject_name,
                            }
                            for s in subjects
                        ],
                        "teachers": [
                            {"id": t.id, "name": _teacher_name(t)} for t in teachers
                        ],
                        "exam_types": [
                            "Unit Test",
                            "Mid Term",
                            "Quarterly",
                            "Half Yearly",
                            "Pre Board",
                            "Annual",
                        ],
                    }
                ),
                200,
            )
        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Failed to load exam options"}), 500


class AdminExamTermAPI(MethodView):
    @login_required
    def get(self):
        try:
            academic_year = request.args.get("academic_year")
            class_id = _parse_int(
                request.args.get("academic_class_id") or request.args.get("class_id")
            )
            exam_name = request.args.get("exam_name") or request.args.get("exam")
            status = request.args.get("status")

            query = (
                db.session.query(Exam, AcademicClass, Division, Section, Batch)
                .join(AcademicClass, AcademicClass.id == Exam.academic_class_id)
                .join(Division, Division.id == AcademicClass.division_id)
                .join(Section, Section.id == AcademicClass.section_id)
                .join(Batch, Batch.id == AcademicClass.batch_id)
                .filter(Exam.school_id == _current_school_id())
            )
            if academic_year and academic_year != "all":
                query = query.filter(Exam.academic_year == academic_year)
            if class_id:
                query = query.filter(Exam.academic_class_id == class_id)
            if exam_name and exam_name != "all":
                query = query.filter(Exam.exam_name == exam_name)

            payload = []
            for exam, academic, division, section, batch in query.order_by(
                Exam.academic_year.desc(), Exam.exam_name.asc()
            ).all():
                progress = _exam_progress(exam)
                computed_status = _exam_status(exam, progress)
                if status and status != "all" and computed_status != status:
                    continue
                payload.append(
                    {
                        "id": exam.id,
                        "academic_class_id": exam.academic_class_id,
                        "class_name": _class_label(division, section, batch),
                        "academic_year": exam.academic_year,
                        "exam_name": exam.exam_name,
                        "exam_type": exam.exam_type,
                        "status": computed_status,
                        "start_date": (
                            exam.start_date.isoformat() if exam.start_date else None
                        ),
                        "end_date": (
                            exam.end_date.isoformat() if exam.end_date else None
                        ),
                        "is_verified": bool(getattr(exam, "is_verified", False)),
                        "is_published": bool(exam.is_published),
                        "marks_entry_enabled": bool(
                            getattr(exam, "marks_entry_enabled", False)
                        ),
                        "publish_at": (
                            exam.publish_at.isoformat()
                            if getattr(exam, "publish_at", None)
                            else None
                        ),
                        "published_at": (
                            exam.published_at.isoformat()
                            if getattr(exam, "published_at", None)
                            else None
                        ),
                        "progress": progress,
                    }
                )
            return jsonify(payload), 200
        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Failed to load exam terms"}), 500

    @login_required
    def post(self):
        try:
            data = request.get_json(silent=True) or {}
            academic_year = data.get("academic_year")
            exam_name = data.get("exam_name") or data.get("name")
            exam_type = data.get("exam_type") or data.get("type")
            start_date = _parse_date_value(data.get("start_date"))
            end_date = _parse_date_value(data.get("end_date"))
            class_ids = _get_class_ids_from_payload(data)
            subject_ids = _get_subject_ids_from_payload(data)

            if not academic_year or not exam_name:
                return (
                    jsonify({"error": "academic_year and exam_name are required"}),
                    400,
                )
            if not class_ids:
                return jsonify({"error": "Select at least one class"}), 400
            if start_date and end_date and start_date > end_date:
                return jsonify({"error": "start_date cannot be after end_date"}), 400

            created_or_updated = []
            school_id = _current_school_id()

            for class_id in class_ids:
                if not AcademicClass.query.filter_by(
                    id=class_id, school_id=school_id
                ).first():
                    continue
                exam = Exam.query.filter_by(
                    academic_class_id=class_id,
                    academic_year=academic_year,
                    exam_name=exam_name,
                    school_id=school_id,
                ).first()
                if not exam:
                    exam = Exam(
                        academic_class_id=class_id,
                        academic_year=academic_year,
                        exam_name=exam_name,
                        school_id=school_id,
                    )
                    db.session.add(exam)
                    db.session.flush()
                exam.exam_type = exam_type
                exam.start_date = start_date
                exam.end_date = end_date

                for subject_id in subject_ids:
                    if not Subject.query.filter_by(
                        id=subject_id, school_id=school_id
                    ).first():
                        continue
                    existing = ExamSubject.query.filter_by(
                        exam_id=exam.id, subject_id=subject_id
                    ).first()
                    if not existing:
                        db.session.add(
                            ExamSubject(exam_id=exam.id, subject_id=subject_id)
                        )
                created_or_updated.append(exam.id)

            db.session.commit()
            return (
                jsonify(
                    {
                        "message": "Examination saved successfully",
                        "exam_ids": created_or_updated,
                    }
                ),
                201,
            )
        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"error": "Failed to save examination"}), 500


class AdminExamDashboardAPI(MethodView):
    @login_required
    def get(self):
        try:
            academic_year = request.args.get("academic_year")
            exam_name = request.args.get("exam_name") or request.args.get("exam")
            class_id = _parse_int(
                request.args.get("academic_class_id") or request.args.get("class_id")
            )
            subject_id = _parse_int(request.args.get("subject_id"))
            teacher_id = _parse_int(request.args.get("teacher_id"))
            status_filter = request.args.get("status")
            search = (request.args.get("search") or "").strip().lower()

            exam_query = Exam.query.filter(Exam.school_id == _current_school_id())
            if academic_year and academic_year != "all":
                exam_query = exam_query.filter(Exam.academic_year == academic_year)
            if exam_name and exam_name != "all":
                exam_query = exam_query.filter(Exam.exam_name == exam_name)
            if class_id:
                exam_query = exam_query.filter(Exam.academic_class_id == class_id)

            exams = exam_query.order_by(
                Exam.academic_year.desc(), Exam.exam_name.asc()
            ).all()
            exam_ids = [e.id for e in exams]
            class_map = _class_lookup()
            class_cards = []
            pending_verification = 0
            pending_marks_total = 0

            for exam in exams:
                progress = _exam_progress(exam)
                computed_status = _exam_status(exam, progress)
                if (
                    status_filter
                    and status_filter != "all"
                    and computed_status != status_filter
                ):
                    continue
                if computed_status == "Verification":
                    pending_verification += 1
                pending_marks_total += progress["pending"]
                lookup = class_map.get(exam.academic_class_id, {})
                label = lookup.get("label", f"Class #{exam.academic_class_id}")
                if (
                    search
                    and search not in label.lower()
                    and search not in exam.exam_name.lower()
                ):
                    continue
                class_cards.append(
                    {
                        "exam_id": exam.id,
                        "academic_class_id": exam.academic_class_id,
                        "class_name": label,
                        "academic_session": exam.academic_year,
                        "exam_name": exam.exam_name,
                        "exam_type": exam.exam_type,
                        "status": computed_status,
                        "marks_submitted_percentage": progress["percentage"],
                        "marked": progress["marked"],
                        "expected": progress["expected"],
                        "pending": progress["pending"],
                        "student_count": progress["student_count"],
                        "subject_count": progress["subject_count"],
                        "is_verified": bool(getattr(exam, "is_verified", False)),
                        "is_verified": bool(getattr(exam, "is_verified", False)),
                        "is_published": bool(exam.is_published),
                        "marks_entry_enabled": bool(
                            getattr(exam, "marks_entry_enabled", False)
                        ),
                        "publish_at": (
                            exam.publish_at.isoformat()
                            if getattr(exam, "publish_at", None)
                            else None
                        ),
                    }
                )

            result_rows = []
            if exam_ids:
                result_query = (
                    db.session.query(ExamResult, Student, Subject, Exam)
                    .join(Student, Student.id == ExamResult.student_id)
                    .join(Subject, Subject.id == ExamResult.subject_id)
                    .join(Exam, Exam.id == ExamResult.exam_id)
                    .filter(ExamResult.exam_id.in_(exam_ids))
                )
                if subject_id:
                    result_query = result_query.filter(
                        ExamResult.subject_id == subject_id
                    )
                if teacher_id:
                    result_query = result_query.filter(
                        ExamResult.created_by == teacher_id
                    )
                result_rows = result_query.all()

            student_totals = {}
            subject_totals = {}
            published_classes = len([c for c in class_cards if c["is_published"]])
            for result, student, subject, exam in result_rows:
                sid = student.id
                student_totals.setdefault(
                    sid, {"student": student, "total": 0, "out_of": 0}
                )
                student_totals[sid]["total"] += _safe_float(result.total_marks)
                student_totals[sid]["out_of"] += _result_out_of(result)
                subject_totals.setdefault(subject.subject_name, [])
                subject_totals[subject.subject_name].append(
                    _safe_float(result.percentage)
                )

            student_percentages = []
            topper = None
            at_risk = 0
            for row in student_totals.values():
                percent = (
                    round((row["total"] / row["out_of"]) * 100, 2)
                    if row["out_of"]
                    else 0
                )
                student_percentages.append(percent)
                if percent < PASS_MARK_PERCENTAGE:
                    at_risk += 1
                if not topper or percent > topper["percentage"]:
                    topper = {
                        "student_name": _student_name(row["student"]),
                        "percentage": percent,
                    }

            subject_avgs = [
                {"subject": subject, "average": round(sum(values) / len(values), 2)}
                for subject, values in subject_totals.items()
                if values
            ]
            high_subject = (
                max(subject_avgs, key=lambda x: x["average"]) if subject_avgs else None
            )
            low_subject = (
                min(subject_avgs, key=lambda x: x["average"]) if subject_avgs else None
            )
            avg_score = (
                round(sum(student_percentages) / len(student_percentages), 2)
                if student_percentages
                else 0
            )
            pass_percentage = (
                round(
                    (
                        len(
                            [
                                p
                                for p in student_percentages
                                if p >= PASS_MARK_PERCENTAGE
                            ]
                        )
                        / len(student_percentages)
                    )
                    * 100,
                    2,
                )
                if student_percentages
                else 0
            )

            return (
                jsonify(
                    {
                        "stats": {
                            "total_exams": len(exams),
                            "classes_covered": len(class_cards),
                            "students": len(student_totals),
                            "results_published": published_classes,
                            "pending_verification": pending_verification,
                            "pending_marks": pending_marks_total,
                            "pass_percentage": pass_percentage,
                            "average_score": avg_score,
                            "topper": topper,
                            "at_risk_students": at_risk,
                            "subject_average_high": high_subject,
                            "subject_average_low": low_subject,
                            "total_results": len(result_rows),
                        },
                        "classes": class_cards,
                        "analytics": {
                            "subject_averages": subject_avgs,
                            "top_performing_class": max(
                                class_cards,
                                key=lambda c: c["marks_submitted_percentage"],
                                default=None,
                            ),
                            "lowest_progress_class": min(
                                class_cards,
                                key=lambda c: c["marks_submitted_percentage"],
                                default=None,
                            ),
                        },
                    }
                ),
                200,
            )
        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Failed to load admin exam dashboard"}), 500


class AdminExamClassDetailsAPI(MethodView):
    @login_required
    def get(self, exam_id):
        try:
            exam = Exam.query.filter_by(
                id=exam_id, school_id=_current_school_id()
            ).first()
            if not exam:
                return jsonify({"error": "Exam not found"}), 404

            academic = AcademicClass.query.get(exam.academic_class_id)
            division = Division.query.get(academic.division_id) if academic else None
            section = Section.query.get(academic.section_id) if academic else None
            batch = Batch.query.get(academic.batch_id) if academic else None
            subject_filter = _parse_int(request.args.get("subject_id"))

            students = _current_students_for_class(exam.academic_class_id)
            student_ids = [student.id for _, student in students]
            total_students = len(student_ids)
            subject_ids = _exam_subject_ids(exam.id)
            if subject_filter:
                subject_ids = [subject_filter]
            subjects = (
                Subject.query.filter(Subject.id.in_(subject_ids))
                .order_by(Subject.subject_name.asc())
                .all()
                if subject_ids
                else []
            )
            configs = _subject_config_map(exam.id)

            subject_status = []
            student_rows = []
            for subject in subjects:
                results = ExamResult.query.filter(
                    ExamResult.exam_id == exam.id,
                    ExamResult.subject_id == subject.id,
                    ExamResult.student_id.in_(student_ids) if student_ids else True,
                ).all()
                by_student = {r.student_id: r for r in results}
                submitted = [
                    r
                    for r in results
                    if r.status in ["Submitted", "Verified", "Published"]
                ]
                pending = max(total_students - len(submitted), 0)

                teacher_name = None
                try:
                    from utils.teacherDetails import TeacherClass

                    tc = TeacherClass.query.filter_by(
                        academic_class_id=exam.academic_class_id, subject_id=subject.id
                    ).first()
                    teacher_name = (
                        _teacher_name(Teacher.query.get(tc.teacher_id)) if tc else None
                    )
                except Exception:
                    teacher_name = None
                if not teacher_name and results:
                    teacher_name = (
                        _teacher_name(Teacher.query.get(results[0].created_by))
                        if results[0].created_by
                        else None
                    )

                status = (
                    "Verified"
                    if getattr(exam, "is_verified", False) and pending == 0
                    else ("Submitted" if pending == 0 and total_students else "Pending")
                )
                cfg = configs.get(subject.id)
                subject_status.append(
                    {
                        "subject_id": subject.id,
                        "subject": subject.subject_name,
                        "teacher": teacher_name or "Not Assigned",
                        "status": status,
                        "pending_marks": pending,
                        "submitted_marks": len(submitted),
                        "total_students": total_students,
                        "max_marks": (
                            _safe_float(getattr(cfg, "internal_max", 0))
                            + _safe_float(getattr(cfg, "external_max", 0))
                            + _safe_float(getattr(cfg, "oral_max", 0))
                            + _safe_float(getattr(cfg, "practical_max", 0))
                            if cfg
                            else None
                        ),
                        "passing_marks": (
                            _safe_float(
                                getattr(cfg, "passing_marks", PASS_MARK_PERCENTAGE)
                            )
                            if cfg
                            else PASS_MARK_PERCENTAGE
                        ),
                    }
                )

                if subject_filter:
                    for record, student in students:
                        result = by_student.get(student.id)
                        student_rows.append(
                            {
                                "result_id": result.id if result else None,
                                "student_id": student.id,
                                "roll_no": record.roll_number,
                                "student_name": _student_name(student),
                                "subject_id": subject.id,
                                "subject": subject.subject_name,
                                "internal_marks": (
                                    result.internal_marks if result else 0
                                ),
                                "external_marks": (
                                    result.external_marks if result else 0
                                ),
                                "oral_marks": result.oral_marks if result else 0,
                                "practical_marks": (
                                    result.practical_marks if result else 0
                                ),
                                "total_marks": result.total_marks if result else 0,
                                "percentage": result.percentage if result else 0,
                                "grade": result.grade if result else None,
                                "status": result.status if result else "Pending",
                                "remarks": result.remarks if result else "",
                                "result": (
                                    "PASS"
                                    if result
                                    and _safe_float(result.percentage)
                                    >= PASS_MARK_PERCENTAGE
                                    else "FAIL" if result else "PENDING"
                                ),
                            }
                        )

            return (
                jsonify(
                    {
                        "exam": {
                            "id": exam.id,
                            "name": exam.exam_name,
                            "academic_year": exam.academic_year,
                            "class_name": _class_label(division, section, batch),
                            "status": _exam_status(exam, _exam_progress(exam)),
                            "is_verified": bool(getattr(exam, "is_verified", False)),
                            "is_published": bool(exam.is_published),
                        },
                        "subjects": subject_status,
                        "students": student_rows,
                    }
                ),
                200,
            )
        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Failed to load class details"}), 500


class AdminExamVerifyAPI(MethodView):
    @login_required
    def post(self, exam_id):
        try:
            data = request.get_json(silent=True) or {}
            admin_id = data.get("admin_id") or data.get("user_id")
            force = bool(data.get("force", False))
            exam = Exam.query.filter_by(
                id=exam_id, school_id=_current_school_id()
            ).first()
            if not exam:
                return jsonify({"error": "Exam not found"}), 404
            progress = _exam_progress(exam)
            if progress["pending"] > 0 and not force:
                return (
                    jsonify(
                        {
                            "error": "Cannot verify. Some marks are still pending.",
                            "pending": progress["pending"],
                            "progress": progress,
                        }
                    ),
                    400,
                )
            updated = ExamResult.query.filter(
                ExamResult.exam_id == exam.id,
                ExamResult.status.in_(["Submitted", "Draft"]),
            ).update({"status": "Verified"}, synchronize_session=False)
            exam.is_verified = True
            exam.verified_at = datetime.utcnow()
            exam.verified_by = _parse_int(admin_id)
            db.session.commit()
            return (
                jsonify(
                    {
                        "message": "Exam data verified successfully",
                        "updated_results": updated,
                        "progress": _exam_progress(exam),
                    }
                ),
                200,
            )
        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"error": "Failed to verify exam data"}), 500


class AdminExamPublishAPI(MethodView):
    @login_required
    def post(self, exam_id):
        try:
            data = request.get_json(silent=True) or {}
            force = bool(data.get("force", False))
            exam = Exam.query.filter_by(
                id=exam_id, school_id=_current_school_id()
            ).first()
            if not exam:
                return jsonify({"error": "Exam not found"}), 404
            if not getattr(exam, "is_verified", False) and not force:
                return (
                    jsonify({"error": "Please verify exam data before publishing"}),
                    400,
                )
            updated = ExamResult.query.filter(
                ExamResult.exam_id == exam.id,
                ExamResult.status.in_(["Verified", "Submitted"]),
            ).update({"status": "Published"}, synchronize_session=False)
            exam.is_verified = True
            exam.is_published = True
            exam.published_at = datetime.utcnow()
            db.session.commit()
            return (
                jsonify(
                    {
                        "message": "Result published successfully",
                        "updated_results": updated,
                    }
                ),
                200,
            )
        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"error": "Failed to publish result"}), 500


class AdminExamSchedulePublishAPI(MethodView):
    @login_required
    def post(self, exam_id):
        try:
            data = request.get_json(silent=True) or {}
            publish_at = _parse_datetime(
                data.get("publish_at") or data.get("release_at")
            )
            if not publish_at:
                release_date = data.get("release_date") or data.get("date")
                release_time = data.get("release_time") or data.get("time") or "00:00"
                publish_at = (
                    _parse_datetime(f"{release_date}T{release_time}:00")
                    if release_date
                    else None
                )
            if not publish_at:
                return (
                    jsonify(
                        {"error": "publish_at or release_date/release_time is required"}
                    ),
                    400,
                )
            exam = Exam.query.filter_by(
                id=exam_id, school_id=_current_school_id()
            ).first()
            if not exam:
                return jsonify({"error": "Exam not found"}), 404
            if not getattr(exam, "is_verified", False) and not data.get("force"):
                return (
                    jsonify(
                        {"error": "Please verify exam data before scheduling publish"}
                    ),
                    400,
                )
            exam.publish_at = (
                publish_at.replace(tzinfo=None)
                if getattr(publish_at, "tzinfo", None)
                else publish_at
            )
            db.session.commit()
            return (
                jsonify(
                    {
                        "message": "Publish schedule saved successfully",
                        "publish_at": (
                            exam.publish_at.isoformat() if exam.publish_at else None
                        ),
                    }
                ),
                200,
            )
        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"error": "Failed to schedule publishing"}), 500


class AdminExamResultsAPI(MethodView):
    @login_required
    def get(self):
        try:
            exam_id = _parse_int(request.args.get("exam_id"))
            class_id = _parse_int(
                request.args.get("academic_class_id") or request.args.get("class_id")
            )
            subject_id = _parse_int(request.args.get("subject_id"))
            status = request.args.get("status")
            search = (request.args.get("search") or "").strip().lower()
            query = (
                db.session.query(
                    ExamResult,
                    Student,
                    Exam,
                    Subject,
                    StudentAcademicRecord,
                    AcademicClass,
                    Division,
                    Section,
                )
                .join(Student, Student.id == ExamResult.student_id)
                .join(Exam, Exam.id == ExamResult.exam_id)
                .join(Subject, Subject.id == ExamResult.subject_id)
                .join(
                    StudentAcademicRecord,
                    StudentAcademicRecord.student_id == Student.id,
                )
                .join(
                    AcademicClass,
                    AcademicClass.id == StudentAcademicRecord.academic_class_id,
                )
                .join(Division, Division.id == AcademicClass.division_id)
                .join(Section, Section.id == AcademicClass.section_id)
                .filter(StudentAcademicRecord.is_current == True)
                .filter(ExamResult.school_id == _current_school_id())
            )
            if exam_id:
                query = query.filter(ExamResult.exam_id == exam_id)
            if class_id:
                query = query.filter(
                    StudentAcademicRecord.academic_class_id == class_id
                )
            if subject_id:
                query = query.filter(ExamResult.subject_id == subject_id)
            if status and status != "all":
                query = query.filter(ExamResult.status == status)
            rows = query.order_by(
                Division.division_name.asc(),
                Section.section_name.asc(),
                StudentAcademicRecord.roll_number.asc(),
            ).all()
            data = []
            for (
                result,
                student,
                exam,
                subject,
                record,
                academic,
                division,
                section,
            ) in rows:
                name = _student_name(student)
                class_name = _class_label(division, section)
                if (
                    search
                    and search not in name.lower()
                    and search not in str(record.roll_number or "").lower()
                    and search not in class_name.lower()
                ):
                    continue
                out_of = _result_out_of(result)
                data.append(
                    {
                        "result_id": result.id,
                        "student_id": student.id,
                        "student_name": name,
                        "roll_no": record.roll_number,
                        "academic_class_id": academic.id,
                        "class_name": class_name,
                        "exam_id": exam.id,
                        "exam_name": exam.exam_name,
                        "academic_year": exam.academic_year,
                        "subject_id": subject.id,
                        "subject": subject.subject_name,
                        "internal_marks": result.internal_marks,
                        "external_marks": result.external_marks,
                        "oral_marks": result.oral_marks,
                        "practical_marks": result.practical_marks,
                        "internal_out_of": result.internal_out_of,
                        "external_out_of": result.external_out_of,
                        "oral_out_of": result.oral_out_of,
                        "practical_out_of": result.practical_out_of,
                        "total_marks": result.total_marks,
                        "total_out_of": out_of,
                        "percentage": result.percentage,
                        "grade": result.grade,
                        "status": result.status,
                        "remarks": result.remarks,
                        "final_result": (
                            "PASS"
                            if _safe_float(result.percentage) >= PASS_MARK_PERCENTAGE
                            else "FAIL"
                        ),
                    }
                )
            return jsonify(data), 200
        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Failed to load exam result rows"}), 500


class AdminExamReportCardsPDFAPI(MethodView):
    @login_required
    def get(self):
        try:
            exam_id = _parse_int(request.args.get("exam_id"))
            class_id = _parse_int(
                request.args.get("academic_class_id") or request.args.get("class_id")
            )
            if not exam_id:
                return jsonify({"error": "exam_id is required"}), 400
            exam = Exam.query.filter_by(
                id=exam_id, school_id=_current_school_id()
            ).first()
            if not exam:
                return jsonify({"error": "Exam not found"}), 404
            if class_id and class_id != exam.academic_class_id:
                return jsonify({"error": "Exam does not belong to selected class"}), 400

            academic = AcademicClass.query.get(exam.academic_class_id)
            division = Division.query.get(academic.division_id) if academic else None
            section = Section.query.get(academic.section_id) if academic else None
            batch = Batch.query.get(academic.batch_id) if academic else None
            class_name = _class_label(division, section, batch)
            students = _current_students_for_class(exam.academic_class_id)
            subject_ids = _exam_subject_ids(exam.id)
            subjects = (
                Subject.query.filter(Subject.id.in_(subject_ids))
                .order_by(Subject.subject_name.asc())
                .all()
                if subject_ids
                else []
            )

            buffer = BytesIO()
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=24,
                leftMargin=24,
                topMargin=24,
                bottomMargin=24,
            )
            styles = getSampleStyleSheet()
            elements = []
            for idx, (record, student) in enumerate(students):
                if idx:
                    elements.append(Spacer(1, 24))
                elements.append(Paragraph("<b>SCHOOL RESULT CARD</b>", styles["Title"]))
                elements.append(
                    Paragraph(
                        f"<b>{exam.exam_name} - {exam.academic_year}</b>",
                        styles["Heading3"],
                    )
                )
                elements.append(Spacer(1, 8))
                elements.append(
                    Table(
                        [
                            [
                                "Student",
                                _student_name(student),
                                "Roll No",
                                record.roll_number or "N/A",
                            ],
                            ["Class", class_name, "Result", ""],
                        ],
                        colWidths=[70, 190, 70, 130],
                    )
                )
                marks_rows = [["Subject", "Obtained", "Out Of", "%", "Grade", "Result"]]
                total_obtained = 0
                total_out = 0
                for subject in subjects:
                    result = ExamResult.query.filter_by(
                        student_id=student.id, exam_id=exam.id, subject_id=subject.id
                    ).first()
                    obtained = _safe_float(result.total_marks) if result else 0
                    out_of = _result_out_of(result) if result else 0
                    percent = round((obtained / out_of) * 100, 2) if out_of else 0
                    total_obtained += obtained
                    total_out += out_of
                    marks_rows.append(
                        [
                            subject.subject_name,
                            obtained,
                            out_of,
                            f"{percent}%",
                            result.grade if result else "-",
                            "PASS" if percent >= PASS_MARK_PERCENTAGE else "FAIL",
                        ]
                    )
                final_percentage = (
                    round((total_obtained / total_out) * 100, 2) if total_out else 0
                )
                final_result = (
                    "PASS" if final_percentage >= PASS_MARK_PERCENTAGE else "FAIL"
                )
                marks_rows.append(
                    [
                        "TOTAL",
                        total_obtained,
                        total_out,
                        f"{final_percentage}%",
                        _grade_from_percentage(final_percentage),
                        final_result,
                    ]
                )
                table = Table(marks_rows, repeatRows=1)
                table.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
                            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                            ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
                            ("ALIGN", (1, 1), (-1, -1), "CENTER"),
                            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                        ]
                    )
                )
                elements.append(Spacer(1, 10))
                elements.append(table)
                elements.append(Spacer(1, 16))
                elements.append(
                    Paragraph(
                        "Class Teacher Signature ____________________ &nbsp;&nbsp;&nbsp; Principal Signature ____________________",
                        styles["Normal"],
                    )
                )
            doc.build(elements)
            buffer.seek(0)
            safe_exam = re.sub(r"[^a-zA-Z0-9]+", "_", exam.exam_name).strip("_")
            return send_file(
                buffer,
                as_attachment=True,
                download_name=f"{safe_exam}_{class_name}_report_cards.pdf",
                mimetype="application/pdf",
            )
        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Failed to generate report cards"}), 500


# ============================================================
# ACADEMIC SETUP APIs
# Classes, Divisions, Sections and Batches - the building blocks
# every other academic module (subjects, timetable, attendance,
# exams) is linked to via AcademicClass. Batch + Division + Section
# are simple lookup tables; AcademicClass is the combination of the
# three that students/teachers actually get assigned to.
# ============================================================


def _clean_text(value):
    return str(value or "").strip()


def _batch_status(batch):
    """Computed label - not stored. 'Current' wins over date comparison."""
    if batch.is_current:
        return "Current"

    today = datetime.utcnow().date()

    if batch.start_date and batch.start_date > today:
        return "Upcoming"

    if batch.end_date and batch.end_date < today:
        return "Completed"

    return "Active"


def batch_to_dict(batch, class_count=0, student_count=0):
    return {
        "id": batch.id,
        "batch_name": batch.batch_name,
        "start_date": batch.start_date.isoformat() if batch.start_date else None,
        "end_date": batch.end_date.isoformat() if batch.end_date else None,
        "is_current": bool(batch.is_current),
        "academic_status": _batch_status(batch),
        "class_count": class_count,
        "student_count": student_count,
        "created_at": batch.created_at.isoformat() if batch.created_at else None,
    }


def division_to_dict(division, class_count=0):
    return {
        "id": division.id,
        "division_name": division.division_name,
        "class_count": class_count,
    }


def section_to_dict(section, class_count=0):
    return {
        "id": section.id,
        "section_name": section.section_name,
        "class_count": class_count,
    }


def academic_class_to_dict(
    academic, division=None, section=None, batch=None, student_count=0
):
    return {
        "id": academic.id,
        "batch_id": academic.batch_id,
        "batch_name": getattr(batch, "batch_name", None),
        "division_id": academic.division_id,
        "division_name": getattr(division, "division_name", None),
        "section_id": academic.section_id,
        "section_name": getattr(section, "section_name", None),
        "display_name": (
            _class_label(division, section, batch) if division and section else None
        ),
        "student_count": student_count,
    }


# ========================= BATCHES =========================
class AdminBatchesAPI(MethodView):
    @permission_required("academic", "view")
    def get(self):
        try:
            search = _clean_text(request.args.get("search"))

            query = Batch.query.filter(Batch.school_id == _current_school_id())
            if search:
                query = query.filter(Batch.batch_name.ilike(f"%{search}%"))

            batches = query.order_by(
                Batch.is_current.desc(), Batch.batch_name.desc()
            ).all()

            counts = dict(
                db.session.query(AcademicClass.batch_id, func.count(AcademicClass.id))
                .filter(AcademicClass.school_id == _current_school_id())
                .group_by(AcademicClass.batch_id)
                .all()
            )

            student_counts_raw = dict(
                db.session.query(
                    AcademicClass.batch_id,
                    func.count(StudentAcademicRecord.id),
                )
                .join(
                    StudentAcademicRecord,
                    StudentAcademicRecord.academic_class_id == AcademicClass.id,
                )
                .filter(AcademicClass.school_id == _current_school_id())
                .filter(StudentAcademicRecord.is_current == True)
                .group_by(AcademicClass.batch_id)
                .all()
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "batches": [
                            batch_to_dict(
                                b,
                                counts.get(b.id, 0),
                                student_counts_raw.get(b.id, 0),
                            )
                            for b in batches
                        ],
                        "stats": {
                            "total": Batch.query.filter(
                                Batch.school_id == _current_school_id()
                            ).count(),
                            "in_use": len(counts),
                            "current_batch": next(
                                (b.batch_name for b in batches if b.is_current), None
                            ),
                        },
                    }
                ),
                200,
            )
        except Exception as e:
            logger.exception(e)
            return jsonify({"success": False, "error": "Failed to load batches"}), 500

    @permission_required("academic", "create")
    def post(self):
        try:
            data = request.get_json(silent=True) or {}
            name = _clean_text(data.get("batch_name"))
            school_id = _current_school_id()

            if not name:
                return (
                    jsonify({"success": False, "error": "Batch name is required"}),
                    400,
                )

            duplicate = Batch.query.filter(
                Batch.school_id == school_id,
                func.lower(Batch.batch_name) == name.lower(),
            ).first()
            if duplicate:
                return (
                    jsonify({"success": False, "error": "Batch already exists"}),
                    409,
                )

            start_date = _parse_date_value(data.get("start_date"))
            end_date = _parse_date_value(data.get("end_date"))

            if start_date and end_date and start_date > end_date:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "start_date cannot be after end_date",
                        }
                    ),
                    400,
                )

            make_current = bool(data.get("is_current"))

            if make_current:
                Batch.query.filter(Batch.school_id == school_id).update(
                    {Batch.is_current: False}
                )

            batch = Batch(
                school_id=school_id,
                batch_name=name,
                start_date=start_date,
                end_date=end_date,
                is_current=make_current,
            )
            db.session.add(batch)
            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Batch created successfully",
                        "batch": batch_to_dict(batch, 0, 0),
                    }
                ),
                201,
            )
        except IntegrityError:
            db.session.rollback()
            return jsonify({"success": False, "error": "Batch already exists"}), 409
        except SQLAlchemyError:
            db.session.rollback()
            return (
                jsonify(
                    {"success": False, "error": "Database error while creating batch"}
                ),
                500,
            )
        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"success": False, "error": "Failed to create batch"}), 500


class AdminBatchDetailAPI(MethodView):
    @permission_required("academic", "edit")
    def put(self, batch_id):
        try:
            school_id = _current_school_id()
            batch = Batch.query.filter_by(id=batch_id, school_id=school_id).first()
            if not batch:
                return jsonify({"success": False, "error": "Batch not found"}), 404

            data = request.get_json(silent=True) or {}
            name = _clean_text(data.get("batch_name"))

            if not name:
                return (
                    jsonify({"success": False, "error": "Batch name is required"}),
                    400,
                )

            duplicate = Batch.query.filter(
                Batch.school_id == school_id,
                Batch.id != batch_id,
                func.lower(Batch.batch_name) == name.lower(),
            ).first()
            if duplicate:
                return (
                    jsonify({"success": False, "error": "Batch already exists"}),
                    409,
                )

            start_date = _parse_date_value(data.get("start_date"))
            end_date = _parse_date_value(data.get("end_date"))

            if start_date and end_date and start_date > end_date:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "start_date cannot be after end_date",
                        }
                    ),
                    400,
                )

            batch.batch_name = name
            batch.start_date = start_date
            batch.end_date = end_date

            if "is_current" in data:
                make_current = bool(data.get("is_current"))
                if make_current:
                    Batch.query.filter(
                        Batch.school_id == school_id, Batch.id != batch_id
                    ).update({Batch.is_current: False})
                batch.is_current = make_current

            db.session.commit()

            class_count = AcademicClass.query.filter_by(batch_id=batch_id).count()
            student_count = (
                db.session.query(func.count(StudentAcademicRecord.id))
                .join(
                    AcademicClass,
                    AcademicClass.id == StudentAcademicRecord.academic_class_id,
                )
                .filter(
                    AcademicClass.batch_id == batch_id,
                    StudentAcademicRecord.is_current == True,
                )
                .scalar()
                or 0
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Batch updated successfully",
                        "batch": batch_to_dict(batch, class_count, student_count),
                    }
                ),
                200,
            )
        except IntegrityError:
            db.session.rollback()
            return jsonify({"success": False, "error": "Batch already exists"}), 409
        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"success": False, "error": "Failed to update batch"}), 500

    @permission_required("academic", "delete")
    def delete(self, batch_id):
        try:
            batch = Batch.query.filter_by(
                id=batch_id, school_id=_current_school_id()
            ).first()
            if not batch:
                return jsonify({"success": False, "error": "Batch not found"}), 404

            in_use = AcademicClass.query.filter_by(batch_id=batch_id).count()
            if in_use > 0:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": f"This batch is used in {in_use} class(es). Remove or reassign those classes first.",
                        }
                    ),
                    409,
                )

            db.session.delete(batch)
            db.session.commit()

            return (
                jsonify({"success": True, "message": "Batch deleted successfully"}),
                200,
            )
        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"success": False, "error": "Failed to delete batch"}), 500


# ---- Set a batch as the current academic year ----
class AdminBatchSetCurrentAPI(MethodView):
    @permission_required("academic", "edit")
    def put(self, batch_id):
        try:
            school_id = _current_school_id()
            batch = Batch.query.filter_by(id=batch_id, school_id=school_id).first()
            if not batch:
                return jsonify({"success": False, "error": "Batch not found"}), 404

            Batch.query.filter(
                Batch.school_id == school_id, Batch.id != batch_id
            ).update({Batch.is_current: False})
            batch.is_current = True
            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": f"{batch.batch_name} is now the current academic year",
                        "batch": batch_to_dict(batch),
                    }
                ),
                200,
            )
        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return (
                jsonify({"success": False, "error": "Failed to set current batch"}),
                500,
            )


# ---- Drill-down: everything happening inside one academic year ----
# This is what powers "check old batch academic data" - grade-by-grade
# breakdown, student counts, and totals for any batch, past or present.
class AdminBatchOverviewAPI(MethodView):
    @permission_required("academic", "view")
    def get(self, batch_id):
        try:
            batch = Batch.query.filter_by(
                id=batch_id, school_id=_current_school_id()
            ).first()
            if not batch:
                return jsonify({"success": False, "error": "Batch not found"}), 404

            rows = (
                db.session.query(AcademicClass, Division, Section)
                .join(Division, Division.id == AcademicClass.division_id)
                .join(Section, Section.id == AcademicClass.section_id)
                .filter(AcademicClass.batch_id == batch_id)
                .order_by(Division.division_name.asc(), Section.section_name.asc())
                .all()
            )

            class_ids = [academic.id for academic, _, _ in rows]

            student_counts = (
                dict(
                    db.session.query(
                        StudentAcademicRecord.academic_class_id,
                        func.count(StudentAcademicRecord.id),
                    )
                    .filter(
                        StudentAcademicRecord.academic_class_id.in_(class_ids),
                        StudentAcademicRecord.is_current == True,
                    )
                    .group_by(StudentAcademicRecord.academic_class_id)
                    .all()
                )
                if class_ids
                else {}
            )

            classes = []
            for academic, division, section in rows:
                count = student_counts.get(academic.id, 0)
                classes.append(
                    {
                        "id": academic.id,
                        "division_name": division.division_name,
                        "section_name": section.section_name,
                        "display_name": _class_label(division, section, batch),
                        "student_count": count,
                    }
                )

            total_students = sum(student_counts.values())
            fullest_class = max(classes, key=lambda c: c["student_count"], default=None)
            emptiest_class = min(
                classes, key=lambda c: c["student_count"], default=None
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "batch": batch_to_dict(batch, len(classes), total_students),
                        "classes": classes,
                        "summary": {
                            "total_classes": len(classes),
                            "total_students": total_students,
                            "average_class_size": (
                                round(total_students / len(classes), 1)
                                if classes
                                else 0
                            ),
                            "fullest_class": fullest_class,
                            "emptiest_class": emptiest_class,
                        },
                    }
                ),
                200,
            )
        except Exception as e:
            logger.exception(e)
            return (
                jsonify({"success": False, "error": "Failed to load batch overview"}),
                500,
            )


# ---- Rollover: copy last year's grade/section structure into a new
# academic year, so admins don't have to recreate "Class 10 - A", "Class
# 10 - B" etc. by hand every year. Only copies the Division+Section
# combinations - never touches students, so it's always a safe, additive
# action (existing classes in the target batch are left untouched and
# duplicates are silently skipped).
class AdminBatchRolloverAPI(MethodView):
    @permission_required("academic", "create")
    def post(self, batch_id):
        try:
            school_id = _current_school_id()
            source_batch = Batch.query.filter_by(id=batch_id, school_id=school_id).first()
            if not source_batch:
                return (
                    jsonify({"success": False, "error": "Source batch not found"}),
                    404,
                )

            data = request.get_json(silent=True) or {}
            target_batch_id = _parse_int(data.get("target_batch_id"))

            if not target_batch_id:
                return (
                    jsonify({"success": False, "error": "target_batch_id is required"}),
                    400,
                )

            target_batch = Batch.query.filter_by(
                id=target_batch_id, school_id=school_id
            ).first()
            if not target_batch:
                return (
                    jsonify({"success": False, "error": "Target batch not found"}),
                    404,
                )

            if target_batch_id == batch_id:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "Source and target batch must be different",
                        }
                    ),
                    400,
                )

            source_classes = AcademicClass.query.filter_by(
                batch_id=batch_id, school_id=school_id
            ).all()

            if not source_classes:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "The source batch has no classes to copy",
                        }
                    ),
                    409,
                )

            existing_combos = {
                (c.division_id, c.section_id)
                for c in AcademicClass.query.filter_by(
                    batch_id=target_batch_id, school_id=school_id
                ).all()
            }

            created = 0
            skipped = 0

            for source_class in source_classes:
                combo = (source_class.division_id, source_class.section_id)
                if combo in existing_combos:
                    skipped += 1
                    continue

                db.session.add(
                    AcademicClass(
                        batch_id=target_batch_id,
                        division_id=source_class.division_id,
                        section_id=source_class.section_id,
                        school_id=school_id,
                    )
                )
                existing_combos.add(combo)
                created += 1

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": (
                            f"Copied {created} class(es) into {target_batch.batch_name}"
                            + (
                                f", skipped {skipped} already existing"
                                if skipped
                                else ""
                            )
                        ),
                        "created": created,
                        "skipped": skipped,
                    }
                ),
                200,
            )
        except SQLAlchemyError:
            db.session.rollback()
            return (
                jsonify({"success": False, "error": "Database error during rollover"}),
                500,
            )
        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return (
                jsonify({"success": False, "error": "Failed to roll over batch"}),
                500,
            )


# ========================= DIVISIONS =========================
class AdminDivisionsAPI(MethodView):
    @permission_required("academic", "view")
    def get(self):
        try:
            search = _clean_text(request.args.get("search"))

            query = Division.query.filter(
                Division.school_id == _current_school_id()
            )
            if search:
                query = query.filter(Division.division_name.ilike(f"%{search}%"))

            divisions = query.order_by(Division.division_name.asc()).all()

            counts = dict(
                db.session.query(
                    AcademicClass.division_id, func.count(AcademicClass.id)
                )
                .filter(AcademicClass.school_id == _current_school_id())
                .group_by(AcademicClass.division_id)
                .all()
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "divisions": [
                            division_to_dict(d, counts.get(d.id, 0)) for d in divisions
                        ],
                        "stats": {
                            "total": Division.query.filter(
                                Division.school_id == _current_school_id()
                            ).count(),
                            "in_use": len(counts),
                        },
                    }
                ),
                200,
            )
        except Exception as e:
            logger.exception(e)
            return (
                jsonify({"success": False, "error": "Failed to load divisions"}),
                500,
            )

    @permission_required("academic", "create")
    def post(self):
        try:
            data = request.get_json(silent=True) or {}
            name = _clean_text(data.get("division_name"))
            school_id = _current_school_id()

            if not name:
                return (
                    jsonify({"success": False, "error": "Division name is required"}),
                    400,
                )

            duplicate = Division.query.filter(
                Division.school_id == school_id,
                func.lower(Division.division_name) == name.lower(),
            ).first()
            if duplicate:
                return (
                    jsonify({"success": False, "error": "Division already exists"}),
                    409,
                )

            division = Division(division_name=name, school_id=school_id)
            db.session.add(division)
            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Division created successfully",
                        "division": division_to_dict(division, 0),
                    }
                ),
                201,
            )
        except IntegrityError:
            db.session.rollback()
            return jsonify({"success": False, "error": "Division already exists"}), 409
        except SQLAlchemyError:
            db.session.rollback()
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Database error while creating division",
                    }
                ),
                500,
            )
        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return (
                jsonify({"success": False, "error": "Failed to create division"}),
                500,
            )


class AdminDivisionDetailAPI(MethodView):
    @permission_required("academic", "edit")
    def put(self, division_id):
        try:
            school_id = _current_school_id()
            division = Division.query.filter_by(
                id=division_id, school_id=school_id
            ).first()
            if not division:
                return jsonify({"success": False, "error": "Division not found"}), 404

            data = request.get_json(silent=True) or {}
            name = _clean_text(data.get("division_name"))

            if not name:
                return (
                    jsonify({"success": False, "error": "Division name is required"}),
                    400,
                )

            duplicate = Division.query.filter(
                Division.school_id == school_id,
                Division.id != division_id,
                func.lower(Division.division_name) == name.lower(),
            ).first()
            if duplicate:
                return (
                    jsonify({"success": False, "error": "Division already exists"}),
                    409,
                )

            division.division_name = name
            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Division updated successfully",
                        "division": division_to_dict(division, 0),
                    }
                ),
                200,
            )
        except IntegrityError:
            db.session.rollback()
            return jsonify({"success": False, "error": "Division already exists"}), 409
        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return (
                jsonify({"success": False, "error": "Failed to update division"}),
                500,
            )

    @permission_required("academic", "delete")
    def delete(self, division_id):
        try:
            division = Division.query.filter_by(
                id=division_id, school_id=_current_school_id()
            ).first()
            if not division:
                return jsonify({"success": False, "error": "Division not found"}), 404

            in_use = AcademicClass.query.filter_by(division_id=division_id).count()
            if in_use > 0:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": f"This division is used in {in_use} class(es). Remove or reassign those classes first.",
                        }
                    ),
                    409,
                )

            db.session.delete(division)
            db.session.commit()

            return (
                jsonify({"success": True, "message": "Division deleted successfully"}),
                200,
            )
        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return (
                jsonify({"success": False, "error": "Failed to delete division"}),
                500,
            )


# ========================= SECTIONS =========================
class AdminSectionsAPI(MethodView):
    @permission_required("academic", "view")
    def get(self):
        try:
            search = _clean_text(request.args.get("search"))

            query = Section.query.filter(Section.school_id == _current_school_id())
            if search:
                query = query.filter(Section.section_name.ilike(f"%{search}%"))

            sections = query.order_by(Section.section_name.asc()).all()

            counts = dict(
                db.session.query(AcademicClass.section_id, func.count(AcademicClass.id))
                .filter(AcademicClass.school_id == _current_school_id())
                .group_by(AcademicClass.section_id)
                .all()
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "sections": [
                            section_to_dict(s, counts.get(s.id, 0)) for s in sections
                        ],
                        "stats": {
                            "total": Section.query.filter(
                                Section.school_id == _current_school_id()
                            ).count(),
                            "in_use": len(counts),
                        },
                    }
                ),
                200,
            )
        except Exception as e:
            logger.exception(e)
            return jsonify({"success": False, "error": "Failed to load sections"}), 500

    @permission_required("academic", "create")
    def post(self):
        try:
            data = request.get_json(silent=True) or {}
            name = _clean_text(data.get("section_name"))
            school_id = _current_school_id()

            if not name:
                return (
                    jsonify({"success": False, "error": "Section name is required"}),
                    400,
                )

            duplicate = Section.query.filter(
                Section.school_id == school_id,
                func.lower(Section.section_name) == name.lower(),
            ).first()
            if duplicate:
                return (
                    jsonify({"success": False, "error": "Section already exists"}),
                    409,
                )

            section = Section(section_name=name, school_id=school_id)
            db.session.add(section)
            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Section created successfully",
                        "section": section_to_dict(section, 0),
                    }
                ),
                201,
            )
        except IntegrityError:
            db.session.rollback()
            return jsonify({"success": False, "error": "Section already exists"}), 409
        except SQLAlchemyError:
            db.session.rollback()
            return (
                jsonify(
                    {"success": False, "error": "Database error while creating section"}
                ),
                500,
            )
        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"success": False, "error": "Failed to create section"}), 500


class AdminSectionDetailAPI(MethodView):
    @permission_required("academic", "edit")
    def put(self, section_id):
        try:
            school_id = _current_school_id()
            section = Section.query.filter_by(id=section_id, school_id=school_id).first()
            if not section:
                return jsonify({"success": False, "error": "Section not found"}), 404

            data = request.get_json(silent=True) or {}
            name = _clean_text(data.get("section_name"))

            if not name:
                return (
                    jsonify({"success": False, "error": "Section name is required"}),
                    400,
                )

            duplicate = Section.query.filter(
                Section.school_id == school_id,
                Section.id != section_id,
                func.lower(Section.section_name) == name.lower(),
            ).first()
            if duplicate:
                return (
                    jsonify({"success": False, "error": "Section already exists"}),
                    409,
                )

            section.section_name = name
            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Section updated successfully",
                        "section": section_to_dict(section, 0),
                    }
                ),
                200,
            )
        except IntegrityError:
            db.session.rollback()
            return jsonify({"success": False, "error": "Section already exists"}), 409
        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"success": False, "error": "Failed to update section"}), 500

    @permission_required("academic", "delete")
    def delete(self, section_id):
        try:
            section = Section.query.filter_by(
                id=section_id, school_id=_current_school_id()
            ).first()
            if not section:
                return jsonify({"success": False, "error": "Section not found"}), 404

            in_use = AcademicClass.query.filter_by(section_id=section_id).count()
            if in_use > 0:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": f"This section is used in {in_use} class(es). Remove or reassign those classes first.",
                        }
                    ),
                    409,
                )

            db.session.delete(section)
            db.session.commit()

            return (
                jsonify({"success": True, "message": "Section deleted successfully"}),
                200,
            )
        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"success": False, "error": "Failed to delete section"}), 500


# ========================= CLASSES =========================
# A "Class" (AcademicClass) is the link between a Batch, a Division
# and a Section - e.g. Batch "2025-26" + Division "Class 10" +
# Section "A". This is what students/teachers/exams/timetable
# actually attach to.
class AdminAcademicClassesAPI(MethodView):
    @permission_required("academic", "view")
    def get(self):
        try:
            search = _clean_text(request.args.get("search"))
            batch_id = _parse_int(request.args.get("batch_id"))

            rows_query = (
                db.session.query(AcademicClass, Division, Section, Batch)
                .join(Division, Division.id == AcademicClass.division_id)
                .join(Section, Section.id == AcademicClass.section_id)
                .join(Batch, Batch.id == AcademicClass.batch_id)
                .filter(AcademicClass.school_id == _current_school_id())
            )

            if batch_id:
                rows_query = rows_query.filter(AcademicClass.batch_id == batch_id)

            rows = rows_query.order_by(
                Batch.batch_name.desc(),
                Division.division_name.asc(),
                Section.section_name.asc(),
            ).all()

            class_ids = [academic.id for academic, _, _, _ in rows]

            student_counts = (
                dict(
                    db.session.query(
                        StudentAcademicRecord.academic_class_id,
                        func.count(StudentAcademicRecord.id),
                    )
                    .filter(
                        StudentAcademicRecord.academic_class_id.in_(class_ids),
                        StudentAcademicRecord.is_current == True,
                    )
                    .group_by(StudentAcademicRecord.academic_class_id)
                    .all()
                )
                if class_ids
                else {}
            )

            classes = []
            for academic, division, section, batch in rows:
                label = _class_label(division, section, batch)
                if search and search.lower() not in label.lower():
                    continue
                classes.append(
                    academic_class_to_dict(
                        academic,
                        division,
                        section,
                        batch,
                        student_counts.get(academic.id, 0),
                    )
                )

            return (
                jsonify(
                    {
                        "success": True,
                        "classes": classes,
                        "stats": {
                            "total": AcademicClass.query.filter(
                                AcademicClass.school_id == _current_school_id()
                            ).count(),
                            "total_students_assigned": sum(student_counts.values()),
                        },
                    }
                ),
                200,
            )
        except Exception as e:
            logger.exception(e)
            return jsonify({"success": False, "error": "Failed to load classes"}), 500

    @permission_required("academic", "create")
    def post(self):
        try:
            data = request.get_json(silent=True) or {}
            batch_id = _parse_int(data.get("batch_id"))
            division_id = _parse_int(data.get("division_id"))
            section_id = _parse_int(data.get("section_id"))
            school_id = _current_school_id()

            if not batch_id or not division_id or not section_id:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "Batch, division and section are all required",
                        }
                    ),
                    400,
                )

            if not Batch.query.filter_by(id=batch_id, school_id=school_id).first():
                return (
                    jsonify({"success": False, "error": "Selected batch not found"}),
                    404,
                )
            if not Division.query.filter_by(
                id=division_id, school_id=school_id
            ).first():
                return (
                    jsonify({"success": False, "error": "Selected division not found"}),
                    404,
                )
            if not Section.query.filter_by(id=section_id, school_id=school_id).first():
                return (
                    jsonify({"success": False, "error": "Selected section not found"}),
                    404,
                )

            duplicate = AcademicClass.query.filter_by(
                batch_id=batch_id,
                division_id=division_id,
                section_id=section_id,
                school_id=school_id,
            ).first()
            if duplicate:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "This class already exists for the selected batch",
                        }
                    ),
                    409,
                )

            academic = AcademicClass(
                batch_id=batch_id,
                division_id=division_id,
                section_id=section_id,
                school_id=school_id,
            )
            db.session.add(academic)
            db.session.commit()

            division = Division.query.get(division_id)
            section = Section.query.get(section_id)
            batch = Batch.query.get(batch_id)

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Class created successfully",
                        "class": academic_class_to_dict(
                            academic, division, section, batch, 0
                        ),
                    }
                ),
                201,
            )
        except IntegrityError:
            db.session.rollback()
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "This class already exists for the selected batch",
                    }
                ),
                409,
            )
        except SQLAlchemyError:
            db.session.rollback()
            return (
                jsonify(
                    {"success": False, "error": "Database error while creating class"}
                ),
                500,
            )
        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"success": False, "error": "Failed to create class"}), 500


class AdminAcademicClassDetailAPI(MethodView):
    @permission_required("academic", "view")
    def get(self, class_id):
        try:
            academic = AcademicClass.query.filter_by(
                id=class_id, school_id=_current_school_id()
            ).first()
            if not academic:
                return jsonify({"success": False, "error": "Class not found"}), 404

            division = Division.query.get(academic.division_id)
            section = Section.query.get(academic.section_id)
            batch = Batch.query.get(academic.batch_id)
            student_count = StudentAcademicRecord.query.filter_by(
                academic_class_id=class_id, is_current=True
            ).count()

            return (
                jsonify(
                    {
                        "success": True,
                        "class": academic_class_to_dict(
                            academic, division, section, batch, student_count
                        ),
                    }
                ),
                200,
            )
        except Exception as e:
            logger.exception(e)
            return jsonify({"success": False, "error": "Failed to load class"}), 500

    @permission_required("academic", "edit")
    def put(self, class_id):
        try:
            school_id = _current_school_id()
            academic = AcademicClass.query.filter_by(
                id=class_id, school_id=school_id
            ).first()
            if not academic:
                return jsonify({"success": False, "error": "Class not found"}), 404

            data = request.get_json(silent=True) or {}
            batch_id = _parse_int(data.get("batch_id"), academic.batch_id)
            division_id = _parse_int(data.get("division_id"), academic.division_id)
            section_id = _parse_int(data.get("section_id"), academic.section_id)

            if not Batch.query.filter_by(id=batch_id, school_id=school_id).first():
                return (
                    jsonify({"success": False, "error": "Selected batch not found"}),
                    404,
                )
            if not Division.query.filter_by(
                id=division_id, school_id=school_id
            ).first():
                return (
                    jsonify({"success": False, "error": "Selected division not found"}),
                    404,
                )
            if not Section.query.filter_by(id=section_id, school_id=school_id).first():
                return (
                    jsonify({"success": False, "error": "Selected section not found"}),
                    404,
                )

            duplicate = AcademicClass.query.filter(
                AcademicClass.id != class_id,
                AcademicClass.school_id == school_id,
                AcademicClass.batch_id == batch_id,
                AcademicClass.division_id == division_id,
                AcademicClass.section_id == section_id,
            ).first()
            if duplicate:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "This class already exists for the selected batch",
                        }
                    ),
                    409,
                )

            academic.batch_id = batch_id
            academic.division_id = division_id
            academic.section_id = section_id
            db.session.commit()

            division = Division.query.get(division_id)
            section = Section.query.get(section_id)
            batch = Batch.query.get(batch_id)
            student_count = StudentAcademicRecord.query.filter_by(
                academic_class_id=class_id, is_current=True
            ).count()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Class updated successfully",
                        "class": academic_class_to_dict(
                            academic, division, section, batch, student_count
                        ),
                    }
                ),
                200,
            )
        except IntegrityError:
            db.session.rollback()
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "This class already exists for the selected batch",
                    }
                ),
                409,
            )
        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"success": False, "error": "Failed to update class"}), 500

    @permission_required("academic", "delete")
    def delete(self, class_id):
        try:
            academic = AcademicClass.query.filter_by(
                id=class_id, school_id=_current_school_id()
            ).first()
            if not academic:
                return jsonify({"success": False, "error": "Class not found"}), 404

            student_count = StudentAcademicRecord.query.filter_by(
                academic_class_id=class_id, is_current=True
            ).count()
            if student_count > 0:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": f"This class has {student_count} student(s) currently enrolled. Reassign them before deleting.",
                        }
                    ),
                    409,
                )

            db.session.delete(academic)
            db.session.commit()

            return (
                jsonify({"success": True, "message": "Class deleted successfully"}),
                200,
            )
        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"success": False, "error": "Failed to delete class"}), 500


# ========================= COMBINED OPTIONS =========================
# Feeds the Batch/Division/Section dropdowns on the "Add Class" form
# and any other academic-setup UI in one round trip.
class AdminAcademicSetupOptionsAPI(MethodView):
    @permission_required("academic", "view")
    def get(self):
        try:
            batches = Batch.query.order_by(Batch.batch_name.desc()).all()
            divisions = Division.query.order_by(Division.division_name.asc()).all()
            sections = Section.query.order_by(Section.section_name.asc()).all()

            return (
                jsonify(
                    {
                        "success": True,
                        "batches": [batch_to_dict(b) for b in batches],
                        "divisions": [division_to_dict(d) for d in divisions],
                        "sections": [section_to_dict(s) for s in sections],
                    }
                ),
                200,
            )
        except Exception as e:
            logger.exception(e)
            return jsonify({"success": False, "error": "Failed to load options"}), 500
