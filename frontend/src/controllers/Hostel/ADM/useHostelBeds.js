import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { BASE_URL } from "../../../config/appConfig";
const API_ROOT = String(BASE_URL || "")
    .trim()
    .replace(/\/+$/, "");

const HOSTEL_BEDS_API = `${API_ROOT}/admin/hostel/beds`;
const emptyHostelBedForm = {
    id: null,
    room_id: "",
    bed_code: "",
    bed_number: "",
    status: "Available",
    description: "",
};

const initialHostelBedFilters = {
    search: "",
    floor: "",
    room_id: "",
    status: "",
};

const defaultHostelBedPagination = {
    page: 1,
    per_page: 20,
    total: 0,
    pages: 1,
    has_next: false,
    has_prev: false,
};

export function useHostelBeds({
    activeSection,
    fetchWithAuth,
    showToast,
}) {
    const fetchWithAuthRef = useRef(fetchWithAuth);
    const showToastRef = useRef(showToast);
    const bedRequestControllerRef = useRef(null);
    const bedRequestInProgressRef = useRef(false);

    const [hostelBedRows, setHostelBedRows] = useState([]);

    const [hostelBedSummary, setHostelBedSummary] = useState({
        total_beds: 0,
        occupied_beds: 0,
        available_beds: 0,
        maintenance_beds: 0,
    });

    const [hostelBedOptions, setHostelBedOptions] = useState({
        floors: [],
        rooms: [],
        statuses: ["Available", "Occupied", "Maintenance"],
    });

    const [hostelBedFilters, setHostelBedFilters] = useState(initialHostelBedFilters);
    const [hostelBedForm, setHostelBedForm] = useState(emptyHostelBedForm);

    const [hostelBedsLoading, setHostelBedsLoading] = useState(false);
    const [hostelBedSaving, setHostelBedSaving] = useState(false);

    const [hostelBedModalOpen, setHostelBedModalOpen] = useState(false);
    const [viewHostelBedModalOpen, setViewHostelBedModalOpen] = useState(false);
    const [selectedHostelBed, setSelectedHostelBed] = useState(null);

    const [hostelBedPagination, setHostelBedPagination] = useState(
        defaultHostelBedPagination
    );

    const buildHostelBedQuery = useCallback((page = 1, perPage = 20) => {
        const params = new URLSearchParams();

        Object.entries(hostelBedFilters).forEach(([key, value]) => {
            if (value !== "" && value !== null && value !== undefined) {
                params.append(key, value);
            }
        });

        params.append("page", page);
        params.append("per_page", perPage);

        return params.toString();
    }, [hostelBedFilters]);

    const loadHostelBeds = useCallback(async (page = 1) => {
        const authFetch = fetchWithAuthRef.current;

        if (typeof authFetch !== "function") {
            showToastRef.current?.(
                "fetchWithAuth is not available",
                "error"
            );
            return;
        }

        /*
         * Prevent the same request from starting repeatedly while an
         * existing request is still running.
         */
        if (bedRequestInProgressRef.current) {
            return;
        }

        /*
         * Cancel any stale request left by a previous section/page load.
         */
        bedRequestControllerRef.current?.abort();

        const controller = new AbortController();
        bedRequestControllerRef.current = controller;
        bedRequestInProgressRef.current = true;

        setHostelBedsLoading(true);

        try {
            const query = buildHostelBedQuery(
                page,
                hostelBedPagination.per_page || 20
            );

            const response = await authFetch(
                `${HOSTEL_BEDS_API}?${query}`,
                {
                    signal: controller.signal,
                }
            );

            let data = null;

            try {
                data = await response.json();
            } catch {
                data = null;
            }

            if (!response.ok || !data?.success) {
                throw new Error(
                    data?.message ||
                    data?.error ||
                    `Failed to load beds (${response.status})`
                );
            }

            setHostelBedRows(
                Array.isArray(data.data?.beds)
                    ? data.data.beds
                    : []
            );

            setHostelBedSummary((previous) => ({
                ...previous,
                ...(data.data?.summary || {}),
            }));

            setHostelBedOptions((previous) => ({
                ...previous,
                ...(data.data?.options || {}),
            }));

            setHostelBedPagination((previous) => ({
                ...previous,
                ...(data.data?.pagination || {}),
            }));
        } catch (error) {
            if (error?.name !== "AbortError") {
                console.error("Load hostel beds error:", error);

                showToastRef.current?.(
                    error.message || "Failed to load beds",
                    "error"
                );
            }
        } finally {
            if (
                bedRequestControllerRef.current === controller
            ) {
                bedRequestInProgressRef.current = false;
                bedRequestControllerRef.current = null;
                setHostelBedsLoading(false);
            }
        }
    }, [
        buildHostelBedQuery,
        hostelBedPagination.per_page,
    ]);

    useEffect(() => {
        if (activeSection !== "beds") {
            bedRequestControllerRef.current?.abort();
            bedRequestControllerRef.current = null;
            bedRequestInProgressRef.current = false;
            return undefined;
        }

        loadHostelBeds(1);

        return () => {
            bedRequestControllerRef.current?.abort();
            bedRequestControllerRef.current = null;
            bedRequestInProgressRef.current = false;
        };
    }, [activeSection]);

    const updateHostelBedFilter = (name, value) => {
        setHostelBedFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const resetHostelBedFilters = useCallback(() => {
        setHostelBedFilters({
            ...initialHostelBedFilters,
        });
    }, []);

    const updateHostelBedForm = useCallback((name, value) => {
        setHostelBedForm((prev) => {
            const nextForm = {
                ...prev,
                [name]: value,
            };

            //  When changing the room for a new bed, reset only the generated
            //  bed code. Preserve the bed number entered by the user.
            if (name === "room_id" && !prev.id) {
                nextForm.bed_code = "";
            }

            // Normalize bed number without preventing the user from typing.
            if (name === "bed_number") {
                nextForm.bed_number = String(value || "").toUpperCase();
            }

            // Bed codes are stored without spaces.
            if (name === "bed_code") {
                nextForm.bed_code = String(value || "")
                    .toUpperCase()
                    .replace(/\s+/g, "");
            }

            return nextForm;
        });
    }, []);

    const openHostelBedModal = useCallback(() => {
        setSelectedHostelBed(null);

        setHostelBedForm({
            ...emptyHostelBedForm,
            room_id:
                hostelBedFilters.room_id ||
                "",
        });

        setHostelBedModalOpen(true);
    }, [hostelBedFilters.room_id]);

    const openEditHostelBedModal = useCallback((bed) => {
        if (!bed?.id) {
            showToast?.("Invalid bed record", "error");
            return;
        }

        setSelectedHostelBed(bed);

        setHostelBedForm({
            id: bed.id,
            room_id:
                bed.room_id !== null &&
                    bed.room_id !== undefined
                    ? String(bed.room_id)
                    : "",
            bed_code: String(bed.bed_code || ""),
            bed_number: String(bed.bed_number || ""),
            status: bed.status || "Available",
            description: String(bed.description || ""),
        });

        setHostelBedModalOpen(true);
    }, [showToast]);

    const closeHostelBedModal = () => {
        setSelectedHostelBed(null);
        setHostelBedForm(emptyHostelBedForm);
        setHostelBedModalOpen(false);
    };

    const openViewHostelBedModal = (bed) => {
        setSelectedHostelBed(bed);
        setViewHostelBedModalOpen(true);
    };

    const closeViewHostelBedModal = () => {
        setSelectedHostelBed(null);
        setViewHostelBedModalOpen(false);
    };

    const validateHostelBedForm = useCallback(() => {
        const roomId = Number(hostelBedForm.room_id);
        const bedNumber = String(
            hostelBedForm.bed_number || ""
        ).trim();

        const bedCode = String(
            hostelBedForm.bed_code || ""
        ).trim();

        if (!Number.isInteger(roomId) || roomId <= 0) {
            showToast?.("Please select a valid room", "error");
            return false;
        }

        if (!bedNumber) {
            showToast?.("Bed number is required", "error");
            return false;
        }

        if (bedNumber.length > 20) {
            showToast?.(
                "Bed number cannot exceed 20 characters",
                "error"
            );
            return false;
        }

        if (bedCode.length > 50) {
            showToast?.(
                "Bed code cannot exceed 50 characters",
                "error"
            );
            return false;
        }

        if (
            !["Available", "Occupied", "Maintenance"].includes(
                hostelBedForm.status
            )
        ) {
            showToast?.("Invalid bed status", "error");
            return false;
        }

        return true;
    }, [hostelBedForm, showToast]);

    const saveHostelBed = useCallback(async () => {
        if (!validateHostelBedForm()) return;

        if (typeof fetchWithAuth !== "function") {
            showToast?.(
                "Authentication request helper is unavailable",
                "error"
            );
            return;
        }

        setHostelBedSaving(true);

        try {
            const isEdit = Boolean(hostelBedForm.id);

            const payload = {
                room_id: Number(hostelBedForm.room_id),

                /*
                 * An empty bed_code tells the backend to generate it.
                 */
                bed_code: String(
                    hostelBedForm.bed_code || ""
                )
                    .trim()
                    .toUpperCase()
                    .replace(/\s+/g, ""),

                bed_number: String(
                    hostelBedForm.bed_number || ""
                )
                    .trim()
                    .toUpperCase(),

                status: hostelBedForm.status || "Available",

                description: String(
                    hostelBedForm.description || ""
                ).trim(),
            };

            const url = isEdit
                ? `${HOSTEL_BEDS_API}/${hostelBedForm.id}`
                : HOSTEL_BEDS_API;

            const response = await fetchWithAuth(url, {
                method: isEdit ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            let data = null;

            try {
                data = await response.json();
            } catch {
                data = null;
            }

            if (!response.ok || !data?.success) {
                throw new Error(
                    data?.message ||
                    data?.error ||
                    `Failed to save bed (${response.status})`
                );
            }

            showToast?.(
                data.message ||
                (isEdit
                    ? "Bed updated successfully"
                    : "Bed created successfully"),
                "success"
            );

            closeHostelBedModal();

            await loadHostelBeds(
                hostelBedPagination.page || 1
            );
        } catch (error) {
            console.error("Save hostel bed error:", error);

            showToast?.(
                error.message || "Failed to save bed",
                "error"
            );
        } finally {
            setHostelBedSaving(false);
        }
    }, [
        hostelBedForm,
        hostelBedPagination.page,
        fetchWithAuth,
        showToast,
        validateHostelBedForm,
        loadHostelBeds,
    ]);

    const deleteHostelBed = async (bed) => {
        const confirmed = window.confirm(`Delete ${bed.bed_code}?`);

        if (!confirmed) return;

        try {
            const res = await fetchWithAuth(
                `${HOSTEL_BEDS_API}/${bed.id}`,
                {
                    method: "DELETE",
                }
            );

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to delete bed");
            }

            showToast?.(data.message || "Bed deleted successfully", "success");
            loadHostelBeds(hostelBedPagination.page || 1);
        } catch (error) {
            console.error("Delete hostel bed error:", error);
            showToast?.(error.message || "Failed to delete bed", "error");
        }
    };

    const exportHostelBedsCSV = () => {
        const headers = [
            "Bed ID",
            "Bed Number",
            "Room No",
            "Floor",
            "Student",
            "Student ID",
            "Room Type",
            "Status",
        ];

        const rows = hostelBedRows.map((bed) => [
            bed.bed_code,
            bed.bed_number,
            bed.room_number,
            bed.floor,
            bed.student_name || "",
            bed.student_code || "",
            bed.room_type,
            bed.status,
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
        link.download = `hostel-beds-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();

        URL.revokeObjectURL(url);
    };

    return {
        hostelBedRows,
        hostelBedSummary,
        hostelBedOptions,

        hostelBedFilters,
        updateHostelBedFilter,
        resetHostelBedFilters,

        hostelBedForm,
        updateHostelBedForm,

        hostelBedsLoading,
        hostelBedSaving,

        hostelBedModalOpen,
        openHostelBedModal,
        openEditHostelBedModal,
        closeHostelBedModal,

        viewHostelBedModalOpen,
        selectedHostelBed,
        openViewHostelBedModal,
        closeViewHostelBedModal,

        hostelBedPagination,
        loadHostelBeds,
        saveHostelBed,
        deleteHostelBed,
        exportHostelBedsCSV,
    };
}