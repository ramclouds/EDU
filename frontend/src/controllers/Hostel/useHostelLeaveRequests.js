import { useCallback, useEffect, useRef, useState } from "react";

import { BASE_URL } from "../../config/appConfig";
import { useHostelPermission, HOSTEL_READ_ONLY_MESSAGE } from "./useHostelPermission";

const EMPTY_FILTERS = {
    search: "",
    status: "",
};

const EMPTY_STATS = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
};

const EMPTY_LEAVE_FORM = {
    student_id: "",
    leave_type: "Weekend Leave",
    from_date: "",
    to_date: "",
    reason: "",
};

export function useHostelLeaveRequests({ activeSection, fetchWithAuth, showToast }) {
    const { canWriteHostel } = useHostelPermission();

    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);
    const loadedRef = useRef(false);
    const runningRef = useRef(false);

    const [leaveRequests, setLeaveRequests] = useState([]);
    const [leaveStats, setLeaveStats] = useState({ ...EMPTY_STATS });
    const [leaveLoading, setLeaveLoading] = useState(false);
    const [leaveFilters, setLeaveFilters] = useState({ ...EMPTY_FILTERS });

    const [leaveModalOpen, setLeaveModalOpen] = useState(false);
    const [leaveForm, setLeaveForm] = useState({ ...EMPTY_LEAVE_FORM });
    const [leaveSaving, setLeaveSaving] = useState(false);

    const [studentSearch, setStudentSearch] = useState("");
    const [studentResults, setStudentResults] = useState([]);
    const [studentSearchLoading, setStudentSearchLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);

    const [actioningId, setActioningId] = useState(null);

    useEffect(() => {
        fetchRef.current = fetchWithAuth;
    }, [fetchWithAuth]);

    useEffect(() => {
        toastRef.current = showToast;
    }, [showToast]);

    const notify = useCallback((message, type = "info") => {
        toastRef.current?.(message, type);
    }, []);

    const request = useCallback(async (url, options = {}) => {
        if (typeof fetchRef.current !== "function") {
            throw new Error("Authenticated request unavailable");
        }

        const response = await fetchRef.current(url, options);

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            const error = new Error(
                data.error || data.message || `Request failed (${response.status})`,
            );

            error.data = data;
            error.status = response.status;

            throw error;
        }

        return data;
    }, []);

    const loadLeaveRequests = useCallback(
        async ({ filters: nextFilters = leaveFilters, silent = false } = {}) => {
            if (runningRef.current) {
                return;
            }

            runningRef.current = true;
            setLeaveLoading(true);

            try {
                const params = new URLSearchParams();

                Object.entries(nextFilters).forEach(([key, value]) => {
                    const normalized = String(value ?? "").trim();

                    if (normalized) {
                        params.set(key, normalized);
                    }
                });

                const data = await request(
                    `${BASE_URL}/admin/hostel/leave-requests?${params.toString()}`,
                );

                setLeaveRequests(
                    Array.isArray(data.leave_requests) ? data.leave_requests : [],
                );
                setLeaveStats({ ...EMPTY_STATS, ...(data.stats || {}) });
            } catch (error) {
                console.error("Hostel leave requests load error:", error);

                if (!silent) {
                    notify(error.message || "Failed to load leave requests", "error");
                }
            } finally {
                runningRef.current = false;
                setLeaveLoading(false);
            }
        },
        [leaveFilters, notify, request],
    );

    const updateLeaveFilter = useCallback((name, value) => {
        setLeaveFilters((current) => ({ ...current, [name]: value }));
    }, []);

    const applyLeaveFilters = useCallback(() => {
        loadLeaveRequests({ filters: leaveFilters });
    }, [leaveFilters, loadLeaveRequests]);

    const resetLeaveFilters = useCallback(() => {
        const next = { ...EMPTY_FILTERS };
        setLeaveFilters(next);
        loadLeaveRequests({ filters: next });
    }, [loadLeaveRequests]);

    // ============================================================
    // NEW LEAVE REQUEST
    // ============================================================
    const openLeaveModal = useCallback(() => {
        setLeaveForm({ ...EMPTY_LEAVE_FORM });
        setStudentSearch("");
        setStudentResults([]);
        setSelectedStudent(null);
        setLeaveModalOpen(true);
    }, []);

    const closeLeaveModal = useCallback(() => {
        setLeaveModalOpen(false);
    }, []);

    const updateLeaveForm = useCallback((name, value) => {
        setLeaveForm((current) => ({ ...current, [name]: value }));
    }, []);

    const searchStudentsForLeave = useCallback(
        async (search) => {
            setStudentSearchLoading(true);

            try {
                const params = new URLSearchParams();

                if (search) {
                    params.set("search", search);
                }

                const data = await request(
                    `${BASE_URL}/admin/hostel/students/search?${params.toString()}`,
                );

                setStudentResults(Array.isArray(data.students) ? data.students : []);
            } catch (error) {
                notify(error.message || "Failed to search students", "error");
            } finally {
                setStudentSearchLoading(false);
            }
        },
        [notify, request],
    );

    const selectLeaveStudent = useCallback((student) => {
        setSelectedStudent(student);
        setLeaveForm((current) => ({ ...current, student_id: student.id }));
    }, []);

    const saveLeaveRequest = useCallback(async () => {
        if (!leaveForm.student_id || !leaveForm.from_date || !leaveForm.to_date) {
            notify("Student, from date and to date are required", "error");
            return;
        }

        if (leaveForm.to_date < leaveForm.from_date) {
            notify("To date cannot be before from date", "error");
            return;
        }

        if (!canWriteHostel) {
            notify(HOSTEL_READ_ONLY_MESSAGE, "error");
            return;
        }

        setLeaveSaving(true);

        try {
            await request(`${BASE_URL}/admin/hostel/leave-requests`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    student_id: leaveForm.student_id,
                    leave_type: leaveForm.leave_type,
                    from_date: leaveForm.from_date,
                    to_date: leaveForm.to_date,
                    reason: leaveForm.reason.trim(),
                }),
            });

            notify("Leave request submitted", "success");
            setLeaveModalOpen(false);
            await loadLeaveRequests({ silent: true });
        } catch (error) {
            notify(error.message || "Failed to submit leave request", "error");
        } finally {
            setLeaveSaving(false);
        }
    }, [canWriteHostel, leaveForm, loadLeaveRequests, notify, request]);

    // ============================================================
    // WORKFLOW ACTIONS
    // ============================================================
    const approveLeave = useCallback(
        async (leave) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            setActioningId(leave.id);

            try {
                await request(
                    `${BASE_URL}/admin/hostel/leave-requests/${leave.id}/approve`,
                    { method: "POST" },
                );

                notify("Leave request approved", "success");
                await loadLeaveRequests({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to approve leave request", "error");
            } finally {
                setActioningId(null);
            }
        },
        [canWriteHostel, loadLeaveRequests, notify, request],
    );

    const rejectLeave = useCallback(
        async (leave) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            if (!window.confirm(`Reject leave request from ${leave.student_name}?`)) {
                return;
            }

            setActioningId(leave.id);

            try {
                await request(
                    `${BASE_URL}/admin/hostel/leave-requests/${leave.id}/reject`,
                    { method: "POST" },
                );

                notify("Leave request rejected", "success");
                await loadLeaveRequests({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to reject leave request", "error");
            } finally {
                setActioningId(null);
            }
        },
        [canWriteHostel, loadLeaveRequests, notify, request],
    );

    const markLeaveReturned = useCallback(
        async (leave) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            setActioningId(leave.id);

            try {
                await request(
                    `${BASE_URL}/admin/hostel/leave-requests/${leave.id}/return`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({}),
                    },
                );

                notify(`${leave.student_name} marked as returned`, "success");
                await loadLeaveRequests({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to mark returned", "error");
            } finally {
                setActioningId(null);
            }
        },
        [canWriteHostel, loadLeaveRequests, notify, request],
    );

    const deleteLeave = useCallback(
        async (leave) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            if (
                !window.confirm(
                    `Delete this leave request for ${leave.student_name}?`,
                )
            ) {
                return;
            }

            try {
                await request(`${BASE_URL}/admin/hostel/leave-requests/${leave.id}`, {
                    method: "DELETE",
                });

                notify("Leave request deleted", "success");
                await loadLeaveRequests({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to delete leave request", "error");
            }
        },
        [canWriteHostel, loadLeaveRequests, notify, request],
    );

    useEffect(() => {
        if (activeSection !== "leave-requests") {
            loadedRef.current = false;
            return;
        }

        if (loadedRef.current) {
            return;
        }

        loadedRef.current = true;
        loadLeaveRequests({ filters: EMPTY_FILTERS });
    }, [activeSection, loadLeaveRequests]);

    return {
        leaveRequests,
        leaveStats,
        leaveLoading,
        leaveFilters,

        loadLeaveRequests,
        updateLeaveFilter,
        applyLeaveFilters,
        resetLeaveFilters,

        leaveModalOpen,
        leaveForm,
        leaveSaving,
        openLeaveModal,
        closeLeaveModal,
        updateLeaveForm,

        studentSearch,
        setStudentSearch,
        studentResults,
        studentSearchLoading,
        selectedStudent,
        searchStudentsForLeave,
        selectLeaveStudent,
        saveLeaveRequest,

        actioningId,
        approveLeave,
        rejectLeave,
        markLeaveReturned,
        deleteLeave,

        canWriteHostel,
    };
}
