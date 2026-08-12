import { useCallback, useEffect, useState } from "react";
import { BASE_URL } from "../../../config/appConfig";

const emptyHostelBlockForm = {
  id: null,
  hostel_id: "",
  block_name: "",
  block_type: "Common",
  status: "Active",
  description: "",
};

export function useHostelBlocks({ activeSection, fetchWithAuth, showToast }) {
  const [hostelBlockRows, setHostelBlockRows] = useState([]);
  const [hostelFloorRows, setHostelFloorRows] = useState([]);

  const [hostelBlockSummary, setHostelBlockSummary] = useState({
    total_blocks: 0,
    total_floors: 0,
    total_rooms: 0,
    occupancy_rate: 0,
  });

  const [hostelBlockOptions, setHostelBlockOptions] = useState({
    hostels: [],
    block_types: ["Boys", "Girls", "Staff", "Common"],
    statuses: ["Active", "Maintenance", "Inactive"],
  });

  const [hostelBlockForm, setHostelBlockForm] = useState(emptyHostelBlockForm);
  const [hostelBlocksLoading, setHostelBlocksLoading] = useState(false);
  const [hostelBlockSaving, setHostelBlockSaving] = useState(false);

  const [hostelBlockModalOpen, setHostelBlockModalOpen] = useState(false);
  const [viewHostelBlockModalOpen, setViewHostelBlockModalOpen] = useState(false);
  const [selectedHostelBlock, setSelectedHostelBlock] = useState(null);

  const loadHostelBlocks = useCallback(async () => {
    try {
      if (!fetchWithAuth) throw new Error("fetchWithAuth is not available");

      setHostelBlocksLoading(true);

      const res = await fetchWithAuth(`${BASE_URL}/admin/hostel/blocks`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load blocks");
      }

      setHostelBlockRows(data.data?.blocks || []);
      setHostelFloorRows(data.data?.floor_rows || []);
      setHostelBlockSummary(data.data?.summary || {});
      setHostelBlockOptions((prev) => ({
        ...prev,
        ...(data.data?.options || {}),
      }));
    } catch (error) {
      console.error("Load hostel blocks error:", error);
      showToast?.(error.message || "Failed to load blocks", "error");
    } finally {
      setHostelBlocksLoading(false);
    }
  }, [fetchWithAuth, showToast]);

  useEffect(() => {
    if (activeSection !== "floors") return;

    loadHostelBlocks();
  }, [activeSection]);

  const updateHostelBlockForm = (name, value) => {
    setHostelBlockForm((prev) => ({ ...prev, [name]: value }));
  };

  const openHostelBlockModal = () => {
    setSelectedHostelBlock(null);
    setHostelBlockForm(emptyHostelBlockForm);
    setHostelBlockModalOpen(true);
  };

  const openEditHostelBlockModal = (block) => {
    setSelectedHostelBlock(block);
    setHostelBlockForm({
      id: block.id,
      hostel_id: block.hostel_id || "",
      block_name: block.block_name || "",
      block_type: block.block_type || "Common",
      status: block.status || "Active",
      description: block.description || "",
    });
    setHostelBlockModalOpen(true);
  };

  const closeHostelBlockModal = () => {
    setSelectedHostelBlock(null);
    setHostelBlockForm(emptyHostelBlockForm);
    setHostelBlockModalOpen(false);
  };

  const openViewHostelBlockModal = (block) => {
    setSelectedHostelBlock(block);
    setViewHostelBlockModalOpen(true);
  };

  const closeViewHostelBlockModal = () => {
    setSelectedHostelBlock(null);
    setViewHostelBlockModalOpen(false);
  };

  const saveHostelBlock = async () => {
    if (!hostelBlockForm.block_name.trim()) {
      showToast?.("Block name is required", "error");
      return;
    }

    try {
      setHostelBlockSaving(true);

      const isEdit = Boolean(hostelBlockForm.id);

      const API_ROOT = String(BASE_URL || "").trim().replace(/\/+$/, "");
      const BLOCKS_API = `${API_ROOT}/admin/hostel/blocks`;

      const url = isEdit
        ? `${BLOCKS_API}/${hostelBlockForm.id}`
        : BLOCKS_API;

      const res = await fetchWithAuth(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hostel_id: hostelBlockForm.hostel_id
            ? Number(hostelBlockForm.hostel_id)
            : null,
          block_name: hostelBlockForm.block_name.trim(),
          block_type: hostelBlockForm.block_type,
          status: hostelBlockForm.status,
          description: hostelBlockForm.description?.trim() || "",
        }),
      });

      let responseData = null;

      try {
        responseData = await res.json();
      } catch {
        responseData = null;
      }

      if (!res.ok || !responseData?.success) {
        console.error("Block API response:", {
          status: res.status,
          data: responseData,
        });

        throw new Error(
          responseData?.error ||
          responseData?.message ||
          `Failed to save block(${res.status})`
        );
      }

      showToast?.(
        responseData.message || "Block saved successfully",
        "success"
      );

      closeHostelBlockModal();
      await loadHostelBlocks();


    } catch (error) {
      console.error("Save hostel block error:", error);
      showToast?.(error.message || "Failed to save block", "error");
    } finally {
      setHostelBlockSaving(false);
    }
  };


  const deleteHostelBlock = async (block) => {
    if (!window.confirm(`Delete ${block.block_name}?`)) return;

    try {
      const res = await fetchWithAuth(
        `${BASE_URL}/admin/hostel/blocks/${block.id}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete block");
      }

      showToast?.(data.message || "Block deleted successfully", "success");
      loadHostelBlocks();
    } catch (error) {
      console.error("Delete hostel block error:", error);
      showToast?.(error.message || "Failed to delete block", "error");
    }
  };

  const exportHostelBlocksCSV = () => {
    const headers = ["Block", "Floor", "Rooms", "Beds", "Occupied", "Occupancy Rate", "Status"];

    const rows = hostelFloorRows.map((row) => [
      row.block_name,
      row.floor,
      row.rooms,
      row.beds,
      row.occupied,
      `${row.occupancy_rate}%`,
      row.status,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `hostel-floors-blocks-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  return {
    hostelBlockRows,
    hostelFloorRows,
    hostelBlockSummary,
    hostelBlockOptions,

    hostelBlockForm,
    updateHostelBlockForm,

    hostelBlocksLoading,
    hostelBlockSaving,

    hostelBlockModalOpen,
    openHostelBlockModal,
    openEditHostelBlockModal,
    closeHostelBlockModal,

    viewHostelBlockModalOpen,
    selectedHostelBlock,
    openViewHostelBlockModal,
    closeViewHostelBlockModal,

    loadHostelBlocks,
    saveHostelBlock,
    deleteHostelBlock,
    exportHostelBlocksCSV,
  };
}