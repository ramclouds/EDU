from utils.auth import db
from utils.auth_middleware import login_required, get_current_user
from datetime import datetime
from flask import jsonify
from flask.views import MethodView

# =========================================================
# 🔔 COMMON NOTIFICATION MODEL
# =========================================================


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, nullable=False)
    role = db.Column(db.String(50), nullable=False)  # student / teacher / admin

    title = db.Column(db.String(255))
    message = db.Column(db.Text)

    type = db.Column(db.String(50))  # leave / system / etc.

    student_id = db.Column(db.Integer, nullable=True)
    leave_id = db.Column(db.Integer, nullable=True)

    is_read = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# =========================================================
# 📌 CREATE NOTIFICATION (HELPER)
# =========================================================


def create_notification(
    user_id, role, title, message, type=None, student_id=None, leave_id=None
):
    try:
        notification = Notification(
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


# =========================================================
# 📥 GET NOTIFICATIONS
# =========================================================


class NotificationsAPI(MethodView):

    def options(self):
        return {}, 200  # ✅ allow preflight

    @login_required
    def get(self):
        current_user = get_current_user()

        notifications = (
            Notification.query.filter_by(
                user_id=current_user.id, role=current_user.role
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


# =========================================================
# ✅ MARK SINGLE AS READ
# =========================================================


class MarkNotificationReadAPI(MethodView):

    @login_required
    def post(self, notification_id):
        current_user = get_current_user()

        notification = Notification.query.filter_by(
            id=notification_id, user_id=current_user.id
        ).first()

        if not notification:
            return jsonify({"error": "Notification not found"}), 404

        notification.is_read = True
        db.session.commit()

        return jsonify({"message": "Marked as read"})


# =========================================================
#  MARK ALL AS READ
# =========================================================


class MarkAllNotificationsReadAPI(MethodView):

    @login_required
    def post(self):
        current_user = get_current_user()

        Notification.query.filter_by(user_id=current_user.id).update({"is_read": True})

        db.session.commit()

        return jsonify({"message": "All notifications marked as read"})


# =========================================================
#  DELETE NOTIFICATION
# =========================================================


class DeleteNotificationAPI(MethodView):

    @login_required
    def delete(self, notification_id):
        current_user = get_current_user()

        notification = Notification.query.filter_by(
            id=notification_id, user_id=current_user.id
        ).first()

        if not notification:
            return jsonify({"error": "Notification not found"}), 404

        db.session.delete(notification)
        db.session.commit()

        return jsonify({"message": "Notification deleted"})


# =========================================================
# UNREAD COUNT
# =========================================================


class UnreadNotificationCountAPI(MethodView):

    @login_required
    def get(self):
        current_user = get_current_user()

        count = Notification.query.filter_by(
            user_id=current_user.id, is_read=False
        ).count()

        return jsonify({"unread_count": count})


# =========================================================
# ACTIVITY LOG MODEL
# =========================================================


class ActivityLog(db.Model):
    __tablename__ = "activity_logs"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer)
    role = db.Column(db.String(50))

    action = db.Column(db.String(100))
    description = db.Column(db.Text)

    student_id = db.Column(db.Integer, nullable=True)
    leave_id = db.Column(db.Integer, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# =========================================================
#  LOG ACTIVITY (HELPER)
# =========================================================


def log_activity(user_id, role, action, description, student_id=None, leave_id=None):
    try:
        log = ActivityLog(
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


# =========================================================
#  GET ACTIVITY LOGS (FIXED API)
# =========================================================


class ActivityLogsAPI(MethodView):

    @login_required
    def get(self):
        try:
            current_user = get_current_user()

            # 🔒 Only admin can view logs
            if current_user.role != "admin":
                return jsonify({"error": "Unauthorized"}), 403

            logs = ActivityLog.query.order_by(ActivityLog.created_at.desc()).all()

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

        except Exception as e:
            return jsonify({"error": str(e)}), 500
