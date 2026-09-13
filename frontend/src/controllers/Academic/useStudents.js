import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BASE_URL } from "../../config/appConfig";

const STUDENTS_ENDPOINT = `${BASE_URL}/admin/students`;
const ENROLLMENT_OPTIONS_ENDPOINT = `${BASE_URL}/admin/student/enrollment-options`;
const ENROLLMENT_PREVIEW_ENDPOINT = `${BASE_URL}/admin/student/enrollment-preview`;
const ENROLL_ENDPOINT = `${BASE_URL}/admin/student/enroll`;
const STUDENT_DETAIL_ENDPOINT = (id) => `${BASE_URL}/student/${id}`;

const EMPTY_STATS = { total: 0, active: 0, inactive: 0, unassigned: 0 };
const EMPTY_OPTIONS = { batches: [], divisions: [], sections: [], academic_classes: [] };

const EMPTY_ENROLL_FORM = {
  first_name: "",
  middle_name: "",
  last_name: "",
  email: "",
  mobile: "",
  gender: "",
  date_of_birth: "",
  blood_group: "",
  address: "",
  father_name: "",
  father_mobile: "",
  mother_name: "",
  mother_mobile: "",
  emergency_contact_name: "",
  emergency_contact_number: "",
  emergency_contact_relation: "",
  previous_school: "",
  academic_class_id: "",
  roll_number: "",
};

export function useStudents() {
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
  const [students, setStudents] = useState([]);
  const [studentStats, setStudentStats] = useState(EMPTY_STATS);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentClassFilter, setStudentClassFilter] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState("all");
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);

  const loadStudents = useCallback(
    async (overrides = {}) => {
      setStudentsLoading(true);
      try {
        const params = new URLSearchParams();
        const search = overrides.search ?? studentSearch;
        const classId = overrides.classId ?? studentClassFilter;
        const status = overrides.status ?? studentStatusFilter;
        const unassigned = overrides.unassigned ?? showUnassignedOnly;

        if (search) params.set("search", search);
        if (classId) params.set("academic_class_id", classId);
        if (status && status !== "all") params.set("status", status);
        if (unassigned) params.set("unassigned", "true");

        const response = await fetch(`${STUDENTS_ENDPOINT}?${params.toString()}`, {
          headers: authHeaders(),
        });

        if (handleUnauthorized(response)) return;

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          throw new Error(data?.error || "Failed to load students");
        }

        setStudents(data.students || []);
        setStudentStats(data.stats || EMPTY_STATS);
      } catch (err) {
        console.error("Load students failed:", err);
        setStudents([]);
      } finally {
        setStudentsLoading(false);
      }
    },
    [authHeaders, handleUnauthorized, studentSearch, studentClassFilter, studentStatusFilter, showUnassignedOnly],
  );

  /* ================= ENROLLMENT OPTIONS ================= */
  const [enrollOptions, setEnrollOptions] = useState(EMPTY_OPTIONS);
  const [enrollOptionsLoading, setEnrollOptionsLoading] = useState(true);

  const loadEnrollOptions = useCallback(async () => {
    setEnrollOptionsLoading(true);
    try {
      const response = await fetch(ENROLLMENT_OPTIONS_ENDPOINT, {
        headers: authHeaders(),
      });

      if (handleUnauthorized(response)) return;

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Failed to load enrollment options");
      }

      setEnrollOptions({
        batches: data.batches || [],
        divisions: data.divisions || [],
        sections: data.sections || [],
        academic_classes: data.academic_classes || [],
      });
    } catch (err) {
      console.error("Load enrollment options failed:", err);
      setEnrollOptions(EMPTY_OPTIONS);
    } finally {
      setEnrollOptionsLoading(false);
    }
  }, [authHeaders, handleUnauthorized]);

  /* ================= ENROLL MODAL ================= */
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollForm, setEnrollForm] = useState(EMPTY_ENROLL_FORM);
  const [enrollErrors, setEnrollErrors] = useState({});
  const [enrollSaving, setEnrollSaving] = useState(false);
  const [enrollPreview, setEnrollPreview] = useState({
    student_id: "",
    user_id: "",
    roll_number: "",
  });
  const [enrollPreviewLoading, setEnrollPreviewLoading] = useState(false);
  const [enrollResult, setEnrollResult] = useState(null);

  const loadEnrollPreview = useCallback(
    async (academicClassId) => {
      setEnrollPreviewLoading(true);
      try {
        const params = new URLSearchParams();
        if (academicClassId) params.set("academic_class_id", academicClassId);

        const response = await fetch(
          `${ENROLLMENT_PREVIEW_ENDPOINT}?${params.toString()}`,
          { headers: authHeaders() },
        );

        if (handleUnauthorized(response)) return;

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          throw new Error(data?.error || "Failed to load preview");
        }

        setEnrollPreview({
          student_id: data.student_id || "",
          user_id: data.user_id || "",
          roll_number: data.roll_number || "",
        });
      } catch (err) {
        console.error("Load enrollment preview failed:", err);
      } finally {
        setEnrollPreviewLoading(false);
      }
    },
    [authHeaders, handleUnauthorized],
  );

  const openEnrollModal = useCallback(() => {
    setEnrollForm(EMPTY_ENROLL_FORM);
    setEnrollErrors({});
    setEnrollResult(null);
    setEnrollModalOpen(true);
    loadEnrollOptions();
    loadEnrollPreview(null);
  }, [loadEnrollOptions, loadEnrollPreview]);

  const closeEnrollModal = useCallback(() => {
    if (enrollSaving) return;
    setEnrollModalOpen(false);
  }, [enrollSaving]);

  const updateEnrollForm = useCallback(
    (field, value) => {
      setEnrollForm((prev) => ({ ...prev, [field]: value }));
      setEnrollErrors((prev) => ({ ...prev, [field]: "" }));

      if (field === "academic_class_id" && value) {
        loadEnrollPreview(value);
      }
    },
    [loadEnrollPreview],
  );

  const submitEnrollment = useCallback(
    async (event) => {
      event?.preventDefault?.();

      const required = ["first_name", "last_name", "mobile", "academic_class_id"];
      const errors = {};
      required.forEach((field) => {
        if (!String(enrollForm[field] || "").trim()) {
          errors[field] = "This field is required";
        }
      });

      if (Object.keys(errors).length > 0) {
        setEnrollErrors(errors);
        return;
      }

      setEnrollSaving(true);
      try {
        const response = await fetch(ENROLL_ENDPOINT, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            ...enrollForm,
            student_id: enrollPreview.student_id,
            user_id: enrollPreview.user_id,
            roll_number: enrollForm.roll_number || enrollPreview.roll_number,
            academic_class_id: Number(enrollForm.academic_class_id),
          }),
        });

        if (handleUnauthorized(response)) return;

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          setEnrollErrors({ form: data?.error || "Failed to enroll student" });
          return;
        }

        setEnrollResult(data.student);
        await loadStudents();
      } catch (err) {
        console.error("Enroll student failed:", err);
        setEnrollErrors({ form: "Failed to enroll student" });
      } finally {
        setEnrollSaving(false);
      }
    },
    [authHeaders, enrollForm, enrollPreview, handleUnauthorized, loadStudents],
  );

  const enrollAnother = useCallback(() => {
    setEnrollForm(EMPTY_ENROLL_FORM);
    setEnrollErrors({});
    setEnrollResult(null);
    loadEnrollPreview(null);
  }, [loadEnrollPreview]);

  /* ================= VIEW STUDENT DETAIL ================= */
  const [detailModal, setDetailModal] = useState({ open: false, studentId: null });
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const openStudentDetail = useCallback(
    async (student) => {
      setDetailModal({ open: true, studentId: student.id });
      setDetailData(null);
      setDetailError("");
      setDetailLoading(true);
      try {
        const response = await fetch(STUDENT_DETAIL_ENDPOINT(student.id), {
          headers: authHeaders(),
        });

        if (handleUnauthorized(response)) return;

        const data = await response.json().catch(() => null);

        if (!response.ok || data?.error) {
          throw new Error(data?.error || "Failed to load student");
        }

        setDetailData(data);
      } catch (err) {
        console.error("Load student detail failed:", err);
        setDetailError(err.message || "Failed to load student");
      } finally {
        setDetailLoading(false);
      }
    },
    [authHeaders, handleUnauthorized],
  );

  const closeStudentDetail = useCallback(() => {
    setDetailModal({ open: false, studentId: null });
    setDetailData(null);
    setDetailError("");
  }, []);

  useEffect(() => {
    loadStudents();
    loadEnrollOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    students,
    studentStats,
    studentsLoading,
    studentSearch,
    setStudentSearch,
    studentClassFilter,
    setStudentClassFilter,
    studentStatusFilter,
    setStudentStatusFilter,
    showUnassignedOnly,
    setShowUnassignedOnly,
    loadStudents,

    enrollOptions,
    enrollOptionsLoading,

    enrollModalOpen,
    enrollForm,
    enrollErrors,
    enrollSaving,
    enrollPreview,
    enrollPreviewLoading,
    enrollResult,
    openEnrollModal,
    closeEnrollModal,
    updateEnrollForm,
    submitEnrollment,
    enrollAnother,

    detailModal,
    detailData,
    detailLoading,
    detailError,
    openStudentDetail,
    closeStudentDetail,
  };
}

export default useStudents;
