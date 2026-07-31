import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { BASE_URL } from "../../../config/appConfig";

const emptyAllotmentForm = {
    id: null,
    student_id: "",
    room_id: "",
    bed_id: "",
    bed_number: "",
    check_in_date: "",
    check_out_date: "",
    status: "Active",
    remarks: "",
};

const emptyTransferForm = {
    allocation_id: null,
    room_id: "",
    bed_id: "",
    bed_number: "",
    transfer_date: "",
    remarks: "",
};

const initialFilters = {
    search: "",
    floor: "",
    room_type: "",
    status: "",
    room_id: "",
};

const defaultPagination = {
    page: 1,
    per_page: 20,
    total: 0,
    pages: 1,
    has_next: false,
    has_prev: false,
};

export function useRoomAllotment({
    activeSection,
    fetchWithAuth,
    showToast,
}) {
    const [allotments, setAllotments] = useState([]);

    const [allotmentSummary, setAllotmentSummary] = useState({
        total_allotments: 0,
        active_students: 0,
        vacant_beds: 0,
        pending_requests: 0,
    });

    const [allotmentOptions, setAllotmentOptions] = useState({
        floors: [],
        room_types: ["Single", "Double", "Triple", "Dorm"],
        statuses: ["Active", "Pending", "Transferred", "Checked Out"],
        rooms: [],
        students: [],
    });

    const [allotmentFilters, setAllotmentFilters] = useState(initialFilters);
    const [allotmentForm, setAllotmentForm] = useState(emptyAllotmentForm);
    const [transferForm, setTransferForm] = useState(emptyTransferForm);

    const [allotmentsLoading, setAllotmentsLoading] = useState(false);
    const [allotmentSaving, setAllotmentSaving] = useState(false);
    const [transferSaving, setTransferSaving] = useState(false);

    const [allotmentModalOpen, setAllotmentModalOpen] = useState(false);
    const [viewAllotmentModalOpen, setViewAllotmentModalOpen] = useState(false);
    const [transferModalOpen, setTransferModalOpen] = useState(false);

    const [selectedAllotment, setSelectedAllotment] = useState(null);
    const [pagination, setPagination] = useState(defaultPagination);

    const buildQuery = useCallback((page = 1, perPage = 20) => {
        const params = new URLSearchParams();

        Object.entries(allotmentFilters).forEach(([key, value]) => {
            if (value !== "" && value !== null && value !== undefined) {
                params.append(key, value);
            }
        });

        params.append("page", page);
        params.append("per_page", perPage);

        return params.toString();
    }, [allotmentFilters]);

    const loadAllotments = useCallback(async (page = 1) => {
        try {
            if (!fetchWithAuth) {
                throw new Error("fetchWithAuth is not available");
            }

            setAllotmentsLoading(true);

            const query = buildQuery(page, 20);

            const res = await fetchWithAuth(
                `${BASE_URL}/admin/hostel/room-allotments?${query}`
            );

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to load room allotments");
            }

            setAllotments(data.data?.allotments || []);
            setAllotmentSummary(data.data?.summary || {});
            setAllotmentOptions((prev) => ({
                ...prev,
                ...(data.data?.options || {}),
            }));
            setPagination(data.data?.pagination || defaultPagination);
        } catch (error) {
            console.error("Load allotments error:", error);
            showToast?.(error.message || "Failed to load room allotments", "error");
        } finally {
            setAllotmentsLoading(false);
        }
    }, [fetchWithAuth, buildQuery, showToast]);

    useEffect(() => {
        if (activeSection !== "room-allotment") return;

        loadAllotments(1);
    }, [activeSection]);

    const availableBedsForRoom = useCallback(
        (roomId, currentBedId = null) => {
            const room = (allotmentOptions.rooms || []).find(
                (item) => String(item.id) === String(roomId)
            );

            const beds = Array.isArray(room?.beds) ? room.beds : [];

            return beds.filter(
                (bed) =>
                    bed.status === "Available" ||
                    (
                        currentBedId &&
                        String(bed.id) === String(currentBedId)
                    )
            );
        },
        [allotmentOptions.rooms]
    );

    const roomAllotmentAvailableBeds = useMemo(
        () =>
            availableBedsForRoom(
                allotmentForm.room_id,
                allotmentForm.bed_id
            ),
        [
            availableBedsForRoom,
            allotmentForm.room_id,
            allotmentForm.bed_id,
        ]
    );

    const roomTransferAvailableBeds = useMemo(
        () =>
            availableBedsForRoom(
                transferForm.room_id,
                transferForm.bed_id
            ),
        [
            availableBedsForRoom,
            transferForm.room_id,
            transferForm.bed_id,
        ]
    );

    const updateAllotmentFilter = (name, value) => {
        setAllotmentFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const resetAllotmentFilters = () => {
        setAllotmentFilters(initialFilters);
    };

    const updateAllotmentForm = (name, value) => {
        setAllotmentForm((prev) => {
            const next = {
                ...prev,
                [name]: value,
            };

            if (name === "room_id") {
                next.bed_id = "";
                next.bed_number = "";
            }

            if (name === "bed_id") {
                const bed = availableBedsForRoom(
                    prev.room_id,
                    value
                ).find(
                    (item) => String(item.id) === String(value)
                );

                next.bed_number = bed?.bed_number || "";
            }

            return next;
        });
    };

    const updateTransferForm = (name, value) => {
        setTransferForm((prev) => {
            const next = {
                ...prev,
                [name]: value,
            };

            if (name === "room_id") {
                next.bed_id = "";
                next.bed_number = "";
            }

            if (name === "bed_id") {
                const bed = availableBedsForRoom(
                    prev.room_id,
                    value
                ).find(
                    (item) => String(item.id) === String(value)
                );

                next.bed_number = bed?.bed_number || "";
            }

            return next;
        });
    };

    const openNewAllotmentModal = () => {
        setSelectedAllotment(null);
        setAllotmentForm(emptyAllotmentForm);
        setAllotmentModalOpen(true);
    };

    const openEditAllotmentModal = (allotment) => {
        setSelectedAllotment(allotment);

        setAllotmentForm({
            id: allotment.id,
            student_id: allotment.student_id || "",
            room_id: allotment.room_id || "",
            bed_number: allotment.bed_number || "",
            check_in_date: allotment.check_in_date || "",
            check_out_date: allotment.check_out_date || "",
            status: allotment.status || "Active",
            remarks: allotment.remarks || "",
        });

        setAllotmentModalOpen(true);
    };

    const closeAllotmentModal = () => {
        setSelectedAllotment(null);
        setAllotmentForm(emptyAllotmentForm);
        setAllotmentModalOpen(false);
    };

    const openViewAllotmentModal = (allotment) => {
        setSelectedAllotment(allotment);
        setViewAllotmentModalOpen(true);
    };

    const closeViewAllotmentModal = () => {
        setSelectedAllotment(null);
        setViewAllotmentModalOpen(false);
    };

    const openTransferModal = (allotment) => {
        setSelectedAllotment(allotment);

        setTransferForm({
            allocation_id: allotment.id,
            room_id: "",
            bed_number: "",
            transfer_date: new Date().toISOString().slice(0, 10),
            remarks: "",
        });

        setTransferModalOpen(true);
    };

    const closeTransferModal = () => {
        setSelectedAllotment(null);
        setTransferForm(emptyTransferForm);
        setTransferModalOpen(false);
    };

    const validateAllotmentForm = () => {
        if (!allotmentForm.student_id) {
            showToast?.("Student is required", "error");
            return false;
        }

        if (!allotmentForm.room_id) {
            showToast?.("Room is required", "error");
            return false;
        }

        if (!String(allotmentForm.bed_number || "").trim()) {
            showToast?.("Bed number is required", "error");
            return false;
        }

        if (!allotmentForm.check_in_date) {
            showToast?.("Check-in date is required", "error");
            return false;
        }

        return true;
    };

    const saveAllotment = async () => {
        if (!validateAllotmentForm()) return;

        try {
            setAllotmentSaving(true);

            const isEdit = Boolean(allotmentForm.id);

            const payload = {
                student_id: Number(allotmentForm.student_id),
                room_id: Number(allotmentForm.room_id),
                bed_id: Number(allotmentForm.bed_id),
                bed_number: String(allotmentForm.bed_number).trim(),
                check_in_date: allotmentForm.check_in_date,
                check_out_date: allotmentForm.check_out_date || null,
                status: allotmentForm.status,
                remarks: allotmentForm.remarks || "",
            };

            const url = isEdit
                ? `${BASE_URL}/admin/hostel/room-allotments/${allotmentForm.id}`
                : `${BASE_URL}/admin/hostel/room-allotments`;

            const res = await fetchWithAuth(url, {
                method: isEdit ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to save allotment");
            }

            showToast?.(data.message || "Allotment saved successfully", "success");

            closeAllotmentModal();
            loadAllotments(pagination.page || 1);
        } catch (error) {
            console.error("Save allotment error:", error);
            showToast?.(error.message || "Failed to save allotment", "error");
        } finally {
            setAllotmentSaving(false);
        }
    };

    const checkoutAllotment = async (allotment) => {
        const confirmed = window.confirm(
            `Checkout ${allotment.student_name} from room ${allotment.room_number}?`
        );

        if (!confirmed) return;

        try {
            const res = await fetchWithAuth(
                `${BASE_URL}/admin/hostel/room-allotments/${allotment.id}`,
                {
                    method: "DELETE",
                }
            );

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to checkout student");
            }

            showToast?.(data.message || "Student checked out successfully", "success");
            loadAllotments(pagination.page || 1);
        } catch (error) {
            console.error("Checkout allotment error:", error);
            showToast?.(error.message || "Failed to checkout student", "error");
        }
    };

    const validateTransferForm = () => {
        if (!transferForm.room_id) {
            showToast?.("New room is required", "error");
            return false;
        }

        if (!String(transferForm.bed_number || "").trim()) {
            showToast?.("New bed number is required", "error");
            return false;
        }

        if (!transferForm.transfer_date) {
            showToast?.("Transfer date is required", "error");
            return false;
        }

        return true;
    };

    const transferAllotment = async () => {
        if (!validateTransferForm()) return;

        try {
            setTransferSaving(true);

            const res = await fetchWithAuth(
                `${BASE_URL}/admin/hostel/room-allotments/${transferForm.allocation_id}/transfer`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        room_id: Number(transferForm.room_id),
                        bed_id: Number(transferForm.bed_id),
                        bed_number: String(transferForm.bed_number).trim(),
                        transfer_date: transferForm.transfer_date,
                        remarks: transferForm.remarks || "",
                    }),
                }
            );

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to transfer room");
            }

            showToast?.(data.message || "Room transferred successfully", "success");

            closeTransferModal();
            loadAllotments(1);
        } catch (error) {
            console.error("Transfer room error:", error);
            showToast?.(error.message || "Failed to transfer room", "error");
        } finally {
            setTransferSaving(false);
        }
    };

    const exportAllotmentsCSV = () => {
        const headers = [
            "Student",
            "Student ID",
            "Room No",
            "Floor",
            "Bed",
            "Check-In Date",
            "Check-Out Date",
            "Status",
        ];

        const rows = allotments.map((item) => [
            item.student_name,
            item.student_code,
            item.room_number,
            item.floor,
            item.bed_number,
            item.check_in_date,
            item.check_out_date || "",
            item.status,
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
        link.download = `room-allotments-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();

        URL.revokeObjectURL(url);
    };

    return {
        roomAllotmentRows: allotments,
        roomAllotmentSummary: allotmentSummary,
        roomAllotmentOptions: allotmentOptions,

        roomAllotmentFilters: allotmentFilters,
        updateRoomAllotmentFilter: updateAllotmentFilter,
        resetRoomAllotmentFilters: resetAllotmentFilters,

        roomAllotmentForm: allotmentForm,
        updateRoomAllotmentForm: updateAllotmentForm,

        roomTransferForm: transferForm,
        updateRoomTransferForm: updateTransferForm,

        roomAllotmentsLoading: allotmentsLoading,
        roomAllotmentSaving: allotmentSaving,
        roomTransferSaving: transferSaving,

        roomAllotmentModalOpen: allotmentModalOpen,
        openRoomAllotmentModal: openNewAllotmentModal,
        openEditRoomAllotmentModal: openEditAllotmentModal,
        closeRoomAllotmentModal: closeAllotmentModal,

        viewRoomAllotmentModalOpen: viewAllotmentModalOpen,
        selectedRoomAllotment: selectedAllotment,
        openViewRoomAllotmentModal: openViewAllotmentModal,
        closeViewRoomAllotmentModal: closeViewAllotmentModal,

        roomTransferModalOpen: transferModalOpen,
        openRoomTransferModal: openTransferModal,
        closeRoomTransferModal: closeTransferModal,

        roomAllotmentPagination: pagination,
        loadRoomAllotments: loadAllotments,
        saveRoomAllotment: saveAllotment,
        checkoutRoomAllotment: checkoutAllotment,
        transferRoomAllotment: transferAllotment,
        exportRoomAllotmentsCSV: exportAllotmentsCSV,
        roomAllotmentAvailableBeds,
        roomTransferAvailableBeds,
    };
}