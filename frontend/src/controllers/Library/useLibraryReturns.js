import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { BASE_URL } from "../../config/appConfig";
import { useLibraryPermission } from "./useLibraryPermission";

const todayISO = () =>
    new Date().toISOString().slice(0, 10);

const EMPTY_RETURN_FORM = {
    member_type: "",
    issue_id: "",
    return_date: todayISO(),
    fine_action: "pending",
    payment_method: "Cash",
    reference_no: "",
    remarks: "",
};

const EMPTY_FILTERS = {
    search: "",
    member_type: "",
    fine_status: "",
    date_from: "",
    date_to: "",
};

const EMPTY_STATS = {
    total_returned: 0,
    returned_today: 0,
    late_returns: 0,
    pending_fines: 0,
    fine_collected: 0,
    fine_waived: 0,
};

const EMPTY_PAGINATION = {
    page: 1,
    per_page: 10,
    total: 0,
    pages: 1,
    has_prev: false,
    has_next: false,
};

export function useLibraryReturns({
    activeSection,
    fetchWithAuth,
    showToast,
}) {
    const { canWriteLibrary } = useLibraryPermission();

    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);

    const optionsRunningRef = useRef(false);
    const listRunningRef = useRef(false);
    const sectionLoadedRef = useRef(false);

    const [returnForm, setReturnForm] =
        useState({
            ...EMPTY_RETURN_FORM,
        });

    const [
        returnFormErrors,
        setReturnFormErrors,
    ] = useState({});

    const [
        activeIssueOptions,
        setActiveIssueOptions,
    ] = useState([]);

    const [
        issueSearch,
        setIssueSearch,
    ] = useState("");

    const [
        issueDropdownOpen,
        setIssueDropdownOpen,
    ] = useState(false);

    const [
        returnRecords,
        setReturnRecords,
    ] = useState([]);

    const [
        returnFilters,
        setReturnFilters,
    ] = useState({
        ...EMPTY_FILTERS,
    });

    const [
        returnStats,
        setReturnStats,
    ] = useState({
        ...EMPTY_STATS,
    });

    const [
        returnPagination,
        setReturnPagination,
    ] = useState({
        ...EMPTY_PAGINATION,
    });

    const [
        returnOptionsLoading,
        setReturnOptionsLoading,
    ] = useState(false);

    const [
        returnRecordsLoading,
        setReturnRecordsLoading,
    ] = useState(false);

    const [
        returnSaving,
        setReturnSaving,
    ] = useState(false);

    const [
        returnExporting,
        setReturnExporting,
    ] = useState(false);

    const [
        selectedReturnRecord,
        setSelectedReturnRecord,
    ] = useState(null);

    const [
        returnDetailsOpen,
        setReturnDetailsOpen,
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
                data = await response.json();
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

    const selectedIssuedRecord =
        useMemo(
            () =>
                activeIssueOptions.find(
                    (record) =>
                        record.member_type ===
                        returnForm.member_type &&
                        String(record.id) ===
                        String(
                            returnForm.issue_id
                        )
                ) || null,
            [
                activeIssueOptions,
                returnForm.issue_id,
                returnForm.member_type,
            ]
        );

    const calculatedReturnInfo =
        useMemo(() => {
            if (!selectedIssuedRecord) {
                return {
                    overdueDays: 0,
                    fineAmount: 0,
                };
            }

            const returnDate = new Date(
                `${returnForm.return_date}T00:00:00`
            );

            const dueDate = new Date(
                `${selectedIssuedRecord.due_date}T00:00:00`
            );

            const difference =
                returnDate.getTime() -
                dueDate.getTime();

            const overdueDays = Math.max(
                Math.floor(
                    difference /
                    (1000 * 60 * 60 * 24)
                ),
                0
            );

            const fineAmount =
                overdueDays *
                Number(
                    selectedIssuedRecord.fine_per_day ||
                    0
                );

            return {
                overdueDays,
                fineAmount,
            };
        }, [
            returnForm.return_date,
            selectedIssuedRecord,
        ]);

    const loadReturnOptions =
        useCallback(
            async ({
                memberType = "",
                search = "",
                silent = false,
            } = {}) => {
                if (optionsRunningRef.current) {
                    return;
                }

                optionsRunningRef.current = true;
                setReturnOptionsLoading(true);

                try {
                    const params =
                        new URLSearchParams();

                    if (memberType) {
                        params.set(
                            "member_type",
                            memberType
                        );
                    }

                    if (search) {
                        params.set(
                            "search",
                            search
                        );
                    }

                    const data = await request(
                        `${BASE_URL}/admin/library/returns/options?${params.toString()}`
                    );

                    setActiveIssueOptions(
                        Array.isArray(
                            data.active_issues
                        )
                            ? data.active_issues
                            : []
                    );

                    setReturnForm(
                        (current) => ({
                            ...current,
                            return_date:
                                current.return_date ||
                                data.defaults
                                    ?.return_date ||
                                todayISO(),
                        })
                    );
                } catch (error) {
                    console.error(
                        "Return options error:",
                        error
                    );

                    if (!silent) {
                        notify(
                            error.message ||
                            "Failed to load issued records",
                            "error"
                        );
                    }
                } finally {
                    optionsRunningRef.current =
                        false;

                    setReturnOptionsLoading(
                        false
                    );
                }
            },
            [notify, request]
        );

    const loadReturnRecords =
        useCallback(
            async ({
                page = 1,
                perPage = 10,
                filters = EMPTY_FILTERS,
                silent = false,
            } = {}) => {
                if (listRunningRef.current) {
                    return;
                }

                listRunningRef.current = true;
                setReturnRecordsLoading(true);

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

                    Object.entries(filters).forEach(
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

                    const data = await request(
                        `${BASE_URL}/admin/library/returns?${params.toString()}`
                    );

                    setReturnRecords(
                        Array.isArray(
                            data.records
                        )
                            ? data.records
                            : []
                    );

                    setReturnStats({
                        ...EMPTY_STATS,
                        ...(data.stats || {}),
                    });

                    setReturnPagination({
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
                        "Return records error:",
                        error
                    );

                    if (!silent) {
                        notify(
                            error.message ||
                            "Failed to load returned books",
                            "error"
                        );
                    }
                } finally {
                    listRunningRef.current = false;
                    setReturnRecordsLoading(false);
                }
            },
            [notify, request]
        );

    const updateReturnForm =
        useCallback(
            (name, value) => {
                setReturnForm(
                    (current) => {
                        const updated = {
                            ...current,
                            [name]: value,
                        };

                        if (
                            name === "member_type"
                        ) {
                            updated.issue_id = "";
                        }

                        return updated;
                    }
                );

                setReturnFormErrors(
                    (current) => {
                        const updated = {
                            ...current,
                        };

                        delete updated[name];

                        return updated;
                    }
                );

                if (
                    name === "member_type"
                ) {
                    setIssueSearch("");
                    setIssueDropdownOpen(false);

                    loadReturnOptions({
                        memberType: value,
                        silent: true,
                    });
                }
            },
            [loadReturnOptions]
        );

    const selectIssuedRecord =
        useCallback((record) => {
            setReturnForm(
                (current) => ({
                    ...current,
                    member_type:
                        record.member_type,
                    issue_id: String(
                        record.id
                    ),
                })
            );

            setIssueSearch(
                `${record.issue_code} - ${record.member_name} - ${record.book_title}`
            );

            setIssueDropdownOpen(false);

            setReturnFormErrors(
                (current) => {
                    const updated = {
                        ...current,
                    };

                    delete updated.issue_id;

                    return updated;
                }
            );
        }, []);

    const clearIssuedRecord =
        useCallback(() => {
            setReturnForm(
                (current) => ({
                    ...current,
                    issue_id: "",
                })
            );

            setIssueSearch("");
            setIssueDropdownOpen(false);
        }, []);

    const resetReturnForm =
        useCallback(() => {
            setReturnForm({
                ...EMPTY_RETURN_FORM,
                return_date: todayISO(),
            });

            setReturnFormErrors({});
            setIssueSearch("");
            setIssueDropdownOpen(false);
        }, []);

    const processReturn =
        useCallback(
            async (
                event,
                fineAction = null
            ) => {
                event?.preventDefault();

                if (returnSaving) {
                    return;
                }

                const selectedAction =
                    fineAction ||
                    returnForm.fine_action;

                const errors = {};

                if (!returnForm.member_type) {
                    errors.member_type =
                        "Select member type";
                }

                if (!returnForm.issue_id) {
                    errors.issue_id =
                        "Select an issued record";
                }

                if (!returnForm.return_date) {
                    errors.return_date =
                        "Select return date";
                }

                if (
                    selectedIssuedRecord &&
                    returnForm.return_date <
                    selectedIssuedRecord.issue_date
                ) {
                    errors.return_date =
                        "Return date cannot be before issue date";
                }

                if (
                    selectedAction ===
                    "collect" &&
                    calculatedReturnInfo.fineAmount >
                    0 &&
                    !returnForm.payment_method
                ) {
                    errors.payment_method =
                        "Select payment method";
                }

                if (
                    Object.keys(errors).length >
                    0
                ) {
                    setReturnFormErrors(errors);
                    return;
                }

                if (!canWriteLibrary) {
                    notify(
                        "You have read-only access to the Library dashboard. Ask your Super Admin for Full Access if you need to make changes.",
                        "error"
                    );
                    return;
                }

                setReturnSaving(true);
                setReturnFormErrors({});

                try {
                    const data = await request(
                        `${BASE_URL}/admin/library/returns/${returnForm.member_type}/${returnForm.issue_id}`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json",
                            },
                            body: JSON.stringify({
                                return_date:
                                    returnForm.return_date,
                                fine_action:
                                    selectedAction,
                                payment_method:
                                    returnForm.payment_method,
                                reference_no:
                                    returnForm.reference_no
                                        .trim() ||
                                    null,
                                remarks:
                                    returnForm.remarks
                                        .trim() ||
                                    null,
                            }),
                        }
                    );

                    notify(
                        data.message ||
                        "Book returned successfully",
                        "success"
                    );

                    resetReturnForm();

                    await Promise.all([
                        loadReturnOptions({
                            silent: true,
                        }),

                        loadReturnRecords({
                            page: 1,
                            perPage:
                                returnPagination
                                    .per_page,
                            filters:
                                returnFilters,
                            silent: true,
                        }),
                    ]);
                } catch (error) {
                    console.error(
                        "Return book error:",
                        error
                    );

                    if (error.data?.errors) {
                        setReturnFormErrors(
                            error.data.errors
                        );
                    }

                    notify(
                        error.message ||
                        "Failed to return book",
                        "error"
                    );
                } finally {
                    setReturnSaving(false);
                }
            },
            [
                calculatedReturnInfo.fineAmount,
                canWriteLibrary,
                loadReturnOptions,
                loadReturnRecords,
                notify,
                request,
                resetReturnForm,
                returnFilters,
                returnForm,
                returnPagination.per_page,
                returnSaving,
                selectedIssuedRecord,
            ]
        );

    const updateReturnFilter =
        useCallback(
            (name, value) => {
                setReturnFilters(
                    (current) => ({
                        ...current,
                        [name]: value,
                    })
                );
            },
            []
        );

    const applyReturnFilters =
        useCallback(() => {
            loadReturnRecords({
                page: 1,
                perPage:
                    returnPagination.per_page,
                filters: returnFilters,
            });
        }, [
            loadReturnRecords,
            returnFilters,
            returnPagination.per_page,
        ]);

    const resetReturnFilters =
        useCallback(() => {
            const filters = {
                ...EMPTY_FILTERS,
            };

            setReturnFilters(filters);

            loadReturnRecords({
                page: 1,
                perPage:
                    returnPagination.per_page,
                filters,
            });
        }, [
            loadReturnRecords,
            returnPagination.per_page,
        ]);

    const changeReturnPage =
        useCallback(
            (page) => {
                if (
                    page < 1 ||
                    page >
                    returnPagination.pages
                ) {
                    return;
                }

                loadReturnRecords({
                    page,
                    perPage:
                        returnPagination.per_page,
                    filters: returnFilters,
                });
            },
            [
                loadReturnRecords,
                returnFilters,
                returnPagination.pages,
                returnPagination.per_page,
            ]
        );

    const exportReturnReport =
        useCallback(async () => {
            if (returnExporting) {
                return;
            }

            setReturnExporting(true);

            try {
                const params =
                    new URLSearchParams();

                params.set("export", "csv");

                Object.entries(
                    returnFilters
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
                        `${BASE_URL}/admin/library/returns?${params.toString()}`,
                        {
                            method: "GET",
                            headers: {
                                Accept: "text/csv",
                            },
                        }
                    );

                if (!response.ok) {
                    throw new Error(
                        "Failed to export return report"
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
                    `library-returned-books-${todayISO()}.csv`;

                const url =
                    URL.createObjectURL(blob);

                const anchor =
                    document.createElement("a");

                anchor.href = url;
                anchor.download = filename;

                document.body.appendChild(
                    anchor
                );

                anchor.click();
                anchor.remove();

                URL.revokeObjectURL(url);

                notify(
                    "Filtered return report exported successfully",
                    "success"
                );
            } catch (error) {
                notify(
                    error.message ||
                    "Failed to export report",
                    "error"
                );
            } finally {
                setReturnExporting(false);
            }
        }, [
            notify,
            returnExporting,
            returnFilters,
        ]);

    const openReturnDetails =
        useCallback((record) => {
            setSelectedReturnRecord(record);
            setReturnDetailsOpen(true);
        }, []);

    const closeReturnDetails =
        useCallback(() => {
            setSelectedReturnRecord(null);
            setReturnDetailsOpen(false);
        }, []);

    useEffect(() => {
        if (
            activeSection !==
            "return-books"
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

        sectionLoadedRef.current = true;

        loadReturnOptions({
            silent: true,
        });

        loadReturnRecords({
            page: 1,
            perPage: 10,
            filters: {
                ...EMPTY_FILTERS,
            },
        });
    }, [
        activeSection,
        loadReturnOptions,
        loadReturnRecords,
    ]);

    return {
        returnForm,
        returnFormErrors,

        activeIssueOptions,
        issueSearch,
        issueDropdownOpen,
        selectedIssuedRecord,
        calculatedReturnInfo,

        returnRecords,
        returnFilters,
        returnStats,
        returnPagination,

        returnOptionsLoading,
        returnRecordsLoading,
        returnSaving,
        returnExporting,

        selectedReturnRecord,
        returnDetailsOpen,

        updateReturnForm,
        selectIssuedRecord,
        clearIssuedRecord,
        setIssueSearch,
        setIssueDropdownOpen,
        resetReturnForm,
        processReturn,

        updateReturnFilter,
        applyReturnFilters,
        resetReturnFilters,
        changeReturnPage,
        exportReturnReport,

        loadReturnOptions,
        loadReturnRecords,

        openReturnDetails,
        closeReturnDetails,

        canWriteLibrary,
    };
}