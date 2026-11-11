"""School plans: which dashboards a school may use.

Trial    all dashboards, for the trial period (the school's trial end date stops access after that)
Basic    super admin, academic, teacher, student
Pro      Basic + library
Enterprise  Pro + hostel + accounts
Custom   the dashboards the platform owner ticks for that school

Every API route that belongs to a dashboard is checked against the school's plan on the
server, so a locked dashboard cannot be used by calling the API directly.
"""
import json

DASHBOARD_LABELS = {
    "super-admin-dashboard": "Super Admin dashboard",
    "academic-admin-dashboard": "Academic dashboard",
    "teacher-dashboard": "Teacher dashboard",
    "student-dashboard": "Student dashboard",
    "library-admin-dashboard": "Library dashboard",
    "hostel-admin-dashboard": "Hostel dashboard",
    "accounts-admin-dashboard": "Accounts dashboard",
    "hr-admin-dashboard": "HR dashboard",
}
ALL_DASHBOARDS = list(DASHBOARD_LABELS)

BASIC = {"super-admin-dashboard", "academic-admin-dashboard", "teacher-dashboard", "student-dashboard"}
PRO = BASIC | {"library-admin-dashboard"}
ENTERPRISE = PRO | {"hostel-admin-dashboard", "accounts-admin-dashboard"}

PLAN_DASHBOARDS = {
    "Trial": set(ALL_DASHBOARDS),
    "Basic": BASIC,
    "Pro": PRO,
    "Enterprise": ENTERPRISE,
}
PLANS = ["Trial", "Basic", "Pro", "Enterprise", "Custom"]
UPGRADE_ORDER = ["Basic", "Pro", "Enterprise"]

# API path (after /api/) -> the dashboard it belongs to. Longer prefixes first.
ROUTE_RULES = [
    ("student/library", "library-admin-dashboard"),
    ("admin/library", "library-admin-dashboard"),
    ("admin/hostel", "hostel-admin-dashboard"),
    ("accounts/", "accounts-admin-dashboard"),
    ("admin/academic", "academic-admin-dashboard"),
    ("admin/exams", "academic-admin-dashboard"),
    ("admin/timetable", "academic-admin-dashboard"),
    ("admin/attendance", "academic-admin-dashboard"),
    ("admin/subjects", "academic-admin-dashboard"),
    ("admin/events", "academic-admin-dashboard"),
    ("teacher/", "teacher-dashboard"),
    ("my-classes/", "teacher-dashboard"),
    ("student/", "student-dashboard"),
]


def allowed_dashboards(plan, custom=None):
    if plan == "Custom":
        return set(custom or []) & set(ALL_DASHBOARDS)
    return set(PLAN_DASHBOARDS.get(plan or "Trial", set()))


def parse_custom(raw):
    try:
        values = json.loads(raw) if raw else []
    except ValueError:
        return []
    return [v for v in values if v in DASHBOARD_LABELS] if isinstance(values, list) else []


def dashboard_for_path(api_path):
    """The dashboard an API path belongs to, or None when every plan may use it."""
    for prefix, dashboard in ROUTE_RULES:
        if api_path == prefix.rstrip("/") or api_path.startswith(prefix):
            return dashboard
    return None


def upgrade_message(dashboard, plan):
    label = DASHBOARD_LABELS.get(dashboard, dashboard)
    if plan == "Custom":
        return f"The {label} is not included in your school's custom plan. Ask the platform owner to add it."
    for candidate in UPGRADE_ORDER:
        if dashboard in PLAN_DASHBOARDS[candidate]:
            return f"The {label} is not included in your {plan} plan. Upgrade to {candidate} to use it."
    return f"The {label} is not included in any standard plan. Contact the platform owner."
