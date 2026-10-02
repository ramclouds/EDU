import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

const EMPTY_SUMMARY = {
  count: 0,
  overdue_count: 0,
  total_pending_amount: 0,
};

const EMPTY_FILTERS = {
  search: "",
  status: "",
};

/**
 * Accounts Admin > Pending Fees section.
 *
 * School-wide list of every Pending/Partial/Overdue installment
 * (GET /api/accounts/fees/pending). Each row carries the owning
 * student's id, so clicking one can open the exact same fee modal
 * used in the Students section (useStudentFeeDetails) - that's the
 * "link between this and the Students section" the dashboard needs.
 */
export function usePendingFees({ fetchWithAuth, showToast }) {
  const [pendingFees, setPendingFees] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

  const fetchedRef = useRef(false);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  }, []);

  const applyFilters = useCallback(() => {
    setAppliedFilters(filters);
  }, [filters]);

  const loadPendingFees = useCallback(
    async (overrideFilters) => {
      if (!fetchWithAuth) return;

      const activeFilters = overrideFilters || appliedFilters;

      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (activeFilters.search) params.set("search", activeFilters.search);
        if (activeFilters.status) params.set("status", activeFilters.status);

        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/fees/pending?${params.toString()}`,
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to load pending fees");
        }

        setPendingFees(Array.isArray(data.pending_fees) ? data.pending_fees : []);
        setSummary({ ...EMPTY_SUMMARY, ...(data.summary || {}) });
      } catch (err) {
        console.error("usePendingFees:", err);
        showToast?.(err.message || "Failed to load pending fees", "error");
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth, appliedFilters, showToast],
  );

  useEffect(() => {
    if (!fetchWithAuth) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadPendingFees(EMPTY_FILTERS);
  }, [fetchWithAuth, loadPendingFees]);

  useEffect(() => {
    if (!fetchedRef.current) return;
    loadPendingFees(appliedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters]);

  // Fires the "due date alert" workflow: sends one reminder
  // notification per student who has a due-soon or overdue balance
  // (POST /api/accounts/fees/send-reminders). There's no scheduler in
  // this app, so this button click IS the trigger - point a daily
  // cron/task scheduler at that same URL for a fully automatic
  // version instead of a manual click.
  const sendReminders = useCallback(
    async (daysAhead = 3) => {
      if (!fetchWithAuth) return false;

      setSendingReminders(true);
      try {
        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/fees/send-reminders`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ days_ahead: daysAhead }),
          },
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to send reminders");
        }

        showToast?.(
          data.sent_count > 0
            ? `Reminders sent to ${data.sent_count} student(s)${
                data.skipped_count
                  ? ` (${data.skipped_count} already reminded today)`
                  : ""
              }`
            : "Everyone with a due balance was already reminded today",
          "success",
        );
        return true;
      } catch (err) {
        showToast?.(err.message || "Failed to send reminders", "error");
        return false;
      } finally {
        setSendingReminders(false);
      }
    },
    [fetchWithAuth, showToast],
  );

  return {
    pendingFees,
    summary,
    loading,
    filters,
    updateFilter,
    applyFilters,
    resetFilters,
    reload: () => loadPendingFees(appliedFilters),
    sendReminders,
    sendingReminders,
  };
}

export default usePendingFees;
