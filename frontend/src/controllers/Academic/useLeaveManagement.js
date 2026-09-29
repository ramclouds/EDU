import { useState, useEffect } from "react";
import { BASE_URL } from "../../config/appConfig";

export function useLeaveManagement(
    fetchWithAuth,
    showToast
) {

    // STATES
    const [leaveLoading, setLeaveLoading] =
        useState(false);

    const [activeTab, setActiveTab] =
        useState("teacher");

    const [leaveFilter, setLeaveFilter] =
        useState("all");

    const [leaveSearch, setLeaveSearch] =
        useState("");

    const [teacherLeaves, setTeacherLeaves] =
        useState([]);

    const [studentLeaves, setStudentLeaves] =
        useState([]);

    const [leaveCounts, setLeaveCounts] = useState({
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0,
    });


    // FETCH TEACHER LEAVES
    const fetchTeacherLeaves = async () => {
        try {
            const res = await fetchWithAuth(
                `${BASE_URL}/admin/teacher/leaves`
            );

            const data = await res.json();

            if (res.ok) {
                const formattedLeaves = (data || []).map(
                    (leave) => ({
                        ...leave,

                        type:
                            leave.leave_type,

                        days:
                            leave.total_days,

                        from:
                            leave.from_date,

                        to:
                            leave.to_date,
                    })
                );

                setTeacherLeaves(formattedLeaves);
            }
        } catch (err) {
            console.error(err);

            showToast(
                "Failed to load teacher leaves",
                "error"
            );
        }
    };


    // FETCH STUDENT LEAVES
    const fetchStudentLeaves = async () => {
        try {
            const res = await fetchWithAuth(
                `${BASE_URL}/admin/student/leaves`
            );

            const data = await res.json();

            if (res.ok) {
                setStudentLeaves(
                    Array.isArray(data) ? data : []
                );
            }
        } catch (err) {
            console.error(err);

            showToast(
                "Failed to load student leaves",
                "error"
            );
        }
    };


    // FETCH ALL
    const fetchLeaves = async () => {
        try {
            setLeaveLoading(true);

            await Promise.all([
                fetchTeacherLeaves(),
                fetchStudentLeaves(),
            ]);
        } finally {
            setLeaveLoading(false);
        }
    };


    // INITIAL LOAD
    useEffect(() => {
        fetchLeaves();
    }, []);


    // CURRENT TAB DATA
    const currentLeaves =
        activeTab === "teacher"
            ? teacherLeaves
            : studentLeaves;


    // SEARCH + FILTER
    const filteredLeaves =
        currentLeaves.filter((leave) => {
            const searchText = [
                leave.teacher_name || "",
                leave.student_name || "",
                leave.reason || "",
                leave.leave_type || "",
                leave.batch || "",
                leave.division || "",
                leave.section || "",
            ]
                .join(" ")
                .toLowerCase();

            const searchMatch =
                searchText.includes(
                    leaveSearch.toLowerCase()
                );

            const statusMatch =
                leaveFilter === "all"
                    ? true
                    : (leave.status || "")
                        .trim()
                        .toLowerCase() ===
                    leaveFilter
                        .trim()
                        .toLowerCase();

            return searchMatch && statusMatch;
        });


    // COUNTS
    useEffect(() => {
        const leaves = currentLeaves;

        setLeaveCounts({
            pending: leaves.filter(
                (l) => l.status === "Pending"
            ).length,

            approved: leaves.filter(
                (l) => l.status === "Approved"
            ).length,

            rejected: leaves.filter(
                (l) => l.status === "Rejected"
            ).length,

            total: leaves.length,
        });
    }, [teacherLeaves, studentLeaves, activeTab]);


    // APPROVE TEACHER LEAVE
    const approveTeacherLeave = async (
        leaveId
    ) => {
        try {
            const res = await fetchWithAuth(
                `${BASE_URL}/teacher/leave/update/${leaveId}`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        status: "Approved",
                    }),
                }
            );

            const data = await res.json();

            if (res.ok) {
                showToast(
                    "Teacher leave approved"
                );

                await fetchLeaves();
            } else {
                showToast(
                    data.error || "Failed",
                    "error"
                );
            }
        } catch (err) {
            console.error(err);

            showToast(
                "Approval failed",
                "error"
            );
        }
    };


    // REJECT TEACHER LEAVE
    const rejectTeacherLeave = async (
        leaveId
    ) => {
        try {
            const res = await fetchWithAuth(
                `${BASE_URL}/teacher/leave/update/${leaveId}`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        status: "Rejected",
                    }),
                }
            );

            const data = await res.json();

            if (res.ok) {
                showToast(
                    "Teacher leave rejected"
                );

                await fetchLeaves();
            } else {
                showToast(
                    data.error || "Failed",
                    "error"
                );
            }
        } catch (err) {
            console.error(err);

            showToast(
                "Reject failed",
                "error"
            );
        }
    };


    // APPROVE STUDENT LEAVE
    const approveStudentLeave =
        async (leaveId) => {
            try {
                const res =
                    await fetchWithAuth(
                        `${BASE_URL}/admin/student/leave/${leaveId}`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",
                            },

                            body: JSON.stringify({
                                status: "Approved",
                            }),
                        }
                    );

                const data =
                    await res.json();

                if (res.ok) {
                    showToast(
                        "Student leave approved"
                    );

                    await fetchLeaves();
                } else {
                    showToast(
                        data.error || "Failed",
                        "error"
                    );
                }
            } catch (err) {
                console.error(err);

                showToast(
                    "Approval failed",
                    "error"
                );
            }
        };


    // REJECT STUDENT LEAVE
    const rejectStudentLeave =
        async (leaveId) => {
            try {
                const res =
                    await fetchWithAuth(
                        `${BASE_URL}/admin/student/leave/${leaveId}`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",
                            },

                            body: JSON.stringify({
                                status: "Rejected",
                            }),
                        }
                    );

                const data =
                    await res.json();

                if (res.ok) {
                    showToast(
                        "Student leave rejected"
                    );

                    await fetchLeaves();
                } else {
                    showToast(
                        data.error || "Failed",
                        "error"
                    );
                }
            } catch (err) {
                console.error(err);

                showToast(
                    "Reject failed",
                    "error"
                );
            }
        };


    // COMMON ACTION
    const approveLeave = (leaveId) => {
        if (activeTab === "teacher") {
            approveTeacherLeave(leaveId);
        } else {
            approveStudentLeave(leaveId);
        }
    };

    const rejectLeave = (leaveId) => {
        if (activeTab === "teacher") {
            rejectTeacherLeave(leaveId);
        } else {
            rejectStudentLeave(leaveId);
        }
    };


    // RETURN
    return {
        leaveLoading,

        activeLeaveTab: activeTab,
        setActiveLeaveTab: setActiveTab,

        leaveFilter,
        setLeaveFilter,

        leaveSearch,
        setLeaveSearch,

        teacherLeaves,
        studentLeaves,

        filteredLeaves,

        leaveCounts,

        approveTeacherLeave,
        rejectTeacherLeave,

        approveStudentLeave,
        rejectStudentLeave,

        fetchLeaves,
    };
}