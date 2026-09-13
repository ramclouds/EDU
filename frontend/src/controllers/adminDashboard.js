import { useEffect, useState, useRef } from "react";
import Chart from "chart.js/auto";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../config/appConfig";


export function useAdminDashboard(activeSection, setActiveSection) {
    const navigate = useNavigate();

    // 🔄 Loading States
    const [loading, setLoading] = useState(true);
    const [noticeLoading, setNoticeLoading] = useState(false);

    // 🔔 Notifications (NEW)
    const [notifications, setNotifications] = useState([]);
    const [notificationUnread, setNotificationUnread] = useState(0);
    const [notificationLoading, setNotificationLoading] = useState(false);

    // 🔔 Notices
    const [announcements, setNotices] = useState([]);
    const [noticeSubmitting, setNoticeSubmitting] = useState(false);

    //  🔥 COMBINED NOTIFICATIONS 
    const combinedNotifications = [
        ...(notifications || []).map(n => ({
            ...n,
            source: "leave",
            time: n.time || n.created_at || new Date().toISOString()
        })),
        ...(announcements || []).map(n => ({
            ...n,
            // 🐛 BUGFIX: notices come back from the API with a
            // `description` field, not `message`. The bell dropdown and
            // toast both read `item.message`, so notice text was always
            // rendering blank. Fall back through both field names.
            message: n.message || n.description || "",
            source: "notice",
            time: n.date || n.created_at || new Date().toISOString()
        }))
    ];

    const sortedNotifications = [...combinedNotifications].sort((a, b) => {
        if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
        return new Date(b.time || b.date) - new Date(a.time || a.date);
    });

    const [unreadCount, setUnreadCount] = useState(0);
    const totalUnread =
        (announcements?.filter(n => !n.is_read).length || 0) +
        (notifications?.filter(n => !n.is_read).length || 0);

    const [noticeStats, setNoticeStats] = useState({
        total: 0,
        important: 0,
        thisWeek: 0,
    });

    // 🔐 Password
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordData, setPasswordData] = useState({
        current_password: "",
        new_password: "",
        confirm_password: "",
    });

    // 🍞 Toast
    const [toast, setToast] = useState({
        show: false,
        message: "",
        type: "success",
    });

    // 🔐 AUTH HELPERS
    const getAuth = () => {
        try {
            return {
                user: JSON.parse(localStorage.getItem("user")),
                token: localStorage.getItem("token"),
            };
        } catch {
            return { user: null, token: null };
        }
    };

    // 🍞  UI HELPERS
    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: "", type });
        }, 3000);
    };

    // 🌐  API HELPER (COMMON FETCH)
    const fetchWithAuth = async (url, options = {}) => {
        const { token } = getAuth();

        const res = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {}),
                Authorization: `Bearer ${token}`,
            },
        });

        // ✅ auto logout if unauthorized
        if (res.status === 401) {
            localStorage.clear();
            navigate("/");
            throw new Error("Unauthorized");
        }

        return res;
    };

    // ===================== Notifications  ===================
    const fetchNotifications = async () => {
        try {
            setNotificationLoading(true);

            const res = await fetchWithAuth(
                `${BASE_URL}/notifications`
            );

            const json = await res.json();

            const data = Array.isArray(json)
                ? json
                : Array.isArray(json.data)
                    ? json.data
                    : [];

            const sorted = [...(Array.isArray(data) ? data : [])].sort((a, b) => {
                if (a.is_read !== b.is_read) {
                    return a.is_read ? 1 : -1;
                }

                return (
                    new Date(b.created_at || b.time || 0) -
                    new Date(a.created_at || a.time || 0)
                );
            });

            setNotifications(sorted);

            const unread = sorted.filter(
                (n) => !n.is_read
            ).length;

            setNotificationUnread(unread);

        } catch (err) {
            console.error("Notification fetch error:", err);
        } finally {
            setNotificationLoading(false);
        }
    };

    // AUTO FETCH
    useEffect(() => {
        // 🐛 BUGFIX: `loading` was initialized to `true` and never set to
        // `false` anywhere in the original hook, so any UI relying on it
        // would show a permanent loading state. Clear it once the first
        // notifications fetch settles.
        fetchNotifications().finally(() => setLoading(false));

        const interval = setInterval(fetchNotifications, 15000); // refresh every 15 sec
        return () => clearInterval(interval);
    }, []);

    // MARK AS READ FUNCTION
    const markNotificationRead = async (id) => {
        try {
            await fetchWithAuth(`${BASE_URL}/notifications/read/${id}`, {
                method: "POST"
            });

            setNotifications(prev =>
                prev.map(n =>
                    n.id === id ? { ...n, is_read: true } : n
                )
            );

            setNotificationUnread(prev => Math.max(prev - 1, 0));

        } catch (err) {
            console.error("Mark read error:", err);
            showToast("Failed to mark notification as read", "error");
        }
    };

    // MARK ALL AS READ (NEW — was missing entirely, no way to clear the bell in bulk)
    const markAllNotificationsRead = async () => {
        if (!notifications.some(n => !n.is_read)) return;

        try {
            await fetchWithAuth(`${BASE_URL}/notifications/read-all`, {
                method: "POST"
            });

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setNotificationUnread(0);
        } catch (err) {
            console.error("Mark all read error:", err);
            showToast("Failed to mark all notifications as read", "error");
        }
    };

    // DELETE NOTIFICATION (NEW — no way to dismiss/remove a notification before)
    const deleteNotification = async (id) => {
        try {
            await fetchWithAuth(`${BASE_URL}/notifications/${id}`, {
                method: "DELETE"
            });

            setNotifications(prev => {
                const target = prev.find(n => n.id === id);
                if (target && !target.is_read) {
                    setNotificationUnread(u => Math.max(u - 1, 0));
                }
                return prev.filter(n => n.id !== id);
            });
        } catch (err) {
            console.error("Delete notification error:", err);
            showToast("Failed to delete notification", "error");
        }
    };

    const lastNotificationRef = useRef(null);

    useEffect(() => {
        if (!notifications.length) return;

        const latest = notifications[0];

        if (lastNotificationRef.current === latest.id) return;

        if (!latest.is_read) {
            setToast({
                show: true,
                message: `📩 ${latest.title} - ${latest.message || ""}`,
                type: "success",
            });

            lastNotificationRef.current = latest.id;

            setTimeout(() => {
                setToast(prev => ({ ...prev, show: false }));
            }, 4000);
        }
    }, [notifications]);

    //  🔥 CLICK HANDLER 
    const handleNotificationClick = async (n) => {
        try {
            if (n.source === "notice") {
                if (!n.is_read) await markNoticeAsRead(n.id);
                setActiveSection?.("announcements");
            } else {
                if (!n.is_read) await markNotificationRead(n.id);
                // 🐛 BUGFIX: sidebar/section key is "leave-requests", not
                // "studentLeave" — the old value matched nothing, so
                // clicking a leave notification just closed the dropdown
                // and left the admin on whatever section they were on.
                setActiveSection?.("leave-requests");
            }
        } catch (err) {
            console.error(err);
        }
    };

    // =================  NOTICES START =================
    // 🐛 BUGFIX: fetchNotices used to be declared *inside* the effect, so
    // there was no way to re-fetch after creating/editing/removing a
    // notice — the list only ever refreshed on the 30s interval. Moved it
    // out so create/update/delete can trigger an immediate refresh.
    const fetchNotices = async () => {
        const { user } = getAuth();
        if (!user) return;

        try {
            setNoticeLoading(true);
            const res = await fetchWithAuth(
                `${BASE_URL}/announcements/admin/${user.id}?page=1&limit=20`
            );

            const json = await res.json();
            const data = json.data || [];

            // sort unread first
            const sorted = [...(Array.isArray(data) ? data : [])].sort((a, b) => {
                if (a.is_read === b.is_read) return 0;
                return a.is_read ? 1 : -1;
            });

            setNotices(sorted);

            const unread = sorted.filter((n) => !n.is_read).length;
            setUnreadCount(unread);
        } catch (err) {
            console.error(err);
        } finally {
            setNoticeLoading(false);
        }
    };

    useEffect(() => {
        fetchNotices();

        const interval = setInterval(fetchNotices, 30000);
        return () => clearInterval(interval);
    }, []);

    // CREATE NOTICE (NEW — there was previously no way to publish an
    // announcement from the dashboard at all)
    const createNotice = async (payload) => {
        setNoticeSubmitting(true);
        try {
            const res = await fetchWithAuth(`${BASE_URL}/announcements`, {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const json = await res.json();

            if (!res.ok) {
                showToast(json.error || "Failed to create announcement", "error");
                return { success: false, error: json.error };
            }

            showToast("Announcement published", "success");
            await fetchNotices();
            return { success: true, notice: json };
        } catch (err) {
            console.error("Create notice error:", err);
            showToast("Failed to create announcement", "error");
            return { success: false, error: err.message };
        } finally {
            setNoticeSubmitting(false);
        }
    };

    // UPDATE NOTICE (NEW)
    const updateNotice = async (noticeId, payload) => {
        setNoticeSubmitting(true);
        try {
            const res = await fetchWithAuth(`${BASE_URL}/announcements/${noticeId}`, {
                method: "PUT",
                body: JSON.stringify(payload),
            });

            const json = await res.json();

            if (!res.ok) {
                showToast(json.error || "Failed to update announcement", "error");
                return { success: false, error: json.error };
            }

            showToast("Announcement updated", "success");
            await fetchNotices();
            return { success: true, notice: json.notice };
        } catch (err) {
            console.error("Update notice error:", err);
            showToast("Failed to update announcement", "error");
            return { success: false, error: err.message };
        } finally {
            setNoticeSubmitting(false);
        }
    };

    // DELETE (DEACTIVATE) NOTICE (NEW)
    const deleteNotice = async (noticeId) => {
        try {
            const res = await fetchWithAuth(`${BASE_URL}/announcements/${noticeId}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                showToast(json.error || "Failed to remove announcement", "error");
                return { success: false };
            }

            setNotices(prev => prev.filter(n => n.id !== noticeId));
            showToast("Announcement removed", "success");
            return { success: true };
        } catch (err) {
            console.error("Delete notice error:", err);
            showToast("Failed to remove announcement", "error");
            return { success: false };
        }
    };

    //  NOTICE STATS 
    useEffect(() => {
        if (activeSection !== "announcements") return;

        const total = announcements.length;

        const important = announcements.filter(
            (n) => n.priority === "High"
        ).length;

        const thisWeek = announcements.filter((n) => {
            const d = new Date(n.date);
            const now = new Date();
            const diff = (now - d) / (1000 * 60 * 60 * 24);
            return diff <= 7;
        }).length; setNoticeStats({ total, important, thisWeek });
    }, [activeSection, announcements]);

    // MARK READ
    const markNoticeAsRead = async (noticeId) => {
        const { user } = getAuth();

        try {
            await fetchWithAuth(
                `${BASE_URL}/announcements/read/${noticeId}/${user.id}`,
                { method: "POST" }
            );

            setNotices((prev) =>
                prev.map((n) =>
                    n.id === noticeId ? { ...n, is_read: true } : n
                )
            );

            setUnreadCount((prev) => Math.max(prev - 1, 0));
        } catch (err) {
            console.error(err);
        }
    };

    const lastNoticeRef = useRef(null);

    useEffect(() => {
        if (!announcements.length) return;

        const latest = announcements[0];

        if (lastNoticeRef.current === latest.id) return;

        if (!latest.is_read) {
            setToast({
                show: true,
                message: `📢 ${latest.title}`,
                type: "success",
            });

            lastNoticeRef.current = latest.id;

            setTimeout(() => {
                setToast(prev => ({ ...prev, show: false }));
            }, 4000);
        }
    }, [announcements]);


    return {
        // shared helpers
        fetchWithAuth,
        showToast,

        // 🔄 LOADING STATES
        loading,
        noticeLoading,
        unreadCount,
        announcements,
        noticeStats,
        noticeSubmitting,

        // 🔔 NOTICES
        markNoticeAsRead,
        fetchNotices,
        createNotice,
        updateNotice,
        deleteNotice,

        // 🍞 TOAST
        toast,
        notifications,
        notificationUnread,
        notificationLoading,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
        fetchNotifications,

        combinedNotifications,
        sortedNotifications,
        totalUnread,
        handleNotificationClick,
    };
}