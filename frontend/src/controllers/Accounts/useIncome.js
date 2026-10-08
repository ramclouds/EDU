import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

const EMPTY_SUMMARY = { total_income: 0, total_expense: 0, net: 0 };

const EMPTY_FILTERS = {
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
};

const EMPTY_INCOME_FORM = {
  category: "",
  amount: "",
  transaction_date: "",
  payment_mode: "Cash",
  reference_no: "",
  description: "",
  bank_account_id: "",
};

/**
 * Accounts Admin > Income section.
 *
 * Mirrors useExpenses.js but scoped to entry_type=Income, reusing the
 * same general ledger endpoints. Owns its own add-income form state,
 * including which bank account (if any) the money landed in.
 */
export function useIncome({ fetchWithAuth, showToast }) {
  const [incomes, setIncomes] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [incomeForm, setIncomeForm] = useState(EMPTY_INCOME_FORM);

  const fetchedRef = useRef(false);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateIncomeForm = useCallback((key, value) => {
    setIncomeForm((f) => ({ ...f, [key]: value }));
  }, []);

  const resetIncomeForm = useCallback(() => {
    setIncomeForm(EMPTY_INCOME_FORM);
  }, []);

  const loadIncomes = useCallback(
    async (overrideFilters) => {
      if (!fetchWithAuth) return;

      const active = overrideFilters || filters;

      setLoading(true);
      try {
        const params = new URLSearchParams({ entry_type: "Income" });
        if (active.month) params.set("month", active.month);
        if (active.year) params.set("year", active.year);

        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/transactions?${params.toString()}`,
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to load income");
        }

        setIncomes(Array.isArray(data.transactions) ? data.transactions : []);
        setSummary({ ...EMPTY_SUMMARY, ...(data.summary || {}) });
      } catch (err) {
        console.error("useIncome:", err);
        showToast?.(err.message || "Failed to load income", "error");
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
    loadIncomes(EMPTY_FILTERS);
  }, [fetchWithAuth, loadIncomes]);

  const applyFilters = useCallback(() => loadIncomes(filters), [loadIncomes, filters]);

  const addIncome = useCallback(
    async (payload) => {
      if (!fetchWithAuth) return false;

      setSaving(true);
      try {
        const res = await fetchWithAuth(`${BASE_URL}/accounts/transactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            entry_type: "Income",
            bank_account_id: payload.bank_account_id || null,
          }),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to add income");
        }

        showToast?.("Income recorded", "success");
        await loadIncomes(filters);
        return true;
      } catch (err) {
        showToast?.(err.message || "Failed to add income", "error");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchWithAuth, showToast, loadIncomes, filters],
  );

  const deleteIncome = useCallback(
    async (incomeId) => {
      if (!fetchWithAuth) return false;

      setSaving(true);
      try {
        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/transactions/${incomeId}`,
          { method: "DELETE" },
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to delete income");
        }

        showToast?.("Income deleted", "success");
        await loadIncomes(filters);
        return true;
      } catch (err) {
        showToast?.(err.message || "Failed to delete income", "error");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchWithAuth, showToast, loadIncomes, filters],
  );

  const submitIncome = useCallback(async () => {
    const ok = await addIncome(incomeForm);
    if (ok) {
      resetIncomeForm();
      setShowIncomeForm(false);
    }
    return ok;
  }, [incomeForm, addIncome, resetIncomeForm]);

  return {
    incomes,
    summary,
    loading,
    saving,
    filters,
    updateFilter,
    applyFilters,
    deleteIncome,
    reload: () => loadIncomes(filters),

    showIncomeForm,
    setShowIncomeForm,
    incomeForm,
    updateIncomeForm,
    submitIncome,
  };
}

export default useIncome;
