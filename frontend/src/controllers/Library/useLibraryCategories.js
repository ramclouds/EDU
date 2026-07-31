import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { BASE_URL } from "../../config/appConfig";

const emptyCategoryForm = {
    id: null,
    name: "",
    description: "",
    status: "Active",
    display_order: 0,
};

const initialFilters = {
    search: "",
    status: "",
    sort_by: "display_order",
    sort_direction: "asc",
    page: 1,
    per_page: 10,
};

const emptyStats = {
    total_categories: 0,
    active_categories: 0,
    inactive_categories: 0,
    assigned_books: 0,
    uncategorized_books: 0,
};

const emptyPagination = {
    page: 1,
    per_page: 10,
    total: 0,
    pages: 1,
    has_next: false,
    has_prev: false,
};

export function useLibraryCategories({
    activeSection,
    fetchWithAuth,
    showToast,
}) {
    const [categories, setCategories] = useState([]);
    const [categoryStats, setCategoryStats] =
        useState(emptyStats);

    const [categoryPagination, setCategoryPagination] =
        useState(emptyPagination);

    const [categoryFilters, setCategoryFilters] =
        useState(initialFilters);

    const [categoryForm, setCategoryForm] =
        useState(emptyCategoryForm);

    const [categoryModalOpen, setCategoryModalOpen] =
        useState(false);

    const [categoryDeleteModal, setCategoryDeleteModal] =
        useState({
            open: false,
            category: null,
            assignedBooks: 0,
            requiresForce: false,
        });

    const [categoryLoading, setCategoryLoading] =
        useState(false);

    const [categorySaving, setCategorySaving] =
        useState(false);

    const [categoryDeleting, setCategoryDeleting] =
        useState(false);

    const [categoryStatusLoadingId, setCategoryStatusLoadingId] =
        useState(null);

    const [categoryErrors, setCategoryErrors] =
        useState({});

    const buildQueryString = useCallback((filters) => {
        const params = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (
                value !== undefined &&
                value !== null &&
                value !== ""
            ) {
                params.set(key, String(value));
            }
        });

        return params.toString();
    }, []);

    const loadCategories = useCallback(
        async (overrideFilters = {}) => {
            if (typeof fetchWithAuth !== "function") {
                return;
            }

            const nextFilters = {
                ...categoryFilters,
                ...overrideFilters,
            };

            setCategoryLoading(true);

            try {
                const queryString = buildQueryString(nextFilters);

                const response = await fetchWithAuth(
                    `${BASE_URL}/admin/library/categories?${queryString}`,
                    {
                        method: "GET",
                    },
                );

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(
                        data.error || "Failed to load categories",
                    );
                }

                setCategories(
                    Array.isArray(data.categories)
                        ? data.categories
                        : [],
                );

                setCategoryStats({
                    ...emptyStats,
                    ...(data.stats || {}),
                });

                setCategoryPagination({
                    ...emptyPagination,
                    ...(data.pagination || {}),
                });
            } catch (error) {
                setCategories([]);
                showToast?.(
                    error.message || "Failed to load categories",
                    "error",
                );
            } finally {
                setCategoryLoading(false);
            }
        },
        [
            buildQueryString,
            categoryFilters,
            fetchWithAuth,
            showToast,
        ],
    );

    useEffect(() => {
        if (activeSection !== "categories") {
            return;
        }

        const timer = window.setTimeout(() => {
            loadCategories();
        }, categoryFilters.search ? 350 : 0);

        return () => window.clearTimeout(timer);
    }, [
        activeSection,
        categoryFilters.page,
        categoryFilters.per_page,
        categoryFilters.search,
        categoryFilters.sort_by,
        categoryFilters.sort_direction,
        categoryFilters.status,
    ]);

    const updateCategoryFilter = useCallback(
        (name, value) => {
            setCategoryFilters((current) => ({
                ...current,
                [name]: value,
                page:
                    name === "page"
                        ? Number(value)
                        : 1,
            }));
        },
        [],
    );

    const resetCategoryFilters = useCallback(() => {
        setCategoryFilters(initialFilters);
    }, []);

    const updateCategoryForm = useCallback(
        (name, value) => {
            setCategoryForm((current) => ({
                ...current,
                [name]: value,
            }));

            setCategoryErrors((current) => ({
                ...current,
                [name]: undefined,
            }));
        },
        [],
    );

    const openCreateCategoryModal = useCallback(() => {
        setCategoryForm(emptyCategoryForm);
        setCategoryErrors({});
        setCategoryModalOpen(true);
    }, []);

    const openEditCategoryModal = useCallback((category) => {
        setCategoryForm({
            id: category.id,
            name: category.name || "",
            description: category.description || "",
            status: category.status || "Active",
            display_order: Number(
                category.display_order || 0,
            ),
        });

        setCategoryErrors({});
        setCategoryModalOpen(true);
    }, []);

    const closeCategoryModal = useCallback(() => {
        if (categorySaving) {
            return;
        }

        setCategoryModalOpen(false);
        setCategoryForm(emptyCategoryForm);
        setCategoryErrors({});
    }, [categorySaving]);

    const validateCategoryForm = useCallback(() => {
        const errors = {};
        const name = categoryForm.name.trim();

        if (!name) {
            errors.name = "Category name is required";
        } else if (name.length < 2) {
            errors.name =
                "Category name must contain at least 2 characters";
        } else if (name.length > 100) {
            errors.name =
                "Category name cannot exceed 100 characters";
        }

        if (
            categoryForm.description &&
            categoryForm.description.length > 1000
        ) {
            errors.description =
                "Description cannot exceed 1000 characters";
        }

        const order = Number(categoryForm.display_order);

        if (!Number.isInteger(order) || order < 0) {
            errors.display_order =
                "Display order must be zero or greater";
        }

        setCategoryErrors(errors);

        return Object.keys(errors).length === 0;
    }, [categoryForm]);

    const saveCategory = useCallback(
        async (event) => {
            event?.preventDefault();

            if (!validateCategoryForm()) {
                return;
            }

            setCategorySaving(true);

            try {
                const editing = Boolean(categoryForm.id);

                const endpoint = editing
                    ? `${BASE_URL}/admin/library/categories/${categoryForm.id}`
                    : `${BASE_URL}/admin/library/categories`;

                const response = await fetchWithAuth(endpoint, {
                    method: editing ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: categoryForm.name.trim(),
                        description:
                            categoryForm.description.trim(),
                        status: categoryForm.status,
                        display_order: Number(
                            categoryForm.display_order || 0,
                        ),
                    }),
                });

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    if (data.errors) {
                        setCategoryErrors(data.errors);
                    }

                    throw new Error(
                        data.error || "Failed to save category",
                    );
                }

                showToast?.(
                    data.message ||
                    `Category ${editing ? "updated" : "created"
                    } successfully`,
                    "success",
                );

                setCategoryModalOpen(false);
                setCategoryForm(emptyCategoryForm);
                setCategoryErrors({});

                await loadCategories();
            } catch (error) {
                showToast?.(
                    error.message || "Failed to save category",
                    "error",
                );
            } finally {
                setCategorySaving(false);
            }
        },
        [
            categoryForm,
            fetchWithAuth,
            loadCategories,
            showToast,
            validateCategoryForm,
        ],
    );

    const toggleCategoryStatus = useCallback(
        async (category) => {
            const nextStatus =
                category.status === "Active"
                    ? "Inactive"
                    : "Active";

            setCategoryStatusLoadingId(category.id);

            try {
                const response = await fetchWithAuth(
                    `${BASE_URL}/admin/library/categories/${category.id}/status`,
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            status: nextStatus,
                        }),
                    },
                );

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                        "Failed to update category status",
                    );
                }

                showToast?.(
                    data.message ||
                    `Category marked as ${nextStatus}`,
                    "success",
                );

                await loadCategories();
            } catch (error) {
                showToast?.(
                    error.message ||
                    "Failed to update category status",
                    "error",
                );
            } finally {
                setCategoryStatusLoadingId(null);
            }
        },
        [fetchWithAuth, loadCategories, showToast],
    );

    const requestDeleteCategory = useCallback((category) => {
        setCategoryDeleteModal({
            open: true,
            category,
            assignedBooks: Number(
                category.total_books || 0,
            ),
            requiresForce:
                Number(category.total_books || 0) > 0,
        });
    }, []);

    const closeDeleteCategoryModal = useCallback(() => {
        if (categoryDeleting) {
            return;
        }

        setCategoryDeleteModal({
            open: false,
            category: null,
            assignedBooks: 0,
            requiresForce: false,
        });
    }, [categoryDeleting]);

    const deleteCategory = useCallback(
        async (force = false) => {
            const category = categoryDeleteModal.category;

            if (!category) {
                return;
            }

            setCategoryDeleting(true);

            try {
                const response = await fetchWithAuth(
                    `${BASE_URL}/admin/library/categories/${category.id}?force=${force ? "true" : "false"
                    }`,
                    {
                        method: "DELETE",
                    },
                );

                const data = await response.json().catch(() => ({}));

                if (
                    response.status === 409 &&
                    data.requires_force
                ) {
                    setCategoryDeleteModal((current) => ({
                        ...current,
                        assignedBooks: Number(
                            data.assigned_books || 0,
                        ),
                        requiresForce: true,
                    }));

                    throw new Error(data.error);
                }

                if (!response.ok) {
                    throw new Error(
                        data.error || "Failed to delete category",
                    );
                }

                showToast?.(
                    data.message ||
                    "Category deleted successfully",
                    "success",
                );

                setCategoryDeleteModal({
                    open: false,
                    category: null,
                    assignedBooks: 0,
                    requiresForce: false,
                });

                const isLastRow =
                    categories.length === 1 &&
                    categoryPagination.page > 1;

                if (isLastRow) {
                    setCategoryFilters((current) => ({
                        ...current,
                        page: current.page - 1,
                    }));
                } else {
                    await loadCategories();
                }
            } catch (error) {
                showToast?.(
                    error.message || "Failed to delete category",
                    "error",
                );
            } finally {
                setCategoryDeleting(false);
            }
        },
        [
            categories.length,
            categoryDeleteModal.category,
            categoryPagination.page,
            fetchWithAuth,
            loadCategories,
            showToast,
        ],
    );

    const categoryPageNumbers = useMemo(() => {
        const pages = categoryPagination.pages || 1;
        const current = categoryPagination.page || 1;

        const start = Math.max(1, current - 2);
        const end = Math.min(pages, current + 2);

        return Array.from(
            { length: end - start + 1 },
            (_, index) => start + index,
        );
    }, [
        categoryPagination.page,
        categoryPagination.pages,
    ]);

    return {
        categories,
        categoryStats,
        categoryPagination,
        categoryFilters,
        categoryForm,
        categoryModalOpen,
        categoryDeleteModal,
        categoryLoading,
        categorySaving,
        categoryDeleting,
        categoryStatusLoadingId,
        categoryErrors,
        categoryPageNumbers,

        loadCategories,
        updateCategoryFilter,
        resetCategoryFilters,
        updateCategoryForm,
        openCreateCategoryModal,
        openEditCategoryModal,
        closeCategoryModal,
        saveCategory,
        toggleCategoryStatus,
        requestDeleteCategory,
        closeDeleteCategoryModal,
        deleteCategory,
    };
}