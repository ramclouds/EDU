import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

const EMPTY_SUMMARY = { total: 0, alert_count: 0, period_days: 30 };

const EMPTY_FILTERS = {
  search: "",
  action: "",
  admin_id: "",
  days: 30,
};

/**
 * Super Admin > Activity Logs section (inside the Accounts dashboard).
 *
 * Backed by GET /api/accounts/activity-logs, which is backend-gated to
 * Super Admin only - see _require_super_admin() in utils/accounts.py.
 * An Accounts Admin cannot read this back even if they somehow reach
 * this component, so the frontend hiding the sidebar entry (see
 * isSuperAdmin in the dashboard component) is a UX nicety, not the
 * actual security boundary.
 */
export function useAccountsActivityLogs({ fetchWithAuth, showToast, enabled }) {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [accountsAdmins, setAccountsAdmins] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

  const fetchedRef = useRef(false);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyFilters = useCallback(() => setAppliedFilters(filters), [filters]);
  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  }, []);

  const loadLogs = useCallback(
    async (overrideFilters) => {
      if (!fetchWithAuth || !enabled) return;

      const active = overrideFilters || appliedFilters;

      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (active.search) params.set("search", active.search);
        if (active.action) params.set("action", active.action);
        if (active.admin_id) params.set("admin_id", active.admin_id);
        if (active.days) params.set("days", active.days);

        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/activity-logs?${params.toString()}`,
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to load activity logs");
        }

        setLogs(Array.isArray(data.logs) ? data.logs : []);
        setSummary({ ...EMPTY_SUMMARY, ...(data.summary || {}) });
        setAccountsAdmins(Array.isArray(data.accounts_admins) ? data.accounts_admins : []);
      } catch (err) {
        console.error("useAccountsActivityLogs:", err);
        showToast?.(err.message || "Failed to load activity logs", "error");
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth, enabled, appliedFilters, showToast],
  );

  useEffect(() => {
    if (!fetchWithAuth || !enabled) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadLogs(EMPTY_FILTERS);
  }, [fetchWithAuth, enabled, loadLogs]);

  useEffect(() => {
    if (!fetchedRef.current) return;
    loadLogs(appliedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters]);

  return {
    logs,
    summary,
    accountsAdmins,
    loading,
    filters,
    updateFilter,
    applyFilters,
    resetFilters,
    reload: () => loadLogs(appliedFilters),
  };
}

export default useAccountsActivityLogs;
