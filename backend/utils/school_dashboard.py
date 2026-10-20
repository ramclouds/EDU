# School-wide overview for the Super Admin dashboard

import logging
from datetime import date, datetime, timedelta

from flask import jsonify, request
from flask.views import MethodView
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError

from utils.auth import Admin, NonTeachingStaff, Student, Teacher, db
from utils.auth_middleware import login_required
from utils.rolePermissionManagement import is_super_admin_user
from utils.tenancy import current_school_id

logger = logging.getLogger(__name__)


def _count(query):
    return query.count()


class SchoolOverviewAPI(MethodView):
    @login_required
    def get(self):
        user = getattr(request, "user", None)
        if not is_super_admin_user(user):
            return jsonify({"error": "Only the Super Admin can view the school overview"}), 403
        try:
            return jsonify({"success": True, "overview": build_overview(current_school_id())}), 200
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Database error building the school overview")
            return jsonify({"error": "Database error"}), 500
        except Exception:
            logger.exception("Unexpected error building the school overview")
            return jsonify({"error": "Something went wrong"}), 500


def build_overview(school_id):
    from utils.attendance import AttendanceRecord, AttendanceSession, TeacherAttendance
    from utils.accounts import FeeInstallment, FeePayment, Payslip
    from utils.library import Book, BookIssue
    from utils.hostel import Bed, Hostel, HostelAllocation, HostelComplaint, HostelLeaveRequest, HostelMaintenanceRequest
    from utils.leaves import StudentLeave, TeacherLeave
    from utils.announcement import Notice
    from utils.school_overview import Event
    from utils.assignments import Assignment
    from utils.timetable import TimetableLecture
    from utils.assets import Asset
    from utils.studentDetails import AcademicClass, Batch
    from utils.subjects import Subject
    from utils.academic import Exam
    from utils.Notifications import ActivityLog
    from utils.platform import School as PlatformSchool

    today = date.today()
    now = datetime.utcnow()
    month_start = today.replace(day=1)
    week_ago = now - timedelta(days=7)
    in_7 = today + timedelta(days=7)
    in_30 = today + timedelta(days=30)

    def sc(model):
        return model.query.filter(model.school_id == school_id)

    school = PlatformSchool.query.get(school_id) if school_id else None

    # ---------- people ----------
    students_active = _count(sc(Student).filter(Student.status == "Active"))
    students_total = _count(sc(Student))
    teachers_active = _count(sc(Teacher).filter(Teacher.status == "Active"))
    teachers_total = _count(sc(Teacher))
    staff_active = _count(sc(NonTeachingStaff).filter(NonTeachingStaff.is_deleted.is_(False), NonTeachingStaff.status == "Active"))
    admins_active = _count(sc(Admin).filter(Admin.is_deleted.is_(False), Admin.status == "Active"))

    # ---------- attendance today ----------
    stu_rows = (db.session.query(AttendanceRecord.status, func.count(AttendanceRecord.id))
        .join(AttendanceSession, AttendanceSession.id == AttendanceRecord.session_id)
        .filter(AttendanceRecord.school_id == school_id, AttendanceSession.session_date == today)
        .group_by(AttendanceRecord.status).all())
    stu = {s: n for s, n in stu_rows}
    stu_marked = sum(stu.values())
    tea_rows = (db.session.query(TeacherAttendance.status, func.count(TeacherAttendance.id))
        .filter(TeacherAttendance.school_id == school_id, TeacherAttendance.attendance_date == today)
        .group_by(TeacherAttendance.status).all())
    tea = {s: n for s, n in tea_rows}
    tea_marked = sum(tea.values())

    # ---------- fees ----------
    collected_month = db.session.query(func.coalesce(func.sum(FeePayment.amount), 0)).filter(
        FeePayment.school_id == school_id, FeePayment.status == "Success",
        FeePayment.payment_date >= month_start, FeePayment.payment_date <= today).scalar()
    open_inst = sc(FeeInstallment).filter(FeeInstallment.status.in_(["Pending", "Partial", "Overdue"]))
    outstanding = 0.0
    for inst in open_inst.all():
        outstanding += float(inst.amount or 0) + float(inst.late_fee or 0) - float(inst.discount or 0) - float(inst.paid_amount or 0)
    overdue_fees = _count(open_inst.filter(FeeInstallment.due_date < today))

    # ---------- payroll (current month) ----------
    pay = sc(Payslip).filter(Payslip.month == today.month, Payslip.year == today.year)
    pay_paid = pay.filter(Payslip.status == "Paid")
    pay_pending = pay.filter(Payslip.status != "Paid")
    payroll = {
        "payslips_this_month": _count(pay),
        "paid_count": _count(pay_paid),
        "pending_count": _count(pay_pending),
        "paid_amount": float(db.session.query(func.coalesce(func.sum(Payslip.net_salary), 0)).filter(
            Payslip.school_id == school_id, Payslip.month == today.month, Payslip.year == today.year,
            Payslip.status == "Paid").scalar() or 0),
        "pending_amount": float(db.session.query(func.coalesce(func.sum(Payslip.net_salary), 0)).filter(
            Payslip.school_id == school_id, Payslip.month == today.month, Payslip.year == today.year,
            Payslip.status != "Paid").scalar() or 0),
    }

    # ---------- academics ----------
    current_batch = sc(Batch).filter(Batch.is_current.is_(True)).first()
    exams = sc(Exam)
    academics = {
        "current_batch": current_batch.batch_name if current_batch else None,
        "classes": _count(sc(AcademicClass)),
        "subjects": _count(sc(Subject)),
        "exams_total": _count(exams),
        "exams_verified": _count(exams.filter(Exam.is_verified.is_(True))),
        "exams_published": _count(exams.filter(Exam.is_published.is_(True))),
        "exams_awaiting_verification": _count(exams.filter(Exam.is_verified.is_(False))),
    }

    # ---------- library ----------
    books = sc(Book).filter(Book.is_deleted.is_(False))
    issued_open = sc(BookIssue).filter(BookIssue.return_date.is_(None))
    library = {
        "titles": _count(books),
        "copies": int(db.session.query(func.coalesce(func.sum(Book.total_copies), 0)).filter(
            Book.school_id == school_id, Book.is_deleted.is_(False)).scalar() or 0),
        "issued_now": _count(issued_open),
        "overdue": _count(issued_open.filter(BookIssue.due_date < today)),
        "due_in_3_days": _count(issued_open.filter(BookIssue.due_date >= today, BookIssue.due_date <= today + timedelta(days=3))),
    }

    # ---------- hostel ----------
    beds = sc(Bed)
    beds_total = _count(beds)
    beds_occupied = _count(beds.filter(Bed.status == "Occupied"))
    hostel = {
        "hostels": _count(sc(Hostel).filter(Hostel.status == "Active")),
        "beds_total": beds_total,
        "beds_occupied": beds_occupied,
        "occupancy_percent": round(100 * beds_occupied / beds_total, 1) if beds_total else 0,
        "leave_requests_pending": _count(sc(HostelLeaveRequest).filter(HostelLeaveRequest.status == "Pending")),
        "complaints_open": _count(sc(HostelComplaint).filter(HostelComplaint.status.in_(["Pending", "In Progress"]))),
        "maintenance_open": _count(sc(HostelMaintenanceRequest).filter(HostelMaintenanceRequest.status.in_(["Open", "In Progress"]))),
    }

    # ---------- leave ----------
    leave = {
        "teacher_pending": _count(sc(TeacherLeave).filter(TeacherLeave.status == "Pending")),
        "student_pending": _count(sc(StudentLeave).filter(StudentLeave.status == "Pending")),
    }

    # ---------- notices, events, assignments, timetable, assets ----------
    notices = sc(Notice).filter(Notice.is_active.is_(True))
    events_upcoming = sc(Event).filter(Event.event_date >= today, Event.event_date <= in_30).order_by(Event.event_date.asc())
    next_events = [{"title": e.title, "date": e.event_date.isoformat(), "category": e.category}
                   for e in events_upcoming.limit(3).all()]
    assignments_due = sc(Assignment).filter(Assignment.due_date >= today, Assignment.due_date <= in_7)
    assets_q = sc(Asset).filter(Asset.is_deleted.is_(False))
    asset_status = {s or "Unknown": n for s, n in db.session.query(Asset.status, func.count(Asset.id)).filter(
        Asset.school_id == school_id, Asset.is_deleted.is_(False)).group_by(Asset.status).all()}
    communication = {
        "active_notices": _count(notices),
        "notices_last_7_days": _count(notices.filter(Notice.created_at >= week_ago)),
        "events_next_30_days": _count(events_upcoming),
        "next_events": next_events,
        "assignments_due_7_days": _count(assignments_due),
        "timetable_lectures": _count(sc(TimetableLecture)),
    }
    assets = {"total": _count(assets_q), "by_status": asset_status}

    # ---------- school limits and subscription ----------
    school_block = None
    alerts = []
    if school:
        trial_days = max(0, (school.trial_ends_at - now).days) if school.trial_ends_at and school.status == "Trial" else None
        school_block = {
            "name": school.name, "school_code": school.school_code, "plan": school.plan,
            "status": school.status, "trial_days_left": trial_days,
            "subscription_ends_at": school.subscription_ends_at.date().isoformat() if school.subscription_ends_at else None,
            "max_students": school.max_students, "max_staff": school.max_staff,
        }
        if trial_days is not None and trial_days <= 7:
            alerts.append({"level": "warning", "text": f"Trial ends in {trial_days} day(s). Contact the platform owner to subscribe."})
        if school.subscription_ends_at and school.status == "Active" and (school.subscription_ends_at - now).days <= 14:
            alerts.append({"level": "warning", "text": "Your subscription ends within 14 days."})
        if school.max_students and students_active >= 0.9 * school.max_students:
            alerts.append({"level": "warning", "text": f"Student limit almost reached ({students_active} of {school.max_students})."})
        if school.max_staff and (teachers_active + staff_active) >= 0.9 * school.max_staff:
            alerts.append({"level": "warning", "text": "Staff limit almost reached."})

    if leave["teacher_pending"] + leave["student_pending"]:
        alerts.append({"level": "info", "text": f"{leave['teacher_pending'] + leave['student_pending']} leave request(s) waiting for approval."})
    if library["overdue"]:
        alerts.append({"level": "warning", "text": f"{library['overdue']} library book(s) are overdue."})
    if overdue_fees:
        alerts.append({"level": "warning", "text": f"{overdue_fees} fee instalment(s) are overdue."})
    if payroll["pending_count"] and payroll["payslips_this_month"]:
        alerts.append({"level": "info", "text": f"{payroll['pending_count']} payslip(s) this month are not yet paid."})
    if academics["exams_awaiting_verification"]:
        alerts.append({"level": "info", "text": f"{academics['exams_awaiting_verification']} exam(s) waiting for verification."})
    if hostel["maintenance_open"]:
        alerts.append({"level": "info", "text": f"{hostel['maintenance_open']} hostel maintenance request(s) open."})

    activity = [
        {"role": r.role, "action": r.action, "description": r.description,
         "time": r.created_at.isoformat() if r.created_at else None}
        for r in ActivityLog.query.filter(ActivityLog.school_id == school_id)
        .order_by(ActivityLog.created_at.desc()).limit(10).all()
    ]

    return {
        "generated_at": now.isoformat(),
        "school": school_block,
        "people": {
            "students_active": students_active, "students_total": students_total,
            "teachers_active": teachers_active, "teachers_total": teachers_total,
            "staff_active": staff_active, "admins_active": admins_active,
        },
        "attendance_today": {
            "date": today.isoformat(),
            "students": {"marked": stu_marked, "present": stu.get("Present", 0),
                         "absent": stu.get("Absent", 0), "late": stu.get("Late", 0),
                         "percent_present": round(100 * stu.get("Present", 0) / stu_marked, 1) if stu_marked else None},
            "teachers": {"marked": tea_marked, "present": tea.get("Present", 0),
                         "absent": tea.get("Absent", 0), "late": tea.get("Late", 0)},
        },
        "fees": {"collected_this_month": float(collected_month or 0),
                 "outstanding": round(outstanding, 2), "overdue_instalments": overdue_fees},
        "payroll": payroll,
        "academics": academics,
        "library": library,
        "hostel": hostel,
        "leave": leave,
        "communication": communication,
        "assets": assets,
        "alerts": alerts,
        "recent_activity": activity,
    }
