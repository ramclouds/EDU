import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BASE_URL } from "../../config/appConfig";

// Backend: utils/academic.py -> AdminAcademicClassesAPI /
// AdminAcademicClassDetailAPI / AdminAcademicSetupOptionsAPI
const CLASSES_ENDPOINT = `${BASE_URL}/admin/academic/classes`;
const BATCHES_ENDPOINT = `${BASE_URL}/admin/academic/batches`;
const OPTIONS_ENDPOINT = `${BASE_URL}/admin/academic/setup-options`;

const EMPTY_STATS = { total: 0, total_students_assigned: 0 };
const EMPTY_OPTIONS = { batches: [], divisions: [], sections: [] };
const EMPTY_FORM = {
  id: null,
  batch_id: "",
  division_id: "",
  section_id: "",
};

export function useAcademicClasses() {
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

  const [classes, setClasses] = useState([]);
  const [classStats, setClassStats] = useState(EMPTY_STATS);
  const [classLoading, setClassLoading] = useState(true);
  const [classSearch, setClassSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("");

  const [options, setOptions] = useState(EMPTY_OPTIONS);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [classModalOpen, setClassModalOpen] = useState(false);
  const [classForm, setClassForm] = useState(EMPTY_FORM);
  const [classErrors, setClassErrors] = useState({});
  const [classSaving, setClassSaving] = useState(false);

  const [classDeleteModal, setClassDeleteModal] = useState({
    open: false,
    academicClass: null,
  });
  const [classDeleting, setClassDeleting] = useState(false);
  const [classDeleteError, setClassDeleteError] = useState("");

  // Quick-create for Academic Year (Batch) right from inside the Add
  // Class form, so a non-technical admin never has to leave the modal
  // to go find a separate "Batches" page just to add "2025-26".
  const [newBatchOpen, setNewBatchOpen] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");
  const [newBatchSaving, setNewBatchSaving] = useState(false);
  const [newBatchError, setNewBatchError] = useState("");

  const loadOptions = useCallback(async () => {
    setOptionsLoading(true);
    try {
      const response = await fetch(OPTIONS_ENDPOINT, {
        headers: authHeaders(),
      });

      if (handleUnauthorized(response)) return;

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Failed to load setup options");
      }

      setOptions({
        batches: data.batches || [],
        divisions: data.divisions || [],
        sections: data.sections || [],
      });
    } catch (err) {
      console.error("Load academic setup options failed:", err);
      setOptions(EMPTY_OPTIONS);
    } finally {
      setOptionsLoading(false);
    }
  }, [authHeaders, handleUnauthorized]);

  const loadClasses = useCallback(
    async (search = classSearch, batchId = batchFilter) => {
      setClassLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (batchId) params.set("batch_id", batchId);

        const response = await fetch(
          `${CLASSES_ENDPOINT}?${params.toString()}`,
          { headers: authHeaders() },
        );

        if (handleUnauthorized(response)) return;

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          throw new Error(data?.error || "Failed to load classes");
        }

        setClasses(data.classes || []);
        setClassStats(data.stats || EMPTY_STATS);
      } catch (err) {
        console.error("Load classes failed:", err);
        setClasses([]);
      } finally {
        setClassLoading(false);
      }
    },
    [authHeaders, batchFilter, classSearch, handleUnauthorized],
  );

  const updateClassForm = useCallback((field, value) => {
    setClassForm((prev) => ({ ...prev, [field]: value }));
    setClassErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

  const openCreateClassModal = useCallback(() => {
    setClassForm(EMPTY_FORM);
    setClassErrors({});
    setClassModalOpen(true);
  }, []);

  const openEditClassModal = useCallback((academicClass) => {
    setClassForm({
      id: academicClass.id,
      batch_id: String(academicClass.batch_id || ""),
      division_id: String(academicClass.division_id || ""),
      section_id: String(academicClass.section_id || ""),
    });
    setClassErrors({});
    setClassModalOpen(true);
  }, []);

  const closeClassModal = useCallback(() => {
    if (classSaving) return;
    setClassModalOpen(false);
  }, [classSaving]);

  const saveClass = useCallback(
    async (event) => {
      event?.preventDefault?.();

      const errors = {};
      if (!classForm.batch_id) errors.batch_id = "Batch is required";
      if (!classForm.division_id) errors.division_id = "Division is required";
      if (!classForm.section_id) errors.section_id = "Section is required";

      if (Object.keys(errors).length > 0) {
        setClassErrors(errors);
        return;
      }

      setClassSaving(true);
      try {
        const isEdit = Boolean(classForm.id);
        const url = isEdit
          ? `${CLASSES_ENDPOINT}/${classForm.id}`
          : CLASSES_ENDPOINT;

        const response = await fetch(url, {
          method: isEdit ? "PUT" : "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            batch_id: Number(classForm.batch_id),
            division_id: Number(classForm.division_id),
            section_id: Number(classForm.section_id),
          }),
        });

        if (handleUnauthorized(response)) return;

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          setClassErrors({ form: data?.error || "Failed to save class" });
          return;
        }

        setClassModalOpen(false);
        await loadClasses();
      } catch (err) {
        console.error("Save class failed:", err);
        setClassErrors({ form: "Failed to save class" });
      } finally {
        setClassSaving(false);
      }
    },
    [authHeaders, classForm, handleUnauthorized, loadClasses],
  );

  const requestDeleteClass = useCallback((academicClass) => {
    setClassDeleteError("");
    setClassDeleteModal({ open: true, academicClass });
  }, []);

  const closeDeleteClassModal = useCallback(() => {
    if (classDeleting) return;
    setClassDeleteModal({ open: false, academicClass: null });
    setClassDeleteError("");
  }, [classDeleting]);

  const deleteClass = useCallback(async () => {
    const academicClass = classDeleteModal.academicClass;
    if (!academicClass) return;

    setClassDeleting(true);
    setClassDeleteError("");
    try {
      const response = await fetch(`${CLASSES_ENDPOINT}/${academicClass.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (handleUnauthorized(response)) return;

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setClassDeleteError(data?.error || "Failed to delete class");
        return;
      }

      setClassDeleteModal({ open: false, academicClass: null });
      await loadClasses();
    } catch (err) {
      console.error("Delete class failed:", err);
      setClassDeleteError("Failed to delete class");
    } finally {
      setClassDeleting(false);
    }
  }, [authHeaders, classDeleteModal.academicClass, handleUnauthorized, loadClasses]);

  const openNewBatchField = useCallback(() => {
    setNewBatchName("");
    setNewBatchError("");
    setNewBatchOpen(true);
  }, []);

  const closeNewBatchField = useCallback(() => {
    if (newBatchSaving) return;
    setNewBatchOpen(false);
    setNewBatchName("");
    setNewBatchError("");
  }, [newBatchSaving]);

  const submitNewBatch = useCallback(
    async (event) => {
      event?.preventDefault?.();

      const name = newBatchName.trim();
      if (!name) {
        setNewBatchError("Enter a name, e.g. 2025-26");
        return;
      }

      setNewBatchSaving(true);
      setNewBatchError("");
      try {
        const response = await fetch(BATCHES_ENDPOINT, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ batch_name: name }),
        });

        if (handleUnauthorized(response)) return;

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          setNewBatchError(data?.error || "Could not add this academic year");
          return;
        }

        // Refresh dropdown options, then auto-select the one we just
        // created so the admin can carry straight on filling the form.
        await loadOptions();
        setClassForm((prev) => ({
          ...prev,
          batch_id: String(data.batch.id),
        }));
        setNewBatchOpen(false);
        setNewBatchName("");
      } catch (err) {
        console.error("Create academic year failed:", err);
        setNewBatchError("Could not add this academic year");
      } finally {
        setNewBatchSaving(false);
      }
    },
    [authHeaders, handleUnauthorized, loadOptions, newBatchName],
  );

  useEffect(() => {
    loadOptions();
    loadClasses("", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    classes,
    classStats,
    classLoading,
    classSearch,
    setClassSearch,
    batchFilter,
    setBatchFilter,
    loadClasses,

    options,
    optionsLoading,
    loadOptions,

    classModalOpen,
    classForm,
    classErrors,
    classSaving,
    updateClassForm,
    openCreateClassModal,
    openEditClassModal,
    closeClassModal,
    saveClass,

    classDeleteModal,
    classDeleting,
    classDeleteError,
    requestDeleteClass,
    closeDeleteClassModal,
    deleteClass,

    // quick-create Academic Year
    newBatchOpen,
    newBatchName,
    setNewBatchName,
    newBatchSaving,
    newBatchError,
    openNewBatchField,
    closeNewBatchField,
    submitNewBatch,
  };
}

export default useAcademicClasses;
