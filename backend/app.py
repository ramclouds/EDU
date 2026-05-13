import os
from flask import Flask, jsonify, send_from_directory, request
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from dotenv import load_dotenv

# ================= LOAD ENV =================
load_dotenv()

# ================= CORE =================
from utils.auth import Login, SignUp, db, bcrypt

# ================= STUDENT / TEACHER =================
from utils.studentDetails import StudentDetails, UpdateStudentProfile, ChangePassword

from utils.teacherDetails import (
    TeacherDetails,
    UpdateTeacherProfile,
    ChangeTeacherPassword,
)

# =================  ASSIGNMENTS =================
from utils.assignments import (
    SubmitAssignmentAPI,
    GetStudentAssignmentsAPI,
    TeacherAssignedClassesAPI,
    CreateAssignmentAPI,
    TeacherAssignmentsAPI,
    AssignmentSubmissionListAPI,
    GradeAssignmentAPI,
    UpdateAssignmentAPI,
    DeleteAssignmentAPI,
    ForceResubmitAPI,
)

# ================= NOTIFICATIONS =================
from utils.Notifications import (
    NotificationsAPI,
    MarkNotificationReadAPI,
    MarkAllNotificationsReadAPI,
    DeleteNotificationAPI,
    UnreadNotificationCountAPI,
    ActivityLogsAPI,
)

# ================= LEAVES =================
from utils.leaves import (
    ApplyLeave,
    TeacherLeaveHistory,
    TeacherLeaveBalanceAPI,
    UpdateLeaveStatus,
    AllStudentLeaves,
    ApplyStudentLeave,
    StudentLeaveHistory,
    UpdateStudentLeaveStatus,
    DeleteStudentLeave,
)

# ================= ACADEMICS =================
from utils.attendance import (
    StudentAttendanceAPI,
    DownloadAttendancePDF,
    TeacherAssignedClassesAPI,
    StudentsByClassAPI,
    AttendanceMarkAPI,
    GetAttendanceByDateAPI,
    DownloadTeacherAttendanceReportAPI,
)

from utils.timetable import (
    StudentTimetableAPI,
    TeacherTimetableAPI,
    DownloadTeacherTimetablePDFAPI,
)

from utils.examResult import (
    StudentExamResultsAPI,
    PerformanceAPI,
    UpcomingExamsAPI,
    DownloadResultPDF,
    ExamFilterOptionsAPI,
)

# ================= OTHER =================
from utils.hostel import StudentHostelDetails, CreateHostelComplaint

from utils.announcement import (
    CreateNoticeAPI,
    StudentNoticeAPI,
    TeacherNoticeAPI,
    MarkNoticeReadAPI,
)

from utils.library import StudentLibraryAPI

# ==================================================
# CREATE APP
# ==================================================


def create_app():
    app = Flask(__name__)

    # ================= CONFIG =================
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("MYSQL_DSN")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET", "super-secret-key")

    # ================= INIT =================
    db.init_app(app)
    bcrypt.init_app(app)
    JWTManager(app)

    # ================= CORS =================
    CORS(
        app,
        supports_credentials=True,
        origins=["http://localhost:5173"],
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    @app.after_request
    def after_request(response):
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:5173")
        response.headers.add(
            "Access-Control-Allow-Headers", "Content-Type,Authorization"
        )
        response.headers.add(
            "Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS"
        )
        return response

    @app.before_request
    def handle_options():
        if request.method == "OPTIONS":
            return jsonify({"message": "OK"}), 200

    # ==================================================
    # HEALTH
    # ==================================================

    @app.route("/")
    def health():
        return {"status": "API Running"}, 200

    # ==================================================
    # AUTH
    # ==================================================

    app.add_url_rule("/api/login", view_func=Login.as_view("login"), methods=["POST"])

    app.add_url_rule(
        "/api/signup", view_func=SignUp.as_view("signup"), methods=["POST"]
    )

    # ==================================================
    # STUDENT
    # ==================================================

    app.add_url_rule(
        "/api/student/<int:id>",
        view_func=StudentDetails.as_view("student_details"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/student/update/<int:id>",
        view_func=UpdateStudentProfile.as_view("update_student"),
        methods=["PUT"],
    )

    app.add_url_rule(
        "/api/student/change-password/<int:id>",
        view_func=ChangePassword.as_view("change_student_password"),
        methods=["PUT"],
    )

    # ==================================================
    # TEACHER
    # ==================================================

    app.add_url_rule(
        "/api/<int:id>/teacher",
        view_func=TeacherDetails.as_view("teacher_details"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/<int:id>/teacher/update",
        view_func=UpdateTeacherProfile.as_view("update_teacher"),
        methods=["PUT"],
    )

    app.add_url_rule(
        "/api/teacher/<int:id>/change-password",
        view_func=ChangeTeacherPassword.as_view("change_teacher_password"),
        methods=["PUT"],
    )

    # ==================================================
    # TEACHER ASSIGNMENTS (NEW)
    # ==================================================

    app.add_url_rule(
        "/api/teacher/<int:teacher_id>/assigned-classes",
        view_func=TeacherAssignedClassesAPI.as_view("teacher_assigned_classes"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/teacher/<int:teacher_id>/assignments",
        view_func=TeacherAssignmentsAPI.as_view("teacher_assignments"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/teacher/<int:teacher_id>/assignments/create",
        view_func=CreateAssignmentAPI.as_view("create_assignment"),
        methods=["POST"],
    )

    app.add_url_rule(
        "/api/assignments/<int:assignment_id>/submissions",
        view_func=AssignmentSubmissionListAPI.as_view("assignment_submissions"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/submissions/<int:submission_id>/grade",
        view_func=GradeAssignmentAPI.as_view("grade_submission"),
        methods=["PUT"],
    )

    app.add_url_rule(
        "/api/teacher/<int:teacher_id>/assignments/<int:assignment_id>",
        view_func=UpdateAssignmentAPI.as_view("update_assignment"),
    )

    app.add_url_rule(
        "/api/teacher/<int:teacher_id>/assignments/<int:assignment_id>",
        view_func=DeleteAssignmentAPI.as_view("delete_assignment"),
    )

    app.add_url_rule(
        "/api/assignments/recheck/<int:submission_id>",
        view_func=ForceResubmitAPI.as_view("force_resubmit"),
        methods=["POST"],
    )

    # ==================================================
    # STUDENT ASSIGNMENTS
    # ==================================================

    app.add_url_rule(
        "/api/assignments/<int:student_id>",
        view_func=GetStudentAssignmentsAPI.as_view("student_assignments"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/assignments/submit/<int:student_id>/<int:assignment_id>",
        view_func=SubmitAssignmentAPI.as_view("submit_assignment"),
        methods=["POST"],
    )

    # ==================================================
    # ANNOUNCEMENTS
    # ==================================================

    app.add_url_rule(
        "/api/announcements",
        view_func=CreateNoticeAPI.as_view("create_notice"),
        methods=["POST"],
    )

    app.add_url_rule(
        "/api/announcements/student/<int:student_id>",
        view_func=StudentNoticeAPI.as_view("student_notices"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/announcements/teacher/<int:teacher_id>",
        view_func=TeacherNoticeAPI.as_view("teacher_notices"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/announcements/read/<int:notice_id>/<int:user_id>",
        view_func=MarkNoticeReadAPI.as_view("mark_notice_read"),
        methods=["POST"],
    )

    # ==================================================
    # NOTIFICATIONS
    # ==================================================

    app.add_url_rule(
        "/api/notifications",
        view_func=NotificationsAPI.as_view("notifications"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/notifications/read/<int:notification_id>",
        view_func=MarkNotificationReadAPI.as_view("mark_notification_read"),
        methods=["POST"],
    )

    app.add_url_rule(
        "/api/notifications/read-all",
        view_func=MarkAllNotificationsReadAPI.as_view("read_all_notifications"),
        methods=["POST"],
    )

    app.add_url_rule(
        "/api/notifications/<int:id>",
        view_func=DeleteNotificationAPI.as_view("delete_notification"),
        methods=["DELETE"],
    )

    app.add_url_rule(
        "/api/notifications/unread-count",
        view_func=UnreadNotificationCountAPI.as_view("unread_count"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/activity-logs",
        view_func=ActivityLogsAPI.as_view("activity_logs"),
        methods=["GET"],
    )

    # ==================================================
    # LEAVES
    # ==================================================

    app.add_url_rule(
        "/api/teacher/leave/apply",
        view_func=ApplyLeave.as_view("apply_teacher_leave"),
        methods=["POST"],
    )

    app.add_url_rule(
        "/api/teacher/leave/history",
        view_func=TeacherLeaveHistory.as_view("teacher_leave_history"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/teacher/leave/balance",
        view_func=TeacherLeaveBalanceAPI.as_view("teacher_leave_balance"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/teacher/leave/update/<int:leave_id>",
        view_func=UpdateLeaveStatus.as_view("update_teacher_leave"),
        methods=["POST"],
    )

    app.add_url_rule(
        "/api/student/leave",
        view_func=ApplyStudentLeave.as_view("student_leave_apply"),
        methods=["POST"],
    )

    app.add_url_rule(
        "/api/student/leave/history",
        view_func=StudentLeaveHistory.as_view("student_leave_history"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/student/leave/<int:leave_id>",
        view_func=DeleteStudentLeave.as_view("delete_student_leave"),
        methods=["DELETE"],
    )

    app.add_url_rule(
        "/api/admin/student/leaves",
        view_func=AllStudentLeaves.as_view("all_student_leaves"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/student/leave/<int:leave_id>",
        view_func=UpdateStudentLeaveStatus.as_view("update_student_leave"),
        methods=["POST"],
    )

    # ================= STUDENT ATTENDANCE =================
    app.add_url_rule(
        "/api/student/attendance/<int:student_id>",
        view_func=StudentAttendanceAPI.as_view("student_attendance"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/student/attendance/download/<int:student_id>",
        view_func=DownloadAttendancePDF.as_view("download_attendance_pdf"),
        methods=["GET"],
    )

    # ================= TEACHER ATTENDANCE =================
    # 1️⃣ Get teacher assigned classes
    app.add_url_rule(
        "/api/teacher/classes/<int:teacher_id>",
        view_func=TeacherAssignedClassesAPI.as_view("teacher_classes"),
        methods=["GET"],
    )

    # 2️⃣ Get students by class
    app.add_url_rule(
        "/api/students/by-class/<int:academic_class_id>",
        view_func=StudentsByClassAPI.as_view("students_by_class"),
        methods=["GET"],
    )

    # 3️⃣ Mark attendance (CREATE + UPDATE)
    app.add_url_rule(
        "/api/attendance/mark",
        view_func=AttendanceMarkAPI.as_view("mark_attendance"),
        methods=["POST"],
    )

    # 4️⃣ Get attendance by date
    app.add_url_rule(
        "/api/attendance",
        view_func=GetAttendanceByDateAPI.as_view("get_attendance_by_date"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/teacher/attendance/report",
        view_func=DownloadTeacherAttendanceReportAPI.as_view(
            "download_teacher_attendance_report"
        ),
    )

    # ==================================================
    # ACADEMICS
    # ==================================================

    app.add_url_rule(
        "/api/timetable/<int:student_id>",
        view_func=StudentTimetableAPI.as_view("timetable"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/teachers/<int:teacher_id>/timetable",
        view_func=TeacherTimetableAPI.as_view("teacher_timetable_api"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/teacher/timetable/pdf/<int:teacher_id>",
        view_func=DownloadTeacherTimetablePDFAPI.as_view(
            "download_teacher_timetable_pdf"
        ),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/performance/<int:student_id>",
        view_func=PerformanceAPI.as_view("performance"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/results/<int:student_id>",
        view_func=StudentExamResultsAPI.as_view("results"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/results/pdf/<int:student_id>",
        view_func=DownloadResultPDF.as_view("result_pdf"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/results/filters/<int:student_id>",
        view_func=ExamFilterOptionsAPI.as_view("result_filters"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/upcoming-exams/<int:student_id>",
        view_func=UpcomingExamsAPI.as_view("upcoming_exams"),
        methods=["GET"],
    )

    # ==================================================
    # LIBRARY / HOSTEL
    # ==================================================

    app.add_url_rule(
        "/api/library/<int:student_id>",
        view_func=StudentLibraryAPI.as_view("library"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/student/<int:student_id>/hostel",
        view_func=StudentHostelDetails.as_view("hostel"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/student/<int:student_id>/hostel/complaint",
        view_func=CreateHostelComplaint.as_view("hostel_complaint"),
        methods=["POST"],
    )

    # ==================================================
    # FILE SERVING
    # ==================================================

    BASE_DIR = os.path.abspath(os.path.dirname(__file__))

    SUBMITTED_FOLDER = os.path.join(BASE_DIR, "Submitted_Assignments")

    TEACHER_ASSIGNMENT_FOLDER = os.path.join(BASE_DIR, "Assignment_Files")

    @app.route("/Submitted_Assignments/<path:filename>")
    def submitted_files(filename):
        return send_from_directory(SUBMITTED_FOLDER, filename)

    @app.route("/Assignment_Files/<path:filename>")
    def assignment_files(filename):
        return send_from_directory(TEACHER_ASSIGNMENT_FOLDER, filename)

    # ==================================================
    # ERROR HANDLERS
    # ==================================================

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "API not found"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error"}), 500

    return app


# ==================================================
# RUN
# ==================================================

app = create_app()

if __name__ == "__main__":

    with app.app_context():
        if os.getenv("FLASK_ENV") == "development":
            db.create_all()

    app.run(host="0.0.0.0", port=5000, debug=True)
