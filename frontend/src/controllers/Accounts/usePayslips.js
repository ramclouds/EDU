import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

const EMPTY_SUMMARY = { count: 0, paid_amount: 0, pending_amount: 0 };

const EMPTY_FILTERS = {
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  status: "",
};

/**
 * Accounts Admin > Payslips section.
 *
 * Roster-wide payslip list (GET /api/accounts/payslips) plus the "Run
 * Payroll" bulk action (POST /api/accounts/payroll/run) that generates
 * a payslip for everyone with a salary structure who doesn't already
 * have one for the selected month. Marking a payslip paid reuses
 * markPayslipPaid from useStaffSalaryDetails at the call site, so
 * there's one source of truth for that action across the dashboard.
 */
export function usePayslips({ fetchWithAuth, showToast }) {
  const [payslips, setPayslips] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [runningPayroll, setRunningPayroll] = useState(false);

  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const fetchedRef = useRef(false);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const loadPayslips = useCallback(
    async (overrideFilters) => {
      if (!fetchWithAuth) return;

      const active = overrideFilters || filters;

      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (active.month) params.set("month", active.month);
        if (active.year) params.set("year", active.year);
        if (active.status) params.set("status", active.status);

        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/payslips?${params.toString()}`,
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to load payslips");
        }

        setPayslips(Array.isArray(data.payslips) ? data.payslips : []);
        setSummary({ ...EMPTY_SUMMARY, ...(data.summary || {}) });
      } catch (err) {
        console.error("usePayslips:", err);
        showToast?.(err.message || "Failed to load payslips", "error");
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth, filters, showToast],
  );

  useEffect(() => {
    if (!fetchWithAuth) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadPayslips(EMPTY_FILTERS);
  }, [fetchWithAuth, loadPayslips]);

  const applyFilters = useCallback(() => loadPayslips(filters), [loadPayslips, filters]);

  const runPayroll = useCallback(async () => {
    if (!fetchWithAuth) return false;

    setRunningPayroll(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/accounts/payroll/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: filters.month, year: filters.year }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to run payroll");
      }

      showToast?.(
        `${data.created_count} payslip(s) generated${
          data.skipped_count ? ` (${data.skipped_count} already existed)` : ""
        }`,
        "success",
      );
      await loadPayslips(filters);
      return true;
    } catch (err) {
      showToast?.(err.message || "Failed to run payroll", "error");
      return false;
    } finally {
      setRunningPayroll(false);
    }
  }, [fetchWithAuth, showToast, filters, loadPayslips]);

  return {
    payslips,
    summary,
    loading,
    runningPayroll,
    filters,
    updateFilter,
    applyFilters,
    runPayroll,
    reload: () => loadPayslips(filters),
  };
}

export default usePayslips;
