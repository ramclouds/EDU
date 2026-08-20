import { useCallback, useEffect, useRef, useState } from "react";

import { BASE_URL } from "../../config/appConfig";
import { useHostelPermission, HOSTEL_READ_ONLY_MESSAGE } from "./useHostelPermission";

const EMPTY_FILTERS = {
    search: "",
    status: "",
    room_type: "",
    floor_id: "",
    block_id: "",
    hostel_id: "",
};

const EMPTY_ROOM_FORM = {
    id: null,
    floor_id: "",
    room_number: "",
    room_type: "Double",
    status: "Active",
    monthly_rent: "",
    description: "",
    initial_bed_count: "0",
};

/**
 * Drives the "Rooms" dashboard section: list/filter every room across
 * every floor & block, and create/edit/delete a room. Beds themselves
 * are managed by useHostelBeds.js - opening a room from here can hand
 * off to that section pre-filtered to just this room.
 */
export function useHostelRooms({ activeSection, fetchWithAuth, showToast }) {
    const { canWriteHostel } = useHostelPermission();

    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);
    const loadedRef = useRef(false);
    const runningRef = useRef(false);

    const [rooms, setRooms] = useState([]);
    const [roomsLoading, setRoomsLoading] = useState(false);
    const [roomFilters, setRoomFilters] = useState({ ...EMPTY_FILTERS });

    const [roomModalOpen, setRoomModalOpen] = useState(false);
    const [roomForm, setRoomForm] = useState({ ...EMPTY_ROOM_FORM });
    const [roomSaving, setRoomSaving] = useState(false);

    const [selectedRoom, setSelectedRoom] = useState(null);
    const [roomDetailsOpen, setRoomDetailsOpen] = useState(false);

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

    const loadRooms = useCallback(
        async ({ filters = roomFilters, silent = false } = {}) => {
            if (runningRef.current) {
                return;
            }

            runningRef.current = true;
            setRoomsLoading(true);

            try {
                const params = new URLSearchParams();

                Object.entries(filters).forEach(([key, value]) => {
                    const normalized = String(value ?? "").trim();

                    if (normalized) {
                        params.set(key, normalized);
                    }
                });

                const query = params.toString();

                const data = await request(
                    `${BASE_URL}/admin/hostel/rooms${query ? `?${query}` : ""}`,
                );

                setRooms(Array.isArray(data.rooms) ? data.rooms : []);
            } catch (error) {
                console.error("Hostel rooms load error:", error);

                if (!silent) {
                    notify(error.message || "Failed to load rooms", "error");
                }
            } finally {
                runningRef.current = false;
                setRoomsLoading(false);
            }
        },
        [notify, request, roomFilters],
    );

    const updateRoomFilter = useCallback((name, value) => {
        setRoomFilters((current) => ({ ...current, [name]: value }));
    }, []);

    const applyRoomFilters = useCallback(() => {
        loadRooms({ filters: roomFilters });
    }, [loadRooms, roomFilters]);

    const resetRoomFilters = useCallback(() => {
        const filters = { ...EMPTY_FILTERS };
        setRoomFilters(filters);
        loadRooms({ filters });
    }, [loadRooms]);

    // ============================================================
    // ROOM CRUD
    // ============================================================
    const openCreateRoomModal = useCallback((floorId) => {
        setRoomForm({ ...EMPTY_ROOM_FORM, floor_id: floorId || "" });
        setRoomModalOpen(true);
    }, []);

    const openEditRoomModal = useCallback((room) => {
        setRoomForm({
            id: room.id,
            floor_id: room.floor_id,
            room_number: room.room_number || "",
            room_type: room.room_type || "Double",
            status: room.status || "Active",
            monthly_rent:
                room.monthly_rent === null || room.monthly_rent === undefined
                    ? ""
                    : String(room.monthly_rent),
            description: room.description || "",
            initial_bed_count: "0",
        });
        setRoomModalOpen(true);
    }, []);

    const closeRoomModal = useCallback(() => {
        setRoomModalOpen(false);
    }, []);

    const updateRoomForm = useCallback((name, value) => {
        setRoomForm((current) => ({ ...current, [name]: value }));
    }, []);

    const saveRoom = useCallback(async () => {
        if (!roomForm.floor_id || !roomForm.room_number.trim()) {
            notify("Floor and room number are required", "error");
            return;
        }

        if (!canWriteHostel) {
            notify(HOSTEL_READ_ONLY_MESSAGE, "error");
            return;
        }

        setRoomSaving(true);

        try {
            const isEdit = Boolean(roomForm.id);

            const payload = {
                floor_id: roomForm.floor_id,
                room_number: roomForm.room_number.trim(),
                room_type: roomForm.room_type,
                status: roomForm.status,
                monthly_rent: roomForm.monthly_rent === "" ? null : roomForm.monthly_rent,
                description: roomForm.description.trim(),
            };

            if (!isEdit) {
                payload.initial_bed_count = Number(roomForm.initial_bed_count) || 0;
            }

            await request(
                isEdit
                    ? `${BASE_URL}/admin/hostel/rooms/${roomForm.id}`
                    : `${BASE_URL}/admin/hostel/rooms`,
                {
                    method: isEdit ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );

            notify(isEdit ? "Room updated" : "Room created", "success");
            setRoomModalOpen(false);
            await loadRooms({ silent: true });
        } catch (error) {
            notify(error.message || "Failed to save room", "error");
        } finally {
            setRoomSaving(false);
        }
    }, [canWriteHostel, loadRooms, notify, request, roomForm]);

    const deleteRoom = useCallback(
        async (room) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            if (
                !window.confirm(
                    `Delete room "${room.room_number}"? Every bed in it must be vacant.`,
                )
            ) {
                return;
            }

            try {
                await request(`${BASE_URL}/admin/hostel/rooms/${room.id}`, {
                    method: "DELETE",
                });

                notify("Room deleted", "success");
                await loadRooms({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to delete room", "error");
            }
        },
        [canWriteHostel, loadRooms, notify, request],
    );

    const openRoomDetails = useCallback((room) => {
        setSelectedRoom(room);
        setRoomDetailsOpen(true);
    }, []);

    const closeRoomDetails = useCallback(() => {
        setSelectedRoom(null);
        setRoomDetailsOpen(false);
    }, []);

    useEffect(() => {
        if (activeSection !== "rooms") {
            loadedRef.current = false;
            return;
        }

        if (loadedRef.current) {
            return;
        }

        loadedRef.current = true;
        loadRooms({ filters: EMPTY_FILTERS });
    }, [activeSection, loadRooms]);

    return {
        rooms,
        roomsLoading,
        roomFilters,

        loadRooms,
        updateRoomFilter,
        applyRoomFilters,
        resetRoomFilters,

        roomModalOpen,
        roomForm,
        roomSaving,
        openCreateRoomModal,
        openEditRoomModal,
        closeRoomModal,
        updateRoomForm,
        saveRoom,
        deleteRoom,

        selectedRoom,
        roomDetailsOpen,
        openRoomDetails,
        closeRoomDetails,

        canWriteHostel,
    };
}
