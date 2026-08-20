import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import { BASE_URL } from "../../config/appConfig";
import { useLibraryPermission } from "./useLibraryPermission";

const INITIAL_FILTERS = {
    search: "",
    class_name: "",
    status: "",
};

const INITIAL_PAGINATION = {
    page: 1,
    per_page: 10,
    total: 0,
    pages: 1,
    has_next: false,
    has_prev: false,
};

const INITIAL_STATS = {
    total_students: 0,
    active_issues: 0,
    students_with_fine: 0,
    collected_fine: 0,
};

const INITIAL_FINE_FORM = {
    book_issue_id: "",
    amount: "",
    payment_method: "Cash",
    reference_no: "",
    remarks: "",
    status: "Collected",
};

export function useLibraryStudents({
    activeSection,
    fetchWithAuth,
    showToast,
    setActiveSection,
}) {
    const { canWriteLibrary } = useLibraryPermission();

    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);

    const listRequestRef = useRef(false);
    const detailRequestRef = useRef(false);
    const sectionLoadedRef = useRef(false);

    const [students, setStudents] = useState([]);
    const [studentClasses, setStudentClasses] =
        useState([]);

    const [studentFilters, setStudentFilters] =
        useState({
            ...INITIAL_FILTERS,
        });

    const [studentPagination, setStudentPagination] =
        useState({
            ...INITIAL_PAGINATION,
        });

    const [studentStats, setStudentStats] =
        useState({
            ...INITIAL_STATS,
        });

    const [studentsLoading, setStudentsLoading] =
        useState(false);

    const [selectedLibraryStudent, setSelectedLibraryStudent] =
        useState(null);

    const [studentDetails, setStudentDetails] =
        useState(null);

    const [studentDetailsLoading, setStudentDetailsLoading] =
        useState(false);

    const [studentDetailsModalOpen, setStudentDetailsModalOpen] =
        useState(false);

    const [fineModalOpen, setFineModalOpen] =
        useState(false);

    const [fineSaving, setFineSaving] =
        useState(false);

    const [fineForm, setFineForm] = useState({
        ...INITIAL_FINE_FORM,
    });

    const [fineFormErrors, setFineFormErrors] =
        useState({});

    useEffect(() => {
        fetchRef.current = fetchWithAuth;
    }, [fetchWithAuth]);

    useEffect(() => {
        toastRef.current = showToast;
    }, [showToast]);

    const notify = useCallback(
        (message, type = "info") => {
            if (
                typeof toastRef.current === "function"
            ) {
                toastRef.current(message, type);
            }
        },
        []
    );

    const request = useCallback(
        async (url, options = {}) => {
            const authenticatedFetch =
                fetchRef.current;

            if (
                typeof authenticatedFetch
                !== "function"
            ) {
                throw new Error(
                    "Authenticated request is unavailable"
                );
            }

            const response =
                await authenticatedFetch(
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

                error.status = response.status;
                error.data = data;

                throw error;
            }

            return data;
        },
        []
    );

    const loadLibraryStudents = useCallback(
        async ({
            page = 1,
            perPage = 10,
            filters = INITIAL_FILTERS,
            force = false,
            silent = false,
        } = {}) => {
            if (
                listRequestRef.current &&
                !force
            ) {
                return;
            }

            if (listRequestRef.current) {
                return;
            }

            listRequestRef.current = true;
            setStudentsLoading(true);

            try {
                const params =
                    new URLSearchParams();

                params.set("page", String(page));
                params.set(
                    "per_page",
                    String(perPage)
                );

                const search = String(
                    filters.search || ""
                ).trim();

                if (search) {
                    params.set(
                        "search",
                        search
                    );
                }

                if (filters.class_name) {
                    params.set(
                        "class_name",
                        filters.class_name
                    );
                }

                if (filters.status) {
                    params.set(
                        "status",
                        filters.status
                    );
                }

                const data = await request(
                    `${BASE_URL}/admin/library/students?${params.toString()}`,
                    {
                        method: "GET",
                    }
                );

                setStudents(
                    Array.isArray(data.students)
                        ? data.students
                        : []
                );

                setStudentClasses(
                    Array.isArray(data.classes)
                        ? data.classes
                        : []
                );

                setStudentStats({
                    total_students:
                        Number(
                            data.stats
                                ?.total_students
                        ) || 0,

                    active_issues:
                        Number(
                            data.stats
                                ?.active_issues
                        ) || 0,

                    students_with_fine:
                        Number(
                            data.stats
                                ?.students_with_fine
                        ) || 0,

                    collected_fine:
                        Number(
                            data.stats
                                ?.collected_fine
                        ) || 0,
                });

                setStudentPagination({
                    page:
                        Number(
                            data.pagination
                                ?.page
                        ) || page,

                    per_page:
                        Number(
                            data.pagination
                                ?.per_page
                        ) || perPage,

                    total:
                        Number(
                            data.pagination
                                ?.total
                        ) || 0,

                    pages:
                        Math.max(
                            Number(
                                data.pagination
                                    ?.pages
                            ) || 1,
                            1
                        ),

                    has_next: Boolean(
                        data.pagination
                            ?.has_next
                    ),

                    has_prev: Boolean(
                        data.pagination
                            ?.has_prev
                    ),
                });
            } catch (error) {
                console.error(
                    "Load library students error:",
                    error
                );

                setStudents([]);

                if (!silent) {
                    notify(
                        error.message ||
                        "Failed to load students",
                        "error"
                    );
                }
            } finally {
                listRequestRef.current = false;
                setStudentsLoading(false);
            }
        },
        [notify, request]
    );

    const updateStudentFilter = useCallback(
        (name, value) => {
            setStudentFilters(
                (current) => ({
                    ...current,
                    [name]: value,
                })
            );
        },
        []
    );

    const applyStudentFilters =
        useCallback(() => {
            loadLibraryStudents({
                page: 1,
                perPage:
                    studentPagination.per_page,
                filters: studentFilters,
                force: true,
            });
        }, [
            loadLibraryStudents,
            studentFilters,
            studentPagination.per_page,
        ]);

    const resetStudentFilters =
        useCallback(() => {
            const cleared = {
                ...INITIAL_FILTERS,
            };

            setStudentFilters(cleared);

            loadLibraryStudents({
                page: 1,
                perPage:
                    studentPagination.per_page,
                filters: cleared,
                force: true,
            });
        }, [
            loadLibraryStudents,
            studentPagination.per_page,
        ]);

    const changeStudentPage = useCallback(
        (page) => {
            if (
                page < 1 ||
                page >
                    studentPagination.pages
            ) {
                return;
            }

            loadLibraryStudents({
                page,
                perPage:
                    studentPagination.per_page,
                filters: studentFilters,
                force: true,
            });
        },
        [
            loadLibraryStudents,
            studentFilters,
            studentPagination.pages,
            studentPagination.per_page,
        ]
    );

    const changeStudentPageSize =
        useCallback(
            (perPage) => {
                loadLibraryStudents({
                    page: 1,
                    perPage,
                    filters: studentFilters,
                    force: true,
                });
            },
            [
                loadLibraryStudents,
                studentFilters,
            ]
        );

    const loadStudentDetails = useCallback(
        async (studentId, {
            silent = false,
        } = {}) => {
            if (
                !studentId ||
                detailRequestRef.current
            ) {
                return;
            }

            detailRequestRef.current = true;
            setStudentDetailsLoading(true);

            try {
                const data = await request(
                    `${BASE_URL}/admin/library/students/${studentId}`,
                    {
                        method: "GET",
                    }
                );

                setStudentDetails(data);
                return data;
            } catch (error) {
                console.error(
                    "Load student details error:",
                    error
                );

                if (!silent) {
                    notify(
                        error.message ||
                        "Failed to load student details",
                        "error"
                    );
                }

                throw error;
            } finally {
                detailRequestRef.current = false;
                setStudentDetailsLoading(false);
            }
        },
        [notify, request]
    );

    const openStudentDetails =
        useCallback(
            async (student) => {
                setSelectedLibraryStudent(
                    student
                );

                setStudentDetails(null);
                setStudentDetailsModalOpen(
                    true
                );

                try {
                    await loadStudentDetails(
                        student.id
                    );
                } catch {
                    // Notification handled above.
                }
            },
            [loadStudentDetails]
        );

    const closeStudentDetails =
        useCallback(() => {
            if (fineSaving) {
                return;
            }

            setStudentDetailsModalOpen(
                false
            );

            setSelectedLibraryStudent(
                null
            );

            setStudentDetails(null);
        }, [fineSaving]);

    const openFineModal = useCallback(
        (student, issue = null) => {
            setSelectedLibraryStudent(
                student
            );

            setFineForm({
                ...INITIAL_FINE_FORM,

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

            setFineFormErrors({});
            setFineModalOpen(true);
        },
        []
    );

    const closeFineModal =
        useCallback(() => {
            if (fineSaving) {
                return;
            }

            setFineModalOpen(false);

            setFineForm({
                ...INITIAL_FINE_FORM,
            });

            setFineFormErrors({});
        }, [fineSaving]);

    const updateFineForm = useCallback(
        (name, value) => {
            setFineForm(
                (current) => ({
                    ...current,
                    [name]: value,
                })
            );

            setFineFormErrors(
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
        },
        []
    );

    const saveFinePayment = useCallback(
        async (event) => {
            event?.preventDefault();

            if (
                fineSaving ||
                !selectedLibraryStudent?.id
            ) {
                return;
            }

            const errors = {};
            const amount = Number(
                fineForm.amount
            );

            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {
                errors.amount =
                    "Enter a valid amount";
            }

            if (
                Object.keys(errors).length
                > 0
            ) {
                setFineFormErrors(errors);
                return;
            }

            if (!canWriteLibrary) {
                notify(
                    "You have read-only access to the Library dashboard. Ask your Super Admin for Full Access if you need to make changes.",
                    "error"
                );
                return;
            }

            setFineSaving(true);
            setFineFormErrors({});

            try {
                const data = await request(
                    `${BASE_URL}/admin/library/students/${selectedLibraryStudent.id}/fine-payments`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body: JSON.stringify({
                            book_issue_id:
                                fineForm.book_issue_id
                                    ? Number(
                                        fineForm.book_issue_id
                                    )
                                    : null,

                            amount,

                            payment_method:
                                fineForm.payment_method,

                            reference_no:
                                fineForm.reference_no
                                    .trim() ||
                                null,

                            remarks:
                                fineForm.remarks
                                    .trim() ||
                                null,

                            status:
                                fineForm.status,
                        }),
                    }
                );

                notify(
                    data.message ||
                    "Fine payment saved",
                    "success"
                );

                closeFineModal();

                await Promise.all([
                    loadLibraryStudents({
                        page:
                            studentPagination.page,
                        perPage:
                            studentPagination
                                .per_page,
                        filters:
                            studentFilters,
                        force: true,
                        silent: true,
                    }),

                    loadStudentDetails(
                        selectedLibraryStudent.id,
                        {
                            silent: true,
                        }
                    ),
                ]);
            } catch (error) {
                console.error(
                    "Fine payment error:",
                    error
                );

                if (
                    error.data?.errors &&
                    typeof error.data.errors
                        === "object"
                ) {
                    setFineFormErrors(
                        error.data.errors
                    );
                }

                notify(
                    error.message ||
                    "Failed to save payment",
                    "error"
                );
            } finally {
                setFineSaving(false);
            }
        },
        [
            canWriteLibrary,
            closeFineModal,
            fineForm,
            fineSaving,
            loadLibraryStudents,
            loadStudentDetails,
            notify,
            request,
            selectedLibraryStudent,
            studentFilters,
            studentPagination.page,
            studentPagination.per_page,
        ]
    );

    const issueBookToStudent =
        useCallback(
            (student) => {
                localStorage.setItem(
                    "libraryIssueStudent",
                    JSON.stringify({
                        id: student.id,
                        student_id:
                            student.student_id,
                        name: student.name,
                        class_name:
                            student.class_name,
                    })
                );

                if (
                    typeof setActiveSection
                    === "function"
                ) {
                    setActiveSection(
                        "issued-books"
                    );
                }
            },
            [setActiveSection]
        );

    const refreshStudents =
        useCallback(async () => {
            await loadLibraryStudents({
                page:
                    studentPagination.page,
                perPage:
                    studentPagination.per_page,
                filters: studentFilters,
                force: true,
                silent: true,
            });

            notify(
                "Student records refreshed",
                "success"
            );
        }, [
            loadLibraryStudents,
            notify,
            studentFilters,
            studentPagination.page,
            studentPagination.per_page,
        ]);

    const exportStudentsCSV =
        useCallback(() => {
            if (!students.length) {
                notify(
                    "No students available to export",
                    "warning"
                );
                return;
            }

            const rows = students.map(
                (student) => ({
                    "Student ID":
                        student.student_id,

                    Name: student.name,

                    Class:
                        student.class_name,

                    "Roll Number":
                        student.roll_number,

                    Mobile: student.mobile,

                    "Active Books":
                        student.active_books,

                    "Returned Books":
                        student.returned_books,

                    "Pending Fine":
                        student.pending_fine,

                    "Collected Fine":
                        student.collected_fine,

                    Status:
                        student.library_status,
                })
            );

            const headers =
                Object.keys(rows[0]);

            const escapeCSV = (value) =>
                `"${String(
                    value ?? ""
                ).replace(/"/g, '""')}"`;

            const csv = [
                headers
                    .map(escapeCSV)
                    .join(","),

                ...rows.map((row) =>
                    headers
                        .map((header) =>
                            escapeCSV(
                                row[header]
                            )
                        )
                        .join(",")
                ),
            ].join("\n");

            const blob = new Blob(
                [csv],
                {
                    type:
                        "text/csv;charset=utf-8;",
                }
            );

            const url =
                URL.createObjectURL(blob);

            const link =
                document.createElement("a");

            link.href = url;
            link.download =
                "library-students.csv";

            document.body.appendChild(
                link
            );

            link.click();
            link.remove();

            URL.revokeObjectURL(url);
        },
        [notify, students]
    );

    useEffect(() => {
        if (
            activeSection !== "students"
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

        loadLibraryStudents({
            page: 1,
            perPage: 10,
            filters: {
                ...INITIAL_FILTERS,
            },
        });
    }, [
        activeSection,
        loadLibraryStudents,
    ]);

    return {
        students,
        studentClasses,
        studentFilters,
        studentPagination,
        studentStats,
        studentsLoading,

        selectedLibraryStudent,
        studentDetails,
        studentDetailsLoading,
        studentDetailsModalOpen,

        fineModalOpen,
        fineSaving,
        fineForm,
        fineFormErrors,

        loadLibraryStudents,
        updateStudentFilter,
        applyStudentFilters,
        resetStudentFilters,
        changeStudentPage,
        changeStudentPageSize,
        refreshStudents,
        exportStudentsCSV,

        openStudentDetails,
        closeStudentDetails,

        openFineModal,
        closeFineModal,
        updateFineForm,
        saveFinePayment,

        issueBookToStudent,

        canWriteLibrary,
    };
}