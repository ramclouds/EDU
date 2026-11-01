import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

const EMPTY_STATS = {
  total: 0,
  active: 0,
  inactive: 0,
  unassigned: 0,
};

const EMPTY_FILTERS = {
  search: "",
  status: "",
};

export function useAccountsStudents({ fetchWithAuth, showToast }) {
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

  const [selectedStudent, setSelectedStudent] = useState(null);

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

  const loadStudents = useCallback(
    async (overrideFilters) => {
      if (!fetchWithAuth) return;

      const activeFilters = overrideFilters || appliedFilters;

      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();

        if (activeFilters.search) params.set("search", activeFilters.search);
        if (activeFilters.status) params.set("status", activeFilters.status);

        const res = await fetchWithAuth(
          `${BASE_URL}/admin/students?${params.toString()}`,
        );

        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to load students");
        }

        setStudents(Array.isArray(data.students) ? data.students : []);
        setStats({ ...EMPTY_STATS, ...(data.stats || {}) });
      } catch (err) {
        console.error("useAccountsStudents:", err);
        setError(err.message || "Failed to load students");
        showToast?.(err.message || "Failed to load students", "error");
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth, appliedFilters, showToast],
  );

  // Initial load (StrictMode-safe, mirrors useStudentProfile/useTeacherProfile)
  useEffect(() => {
    if (!fetchWithAuth) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    loadStudents(EMPTY_FILTERS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchWithAuth]);

  // Re-fetch whenever "Apply" changes the applied filters
  useEffect(() => {
    if (!fetchedRef.current) return;
    loadStudents(appliedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters]);

  const displayName = useCallback((student) => {
    if (!student) return "";
    return (
      student.full_name ||
      [student.first_name, student.middle_name, student.last_name]
        .filter(Boolean)
        .join(" ")
    );
  }, []);

  return {
    students,
    stats,
    loading,
    error,

    filters,
    appliedFilters,
    updateFilter,
    applyFilters,
    resetFilters,
    reloadStudents: () => loadStudents(appliedFilters),

    selectedStudent,
    setSelectedStudent,

    displayName,
  };
}

export default useAccountsStudents;
