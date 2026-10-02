import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

const EMPTY_SUMMARY = {
  total_outstanding: 0,
  overdue_installments: 0,
  collected_this_month: 0,
};

/**
 * Accounts Admin > Fee Collection section.
 *
 * Top-of-page stats + a recent-payments feed (GET /api/accounts/fees/summary),
 * plus a "find a student to collect from" quick search that reuses the
 * same roster endpoint the Students section uses
 * (GET /api/admin/students) - the actual payment recording happens in
 * the shared student fee modal (useStudentFeeDetails), so this hook
 * only needs to find the student, not talk to the payments endpoint
 * itself.
 */
export function useFeeCollection({ fetchWithAuth, showToast }) {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const fetchedRef = useRef(false);
  const searchDebounce = useRef(null);

  const loadSummary = useCallback(async () => {
    if (!fetchWithAuth) return;

    setLoading(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/accounts/fees/summary`);
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to load fee collection data");
      }

      setSummary({ ...EMPTY_SUMMARY, ...(data.summary || {}) });
      setRecentPayments(Array.isArray(data.recent_payments) ? data.recent_payments : []);
    } catch (err) {
      console.error("useFeeCollection:", err);
      showToast?.(err.message || "Failed to load fee collection data", "error");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, showToast]);

  useEffect(() => {
    if (!fetchWithAuth) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadSummary();
  }, [fetchWithAuth, loadSummary]);

  const searchStudents = useCallback(
    (term) => {
      setSearchTerm(term);

      if (searchDebounce.current) clearTimeout(searchDebounce.current);

      if (!term || term.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      searchDebounce.current = setTimeout(async () => {
        if (!fetchWithAuth) return;

        setSearching(true);
        try {
          const params = new URLSearchParams({ search: term.trim() });
          const res = await fetchWithAuth(`${BASE_URL}/admin/students?${params.toString()}`);
          const data = await res.json().catch(() => null);

          if (!res.ok || !data?.success) {
            throw new Error(data?.error || "Search failed");
          }

          setSearchResults(Array.isArray(data.students) ? data.students.slice(0, 8) : []);
        } catch (err) {
          console.error("useFeeCollection search:", err);
        } finally {
          setSearching(false);
        }
      }, 350);
    },
    [fetchWithAuth],
  );

  const clearSearch = useCallback(() => {
    setSearchTerm("");
    setSearchResults([]);
  }, []);

  return {
    summary,
    recentPayments,
    loading,
    reload: loadSummary,

    searchTerm,
    searchResults,
    searching,
    searchStudents,
    clearSearch,
  };
}

export default useFeeCollection;
