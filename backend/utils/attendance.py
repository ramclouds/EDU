from flask import jsonify, send_file
from flask.views import MethodView
from sqlalchemy import func, extract, case
from sqlalchemy.exc import SQLAlchemyError
from utils.auth import db
from utils.auth_middleware import login_required
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
from reportlab.lib import colors
import io
import logging

logger = logging.getLogger(__name__)


class StudentAttendanceAPI(MethodView):
    @login_required
    def get(self, student_id):
        try:
            # VALIDATION
            try:
                student_id = int(student_id)
                if student_id <= 0:
                    return jsonify({"error": "Invalid student id"}), 400
            except (ValueError, TypeError):
                return jsonify({"error": "Student id must be a valid integer"}), 400

            # SUMMARY
            total = (
                db.session.query(func.count(Attendance.id))
                .filter(Attendance.student_id == student_id)
                .scalar()
                or 0
            )

            present = (
                db.session.query(func.count(Attendance.id))
                .filter(
                    Attendance.student_id == student_id, Attendance.status == "Present"
                )
                .scalar()
                or 0
            )

            absent = (
                db.session.query(func.count(Attendance.id))
                .filter(
                    Attendance.student_id == student_id, Attendance.status == "Absent"
                )
                .scalar()
                or 0
            )

            late = (
                db.session.query(func.count(Attendance.id))
                .filter(
                    Attendance.student_id == student_id, Attendance.status == "Late"
                )
                .scalar()
                or 0
            )

            attendance_percent = round((present / total) * 100, 2) if total else 0

            # MONTHLY STATS
            monthly_data = (
                db.session.query(
                    extract("month", Attendance.attendance_date).label("month"),
                    func.count(Attendance.id).label("total"),
                    func.sum(case((Attendance.status == "Present", 1), else_=0)).label(
                        "present"
                    ),
                )
                .filter(Attendance.student_id == student_id)
                .group_by("month")
                .all()
            )

            monthly = []
            for row in monthly_data:
                total_month = row.total or 0
                present_month = row.present or 0

                percent = (
                    round((present_month / total_month) * 100, 2) if total_month else 0
                )

                monthly.append({"month": int(row.month), "percentage": percent})

            # RECENT RECORDS
            records_query = (
                Attendance.query.filter_by(student_id=student_id)
                .order_by(Attendance.attendance_date.desc())
                .limit(10)
                .all()
            )

            records = []
            for r in records_query:
                try:
                    records.append(
                        {
                            "date": (
                                r.attendance_date.strftime("%d %b %Y")
                                if r.attendance_date
                                else None
                            ),
                            "day": (
                                r.attendance_date.strftime("%A")
                                if r.attendance_date
                                else None
                            ),
                            "status": r.status,
                            "remarks": r.remarks or "-",
                        }
                    )
                except Exception as e:
                    logger.warning(f"Skipping corrupted record: {e}")

            return (
                jsonify(
                    {
                        "summary": {
                            "attendance_percent": attendance_percent,
                            "present": present,
                            "absent": absent,
                            "late": late,
                        },
                        "monthly": monthly,
                        "records": records,
                    }
                ),
                200,
            )

        except SQLAlchemyError as db_err:
            logger.error(f"Database error: {db_err}")
            db.session.rollback()
            return jsonify({"error": "Database error occurred"}), 500

        except Exception as e:
            logger.exception(f"Unexpected error: {e}")
            return jsonify({"error": "Something went wrong"}), 500


class DownloadAttendancePDF(MethodView):
    @login_required
    def get(self, student_id):
        try:
            # VALIDATION
            try:
                student_id = int(student_id)
                if student_id <= 0:
                    return jsonify({"error": "Invalid student id"}), 400
            except (ValueError, TypeError):
                return jsonify({"error": "Student id must be a valid integer"}), 400

            # FETCH DATA
            records = (
                Attendance.query.filter_by(student_id=student_id)
                .order_by(Attendance.attendance_date.desc())
                .all()
            )

            if not records:
                return jsonify({"error": "No attendance records found"}), 404

            # PDF GENERATION
            buffer = io.BytesIO()

            try:
                doc = SimpleDocTemplate(buffer)

                data = [["Date", "Day", "Status", "Remarks"]]

                for r in records:
                    try:
                        data.append(
                            [
                                (
                                    r.attendance_date.strftime("%d-%m-%Y")
                                    if r.attendance_date
                                    else "-"
                                ),
                                (
                                    r.attendance_date.strftime("%A")
                                    if r.attendance_date
                                    else "-"
                                ),
                                r.status or "-",
                                r.remarks or "-",
                            ]
                        )
                    except Exception as e:
                        logger.warning(f"Skipping bad row: {e}")

                table = Table(data)
                table.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                            ("GRID", (0, 0), (-1, -1), 1, colors.black),
                        ]
                    )
                )

                doc.build([table])

            except Exception as pdf_err:
                logger.error(f"PDF generation failed: {pdf_err}")
                return jsonify({"error": "Failed to generate PDF"}), 500

            buffer.seek(0)

            return send_file(
                buffer,
                as_attachment=True,
                download_name=f"attendance_report_{student_id}.pdf",
                mimetype="application/pdf",
            )

        except SQLAlchemyError as db_err:
            logger.error(f"Database error: {db_err}")
            db.session.rollback()
            return jsonify({"error": "Database error occurred"}), 500

        except Exception as e:
            logger.exception(f"Unexpected error: {e}")
            return jsonify({"error": "Something went wrong"}), 500


# ATTENDANCE MODEL
class Attendance(db.Model):
    __tablename__ = "attendance"

    id = db.Column(db.Integer, primary_key=True)

    student_id = db.Column(db.Integer, nullable=False)
    academic_class_id = db.Column(db.Integer, nullable=False)

    attendance_date = db.Column(db.Date, nullable=False)

    status = db.Column(db.Enum("Present", "Absent", "Late"), nullable=False)

    remarks = db.Column(db.String(255))

    academic_year = db.Column(db.String(20))

    created_at = db.Column(db.DateTime, server_default=db.func.now())
