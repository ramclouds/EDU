import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BASE_URL } from "../../config/appConfig";
import { useHostelPermission, HOSTEL_READ_ONLY_MESSAGE } from "./useHostelPermission";

const EMPTY_HOSTEL_FORM = {
    id: null,
    hostel_name: "",
    hostel_type: "Boys",
    address: "",
    status: "Active",
};

const EMPTY_BLOCK_FORM = {
    id: null,
    hostel_id: "",
    block_name: "",
    description: "",
    status: "Active",
};

const EMPTY_FLOOR_FORM = {
    id: null,
    block_id: "",
    floor_number: "",
    floor_name: "",
    status: "Active",
};

const EMPTY_STATS = {
    hostels: 0,
    blocks: 0,
    floors: 0,
    rooms: 0,
    beds: 0,
    occupied_beds: 0,
    available_beds: 0,
};


export function useHostelBlocksFloors({ activeSection, fetchWithAuth, showToast }) {
    const { canWriteHostel } = useHostelPermission();

    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);
    const loadedRef = useRef(false);
    const runningRef = useRef(false);

    const [hostels, setHostels] = useState([]);
    const [structureStats, setStructureStats] = useState({ ...EMPTY_STATS });
    const [structureLoading, setStructureLoading] = useState(false);

    const [expandedBlocks, setExpandedBlocks] = useState({});
    const [expandedFloors, setExpandedFloors] = useState({});

    // ---- Hostel modal ----
    const [hostelModalOpen, setHostelModalOpen] = useState(false);
    const [hostelForm, setHostelForm] = useState({ ...EMPTY_HOSTEL_FORM });
    const [hostelSaving, setHostelSaving] = useState(false);

    // ---- Block modal ----
    const [blockModalOpen, setBlockModalOpen] = useState(false);
    const [blockForm, setBlockForm] = useState({ ...EMPTY_BLOCK_FORM });
    const [blockSaving, setBlockSaving] = useState(false);

    // ---- Floor modal ----
    const [floorModalOpen, setFloorModalOpen] = useState(false);
    const [floorForm, setFloorForm] = useState({ ...EMPTY_FLOOR_FORM });
    const [floorSaving, setFloorSaving] = useState(false);

    useEffect(() => {
        fetchRef.current = fetchWithAuth;
    }, [fetchWithAuth]);

    useEffect(() => {
        toastRef.current = showToast;
    }, [showToast]);

    const notify = useCallback((message, type = "info") => {
        toastRef.current?.(message, type);
    }, []);

    const request = useCallback(async (url, options = {}) => {
        if (typeof fetchRef.current !== "function") {
            throw new Error("Authenticated request unavailable");
        }

        const response = await fetchRef.current(url, options);

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            const error = new Error(
                data.error || data.message || `Request failed (${response.status})`,
            );

            error.data = data;
            error.status = response.status;

            throw error;
        }

        return data;
    }, []);

    const loadStructure = useCallback(
        async ({ silent = false } = {}) => {
            if (runningRef.current) {
                return;
            }

            runningRef.current = true;
            setStructureLoading(true);

            try {
                const data = await request(`${BASE_URL}/admin/hostel/structure`);

                setHostels(Array.isArray(data.hostels) ? data.hostels : []);
                setStructureStats({ ...EMPTY_STATS, ...(data.stats || {}) });
            } catch (error) {
                console.error("Hostel structure load error:", error);

                if (!silent) {
                    notify(error.message || "Failed to load hostel structure", "error");
                }
            } finally {
                runningRef.current = false;
                setStructureLoading(false);
            }
        },
        [notify, request],
    );

    const toggleBlockExpanded = useCallback((blockId) => {
        setExpandedBlocks((current) => ({ ...current, [blockId]: !current[blockId] }));
    }, []);

    const toggleFloorExpanded = useCallback((floorId) => {
        setExpandedFloors((current) => ({ ...current, [floorId]: !current[floorId] }));
    }, []);

    // ============================================================
    // HOSTEL CRUD
    // ============================================================
    const openCreateHostelModal = useCallback(() => {
        setHostelForm({ ...EMPTY_HOSTEL_FORM });
        setHostelModalOpen(true);
    }, []);

    const openEditHostelModal = useCallback((hostel) => {
        setHostelForm({
            id: hostel.id,
            hostel_name: hostel.hostel_name || "",
            hostel_type: hostel.hostel_type || "Boys",
            address: hostel.address || "",
            status: hostel.status || "Active",
        });
        setHostelModalOpen(true);
    }, []);

    const closeHostelModal = useCallback(() => {
        setHostelModalOpen(false);
    }, []);

    const updateHostelForm = useCallback((name, value) => {
        setHostelForm((current) => ({ ...current, [name]: value }));
    }, []);

    const saveHostel = useCallback(async () => {
        if (!hostelForm.hostel_name.trim()) {
            notify("Hostel name is required", "error");
            return;
        }

        if (!canWriteHostel) {
            notify(HOSTEL_READ_ONLY_MESSAGE, "error");
            return;
        }

        setHostelSaving(true);

        try {
            const isEdit = Boolean(hostelForm.id);

            const payload = {
                hostel_name: hostelForm.hostel_name.trim(),
                hostel_type: hostelForm.hostel_type,
                address: hostelForm.address.trim(),
                status: hostelForm.status,
            };

            await request(
                isEdit
                    ? `${BASE_URL}/admin/hostel/hostels/${hostelForm.id}`
                    : `${BASE_URL}/admin/hostel/hostels`,
                {
                    method: isEdit ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );

            notify(isEdit ? "Hostel updated" : "Hostel created", "success");
            setHostelModalOpen(false);
            await loadStructure({ silent: true });
        } catch (error) {
            notify(error.message || "Failed to save hostel", "error");
        } finally {
            setHostelSaving(false);
        }
    }, [canWriteHostel, hostelForm, loadStructure, notify, request]);

    const deleteHostel = useCallback(
        async (hostel) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            if (
                !window.confirm(
                    `Delete hostel "${hostel.hostel_name}"? It must have no blocks left under it.`,
                )
            ) {
                return;
            }

            try {
                await request(`${BASE_URL}/admin/hostel/hostels/${hostel.id}`, {
                    method: "DELETE",
                });

                notify("Hostel deleted", "success");
                await loadStructure({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to delete hostel", "error");
            }
        },
        [canWriteHostel, loadStructure, notify, request],
    );

    // ============================================================
    // BLOCK CRUD
    // ============================================================
    const openCreateBlockModal = useCallback((hostelId) => {
        setBlockForm({ ...EMPTY_BLOCK_FORM, hostel_id: hostelId || "" });
        setBlockModalOpen(true);
    }, []);

    const openEditBlockModal = useCallback((block) => {
        setBlockForm({
            id: block.id,
            hostel_id: block.hostel_id,
            block_name: block.block_name || "",
            description: block.description || "",
            status: block.status || "Active",
        });
        setBlockModalOpen(true);
    }, []);

    const closeBlockModal = useCallback(() => {
        setBlockModalOpen(false);
    }, []);

    const updateBlockForm = useCallback((name, value) => {
        setBlockForm((current) => ({ ...current, [name]: value }));
    }, []);

    const saveBlock = useCallback(async () => {
        if (!blockForm.hostel_id || !blockForm.block_name.trim()) {
            notify("Hostel and block name are required", "error");
            return;
        }

        if (!canWriteHostel) {
            notify(HOSTEL_READ_ONLY_MESSAGE, "error");
            return;
        }

        setBlockSaving(true);

        try {
            const isEdit = Boolean(blockForm.id);

            const payload = {
                hostel_id: blockForm.hostel_id,
                block_name: blockForm.block_name.trim(),
                description: blockForm.description.trim(),
                status: blockForm.status,
            };

            await request(
                isEdit
                    ? `${BASE_URL}/admin/hostel/blocks/${blockForm.id}`
                    : `${BASE_URL}/admin/hostel/blocks`,
                {
                    method: isEdit ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );

            notify(isEdit ? "Block updated" : "Block created", "success");
            setBlockModalOpen(false);
            await loadStructure({ silent: true });
        } catch (error) {
            notify(error.message || "Failed to save block", "error");
        } finally {
            setBlockSaving(false);
        }
    }, [blockForm, canWriteHostel, loadStructure, notify, request]);

    const deleteBlock = useCallback(
        async (block) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            if (
                !window.confirm(
                    `Delete block "${block.block_name}"? It must have no floors left under it.`,
                )
            ) {
                return;
            }

            try {
                await request(`${BASE_URL}/admin/hostel/blocks/${block.id}`, {
                    method: "DELETE",
                });

                notify("Block deleted", "success");
                await loadStructure({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to delete block", "error");
            }
        },
        [canWriteHostel, loadStructure, notify, request],
    );

    // ============================================================
    // FLOOR CRUD
    // ============================================================
    const openCreateFloorModal = useCallback((blockId) => {
        setFloorForm({ ...EMPTY_FLOOR_FORM, block_id: blockId || "" });
        setFloorModalOpen(true);
    }, []);

    const openEditFloorModal = useCallback((floor) => {
        setFloorForm({
            id: floor.id,
            block_id: floor.block_id,
            floor_number: String(floor.floor_number ?? ""),
            floor_name: floor.floor_name || "",
            status: floor.status || "Active",
        });
        setFloorModalOpen(true);
    }, []);

    const closeFloorModal = useCallback(() => {
        setFloorModalOpen(false);
    }, []);

    const updateFloorForm = useCallback((name, value) => {
        setFloorForm((current) => ({ ...current, [name]: value }));
    }, []);

    const saveFloor = useCallback(async () => {
        if (!floorForm.block_id || floorForm.floor_number === "") {
            notify("Block and floor number are required", "error");
            return;
        }

        if (!canWriteHostel) {
            notify(HOSTEL_READ_ONLY_MESSAGE, "error");
            return;
        }

        setFloorSaving(true);

        try {
            const isEdit = Boolean(floorForm.id);

            const payload = {
                block_id: floorForm.block_id,
                floor_number: Number(floorForm.floor_number),
                floor_name: floorForm.floor_name.trim(),
                status: floorForm.status,
            };

            await request(
                isEdit
                    ? `${BASE_URL}/admin/hostel/floors/${floorForm.id}`
                    : `${BASE_URL}/admin/hostel/floors`,
                {
                    method: isEdit ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );

            notify(isEdit ? "Floor updated" : "Floor created", "success");
            setFloorModalOpen(false);
            await loadStructure({ silent: true });
        } catch (error) {
            notify(error.message || "Failed to save floor", "error");
        } finally {
            setFloorSaving(false);
        }
    }, [canWriteHostel, floorForm, loadStructure, notify, request]);

    const deleteFloor = useCallback(
        async (floor) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            if (
                !window.confirm(
                    `Delete floor "${floor.floor_name || floor.floor_number}"? It must have no rooms left under it.`,
                )
            ) {
                return;
            }

            try {
                await request(`${BASE_URL}/admin/hostel/floors/${floor.id}`, {
                    method: "DELETE",
                });

                notify("Floor deleted", "success");
                await loadStructure({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to delete floor", "error");
            }
        },
        [canWriteHostel, loadStructure, notify, request],
    );

    // Flat list of hostels for <select> options in the Block/Floor modals.
    const hostelOptions = useMemo(
        () => hostels.map((hostel) => ({ id: hostel.id, name: hostel.hostel_name })),
        [hostels],
    );

    // Flat list of blocks across every hostel, for the Floor modal's block <select>.
    const blockOptions = useMemo(
        () =>
            hostels.flatMap((hostel) =>
                (hostel.blocks || []).map((block) => ({
                    id: block.id,
                    name: `${hostel.hostel_name} - ${block.block_name}`,
                })),
            ),
        [hostels],
    );

    useEffect(() => {
        if (activeSection !== "floors") {
            loadedRef.current = false;
            return;
        }

        if (loadedRef.current) {
            return;
        }

        loadedRef.current = true;
        loadStructure();
    }, [activeSection, loadStructure]);

    return {
        hostels,
        structureStats,
        structureLoading,
        loadStructure,

        expandedBlocks,
        expandedFloors,
        toggleBlockExpanded,
        toggleFloorExpanded,

        hostelOptions,
        blockOptions,

        // Hostel
        hostelModalOpen,
        hostelForm,
        hostelSaving,
        openCreateHostelModal,
        openEditHostelModal,
        closeHostelModal,
        updateHostelForm,
        saveHostel,
        deleteHostel,

        // Block
        blockModalOpen,
        blockForm,
        blockSaving,
        openCreateBlockModal,
        openEditBlockModal,
        closeBlockModal,
        updateBlockForm,
        saveBlock,
        deleteBlock,

        // Floor
        floorModalOpen,
        floorForm,
        floorSaving,
        openCreateFloorModal,
        openEditFloorModal,
        closeFloorModal,
        updateFloorForm,
        saveFloor,
        deleteFloor,

        canWriteHostel,
    };
}
