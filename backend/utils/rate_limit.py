"""Brute-force protection for sign-in and the platform owner login.

Only FAILED attempts (HTTP 401) are counted. Limits (defaults):
  * per address + login name: LOGIN_MAX_FAILS_PER_ACCOUNT (8)
  * per address:              LOGIN_MAX_FAILS_PER_IP (100)
  * window:                   LOGIN_FAIL_WINDOW_SECONDS (300)
Over the limit -> HTTP 429 with Retry-After.

Counts live in a shared store so that every gunicorn worker sees the same numbers:
  * Redis when REDIS_URL is set (production)
  * this process's memory otherwise (development only; the production check warns)
RATE_LIMIT_ENABLED=false switches the protection off.
"""
import logging
import os
import threading
import time

from flask import jsonify, request

logger = logging.getLogger(__name__)


class MemoryStore:
    def __init__(self):
        self._lock = threading.Lock()
        self._data = {}  # key -> (count, expires_at)

    def fail(self, key, window):
        now = time.monotonic()
        with self._lock:
            count, expires = self._data.get(key, (0, 0))
            if expires <= now:
                count, expires = 0, now + window
            count += 1
            self._data[key] = (count, expires)
            if len(self._data) > 20000:  # keep memory bounded
                for k in [k for k, (_, e) in self._data.items() if e <= now][:5000]:
                    self._data.pop(k, None)

    def status(self, key):
        """(count, seconds left in the window)."""
        now = time.monotonic()
        with self._lock:
            count, expires = self._data.get(key, (0, 0))
            if expires <= now:
                return 0, 0
            return count, int(expires - now) + 1

    def forget(self, key):
        with self._lock:
            self._data.pop(key, None)

    def clear(self):
        with self._lock:
            self._data.clear()


class RedisStore:
    def __init__(self, client):
        self._r = client

    def fail(self, key, window):
        name = f"edu:rl:{key}"
        count = self._r.incr(name)
        if count == 1:
            self._r.expire(name, window)

    def status(self, key):
        name = f"edu:rl:{key}"
        raw = self._r.get(name)
        if raw is None:
            return 0, 0
        ttl = self._r.ttl(name)
        return int(raw), max(1, int(ttl))

    def forget(self, key):
        self._r.delete(f"edu:rl:{key}")

    def clear(self):
        pass  # shared data is not cleared from the app


_store = None


def _build_store():
    url = (os.getenv("REDIS_URL") or "").strip()
    if url:
        try:
            import redis

            client = redis.Redis.from_url(url, socket_timeout=2, socket_connect_timeout=2)
            client.ping()
            logger.info("Login protection uses the shared Redis store")
            return RedisStore(client)
        except Exception:
            logger.exception("Redis is not reachable; login protection falls back to this process only")
    return MemoryStore()


def store():
    global _store
    if _store is None:
        _store = _build_store()
    return _store


def using_shared_store():
    return isinstance(store(), RedisStore)


def _enabled():
    return os.getenv("RATE_LIMIT_ENABLED", "true").strip().lower() not in ("0", "false", "no")


def _int(name, default):
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


def _window():
    return _int("LOGIN_FAIL_WINDOW_SECONDS", 300)


def _retry_after(key, limit):
    count, left = store().status(key)
    if count >= limit:
        return max(1, left)
    return 0


def _record_failure(key):
    store().fail(key, _window())


def _forget(key):
    store().forget(key)


def clear_all():
    store().clear()


def _status_of(result):
    if isinstance(result, tuple):
        return result[1] if len(result) > 1 and isinstance(result[1], int) else 200
    return getattr(result, "status_code", 200)


def login_guard(scope, view):
    """Run `view()` under the failed-login limits. `scope` separates login pages."""
    if not _enabled():
        return view()

    data = request.get_json(silent=True) or {}
    identifier = str(data.get("identifier") or data.get("username") or data.get("email") or "")
    identifier = identifier.strip().lower()[:200]
    ip = request.remote_addr or "unknown"
    account_key = f"{scope}:acct:{ip}:{identifier}"
    ip_key = f"{scope}:ip:{ip}"

    wait = max(
        _retry_after(account_key, _int("LOGIN_MAX_FAILS_PER_ACCOUNT", 8)),
        _retry_after(ip_key, _int("LOGIN_MAX_FAILS_PER_IP", 100)),
    )
    if wait:
        response = jsonify({
            "error": "Too many failed login attempts. Please wait and try again.",
            "error_code": "RATE_LIMITED",
            "retry_after_seconds": wait,
        })
        response.status_code = 429
        response.headers["Retry-After"] = str(wait)
        return response

    result = view()
    status = _status_of(result)
    if status == 401:
        _record_failure(account_key)
        _record_failure(ip_key)
    elif status == 200:
        _forget(account_key)
    return result
