import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { BASE_URL } from "../../config/appConfig";

const EMPTY_SUMMARY = {
    currently_issued: 0,
    overdue: 0,
    due_soon: 0,
    returned: 0,

    total_borrowed: 0,

    fine_generated: 0,
    fine_paid: 0,
    fine_waived: 0,
    fine_pending: 0,
};

const EMPTY_PAGINATION = {
    page: 1,
    per_page: 10,
    total: 0,
    pages: 1,
    has_prev: false,
    has_next: false,
};

export function useStudentLibrary({
    activeSection,
    fetchWithAuth,
    showToast,
}) {
    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);

    const loadedRef = useRef(false);
    const loadingRef = useRef(false);

    const [
        studentLibraryLoading,
        setStudentLibraryLoading,
    ] = useState(false);

    const [
        studentLibrarySummary,
        setStudentLibrarySummary,
    ] = useState({
        ...EMPTY_SUMMARY,
    });

    const [
        currentBooks,
        setCurrentBooks,
    ] = useState([]);

    const [
        borrowingHistory,
        setBorrowingHistory,
    ] = useState([]);

    const [
        fineRecords,
        setFineRecords,
    ] = useState([]);

    const [
        paymentHistory,
        setPaymentHistory,
    ] = useState([]);

    const [
        libraryNotifications,
        setLibraryNotifications,
    ] = useState([]);

    const [
        libraryProfile,
        setLibraryProfile,
    ] = useState(null);

    const [
        libraryActiveTab,
        setLibraryActiveTab,
    ] = useState("issued");

    const [
        librarySearch,
        setLibrarySearch,
    ] = useState("");

    const [
        libraryStatusFilter,
        setLibraryStatusFilter,
    ] = useState("");

    const [
        historyPagination,
        setHistoryPagination,
    ] = useState({
        ...EMPTY_PAGINATION,
    });

    const [
        selectedLibraryRecord,
        setSelectedLibraryRecord,
    ] = useState(null);

    const [
        libraryRecordModalOpen,
        setLibraryRecordModalOpen,
    ] = useState(false);

    useEffect(() => {
        fetchRef.current = fetchWithAuth;
    }, [fetchWithAuth]);

    useEffect(() => {
        toastRef.current = showToast;
    }, [showToast]);

    const notify = useCallback(
        (message, type = "info") => {
            toastRef.current?.(
                message,
                type,
            );
        },
        [],
    );

    const request = useCallback(
        async (url, options = {}) => {
            if (
                typeof fetchRef.current !==
                "function"
            ) {
                throw new Error(
                    "Authenticated request unavailable",
                );
            }

            const response =
                await fetchRef.current(
                    url,
                    options,
                );

            let data = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (!response.ok) {
                const error = new Error(
                    data.error ||
                    data.message ||
                    `Request failed (${response.status})`,
                );

                error.data = data;
                error.status = response.status;

                throw error;
            }

            return data;
        },
        [],
    );

    const loadStudentLibrary =
        useCallback(
            async ({
                silent = false,
            } = {}) => {
                if (loadingRef.current) {
                    return;
                }

                loadingRef.current = true;

                setStudentLibraryLoading(true);

                try {
                    const data = await request(
                        `${BASE_URL}/student/library/dashboard`,
                    );

                    setStudentLibrarySummary({
                        ...EMPTY_SUMMARY,
                        ...(data.summary || {}),
                    });

                    setCurrentBooks(
                        Array.isArray(
                            data.current_books,
                        )
                            ? data.current_books
                            : [],
                    );

                    setBorrowingHistory(
                        Array.isArray(
                            data.history,
                        )
                            ? data.history
                            : [],
                    );

                    setFineRecords(
                        Array.isArray(
                            data.fines,
                        )
                            ? data.fines
                            : [],
                    );

                    setPaymentHistory(
                        Array.isArray(
                            data.payments,
                        )
                            ? data.payments
                            : [],
                    );

                    setLibraryNotifications(
                        Array.isArray(
                            data.notifications,
                        )
                            ? data.notifications
                            : [],
                    );

                    setLibraryProfile(
                        data.profile || null,
                    );

                    setHistoryPagination({
                        ...EMPTY_PAGINATION,
                        ...(data.pagination || {}),
                        pages: Math.max(
                            Number(
                                data.pagination
                                    ?.pages,
                            ) || 1,
                            1,
                        ),
                    });
                } catch (error) {
                    console.error(
                        "Student library load error:",
                        error,
                    );

                    if (!silent) {
                        notify(
                            error.message ||
                            "Unable to load library account",
                            "error",
                        );
                    }
                } finally {
                    loadingRef.current = false;

                    setStudentLibraryLoading(
                        false,
                    );
                }
            },
            [
                notify,
                request,
            ],
        );

    const refreshStudentLibrary =
        useCallback(() => {
            return loadStudentLibrary({
                silent: true,
            });
        }, [
            loadStudentLibrary,
        ]);

    const openLibraryRecord =
        useCallback(
            (record) => {
                setSelectedLibraryRecord(
                    record,
                );

                setLibraryRecordModalOpen(
                    true,
                );
            },
            [],
        );

    const closeLibraryRecord =
        useCallback(() => {
            setSelectedLibraryRecord(
                null,
            );

            setLibraryRecordModalOpen(
                false,
            );
        }, []);

    const filteredCurrentBooks =
        useMemo(() => {
            const query =
                librarySearch
                    .trim()
                    .toLowerCase();

            return currentBooks.filter(
                (book) => {
                    const searchMatch =
                        !query ||
                        [
                            book.book_title,
                            book.book_code,
                            book.author,
                            book.category,
                            book.isbn,
                        ]
                            .join(" ")
                            .toLowerCase()
                            .includes(query);

                    const statusMatch =
                        !libraryStatusFilter ||
                        book.status ===
                        libraryStatusFilter;

                    return (
                        searchMatch &&
                        statusMatch
                    );
                },
            );
        }, [
            currentBooks,
            librarySearch,
            libraryStatusFilter,
        ]);

    const filteredHistory =
        useMemo(() => {
            const query =
                librarySearch
                    .trim()
                    .toLowerCase();

            return borrowingHistory.filter(
                (book) => {
                    const searchMatch =
                        !query ||
                        [
                            book.book_title,
                            book.book_code,
                            book.author,
                            book.category,
                            book.isbn,
                        ]
                            .join(" ")
                            .toLowerCase()
                            .includes(query);

                    const statusMatch =
                        !libraryStatusFilter ||
                        book.status ===
                        libraryStatusFilter;

                    return (
                        searchMatch &&
                        statusMatch
                    );
                },
            );
        }, [
            borrowingHistory,
            librarySearch,
            libraryStatusFilter,
        ]);

    useEffect(() => {
        if (
            activeSection !== "library"
        ) {
            loadedRef.current = false;
            return;
        }

        if (loadedRef.current) {
            return;
        }

        loadedRef.current = true;

        loadStudentLibrary();
    }, [
        activeSection,
        loadStudentLibrary,
    ]);

    return {
        studentLibraryLoading,

        studentLibrarySummary,
        libraryProfile,

        currentBooks,
        borrowingHistory,
        fineRecords,
        paymentHistory,
        libraryNotifications,

        libraryActiveTab,
        setLibraryActiveTab,

        librarySearch,
        setLibrarySearch,

        libraryStatusFilter,
        setLibraryStatusFilter,

        historyPagination,

        filteredCurrentBooks,
        filteredHistory,

        selectedLibraryRecord,
        libraryRecordModalOpen,

        loadStudentLibrary,
        refreshStudentLibrary,

        openLibraryRecord,
        closeLibraryRecord,
    };
}