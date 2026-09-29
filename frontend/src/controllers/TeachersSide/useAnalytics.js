import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { BASE_URL } from "../../config/appConfig";

export function useAnalytics(
    fetchWithAuth,
    activeSection,
    showToast
) {
    const [analyticsLoading, setAnalyticsLoading] =
        useState(false);

    const [analytics, setAnalytics] = useState(null);

    const [filters, setFilters] = useState({
        class_id: "all",
        subject_id: "all",
    });

    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);

    const performanceChartRef = useRef(null);
    const subjectChartRef = useRef(null);

    const performanceChartInstance = useRef(null);
    const subjectChartInstance = useRef(null);

    // ================= GET USER =================
    const getUser = () => {
        try {
            return JSON.parse(localStorage.getItem("user"));
        } catch {
            return null;
        }
    };

    // ================= FETCH FILTERS =================
    useEffect(() => {
        if (activeSection !== "analytics" &&
            activeSection !== "dashboard"
        )
            return;

        const user = getUser();

        if (!user) return;

        const fetchFilters = async () => {
            try {
                const [classRes, subjectRes] = await Promise.all([
                    fetchWithAuth(
                        `${BASE_URL}/teacher/classes?teacher_id=${user.id}`
                    ),

                    fetchWithAuth(
                        `${BASE_URL}/teacher/subjects?teacher_id=${user.id}`
                    ),
                ]);

                setClasses(await classRes.json());

                setSubjects(await subjectRes.json());
            } catch (err) {
                console.error(err);
            }
        };

        fetchFilters();
    }, [activeSection]);

    // ================= FETCH ANALYTICS =================
    useEffect(() => {
        if (activeSection !== "analytics" &&
            activeSection !== "dashboard")
            return;

        const user = getUser();

        if (!user) return;

        const fetchAnalytics = async () => {
            try {
                setAnalyticsLoading(true);

                const res = await fetchWithAuth(
                    `${BASE_URL}/teacher/analytics?teacher_id=${user.id}&class_id=${filters.class_id}&subject_id=${filters.subject_id}`
                );

                const data = await res.json();

                setAnalytics(data);
            } catch (err) {
                console.error(err);

                showToast("Failed to load analytics", "error");
            } finally {
                setAnalyticsLoading(false);
            }
        };

        fetchAnalytics();
    }, [activeSection, filters]);

    // ================= PERFORMANCE CHART =================
    useEffect(() => {
        if (!analytics?.performanceChart) return;

        if (!performanceChartRef.current) return;

        if (performanceChartInstance.current) {
            performanceChartInstance.current.destroy();
        }

        const ctx =
            performanceChartRef.current.getContext("2d");

        performanceChartInstance.current = new Chart(ctx, {
            type: "bar",
            data: {
                labels: analytics.performanceChart.labels,
                datasets: [
                    {
                        label: "Performance %",
                        data: analytics.performanceChart.data,
                        backgroundColor: "#6366f1",
                        borderRadius: 10,
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
    }, [analytics]);

    // ================= SUBJECT CHART =================
    useEffect(() => {
        if (!analytics?.subjectChart) return;

        if (!subjectChartRef.current) return;

        if (subjectChartInstance.current) {
            subjectChartInstance.current.destroy();
        }

        const ctx =
            subjectChartRef.current.getContext("2d");

        subjectChartInstance.current = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: analytics.subjectChart.labels,
                datasets: [
                    {
                        data: analytics.subjectChart.data,
                        backgroundColor: [
                            "#6366f1",
                            "#10b981",
                            "#f59e0b",
                            "#ef4444",
                            "#8b5cf6",
                        ],
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
            },
        });

        return () => {
            subjectChartInstance.current?.destroy();
        };
    }, [analytics]);

    // ================= FILTER CHANGE ================   =
    const handleFilterChange = (e) => {
        setFilters((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    // ================= DOWNLOAD =================
    const handleDownloadAnalytics = async () => {

        try {

            const user = getUser();
            const res = await fetchWithAuth(
                `${BASE_URL}/teacher/analytics/pdf?teacher_id=${user.id}&class_id=${filters.class_id}&subject_id=${filters.subject_id}`
            );
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "teacher_analytics_report.pdf";
            a.click();
            window.URL.revokeObjectURL(url);
            showToast("Analytics report downloaded");

        } catch (err) {

            console.error(err);
            showToast(
                "Failed to download report",
                "error"
            );
        }
    };

    return {
        analyticsLoading,
        analytics,
        classes,
        subjects,
        filters,
        performanceChartRef,
        subjectChartRef,
        handleFilterChange,
        handleDownloadAnalytics,
        dashboardPerformanceChartRef: performanceChartRef,
    };
}