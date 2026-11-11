"""Developer console: view and change the .env settings, apply them, and reload the service.

Safety rules
  * Every change needs the platform owner's current password.
  * Only the settings listed in SETTINGS can be changed. Anything else in the file is left alone.
  * Secrets are never returned. Protected settings (secret keys, the database address,
    FLASK_ENV) can only be changed on the server, by editing the file.
  * Each save first copies the current file to .env.backup-<time>, then writes atomically.
  * Values are checked before they are written. Audit entries record the names of the
    settings changed, never the values.
"""
import glob
import os
import re
import secrets
import shutil
import signal
import threading
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

from dotenv import dotenv_values, load_dotenv
from flask import jsonify, request
from flask.views import MethodView

from utils.auth import bcrypt
from utils.platform import Developer, audit, developer_required
from utils.tenant_routing import invalidate_tenant_cache

BACKEND_DIR = Path(__file__).resolve().parents[1]
FRONTEND_DIR = BACKEND_DIR.parent / "frontend"
FILES = {
    "backend": BACKEND_DIR / ".env",
    "frontend": FRONTEND_DIR / ".env",
}
MAX_BACKUPS = 10
SUPERVISED_EXIT_CODE = 3  # scripts/run_forever.py restarts the backend when it sees this

DOMAIN_RE = re.compile(r"^$|^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$")
VERSION_RE = re.compile(r"^$|^y\d{2}$")
PREFIX_RE = re.compile(r"^[a-z][a-z0-9]{0,15}$")

# key, file, group, label, type, options, live, help
SETTINGS = [
    # ---- sign-in and sessions
    dict(key="TOKEN_EXPIRY_HOURS", file="backend", group="Sign-in and sessions", label="Session length (hours)",
         type="int", min=1, max=720, live=False, help="How long a sign-in lasts before the person must sign in again."),
    dict(key="RATE_LIMIT_ENABLED", file="backend", group="Sign-in and sessions", label="Block repeated wrong passwords",
         type="bool", live=True, help="Temporarily blocks sign-in after too many wrong passwords."),
    dict(key="LOGIN_MAX_FAILS_PER_ACCOUNT", file="backend", group="Sign-in and sessions", label="Wrong passwords per account",
         type="int", min=1, max=100, live=True, help="Failed attempts allowed for one name before a wait."),
    dict(key="LOGIN_MAX_FAILS_PER_IP", file="backend", group="Sign-in and sessions", label="Wrong passwords per address",
         type="int", min=1, max=10000, live=True, help="Failed attempts allowed from one network address."),
    dict(key="LOGIN_FAIL_WINDOW_SECONDS", file="backend", group="Sign-in and sessions", label="Counting window (seconds)",
         type="int", min=30, max=86400, live=True, help="Time window in which failed attempts are counted."),
    # ---- web addresses
    dict(key="TENANT_BASE_DOMAIN", file="backend", group="School web addresses", label="Your domain",
         type="domain", live=True, help="For example yourcompany.com. Leave empty for local development. Changing it also needs a restart so the browser allow-list updates."),
    dict(key="TENANT_URL_SCHEME", file="backend", group="School web addresses", label="Address scheme",
         type="choice", options=["http", "https"], live=True, help="https on a live server. http only for local testing."),
    dict(key="TENANT_PUBLIC_PORT", file="backend", group="School web addresses", label="Port shown in school addresses",
         type="int", min=0, max=65535, live=True, allow_empty=True, help="Only for local development, for example 5173. Leave empty on a live server."),
    dict(key="API_DEFAULT_VERSION", file="backend", group="School web addresses", label="API version in addresses",
         type="text", regex=VERSION_RE, live=True, help="For example y26."),
    dict(key="CORS_ORIGINS", file="backend", group="School web addresses", label="Extra allowed websites",
         type="list", live=False, help="Comma-separated web addresses allowed to call the API. Each school's own address is allowed automatically."),
    # ---- school databases
    dict(key="TENANT_DB_PREFIX", file="backend", group="School databases", label="Prefix for new school databases",
         type="text", regex=PREFIX_RE, live=False, help="Used for new schools only. Lowercase letters and digits, for example edu."),
    dict(key="TENANT_POOL_SIZE", file="backend", group="School databases", label="Connections per school (normal)",
         type="int", min=1, max=50, live=False, help="Database connections kept open for each school."),
    dict(key="TENANT_MAX_OVERFLOW", file="backend", group="School databases", label="Connections per school (busy times)",
         type="int", min=0, max=100, live=False, help="Extra connections allowed at busy times."),
    dict(key="TENANT_CACHE_SECONDS", file="backend", group="School databases", label="School lookup cache (seconds)",
         type="int", min=0, max=3600, live=True, help="How long a school's details are remembered before being looked up again."),
    # ---- email, branding, network
    dict(key="SMTP_ALLOW_LOCAL", file="backend", group="Email, branding and network", label="Allow local mail servers",
         type="bool", live=True, help="Development only. Allows a mail server on this computer and unencrypted mail."),
    dict(key="BRANDING_UPLOAD_DIR", file="backend", group="Email, branding and network", label="Folder for sign-in images",
         type="text", live=False, allow_empty=True, help="Where uploaded sign-in images are kept. Empty uses the default folder."),
    dict(key="TRUSTED_PROXY_COUNT", file="backend", group="Email, branding and network", label="Proxies in front of the app",
         type="int", min=0, max=5, live=False, allow_empty=True, help="Number of proxies (usually 1 behind nginx). Leave empty when none."),
    # ---- website (frontend build)
    dict(key="VITE_API_BASE_URL", file="frontend", group="Website settings", label="API address override",
         type="text", live=False, allow_empty=True, help="Leave empty so school addresses find the API themselves."),
    dict(key="VITE_TENANT_BASE_DOMAIN", file="frontend", group="Website settings", label="Your domain",
         type="domain", live=False, help="Same as the backend Your domain setting."),
    dict(key="VITE_TENANT_URL_SCHEME", file="frontend", group="Website settings", label="Address scheme",
         type="choice", options=["http", "https"], live=False),
    dict(key="VITE_API_VERSION", file="frontend", group="Website settings", label="API version in addresses",
         type="text", regex=VERSION_RE, live=False, allow_empty=True),
    dict(key="VITE_SUPPORT_EMAIL", file="frontend", group="Website settings", label="Support email",
         type="email", live=False, allow_empty=True),
]

# Shown on the page, never editable here.
PROTECTED = [
    dict(key="MYSQL_DSN", file="backend", group="Protected (edit on the server only)", label="Database connection", kind="dsn"),
    dict(key="APP_SECRET_KEY", file="backend", group="Protected (edit on the server only)", label="App secret key", kind="secret"),
    dict(key="SMTP_ENCRYPTION_KEY", file="backend", group="Protected (edit on the server only)", label="Email password key", kind="secret"),
    dict(key="FLASK_ENV", file="backend", group="Protected (edit on the server only)", label="Run mode", kind="plain"),
]

EMAIL_RE = re.compile(r"^$|^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _editable(file_name, key):
    for item in SETTINGS:
        if item["file"] == file_name and item["key"] == key:
            return item
    return None


def _validate(item, raw):
    """(clean value, error). Empty is allowed only where the setting says so."""
    value = "" if raw is None else str(raw).strip()
    if "\n" in value or "\r" in value:
        return None, "Values cannot contain line breaks"
    if value == "":
        if item.get("allow_empty") or item["type"] in ("domain", "email", "list"):
            return "", None
        return None, f"{item['label']} cannot be empty"
    kind = item["type"]
    if kind == "int":
        try:
            number = int(value)
        except ValueError:
            return None, f"{item['label']} must be a whole number"
        if not item["min"] <= number <= item["max"]:
            return None, f"{item['label']} must be between {item['min']} and {item['max']}"
        return str(number), None
    if kind == "bool":
        if value.lower() not in ("true", "false"):
            return None, f"{item['label']} must be true or false"
        return value.lower(), None
    if kind == "choice":
        if value not in item["options"]:
            return None, f"{item['label']} must be one of: {', '.join(item['options'])}"
        return value, None
    if kind == "domain":
        value = value.lower().rstrip(".")
        if not DOMAIN_RE.match(value):
            return None, "Enter a domain such as yourcompany.com, or leave it empty"
        return value, None
    if kind == "email":
        if not EMAIL_RE.match(value):
            return None, "Enter a valid email address"
        return value, None
    if kind == "list":
        parts = [p.strip() for p in value.split(",") if p.strip()]
        for part in parts:
            parsed = urlparse(part)
            if parsed.scheme not in ("http", "https") or not parsed.netloc:
                return None, "Each extra website must start with http:// or https://"
        return ",".join(parts), None
    # text
    if item.get("regex") and not item["regex"].match(value):
        return None, f"{item['label']} has an invalid format"
    if len(value) > 200:
        return None, f"{item['label']} is too long"
    return value, None


def _format_line(key, value):
    if value == "" or re.fullmatch(r"[A-Za-z0-9_./:@,+\-]+", value):
        return f"{key}={value}"
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'{key}="{escaped}"'


def _read_lines(path):
    if not path.exists():
        return []
    return path.read_text(encoding="utf-8-sig").splitlines()


def _write_settings(path, updates):
    """Back up the file, then replace the changed lines (atomic write)."""
    lines = _read_lines(path)
    if path.exists():
        stamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        shutil.copy2(path, path.with_name(f"{path.name}.backup-{stamp}"))
        for old in sorted(glob.glob(str(path.with_name(f"{path.name}.backup-*"))))[:-MAX_BACKUPS]:
            try:
                os.remove(old)
            except OSError:
                pass

    seen = set()
    out = []
    for line in lines:
        match = re.match(r"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=", line)
        if match and match.group(1) in updates:
            key = match.group(1)
            out.append(_format_line(key, updates[key]))
            seen.add(key)
        else:
            out.append(line)
    missing = [k for k in updates if k not in seen]
    if missing:
        if out and out[-1].strip():
            out.append("")
        out.append("# Added from the developer console")
        out.extend(_format_line(k, updates[k]) for k in missing)

    tmp = path.with_name(f"{path.name}.tmp-{secrets.token_hex(4)}")
    tmp.write_text("\n".join(out) + "\n", encoding="utf-8")
    os.replace(tmp, path)


def _backups(path):
    files = sorted(glob.glob(str(path.with_name(f"{path.name}.backup-*"))), reverse=True)
    return [os.path.basename(f) for f in files[:MAX_BACKUPS]]


def _dsn_summary(value):
    """Host and database name only. The password is never shown."""
    if not value:
        return "not set"
    try:
        parsed = urlparse(value.replace("mysql+pymysql://", "mysql://"))
        return f"{parsed.hostname or '?'}:{parsed.port or 3306} / {(parsed.path or '/').lstrip('/') or '?'}"
    except ValueError:
        return "set (could not read)"


def _current_password_ok(password):
    dev = Developer.query.get(request.developer_id)
    return bool(dev and password and bcrypt.check_password_hash(dev.password, password))


def _live_keys(file_name):
    return [i["key"] for i in SETTINGS if i["file"] == file_name and i["live"]]


class SettingsAPI(MethodView):
    decorators = [developer_required]

    def get(self):
        result = {}
        for file_name, path in FILES.items():
            values = dotenv_values(path, encoding="utf-8-sig") if path.exists() else {}
            groups = {}
            for item in SETTINGS:
                if item["file"] != file_name:
                    continue
                groups.setdefault(item["group"], []).append({
                    "key": item["key"], "label": item["label"], "type": item["type"],
                    "options": item.get("options"), "min": item.get("min"), "max": item.get("max"),
                    "allow_empty": bool(item.get("allow_empty")), "live": item["live"], "help": item.get("help", ""),
                    "value": values.get(item["key"]) or "",
                })
            protected = []
            for item in PROTECTED:
                if item["file"] != file_name:
                    continue
                raw = values.get(item["key"]) or ""
                if item["kind"] == "dsn":
                    shown = _dsn_summary(raw)
                elif item["kind"] == "secret":
                    shown = "set" if raw else "not set"
                else:
                    shown = raw or "not set"
                protected.append({"key": item["key"], "label": item["label"], "value": shown})
            result[file_name] = {
                "file": str(path.name),
                "exists": path.exists(),
                "groups": [{"title": title, "items": items} for title, items in groups.items()],
                "protected": protected,
                "backups": _backups(path),
            }
        result["service"] = {
            "supervised": os.getenv("EDU_SUPERVISED") == "1",
            "gunicorn": bool(os.getenv("GUNICORN_PID_FILE")),
        }
        return jsonify(result), 200

    def put(self):
        data = request.get_json(silent=True) or {}
        if not _current_password_ok(data.get("current_password")):
            return jsonify({"error": "Your current password is not correct."}), 403
        file_name = data.get("file")
        if file_name not in FILES:
            return jsonify({"error": "Unknown settings file."}), 400
        changes = data.get("changes") or {}
        if not isinstance(changes, dict) or not changes:
            return jsonify({"error": "Nothing to save."}), 400

        clean, errors = {}, []
        for key, raw in changes.items():
            item = _editable(file_name, key)
            if item is None:
                errors.append(f"{key} cannot be changed here.")
                continue
            value, err = _validate(item, raw)
            if err:
                errors.append(err)
            else:
                clean[key] = value
        if errors:
            return jsonify({"error": "Please check the highlighted settings.", "errors": errors}), 400

        path = FILES[file_name]
        try:
            _write_settings(path, clean)
        except OSError:
            return jsonify({"error": "The settings file could not be written. Check the file permissions."}), 500
        audit("settings.update", detail=f"{file_name}: {', '.join(sorted(clean))}")

        live = [k for k in clean if _editable(file_name, k)["live"]]
        restart = [k for k in clean if not _editable(file_name, k)["live"]]
        return jsonify({
            "message": "Settings saved. A backup of the previous file was kept.",
            "saved": sorted(clean),
            "live": sorted(live),
            "restart_required": sorted(restart),
        }), 200


class SettingsApplyAPI(MethodView):
    decorators = [developer_required]

    def post(self):
        data = request.get_json(silent=True) or {}
        if not _current_password_ok(data.get("current_password")):
            return jsonify({"error": "Your current password is not correct."}), 403
        path = FILES["backend"]
        if path.exists():
            load_dotenv(path, override=True, encoding="utf-8-sig")
        invalidate_tenant_cache()
        audit("settings.apply", detail="live settings reloaded")
        return jsonify({
            "message": "Live settings are now in use.",
            "live_keys": _live_keys("backend"),
            "restart_needed_for": [i["key"] for i in SETTINGS if i["file"] == "backend" and not i["live"]],
        }), 200


def _restart_later(delay=1.5):
    time.sleep(delay)
    os._exit(SUPERVISED_EXIT_CODE)


class ServiceReloadAPI(MethodView):
    decorators = [developer_required]

    def post(self):
        data = request.get_json(silent=True) or {}
        if not _current_password_ok(data.get("current_password")):
            return jsonify({"error": "Your current password is not correct."}), 403
        audit("service.reload", detail=os.getenv("EDU_SUPERVISED") and "supervised" or "requested")

        if os.getenv("EDU_SUPERVISED") == "1":
            threading.Thread(target=_restart_later, daemon=True).start()
            return jsonify({"mode": "supervised", "message": "Restarting the backend. This page will reconnect in a few seconds."}), 202

        pid_file = os.getenv("GUNICORN_PID_FILE")
        if pid_file and os.path.exists(pid_file) and hasattr(signal, "SIGHUP"):
            try:
                with open(pid_file, encoding="utf-8") as fh:
                    pid = int(fh.read().strip())
                os.kill(pid, signal.SIGHUP)
                return jsonify({"mode": "gunicorn", "message": "Reloading the service gracefully."}), 202
            except (OSError, ValueError):
                return jsonify({"error": "Could not signal the server process."}), 500

        return jsonify({
            "mode": "manual",
            "message": (
                "This server cannot restart itself. Run the backend with scripts/run_forever.py "
                "so this button can restart it, or restart the service from the server."
            ),
        }), 200
