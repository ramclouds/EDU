import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

const EMPTY_STATS = { total: 0, set_up: 0, not_set_up: 0 };

const EMPTY_FILTERS = {
  search: "",
  category: "",
  setup: "",
};

export const SALARY_CATEGORY_TABS = [
  { value: "", label: "All Staff" },
  { value: "teaching", label: "Teaching Staff" },
  { value: "non-teaching", label: "Non-Teaching Staff" },
  { value: "admin", label: "Admin Staff" },
];

/**
 * Accounts Admin > Salary Management section.
 *
 * Whole-roster view (GET /api/accounts/payroll/staff) of every
 * teacher/non-teaching-staff/admin with their salary setup status.
 * Clicking a row opens the same per-person salary modal
 * (useStaffSalaryDetails) as the Staff section, so this is purely a
 * "who still needs a salary structure" worklist, not a separate data
 * entry surface.
 */
export function useSalaryManagement({ fetchWithAuth, showToast }) {
  const [staff, setStaff] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

  const fetchedRef = useRef(false);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setCategory = useCallback((category) => {
    setFilters((prev) => ({ ...prev, category }));
    setAppliedFilters((prev) => ({ ...prev, category }));
  }, []);

  const setSetupFilter = useCallback((setup) => {
    setFilters((prev) => ({ ...prev, setup }));
    setAppliedFilters((prev) => ({ ...prev, setup }));
  }, []);

  const applyFilters = useCallback(() => setAppliedFilters(filters), [filters]);
  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  }, []);

  const loadStaff = useCallback(
    async (overrideFilters) => {
      if (!fetchWithAuth) return;

      const active = overrideFilters || appliedFilters;

      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (active.search) params.set("search", active.search);
        if (active.category) params.set("category", active.category);
        if (active.setup) params.set("setup", active.setup);

        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/payroll/staff?${params.toString()}`,
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to load salary data");
        }

        setStaff(Array.isArray(data.staff) ? data.staff : []);
        setStats({ ...EMPTY_STATS, ...(data.stats || {}) });
      } catch (err) {
        console.error("useSalaryManagement:", err);
        showToast?.(err.message || "Failed to load salary data", "error");
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
    loadStaff(EMPTY_FILTERS);
  }, [fetchWithAuth, loadStaff]);

  useEffect(() => {
    if (!fetchedRef.current) return;
    loadStaff(appliedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters]);

  return {
    staff,
    stats,
    loading,
    filters,
    updateFilter,
    setCategory,
    setSetupFilter,
    applyFilters,
    resetFilters,
    reload: () => loadStaff(appliedFilters),
  };
}

export default useSalaryManagement;
