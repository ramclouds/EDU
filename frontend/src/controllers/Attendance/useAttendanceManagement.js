import { useState, useEffect } from "react";
import { BASE_URL } from "../../config/appConfig";

export function useAttendanceManagement({ activeSection, fetchWithAuth, showToast, }) {

    // FILTERS
    const [role, setRole] = useState("students");
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedDivision, setSelectedDivision] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [classes, setClasses] = useState([]);
    const [divisions, setDivisions] = useState([]);
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split("T")[0]
    );

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // DATA
    const [attendanceStats, setAttendanceStats] = useState({
        present: 0,
        absent: 0,
        late: 0,
        total: 0,
        percentage: 0,
    });

    const [attendanceList, setAttendanceList] = useState([]);

    // PAGINATION
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [pagination, setPagination] = useState({
        total: 0,
        pages: 0,
    });

    // LOADING
    const [loading, setLoading] = useState(false);
    const [statsLoading, setStatsLoading] = useState(false);

    // DEBOUNCE SEARCH
    useEffect(() => {

        const timer = setTimeout(() => {

            setDebouncedSearch(search);

        }, 500);

        return () => clearTimeout(timer);

    }, [search]);

    const fetchAttendanceFilters = async () => {
        try {

            const res = await fetchWithAuth(
                `${BASE_URL}/admin/attendance/filters`
            );

            const data = await res.json();

            if (res.ok) {

                // Remove duplicate classes
                const uniqueClasses = Array.from(
                    new Map(
                        (data.classes || []).map((item) => [
                            item.id,
                            item,
                        ])
                    ).values()
                );

                // Remove duplicate divisions
                const uniqueDivisions = [
                    ...new Set(
                        (data.divisions || []).filter(Boolean)
                    ),
                ];

                setClasses(uniqueClasses);

                setDivisions(uniqueDivisions);

            } else {

                showToast(
                    data.error ||
                    "Failed to load filters",
                    "error"
                );
            }

        } catch (err) {

            console.error(err);

            showToast(
                "Failed to load filters",
                "error"
            );
        }
    };

    // FETCH STATS
    const fetchAttendanceStats = async () => {

        try {

            setStatsLoading(true);

            const params = new URLSearchParams({
                role,
                date: selectedDate,
            });

            const res = await fetchWithAuth(
                `${BASE_URL}/admin/attendance/stats?${params}`
            );

            const data = await res.json();

            if (res.ok) {

                setAttendanceStats({
                    present: data.present || 0,
                    absent: data.absent || 0,
                    late: data.late || 0,
                    total: data.total || 0,
                    percentage: data.percentage || 0,
                });

            } else {

                showToast(
                    data.error || "Failed to load stats",
                    "error"
                );
            }

        } catch (err) {

            console.error(err);
            showToast(
                "Failed to fetch attendance stats",
                "error"
            );

        } finally {
            setStatsLoading(false);
        }
    };

    // FETCH LIST
    const fetchAttendanceList = async () => {

        try {

            setLoading(true);

            const params = new URLSearchParams({
                role,
                page,
                limit,
                date: selectedDate || "",
                search: debouncedSearch || "",
                class_id: selectedClass || "",
                division: selectedDivision || "",
                status: selectedStatus || "",
            });

            const res = await fetchWithAuth(
                `${BASE_URL}/admin/attendance/list?${params}`
            );

            const data = await res.json();

            if (res.ok) {

                setAttendanceList(
                    data.items || []
                );

                setPagination({
                    total: data.total || 0,
                    pages: data.pages || 0,
                });

            } else {

                showToast(
                    data.error || "Failed to load attendance",
                    "error"
                );
            }

        } catch (err) {

            console.error(err);
            showToast(
                "Failed to fetch attendance records",
                "error"
            );

        } finally {

            setLoading(false);
        }
    };

    // UPDATE STATUS
    const updateAttendanceStatus = async (
        item,
        status,
        remarks = ""
    ) => {

        try {

            const payload = {
                role,
                record_id: item.record_id || null,
                student_id: item.student_id || null,
                teacher_id: item.teacher_id || null,
                class_id: item.class_id || null,
                date: selectedDate,
                status,
                remarks,
                marked_by: "Admin",
            };

            const res = await fetchWithAuth(
                `${BASE_URL}/admin/attendance/update`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify(
                        payload
                    ),
                }
            );

            const data = await res.json();

            if (res.ok) {

                setAttendanceList((prev) =>
                    prev.map((attendance) => {

                        const isStudent =
                            role === "students" &&
                            attendance.student_id ===
                            item.student_id;

                        const isTeacher =
                            role === "teachers" &&
                            attendance.teacher_id ===
                            item.teacher_id;

                        if (
                            isStudent ||
                            isTeacher
                        ) {

                            return {

                                ...attendance,

                                record_id:
                                    attendance.record_id ||
                                    data.record_id,

                                status,

                                reason:
                                    remarks,
                            };
                        }

                        return attendance;
                    })
                );

                showToast(
                    "Attendance updated successfully",
                    "success"
                );

                fetchAttendanceStats();

            } else {

                showToast(
                    data.error ||
                    "Update failed",
                    "error"
                );
            }

        } catch (err) {

            console.error(err);

            showToast(
                "Failed to update attendance",
                "error"
            );
        }
    };

    // MARK ALL
    const markAllAttendance = async (
        classId,
        status
    ) => {

        try {

            if (!classId) {

                showToast(
                    "Session ID missing",
                    "error"
                );

                return;
            }

            const res = await fetchWithAuth(
                `${BASE_URL}/admin/attendance/mark-all`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        academic_class_id: classId,
                        date: selectedDate,
                        role,
                        status,
                        status,
                    }),
                }
            );

            const data = await res.json();

            if (res.ok) {

                showToast(
                    `All marked ${status}`,
                    "success"
                );
                fetchAttendanceList();
                fetchAttendanceStats();

            } else {

                showToast(
                    data.error || "Failed",
                    "error"
                );
            }

        } catch (err) {
            console.error(err);
            showToast(
                "Failed to mark attendance",
                "error"
            );
        }
    };



    // REFRESH
    const refreshAttendance = () => {
        fetchAttendanceStats();
        fetchAttendanceList();
    };

    // RESET PAGE ON FILTER CHANGE
    useEffect(() => {

        setPage(1);

    }, [
        role,
        selectedClass,
        selectedDivision,
        selectedStatus,
        selectedDate,
        debouncedSearch,
    ]);

    // AUTO LOAD
    useEffect(() => {

        if (
            activeSection !== "attendance"
        ) {
            return;
        }

        fetchAttendanceFilters();

    }, [activeSection]);

    useEffect(() => {

        if (
            activeSection !== "attendance"
        ) {
            return;
        }

        fetchAttendanceStats();

        fetchAttendanceList();

    }, [
        activeSection,
        role,
        selectedClass,
        selectedDivision,
        selectedStatus,
        selectedDate,
        debouncedSearch,
        page,
        limit,
    ]);

    useEffect(() => {

        setPage(1);

    }, [
        role,
        selectedClass,
        selectedDivision,
        selectedStatus,
        selectedDate,
        debouncedSearch,
    ]);


    useEffect(() => {
        setSelectedClass("");
        setSelectedDivision("");
        setSelectedStatus("");
        setPage(1);
    }, [role]);

    // RETURN
    return {

        // filters
        role,
        setRole,

        classes,
        divisions,

        selectedClass,
        setSelectedClass,

        selectedDivision,
        setSelectedDivision,

        selectedStatus,
        setSelectedStatus,

        selectedDate,
        setSelectedDate,

        search,
        setSearch,

        // data
        attendanceStats,
        attendanceList,

        // pagination
        page,
        setPage,

        limit,
        setLimit,

        pagination,

        // loading
        loading,
        statsLoading,

        // actions
        refreshAttendance,
        fetchAttendanceList,
        fetchAttendanceStats,
        updateAttendanceStatus,
        markAllAttendance,
    };
}