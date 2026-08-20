import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BASE_URL } from "../../config/appConfig";
import { useHostelPermission, HOSTEL_READ_ONLY_MESSAGE } from "./useHostelPermission";

const EMPTY_FILTERS = {
    search: "",
    block_id: "",
    floor_id: "",
    status: "active",
};

const EMPTY_STATS = {
    total: 0,
    active: 0,
    checked_out: 0,
    fee_pending: 0,
};


export function useHostelStudents({ activeSection, fetchWithAuth, showToast }) {
    const { canWriteHostel } = useHostelPermission();

    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);
    const loadedRef = useRef(false);
    const runningRef = useRef(false);

    const [allocations, setAllocations] = useState([]);
    const [stats, setStats] = useState({ ...EMPTY_STATS });
    const [allocationsLoading, setAllocationsLoading] = useState(false);
    const [filters, setFilters] = useState({ ...EMPTY_FILTERS });

    const [checkingOutId, setCheckingOutId] = useState(null);

    const [selectedAllocation, setSelectedAllocation] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

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

    const loadStudents = useCallback(
        async ({ filters: nextFilters = filters, silent = false } = {}) => {
            if (runningRef.current) {
                return;
            }

            runningRef.current = true;
            setAllocationsLoading(true);

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

                setAllocations(Array.isArray(data.allocations) ? data.allocations : []);
                setStats({ ...EMPTY_STATS, ...(data.stats || {}) });
            } catch (error) {
                console.error("Hostel students load error:", error);

                if (!silent) {
                    notify(error.message || "Failed to load hostel students", "error");
                }
            } finally {
                runningRef.current = false;
                setAllocationsLoading(false);
            }
        },
        [filters, notify, request],
    );

    const updateFilter = useCallback((name, value) => {
        setFilters((current) => ({ ...current, [name]: value }));
    }, []);

    const applyFilters = useCallback(() => {
        loadStudents({ filters });
    }, [filters, loadStudents]);

    const resetFilters = useCallback(() => {
        const next = { ...EMPTY_FILTERS };
        setFilters(next);
        loadStudents({ filters: next });
    }, [loadStudents]);

    const checkoutStudent = useCallback(
        async (allocation) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            if (
                !window.confirm(
                    `Check out ${allocation.student_name} from bed ${allocation.bed_number}?`,
                )
            ) {
                return;
            }

            setCheckingOutId(allocation.id);

            try {
                await request(
                    `${BASE_URL}/admin/hostel/allocations/${allocation.id}/checkout`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({}),
                    },
                );

                notify("Student checked out", "success");
                await loadStudents({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to check out student", "error");
            } finally {
                setCheckingOutId(null);
            }
        },
        [canWriteHostel, loadStudents, notify, request],
    );

    const openStudentDetails = useCallback((allocation) => {
        setSelectedAllocation(allocation);
        setDetailsOpen(true);
    }, []);

    const closeStudentDetails = useCallback(() => {
        setSelectedAllocation(null);
        setDetailsOpen(false);
    }, []);

    const filteredBySearch = useMemo(() => {
        const query = filters.search.trim().toLowerCase();

        if (!query) {
            return allocations;
        }

        return allocations.filter((row) =>
            [row.student_name, row.student_code, row.room_number]
                .join(" ")
                .toLowerCase()
                .includes(query),
        );
    }, [allocations, filters.search]);

    useEffect(() => {
        if (activeSection !== "students") {
            loadedRef.current = false;
            return;
        }

        if (loadedRef.current) {
            return;
        }

        loadedRef.current = true;

        loadStudents({
            filters: EMPTY_FILTERS,
            silent: false,
        });
    }, [activeSection, loadStudents]);

    return {
        allocations: filteredBySearch,
        stats,
        allocationsLoading,
        filters,

        loadStudents,
        updateFilter,
        applyFilters,
        resetFilters,

        checkingOutId,
        checkoutStudent,

        selectedAllocation,
        detailsOpen,
        openStudentDetails,
        closeStudentDetails,

        canWriteHostel,
    };
}
