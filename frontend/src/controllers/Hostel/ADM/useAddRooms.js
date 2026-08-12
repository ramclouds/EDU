import { useCallback, useEffect, useMemo, useState } from "react";
import { BASE_URL } from "../../../config/appConfig";
const emptyRoomForm = {
    id: null,
    block_id: "",
    room_number: "",
    floor: "",
    room_type: "Single",
    capacity: 1,
    status: "Available",
    monthly_fee: "",
    description: "",
};

const initialFilters = {
    search: "",
    floor: "",
    status: "",
    room_type: "",
    block_id: "",
    hostel_id: "",
};

export function useAddRooms({
    activeSection,
    fetchWithAuth,
    showToast,
}) {
    const [rooms, setRooms] = useState([]);
    const [roomSummary, setRoomSummary] = useState({
        total_rooms: 0,
        occupied_rooms: 0,
        available_rooms: 0,
        maintenance_rooms: 0,
        cleaning_rooms: 0,
        total_capacity: 0,
        total_occupied: 0,
        available_beds: 0,
    });

    const [roomOptions, setRoomOptions] = useState({
        floors: [],
        room_types: ["Single", "Double", "Triple", "Dorm"],
        statuses: ["Available", "Occupied", "Maintenance", "Cleaning"],
        hostels: [],
        blocks: [],
    });

    const [roomFilters, setRoomFilters] = useState(initialFilters);
    const [roomForm, setRoomForm] = useState(emptyRoomForm);

    const [roomsLoading, setRoomsLoading] = useState(false);
    const [roomSaving, setRoomSaving] = useState(false);
    const [roomModalOpen, setRoomModalOpen] = useState(false);
    const [viewRoomModalOpen, setViewRoomModalOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);

    const [pagination, setPagination] = useState({
        page: 1,
        per_page: 20,
        total: 0,
        pages: 1,
        has_next: false,
        has_prev: false,
    });

    const buildQuery = useCallback((page = 1, perPage = 20) => {
        const params = new URLSearchParams();

        Object.entries(roomFilters).forEach(([key, value]) => {
            if (value !== "" && value !== null && value !== undefined) {
                params.append(key, value);
            }
        });

        params.append("page", page);
        params.append("per_page", perPage);

        return params.toString();
    }, [roomFilters]);

    const loadRooms = useCallback(async (page = 1) => {
        try {
            if (!fetchWithAuth) {
                throw new Error("fetchWithAuth is not available");
            }

            setRoomsLoading(true);

            const query = buildQuery(page, 20);

            const res = await fetchWithAuth(
                `${BASE_URL}/admin/hostel/rooms?${query}`
            );

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to load rooms");
            }

            setRooms(data.data?.rooms || []);
            setRoomSummary(data.data?.summary || {});
            setRoomOptions((prev) => ({
                ...prev,
                ...(data.data?.options || {}),
            }));
            setPagination(data.data?.pagination || {
                page: 1,
                per_page: 20,
                total: 0,
                pages: 1,
                has_next: false,
                has_prev: false,
            });
        } catch (error) {
            console.error("Load rooms error:", error);
            showToast?.(error.message || "Failed to load rooms", "error");
        } finally {
            setRoomsLoading(false);
        }
    }, [fetchWithAuth, buildQuery, showToast]);

    useEffect(() => {
        if (activeSection !== "rooms") return;

        loadRooms(1);
    }, [activeSection]);
    
    const updateRoomFilter = (name, value) => {
        setRoomFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const resetRoomFilters = () => {
        setRoomFilters(initialFilters);
    };

    const updateRoomForm = (name, value) => {
        setRoomForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const openAddRoomModal = () => {
        setRoomForm(emptyRoomForm);
        setSelectedRoom(null);
        setRoomModalOpen(true);
    };

    const openEditRoomModal = (room) => {
        setSelectedRoom(room);

        setRoomForm({
            id: room.id,
            block_id: room.block_id || "",
            room_number: room.room_number || "",
            floor: room.floor || "",
            room_type: room.room_type || "Single",
            capacity: room.capacity || 1,
            status: room.status || "Available",
            monthly_fee: room.monthly_fee || "",
            description: room.description || "",
        });

        setRoomModalOpen(true);
    };

    const closeRoomModal = () => {
        setRoomModalOpen(false);
        setRoomForm(emptyRoomForm);
        setSelectedRoom(null);
    };

    const openViewRoomModal = (room) => {
        setSelectedRoom(room);
        setViewRoomModalOpen(true);
    };

    const closeViewRoomModal = () => {
        setSelectedRoom(null);
        setViewRoomModalOpen(false);
    };

    const validateRoomForm = () => {
        if (!String(roomForm.room_number || "").trim()) {
            showToast?.("Room number is required", "error");
            return false;
        }

        if (!roomForm.floor || Number(roomForm.floor) < 1) {
            showToast?.("Valid floor is required", "error");
            return false;
        }

        if (!roomForm.capacity || Number(roomForm.capacity) < 1) {
            showToast?.("Capacity must be at least 1", "error");
            return false;
        }

        return true;
    };

    const saveRoom = async () => {
        if (!validateRoomForm()) return;

        try {
            setRoomSaving(true);

            const isEdit = Boolean(roomForm.id);

            const payload = {
                block_id: roomForm.block_id || null,
                room_number: String(roomForm.room_number).trim(),
                floor: Number(roomForm.floor),
                room_type: roomForm.room_type,
                capacity: Number(roomForm.capacity),
                status: roomForm.status,
                monthly_fee: roomForm.monthly_fee === "" ? 0 : Number(roomForm.monthly_fee),
                description: roomForm.description || "",
            };

            const url = isEdit
                ? `${BASE_URL}/admin/hostel/rooms/${roomForm.id}`
                : `${BASE_URL}/admin/hostel/rooms`;

            const res = await fetchWithAuth(url, {
                method: isEdit ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to save room");
            }

            showToast?.(
                data.message || (isEdit ? "Room updated successfully" : "Room created successfully"),
                "success"
            );

            closeRoomModal();
            loadRooms(pagination.page || 1);
        } catch (error) {
            console.error("Save room error:", error);
            showToast?.(error.message || "Failed to save room", "error");
        } finally {
            setRoomSaving(false);
        }
    };

    const deleteRoom = async (room) => {
        const confirmed = window.confirm(
            `Delete room ${room.room_number}? This cannot be undone.`
        );

        if (!confirmed) return;

        try {
            const res = await fetchWithAuth(
                `${BASE_URL}/admin/hostel/rooms/${room.id}`,
                {
                    method: "DELETE",
                }
            );

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to delete room");
            }

            showToast?.(data.message || "Room deleted successfully", "success");
            loadRooms(pagination.page || 1);
        } catch (error) {
            console.error("Delete room error:", error);
            showToast?.(error.message || "Failed to delete room", "error");
        }
    };

    const exportRoomsCSV = () => {
        const headers = [
            "Room No",
            "Hostel",
            "Block",
            "Floor",
            "Type",
            "Capacity",
            "Occupied",
            "Available Beds",
            "Status",
            "Monthly Fee",
        ];

        const rows = rooms.map((room) => [
            room.room_number,
            room.hostel_name || "",
            room.block_name || "",
            room.floor,
            room.room_type,
            room.capacity,
            room.occupied,
            room.available_beds,
            room.status,
            room.monthly_fee,
        ]);

        const csv = [headers, ...rows]
            .map((row) =>
                row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
            )
            .join("\n");

        const blob = new Blob([csv], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `hostel-rooms-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();

        URL.revokeObjectURL(url);
    };

    const filteredBlocks = useMemo(() => {
        if (!roomForm.hostel_id && !roomFilters.hostel_id) {
            return roomOptions.blocks || [];
        }

        const hostelId = roomForm.hostel_id || roomFilters.hostel_id;

        return (roomOptions.blocks || []).filter(
            (block) => String(block.hostel_id) === String(hostelId)
        );
    }, [roomOptions.blocks, roomForm.hostel_id, roomFilters.hostel_id]);

    return {
        rooms,
        roomSummary,
        roomOptions,
        filteredBlocks,

        roomFilters,
        updateRoomFilter,
        resetRoomFilters,

        roomForm,
        updateRoomForm,

        roomsLoading,
        roomSaving,

        roomModalOpen,
        openAddRoomModal,
        openEditRoomModal,
        closeRoomModal,

        viewRoomModalOpen,
        selectedRoom,
        openViewRoomModal,
        closeViewRoomModal,

        pagination,
        loadRooms,
        saveRoom,
        deleteRoom,
        exportRoomsCSV,
    };
}