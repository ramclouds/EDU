"""Profile photos for every signed-in user (admins, teachers, students, staff).

Photos are stored on the server, in a folder per school (Profile_Photos/<school id>/).
A file is accepted only if its contents are a PNG, JPEG or WEBP image, and it is at most
2 MB. Each person may replace or remove their own photo. A photo is served only to
people signed in to the same school.
"""
import os
import secrets

from flask import jsonify, request, send_from_directory
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError

from utils.auth import db
from utils.auth_middleware import login_required
from utils.tenancy import current_school_id

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTO_BASE = os.getenv("PROFILE_PHOTO_DIR") or os.path.join(ROOT, "uploads", "profile_photos")
MAX_PHOTO_BYTES = 2 * 1024 * 1024


def sniff_image(data):
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def _folder(school_id):
    return os.path.join(PHOTO_BASE, str(int(school_id)))


def photo_url(filename):
    return f"/api/profile-photo/{filename}" if filename else None


class MyPhotoAPI(MethodView):
    decorators = [login_required]

    def post(self):
        user = request.user
        if not hasattr(user, "profile_image"):
            return jsonify({"error": "Photos are not available for this account"}), 404
        upload = request.files.get("photo")
        if upload is None or not upload.filename:
            return jsonify({"error": "Choose a photo to upload"}), 400
        data = upload.read(MAX_PHOTO_BYTES + 1)
        if len(data) > MAX_PHOTO_BYTES:
            return jsonify({"error": "The photo is larger than 2 MB"}), 413
        ext = sniff_image(data)
        if ext is None:
            return jsonify({"error": "Use a PNG, JPEG or WEBP photo"}), 400

        school_id = current_school_id()
        stored = f"{secrets.token_hex(16)}.{ext}"
        folder = _folder(school_id)
        os.makedirs(folder, exist_ok=True)
        with open(os.path.join(folder, stored), "wb") as fh:
            fh.write(data)

        previous = user.profile_image
        try:
            user.profile_image = stored
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            os.remove(os.path.join(folder, stored))
            return jsonify({"error": "Internal server error"}), 500
        _remove_file(school_id, previous)
        return jsonify({"message": "Photo saved", "profile_image": photo_url(stored)}), 200

    def delete(self):
        user = request.user
        if not hasattr(user, "profile_image"):
            return jsonify({"error": "Photos are not available for this account"}), 404
        previous = user.profile_image
        try:
            user.profile_image = None
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            return jsonify({"error": "Internal server error"}), 500
        _remove_file(current_school_id(), previous)
        return jsonify({"message": "Photo removed", "profile_image": None}), 200


def _remove_file(school_id, filename):
    if filename:
        try:
            os.remove(os.path.join(_folder(school_id), os.path.basename(filename)))
        except OSError:
            pass


class ProfilePhotoAPI(MethodView):
    decorators = [login_required]

    def get(self, filename):
        safe = os.path.basename(filename)
        if safe != filename or not sniff_name_ok(safe):
            return jsonify({"error": "Not found"}), 404
        response = send_from_directory(_folder(current_school_id()), safe, max_age=3600)
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response


def sniff_name_ok(name):
    return name.endswith((".png", ".jpg", ".webp")) and len(name) <= 80
