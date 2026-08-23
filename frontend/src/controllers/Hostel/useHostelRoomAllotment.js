import { useCallback, useEffect, useRef, useState } from "react";

import { BASE_URL } from "../../config/appConfig";
import { useHostelPermission, HOSTEL_READ_ONLY_MESSAGE } from "./useHostelPermission";

const EMPTY_FILTERS = {
    search: "",
    floor_id: "",
    room_type: "",
    status: "active",
};

const EMPTY_STATS = {
    total: 0,
    active: 0,
    checked_out: 0,
    fee_pending: 0,
};

export function useHostelRoomAllotment({ activeSection, fetchWithAuth, showToast }) {
    const { canWriteHostel } = useHostelPermission();

    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);
    const loadedRef = useRef(false);
    const runningRef = useRef(false);

    const [allotments, setAllotments] = useState([]);
    const [stats, setStats] = useState({ ...EMPTY_STATS });
    const [allotmentsLoading, setAllotmentsLoading] = useState(false);
    const [filters, setFilters] = useState({ ...EMPTY_FILTERS });

    const [checkingOutId, setCheckingOutId] = useState(null);

    // ---- Transfer modal ----
    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [transferSource, setTransferSource] = useState(null);
    const [transferSaving, setTransferSaving] = useState(false);
    const [vacantBeds, setVacantBeds] = useState([]);
    const [vacantBedsLoading, setVacantBedsLoading] = useState(false);
    const [selectedTargetBedId, setSelectedTargetBedId] = useState(null);

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

    const loadAllotments = useCallback(
        async ({ filters: nextFilters = filters, silent = false } = {}) => {
            if (runningRef.current) {
                return;
            }

            runningRef.current = true;
            setAllotmentsLoading(true);

            try {
                const params = new URLSearchParams();

                Object.entries(nextFilters).forEach(([key, value]) => {
                    const normalized = String(value ?? "").trim();

                    if (normalized) {
                        params.set(key, normalized);
                    }
                });

                const data = await request(
                    `${BASE_URL}/admin/hostel/allocations?${params.toString()}`,
                );

                setAllotments(Array.isArray(data.allocations) ? data.allocations : []);
                setStats({ ...EMPTY_STATS, ...(data.stats || {}) });
            } catch (error) {
                console.error("Hostel room allotment load error:", error);

                if (!silent) {
                    notify(error.message || "Failed to load room allotments", "error");
                }
            } finally {
                runningRef.current = false;
                setAllotmentsLoading(false);
            }
        },
        [filters, notify, request],
    );

    const updateFilter = useCallback((name, value) => {
        setFilters((current) => ({ ...current, [name]: value }));
    }, []);

    const applyFilters = useCallback(() => {
        loadAllotments({ filters });
    }, [filters, loadAllotments]);

    const resetFilters = useCallback(() => {
        const next = { ...EMPTY_FILTERS };
        setFilters(next);
        loadAllotments({ filters: next });
    }, [loadAllotments]);

    const checkoutAllotment = useCallback(
        async (allotment) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            if (
                !window.confirm(
                    `Check out ${allotment.student_name} from Room ${allotment.room_number}?`,
                )
            ) {
                return;
            }

            setCheckingOutId(allotment.id);

            try {
                await request(
                    `${BASE_URL}/admin/hostel/allocations/${allotment.id}/checkout`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({}),
                    },
                );

                notify("Student checked out", "success");
                await loadAllotments({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to check out student", "error");
            } finally {
                setCheckingOutId(null);
            }
        },
        [canWriteHostel, loadAllotments, notify, request],
    );


    // TRANSFER

    const openTransferModal = useCallback(
        async (allotment) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            setTransferSource(allotment);
            setSelectedTargetBedId(null);
            setTransferModalOpen(true);
            setVacantBedsLoading(true);

            try {
                const data = await request(
                    `${BASE_URL}/admin/hostel/beds?status=Vacant`,
                );

                setVacantBeds(Array.isArray(data.beds) ? data.beds : []);
            } catch (error) {
                notify(error.message || "Failed to load vacant beds", "error");
            } finally {
                setVacantBedsLoading(false);
            }
        },
        [canWriteHostel, notify, request],
    );

    const closeTransferModal = useCallback(() => {
        setTransferModalOpen(false);
        setTransferSource(null);
        setVacantBeds([]);
        setSelectedTargetBedId(null);
    }, []);

    const confirmTransfer = useCallback(async () => {
        if (!transferSource) {
            return;
        }

        if (!selectedTargetBedId) {
            notify("Select a bed to transfer to", "error");
            return;
        }

        if (!canWriteHostel) {
            notify(HOSTEL_READ_ONLY_MESSAGE, "error");
            return;
        }

        setTransferSaving(true);

        try {
            await request(
                `${BASE_URL}/admin/hostel/allocations/${transferSource.id}/transfer`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ new_bed_id: selectedTargetBedId }),
                },
            );

            notify("Student transferred successfully", "success");
            closeTransferModal();
            await loadAllotments({ silent: true });
        } catch (error) {
            notify(error.message || "Failed to transfer student", "error");
        } finally {
            setTransferSaving(false);
        }
    }, [
        canWriteHostel,
        closeTransferModal,
        loadAllotments,
        notify,
        request,
        selectedTargetBedId,
        transferSource,
    ]);

    useEffect(() => {
        if (activeSection !== "room-allotment") {
            loadedRef.current = false;
            return;
        }

        if (loadedRef.current) {
            return;
        }

        loadedRef.current = true;
        loadAllotments({ filters: EMPTY_FILTERS });
    }, [activeSection, loadAllotments]);

    return {
        allotments,
        stats,
        allotmentsLoading,
        filters,

        loadAllotments,
        updateFilter,
        applyFilters,
        resetFilters,

        checkingOutId,
        checkoutAllotment,

        transferModalOpen,
        transferSource,
        transferSaving,
        vacantBeds,
        vacantBedsLoading,
        selectedTargetBedId,
        setSelectedTargetBedId,
        openTransferModal,
        closeTransferModal,
        confirmTransfer,

        canWriteHostel,
    };
}
