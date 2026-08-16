import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import { BASE_URL } from "../../config/appConfig";
import { useLibraryPermission } from "./useLibraryPermission";

const todayISO = () =>
    new Date().toISOString().slice(0, 10);

const addDaysISO = (dateValue, days) => {
    const date = new Date(
        `${dateValue}T00:00:00`
    );

    date.setDate(
        date.getDate() + days
    );

    return date.toISOString().slice(0, 10);
};

const EMPTY_FORM = {
    member_type: "",
    member_id: "",
    book_id: "",
    issue_date: todayISO(),
    due_date: addDaysISO(
        todayISO(),
        14
    ),
    fine_per_day: "5",
    remarks: "",
};

const EMPTY_FILTERS = {
    search: "",
    member_type: "",
    status: "",
    date_from: "",
    date_to: "",
};

const EMPTY_STATS = {
    total_records: 0,
    currently_issued: 0,
    due_soon: 0,
    overdue: 0,
    returned: 0,
    outstanding_fine: 0,
};

const EMPTY_PAGINATION = {
    page: 1,
    per_page: 10,
    total: 0,
    pages: 1,
    has_prev: false,
    has_next: false,
};

export function useLibraryCirculation({
    activeSection,
    fetchWithAuth,
    showToast,
}) {
    const { canWriteLibrary } = useLibraryPermission();

    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);

    const optionsRequestRef =
        useRef(false);

    const listRequestRef =
        useRef(false);

    const sectionLoadedRef =
        useRef(false);

    const [issueForm, setIssueForm] =
        useState({
            ...EMPTY_FORM,
        });

    const [
        issueFormErrors,
        setIssueFormErrors,
    ] = useState({});

    const [
        issueMembers,
        setIssueMembers,
    ] = useState([]);

    const [
        memberSearch,
        setMemberSearch,
    ] = useState("");

    const [
        memberDropdownOpen,
        setMemberDropdownOpen,
    ] = useState(false);

    const [
        availableBooks,
        setAvailableBooks,
    ] = useState([]);

    const [
        circulationRows,
        setCirculationRows,
    ] = useState([]);

    const [
        circulationFilters,
        setCirculationFilters,
    ] = useState({
        ...EMPTY_FILTERS,
    });

    const [
        circulationStats,
        setCirculationStats,
    ] = useState({
        ...EMPTY_STATS,
    });

    const [
        circulationPagination,
        setCirculationPagination,
    ] = useState({
        ...EMPTY_PAGINATION,
    });

    const [
        optionsLoading,
        setOptionsLoading,
    ] = useState(false);

    const [
        circulationLoading,
        setCirculationLoading,
    ] = useState(false);

    const [
        circulationExporting,
        setCirculationExporting,
    ] = useState(false);

    const [
        issueSaving,
        setIssueSaving,
    ] = useState(false);

    const [
        returningIssueKey,
        setReturningIssueKey,
    ] = useState(null);

    const [
        selectedIssue,
        setSelectedIssue,
    ] = useState(null);

    const [
        issueDetailsOpen,
        setIssueDetailsOpen,
    ] = useState(false);

    useEffect(() => {
        fetchRef.current =
            fetchWithAuth;
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
                typeof fetchRef.current
                !== "function"
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

    const loadCirculationOptions =
        useCallback(
            async ({
                memberType = "",
                memberSearch = "",
                bookSearch = "",
                silent = false,
            } = {}) => {
                if (
                    optionsRequestRef.current
                ) {
                    return;
                }

                optionsRequestRef.current =
                    true;

                setOptionsLoading(true);

                try {
                    const params =
                        new URLSearchParams();

                    if (memberType) {
                        params.set(
                            "member_type",
                            memberType
                        );
                    }

                    if (memberSearch) {
                        params.set(
                            "member_search",
                            memberSearch
                        );
                    }

                    if (bookSearch) {
                        params.set(
                            "book_search",
                            bookSearch
                        );
                    }

                    const data =
                        await request(
                            `${BASE_URL}/admin/library/circulation/options?${params.toString()}`
                        );

                    setIssueMembers(
                        Array.isArray(
                            data.members
                        )
                            ? data.members
                            : []
                    );

                    setAvailableBooks(
                        Array.isArray(
                            data.books
                        )
                            ? data.books
                            : []
                    );

                    setIssueForm(
                        (current) => ({
                            ...current,
                            issue_date:
                                current.issue_date ||
                                data.defaults
                                    ?.issue_date ||
                                todayISO(),

                            due_date:
                                current.due_date ||
                                data.defaults
                                    ?.due_date ||
                                addDaysISO(
                                    todayISO(),
                                    14
                                ),

                            fine_per_day:
                                current.fine_per_day ||
                                String(
                                    data.defaults
                                        ?.fine_per_day ??
                                    5
                                ),
                        })
                    );
                } catch (error) {
                    console.error(
                        "Circulation options error:",
                        error
                    );

                    if (!silent) {
                        notify(
                            error.message ||
                            "Failed to load issue options",
                            "error"
                        );
                    }
                } finally {
                    optionsRequestRef.current =
                        false;

                    setOptionsLoading(false);
                }
            },
            [notify, request]
        );

    const loadCirculationRows =
        useCallback(
            async ({
                page = 1,
                perPage = 10,
                filters = EMPTY_FILTERS,
                silent = false,
            } = {}) => {
                if (
                    listRequestRef.current
                ) {
                    return;
                }

                listRequestRef.current =
                    true;

                setCirculationLoading(true);

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
                            if (
                                value !== null &&
                                value !== undefined &&
                                String(
                                    value
                                ).trim() !== ""
                            ) {
                                params.set(
                                    key,
                                    String(value).trim()
                                );
                            }
                        }
                    );

                    const data =
                        await request(
                            `${BASE_URL}/admin/library/circulation?${params.toString()}`
                        );

                    setCirculationRows(
                        Array.isArray(
                            data.issues
                        )
                            ? data.issues
                            : []
                    );

                    setCirculationStats({
                        ...EMPTY_STATS,
                        ...(data.stats || {}),
                    });

                    setCirculationPagination({
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
                        "Load circulation error:",
                        error
                    );

                    if (!silent) {
                        notify(
                            error.message ||
                            "Failed to load issued books",
                            "error"
                        );
                    }
                } finally {
                    listRequestRef.current =
                        false;

                    setCirculationLoading(
                        false
                    );
                }
            },
            [notify, request]
        );

    const updateIssueForm =
        useCallback(
            (name, value) => {
                setIssueForm(
                    (current) => {
                        const updated = {
                            ...current,
                            [name]: value,
                        };

                        if (
                            name ===
                            "issue_date"
                        ) {
                            updated.due_date =
                                addDaysISO(
                                    value,
                                    14
                                );
                        }

                        if (
                            name ===
                            "member_type"
                        ) {
                            updated.member_id =
                                "";
                        }

                        return updated;
                    }
                );

                setIssueFormErrors(
                    (current) => {
                        if (!current[name]) {
                            return current;
                        }

                        const updated = {
                            ...current,
                        };

                        delete updated[name];

                        return updated;
                    }
                );

                if (
                    name ===
                    "member_type"
                ) {
                    loadCirculationOptions({
                        memberType: value,
                        silent: true,
                    });
                }
            },
            [loadCirculationOptions]
        );

    const resetIssueForm =
        useCallback(() => {
            setIssueForm({
                ...EMPTY_FORM,
                issue_date: todayISO(),
                due_date:
                    addDaysISO(
                        todayISO(),
                        14
                    ),
            });

            setIssueFormErrors({});
        }, []);

    const saveIssue = useCallback(
        async (event) => {
            event?.preventDefault();

            if (issueSaving) {
                return;
            }

            const errors = {};

            if (
                !issueForm.member_type
            ) {
                errors.member_type =
                    "Select member type";
            }

            if (!issueForm.member_id) {
                errors.member_id =
                    "Select a member";
            }

            if (!issueForm.book_id) {
                errors.book_id =
                    "Select a book";
            }

            if (
                !issueForm.issue_date
            ) {
                errors.issue_date =
                    "Select issue date";
            }

            if (!issueForm.due_date) {
                errors.due_date =
                    "Select due date";
            }

            if (
                issueForm.issue_date &&
                issueForm.due_date &&
                issueForm.due_date <=
                issueForm.issue_date
            ) {
                errors.due_date =
                    "Due date must be after issue date";
            }

            if (
                Object.keys(errors)
                    .length
            ) {
                setIssueFormErrors(
                    errors
                );

                return;
            }

            if (!canWriteLibrary) {
                notify(
                    "You have read-only access to the Library dashboard. Ask your Super Admin for Full Access if you need to make changes.",
                    "error"
                );
                return;
            }

            setIssueSaving(true);
            setIssueFormErrors({});

            try {
                const data =
                    await request(
                        `${BASE_URL}/admin/library/circulation`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json",
                            },
                            body: JSON.stringify({
                                ...issueForm,
                                member_id: Number(
                                    issueForm.member_id
                                ),
                                book_id: Number(
                                    issueForm.book_id
                                ),
                                fine_per_day:
                                    Number(
                                        issueForm.fine_per_day
                                    ),
                            }),
                        }
                    );

                notify(
                    data.message ||
                    "Book issued successfully",
                    "success"
                );

                resetIssueForm();

                await Promise.all([
                    loadCirculationOptions({
                        silent: true,
                    }),

                    loadCirculationRows({
                        page: 1,
                        perPage:
                            circulationPagination
                                .per_page,
                        filters:
                            circulationFilters,
                        silent: true,
                    }),
                ]);
            } catch (error) {
                console.error(
                    "Issue book error:",
                    error
                );

                if (
                    error.data?.errors
                ) {
                    setIssueFormErrors(
                        error.data.errors
                    );
                }

                notify(
                    error.message ||
                    "Failed to issue book",
                    "error"
                );
            } finally {
                setIssueSaving(false);
            }
        },
        [
            canWriteLibrary,
            circulationFilters,
            circulationPagination.per_page,
            issueForm,
            issueSaving,
            loadCirculationOptions,
            loadCirculationRows,
            notify,
            request,
            resetIssueForm,
        ]
    );

    const updateCirculationFilter =
        useCallback(
            (name, value) => {
                setCirculationFilters(
                    (current) => ({
                        ...current,
                        [name]: value,
                    })
                );
            },
            []
        );

    const applyCirculationFilters =
        useCallback(() => {
            loadCirculationRows({
                page: 1,
                perPage:
                    circulationPagination
                        .per_page,
                filters:
                    circulationFilters,
            });
        }, [
            circulationFilters,
            circulationPagination.per_page,
            loadCirculationRows,
        ]);

    const resetCirculationFilters =
        useCallback(() => {
            const filters = {
                ...EMPTY_FILTERS,
            };

            setCirculationFilters(
                filters
            );

            loadCirculationRows({
                page: 1,
                perPage:
                    circulationPagination
                        .per_page,
                filters,
            });
        }, [
            circulationPagination.per_page,
            loadCirculationRows,
        ]);

    const exportCirculationReport =
        useCallback(async () => {
            if (circulationExporting) {
                return;
            }

            setCirculationExporting(true);

            try {
                const authenticatedFetch =
                    fetchRef.current;

                if (
                    typeof authenticatedFetch !==
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
                    circulationFilters
                ).forEach(([key, value]) => {
                    const normalizedValue =
                        String(value ?? "").trim();

                    if (normalizedValue) {
                        params.set(
                            key,
                            normalizedValue
                        );
                    }
                });

                const response =
                    await authenticatedFetch(
                        `${BASE_URL}/admin/library/circulation?${params.toString()}`,
                        {
                            method: "GET",
                            headers: {
                                Accept: "text/csv",
                            },
                        }
                    );

                if (!response.ok) {
                    let errorMessage =
                        "Failed to export report";

                    try {
                        const errorData =
                            await response.json();

                        errorMessage =
                            errorData.error ||
                            errorData.message ||
                            errorMessage;
                    } catch {
                        // Response was not JSON.
                    }

                    throw new Error(
                        errorMessage
                    );
                }

                const blob =
                    await response.blob();

                const contentDisposition =
                    response.headers.get(
                        "Content-Disposition"
                    );

                let filename =
                    `library-circulation-report-${new Date()
                        .toISOString()
                        .slice(0, 10)}.csv`;

                const filenameMatch =
                    contentDisposition?.match(
                        /filename="?([^"]+)"?/i
                    );

                if (filenameMatch?.[1]) {
                    filename =
                        filenameMatch[1].trim();
                }

                const exportedRecords =
                    response.headers.get(
                        "X-Exported-Records"
                    );

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

                notify(
                    exportedRecords
                        ? `${exportedRecords} filtered record(s) exported successfully`
                        : "Filtered report exported successfully",
                    "success"
                );
            } catch (error) {
                console.error(
                    "Export circulation report error:",
                    error
                );

                notify(
                    error.message ||
                    "Failed to export report",
                    "error"
                );
            } finally {
                setCirculationExporting(
                    false
                );
            }
        }, [
            circulationExporting,
            circulationFilters,
            notify,
        ]);

    const changeCirculationPage =
        useCallback(
            (page) => {
                if (
                    page < 1 ||
                    page >
                    circulationPagination.pages
                ) {
                    return;
                }

                loadCirculationRows({
                    page,
                    perPage:
                        circulationPagination
                            .per_page,
                    filters:
                        circulationFilters,
                });
            },
            [
                circulationFilters,
                circulationPagination.pages,
                circulationPagination.per_page,
                loadCirculationRows,
            ]
        );

    const returnIssuedBook =
        useCallback(
            async (issue) => {
                if (
                    !issue?.id ||
                    issue.status ===
                    "Returned"
                ) {
                    return;
                }

                const confirmed =
                    window.confirm(
                        `Return "${issue.book_title}" from ${issue.member_name}?`
                    );

                if (!confirmed) {
                    return;
                }

                if (!canWriteLibrary) {
                    notify(
                        "You have read-only access to the Library dashboard. Ask your Super Admin for Full Access if you need to make changes.",
                        "error"
                    );
                    return;
                }

                const issueKey =
                    `${issue.member_type}-${issue.id}`;

                setReturningIssueKey(
                    issueKey
                );

                try {
                    const data =
                        await request(
                            `${BASE_URL}/admin/library/circulation/${issue.member_type}/${issue.id}/return`,
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type":
                                        "application/json",
                                },
                                body: JSON.stringify({
                                    return_date:
                                        todayISO(),
                                }),
                            }
                        );

                    notify(
                        data.message ||
                        "Book returned successfully",
                        "success"
                    );

                    setIssueDetailsOpen(
                        false
                    );

                    setSelectedIssue(null);

                    await Promise.all([
                        loadCirculationOptions({
                            silent: true,
                        }),

                        loadCirculationRows({
                            page:
                                circulationPagination
                                    .page,
                            perPage:
                                circulationPagination
                                    .per_page,
                            filters:
                                circulationFilters,
                            silent: true,
                        }),
                    ]);
                } catch (error) {
                    notify(
                        error.message ||
                        "Failed to return book",
                        "error"
                    );
                } finally {
                    setReturningIssueKey(
                        null
                    );
                }
            },
            [
                canWriteLibrary,
                circulationFilters,
                circulationPagination.page,
                circulationPagination.per_page,
                loadCirculationOptions,
                loadCirculationRows,
                notify,
                request,
            ]
        );

    const openIssueDetails =
        useCallback((issue) => {
            setSelectedIssue(issue);
            setIssueDetailsOpen(true);
        }, []);

    const closeIssueDetails =
        useCallback(() => {
            setSelectedIssue(null);
            setIssueDetailsOpen(false);
        }, []);

    useEffect(() => {
        if (
            activeSection !==
            "issued-books"
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

        const savedMemberRaw =
            localStorage.getItem(
                "libraryIssueMember"
            );

        if (savedMemberRaw) {
            try {
                const member =
                    JSON.parse(
                        savedMemberRaw
                    );

                setIssueForm(
                    (current) => ({
                        ...current,
                        member_type:
                            member.member_type ||
                            "",
                        member_id:
                            member.member_id
                                ? String(
                                    member.member_id
                                )
                                : "",
                    })
                );

                localStorage.removeItem(
                    "libraryIssueMember"
                );

                loadCirculationOptions({
                    memberType:
                        member.member_type,
                    silent: true,
                });
            } catch {
                localStorage.removeItem(
                    "libraryIssueMember"
                );
            }
        } else {
            loadCirculationOptions({
                silent: true,
            });
        }

        loadCirculationRows({
            page: 1,
            perPage: 10,
            filters: {
                ...EMPTY_FILTERS,
            },
        });
    }, [
        activeSection,
        loadCirculationOptions,
        loadCirculationRows,
    ]);

    const selectedIssueMember =
        issueMembers.find(
            (member) =>
                String(member.id) ===
                String(issueForm.member_id) &&
                member.member_type ===
                issueForm.member_type
        ) || null;

    const updateMemberSearch = useCallback(
        (value) => {
            setMemberSearch(value);
            setMemberDropdownOpen(true);
        },
        []
    );

    const selectIssueMember = useCallback(
        (member) => {
            setIssueForm((current) => ({
                ...current,
                member_type: member.member_type,
                member_id: String(member.id),
            }));

            setMemberSearch(
                `${member.name} (${member.member_code})`
            );

            setMemberDropdownOpen(false);

            setIssueFormErrors((current) => {
                const updated = {
                    ...current,
                };

                delete updated.member_id;

                return updated;
            });
        },
        []
    );

    const clearSelectedMember = useCallback(
        () => {
            setIssueForm((current) => ({
                ...current,
                member_id: "",
            }));

            setMemberSearch("");
            setMemberDropdownOpen(false);
        },
        []
    );

    return {
        issueForm,
        issueFormErrors,
        issueMembers,
        availableBooks,

        circulationRows,
        circulationFilters,
        circulationStats,
        circulationPagination,

        optionsLoading,
        circulationLoading,
        issueSaving,
        returningIssueKey,

        selectedIssue,
        issueDetailsOpen,

        updateIssueForm,
        resetIssueForm,
        saveIssue,

        updateCirculationFilter,
        applyCirculationFilters,
        resetCirculationFilters,
        changeCirculationPage,

        loadCirculationOptions,
        loadCirculationRows,

        returnIssuedBook,
        openIssueDetails,
        closeIssueDetails,
        memberSearch,
        memberDropdownOpen,
        selectedIssueMember,

        updateMemberSearch,
        selectIssueMember,
        clearSelectedMember,
        setMemberDropdownOpen,
        circulationExporting,
        exportCirculationReport,

        canWriteLibrary,
    };
}