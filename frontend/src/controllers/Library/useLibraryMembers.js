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
    role: "",
    department: "",
    status: "",
};

const INITIAL_PAGINATION = {
    page: 1,
    per_page: 10,
    total: 0,
    pages: 1,
    has_prev: false,
    has_next: false,
};

const INITIAL_STATS = {
    total_members: 0,
    staff: 0,
    admins: 0,
    active_issues: 0,
    pending_fine: 0,
};

export function useLibraryMembers({
    activeSection,
    fetchWithAuth,
    showToast,
    setActiveSection,
}) {
    const { canWriteLibrary } = useLibraryPermission();

    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);
    const requestRunningRef = useRef(false);
    const sectionLoadedRef = useRef(false);

    const [
        libraryMembers,
        setLibraryMembers,
    ] = useState([]);

    const [
        memberDepartments,
        setMemberDepartments,
    ] = useState([]);

    const [
        memberFilters,
        setMemberFilters,
    ] = useState({
        ...INITIAL_FILTERS,
    });

    const [
        memberPagination,
        setMemberPagination,
    ] = useState({
        ...INITIAL_PAGINATION,
    });

    const [
        memberStats,
        setMemberStats,
    ] = useState({
        ...INITIAL_STATS,
    });

    const [
        membersLoading,
        setMembersLoading,
    ] = useState(false);

    const [
        selectedMember,
        setSelectedMember,
    ] = useState(null);

    const [
        memberModalOpen,
        setMemberModalOpen,
    ] = useState(false);

    const [
        memberDetails,
        setMemberDetails,
    ] = useState(null);

    const [
        memberDetailsLoading,
        setMemberDetailsLoading,
    ] = useState(false);

    const memberDetailsRequestRef =
        useRef(false);

    useEffect(() => {
        fetchRef.current = fetchWithAuth;
    }, [fetchWithAuth]);

    useEffect(() => {
        toastRef.current = showToast;
    }, [showToast]);

    const notify = useCallback(
        (message, type = "info") => {
            if (
                typeof toastRef.current
                === "function"
            ) {
                toastRef.current(
                    message,
                    type
                );
            }
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

    const loadLibraryMembers =
        useCallback(
            async ({
                page = 1,
                perPage = 10,
                filters = INITIAL_FILTERS,
                silent = false,
            } = {}) => {
                if (
                    requestRunningRef.current
                ) {
                    return;
                }

                requestRunningRef.current =
                    true;

                setMembersLoading(true);

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

                    const search = String(
                        filters.search || ""
                    ).trim();

                    if (search) {
                        params.set(
                            "search",
                            search
                        );
                    }

                    if (filters.role) {
                        params.set(
                            "role",
                            filters.role
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
                            `${BASE_URL}/admin/library/members?${params.toString()}`
                        );

                    setLibraryMembers(
                        Array.isArray(
                            data.members
                        )
                            ? data.members
                            : []
                    );
                    setMemberDepartments(
                        Array.isArray(data.departments)
                            ? data.departments
                            : []
                    );

                    setMemberStats({
                        ...INITIAL_STATS,
                        ...(data.stats || {}),
                    });

                    setMemberPagination({
                        ...INITIAL_PAGINATION,
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
                        "Load library members:",
                        error
                    );

                    setLibraryMembers([]);

                    if (!silent) {
                        notify(
                            error.message ||
                            "Failed to load members",
                            "error"
                        );
                    }
                } finally {
                    requestRunningRef.current =
                        false;

                    setMembersLoading(false);
                }
            },
            [notify, request]
        );

    const updateMemberFilter =
        useCallback((name, value) => {
            setMemberFilters(
                (current) => ({
                    ...current,
                    [name]: value,
                })
            );
        }, []);

    const applyMemberFilters =
        useCallback(() => {
            loadLibraryMembers({
                page: 1,
                perPage:
                    memberPagination.per_page,
                filters: memberFilters,
            });
        }, [
            loadLibraryMembers,
            memberFilters,
            memberPagination.per_page,
        ]);

    const resetMemberFilters =
        useCallback(() => {
            const filters = {
                ...INITIAL_FILTERS,
            };

            setMemberFilters(filters);

            loadLibraryMembers({
                page: 1,
                perPage:
                    memberPagination.per_page,
                filters,
            });
        }, [
            loadLibraryMembers,
            memberPagination.per_page,
        ]);

    const changeMemberPage =
        useCallback(
            (page) => {
                if (
                    page < 1 ||
                    page >
                    memberPagination.pages
                ) {
                    return;
                }

                loadLibraryMembers({
                    page,
                    perPage:
                        memberPagination
                            .per_page,
                    filters: memberFilters,
                });
            },
            [
                loadLibraryMembers,
                memberFilters,
                memberPagination.pages,
                memberPagination.per_page,
            ]
        );

    // loadMemberDetails is declared HERE first to prevent TDZ ReferenceErrors in openMemberDetails
    const loadMemberDetails = useCallback(
        async (
            memberType,
            memberId,
            {
                silent = false,
            } = {}
        ) => {
            if (
                !memberType ||
                !memberId ||
                memberDetailsRequestRef.current
            ) {
                return null;
            }

            memberDetailsRequestRef.current =
                true;

            setMemberDetailsLoading(true);

            try {
                const data = await request(
                    `${BASE_URL}/admin/library/members/${memberType}/${memberId}`,
                    {
                        method: "GET",
                    }
                );

                setMemberDetails(data);

                return data;
            } catch (error) {
                console.error(
                    "Load member details error:",
                    error
                );

                setMemberDetails(null);

                if (!silent) {
                    notify(
                        error.message ||
                        "Failed to load member details",
                        "error"
                    );
                }

                throw error;
            } finally {
                memberDetailsRequestRef.current =
                    false;

                setMemberDetailsLoading(false);
            }
        },
        [notify, request]
    );

    const openMemberDetails = useCallback(
        async (member) => {
            if (
                !member?.id ||
                !member?.member_type
            ) {
                return;
            }

            setSelectedMember(member);
            setMemberDetails(null);
            setMemberModalOpen(true);

            try {
                await loadMemberDetails(
                    member.member_type,
                    member.id
                );
            } catch {
                // Error notification handled
                // inside loadMemberDetails.
            }
        },
        [loadMemberDetails]
    );

    const closeMemberDetails =
        useCallback(() => {
            setSelectedMember(null);
            setMemberDetails(null);
            setMemberModalOpen(false);
        }, []);

    const issueBookToMember =
        useCallback(
            (member) => {
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
                            member.member_type,
                        member_id: member.id,
                        member_code:
                            member.member_code,
                        member_name:
                            member.name,
                        class_or_department:
                            member.class_or_department,
                    })
                );

                setActiveSection?.(
                    "issued-books"
                );
            },
            [canWriteLibrary, notify, setActiveSection]
        );

    const payMemberFine = useCallback(
        (member) => {
            if (!canWriteLibrary) {
                notify(
                    "You have read-only access to the Library dashboard. Ask your Super Admin for Full Access if you need to make changes.",
                    "error"
                );
                return;
            }

            if (
                member.member_type !== "staff"
            ) {
                notify(
                    "Admin fine collection is not configured",
                    "info"
                );

                return;
            }

            if (
                Number(
                    member.pending_fine
                ) <= 0
            ) {
                notify(
                    "This staff member has no pending fine",
                    "info"
                );

                return;
            }

            notify(
                "Open the staff fine-payment modal here",
                "info"
            );
        },
        [canWriteLibrary, notify]
    );

    const exportMembersCSV =
        useCallback(() => {
            if (!libraryMembers.length) {
                notify(
                    "No members available to export",
                    "warning"
                );
                return;
            }

            const headers = [
                "Member ID",
                "Name",
                "Role",
                "Class / Department",
                "Mobile",
                "Email",
                "Issued Books",
                "Returned Books",
                "Overdue Books",
                "Pending Fine",
                "Status",
            ];

            const rows =
                libraryMembers.map(
                    (member) => [
                        member.member_code,
                        member.name,
                        member.role,
                        member
                            .class_or_department,
                        member.mobile,
                        member.email,
                        member.active_books,
                        member.returned_books,
                        member.overdue_books,
                        member.pending_fine,
                        member.library_status,
                    ]
                );

            const escapeCSV = (value) =>
                `"${String(
                    value ?? ""
                ).replace(/"/g, '""')}"`;

            const csv = [
                headers
                    .map(escapeCSV)
                    .join(","),
                ...rows.map((row) =>
                    row
                        .map(escapeCSV)
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

            const anchor =
                document.createElement("a");

            anchor.href = url;
            anchor.download =
                "library-members.csv";

            document.body.appendChild(
                anchor
            );

            anchor.click();
            anchor.remove();

            URL.revokeObjectURL(url);
        },
            [libraryMembers, notify]
        );

    useEffect(() => {
        if (
            activeSection !== "members"
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

        loadLibraryMembers({
            page: 1,
            perPage: 10,
            filters: {
                ...INITIAL_FILTERS,
            },
        });
    }, [
        activeSection,
        loadLibraryMembers,
    ]);

    return {
        libraryMembers,
        memberDepartments,
        memberFilters,
        memberPagination,
        memberStats,
        membersLoading,

        selectedMember,
        memberModalOpen,
        memberDetails,
        memberDetailsLoading,

        loadLibraryMembers,
        loadMemberDetails,
        updateMemberFilter,
        applyMemberFilters,
        resetMemberFilters,
        changeMemberPage,

        openMemberDetails,
        closeMemberDetails,
        issueBookToMember,
        payMemberFine,
        exportMembersCSV,

        canWriteLibrary,
    };
}