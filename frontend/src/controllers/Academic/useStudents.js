import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BASE_URL } from "../../config/appConfig";

// Backend:
//   GET  /api/admin/student/enrollment-options   -> StudentEnrollmentOptionsAPI (studentEnrollment.py)
//   GET  /api/admin/student/enrollment-preview   -> StudentEnrollmentPreviewAPI (studentEnrollment.py)
//   POST /api/admin/student/enroll               -> EnrollStudentAPI (studentEnrollment.py)
//
// NOTE: this hook used to also carry a full student roster + detail-view
// (list/search/filter, GET /api/admin/students, GET /api/student/<id>).
// That's been removed - the "My Classes" browse UI (useMyClass.js) now
// owns roster browsing and student profile viewing. This hook is scoped
// to just the Enroll Student flow.
const ENROLLMENT_OPTIONS_ENDPOINT = `${BASE_URL}/admin/student/enrollment-options`;
const ENROLLMENT_PREVIEW_ENDPOINT = `${BASE_URL}/admin/student/enrollment-preview`;
const ENROLL_ENDPOINT = `${BASE_URL}/admin/student/enroll`;

const EMPTY_OPTIONS = { batches: [], divisions: [], sections: [], academic_classes: [] };

const EMPTY_ENROLL_FORM = {
  student_id: "",
  user_id: "",
  password: "",
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
  father_email: "",
  mother_name: "",
  mother_mobile: "",
  mother_email: "",
  emergency_contact_name: "",
  emergency_contact_number: "",
  emergency_contact_relation: "",
  previous_school: "",
  medical_conditions: "",
  allergies: "",
  admission_date: "",
  status: "Active",
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

        // Auto-fill the editable fields with the suggested values, but
        // never overwrite something the admin already typed in manually.
        setEnrollForm((prev) => ({
          ...prev,
          student_id: prev.student_id || data.student_id || "",
          user_id: prev.user_id || data.user_id || "",
          roll_number: prev.roll_number || data.roll_number || "",
        }));
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

      const required = [
        "first_name",
        "last_name",
        "mobile",
        "academic_class_id",
        "student_id",
        "user_id",
      ];
      const errors = {};
      required.forEach((field) => {
        if (!String(enrollForm[field] || "").trim()) {
          errors[field] = "This field is required";
        }
      });

      if (
        enrollForm.password &&
        String(enrollForm.password).trim().length > 0 &&
        String(enrollForm.password).trim().length < 6
      ) {
        errors.password = "Password must be at least 6 characters";
      }

      if (Object.keys(errors).length > 0) {
        setEnrollErrors(errors);
        return;
      }

      setEnrollSaving(true);
      try {
        const payload = { ...enrollForm };
        payload.academic_class_id = Number(enrollForm.academic_class_id);
        payload.roll_number = enrollForm.roll_number || enrollPreview.roll_number;
        // Only send a password if the admin actually set one - leave it
        // out entirely so the backend falls back to its own default
        // (last 4 digits of mobile) rather than sending an empty string.
        if (!payload.password) delete payload.password;

        const response = await fetch(ENROLL_ENDPOINT, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });

        if (handleUnauthorized(response)) return;

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          setEnrollErrors({ form: data?.error || "Failed to enroll student" });
          return;
        }

        setEnrollResult(data.student);
      } catch (err) {
        console.error("Enroll student failed:", err);
        setEnrollErrors({ form: "Failed to enroll student" });
      } finally {
        setEnrollSaving(false);
      }
    },
    [authHeaders, enrollForm, enrollPreview, handleUnauthorized],
  );

  const enrollAnother = useCallback(() => {
    setEnrollForm(EMPTY_ENROLL_FORM);
    setEnrollErrors({});
    setEnrollResult(null);
    loadEnrollPreview(null);
  }, [loadEnrollPreview]);

  useEffect(() => {
    loadEnrollOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
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
  };
}

export default useStudents;
