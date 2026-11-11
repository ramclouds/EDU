"""Email settings (platform and per school), test emails, and platform broadcasts to schools.

Platform database only. Settings are looked up per school first, then the platform default.
A broadcast is queued when it is created and sent in the background, one school at a time,
so the developer's request returns at once. The delivery log shows what happened per school.
"""
import logging
import threading
from datetime import datetime

from flask import current_app, jsonify, request
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError

from utils.auth import db
from utils.smtp_sender import MailError, clean_settings, send_batch
from utils.platform import School, audit, developer_required
from utils.secret_box import SecretKeyMissing, decrypt, encrypt
from utils.tenant_routing import platform_scope

logger = logging.getLogger(__name__)

PLATFORM_SCOPE = "platform"
MAX_BROADCAST_SCHOOLS = 1000
MAX_BODY = 10000
MAX_SUBJECT = 150


def school_scope(school_id):
    return f"school:{int(school_id)}"


class SmtpSettings(db.Model):
    """One row per scope: 'platform' or 'school:<id>'. Platform database only."""

    __tablename__ = "smtp_settings"

    id = db.Column(db.Integer, primary_key=True)
    scope = db.Column(db.String(40), unique=True, nullable=False)
    host = db.Column(db.String(253), nullable=False)
    port = db.Column(db.Integer, nullable=False, default=587)
    security = db.Column(db.String(10), nullable=False, default="starttls")
    username = db.Column(db.String(200))
    password_enc = db.Column(db.Text)  # encrypted with SMTP_ENCRYPTION_KEY, never plain text
    from_name = db.Column(db.String(100))
    from_email = db.Column(db.String(254), nullable=False)
    reply_to = db.Column(db.String(254))
    enabled = db.Column(db.Boolean, nullable=False, default=True)
    verified_at = db.Column(db.DateTime)
    last_error = db.Column(db.String(300))
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)


class MailBroadcast(db.Model):
    __tablename__ = "mail_broadcasts"

    id = db.Column(db.Integer, primary_key=True)
    subject = db.Column(db.String(150), nullable=False)
    body = db.Column(db.Text, nullable=False)
    audience = db.Column(db.String(20), nullable=False)  # "all" or "selected"
    status = db.Column(db.String(20), nullable=False, default="queued")  # queued, sending, done
    total = db.Column(db.Integer, nullable=False, default=0)
    sent = db.Column(db.Integer, nullable=False, default=0)
    failed = db.Column(db.Integer, nullable=False, default=0)
    skipped = db.Column(db.Integer, nullable=False, default=0)
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    finished_at = db.Column(db.DateTime)


class MailDelivery(db.Model):
    __tablename__ = "mail_deliveries"

    id = db.Column(db.Integer, primary_key=True)
    broadcast_id = db.Column(
        db.Integer, db.ForeignKey("mail_broadcasts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    school_id = db.Column(db.Integer)
    school_name = db.Column(db.String(200))
    recipient = db.Column(db.String(254))
    status = db.Column(db.String(20), nullable=False, default="queued")  # queued, sent, failed, skipped
    error = db.Column(db.String(300))
    sent_at = db.Column(db.DateTime)


# ----------------------------------------------------------------- settings helpers
def _public(row):
    if row is None:
        return {"configured": False, "password_set": False}
    return {
        "configured": True,
        "host": row.host,
        "port": row.port,
        "security": row.security,
        "username": row.username or "",
        "password_set": bool(row.password_enc),
        "from_name": row.from_name or "",
        "from_email": row.from_email,
        "reply_to": row.reply_to or "",
        "enabled": bool(row.enabled),
        "verified_at": row.verified_at.isoformat() if row.verified_at else None,
        "last_error": row.last_error,
    }


def _save(scope, data, existing):
    """Validate, encrypt and store. Returns the saved row. Raises MailError / SecretKeyMissing."""
    cfg = clean_settings(data)
    password = data.get("password")
    row = existing or SmtpSettings(scope=scope)
    row.host, row.port, row.security = cfg["host"], cfg["port"], cfg["security"]
    row.username = cfg["username"] or None
    row.from_name = cfg["from_name"] or None
    row.from_email = cfg["from_email"]
    row.reply_to = cfg["reply_to"] or None
    row.enabled = cfg["enabled"]
    if password not in (None, ""):
        row.password_enc = encrypt(str(password))
    if not cfg["username"]:
        row.password_enc = None  # no login, so no password is kept
    row.updated_at = datetime.utcnow()
    if existing is None:
        db.session.add(row)
    return row


def effective_mail_config(school_id):
    """The settings a school's mail uses: its own if set and enabled, else the platform's."""
    candidates = []
    if school_id is not None:
        candidates.append(school_scope(school_id))
    candidates.append(PLATFORM_SCOPE)
    for scope in candidates:
        row = SmtpSettings.query.filter_by(scope=scope).first()
        if row is not None and row.enabled:
            return row, scope
    return None, None


def _send_one(row, to, subject, body):
    """Send one message with the given stored settings. Returns (ok, error)."""
    cfg = {
        "host": row.host, "port": row.port, "security": row.security, "username": row.username or "",
        "from_name": row.from_name or "", "from_email": row.from_email, "reply_to": row.reply_to or "",
    }
    password = decrypt(row.password_enc) if row.password_enc else ""
    results = send_batch(cfg, password, [{"to": to, "subject": subject, "body": body}])
    return results[0]["ok"], results[0]["error"]


def send_school_notification(school_id, to, subject, body):
    """For future notifications sent on behalf of a school. Returns (ok, error)."""
    with platform_scope():
        row, _scope = effective_mail_config(school_id)
        if row is None:
            return False, "No email server is set up for this school or the platform."
        try:
            return _send_one(row, to, subject, body)
        except (MailError, SecretKeyMissing) as exc:
            return False, str(exc)


def _test(row, to, scope_label):
    subject = f"Test email from {scope_label}"
    body = (
        "This is a test message.\n\n"
        "If you received it, the email settings for this address work.\n"
        f"Sent at {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC."
    )
    try:
        ok, error = _send_one(row, to, subject, body)
    except (MailError, SecretKeyMissing) as exc:
        ok, error = False, str(exc)
    row.last_error = None if ok else (error or "Unknown error")[:300]
    if ok:
        row.verified_at = datetime.utcnow()
    db.session.commit()
    return ok, error


def _validate_recipient(value):
    from utils.smtp_sender import EMAIL_RE
    value = (value or "").strip()
    return value if EMAIL_RE.match(value) else None


# ----------------------------------------------------------------- platform settings
class PlatformMailAPI(MethodView):
    decorators = [developer_required]

    def get(self):
        with platform_scope():
            row = SmtpSettings.query.filter_by(scope=PLATFORM_SCOPE).first()
            return jsonify({"smtp": _public(row)}), 200

    def put(self):
        data = request.get_json(silent=True) or {}
        try:
            with platform_scope():
                row = SmtpSettings.query.filter_by(scope=PLATFORM_SCOPE).first()
                _save(PLATFORM_SCOPE, data, row)
                db.session.commit()
                saved = _public(SmtpSettings.query.filter_by(scope=PLATFORM_SCOPE).first())
        except MailError as exc:
            db.session.rollback()
            return jsonify({"error": str(exc)}), 400
        except SecretKeyMissing as exc:
            db.session.rollback()
            return jsonify({"error": str(exc)}), 400
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Platform mail settings save failed")
            return jsonify({"error": "Internal server error"}), 500
        audit("mail.platform_update", detail=saved["host"])
        return jsonify({"message": "Platform email settings saved", "smtp": saved}), 200


class PlatformMailTestAPI(MethodView):
    decorators = [developer_required]

    def post(self):
        to = _validate_recipient((request.get_json(silent=True) or {}).get("to"))
        if not to:
            return jsonify({"error": "Enter a valid email address to send the test to."}), 400
        with platform_scope():
            row = SmtpSettings.query.filter_by(scope=PLATFORM_SCOPE).first()
            if row is None:
                return jsonify({"error": "Save the platform email settings first."}), 400
            ok, error = _test(row, to, "the platform")
        audit("mail.platform_test", detail=f"to={to} ok={ok}")
        if not ok:
            return jsonify({"sent": False, "error": error}), 200
        return jsonify({"sent": True, "message": f"Test email sent to {to}."}), 200


# ----------------------------------------------------------------- per school settings
class SchoolMailAPI(MethodView):
    decorators = [developer_required]

    def get(self, school_id):
        school = School.query.get(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404
        with platform_scope():
            own = SmtpSettings.query.filter_by(scope=school_scope(school_id)).first()
            platform = SmtpSettings.query.filter_by(scope=PLATFORM_SCOPE).first()
            return jsonify({
                "smtp": _public(own),
                "platform": {"configured": platform is not None, "host": platform.host if platform else None,
                             "enabled": bool(platform.enabled) if platform else False},
                "in_use": "school" if (own and own.enabled) else ("platform" if (platform and platform.enabled) else None),
            }), 200

    def put(self, school_id):
        school = School.query.get(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404
        data = request.get_json(silent=True) or {}
        try:
            with platform_scope():
                scope = school_scope(school_id)
                row = SmtpSettings.query.filter_by(scope=scope).first()
                _save(scope, data, row)
                db.session.commit()
                saved = _public(SmtpSettings.query.filter_by(scope=scope).first())
        except (MailError, SecretKeyMissing) as exc:
            db.session.rollback()
            return jsonify({"error": str(exc)}), 400
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("School mail settings save failed")
            return jsonify({"error": "Internal server error"}), 500
        audit("mail.school_update", school=school, detail=saved["host"])
        return jsonify({"message": f"Email settings saved for {school.name}", "smtp": saved}), 200

    def delete(self, school_id):
        school = School.query.get(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404
        try:
            with platform_scope():
                row = SmtpSettings.query.filter_by(scope=school_scope(school_id)).first()
                if row is not None:
                    db.session.delete(row)
                    db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            return jsonify({"error": "Internal server error"}), 500
        audit("mail.school_remove", school=school)
        return jsonify({"message": "This school now uses the platform email settings"}), 200


class SchoolMailTestAPI(MethodView):
    decorators = [developer_required]

    def post(self, school_id):
        school = School.query.get(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404
        to = _validate_recipient((request.get_json(silent=True) or {}).get("to"))
        if not to:
            return jsonify({"error": "Enter a valid email address to send the test to."}), 400
        with platform_scope():
            row = SmtpSettings.query.filter_by(scope=school_scope(school_id)).first()
            if row is None:
                row, _ = effective_mail_config(school_id)
            if row is None:
                return jsonify({"error": "No email settings for this school or the platform yet."}), 400
            ok, error = _test(row, to, school.name)
        audit("mail.school_test", school=school, detail=f"to={to} ok={ok}")
        if not ok:
            return jsonify({"sent": False, "error": error}), 200
        return jsonify({"sent": True, "message": f"Test email sent to {to}."}), 200


# ----------------------------------------------------------------- broadcasts to schools
def _run_broadcast(app, broadcast_id):
    """Background job: sends each school's copy, grouped by the mail settings it uses."""
    with app.app_context():
        with platform_scope():
            try:
                broadcast = MailBroadcast.query.get(broadcast_id)
                if broadcast is None:
                    return
                broadcast.status = "sending"
                db.session.commit()

                queued = MailDelivery.query.filter_by(broadcast_id=broadcast_id, status="queued").all()
                by_scope = {}
                for d in queued:
                    row, scope = effective_mail_config(d.school_id)
                    if row is None:
                        d.status, d.error = "failed", "No email server is set up for this school or the platform."
                        continue
                    by_scope.setdefault(scope, (row, []))[1].append(d)
                db.session.commit()

                for scope, (row, deliveries) in by_scope.items():
                    password = ""
                    try:
                        password = decrypt(row.password_enc) if row.password_enc else ""
                        cfg = {
                            "host": row.host, "port": row.port, "security": row.security,
                            "username": row.username or "", "from_name": row.from_name or "",
                            "from_email": row.from_email, "reply_to": row.reply_to or "",
                        }
                        results = send_batch(
                            cfg, password,
                            [{"to": d.recipient, "subject": broadcast.subject, "body": broadcast.body} for d in deliveries],
                        )
                    except (MailError, SecretKeyMissing) as exc:
                        results = [{"ok": False, "error": str(exc)} for _ in deliveries]
                    for d, res in zip(deliveries, results):
                        d.status = "sent" if res["ok"] else "failed"
                        d.error = None if res["ok"] else (res["error"] or "Unknown error")[:300]
                        d.sent_at = datetime.utcnow() if res["ok"] else None
                    db.session.commit()

                all_rows = MailDelivery.query.filter_by(broadcast_id=broadcast_id).all()
                broadcast.sent = sum(1 for d in all_rows if d.status == "sent")
                broadcast.failed = sum(1 for d in all_rows if d.status == "failed")
                broadcast.skipped = sum(1 for d in all_rows if d.status == "skipped")
                broadcast.status = "done"
                broadcast.finished_at = datetime.utcnow()
                db.session.commit()
            except Exception:
                db.session.rollback()
                logger.exception("Broadcast %s failed", broadcast_id)
                broadcast = MailBroadcast.query.get(broadcast_id)
                if broadcast is not None:
                    broadcast.status = "done"
                    broadcast.finished_at = datetime.utcnow()
                    db.session.commit()


def _broadcast_payload(b, include_deliveries=False):
    data = {
        "id": b.id, "subject": b.subject, "audience": b.audience, "status": b.status,
        "total": b.total, "sent": b.sent, "failed": b.failed, "skipped": b.skipped,
        "created_by": b.created_by,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "finished_at": b.finished_at.isoformat() if b.finished_at else None,
    }
    if include_deliveries:
        rows = MailDelivery.query.filter_by(broadcast_id=b.id).order_by(MailDelivery.id).limit(2000).all()
        data["body"] = b.body
        data["deliveries"] = [
            {"school_id": d.school_id, "school_name": d.school_name, "recipient": d.recipient,
             "status": d.status, "error": d.error,
             "sent_at": d.sent_at.isoformat() if d.sent_at else None}
            for d in rows
        ]
    return data


class BroadcastAPI(MethodView):
    decorators = [developer_required]

    def get(self):
        with platform_scope():
            rows = MailBroadcast.query.order_by(MailBroadcast.id.desc()).limit(50).all()
            return jsonify({"broadcasts": [_broadcast_payload(b) for b in rows]}), 200

    def post(self):
        data = request.get_json(silent=True) or {}
        subject = " ".join(str(data.get("subject") or "").split())[:MAX_SUBJECT]
        body = str(data.get("body") or "").replace("\r\n", "\n").strip()
        if not subject:
            return jsonify({"error": "Enter a subject."}), 400
        if not body:
            return jsonify({"error": "Enter the message."}), 400
        if len(body) > MAX_BODY:
            return jsonify({"error": f"The message must be at most {MAX_BODY} characters."}), 400
        audience = data.get("audience") or "selected"
        if audience not in ("all", "selected"):
            return jsonify({"error": "Choose all schools or selected schools."}), 400

        with platform_scope():
            if audience == "all":
                schools = School.query.filter_by(is_archived=False).order_by(School.id).all()
            else:
                ids = [int(i) for i in (data.get("school_ids") or []) if str(i).isdigit()]
                if not ids:
                    return jsonify({"error": "Choose at least one school."}), 400
                schools = School.query.filter(School.id.in_(ids), School.is_archived.is_(False)).all()
            if not schools:
                return jsonify({"error": "No matching schools."}), 400
            if len(schools) > MAX_BROADCAST_SCHOOLS:
                return jsonify({"error": f"At most {MAX_BROADCAST_SCHOOLS} schools per message."}), 400

            try:
                broadcast = MailBroadcast(
                    subject=subject, body=body, audience=audience, status="queued",
                    created_by=getattr(request, "developer_username", None),
                )
                db.session.add(broadcast)
                db.session.flush()
                for school in schools:
                    recipient = _validate_recipient(school.contact_email)
                    if recipient:
                        db.session.add(MailDelivery(
                            broadcast_id=broadcast.id, school_id=school.id, school_name=school.name,
                            recipient=recipient, status="queued",
                        ))
                    else:
                        db.session.add(MailDelivery(
                            broadcast_id=broadcast.id, school_id=school.id, school_name=school.name,
                            recipient=school.contact_email or "", status="skipped",
                            error="No valid contact email for this school.",
                        ))
                db.session.flush()
                counts = MailDelivery.query.filter_by(broadcast_id=broadcast.id).all()
                broadcast.total = len(counts)
                broadcast.skipped = sum(1 for d in counts if d.status == "skipped")
                db.session.commit()
                broadcast_id = broadcast.id
            except SQLAlchemyError:
                db.session.rollback()
                logger.exception("Broadcast create failed")
                return jsonify({"error": "Internal server error"}), 500

        app = current_app._get_current_object()
        threading.Thread(target=_run_broadcast, args=(app, broadcast_id), daemon=True).start()
        audit("mail.broadcast", detail=f"id={broadcast_id} audience={audience} schools={len(schools)} subject={subject[:60]}")
        with platform_scope():
            payload = _broadcast_payload(MailBroadcast.query.get(broadcast_id))
        return jsonify({"message": "Message queued. It is sent to each school in the background.", "broadcast": payload}), 202


class BroadcastDetailAPI(MethodView):
    decorators = [developer_required]

    def get(self, broadcast_id):
        with platform_scope():
            b = MailBroadcast.query.get(broadcast_id)
            if b is None:
                return jsonify({"error": "Message not found"}), 404
            return jsonify({"broadcast": _broadcast_payload(b, include_deliveries=True)}), 200
