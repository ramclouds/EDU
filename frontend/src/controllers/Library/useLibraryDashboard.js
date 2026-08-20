import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { BASE_URL } from "../../config/appConfig";

const EMPTY_STATS = {
    total_titles: 0,
    total_copies: 0,
    available_copies: 0,
    issued_copies: 0,

    currently_issued: 0,
    overdue_books: 0,
    due_soon: 0,

    issued_today: 0,
    returned_today: 0,

    total_members: 0,
    students: 0,
    teachers: 0,
    staff: 0,
    admins: 0,

    fine_collected: 0,
    fine_pending: 0,
    fine_waived: 0,
};

export function useLibraryDashboard({
    activeSection,
    fetchWithAuth,
    showToast,
}) {
    const fetchRef =
        useRef(fetchWithAuth);

    const toastRef =
        useRef(showToast);

    const runningRef =
        useRef(false);

    const loadedRef =
        useRef(false);

    const [
        dashboardStats,
        setDashboardStats,
    ] = useState({
        ...EMPTY_STATS,
    });

    const [
        dashboardIssueTrend,
        setDashboardIssueTrend,
    ] = useState([]);

    const [
        dashboardRevenueTrend,
        setDashboardRevenueTrend,
    ] = useState([]);

    const [
        dashboardRecentActivity,
        setDashboardRecentActivity,
    ] = useState([]);

    const [
        dashboardOverdueAlerts,
        setDashboardOverdueAlerts,
    ] = useState([]);

    const [
        dashboardRecentBooks,
        setDashboardRecentBooks,
    ] = useState([]);

    const [
        libraryDashboardLoading,
        setLibraryDashboardLoading,
    ] = useState(false);

    useEffect(() => {
        fetchRef.current =
            fetchWithAuth;
    }, [fetchWithAuth]);

    useEffect(() => {
        toastRef.current =
            showToast;
    }, [showToast]);

    const notify = useCallback(
        (message, type = "info") => {
            toastRef.current?.(
                message,
                type
            );
        },
        []
    );

    const loadLibraryDashboard =
        useCallback(
            async ({
                silent = false,
            } = {}) => {
                if (runningRef.current) {
                    return;
                }

                if (
                    typeof fetchRef.current !==
                    "function"
                ) {
                    if (!silent) {
                        notify(
                            "Authenticated request unavailable",
                            "error"
                        );
                    }

                    return;
                }

                runningRef.current = true;

                setLibraryDashboardLoading(
                    true
                );

                try {
                    const response =
                        await fetchRef.current(
                            `${BASE_URL}/admin/library/dashboard`,
                            {
                                method: "GET",
                            }
                        );

                    let data = {};

                    try {
                        data =
                            await response.json();
                    } catch {
                        data = {};
                    }

                    if (!response.ok) {
                        throw new Error(
                            data.error ||
                            data.message ||
                            "Failed to load dashboard"
                        );
                    }

                    setDashboardStats({
                        ...EMPTY_STATS,
                        ...(data.stats || {}),
                    });

                    setDashboardIssueTrend(
                        Array.isArray(
                            data.issue_trend
                        )
                            ? data.issue_trend
                            : []
                    );

                    setDashboardRevenueTrend(
                        Array.isArray(
                            data.revenue_trend
                        )
                            ? data.revenue_trend
                            : []
                    );

                    setDashboardRecentActivity(
                        Array.isArray(
                            data.recent_activity
                        )
                            ? data.recent_activity
                            : []
                    );

                    setDashboardOverdueAlerts(
                        Array.isArray(
                            data.overdue_alerts
                        )
                            ? data.overdue_alerts
                            : []
                    );

                    setDashboardRecentBooks(
                        Array.isArray(
                            data.recent_books
                        )
                            ? data.recent_books
                            : []
                    );

                } catch (error) {
                    console.error(
                        "Library dashboard error:",
                        error
                    );

                    if (!silent) {
                        notify(
                            error.message ||
                            "Failed to load library dashboard",
                            "error"
                        );
                    }

                } finally {
                    runningRef.current =
                        false;

                    setLibraryDashboardLoading(
                        false
                    );
                }
            },
            [notify]
        );

    const maxIssueTrend =
        useMemo(
            () =>
                Math.max(
                    ...dashboardIssueTrend.map(
                        (item) =>
                            Math.max(
                                Number(
                                    item.issued ||
                                    0
                                ),
                                Number(
                                    item.returned ||
                                    0
                                )
                            )
                    ),
                    1
                ),
            [dashboardIssueTrend]
        );

    const maxRevenueTrend =
        useMemo(
            () =>
                Math.max(
                    ...dashboardRevenueTrend.map(
                        (item) =>
                            Number(
                                item.amount || 0
                            )
                    ),
                    1
                ),
            [dashboardRevenueTrend]
        );

    const formatActivityTime =
        useCallback((value) => {
            if (!value) {
                return "";
            }

            const date =
                new Date(value);

            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                return value;
            }

            const diff =
                Date.now() -
                date.getTime();

            const minutes =
                Math.floor(
                    diff / 60000
                );

            if (minutes < 1) {
                return "Just now";
            }

            if (minutes < 60) {
                return `${minutes} min ago`;
            }

            const hours =
                Math.floor(
                    minutes / 60
                );

            if (hours < 24) {
                return `${hours} hr${hours > 1 ? "s" : ""
                    } ago`;
            }

            const days =
                Math.floor(
                    hours / 24
                );

            if (days < 7) {
                return `${days} day${days > 1 ? "s" : ""
                    } ago`;
            }

            return date.toLocaleDateString();
        }, []);

    useEffect(() => {
        if (
            activeSection !==
            "dashboard"
        ) {
            loadedRef.current =
                false;

            return;
        }

        if (loadedRef.current) {
            return;
        }

        loadedRef.current =
            true;

        loadLibraryDashboard();

    }, [
        activeSection,
        loadLibraryDashboard,
    ]);

    return {
        dashboardStats,

        dashboardIssueTrend,
        dashboardRevenueTrend,

        dashboardRecentActivity,
        dashboardOverdueAlerts,
        dashboardRecentBooks,

        libraryDashboardLoading,

        maxIssueTrend,
        maxRevenueTrend,

        loadLibraryDashboard,
        formatActivityTime,
    };
}