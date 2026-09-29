import { useCallback, useEffect, useMemo, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

const emptyTeacherForm = {
    id: null,
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    mobile: "",
    username: "",
    password: "",
    teacher_id: "",
    gender: "",
    date_of_birth: "",
    blood_group: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    designation: "",
    degree: "",
    university: "",
    experience_years: "",
    specialization: "",
    joining_date: "",
    employment_type: "Full Time",
    shift: "Morning",
    medical_condition: "",
    emergency_name: "",
    emergency_relation: "",
    emergency_phone: "",
    status: "Active",
    assignments: [],
};

export function useTeacherManagement({ activeSection, fetchWithAuth, showToast }) {
    const [teachers, setTeachers] = useState([]);
    const [teacherOptions, setTeacherOptions] = useState({
        academic_classes: [],
        subjects: [],
        batches: [],
        divisions: [],
        sections: [],
    });

    const [teacherForm, setTeacherForm] = useState(emptyTeacherForm);
    const [selectedTeacher, setSelectedTeacher] = useState(null);

    const [teacherModalOpen, setTeacherModalOpen] = useState(false);
    const [teacherViewModalOpen, setTeacherViewModalOpen] = useState(false);

    const [teacherLoading, setTeacherLoading] = useState(false);
    const [teacherSaving, setTeacherSaving] = useState(false);

    const [teacherFilters, setTeacherFilters] = useState({
        q: "",
        status: "",
    });

    const apiFetch = useCallback(
        async (url, options = {}) => {
            const fn = typeof fetchWithAuth === "function" ? fetchWithAuth : fetch;
            const res = await fn(url, {
                headers: {
                    "Content-Type": "application/json",
                    ...(options.headers || {}),
                },
                ...options,
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.error || data.message || "Request failed");
            }

            return data;
        },
        [fetchWithAuth]
    );

    const loadTeacherOptions = useCallback(async () => {
        try {
            const data = await apiFetch(`${BASE_URL}/admin/teachers/options`);
            setTeacherOptions({
                academic_classes: data.academic_classes || [],
                subjects: data.subjects || [],
                batches: data.batches || [],
                divisions: data.divisions || [],
                sections: data.sections || [],
            });
        } catch (err) {
            showToast?.(err.message || "Failed to load teacher options", "error");
        }
    }, [apiFetch, showToast]);

    const loadTeachers = useCallback(async () => {
        try {
            setTeacherLoading(true);

            const params = new URLSearchParams();
            if (teacherFilters.q) params.set("q", teacherFilters.q);
            if (teacherFilters.status) params.set("status", teacherFilters.status);

            const data = await apiFetch(
                `${BASE_URL}/admin/teachers?${params.toString()}`
            );

            setTeachers(data.teachers || []);
        } catch (err) {
            showToast?.(err.message || "Failed to load teachers", "error");
        } finally {
            setTeacherLoading(false);
        }
    }, [apiFetch, teacherFilters, showToast]);

    useEffect(() => {
        if (activeSection !== "teachers") return;

        loadTeacherOptions();
        loadTeachers();
    }, [activeSection]);

    const updateTeacherFilter = useCallback((name, value) => {
        setTeacherFilters((prev) => ({ ...prev, [name]: value }));
    }, []);

    const resetTeacherFilter = useCallback(() => {
        setTeacherFilters({ q: "", status: "" });
    }, []);

    const updateTeacherForm = useCallback((name, value) => {
        setTeacherForm((prev) => ({ ...prev, [name]: value }));
    }, []);

    const openAddTeacher = useCallback(() => {
        setTeacherForm(emptyTeacherForm);
        setSelectedTeacher(null);
        setTeacherModalOpen(true);
    }, []);

    const openEditTeacher = useCallback((teacher) => {
        setSelectedTeacher(teacher);
        setTeacherForm({
            ...emptyTeacherForm,
            ...teacher,
            password: "",
            assignments: teacher.assignments || [],
        });
        setTeacherModalOpen(true);
    }, []);

    const closeTeacherModal = useCallback(() => {
        setTeacherModalOpen(false);
        setTeacherForm(emptyTeacherForm);
        setSelectedTeacher(null);
    }, []);

    const openViewTeacher = useCallback((teacher) => {
        setSelectedTeacher(teacher);
        setTeacherViewModalOpen(true);
    }, []);

    const closeViewTeacher = useCallback(() => {
        setSelectedTeacher(null);
        setTeacherViewModalOpen(false);
    }, []);

    const addTeacherAssignment = useCallback(() => {
        setTeacherForm((prev) => ({
            ...prev,
            assignments: [
                ...(prev.assignments || []),
                { academic_class_id: "", subject_id: "" },
            ],
        }));
    }, []);

    const updateTeacherAssignment = useCallback((index, name, value) => {
        setTeacherForm((prev) => {
            const assignments = [...(prev.assignments || [])];
            assignments[index] = {
                ...assignments[index],
                [name]: value ? Number(value) : "",
            };
            return { ...prev, assignments };
        });
    }, []);

    const removeTeacherAssignment = useCallback((index) => {
        setTeacherForm((prev) => ({
            ...prev,
            assignments: (prev.assignments || []).filter((_, i) => i !== index),
        }));
    }, []);

    const saveTeacher = useCallback(async () => {
        try {
            setTeacherSaving(true);

            const payload = {
                ...teacherForm,
                experience_years: teacherForm.experience_years
                    ? Number(teacherForm.experience_years)
                    : 0,
                assignments: (teacherForm.assignments || []).filter(
                    (a) => a.academic_class_id && a.subject_id
                ),
            };

            if (!payload.password) delete payload.password;

            if (teacherForm.id) {
                await apiFetch(`${BASE_URL}/admin/teachers/${teacherForm.id}`, {
                    method: "PUT",
                    body: JSON.stringify(payload),
                });
                showToast?.("Teacher updated successfully", "success");
            } else {
                await apiFetch(`${BASE_URL}/admin/teachers`, {
                    method: "POST",
                    body: JSON.stringify(payload),
                });
                showToast?.("Teacher added successfully", "success");
            }

            closeTeacherModal();
            await loadTeachers();
        } catch (err) {
            showToast?.(err.message || "Failed to save teacher", "error");
        } finally {
            setTeacherSaving(false);
        }
    }, [
        apiFetch,
        teacherForm,
        showToast,
        closeTeacherModal,
        loadTeachers,
    ]);

    const deleteTeacher = useCallback(
        async (teacherId) => {
            const ok = window.confirm("Delete this teacher?");
            if (!ok) return;

            try {
                await apiFetch(`${BASE_URL}/admin/teachers/${teacherId}`, {
                    method: "DELETE",
                });

                showToast?.("Teacher deleted successfully", "success");
                await loadTeachers();
            } catch (err) {
                showToast?.(err.message || "Failed to delete teacher", "error");
            }
        },
        [apiFetch, loadTeachers, showToast]
    );

    const updateTeacherStatus = useCallback(
        async (teacherId, status) => {
            try {
                await apiFetch(`${BASE_URL}/admin/teachers/${teacherId}/status`, {
                    method: "PUT",
                    body: JSON.stringify({ status }),
                });

                showToast?.("Teacher status updated", "success");
                await loadTeachers();
            } catch (err) {
                showToast?.(err.message || "Failed to update status", "error");
            }
        },
        [apiFetch, loadTeachers, showToast]
    );

    const stats = useMemo(() => {
        const total = teachers.length;
        const active = teachers.filter((t) => t.status === "Active").length;
        const inactive = teachers.filter((t) => t.status === "Inactive").length;
        const suspended = teachers.filter((t) => t.status === "Suspended").length;

        return { total, active, inactive, suspended };
    }, [teachers]);

    const BLOOD_GROUPS = [
        "A+",
        "A-",
        "B+",
        "B-",
        "AB+",
        "AB-",
        "O+",
        "O-",
    ];

    return {
        // DATA
        teacherManagementTeachers: teachers,
        teacherManagementOptions: teacherOptions,
        teacherManagementForm: teacherForm,
        teacherManagementSelectedTeacher: selectedTeacher,

        // MODALS
        teacherManagementModalOpen: teacherModalOpen,
        teacherManagementViewModalOpen: teacherViewModalOpen,

        // LOADING
        teacherManagementLoading: teacherLoading,
        teacherManagementSaving: teacherSaving,

        // FILTERS
        teacherManagementFilters: teacherFilters,
        updateTeacherManagementFilter: updateTeacherFilter,
        resetTeacherManagementFilter: resetTeacherFilter,

        // STATS
        teacherManagementStats: stats,

        // LOADERS
        loadTeacherManagementTeachers: loadTeachers,
        loadTeacherManagementOptions: loadTeacherOptions,

        // FORM
        updateTeacherManagementForm: updateTeacherForm,

        // MODALS
        openTeacherManagementAddModal: openAddTeacher,
        openTeacherManagementEditModal: openEditTeacher,
        closeTeacherManagementModal: closeTeacherModal,

        openTeacherManagementViewModal: openViewTeacher,
        closeTeacherManagementViewModal: closeViewTeacher,

        // ASSIGNMENTS
        addTeacherManagementAssignment: addTeacherAssignment,
        updateTeacherManagementAssignment: updateTeacherAssignment,
        removeTeacherManagementAssignment: removeTeacherAssignment,

        // CRUD
        saveTeacherManagementTeacher: saveTeacher,
        deleteTeacherManagementTeacher: deleteTeacher,
        updateTeacherManagementStatus: updateTeacherStatus,
        BLOOD_GROUPS,
    };
}