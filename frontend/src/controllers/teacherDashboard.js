import { useEffect, useState, useRef } from "react";
import Chart from "chart.js/auto";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://localhost:5000/api";

export function useTeacherDashboard(activeSection, setActiveSection) {
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

  //  🔥 COMBINED NOTIFICATIONS 
  const combinedNotifications = [
    ...(notifications || []).map(n => ({
      ...n,
      source: "leave",
      time: n.time || n.created_at || new Date().toISOString()
    })),
    ...(announcements || []).map(n => ({
      ...n,
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

  const logoutUser = () => {
    localStorage.clear();
    window.location.href = "/";
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
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      logoutUser();
      throw new Error("Unauthorized");
    }

    return res;
  };

  // ===================== Notifications  ===================
  const fetchNotifications = async () => {
    try {
      setNotificationLoading(true);

      const res = await fetchWithAuth(`${BASE_URL}/notifications`);
      const data = await res.json();

      const sorted = (data || []).sort((a, b) => {
        if (a.is_read === b.is_read) return 0;
        return a.is_read ? 1 : -1;
      });

      setNotifications(sorted);

      const unread = sorted.filter(n => !n.is_read).length;
      setNotificationUnread(unread);

    } catch (err) {
      console.error("Notification fetch error:", err);
    } finally {
      setNotificationLoading(false);
    }
  };

  // AUTO FETCH
  useEffect(() => {
    fetchNotifications();

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
        await markNoticeAsRead(n.id);
        setActiveSection("announcements"); // ✅ correct
      } else {
        await markNotificationRead(n.id);
        setActiveSection("studentLeave"); // ✅ correct
      }
    } catch (err) {
      console.error(err);
    }
  };

  // =================  NOTICES START =================
  useEffect(() => {
    const { user } = getAuth();
    if (!user) return;

    const fetchNotices = async () => {
      try {
        setNoticeLoading(true);
        const res = await fetchWithAuth(
          `${BASE_URL}/announcements/teacher/${user.id}?page=1&limit=20`
        );

        const json = await res.json();
        const data = json.data || [];

        // sort unread first
        const sorted = [...data].sort((a, b) => {
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

    fetchNotices();

    const interval = setInterval(fetchNotices, 30000);
    return () => clearInterval(interval);
  }, []);

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

  
  // ================= LOGOUT =================
  const handleLogout = logoutUser;

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

    // 🔔 NOTICES
    markNoticeAsRead,

    // 🍞 TOAST
    toast,
    notifications,
    notificationUnread,
    notificationLoading,
    markNotificationRead,

    combinedNotifications,
    sortedNotifications,
    totalUnread,
    handleNotificationClick,
  };
}