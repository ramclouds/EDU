import { useCallback, useEffect, useRef, useState } from "react";

import { BASE_URL } from "../../config/appConfig";
import { useHostelPermission, HOSTEL_READ_ONLY_MESSAGE } from "./useHostelPermission";

const EMPTY_FILTERS = {
    search: "",
    status: "",
    category: "",
    priority: "",
};

const EMPTY_STATS = {
    total: 0,
    pending: 0,
    in_progress: 0,
    resolved: 0,
    urgent: 0,
};


export function useHostelComplaints({ activeSection, fetchWithAuth, showToast }) {
    const { canWriteHostel } = useHostelPermission();

    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);
    const loadedRef = useRef(false);
    const runningRef = useRef(false);

    const [complaints, setComplaints] = useState([]);
    const [complaintStats, setComplaintStats] = useState({ ...EMPTY_STATS });
    const [complaintsLoading, setComplaintsLoading] = useState(false);
    const [complaintFilters, setComplaintFilters] = useState({ ...EMPTY_FILTERS });

    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [complaintModalOpen, setComplaintModalOpen] = useState(false);
    const [complaintSaving, setComplaintSaving] = useState(false);

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

    const loadComplaints = useCallback(
        async ({ filters: nextFilters = complaintFilters, silent = false } = {}) => {
            if (runningRef.current) {
                return;
            }

            runningRef.current = true;
            setComplaintsLoading(true);

            try {
                const params = new URLSearchParams();

                Object.entries(nextFilters).forEach(([key, value]) => {
                    const normalized = String(value ?? "").trim();

                    if (normalized) {
                        params.set(key, normalized);
                    }
                });

                const data = await request(
                    `${BASE_URL}/admin/hostel/complaints?${params.toString()}`,
                );

                setComplaints(Array.isArray(data.complaints) ? data.complaints : []);
                setComplaintStats({ ...EMPTY_STATS, ...(data.stats || {}) });
            } catch (error) {
                console.error("Hostel complaints load error:", error);

                if (!silent) {
                    notify(error.message || "Failed to load complaints", "error");
                }
            } finally {
                runningRef.current = false;
                setComplaintsLoading(false);
            }
        },
        [complaintFilters, notify, request],
    );

    const updateComplaintFilter = useCallback((name, value) => {
        setComplaintFilters((current) => ({ ...current, [name]: value }));
    }, []);

    const applyComplaintFilters = useCallback(() => {
        loadComplaints({ filters: complaintFilters });
    }, [complaintFilters, loadComplaints]);

    const resetComplaintFilters = useCallback(() => {
        const next = { ...EMPTY_FILTERS };
        setComplaintFilters(next);
        loadComplaints({ filters: next });
    }, [loadComplaints]);

    // ============================================================
    // TRIAGE MODAL
    // ============================================================
    const openComplaintModal = useCallback((complaint) => {
        setSelectedComplaint({ ...complaint });
        setComplaintModalOpen(true);
    }, []);

    const closeComplaintModal = useCallback(() => {
        setComplaintModalOpen(false);
        setSelectedComplaint(null);
    }, []);

    const updateSelectedComplaint = useCallback((name, value) => {
        setSelectedComplaint((current) => ({ ...current, [name]: value }));
    }, []);

    const saveComplaint = useCallback(async () => {
        if (!selectedComplaint?.id) {
            return;
        }

        if (!canWriteHostel) {
            notify(HOSTEL_READ_ONLY_MESSAGE, "error");
            return;
        }

        setComplaintSaving(true);

        try {
            await request(`${BASE_URL}/admin/hostel/complaints/${selectedComplaint.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: selectedComplaint.status,
                    category: selectedComplaint.category,
                    priority: selectedComplaint.priority,
                    resolution_notes: selectedComplaint.resolution_notes || "",
                }),
            });

            notify("Complaint updated", "success");
            setComplaintModalOpen(false);
            await loadComplaints({ silent: true });
        } catch (error) {
            notify(error.message || "Failed to update complaint", "error");
        } finally {
            setComplaintSaving(false);
        }
    }, [canWriteHostel, loadComplaints, notify, request, selectedComplaint]);

    const deleteComplaint = useCallback(
        async (complaint) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            if (
                !window.confirm(
                    `Delete this complaint from ${complaint.student_name}?`,
                )
            ) {
                return;
            }

            try {
                await request(`${BASE_URL}/admin/hostel/complaints/${complaint.id}`, {
                    method: "DELETE",
                });

                notify("Complaint deleted", "success");
                await loadComplaints({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to delete complaint", "error");
            }
        },
        [canWriteHostel, loadComplaints, notify, request],
    );

    useEffect(() => {
        if (activeSection !== "complaints") {
            loadedRef.current = false;
            return;
        }

        if (loadedRef.current) {
            return;
        }

        loadedRef.current = true;
        loadComplaints({ filters: EMPTY_FILTERS });
    }, [activeSection, loadComplaints]);

    return {
        complaints,
        complaintStats,
        complaintsLoading,
        complaintFilters,

        loadComplaints,
        updateComplaintFilter,
        applyComplaintFilters,
        resetComplaintFilters,

        selectedComplaint,
        complaintModalOpen,
        complaintSaving,
        openComplaintModal,
        closeComplaintModal,
        updateSelectedComplaint,
        saveComplaint,
        deleteComplaint,

        canWriteHostel,
    };
}
