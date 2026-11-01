"""Per-school sign-in page branding, and the public data a sign-in page needs.

The sign-in page is shown before anyone is logged in, so this data lives in the
platform database and is read without a school database. Only the fields below are
ever returned publicly (no plan, status, counts, contact details or user data).
Images are checked by their file signature, not by name, and are served through
the school's own address.
"""
import json
import os
import re
import secrets
from datetime import datetime

from flask import jsonify, request, send_from_directory
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError

from utils.auth import db
from utils.platform import School, audit, developer_required
from utils.tenant_routing import current_tenant_school_id, platform_scope, school_urls

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRANDING_ROOT = os.getenv("BRANDING_UPLOAD_DIR") or os.path.join(ROOT, "uploads", "branding")

MB = 1024 * 1024
ASSET_KINDS = {
    # kind: (database column, max bytes, allowed file types)
    "favicon": ("favicon_file", 512 * 1024, {"png", "ico", "webp"}),
    "header_logo": ("header_logo_file", 2 * MB, {"png", "jpg", "webp"}),
    "banner_logo": ("banner_logo_file", 2 * MB, {"png", "jpg", "webp"}),
    "background_image": ("background_image_file", 5 * MB, {"png", "jpg", "webp"}),
}
COLOR_RE = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
SAFE_LINK_RE = re.compile(r"^(https?://[^\s]+|mailto:[^\s@]+@[^\s@]+\.[^\s@]+)$", re.I)
MAX_FOOTER_LINKS = 5

TEXT_LIMITS = {
    "sign_in_title": 120,
    "sign_in_description": 400,
    "sign_in_text": 400,
    "footer_text": 200,
}
COLOR_FIELDS = ("header_background_color", "page_background_color")


class SchoolBranding(db.Model):
    """Platform database only (see PLATFORM_ONLY_TABLES)."""

    __tablename__ = "school_branding"

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(
        db.Integer, db.ForeignKey("schools.id", ondelete="CASCADE"),
        nullable=False, unique=True,
    )
    favicon_file = db.Column(db.String(120))
    header_logo_file = db.Column(db.String(120))
    banner_logo_file = db.Column(db.String(120))
    background_image_file = db.Column(db.String(120))
    header_background_color = db.Column(db.String(9))
    page_background_color = db.Column(db.String(9))
    sign_in_title = db.Column(db.String(120))
    sign_in_description = db.Column(db.String(400))
    sign_in_text = db.Column(db.String(400))
    footer_text = db.Column(db.String(200))
    footer_links = db.Column(db.Text)  # JSON list of {label, url}
    show_self_service_reset = db.Column(db.Boolean, nullable=False, default=False)
    version = db.Column(db.Integer, nullable=False, default=1)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)


# ----------------------------------------------------------------- helpers
def _sniff(data):
    """File type from its first bytes. Returns None for anything else (SVG, HTML, ...)."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    if data[:4] == b"\x00\x00\x01\x00":
        return "ico"
    return None


def _branding_dir(school_id):
    return os.path.join(BRANDING_ROOT, str(int(school_id)))


def _remove_file(school_id, filename):
    if filename:
        try:
            os.remove(os.path.join(_branding_dir(school_id), filename))
        except OSError:
            pass


def _asset_path(kind, row):
    column = ASSET_KINDS[kind][0]
    return getattr(row, column) if row is not None else None


def _asset_url(kind, row):
    filename = _asset_path(kind, row)
    if not filename:
        return None
    return f"/api/public/branding/asset/{kind}?v={row.version}"


def _clean_text(value, limit, field):
    if value is None:
        return None, None
    if not isinstance(value, str):
        return None, f"{field} must be text"
    value = value.strip()
    if len(value) > limit:
        return None, f"{field} must be at most {limit} characters"
    return (value or None), None


def _clean_color(value, field):
    if value in (None, ""):
        return None, None
    if not isinstance(value, str) or not COLOR_RE.match(value.strip()):
        return None, f"{field} must be a colour such as #1e3a8a"
    return value.strip().lower(), None


def _clean_links(value):
    if value in (None, ""):
        return "[]", None
    if not isinstance(value, list) or len(value) > MAX_FOOTER_LINKS:
        return None, f"footer_links must be a list of at most {MAX_FOOTER_LINKS} links"
    cleaned = []
    for item in value:
        if not isinstance(item, dict):
            return None, "each footer link needs a label and a url"
        label = str(item.get("label") or "").strip()
        url = str(item.get("url") or "").strip()
        if not label or len(label) > 40:
            return None, "each footer link needs a label of 1 to 40 characters"
        if len(url) > 300 or not SAFE_LINK_RE.match(url):
            return None, "footer link addresses must start with https://, http:// or mailto:"
        cleaned.append({"label": label, "url": url})
    return json.dumps(cleaned), None


def _links(row):
    try:
        data = json.loads(row.footer_links or "[]") if row else []
        return data if isinstance(data, list) else []
    except ValueError:
        return []


def _public_payload(school, row):
    """Exactly what the sign-in page may show before anyone logs in."""
    if school is None:
        return {
            "scoped": False,
            "school_name": None,
            "tenant_id": None,
            "login_url": None,
            "favicon_url": None,
            "header_logo_url": None,
            "banner_logo_url": None,
            "background_image_url": None,
            "header_background_color": None,
            "page_background_color": None,
            "sign_in_title": None,
            "sign_in_description": None,
            "sign_in_text": None,
            "footer_text": None,
            "footer_links": [],
            "show_self_service_reset": False,
        }
    return {
        "scoped": True,
        "school_name": school.name,
        "tenant_id": school.tenant_id,
        "login_url": school_urls(school.tenant_id).get("login_url"),
        "favicon_url": _asset_url("favicon", row),
        "header_logo_url": _asset_url("header_logo", row),
        "banner_logo_url": _asset_url("banner_logo", row),
        "background_image_url": _asset_url("background_image", row),
        "header_background_color": row.header_background_color if row else None,
        "page_background_color": row.page_background_color if row else None,
        "sign_in_title": (row.sign_in_title if row else None) or school.name,
        "sign_in_description": row.sign_in_description if row else None,
        "sign_in_text": row.sign_in_text if row else None,
        "footer_text": row.footer_text if row else None,
        "footer_links": _links(row),
        "show_self_service_reset": bool(row.show_self_service_reset) if row else False,
    }


def _developer_payload(school, row):
    payload = _public_payload(school, row)
    payload.update({
        "school_id": school.id,
        "assets": {
            kind: bool(_asset_path(kind, row)) for kind in ASSET_KINDS
        },
        "version": row.version if row else 0,
        "updated_at": row.updated_at.isoformat() if row and row.updated_at else None,
    })
    return payload


def _get_or_create_row(school_id):
    row = SchoolBranding.query.filter_by(school_id=school_id).first()
    if row is None:
        row = SchoolBranding(school_id=school_id, version=0)
        db.session.add(row)
    return row


# ----------------------------------------------------------------- public (no login)
class PublicBrandingAPI(MethodView):
    """What the sign-in page of the current address shows. Needs no login."""

    def get(self):
        with platform_scope():
            tid = current_tenant_school_id()
            school = School.query.get(tid) if tid else None
            if school is not None and school.is_archived:
                school = None
            row = SchoolBranding.query.filter_by(school_id=school.id).first() if school else None
            payload = _public_payload(school, row)
        response = jsonify(payload)
        response.headers["Cache-Control"] = "public, max-age=60"
        return response, 200


class PublicBrandingAssetAPI(MethodView):
    def get(self, kind):
        if kind not in ASSET_KINDS:
            return jsonify({"error": "Not found"}), 404
        with platform_scope():
            tid = current_tenant_school_id()
            row = SchoolBranding.query.filter_by(school_id=tid).first() if tid else None
            filename = _asset_path(kind, row)
            directory = _branding_dir(tid) if tid else None
        if not filename or not directory:
            return jsonify({"error": "Not found"}), 404
        response = send_from_directory(directory, filename, max_age=86400)
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response


# ----------------------------------------------------------------- developer console
class SchoolBrandingAPI(MethodView):
    decorators = [developer_required]

    def get(self, school_id):
        school = School.query.get(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404
        row = SchoolBranding.query.filter_by(school_id=school_id).first()
        return jsonify({"branding": _developer_payload(school, row)}), 200

    def put(self, school_id):
        school = School.query.get(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404
        data = request.get_json(silent=True) or {}

        updates = {}
        for field in COLOR_FIELDS:
            if field in data:
                value, err = _clean_color(data[field], field)
                if err:
                    return jsonify({"error": err}), 400
                updates[field] = value
        for field, limit in TEXT_LIMITS.items():
            if field in data:
                value, err = _clean_text(data[field], limit, field)
                if err:
                    return jsonify({"error": err}), 400
                updates[field] = value
        if "footer_links" in data:
            value, err = _clean_links(data["footer_links"])
            if err:
                return jsonify({"error": err}), 400
            updates["footer_links"] = value
        if "show_self_service_reset" in data:
            updates["show_self_service_reset"] = bool(data["show_self_service_reset"])

        try:
            row = _get_or_create_row(school_id)
            for field, value in updates.items():
                setattr(row, field, value)
            row.version = (row.version or 0) + 1
            row.updated_at = datetime.utcnow()
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            return jsonify({"error": "Internal server error"}), 500
        audit("school.branding_update", school=school, detail=", ".join(sorted(updates)) or None)
        return jsonify({"message": "Sign-in page updated", "branding": _developer_payload(school, row)}), 200


class SchoolBrandingAssetAPI(MethodView):
    decorators = [developer_required]

    def post(self, school_id, kind):
        """Upload one image. The file is checked by its contents, not by its name."""
        if kind not in ASSET_KINDS:
            return jsonify({"error": "Unknown image type"}), 404
        school = School.query.get(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404

        upload = request.files.get("file")
        if upload is None:
            return jsonify({"error": "Choose an image file"}), 400
        column, max_bytes, allowed = ASSET_KINDS[kind]
        data = upload.read(max_bytes + 1)
        if len(data) > max_bytes:
            return jsonify({"error": f"This image is larger than {max_bytes // 1024} KB"}), 413
        sniffed = _sniff(data)
        if sniffed not in allowed:
            return jsonify({"error": "Use a PNG, JPEG, WEBP" + (" or ICO" if "ico" in allowed else "") + " image"}), 400

        ext = "jpg" if sniffed == "jpg" else sniffed
        filename = f"{kind}-{secrets.token_hex(8)}.{ext}"
        directory = _branding_dir(school_id)
        os.makedirs(directory, exist_ok=True)
        with open(os.path.join(directory, filename), "wb") as fh:
            fh.write(data)

        try:
            row = _get_or_create_row(school_id)
            old = getattr(row, column)
            setattr(row, column, filename)
            row.version = (row.version or 0) + 1
            row.updated_at = datetime.utcnow()
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            _remove_file(school_id, filename)
            return jsonify({"error": "Internal server error"}), 500
        _remove_file(school_id, old)
        audit("school.branding_image", school=school, detail=kind)
        return jsonify({"message": "Image saved", "branding": _developer_payload(school, row)}), 200

    def delete(self, school_id, kind):
        if kind not in ASSET_KINDS:
            return jsonify({"error": "Unknown image type"}), 404
        school = School.query.get(school_id)
        row = SchoolBranding.query.filter_by(school_id=school_id).first() if school else None
        if not school or row is None or not _asset_path(kind, row):
            return jsonify({"error": "Nothing to remove"}), 404
        column = ASSET_KINDS[kind][0]
        old = getattr(row, column)
        try:
            setattr(row, column, None)
            row.version = (row.version or 0) + 1
            row.updated_at = datetime.utcnow()
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            return jsonify({"error": "Internal server error"}), 500
        _remove_file(school_id, old)
        audit("school.branding_image_remove", school=school, detail=kind)
        return jsonify({"message": "Image removed", "branding": _developer_payload(school, row)}), 200
