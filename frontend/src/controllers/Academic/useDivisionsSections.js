import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BASE_URL } from "../../config/appConfig";

// Backend: utils/academic.py -> AdminDivisionsAPI / AdminDivisionDetailAPI
//                                AdminSectionsAPI / AdminSectionDetailAPI
const DIVISIONS_ENDPOINT = `${BASE_URL}/admin/academic/divisions`;
const SECTIONS_ENDPOINT = `${BASE_URL}/admin/academic/sections`;

const EMPTY_DIVISION_STATS = { total: 0, in_use: 0 };
const EMPTY_SECTION_STATS = { total: 0, in_use: 0 };

const EMPTY_DIVISION_FORM = { id: null, division_name: "" };
const EMPTY_SECTION_FORM = { id: null, section_name: "" };

export function useDivisionsSections() {
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

  /* ================= DIVISIONS ================= */
  const [divisions, setDivisions] = useState([]);
  const [divisionStats, setDivisionStats] = useState(EMPTY_DIVISION_STATS);
  const [divisionLoading, setDivisionLoading] = useState(true);
  const [divisionSearch, setDivisionSearch] = useState("");

  const [divisionModalOpen, setDivisionModalOpen] = useState(false);
  const [divisionForm, setDivisionForm] = useState(EMPTY_DIVISION_FORM);
  const [divisionErrors, setDivisionErrors] = useState({});
  const [divisionSaving, setDivisionSaving] = useState(false);

  const [divisionDeleteModal, setDivisionDeleteModal] = useState({
    open: false,
    division: null,
  });
  const [divisionDeleting, setDivisionDeleting] = useState(false);
  const [divisionDeleteError, setDivisionDeleteError] = useState("");

  const loadDivisions = useCallback(
    async (search = divisionSearch) => {
      setDivisionLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);

        const response = await fetch(
          `${DIVISIONS_ENDPOINT}?${params.toString()}`,
          { headers: authHeaders() },
        );

        if (handleUnauthorized(response)) return;

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          throw new Error(data?.error || "Failed to load divisions");
        }

        setDivisions(data.divisions || []);
        setDivisionStats(data.stats || EMPTY_DIVISION_STATS);
      } catch (err) {
        console.error("Load divisions failed:", err);
        setDivisions([]);
      } finally {
        setDivisionLoading(false);
      }
    },
    [authHeaders, divisionSearch, handleUnauthorized],
  );

  const updateDivisionForm = useCallback((field, value) => {
    setDivisionForm((prev) => ({ ...prev, [field]: value }));
    setDivisionErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

  const openCreateDivisionModal = useCallback(() => {
    setDivisionForm(EMPTY_DIVISION_FORM);
    setDivisionErrors({});
    setDivisionModalOpen(true);
  }, []);

  const openEditDivisionModal = useCallback((division) => {
    setDivisionForm({
      id: division.id,
      division_name: division.division_name || "",
    });
    setDivisionErrors({});
    setDivisionModalOpen(true);
  }, []);

  const closeDivisionModal = useCallback(() => {
    if (divisionSaving) return;
    setDivisionModalOpen(false);
  }, [divisionSaving]);

  const saveDivision = useCallback(
    async (event) => {
      event?.preventDefault?.();

      const name = divisionForm.division_name.trim();
      if (!name) {
        setDivisionErrors({ division_name: "Division name is required" });
        return;
      }

      setDivisionSaving(true);
      try {
        const isEdit = Boolean(divisionForm.id);
        const url = isEdit
          ? `${DIVISIONS_ENDPOINT}/${divisionForm.id}`
          : DIVISIONS_ENDPOINT;

        const response = await fetch(url, {
          method: isEdit ? "PUT" : "POST",
          headers: authHeaders(),
          body: JSON.stringify({ division_name: name }),
        });

        if (handleUnauthorized(response)) return;

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          setDivisionErrors({
            division_name: data?.error || "Failed to save division",
          });
          return;
        }

        setDivisionModalOpen(false);
        await loadDivisions();
      } catch (err) {
        console.error("Save division failed:", err);
        setDivisionErrors({ division_name: "Failed to save division" });
      } finally {
        setDivisionSaving(false);
      }
    },
    [authHeaders, divisionForm, handleUnauthorized, loadDivisions],
  );

  const requestDeleteDivision = useCallback((division) => {
    setDivisionDeleteError("");
    setDivisionDeleteModal({ open: true, division });
  }, []);

  const closeDeleteDivisionModal = useCallback(() => {
    if (divisionDeleting) return;
    setDivisionDeleteModal({ open: false, division: null });
    setDivisionDeleteError("");
  }, [divisionDeleting]);

  const deleteDivision = useCallback(async () => {
    const division = divisionDeleteModal.division;
    if (!division) return;

    setDivisionDeleting(true);
    setDivisionDeleteError("");
    try {
      const response = await fetch(`${DIVISIONS_ENDPOINT}/${division.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (handleUnauthorized(response)) return;

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setDivisionDeleteError(data?.error || "Failed to delete division");
        return;
      }

      setDivisionDeleteModal({ open: false, division: null });
      await loadDivisions();
    } catch (err) {
      console.error("Delete division failed:", err);
      setDivisionDeleteError("Failed to delete division");
    } finally {
      setDivisionDeleting(false);
    }
  }, [authHeaders, divisionDeleteModal.division, handleUnauthorized, loadDivisions]);

  /* ================= SECTIONS ================= */
  const [sections, setSections] = useState([]);
  const [sectionStats, setSectionStats] = useState(EMPTY_SECTION_STATS);
  const [sectionLoading, setSectionLoading] = useState(true);
  const [sectionSearch, setSectionSearch] = useState("");

  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [sectionForm, setSectionForm] = useState(EMPTY_SECTION_FORM);
  const [sectionErrors, setSectionErrors] = useState({});
  const [sectionSaving, setSectionSaving] = useState(false);

  const [sectionDeleteModal, setSectionDeleteModal] = useState({
    open: false,
    section: null,
  });
  const [sectionDeleting, setSectionDeleting] = useState(false);
  const [sectionDeleteError, setSectionDeleteError] = useState("");

  const loadSections = useCallback(
    async (search = sectionSearch) => {
      setSectionLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);

        const response = await fetch(
          `${SECTIONS_ENDPOINT}?${params.toString()}`,
          { headers: authHeaders() },
        );

        if (handleUnauthorized(response)) return;

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          throw new Error(data?.error || "Failed to load sections");
        }

        setSections(data.sections || []);
        setSectionStats(data.stats || EMPTY_SECTION_STATS);
      } catch (err) {
        console.error("Load sections failed:", err);
        setSections([]);
      } finally {
        setSectionLoading(false);
      }
    },
    [authHeaders, sectionSearch, handleUnauthorized],
  );

  const updateSectionForm = useCallback((field, value) => {
    setSectionForm((prev) => ({ ...prev, [field]: value }));
    setSectionErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

  const openCreateSectionModal = useCallback(() => {
    setSectionForm(EMPTY_SECTION_FORM);
    setSectionErrors({});
    setSectionModalOpen(true);
  }, []);

  const openEditSectionModal = useCallback((section) => {
    setSectionForm({
      id: section.id,
      section_name: section.section_name || "",
    });
    setSectionErrors({});
    setSectionModalOpen(true);
  }, []);

  const closeSectionModal = useCallback(() => {
    if (sectionSaving) return;
    setSectionModalOpen(false);
  }, [sectionSaving]);

  const saveSection = useCallback(
    async (event) => {
      event?.preventDefault?.();

      const name = sectionForm.section_name.trim();
      if (!name) {
        setSectionErrors({ section_name: "Section name is required" });
        return;
      }

      setSectionSaving(true);
      try {
        const isEdit = Boolean(sectionForm.id);
        const url = isEdit
          ? `${SECTIONS_ENDPOINT}/${sectionForm.id}`
          : SECTIONS_ENDPOINT;

        const response = await fetch(url, {
          method: isEdit ? "PUT" : "POST",
          headers: authHeaders(),
          body: JSON.stringify({ section_name: name }),
        });

        if (handleUnauthorized(response)) return;

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          setSectionErrors({
            section_name: data?.error || "Failed to save section",
          });
          return;
        }

        setSectionModalOpen(false);
        await loadSections();
      } catch (err) {
        console.error("Save section failed:", err);
        setSectionErrors({ section_name: "Failed to save section" });
      } finally {
        setSectionSaving(false);
      }
    },
    [authHeaders, sectionForm, handleUnauthorized, loadSections],
  );

  const requestDeleteSection = useCallback((section) => {
    setSectionDeleteError("");
    setSectionDeleteModal({ open: true, section });
  }, []);

  const closeDeleteSectionModal = useCallback(() => {
    if (sectionDeleting) return;
    setSectionDeleteModal({ open: false, section: null });
    setSectionDeleteError("");
  }, [sectionDeleting]);

  const deleteSection = useCallback(async () => {
    const section = sectionDeleteModal.section;
    if (!section) return;

    setSectionDeleting(true);
    setSectionDeleteError("");
    try {
      const response = await fetch(`${SECTIONS_ENDPOINT}/${section.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (handleUnauthorized(response)) return;

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setSectionDeleteError(data?.error || "Failed to delete section");
        return;
      }

      setSectionDeleteModal({ open: false, section: null });
      await loadSections();
    } catch (err) {
      console.error("Delete section failed:", err);
      setSectionDeleteError("Failed to delete section");
    } finally {
      setSectionDeleting(false);
    }
  }, [authHeaders, sectionDeleteModal.section, handleUnauthorized, loadSections]);

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    loadDivisions("");
    loadSections("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // divisions
    divisions,
    divisionStats,
    divisionLoading,
    divisionSearch,
    setDivisionSearch,
    loadDivisions,
    divisionModalOpen,
    divisionForm,
    divisionErrors,
    divisionSaving,
    updateDivisionForm,
    openCreateDivisionModal,
    openEditDivisionModal,
    closeDivisionModal,
    saveDivision,
    divisionDeleteModal,
    divisionDeleting,
    divisionDeleteError,
    requestDeleteDivision,
    closeDeleteDivisionModal,
    deleteDivision,

    // sections
    sections,
    sectionStats,
    sectionLoading,
    sectionSearch,
    setSectionSearch,
    loadSections,
    sectionModalOpen,
    sectionForm,
    sectionErrors,
    sectionSaving,
    updateSectionForm,
    openCreateSectionModal,
    openEditSectionModal,
    closeSectionModal,
    saveSection,
    sectionDeleteModal,
    sectionDeleting,
    sectionDeleteError,
    requestDeleteSection,
    closeDeleteSectionModal,
    deleteSection,
  };
}

export default useDivisionsSections;
