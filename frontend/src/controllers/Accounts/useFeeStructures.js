import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

/**
 * Accounts Admin > Fee Structure section.
 *
 * Manages reusable billing templates (GET/POST /api/accounts/fee-structures,
 * PUT/DELETE .../<id>) and the bulk "Apply" action
 * (POST .../<id>/apply) that generates a FeeInstallment for every
 * student in the template's batch - which is what actually links this
 * section to Students/Pending Fees: applying a structure is what makes
 * new rows show up there.
 */
export function useFeeStructures({ fetchWithAuth, showToast }) {
  const [structures, setStructures] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applyingId, setApplyingId] = useState(null);

  const fetchedRef = useRef(false);

  const loadStructures = useCallback(async () => {
    if (!fetchWithAuth) return;

    setLoading(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/accounts/fee-structures`);
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to load fee structures");
      }

      setStructures(Array.isArray(data.fee_structures) ? data.fee_structures : []);
    } catch (err) {
      console.error("useFeeStructures:", err);
      showToast?.(err.message || "Failed to load fee structures", "error");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, showToast]);

  const loadBatches = useCallback(async () => {
    if (!fetchWithAuth) return;

    try {
      const res = await fetchWithAuth(`${BASE_URL}/accounts/batches`);
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        setBatches(Array.isArray(data.batches) ? data.batches : []);
      }
    } catch (err) {
      console.error("useFeeStructures (batches):", err);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    if (!fetchWithAuth) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    loadStructures();
    loadBatches();
  }, [fetchWithAuth, loadStructures, loadBatches]);

  const createStructure = useCallback(
    async (payload) => {
      if (!fetchWithAuth) return false;

      setSaving(true);
      try {
        const res = await fetchWithAuth(`${BASE_URL}/accounts/fee-structures`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to create fee structure");
        }

        showToast?.("Fee structure created", "success");
        await loadStructures();
        return true;
      } catch (err) {
        showToast?.(err.message || "Failed to create fee structure", "error");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchWithAuth, showToast, loadStructures],
  );

  const updateStructure = useCallback(
    async (structureId, payload) => {
      if (!fetchWithAuth) return false;

      setSaving(true);
      try {
        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/fee-structures/${structureId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to update fee structure");
        }

        showToast?.("Fee structure updated", "success");
        await loadStructures();
        return true;
      } catch (err) {
        showToast?.(err.message || "Failed to update fee structure", "error");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchWithAuth, showToast, loadStructures],
  );

  const deleteStructure = useCallback(
    async (structureId) => {
      if (!fetchWithAuth) return false;

      setSaving(true);
      try {
        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/fee-structures/${structureId}`,
          { method: "DELETE" },
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to delete fee structure");
        }

        showToast?.("Fee structure deleted", "success");
        await loadStructures();
        return true;
      } catch (err) {
        showToast?.(err.message || "Failed to delete fee structure", "error");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchWithAuth, showToast, loadStructures],
  );

  const applyStructure = useCallback(
    async (structureId) => {
      if (!fetchWithAuth) return false;

      setApplyingId(structureId);
      try {
        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/fee-structures/${structureId}/apply`,
          { method: "POST" },
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to apply fee structure");
        }

        showToast?.(
          `Applied to ${data.created_count} student(s)${
            data.skipped_count ? ` (${data.skipped_count} already billed)` : ""
          }`,
          "success",
        );
        await loadStructures();
        return true;
      } catch (err) {
        showToast?.(err.message || "Failed to apply fee structure", "error");
        return false;
      } finally {
        setApplyingId(null);
      }
    },
    [fetchWithAuth, showToast, loadStructures],
  );

  const EMPTY_STRUCTURE_FORM = {
    name: "",
    fee_category: "Tuition",
    academic_year: "",
    amount: "",
    due_date: "",
    batch_id: "",
    description: "",
  };

  const [showStructureForm, setShowStructureForm] = useState(false);
  const [structureForm, setStructureForm] = useState(EMPTY_STRUCTURE_FORM);

  const updateStructureForm = useCallback((key, value) => {
    setStructureForm((f) => ({ ...f, [key]: value }));
  }, []);

  const resetStructureForm = useCallback(() => {
    setStructureForm(EMPTY_STRUCTURE_FORM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitStructure = useCallback(async () => {
    const ok = await createStructure({
      ...structureForm,
      batch_id: structureForm.batch_id || null,
    });
    if (ok) {
      resetStructureForm();
      setShowStructureForm(false);
    }
    return ok;
  }, [structureForm, createStructure, resetStructureForm]);

  return {
    structures,
    batches,
    loading,
    saving,
    applyingId,
    reload: loadStructures,
    createStructure,
    updateStructure,
    deleteStructure,
    applyStructure,

    showStructureForm,
    setShowStructureForm,
    structureForm,
    updateStructureForm,
    submitStructure,
  };
}

export default useFeeStructures;
