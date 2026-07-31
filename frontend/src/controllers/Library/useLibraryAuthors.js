import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { BASE_URL } from "../../config/appConfig";

const emptyAuthorForm = {
    id: null,
    name: "",
    country: "",
    biography: "",
    status: "Active",
};

const initialAuthorFilters = {
    search: "",
    country: "",
    status: "",
    sort_by: "name",
    sort_direction: "asc",
    page: 1,
    per_page: 10,
};

const emptyAuthorStats = {
    total_authors: 0,
    active_authors: 0,
    inactive_authors: 0,
    assigned_books: 0,
};

const emptyAuthorPagination = {
    page: 1,
    per_page: 10,
    total: 0,
    pages: 1,
    has_next: false,
    has_prev: false,
};

export function useLibraryAuthors({
    activeSection,
    fetchWithAuth,
    showToast,
}) {
    const [authors, setAuthors] = useState([]);
    const [authorCountries, setAuthorCountries] =
        useState([]);

    const [authorStats, setAuthorStats] =
        useState(emptyAuthorStats);

    const [authorPagination, setAuthorPagination] =
        useState(emptyAuthorPagination);

    const [authorFilters, setAuthorFilters] =
        useState(initialAuthorFilters);

    const [authorForm, setAuthorForm] =
        useState(emptyAuthorForm);

    const [authorModalOpen, setAuthorModalOpen] =
        useState(false);

    const [authorDeleteModal, setAuthorDeleteModal] =
        useState({
            open: false,
            author: null,
            assignedBooks: 0,
            requiresForce: false,
        });

    const [authorLoading, setAuthorLoading] =
        useState(false);

    const [authorSaving, setAuthorSaving] =
        useState(false);

    const [authorDeleting, setAuthorDeleting] =
        useState(false);

    const [
        authorStatusLoadingId,
        setAuthorStatusLoadingId,
    ] = useState(null);

    const [authorErrors, setAuthorErrors] =
        useState({});

    const buildAuthorQueryString = useCallback(
        (filters) => {
            const params = new URLSearchParams();

            Object.entries(filters).forEach(
                ([key, value]) => {
                    if (
                        value !== undefined &&
                        value !== null &&
                        value !== ""
                    ) {
                        params.set(key, String(value));
                    }
                }
            );

            return params.toString();
        },
        []
    );

    const loadAuthors = useCallback(
        async (overrideFilters = {}) => {
            if (typeof fetchWithAuth !== "function") {
                return;
            }

            const nextFilters = {
                ...authorFilters,
                ...overrideFilters,
            };

            setAuthorLoading(true);

            try {
                const queryString =
                    buildAuthorQueryString(nextFilters);

                const response = await fetchWithAuth(
                    `${BASE_URL}/admin/library/authors?${queryString}`,
                    {
                        method: "GET",
                    }
                );

                const data = await response
                    .json()
                    .catch(() => ({}));

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                        "Failed to load authors"
                    );
                }

                setAuthors(
                    Array.isArray(data.authors)
                        ? data.authors
                        : []
                );

                setAuthorCountries(
                    Array.isArray(data.countries)
                        ? data.countries
                        : []
                );

                setAuthorStats({
                    ...emptyAuthorStats,
                    ...(data.stats || {}),
                });

                setAuthorPagination({
                    ...emptyAuthorPagination,
                    ...(data.pagination || {}),
                });
            } catch (error) {
                setAuthors([]);

                showToast?.(
                    error.message ||
                    "Failed to load authors",
                    "error"
                );
            } finally {
                setAuthorLoading(false);
            }
        },
        [
            authorFilters,
            buildAuthorQueryString,
            fetchWithAuth,
            showToast,
        ]
    );

    useEffect(() => {
        if (activeSection !== "authors") {
            return undefined;
        }

        const timer = window.setTimeout(
            () => {
                loadAuthors();
            },
            authorFilters.search ? 350 : 0
        );

        return () => window.clearTimeout(timer);
    }, [
        activeSection,
        authorFilters.search,
        authorFilters.country,
        authorFilters.status,
        authorFilters.sort_by,
        authorFilters.sort_direction,
        authorFilters.page,
        authorFilters.per_page,
    ]);

    const updateAuthorFilter = useCallback(
        (name, value) => {
            setAuthorFilters((current) => ({
                ...current,
                [name]: value,
                page:
                    name === "page"
                        ? Number(value)
                        : 1,
            }));
        },
        []
    );

    const resetAuthorFilters = useCallback(() => {
        setAuthorFilters(initialAuthorFilters);
    }, []);

    const updateAuthorForm = useCallback(
        (name, value) => {
            setAuthorForm((current) => ({
                ...current,
                [name]: value,
            }));

            setAuthorErrors((current) => ({
                ...current,
                [name]: undefined,
            }));
        },
        []
    );

    const openCreateAuthorModal = useCallback(() => {
        setAuthorForm(emptyAuthorForm);
        setAuthorErrors({});
        setAuthorModalOpen(true);
    }, []);

    const openEditAuthorModal = useCallback(
        (author) => {
            setAuthorForm({
                id: author.id,
                name: author.name || "",
                country: author.country || "",
                biography: author.biography || "",
                status: author.status || "Active",
            });

            setAuthorErrors({});
            setAuthorModalOpen(true);
        },
        []
    );

    const closeAuthorModal = useCallback(() => {
        if (authorSaving) {
            return;
        }

        setAuthorModalOpen(false);
        setAuthorForm(emptyAuthorForm);
        setAuthorErrors({});
    }, [authorSaving]);

    const validateAuthorForm = useCallback(() => {
        const errors = {};
        const name = authorForm.name.trim();

        if (!name) {
            errors.name = "Author name is required";
        } else if (name.length < 2) {
            errors.name =
                "Author name must contain at least 2 characters";
        } else if (name.length > 150) {
            errors.name =
                "Author name cannot exceed 150 characters";
        }

        if (
            authorForm.country &&
            authorForm.country.length > 100
        ) {
            errors.country =
                "Country cannot exceed 100 characters";
        }

        if (
            authorForm.biography &&
            authorForm.biography.length > 2000
        ) {
            errors.biography =
                "Biography cannot exceed 2000 characters";
        }

        setAuthorErrors(errors);

        return Object.keys(errors).length === 0;
    }, [authorForm]);

    const saveAuthor = useCallback(
        async (event) => {
            event?.preventDefault();

            if (!validateAuthorForm()) {
                return;
            }

            if (typeof fetchWithAuth !== "function") {
                showToast?.(
                    "Authentication request function is unavailable",
                    "error"
                );
                return;
            }

            setAuthorSaving(true);

            try {
                const editing = Boolean(authorForm.id);

                const endpoint = editing
                    ? `${BASE_URL}/admin/library/authors/${authorForm.id}`
                    : `${BASE_URL}/admin/library/authors`;

                const response = await fetchWithAuth(
                    endpoint,
                    {
                        method: editing
                            ? "PUT"
                            : "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body: JSON.stringify({
                            name: authorForm.name.trim(),
                            country:
                                authorForm.country.trim(),
                            biography:
                                authorForm.biography.trim(),
                            status: authorForm.status,
                        }),
                    }
                );

                const data = await response
                    .json()
                    .catch(() => ({}));

                if (!response.ok) {
                    if (data.errors) {
                        setAuthorErrors(data.errors);
                    }

                    throw new Error(
                        data.error ||
                        "Failed to save author"
                    );
                }

                showToast?.(
                    data.message ||
                    `Author ${editing
                        ? "updated"
                        : "created"
                    } successfully`,
                    "success"
                );

                setAuthorModalOpen(false);
                setAuthorForm(emptyAuthorForm);
                setAuthorErrors({});

                await loadAuthors();
            } catch (error) {
                showToast?.(
                    error.message ||
                    "Failed to save author",
                    "error"
                );
            } finally {
                setAuthorSaving(false);
            }
        },
        [
            authorForm,
            fetchWithAuth,
            loadAuthors,
            showToast,
            validateAuthorForm,
        ]
    );

    const toggleAuthorStatus = useCallback(
        async (author) => {
            const nextStatus =
                author.status === "Active"
                    ? "Inactive"
                    : "Active";

            setAuthorStatusLoadingId(author.id);

            try {
                const response = await fetchWithAuth(
                    `${BASE_URL}/admin/library/authors/${author.id}/status`,
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body: JSON.stringify({
                            status: nextStatus,
                        }),
                    }
                );

                const data = await response
                    .json()
                    .catch(() => ({}));

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                        "Failed to update author status"
                    );
                }

                showToast?.(
                    data.message ||
                    `Author marked as ${nextStatus}`,
                    "success"
                );

                await loadAuthors();
            } catch (error) {
                showToast?.(
                    error.message ||
                    "Failed to update author status",
                    "error"
                );
            } finally {
                setAuthorStatusLoadingId(null);
            }
        },
        [
            fetchWithAuth,
            loadAuthors,
            showToast,
        ]
    );

    const requestDeleteAuthor = useCallback(
        (author) => {
            setAuthorDeleteModal({
                open: true,
                author,
                assignedBooks: Number(
                    author.total_books || 0
                ),
                requiresForce:
                    Number(
                        author.total_books || 0
                    ) > 0,
            });
        },
        []
    );

    const closeDeleteAuthorModal = useCallback(() => {
        if (authorDeleting) {
            return;
        }

        setAuthorDeleteModal({
            open: false,
            author: null,
            assignedBooks: 0,
            requiresForce: false,
        });
    }, [authorDeleting]);

    const deleteAuthor = useCallback(
        async (force = false) => {
            const author = authorDeleteModal.author;

            if (!author) {
                return;
            }

            setAuthorDeleting(true);

            try {
                const response = await fetchWithAuth(
                    `${BASE_URL}/admin/library/authors/${author.id}?force=${force ? "true" : "false"
                    }`,
                    {
                        method: "DELETE",
                    }
                );

                const data = await response
                    .json()
                    .catch(() => ({}));

                if (
                    response.status === 409 &&
                    data.requires_force
                ) {
                    setAuthorDeleteModal(
                        (current) => ({
                            ...current,
                            assignedBooks: Number(
                                data.assigned_books || 0
                            ),
                            requiresForce: true,
                        })
                    );

                    throw new Error(data.error);
                }

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                        "Failed to delete author"
                    );
                }

                showToast?.(
                    data.message ||
                    "Author deleted successfully",
                    "success"
                );

                setAuthorDeleteModal({
                    open: false,
                    author: null,
                    assignedBooks: 0,
                    requiresForce: false,
                });

                const isLastRow =
                    authors.length === 1 &&
                    authorPagination.page > 1;

                if (isLastRow) {
                    setAuthorFilters(
                        (current) => ({
                            ...current,
                            page: current.page - 1,
                        })
                    );
                } else {
                    await loadAuthors();
                }
            } catch (error) {
                showToast?.(
                    error.message ||
                    "Failed to delete author",
                    "error"
                );
            } finally {
                setAuthorDeleting(false);
            }
        },
        [
            authorDeleteModal.author,
            authors.length,
            authorPagination.page,
            fetchWithAuth,
            loadAuthors,
            showToast,
        ]
    );

    const authorPageNumbers = useMemo(() => {
        const pages =
            authorPagination.pages || 1;

        const current =
            authorPagination.page || 1;

        const start = Math.max(
            1,
            current - 2
        );

        const end = Math.min(
            pages,
            current + 2
        );

        return Array.from(
            {
                length:
                    end - start + 1,
            },
            (_, index) => start + index
        );
    }, [
        authorPagination.page,
        authorPagination.pages,
    ]);

    return {
        authors,
        authorCountries,
        authorStats,
        authorPagination,
        authorFilters,
        authorForm,
        authorModalOpen,
        authorDeleteModal,
        authorLoading,
        authorSaving,
        authorDeleting,
        authorStatusLoadingId,
        authorErrors,
        authorPageNumbers,

        loadAuthors,
        updateAuthorFilter,
        resetAuthorFilters,
        updateAuthorForm,
        openCreateAuthorModal,
        openEditAuthorModal,
        closeAuthorModal,
        saveAuthor,
        toggleAuthorStatus,
        requestDeleteAuthor,
        closeDeleteAuthorModal,
        deleteAuthor,
    };
}