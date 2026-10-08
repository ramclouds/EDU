import { useCallback, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

const EMPTY_SUMMARY = {
  paid_this_year: 0,
  payslip_count: 0,
  pending_payslips: 0,
};

const EMPTY_SALARY_FORM = {
  basic: "",
  hra: "",
  da: "",
  conveyance_allowance: "",
  medical_allowance: "",
  other_allowance: "",
  provident_fund: "",
  professional_tax: "",
  income_tax: "",
  other_deduction: "",
};

const emptyPayslipForm = () => ({
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  working_days: 30,
  lop_days: 0,
  remarks: "",
});

/**
 * Backs the "click on a staff name" modal in the Accounts dashboard's
 * Staff, Salary Management and Payslips sections: identity + salary
 * structure + payslip history, the actions to save a salary structure,
 * generate a payslip, and mark one paid (all gated by canWriteAccounts
 * at the call site), and all of that form's local UI state - kept here
 * rather than in the dashboard component so the component only has to
 * wire onChange/onClick to what this hook already exposes.
 */
export function useStaffSalaryDetails({ fetchWithAuth, showToast }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [staffMember, setStaffMember] = useState(null);
  const [salaryStructure, setSalaryStructure] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);

  const [showSalaryForm, setShowSalaryForm] = useState(false);
  const [salaryForm, setSalaryForm] = useState(EMPTY_SALARY_FORM);

  const [showPayslipForm, setShowPayslipForm] = useState(false);
  const [payslipForm, setPayslipForm] = useState(emptyPayslipForm);

  const updateSalaryForm = useCallback((key, value) => {
    setSalaryForm((f) => ({ ...f, [key]: value }));
  }, []);

  const updatePayslipForm = useCallback((key, value) => {
    setPayslipForm((f) => ({ ...f, [key]: value }));
  }, []);

  const load = useCallback(
    async (recordType, recordId) => {
      if (!fetchWithAuth || !recordType || !recordId) return;

      setOpen(true);
      setLoading(true);

      try {
        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/staff/${recordType}/${recordId}/salary`,
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to load salary details");
        }

        setStaffMember(data.staff);
        setSalaryStructure(data.salary_structure);
        setPayslips(Array.isArray(data.payslips) ? data.payslips : []);
        setSummary({ ...EMPTY_SUMMARY, ...(data.summary || {}) });
      } catch (err) {
        console.error("useStaffSalaryDetails:", err);
        showToast?.(err.message || "Failed to load salary details", "error");
        setOpen(false);
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth, showToast],
  );

  const close = useCallback(() => {
    setOpen(false);
    setStaffMember(null);
    setSalaryStructure(null);
    setPayslips([]);
    setSummary(EMPTY_SUMMARY);
    setShowSalaryForm(false);
    setShowPayslipForm(false);
    setSalaryForm(EMPTY_SALARY_FORM);
    setPayslipForm(emptyPayslipForm());
  }, []);

  const saveSalaryStructure = useCallback(
    async (recordType, recordId, payload) => {
      if (!fetchWithAuth) return false;

      setSaving(true);
      try {
        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/staff/${recordType}/${recordId}/salary-structure`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to save salary structure");
        }

        showToast?.("Salary structure saved", "success");
        await load(recordType, recordId);
        return true;
      } catch (err) {
        showToast?.(err.message || "Failed to save salary structure", "error");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchWithAuth, showToast, load],
  );

  const generatePayslip = useCallback(
    async (recordType, recordId, payload) => {
      if (!fetchWithAuth) return false;

      setSaving(true);
      try {
        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/staff/${recordType}/${recordId}/payslips`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to generate payslip");
        }

        showToast?.("Payslip generated", "success");
        await load(recordType, recordId);
        return true;
      } catch (err) {
        showToast?.(err.message || "Failed to generate payslip", "error");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchWithAuth, showToast, load],
  );

  const markPayslipPaid = useCallback(
    async (recordType, recordId, payslipId, payload) => {
      if (!fetchWithAuth) return false;

      setSaving(true);
      try {
        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/payslips/${payslipId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Paid", ...payload }),
          },
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to update payslip");
        }

        showToast?.("Payslip marked as paid", "success");
        await load(recordType, recordId);
        return true;
      } catch (err) {
        showToast?.(err.message || "Failed to update payslip", "error");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchWithAuth, showToast, load],
  );

  // Pre-fill the edit form from the currently loaded structure (or
  // blank defaults if none exists yet) and show it.
  const openSalaryEditForm = useCallback(() => {
    if (salaryStructure) {
      setSalaryForm({
        basic: salaryStructure.basic,
        hra: salaryStructure.hra,
        da: salaryStructure.da,
        conveyance_allowance: salaryStructure.conveyance_allowance,
        medical_allowance: salaryStructure.medical_allowance,
        other_allowance: salaryStructure.other_allowance,
        provident_fund: salaryStructure.provident_fund,
        professional_tax: salaryStructure.professional_tax,
        income_tax: salaryStructure.income_tax,
        other_deduction: salaryStructure.other_deduction,
      });
    } else {
      setSalaryForm(EMPTY_SALARY_FORM);
    }
    setShowSalaryForm(true);
  }, [salaryStructure]);

  const submitSalaryStructure = useCallback(async () => {
    if (!staffMember) return false;
    const ok = await saveSalaryStructure(
      staffMember.record_type,
      staffMember.id,
      salaryForm,
    );
    if (ok) setShowSalaryForm(false);
    return ok;
  }, [staffMember, salaryForm, saveSalaryStructure]);

  const submitPayslip = useCallback(async () => {
    if (!staffMember) return false;
    const ok = await generatePayslip(staffMember.record_type, staffMember.id, payslipForm);
    if (ok) {
      setShowPayslipForm(false);
      setPayslipForm(emptyPayslipForm());
    }
    return ok;
  }, [staffMember, payslipForm, generatePayslip]);

  return {
    open,
    loading,
    saving,
    staffMember,
    salaryStructure,
    payslips,
    summary,
    load,
    close,
    saveSalaryStructure,
    generatePayslip,
    markPayslipPaid,

    showSalaryForm,
    setShowSalaryForm,
    salaryForm,
    updateSalaryForm,
    openSalaryEditForm,
    submitSalaryStructure,

    showPayslipForm,
    setShowPayslipForm,
    payslipForm,
    updatePayslipForm,
    submitPayslip,
  };
}

export default useStaffSalaryDetails;
