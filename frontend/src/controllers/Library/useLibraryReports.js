import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { BASE_URL } from "../../config/appConfig";

const EMPTY_FILTERS = {
    search: "",
    member_type: "",
    status: "",
    date_from: "",
    date_to: "",
};

const EMPTY_STATS = {
    total_titles: 0,
    total_copies: 0,
    available_copies: 0,
    currently_issued: 0,
    returned_books: 0,
    overdue_books: 0,
    due_soon_books: 0,
    active_members: 0,
    fine_generated: 0,
    fine_collected: 0,
    fine_waived: 0,
    fine_pending: 0,
};

const EMPTY_PAGINATION = {
    page: 1,
    per_page: 15,
    total: 0,
    pages: 1,
    has_prev: false,
    has_next: false,
};

export function useLibraryReports({
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
        reportFilters,
        setReportFilters,
    ] = useState({
        ...EMPTY_FILTERS,
    });

    const [
        reportStats,
        setReportStats,
    ] = useState({
        ...EMPTY_STATS,
    });

    const [
        reportRows,
        setReportRows,
    ] = useState([]);

    const [
        issueTrend,
        setIssueTrend,
    ] = useState([]);

    const [
        memberDistribution,
        setMemberDistribution,
    ] = useState([]);

    const [
        categoryDistribution,
        setCategoryDistribution,
    ] = useState([]);

    const [
        topBooks,
        setTopBooks,
    ] = useState([]);

    const [
        reportPagination,
        setReportPagination,
    ] = useState({
        ...EMPTY_PAGINATION,
    });

    const [
        reportsLoading,
        setReportsLoading,
    ] = useState(false);

    const [
        reportsExporting,
        setReportsExporting,
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

    const request = useCallback(
        async (url) => {
            if (
                typeof fetchRef.current !==
                "function"
            ) {
                throw new Error(
                    "Authenticated request unavailable"
                );
            }

            const response =
                await fetchRef.current(
                    url,
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
                    `Request failed (${response.status})`
                );
            }

            return data;
        },
        []
    );

    const loadReports =
        useCallback(
            async ({
                page = 1,
                perPage = 15,
                filters = EMPTY_FILTERS,
                silent = false,
            } = {}) => {
                if (runningRef.current) {
                    return;
                }

                runningRef.current =
                    true;

                setReportsLoading(true);

                try {
                    const params =
                        new URLSearchParams();

                    params.set(
                        "page",
                        String(page)
                    );

                    params.set(
                        "per_page",
                        String(perPage)
                    );

                    Object.entries(
                        filters
                    ).forEach(
                        ([key, value]) => {
                            const normalized =
                                String(
                                    value ?? ""
                                ).trim();

                            if (normalized) {
                                params.set(
                                    key,
                                    normalized
                                );
                            }
                        }
                    );

                    const data =
                        await request(
                            `${BASE_URL}/admin/library/reports?${params.toString()}`
                        );

                    setReportStats({
                        ...EMPTY_STATS,
                        ...(data.stats || {}),
                    });

                    setReportRows(
                        Array.isArray(
                            data.records
                        )
                            ? data.records
                            : []
                    );

                    setIssueTrend(
                        Array.isArray(
                            data.issue_trend
                        )
                            ? data.issue_trend
                            : []
                    );

                    setMemberDistribution(
                        Array.isArray(
                            data.member_distribution
                        )
                            ? data.member_distribution
                            : []
                    );

                    setCategoryDistribution(
                        Array.isArray(
                            data.category_distribution
                        )
                            ? data.category_distribution
                            : []
                    );

                    setTopBooks(
                        Array.isArray(
                            data.top_books
                        )
                            ? data.top_books
                            : []
                    );

                    setReportPagination({
                        ...EMPTY_PAGINATION,
                        ...(data.pagination ||
                            {}),
                        pages: Math.max(
                            Number(
                                data.pagination
                                    ?.pages
                            ) || 1,
                            1
                        ),
                    });

                } catch (error) {
                    console.error(
                        "Library report error:",
                        error
                    );

                    if (!silent) {
                        notify(
                            error.message ||
                            "Failed to load reports",
                            "error"
                        );
                    }

                } finally {
                    runningRef.current =
                        false;

                    setReportsLoading(false);
                }
            },
            [
                notify,
                request,
            ]
        );

    const updateReportFilter =
        useCallback(
            (name, value) => {
                setReportFilters(
                    (current) => ({
                        ...current,
                        [name]: value,
                    })
                );
            },
            []
        );

    const applyReportFilters =
        useCallback(() => {
            loadReports({
                page: 1,
                perPage:
                    reportPagination
                        .per_page,
                filters:
                    reportFilters,
            });
        }, [
            loadReports,
            reportFilters,
            reportPagination.per_page,
        ]);

    const resetReportFilters =
        useCallback(() => {
            const filters = {
                ...EMPTY_FILTERS,
            };

            setReportFilters(
                filters
            );

            loadReports({
                page: 1,
                perPage:
                    reportPagination
                        .per_page,
                filters,
            });

        }, [
            loadReports,
            reportPagination.per_page,
        ]);

    const changeReportPage =
        useCallback(
            (page) => {
                if (
                    page < 1 ||
                    page >
                    reportPagination.pages
                ) {
                    return;
                }

                loadReports({
                    page,
                    perPage:
                        reportPagination
                            .per_page,
                    filters:
                        reportFilters,
                });
            },
            [
                loadReports,
                reportFilters,
                reportPagination.pages,
                reportPagination.per_page,
            ]
        );

    const exportReport =
        useCallback(async () => {
            if (reportsExporting) {
                return;
            }

            setReportsExporting(
                true
            );

            try {
                const params =
                    new URLSearchParams();

                params.set(
                    "export",
                    "csv"
                );

                Object.entries(
                    reportFilters
                ).forEach(
                    ([key, value]) => {
                        const normalized =
                            String(
                                value ?? ""
                            ).trim();

                        if (normalized) {
                            params.set(
                                key,
                                normalized
                            );
                        }
                    }
                );

                const response =
                    await fetchRef.current(
                        `${BASE_URL}/admin/library/reports?${params.toString()}`,
                        {
                            method: "GET",
                            headers: {
                                Accept: "text/csv",
                            },
                        }
                    );

                if (!response.ok) {
                    throw new Error(
                        "Failed to export report"
                    );
                }

                const blob =
                    await response.blob();

                const disposition =
                    response.headers.get(
                        "Content-Disposition"
                    );

                const match =
                    disposition?.match(
                        /filename="?([^"]+)"?/i
                    );

                const filename =
                    match?.[1] ||
                    `library-report-${new Date()
                        .toISOString()
                        .slice(0, 10)}.csv`;

                const url =
                    URL.createObjectURL(
                        blob
                    );

                const anchor =
                    document.createElement(
                        "a"
                    );

                anchor.href = url;
                anchor.download =
                    filename;

                document.body.appendChild(
                    anchor
                );

                anchor.click();
                anchor.remove();

                URL.revokeObjectURL(url);

                const count =
                    response.headers.get(
                        "X-Exported-Records"
                    );

                notify(
                    count
                        ? `${count} report record(s) exported`
                        : "Report exported successfully",
                    "success"
                );

            } catch (error) {
                console.error(
                    "Report export error:",
                    error
                );

                notify(
                    error.message ||
                    "Failed to export report",
                    "error"
                );

            } finally {
                setReportsExporting(
                    false
                );
            }
        }, [
            notify,
            reportFilters,
            reportsExporting,
        ]);

    const maxTrendValue =
        useMemo(
            () =>
                Math.max(
                    ...issueTrend.map(
                        (item) =>
                            Number(
                                item.issued || 0
                            )
                    ),
                    1
                ),
            [issueTrend]
        );

    const maxMemberValue =
        useMemo(
            () =>
                Math.max(
                    ...memberDistribution.map(
                        (item) =>
                            Number(
                                item.value || 0
                            )
                    ),
                    1
                ),
            [memberDistribution]
        );

    useEffect(() => {
        if (
            activeSection !==
            "reports"
        ) {
            loadedRef.current =
                false;

            return;
        }

        if (
            loadedRef.current
        ) {
            return;
        }

        loadedRef.current =
            true;

        loadReports({
            page: 1,
            perPage: 15,
            filters: {
                ...EMPTY_FILTERS,
            },
        });

    }, [
        activeSection,
        loadReports,
    ]);

    return {
        reportFilters,
        reportStats,
        reportRows,

        issueTrend,
        memberDistribution,
        categoryDistribution,
        topBooks,

        reportPagination,

        reportsLoading,
        reportsExporting,

        maxTrendValue,
        maxMemberValue,

        loadReports,
        updateReportFilter,
        applyReportFilters,
        resetReportFilters,
        changeReportPage,
        exportReport,
    };
}