import { useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

export function useTeacherAttendance({
    activeSection,
    fetchWithAuth,
    showToast
}) {

    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [selectedMonth, setSelectedMonth] = useState(
        new Date().toISOString().slice(0, 7)
    );
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedDate, setSelectedDate] = useState("");
    const dashboardAttendanceChartRef = useRef(null);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [dashboardAttendance, setDashboardAttendance] = useState({
        totalClasses: 0,
        totalStudents: 0,
        todayPresent: 0,
        todayAbsent: 0,
        todayLate: 0,
        attendanceRate: 0,
        weeklyChart: [],
        pendingAttendance: 0,
    });

    const [attendanceCounts, setAttendanceCounts] = useState({
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        pending: 0,
    });

    // ================= USER =================
    const getUser = () => {
        try {
            return JSON.parse(localStorage.getItem("user"));
        } catch {
            return null;
        }
    };

    // ================= GET TODAY DATE =================
    const getTodayDate = () => {
        const today = new Date();
        return today.toISOString().split("T")[0]; // yyyy-mm-dd
    };

    // ================= CLASSES =================
    const fetchClasses = async () => {
        const user = getUser();
        if (!user) return;

        try {
            const res = await fetchWithAuth(
                `${BASE_URL}/teacher/classes/${user.id}`
            );

            const data = await res.json();
            const list = data || [];

            setClasses(list);

        } catch (err) {
            console.error(err);
            showToast("Failed to load classes", "error");
        }
    };

    // ================= COUNTS =================
    const updateCounts = (attData, totalStudents) => {
        const values = Object.values(attData || {});

        const present = values.filter(v => v.status === "Present").length;
        const absent = values.filter(v => v.status === "Absent").length;
        const late = values.filter(v => v.status === "Late").length;

        const pending =
            totalStudents - (present + absent + late);

        setAttendanceCounts({
            total: totalStudents,
            present,
            absent,
            late,
            pending: pending < 0 ? 0 : pending,
        });
    };

    // ================= FETCH STUDENTS + ATTENDANCE =================
    const fetchStudents = async (selectedClassObj, date) => {
        if (!selectedClassObj || !date) return;

        try {
            setAttendanceLoading(true);

            // 1️⃣ Students
            const res = await fetchWithAuth(
                `${BASE_URL}/students/by-class/${selectedClassObj.academic_class_id}`
            );

            const data = await res.json();
            const list = data || [];

            setStudents(list);

            // 2️⃣ Default Pending
            const initial = {};
            list.forEach((s) => {
                initial[s.student_id] = {
                    status: "Pending",
                    remarks: ""
                };
            });

            // 3️⃣ Existing Attendance
            try {
                const res2 = await fetchWithAuth(
                    `${BASE_URL}/attendance?academic_class_id=${selectedClassObj.academic_class_id}&subject_id=${selectedClassObj.subject_id}&date=${date}`
                );

                const existing = await res2.json();

                Object.keys(existing || {}).forEach((id) => {
                    initial[id] = {
                        status: existing[id].status || existing[id],
                        remarks: existing[id].remarks || ""
                    };
                });

            } catch {
                // no data → ignore
            }

            setAttendance(initial);
            updateCounts(initial, list.length);

        } catch (err) {
            console.error(err);
            showToast("Failed to load students", "error");
        } finally {
            setAttendanceLoading(false);
        }
    };

    // ================= MARK =================
    const markAttendance = (studentId, status) => {
        const updated = {
            ...attendance,
            [studentId]: {
                ...attendance[studentId],
                status,
            },
        };

        setAttendance(updated);
        updateCounts(updated, students.length);
    };


    const updateRemark = (studentId, remark) => {
        const updated = {
            ...attendance,
            [studentId]: {
                ...attendance[studentId],
                remarks: remark,
            },
        };

        setAttendance(updated);
    };

    const markAll = (status) => {
        const updated = {};

        students.forEach((s) => {
            updated[s.student_id] = {
                status,
                remarks: attendance[s.student_id]?.remarks || "",
            };
        });

        setAttendance(updated);
        updateCounts(updated, students.length);
    };

    // ================= DASHBOARD ATTENDANCE =================
    const fetchDashboardAttendance = async () => {

        try {

            const user = getUser();

            if (!user) return;

            // ================= GET TEACHER CLASSES =================

            const classRes = await fetchWithAuth(
                `${BASE_URL}/teacher/classes/${user.id}`
            );

            const classData = await classRes.json();

            const assignedClasses = classData || [];

            // ================= TOTAL CLASSES =================

            const uniqueClasses = [
                ...new Map(
                    assignedClasses.map(item => [
                        item.academic_class_id,
                        item
                    ])
                ).values()
            ];

            // ================= TOTAL STUDENTS =================

            let totalStudents = 0;

            for (const cls of uniqueClasses) {

                try {

                    const res = await fetchWithAuth(
                        `${BASE_URL}/students/by-class/${cls.academic_class_id}`
                    );

                    const students = await res.json();

                    totalStudents += students.length || 0;

                } catch {
                    // ignore
                }
            }

            // ================= WEEKLY DATA =================

            const today = new Date();

            const weeklyChart = [];
            const todayClassAttendance = [];

            let totalPresent = 0;
            let totalAbsent = 0;
            let totalLate = 0;

            for (let i = 6; i >= 0; i--) {

                const d = new Date();

                d.setDate(today.getDate() - i);

                const formatted =
                    d.toISOString().split("T")[0];

                let dayPresent = 0;
                let dayAbsent = 0;
                let dayLate = 0;

                for (const cls of assignedClasses) {

                    try {

                        const res = await fetchWithAuth(
                            `${BASE_URL}/attendance`
                            + `?academic_class_id=${cls.academic_class_id}`
                            + `&subject_id=${cls.subject_id}`
                            + `&date=${formatted}`
                        );

                        const data = await res.json();

                        Object.values(data || {}).forEach((record) => {

                            const status =
                                record?.status || record;

                            if (status === "Present") {
                                dayPresent++;
                            }

                            if (status === "Absent") {
                                dayAbsent++;
                            }

                            if (status === "Late") {
                                dayLate++;
                            }
                        });

                    } catch {
                        // ignore
                    }
                }

                totalPresent += dayPresent;
                totalAbsent += dayAbsent;
                totalLate += dayLate;

                weeklyChart.push({
                    day: d.toLocaleDateString("en-US", {
                        weekday: "short"
                    }),
                    present: dayPresent,
                    absent: dayAbsent,
                    late: dayLate,
                });

                // ================= TODAY CLASS DATA =================

                if (formatted === getTodayDate()) {

                    for (const cls of assignedClasses) {

                        try {

                            const res = await fetchWithAuth(
                                `${BASE_URL}/attendance`
                                + `?academic_class_id=${cls.academic_class_id}`
                                + `&subject_id=${cls.subject_id}`
                                + `&date=${formatted}`
                            );

                            const data = await res.json();

                            let present = 0;
                            let absent = 0;
                            let late = 0;

                            Object.values(data || {}).forEach((record) => {

                                const status =
                                    record?.status || record;

                                if (status === "Present") present++;
                                if (status === "Absent") absent++;
                                if (status === "Late") late++;
                            });

                            todayClassAttendance.push({
                                class_name: cls.class_name,
                                subject_name: cls.subject_name,
                                present,
                                absent,
                                late,
                                total: present + absent + late,
                            });

                        } catch {
                            // ignore
                        }
                    }
                }
            }

            // ================= TODAY COUNTS =================

            const todayData =
                weeklyChart[weeklyChart.length - 1];

            const attendanceRate =
                totalStudents > 0
                    ? Math.round(
                        (
                            (
                                todayData.present +
                                todayData.late
                            ) / totalStudents
                        ) * 100
                    )
                    : 0;

            // ================= PENDING =================

            const pendingAttendance =
                uniqueClasses.length -
                weeklyChart.filter(
                    d =>
                        d.present > 0 ||
                        d.absent > 0 ||
                        d.late > 0
                ).length;

            setDashboardAttendance({
                totalClasses: uniqueClasses.length,
                totalStudents,
                todayPresent: todayData.present,
                todayAbsent: todayData.absent,
                todayLate: todayData.late,
                attendanceRate,
                weeklyChart,
                todayClassAttendance,
                pendingAttendance:
                    pendingAttendance < 0
                        ? 0
                        : pendingAttendance,
            });

        } catch (err) {

            console.error(
                "Dashboard Attendance Error:",
                err
            );
        }
    };

    // ================= SAVE =================
    const saveAttendance = async () => {
        if (!selectedClass || !selectedDate) {
            showToast("Select class and date", "error");
            return;
        }

        try {
            const user = getUser();

            const payload = {
                academic_class_id: selectedClass.academic_class_id,

                subject_id: selectedClass.subject_id,

                teacher_id: user?.id,

                date: selectedDate,

                attendance: Object.keys(attendance).map((id) => ({
                    student_id: Number(id),
                    status: attendance[id]?.status,
                    remarks: attendance[id]?.remarks || "",
                })),
            };

            const res = await fetchWithAuth(
                `${BASE_URL}/attendance/mark`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            const data = await res.json();

            if (res.ok) {
                showToast("Attendance saved successfully ✅");
            } else {
                showToast(data.error || "Failed", "error");
            }

        } catch (err) {
            console.error(err);
            showToast("Error saving attendance", "error");
        }
    };

    // ================= INIT =================
    useEffect(() => {

        if (
            activeSection !== "attendance" &&
            activeSection !== "dashboard"
        ) {
            return;
        }

        const initAttendance = async () => {

            const today = getTodayDate();

            setSelectedDate(today);

            await fetchClasses();

            await fetchDashboardAttendance();

        };

        initAttendance();

    }, [activeSection]);
    // ================= AUTO LOAD =================
    useEffect(() => {
        if (selectedClass && selectedDate) {
            fetchStudents(selectedClass, selectedDate);
        }
    }, [selectedClass, selectedDate]);

    // =============== Download Report ============
    const downloadAttendanceReport = async () => {

        try {

            // ================= VALIDATION =================
            if (!selectedClass) {
                showToast("Please select class", "error");
                return;
            }

            if (!selectedMonth) {
                showToast("Please select month", "error");
                return;
            }

            const user = getUser();

            if (!user) {
                showToast("User not found", "error");
                return;
            }

            // ================= MONTH/YEAR =================

            const [year, month] =
                selectedMonth.split("-");

            // ================= URL =================

            const url =
                `${BASE_URL}/teacher/attendance/report`
                + `?academic_class_id=${selectedClass.academic_class_id}`
                + `&subject_id=${selectedClass.subject_id}`
                + `&teacher_id=${user.id}`
                + `&month=${Number(month)}`
                + `&year=${year}`;

            // ================= REQUEST =================

            const res = await fetchWithAuth(url);

            // ================= HANDLE ERRORS =================

            if (!res.ok) {

                let errorMessage =
                    "Failed to download report";

                try {
                    const errorData =
                        await res.json();
                    errorMessage =
                        errorData?.error || errorMessage;
                } catch {
                    // ignore json parse errors
                }

                // 404 special handling
                if (res.status === 404) {

                    showToast(
                        "No attendance records found for selected month",
                        "error"
                    );

                    return;
                }

                // 400 handling
                if (res.status === 400) {
                    showToast(
                        errorMessage,
                        "error"
                    );
                    return;
                }
                // other errors
                throw new Error(errorMessage);
            }

            // ================= DOWNLOAD =================
            const blob = await res.blob();
            // Empty blob check
            if (!blob || blob.size === 0) {
                showToast(
                    "Empty report received",
                    "error"
                );
                return;
            }

            const downloadUrl =
                window.URL.createObjectURL(blob);

            const a =
                document.createElement("a");
            a.href = downloadUrl;
            a.download =
                `attendance_${month}_${year}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(
                downloadUrl
            );

            showToast(
                "Attendance report downloaded ✅"
            );

        } catch (err) {

            console.error(
                "Download Attendance Error:",
                err
            );

            showToast(
                err.message ||
                "Something went wrong",
                "error"
            );
        }
    };

    return {
        classes,
        students,
        attendance,
        selectedClass,
        setSelectedClass,
        selectedDate,
        setSelectedDate,
        selectedMonth,
        setSelectedMonth,
        attendanceCounts,
        attendanceLoading,
        markAttendance,
        markAll,
        saveAttendance,
        getTodayDate,
        updateRemark,
        downloadAttendanceReport,
        dashboardAttendance,
        fetchDashboardAttendance,
    };
}