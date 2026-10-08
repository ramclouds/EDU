import { useCallback, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

const EMPTY_SUMMARY = {
  total_billed: 0,
  total_paid: 0,
  total_pending: 0,
  overdue_installments: 0,
  installment_count: 0,
};

const EMPTY_INSTALLMENT_FORM = {
  title: "",
  fee_category: "Tuition",
  academic_year: "",
  amount: "",
  late_fee: "",
  discount: "",
  due_date: "",
  remarks: "",
};

const EMPTY_PAYMENT_FORM = {
  amount: "",
  payment_mode: "Cash",
  transaction_ref: "",
  payment_date: "",
  remarks: "",
};

/**
 * Backs the "click on a student name" modal in the Accounts dashboard's
 * Students section: full profile + fee installments + payment history,
 * the actions to add an installment and record a payment against it
 * (both gated by canWriteAccounts at the call site), and all of that
 * form's local UI state (which installment form is open, which
 * installment is mid-payment, the form field values themselves) - kept
 * here rather than in the dashboard component so the component only
 * has to wire onChange/onClick to what this hook already exposes.
 */
export function useStudentFeeDetails({ fetchWithAuth, showToast }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [student, setStudent] = useState(null);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [installments, setInstallments] = useState([]);
  const [payments, setPayments] = useState([]);

  const [showInstallmentForm, setShowInstallmentForm] = useState(false);
  const [installmentForm, setInstallmentForm] = useState(EMPTY_INSTALLMENT_FORM);

  const [payingInstallmentId, setPayingInstallmentId] = useState(null);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT_FORM);

  const updateInstallmentForm = useCallback((key, value) => {
    setInstallmentForm((f) => ({ ...f, [key]: value }));
  }, []);

  const updatePaymentForm = useCallback((key, value) => {
    setPaymentForm((f) => ({ ...f, [key]: value }));
  }, []);

  const resetInstallmentForm = useCallback(() => {
    setInstallmentForm(EMPTY_INSTALLMENT_FORM);
  }, []);

  const resetPaymentForm = useCallback(() => {
    setPaymentForm(EMPTY_PAYMENT_FORM);
  }, []);

  // Toggle the inline "Record Payment" form open for a given
  // installment, pre-filling the amount with its outstanding balance.
  const togglePayment = useCallback(
    (installment) => {
      setPayingInstallmentId((current) =>
        current === installment.id ? null : installment.id,
      );
      setPaymentForm((f) => ({ ...f, amount: installment.balance }));
    },
    [],
  );

  const cancelPayment = useCallback(() => {
    setPayingInstallmentId(null);
    resetPaymentForm();
  }, [resetPaymentForm]);

  const load = useCallback(
    async (studentId) => {
      if (!fetchWithAuth || !studentId) return;

      setOpen(true);
      setLoading(true);

      try {
        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/students/${studentId}/fees`,
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to load fee details");
        }

        setStudent(data.student);
        setSummary({ ...EMPTY_SUMMARY, ...(data.summary || {}) });
        setInstallments(Array.isArray(data.installments) ? data.installments : []);
        setPayments(Array.isArray(data.payments) ? data.payments : []);
      } catch (err) {
        console.error("useStudentFeeDetails:", err);
        showToast?.(err.message || "Failed to load fee details", "error");
        setOpen(false);
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth, showToast],
  );

  const close = useCallback(() => {
    setOpen(false);
    setStudent(null);
    setInstallments([]);
    setPayments([]);
    setSummary(EMPTY_SUMMARY);
    setShowInstallmentForm(false);
    setPayingInstallmentId(null);
    setInstallmentForm(EMPTY_INSTALLMENT_FORM);
    setPaymentForm(EMPTY_PAYMENT_FORM);
  }, []);

  const addInstallment = useCallback(
    async (studentId, payload) => {
      if (!fetchWithAuth) return false;

      setSaving(true);
      try {
        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/students/${studentId}/installments`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to add installment");
        }

        showToast?.("Fee installment added", "success");
        await load(studentId);
        return true;
      } catch (err) {
        showToast?.(err.message || "Failed to add installment", "error");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchWithAuth, showToast, load],
  );

  const recordPayment = useCallback(
    async (studentId, payload) => {
      if (!fetchWithAuth) return false;

      setSaving(true);
      try {
        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/students/${studentId}/payments`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to record payment");
        }

        showToast?.("Payment recorded", "success");
        await load(studentId);
        return true;
      } catch (err) {
        showToast?.(err.message || "Failed to record payment", "error");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchWithAuth, showToast, load],
  );

  // Submit handlers - these own the "call the API, then reset/hide the
  // form on success" flow that used to live in the dashboard component.
  const submitInstallment = useCallback(async () => {
    if (!student) return false;
    const ok = await addInstallment(student.id, installmentForm);
    if (ok) {
      resetInstallmentForm();
      setShowInstallmentForm(false);
    }
    return ok;
  }, [student, installmentForm, addInstallment, resetInstallmentForm]);

  const submitPayment = useCallback(
    async (installmentId) => {
      if (!student) return false;
      const ok = await recordPayment(student.id, {
        ...paymentForm,
        installment_id: installmentId || null,
      });
      if (ok) {
        cancelPayment();
      }
      return ok;
    },
    [student, paymentForm, recordPayment, cancelPayment],
  );

  return {
    open,
    loading,
    saving,
    student,
    summary,
    installments,
    payments,
    load,
    close,
    addInstallment,
    recordPayment,

    showInstallmentForm,
    setShowInstallmentForm,
    installmentForm,
    updateInstallmentForm,
    submitInstallment,

    payingInstallmentId,
    paymentForm,
    updatePaymentForm,
    togglePayment,
    cancelPayment,
    submitPayment,
  };
}

export default useStudentFeeDetails;
