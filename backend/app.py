import os
from flask import Flask, jsonify, send_from_directory, request
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from dotenv import load_dotenv
import traceback

# ==== LOAD ENV ====
load_dotenv()

# ==== CORE ====
from utils.auth import Login, SignUp, db, bcrypt

# ==== STUDENT / TEACHER ====
from utils.studentDetails import StudentDetails, UpdateStudentProfile, ChangePassword

from utils.teacherDetails import (
    TeacherDetails,
    UpdateTeacherProfile,
    ChangeTeacherPassword,
)

from utils.adminsDetails import AdminDetails, UpdateAdminProfile, ChangeAdminPassword
from utils.assets import (
    CreateAssetAPI,
    GetAssetsAPI,
    AssetDetailsAPI,
    UpdateAssetAPI,
    DeleteAssetAPI,
    RestoreAssetAPI,
    GetDeletedAssetsAPI,
)

# ====  ASSIGNMENTS ====
from utils.assignments import (
    SubmitAssignmentAPI,
    GetStudentAssignmentsAPI,
    CreateAssignmentAPI,
    TeacherAssignmentsAPI,
    AssignmentSubmissionListAPI,
    GradeAssignmentAPI,
    UpdateAssignmentAPI,
    DeleteAssignmentAPI,
    ForceResubmitAPI,
)

# ==== NOTIFICATIONS ====
from utils.Notifications import (
    NotificationsAPI,
    MarkNotificationReadAPI,
    MarkAllNotificationsReadAPI,
    DeleteNotificationAPI,
    UnreadNotificationCountAPI,
    LibraryNotificationsAPI,
    LibraryNotificationRetryAPI,
    LibraryNotificationDetailsAPI,
    ActivityLogsAPI,
)

# ==== LEAVES ====
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
    AllTeacherLeaves,
    AdminLeaveDashboard,
)

# ==== ACADEMICS ====
from utils.attendance import (
    StudentAttendanceAPI,
    DownloadAttendancePDF,
    TeacherAssignedClassesAPI,
    StudentsByClassAPI,
    AttendanceMarkAPI,
    GetAttendanceByDateAPI,
    DownloadTeacherAttendanceReportAPI,
    AttendanceFilterOptionsAPI,
    AdminAttendanceStatsAPI,
    AdminAttendanceListAPI,
    UpdateAttendanceStatusAPI,
    MarkAllAttendanceAPI,
)

from utils.timetable import (
    StudentTimetableAPI,
    TeacherTimetableAPI,
    DownloadTeacherTimetablePDFAPI,
    TimetableLectureAPI,
    AdminTimetableAPI,
    TimetableOptionsAPI,
    AdminTimetablePDFAPI,
)

from utils.examResult import (
    StudentExamResultsAPI,
    PerformanceAPI,
    UpcomingExamsAPI,
    DownloadResultPDF,
    ExamFilterOptionsAPI,
    TeacherSubjectsAPI,
    TeacherClassesAPI,
    TeacherStudentsAPI,
    TeacherStudentMarksAPI,
    SaveTeacherMarksAPI,
    TeacherReportCardAPI,
    TeacherAnalyticsAPI,
    TeacherAnalyticsPDFAPI,
    AdminExamOptionsAPI,
    AdminExamTermAPI,
    AdminExamDashboardAPI,
    AdminExamClassDetailsAPI,
    AdminExamVerifyAPI,
    AdminExamPublishAPI,
    AdminExamSchedulePublishAPI,
    AdminExamBulkEditAPI,
    AdminExamResultsAPI,
    AdminExamReportsPDFAPI,
    AdminExamReportCardsPDFAPI,
    TeacherExamsAPI,
    AdminExamMarksEntryPermissionAPI,
)

# ==== OTHER ====
from utils.hostel import (
    StudentHostelDetails,
    CreateHostelComplaint,
    HostelListAPI,
    HostelDetailAPI,
    HostelBlockListAPI,
    HostelBlockDetailAPI,
    HostelFloorListAPI,
    HostelFloorDetailAPI,
    HostelRoomListAPI,
    HostelRoomDetailAPI,
    HostelBedListAPI,
    HostelBedDetailAPI,
    HostelBedAllocateAPI,
    HostelBedVacateAPI,
    HostelStructureOverviewAPI,
    HostelUnallocatedStudentsAPI,
    HostelStudentSearchAPI,
    HostelAllocationListAPI,
    HostelAllocationCheckoutAPI,
    HostelAllocationTransferAPI,
    HostelStaffListAPI,
    HostelStaffDetailAPI,
    HostelVisitorListAPI,
    HostelVisitorDetailAPI,
    HostelVisitorApproveAPI,
    HostelVisitorRejectAPI,
    HostelVisitorCheckoutAPI,
    HostelAttendanceListAPI,
    HostelAttendanceMarkAPI,
    HostelMovementListAPI,
    HostelMovementCheckInAPI,
    HostelLeaveRequestListAPI,
    HostelLeaveRequestDetailAPI,
    HostelLeaveRequestApproveAPI,
    HostelLeaveRequestRejectAPI,
    HostelLeaveRequestReturnAPI,
    HostelMessMenuListAPI,
    HostelMessMenuDetailAPI,
    HostelMealAttendanceListAPI,
    HostelMealAttendanceMarkAPI,
    HostelMealAttendanceBulkMarkAPI,
)

from utils.announcement import (
    CreateNoticeAPI,
    StudentNoticeAPI,
    TeacherNoticeAPI,
    AdminNoticeAPI,
    MarkNoticeReadAPI,
)

from utils.library import (
    StudentLibraryAPI,
    StudentLibraryDashboardAPI,
    LibraryCategoryListAPI,
    LibraryCategoryDetailAPI,
    LibraryCategoryStatusAPI,
    LibraryCategoryOptionsAPI,
    LibraryAuthorListAPI,
    LibraryAuthorDetailAPI,
    LibraryAuthorStatusAPI,
    LibraryAuthorOptionsAPI,
    LibraryBookListAPI,
    LibraryBookOptionsAPI,
    LibraryBookDetailAPI,
    LibraryBookStatusAPI,
    LibraryStudentsAPI,
    LibraryStudentFinePaymentAPI,
    LibraryTeachersAPI,
    LibraryTeacherDetailsAPI,
    LibraryTeacherFinePaymentAPI,
    LibraryMembersAPI,
    LibraryMemberDetailsAPI,
    LibraryCirculationOptionsAPI,
    LibraryCirculationAPI,
    LibraryCirculationReturnAPI,
    LibraryReturnOptionsAPI,
    LibraryReturnBookAPI,
    LibraryReturnedBooksAPI,
    LibraryFinesAPI,
    LibraryFineActionAPI,
    LibraryFineDetailsAPI,
    LibraryTransactionsAPI,
    LibraryReportsAPI,
    LibraryDashboardAPI,
)

from utils.teacherMyClasses import TeacherMyClasses, MyClasses
from utils.studentEnrollment import (
    EnrollStudentAPI,
    StudentPromotionAPI,
    StudentEnrollmentPreviewAPI,
    StudentEnrollmentOptionsAPI,
)

from utils.TeacherManagement import (
    AdminTeachersAPI,
    AdminTeacherDetailAPI,
    AdminTeacherOptionsAPI,
    AdminTeacherAssignmentsAPI,
    AdminTeacherPasswordAPI,
    AdminTeacherStatusAPI,
)

from utils.subjects import AdminSubjectsAPI, AdminSubjectDetailAPI

from utils.rolePermissionManagement import (
    MyRBACAccessAPI,
    RBACBootstrapAPI,
    RBACRoleDetailAPI,
    RBACRoleListAPI,
    RBACRolePermissionAPI,
    RBACUserAccessAPI,
    RBACUserListAPI,
    RBACUserOverrideAPI,
    RBACUserRoleAPI,
    seed_rbac_defaults,
    MyDashboardAccessAPI,
    MyRBACAccessAPI,
)


# CREATE APP
def create_app():
    app = Flask(__name__)

    # ==== CONFIG ====
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("MYSQL_DSN")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET", "super-secret-key")

    # ==== INIT ====
    db.init_app(app)
    bcrypt.init_app(app)
    JWTManager(app)

    # ==== CORS ====
    CORS(
        app,
        supports_credentials=True,
        origins=["http://localhost:5173"],
        allow_headers=["Content-Type", "Authorization"],
        methods=[
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS",
        ],
    )

    @app.before_request
    def handle_options():
        if request.method == "OPTIONS":
            return jsonify({"message": "OK"}), 200

    # HEALTH
    @app.route("/")
    def health():
        return {"status": "API Running"}, 200

    # AUTH
    app.add_url_rule("/api/login", view_func=Login.as_view("login"), methods=["POST"])

    app.add_url_rule(
        "/api/signup", view_func=SignUp.as_view("signup"), methods=["POST"]
    )

    # =========================================================
    # RBAC ROUTES
    # =========================================================

    app.add_url_rule(
        "/api/rbac/bootstrap",
        view_func=RBACBootstrapAPI.as_view("rbac_bootstrap_api"),
        methods=["GET", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/rbac/roles",
        view_func=RBACRoleListAPI.as_view("rbac_role_list_api"),
        methods=["GET", "POST", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/rbac/roles/<int:role_id>",
        view_func=RBACRoleDetailAPI.as_view("rbac_role_detail_api"),
        methods=["GET", "PUT", "DELETE", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/rbac/roles/<int:role_id>/permissions",
        view_func=RBACRolePermissionAPI.as_view("rbac_role_permission_api"),
        methods=["PUT", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/rbac/users",
        view_func=RBACUserListAPI.as_view("rbac_user_list_api"),
        methods=["GET", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/rbac/users/<string:user_type>/<int:user_id>/access",
        view_func=RBACUserAccessAPI.as_view("rbac_user_access_api"),
        methods=["GET", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/rbac/users/<string:user_type>/<int:user_id>/role",
        view_func=RBACUserRoleAPI.as_view("rbac_user_role_api"),
        methods=["PUT", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/rbac/users/<string:user_type>/<int:user_id>/overrides",
        view_func=RBACUserOverrideAPI.as_view("rbac_user_override_api"),
        methods=["PUT", "DELETE", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/rbac/my-access",
        view_func=MyRBACAccessAPI.as_view("my_rbac_access_api"),
        methods=["GET", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/rbac/my-dashboards",
        view_func=MyDashboardAccessAPI.as_view("my_dashboard_access"),
    )

    # STUDENT
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

    # TEACHER
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

    # ADMIN
    app.add_url_rule(
        "/api/<int:id>/admin",
        view_func=AdminDetails.as_view("admin_details"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/<int:id>/admin/update",
        view_func=UpdateAdminProfile.as_view("update_admin"),
        methods=["PUT"],
    )

    app.add_url_rule(
        "/api/admin/<int:id>/change-password",
        view_func=ChangeAdminPassword.as_view("change_admin_password"),
        methods=["PUT"],
    )

    # ASSETS MANAGEMENT
    app.add_url_rule(
        "/api/assets",
        view_func=GetAssetsAPI.as_view("get_assets"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/assets/create",
        view_func=CreateAssetAPI.as_view("create_asset"),
        methods=["POST"],
    )

    app.add_url_rule(
        "/api/assets/<int:id>",
        view_func=AssetDetailsAPI.as_view("asset_details"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/assets/<int:id>",
        view_func=UpdateAssetAPI.as_view("update_asset"),
        methods=["PUT"],
    )

    app.add_url_rule(
        "/api/assets/<int:id>",
        view_func=DeleteAssetAPI.as_view("delete_asset"),
        methods=["DELETE"],
    )
    app.add_url_rule(
        "/api/assets/restore/<int:id>",
        view_func=RestoreAssetAPI.as_view("restore_asset"),
        methods=["POST"],
    )

    app.add_url_rule(
        "/api/assets/deleted",
        view_func=GetDeletedAssetsAPI.as_view("deleted_assets"),
        methods=["GET"],
    )

    # TEACHER ASSIGNMENTS (NEW)
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

    # STUDENT ASSIGNMENTS
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

    # ANNOUNCEMENTS
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
        "/api/announcements/admin/<int:admin_id>",
        view_func=AdminNoticeAPI.as_view("admin_notices"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/announcements/read/<int:notice_id>/<int:user_id>",
        view_func=MarkNoticeReadAPI.as_view("mark_notice_read"),
        methods=["POST"],
    )

    # NOTIFICATIONS
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
        "/api/admin/library/notifications",
        view_func=LibraryNotificationsAPI.as_view("library_notifications_api"),
        methods=["GET", "POST"],
    )

    app.add_url_rule(
        "/api/admin/library/notifications/<int:notification_id>",
        view_func=LibraryNotificationDetailsAPI.as_view(
            "library_notification_details_api"
        ),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/library/notifications/<int:notification_id>/retry",
        view_func=LibraryNotificationRetryAPI.as_view("library_notification_retry_api"),
        methods=["POST"],
    )

    app.add_url_rule(
        "/api/admin/activity-logs",
        view_func=ActivityLogsAPI.as_view("activity_logs"),
        methods=["GET"],
    )

    # LEAVES
    app.add_url_rule(
        "/api/admin/teacher/leaves",
        view_func=AllTeacherLeaves.as_view("all_teacher_leaves"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/leaves/dashboard",
        view_func=AdminLeaveDashboard.as_view("admin_leave_dashboard"),
        methods=["GET"],
    )

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

    # ==== STUDENT ATTENDANCE ====
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

    # ==== TEACHER ATTENDANCE ====
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

    # ADMIN ATTENDANCE
    app.add_url_rule(
        "/api/admin/attendance/filters",
        view_func=AttendanceFilterOptionsAPI.as_view("attendance_filters"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/attendance/stats",
        view_func=AdminAttendanceStatsAPI.as_view("admin_attendance_stats"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/attendance/list",
        view_func=AdminAttendanceListAPI.as_view("admin_attendance_list"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/attendance/update",
        view_func=UpdateAttendanceStatusAPI.as_view("admin_attendance_update"),
        methods=["PUT"],
    )

    app.add_url_rule(
        "/api/admin/attendance/mark-all",
        view_func=MarkAllAttendanceAPI.as_view("admin_attendance_mark_all"),
        methods=["POST"],
    )

    # ACADEMICS
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

    # ADMIN TIMETABLE MANAGEMENT
    app.add_url_rule(
        "/api/admin/timetable/options",
        view_func=TimetableOptionsAPI.as_view("timetable_options"),
        methods=["GET"],
    )
    # CREATE LECTURE
    app.add_url_rule(
        "/api/admin/timetable",
        view_func=TimetableLectureAPI.as_view("create_timetable_lecture"),
        methods=["POST"],
    )

    # LOAD TIMETABLE
    app.add_url_rule(
        "/api/admin/timetable",
        view_func=AdminTimetableAPI.as_view("admin_timetable"),
        methods=["GET"],
    )

    # UPDATE LECTURE
    app.add_url_rule(
        "/api/admin/timetable/<int:lecture_id>",
        view_func=TimetableLectureAPI.as_view("update_timetable_lecture"),
        methods=["PUT"],
    )

    # DELETE LECTURE
    app.add_url_rule(
        "/api/admin/timetable/<int:lecture_id>",
        view_func=TimetableLectureAPI.as_view("delete_timetable_lecture"),
        methods=["DELETE"],
    )
    app.add_url_rule(
        "/api/performance/<int:student_id>",
        view_func=PerformanceAPI.as_view("performance"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/timetable/pdf",
        view_func=AdminTimetablePDFAPI.as_view("admin_timetable_pdf"),
        methods=["GET"],
    )
    # ==== TEACHER EXAM RESULT ====
    app.add_url_rule(
        "/api/teacher/students",
        view_func=TeacherStudentsAPI.as_view("teacher_exam_students"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/teacher/subjects",
        view_func=TeacherSubjectsAPI.as_view("teacher_exam_subjects"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/teacher/classes",
        view_func=TeacherClassesAPI.as_view("teacher_exam_classes"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/teacher/marks/<int:student_id>",
        view_func=TeacherStudentMarksAPI.as_view("teacher_exam_student_marks"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/teacher/marks",
        view_func=SaveTeacherMarksAPI.as_view("teacher_exam_save_marks"),
        methods=["POST"],
    )

    app.add_url_rule(
        "/api/teacher/report-card/<int:student_id>",
        view_func=TeacherReportCardAPI.as_view("teacher_exam_report_card"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/teacher/analytics",
        view_func=TeacherAnalyticsAPI.as_view("teacher_analytics"),
    )

    app.add_url_rule(
        "/api/teacher/analytics/pdf",
        view_func=TeacherAnalyticsPDFAPI.as_view("teacher_analytics_pdf"),
    )
    # ===== Student Exam and Result ==
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
        "/api/teacher/exams",
        view_func=TeacherExamsAPI.as_view("teacher_exams_api"),
    )

    app.add_url_rule(
        "/api/upcoming-exams/<int:student_id>",
        view_func=UpcomingExamsAPI.as_view("upcoming_exams"),
        methods=["GET"],
    )

    # ==== ADMIN EXAM & RESULT CONTROL CENTER ====
    app.add_url_rule(
        "/api/admin/exams/<int:exam_id>/marks-entry-permission",
        view_func=AdminExamMarksEntryPermissionAPI.as_view(
            "admin_exam_marks_entry_permission"
        ),
        methods=["PUT"],
    )
    app.add_url_rule(
        "/api/admin/exams/options",
        view_func=AdminExamOptionsAPI.as_view("admin_exam_options"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/exams",
        view_func=AdminExamTermAPI.as_view("admin_exam_terms"),
        methods=["GET", "POST"],
    )

    app.add_url_rule(
        "/api/admin/exams/dashboard",
        view_func=AdminExamDashboardAPI.as_view("admin_exam_dashboard"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/exams/<int:exam_id>/details",
        view_func=AdminExamClassDetailsAPI.as_view("admin_exam_class_details"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/exams/<int:exam_id>/verify",
        view_func=AdminExamVerifyAPI.as_view("admin_exam_verify"),
        methods=["POST"],
    )

    app.add_url_rule(
        "/api/admin/exams/<int:exam_id>/publish",
        view_func=AdminExamPublishAPI.as_view("admin_exam_publish"),
        methods=["POST"],
    )

    app.add_url_rule(
        "/api/admin/exams/<int:exam_id>/schedule-publish",
        view_func=AdminExamSchedulePublishAPI.as_view("admin_exam_schedule_publish"),
        methods=["POST"],
    )

    app.add_url_rule(
        "/api/admin/exams/results",
        view_func=AdminExamResultsAPI.as_view("admin_exam_results"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/exams/results/bulk-edit",
        view_func=AdminExamBulkEditAPI.as_view("admin_exam_bulk_edit"),
        methods=["PUT"],
    )

    app.add_url_rule(
        "/api/admin/exams/reports/pdf",
        view_func=AdminExamReportsPDFAPI.as_view("admin_exam_reports_pdf"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/exams/report-cards/pdf",
        view_func=AdminExamReportCardsPDFAPI.as_view("admin_exam_report_cards_pdf"),
        methods=["GET"],
    )

    # =========================================================
    # LIBRARY CATEGORY MANAGEMENT
    # =========================================================

    app.add_url_rule(
        "/api/admin/library/categories",
        view_func=LibraryCategoryListAPI.as_view("library_category_list_api"),
        methods=["GET", "POST", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/library/categories/<int:category_id>",
        view_func=LibraryCategoryDetailAPI.as_view("library_category_detail_api"),
        methods=["GET", "PUT", "DELETE", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/library/categories/<int:category_id>/status",
        view_func=LibraryCategoryStatusAPI.as_view("library_category_status_api"),
        methods=["PATCH", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/library/category-options",
        view_func=LibraryCategoryOptionsAPI.as_view("library_category_options_api"),
        methods=["GET", "OPTIONS"],
    )

    # =========================================================
    # LIBRARY AUTHOR MANAGEMENT
    # =========================================================
    app.add_url_rule(
        "/api/admin/library/authors",
        view_func=LibraryAuthorListAPI.as_view("library_author_list_api"),
        methods=["GET", "POST", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/library/authors/<int:author_id>",
        view_func=LibraryAuthorDetailAPI.as_view("library_author_detail_api"),
        methods=["GET", "PUT", "DELETE", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/library/authors/<int:author_id>/status",
        view_func=LibraryAuthorStatusAPI.as_view("library_author_status_api"),
        methods=["PATCH", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/library/authors/options",
        view_func=LibraryAuthorOptionsAPI.as_view("library_author_options_api"),
        methods=["GET", "OPTIONS"],
    )

    # =========================================================
    # LIBRARY BOOK MANAGEMENT
    # =========================================================
    app.add_url_rule(
        "/api/admin/library/books",
        view_func=LibraryBookListAPI.as_view("library_book_list_api"),
        methods=["GET", "POST", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/library/books/options",
        view_func=LibraryBookOptionsAPI.as_view("library_book_options_api"),
        methods=["GET", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/library/books/<int:book_id>",
        view_func=LibraryBookDetailAPI.as_view("library_book_detail_api"),
        methods=["GET", "PUT", "DELETE", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/library/books/<int:book_id>/status",
        view_func=LibraryBookStatusAPI.as_view("library_book_status_api"),
        methods=["PATCH", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/library/students",
        view_func=LibraryStudentsAPI.as_view("library_students_api"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/library/students/<int:student_id>",
        view_func=StudentLibraryAPI.as_view("library_student_details_api"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/student/library/dashboard",
        view_func=StudentLibraryDashboardAPI.as_view("student_library_dashboard_api"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/library/students/<int:student_id>/fine-payments",
        view_func=LibraryStudentFinePaymentAPI.as_view(
            "library_student_fine_payment_api"
        ),
        methods=["POST"],
    )

    app.add_url_rule(
        "/api/admin/library/teachers",
        view_func=LibraryTeachersAPI.as_view("library_teachers_api"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/library/teachers/<int:teacher_id>",
        view_func=LibraryTeacherDetailsAPI.as_view("library_teacher_details_api"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/library/teachers/<int:teacher_id>/fine-payments",
        view_func=LibraryTeacherFinePaymentAPI.as_view("library_teacher_fine_api"),
        methods=["POST"],
    )

    app.add_url_rule(
        "/api/admin/library/members",
        view_func=LibraryMembersAPI.as_view("library_members_api"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/library/members/<string:member_type>/<int:member_id>",
        view_func=LibraryMemberDetailsAPI.as_view("library_member_details_api"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/library/circulation/options",
        view_func=LibraryCirculationOptionsAPI.as_view(
            "library_circulation_options_api"
        ),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/library/circulation",
        view_func=LibraryCirculationAPI.as_view("library_circulation_api"),
        methods=["GET", "POST"],
    )

    app.add_url_rule(
        "/api/admin/library/circulation/<string:member_type>/<int:issue_id>/return",
        view_func=LibraryCirculationReturnAPI.as_view("library_circulation_return_api"),
        methods=["POST"],
    )

    app.add_url_rule(
        "/api/admin/library/returns/options",
        view_func=LibraryReturnOptionsAPI.as_view("library_return_options_api"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/library/returns/<string:member_type>/<int:issue_id>",
        view_func=LibraryReturnBookAPI.as_view("library_return_book_api"),
        methods=["POST"],
    )

    app.add_url_rule(
        "/api/admin/library/returns",
        view_func=LibraryReturnedBooksAPI.as_view("library_returned_books_api"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/library/fines",
        view_func=LibraryFinesAPI.as_view("library_fines_api"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/library/fines/<string:member_type>/<int:issue_id>/action",
        view_func=LibraryFineActionAPI.as_view("library_fine_action_api"),
        methods=["POST"],
    )

    app.add_url_rule(
        "/api/admin/library/transactions",
        view_func=LibraryTransactionsAPI.as_view("library_transactions_api"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/library/fines/<string:member_type>/<int:issue_id>",
        view_func=LibraryFineDetailsAPI.as_view("library_fine_details_api"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/library/reports",
        view_func=LibraryReportsAPI.as_view("library_reports_api"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/library/dashboard",
        view_func=LibraryDashboardAPI.as_view("library_dashboard_api"),
        methods=["GET"],
    )

    # Hostels
    app.add_url_rule(
        "/api/student/<int:student_id>/hostel",
        view_func=StudentHostelDetails.as_view("student_hostel_details"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/student/<int:student_id>/hostel/complaint",
        view_func=CreateHostelComplaint.as_view("student_hostel_complaint"),
        methods=["POST"],
    )

    # ---- Hostel Admin: Hostels ----
    app.add_url_rule(
        "/api/admin/hostel/hostels",
        view_func=HostelListAPI.as_view("hostel_list_api"),
        methods=["GET", "POST", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/hostels/<int:hostel_id>",
        view_func=HostelDetailAPI.as_view("hostel_detail_api"),
        methods=["GET", "PUT", "DELETE", "OPTIONS"],
    )

    # ---- Hostel Admin: Blocks ----
    app.add_url_rule(
        "/api/admin/hostel/blocks",
        view_func=HostelBlockListAPI.as_view("hostel_block_list_api"),
        methods=["GET", "POST", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/blocks/<int:block_id>",
        view_func=HostelBlockDetailAPI.as_view("hostel_block_detail_api"),
        methods=["GET", "PUT", "DELETE", "OPTIONS"],
    )

    # ---- Hostel Admin: Floors ----
    app.add_url_rule(
        "/api/admin/hostel/floors",
        view_func=HostelFloorListAPI.as_view("hostel_floor_list_api"),
        methods=["GET", "POST", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/floors/<int:floor_id>",
        view_func=HostelFloorDetailAPI.as_view("hostel_floor_detail_api"),
        methods=["GET", "PUT", "DELETE", "OPTIONS"],
    )

    # ---- Hostel Admin: Rooms ----
    app.add_url_rule(
        "/api/admin/hostel/rooms",
        view_func=HostelRoomListAPI.as_view("hostel_room_list_api"),
        methods=["GET", "POST", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/rooms/<int:room_id>",
        view_func=HostelRoomDetailAPI.as_view("hostel_room_detail_api"),
        methods=["GET", "PUT", "DELETE", "OPTIONS"],
    )

    # ---- Hostel Admin: Beds ----
    app.add_url_rule(
        "/api/admin/hostel/beds",
        view_func=HostelBedListAPI.as_view("hostel_bed_list_api"),
        methods=["GET", "POST", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/beds/<int:bed_id>",
        view_func=HostelBedDetailAPI.as_view("hostel_bed_detail_api"),
        methods=["GET", "PUT", "DELETE", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/beds/<int:bed_id>/allocate",
        view_func=HostelBedAllocateAPI.as_view("hostel_bed_allocate_api"),
        methods=["POST", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/beds/<int:bed_id>/vacate",
        view_func=HostelBedVacateAPI.as_view("hostel_bed_vacate_api"),
        methods=["POST", "OPTIONS"],
    )

    # ---- Hostel Admin: Structure overview + allocation helper ----
    app.add_url_rule(
        "/api/admin/hostel/structure",
        view_func=HostelStructureOverviewAPI.as_view("hostel_structure_overview_api"),
        methods=["GET", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/students/unallocated",
        view_func=HostelUnallocatedStudentsAPI.as_view(
            "hostel_unallocated_students_api"
        ),
        methods=["GET", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/students/search",
        view_func=HostelStudentSearchAPI.as_view("hostel_student_search_api"),
        methods=["GET", "OPTIONS"],
    )

    # ---- Hostel Admin: Allocations (Students / Room Allotment sections) ----
    app.add_url_rule(
        "/api/admin/hostel/allocations",
        view_func=HostelAllocationListAPI.as_view("hostel_allocation_list_api"),
        methods=["GET", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/allocations/<int:allocation_id>/checkout",
        view_func=HostelAllocationCheckoutAPI.as_view("hostel_allocation_checkout_api"),
        methods=["POST", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/allocations/<int:allocation_id>/transfer",
        view_func=HostelAllocationTransferAPI.as_view("hostel_allocation_transfer_api"),
        methods=["POST", "OPTIONS"],
    )

    # ---- Hostel Admin: Staff ----
    app.add_url_rule(
        "/api/admin/hostel/staff",
        view_func=HostelStaffListAPI.as_view("hostel_staff_list_api"),
        methods=["GET", "POST", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/staff/<int:staff_id>",
        view_func=HostelStaffDetailAPI.as_view("hostel_staff_detail_api"),
        methods=["GET", "PUT", "DELETE", "OPTIONS"],
    )

    # ---- Hostel Admin: Visitors ----
    app.add_url_rule(
        "/api/admin/hostel/visitors",
        view_func=HostelVisitorListAPI.as_view("hostel_visitor_list_api"),
        methods=["GET", "POST", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/visitors/<int:visitor_id>",
        view_func=HostelVisitorDetailAPI.as_view("hostel_visitor_detail_api"),
        methods=["GET", "DELETE", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/visitors/<int:visitor_id>/approve",
        view_func=HostelVisitorApproveAPI.as_view("hostel_visitor_approve_api"),
        methods=["POST", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/visitors/<int:visitor_id>/reject",
        view_func=HostelVisitorRejectAPI.as_view("hostel_visitor_reject_api"),
        methods=["POST", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/visitors/<int:visitor_id>/checkout",
        view_func=HostelVisitorCheckoutAPI.as_view("hostel_visitor_checkout_api"),
        methods=["POST", "OPTIONS"],
    )

    # ---- Hostel Admin: Attendance ----
    app.add_url_rule(
        "/api/admin/hostel/attendance",
        view_func=HostelAttendanceListAPI.as_view("hostel_attendance_list_api"),
        methods=["GET", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/attendance/mark",
        view_func=HostelAttendanceMarkAPI.as_view("hostel_attendance_mark_api"),
        methods=["POST", "OPTIONS"],
    )

    # ---- Hostel Admin: Check-In / Check-Out (Movements) ----
    app.add_url_rule(
        "/api/admin/hostel/movements",
        view_func=HostelMovementListAPI.as_view("hostel_movement_list_api"),
        methods=["GET", "POST", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/movements/<int:movement_id>/checkin",
        view_func=HostelMovementCheckInAPI.as_view("hostel_movement_checkin_api"),
        methods=["POST", "OPTIONS"],
    )

    # ---- Hostel Admin: Leave Requests ----
    app.add_url_rule(
        "/api/admin/hostel/leave-requests",
        view_func=HostelLeaveRequestListAPI.as_view("hostel_leave_request_list_api"),
        methods=["GET", "POST", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/leave-requests/<int:leave_id>",
        view_func=HostelLeaveRequestDetailAPI.as_view(
            "hostel_leave_request_detail_api"
        ),
        methods=["DELETE", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/leave-requests/<int:leave_id>/approve",
        view_func=HostelLeaveRequestApproveAPI.as_view(
            "hostel_leave_request_approve_api"
        ),
        methods=["POST", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/leave-requests/<int:leave_id>/reject",
        view_func=HostelLeaveRequestRejectAPI.as_view(
            "hostel_leave_request_reject_api"
        ),
        methods=["POST", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/leave-requests/<int:leave_id>/return",
        view_func=HostelLeaveRequestReturnAPI.as_view(
            "hostel_leave_request_return_api"
        ),
        methods=["POST", "OPTIONS"],
    )

    # ---- Hostel Admin: Mess Menu ----
    app.add_url_rule(
        "/api/admin/hostel/mess-menu",
        view_func=HostelMessMenuListAPI.as_view("hostel_mess_menu_list_api"),
        methods=["GET", "POST", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/mess-menu/<int:entry_id>",
        view_func=HostelMessMenuDetailAPI.as_view("hostel_mess_menu_detail_api"),
        methods=["DELETE", "OPTIONS"],
    )

    # ---- Hostel Admin: Meal Attendance ----
    app.add_url_rule(
        "/api/admin/hostel/meal-attendance",
        view_func=HostelMealAttendanceListAPI.as_view(
            "hostel_meal_attendance_list_api"
        ),
        methods=["GET", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/meal-attendance/mark",
        view_func=HostelMealAttendanceMarkAPI.as_view(
            "hostel_meal_attendance_mark_api"
        ),
        methods=["POST", "OPTIONS"],
    )

    app.add_url_rule(
        "/api/admin/hostel/meal-attendance/bulk-mark",
        view_func=HostelMealAttendanceBulkMarkAPI.as_view(
            "hostel_meal_attendance_bulk_mark_api"
        ),
        methods=["POST", "OPTIONS"],
    )

    # MY CLASSES
    app.add_url_rule(
        "/api/my-classes/<role>/<int:user_id>",
        view_func=MyClasses.as_view("my_classes"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/teacher/my-classes/<int:teacher_id>",
        view_func=TeacherMyClasses.as_view("teacher_my_classes"),
        methods=["GET"],
    )

    # STUDENT ENROLLMENT
    app.add_url_rule(
        "/api/admin/student/enrollment-options",
        view_func=StudentEnrollmentOptionsAPI.as_view("student_enrollment_options"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/student/enrollment-preview",
        view_func=StudentEnrollmentPreviewAPI.as_view("student_enrollment_preview"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/student/enroll",
        view_func=EnrollStudentAPI.as_view("enroll_student"),
        methods=["POST"],
    )

    app.add_url_rule(
        "/api/admin/student/promote",
        view_func=StudentPromotionAPI.as_view("promote_student"),
        methods=["POST"],
    )

    # ADMIN TEACHER MANAGEMENT
    app.add_url_rule(
        "/api/admin/teachers/options",
        view_func=AdminTeacherOptionsAPI.as_view("admin_teacher_options"),
        methods=["GET"],
    )

    app.add_url_rule(
        "/api/admin/teachers",
        view_func=AdminTeachersAPI.as_view("admin_teachers"),
        methods=["GET", "POST"],
    )

    app.add_url_rule(
        "/api/admin/teachers/<int:teacher_id>",
        view_func=AdminTeacherDetailAPI.as_view("admin_teacher_detail"),
        methods=["GET", "PUT", "DELETE"],
    )

    app.add_url_rule(
        "/api/admin/teachers/<int:teacher_id>/assignments",
        view_func=AdminTeacherAssignmentsAPI.as_view("admin_teacher_assignments"),
        methods=["PUT"],
    )

    app.add_url_rule(
        "/api/admin/teachers/<int:teacher_id>/password",
        view_func=AdminTeacherPasswordAPI.as_view("admin_teacher_password"),
        methods=["PUT"],
    )

    app.add_url_rule(
        "/api/admin/teachers/<int:teacher_id>/status",
        view_func=AdminTeacherStatusAPI.as_view("admin_teacher_status"),
        methods=["PUT"],
    )

    # SUBJECT MANAGEMENT
    app.add_url_rule(
        "/api/admin/subjects",
        view_func=AdminSubjectsAPI.as_view("admin_subjects"),
        methods=["GET", "POST"],
    )

    app.add_url_rule(
        "/api/admin/subjects/<int:subject_id>",
        view_func=AdminSubjectDetailAPI.as_view("admin_subject_detail"),
        methods=["GET", "PUT", "DELETE"],
    )

    # FILE SERVING
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    SUBMITTED_FOLDER = os.path.join(BASE_DIR, "Submitted_Assignments")
    TEACHER_ASSIGNMENT_FOLDER = os.path.join(BASE_DIR, "Assignment_Files")

    # STUDENT SUBMITTED FILES
    @app.route("/Submitted_Assignments/<path:filename>")
    def submitted_files(filename):

        try:

            safe_filename = os.path.normpath(filename)
            full_path = os.path.join(SUBMITTED_FOLDER, safe_filename)

            if not os.path.exists(full_path):

                return jsonify({"error": "File not found"}), 404

            directory = os.path.dirname(full_path)
            actual_filename = os.path.basename(full_path)
            response = send_from_directory(
                directory, actual_filename, as_attachment=False
            )

            # 🔥 OPEN IN BROWSER
            response.headers["Content-Disposition"] = (
                f'inline; filename="{actual_filename}"'
            )

            return response

        except Exception as e:
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    # TEACHER ASSIGNMENT FILES
    @app.route("/Assignment_Files/<path:filename>")
    def assignment_files(filename):

        try:

            safe_filename = os.path.normpath(filename)
            full_path = os.path.join(TEACHER_ASSIGNMENT_FOLDER, safe_filename)

            if not os.path.exists(full_path):

                return jsonify({"error": "File not found"}), 404

            directory = os.path.dirname(full_path)
            actual_filename = os.path.basename(full_path)
            response = send_from_directory(
                directory, actual_filename, as_attachment=False
            )

            # 🔥 OPEN INLINE
            response.headers["Content-Disposition"] = (
                f'inline; filename="{actual_filename}"'
            )

            return response

        except Exception as e:
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    # ERROR HANDLERS
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "API not found"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error"}), 500

    # =========================================================
    # RBAC INITIALIZATION
    # =========================================================
    # This updates only RBAC default modules/roles. It is idempotent and
    # does not change login, routing, dashboard, or other application logic.
    with app.app_context():
        try:
            seed_rbac_defaults()
        except Exception:
            app.logger.exception("RBAC defaults initialization failed")

    return app


# RUN
app = create_app()

if __name__ == "__main__":

    with app.app_context():
        if os.getenv("FLASK_ENV") == "development":
            db.create_all()

    app.run(host="0.0.0.0", port=5000, debug=True)
