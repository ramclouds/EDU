import { useCallback, useEffect, useRef, useState } from "react";

import { BASE_URL } from "../../config/appConfig";
import { useHostelPermission, HOSTEL_READ_ONLY_MESSAGE } from "./useHostelPermission";

const EMPTY_FILTERS = {
    search: "",
    status: "",
    date: "",
};

const EMPTY_STATS = {
    inside: 0,
    checked_out: 0,
    late_entries: 0,
    returned: 0,
};

const EMPTY_CHECKOUT_FORM = {
    student_id: "",
    expected_return_time: "",
    purpose: "",
};

/**
 * Drives the "Check-In / Check-Out" dashboard section: log a student
 * leaving the hostel (with an expected return time) and mark them back
 * in later. Status (Outside Hostel / Returned / Late Entry) is derived
 * server-side from the timestamps, never stored/typed directly.
 */
export function useHostelMovement({ activeSection, fetchWithAuth, showToast }) {
    const { canWriteHostel } = useHostelPermission();

    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);
    const loadedRef = useRef(false);
    const runningRef = useRef(false);

    const [movements, setMovements] = useState([]);
    const [movementStats, setMovementStats] = useState({ ...EMPTY_STATS });
    const [movementsLoading, setMovementsLoading] = useState(false);
    const [movementFilters, setMovementFilters] = useState({ ...EMPTY_FILTERS });

    const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
    const [checkoutForm, setCheckoutForm] = useState({ ...EMPTY_CHECKOUT_FORM });
    const [checkoutSaving, setCheckoutSaving] = useState(false);

    const [studentSearch, setStudentSearch] = useState("");
    const [studentResults, setStudentResults] = useState([]);
    const [studentSearchLoading, setStudentSearchLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);

    const [checkingInId, setCheckingInId] = useState(null);

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

    const loadMovements = useCallback(
        async ({ filters: nextFilters = movementFilters, silent = false } = {}) => {
            if (runningRef.current) {
                return;
            }

            runningRef.current = true;
            setMovementsLoading(true);

            try {
                const params = new URLSearchParams();

                Object.entries(nextFilters).forEach(([key, value]) => {
                    const normalized = String(value ?? "").trim();

                    if (normalized) {
                        params.set(key, normalized);
                    }
                });

                const data = await request(
                    `${BASE_URL}/admin/hostel/movements?${params.toString()}`,
                );

                setMovements(Array.isArray(data.movements) ? data.movements : []);
                setMovementStats({ ...EMPTY_STATS, ...(data.stats || {}) });
            } catch (error) {
                console.error("Hostel movements load error:", error);

                if (!silent) {
                    notify(error.message || "Failed to load movement records", "error");
                }
            } finally {
                runningRef.current = false;
                setMovementsLoading(false);
            }
        },
        [movementFilters, notify, request],
    );

    const updateMovementFilter = useCallback((name, value) => {
        setMovementFilters((current) => ({ ...current, [name]: value }));
    }, []);

    const applyMovementFilters = useCallback(() => {
        loadMovements({ filters: movementFilters });
    }, [loadMovements, movementFilters]);

    const resetMovementFilters = useCallback(() => {
        const next = { ...EMPTY_FILTERS };
        setMovementFilters(next);
        loadMovements({ filters: next });
    }, [loadMovements]);

    // ============================================================
    // NEW CHECK-OUT
    // ============================================================
    const openCheckoutModal = useCallback(() => {
        setCheckoutForm({ ...EMPTY_CHECKOUT_FORM });
        setStudentSearch("");
        setStudentResults([]);
        setSelectedStudent(null);
        setCheckoutModalOpen(true);
    }, []);

    const closeCheckoutModal = useCallback(() => {
        setCheckoutModalOpen(false);
    }, []);

    const updateCheckoutForm = useCallback((name, value) => {
        setCheckoutForm((current) => ({ ...current, [name]: value }));
    }, []);

    const searchStudentsForMovement = useCallback(
        async (search) => {
            setStudentSearchLoading(true);

            try {
                const params = new URLSearchParams();

                if (search) {
                    params.set("search", search);
                }

                const data = await request(
                    `${BASE_URL}/admin/hostel/students/search?${params.toString()}`,
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

    const selectMovementStudent = useCallback((student) => {
        setSelectedStudent(student);
        setCheckoutForm((current) => ({ ...current, student_id: student.id }));
    }, []);

    const saveCheckout = useCallback(async () => {
        if (!checkoutForm.student_id) {
            notify("Select a student first", "error");
            return;
        }

        if (!canWriteHostel) {
            notify(HOSTEL_READ_ONLY_MESSAGE, "error");
            return;
        }

        setCheckoutSaving(true);

        try {
            await request(`${BASE_URL}/admin/hostel/movements`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    student_id: checkoutForm.student_id,
                    expected_return_time: checkoutForm.expected_return_time || null,
                    purpose: checkoutForm.purpose.trim(),
                }),
            });

            notify("Check-out recorded", "success");
            setCheckoutModalOpen(false);
            await loadMovements({ silent: true });
        } catch (error) {
            notify(error.message || "Failed to record check-out", "error");
        } finally {
            setCheckoutSaving(false);
        }
    }, [canWriteHostel, checkoutForm, loadMovements, notify, request]);

    // ============================================================
    // CHECK-IN
    // ============================================================
    const checkInMovement = useCallback(
        async (movement) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            setCheckingInId(movement.id);

            try {
                await request(
                    `${BASE_URL}/admin/hostel/movements/${movement.id}/checkin`,
                    { method: "POST" },
                );

                notify(`${movement.student_name} checked in`, "success");
                await loadMovements({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to record check-in", "error");
            } finally {
                setCheckingInId(null);
            }
        },
        [canWriteHostel, loadMovements, notify, request],
    );

    useEffect(() => {
        if (activeSection !== "checkin-checkout") {
            loadedRef.current = false;
            return;
        }

        if (loadedRef.current) {
            return;
        }

        loadedRef.current = true;
        loadMovements({ filters: EMPTY_FILTERS });
    }, [activeSection, loadMovements]);

    return {
        movements,
        movementStats,
        movementsLoading,
        movementFilters,

        loadMovements,
        updateMovementFilter,
        applyMovementFilters,
        resetMovementFilters,

        checkoutModalOpen,
        checkoutForm,
        checkoutSaving,
        openCheckoutModal,
        closeCheckoutModal,
        updateCheckoutForm,

        studentSearch,
        setStudentSearch,
        studentResults,
        studentSearchLoading,
        selectedStudent,
        searchStudentsForMovement,
        selectMovementStudent,
        saveCheckout,

        checkingInId,
        checkInMovement,

        canWriteHostel,
    };
}
