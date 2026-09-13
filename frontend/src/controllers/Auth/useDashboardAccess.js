import { useCallback, useEffect, useState } from "react";

import { BASE_URL } from "../../config/appConfig";
import { DASHBOARD_BY_KEY, DASHBOARD_BY_ROUTE } from "./dashboardRegistry";

const STORAGE_KEY = "dashboard_access";

export function readStoredDashboardAccess() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function storeDashboardAccess(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
  } catch {
    // Storage can fail in private browsing - access checks simply
    // fall back to "no access" until the next successful fetch.
  }
}

export function clearStoredDashboardAccess() {
  localStorage.removeItem(STORAGE_KEY);
}

export function findDashboardAccess(list, routeOrKey) {
  if (!routeOrKey) return null;

  return (
    (list || []).find(
      (entry) => entry.route === routeOrKey || entry.key === routeOrKey,
    ) || null
  );
}

export function dashboardLabel(routeOrKey) {
  return (
    DASHBOARD_BY_ROUTE[routeOrKey]?.label ||
    DASHBOARD_BY_KEY[routeOrKey]?.label ||
    "this dashboard"
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useDashboardAccess() {
  const [dashboards, setDashboards] = useState(readStoredDashboardAccess());
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setDashboards([]);
      storeDashboardAccess([]);
      setLoaded(true);
      return [];
    }

    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/rbac/my-dashboards`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        return readStoredDashboardAccess();
      }

      const data = await response.json();
      const list = Array.isArray(data.dashboards) ? data.dashboards : [];

      setDashboards(list);
      storeDashboardAccess(list);

      return list;
    } catch (error) {
      console.warn("Failed to refresh dashboard access:", error);
      return readStoredDashboardAccess();
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canView = useCallback(
    (routeOrKey) => Boolean(findDashboardAccess(dashboards, routeOrKey)?.can_view),
    [dashboards],
  );

  const canWrite = useCallback(
    (routeOrKey) => Boolean(findDashboardAccess(dashboards, routeOrKey)?.can_write),
    [dashboards],
  );

  return {
    dashboards, // [{ key, label, route, can_view, can_write }, ...]
    loading,
    loaded,
    refresh,
    canView,
    canWrite,
  };
}

export default useDashboardAccess;
