import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

/**
 * Accounts Admin > Expense Categories section.
 *
 * Manages the category list used by the Expenses form
 * (GET/POST /api/accounts/expense-categories, PUT/DELETE .../<id>).
 * Each category comes back with this month's spend against it, so a
 * budget can be tracked instead of categories being free-text with no
 * oversight.
 */
export function useExpenseCategories({ fetchWithAuth, showToast }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchedRef = useRef(false);

  const loadCategories = useCallback(async () => {
    if (!fetchWithAuth) return;

    setLoading(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/accounts/expense-categories`);
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to load expense categories");
      }

      setCategories(Array.isArray(data.expense_categories) ? data.expense_categories : []);
    } catch (err) {
      console.error("useExpenseCategories:", err);
      showToast?.(err.message || "Failed to load expense categories", "error");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, showToast]);

  useEffect(() => {
    if (!fetchWithAuth) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadCategories();
  }, [fetchWithAuth, loadCategories]);

  const createCategory = useCallback(
    async (payload) => {
      if (!fetchWithAuth) return false;

      setSaving(true);
      try {
        const res = await fetchWithAuth(`${BASE_URL}/accounts/expense-categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to create category");
        }

        showToast?.("Expense category created", "success");
        await loadCategories();
        return true;
      } catch (err) {
        showToast?.(err.message || "Failed to create category", "error");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchWithAuth, showToast, loadCategories],
  );

  const updateCategory = useCallback(
    async (categoryId, payload) => {
      if (!fetchWithAuth) return false;

      setSaving(true);
      try {
        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/expense-categories/${categoryId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to update category");
        }

        showToast?.("Category updated", "success");
        await loadCategories();
        return true;
      } catch (err) {
        showToast?.(err.message || "Failed to update category", "error");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchWithAuth, showToast, loadCategories],
  );

  const deleteCategory = useCallback(
    async (categoryId) => {
      if (!fetchWithAuth) return false;

      setSaving(true);
      try {
        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/expense-categories/${categoryId}`,
          { method: "DELETE" },
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to delete category");
        }

        showToast?.("Category deleted", "success");
        await loadCategories();
        return true;
      } catch (err) {
        showToast?.(err.message || "Failed to delete category", "error");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchWithAuth, showToast, loadCategories],
  );

  const EMPTY_CATEGORY_FORM = { name: "", description: "", monthly_budget: "" };

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY_FORM);

  const updateCategoryForm = useCallback((key, value) => {
    setCategoryForm((f) => ({ ...f, [key]: value }));
  }, []);

  const resetCategoryForm = useCallback(() => {
    setCategoryForm(EMPTY_CATEGORY_FORM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitCategory = useCallback(async () => {
    const ok = await createCategory(categoryForm);
    if (ok) {
      resetCategoryForm();
      setShowCategoryForm(false);
    }
    return ok;
  }, [categoryForm, createCategory, resetCategoryForm]);

  return {
    categories,
    loading,
    saving,
    reload: loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,

    showCategoryForm,
    setShowCategoryForm,
    categoryForm,
    updateCategoryForm,
    submitCategory,
  };
}

export default useExpenseCategories;
