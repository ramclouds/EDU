import { useCallback, useEffect, useMemo, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

const emptyExamForm = {
    exam_name: "",
    academic_year: "2025-26",
    exam_type: "Annual",
    start_date: "",
    end_date: "",
    academic_class_ids: [],
    subject_ids: [],
};

const emptyPublishForm = {
    exam_id: "",
    publish_at: "",
    force: false,
};

const initialFilters = {
    academic_year: "",
    exam_name: "",
    academic_class_id: "",
    subject_id: "",
    teacher_id: "",
    status: "",
    search: "",
};

const normalizeArray = (value) => (Array.isArray(value) ? value : []);

const DEFAULT_EXAM_STATUSES = [
    "Draft",
    "Scheduled",
    "Conducting",
    "Marks Entry",
    "Verification",
    "Ready to Publish",
    "Published",
    "Archived",
];

const DEFAULT_EXAM_TYPES = [
    "Unit Test",
    "Mid Term",
    "Annual",
    "Practical",
    "Internal",
];

const toNumberOrEmpty = (value) => {
    if (value === "" || value === null || value === undefined) return "";
    const num = Number(value);
    return Number.isNaN(num) ? "" : num;
};

export function useExamResultManagement({
    activeSection,
    fetchWithAuth,
    showToast,
    currentUser,
    teacherId,
} = {}) {
    const [examOptions, setExamOptions] = useState({
        years: [],
        batches: [],
        exams: [],
        statuses: [],
        classes: [],
        subjects: [],
        teachers: [],
        exam_types: [],
    });

    const [examFilters, setExamFilters] = useState(initialFilters);
    const [examDashboard, setExamDashboard] = useState({
        stats: {},
        classes: [],
        analytics: {},
    });

    const [examTerms, setExamTerms] = useState([]);
    const [examResults, setExamResults] = useState([]);
    const [selectedExam, setSelectedExam] = useState(null);
    const [selectedExamDetails, setSelectedExamDetails] = useState(null);

    const [examForm, setExamForm] = useState(emptyExamForm);
    const [publishForm, setPublishForm] = useState(emptyPublishForm);

    const [examModalOpen, setExamModalOpen] = useState(false);
    const [examDetailsModalOpen, setExamDetailsModalOpen] = useState(false);
    const [publishModalOpen, setPublishModalOpen] = useState(false);

    const [examLoading, setExamLoading] = useState(false);
    const [examOptionsLoading, setExamOptionsLoading] = useState(false);
    const [examSaving, setExamSaving] = useState(false);
    const [examActionLoading, setExamActionLoading] = useState(false);

    const [teacherStudents, setTeacherStudents] = useState([]);
    const [teacherSubjects, setTeacherSubjects] = useState([]);
    const [teacherClasses, setTeacherClasses] = useState([]);
    const [teacherAnalytics, setTeacherAnalytics] = useState(null);
    const [selectedStudentMarks, setSelectedStudentMarks] = useState(null);
    const [examInitialLoaded, setExamInitialLoaded] = useState(false);

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

            const contentType = res.headers?.get?.("content-type") || "";

            if (contentType.includes("application/json")) {
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || data.message || "Request failed");
                return data;
            }

            if (!res.ok) throw new Error("Request failed");
            return res;
        },
        [fetchWithAuth]
    );

    const buildAdminQuery = useCallback(
        (extra = {}) => {
            const params = new URLSearchParams();
            const merged = { ...examFilters, ...extra };

            Object.entries(merged).forEach(([key, value]) => {
                if (value !== "" && value !== null && value !== undefined && value !== "all") {
                    params.set(key, value);
                }
            });

            return params.toString();
        },
        [examFilters]
    );

    const loadExamOptions = useCallback(async () => {
        try {
            setExamOptionsLoading(true);
            const data = await apiFetch(`${BASE_URL}/admin/exams/options`);

            setExamOptions({
                years: normalizeArray(data.years),
                batches: normalizeArray(data.batches),
                exams: normalizeArray(data.exams),
                statuses: normalizeArray(data.statuses).length
                    ? normalizeArray(data.statuses)
                    : DEFAULT_EXAM_STATUSES,
                classes: normalizeArray(data.classes),
                subjects: normalizeArray(data.subjects),
                teachers: normalizeArray(data.teachers),
                exam_types: normalizeArray(data.exam_types).length
                    ? normalizeArray(data.exam_types)
                    : DEFAULT_EXAM_TYPES,
            });
        } catch (err) {
            showToast?.(err.message || "Failed to load exam options", "error");
        } finally {
            setExamOptionsLoading(false);
        }
    }, [apiFetch, showToast]);

    const loadExamDashboard = useCallback(async () => {
        try {
            setExamLoading(true);
            const query = buildAdminQuery();
            const data = await apiFetch(`${BASE_URL}/admin/exams/dashboard?${query}`);

            setExamDashboard({
                stats: data.stats || {},
                classes: normalizeArray(data.classes),
                analytics: data.analytics || {},
            });
        } catch (err) {
            showToast?.(err.message || "Failed to load exam dashboard", "error");
        } finally {
            setExamLoading(false);
        }
    }, [apiFetch, buildAdminQuery, showToast]);

    const loadExamTerms = useCallback(async () => {
        try {
            const query = buildAdminQuery();
            const data = await apiFetch(`${BASE_URL}/admin/exams?${query}`);
            setExamTerms(normalizeArray(data));
        } catch (err) {
            showToast?.(err.message || "Failed to load exams", "error");
        }
    }, [apiFetch, buildAdminQuery, showToast]);

    const loadExamResults = useCallback(
        async (extraFilters = {}) => {
            try {
                setExamLoading(true);
                const query = buildAdminQuery(extraFilters);
                const data = await apiFetch(`${BASE_URL}/admin/exams/results?${query}`);
                setExamResults(normalizeArray(data));
            } catch (err) {
                showToast?.(err.message || "Failed to load result rows", "error");
            } finally {
                setExamLoading(false);
            }
        },
        [apiFetch, buildAdminQuery, showToast]
    );

    const refreshExamManagement = useCallback(async () => {
        await Promise.all([loadExamDashboard(), loadExamTerms(), loadExamResults()]);
    }, [loadExamDashboard, loadExamTerms, loadExamResults]);

    useEffect(() => {
        if (activeSection !== "exams") {
            setExamInitialLoaded(false);
            return;
        }

        if (examInitialLoaded) return;

        setExamInitialLoaded(true);
        loadExamOptions();
        refreshExamManagement();
    }, [activeSection, examInitialLoaded]);

    const updateExamFilter = useCallback((name, value) => {
        setExamFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    }, []);

    const applyExamFilters = useCallback(async () => {
        await refreshExamManagement();
    }, [refreshExamManagement]);

    const resetExamFilters = useCallback(() => {
        setExamFilters(initialFilters);
        setTimeout(() => {
            refreshExamManagement();
        }, 0);
    }, [refreshExamManagement]);

    const updateExamForm = useCallback((name, value) => {
        setExamForm((prev) => ({
            ...prev,
            [name]:
                name === "academic_class_ids" || name === "subject_ids"
                    ? normalizeArray(value).map(Number).filter(Boolean)
                    : value,
        }));
    }, []);

    const toggleExamFormArrayValue = useCallback((name, value) => {
        const num = Number(value);
        if (!num) return;

        setExamForm((prev) => {
            const current = normalizeArray(prev[name]);
            const exists = current.includes(num);

            return {
                ...prev,
                [name]: exists ? current.filter((id) => id !== num) : [...current, num],
            };
        });
    }, []);

    const openExamModal = useCallback((exam = null) => {
        if (exam) {
            setSelectedExam(exam);
            setExamForm({
                ...emptyExamForm,
                exam_name: exam.exam_name || "",
                academic_year: exam.academic_year || "2025-26",
                exam_type: exam.exam_type || "Annual",
                start_date: exam.start_date || "",
                end_date: exam.end_date || "",
                academic_class_ids: exam.academic_class_id ? [Number(exam.academic_class_id)] : [],
                subject_ids: [],
            });
        } else {
            setSelectedExam(null);
            setExamForm(emptyExamForm);
        }

        setExamModalOpen(true);
    }, []);

    const closeExamModal = useCallback(() => {
        setExamModalOpen(false);
        setSelectedExam(null);
        setExamForm(emptyExamForm);
    }, []);

    const saveExam = useCallback(async () => {
        try {
            setExamSaving(true);

            const payload = {
                ...examForm,
                academic_class_ids: normalizeArray(examForm.academic_class_ids)
                    .map(Number)
                    .filter(Boolean),
                subject_ids: normalizeArray(examForm.subject_ids).map(Number).filter(Boolean),
            };

            await apiFetch(`${BASE_URL}/admin/exams`, {
                method: "POST",
                body: JSON.stringify(payload),
            });

            showToast?.("Examination saved successfully", "success");
            closeExamModal();
            await refreshExamManagement();
            await loadExamOptions();
        } catch (err) {
            showToast?.(err.message || "Failed to save exam", "error");
        } finally {
            setExamSaving(false);
        }
    }, [apiFetch, examForm, showToast, closeExamModal, refreshExamManagement, loadExamOptions]);

    const openExamDetails = useCallback(
        async (exam) => {
            try {
                setSelectedExam(exam);
                setExamDetailsModalOpen(true);
                setExamActionLoading(true);

                const query = buildAdminQuery({
                    subject_id: exam.subject_id || examFilters.subject_id,
                });

                const data = await apiFetch(`${BASE_URL}/admin/exams/${exam.exam_id || exam.id}/details?${query}`);
                setSelectedExamDetails(data || null);
            } catch (err) {
                showToast?.(err.message || "Failed to load exam details", "error");
            } finally {
                setExamActionLoading(false);
            }
        },
        [apiFetch, buildAdminQuery, examFilters.subject_id, showToast]
    );

    const closeExamDetails = useCallback(() => {
        setSelectedExam(null);
        setSelectedExamDetails(null);
        setExamDetailsModalOpen(false);
    }, []);

    const verifyExam = useCallback(
        async (examId) => {
            const ok = window.confirm("Verify this exam result data?");
            if (!ok) return;

            try {
                setExamActionLoading(true);

                await apiFetch(`${BASE_URL}/admin/exams/${examId}/verify`, {
                    method: "POST",
                    body: JSON.stringify({
                        admin_id: currentUser?.id || currentUser?.user_id,
                    }),
                });

                showToast?.("Exam verified successfully", "success");
                await refreshExamManagement();
            } catch (err) {
                showToast?.(err.message || "Failed to verify exam", "error");
            } finally {
                setExamActionLoading(false);
            }
        },
        [apiFetch, currentUser, refreshExamManagement, showToast]
    );

    const publishExam = useCallback(
        async (examId, force = false) => {
            const ok = window.confirm("Publish this exam result now?");
            if (!ok) return;

            try {
                setExamActionLoading(true);

                await apiFetch(`${BASE_URL}/admin/exams/${examId}/publish`, {
                    method: "POST",
                    body: JSON.stringify({ force }),
                });

                showToast?.("Result published successfully", "success");
                await refreshExamManagement();
            } catch (err) {
                showToast?.(err.message || "Failed to publish result", "error");
            } finally {
                setExamActionLoading(false);
            }
        },
        [apiFetch, refreshExamManagement, showToast]
    );

    const openPublishModal = useCallback((exam = null) => {
        setSelectedExam(exam);
        setPublishForm({
            ...emptyPublishForm,
            exam_id: exam?.exam_id || exam?.id || "",
        });
        setPublishModalOpen(true);
    }, []);

    const closePublishModal = useCallback(() => {
        setSelectedExam(null);
        setPublishForm(emptyPublishForm);
        setPublishModalOpen(false);
    }, []);

    const updatePublishForm = useCallback((name, value) => {
        setPublishForm((prev) => ({ ...prev, [name]: value }));
    }, []);

    const schedulePublishExam = useCallback(async () => {
        try {
            const examId = publishForm.exam_id || selectedExam?.exam_id || selectedExam?.id;
            if (!examId) throw new Error("Select an exam first");

            setExamActionLoading(true);

            await apiFetch(`${BASE_URL}/admin/exams/${examId}/schedule-publish`, {
                method: "POST",
                body: JSON.stringify({
                    publish_at: publishForm.publish_at,
                    force: Boolean(publishForm.force),
                }),
            });

            showToast?.("Publish schedule saved successfully", "success");
            closePublishModal();
            await refreshExamManagement();
        } catch (err) {
            showToast?.(err.message || "Failed to schedule publishing", "error");
        } finally {
            setExamActionLoading(false);
        }
    }, [apiFetch, publishForm, selectedExam, showToast, closePublishModal, refreshExamManagement]);

    const bulkUpdateResults = useCallback(
        async (rows = []) => {
            try {
                setExamActionLoading(true);

                await apiFetch(`${BASE_URL}/admin/exams/results/bulk-edit`, {
                    method: "PUT",
                    body: JSON.stringify({
                        updates: rows,
                        admin_id: currentUser?.id || currentUser?.user_id,
                    }),
                });

                showToast?.("Result rows updated successfully", "success");
                await loadExamResults();
                await loadExamDashboard();
            } catch (err) {
                showToast?.(err.message || "Failed to update result rows", "error");
            } finally {
                setExamActionLoading(false);
            }
        },
        [apiFetch, loadExamResults, loadExamDashboard, showToast, currentUser]
    );

    const downloadFileWithAuth = useCallback(
        async (url, fallbackName) => {
            try {
                const fn = typeof fetchWithAuth === "function" ? fetchWithAuth : fetch;

                const res = await fn(url, {
                    method: "GET",
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || err.message || "Download failed");
                }

                const blob = await res.blob();
                const fileUrl = window.URL.createObjectURL(blob);

                const link = document.createElement("a");
                link.href = fileUrl;
                link.download = fallbackName;
                document.body.appendChild(link);
                link.click();
                link.remove();

                window.URL.revokeObjectURL(fileUrl);
            } catch (err) {
                showToast?.(err.message || "Failed to download file", "error");
            }
        },
        [fetchWithAuth, showToast]
    );

    const exportExamReportsPDF = useCallback(() => {
        const query = buildAdminQuery();
        downloadFileWithAuth(
            `${BASE_URL}/admin/exams/reports/pdf?${query}`,
            "admin_exam_result_report.pdf"
        );
    }, [buildAdminQuery, downloadFileWithAuth]);

    const exportExamReportCardsPDF = useCallback(() => {
        const examId =
            publishForm.exam_id ||
            selectedExam?.exam_id ||
            selectedExam?.id ||
            examTerms?.[0]?.id;

        if (!examId) {
            showToast?.("Please select an exam first to export report cards", "error");
            return;
        }

        const params = new URLSearchParams();
        params.set("exam_id", examId);

        if (examFilters.academic_class_id) {
            params.set("academic_class_id", examFilters.academic_class_id);
        }

        downloadFileWithAuth(
            `${BASE_URL}/admin/exams/report-cards/pdf?${params.toString()}`,
            "exam_report_cards.pdf"
        );
    }, [
        publishForm.exam_id,
        selectedExam,
        examTerms,
        examFilters.academic_class_id,
        downloadFileWithAuth,
        showToast,
    ]);

    const loadTeacherExamData = useCallback(
        async (id = teacherId || currentUser?.id || currentUser?.teacher_id) => {
            if (!id) return;

            try {
                setExamLoading(true);

                const [students, subjects, classes] = await Promise.all([
                    apiFetch(`${BASE_URL}/teacher/students?teacher_id=${id}`),
                    apiFetch(`${BASE_URL}/teacher/subjects?teacher_id=${id}`),
                    apiFetch(`${BASE_URL}/teacher/classes?teacher_id=${id}`),
                ]);

                setTeacherStudents(normalizeArray(students));
                setTeacherSubjects(normalizeArray(subjects));
                setTeacherClasses(normalizeArray(classes));
            } catch (err) {
                showToast?.(err.message || "Failed to load teacher exam data", "error");
            } finally {
                setExamLoading(false);
            }
        },
        [apiFetch, teacherId, currentUser, showToast]
    );

    const loadTeacherStudentMarks = useCallback(
        async ({ studentId, subject, exam }) => {
            if (!studentId || !subject || !exam) return null;

            try {
                setExamActionLoading(true);

                const params = new URLSearchParams({ subject, exam });
                const data = await apiFetch(`${BASE_URL}/teacher/marks/${studentId}?${params.toString()}`);

                setSelectedStudentMarks(data);
                return data;
            } catch (err) {
                showToast?.(err.message || "Failed to load marks", "error");
                return null;
            } finally {
                setExamActionLoading(false);
            }
        },
        [apiFetch, showToast]
    );

    const saveTeacherMarks = useCallback(
        async (marksPayload) => {
            try {
                setExamSaving(true);

                await apiFetch(`${BASE_URL}/teacher/marks`, {
                    method: "POST",
                    body: JSON.stringify({
                        ...marksPayload,
                        teacherId: marksPayload.teacherId || teacherId || currentUser?.id || currentUser?.teacher_id,
                    }),
                });

                showToast?.("Marks saved successfully", "success");
                await loadTeacherExamData();
            } catch (err) {
                showToast?.(err.message || "Failed to save marks", "error");
            } finally {
                setExamSaving(false);
            }
        },
        [apiFetch, teacherId, currentUser, showToast, loadTeacherExamData]
    );

    const loadTeacherAnalytics = useCallback(
        async (filters = {}) => {
            const id = filters.teacher_id || teacherId || currentUser?.id || currentUser?.teacher_id;
            if (!id) return;

            try {
                setExamLoading(true);

                const params = new URLSearchParams();
                params.set("teacher_id", id);
                if (filters.class_id) params.set("class_id", filters.class_id);
                if (filters.subject_id) params.set("subject_id", filters.subject_id);

                const data = await apiFetch(`${BASE_URL}/teacher/analytics?${params.toString()}`);
                setTeacherAnalytics(data);
            } catch (err) {
                showToast?.(err.message || "Failed to load teacher analytics", "error");
            } finally {
                setExamLoading(false);
            }
        },
        [apiFetch, teacherId, currentUser, showToast]
    );

    const downloadTeacherAnalyticsPDF = useCallback(
        (filters = {}) => {
            const id = filters.teacher_id || teacherId || currentUser?.id || currentUser?.teacher_id;
            if (!id) {
                showToast?.("Teacher ID missing", "error");
                return;
            }

            const params = new URLSearchParams();
            params.set("teacher_id", id);
            if (filters.class_id) params.set("class_id", filters.class_id);
            if (filters.subject_id) params.set("subject_id", filters.subject_id);

            window.open(`${BASE_URL}/teacher/analytics/pdf?${params.toString()}`, "_blank", "noopener,noreferrer");
        },
        [teacherId, currentUser, showToast]
    );

    const downloadTeacherReportCard = useCallback((studentId) => {
        if (!studentId) return;
        window.open(`${BASE_URL}/teacher/report-card/${studentId}`, "_blank", "noopener,noreferrer");
    }, []);

    const normalizedStats = useMemo(() => {
        const stats = examDashboard.stats || {};
        const classCards = examDashboard.classes || [];

        const uniqueClasses = new Set(
            classCards.map((item) => item.academic_class_id).filter(Boolean)
        );

        const students = classCards.reduce(
            (sum, item) => sum + Number(item.student_count || 0),
            0
        );

        const expected = classCards.reduce(
            (sum, item) => sum + Number(item.expected || 0),
            0
        );

        const marked = classCards.reduce(
            (sum, item) => sum + Number(item.marked || 0),
            0
        );

        const published = classCards.filter((item) => item.is_published).length;
        const verified = classCards.filter((item) => item.is_verified).length;

        const percentages = examResults
            .map((row) => Number(row.percentage || 0))
            .filter((num) => !Number.isNaN(num));

        const passCount = percentages.filter((num) => num >= 35).length;

        return {
            totalExams: stats.total_exams || classCards.length || 0,
            classesCovered: stats.classes_covered || uniqueClasses.size || 0,
            students: stats.students || students || 0,
            resultsPublished: stats.results_published || published || 0,
            pendingVerification: stats.pending_verification || Math.max(classCards.length - verified, 0),
            pendingMarks: stats.pending_marks || Math.max(expected - marked, 0),
            passPercentage:
                stats.pass_percentage ||
                (percentages.length ? Math.round((passCount / percentages.length) * 100) : 0),
            averageScore:
                stats.average_score ||
                (percentages.length
                    ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length)
                    : 0),
            atRiskStudents: stats.at_risk_students || 0,
            topper: stats.topper || null,
            totalResults: stats.total_results || examResults.length || 0,
            subjectAverageHigh: stats.subject_average_high || null,
            subjectAverageLow: stats.subject_average_low || null,
        };
    }, [examDashboard.stats, examDashboard.classes, examResults]);

    const filteredExamResults = useMemo(() => {
        const search = (examFilters.search || "").toLowerCase().trim();
        if (!search) return examResults;

        return examResults.filter((row) => {
            return [
                row.student_name,
                row.roll_no,
                row.class_name,
                row.exam_name,
                row.subject,
                row.status,
            ]
                .join(" ")
                .toLowerCase()
                .includes(search);
        });
    }, [examResults, examFilters.search]);

    const updateMarksEntryPermission = useCallback(
        async (examId, enabled) => {
            try {
                if (!examId) {
                    showToast?.("Exam ID missing", "error");
                    return;
                }

                setExamActionLoading(true);

                await apiFetch(
                    `${BASE_URL}/admin/exams/${examId}/marks-entry-permission`,
                    {
                        method: "PUT",
                        body: JSON.stringify({
                            marks_entry_enabled: Boolean(enabled),
                        }),
                    }
                );

                showToast?.(
                    enabled
                        ? "Marks entry enabled for teachers"
                        : "Marks entry disabled for teachers",
                    "success"
                );

                await refreshExamManagement();
            } catch (err) {
                showToast?.(
                    err.message || "Failed to update marks entry permission",
                    "error"
                );
            } finally {
                setExamActionLoading(false);
            }
        },
        [apiFetch, refreshExamManagement, showToast]
    );

    const updateAdminResultMarks = useCallback(
        async (resultId, fields) => {
            try {
                setExamActionLoading(true);

                await apiFetch(`${BASE_URL}/admin/exams/results/bulk-edit`, {
                    method: "PUT",
                    body: JSON.stringify({
                        admin_id: currentUser?.id || currentUser?.user_id,
                        updates: [
                            {
                                result_id: resultId,
                                fields,
                            },
                        ],
                    }),
                });

                showToast?.("Marks updated successfully", "success");

                if (selectedExam?.exam_id || selectedExam?.id) {
                    await openExamDetails(selectedExam);
                }

                await refreshExamManagement();
            } catch (err) {
                showToast?.(err.message || "Failed to update marks", "error");
            } finally {
                setExamActionLoading(false);
            }
        },
        [
            apiFetch,
            currentUser,
            selectedExam,
            openExamDetails,
            refreshExamManagement,
            showToast,
        ]
    );

    return {
        updateAdminResultMarks,
        updateMarksEntryPermission, 
        examManagementOptions: examOptions,
        examManagementDashboard: examDashboard,
        examManagementStats: normalizedStats,
        examManagementClasses: examDashboard.classes || [],
        examManagementAnalytics: examDashboard.analytics || {},
        examManagementTerms: examTerms,
        examManagementResults: examResults,
        examManagementFilteredResults: filteredExamResults,

        examManagementSelectedExam: selectedExam,
        examManagementSelectedDetails: selectedExamDetails,

        examManagementForm: examForm,
        examManagementPublishForm: publishForm,

        examManagementModalOpen: examModalOpen,
        examManagementDetailsModalOpen: examDetailsModalOpen,
        examManagementPublishModalOpen: publishModalOpen,

        examManagementLoading: examLoading,
        examManagementOptionsLoading: examOptionsLoading,
        examManagementSaving: examSaving,
        examManagementActionLoading: examActionLoading,

        examManagementFilters: examFilters,
        updateExamManagementFilter: updateExamFilter,
        applyExamManagementFilters: applyExamFilters,
        resetExamManagementFilters: resetExamFilters,

        loadExamManagementOptions: loadExamOptions,
        loadExamManagementDashboard: loadExamDashboard,
        loadExamManagementTerms: loadExamTerms,
        loadExamManagementResults: loadExamResults,
        refreshExamManagement,

        updateExamManagementForm: updateExamForm,
        toggleExamManagementFormArrayValue: toggleExamFormArrayValue,
        openExamManagementModal: openExamModal,
        closeExamManagementModal: closeExamModal,
        saveExamManagementExam: saveExam,

        openExamManagementDetails: openExamDetails,
        closeExamManagementDetails: closeExamDetails,
        verifyExamManagementExam: verifyExam,
        publishExamManagementExam: publishExam,

        openExamManagementPublishModal: openPublishModal,
        closeExamManagementPublishModal: closePublishModal,
        updateExamManagementPublishForm: updatePublishForm,
        scheduleExamManagementPublish: schedulePublishExam,

        bulkUpdateExamManagementResults: bulkUpdateResults,
        exportExamManagementReportsPDF: exportExamReportsPDF,
        exportExamManagementReportCardsPDF: exportExamReportCardsPDF,

        teacherExamStudents: teacherStudents,
        teacherExamSubjects: teacherSubjects,
        teacherExamClasses: teacherClasses,
        teacherExamAnalytics: teacherAnalytics,
        selectedTeacherStudentMarks: selectedStudentMarks,
        loadTeacherExamData,
        loadTeacherStudentMarks,
        saveTeacherMarks,
        loadTeacherAnalytics,
        downloadTeacherAnalyticsPDF,
        downloadTeacherReportCard,

        EXAM_STATUS_OPTIONS: examOptions.statuses || [],
        EXAM_TYPE_OPTIONS: examOptions.exam_types || [],
        toNumberOrEmpty,
    };
}