import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

const EMPTY_STATEMENT = {
  revenue: { fee_collections: 0, other_income: [], total: 0 },
  expenses: { payroll: 0, other_expenses: [], total: 0 },
  net_profit: 0,
};

const EMPTY_PREVIOUS = { label: "", net_profit: 0, total_revenue: 0, total_expense: 0 };

/**
 * Accounts Admin > Profit & Loss section.
 *
 * Backed by GET /api/accounts/profit-loss: a classic P&L for one
 * month - revenue (fees + other income by category), expenses
 * (payroll + other expenses by category), net profit/loss, and the
 * previous month's totals for a quick comparison.
 */
export function useProfitLoss({ fetchWithAuth, showToast }) {
  const [statement, setStatement] = useState(EMPTY_STATEMENT);
  const [previousPeriod, setPreviousPeriod] = useState(EMPTY_PREVIOUS);
  const [periodLabel, setPeriodLabel] = useState("");
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
          `${BASE_URL}/accounts/profit-loss?${params.toString()}`,
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to load profit & loss statement");
        }

        setStatement({ ...EMPTY_STATEMENT, ...(data.statement || {}) });
        setPreviousPeriod({ ...EMPTY_PREVIOUS, ...(data.previous_period || {}) });
        setPeriodLabel(data.period?.label || "");
      } catch (err) {
        console.error("useProfitLoss:", err);
        showToast?.(err.message || "Failed to load profit & loss statement", "error");
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
    statement,
    previousPeriod,
    periodLabel,
    loading,
    month,
    setMonth,
    year,
    setYear,
    applyPeriod,
    reload: () => load(month, year),
  };
}

export default useProfitLoss;
