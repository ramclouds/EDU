import { useCallback, useEffect, useSyncExternalStore } from "react";

import { BASE_URL } from "../../config/appConfig";
import { DASHBOARD_BY_KEY, DASHBOARD_BY_ROUTE } from "./dashboardRegistry";

const STORAGE_KEY = "dashboard_access";

function readStoredDashboardAccess() {
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

function findDashboardAccess(list, routeOrKey) {
  if (!routeOrKey) return null;

  return (
    (list || []).find(
      (entry) => entry.route === routeOrKey || entry.key === routeOrKey,
    ) || null
  );
}

// HOOK
// One store shared by every component on the page: a refresh made by the sidebar
// also updates the route guard and the dashboard checks.
let store = { dashboards: readStoredDashboardAccess(), loading: false, loaded: false };
const storeListeners = new Set();
let inflight = null;

const getStore = () => store;

function subscribeStore(listener) {
  storeListeners.add(listener);
  return () => storeListeners.delete(listener);
}

function setStore(patch) {
  store = { ...store, ...patch };
  storeListeners.forEach((listener) => listener());
}

// The first dashboard this user may open. Used when a page sends them somewhere else.
function firstAccessibleRoute(list) {
  const first = (list || []).find((entry) => entry.can_view && entry.route);
  return first ? first.route : "/";
}

// Called on sign-out, so the next person never sees the previous person's list.
export function resetDashboardAccessStore() {
  clearStoredDashboardAccess();
  store = { dashboards: [], loading: false, loaded: false };
  storeListeners.forEach((listener) => listener());
}

async function fetchDashboards() {
  if (inflight) return inflight;

  const token = localStorage.getItem("signed_in");
  if (!token) {
    setStore({ dashboards: [], loading: false, loaded: true });
    storeDashboardAccess([]);
    return [];
  }

  setStore({ loading: true });
  inflight = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/rbac/my-dashboards`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("access list unavailable");
      const data = await response.json();
      const list = Array.isArray(data.dashboards) ? data.dashboards : [];
      storeDashboardAccess(list);
      setStore({ dashboards: list, loading: false, loaded: true });
      return list;
    } catch {
      const fallback = readStoredDashboardAccess();
      setStore({ dashboards: fallback, loading: false, loaded: true });
      return fallback;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function useDashboardAccess() {
  const snapshot = useSyncExternalStore(subscribeStore, getStore, getStore);

  const refresh = useCallback(() => fetchDashboards(), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const canView = useCallback(
    (routeOrKey) => Boolean(findDashboardAccess(snapshot.dashboards, routeOrKey)?.can_view),
    [snapshot.dashboards],
  );

  const canWrite = useCallback(
    (routeOrKey) => Boolean(findDashboardAccess(snapshot.dashboards, routeOrKey)?.can_write),
    [snapshot.dashboards],
  );

  return {
    dashboards: snapshot.dashboards, // [{ key, label, route, can_view, can_write }, ...]
    loading: snapshot.loading,
    loaded: snapshot.loaded,
    refresh,
    canView,
    canWrite,
    homeRoute: firstAccessibleRoute(snapshot.dashboards),
  };
}

export default useDashboardAccess;
