"""School name and logo: upload, serve and read the school's own details."""

import glob
import logging
import os
import time

from flask import jsonify, request, send_from_directory
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError

from utils.auth import db
from utils.auth_middleware import login_required
from utils.platform import School, audit, developer_required
from utils.tenant_routing import platform_school_snapshot, school_urls, tenant_scope


def _sync_logo_to_school_db(school):
    """The logo is stored on the platform row and on the school's own copy."""
    database_name, school_pk, logo_url = school.database_name, school.id, school.logo_url
    if not database_name:
        return
    try:
        with tenant_scope(database_name):
            copy = School.query.get(school_pk)
            if copy is not None:
                copy.logo_url = logo_url
                db.session.commit()
    except Exception:
        # The platform record is the source of truth. A school database that has
        # not been brought up to date yet must not make the upload fail.
        db.session.rollback()
        logger.warning("Could not copy the logo into %s; run scripts/update_school_databases.py", database_name)

logger = logging.getLogger(__name__)

LOGO_DIR = os.path.join(os.path.abspath(os.path.dirname(os.path.dirname(__file__))), "uploads", "school_logos")
MAX_LOGO_BYTES = 2 * 1024 * 1024


def _detect_logo_type(data):
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def school_public(school):
    """The school details shown in the dashboards."""
    if school is None:
        return None
    return {
        "id": school.id,
        "name": school.name,
        "school_code": school.school_code,
        "tenant_id": school.tenant_id,
        **school_urls(school.tenant_id),
        "plan": school.plan,
        "status": school.status,
        "logo_url": school.logo_url,
    }


def _remove_logo_files(school_id):
    for path in glob.glob(os.path.join(LOGO_DIR, f"{school_id}.*")):
        try:
            os.remove(path)
        except OSError:
            logger.exception("Could not remove old logo %s", path)


class SchoolLogoAPI(MethodView):
    decorators = [developer_required]

    def post(self, school_id):
        school = School.query.get(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404
        upload = request.files.get("logo")
        if not upload or not upload.filename:
            return jsonify({"error": "Choose an image file (PNG, JPG or WEBP)"}), 400
        data = upload.read(MAX_LOGO_BYTES + 1)
        if len(data) > MAX_LOGO_BYTES:
            return jsonify({"error": "The logo must be 2 MB or smaller"}), 400
        kind = _detect_logo_type(data)
        if kind is None:
            return jsonify({"error": "The logo must be a PNG, JPG or WEBP image"}), 400
        os.makedirs(LOGO_DIR, exist_ok=True)
        _remove_logo_files(school.id)
        with open(os.path.join(LOGO_DIR, f"{school.id}.{kind}"), "wb") as fh:
            fh.write(data)
        school.logo_url = f"/api/school-logo/{school.id}?v={int(time.time())}"
        try:
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Database error saving school logo")
            return jsonify({"error": "Internal server error"}), 500
        audit("school.logo_upload", school=school)
        payload = school.to_dict()
        _sync_logo_to_school_db(school)
        return jsonify({"message": "Logo saved", "school": payload}), 200

    def delete(self, school_id):
        school = School.query.get(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404
        _remove_logo_files(school.id)
        school.logo_url = None
        try:
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Database error removing school logo")
            return jsonify({"error": "Internal server error"}), 500
        audit("school.logo_remove", school=school)
        payload = school.to_dict()
        _sync_logo_to_school_db(school)
        return jsonify({"message": "Logo removed", "school": payload}), 200


class SchoolLogoServeAPI(MethodView):
    def get(self, school_id):
        matches = glob.glob(os.path.join(LOGO_DIR, f"{school_id}.*"))
        if not matches:
            return jsonify({"error": "No logo"}), 404
        response = send_from_directory(LOGO_DIR, os.path.basename(matches[0]))
        response.cache_control.max_age = 3600
        response.cache_control.public = True
        return response


class SchoolMeAPI(MethodView):
    @login_required
    def get(self):
        school_id = getattr(request.user, "school_id", None)
        if not school_id:
            return jsonify({"school": None}), 200
        return jsonify({"school": school_public(platform_school_snapshot(school_id))}), 200
