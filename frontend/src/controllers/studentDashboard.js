import { useEffect, useState, useRef } from "react";
import Chart from "chart.js/auto";
import { BASE_URL } from "../config/appConfig";
import { useNavigate } from "react-router-dom";

// const BASE_URL = "http://localhost:5000/api";

export function useStudentDashboard(activeSection, setActiveSection) {
  const navigate = useNavigate();

  // 🟢 1. STATE MANAGEMENT

  // 🔄 Loading States
  const [loading, setLoading] = useState(true);
  const [noticeLoading, setNoticeLoading] = useState(false);
  const [examLoading, setExamLoading] = useState(false);
  const [hostelLoading, setHostelLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // 📚 Assignments
  const [assignments, setAssignments] = useState([]);
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentCounts, setAssignmentCounts] = useState({
    all: 0,
    new: 0,
    pending: 0,
    late: 0,
    submitted: 0,
  });

  // 📊 Academic Data
  const [attendance, setAttendance] = useState({
    summary: {},
    monthly: [],
    records: [],
  });
  const [performance, setPerformance] = useState({ labels: [], marks: [] });
  const [results, setResults] = useState([]);
  const [upcomingExams, setUpcomingExams] = useState([]);

  // 🔔 Notifications (NEW)
  const [notifications, setNotifications] = useState([]);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);

  // 🔔 Notices
  const [announcements, setNotices] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [noticeStats, setNoticeStats] = useState({
    total: 0,
    important: 0,
    thisWeek: 0,
  });

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

  const totalUnread =
    (announcements?.filter(n => !n.is_read).length || 0) +
    (notifications?.filter(n => !n.is_read).length || 0);

  // Hostel
  const [hostel, setHostel] = useState(null);
  const [complaintText, setComplaintText] = useState("");

  // 📖 Library
  const [libraryData, setLibraryData] = useState([]);
  const [librarySummary, setLibrarySummary] = useState({
    total_books: 0,
    overdue: 0,
    fine_due: 0,
  });

  // 🎛 Filters
  const [filters, setFilters] = useState({ year: "all", exam: "all" });
  const [filterOptions, setFilterOptions] = useState({ years: [], exams: [] });

  // 🍞 Toast
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // 📊 Chart Refs
  const attendanceChartRef = useRef(null);
  const attendanceChartInstance = useRef(null);
  const performanceChartRef = useRef(null);
  const performanceChartInstance = useRef(null);

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

  // 📊  DASHBOARD PREFETCH (LOAD ALL DATA ON START)
  useEffect(() => {
    const { user } = getAuth();
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // 🔥 Parallel API calls
        const [
          attendanceRes,
          performanceRes,
          noticeRes,
          assignmentRes,
          resultRes,
          upcomingRes,
          libraryRes,
        ] = await Promise.all([
          fetchWithAuth(`${BASE_URL}/attendance/${user.id}`),
          fetchWithAuth(`${BASE_URL}/performance/${user.id}`),
          fetchWithAuth(`${BASE_URL}/announcements/student/${user.id}?page=1&limit=5`),
          fetchWithAuth(`${BASE_URL}/assignments/${user.id}`),
          fetchWithAuth(`${BASE_URL}/results/${user.id}?year=all&exam=all`),
          fetchWithAuth(`${BASE_URL}/upcoming-exams/${user.id}`),
          fetchWithAuth(`${BASE_URL}/library/${user.id}`),
        ]);

        // 🔽 Convert responses to JSON
        const attendanceData = await attendanceRes.json();
        const performanceData = await performanceRes.json();
        const noticeData = await noticeRes.json();
        const assignmentData = await assignmentRes.json();
        const resultData = await resultRes.json();
        const upcomingData = await upcomingRes.json();
        const libraryDataRes = await libraryRes.json();

        // 🧠 Set states
        setAttendance(attendanceData || {});
        setPerformance(performanceData || {});
        setNotices(noticeData.data || []);
        setResults(resultData || []);
        setUpcomingExams(upcomingData || []);
        setLibraryData(libraryDataRes.books || []);
        setLibrarySummary(libraryDataRes.summary || {});

        // 📚 Assignment processing
        const list = assignmentData.assignments || [];
        setAssignments(list);

        setAssignmentCounts({
          all: list.length,
          new: list.filter(a => a.status === "New").length,
          pending: list.filter(a => a.status === "New").length,
          late: list.filter(a =>
            a.status === "Late" || a.status === "Late Submitted"
          ).length,
          submitted: list.filter(a =>
            a.status === "Submitted" || a.status === "Late Submitted"
          ).length,
        });

      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // 🔐 AUTH CHECK (AUTO LOGOUT)
  useEffect(() => {
    const { user, token } = getAuth();
    if (!user || !token) logoutUser();
  }, []);


  // ================= EXAMS START=================
  useEffect(() => {
    if (activeSection !== "exams") return;

    const { user } = getAuth();
    if (!user) return;

    const fetchExamData = async () => {
      try {
        setExamLoading(true);
        const [res, perfRes, upcomingRes] = await Promise.all([
          fetchWithAuth(
            `${BASE_URL}/results/${user.id}?year=${filters.year}&exam=${filters.exam}`
          ),
          fetchWithAuth(`${BASE_URL}/performance/${user.id}`),
          fetchWithAuth(`${BASE_URL}/upcoming-exams/${user.id}`),
        ]);

        setResults(await res.json());
        setPerformance(await perfRes.json());
        setUpcomingExams(await upcomingRes.json());
      } catch (err) {
        console.error(err);
        showToast("Failed to load exam data", "error");
      } finally {
        setExamLoading(false);
      }
    };

    fetchExamData();
  }, [activeSection, filters]);

  //  Performance Chart (Dashboard + Exams) 
  useEffect(() => {
    if (
      (activeSection !== "exams" &&
        activeSection !== "dashboard") ||
      examLoading
    ) return;

    if (!performanceChartRef.current) return;

    const dataReady =
      performance?.labels?.length &&
      performance?.marks?.length;

    if (!dataReady) return;

    // 🔥 Destroy old chart
    if (performanceChartInstance.current) {
      performanceChartInstance.current.destroy();
    }

    const ctx = performanceChartRef.current.getContext("2d");

    performanceChartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: performance.labels,
        datasets: [
          {
            label: "Marks",
            data: performance.marks,
            borderColor: "#3b82f6",
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    });

    return () => {
      performanceChartInstance.current?.destroy();
    };
  }, [performance, activeSection, examLoading]);


  //  FILTER OPTIONS EXAM 
  useEffect(() => {
    if (activeSection !== "exams" || examLoading) return;

    const { user } = getAuth();
    if (!user) return;

    const fetchFilters = async () => {
      try {
        const res = await fetchWithAuth(
          `${BASE_URL}/results/filters/${user.id}`
        );

        const data = await res.json();

        setFilterOptions({
          years: data.years || [],
          exams: data.exams || [],
        });
      } catch (err) {
        console.error(err);
      }
    };

    fetchFilters();
  }, [activeSection]);


  const handleFilterChange = (e) => {
    setFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Download Result EXAM 
  const handleDownloadResultsPDF = async () => {
    const { user } = getAuth();

    try {
      const res = await fetchWithAuth(
        `${BASE_URL}/results/pdf/${user.id}`
      );

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "results.pdf";
      a.click();

      window.URL.revokeObjectURL(url);

      showToast("Results downloaded");
    } catch {
      showToast("Download failed", "error");
    }
  };


  // ================= HOSTEL =================
  useEffect(() => {
    if (activeSection !== "studhostel") return;

    const { user } = getAuth();
    if (!user) return;

    const fetchHostel = async () => {
      try {
        setHostelLoading(true);
        const res = await fetchWithAuth(
          `${BASE_URL}/student/${user.id}/hostel`
        );
        setHostel(await res.json());
      } catch {
        showToast("Failed to load hostel", "error");
      }
      finally {
        setHostelLoading(false);
      }
    };

    fetchHostel();
  }, [activeSection]);

  //  COMPLAINT HOSTEL
  const handleRaiseComplaint = async () => {
    if (!complaintText.trim()) {
      showToast("Enter complaint", "error");
      return;
    }

    const { user } = getAuth();

    try {
      const res = await fetchWithAuth(
        `${BASE_URL}/student/${user.id}/hostel/complaint`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ issue: complaintText }),
        }
      );

      if (res.ok) {
        showToast("Complaint submitted");
        setComplaintText("");
      } else {
        const data = await res.json();
        showToast(data.error, "error");
      }
    } catch {
      showToast("Failed", "error");
    }
  };


  // ================= ATTENDANCE START=================
  useEffect(() => {
    if (activeSection !== "attendance") return;

    const { user } = getAuth();
    if (!user) return;

    const fetchAttendance = async () => {
      try {
        setAttendanceLoading(true);

        const res = await fetchWithAuth(
          `${BASE_URL}/attendance/${user.id}`
        );

        const data = await res.json();

        setAttendance(data || {});
      } catch (err) {
        console.error(err);
        showToast("Failed to load attendance", "error");
      } finally {
        setAttendanceLoading(false);
      }
    };

    fetchAttendance();
  }, [activeSection]);

  // DOWNLOAD ATTENDANCE
  const handleDownloadPDF = async () => {
    const { user } = getAuth();

    try {
      const res = await fetchWithAuth(
        `${BASE_URL}/attendance/pdf/${user.id}`
      );

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "attendance.pdf";
      a.click();

      window.URL.revokeObjectURL(url);

      showToast("Attendance downloaded");
    } catch {
      showToast("Download failed", "error");
    }
  };


  //  Attendace Chart (Dashboard + Attendance) 
  useEffect(() => {
    if (
      (activeSection !== "attendance" &&
        activeSection !== "dashboard") ||
      attendanceLoading
    ) return;

    if (!attendanceChartRef.current) return;

    const dataReady =
      attendance?.summary &&
      typeof attendance.summary.present !== "undefined";

    if (!dataReady) return;

    // 🔥 Destroy old chart
    if (attendanceChartInstance.current) {
      attendanceChartInstance.current.destroy();
    }

    const ctx = attendanceChartRef.current.getContext("2d");

    attendanceChartInstance.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Present", "Absent", "Late"],
        datasets: [
          {
            data: [
              attendance.summary.present || 0,
              attendance.summary.absent || 0,
              attendance.summary.late || 0,
            ],
            backgroundColor: ["#22c55e", "#ef4444", "#facc15"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    });

    return () => {
      attendanceChartInstance.current?.destroy();
    };
  }, [attendance, activeSection, attendanceLoading]);

  // ================= LIBRARY START =================
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
        setActiveSection("leaves"); // ✅ correct
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
          `${BASE_URL}/announcements/student/${user.id}?page=1&limit=20`
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

  return {
    // 🔄 LOADING STATES
    loading,
    noticeLoading,
    examLoading,
    hostelLoading,
    attendanceLoading,

    // 📊 DASHBOARD DATA
    attendance,
    results,
    upcomingExams,
    performance,
    announcements,
    noticeStats,
    unreadCount,
    hostel,
    libraryData,
    librarySummary,

    // 🎛 FILTERS
    filters,
    filterOptions,

    // 📌 REFS (CHARTS)
    attendanceChartRef,
    performanceChartRef,

    // 📥 DOWNLOADS
    handleDownloadPDF,
    handleDownloadResultsPDF,

    // 🔍 FILTER
    handleFilterChange,

    // 🔔 NOTICES
    markNoticeAsRead,


    notifications,
    notificationUnread,
    notificationLoading,
    markNotificationRead,

    combinedNotifications,
    sortedNotifications,
    totalUnread,
    handleNotificationClick,

    // 🏠 HOSTEL
    complaintText,
    setComplaintText,
    handleRaiseComplaint,


    // 🍞 TOAST
    toast,
    fetchWithAuth,
    showToast,
  };
}

