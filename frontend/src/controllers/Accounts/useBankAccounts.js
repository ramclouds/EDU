import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

const EMPTY_SUMMARY = { total_accounts: 0, active_accounts: 0, total_balance: 0 };

const EMPTY_ACCOUNT_FORM = {
  account_name: "",
  bank_name: "",
  account_number: "",
  ifsc_code: "",
  account_type: "Current",
  opening_balance: "",
  notes: "",
};

/**
 * Accounts Admin > Bank Accounts section.
 *
 * Each account's balance is computed server-side from opening_balance
 * plus every linked Income/Expense transaction, so this hook just
 * displays whatever GET /api/accounts/bank-accounts returns rather
 * than tracking balance locally.
 */
export function useBankAccounts({ fetchWithAuth, showToast }) {
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountForm, setAccountForm] = useState(EMPTY_ACCOUNT_FORM);

  const fetchedRef = useRef(false);

  const updateAccountForm = useCallback((key, value) => {
    setAccountForm((f) => ({ ...f, [key]: value }));
  }, []);

  const resetAccountForm = useCallback(() => {
    setAccountForm(EMPTY_ACCOUNT_FORM);
  }, []);

  const loadAccounts = useCallback(async () => {
    if (!fetchWithAuth) return;

    setLoading(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/accounts/bank-accounts`);
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to load bank accounts");
      }

      setAccounts(Array.isArray(data.bank_accounts) ? data.bank_accounts : []);
      setSummary({ ...EMPTY_SUMMARY, ...(data.summary || {}) });
    } catch (err) {
      console.error("useBankAccounts:", err);
      showToast?.(err.message || "Failed to load bank accounts", "error");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, showToast]);

  useEffect(() => {
    if (!fetchWithAuth) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadAccounts();
  }, [fetchWithAuth, loadAccounts]);

  const createAccount = useCallback(
    async (payload) => {
      if (!fetchWithAuth) return false;

      setSaving(true);
      try {
        const res = await fetchWithAuth(`${BASE_URL}/accounts/bank-accounts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to add bank account");
        }

        showToast?.("Bank account added", "success");
        await loadAccounts();
        return true;
      } catch (err) {
        showToast?.(err.message || "Failed to add bank account", "error");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchWithAuth, showToast, loadAccounts],
  );

  const updateAccount = useCallback(
    async (accountId, payload) => {
      if (!fetchWithAuth) return false;

      setSaving(true);
      try {
        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/bank-accounts/${accountId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to update bank account");
        }

        showToast?.("Bank account updated", "success");
        await loadAccounts();
        return true;
      } catch (err) {
        showToast?.(err.message || "Failed to update bank account", "error");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchWithAuth, showToast, loadAccounts],
  );

  const deleteAccount = useCallback(
    async (accountId) => {
      if (!fetchWithAuth) return false;

      setSaving(true);
      try {
        const res = await fetchWithAuth(
          `${BASE_URL}/accounts/bank-accounts/${accountId}`,
          { method: "DELETE" },
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to delete bank account");
        }

        showToast?.("Bank account deleted", "success");
        await loadAccounts();
        return true;
      } catch (err) {
        showToast?.(err.message || "Failed to delete bank account", "error");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchWithAuth, showToast, loadAccounts],
  );

  const submitAccount = useCallback(async () => {
    const ok = await createAccount(accountForm);
    if (ok) {
      resetAccountForm();
      setShowAccountForm(false);
    }
    return ok;
  }, [accountForm, createAccount, resetAccountForm]);

  return {
    accounts,
    summary,
    loading,
    saving,
    reload: loadAccounts,
    createAccount,
    updateAccount,
    deleteAccount,

    showAccountForm,
    setShowAccountForm,
    accountForm,
    updateAccountForm,
    submitAccount,
  };
}

export default useBankAccounts;
