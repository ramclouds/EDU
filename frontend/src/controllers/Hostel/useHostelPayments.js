import { useCallback, useEffect, useRef, useState } from "react";

import { BASE_URL } from "../../config/appConfig";
import { useHostelPermission, HOSTEL_READ_ONLY_MESSAGE } from "./useHostelPermission";

const EMPTY_FILTERS = {
    search: "",
    payment_method: "",
};

const EMPTY_STATS = {
    total_payments: 0,
    total_collected: 0,
};

const EMPTY_FORM = {
    fee_id: "",
    amount: "",
    payment_method: "Cash",
    transaction_reference: "",
    notes: "",
    payment_date: new Date().toISOString().slice(0, 10),
};

/**
 * Drives the "Payment" dashboard section: record a payment against a
 * student's fee invoice (searches by student, then picks one of their
 * open invoices) and browse the full payment history.
 */
export function useHostelPayments({ activeSection, fetchWithAuth, showToast }) {
    const { canWriteHostel } = useHostelPermission();

    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);
    const loadedRef = useRef(false);
    const runningRef = useRef(false);

    const [payments, setPayments] = useState([]);
    const [paymentStats, setPaymentStats] = useState({ ...EMPTY_STATS });
    const [paymentsLoading, setPaymentsLoading] = useState(false);
    const [paymentFilters, setPaymentFilters] = useState({ ...EMPTY_FILTERS });

    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentForm, setPaymentForm] = useState({ ...EMPTY_FORM });
    const [paymentSaving, setPaymentSaving] = useState(false);

    const [studentSearch, setStudentSearch] = useState("");
    const [studentResults, setStudentResults] = useState([]);
    const [studentSearchLoading, setStudentSearchLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);

    const [studentFees, setStudentFees] = useState([]);
    const [studentFeesLoading, setStudentFeesLoading] = useState(false);
    const [selectedFee, setSelectedFee] = useState(null);

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

    const loadPayments = useCallback(
        async ({ filters: nextFilters = paymentFilters, silent = false } = {}) => {
            if (runningRef.current) {
                return;
            }

            runningRef.current = true;
            setPaymentsLoading(true);

            try {
                const params = new URLSearchParams();

                Object.entries(nextFilters).forEach(([key, value]) => {
                    const normalized = String(value ?? "").trim();

                    if (normalized) {
                        params.set(key, normalized);
                    }
                });

                const data = await request(
                    `${BASE_URL}/admin/hostel/payments?${params.toString()}`,
                );

                setPayments(Array.isArray(data.payments) ? data.payments : []);
                setPaymentStats({ ...EMPTY_STATS, ...(data.stats || {}) });
            } catch (error) {
                console.error("Payments load error:", error);

                if (!silent) {
                    notify(error.message || "Failed to load payments", "error");
                }
            } finally {
                runningRef.current = false;
                setPaymentsLoading(false);
            }
        },
        [notify, paymentFilters, request],
    );

    const updatePaymentFilter = useCallback((name, value) => {
        setPaymentFilters((current) => ({ ...current, [name]: value }));
    }, []);

    const applyPaymentFilters = useCallback(() => {
        loadPayments({ filters: paymentFilters });
    }, [loadPayments, paymentFilters]);

    const resetPaymentFilters = useCallback(() => {
        const next = { ...EMPTY_FILTERS };
        setPaymentFilters(next);
        loadPayments({ filters: next });
    }, [loadPayments]);

    // ============================================================
    // RECORD PAYMENT
    // ============================================================
    const openPaymentModal = useCallback(() => {
        setPaymentForm({ ...EMPTY_FORM });
        setStudentSearch("");
        setStudentResults([]);
        setSelectedStudent(null);
        setStudentFees([]);
        setSelectedFee(null);
        setPaymentModalOpen(true);
    }, []);

    const closePaymentModal = useCallback(() => {
        setPaymentModalOpen(false);
    }, []);

    const updatePaymentForm = useCallback((name, value) => {
        setPaymentForm((current) => ({ ...current, [name]: value }));
    }, []);

    const searchStudentsForPayment = useCallback(
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

    const selectPaymentStudent = useCallback(
        async (student) => {
            setSelectedStudent(student);
            setSelectedFee(null);
            setPaymentForm((current) => ({ ...current, fee_id: "" }));
            setStudentFeesLoading(true);

            try {
                const params = new URLSearchParams();
                params.set("search", student.student_code || student.name);
                params.set("dues_only", "true");

                const data = await request(
                    `${BASE_URL}/admin/hostel/fees?${params.toString()}`,
                );

                const fees = Array.isArray(data.fees) ? data.fees : [];

                setStudentFees(fees.filter((fee) => fee.student_id === student.id));
            } catch (error) {
                notify(error.message || "Failed to load this student's dues", "error");
            } finally {
                setStudentFeesLoading(false);
            }
        },
        [notify, request],
    );

    const selectPaymentFee = useCallback((fee) => {
        setSelectedFee(fee);
        setPaymentForm((current) => ({
            ...current,
            fee_id: fee.id,
            amount: String(fee.balance),
        }));
    }, []);

    const savePayment = useCallback(async () => {
        if (!paymentForm.fee_id) {
            notify("Select which invoice this payment is for", "error");
            return;
        }

        if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
            notify("A valid amount is required", "error");
            return;
        }

        if (!canWriteHostel) {
            notify(HOSTEL_READ_ONLY_MESSAGE, "error");
            return;
        }

        setPaymentSaving(true);

        try {
            await request(`${BASE_URL}/admin/hostel/payments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fee_id: paymentForm.fee_id,
                    amount: paymentForm.amount,
                    payment_method: paymentForm.payment_method,
                    transaction_reference: paymentForm.transaction_reference.trim(),
                    notes: paymentForm.notes.trim(),
                    payment_date: paymentForm.payment_date,
                }),
            });

            notify("Payment recorded", "success");
            setPaymentModalOpen(false);
            await loadPayments({ silent: true });
        } catch (error) {
            notify(error.message || "Failed to record payment", "error");
        } finally {
            setPaymentSaving(false);
        }
    }, [canWriteHostel, loadPayments, notify, paymentForm, request]);

    useEffect(() => {
        if (activeSection !== "payment") {
            loadedRef.current = false;
            return;
        }

        if (loadedRef.current) {
            return;
        }

        loadedRef.current = true;
        loadPayments({ filters: EMPTY_FILTERS });
    }, [activeSection, loadPayments]);

    return {
        payments,
        paymentStats,
        paymentsLoading,
        paymentFilters,

        loadPayments,
        updatePaymentFilter,
        applyPaymentFilters,
        resetPaymentFilters,

        paymentModalOpen,
        paymentForm,
        paymentSaving,
        openPaymentModal,
        closePaymentModal,
        updatePaymentForm,

        studentSearch,
        setStudentSearch,
        studentResults,
        studentSearchLoading,
        selectedStudent,
        searchStudentsForPayment,
        selectPaymentStudent,

        studentFees,
        studentFeesLoading,
        selectedFee,
        selectPaymentFee,

        savePayment,

        canWriteHostel,
    };
}
