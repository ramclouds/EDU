import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { BASE_URL } from "../../config/appConfig";

const EMPTY_BOOK_FORM = {
    title: "",
    author_id: "",
    category_id: "",
    isbn: "",
    total_copies: "1",
    available_copies: "1",
    shelf_no: "",
    publisher: "",
    published_year: "",
    language: "English",
    description: "",
};

const INITIAL_REQUEST_STATE = {
    options: false,
    books: false,
};

const INITIAL_BOOK_FILTERS = {
    search: "",
    category_id: "",
    author_id: "",
    status: "",
};

const INITIAL_BOOK_PAGINATION = {
    page: 1,
    per_page: 10,
    total: 0,
    pages: 1,
    has_next: false,
    has_prev: false,
};

const INITIAL_BOOK_STATS = {
    total_books: 0,
    available_books: 0,
    unavailable_books: 0,
    inactive_books: 0,
    total_copies: 0,
    available_copies: 0,
};

export function useAddLibraryBook({
    activeSection,
    fetchWithAuth,
    showToast,
    setActiveSection,
}) {
    const [bookForm, setBookForm] = useState({
        ...EMPTY_BOOK_FORM,
    });

    const [bookAuthors, setBookAuthors] = useState([]);
    const [bookCategories, setBookCategories] = useState([]);
    const [recentBooks, setRecentBooks] = useState([]);
    const [bookFormErrors, setBookFormErrors] = useState({});

    const [bookOptionsLoading, setBookOptionsLoading] = useState(false);
    const [recentBooksLoading, setRecentBooksLoading] = useState(false);
    const [bookSaving, setBookSaving] = useState(false);
    const [editingBookId, setEditingBookId] = useState(null);

    // Keep changing function props inside refs to avoid re-triggering effects
    const fetchWithAuthRef = useRef(fetchWithAuth);
    const showToastRef = useRef(showToast);

    useEffect(() => {
        fetchWithAuthRef.current = fetchWithAuth;
    }, [fetchWithAuth]);

    useEffect(() => {
        showToastRef.current = showToast;
    }, [showToast]);

    // Prevent duplicate concurrent requests
    const requestInProgressRef = useRef({
        ...INITIAL_REQUEST_STATE,
    });

    // Section visibility tracking refs
    const sectionLoadedRef = useRef(false);
    const allBooksSectionLoadedRef = useRef(false);
    const allBooksRequestRef = useRef(false);

    // Cancel active/older requests on unmount or retry
    const optionsAbortControllerRef = useRef(null);
    const booksAbortControllerRef = useRef(null);

    const notify = useCallback((message, type = "info") => {
        if (typeof showToastRef.current === "function") {
            showToastRef.current(message, type);
        }
    }, []);

    const request = useCallback(
        async (url, options = {}) => {
            const authenticatedFetch = fetchWithAuthRef.current;

            if (typeof authenticatedFetch !== "function") {
                throw new Error("Authenticated fetch function is unavailable");
            }

            const response = await authenticatedFetch(url, options);

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
                    `Request failed with status ${response.status}`
                );

                error.status = response.status;
                error.data = data;

                throw error;
            }

            return data;
        },
        []
    );

    const updateBookForm = useCallback((name, value) => {
        setBookForm((current) => {
            const updated = {
                ...current,
                [name]: value,
            };

            // Keep available copies synchronized with total copies unless overridden
            if (name === "total_copies") {
                const previousTotal = Number(current.total_copies);
                const previousAvailable = Number(current.available_copies);
                const newTotal = Number(value);

                const availableWasFollowingTotal =
                    current.available_copies === "" ||
                    previousAvailable === previousTotal;

                if (availableWasFollowingTotal) {
                    updated.available_copies =
                        Number.isFinite(newTotal) && newTotal >= 0
                            ? String(newTotal)
                            : value;
                } else if (
                    Number.isFinite(newTotal) &&
                    previousAvailable > newTotal
                ) {
                    updated.available_copies = String(newTotal);
                }
            }

            return updated;
        });

        setBookFormErrors((current) => {
            if (!current[name]) {
                return current;
            }

            const updatedErrors = { ...current };
            delete updatedErrors[name];
            return updatedErrors;
        });
    }, []);

    const loadBookOptions = useCallback(
        async ({ silent = false, force = false } = {}) => {
            if (requestInProgressRef.current.options && !force) {
                return;
            }

            if (force && optionsAbortControllerRef.current) {
                optionsAbortControllerRef.current.abort();
            }

            const controller = new AbortController();
            optionsAbortControllerRef.current = controller;
            requestInProgressRef.current.options = true;

            setBookOptionsLoading(true);

            try {
                const data = await request(
                    `${BASE_URL}/admin/library/books/options`,
                    {
                        method: "GET",
                        signal: controller.signal,
                    }
                );

                if (controller.signal.aborted) {
                    return;
                }

                setBookAuthors(Array.isArray(data.authors) ? data.authors : []);
                setBookCategories(Array.isArray(data.categories) ? data.categories : []);
            } catch (error) {
                if (error?.name === "AbortError" || controller.signal.aborted) {
                    return;
                }

                setBookAuthors([]);
                setBookCategories([]);

                if (!silent) {
                    notify(
                        error.message || "Failed to load authors and categories",
                        "error"
                    );
                }
            } finally {
                if (optionsAbortControllerRef.current === controller) {
                    optionsAbortControllerRef.current = null;
                    requestInProgressRef.current.options = false;
                    setBookOptionsLoading(false);
                }
            }
        },
        [notify, request]
    );

    const loadRecentBooks = useCallback(
        async ({ silent = false, force = false } = {}) => {
            if (requestInProgressRef.current.books && !force) {
                return;
            }

            if (force && booksAbortControllerRef.current) {
                booksAbortControllerRef.current.abort();
            }

            const controller = new AbortController();
            booksAbortControllerRef.current = controller;
            requestInProgressRef.current.books = true;

            setRecentBooksLoading(true);

            try {
                const data = await request(
                    `${BASE_URL}/admin/library/books?limit=10`,
                    {
                        method: "GET",
                        signal: controller.signal,
                    }
                );

                if (controller.signal.aborted) {
                    return;
                }

                setRecentBooks(Array.isArray(data.books) ? data.books : []);
            } catch (error) {
                if (error?.name === "AbortError" || controller.signal.aborted) {
                    return;
                }

                setRecentBooks([]);

                if (!silent) {
                    notify(error.message || "Failed to load recent books", "error");
                }
            } finally {
                if (booksAbortControllerRef.current === controller) {
                    booksAbortControllerRef.current = null;
                    requestInProgressRef.current.books = false;
                    setRecentBooksLoading(false);
                }
            }
        },
        [notify, request]
    );

    const initializeAddBookSection = useCallback(async () => {
        if (sectionLoadedRef.current) {
            return;
        }

        sectionLoadedRef.current = true;

        await Promise.all([
            loadBookOptions({ silent: false }),
            loadRecentBooks({ silent: false }),
        ]);
    }, [loadBookOptions, loadRecentBooks]);

    useEffect(() => {
        if (activeSection !== "add-book") {
            sectionLoadedRef.current = false;
            return;
        }

        initializeAddBookSection();
    }, [activeSection, initializeAddBookSection]);

    useEffect(() => {
        return () => {
            optionsAbortControllerRef.current?.abort();
            booksAbortControllerRef.current?.abort();

            requestInProgressRef.current = { ...INITIAL_REQUEST_STATE };
            allBooksRequestRef.current = false;
            allBooksSectionLoadedRef.current = false;
        };
    }, []);

    const validateBookForm = useCallback(() => {
        const errors = {};

        const title = String(bookForm.title || "").trim();
        const shelfNo = String(bookForm.shelf_no || "").trim();
        const totalCopies = Number(bookForm.total_copies);
        const availableCopies = Number(bookForm.available_copies);

        if (!title) {
            errors.title = "Book title is required";
        } else if (title.length < 2) {
            errors.title = "Book title must contain at least 2 characters";
        } else if (title.length > 255) {
            errors.title = "Book title cannot exceed 255 characters";
        }

        if (!bookForm.author_id) {
            errors.author_id = "Please select an author";
        }

        if (!bookForm.category_id) {
            errors.category_id = "Please select a category";
        }

        if (!Number.isInteger(totalCopies) || totalCopies < 1) {
            errors.total_copies = "Total copies must be at least 1";
        }

        if (!Number.isInteger(availableCopies) || availableCopies < 0) {
            errors.available_copies = "Available copies cannot be negative";
        } else if (
            Number.isInteger(totalCopies) &&
            availableCopies > totalCopies
        ) {
            errors.available_copies = "Available copies cannot exceed total copies";
        }

        if (!shelfNo) {
            errors.shelf_no = "Shelf or rack number is required";
        } else if (shelfNo.length > 50) {
            errors.shelf_no = "Shelf number cannot exceed 50 characters";
        }

        if (bookForm.published_year) {
            const publishedYear = Number(bookForm.published_year);
            const maximumYear = new Date().getFullYear() + 1;

            if (
                !Number.isInteger(publishedYear) ||
                publishedYear < 1000 ||
                publishedYear > maximumYear
            ) {
                errors.published_year = "Enter a valid published year";
            }
        }

        if (String(bookForm.publisher || "").trim().length > 150) {
            errors.publisher = "Publisher cannot exceed 150 characters";
        }

        if (String(bookForm.language || "").trim().length > 50) {
            errors.language = "Language cannot exceed 50 characters";
        }

        if (String(bookForm.description || "").trim().length > 3000) {
            errors.description = "Description cannot exceed 3000 characters";
        }

        setBookFormErrors(errors);
        return Object.keys(errors).length === 0;
    }, [bookForm]);

    const [bookRows, setBookRows] = useState([]);
    const [bookStats, setBookStats] = useState({ ...INITIAL_BOOK_STATS });
    const [bookFilters, setBookFilters] = useState({ ...INITIAL_BOOK_FILTERS });
    const [bookPagination, setBookPagination] = useState({
        ...INITIAL_BOOK_PAGINATION,
    });
    const [booksLoading, setBooksLoading] = useState(false);
    const [deletingBookId, setDeletingBookId] = useState(null);
    const [selectedBook, setSelectedBook] = useState(null);
    const [bookDetailsModalOpen, setBookDetailsModalOpen] = useState(false);

    const loadBooks = useCallback(
        async ({
            page = 1,
            perPage = 10,
            filters = {},
            force = false,
            silent = false,
        } = {}) => {
            if (allBooksRequestRef.current && !force) {
                return;
            }

            allBooksRequestRef.current = true;
            setBooksLoading(true);

            try {
                const params = new URLSearchParams();
                params.set("page", String(page));
                params.set("per_page", String(perPage));

                const search = String(filters.search || "").trim();
                if (search) {
                    params.set("search", search);
                }

                if (filters.category_id) {
                    params.set("category_id", String(filters.category_id));
                }

                if (filters.author_id) {
                    params.set("author_id", String(filters.author_id));
                }

                if (filters.status) {
                    params.set("status", String(filters.status));
                }

                const data = await request(
                    `${BASE_URL}/admin/library/books?${params.toString()}`,
                    { method: "GET" }
                );

                setBookRows(Array.isArray(data.books) ? data.books : []);
                setBookStats({
                    total_books: Number(data.stats?.total_books) || 0,
                    available_books: Number(data.stats?.available_books) || 0,
                    unavailable_books: Number(data.stats?.unavailable_books) || 0,
                    inactive_books: Number(data.stats?.inactive_books) || 0,
                    total_copies: Number(data.stats?.total_copies) || 0,
                    available_copies: Number(data.stats?.available_copies) || 0,
                });

                const total = Number(data.pagination?.total) || 0;
                const pages = Math.max(Number(data.pagination?.pages) || 1, 1);
                const currentPage = Number(data.pagination?.page) || page;
                const currentPerPage = Number(data.pagination?.per_page) || perPage;

                setBookPagination({
                    page: currentPage,
                    per_page: currentPerPage,
                    total,
                    pages,
                    has_next:
                        data.pagination?.has_next !== undefined
                            ? Boolean(data.pagination.has_next)
                            : currentPage < pages,
                    has_prev:
                        data.pagination?.has_prev !== undefined
                            ? Boolean(data.pagination.has_prev)
                            : currentPage > 1,
                });
            } catch (error) {
                console.error("Load books error:", error);
                setBookRows([]);
                setBookStats({ ...INITIAL_BOOK_STATS });

                if (!silent) {
                    notify(error.message || "Failed to load books", "error");
                }
            } finally {
                allBooksRequestRef.current = false;
                setBooksLoading(false);
            }
        },
        [notify, request]
    );

    const saveBook = useCallback(
        async (event) => {
            event?.preventDefault();

            if (bookSaving) {
                return;
            }

            const isValid = validateBookForm();
            if (!isValid) {
                notify("Please correct the highlighted fields", "error");
                return;
            }

            const title = String(bookForm.title || "").trim();
            const authorId = Number(bookForm.author_id);
            const categoryId = Number(bookForm.category_id);
            const totalCopies = Number(bookForm.total_copies);
            const availableCopies = Number(bookForm.available_copies);
            const publishedYear = bookForm.published_year
                ? Number(bookForm.published_year)
                : null;

            const payload = {
                title,
                author_id: authorId,
                category_id: categoryId,
                isbn: String(bookForm.isbn || "").trim() || null,
                total_copies: totalCopies,
                available_copies: availableCopies,
                shelf_no: String(bookForm.shelf_no || "").trim() || null,
                publisher: String(bookForm.publisher || "").trim() || null,
                published_year: publishedYear,
                language: String(bookForm.language || "").trim() || "English",
                description: String(bookForm.description || "").trim() || null,
                status: "Available",
            };

            setBookSaving(true);
            setBookFormErrors({});

            try {
                const isEditing =
                    Number.isInteger(Number(editingBookId)) &&
                    Number(editingBookId) > 0;

                const requestUrl = isEditing
                    ? `${BASE_URL}/admin/library/books/${editingBookId}`
                    : `${BASE_URL}/admin/library/books`;

                const response = await fetchWithAuthRef.current(requestUrl, {
                    method: isEditing ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                });

                let data = {};
                try {
                    data = await response.json();
                } catch {
                    data = {};
                }

                if (!response.ok) {
                    if (data.errors && typeof data.errors === "object") {
                        setBookFormErrors(data.errors);
                    }

                    const validationMessages = data.errors
                        ? Object.values(data.errors).join(", ")
                        : "";

                    throw new Error(
                        validationMessages ||
                        data.message ||
                        data.error ||
                        `Failed to save book (${response.status})`
                    );
                }

                notify(
                    data.message ||
                    (editingBookId
                        ? "Book updated successfully"
                        : "Book added successfully"),
                    "success"
                );

                setBookForm({ ...EMPTY_BOOK_FORM });
                setEditingBookId(null);
                setBookFormErrors({});

                await Promise.all([
                    loadRecentBooks({ force: true, silent: true }),
                    loadBooks({
                        page: bookPagination.page,
                        perPage: bookPagination.per_page,
                        filters: bookFilters,
                        force: true,
                        silent: true,
                    }),
                ]);
            } catch (error) {
                console.error("Save book error:", error);
                notify(error.message || "Failed to save book", "error");
            } finally {
                setBookSaving(false);
            }
        },
        [
            bookFilters,
            bookForm,
            bookPagination.page,
            bookPagination.per_page,
            bookSaving,
            editingBookId,
            loadBooks,
            loadRecentBooks,
            notify,
            validateBookForm,
        ]
    );

    const resetBookForm = useCallback(() => {
        if (bookSaving) {
            return;
        }

        setBookForm({ ...EMPTY_BOOK_FORM });
        setEditingBookId(null);
        setBookFormErrors({});
    }, [bookSaving]);

    const refreshAddBookSection = useCallback(async () => {
        if (
            requestInProgressRef.current.options ||
            requestInProgressRef.current.books
        ) {
            return;
        }

        await Promise.all([
            loadBookOptions({ force: true, silent: false }),
            loadRecentBooks({ force: true, silent: false }),
        ]);
    }, [loadBookOptions, loadRecentBooks]);

    const hasBookOptions = useMemo(
        () => bookAuthors.length > 0 && bookCategories.length > 0,
        [bookAuthors.length, bookCategories.length]
    );

    const updateBookFilter = useCallback((field, value) => {
        setBookFilters((previous) => ({
            ...previous,
            [field]: value,
        }));
    }, []);

    const applyBookFilters = useCallback(() => {
        loadBooks({
            page: 1,
            perPage: bookPagination.per_page,
            filters: bookFilters,
            force: true,
        });
    }, [bookFilters, bookPagination.per_page, loadBooks]);

    const resetBookFilters = useCallback(() => {
        const clearedFilters = { ...INITIAL_BOOK_FILTERS };
        setBookFilters(clearedFilters);

        loadBooks({
            page: 1,
            perPage: bookPagination.per_page,
            filters: clearedFilters,
            force: true,
        });
    }, [bookPagination.per_page, loadBooks]);

    const changeBookPage = useCallback(
        (page) => {
            if (page < 1 || page > bookPagination.pages) {
                return;
            }

            loadBooks({
                page,
                perPage: bookPagination.per_page,
                filters: bookFilters,
                force: true,
            });
        },
        [bookFilters, bookPagination.pages, bookPagination.per_page, loadBooks]
    );

    const changeBookPageSize = useCallback(
        (perPage) => {
            loadBooks({
                page: 1,
                perPage,
                filters: bookFilters,
                force: true,
            });
        },
        [bookFilters, loadBooks]
    );

    const openBookDetails = useCallback((book) => {
        setSelectedBook(book);
        setBookDetailsModalOpen(true);
    }, []);

    const closeBookDetails = useCallback(() => {
        setBookDetailsModalOpen(false);
        setSelectedBook(null);
    }, []);

    const deleteBook = useCallback(
        async (book) => {
            if (!book?.id) {
                notify("Invalid book selected", "error");
                return;
            }

            const confirmed = window.confirm(
                `Are you sure you want to delete "${book.title}"?`
            );

            if (!confirmed) {
                return;
            }

            setDeletingBookId(book.id);

            try {
                const data = await request(
                    `${BASE_URL}/admin/library/books/${book.id}`,
                    { method: "DELETE" }
                );

                notify(data.message || "Book deleted successfully", "success");

                if (selectedBook?.id === book.id) {
                    closeBookDetails();
                }

                const shouldLoadPreviousPage =
                    bookRows.length === 1 && bookPagination.page > 1;

                const targetPage = shouldLoadPreviousPage
                    ? bookPagination.page - 1
                    : bookPagination.page;

                await loadBooks({
                    page: targetPage,
                    perPage: bookPagination.per_page,
                    filters: bookFilters,
                    force: true,
                    silent: true,
                });

                await loadRecentBooks({
                    force: true,
                    silent: true,
                });
            } catch (error) {
                console.error("Delete book error:", error);
                notify(error.message || "Failed to delete book", "error");
            } finally {
                setDeletingBookId(null);
            }
        },
        [
            bookFilters,
            bookPagination.page,
            bookPagination.per_page,
            bookRows.length,
            closeBookDetails,
            loadBooks,
            loadRecentBooks,
            notify,
            request,
            selectedBook?.id,
        ]
    );

    const openEditBook = useCallback(
        (book) => {
            setEditingBookId(book.id);

            setBookForm({
                id: book.id,
                title: book.title || "",
                author_id: String(book.author_id || ""),
                category_id: String(book.category_id || ""),
                isbn: book.isbn || "",
                total_copies: String(book.total_copies || 1),
                available_copies: String(book.available_copies ?? 0),
                shelf_no: book.shelf_no || "",
                publisher: book.publisher || "",
                published_year: book.published_year
                    ? String(book.published_year)
                    : "",
                language: book.language || "English",
                description: book.description || "",
                status: book.status || "Available",
            });

            setBookFormErrors({});

            if (typeof setActiveSection === "function") {
                setActiveSection("add-book");
            }
        },
        [setActiveSection]
    );

    useEffect(() => {
        if (activeSection !== "book") {
            allBooksSectionLoadedRef.current = false;
            return;
        }

        if (allBooksSectionLoadedRef.current) {
            return;
        }

        allBooksSectionLoadedRef.current = true;

        loadBookOptions({ silent: true });
        loadBooks({
            page: 1,
            perPage: 10,
            filters: { ...INITIAL_BOOK_FILTERS },
            silent: false,
        });
    }, [activeSection, loadBookOptions, loadBooks]);

    const refreshBookSection = useCallback(async () => {
        await Promise.all([
            loadBookOptions({ force: true, silent: true }),
            loadBooks({
                page: bookPagination.page,
                perPage: bookPagination.per_page,
                filters: bookFilters,
                force: true,
                silent: true,
            }),
        ]);

        notify("Book records refreshed", "success");
    }, [
        bookFilters,
        bookPagination.page,
        bookPagination.per_page,
        loadBookOptions,
        loadBooks,
        notify,
    ]);

    return {
        // ADD BOOK
        bookForm,
        bookFormErrors,
        bookSaving,
        updateBookForm,
        saveBook,
        resetBookForm,

        // OPTIONS
        bookAuthors,
        bookCategories,
        bookOptionsLoading,
        hasBookOptions,
        loadBookOptions,

        // RECENT BOOKS
        recentBooks,
        recentBooksLoading,
        loadRecentBooks,
        refreshAddBookSection,

        // ALL BOOKS
        bookRows,
        bookStats,
        bookFilters,
        bookPagination,
        booksLoading,
        deletingBookId,
        updateBookFilter,
        loadBooks,
        applyBookFilters,
        resetBookFilters,
        changeBookPage,
        changeBookPageSize,
        refreshBookSection,

        // DETAILS / ACTIONS
        selectedBook,
        bookDetailsModalOpen,
        editingBookId,
        openBookDetails,
        closeBookDetails,
        openEditBook,
        deleteBook,
    };
}

export default useAddLibraryBook;