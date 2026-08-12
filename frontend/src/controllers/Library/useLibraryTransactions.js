import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import { BASE_URL } from "../../config/appConfig";

const EMPTY_FILTERS = {
    search: "",
    member_type: "",
    status: "",
    payment_method: "",
    date_from: "",
    date_to: "",
};

const EMPTY_STATS = {
    total_transactions: 0,
    total_collected: 0,
    net_collection: 0,
    total_waived: 0,
    total_refunded: 0,
    pending_fine: 0,
    paid_transactions: 0,
    waived_transactions: 0,
    refunded_transactions: 0,
};

const EMPTY_PAGINATION = {
    page: 1,
    per_page: 10,
    total: 0,
    pages: 1,
    has_prev: false,
    has_next: false,
};

const todayISO = () =>
    new Date().toISOString().slice(0, 10);

export function useLibraryTransactions({
    activeSection,
    fetchWithAuth,
    showToast,
}) {
    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);

    const requestRunningRef =
        useRef(false);

    const sectionLoadedRef =
        useRef(false);

    const [
        transactionRows,
        setTransactionRows,
    ] = useState([]);

    const [
        transactionFilters,
        setTransactionFilters,
    ] = useState({
        ...EMPTY_FILTERS,
    });

    const [
        transactionStats,
        setTransactionStats,
    ] = useState({
        ...EMPTY_STATS,
    });

    const [
        transactionPagination,
        setTransactionPagination,
    ] = useState({
        ...EMPTY_PAGINATION,
    });

    const [
        transactionsLoading,
        setTransactionsLoading,
    ] = useState(false);

    const [
        transactionsExporting,
        setTransactionsExporting,
    ] = useState(false);

    const [
        selectedTransaction,
        setSelectedTransaction,
    ] = useState(null);

    const [
        transactionDetailsOpen,
        setTransactionDetailsOpen,
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
        async (url, options = {}) => {
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
                    options
                );

            let data = {};

            try {
                data =
                    await response.json();
            } catch {
                data = {};
            }

            if (!response.ok) {
                const error = new Error(
                    data.error ||
                    data.message ||
                    `Request failed (${response.status})`
                );

                error.data = data;
                error.status =
                    response.status;

                throw error;
            }

            return data;
        },
        []
    );

    const loadTransactions =
        useCallback(
            async ({
                page = 1,
                perPage = 10,
                filters = EMPTY_FILTERS,
                silent = false,
            } = {}) => {
                if (
                    requestRunningRef.current
                ) {
                    return;
                }

                requestRunningRef.current =
                    true;

                setTransactionsLoading(true);

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
                            `${BASE_URL}/admin/library/transactions?${params.toString()}`
                        );

                    const rows =
                        Array.isArray(
                            data.transactions
                        )
                            ? data.transactions
                            : [];

                    rows.sort((a, b) => {
                        const first =
                            new Date(
                                b.transaction_date ||
                                0
                            ).getTime();

                        const second =
                            new Date(
                                a.transaction_date ||
                                0
                            ).getTime();

                        if (first !== second) {
                            return first - second;
                        }

                        return (
                            Number(
                                b.transaction_id || 0
                            ) -
                            Number(
                                a.transaction_id || 0
                            )
                        );
                    });

                    setTransactionRows(rows);

                    setTransactionStats({
                        ...EMPTY_STATS,
                        ...(data.stats || {}),
                    });

                    setTransactionPagination({
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
                        "Load transactions error:",
                        error
                    );

                    if (!silent) {
                        notify(
                            error.message ||
                            "Failed to load transactions",
                            "error"
                        );
                    }
                } finally {
                    requestRunningRef.current =
                        false;

                    setTransactionsLoading(
                        false
                    );
                }
            },
            [notify, request]
        );

    const updateTransactionFilter =
        useCallback(
            (name, value) => {
                setTransactionFilters(
                    (current) => ({
                        ...current,
                        [name]: value,
                    })
                );
            },
            []
        );

    const applyTransactionFilters =
        useCallback(() => {
            loadTransactions({
                page: 1,
                perPage:
                    transactionPagination
                        .per_page,
                filters:
                    transactionFilters,
            });
        }, [
            loadTransactions,
            transactionFilters,
            transactionPagination.per_page,
        ]);

    const resetTransactionFilters =
        useCallback(() => {
            const filters = {
                ...EMPTY_FILTERS,
            };

            setTransactionFilters(
                filters
            );

            loadTransactions({
                page: 1,
                perPage:
                    transactionPagination
                        .per_page,
                filters,
            });
        }, [
            loadTransactions,
            transactionPagination.per_page,
        ]);

    const changeTransactionPage =
        useCallback(
            (page) => {
                if (
                    page < 1 ||
                    page >
                    transactionPagination.pages
                ) {
                    return;
                }

                loadTransactions({
                    page,
                    perPage:
                        transactionPagination
                            .per_page,
                    filters:
                        transactionFilters,
                });
            },
            [
                loadTransactions,
                transactionFilters,
                transactionPagination.pages,
                transactionPagination.per_page,
            ]
        );

    const exportTransactionReport =
        useCallback(async () => {
            if (transactionsExporting) {
                return;
            }

            setTransactionsExporting(true);

            try {
                if (
                    typeof fetchRef.current !==
                    "function"
                ) {
                    throw new Error(
                        "Authenticated request unavailable"
                    );
                }

                const params =
                    new URLSearchParams();

                params.set("export", "csv");

                Object.entries(
                    transactionFilters
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
                        `${BASE_URL}/admin/library/transactions?${params.toString()}`,
                        {
                            method: "GET",
                            headers: {
                                Accept: "text/csv",
                            },
                        }
                    );

                if (!response.ok) {
                    let message =
                        "Failed to export transaction report";

                    try {
                        const errorData =
                            await response.json();

                        message =
                            errorData.error ||
                            errorData.message ||
                            message;
                    } catch {
                        // Non-JSON response.
                    }

                    throw new Error(message);
                }

                const blob =
                    await response.blob();

                const disposition =
                    response.headers.get(
                        "Content-Disposition"
                    );

                const filenameMatch =
                    disposition?.match(
                        /filename="?([^"]+)"?/i
                    );

                const filename =
                    filenameMatch?.[1] ||
                    `library-transactions-${todayISO()}.csv`;

                const downloadUrl =
                    URL.createObjectURL(blob);

                const anchor =
                    document.createElement("a");

                anchor.href = downloadUrl;
                anchor.download = filename;

                document.body.appendChild(
                    anchor
                );

                anchor.click();
                anchor.remove();

                URL.revokeObjectURL(
                    downloadUrl
                );

                const exportedCount =
                    response.headers.get(
                        "X-Exported-Records"
                    );

                notify(
                    exportedCount
                        ? `${exportedCount} transaction(s) exported successfully`
                        : "Transaction report exported successfully",
                    "success"
                );
            } catch (error) {
                console.error(
                    "Export transactions error:",
                    error
                );

                notify(
                    error.message ||
                    "Failed to export transactions",
                    "error"
                );
            } finally {
                setTransactionsExporting(
                    false
                );
            }
        }, [
            notify,
            transactionFilters,
            transactionsExporting,
        ]);

    const openTransactionDetails =
        useCallback((transaction) => {
            setSelectedTransaction(
                transaction
            );

            setTransactionDetailsOpen(
                true
            );
        }, []);

    const closeTransactionDetails =
        useCallback(() => {
            setSelectedTransaction(null);

            setTransactionDetailsOpen(
                false
            );
        }, []);

    useEffect(() => {
        if (
            activeSection !==
            "transactions"
        ) {
            sectionLoadedRef.current =
                false;

            return;
        }

        if (
            sectionLoadedRef.current
        ) {
            return;
        }

        sectionLoadedRef.current =
            true;

        loadTransactions({
            page: 1,
            perPage: 10,
            filters: {
                ...EMPTY_FILTERS,
            },
        });
    }, [
        activeSection,
        loadTransactions,
    ]);

    return {
        transactionRows,
        transactionFilters,
        transactionStats,
        transactionPagination,

        transactionsLoading,
        transactionsExporting,

        selectedTransaction,
        transactionDetailsOpen,

        loadTransactions,
        updateTransactionFilter,
        applyTransactionFilters,
        resetTransactionFilters,
        changeTransactionPage,
        exportTransactionReport,

        openTransactionDetails,
        closeTransactionDetails,
    };
}