from utils.auth import db
from utils.auth_middleware import login_required, get_current_user
from utils.rolePermissionManagement import super_admin_required
from utils.tenancy import current_school_id as _current_school_id
from datetime import datetime
from flask import jsonify, request
from sqlalchemy import or_
from flask.views import MethodView
import logging

logger = logging.getLogger(__name__)


# COMMON NOTIFICATION MODEL
class Notification(db.Model):
    __tablename__ = "notifications"

    # Scoped per school. Nullable so rows written before multi-tenancy
    # (and legacy single-school installs) keep working as school_id None.
    school_id = db.Column(
        db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True
    )

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    # RECIPIENT
    user_id = db.Column(
        db.Integer,
        nullable=True,
        index=True,
    )

    role = db.Column(
        db.String(50),
        nullable=False,
        index=True,
    )

    recipient_name = db.Column(
        db.String(255),
        nullable=True,
    )

    recipient_code = db.Column(
        db.String(100),
        nullable=True,
    )

    recipient_email = db.Column(
        db.String(255),
        nullable=True,
    )

    recipient_mobile = db.Column(
        db.String(30),
        nullable=True,
    )

    # CONTENT
    title = db.Column(
        db.String(255),
        nullable=False,
    )

    message = db.Column(
        db.Text,
        nullable=False,
    )

    type = db.Column(
        db.String(50),
        nullable=True,
        index=True,
    )

    # DELIVERY
    channel = db.Column(
        db.String(30),
        nullable=False,
        default="App",
        index=True,
    )

    # App / Email / SMS / WhatsApp
    delivery_status = db.Column(
        db.String(30),
        nullable=False,
        default="Pending",
        index=True,
    )

    # Pending / Sent / Failed / Cancelled
    failure_reason = db.Column(
        db.String(500),
        nullable=True,
    )

    retry_count = db.Column(
        db.Integer,
        nullable=False,
        default=0,
    )

    scheduled_at = db.Column(
        db.DateTime,
        nullable=True,
    )

    sent_at = db.Column(
        db.DateTime,
        nullable=True,
    )

    # LIBRARY RELATIONS / CONTEXT
    book_issue_id = db.Column(
        db.Integer,
        nullable=True,
        index=True,
    )

    book_id = db.Column(
        db.Integer,
        nullable=True,
        index=True,
    )

    student_id = db.Column(
        db.Integer,
        nullable=True,
    )

    teacher_id = db.Column(
        db.Integer,
        nullable=True,
    )

    staff_id = db.Column(
        db.Integer,
        nullable=True,
    )

    leave_id = db.Column(
        db.Integer,
        nullable=True,
    )

    # METADATA
    created_by = db.Column(
        db.String(100),
        nullable=True,
    )

    is_read = db.Column(
        db.Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        index=True,
    )

    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "role": self.role,
            "recipient_name": (self.recipient_name or ""),
            "recipient_code": (self.recipient_code or ""),
            "recipient_email": (self.recipient_email or ""),
            "recipient_mobile": (self.recipient_mobile or ""),
            "title": self.title,
            "message": self.message,
            "type": self.type,
            "channel": self.channel,
            "delivery_status": (self.delivery_status),
            "failure_reason": (self.failure_reason or ""),
            "retry_count": (self.retry_count or 0),
            "scheduled_at": (
                self.scheduled_at.isoformat() if self.scheduled_at else None
            ),
            "sent_at": (self.sent_at.isoformat() if self.sent_at else None),
            "book_issue_id": (self.book_issue_id),
            "book_id": self.book_id,
            "student_id": self.student_id,
            "teacher_id": self.teacher_id,
            "staff_id": self.staff_id,
            "leave_id": self.leave_id,
            "created_by": (self.created_by or ""),
            "is_read": bool(self.is_read),
            "created_at": (self.created_at.isoformat() if self.created_at else None),
            "updated_at": (self.updated_at.isoformat() if self.updated_at else None),
        }


def recipient_school_id(user_id, role, fallback=None):
    """School a notification recipient belongs to, read from their own row.

    A notification can be addressed to someone other than the caller, so
    the caller's school is the wrong answer in general. Look the recipient
    up by (role, id); if no row matches, fall back to the given school
    (normally the sender's) so a sender can still reach a legacy row with
    no school. Returns None when neither can be determined, which keeps
    legacy single-school installs working.
    """
    if user_id is None:
        return fallback

    try:
        from utils.auth import Admin, Teacher, Student, NonTeachingStaff

        model = {
            "admin": Admin,
            "teacher": Teacher,
            "student": Student,
            "staff": NonTeachingStaff,
        }.get(str(role or "").lower())

        if model is None:
            return fallback

        row = model.query.filter_by(id=user_id).first()
        if row is not None:
            return getattr(row, "school_id", None)
    except Exception:
        logger.exception("recipient_school_id lookup failed")

    return fallback


# 📌 CREATE NOTIFICATION (HELPER)


def create_notification(
    user_id, role, title, message, type=None, student_id=None, leave_id=None
):
    try:
        notification = Notification(
            school_id=recipient_school_id(user_id, role, _current_school_id()),
            user_id=user_id,
            role=role,
            title=title,
            message=message,
            type=type,
            student_id=student_id,
            leave_id=leave_id,
        )

        db.session.add(notification)
        db.session.commit()

    except Exception as e:
        db.session.rollback()
        print("Notification Error:", str(e))


# LIBRARY NOTIFICATION HELPERS


LIBRARY_NOTIFICATION_TYPES = {
    "overdue",
    "fine",
    "return_reminder",
    "general",
    "announcement",
    "system",
}

LIBRARY_NOTIFICATION_CHANNELS = {
    "App",
    "Email",
    "SMS",
    "WhatsApp",
}

LIBRARY_NOTIFICATION_STATUSES = {
    "Pending",
    "Sent",
    "Failed",
    "Cancelled",
}


def clean_notification_text(value):
    if value is None:
        return ""

    return str(value).strip()


def parse_notification_datetime(value):
    value = clean_notification_text(value)

    if not value:
        return None

    try:
        return datetime.fromisoformat(
            value.replace(
                "Z",
                "+00:00",
            )
        )

    except ValueError:
        return None


def get_notification_current_admin():
    current_user = get_current_user()

    if not current_user:
        return None

    if (
        str(
            getattr(
                current_user,
                "role",
                "",
            )
        ).lower()
        != "admin"
    ):
        return None

    return current_user


def notification_admin_allowed():
    current_user = get_notification_current_admin()

    if not current_user:
        return (
            None,
            (
                jsonify(
                    {
                        "success": False,
                        "error": ("Admin access required"),
                    }
                ),
                403,
            ),
        )

    return current_user, None


# 📥 GET NOTIFICATIONS


class NotificationsAPI(MethodView):

    def options(self):
        return {}, 200  # ✅ allow preflight

    @login_required
    def get(self):
        current_user = get_current_user()

        notifications = (
            Notification.query.filter_by(
                user_id=current_user.id,
                role=current_user.role,
                school_id=_current_school_id(),
            )
            .order_by(Notification.created_at.desc())
            .all()
        )

        return jsonify(
            [
                {
                    "id": n.id,
                    "title": n.title,
                    "message": n.message,
                    "type": n.type,
                    "is_read": n.is_read,
                    "student_id": n.student_id,
                    "leave_id": n.leave_id,
                    "time": n.created_at.strftime("%Y-%m-%d %H:%M"),
                }
                for n in notifications
            ]
        )


# ✅ MARK SINGLE AS READ


class MarkNotificationReadAPI(MethodView):

    @login_required
    def post(self, notification_id):
        current_user = get_current_user()

        # 🐛 BUGFIX: only filtered by user_id, not role. user_id is not
        # guaranteed unique *across* roles (a student and a teacher could
        # both have id=7), so a user could accidentally mark — or with the
        # delete endpoint below, delete — another role's notification.
        notification = Notification.query.filter_by(
            id=notification_id,
            user_id=current_user.id,
            role=current_user.role,
            school_id=_current_school_id(),
        ).first()

        if not notification:
            return jsonify({"error": "Notification not found"}), 404

        notification.is_read = True
        db.session.commit()

        return jsonify({"message": "Marked as read", "id": notification.id})


#  MARK ALL AS READ


class MarkAllNotificationsReadAPI(MethodView):

    @login_required
    def post(self):
        current_user = get_current_user()

        # 🐛 BUGFIX: missing role filter (see note above) and no
        # synchronize_session setting — SQLAlchemy's default
        # ("evaluate") can raise on some bulk UPDATE filters. Also
        # scope the update to unread rows only, since that's all this
        # endpoint needs to touch.
        Notification.query.filter_by(
            user_id=current_user.id,
            role=current_user.role,
            is_read=False,
            school_id=_current_school_id(),
        ).update({"is_read": True}, synchronize_session=False)

        db.session.commit()

        return jsonify({"message": "All notifications marked as read"})


#  DELETE NOTIFICATION


class DeleteNotificationAPI(MethodView):

    @login_required
    def delete(self, notification_id):
        current_user = get_current_user()

        notification = Notification.query.filter_by(
            id=notification_id,
            user_id=current_user.id,
            role=current_user.role,
            school_id=_current_school_id(),
        ).first()

        if not notification:
            return jsonify({"error": "Notification not found"}), 404

        db.session.delete(notification)
        db.session.commit()

        return jsonify({"message": "Notification deleted", "id": notification_id})


# UNREAD COUNT


class UnreadNotificationCountAPI(MethodView):

    @login_required
    def get(self):
        current_user = get_current_user()

        # 🐛 BUGFIX: missing role filter, same issue as above.
        count = Notification.query.filter_by(
            user_id=current_user.id,
            role=current_user.role,
            is_read=False,
            school_id=_current_school_id(),
        ).count()

        return jsonify({"unread_count": count})


# LIBRARY NOTIFICATION MANAGEMENT API
class LibraryNotificationsAPI(MethodView):

    @login_required
    def get(self):
        current_admin, access_error = notification_admin_allowed()

        if access_error:
            return access_error

        try:
            page = max(
                int(
                    request.args.get(
                        "page",
                        1,
                    )
                ),
                1,
            )

            per_page = min(
                max(
                    int(
                        request.args.get(
                            "per_page",
                            10,
                        )
                    ),
                    1,
                ),
                100,
            )

            search = clean_notification_text(request.args.get("search")).lower()

            type_filter = clean_notification_text(request.args.get("type"))

            status_filter = clean_notification_text(request.args.get("status"))

            channel_filter = clean_notification_text(request.args.get("channel"))

            role_filter = clean_notification_text(request.args.get("role"))

            query = Notification.query.filter(
                Notification.school_id == _current_school_id()
            )

            # Only library-related notification types.
            query = query.filter(
                Notification.type.in_(
                    [
                        "overdue",
                        "fine",
                        "return_reminder",
                        "general",
                        "announcement",
                        "system",
                    ]
                )
            )

            if type_filter:
                query = query.filter(Notification.type == type_filter)

            if status_filter:
                query = query.filter(Notification.delivery_status == status_filter)

            if channel_filter:
                query = query.filter(Notification.channel == channel_filter)

            if role_filter:
                query = query.filter(Notification.role == role_filter)

            if search:
                pattern = f"%{search}%"

                query = query.filter(
                    or_(
                        Notification.title.ilike(pattern),
                        Notification.message.ilike(pattern),
                        Notification.recipient_name.ilike(pattern),
                        Notification.recipient_code.ilike(pattern),
                        Notification.recipient_email.ilike(pattern),
                        Notification.recipient_mobile.ilike(pattern),
                    )
                )

            query = query.order_by(
                Notification.created_at.desc(),
                Notification.id.desc(),
            )

            pagination = query.paginate(
                page=page,
                per_page=per_page,
                error_out=False,
            )

            rows = [notification.to_dict() for notification in pagination.items]

            total = query.count()

            sent_count = query.filter(Notification.delivery_status == "Sent").count()

            pending_count = query.filter(
                Notification.delivery_status == "Pending"
            ).count()

            failed_count = query.filter(
                Notification.delivery_status == "Failed"
            ).count()

            return (
                jsonify(
                    {
                        "success": True,
                        "notifications": rows,
                        "stats": {
                            "total": total,
                            "sent": sent_count,
                            "pending": pending_count,
                            "failed": failed_count,
                        },
                        "pagination": {
                            "page": (pagination.page),
                            "per_page": (pagination.per_page),
                            "total": (pagination.total),
                            "pages": max(
                                pagination.pages,
                                1,
                            ),
                            "has_prev": (pagination.has_prev),
                            "has_next": (pagination.has_next),
                        },
                    }
                ),
                200,
            )

        except Exception as error:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": str(error),
                    }
                ),
                500,
            )

    @login_required
    def post(self):
        current_admin, access_error = notification_admin_allowed()

        if access_error:
            return access_error

        payload = request.get_json(silent=True) or {}

        errors = {}

        title = clean_notification_text(payload.get("title"))

        message = clean_notification_text(payload.get("message"))

        notification_type = clean_notification_text(payload.get("type")).lower()

        channel = clean_notification_text(payload.get("channel") or "App")

        role = clean_notification_text(payload.get("role")).lower()

        recipient_name = clean_notification_text(payload.get("recipient_name"))

        recipient_code = clean_notification_text(payload.get("recipient_code"))

        recipient_email = clean_notification_text(payload.get("recipient_email"))

        recipient_mobile = clean_notification_text(payload.get("recipient_mobile"))

        user_id = payload.get("user_id")

        scheduled_at = parse_notification_datetime(payload.get("scheduled_at"))

        if not title:
            errors["title"] = "Title is required"

        if not message:
            errors["message"] = "Message is required"

        if notification_type not in LIBRARY_NOTIFICATION_TYPES:
            errors["type"] = "Select a valid notification type"

        if channel not in LIBRARY_NOTIFICATION_CHANNELS:
            errors["channel"] = "Select a valid channel"

        if not role:
            errors["role"] = "Recipient role is required"

        if errors:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Validation failed"),
                        "errors": errors,
                    }
                ),
                422,
            )

        try:
            normalized_user_id = (
                int(user_id)
                if user_id
                not in {
                    None,
                    "",
                }
                else None
            )
        except (
            TypeError,
            ValueError,
        ):
            normalized_user_id = None

        # App notifications can be marked Sent
        # immediately because they are stored
        # in the notification system itself.
        if channel == "App" and scheduled_at is None:
            delivery_status = "Sent"
            sent_at = datetime.utcnow()

        else:
            # External channels need an actual
            # Email/SMS/WhatsApp provider worker.
            delivery_status = "Pending"
            sent_at = None

        notification = Notification(
            school_id=recipient_school_id(
                normalized_user_id, role, _current_school_id()
            ),
            user_id=normalized_user_id,
            role=role,
            recipient_name=(recipient_name or None),
            recipient_code=(recipient_code or None),
            recipient_email=(recipient_email or None),
            recipient_mobile=(recipient_mobile or None),
            title=title,
            message=message,
            type=notification_type,
            channel=channel,
            delivery_status=(delivery_status),
            scheduled_at=(scheduled_at),
            sent_at=sent_at,
            book_issue_id=(payload.get("book_issue_id")),
            book_id=payload.get("book_id"),
            student_id=payload.get("student_id"),
            teacher_id=payload.get("teacher_id"),
            staff_id=payload.get("staff_id"),
            created_by=str(
                getattr(
                    current_admin,
                    "id",
                    "",
                )
            ),
        )

        try:
            db.session.add(notification)
            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": ("Notification created successfully"),
                        "notification": (notification.to_dict()),
                    }
                ),
                201,
            )

        except Exception as error:
            db.session.rollback()

            return (
                jsonify(
                    {
                        "success": False,
                        "error": str(error),
                    }
                ),
                500,
            )


class LibraryNotificationRetryAPI(MethodView):

    @login_required
    def post(
        self,
        notification_id,
    ):
        _, access_error = notification_admin_allowed()

        if access_error:
            return access_error

        notification = Notification.query.filter_by(
            school_id=_current_school_id(),
            id=notification_id,
        ).first()

        if not notification:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Notification not found"),
                    }
                ),
                404,
            )

        if notification.delivery_status == "Sent":
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Notification is already sent"),
                    }
                ),
                409,
            )

        notification.retry_count = int(notification.retry_count or 0) + 1

        notification.failure_reason = None

        if notification.channel == "App":
            notification.delivery_status = "Sent"

            notification.sent_at = datetime.utcnow()

        else:
            # External channel still needs provider.
            notification.delivery_status = "Pending"

        db.session.commit()

        return (
            jsonify(
                {
                    "success": True,
                    "message": ("Notification queued for retry"),
                    "notification": (notification.to_dict()),
                }
            ),
            200,
        )


# ACTIVITY LOG MODEL
class ActivityLog(db.Model):
    __tablename__ = "activity_logs"

    id = db.Column(db.Integer, primary_key=True)

    school_id = db.Column(
        db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True
    )

    user_id = db.Column(db.Integer)
    role = db.Column(db.String(50))

    action = db.Column(db.String(100))
    description = db.Column(db.Text)

    student_id = db.Column(db.Integer, nullable=True)
    leave_id = db.Column(db.Integer, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


#  LOG ACTIVITY (HELPER)
def log_activity(user_id, role, action, description, student_id=None, leave_id=None):
    try:
        log = ActivityLog(
            school_id=_current_school_id(),
            user_id=user_id,
            role=role,
            action=action,
            description=description,
            student_id=student_id,
            leave_id=leave_id,
        )

        db.session.add(log)
        db.session.commit()

    except Exception as e:
        db.session.rollback()
        print("Activity Log Error:", str(e))


class LibraryNotificationDetailsAPI(MethodView):

    @login_required
    def get(
        self,
        notification_id,
    ):
        _, access_error = notification_admin_allowed()

        if access_error:
            return access_error

        notification = Notification.query.filter_by(
            school_id=_current_school_id(),
            id=notification_id,
        ).first()

        if not notification:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Notification not found"),
                    }
                ),
                404,
            )

        return (
            jsonify(
                {
                    "success": True,
                    "notification": (notification.to_dict()),
                }
            ),
            200,
        )


#  GET ACTIVITY LOGS (FIXED API)
class ActivityLogsAPI(MethodView):

    decorators = [super_admin_required]

    def get(self):
        try:
            logs = (
                ActivityLog.query.filter(
                    ActivityLog.school_id == _current_school_id()
                )
                .order_by(ActivityLog.created_at.desc())
                .all()
            )

            return jsonify(
                [
                    {
                        "id": l.id,
                        "user_id": l.user_id,
                        "role": l.role,
                        "action": l.action,
                        "description": l.description,
                        "student_id": l.student_id,
                        "leave_id": l.leave_id,
                        "time": l.created_at.strftime("%Y-%m-%d %H:%M"),
                    }
                    for l in logs
                ]
            )

        except Exception:
            logger.exception("Failed to fetch activity logs")
            return jsonify({"error": "Internal server error"}), 500
