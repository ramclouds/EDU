import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

const EMPTY_SUMMARY = { total_income: 0, total_expense: 0, net: 0 };

const EMPTY_FILTERS = {
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
};

export function useExpenses({ fetchWithAuth, showToast }) {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const fetchedRef = useRef(false);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const loadExpenses = useCallback(
    async (overrideFilters) => {
      if (!fetchWithAuth) return;

      const active = overrideFilters || filters;

      setLoading(true);
      try {
        const params = new URLSearchParams({ entry_type: "Expense" });
        if (active.month) params.set("month", active.month);
        if (active.year) params.set("year", active.year);

        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/transactions?${params.toString()}`,
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to load expenses");
        }

        setExpenses(Array.isArray(data.transactions) ? data.transactions : []);
        setSummary({ ...EMPTY_SUMMARY, ...(data.summary || {}) });
      } catch (err) {
        console.error("useExpenses:", err);
        showToast?.(err.message || "Failed to load expenses", "error");
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
    loadExpenses(EMPTY_FILTERS);
  }, [fetchWithAuth, loadExpenses]);

  const applyFilters = useCallback(() => loadExpenses(filters), [loadExpenses, filters]);

  const addExpense = useCallback(
    async (payload) => {
      if (!fetchWithAuth) return false;

      setSaving(true);
      try {
        const res = await fetchWithAuth(`${BASE_URL}/accounts/transactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, entry_type: "Expense" }),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to add expense");
        }

        showToast?.("Expense recorded", "success");
        await loadExpenses(filters);
        return true;
      } catch (err) {
        showToast?.(err.message || "Failed to add expense", "error");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchWithAuth, showToast, loadExpenses, filters],
  );

  const updateExpense = useCallback(
    async (expenseId, payload) => {
      if (!fetchWithAuth) return false;

      setSaving(true);
      try {
        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/transactions/${expenseId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to update expense");
        }

        showToast?.("Expense updated", "success");
        await loadExpenses(filters);
        return true;
      } catch (err) {
        showToast?.(err.message || "Failed to update expense", "error");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchWithAuth, showToast, loadExpenses, filters],
  );

  const deleteExpense = useCallback(
    async (expenseId) => {
      if (!fetchWithAuth) return false;

      setSaving(true);
      try {
        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/transactions/${expenseId}`,
          { method: "DELETE" },
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to delete expense");
        }

        showToast?.("Expense deleted", "success");
        await loadExpenses(filters);
        return true;
      } catch (err) {
        showToast?.(err.message || "Failed to delete expense", "error");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchWithAuth, showToast, loadExpenses, filters],
  );

  const EMPTY_EXPENSE_FORM = {
    category: "",
    amount: "",
    transaction_date: "",
    payment_mode: "Cash",
    reference_no: "",
    description: "",
  };

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE_FORM);

  const updateExpenseForm = useCallback((key, value) => {
    setExpenseForm((f) => ({ ...f, [key]: value }));
  }, []);

  const resetExpenseForm = useCallback(() => {
    setExpenseForm(EMPTY_EXPENSE_FORM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitExpense = useCallback(async () => {
    const ok = await addExpense(expenseForm);
    if (ok) {
      resetExpenseForm();
      setShowExpenseForm(false);
    }
    return ok;
  }, [expenseForm, addExpense, resetExpenseForm]);

  return {
    expenses,
    summary,
    loading,
    saving,
    filters,
    updateFilter,
    applyFilters,
    addExpense,
    updateExpense,
    deleteExpense,
    reload: () => loadExpenses(filters),

    showExpenseForm,
    setShowExpenseForm,
    expenseForm,
    updateExpenseForm,
    submitExpense,
  };
}

export default useExpenses;
