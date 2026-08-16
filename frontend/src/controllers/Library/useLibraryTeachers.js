import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import { BASE_URL } from "../../config/appConfig";
import { useLibraryPermission } from "./useLibraryPermission";

const EMPTY_FILTERS = {
    search: "",
    department: "",
    status: "",
};

const EMPTY_PAGINATION = {
    page: 1,
    per_page: 10,
    total: 0,
    pages: 1,
    has_next: false,
    has_prev: false,
};

const EMPTY_STATS = {
    total_teachers: 0,
    active_issues: 0,
    teachers_with_fine: 0,
    collected_fine: 0,
};

const EMPTY_FINE_FORM = {
    book_issue_id: "",
    amount: "",
    payment_method: "Cash",
    reference_no: "",
    remarks: "",
    status: "Collected",
};

export function useLibraryTeachers({
    activeSection,
    fetchWithAuth,
    showToast,
    setActiveSection,
}) {
    const { canWriteLibrary } = useLibraryPermission();

    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);
    const requestRunningRef = useRef(false);
    const detailsRunningRef = useRef(false);
    const sectionLoadedRef = useRef(false);

    const [libraryTeachers, setLibraryTeachers] =
        useState([]);

    const [
        teacherDepartments,
        setTeacherDepartments,
    ] = useState([]);

    const [
        teacherLibraryFilters,
        setTeacherLibraryFilters,
    ] = useState({
        ...EMPTY_FILTERS,
    });

    const [
        teacherLibraryPagination,
        setTeacherLibraryPagination,
    ] = useState({
        ...EMPTY_PAGINATION,
    });

    const [
        teacherLibraryStats,
        setTeacherLibraryStats,
    ] = useState({
        ...EMPTY_STATS,
    });

    const [
        libraryTeachersLoading,
        setLibraryTeachersLoading,
    ] = useState(false);

    const [
        selectedLibraryTeacher,
        setSelectedLibraryTeacher,
    ] = useState(null);

    const [
        teacherLibraryDetails,
        setTeacherLibraryDetails,
    ] = useState(null);

    const [
        teacherDetailsLoading,
        setTeacherDetailsLoading,
    ] = useState(false);

    const [
        teacherDetailsModalOpen,
        setTeacherDetailsModalOpen,
    ] = useState(false);

    const [
        teacherFineModalOpen,
        setTeacherFineModalOpen,
    ] = useState(false);

    const [
        teacherFineSaving,
        setTeacherFineSaving,
    ] = useState(false);

    const [
        teacherFineForm,
        setTeacherFineForm,
    ] = useState({
        ...EMPTY_FINE_FORM,
    });

    const [
        teacherFineErrors,
        setTeacherFineErrors,
    ] = useState({});

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
                throw error;
            }

            return data;
        },
        []
    );

    const loadLibraryTeachers =
        useCallback(
            async ({
                page = 1,
                perPage = 10,
                filters = EMPTY_FILTERS,
                force = false,
                silent = false,
            } = {}) => {
                if (
                    requestRunningRef.current
                ) {
                    return;
                }

                requestRunningRef.current =
                    true;

                setLibraryTeachersLoading(
                    true
                );

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

                    if (
                        String(
                            filters.search || ""
                        ).trim()
                    ) {
                        params.set(
                            "search",
                            filters.search.trim()
                        );
                    }

                    if (filters.department) {
                        params.set(
                            "department",
                            filters.department
                        );
                    }

                    if (filters.status) {
                        params.set(
                            "status",
                            filters.status
                        );
                    }

                    const data =
                        await request(
                            `${BASE_URL}/admin/library/teachers?${params.toString()}`
                        );

                    setLibraryTeachers(
                        Array.isArray(
                            data.teachers
                        )
                            ? data.teachers
                            : []
                    );

                    setTeacherDepartments(
                        Array.isArray(
                            data.departments
                        )
                            ? data.departments
                            : []
                    );

                    setTeacherLibraryStats({
                        ...EMPTY_STATS,
                        ...(data.stats || {}),
                    });

                    setTeacherLibraryPagination({
                        ...EMPTY_PAGINATION,
                        ...(data.pagination || {}),
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
                        "Load teachers error:",
                        error
                    );

                    if (!silent) {
                        notify(
                            error.message,
                            "error"
                        );
                    }
                } finally {
                    requestRunningRef.current =
                        false;

                    setLibraryTeachersLoading(
                        false
                    );
                }
            },
            [notify, request]
        );

    const updateTeacherLibraryFilter =
        useCallback((name, value) => {
            setTeacherLibraryFilters(
                (current) => ({
                    ...current,
                    [name]: value,
                })
            );
        }, []);

    const applyTeacherLibraryFilters =
        useCallback(() => {
            loadLibraryTeachers({
                page: 1,
                perPage:
                    teacherLibraryPagination
                        .per_page,
                filters:
                    teacherLibraryFilters,
                force: true,
            });
        }, [
            loadLibraryTeachers,
            teacherLibraryFilters,
            teacherLibraryPagination.per_page,
        ]);

    const resetTeacherLibraryFilters =
        useCallback(() => {
            const filters = {
                ...EMPTY_FILTERS,
            };

            setTeacherLibraryFilters(
                filters
            );

            loadLibraryTeachers({
                page: 1,
                perPage:
                    teacherLibraryPagination
                        .per_page,
                filters,
                force: true,
            });
        }, [
            loadLibraryTeachers,
            teacherLibraryPagination.per_page,
        ]);

    const changeTeacherLibraryPage =
        useCallback(
            (page) => {
                loadLibraryTeachers({
                    page,
                    perPage:
                        teacherLibraryPagination
                            .per_page,
                    filters:
                        teacherLibraryFilters,
                    force: true,
                });
            },
            [
                loadLibraryTeachers,
                teacherLibraryFilters,
                teacherLibraryPagination.per_page,
            ]
        );

    const loadTeacherLibraryDetails =
        useCallback(
            async (teacherId) => {
                if (
                    detailsRunningRef.current
                ) {
                    return;
                }

                detailsRunningRef.current =
                    true;

                setTeacherDetailsLoading(
                    true
                );

                try {
                    const data =
                        await request(
                            `${BASE_URL}/admin/library/teachers/${teacherId}`
                        );

                    setTeacherLibraryDetails(
                        data
                    );

                    return data;
                } catch (error) {
                    notify(
                        error.message,
                        "error"
                    );

                    throw error;
                } finally {
                    detailsRunningRef.current =
                        false;

                    setTeacherDetailsLoading(
                        false
                    );
                }
            },
            [notify, request]
        );

    const openTeacherLibraryDetails =
        useCallback(
            async (teacher) => {
                setSelectedLibraryTeacher(
                    teacher
                );

                setTeacherLibraryDetails(
                    null
                );

                setTeacherDetailsModalOpen(
                    true
                );

                try {
                    await loadTeacherLibraryDetails(
                        teacher.id
                    );
                } catch {
                    // handled above
                }
            },
            [loadTeacherLibraryDetails]
        );

    const closeTeacherLibraryDetails =
        useCallback(() => {
            setTeacherDetailsModalOpen(
                false
            );

            setSelectedLibraryTeacher(
                null
            );

            setTeacherLibraryDetails(
                null
            );
        }, []);

    const issueBookToTeacher =
        useCallback(
            (teacher) => {
                if (!canWriteLibrary) {
                    notify(
                        "You have read-only access to the Library dashboard. Ask your Super Admin for Full Access if you need to make changes.",
                        "error"
                    );
                    return;
                }

                localStorage.setItem(
                    "libraryIssueMember",
                    JSON.stringify({
                        member_type:
                            "teacher",
                        member_id:
                            teacher.id,
                        member_code:
                            teacher.teacher_id,
                        member_name:
                            teacher.name,
                    })
                );

                setActiveSection?.(
                    "issued-books"
                );
            },
            [canWriteLibrary, notify, setActiveSection]
        );

    const openTeacherFineModal =
        useCallback(
            (teacher, issue = null) => {
                setSelectedLibraryTeacher(
                    teacher
                );

                setTeacherFineForm({
                    ...EMPTY_FINE_FORM,
                    book_issue_id:
                        issue?.id
                            ? String(issue.id)
                            : "",
                    amount:
                        issue?.pending_fine > 0
                            ? String(
                                issue.pending_fine
                            )
                            : "",
                });

                setTeacherFineErrors({});
                setTeacherFineModalOpen(
                    true
                );
            },
            []
        );

    const closeTeacherFineModal =
        useCallback(() => {
            if (teacherFineSaving) {
                return;
            }

            setTeacherFineModalOpen(
                false
            );

            setTeacherFineForm({
                ...EMPTY_FINE_FORM,
            });

            setTeacherFineErrors({});
        }, [teacherFineSaving]);

    const updateTeacherFineForm =
        useCallback((name, value) => {
            setTeacherFineForm(
                (current) => ({
                    ...current,
                    [name]: value,
                })
            );
        }, []);

    const saveTeacherFine =
        useCallback(
            async (event) => {
                event?.preventDefault();

                const amount = Number(
                    teacherFineForm.amount
                );

                if (
                    !Number.isFinite(amount)
                    || amount <= 0
                ) {
                    setTeacherFineErrors({
                        amount:
                            "Enter valid amount",
                    });

                    return;
                }

                if (!canWriteLibrary) {
                    notify(
                        "You have read-only access to the Library dashboard. Ask your Super Admin for Full Access if you need to make changes.",
                        "error"
                    );
                    return;
                }

                setTeacherFineSaving(true);

                try {
                    const data =
                        await request(
                            `${BASE_URL}/admin/library/teachers/${selectedLibraryTeacher.id}/fine-payments`,
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type":
                                        "application/json",
                                },
                                body: JSON.stringify({
                                    ...teacherFineForm,
                                    amount,
                                    book_issue_id:
                                        teacherFineForm
                                            .book_issue_id
                                            ? Number(
                                                teacherFineForm
                                                    .book_issue_id
                                            )
                                            : null,
                                }),
                            }
                        );

                    notify(
                        data.message,
                        "success"
                    );

                    closeTeacherFineModal();

                    await Promise.all([
                        loadLibraryTeachers({
                            page:
                                teacherLibraryPagination
                                    .page,
                            perPage:
                                teacherLibraryPagination
                                    .per_page,
                            filters:
                                teacherLibraryFilters,
                            force: true,
                            silent: true,
                        }),

                        loadTeacherLibraryDetails(
                            selectedLibraryTeacher.id
                        ),
                    ]);
                } catch (error) {
                    setTeacherFineErrors(
                        error.data?.errors
                        || {}
                    );

                    notify(
                        error.message,
                        "error"
                    );
                } finally {
                    setTeacherFineSaving(
                        false
                    );
                }
            },
            [
                canWriteLibrary,
                closeTeacherFineModal,
                loadLibraryTeachers,
                loadTeacherLibraryDetails,
                notify,
                request,
                selectedLibraryTeacher,
                teacherFineForm,
                teacherLibraryFilters,
                teacherLibraryPagination.page,
                teacherLibraryPagination.per_page,
            ]
        );

    const exportLibraryTeachersCSV =
        useCallback(() => {
            if (
                !libraryTeachers.length
            ) {
                notify(
                    "No teachers to export",
                    "warning"
                );

                return;
            }

            const headers = [
                "Teacher ID",
                "Name",
                "Department",
                "Designation",
                "Mobile",
                "Issued Books",
                "Returned Books",
                "Pending Fine",
                "Status",
            ];

            const rows =
                libraryTeachers.map(
                    (teacher) => [
                        teacher.teacher_id,
                        teacher.name,
                        teacher.department,
                        teacher.designation,
                        teacher.mobile,
                        teacher.active_books,
                        teacher.returned_books,
                        teacher.pending_fine,
                        teacher.library_status,
                    ]
                );

            const escapeValue = (value) =>
                `"${String(
                    value ?? ""
                ).replace(/"/g, '""')}"`;

            const csv = [
                headers
                    .map(escapeValue)
                    .join(","),
                ...rows.map((row) =>
                    row
                        .map(escapeValue)
                        .join(",")
                ),
            ].join("\n");

            const blob = new Blob(
                [csv],
                {
                    type:
                        "text/csv;charset=utf-8",
                }
            );

            const url =
                URL.createObjectURL(blob);

            const anchor =
                document.createElement("a");

            anchor.href = url;
            anchor.download =
                "library-teachers.csv";

            anchor.click();

            URL.revokeObjectURL(url);
        },
            [libraryTeachers, notify]
        );

    useEffect(() => {
        if (
            activeSection !== "teachers"
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

        loadLibraryTeachers({
            page: 1,
            perPage: 10,
            filters: EMPTY_FILTERS,
        });
    }, [
        activeSection,
        loadLibraryTeachers,
    ]);

    return {
        libraryTeachers,
        teacherDepartments,
        teacherLibraryFilters,
        teacherLibraryPagination,
        teacherLibraryStats,
        libraryTeachersLoading,

        selectedLibraryTeacher,
        teacherLibraryDetails,
        teacherDetailsLoading,
        teacherDetailsModalOpen,

        teacherFineModalOpen,
        teacherFineSaving,
        teacherFineForm,
        teacherFineErrors,

        updateTeacherLibraryFilter,
        applyTeacherLibraryFilters,
        resetTeacherLibraryFilters,
        changeTeacherLibraryPage,
        loadLibraryTeachers,

        openTeacherLibraryDetails,
        closeTeacherLibraryDetails,
        issueBookToTeacher,

        openTeacherFineModal,
        closeTeacherFineModal,
        updateTeacherFineForm,
        saveTeacherFine,

        exportLibraryTeachersCSV,

        canWriteLibrary,
    };
}