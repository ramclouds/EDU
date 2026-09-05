import { useCallback, useEffect, useRef, useState } from "react";

import { BASE_URL } from "../../config/appConfig";
import { useHostelPermission, HOSTEL_READ_ONLY_MESSAGE } from "./useHostelPermission";

const EMPTY_STRUCTURE_FORM = {
    id: null,
    fee_type: "Monthly",
    hostel_id: "",
    amount: "",
    academic_year: "",
    description: "",
    status: "Active",
};

const EMPTY_GENERATE_FORM = {
    fee_structure_id: "",
    due_date: "",
};

/**
 * Drives the "Fee Management" dashboard section: define fee structures
 * (what residents should be charged, e.g. "Annual Hostel Fee -
 * ₹50,000") and generate them as individual invoices for every current
 * resident. Also loads the fee invoice overview (same data the
 * Pending Dues section filters down to unpaid-only).
 */
export function useHostelFeeManagement({ activeSection, fetchWithAuth, showToast }) {
    const { canWriteHostel } = useHostelPermission();

    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);
    const loadedRef = useRef(false);
    const runningRef = useRef(false);

    const [structures, setStructures] = useState([]);
    const [structuresLoading, setStructuresLoading] = useState(false);

    const [fees, setFees] = useState([]);
    const [feeStats, setFeeStats] = useState({});
    const [feesLoading, setFeesLoading] = useState(false);

    const [structureModalOpen, setStructureModalOpen] = useState(false);
    const [structureForm, setStructureForm] = useState({ ...EMPTY_STRUCTURE_FORM });
    const [structureSaving, setStructureSaving] = useState(false);

    const [generateModalOpen, setGenerateModalOpen] = useState(false);
    const [generateForm, setGenerateForm] = useState({ ...EMPTY_GENERATE_FORM });
    const [generateSaving, setGenerateSaving] = useState(false);

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

    const loadStructures = useCallback(
        async ({ silent = false } = {}) => {
            setStructuresLoading(true);

            try {
                const data = await request(`${BASE_URL}/admin/hostel/fee-structures`);

                setStructures(Array.isArray(data.structures) ? data.structures : []);
            } catch (error) {
                console.error("Fee structures load error:", error);

                if (!silent) {
                    notify(error.message || "Failed to load fee structures", "error");
                }
            } finally {
                setStructuresLoading(false);
            }
        },
        [notify, request],
    );

    const loadFees = useCallback(
        async ({ silent = false } = {}) => {
            if (runningRef.current) {
                return;
            }

            runningRef.current = true;
            setFeesLoading(true);

            try {
                const data = await request(`${BASE_URL}/admin/hostel/fees`);

                setFees(Array.isArray(data.fees) ? data.fees : []);
                setFeeStats(data.stats || {});
            } catch (error) {
                console.error("Fees load error:", error);

                if (!silent) {
                    notify(error.message || "Failed to load fee invoices", "error");
                }
            } finally {
                runningRef.current = false;
                setFeesLoading(false);
            }
        },
        [notify, request],
    );

    const refreshAll = useCallback(
        ({ silent = false } = {}) =>
            Promise.all([loadStructures({ silent }), loadFees({ silent })]),
        [loadFees, loadStructures],
    );

    // ============================================================
    // FEE STRUCTURE CRUD
    // ============================================================
    const openCreateStructureModal = useCallback(() => {
        setStructureForm({ ...EMPTY_STRUCTURE_FORM });
        setStructureModalOpen(true);
    }, []);

    const openEditStructureModal = useCallback((structure) => {
        setStructureForm({
            id: structure.id,
            fee_type: structure.fee_type || "Monthly",
            hostel_id: structure.hostel_id || "",
            amount: String(structure.amount ?? ""),
            academic_year: structure.academic_year || "",
            description: structure.description || "",
            status: structure.status || "Active",
        });
        setStructureModalOpen(true);
    }, []);

    const closeStructureModal = useCallback(() => {
        setStructureModalOpen(false);
    }, []);

    const updateStructureForm = useCallback((name, value) => {
        setStructureForm((current) => ({ ...current, [name]: value }));
    }, []);

    const saveStructure = useCallback(async () => {
        if (!structureForm.amount || Number(structureForm.amount) <= 0) {
            notify("A valid amount is required", "error");
            return;
        }

        if (!canWriteHostel) {
            notify(HOSTEL_READ_ONLY_MESSAGE, "error");
            return;
        }

        setStructureSaving(true);

        try {
            const isEdit = Boolean(structureForm.id);

            const payload = {
                fee_type: structureForm.fee_type,
                hostel_id: structureForm.hostel_id || null,
                amount: structureForm.amount,
                academic_year: structureForm.academic_year.trim(),
                description: structureForm.description.trim(),
                status: structureForm.status,
            };

            await request(
                isEdit
                    ? `${BASE_URL}/admin/hostel/fee-structures/${structureForm.id}`
                    : `${BASE_URL}/admin/hostel/fee-structures`,
                {
                    method: isEdit ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );

            notify(isEdit ? "Fee structure updated" : "Fee structure created", "success");
            setStructureModalOpen(false);
            await loadStructures({ silent: true });
        } catch (error) {
            notify(error.message || "Failed to save fee structure", "error");
        } finally {
            setStructureSaving(false);
        }
    }, [canWriteHostel, loadStructures, notify, request, structureForm]);

    const deleteStructure = useCallback(
        async (structure) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            if (
                !window.confirm(
                    `Delete fee structure "${structure.fee_type} - ₹${structure.amount}"?`,
                )
            ) {
                return;
            }

            try {
                await request(
                    `${BASE_URL}/admin/hostel/fee-structures/${structure.id}`,
                    { method: "DELETE" },
                );

                notify("Fee structure deleted", "success");
                await loadStructures({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to delete fee structure", "error");
            }
        },
        [canWriteHostel, loadStructures, notify, request],
    );

    // ============================================================
    // GENERATE INVOICES
    // ============================================================
    const openGenerateModal = useCallback((structure) => {
        setGenerateForm({
            fee_structure_id: structure?.id || "",
            due_date: "",
        });
        setGenerateModalOpen(true);
    }, []);

    const closeGenerateModal = useCallback(() => {
        setGenerateModalOpen(false);
    }, []);

    const updateGenerateForm = useCallback((name, value) => {
        setGenerateForm((current) => ({ ...current, [name]: value }));
    }, []);

    const generateInvoices = useCallback(async () => {
        if (!generateForm.fee_structure_id) {
            notify("Select a fee structure first", "error");
            return;
        }

        if (!canWriteHostel) {
            notify(HOSTEL_READ_ONLY_MESSAGE, "error");
            return;
        }

        setGenerateSaving(true);

        try {
            const data = await request(
                `${BASE_URL}/admin/hostel/fee-structures/generate`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fee_structure_id: generateForm.fee_structure_id,
                        due_date: generateForm.due_date || null,
                    }),
                },
            );

            notify(data.message || "Invoices generated", "success");
            setGenerateModalOpen(false);
            await loadFees({ silent: true });
        } catch (error) {
            notify(error.message || "Failed to generate invoices", "error");
        } finally {
            setGenerateSaving(false);
        }
    }, [canWriteHostel, generateForm, loadFees, notify, request]);

    useEffect(() => {
        if (activeSection !== "fee-management") {
            loadedRef.current = false;
            return;
        }

        if (loadedRef.current) {
            return;
        }

        loadedRef.current = true;
        refreshAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSection]);

    return {
        structures,
        structuresLoading,
        fees,
        feeStats,
        feesLoading,
        refreshAll,
        loadStructures,
        loadFees,

        structureModalOpen,
        structureForm,
        structureSaving,
        openCreateStructureModal,
        openEditStructureModal,
        closeStructureModal,
        updateStructureForm,
        saveStructure,
        deleteStructure,

        generateModalOpen,
        generateForm,
        generateSaving,
        openGenerateModal,
        closeGenerateModal,
        updateGenerateForm,
        generateInvoices,

        canWriteHostel,
    };
}
