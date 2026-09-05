import { useCallback, useEffect, useRef, useState } from "react";

import { BASE_URL } from "../../config/appConfig";
import { useHostelPermission, HOSTEL_READ_ONLY_MESSAGE } from "./useHostelPermission";

const EMPTY_FILTERS = {
    search: "",
    relation: "",
    block_id: "",
    status: "",
};

const EMPTY_STATS = {
    today: 0,
    inside: 0,
    approved: 0,
    pending: 0,
};

const EMPTY_VISITOR_FORM = {
    visitor_name: "",
    visitor_mobile: "",
    student_id: "",
    relation: "Parent",
    purpose: "",
};

export function useHostelVisitors({ activeSection, fetchWithAuth, showToast }) {
    const { canWriteHostel } = useHostelPermission();

    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);
    const loadedRef = useRef(false);
    const runningRef = useRef(false);

    const [visitors, setVisitors] = useState([]);
    const [visitorStats, setVisitorStats] = useState({ ...EMPTY_STATS });
    const [visitorsLoading, setVisitorsLoading] = useState(false);
    const [visitorFilters, setVisitorFilters] = useState({ ...EMPTY_FILTERS });

    const [visitorModalOpen, setVisitorModalOpen] = useState(false);
    const [visitorForm, setVisitorForm] = useState({ ...EMPTY_VISITOR_FORM });
    const [visitorSaving, setVisitorSaving] = useState(false);

    // Student picker inside the "New Visitor" modal.
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

    const loadVisitors = useCallback(
        async ({ filters: nextFilters = visitorFilters, silent = false } = {}) => {
            if (runningRef.current) {
                return;
            }

            runningRef.current = true;
            setVisitorsLoading(true);

            try {
                const params = new URLSearchParams();

                Object.entries(nextFilters).forEach(([key, value]) => {
                    const normalized = String(value ?? "").trim();

                    if (normalized) {
                        params.set(key, normalized);
                    }
                });

                const data = await request(
                    `${BASE_URL}/admin/hostel/visitors?${params.toString()}`,
                );

                setVisitors(Array.isArray(data.visitors) ? data.visitors : []);
                setVisitorStats({ ...EMPTY_STATS, ...(data.stats || {}) });
            } catch (error) {
                console.error("Hostel visitors load error:", error);

                if (!silent) {
                    notify(error.message || "Failed to load visitors", "error");
                }
            } finally {
                runningRef.current = false;
                setVisitorsLoading(false);
            }
        },
        [notify, request, visitorFilters],
    );

    const updateVisitorFilter = useCallback((name, value) => {
        setVisitorFilters((current) => ({ ...current, [name]: value }));
    }, []);

    const applyVisitorFilters = useCallback(() => {
        loadVisitors({ filters: visitorFilters });
    }, [loadVisitors, visitorFilters]);

    const resetVisitorFilters = useCallback(() => {
        const next = { ...EMPTY_FILTERS };
        setVisitorFilters(next);
        loadVisitors({ filters: next });
    }, [loadVisitors]);

    // ============================================================
    // NEW VISITOR MODAL
    // ============================================================
    const openVisitorModal = useCallback(() => {
        setVisitorForm({ ...EMPTY_VISITOR_FORM });
        setStudentSearch("");
        setStudentResults([]);
        setSelectedStudent(null);
        setVisitorModalOpen(true);
    }, []);

    const closeVisitorModal = useCallback(() => {
        setVisitorModalOpen(false);
    }, []);

    const updateVisitorForm = useCallback((name, value) => {
        setVisitorForm((current) => ({ ...current, [name]: value }));
    }, []);

    const searchStudentsForVisitor = useCallback(
        async (search) => {
            setStudentSearchLoading(true);

            try {
                const params = new URLSearchParams();

                if (search) {
                    params.set("search", search);
                }

                // Reuses the same student-search endpoint the Beds
                // section's Allocate modal uses - any enrolled student can
                // receive a visitor, not just unallocated ones, so we
                // don't filter by hostel allocation here.
                const data = await request(
                    `${BASE_URL}/admin/hostel/students/unallocated?${params.toString()}`,
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

    const selectVisitorStudent = useCallback((student) => {
        setSelectedStudent(student);
        setVisitorForm((current) => ({ ...current, student_id: student.id }));
    }, []);

    const saveVisitor = useCallback(async () => {
        if (!visitorForm.visitor_name.trim() || !visitorForm.student_id) {
            notify("Visitor name and student are required", "error");
            return;
        }

        if (!canWriteHostel) {
            notify(HOSTEL_READ_ONLY_MESSAGE, "error");
            return;
        }

        setVisitorSaving(true);

        try {
            await request(`${BASE_URL}/admin/hostel/visitors`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    visitor_name: visitorForm.visitor_name.trim(),
                    visitor_mobile: visitorForm.visitor_mobile.trim(),
                    student_id: visitorForm.student_id,
                    relation: visitorForm.relation,
                    purpose: visitorForm.purpose.trim(),
                }),
            });

            notify("Visitor request logged", "success");
            setVisitorModalOpen(false);
            await loadVisitors({ silent: true });
        } catch (error) {
            notify(error.message || "Failed to log visitor", "error");
        } finally {
            setVisitorSaving(false);
        }
    }, [canWriteHostel, loadVisitors, notify, request, visitorForm]);

    // ============================================================
    // WORKFLOW ACTIONS
    // ============================================================
    const approveVisitor = useCallback(
        async (visitor) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            setActioningId(visitor.id);

            try {
                await request(
                    `${BASE_URL}/admin/hostel/visitors/${visitor.id}/approve`,
                    { method: "POST" },
                );

                notify("Visitor approved", "success");
                await loadVisitors({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to approve visitor", "error");
            } finally {
                setActioningId(null);
            }
        },
        [canWriteHostel, loadVisitors, notify, request],
    );

    const rejectVisitor = useCallback(
        async (visitor) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            if (!window.confirm(`Reject visit request from ${visitor.visitor_name}?`)) {
                return;
            }

            setActioningId(visitor.id);

            try {
                await request(
                    `${BASE_URL}/admin/hostel/visitors/${visitor.id}/reject`,
                    { method: "POST" },
                );

                notify("Visitor request rejected", "success");
                await loadVisitors({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to reject visitor", "error");
            } finally {
                setActioningId(null);
            }
        },
        [canWriteHostel, loadVisitors, notify, request],
    );

    const checkoutVisitor = useCallback(
        async (visitor) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            setActioningId(visitor.id);

            try {
                await request(
                    `${BASE_URL}/admin/hostel/visitors/${visitor.id}/checkout`,
                    { method: "POST" },
                );

                notify("Visitor checked out", "success");
                await loadVisitors({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to check out visitor", "error");
            } finally {
                setActioningId(null);
            }
        },
        [canWriteHostel, loadVisitors, notify, request],
    );

    const deleteVisitor = useCallback(
        async (visitor) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            if (!window.confirm(`Delete this visitor record for ${visitor.visitor_name}?`)) {
                return;
            }

            try {
                await request(`${BASE_URL}/admin/hostel/visitors/${visitor.id}`, {
                    method: "DELETE",
                });

                notify("Visitor record deleted", "success");
                await loadVisitors({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to delete visitor record", "error");
            }
        },
        [canWriteHostel, loadVisitors, notify, request],
    );

    useEffect(() => {
        if (activeSection !== "visitors") {
            loadedRef.current = false;
            return;
        }

        if (loadedRef.current) {
            return;
        }

        loadedRef.current = true;
        loadVisitors({ filters: EMPTY_FILTERS });
    }, [activeSection, loadVisitors]);

    return {
        visitors,
        visitorStats,
        visitorsLoading,
        visitorFilters,

        loadVisitors,
        updateVisitorFilter,
        applyVisitorFilters,
        resetVisitorFilters,

        visitorModalOpen,
        visitorForm,
        visitorSaving,
        openVisitorModal,
        closeVisitorModal,
        updateVisitorForm,

        studentSearch,
        setStudentSearch,
        studentResults,
        studentSearchLoading,
        selectedStudent,
        searchStudentsForVisitor,
        selectVisitorStudent,
        saveVisitor,

        actioningId,
        approveVisitor,
        rejectVisitor,
        checkoutVisitor,
        deleteVisitor,

        canWriteHostel,
    };
}
