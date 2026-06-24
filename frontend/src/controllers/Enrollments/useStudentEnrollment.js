import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BASE_URL } from "../../config/appConfig";
const EMPTY_CLASSES = [];

const getAcademicYearBatch = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    const startYear = month >= 6 ? year : year - 1;
    const endYear = startYear + 1;

    return `${startYear}-${endYear}`;
};

const initialEnrollmentForm = {
    firstName: "",
    middleName: "",
    lastName: "",
    studentEmail: "",
    studentMobile: "",
    gender: "",
    dob: "",
    bloodGroup: "",

    fatherName: "",
    fatherMobile: "",
    fatherEmail: "",
    motherName: "",
    motherMobile: "",
    motherEmail: "",

    enrollBatch: getAcademicYearBatch(),
    enrollDivision: "",
    enrollSection: "",
    rollNumber: "",

    admissionDate: "",
    prevSchool: "",
    address: "",
    medical: "",

    studentID: "",
    userID: "",
    password: "",
    status: "Active",
};

const initialPromotionForm = {
    source_class_id: "",
    target_class_id: "",
};

const initialReportFilters = {
    batch: "",
    division: "",
    section: "",
    date: "",
};

export function useStudentEnrollment({
    fetchWithAuth,
    showToast,
    academicClasses: externalAcademicClasses,
    reportApiUrl = "",
}) {
    const [activeTab, setActiveTab] = useState("enroll");

    const [enrollmentForm, setEnrollmentForm] = useState(initialEnrollmentForm);
    const [loading, setLoading] = useState(false);
    const [enrolledStudent, setEnrolledStudent] = useState(null);

    const safeExternalAcademicClasses = Array.isArray(externalAcademicClasses)
        ? externalAcademicClasses
        : EMPTY_CLASSES;

    const [academicClasses, setAcademicClasses] = useState(
        safeExternalAcademicClasses
    );

    const [optionsLoading, setOptionsLoading] = useState(false);

    const [promotionForm, setPromotionForm] = useState(initialPromotionForm);
    const [promotionLoading, setPromotionLoading] = useState(false);

    const [reportFilters, setReportFilters] = useState(initialReportFilters);
    const [reportStudents, setReportStudents] = useState([]);
    const [reportLoading, setReportLoading] = useState(false);

    const optionsLoadedRef = useRef(false);
    const previewLoadedRef = useRef(false);

    const toast = useCallback(
        (message, type = "success") => {
            if (showToast) showToast(message, type);
            else console[type === "error" ? "error" : "log"](message);
        },
        [showToast]
    );

    const batchOptions = [
        { id: 1, name: getAcademicYearBatch() },
    ];

    const divisionOptions = [
        { id: 1, name: "1st" },
        { id: 2, name: "2nd" },
        { id: 3, name: "3rd" },
        { id: 4, name: "4th" },
        { id: 5, name: "5th" },
        { id: 6, name: "6th" },
        { id: 7, name: "7th" },
        { id: 8, name: "8th" },
        { id: 9, name: "9th" },
        { id: 10, name: "10th" },
    ];

    const sectionOptions = [
        { id: 1, name: "A" },
        { id: 2, name: "B" },
        { id: 3, name: "C" },
        { id: 4, name: "D" },
    ];

    const normalizeClass = useCallback((item = {}) => {
        return {
            id: item.id || item.academic_class_id,

            batch_id: item.batch_id || "",
            division_id: item.division_id || "",
            section_id: item.section_id || "",

            batch_name: item.batch_name || "",
            division_name: item.division_name || "",
            section_name: item.section_name || "",
        };
    }, []);

    useEffect(() => {
        if (safeExternalAcademicClasses.length > 0) {
            setAcademicClasses(safeExternalAcademicClasses);
            optionsLoadedRef.current = true;
        }
    }, [safeExternalAcademicClasses]);

    const loadAcademicOptions = useCallback(
        async (force = false) => {
            if (!fetchWithAuth) return;
            if (optionsLoadedRef.current && !force) return;

            optionsLoadedRef.current = true;
            setOptionsLoading(true);

            try {
                const res = await fetchWithAuth(`${BASE_URL}/admin/student/enrollment-options`);
                const data = await res.json().catch(() => ({}));

                if (!res.ok) {
                    optionsLoadedRef.current = false;
                    toast(data.error || "Failed to load academic options", "error");
                    return;
                }

                const directClasses =
                    data.academic_classes ||
                    data.academicClasses ||
                    data.classes ||
                    data.academicClassesList ||
                    [];

                let classes = [];

                if (Array.isArray(directClasses) && directClasses.length > 0) {
                    classes = directClasses.map(normalizeClass);
                } else {
                    const batches = data.batches || [];
                    const divisions = data.divisions || [];
                    const sections = data.sections || [];

                    classes = [];

                    batches.forEach((batch) => {
                        divisions.forEach((division) => {
                            sections.forEach((section) => {
                                classes.push({
                                    id:
                                        section.academic_class_id ||
                                        division.academic_class_id ||
                                        batch.academic_class_id ||
                                        `${batch.id || batch.batch_id}-${division.id || division.division_id}-${section.id || section.section_id}`,
                                    batch_name: batch.batch_name || batch.name || batch.batch || "",
                                    division_name:
                                        division.division_name ||
                                        division.name ||
                                        division.division ||
                                        "",
                                    section_name:
                                        section.section_name || section.name || section.section || "",
                                });
                            });
                        });
                    });
                }

                setAcademicClasses(classes.filter((item) => item.id));
            } catch (err) {
                console.error("Academic options error:", err);
                optionsLoadedRef.current = false;
                toast("Failed to load academic options", "error");
            } finally {
                setOptionsLoading(false);
            }
        },
        [fetchWithAuth, toast, normalizeClass]
    );

    const loadEnrollmentPreview = useCallback(async (force = false, academicClassId = "") => {
        if (!fetchWithAuth) return;
        if (previewLoadedRef.current && !force) return;

        previewLoadedRef.current = true;

        try {
            const query = academicClassId ? `?academic_class_id=${academicClassId}` : "";
            const res = await fetchWithAuth(`${BASE_URL}/admin/student/enrollment-preview${query}`);
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                previewLoadedRef.current = false;
                return;
            }

            setEnrollmentForm((prev) => ({
                ...prev,
                studentID: data.student_id || prev.studentID,
                userID: data.user_id || prev.userID,
                rollNumber: data.roll_number || prev.rollNumber,
            }));
        } catch (err) {
            console.error("Preview ID error:", err);
            previewLoadedRef.current = false;
        }
    }, [fetchWithAuth]);

    useEffect(() => {
        if (safeExternalAcademicClasses.length === 0) {
            loadAcademicOptions();
        }

        loadEnrollmentPreview();
    }, [safeExternalAcademicClasses.length, loadAcademicOptions, loadEnrollmentPreview]);

    const normalizedAcademicClasses = useMemo(() => {
        return (academicClasses || []).map(normalizeClass);
    }, [academicClasses, normalizeClass]);

    const enrollmentBatches = useMemo(() => {
        const currentBatch = getAcademicYearBatch();

        const apiBatches = normalizedAcademicClasses
            .map((c) => c.batch_name)
            .filter(Boolean);

        return [...new Set([currentBatch, ...apiBatches])];
    }, [normalizedAcademicClasses]);

    const enrollmentDivisions = useMemo(() => {
        const divisions = normalizedAcademicClasses
            .filter((c) => String(c.batch_name) === String(enrollmentForm.enrollBatch))
            .map((c) => c.division_name)
            .filter(Boolean);

        return [...new Set(divisions)];
    }, [normalizedAcademicClasses, enrollmentForm.enrollBatch]);

    const enrollmentSections = useMemo(() => {
        return [
            ...new Set(
                normalizedAcademicClasses
                    .filter((c) => c.batch_name === enrollmentForm.enrollBatch)
                    .filter((c) => c.division_name === enrollmentForm.enrollDivision)
                    .map((c) => c.section_name)
                    .filter(Boolean)
            ),
        ];
    }, [
        normalizedAcademicClasses,
        enrollmentForm.enrollBatch,
        enrollmentForm.enrollDivision,
    ]);

    const selectedAcademicClassId = useMemo(() => {
        const selected = normalizedAcademicClasses.find((item) => {
            return (
                String(item.batch_name) === String(enrollmentForm.enrollBatch) &&
                String(item.division_name) === String(enrollmentForm.enrollDivision) &&
                String(item.section_name) === String(enrollmentForm.enrollSection)
            );
        });

        return selected?.id || "";
    }, [normalizedAcademicClasses, enrollmentForm]);

    const handleEnrollmentChange = useCallback((e) => {
        const { id, name, value } = e.target;

        setEnrollmentForm((prev) => ({
            ...prev,
            [name || id]: value,
        }));
    }, []);

    const resetEnrollmentForm = useCallback(() => {
        setEnrollmentForm(initialEnrollmentForm);
        setEnrolledStudent(null);
    }, []);

    const buildPayload = useCallback(() => {
        return {
            first_name: enrollmentForm.firstName.trim(),
            middle_name: enrollmentForm.middleName.trim() || null,
            last_name: enrollmentForm.lastName.trim(),
            email: enrollmentForm.studentEmail.trim() || null,
            mobile: enrollmentForm.studentMobile.trim(),

            gender: enrollmentForm.gender || null,
            date_of_birth: enrollmentForm.dob || null,
            blood_group: enrollmentForm.bloodGroup.trim() || null,

            father_name: enrollmentForm.fatherName.trim() || null,
            father_mobile: enrollmentForm.fatherMobile.trim() || null,
            father_email: enrollmentForm.fatherEmail.trim() || null,

            mother_name: enrollmentForm.motherName.trim() || null,
            mother_mobile: enrollmentForm.motherMobile.trim() || null,
            mother_email: enrollmentForm.motherEmail.trim() || null,

            academic_class_id: selectedAcademicClassId,
            roll_number: enrollmentForm.rollNumber || null,

            previous_school: enrollmentForm.prevSchool.trim() || null,
            address: enrollmentForm.address.trim() || null,
            medical_conditions: enrollmentForm.medical.trim() || null,
            allergies: enrollmentForm.medical.trim() || null,
            student_id: enrollmentForm.studentID,
            user_id: enrollmentForm.userID,
            password: enrollmentForm.password || undefined,
            status: enrollmentForm.status || "Active",

        };
    }, [enrollmentForm, selectedAcademicClassId]);

    const validateEnrollment = useCallback(() => {
        if (!enrollmentForm.firstName.trim()) return "First name is required";
        if (!enrollmentForm.lastName.trim()) return "Last name is required";
        if (!enrollmentForm.studentMobile.trim()) return "Mobile number is required";
        if (!selectedAcademicClassId) {
            return "Please select valid batch, division and section";
        }

        return null;
    }, [enrollmentForm, selectedAcademicClassId]);

    const handleEnrollment = useCallback(
        async (e) => {
            e?.preventDefault?.();

            if (!fetchWithAuth) {
                toast("fetchWithAuth is not available", "error");
                return false;
            }

            const validationError = validateEnrollment();

            if (validationError) {
                toast(validationError, "error");
                return false;
            }

            setLoading(true);

            try {
                const res = await fetchWithAuth(`${BASE_URL}/admin/student/enroll`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(buildPayload()),
                });

                const data = await res.json().catch(() => ({}));

                if (!res.ok) {
                    toast(data.error || "Student enrollment failed", "error");
                    return false;
                }

                setEnrolledStudent(data.student || null);

                previewLoadedRef.current = false;

                setEnrollmentForm({
                    ...initialEnrollmentForm,
                    studentID: data.next_preview?.student_id || "",
                    userID: data.next_preview?.user_id || "",
                });

                setReportStudents((prev) => [
                    {
                        id: data.student?.id,
                        student_id: data.student?.student_id,
                        user_id: data.student?.user_id,
                        first_name: enrollmentForm.firstName,
                        last_name: enrollmentForm.lastName,
                        batch_name: enrollmentForm.enrollBatch,
                        division_name: enrollmentForm.enrollDivision,
                        section_name: enrollmentForm.enrollSection,
                        roll_number: enrollmentForm.rollNumber,
                    },
                    ...prev,
                ]);

                toast(data.message || "Student enrolled successfully");
                return true;
            } catch (err) {
                console.error("Enrollment error:", err);
                toast("Something went wrong while enrolling student", "error");
                return false;
            } finally {
                setLoading(false);
            }
        },
        [fetchWithAuth, toast, validateEnrollment, buildPayload, enrollmentForm]
    );

    const handleWholeClassPromotion = useCallback(async () => {
        if (!fetchWithAuth) {
            toast("fetchWithAuth is not available", "error");
            return false;
        }

        if (!promotionForm.source_class_id) {
            toast("Please select source class", "error");
            return false;
        }

        if (!promotionForm.target_class_id) {
            toast("Please select target class", "error");
            return false;
        }

        if (promotionForm.source_class_id === promotionForm.target_class_id) {
            toast("Source and target class cannot be same", "error");
            return false;
        }

        const confirmPromotion = window.confirm(
            "Are you sure you want to promote all students from selected source class?"
        );

        if (!confirmPromotion) return false;

        setPromotionLoading(true);

        try {
            const res = await fetchWithAuth(`${BASE_URL}/admin/student/promote`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    promotion_type: "whole_class",
                    source_class_id: promotionForm.source_class_id,
                    target_class_id: promotionForm.target_class_id,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                toast(data.error || "Promotion failed", "error");
                return false;
            }

            toast(data.message || "Students promoted successfully");
            setPromotionForm(initialPromotionForm);
            return true;
        } catch (err) {
            console.error("Promotion error:", err);
            toast("Something went wrong while promoting students", "error");
            return false;
        } finally {
            setPromotionLoading(false);
        }
    }, [fetchWithAuth, promotionForm, toast]);

    const loadReportStudents = useCallback(async () => {
        if (!reportApiUrl) {
            toast(
                "Report list API is not added yet. Showing locally enrolled students only.",
                "error"
            );
            return;
        }

        if (!fetchWithAuth) return;

        setReportLoading(true);

        try {
            const params = new URLSearchParams();

            if (reportFilters.batch) params.append("batch", reportFilters.batch);
            if (reportFilters.division) {
                params.append("division", reportFilters.division);
            }
            if (reportFilters.section) params.append("section", reportFilters.section);
            if (reportFilters.date) params.append("date", reportFilters.date);

            const res = await fetchWithAuth(`${reportApiUrl}?${params.toString()}`);
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                toast(data.error || "Failed to load students", "error");
                return;
            }

            setReportStudents(data.students || data.data || []);
        } catch (err) {
            console.error("Report load error:", err);
            toast("Failed to load report students", "error");
        } finally {
            setReportLoading(false);
        }
    }, [fetchWithAuth, reportApiUrl, reportFilters, toast]);

    const filteredReportStudents = useMemo(() => {
        return reportStudents.filter((student) => {
            const batchOk =
                !reportFilters.batch || student.batch_name === reportFilters.batch;
            const divisionOk =
                !reportFilters.division ||
                student.division_name === reportFilters.division;
            const sectionOk =
                !reportFilters.section || student.section_name === reportFilters.section;

            return batchOk && divisionOk && sectionOk;
        });
    }, [reportStudents, reportFilters]);

    const downloadCSV = useCallback(() => {
        const rows = filteredReportStudents;

        if (!rows.length) {
            toast("No student data available to download", "error");
            return;
        }

        const headers = ["ID", "Student Name", "Batch", "Class", "Section", "Roll"];

        const csvRows = rows.map((s) => [
            s.student_id || s.id || "",
            `${s.first_name || ""} ${s.last_name || ""}`.trim(),
            s.batch_name || "",
            s.division_name || "",
            s.section_name || "",
            s.roll_number || "",
        ]);

        const csvContent = [headers, ...csvRows]
            .map((row) =>
                row
                    .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
                    .join(",")
            )
            .join("\n");

        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `student-report-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();

        URL.revokeObjectURL(url);
    }, [filteredReportStudents, toast]);

    return {
        enrollmentActiveTab: activeTab,
        setEnrollmentActiveTab: setActiveTab,

        studentEnrollmentForm: enrollmentForm,
        setStudentEnrollmentForm: setEnrollmentForm,
        handleStudentEnrollmentChange: handleEnrollmentChange,
        submitStudentEnrollment: handleEnrollment,
        resetStudentEnrollmentForm: resetEnrollmentForm,

        studentEnrollmentLoading: loading,
        latestEnrolledStudent: enrolledStudent,
        selectedEnrollmentAcademicClassId: selectedAcademicClassId,

        enrollmentAcademicClasses: normalizedAcademicClasses,
        setEnrollmentAcademicClasses: setAcademicClasses,
        enrollmentBatches,
        enrollmentDivisions,
        enrollmentSections,
        enrollmentOptionsLoading: optionsLoading,
        reloadEnrollmentAcademicOptions: () => loadAcademicOptions(true),
        reloadStudentEnrollmentPreview: () => loadEnrollmentPreview(true),

        studentPromotionForm: promotionForm,
        setStudentPromotionForm: setPromotionForm,
        studentPromotionLoading: promotionLoading,
        promoteWholeClassStudents: handleWholeClassPromotion,

        studentReportFilters: reportFilters,
        setStudentReportFilters: setReportFilters,
        studentReportRows: filteredReportStudents,
        setStudentReportRows: setReportStudents,
        studentReportLoading: reportLoading,
        loadStudentReportRows: loadReportStudents,
        downloadStudentReportCSV: downloadCSV,
    };
}