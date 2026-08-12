import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    BASE_URL,
} from "../../config/appConfig";

const EMPTY_FILTERS = {
    search: "",
    type: "",
    status: "",
    channel: "",
    role: "",
};

const EMPTY_STATS = {
    total: 0,
    sent: 0,
    pending: 0,
    failed: 0,
};

const EMPTY_PAGINATION = {
    page: 1,
    per_page: 10,
    total: 0,
    pages: 1,
    has_prev: false,
    has_next: false,
};

const EMPTY_FORM = {
    user_id: "",

    role: "student",

    recipient_name: "",
    recipient_code: "",
    recipient_email: "",
    recipient_mobile: "",

    title: "",
    message: "",

    type: "general",
    channel: "App",

    scheduled_at: "",

    book_issue_id: "",
    book_id: "",
    student_id: "",
    teacher_id: "",
    staff_id: "",
};

export function useLibraryNotifications({
    activeSection,
    fetchWithAuth,
    showToast,
}) {
    const fetchRef =
        useRef(fetchWithAuth);

    const toastRef =
        useRef(showToast);

    const loadingRef =
        useRef(false);

    const loadedRef =
        useRef(false);

    const [
        libraryNotifications,
        setLibraryNotifications,
    ] = useState([]);

    const [
        libraryNotificationStats,
        setLibraryNotificationStats,
    ] = useState({
        ...EMPTY_STATS,
    });

    const [
        libraryNotificationFilters,
        setLibraryNotificationFilters,
    ] = useState({
        ...EMPTY_FILTERS,
    });

    const [
        libraryNotificationPagination,
        setLibraryNotificationPagination,
    ] = useState({
        ...EMPTY_PAGINATION,
    });

    const [
        libraryNotificationsLoading,
        setLibraryNotificationsLoading,
    ] = useState(false);

    const [
        notificationModalOpen,
        setNotificationModalOpen,
    ] = useState(false);

    const [
        notificationForm,
        setNotificationForm,
    ] = useState({
        ...EMPTY_FORM,
    });

    const [
        notificationFormErrors,
        setNotificationFormErrors,
    ] = useState({});

    const [
        notificationSaving,
        setNotificationSaving,
    ] = useState(false);

    const [
        selectedLibraryNotification,
        setSelectedLibraryNotification,
    ] = useState(null);

    const [
        notificationDetailsOpen,
        setNotificationDetailsOpen,
    ] = useState(false);

    const [
        notificationRetryingId,
        setNotificationRetryingId,
    ] = useState(null);

    useEffect(() => {
        fetchRef.current =
            fetchWithAuth;
    }, [fetchWithAuth]);

    useEffect(() => {
        toastRef.current =
            showToast;
    }, [showToast]);

    const notify = useCallback(
        (
            message,
            type = "info"
        ) => {
            toastRef.current?.(
                message,
                type
            );
        },
        []
    );

    const request = useCallback(
        async (
            url,
            options = {}
        ) => {
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
                const error =
                    new Error(
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

    const loadLibraryNotifications =
        useCallback(
            async ({
                page = 1,
                perPage = 10,
                filters = EMPTY_FILTERS,
                silent = false,
            } = {}) => {
                if (
                    loadingRef.current
                ) {
                    return;
                }

                loadingRef.current =
                    true;

                setLibraryNotificationsLoading(
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

                    Object.entries(
                        filters
                    ).forEach(
                        ([
                            key,
                            value,
                        ]) => {
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
                            `${BASE_URL}/admin/library/notifications?${params.toString()}`
                        );

                    setLibraryNotifications(
                        Array.isArray(
                            data.notifications
                        )
                            ? data.notifications
                            : []
                    );

                    setLibraryNotificationStats({
                        ...EMPTY_STATS,
                        ...(data.stats ||
                            {}),
                    });

                    setLibraryNotificationPagination({
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
                        "Library notifications error:",
                        error
                    );

                    if (!silent) {
                        notify(
                            error.message ||
                            "Failed to load notifications",
                            "error"
                        );
                    }

                } finally {
                    loadingRef.current =
                        false;

                    setLibraryNotificationsLoading(
                        false
                    );
                }
            },
            [
                notify,
                request,
            ]
        );

    const updateNotificationFilter =
        useCallback(
            (
                name,
                value
            ) => {
                setLibraryNotificationFilters(
                    (current) => ({
                        ...current,
                        [name]:
                            value,
                    })
                );
            },
            []
        );

    const applyNotificationFilters =
        useCallback(() => {
            loadLibraryNotifications({
                page: 1,

                perPage:
                    libraryNotificationPagination
                        .per_page,

                filters:
                    libraryNotificationFilters,
            });
        }, [
            libraryNotificationFilters,
            libraryNotificationPagination
                .per_page,
            loadLibraryNotifications,
        ]);

    const resetNotificationFilters =
        useCallback(() => {
            const filters = {
                ...EMPTY_FILTERS,
            };

            setLibraryNotificationFilters(
                filters
            );

            loadLibraryNotifications({
                page: 1,

                perPage:
                    libraryNotificationPagination
                        .per_page,

                filters,
            });
        }, [
            libraryNotificationPagination
                .per_page,
            loadLibraryNotifications,
        ]);

    const changeNotificationPage =
        useCallback(
            (page) => {
                if (
                    page < 1 ||
                    page >
                    libraryNotificationPagination
                        .pages
                ) {
                    return;
                }

                loadLibraryNotifications({
                    page,

                    perPage:
                        libraryNotificationPagination
                            .per_page,

                    filters:
                        libraryNotificationFilters,
                });
            },
            [
                libraryNotificationFilters,
                libraryNotificationPagination
                    .pages,
                libraryNotificationPagination
                    .per_page,
                loadLibraryNotifications,
            ]
        );

    const openNotificationModal =
        useCallback(() => {
            setNotificationForm({
                ...EMPTY_FORM,
            });

            setNotificationFormErrors(
                {}
            );

            setNotificationModalOpen(
                true
            );
        }, []);

    const closeNotificationModal =
        useCallback(() => {
            if (notificationSaving) {
                return;
            }

            setNotificationModalOpen(
                false
            );
        }, [
            notificationSaving,
        ]);

    const updateNotificationForm =
        useCallback(
            (
                name,
                value
            ) => {
                setNotificationForm(
                    (current) => ({
                        ...current,
                        [name]:
                            value,
                    })
                );

                setNotificationFormErrors(
                    (current) => {
                        if (!current[name]) {
                            return current;
                        }

                        const updated = {
                            ...current,
                        };

                        delete updated[
                            name
                        ];

                        return updated;
                    }
                );
            },
            []
        );

    const saveNotification =
        useCallback(
            async (event) => {
                event?.preventDefault();

                if (
                    notificationSaving
                ) {
                    return;
                }

                const errors = {};

                if (
                    !notificationForm
                        .title
                        .trim()
                ) {
                    errors.title =
                        "Title is required";
                }

                if (
                    !notificationForm
                        .message
                        .trim()
                ) {
                    errors.message =
                        "Message is required";
                }

                if (
                    !notificationForm
                        .role
                ) {
                    errors.role =
                        "Select recipient type";
                }

                if (
                    Object.keys(
                        errors
                    ).length
                ) {
                    setNotificationFormErrors(
                        errors
                    );

                    return;
                }

                setNotificationSaving(
                    true
                );

                try {
                    const payload = {
                        ...notificationForm,

                        user_id:
                            notificationForm
                                .user_id
                                ? Number(
                                    notificationForm
                                        .user_id
                                )
                                : null,

                        book_issue_id:
                            notificationForm
                                .book_issue_id
                                ? Number(
                                    notificationForm
                                        .book_issue_id
                                )
                                : null,

                        book_id:
                            notificationForm
                                .book_id
                                ? Number(
                                    notificationForm
                                        .book_id
                                )
                                : null,

                        student_id:
                            notificationForm
                                .student_id
                                ? Number(
                                    notificationForm
                                        .student_id
                                )
                                : null,

                        teacher_id:
                            notificationForm
                                .teacher_id
                                ? Number(
                                    notificationForm
                                        .teacher_id
                                )
                                : null,

                        staff_id:
                            notificationForm
                                .staff_id
                                ? Number(
                                    notificationForm
                                        .staff_id
                                )
                                : null,

                        scheduled_at:
                            notificationForm
                                .scheduled_at ||
                            null,
                    };

                    const data =
                        await request(
                            `${BASE_URL}/admin/library/notifications`,
                            {
                                method:
                                    "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json",
                                },

                                body:
                                    JSON.stringify(
                                        payload
                                    ),
                            }
                        );

                    notify(
                        data.message ||
                        "Notification created successfully",
                        "success"
                    );

                    setNotificationModalOpen(
                        false
                    );

                    await loadLibraryNotifications({
                        page: 1,

                        perPage:
                            libraryNotificationPagination
                                .per_page,

                        filters:
                            libraryNotificationFilters,

                        silent: true,
                    });

                } catch (error) {
                    if (
                        error.data
                            ?.errors
                    ) {
                        setNotificationFormErrors(
                            error.data.errors
                        );
                    }

                    notify(
                        error.message ||
                        "Failed to create notification",
                        "error"
                    );

                } finally {
                    setNotificationSaving(
                        false
                    );
                }
            },
            [
                libraryNotificationFilters,
                libraryNotificationPagination
                    .per_page,
                loadLibraryNotifications,
                notificationForm,
                notificationSaving,
                notify,
                request,
            ]
        );

    const openNotificationDetails =
        useCallback(
            (
                notification
            ) => {
                setSelectedLibraryNotification(
                    notification
                );

                setNotificationDetailsOpen(
                    true
                );
            },
            []
        );

    const closeNotificationDetails =
        useCallback(() => {
            setSelectedLibraryNotification(
                null
            );

            setNotificationDetailsOpen(
                false
            );
        }, []);

    const retryNotification =
        useCallback(
            async (
                notification
            ) => {
                if (
                    !notification?.id
                ) {
                    return;
                }

                setNotificationRetryingId(
                    notification.id
                );

                try {
                    const data =
                        await request(
                            `${BASE_URL}/admin/library/notifications/${notification.id}/retry`,
                            {
                                method:
                                    "POST",
                            }
                        );

                    notify(
                        data.message ||
                        "Notification retry queued",
                        "success"
                    );

                    await loadLibraryNotifications({
                        page:
                            libraryNotificationPagination
                                .page,

                        perPage:
                            libraryNotificationPagination
                                .per_page,

                        filters:
                            libraryNotificationFilters,

                        silent: true,
                    });

                } catch (error) {
                    notify(
                        error.message ||
                        "Failed to retry notification",
                        "error"
                    );

                } finally {
                    setNotificationRetryingId(
                        null
                    );
                }
            },
            [
                libraryNotificationFilters,
                libraryNotificationPagination
                    .page,
                libraryNotificationPagination
                    .per_page,
                loadLibraryNotifications,
                notify,
                request,
            ]
        );

    useEffect(() => {
        if (
            activeSection !==
            "notifications"
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

        loadLibraryNotifications({
            page: 1,
            perPage: 10,
            filters: {
                ...EMPTY_FILTERS,
            },
        });

    }, [
        activeSection,
        loadLibraryNotifications,
    ]);

    return {
        libraryNotifications,
        libraryNotificationStats,
        libraryNotificationFilters,
        libraryNotificationPagination,

        libraryNotificationsLoading,

        notificationModalOpen,
        notificationForm,
        notificationFormErrors,
        notificationSaving,

        selectedLibraryNotification,
        notificationDetailsOpen,

        notificationRetryingId,

        loadLibraryNotifications,

        updateNotificationFilter,
        applyNotificationFilters,
        resetNotificationFilters,
        changeNotificationPage,

        openNotificationModal,
        closeNotificationModal,

        updateNotificationForm,
        saveNotification,

        openNotificationDetails,
        closeNotificationDetails,

        retryNotification,
    };
}