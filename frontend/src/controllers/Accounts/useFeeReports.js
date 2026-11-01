import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

const EMPTY_SUMMARY = {
  total_billed: 0,
  total_collected: 0,
  total_outstanding: 0,
  collection_rate: 0,
};

export function useFeeReports({ fetchWithAuth, showToast }) {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [paymentModeBreakdown, setPaymentModeBreakdown] = useState([]);
  const [batchBreakdown, setBatchBreakdown] = useState([]);
  const [topDefaulters, setTopDefaulters] = useState([]);
  const [loading, setLoading] = useState(false);

  const [academicYear, setAcademicYear] = useState("");

  const fetchedRef = useRef(false);

  const loadReports = useCallback(
    async (year) => {
      if (!fetchWithAuth) return;

      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (year) params.set("academic_year", year);

        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/fees/reports?${params.toString()}`,
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to load fee reports");
        }

        setSummary({ ...EMPTY_SUMMARY, ...(data.summary || {}) });
        setMonthlyTrend(Array.isArray(data.monthly_trend) ? data.monthly_trend : []);
        setCategoryBreakdown(
          Array.isArray(data.category_breakdown) ? data.category_breakdown : [],
        );
        setPaymentModeBreakdown(
          Array.isArray(data.payment_mode_breakdown) ? data.payment_mode_breakdown : [],
        );
        setBatchBreakdown(
          Array.isArray(data.batch_breakdown) ? data.batch_breakdown : [],
        );
        setTopDefaulters(
          Array.isArray(data.top_defaulters) ? data.top_defaulters : [],
        );
      } catch (err) {
        console.error("useFeeReports:", err);
        showToast?.(err.message || "Failed to load fee reports", "error");
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth, showToast],
  );

  useEffect(() => {
    if (!fetchWithAuth) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadReports("");
  }, [fetchWithAuth, loadReports]);

  const applyAcademicYear = useCallback(
    (year) => {
      setAcademicYear(year);
      loadReports(year);
    },
    [loadReports],
  );

  return {
    summary,
    monthlyTrend,
    categoryBreakdown,
    paymentModeBreakdown,
    batchBreakdown,
    topDefaulters,
    loading,
    academicYear,
    setAcademicYear,
    applyAcademicYear,
    reload: () => loadReports(academicYear),
  };
}

export default useFeeReports;
