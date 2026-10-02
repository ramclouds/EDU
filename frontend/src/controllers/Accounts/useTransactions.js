import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

const EMPTY_SUMMARY = { total_income: 0, total_expense: 0, net: 0 };

const EMPTY_FILTERS = {
  entry_type: "",
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  bank_account_id: "",
};

/**
 * Accounts Admin > Transactions section.
 *
 * The master ledger view - every AccountsTransaction (Income and
 * Expense together), filterable by type, month/year and bank account.
 * Creation happens in the dedicated Income/Expenses sections; this
 * section is for reviewing and reconciling, so it only needs
 * read + delete.
 */
export function useTransactions({ fetchWithAuth, showToast }) {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const fetchedRef = useRef(false);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const loadTransactions = useCallback(
    async (overrideFilters) => {
      if (!fetchWithAuth) return;

      const active = overrideFilters || filters;

      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (active.entry_type) params.set("entry_type", active.entry_type);
        if (active.month) params.set("month", active.month);
        if (active.year) params.set("year", active.year);
        if (active.bank_account_id) params.set("bank_account_id", active.bank_account_id);

        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/transactions?${params.toString()}`,
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to load transactions");
        }

        setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
        setSummary({ ...EMPTY_SUMMARY, ...(data.summary || {}) });
      } catch (err) {
        console.error("useTransactions:", err);
        showToast?.(err.message || "Failed to load transactions", "error");
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
    loadTransactions(EMPTY_FILTERS);
  }, [fetchWithAuth, loadTransactions]);

  const applyFilters = useCallback(
    () => loadTransactions(filters),
    [loadTransactions, filters],
  );

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    loadTransactions(EMPTY_FILTERS);
  }, [loadTransactions]);

  const deleteTransaction = useCallback(
    async (transactionId) => {
      if (!fetchWithAuth) return false;

      setDeleting(true);
      try {
        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/transactions/${transactionId}`,
          { method: "DELETE" },
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to delete transaction");
        }

        showToast?.("Transaction deleted", "success");
        await loadTransactions(filters);
        return true;
      } catch (err) {
        showToast?.(err.message || "Failed to delete transaction", "error");
        return false;
      } finally {
        setDeleting(false);
      }
    },
    [fetchWithAuth, showToast, loadTransactions, filters],
  );

  return {
    transactions,
    summary,
    loading,
    deleting,
    filters,
    updateFilter,
    applyFilters,
    resetFilters,
    deleteTransaction,
    reload: () => loadTransactions(filters),
  };
}

export default useTransactions;
