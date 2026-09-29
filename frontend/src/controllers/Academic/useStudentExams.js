import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { BASE_URL } from "../../config/appConfig";

export function useStudentExams(fetchWithAuth, activeSection, showToast) {
  const [examLoading, setExamLoading] = useState(false);

  const [results, setResults] = useState([]);
  const [performance, setPerformance] = useState({ labels: [], marks: [] });
  const [upcomingExams, setUpcomingExams] = useState([]);

  const [filters, setFilters] = useState({ year: "all", exam: "all" });
  const [filterOptions, setFilterOptions] = useState({
    years: [],
    exams: [],
  });

  const performanceChartRef = useRef(null);
  const performanceChartInstance = useRef(null);

  // 🔐 Get User
  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  };

  // ================= FETCH EXAM DATA =================
  useEffect(() => {
    if (activeSection !== "exams" &&
        activeSection !== "dashboard"
    ) 
    return;

    const user = getUser();
    if (!user) return;

    const fetchExamData = async () => {
      try {
        setExamLoading(true);

        const [res, perfRes, upcomingRes] = await Promise.all([
          fetchWithAuth(
            `${BASE_URL}/results/${user.id}?year=${filters.year}&exam=${filters.exam}`
          ),
          fetchWithAuth(`${BASE_URL}/performance/${user.id}`),
          fetchWithAuth(`${BASE_URL}/upcoming-exams/${user.id}`),
        ]);

        setResults(await res.json());
        setPerformance(await perfRes.json());
        setUpcomingExams(await upcomingRes.json());
      } catch (err) {
        console.error(err);
        showToast("Failed to load exam data", "error");
      } finally {
        setExamLoading(false);
      }
    };

    fetchExamData();
  }, [activeSection, filters]);

  // ================= FILTER OPTIONS =================
  useEffect(() => {
    if (activeSection !== "exams" || examLoading) return;

    const user = getUser();
    if (!user) return;

    const fetchFilters = async () => {
      try {
        const res = await fetchWithAuth(
          `${BASE_URL}/results/filters/${user.id}`
        );

        const data = await res.json();

        setFilterOptions({
          years: data.years || [],
          exams: data.exams || [],
        });
      } catch (err) {
        console.error(err);
      }
    };

    fetchFilters();
  }, [activeSection]);

  // ================= CHART =================
  useEffect(() => {
    if (
      (activeSection !== "exams" &&
        activeSection !== "dashboard") ||
      examLoading
    ) return;

    if (!performanceChartRef.current) return;

    const dataReady =
      performance?.labels?.length &&
      performance?.marks?.length;

    if (!dataReady) return;

    // destroy old chart
    if (performanceChartInstance.current) {
      performanceChartInstance.current.destroy();
    }

    const ctx = performanceChartRef.current.getContext("2d");

    performanceChartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: performance.labels,
        datasets: [
          {
            label: "Marks",
            data: performance.marks,
            borderColor: "#3b82f6",
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    });

    return () => {
      performanceChartInstance.current?.destroy();
    };
  }, [performance, activeSection, examLoading]);

  // ================= FILTER CHANGE =================
  const handleFilterChange = (e) => {
    setFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // ================= DOWNLOAD PDF =================
  const handleDownloadResultsPDF = async () => {
    const user = getUser();

    try {
      const res = await fetchWithAuth(
        `${BASE_URL}/results/pdf/${user.id}`
      );

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "results.pdf";
      a.click();

      window.URL.revokeObjectURL(url);

      showToast("Results downloaded");
    } catch {
      showToast("Download failed", "error");
    }
  };

  return {
    examLoading,
    results,
    performance,
    upcomingExams,
    filters,
    filterOptions,
    performanceChartRef,
    handleFilterChange,
    handleDownloadResultsPDF,
  };
}