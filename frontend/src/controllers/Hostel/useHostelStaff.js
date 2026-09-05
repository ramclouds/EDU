import { useCallback, useEffect, useRef, useState } from "react";

import { BASE_URL } from "../../config/appConfig";
import { useHostelPermission, HOSTEL_READ_ONLY_MESSAGE } from "./useHostelPermission";

const EMPTY_FILTERS = {
    search: "",
    role: "",
    block_id: "",
    status: "",
};

const EMPTY_STATS = {
    total: 0,
    wardens: 0,
    security: 0,
    support: 0,
};

const EMPTY_STAFF_FORM = {
    id: null,
    first_name: "",
    middle_name: "",
    last_name: "",
    role: "Warden",
    block_id: "",
    shift: "Morning",
    mobile: "",
    email: "",
    status: "Active",
};

export function useHostelStaff({ activeSection, fetchWithAuth, showToast }) {
    const { canWriteHostel } = useHostelPermission();

    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);
    const loadedRef = useRef(false);
    const runningRef = useRef(false);

    const [staffList, setStaffList] = useState([]);
    const [staffStats, setStaffStats] = useState({ ...EMPTY_STATS });
    const [staffLoading, setStaffLoading] = useState(false);
    const [staffFilters, setStaffFilters] = useState({ ...EMPTY_FILTERS });

    const [staffModalOpen, setStaffModalOpen] = useState(false);
    const [staffForm, setStaffForm] = useState({ ...EMPTY_STAFF_FORM });
    const [staffSaving, setStaffSaving] = useState(false);

    const [selectedStaff, setSelectedStaff] = useState(null);
    const [staffDetailsOpen, setStaffDetailsOpen] = useState(false);

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

    const loadStaff = useCallback(
        async ({ filters: nextFilters = staffFilters, silent = false } = {}) => {
            if (runningRef.current) {
                return;
            }

            runningRef.current = true;
            setStaffLoading(true);

            try {
                const params = new URLSearchParams();

                Object.entries(nextFilters).forEach(([key, value]) => {
                    const normalized = String(value ?? "").trim();

                    if (normalized) {
                        params.set(key, normalized);
                    }
                });

                const data = await request(
                    `${BASE_URL}/admin/hostel/staff?${params.toString()}`,
                );

                setStaffList(Array.isArray(data.staff) ? data.staff : []);
                setStaffStats({ ...EMPTY_STATS, ...(data.stats || {}) });
            } catch (error) {
                console.error("Hostel staff load error:", error);

                if (!silent) {
                    notify(error.message || "Failed to load hostel staff", "error");
                }
            } finally {
                runningRef.current = false;
                setStaffLoading(false);
            }
        },
        [notify, request, staffFilters],
    );

    const updateStaffFilter = useCallback((name, value) => {
        setStaffFilters((current) => ({ ...current, [name]: value }));
    }, []);

    const applyStaffFilters = useCallback(() => {
        loadStaff({ filters: staffFilters });
    }, [loadStaff, staffFilters]);

    const resetStaffFilters = useCallback(() => {
        const next = { ...EMPTY_FILTERS };
        setStaffFilters(next);
        loadStaff({ filters: next });
    }, [loadStaff]);

    // ============================================================
    // STAFF CRUD
    // ============================================================
    const openCreateStaffModal = useCallback(() => {
        setStaffForm({ ...EMPTY_STAFF_FORM });
        setStaffModalOpen(true);
    }, []);

    const openEditStaffModal = useCallback((staff) => {
        setStaffForm({
            id: staff.id,
            first_name: staff.name?.split(" ")?.[0] || "",
            middle_name: "",
            last_name: staff.name?.split(" ")?.slice(1).join(" ") || "",
            role: staff.role || "Warden",
            block_id: staff.block_id || "",
            shift: staff.shift || "Morning",
            mobile: staff.mobile || "",
            email: staff.email || "",
            status: staff.status || "Active",
        });
        setStaffModalOpen(true);
    }, []);

    const closeStaffModal = useCallback(() => {
        setStaffModalOpen(false);
    }, []);

    const updateStaffForm = useCallback((name, value) => {
        setStaffForm((current) => ({ ...current, [name]: value }));
    }, []);

    const saveStaff = useCallback(async () => {
        if (!staffForm.first_name.trim()) {
            notify("First name is required", "error");
            return;
        }

        if (!canWriteHostel) {
            notify(HOSTEL_READ_ONLY_MESSAGE, "error");
            return;
        }

        setStaffSaving(true);

        try {
            const isEdit = Boolean(staffForm.id);

            const payload = {
                first_name: staffForm.first_name.trim(),
                middle_name: staffForm.middle_name.trim(),
                last_name: staffForm.last_name.trim(),
                role: staffForm.role,
                block_id: staffForm.block_id || null,
                shift: staffForm.shift,
                mobile: staffForm.mobile.trim(),
                email: staffForm.email.trim(),
                status: staffForm.status,
            };

            await request(
                isEdit
                    ? `${BASE_URL}/admin/hostel/staff/${staffForm.id}`
                    : `${BASE_URL}/admin/hostel/staff`,
                {
                    method: isEdit ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );

            notify(isEdit ? "Staff member updated" : "Staff member added", "success");
            setStaffModalOpen(false);
            await loadStaff({ silent: true });
        } catch (error) {
            notify(error.message || "Failed to save staff member", "error");
        } finally {
            setStaffSaving(false);
        }
    }, [canWriteHostel, loadStaff, notify, request, staffForm]);

    const deleteStaff = useCallback(
        async (staff) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            if (!window.confirm(`Remove staff member "${staff.name}"?`)) {
                return;
            }

            try {
                await request(`${BASE_URL}/admin/hostel/staff/${staff.id}`, {
                    method: "DELETE",
                });

                notify("Staff member removed", "success");
                await loadStaff({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to remove staff member", "error");
            }
        },
        [canWriteHostel, loadStaff, notify, request],
    );

    const openStaffDetails = useCallback((staff) => {
        setSelectedStaff(staff);
        setStaffDetailsOpen(true);
    }, []);

    const closeStaffDetails = useCallback(() => {
        setSelectedStaff(null);
        setStaffDetailsOpen(false);
    }, []);

    useEffect(() => {
        if (activeSection !== "staff") {
            loadedRef.current = false;
            return;
        }

        if (loadedRef.current) {
            return;
        }

        loadedRef.current = true;
        loadStaff({ filters: EMPTY_FILTERS });
    }, [activeSection, loadStaff]);

    return {
        staffList,
        staffStats,
        staffLoading,
        staffFilters,

        loadStaff,
        updateStaffFilter,
        applyStaffFilters,
        resetStaffFilters,

        staffModalOpen,
        staffForm,
        staffSaving,
        openCreateStaffModal,
        openEditStaffModal,
        closeStaffModal,
        updateStaffForm,
        saveStaff,
        deleteStaff,

        selectedStaff,
        staffDetailsOpen,
        openStaffDetails,
        closeStaffDetails,

        canWriteHostel,
    };
}
