import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

const EMPTY_SUMMARY = {
  fee_collected: 0,
  fee_outstanding: 0,
  payroll_paid: 0,
  payroll_pending: 0,
  other_income: 0,
  other_expense: 0,
  total_revenue: 0,
  total_cost: 0,
  net: 0,
};

/**
 * Accounts Admin > Financial Reports section.
 *
 * Backed by GET /api/accounts/financial-overview - the honest "Net
 * Balance" figure that the dashboard home page can't give on its own,
 * because it combines fee collections (a separate table) with the
 * general Income/Expense ledger and payroll, rather than just the
 * ledger alone.
 */
export function useFinancialOverview({ fetchWithAuth, showToast }) {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(false);

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchedRef = useRef(false);

  const load = useCallback(
    async (overrideMonth, overrideYear) => {
      if (!fetchWithAuth) return;

      const m = overrideMonth || month;
      const y = overrideYear || year;

      setLoading(true);
      try {
        const params = new URLSearchParams({ month: m, year: y });
        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/financial-overview?${params.toString()}`,
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to load financial overview");
        }

        setSummary({ ...EMPTY_SUMMARY, ...(data.summary || {}) });
        setTrend(Array.isArray(data.trend) ? data.trend : []);
      } catch (err) {
        console.error("useFinancialOverview:", err);
        showToast?.(err.message || "Failed to load financial overview", "error");
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth, month, year, showToast],
  );

  useEffect(() => {
    if (!fetchWithAuth) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    load();
  }, [fetchWithAuth, load]);

  const applyPeriod = useCallback(() => load(month, year), [load, month, year]);

  return {
    summary,
    trend,
    loading,
    month,
    setMonth,
    year,
    setYear,
    applyPeriod,
    reload: () => load(month, year),
  };
}

export default useFinancialOverview;
