import { useEffect, useState, useRef } from "react";
import { BASE_URL } from "../config/appConfig";

export function useStudentDashboard(activeSection, setActiveSection) {

  // ================= LOADING =================
  const [loading, setLoading] = useState(true);
  const [noticeLoading, setNoticeLoading] = useState(false);

  // ================= NOTIFICATIONS =================
  const [notifications, setNotifications] = useState([]);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);

  // ================= NOTICES =================
  const [announcements, setNotices] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [noticeStats, setNoticeStats] = useState({
    total: 0,
    important: 0,
    thisWeek: 0,
  });

  // ================= LIBRARY =================
  const [libraryData, setLibraryData] = useState([]);
  const [librarySummary, setLibrarySummary] = useState({
    total_books: 0,
    overdue: 0,
    fine_due: 0,
  });

  // ================= TOAST =================
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type });
    }, 3000);
  };

  // ================= AUTH =================
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

  // ================= AUTH CHECK =================
  useEffect(() => {
    const { user, token } = getAuth();
    if (!user || !token) logoutUser();
  }, []);

  // ================= DASHBOARD PREFETCH =================
  useEffect(() => {
    const { user } = getAuth();
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const [noticeRes, libraryRes] = await Promise.all([
          fetchWithAuth(
            `${BASE_URL}/announcements/student/${user.id}?page=1&limit=5`
          ),
          fetchWithAuth(`${BASE_URL}/library/${user.id}`),
        ]);

        const noticeData = await noticeRes.json();
        const libraryDataRes = await libraryRes.json();

        const notices = noticeData.data || [];
        setNotices(notices);
        setUnreadCount(notices.filter(n => !n.is_read).length);

        setLibraryData(libraryDataRes.books || []);
        setLibrarySummary(libraryDataRes.summary || {});

      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // ================= LIBRARY (ON TAB CHANGE) =================
  useEffect(() => {
    if (activeSection !== "library") return;

    const { user } = getAuth();
    if (!user) return;

    const fetchLibrary = async () => {
      try {
        setLoading(true);

        const res = await fetchWithAuth(
          `${BASE_URL}/library/${user.id}`
        );

        const data = await res.json();

        setLibraryData(data.books || []);
        setLibrarySummary(data.summary || {});
      } catch (err) {
        console.error(err);
        showToast("Failed to load library data", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchLibrary();
  }, [activeSection]);

  // ================= NOTIFICATIONS =================
  const fetchNotifications = async () => {
    try {
      setNotificationLoading(true);

      const res = await fetchWithAuth(`${BASE_URL}/notifications`);
      const data = await res.json();

      const sorted = (data || []).sort((a, b) =>
        a.is_read === b.is_read ? 0 : a.is_read ? 1 : -1
      );

      setNotifications(sorted);
      setNotificationUnread(sorted.filter(n => !n.is_read).length);

    } catch (err) {
      console.error("Notification fetch error:", err);
    } finally {
      setNotificationLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const markNotificationRead = async (id) => {
    try {
      await fetchWithAuth(`${BASE_URL}/notifications/read/${id}`, {
        method: "POST",
      });

      setNotifications(prev =>
        prev.map(n =>
          n.id === id ? { ...n, is_read: true } : n
        )
      );

      setNotificationUnread(prev => Math.max(prev - 1, 0));
    } catch (err) {
      console.error(err);
    }
  };

  // ================= NOTICE =================
  const markNoticeAsRead = async (noticeId) => {
    const { user } = getAuth();

    try {
      await fetchWithAuth(
        `${BASE_URL}/announcements/read/${noticeId}/${user.id}`,
        { method: "POST" }
      );

      setNotices(prev =>
        prev.map(n =>
          n.id === noticeId ? { ...n, is_read: true } : n
        )
      );

      setUnreadCount(prev => Math.max(prev - 1, 0));
    } catch (err) {
      console.error(err);
    }
  };

  // ================= COMBINED =================
  const combinedNotifications = [
    ...(notifications || []).map(n => ({
      ...n,
      source: "leave",
      time: n.created_at,
    })),
    ...(announcements || []).map(n => ({
      ...n,
      source: "notice",
      time: n.date,
    })),
  ];

  const sortedNotifications = [...combinedNotifications].sort((a, b) => {
    if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
    return new Date(b.time) - new Date(a.time);
  });

  const totalUnread =
    (notifications?.filter(n => !n.is_read).length || 0) +
    (announcements?.filter(n => !n.is_read).length || 0);

  const handleNotificationClick = async (n) => {
    if (n.source === "notice") {
      await markNoticeAsRead(n.id);
      setActiveSection("announcements");
    } else {
      await markNotificationRead(n.id);
      setActiveSection("leaves");
    }
  };

  // ================= NOTICE STATS =================
  useEffect(() => {
    if (activeSection !== "announcements") return;

    const total = announcements.length;

    const important = announcements.filter(
      n => n.priority === "High"
    ).length;

    const thisWeek = announcements.filter(n => {
      const d = new Date(n.date);
      const diff = (new Date() - d) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    }).length;

    setNoticeStats({ total, important, thisWeek });
  }, [activeSection, announcements]);

  // ================= RETURN =================
  return {
    loading,
    noticeLoading,

    announcements,
    unreadCount,
    noticeStats,

    libraryData,
    librarySummary,

    notifications,
    notificationUnread,
    notificationLoading,

    combinedNotifications,
    sortedNotifications,
    totalUnread,
    handleNotificationClick,

    markNotificationRead,
    markNoticeAsRead,

    toast,
    fetchWithAuth,
    showToast,
  };
}