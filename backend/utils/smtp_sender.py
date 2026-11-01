"""Sending email through a school's or the platform's SMTP server.

Safety rules built in:
  * server addresses that point at this machine or a link-local/multicast range are refused,
    so the platform cannot be used to probe internal services. Private networks are refused
    too, unless SMTP_ALLOW_LOCAL=true (development, e.g. a local mail catcher).
  * plain (unencrypted) connections are refused unless SMTP_ALLOW_LOCAL=true.
  * header values cannot carry line breaks (no header injection).
  * error text is shortened and never includes the password.
"""
import ipaddress
import os
import re
import smtplib
import socket
import ssl
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid

TIMEOUT_SECONDS = 20
SECURITY_MODES = ("starttls", "ssl", "none")
EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?)+$")
HOST_RE = re.compile(r"^(?=.{1,253}$)([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)*[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$")


class MailError(Exception):
    """A problem the person can fix (shown to them as-is)."""


def allow_local():
    return (os.getenv("SMTP_ALLOW_LOCAL") or "false").strip().lower() in ("1", "true", "yes")


def _line(value, limit):
    """A single header-safe line, trimmed to a limit."""
    return re.sub(r"[\r\n]+", " ", str(value or "")).strip()[:limit]


def check_host(host):
    if not HOST_RE.match(host or ""):
        raise MailError("Enter the mail server name (for example smtp.yourprovider.com) or an IP address.")
    if allow_local():
        return
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as exc:
        raise MailError("That mail server name could not be found.") from exc
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_loopback or ip.is_link_local or ip.is_unspecified or ip.is_multicast or ip.is_reserved or ip.is_private:
            raise MailError(
                "That address points to a private or local network. Use your mail provider's public server name."
            )


def clean_settings(data):
    """Validated, normalised settings (password is handled separately)."""
    host = str(data.get("host") or "").strip().lower().rstrip(".")
    check_host(host)

    try:
        port = int(data.get("port") or 587)
    except (TypeError, ValueError) as exc:
        raise MailError("Port must be a number such as 587 (STARTTLS) or 465 (SSL/TLS).") from exc
    if not 1 <= port <= 65535:
        raise MailError("Port must be between 1 and 65535.")

    security = str(data.get("security") or "starttls").strip().lower()
    if security not in SECURITY_MODES:
        raise MailError("Security must be STARTTLS, SSL/TLS or none.")
    if security == "none" and not allow_local():
        raise MailError("Unencrypted connections are not allowed. Choose STARTTLS or SSL/TLS.")

    from_email = str(data.get("from_email") or "").strip()
    if not EMAIL_RE.match(from_email):
        raise MailError("Enter a valid 'from' email address.")

    reply_to = str(data.get("reply_to") or "").strip()
    if reply_to and not EMAIL_RE.match(reply_to):
        raise MailError("Enter a valid reply-to email address, or leave it empty.")

    return {
        "host": host,
        "port": port,
        "security": security,
        "username": _line(data.get("username"), 200),
        "from_name": _line(data.get("from_name"), 100),
        "from_email": from_email,
        "reply_to": reply_to,
        "enabled": bool(data.get("enabled", True)),
    }


def _safe_error(exc, secrets_to_hide=()):
    text = str(exc) or exc.__class__.__name__
    for secret in secrets_to_hide:
        if secret:
            text = text.replace(secret, "••••")
    return text[:300]


def build_message(cfg, to, subject, body, sender_name=None):
    msg = EmailMessage()
    msg["From"] = formataddr((_line(sender_name or cfg.get("from_name"), 100), cfg["from_email"]))
    msg["To"] = _line(to, 254)
    msg["Subject"] = _line(subject, 150)
    msg["Date"] = formatdate(localtime=False)
    msg["Message-ID"] = make_msgid(domain=cfg["from_email"].split("@", 1)[1])
    if cfg.get("reply_to"):
        msg["Reply-To"] = cfg["reply_to"]
    msg.set_content(body or "", charset="utf-8")
    return msg


def send_batch(cfg, password, items, sender_name=None):
    """Send several messages over one connection.

    items: list of dicts with keys to, subject, body.
    Returns one dict per item: {"ok": bool, "error": str|None}.
    Raises MailError if the server cannot be reached or logged in to at all.
    """
    check_host(cfg["host"])
    context = ssl.create_default_context()
    try:
        if cfg["security"] == "ssl":
            server = smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=TIMEOUT_SECONDS, context=context)
        else:
            server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=TIMEOUT_SECONDS)
    except (OSError, smtplib.SMTPException) as exc:
        raise MailError(f"Could not connect to {cfg['host']}:{cfg['port']}. {_safe_error(exc, [password])}") from exc

    results = []
    try:
        server.ehlo()
        if cfg["security"] == "starttls":
            server.starttls(context=context)
            server.ehlo()
        if cfg.get("username"):
            try:
                server.login(cfg["username"], password or "")
            except smtplib.SMTPAuthenticationError as exc:
                raise MailError("The mail server rejected the username or password.") from exc
        for item in items:
            try:
                msg = build_message(cfg, item["to"], item["subject"], item["body"], sender_name)
                server.send_message(msg, from_addr=cfg["from_email"], to_addrs=[item["to"]])
                results.append({"ok": True, "error": None})
            except (smtplib.SMTPException, OSError, ValueError) as exc:
                results.append({"ok": False, "error": _safe_error(exc, [password])})
    except (smtplib.SMTPException, OSError) as exc:
        raise MailError(f"The connection to the mail server was interrupted. {_safe_error(exc, [password])}") from exc
    finally:
        try:
            server.quit()
        except (smtplib.SMTPException, OSError):
            server.close()
    return results
