import { useCallback, useEffect, useRef, useState } from "react";

import { BASE_URL } from "../../config/appConfig";

const EMPTY_FILTERS = {
    search: "",
    category: "",
};

const EMPTY_STATS = {
    total: 0,
    by_category: {},
};

/**
 * Drives the "Activity Logs" dashboard section: an audit trail of
 * significant admin actions across the hostel module (allocations,
 * payments, complaint/maintenance status changes, leave decisions,
 * staff changes, visitor decisions). Read-only - logs are written
 * automatically by the endpoints that perform those actions.
 */
export function useHostelActivityLogs({ activeSection, fetchWithAuth, showToast }) {
    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);
    const loadedRef = useRef(false);
    const runningRef = useRef(false);

    const [logs, setLogs] = useState([]);
    const [logStats, setLogStats] = useState({ ...EMPTY_STATS });
    const [logsLoading, setLogsLoading] = useState(false);
    const [logFilters, setLogFilters] = useState({ ...EMPTY_FILTERS });

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

    const loadLogs = useCallback(
        async ({ filters: nextFilters = logFilters, silent = false } = {}) => {
            if (runningRef.current) {
                return;
            }

            runningRef.current = true;
            setLogsLoading(true);

            try {
                const params = new URLSearchParams();

                Object.entries(nextFilters).forEach(([key, value]) => {
                    const normalized = String(value ?? "").trim();

                    if (normalized) {
                        params.set(key, normalized);
                    }
                });

                const data = await request(
                    `${BASE_URL}/admin/hostel/activity-logs?${params.toString()}`,
                );

                setLogs(Array.isArray(data.logs) ? data.logs : []);
                setLogStats({ ...EMPTY_STATS, ...(data.stats || {}) });
            } catch (error) {
                console.error("Hostel activity logs load error:", error);

                if (!silent) {
                    notify(error.message || "Failed to load activity logs", "error");
                }
            } finally {
                runningRef.current = false;
                setLogsLoading(false);
            }
        },
        [logFilters, notify, request],
    );

    const updateLogFilter = useCallback((name, value) => {
        setLogFilters((current) => ({ ...current, [name]: value }));
    }, []);

    const applyLogFilters = useCallback(() => {
        loadLogs({ filters: logFilters });
    }, [loadLogs, logFilters]);

    const resetLogFilters = useCallback(() => {
        const next = { ...EMPTY_FILTERS };
        setLogFilters(next);
        loadLogs({ filters: next });
    }, [loadLogs]);

    useEffect(() => {
        if (activeSection !== "activity-logs") {
            loadedRef.current = false;
            return;
        }

        if (loadedRef.current) {
            return;
        }

        loadedRef.current = true;
        loadLogs({ filters: EMPTY_FILTERS });
    }, [activeSection, loadLogs]);

    return {
        logs,
        logStats,
        logsLoading,
        logFilters,

        loadLogs,
        updateLogFilter,
        applyLogFilters,
        resetLogFilters,
    };
}
