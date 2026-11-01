import { useCallback, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

const EMPTY_FORM = {
  title: "",
  message: "", // maps to the API's "description" field on submit
  category: "General",
  priority: "Medium",
  audience: "All",
};

// The real Notice model (utils/announcement.py) - what POST
const AUDIENCE_OPTIONS = ["All", "Students", "Teachers", "Admins", "Staff"];
const CATEGORY_OPTIONS = ["General", "Academic", "Examination", "Holiday", "Event"];

// Accounts Admin > Notifications section
export function useAccountsNotifications({ fetchWithAuth, showToast }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [filterTab, setFilterTab] = useState("all");
  const [search, setSearch] = useState("");

  const updateForm = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setError("");
  }, []);

  const openModal = useCallback(() => {
    resetForm();
    setModalOpen(true);
  }, [resetForm]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    resetForm();
  }, [resetForm]);

  const submit = useCallback(
    async (event) => {
      event?.preventDefault?.();

      if (!form.title.trim() || !form.message.trim()) {
        setError("Title and message are required");
        return false;
      }

      if (!fetchWithAuth) return false;

      setSaving(true);
      setError("");

      try {
        const res = await fetchWithAuth(`${BASE_URL}/announcements`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.message.trim(),
            category: form.category,
            priority: form.priority,
            audience: form.audience,
            notice_date: new Date().toISOString().slice(0, 10),
          }),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error || "Failed to create notification");
        }

        showToast?.("Notification sent", "success");
        closeModal();
        return true;
      } catch (err) {
        console.error("useAccountsNotifications:", err);
        setError(err.message || "Failed to create notification");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchWithAuth, form, showToast, closeModal],
  );

  return {
    modalOpen,
    openModal,
    closeModal,
    form,
    updateForm,
    saving,
    error,
    submit,

    audienceOptions: AUDIENCE_OPTIONS,
    categoryOptions: CATEGORY_OPTIONS,

    filterTab,
    setFilterTab,
    search,
    setSearch,
  };
}

export default useAccountsNotifications;
