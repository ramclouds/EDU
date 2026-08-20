import { useCallback, useEffect, useRef, useState } from "react";

import { BASE_URL } from "../../config/appConfig";
import { useHostelPermission, HOSTEL_READ_ONLY_MESSAGE } from "./useHostelPermission";

const EMPTY_FILTERS = {
    room_id: "",
    floor_id: "",
    block_id: "",
    status: "",
};

const EMPTY_BED_FORM = {
    id: null,
    room_id: "",
    bed_number: "",
    bed_type: "Standard",
};

/**
 * Drives the "Bed Management" dashboard section: list/filter every
 * bed, create/edit/delete a bed, and the check-in/check-out actions
 * (allocate a student to a vacant bed, vacate an occupied one).
 */
export function useHostelBeds({ activeSection, fetchWithAuth, showToast }) {
    const { canWriteHostel } = useHostelPermission();

    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);
    const loadedRef = useRef(false);
    const runningRef = useRef(false);

    const [beds, setBeds] = useState([]);
    const [bedsLoading, setBedsLoading] = useState(false);
    const [bedFilters, setBedFilters] = useState({ ...EMPTY_FILTERS });

    const [bedModalOpen, setBedModalOpen] = useState(false);
    const [bedForm, setBedForm] = useState({ ...EMPTY_BED_FORM });
    const [bedSaving, setBedSaving] = useState(false);

    // ---- Allocate (check-in) modal ----
    const [allocateModalOpen, setAllocateModalOpen] = useState(false);
    const [allocateTargetBed, setAllocateTargetBed] = useState(null);
    const [allocateSaving, setAllocateSaving] = useState(false);
    const [studentSearch, setStudentSearch] = useState("");
    const [studentResults, setStudentResults] = useState([]);
    const [studentSearchLoading, setStudentSearchLoading] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState(null);

    // ---- Vacate (check-out) ----
    const [vacatingBedId, setVacatingBedId] = useState(null);

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

    const loadBeds = useCallback(
        async ({ filters = bedFilters, silent = false } = {}) => {
            if (runningRef.current) {
                return;
            }

            runningRef.current = true;
            setBedsLoading(true);

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
                    `${BASE_URL}/admin/hostel/beds${query ? `?${query}` : ""}`,
                );

                setBeds(Array.isArray(data.beds) ? data.beds : []);
            } catch (error) {
                console.error("Hostel beds load error:", error);

                if (!silent) {
                    notify(error.message || "Failed to load beds", "error");
                }
            } finally {
                runningRef.current = false;
                setBedsLoading(false);
            }
        },
        [bedFilters, notify, request],
    );

    const updateBedFilter = useCallback((name, value) => {
        setBedFilters((current) => ({ ...current, [name]: value }));
    }, []);

    const applyBedFilters = useCallback(() => {
        loadBeds({ filters: bedFilters });
    }, [bedFilters, loadBeds]);

    const resetBedFilters = useCallback(() => {
        const filters = { ...EMPTY_FILTERS };
        setBedFilters(filters);
        loadBeds({ filters });
    }, [loadBeds]);

    // ============================================================
    // BED CRUD
    // ============================================================
    const openCreateBedModal = useCallback((roomId) => {
        setBedForm({ ...EMPTY_BED_FORM, room_id: roomId || "" });
        setBedModalOpen(true);
    }, []);

    const openEditBedModal = useCallback((bed) => {
        setBedForm({
            id: bed.id,
            room_id: bed.room_id,
            bed_number: bed.bed_number || "",
            bed_type: bed.bed_type || "Standard",
        });
        setBedModalOpen(true);
    }, []);

    const closeBedModal = useCallback(() => {
        setBedModalOpen(false);
    }, []);

    const updateBedForm = useCallback((name, value) => {
        setBedForm((current) => ({ ...current, [name]: value }));
    }, []);

    const saveBed = useCallback(async () => {
        if (!bedForm.room_id || !bedForm.bed_number.trim()) {
            notify("Room and bed number are required", "error");
            return;
        }

        if (!canWriteHostel) {
            notify(HOSTEL_READ_ONLY_MESSAGE, "error");
            return;
        }

        setBedSaving(true);

        try {
            const isEdit = Boolean(bedForm.id);

            const payload = {
                room_id: bedForm.room_id,
                bed_number: bedForm.bed_number.trim(),
                bed_type: bedForm.bed_type,
            };

            await request(
                isEdit
                    ? `${BASE_URL}/admin/hostel/beds/${bedForm.id}`
                    : `${BASE_URL}/admin/hostel/beds`,
                {
                    method: isEdit ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );

            notify(isEdit ? "Bed updated" : "Bed created", "success");
            setBedModalOpen(false);
            await loadBeds({ silent: true });
        } catch (error) {
            notify(error.message || "Failed to save bed", "error");
        } finally {
            setBedSaving(false);
        }
    }, [bedForm, canWriteHostel, loadBeds, notify, request]);

    const deleteBed = useCallback(
        async (bed) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            if (bed.status === "Occupied") {
                notify("Vacate this bed before deleting it", "error");
                return;
            }

            if (!window.confirm(`Delete bed "${bed.bed_number}"?`)) {
                return;
            }

            try {
                await request(`${BASE_URL}/admin/hostel/beds/${bed.id}`, {
                    method: "DELETE",
                });

                notify("Bed deleted", "success");
                await loadBeds({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to delete bed", "error");
            }
        },
        [canWriteHostel, loadBeds, notify, request],
    );

    // ============================================================
    // ALLOCATE (CHECK-IN)
    // ============================================================
    const openAllocateModal = useCallback(
        (bed) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            setAllocateTargetBed(bed);
            setStudentSearch("");
            setStudentResults([]);
            setSelectedStudentId(null);
            setAllocateModalOpen(true);
        },
        [canWriteHostel, notify],
    );

    const closeAllocateModal = useCallback(() => {
        setAllocateModalOpen(false);
        setAllocateTargetBed(null);
    }, []);

    const searchUnallocatedStudents = useCallback(
        async (search) => {
            setStudentSearchLoading(true);

            try {
                const params = new URLSearchParams();

                if (search) {
                    params.set("search", search);
                }

                const data = await request(
                    `${BASE_URL}/admin/hostel/students/unallocated?${params.toString()}`,
                );

                setStudentResults(Array.isArray(data.students) ? data.students : []);
            } catch (error) {
                notify(error.message || "Failed to search students", "error");
            } finally {
                setStudentSearchLoading(false);
            }
        },
        [notify, request],
    );

    const allocateBed = useCallback(async () => {
        if (!allocateTargetBed) {
            return;
        }

        if (!selectedStudentId) {
            notify("Select a student first", "error");
            return;
        }

        if (!canWriteHostel) {
            notify(HOSTEL_READ_ONLY_MESSAGE, "error");
            return;
        }

        setAllocateSaving(true);

        try {
            await request(
                `${BASE_URL}/admin/hostel/beds/${allocateTargetBed.id}/allocate`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ student_id: selectedStudentId }),
                },
            );

            notify("Student allocated to bed", "success");
            setAllocateModalOpen(false);
            setAllocateTargetBed(null);
            await loadBeds({ silent: true });
        } catch (error) {
            notify(error.message || "Failed to allocate bed", "error");
        } finally {
            setAllocateSaving(false);
        }
    }, [allocateTargetBed, canWriteHostel, loadBeds, notify, request, selectedStudentId]);

    // ============================================================
    // VACATE (CHECK-OUT)
    // ============================================================
    const vacateBed = useCallback(
        async (bed) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            if (
                !window.confirm(
                    `Vacate bed "${bed.bed_number}"? This checks out the current occupant.`,
                )
            ) {
                return;
            }

            setVacatingBedId(bed.id);

            try {
                await request(`${BASE_URL}/admin/hostel/beds/${bed.id}/vacate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({}),
                });

                notify("Bed vacated", "success");
                await loadBeds({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to vacate bed", "error");
            } finally {
                setVacatingBedId(null);
            }
        },
        [canWriteHostel, loadBeds, notify, request],
    );

    useEffect(() => {
        if (activeSection !== "beds") {
            loadedRef.current = false;
            return;
        }

        if (loadedRef.current) {
            return;
        }

        loadedRef.current = true;
        loadBeds({ filters: EMPTY_FILTERS });
    }, [activeSection, loadBeds]);

    return {
        beds,
        bedsLoading,
        bedFilters,

        loadBeds,
        updateBedFilter,
        applyBedFilters,
        resetBedFilters,

        bedModalOpen,
        bedForm,
        bedSaving,
        openCreateBedModal,
        openEditBedModal,
        closeBedModal,
        updateBedForm,
        saveBed,
        deleteBed,

        allocateModalOpen,
        allocateTargetBed,
        allocateSaving,
        studentSearch,
        setStudentSearch,
        studentResults,
        studentSearchLoading,
        selectedStudentId,
        setSelectedStudentId,
        openAllocateModal,
        closeAllocateModal,
        searchUnallocatedStudents,
        allocateBed,

        vacatingBedId,
        vacateBed,

        canWriteHostel,
    };
}
