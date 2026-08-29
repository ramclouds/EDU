import { useCallback, useEffect, useRef, useState } from "react";

import { BASE_URL } from "../../config/appConfig";

const EMPTY_FILTERS = {
    search: "",
    status: "",
};

const EMPTY_STATS = {
    total_invoices: 0,
    total_amount: 0,
    total_collected: 0,
    total_pending: 0,
    overdue_count: 0,
};

/**
 * Drives the "Pending Dues" dashboard section: every fee invoice with
 * an outstanding balance, worst-overdue-first. Reuses the same
 * /admin/hostel/fees endpoint as Fee Management (dues_only=true) so
 * this view can never disagree with the numbers shown there.
 */
export function useHostelPendingDues({ activeSection, fetchWithAuth, showToast }) {
    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);
    const loadedRef = useRef(false);
    const runningRef = useRef(false);

    const [dues, setDues] = useState([]);
    const [duesStats, setDuesStats] = useState({ ...EMPTY_STATS });
    const [duesLoading, setDuesLoading] = useState(false);
    const [duesFilters, setDuesFilters] = useState({ ...EMPTY_FILTERS });

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

    const loadDues = useCallback(
        async ({ filters: nextFilters = duesFilters, silent = false } = {}) => {
            if (runningRef.current) {
                return;
            }

            runningRef.current = true;
            setDuesLoading(true);

            try {
                const params = new URLSearchParams();
                params.set("dues_only", "true");

                Object.entries(nextFilters).forEach(([key, value]) => {
                    const normalized = String(value ?? "").trim();

                    if (normalized) {
                        params.set(key, normalized);
                    }
                });

                const data = await request(
                    `${BASE_URL}/admin/hostel/fees?${params.toString()}`,
                );

                const rows = Array.isArray(data.fees) ? data.fees : [];

                // Worst-overdue-first: overdue invoices at the top, then by
                // largest outstanding balance.
                rows.sort((a, b) => {
                    if (a.status === "Overdue" && b.status !== "Overdue") return -1;
                    if (b.status === "Overdue" && a.status !== "Overdue") return 1;
                    return b.balance - a.balance;
                });

                setDues(rows);
                setDuesStats({ ...EMPTY_STATS, ...(data.stats || {}) });
            } catch (error) {
                console.error("Pending dues load error:", error);

                if (!silent) {
                    notify(error.message || "Failed to load pending dues", "error");
                }
            } finally {
                runningRef.current = false;
                setDuesLoading(false);
            }
        },
        [duesFilters, notify, request],
    );

    const updateDuesFilter = useCallback((name, value) => {
        setDuesFilters((current) => ({ ...current, [name]: value }));
    }, []);

    const applyDuesFilters = useCallback(() => {
        loadDues({ filters: duesFilters });
    }, [duesFilters, loadDues]);

    const resetDuesFilters = useCallback(() => {
        const next = { ...EMPTY_FILTERS };
        setDuesFilters(next);
        loadDues({ filters: next });
    }, [loadDues]);

    useEffect(() => {
        if (activeSection !== "pending-dues") {
            loadedRef.current = false;
            return;
        }

        if (loadedRef.current) {
            return;
        }

        loadedRef.current = true;
        loadDues({ filters: EMPTY_FILTERS });
    }, [activeSection, loadDues]);

    return {
        dues,
        duesStats,
        duesLoading,
        duesFilters,

        loadDues,
        updateDuesFilter,
        applyDuesFilters,
        resetDuesFilters,
    };
}
