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
    open: 0,
    in_progress: 0,
    resolved: 0,
    urgent: 0,
};

const EMPTY_FORM = {
    id: null,
    title: "",
    description: "",
    room_id: "",
    block_id: "",
    category: "Other",
    priority: "Medium",
    assigned_staff_id: "",
    status: "Open",
    resolution_notes: "",
};

export function useHostelMaintenance({ activeSection, fetchWithAuth, showToast }) {
    const { canWriteHostel } = useHostelPermission();

    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);
    const loadedRef = useRef(false);
    const runningRef = useRef(false);

    const [requests, setRequests] = useState([]);
    const [maintenanceStats, setMaintenanceStats] = useState({ ...EMPTY_STATS });
    const [maintenanceLoading, setMaintenanceLoading] = useState(false);
    const [maintenanceFilters, setMaintenanceFilters] = useState({ ...EMPTY_FILTERS });

    const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
    const [maintenanceForm, setMaintenanceForm] = useState({ ...EMPTY_FORM });
    const [maintenanceSaving, setMaintenanceSaving] = useState(false);

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

    const loadMaintenance = useCallback(
        async ({ filters: nextFilters = maintenanceFilters, silent = false } = {}) => {
            if (runningRef.current) {
                return;
            }

            runningRef.current = true;
            setMaintenanceLoading(true);

            try {
                const params = new URLSearchParams();

                Object.entries(nextFilters).forEach(([key, value]) => {
                    const normalized = String(value ?? "").trim();

                    if (normalized) {
                        params.set(key, normalized);
                    }
                });

                const data = await request(
                    `${BASE_URL}/admin/hostel/maintenance?${params.toString()}`,
                );

                setRequests(Array.isArray(data.requests) ? data.requests : []);
                setMaintenanceStats({ ...EMPTY_STATS, ...(data.stats || {}) });
            } catch (error) {
                console.error("Hostel maintenance load error:", error);

                if (!silent) {
                    notify(error.message || "Failed to load maintenance requests", "error");
                }
            } finally {
                runningRef.current = false;
                setMaintenanceLoading(false);
            }
        },
        [maintenanceFilters, notify, request],
    );

    const updateMaintenanceFilter = useCallback((name, value) => {
        setMaintenanceFilters((current) => ({ ...current, [name]: value }));
    }, []);

    const applyMaintenanceFilters = useCallback(() => {
        loadMaintenance({ filters: maintenanceFilters });
    }, [loadMaintenance, maintenanceFilters]);

    const resetMaintenanceFilters = useCallback(() => {
        const next = { ...EMPTY_FILTERS };
        setMaintenanceFilters(next);
        loadMaintenance({ filters: next });
    }, [loadMaintenance]);

    // ============================================================
    // CREATE / EDIT
    // ============================================================
    const openCreateMaintenanceModal = useCallback(() => {
        setMaintenanceForm({ ...EMPTY_FORM });
        setMaintenanceModalOpen(true);
    }, []);

    const openEditMaintenanceModal = useCallback((req) => {
        setMaintenanceForm({
            id: req.id,
            title: req.title || "",
            description: req.description || "",
            room_id: req.room_id || "",
            block_id: req.block_id || "",
            category: req.category || "Other",
            priority: req.priority || "Medium",
            assigned_staff_id: req.assigned_staff_id || "",
            status: req.status || "Open",
            resolution_notes: req.resolution_notes || "",
        });
        setMaintenanceModalOpen(true);
    }, []);

    const closeMaintenanceModal = useCallback(() => {
        setMaintenanceModalOpen(false);
    }, []);

    const updateMaintenanceForm = useCallback((name, value) => {
        setMaintenanceForm((current) => ({ ...current, [name]: value }));
    }, []);

    const saveMaintenance = useCallback(async () => {
        if (!maintenanceForm.title.trim()) {
            notify("Title is required", "error");
            return;
        }

        if (!canWriteHostel) {
            notify(HOSTEL_READ_ONLY_MESSAGE, "error");
            return;
        }

        setMaintenanceSaving(true);

        try {
            const isEdit = Boolean(maintenanceForm.id);

            const payload = {
                title: maintenanceForm.title.trim(),
                description: maintenanceForm.description.trim(),
                room_id: maintenanceForm.room_id || null,
                block_id: maintenanceForm.block_id || null,
                category: maintenanceForm.category,
                priority: maintenanceForm.priority,
                assigned_staff_id: maintenanceForm.assigned_staff_id || null,
            };

            if (isEdit) {
                payload.status = maintenanceForm.status;
                payload.resolution_notes = maintenanceForm.resolution_notes;
            }

            await request(
                isEdit
                    ? `${BASE_URL}/admin/hostel/maintenance/${maintenanceForm.id}`
                    : `${BASE_URL}/admin/hostel/maintenance`,
                {
                    method: isEdit ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );

            notify(isEdit ? "Maintenance request updated" : "Maintenance request logged", "success");
            setMaintenanceModalOpen(false);
            await loadMaintenance({ silent: true });
        } catch (error) {
            notify(error.message || "Failed to save maintenance request", "error");
        } finally {
            setMaintenanceSaving(false);
        }
    }, [canWriteHostel, loadMaintenance, maintenanceForm, notify, request]);

    const deleteMaintenance = useCallback(
        async (req) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            if (!window.confirm(`Delete maintenance request "${req.title}"?`)) {
                return;
            }

            try {
                await request(`${BASE_URL}/admin/hostel/maintenance/${req.id}`, {
                    method: "DELETE",
                });

                notify("Maintenance request deleted", "success");
                await loadMaintenance({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to delete maintenance request", "error");
            }
        },
        [canWriteHostel, loadMaintenance, notify, request],
    );

    const quickUpdateStatus = useCallback(
        async (req, status) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            try {
                await request(`${BASE_URL}/admin/hostel/maintenance/${req.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status }),
                });

                notify(`Marked ${status}`, "success");
                await loadMaintenance({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to update status", "error");
            }
        },
        [canWriteHostel, loadMaintenance, notify, request],
    );

    useEffect(() => {
        if (activeSection !== "maintenance") {
            loadedRef.current = false;
            return;
        }

        if (loadedRef.current) {
            return;
        }

        loadedRef.current = true;
        loadMaintenance({ filters: EMPTY_FILTERS });
    }, [activeSection, loadMaintenance]);

    return {
        requests,
        maintenanceStats,
        maintenanceLoading,
        maintenanceFilters,

        loadMaintenance,
        updateMaintenanceFilter,
        applyMaintenanceFilters,
        resetMaintenanceFilters,

        maintenanceModalOpen,
        maintenanceForm,
        maintenanceSaving,
        openCreateMaintenanceModal,
        openEditMaintenanceModal,
        closeMaintenanceModal,
        updateMaintenanceForm,
        saveMaintenance,
        deleteMaintenance,
        quickUpdateStatus,

        canWriteHostel,
    };
}
