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
// /api/announcements actually accepts. Academic dashboard's existing
// Notifications section posts {title, message, priority, target_role},
// none of which match: the API wants "description" (not "message"),
// "audience" with values like "Students"/"Teachers" (not "target_role"
// with "students"/"teachers"), and a required "notice_date" that
// was never being sent at all - so that flow 422s against the real
// backend. Fixed here so Accounts' version actually works.
const AUDIENCE_OPTIONS = ["All", "Students", "Teachers", "Admins", "Staff"];
const CATEGORY_OPTIONS = ["General", "Academic", "Examination", "Holiday", "Event"];

/**
 * Accounts Admin > Notifications section.
 *
 * This does NOT introduce a new notification system - the actual
 * inbox (notifications, announcements, unread counts, mark-read) is
 * already fetched by useAdminDashboard() (see utils/Notifications.py /
 * GET /api/notifications), the same hook every admin dashboard in this
 * app already calls. This hook only owns the "compose and send a new
 * notification" form and its local UI state (which filter tab is
 * active, the search box), posting to POST /api/announcements
 * (utils/announcement.py's CreateNoticeAPI) with the payload shape
 * that endpoint actually validates.
 */
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
