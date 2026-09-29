import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BASE_URL } from "../../config/appConfig";

// Backend: utils/academic.py -> AdminBatchesAPI / AdminBatchDetailAPI /
// AdminBatchSetCurrentAPI / AdminBatchOverviewAPI / AdminBatchRolloverAPI
const BATCHES_ENDPOINT = `${BASE_URL}/admin/academic/batches`;

const EMPTY_STATS = { total: 0, in_use: 0, current_batch: null };
const EMPTY_FORM = {
  id: null,
  batch_name: "",
  start_date: "",
  end_date: "",
  is_current: false,
};

export function useBatches() {
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

  const [batches, setBatches] = useState([]);
  const [batchStats, setBatchStats] = useState(EMPTY_STATS);
  const [batchLoading, setBatchLoading] = useState(true);
  const [batchSearch, setBatchSearch] = useState("");

  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchForm, setBatchForm] = useState(EMPTY_FORM);
  const [batchErrors, setBatchErrors] = useState({});
  const [batchSaving, setBatchSaving] = useState(false);

  const [batchDeleteModal, setBatchDeleteModal] = useState({
    open: false,
    batch: null,
  });
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [batchDeleteError, setBatchDeleteError] = useState("");

  const [settingCurrentId, setSettingCurrentId] = useState(null);

  // ---- Overview drill-down (view old/any batch's academic data) ----
  const [overviewModal, setOverviewModal] = useState({ open: false, batch: null });
  const [overviewData, setOverviewData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState("");

  // ---- Rollover (copy class structure into a new year) ----
  const [rolloverModal, setRolloverModal] = useState({ open: false, batch: null });
  const [rolloverTargetId, setRolloverTargetId] = useState("");
  const [rolloverSaving, setRolloverSaving] = useState(false);
  const [rolloverError, setRolloverError] = useState("");
  const [rolloverResult, setRolloverResult] = useState(null);

  const loadBatches = useCallback(
    async (search = batchSearch) => {
      setBatchLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);

        const response = await fetch(`${BATCHES_ENDPOINT}?${params.toString()}`, {
          headers: authHeaders(),
        });

        if (handleUnauthorized(response)) return;

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          throw new Error(data?.error || "Failed to load academic years");
        }

        setBatches(data.batches || []);
        setBatchStats(data.stats || EMPTY_STATS);
      } catch (err) {
        console.error("Load batches failed:", err);
        setBatches([]);
      } finally {
        setBatchLoading(false);
      }
    },
    [authHeaders, batchSearch, handleUnauthorized],
  );

  const updateBatchForm = useCallback((field, value) => {
    setBatchForm((prev) => ({ ...prev, [field]: value }));
    setBatchErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

  const openCreateBatchModal = useCallback(() => {
    setBatchForm(EMPTY_FORM);
    setBatchErrors({});
    setBatchModalOpen(true);
  }, []);

  const openEditBatchModal = useCallback((batch) => {
    setBatchForm({
      id: batch.id,
      batch_name: batch.batch_name || "",
      start_date: batch.start_date || "",
      end_date: batch.end_date || "",
      is_current: Boolean(batch.is_current),
    });
    setBatchErrors({});
    setBatchModalOpen(true);
  }, []);

  const closeBatchModal = useCallback(() => {
    if (batchSaving) return;
    setBatchModalOpen(false);
  }, [batchSaving]);

  const saveBatch = useCallback(
    async (event) => {
      event?.preventDefault?.();

      const name = batchForm.batch_name.trim();
      if (!name) {
        setBatchErrors({ batch_name: "Academic year name is required" });
        return;
      }

      if (
        batchForm.start_date &&
        batchForm.end_date &&
        batchForm.start_date > batchForm.end_date
      ) {
        setBatchErrors({ end_date: "End date cannot be before start date" });
        return;
      }

      setBatchSaving(true);
      try {
        const isEdit = Boolean(batchForm.id);
        const url = isEdit ? `${BATCHES_ENDPOINT}/${batchForm.id}` : BATCHES_ENDPOINT;

        const response = await fetch(url, {
          method: isEdit ? "PUT" : "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            batch_name: name,
            start_date: batchForm.start_date || null,
            end_date: batchForm.end_date || null,
            is_current: batchForm.is_current,
          }),
        });

        if (handleUnauthorized(response)) return;

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          setBatchErrors({ batch_name: data?.error || "Failed to save academic year" });
          return;
        }

        setBatchModalOpen(false);
        await loadBatches();
      } catch (err) {
        console.error("Save batch failed:", err);
        setBatchErrors({ batch_name: "Failed to save academic year" });
      } finally {
        setBatchSaving(false);
      }
    },
    [authHeaders, batchForm, handleUnauthorized, loadBatches],
  );

  const requestDeleteBatch = useCallback((batch) => {
    setBatchDeleteError("");
    setBatchDeleteModal({ open: true, batch });
  }, []);

  const closeDeleteBatchModal = useCallback(() => {
    if (batchDeleting) return;
    setBatchDeleteModal({ open: false, batch: null });
    setBatchDeleteError("");
  }, [batchDeleting]);

  const deleteBatch = useCallback(async () => {
    const batch = batchDeleteModal.batch;
    if (!batch) return;

    setBatchDeleting(true);
    setBatchDeleteError("");
    try {
      const response = await fetch(`${BATCHES_ENDPOINT}/${batch.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (handleUnauthorized(response)) return;

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setBatchDeleteError(data?.error || "Failed to delete academic year");
        return;
      }

      setBatchDeleteModal({ open: false, batch: null });
      await loadBatches();
    } catch (err) {
      console.error("Delete batch failed:", err);
      setBatchDeleteError("Failed to delete academic year");
    } finally {
      setBatchDeleting(false);
    }
  }, [authHeaders, batchDeleteModal.batch, handleUnauthorized, loadBatches]);

  const setCurrentBatch = useCallback(
    async (batch) => {
      setSettingCurrentId(batch.id);
      try {
        const response = await fetch(
          `${BATCHES_ENDPOINT}/${batch.id}/set-current`,
          { method: "PUT", headers: authHeaders() },
        );

        if (handleUnauthorized(response)) return;

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          console.error(data?.error || "Failed to set current academic year");
          return;
        }

        await loadBatches();
      } catch (err) {
        console.error("Set current batch failed:", err);
      } finally {
        setSettingCurrentId(null);
      }
    },
    [authHeaders, handleUnauthorized, loadBatches],
  );

  const openBatchOverview = useCallback(
    async (batch) => {
      setOverviewModal({ open: true, batch });
      setOverviewData(null);
      setOverviewError("");
      setOverviewLoading(true);
      try {
        const response = await fetch(`${BATCHES_ENDPOINT}/${batch.id}/overview`, {
          headers: authHeaders(),
        });

        if (handleUnauthorized(response)) return;

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          throw new Error(data?.error || "Failed to load academic year data");
        }

        setOverviewData(data);
      } catch (err) {
        console.error("Load batch overview failed:", err);
        setOverviewError(err.message || "Failed to load academic year data");
      } finally {
        setOverviewLoading(false);
      }
    },
    [authHeaders, handleUnauthorized],
  );

  const closeBatchOverview = useCallback(() => {
    setOverviewModal({ open: false, batch: null });
    setOverviewData(null);
    setOverviewError("");
  }, []);

  const openRolloverModal = useCallback((batch) => {
    setRolloverModal({ open: true, batch });
    setRolloverTargetId("");
    setRolloverError("");
    setRolloverResult(null);
  }, []);

  const closeRolloverModal = useCallback(() => {
    if (rolloverSaving) return;
    setRolloverModal({ open: false, batch: null });
    setRolloverTargetId("");
    setRolloverError("");
    setRolloverResult(null);
  }, [rolloverSaving]);

  const submitRollover = useCallback(
    async (event) => {
      event?.preventDefault?.();

      const sourceBatch = rolloverModal.batch;
      if (!sourceBatch || !rolloverTargetId) {
        setRolloverError("Please choose a target academic year");
        return;
      }

      setRolloverSaving(true);
      setRolloverError("");
      try {
        const response = await fetch(
          `${BATCHES_ENDPOINT}/${sourceBatch.id}/rollover`,
          {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ target_batch_id: Number(rolloverTargetId) }),
          },
        );

        if (handleUnauthorized(response)) return;

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          setRolloverError(data?.error || "Failed to copy classes");
          return;
        }

        setRolloverResult(data);
        await loadBatches();
      } catch (err) {
        console.error("Rollover failed:", err);
        setRolloverError("Failed to copy classes");
      } finally {
        setRolloverSaving(false);
      }
    },
    [authHeaders, handleUnauthorized, loadBatches, rolloverModal.batch, rolloverTargetId],
  );

  useEffect(() => {
    loadBatches("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    batches,
    batchStats,
    batchLoading,
    batchSearch,
    setBatchSearch,
    loadBatches,

    batchModalOpen,
    batchForm,
    batchErrors,
    batchSaving,
    updateBatchForm,
    openCreateBatchModal,
    openEditBatchModal,
    closeBatchModal,
    saveBatch,

    batchDeleteModal,
    batchDeleting,
    batchDeleteError,
    requestDeleteBatch,
    closeDeleteBatchModal,
    deleteBatch,

    settingCurrentId,
    setCurrentBatch,

    overviewModal,
    overviewData,
    overviewLoading,
    overviewError,
    openBatchOverview,
    closeBatchOverview,

    rolloverModal,
    rolloverTargetId,
    setRolloverTargetId,
    rolloverSaving,
    rolloverError,
    rolloverResult,
    openRolloverModal,
    closeRolloverModal,
    submitRollover,
  };
}

export default useBatches;
