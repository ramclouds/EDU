import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

const API_BASE = BASE_URL.replace(/\/$/, "");

const INITIAL_SUBJECT_FORM = {
    id: "",
    subject_name: "",
    subject_code: "",
    subject_type: "Core",
    status: "Active",
};

const normalize = (v) => String(v ?? "").toLowerCase().trim();

const buildQuery = (params = {}) => {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value && value !== "all") {
            searchParams.set(key, value);
        }
    });

    const query = searchParams.toString();
    return query ? `?${query}` : "";
};

export function useSubjectManagements({
    activeSection,
    fetchWithAuth,
    showToast,
}) {
    const [subjects, setSubjects] = useState([]);
    const [subjectsLoading, setSubjectsLoading] = useState(false);
    const [subjectSaving, setSubjectSaving] = useState(false);
    const [subjectDeleting, setSubjectDeleting] = useState(false);

    const [subjectForm, setSubjectForm] = useState(INITIAL_SUBJECT_FORM);
    const [selectedSubject, setSelectedSubject] = useState(null);

    const [subjectSearch, setSubjectSearch] = useState("");
    const [subjectTypeFilter, setSubjectTypeFilter] = useState("all");
    const [subjectStatusFilter, setSubjectStatusFilter] = useState("all");

    const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);

    const initializedRef = useRef(false);
    const loadingRef = useRef(false);

    const apiFetch = useCallback(
        async (url, options = {}) => {
            const fn = typeof fetchWithAuth === "function" ? fetchWithAuth : fetch;

            const res = await fn(url, {
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    ...(options.headers || {}),
                },
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.error || data.message || "Request failed");
            }

            return data;
        },
        [fetchWithAuth]
    );

    const loadSubjects = useCallback(async () => {
        if (loadingRef.current) return;

        try {
            loadingRef.current = true;
            setSubjectsLoading(true);

            const query = buildQuery({
                search: subjectSearch.trim(),
                type: subjectTypeFilter,
                status: subjectStatusFilter,
            });

            const data = await apiFetch(`${API_BASE}/admin/subjects${query}`);

            const rows = Array.isArray(data)
                ? data
                : data.subjects || data.data || data.rows || [];

            setSubjects(rows);
        } catch (err) {
            showToast?.(err.message || "Failed to load subjects", "error");
            setSubjects([]);
        } finally {
            loadingRef.current = false;
            setSubjectsLoading(false);
        }
    }, [
        apiFetch,
        showToast,
        subjectSearch,
        subjectTypeFilter,
        subjectStatusFilter,
    ]);

    useEffect(() => {
        if (activeSection !== "subjects") return;
        if (initializedRef.current) return;

        initializedRef.current = true;
        loadSubjects();
    }, [activeSection, loadSubjects]);

    const handleSubjectChange = useCallback((e) => {
        const { name, value } = e.target;

        setSubjectForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    }, []);

    const openSubjectModal = useCallback((subject = null) => {
        if (subject) {
            setSelectedSubject(subject);
            setSubjectForm({
                id: subject.id || "",
                subject_name: subject.subject_name || "",
                subject_code: subject.subject_code || "",
                subject_type: subject.subject_type || "Core",
                status: subject.status || "Active",
            });
        } else {
            setSelectedSubject(null);
            setSubjectForm(INITIAL_SUBJECT_FORM);
        }

        setIsSubjectModalOpen(true);
    }, []);

    const closeSubjectModal = useCallback(() => {
        setIsSubjectModalOpen(false);
        setSelectedSubject(null);
        setSubjectForm(INITIAL_SUBJECT_FORM);
    }, []);

    const validateSubjectForm = useCallback(() => {
        if (!subjectForm.subject_name.trim()) {
            showToast?.("Subject name is required", "error");
            return false;
        }

        if (!subjectForm.subject_code.trim()) {
            showToast?.("Subject code is required", "error");
            return false;
        }

        return true;
    }, [subjectForm, showToast]);

    const saveSubject = useCallback(
        async (e) => {
            e?.preventDefault?.();

            if (!validateSubjectForm()) return false;

            try {
                setSubjectSaving(true);

                const isEdit = Boolean(subjectForm.id || selectedSubject?.id);

                const payload = {
                    subject_name: subjectForm.subject_name.trim(),
                    subject_code: subjectForm.subject_code.trim().toUpperCase(),
                    subject_type: subjectForm.subject_type || "Core",
                    status: subjectForm.status || "Active",
                };

                const url = isEdit
                    ? `${API_BASE}/admin/subjects/${subjectForm.id || selectedSubject.id}`
                    : `${API_BASE}/admin/subjects`;

                const method = isEdit ? "PUT" : "POST";

                const data = await apiFetch(url, {
                    method,
                    body: JSON.stringify(payload),
                });

                showToast?.(
                    data.message ||
                    (isEdit
                        ? "Subject updated successfully"
                        : "Subject added successfully"),
                    "success"
                );

                closeSubjectModal();
                await loadSubjects();

                return true;
            } catch (err) {
                showToast?.(err.message || "Failed to save subject", "error");
                return false;
            } finally {
                setSubjectSaving(false);
            }
        },
        [
            apiFetch,
            closeSubjectModal,
            loadSubjects,
            selectedSubject,
            showToast,
            subjectForm,
            validateSubjectForm,
        ]
    );

    const deleteSubject = useCallback(
        async (subjectId) => {
            if (!subjectId) return false;

            const confirmed = window.confirm(
                "Are you sure you want to delete this subject?"
            );

            if (!confirmed) return false;

            try {
                setSubjectDeleting(true);

                const data = await apiFetch(`${API_BASE}/admin/subjects/${subjectId}`, {
                    method: "DELETE",
                });

                showToast?.(data.message || "Subject deleted successfully", "success");

                await loadSubjects();
                return true;
            } catch (err) {
                showToast?.(err.message || "Failed to delete subject", "error");
                return false;
            } finally {
                setSubjectDeleting(false);
            }
        },
        [apiFetch, loadSubjects, showToast]
    );

    const resetSubjectFilters = useCallback(async () => {
        setSubjectSearch("");
        setSubjectTypeFilter("all");
        setSubjectStatusFilter("all");

        try {
            setSubjectsLoading(true);

            const data = await apiFetch(`${API_BASE}/admin/subjects`);

            const rows = Array.isArray(data)
                ? data
                : data.subjects || data.data || data.rows || [];

            setSubjects(rows);
        } catch (err) {
            showToast?.(err.message || "Failed to reset subjects", "error");
        } finally {
            setSubjectsLoading(false);
        }
    }, [apiFetch, showToast]);

    const filteredSubjects = useMemo(() => {
        const q = normalize(subjectSearch);

        return subjects.filter((item) => {
            const matchesSearch =
                !q ||
                normalize(item.subject_name).includes(q) ||
                normalize(item.subject_code).includes(q) ||
                normalize(item.subject_type).includes(q);

            const matchesType =
                subjectTypeFilter === "all" ||
                item.subject_type === subjectTypeFilter;

            const matchesStatus =
                subjectStatusFilter === "all" ||
                item.status === subjectStatusFilter;

            return matchesSearch && matchesType && matchesStatus;
        });
    }, [subjects, subjectSearch, subjectTypeFilter, subjectStatusFilter]);

    const subjectTypeOptions = useMemo(() => {
        const map = new Map();

        subjects.forEach((item) => {
            if (item.subject_type) {
                map.set(item.subject_type, item.subject_type);
            }
        });

        ["Core", "Optional", "Practical"].forEach((type) => {
            map.set(type, type);
        });

        return Array.from(map.values()).sort();
    }, [subjects]);

    const totalSubjects = subjects.length;

    const activeSubjects = useMemo(
        () =>
            subjects.filter(
                (s) => String(s.status || "Active").toLowerCase() === "active"
            ),
        [subjects]
    );

    const inactiveSubjects = useMemo(
        () =>
            subjects.filter(
                (s) => String(s.status || "Active").toLowerCase() !== "active"
            ),
        [subjects]
    );

    const subjectStats = useMemo(
        () => ({
            total: totalSubjects,
            active: activeSubjects.length,
            inactive: inactiveSubjects.length,
        }),
        [totalSubjects, activeSubjects.length, inactiveSubjects.length]
    );

    return {
        subjects: filteredSubjects,
        allSubjects: subjects,

        subjectsLoading,
        subjectSaving,
        subjectDeleting,

        subjectForm,
        setSubjectForm,
        handleSubjectChange,

        selectedSubject,

        isSubjectModalOpen,
        openSubjectModal,
        closeSubjectModal,

        subjectSearch,
        setSubjectSearch,

        subjectTypeFilter,
        setSubjectTypeFilter,

        subjectStatusFilter,
        setSubjectStatusFilter,

        resetSubjectFilters,

        loadSubjects,
        saveSubject,
        deleteSubject,

        subjectTypeOptions,

        subjectStats,
        totalSubjects,
        activeSubjects,
        inactiveSubjects,
    };
}