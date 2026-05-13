import { useState, useEffect } from "react";
import { BASE_URL } from "../../config/appConfig";

export function useTeacherAttendance(fetchWithAuth, showToast) {

    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [selectedMonth, setSelectedMonth] = useState(
        new Date().toISOString().slice(0, 7)
    );
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedDate, setSelectedDate] = useState("");

    const [attendanceLoading, setAttendanceLoading] = useState(false);

    const [attendanceCounts, setAttendanceCounts] = useState({
        total: 0,
        present: 0,
        absent: 0,
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

            // ✅ AUTO SELECTCLASS
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
        const pending = totalStudents - (present + absent);

        setAttendanceCounts({
            total: totalStudents,
            present,
            absent,
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
        const today = getTodayDate();
        setSelectedDate(today); // ✅ AUTO SET TODAY
        fetchClasses();
    }, []);

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
    };
}