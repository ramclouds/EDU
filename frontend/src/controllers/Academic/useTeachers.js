import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BASE_URL } from "../../config/appConfig";

// Backend: utils/TeacherManagement.py
//   GET/POST  /api/admin/teachers
//   GET/PUT/DELETE /api/admin/teachers/<id>
//   PUT /api/admin/teachers/<id>/assignments
//   PUT /api/admin/teachers/<id>/password
//   PUT /api/admin/teachers/<id>/status
//   GET /api/admin/teachers/options
//
// Note: this backend returns plain {"error": ...} / {"message": ...}
// with the status code carrying success/failure - there's no
// "success" boolean in the payload like the other academic APIs, so
// this hook checks response.ok instead.
const TEACHERS_ENDPOINT = `${BASE_URL}/admin/teachers`;
const TEACHER_OPTIONS_ENDPOINT = `${BASE_URL}/admin/teachers/options`;

const EMPTY_STATS = { total: 0, active: 0, inactive: 0 };
const EMPTY_OPTIONS = { academic_classes: [], subjects: [], batches: [], divisions: [], sections: [] };

const EMPTY_TEACHER_FORM = {
  id: null,
  first_name: "",
  middle_name: "",
  last_name: "",
  email: "",
  mobile: "",
  username: "",
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
  employment_type: "",
  shift: "",
  medical_condition: "",
  emergency_name: "",
  emergency_relation: "",
  emergency_phone: "",
  status: "Active",
  password: "",
  assignments: [], // [{ academic_class_id, subject_id }]
};

export function useTeachers() {
  const navigate = useNavigate();

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const handleUnauthorized = useCallback(
    (response) => {
      if (response.status === 401) {
        localStorage.clear();
        navigate("/");
        return true;
      }
      return false;
    },
    [navigate],
  );

  /* ================= ROSTER ================= */
  const [teachers, setTeachers] = useState([]);
  const [teacherStats, setTeacherStats] = useState(EMPTY_STATS);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [teacherStatusFilter, setTeacherStatusFilter] = useState("");

  const loadTeachers = useCallback(
    async (overrides = {}) => {
      setTeachersLoading(true);
      try {
        const params = new URLSearchParams();
        const q = overrides.search ?? teacherSearch;
        const status = overrides.status ?? teacherStatusFilter;

        if (q) params.set("q", q);
        if (status) params.set("status", status);

        const response = await fetch(`${TEACHERS_ENDPOINT}?${params.toString()}`, {
          headers: authHeaders(),
        });

        if (handleUnauthorized(response)) return;

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load teachers");
        }

        setTeachers(data.teachers || []);
        setTeacherStats(data.stats || EMPTY_STATS);
      } catch (err) {
        console.error("Load teachers failed:", err);
        setTeachers([]);
      } finally {
        setTeachersLoading(false);
      }
    },
    [authHeaders, handleUnauthorized, teacherSearch, teacherStatusFilter],
  );

  /* ================= OPTIONS (classes + subjects for assignments) ================= */
  const [teacherOptions, setTeacherOptions] = useState(EMPTY_OPTIONS);
  const [teacherOptionsLoading, setTeacherOptionsLoading] = useState(true);

  const loadTeacherOptions = useCallback(async () => {
    setTeacherOptionsLoading(true);
    try {
      const response = await fetch(TEACHER_OPTIONS_ENDPOINT, {
        headers: authHeaders(),
      });

      if (handleUnauthorized(response)) return;

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load options");
      }

      setTeacherOptions({
        academic_classes: data.academic_classes || [],
        subjects: data.subjects || [],
        batches: data.batches || [],
        divisions: data.divisions || [],
        sections: data.sections || [],
      });
    } catch (err) {
      console.error("Load teacher options failed:", err);
      setTeacherOptions(EMPTY_OPTIONS);
    } finally {
      setTeacherOptionsLoading(false);
    }
  }, [authHeaders, handleUnauthorized]);

  /* ================= ADD / EDIT MODAL ================= */
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [teacherForm, setTeacherForm] = useState(EMPTY_TEACHER_FORM);
  const [teacherErrors, setTeacherErrors] = useState({});
  const [teacherSaving, setTeacherSaving] = useState(false);
  const [teacherSaveResult, setTeacherSaveResult] = useState(null);

  const openCreateTeacherModal = useCallback(() => {
    setTeacherForm(EMPTY_TEACHER_FORM);
    setTeacherErrors({});
    setTeacherSaveResult(null);
    setTeacherModalOpen(true);
    loadTeacherOptions();
  }, [loadTeacherOptions]);

  const openEditTeacherModal = useCallback(
    (teacher) => {
      setTeacherForm({
        ...EMPTY_TEACHER_FORM,
        ...teacher,
        password: "",
        assignments: (teacher.assignments || []).map((a) => ({
          academic_class_id: a.academic_class_id,
          subject_id: a.subject_id,
        })),
      });
      setTeacherErrors({});
      setTeacherSaveResult(null);
      setTeacherModalOpen(true);
      loadTeacherOptions();
    },
    [loadTeacherOptions],
  );

  const closeTeacherModal = useCallback(() => {
    if (teacherSaving) return;
    setTeacherModalOpen(false);
  }, [teacherSaving]);

  const updateTeacherForm = useCallback((field, value) => {
    setTeacherForm((prev) => ({ ...prev, [field]: value }));
    setTeacherErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

  const addAssignmentRow = useCallback(() => {
    setTeacherForm((prev) => ({
      ...prev,
      assignments: [...prev.assignments, { academic_class_id: "", subject_id: "" }],
    }));
  }, []);

  const updateAssignmentRow = useCallback((index, field, value) => {
    setTeacherForm((prev) => {
      const next = [...prev.assignments];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, assignments: next };
    });
  }, []);

  const removeAssignmentRow = useCallback((index) => {
    setTeacherForm((prev) => ({
      ...prev,
      assignments: prev.assignments.filter((_, i) => i !== index),
    }));
  }, []);

  const saveTeacher = useCallback(
    async (event) => {
      event?.preventDefault?.();

      const errors = {};
      if (!teacherForm.first_name.trim()) errors.first_name = "Required";
      if (!teacherForm.last_name.trim()) errors.last_name = "Required";
      if (!teacherForm.email.trim()) errors.email = "Required";

      if (Object.keys(errors).length > 0) {
        setTeacherErrors(errors);
        return;
      }

      setTeacherSaving(true);
      try {
        const isEdit = Boolean(teacherForm.id);
        const url = isEdit ? `${TEACHERS_ENDPOINT}/${teacherForm.id}` : TEACHERS_ENDPOINT;

        const payload = { ...teacherForm };
        delete payload.id;
        delete payload.full_name;
        delete payload.created_at;
        if (!payload.password) delete payload.password;

        const validAssignments = payload.assignments.filter(
          (a) => a.academic_class_id && a.subject_id,
        );
        payload.assignments = validAssignments;

        const response = await fetch(url, {
          method: isEdit ? "PUT" : "POST",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });

        if (handleUnauthorized(response)) return;

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          setTeacherErrors({ form: data?.error || "Failed to save teacher" });
          return;
        }

        setTeacherSaveResult({
          teacher: data.teacher,
          defaultPassword: data.default_password || null,
          isEdit,
        });
        await loadTeachers();
      } catch (err) {
        console.error("Save teacher failed:", err);
        setTeacherErrors({ form: "Failed to save teacher" });
      } finally {
        setTeacherSaving(false);
      }
    },
    [authHeaders, handleUnauthorized, loadTeachers, teacherForm],
  );

  /* ================= VIEW DETAIL ================= */
  const [detailModal, setDetailModal] = useState({ open: false, teacherId: null });
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const openTeacherDetail = useCallback(
    async (teacher) => {
      setDetailModal({ open: true, teacherId: teacher.id });
      setDetailData(null);
      setDetailError("");
      setDetailLoading(true);
      try {
        const response = await fetch(`${TEACHERS_ENDPOINT}/${teacher.id}`, {
          headers: authHeaders(),
        });

        if (handleUnauthorized(response)) return;

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load teacher");
        }

        setDetailData(data.teacher);
      } catch (err) {
        console.error("Load teacher detail failed:", err);
        setDetailError(err.message || "Failed to load teacher");
      } finally {
        setDetailLoading(false);
      }
    },
    [authHeaders, handleUnauthorized],
  );

  const closeTeacherDetail = useCallback(() => {
    setDetailModal({ open: false, teacherId: null });
    setDetailData(null);
    setDetailError("");
  }, []);

  /* ================= DELETE ================= */
  const [deleteModal, setDeleteModal] = useState({ open: false, teacher: null });
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const requestDeleteTeacher = useCallback((teacher) => {
    setDeleteError("");
    setDeleteModal({ open: true, teacher });
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (deleting) return;
    setDeleteModal({ open: false, teacher: null });
    setDeleteError("");
  }, [deleting]);

  const deleteTeacher = useCallback(async () => {
    const teacher = deleteModal.teacher;
    if (!teacher) return;

    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch(`${TEACHERS_ENDPOINT}/${teacher.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (handleUnauthorized(response)) return;

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setDeleteError(data?.error || "Failed to delete teacher");
        return;
      }

      setDeleteModal({ open: false, teacher: null });
      await loadTeachers();
    } catch (err) {
      console.error("Delete teacher failed:", err);
      setDeleteError("Failed to delete teacher");
    } finally {
      setDeleting(false);
    }
  }, [authHeaders, deleteModal.teacher, handleUnauthorized, loadTeachers]);

  /* ================= STATUS CHANGE ================= */
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const changeTeacherStatus = useCallback(
    async (teacher, status) => {
      setStatusUpdatingId(teacher.id);
      try {
        const response = await fetch(`${TEACHERS_ENDPOINT}/${teacher.id}/status`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ status }),
        });

        if (handleUnauthorized(response)) return;

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          console.error(data?.error || "Failed to update status");
          return;
        }

        await loadTeachers();
      } catch (err) {
        console.error("Change teacher status failed:", err);
      } finally {
        setStatusUpdatingId(null);
      }
    },
    [authHeaders, handleUnauthorized, loadTeachers],
  );

  /* ================= PASSWORD RESET ================= */
  const [passwordModal, setPasswordModal] = useState({ open: false, teacher: null });
  const [passwordValue, setPasswordValue] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const openPasswordModal = useCallback((teacher) => {
    setPasswordModal({ open: true, teacher });
    setPasswordValue("");
    setPasswordError("");
    setPasswordSuccess(false);
  }, []);

  const closePasswordModal = useCallback(() => {
    if (passwordSaving) return;
    setPasswordModal({ open: false, teacher: null });
    setPasswordValue("");
    setPasswordError("");
    setPasswordSuccess(false);
  }, [passwordSaving]);

  const submitPasswordReset = useCallback(
    async (event) => {
      event?.preventDefault?.();

      if (!passwordValue || passwordValue.length < 6) {
        setPasswordError("Password must be at least 6 characters");
        return;
      }

      const teacher = passwordModal.teacher;
      if (!teacher) return;

      setPasswordSaving(true);
      setPasswordError("");
      try {
        const response = await fetch(`${TEACHERS_ENDPOINT}/${teacher.id}/password`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ password: passwordValue }),
        });

        if (handleUnauthorized(response)) return;

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          setPasswordError(data?.error || "Failed to reset password");
          return;
        }

        setPasswordSuccess(true);
      } catch (err) {
        console.error("Reset password failed:", err);
        setPasswordError("Failed to reset password");
      } finally {
        setPasswordSaving(false);
      }
    },
    [authHeaders, handleUnauthorized, passwordModal.teacher, passwordValue],
  );

  useEffect(() => {
    loadTeachers();
    loadTeacherOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    teachers,
    teacherStats,
    teachersLoading,
    teacherSearch,
    setTeacherSearch,
    teacherStatusFilter,
    setTeacherStatusFilter,
    loadTeachers,

    teacherOptions,
    teacherOptionsLoading,

    teacherModalOpen,
    teacherForm,
    teacherErrors,
    teacherSaving,
    teacherSaveResult,
    openCreateTeacherModal,
    openEditTeacherModal,
    closeTeacherModal,
    updateTeacherForm,
    addAssignmentRow,
    updateAssignmentRow,
    removeAssignmentRow,
    saveTeacher,

    detailModal,
    detailData,
    detailLoading,
    detailError,
    openTeacherDetail,
    closeTeacherDetail,

    deleteModal,
    deleting,
    deleteError,
    requestDeleteTeacher,
    closeDeleteModal,
    deleteTeacher,

    statusUpdatingId,
    changeTeacherStatus,

    passwordModal,
    passwordValue,
    setPasswordValue,
    passwordSaving,
    passwordError,
    passwordSuccess,
    openPasswordModal,
    closePasswordModal,
    submitPasswordReset,
  };
}

export default useTeachers;
