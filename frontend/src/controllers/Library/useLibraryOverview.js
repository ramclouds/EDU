import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BASE_URL } from "../../config/appConfig";

const LIBRARY_DASHBOARD_ENDPOINT = `${BASE_URL}/admin/library/dashboard`;

const REFRESH_INTERVAL_MS = 30000; // keep in step with useAdminDashboard's notification poll

const EMPTY_STATS = {
  total_titles: 0,
  total_copies: 0,
  available_copies: 0,
  issued_copies: 0,
  currently_issued: 0,
  overdue_books: 0,
  due_soon: 0,
  issued_today: 0,
  returned_today: 0,
  total_members: 0,
  students: 0,
  teachers: 0,
  staff: 0,
  admins: 0,
  fine_collected: 0,
  fine_pending: 0,
  fine_waived: 0,
};

/**
 * Real-time library overview for the Super Admin dashboard.
 *
 * Usage:
 *   const {
 *     stats, occupancyRate, issueTrend, revenueTrend,
 *     recentActivity, overdueAlerts, recentBooks,
 *     loading, refreshing, error, lastUpdated, refresh,
 *   } = useLibraryOverview();
 */
export function useLibraryOverview({ autoRefresh = true } = {}) {
  const navigate = useNavigate();

  const [stats, setStats] = useState(EMPTY_STATS);
  const [issueTrend, setIssueTrend] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [overdueAlerts, setOverdueAlerts] = useState([]);
  const [recentBooks, setRecentBooks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Tracks whether we've completed the first successful/failed fetch,
  // so subsequent polls show a lightweight "refreshing" state instead
  // of re-triggering the full-page loading skeleton.
  const hasLoadedOnce = useRef(false);

  const fetchOverview = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    if (hasLoadedOnce.current) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch(LIBRARY_DASHBOARD_ENDPOINT, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.clear();
        navigate("/");
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok || !data || data.success === false) {
        throw new Error(
          data?.error || "Unable to load library dashboard"
        );
      }

      setStats({ ...EMPTY_STATS, ...(data.stats || {}) });
      setIssueTrend(Array.isArray(data.issue_trend) ? data.issue_trend : []);
      setRevenueTrend(
        Array.isArray(data.revenue_trend) ? data.revenue_trend : []
      );
      setRecentActivity(
        Array.isArray(data.recent_activity) ? data.recent_activity : []
      );
      setOverdueAlerts(
        Array.isArray(data.overdue_alerts) ? data.overdue_alerts : []
      );
      setRecentBooks(
        Array.isArray(data.recent_books) ? data.recent_books : []
      );
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Library overview fetch failed:", err);
      setError(err.message || "Unable to load library dashboard");
    } finally {
      hasLoadedOnce.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchOverview();

    if (!autoRefresh) {
      return undefined;
    }

    const interval = setInterval(fetchOverview, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchOverview, autoRefresh]);

  const occupancyRate =
    stats.total_copies > 0
      ? Math.round((stats.issued_copies / stats.total_copies) * 100)
      : 0;

  return {
    stats,
    occupancyRate,
    issueTrend,
    revenueTrend,
    recentActivity,
    overdueAlerts,
    recentBooks,

    loading,
    refreshing,
    error,
    lastUpdated,

    refresh: fetchOverview,
  };
}

export default useLibraryOverview;
