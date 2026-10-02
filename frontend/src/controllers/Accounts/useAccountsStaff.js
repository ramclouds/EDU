import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

const EMPTY_STATS = {
  total: 0,
  teaching: 0,
  non_teaching: 0,
  admin: 0,
  active: 0,
  inactive: 0,
};

const EMPTY_FILTERS = {
  search: "",
  category: "", // "" = all, "teaching" | "non-teaching" | "admin"
  status: "",
};

export const STAFF_CATEGORY_TABS = [
  { value: "", label: "All Staff" },
  { value: "teaching", label: "Teaching Staff" },
  { value: "non-teaching", label: "Non-Teaching Staff" },
  { value: "admin", label: "Admin Staff" },
];

/**
 * Accounts Admin > Staff section.
 *
 * Backed by GET /api/admin/staff (utils/staffDirectory.py
 * AdminStaffListAPI), which merges Teacher + NonTeachingStaff (aka
 * "Staff") + Admin into one roster - everyone on payroll who isn't a
 * student. Read-only directory; editing a person still happens through
 * their own type-specific management screen.
 */
export function useAccountsStaff({ fetchWithAuth, showToast }) {
  const [staff, setStaff] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

  const [selectedStaff, setSelectedStaff] = useState(null);

  const fetchedRef = useRef(false);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setCategory = useCallback((category) => {
    setFilters((prev) => ({ ...prev, category }));
    setAppliedFilters((prev) => ({ ...prev, category }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  }, []);

  const applyFilters = useCallback(() => {
    setAppliedFilters(filters);
  }, [filters]);

  const loadStaff = useCallback(
    async (overrideFilters) => {
      if (!fetchWithAuth) return;

      const activeFilters = overrideFilters || appliedFilters;

      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();

        if (activeFilters.search) params.set("search", activeFilters.search);
        if (activeFilters.category)
          params.set("category", activeFilters.category);
        if (activeFilters.status) params.set("status", activeFilters.status);

        const res = await fetchWithAuth(
          `${BASE_URL}/admin/staff?${params.toString()}`,
        );

        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to load staff");
        }

        setStaff(Array.isArray(data.staff) ? data.staff : []);
        setStats({ ...EMPTY_STATS, ...(data.stats || {}) });
      } catch (err) {
        console.error("useAccountsStaff:", err);
        setError(err.message || "Failed to load staff");
        showToast?.(err.message || "Failed to load staff", "error");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchWithAuth]);

  useEffect(() => {
    if (!fetchedRef.current) return;
    loadStaff(appliedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters]);

  return {
    staff,
    stats,
    loading,
    error,

    filters,
    appliedFilters,
    updateFilter,
    setCategory,
    applyFilters,
    resetFilters,
    reloadStaff: () => loadStaff(appliedFilters),

    selectedStaff,
    setSelectedStaff,
  };
}

export default useAccountsStaff;
