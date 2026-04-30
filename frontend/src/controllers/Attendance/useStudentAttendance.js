import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { BASE_URL } from "../../config/appConfig";

export function useStudentAttendance(fetchWithAuth, activeSection, showToast) {
    const [attendance, setAttendance] = useState({
        summary: {},
        monthly: [],
        records: [],
    });

    const [attendanceLoading, setAttendanceLoading] = useState(false);

    const attendanceChartRef = useRef(null);
    const attendanceChartInstance = useRef(null);

    // 🔐 Get User
    const getUser = () => {
        try {
            return JSON.parse(localStorage.getItem("user"));
        } catch {
            return null;
        }
    };

    // ================= FETCH ATTENDANCE =================
    useEffect(() => {
        if (
            activeSection !== "attendance" &&
            activeSection !== "dashboard"
        ) return;

        const user = getUser();
        if (!user) return;

        const fetchAttendance = async () => {
            try {
                setAttendanceLoading(true);

                const res = await fetchWithAuth(
                    `${BASE_URL}/attendance/${user.id}`
                );

                const data = await res.json();
                setAttendance(data || {});
            } catch (err) {
                console.error(err);
                showToast("Failed to load attendance", "error");
            } finally {
                setAttendanceLoading(false);
            }
        };

        fetchAttendance();
    }, [activeSection]);

    // ================= DOWNLOAD PDF =================
    const handleDownloadAttendancePDF = async () => {
        const user = getUser();

        try {
            const res = await fetchWithAuth(
                `${BASE_URL}/attendance/pdf/${user.id}`
            );

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = "attendance.pdf";
            a.click();

            window.URL.revokeObjectURL(url);

            showToast("Attendance downloaded");
        } catch {
            showToast("Download failed", "error");
        }
    };

    // ================= CHART =================
    useEffect(() => {
        if (
            (activeSection !== "attendance" &&
                activeSection !== "dashboard") ||
            attendanceLoading
        ) return;

        if (!attendanceChartRef.current) return;

        const dataReady =
            attendance?.summary &&
            typeof attendance.summary.present !== "undefined";

        if (!dataReady) return;

        // destroy old chart
        if (attendanceChartInstance.current) {
            attendanceChartInstance.current.destroy();
        }

        const ctx = attendanceChartRef.current.getContext("2d");

        attendanceChartInstance.current = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: ["Present", "Absent", "Late"],
                datasets: [
                    {
                        data: [
                            attendance.summary.present || 0,
                            attendance.summary.absent || 0,
                            attendance.summary.late || 0,
                        ],
                        backgroundColor: ["#22c55e", "#ef4444", "#facc15"],
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
            },
        });

        return () => {
            attendanceChartInstance.current?.destroy();
        };
    }, [attendance, activeSection, attendanceLoading]);

    return {
        attendance,
        attendanceLoading,
        attendanceChartRef,
        handleDownloadPDF: handleDownloadAttendancePDF,
    };
}