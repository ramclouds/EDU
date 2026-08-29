import { useCallback, useEffect, useRef, useState } from "react";

import { BASE_URL } from "../../config/appConfig";

const EMPTY_REPORT = {
    occupancy: {
        total_beds: 0,
        occupied_beds: 0,
        vacant_beds: 0,
        maintenance_beds: 0,
        occupancy_rate: 0,
        active_residents: 0,
        by_block: [],
    },
    fees: {
        total_invoiced: 0,
        total_collected: 0,
        total_pending: 0,
        collection_rate: 0,
    },
    complaints: { total: 0, resolved: 0, resolution_rate: 0 },
    maintenance: { total: 0, resolved: 0 },
    attendance_trend: [],
    movement: { currently_outside: 0 },
};

/**
 * Drives the "Reports & Analytics" dashboard section: one aggregated
 * snapshot across occupancy, fees, complaints/maintenance, attendance
 * and movement. Reuses the same /admin/hostel/reports endpoint that
 * computes everything from the same helpers each individual section
 * already trusts, so nothing here can quietly disagree with those.
 */
export function useHostelReports({ activeSection, fetchWithAuth, showToast }) {
    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);
    const loadedRef = useRef(false);
    const runningRef = useRef(false);

    const [report, setReport] = useState({ ...EMPTY_REPORT });
    const [reportLoading, setReportLoading] = useState(false);

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

    const loadReport = useCallback(
        async ({ silent = false } = {}) => {
            if (runningRef.current) {
                return;
            }

            runningRef.current = true;
            setReportLoading(true);

            try {
                const data = await request(`${BASE_URL}/admin/hostel/reports`);

                setReport({
                    occupancy: { ...EMPTY_REPORT.occupancy, ...(data.occupancy || {}) },
                    fees: { ...EMPTY_REPORT.fees, ...(data.fees || {}) },
                    complaints: { ...EMPTY_REPORT.complaints, ...(data.complaints || {}) },
                    maintenance: {
                        ...EMPTY_REPORT.maintenance,
                        ...(data.maintenance || {}),
                    },
                    attendance_trend: Array.isArray(data.attendance_trend)
                        ? data.attendance_trend
                        : [],
                    movement: { ...EMPTY_REPORT.movement, ...(data.movement || {}) },
                });
            } catch (error) {
                console.error("Hostel report load error:", error);

                if (!silent) {
                    notify(error.message || "Failed to load report", "error");
                }
            } finally {
                runningRef.current = false;
                setReportLoading(false);
            }
        },
        [notify, request],
    );

    useEffect(() => {
        if (activeSection !== "reports") {
            loadedRef.current = false;
            return;
        }

        if (loadedRef.current) {
            return;
        }

        loadedRef.current = true;
        loadReport();
    }, [activeSection, loadReport]);

    return {
        report,
        reportLoading,
        loadReport,
    };
}
