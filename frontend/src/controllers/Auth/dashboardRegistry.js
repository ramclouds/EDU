/**
 * DASHBOARD REGISTRY
 * ---------------------------------------------------------------
 * Single, configurable list of every dashboard page in the app.
 * To add a new dashboard in the future, add one entry here (and a
 * matching entry in the backend DASHBOARD_REGISTRY in
 * rolePermissionManagement.py) - nothing else needs to change.
 *
 * NOTE: this list only describes the pages that *exist*. Whether the
 * current user may actually open a given page is decided by the
 * backend (RBAC) and delivered via the `dashboard_access` array
 * returned at login / from GET /rbac/my-dashboards. See
 * useDashboardAccess.js.
 * ---------------------------------------------------------------
 */

export const DASHBOARD_REGISTRY = [
  {
    key: "super-admin-dashboard",
    label: "Super Admin Dashboard",
    route: "/super-admin-dashboard",
    icon: "bi-speedometer2",
  },
  {
    key: "library-admin-dashboard",
    label: "Library Dashboard",
    route: "/library-admin-dashboard",
    icon: "bi-journal-bookmark",
  },
  {
    key: "accounts-admin-dashboard",
    label: "Accounts Dashboard",
    route: "/accounts-admin-dashboard",
    icon: "bi-bank",
  },
  {
    key: "hostel-admin-dashboard",
    label: "Hostel Dashboard",
    route: "/hostel-admin-dashboard",
    icon: "bi-building",
  },
  {
    key: "hr-admin-dashboard",
    label: "HR Dashboard",
    route: "/hr-admin-dashboard",
    icon: "bi-people-fill",
  },
  {
    key: "teacher-dashboard",
    label: "Teacher Dashboard",
    route: "/teacher-dashboard",
    icon: "bi-person-badge",
  },
  {
    key: "student-dashboard",
    label: "Student Dashboard",
    route: "/student-dashboard",
    icon: "bi-mortarboard",
  },
];

export const DASHBOARD_BY_ROUTE = DASHBOARD_REGISTRY.reduce((map, entry) => {
  map[entry.route] = entry;
  return map;
}, {});

export const DASHBOARD_BY_KEY = DASHBOARD_REGISTRY.reduce((map, entry) => {
  map[entry.key] = entry;
  return map;
}, {});

/** Dashboards a Super Admin is allowed to jump to from their own sidebar. */
export const SUPER_ADMIN_LINKABLE_DASHBOARDS = DASHBOARD_REGISTRY.filter(
  (entry) => entry.key !== "teacher-dashboard" && entry.key !== "student-dashboard",
);
