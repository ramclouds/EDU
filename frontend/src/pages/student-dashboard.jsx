import { useState, useEffect } from "react";
import { APP_NAME, APP_YEAR, FILE_BASE_URL } from "../config/appConfig";
import "../css/dashboard.css";
import { useStudentProfile } from "../controllers/StudentSide/useStudentProfile";
import { useStudentDashboard } from "../controllers/StudentSide/studentDashboard";
import { useDashboardUI } from "../controllers/useDashboardUI";
import { useStudentAssignments } from "../controllers/StudentSide/useStudentAssignments";
import { useStudentLeaves } from "../controllers/StudentSide/useStudentLeaves";
import { useStudentTimeTable } from "../controllers/StudentSide/useStudentTimeTable";
import { useStudentAttendance } from "../controllers/StudentSide/useStudentAttendance";
import { useStudentExams } from "../controllers/Academic/useStudentExams";
import { useStudentHostel } from "../controllers/Hostel/useStudentHostel";
import { useStudentLibrary } from "../controllers/Library/useStudentLibrary";

// ================= HOSTEL: SMALL DISPLAY HELPERS =================
function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value) {
  if (value === null || value === undefined) return "-";
  return `₹${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function statusBadgeClass(status) {
  const positive = [
    "Paid",
    "Approved",
    "Resolved",
    "Present",
    "Active",
    "Returned",
    "Available",
    "Issued",
  ];
  const warning = [
    "Pending",
    "Partially Paid",
    "In Progress",
    "Late Entry",
    "Due Soon",
  ];
  const negative = [
    "Overdue",
    "Rejected",
    "Absent",
    "Cancelled",
    "Unavailable",
    "Blocked",
  ];
  const info = ["Waived", "Refunded"];

  if (positive.includes(status)) {
    return "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300";
  }
  if (warning.includes(status)) {
    return "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-300";
  }
  if (negative.includes(status)) {
    return "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300";
  }
  if (info.includes(status)) {
    return "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300";
  }
  return "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300";
}

function hostelPriorityBadgeClass(priority) {
  switch (priority) {
    case "Urgent":
      return "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300";
    case "High":
      return "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300";
    case "Low":
      return "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300";
    default:
      return "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-300";
  }
}

const HOSTEL_TABS = [
  { id: "overview", label: "Overview", icon: "bi-house-door" },
  { id: "fees", label: "Fees", icon: "bi-cash-coin" },
  { id: "complaints", label: "Complaints", icon: "bi-megaphone" },
  { id: "leave", label: "Leave", icon: "bi-calendar-check" },
  { id: "visitors", label: "Visitors", icon: "bi-person-lines-fill" },
  { id: "mess", label: "Mess Menu", icon: "bi-egg-fried" },
  { id: "attendance", label: "Attendance", icon: "bi-clipboard-check" },
];

const MESS_DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function StudentDashboard() {
  const [noticeTab, setNoticeTab] = useState("announcements");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [visibleCards, setVisibleCards] = useState([]);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showVisitorModal, setShowVisitorModal] = useState(false);

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  // ================= UI HOOK =================
  const {
    navigate,
    sidebarOpen,
    profileOpen,
    mobileSearchOpen,
    showPassword,
    showNotifications,
    darkMode,

    setSidebarOpen,
    setProfileOpen,
    setMobileSearchOpen,
    setShowPassword,
    setShowNotifications,
    setDarkMode,

    bellRef,
    toggleTheme,
  } = useDashboardUI();

  // ================= MAIN DASHBOARD =================
  const {
    loading,
    noticeLoading,
    // 📊 Data

    announcements,
    noticeStats,
    unreadCount,

    // 🔔 Notices
    markNoticeAsRead,

    // Notifications
    notifications,
    notificationUnread,
    notificationLoading,
    markNotificationRead,

    combinedNotifications,
    sortedNotifications,
    totalUnread,
    handleNotificationClick,

    // 🍞 Toast
    toast,

    // 🔥 IMPORTANT: pass helpers
    fetchWithAuth,
    showToast,
  } = useStudentDashboard(activeSection, setActiveSection);

  // ================= ASSIGNMENT HOOK (NEW) =================
  const {
    assignments,
    assignmentCounts,
    assignmentSearch,
    setAssignmentSearch,
    assignmentLoading,
    selectedFiles,
    handleFileChange,
    filterAssignments,
    submitAssignment,
  } = useStudentAssignments(fetchWithAuth, showToast);

  // ================= LEAVE HOOK =================
  const {
    leaveForm,
    studentLeaves,
    leaveLoading,
    totalDays,
    setLeaveForm,
    handleLeaveChange,
    applyLeave,
    deleteLeave,
    fetchStudentLeaves,
  } = useStudentLeaves({
    activeSection,
    fetchWithAuth,
    showToast,
  });

  // ================= TIMETABLE HOOK =================
  const { timetableLoading, timetable } = useStudentTimeTable({
    activeSection,
    fetchWithAuth,
    showToast,
  });

  // ================= STUDENT PROFILE =================
  const {
    // 👤 User
    student,
    formData,
    editMode,
    // 🔐 Password
    passwordModalOpen,
    setPasswordModalOpen,
    passwordData,
    passwordLoading,
    handlePasswordChange,
    handleChangePassword,
    // ✏️ Actions
    setEditMode,
    handleChange,
    handleSave,
    handleLogout,
  } = useStudentProfile({ fetchWithAuth });

  // ================== Attendance =============
  const {
    attendance,
    attendanceLoading,
    attendanceChartRef,
    handleDownloadPDF,
  } = useStudentAttendance(fetchWithAuth, activeSection, showToast);

  // ================= EXAM HOOK =================
  const {
    examLoading,
    results,
    performance,
    upcomingExams,
    filters,
    filterOptions,
    performanceChartRef,
    handleFilterChange,
    handleDownloadResultsPDF,
  } = useStudentExams(fetchWithAuth, activeSection, showToast);

  // ================= HOSTEL HOOK =================
  const {
    hostel,
    hostelLoading,
    hostelTab,
    setHostelTab,
    fees,
    feeSummary,
    feesLoading,
    complaintCategory,
    setComplaintCategory,
    complaintPriority,
    setComplaintPriority,
    complaintSubmitting,
    leaveRequests,
    leaveLoading: hostelLeaveLoading,
    leaveForm: hostelLeaveForm,
    setLeaveForm: setHostelLeaveForm,
    leaveSubmitting,
    handleApplyLeave,
    handleCancelLeave,
    visitors,
    visitorsLoading,
    visitorForm,
    setVisitorForm,
    visitorSubmitting,
    handleRequestVisitor,
    messMenu,
    messMenuLoading,
    attendance: hostelAttendance,
    attendanceLoading: hostelAttendanceLoading,
    complaintText,
    setComplaintText,
    handleRaiseComplaint,
  } = useStudentHostel(fetchWithAuth, activeSection, showToast);

  // ================= STUDENT LIBRARY =================
  const {
    studentLibraryLoading,

    studentLibrarySummary,
    libraryProfile,

    currentBooks,
    borrowingHistory,
    fineRecords,
    paymentHistory,
    libraryNotifications,

    libraryActiveTab,
    setLibraryActiveTab,

    librarySearch,
    setLibrarySearch,

    libraryStatusFilter,
    setLibraryStatusFilter,

    filteredCurrentBooks,
    filteredHistory,

    selectedLibraryRecord,
    libraryRecordModalOpen,

    refreshStudentLibrary,

    openLibraryRecord,
    closeLibraryRecord,

    // catalog
    catalogBooks,
    catalogCategories,
    catalogAuthors,
    catalogLoading,
    catalogPagination,
    catalogSearch,
    setCatalogSearch,
    catalogCategoryId,
    setCatalogCategoryId,
    catalogAuthorId,
    setCatalogAuthorId,
    catalogStatusFilter,
    setCatalogStatusFilter,
    searchCatalog,
    changeCatalogPage,
  } = useStudentLibrary({
    activeSection,
    fetchWithAuth,
    showToast,
  });

  // 🎴 Dashboard Card Animation
  useEffect(() => {
    if (!loading && activeSection === "dashboard") {
      setVisibleCards([]);

      const cards = [
        "attendance",
        "subjects",
        "assignments",
        "score",
        "assignmentsCard",
        "examsCard",
        "noticesCard",
        "performanceChart",
        "attendanceChart",
        "libraryCard",
      ];

      cards.forEach((card, index) => {
        setTimeout(() => {
          setVisibleCards((prev) => [...prev, card]);
        }, index * 400);
      });
    }
  }, [loading, activeSection]);

  const CardLoader = () => (
    <div className="flex justify-center items-center h-16">
      <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="flex">
      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[50] md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`sidebar fixed top-0 left-0 h-screen 
  bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl 
  border-r border-gray-200 dark:border-slate-700 
  shadow-2xl z-[60] flex flex-col
  transition-all duration-300

  /* 📱 MOBILE */
  ${sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"}

  /* 💻 DESKTOP */
  md:translate-x-0
  ${sidebarOpen ? "md:w-64" : "md:w-20"}
`}
      >
        <div
          className={`border-b border-gray-100 dark:border-slate-700 
  flex items-center transition-all duration-300
  ${sidebarOpen ? "px-6 py-5 gap-2 justify-start" : "py-5 justify-center"}
`}
        >
          <i className="bi bi-mortarboard text-purple-600 text-xl"></i>

          <span
            className={`font-bold text-lg text-purple-600 transition-all duration-200
    ${sidebarOpen ? "opacity-100 ml-2" : "opacity-0 w-0 overflow-hidden"}
    md:${sidebarOpen ? "block" : "hidden"}
  `}
          >
            {APP_NAME}
          </span>
        </div>

        {/* NAV */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 text-sm">
          {[
            ["dashboard", "bi-grid-fill", "Dashboard"],
            ["attendance", "bi-calendar-check", "Attendance"],
            ["assignments", "bi-journal-text", "Assignments"],
            ["exams", "bi-award", "Exams & Results"],
            ["timetable", "bi-clock", "Timetable"],
            ["studhostel", "bi-building", "Hostel"],
            ["library", "bi-collection", "Library"],
            ["leaves", "bi-calendar-check", "My Leave"],
            ["announcements", "bi-bell", "Notices"],
            ["profile", "bi-person", "Profile"],
          ].map(([key, icon, label]) => {
            const isActive = activeSection === key;

            return (
              <button
                key={key}
                title={!sidebarOpen ? label : ""}
                onClick={() => {
                  setActiveSection(key);
                  setSidebarOpen(false);
                }}
                className={`relative flex w-full items-center 
  ${sidebarOpen ? "gap-3 px-4 justify-start" : "justify-center"}
  py-3 rounded-xl transition-all duration-200 group
  ${
    isActive
      ? "bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-500/20 dark:to-indigo-500/20 text-purple-700 dark:text-purple-300 font-semibold shadow-sm"
      : "text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-800 dark:hover:text-white"
  }`}
              >
                {/* ACTIVE INDICATOR */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-purple-600 rounded-r-full"></span>
                )}

                <i className={`bi ${icon} text-base`}></i>

                <span
                  className={`${sidebarOpen ? "block" : "hidden"} truncate`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </nav>

        <div
          className={`border-t border-gray-100 dark:border-slate-700 
  text-xs text-gray-400 dark:text-gray-500 
  transition-all duration-300
  ${sidebarOpen ? "p-4 text-center" : "py-4 flex justify-center"}
`}
        >
          <span
            className={`transition-all duration-200
    ${sidebarOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden"}
    md:${sidebarOpen ? "block" : "hidden"}
  `}
          >
            {APP_NAME} © {APP_YEAR}
          </span>

          {/* Optional icon when collapsed */}
          {!sidebarOpen && (
            <i
              className="bi bi-mortarboard text-purple-500"
              title={`${APP_NAME} © ${APP_YEAR}`}
            ></i>
          )}
        </div>
      </aside>
      {/* MAIN */}
      <main
        className={`flex-1 w-full min-h-screen p-4 sm:p-6 md:p-8 
${sidebarOpen ? "md:ml-64" : "md:ml-20"}
maincolor transition-all duration-300 
dark:bg-slate-900 text-gray-800 dark:text-gray-100`}
      >
        {/* CENTER WRAPPER */}
        <div className="max-w-7xl mx-auto space-y-6">
          {/* TOAST */}
          {toast.show && (
            <div className="fixed top-[90px] right-6 z-[9999] flex flex-col gap-3">
              <div
                className={`min-w-[260px] max-w-sm px-5 py-3 rounded-2xl shadow-2xl text-white text-sm
      backdrop-blur-xl border border-white/20
      animate-slideInRight transition-all duration-300
      ${toast.type === "success" ? "bg-emerald-500/90" : "bg-indigo-500/90"}`}
              >
                {toast.message}
              </div>
            </div>
          )}

          {/* HEADER */}
          <div
            className="sticky top-0 z-40 px-4 sm:px-6 py-3 
  bg-gradient-to-r from-white/70 via-white/60 to-white/70 
  dark:from-slate-800/80 dark:via-slate-800/70 dark:to-slate-800/80
  backdrop-blur-2xl 
  border border-white/40 dark:border-slate-700
  shadow-[0_10px_40px_rgba(0,0,0,0.08)]
  rounded-2xl transition-all duration-300 flex items-center justify-between gap-4"
          >
            <div className="flex items-center justify-between gap-4 w-full">
              {/* 🏫 SCHOOL NAME */}
              <div className="flex items-center gap-2 md:hidden">
                <i className="bi bi-mortarboard text-indigo-600 text-lg"></i>
              </div>
              {/* DESKTOP SIDEBAR TOGGLE */}
              <button
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="sidebar-toggle hidden md:flex items-center justify-center
  bg-white/70 dark:bg-slate-700/70
  backdrop-blur-md hover:bg-white dark:hover:bg-slate-600
  transition p-2.5 rounded-full shadow-md hover:scale-105"
              >
                <i
                  className={`bi ${sidebarOpen ? "bi-chevron-left" : "bi-list"} text-lg`}
                ></i>
              </button>

              {/* SEARCH */}
              <div className="hidden md:flex w-1/2 relative group px-4">
                <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"></i>

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-full
        bg-white/70 dark:bg-slate-700/70
        backdrop-blur-md border border-gray-200 dark:border-slate-600
        text-gray-800 dark:text-white
        placeholder-gray-400 dark:placeholder-gray-400
        focus:bg-white dark:focus:bg-slate-700
        outline-none focus:ring-2 focus:ring-indigo-500
        shadow-sm hover:shadow-md transition-all duration-300"
                  placeholder="Search anything here..."
                />
              </div>

              {/* RIGHT */}
              <div className="flex items-center gap-2 sm:gap-4">
                {/* MOBILE MENU */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSidebarOpen(true);
                  }}
                  className="md:hidden bg-white/70 dark:bg-slate-700/70 
        backdrop-blur-md hover:bg-white dark:hover:bg-slate-600
        transition p-2.5 rounded-full shadow-md hover:scale-105"
                >
                  <i className="bi bi-list text-lg text-gray-700 dark:text-gray-200"></i>
                </button>

                {/* MOBILE SEARCH */}
                <button
                  onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                  className="md:hidden bg-white/70 dark:bg-slate-700/70 
        backdrop-blur-md hover:bg-white dark:hover:bg-slate-600
        transition p-2.5 rounded-full shadow-md hover:scale-105"
                >
                  <i className="bi bi-search text-lg text-gray-700 dark:text-gray-200"></i>
                </button>

                {/* NOTIFICATIONS */}
                <div ref={bellRef} className="relative">
                  <div
                    className="relative cursor-pointer bg-white/70 dark:bg-slate-700/70
          backdrop-blur-md hover:bg-white dark:hover:bg-slate-600
          transition p-2.5 rounded-full shadow-md hover:scale-105"
                    onClick={() => setShowNotifications((prev) => !prev)}
                  >
                    <i className="bi bi-bell text-lg text-gray-700 dark:text-gray-200"></i>

                    {totalUnread > 0 && (
                      <span
                        className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 
              text-[10px] flex items-center justify-center 
              bg-gradient-to-r from-red-500 to-pink-500 
              text-white rounded-full animate-pulse shadow"
                      >
                        {totalUnread > 99 ? "99+" : totalUnread}
                      </span>
                    )}
                  </div>

                  {/* DROPDOWN */}
                  {showNotifications && (
                    <div
                      className="fixed top-20 left-1/2 -translate-x-1/2 
            w-[92vw] max-w-md 
            bg-white/95 dark:bg-slate-800/95
            backdrop-blur-2xl 
            rounded-2xl shadow-2xl 
            border border-white/40 dark:border-slate-700
            z-[70] overflow-hidden animate-fadeIn"
                    >
                      <div className="p-4 border-b dark:border-slate-700 font-semibold flex justify-between items-center text-gray-800 dark:text-white">
                        Notifications
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="text-xs text-gray-500 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="max-h-80 overflow-y-auto">
                        {(sortedNotifications || []).filter((n) => !n.is_read)
                          .length === 0 ? (
                          <p className="p-4 text-sm text-gray-500 text-center">
                            🎉 You're all caught up
                          </p>
                        ) : (
                          (sortedNotifications || [])
                            .filter((n) => !n.is_read)
                            .slice(0, 5)
                            .map((n) => (
                              <div
                                key={`${n.source}-${n.id}-${n.time || n.date}`} // ✅ FIX HERE
                                onClick={() =>
                                  handleNotificationClick &&
                                  handleNotificationClick(n)
                                }
                                className="p-4 border-b dark:border-slate-700 text-sm 
      hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
                              >
                                <p className="truncate text-gray-800 dark:text-white flex items-center gap-2">
                                  {n.source === "leave" ? "📩" : "📢"} {n.title}
                                </p>

                                <p className="text-xs text-gray-500 truncate">
                                  {n.message || ""}
                                </p>

                                <p className="text-xs text-gray-400">
                                  {n.time}
                                </p>
                              </div>
                            ))
                        )}
                      </div>

                      {/* <div
                        className="p-3 text-center text-sm text-indigo-600 
              hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer font-medium"
                        onClick={() => {
                          navigate("/teacher/announcement"); // ✅ better route
                          setShowNotifications(false);
                        }}
                      >
                        View All Notices →
                      </div> */}
                    </div>
                  )}
                </div>

                {/* PROFILE */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 
    bg-gradient-to-r from-white/70 to-white/60 
    dark:from-slate-700/70 dark:to-slate-700/60
    backdrop-blur-md px-2 py-1.5 rounded-full 
    transition shadow-md hover:scale-105"
                  >
                    <img
                      src="https://i.pravatar.cc/100"
                      className="rounded-full w-9 h-9 border-2 border-white dark:border-slate-600 shadow"
                    />

                    <span className="font-medium hidden sm:inline text-sm text-gray-800 dark:text-gray-200">
                      {student?.first_name}
                    </span>
                  </button>

                  {profileOpen && (
                    <div
                      className="absolute right-0 mt-4 w-56 
      bg-white/95 dark:bg-slate-800/95
      backdrop-blur-2xl 
      rounded-2xl shadow-2xl 
      border border-white/40 dark:border-slate-700 
      z-50"
                    >
                      {/* USER INFO */}
                      <div className="px-4 py-4 border-b border-gray-200 dark:border-slate-700">
                        <p className="font-semibold text-gray-800 dark:text-white">
                          {student?.first_name} {student?.last_name}
                        </p>
                      </div>

                      {/* MENU */}
                      <ul className="py-2 text-sm">
                        {/* 👤 PROFILE */}
                        <li
                          onClick={() => {
                            setActiveSection("profile");
                            setProfileOpen(false);
                          }}
                          className="flex items-center gap-2 px-4 py-2 
          hover:bg-gray-100 dark:hover:bg-slate-700 
          cursor-pointer text-gray-700 dark:text-gray-200"
                        >
                          <i className="fa-solid fa-user text-gray-500 dark:text-gray-400"></i>
                          My Profile
                        </li>

                        {/* 🔐 PASSWORD */}
                        <li
                          onClick={() => {
                            setPasswordModalOpen(true);
                            setProfileOpen(false);
                          }}
                          className="flex items-center gap-2 px-4 py-2 
          hover:bg-gray-100 dark:hover:bg-slate-700 
          cursor-pointer text-gray-700 dark:text-gray-200"
                        >
                          <i className="fa-solid fa-lock text-gray-500 dark:text-gray-400"></i>
                          Password Change
                        </li>

                        {/* 🌙 DARK MODE */}
                        <li
                          onClick={toggleTheme}
                          className="flex items-center justify-between px-4 py-2 
          hover:bg-gray-100 dark:hover:bg-slate-700 
          cursor-pointer"
                        >
                          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                            <i className="bi bi-moon text-gray-500 dark:text-gray-400"></i>
                            <span>Dark Mode</span>
                          </div>

                          <span className="text-xs text-gray-400">
                            {darkMode ? "ON" : "OFF"}
                          </span>
                        </li>
                      </ul>

                      {/* LOGOUT */}
                      <div className="border-t border-gray-200 dark:border-slate-700">
                        <button
                          onClick={handleLogout}
                          className="w-full px-4 py-3 text-red-600 
          hover:bg-red-50 dark:hover:bg-red-500/10 
          transition"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* MOBILE SEARCH */}
          {mobileSearchOpen && (
            <div className="md:hidden px-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-5 py-3 rounded-full bg-white shadow-md 
        outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Search anything here..."
              />
            </div>
          )}
        </div>

        {/* ===================== DASHBOARD SECTION START =========================== */}
        {activeSection === "dashboard" && (
          <section className="section p-4 sm:p-6 space-y-6 active">
            {/* HEADER */}
            <div>
              <h2 className="text-lg sm:text-xl font-semibold">
                Welcome back, {student?.first_name} {student?.last_name} 👋
              </h2>
              <p className="text-gray-500 text-sm">
                Here’s your academic overview.
              </p>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Attendance */}
              <div className="bg-white shadow-sm hover:shadow-md transition p-4 sm:p-6 rounded-2xl">
                <p className="text-xs sm:text-sm text-gray-500">Attendance</p>

                {!visibleCards.includes("attendance") ? (
                  <CardLoader />
                ) : (
                  <h3 className="text-xl sm:text-2xl font-bold mt-1 fade-in">
                    {attendance?.summary?.attendance_percent ?? 0}%
                  </h3>
                )}
              </div>

              {/* Subjects */}
              <div className="bg-white shadow-sm hover:shadow-md transition p-4 sm:p-6 rounded-2xl">
                <p className="text-xs sm:text-sm text-gray-500">Subjects</p>

                {!visibleCards.includes("subjects") ? (
                  <CardLoader />
                ) : (
                  <h3 className="text-xl sm:text-2xl font-bold mt-1 fade-in">
                    {Object.keys(timetable || {}).length || 0}
                  </h3>
                )}
              </div>

              {/* Assignments */}
              <div className="bg-white shadow-sm hover:shadow-md transition p-4 sm:p-6 rounded-2xl">
                <p className="text-xs sm:text-sm text-gray-500">
                  Pending Assignments
                </p>

                {!visibleCards.includes("assignments") ? (
                  <CardLoader />
                ) : (
                  <h3 className="text-xl sm:text-2xl font-bold mt-1 fade-in">
                    {assignmentCounts?.pending ?? 0}
                  </h3>
                )}
              </div>

              {/* Score */}
              <div className="bg-white shadow-sm hover:shadow-md transition p-4 sm:p-6 rounded-2xl">
                <p className="text-xs sm:text-sm text-gray-500">
                  Average Score
                </p>

                {!visibleCards.includes("score") ? (
                  <CardLoader />
                ) : (
                  <h3 className="text-xl sm:text-2xl font-bold mt-1 fade-in">
                    {performance?.marks?.length
                      ? Math.round(
                          performance.marks.reduce((a, b) => a + b, 0) /
                            performance.marks.length,
                        )
                      : 0}
                    %
                  </h3>
                )}
              </div>
            </div>

            {/* MAIN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT */}
              <div className="lg:col-span-7 space-y-6">
                {/* ASSIGNMENTS */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm hover:shadow-md transition">
                  <h3 className="font-semibold mb-4 text-sm sm:text-base">
                    Upcoming Assignments
                  </h3>

                  {!visibleCards.includes("assignmentsCard") ? (
                    <CardLoader />
                  ) : assignments.length === 0 ? (
                    <p className="text-sm text-gray-500 fade-in">
                      No assignments
                    </p>
                  ) : (
                    <ul className="text-sm space-y-3 fade-in">
                      {assignments.slice(0, 3).map((a) => (
                        <li key={a.id} className="flex justify-between">
                          <span className="truncate">📘 {a.title}</span>
                          <span className="text-gray-500 text-xs">
                            {a.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* EXAMS */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm hover:shadow-md transition">
                  <h3 className="font-semibold mb-4 text-sm sm:text-base">
                    Upcoming Exams
                  </h3>

                  {!visibleCards.includes("examsCard") ? (
                    <CardLoader />
                  ) : upcomingExams.length === 0 ? (
                    <p className="text-sm text-gray-500 fade-in">No exams</p>
                  ) : (
                    <div className="fade-in space-y-2">
                      {upcomingExams.slice(0, 3).map((exam, i) => (
                        <p key={i} className="text-sm">
                          📘 {exam.exam} —{" "}
                          <span className="text-gray-500">{exam.date}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* NOTICES */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm hover:shadow-md transition">
                  <h3 className="font-semibold mb-3 text-sm sm:text-base">
                    Notices
                  </h3>

                  {!visibleCards.includes("noticesCard") ? (
                    <CardLoader />
                  ) : announcements.length === 0 ? (
                    <p className="text-sm text-gray-500 fade-in">
                      No announcements
                    </p>
                  ) : (
                    <div className="fade-in space-y-2">
                      {announcements.slice(0, 3).map((n) => (
                        <p key={n.id} className="text-sm truncate">
                          📢 {n.title}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                {/* LIBRARY */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition">
                  <h3 className="font-semibold mb-4 text-sm sm:text-base">
                    Issued Library Books
                  </h3>

                  {!visibleCards.includes("libraryCard") ? (
                    <CardLoader />
                  ) : studentLibraryLoading ? (
                    <div className="flex justify-center py-5">
                      <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                    </div>
                  ) : currentBooks.length === 0 ? (
                    <p className="text-sm text-gray-500 fade-in">
                      No books currently issued
                    </p>
                  ) : (
                    <div className="fade-in space-y-2">
                      {currentBooks.slice(0, 2).map((book) => (
                        <button
                          type="button"
                          key={book.id}
                          onClick={() => {
                            setActiveSection("library");
                            openLibraryRecord(book);
                          }}
                          className="w-full rounded-xl border p-3 text-left hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700"
                        >
                          <p className="truncate text-sm font-medium">
                            📘 {book.book_title || book.title}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Due: {book.due_date || "—"}
                          </p>

                          <p
                            className={`mt-1 text-xs font-medium ${
                              book.status === "Overdue"
                                ? "text-red-600"
                                : book.status === "Due Soon"
                                  ? "text-amber-600"
                                  : "text-green-600"
                            }`}
                          >
                            {book.status || "Issued"}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT */}
              <div className="lg:col-span-5 space-y-6">
                {/* PERFORMANCE CHART */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl text-center relative shadow-sm hover:shadow-md transition">
                  <h3 className="font-semibold mb-2 text-sm sm:text-base">
                    Performance Overview
                  </h3>

                  {!visibleCards.includes("performanceChart") && (
                    <div className="absolute inset-0 flex justify-center items-center bg-white/70 backdrop-blur-sm z-10">
                      <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}

                  <div className="relative w-full h-40 sm:h-48">
                    <canvas ref={performanceChartRef}></canvas>
                  </div>
                </div>

                {/* ATTENDANCE CHART */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl text-center relative shadow-sm hover:shadow-md transition">
                  <h3 className="font-semibold mb-2 text-sm sm:text-base">
                    Attendance Overview
                  </h3>

                  {!visibleCards.includes("attendanceChart") && (
                    <div className="absolute inset-0 flex justify-center items-center bg-white/70 backdrop-blur-sm z-10">
                      <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}

                  <div className="relative w-full h-40 sm:h-48">
                    <canvas ref={attendanceChartRef}></canvas>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
        {/* ===================== DASHBOARD SECTION END =========================== */}
        {/* ===================== ATTENDANCE SECTION START =========================== */}
        {activeSection === "attendance" && (
          <section className="p-4 sm:p-6 space-y-6">
            {attendanceLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {/* HEADER */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl p-5 sm:p-6">
                  <h3 className="font-semibold text-lg sm:text-xl">
                    Attendance Overview
                  </h3>
                </div>

                {/* SUMMARY CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-green-50 dark:bg-green-500/10 p-4 sm:p-5 rounded-2xl">
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      Overall Attendance
                    </p>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
                      {attendance?.summary?.attendance_percent ?? 0}%
                    </h3>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-500/10 p-4 sm:p-5 rounded-2xl">
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      Present Days
                    </p>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
                      {attendance?.summary?.present ?? 0}
                    </h3>
                  </div>

                  <div className="bg-red-50 dark:bg-red-500/10 p-4 sm:p-5 rounded-2xl">
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      Absent Days
                    </p>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
                      {attendance?.summary?.absent ?? 0}
                    </h3>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-500/10 p-4 sm:p-5 rounded-2xl">
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      Late Entries
                    </p>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
                      {attendance?.summary?.late ?? 0}
                    </h3>
                  </div>
                </div>

                {/* CHART + MONTHLY */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                  {/* CHART */}
                  <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col items-center shadow-sm border border-transparent dark:border-slate-700">
                    <h3 className="font-semibold mb-3 text-sm sm:text-base text-gray-800 dark:text-white">
                      Attendance Overview
                    </h3>

                    <div className="w-36 h-36 sm:w-48 sm:h-48 flex items-center justify-center">
                      <canvas ref={attendanceChartRef}></canvas>
                    </div>

                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-3 text-center">
                      Current Academic Year
                    </p>
                  </div>

                  {/* MONTHLY */}
                  <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm border border-transparent dark:border-slate-700">
                    <h3 className="font-semibold mb-4 text-sm sm:text-base text-gray-800 dark:text-white">
                      Monthly Attendance
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs sm:text-sm">
                      {(attendance?.monthly || []).length > 0 ? (
                        attendance.monthly.map((m, index) => {
                          const monthNames = [
                            "Jan",
                            "Feb",
                            "Mar",
                            "Apr",
                            "May",
                            "Jun",
                            "Jul",
                            "Aug",
                            "Sep",
                            "Oct",
                            "Nov",
                            "Dec",
                          ];

                          return (
                            <div
                              key={index}
                              className="p-3 rounded-xl bg-gray-50 dark:bg-slate-700 text-center"
                            >
                              <p className="text-gray-500 dark:text-gray-400">
                                {monthNames[m.month - 1] || "Month"}
                              </p>
                              <p className="font-semibold text-gray-800 dark:text-white">
                                {m.percentage ?? 0}%
                              </p>

                              <p className="text-[10px] text-gray-400 mt-1">
                                {m.present}/{m.total}
                              </p>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-700 col-span-full text-center text-gray-500 dark:text-gray-400">
                          No Data
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RECENT RECORDS */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm border border-transparent dark:border-slate-700">
                  <h3 className="font-semibold mb-4 text-sm sm:text-base text-gray-800 dark:text-white">
                    Recent Attendance
                  </h3>

                  {/* DESKTOP TABLE */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead className="text-gray-500 dark:text-gray-400 border-b dark:border-slate-700">
                        <tr>
                          <th className="py-2 text-left">Date</th>
                          <th className="text-left">Day</th>
                          <th className="text-left">Status</th>
                          <th className="text-left">Remarks</th>
                        </tr>
                      </thead>

                      <tbody>
                        {(attendance?.records || []).length > 0 ? (
                          attendance.records.map((r, index) => (
                            <tr
                              key={index}
                              className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
                            >
                              <td className="py-2 text-gray-700 dark:text-gray-200">
                                {r.date || "-"}
                              </td>

                              <td className="text-gray-700 dark:text-gray-200">
                                {r.day || "-"}
                              </td>

                              <td
                                className={
                                  r.status === "Present"
                                    ? "text-green-600 font-medium"
                                    : r.status === "Absent"
                                      ? "text-red-500 font-medium"
                                      : "text-yellow-500 font-medium"
                                }
                              >
                                {r.status || "-"}
                              </td>

                              <td className="text-gray-700 dark:text-gray-200">
                                {r.remarks || "-"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan="4"
                              className="py-4 text-center text-gray-400"
                            >
                              No attendance records
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE */}
                  <div className="md:hidden space-y-3">
                    {(attendance?.records || []).length > 0 ? (
                      attendance.records.map((r, index) => (
                        <div
                          key={index}
                          className="bg-gray-50 dark:bg-slate-700 p-3 rounded-xl"
                        >
                          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>{r.date}</span>
                            <span>{r.day}</span>
                          </div>

                          <div className="mt-2 space-y-1">
                            <p
                              className={`font-medium ${
                                r.status === "Present"
                                  ? "text-green-600"
                                  : r.status === "Absent"
                                    ? "text-red-500"
                                    : "text-yellow-500"
                              }`}
                            >
                              {r.status}
                            </p>

                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {r.remarks || "-"}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-400">
                        No attendance records
                      </p>
                    )}
                  </div>
                </div>

                {/* DOWNLOAD */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm border border-transparent dark:border-slate-700">
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base text-gray-800 dark:text-white">
                      Download Attendance Report
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      PDF for parent & student reference
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadPDF}
                    className="w-full sm:w-auto bg-purple-600 text-white px-5 py-2 rounded-xl text-sm hover:bg-purple-700 transition"
                  >
                    Download PDF
                  </button>
                </div>
              </>
            )}
          </section>
        )}
        {/* ===================== ATTENDANCE SECTION END =========================== */}

        {/* ===================== ASSIGNMENTS SECTION START ========================*/}
        {activeSection === "assignments" && (
          <section className="section p-4 sm:p-6 space-y-6 active">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-white text-lg sm:text-xl font-semibold">
                  Assignments
                </h2>
                <p className="text-white text-xs sm:text-sm opacity-90">
                  Track and manage your work
                </p>
              </div>

              <input
                type="text"
                placeholder="Search assignments..."
                value={assignmentSearch}
                onChange={(e) => setAssignmentSearch(e.target.value)}
                className="w-full sm:w-64 px-4 py-2 rounded-xl text-sm 
        border border-white/30 
        bg-white/90 dark:bg-slate-700/80
        text-gray-800 dark:text-white
        placeholder-gray-400
        focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>

            {/* FILTER TABS */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="flex overflow-x-auto no-scrollbar border-b dark:border-slate-700 text-sm font-medium">
                {["all", "new", "pending", "late", "submitted", "resubmit"].map(
                  (tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-shrink-0 px-4 py-3 capitalize whitespace-nowrap transition
              ${
                activeTab === tab
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
                    >
                      {tab}
                      <span className="ml-2 text-xs bg-gray-200 dark:bg-slate-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                        {assignmentCounts?.[tab] || 0}
                      </span>
                    </button>
                  ),
                )}
              </div>

              {/* ASSIGNMENT LIST */}
              <div className="p-4 sm:p-5 grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {/* LOADING */}
                {assignmentLoading && (
                  <div className="col-span-full flex justify-center py-10">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}

                {/* EMPTY */}
                {!assignmentLoading && assignments.length === 0 && (
                  <p className="col-span-full text-center text-gray-400">
                    No assignments found
                  </p>
                )}

                {/* LIST */}
                {!assignmentLoading &&
                  filterAssignments(activeTab).map((a) => {
                    const finalStatus = a.status;
                    const isResubmit = finalStatus === "Needs Resubmission";

                    return (
                      <div
                        key={a.id}
                        className="bg-white dark:bg-slate-800 rounded-2xl p-4 
                border border-gray-100 dark:border-slate-700
                hover:shadow-md dark:hover:shadow-lg 
                transition flex flex-col justify-between"
                      >
                        {/* TOP */}
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {a.subject || "Subject"}
                          </p>

                          <h4 className="font-semibold text-sm sm:text-base line-clamp-2 text-gray-800 dark:text-white">
                            {a.title}
                          </h4>

                          <p className="text-xs text-gray-400 mt-1">
                            Due: {a.due_date}
                          </p>

                          {/* STATUS */}
                          <span
                            className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${
                              finalStatus === "New"
                                ? "bg-blue-100 text-blue-600"
                                : finalStatus === "Submitted"
                                  ? "bg-green-100 text-green-600"
                                  : finalStatus === "Late"
                                    ? "bg-red-100 text-red-600"
                                    : finalStatus === "Late Submitted"
                                      ? "bg-orange-100 text-orange-600"
                                      : isResubmit
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {isResubmit ? "Resubmit Required" : finalStatus}
                          </span>

                          {/* TEACHER FEEDBACK */}
                          {a.marks !== null && a.marks !== undefined && (
                            <div className="mt-2 p-2 rounded-lg bg-green-50 dark:bg-green-500/10">
                              <p className="text-xs text-green-700 dark:text-green-300">
                                ⭐ Marks: <b>{a.marks}</b>
                              </p>

                              {a.feedback && (
                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                  💬 {a.feedback}
                                </p>
                              )}
                            </div>
                          )}

                          {/* 🔥 RESUBMIT NOTE */}
                          {isResubmit && (
                            <p className="text-xs text-yellow-600 mt-1">
                              Teacher requested resubmission
                            </p>
                          )}
                        </div>

                        {/* ACTIONS */}
                        <div className="mt-4 flex flex-col gap-2">
                          {/* FILE INPUT */}
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) =>
                              handleFileChange(a.id, e.target.files[0])
                            }
                            className="text-xs file:mr-2 file:py-1 file:px-2 
                    file:border file:rounded 
                    file:bg-gray-100 file:text-gray-700"
                          />

                          {/* BUTTONS */}
                          <div className="flex gap-2 flex-wrap">
                            {/* SUBMIT / RESUBMIT */}
                            <button
                              disabled={!selectedFiles[a.id]}
                              onClick={() => submitAssignment(a.id)}
                              className={`flex-1 px-3 py-1.5 rounded-lg text-xs text-white transition
                        ${
                          selectedFiles[a.id]
                            ? isResubmit
                              ? "bg-yellow-600 hover:bg-yellow-700"
                              : "bg-purple-600 hover:bg-purple-700"
                            : "bg-gray-400 cursor-not-allowed"
                        }`}
                            >
                              {isResubmit ? "Resubmit" : "Submit"}
                            </button>

                            {/* VIEW QUESTION */}
                            {a.assignment_file && (
                              <a
                                href={`${FILE_BASE_URL}${a.assignment_file}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 text-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs"
                              >
                                View Question
                              </a>
                            )}

                            {/* VIEW SUBMISSION */}
                            {a.submission_file && (
                              <a
                                href={`${FILE_BASE_URL}${a.submission_file}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 text-center px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs"
                              >
                                View Submission
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </section>
        )}
        {/* ===================== ASSIGNMENTS SECTION END ========================*/}

        {/* ===================== EXAMS AND RESULTS SECTION START ========================*/}
        {activeSection === "exams" && (
          <section className="active section p-4 sm:p-6 space-y-6">
            {examLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {/* HEADER */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl p-5 sm:p-6">
                  <h3 className="font-semibold text-lg sm:text-xl mb-1">
                    Exams & Results
                  </h3>
                  <p className="text-xs sm:text-sm opacity-90">
                    Track exams, analyze performance & download reports
                  </p>
                </div>

                {/* CHART + UPCOMING */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* PERFORMANCE CHART */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
                    <h4 className="font-semibold mb-3 text-sm sm:text-base text-gray-900 dark:text-gray-100">
                      Performance Trend
                    </h4>

                    <div className="relative w-full h-52 sm:h-64">
                      <canvas ref={performanceChartRef}></canvas>
                    </div>
                  </div>

                  {/* UPCOMING EXAMS */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
                    <h4 className="font-semibold mb-3 text-sm sm:text-base text-gray-900 dark:text-gray-100">
                      Upcoming Exams
                    </h4>

                    {upcomingExams.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No upcoming exams
                      </p>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {upcomingExams.map((exam, i) => (
                          <li
                            key={i}
                            className="flex justify-between items-center bg-gray-50 dark:bg-slate-700 px-3 py-2 rounded-lg"
                          >
                            <span className="truncate text-gray-900 dark:text-gray-100">
                              📘 {exam.exam}
                            </span>

                            <span className="text-xs text-gray-500 dark:text-gray-300 text-right">
                              {exam.start_date}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* RESULTS TABLE */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
                  {/* HEADER + FILTERS */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4">
                    <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                      All Results
                    </h4>

                    <div className="flex flex-wrap gap-2 items-center">
                      {/* YEAR FILTER (FROM DB) */}
                      <select
                        name="year"
                        value={filters.year}
                        onChange={handleFilterChange}
                        className="border rounded-lg px-3 py-1 text-xs sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600"
                      >
                        <option value="all">All Years</option>
                        {filterOptions.years.map((year, i) => (
                          <option key={i} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>

                      {/* EXAM FILTER */}
                      <select
                        name="exam"
                        value={filters.exam}
                        onChange={handleFilterChange}
                        className="border rounded-lg px-3 py-1 text-xs sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600"
                      >
                        <option value="all">All Exams</option>
                        {filterOptions.exams.map((exam, i) => (
                          <option key={i} value={exam}>
                            {exam}
                          </option>
                        ))}
                      </select>

                      {/* DOWNLOAD */}
                      <button
                        onClick={handleDownloadResultsPDF}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm transition"
                      >
                        Download PDF
                      </button>
                    </div>
                  </div>

                  {/* TABLE */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm min-w-[900px]">
                      <thead className="text-gray-500 dark:text-gray-300 border-b bg-gray-50 dark:bg-slate-700">
                        <tr>
                          <th className="text-left py-2 px-2">Exam</th>
                          <th className="text-left py-2 px-2">Subject</th>

                          <th className="text-center py-2 px-2">Internal</th>
                          <th className="text-center py-2 px-2">External</th>
                          <th className="text-center py-2 px-2">Oral</th>
                          <th className="text-center py-2 px-2">Practical</th>

                          <th className="text-center py-2 px-2">Total</th>
                          <th className="text-center py-2 px-2">Grade</th>
                          <th className="text-left py-2 px-2">Remarks</th>
                        </tr>
                      </thead>

                      <tbody>
                        {results.length === 0 ? (
                          <tr>
                            <td
                              colSpan="9"
                              className="text-center py-6 text-gray-400 dark:text-gray-500"
                            >
                              No results found
                            </td>
                          </tr>
                        ) : (
                          results.map((r, i) => (
                            <tr
                              key={i}
                              className="border-b hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                            >
                              {/* EXAM */}
                              <td className="py-2 px-2 text-gray-900 dark:text-gray-100">
                                {r.exam}
                              </td>

                              {/* SUBJECT */}
                              <td className="py-2 px-2 text-gray-900 dark:text-gray-100">
                                {r.subject}
                              </td>

                              {/* INTERNAL */}
                              <td className="text-center text-gray-900 dark:text-gray-100">
                                {r.internal} / {r.internalOutOf || "-"}
                              </td>

                              {/* EXTERNAL */}
                              <td className="text-center text-gray-900 dark:text-gray-100">
                                {r.external} / {r.externalOutOf || "-"}
                              </td>

                              {/* ORAL */}
                              <td className="text-center text-gray-900 dark:text-gray-100">
                                {r.oral} / {r.oralOutOf || "-"}
                              </td>

                              {/* PRACTICAL */}
                              <td className="text-center text-gray-900 dark:text-gray-100">
                                {r.practical} / {r.practicalOutOf || "-"}
                              </td>

                              {/* TOTAL */}
                              <td className="text-center font-semibold text-gray-900 dark:text-gray-100">
                                {r.marks}
                              </td>

                              {/* GRADE */}
                              <td className="text-center">
                                <span
                                  className={`px-2 py-1 rounded text-[10px] font-medium ${
                                    r.grade?.startsWith("A")
                                      ? "bg-green-100 text-green-700"
                                      : r.grade?.startsWith("B")
                                        ? "bg-blue-100 text-blue-700"
                                        : r.grade?.startsWith("C")
                                          ? "bg-yellow-100 text-yellow-700"
                                          : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {r.grade}
                                </span>
                              </td>

                              {/* REMARKS */}
                              <td className="text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                                {r.remarks}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>
        )}
        {/* ===================== EXAMS AND RESULTS SECTION END ========================*/}

        {/* ===================== TIMETABLE SECTION START ========================*/}
        {activeSection === "timetable" && (
          <section className="p-4 sm:p-6 space-y-6">
            {timetableLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {/* HEADER */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl p-5 sm:p-6">
                  <h3 className="font-semibold text-lg sm:text-xl">
                    Weekly Timetable
                  </h3>
                  <p className="text-xs sm:text-sm opacity-90">
                    {student?.division_name || ""} •{" "}
                    {student?.section_name || ""}
                  </p>
                </div>

                {/* DESKTOP TABLE */}
                <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm overflow-x-auto">
                  <table className="w-full text-sm text-center border-collapse min-w-[700px]">
                    <thead className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200">
                      <tr>
                        <th className="p-3 text-left">Day</th>

                        {Object.values(timetable || {})[0]?.map(
                          (slot, index) => (
                            <th key={index} className="p-3 whitespace-nowrap">
                              {slot.start_time}–{slot.end_time}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {Object.keys(timetable || {}).length > 0 ? (
                        Object.keys(timetable).map((day) => (
                          <tr
                            key={day}
                            className="border-b hover:bg-gray-50 dark:hover:bg-slate-700"
                          >
                            <td className="font-medium text-left px-3 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">
                              {day}
                            </td>

                            {timetable[day]?.map((slot, index) => (
                              <td key={index} className="py-2 px-2">
                                <div className="bg-indigo-50 dark:bg-slate-700 rounded-xl p-3 text-left space-y-1">
                                  <p className="font-semibold text-indigo-700 dark:text-indigo-300">
                                    {slot.subject || "-"}
                                  </p>

                                  <p className="text-xs text-gray-600 dark:text-gray-300">
                                    👨‍🏫 {slot.teacher_name || "N/A"}
                                  </p>

                                  <span
                                    className={`inline-block text-xs px-2 py-1 rounded-full ${
                                      slot.lecture_type === "Practical"
                                        ? "bg-green-100 text-green-700"
                                        : slot.lecture_type === "Sports"
                                          ? "bg-orange-100 text-orange-700"
                                          : "bg-blue-100 text-blue-700"
                                    }`}
                                  >
                                    {slot.lecture_type || "Theory"}
                                  </span>
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="100%"
                            className="p-6 text-gray-500 dark:text-gray-400 text-center"
                          >
                            No timetable available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 📱 MOBILE CARD VIEW */}
                <div className="md:hidden space-y-4">
                  {Object.keys(timetable || {}).length > 0 ? (
                    Object.keys(timetable).map((day) => (
                      <div
                        key={day}
                        className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4"
                      >
                        <h4 className="font-semibold mb-3 text-indigo-600 dark:text-indigo-400">
                          {day}
                        </h4>

                        <div className="space-y-2 text-sm">
                          {timetable[day]?.map((slot, index) => (
                            <div
                              key={index}
                              className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3 space-y-2"
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {slot.start_time} – {slot.end_time}
                                </span>

                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                  {slot.subject || "-"}
                                </span>
                              </div>

                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                  👨‍🏫 {slot.teacher_name || "N/A"}
                                </span>

                                <span
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    slot.lecture_type === "Practical"
                                      ? "bg-green-100 text-green-700"
                                      : slot.lecture_type === "Sports"
                                        ? "bg-orange-100 text-orange-700"
                                        : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {slot.lecture_type || "Theory"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-6">
                      No timetable available
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        )}
        {/* ===================== TIMETABLE SECTION END ========================*/}

        {/* ===================== HOSTEL SECTION START ========================*/}
        {activeSection === "studhostel" && (
          <section className="section p-4 sm:p-6 space-y-6 active">
            {hostelLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {/* HEADER */}
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-5 sm:p-6 rounded-2xl shadow-md 
          flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                >
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold">
                      🏠 {hostel?.hostel_name || "Hostel"}
                    </h3>
                    <p className="text-xs sm:text-sm opacity-90">
                      {hostel?.room_number
                        ? `Room ${hostel.room_number}${hostel?.block ? ` · Block ${hostel.block}` : ""}${hostel?.bed_number ? ` · Bed ${hostel.bed_number}` : ""}`
                        : "Manage your hostel details and stay information"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setShowComplaintModal(true)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-white text-indigo-600 rounded-xl text-sm font-medium hover:bg-gray-100 transition"
                    >
                      Raise Complaint
                    </button>
                    <button
                      onClick={() => setShowLeaveModal(true)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-white/15 text-white border border-white/40 rounded-xl text-sm font-medium hover:bg-white/25 transition"
                    >
                      Apply Leave
                    </button>
                    <button
                      onClick={() => setShowVisitorModal(true)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-white/15 text-white border border-white/40 rounded-xl text-sm font-medium hover:bg-white/25 transition"
                    >
                      Add Visitor
                    </button>
                  </div>
                </div>

                {/* TABS */}
                <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-gray-200 dark:border-slate-700">
                  {HOSTEL_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setHostelTab(tab.id)}
                      className={`flex items-center gap-1.5 whitespace-nowrap px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition ${
                        hostelTab === tab.id
                          ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                          : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                      }`}
                    >
                      <i className={`bi ${tab.icon}`}></i>
                      {tab.label}
                      {tab.id === "leave" &&
                        hostel?.pending_leave_count > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
                            {hostel.pending_leave_count}
                          </span>
                        )}
                      {tab.id === "visitors" &&
                        hostel?.pending_visitor_count > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
                            {hostel.pending_visitor_count}
                          </span>
                        )}
                    </button>
                  ))}
                </div>

                {/* ================= OVERVIEW TAB ================= */}
                {hostelTab === "overview" && (
                  <div className="space-y-6">
                    {!hostel?.room_number ? (
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm text-center text-sm text-gray-500 dark:text-gray-400">
                        No active hostel allocation found. Please contact the
                        hostel administration if you believe this is an error.
                      </div>
                    ) : (
                      <>
                        {/* STATS */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Room Number
                            </p>
                            <h4 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                              {hostel?.room_number || "-"}
                            </h4>
                          </div>

                          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Room Type
                            </p>
                            <h4 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                              {hostel?.room_type || "-"}
                            </h4>
                          </div>

                          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Occupancy
                            </p>
                            <h4 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                              {hostel?.occupied_count ?? "-"}/
                              {hostel?.capacity ?? "-"}
                            </h4>
                          </div>

                          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Fee Balance
                            </p>
                            <h4
                              className={`text-lg sm:text-xl font-semibold ${
                                (hostel?.fee_summary?.total_balance || 0) > 0
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-green-600 dark:text-green-400"
                              }`}
                            >
                              {formatCurrency(
                                hostel?.fee_summary?.total_balance ?? 0,
                              )}
                            </h4>
                          </div>
                        </div>

                        {/* DETAILS */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                          {/* ROOM DETAILS */}
                          <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm space-y-3">
                            <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                              Room Details
                            </h4>

                            <div className="text-xs sm:text-sm space-y-2 text-gray-600 dark:text-gray-300">
                              <p>
                                <span className="font-medium">Hostel:</span>{" "}
                                {hostel?.hostel_name || "-"}
                              </p>
                              <p>
                                <span className="font-medium">Block:</span>{" "}
                                {hostel?.block || "-"}
                              </p>
                              <p>
                                <span className="font-medium">Floor:</span>{" "}
                                {hostel?.floor_name || hostel?.floor || "-"}
                              </p>
                              <p>
                                <span className="font-medium">Bed Number:</span>{" "}
                                {hostel?.bed_number || "-"}{" "}
                                {hostel?.bed_type ? `(${hostel.bed_type})` : ""}
                              </p>
                              <p>
                                <span className="font-medium">
                                  Check-in Date:
                                </span>{" "}
                                {formatDate(hostel?.check_in_date)}
                              </p>
                              <p>
                                <span className="font-medium">
                                  Check-out Date:
                                </span>{" "}
                                {formatDate(hostel?.check_out_date)}
                              </p>
                            </div>
                          </div>

                          {/* WARDEN DETAILS */}
                          <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm space-y-3">
                            <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                              Warden Details
                            </h4>

                            <div className="text-xs sm:text-sm space-y-2 text-gray-600 dark:text-gray-300">
                              <p>
                                <span className="font-medium">Name:</span>{" "}
                                {hostel?.warden?.name || "-"}
                              </p>
                              <p>
                                <span className="font-medium">Contact:</span>{" "}
                                {hostel?.warden?.mobile || "-"}
                              </p>
                              <p>
                                <span className="font-medium">Email:</span>{" "}
                                {hostel?.warden?.email || "-"}
                              </p>
                            </div>

                            {hostel?.today_attendance && (
                              <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                                  <span className="font-medium">Today:</span>{" "}
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[11px] ${statusBadgeClass(hostel.today_attendance.status)}`}
                                  >
                                    {hostel.today_attendance.status}
                                  </span>
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ROOMMATES */}
                        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm">
                          <h4 className="font-semibold mb-3 text-sm sm:text-base text-gray-900 dark:text-gray-100">
                            Roommates
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {hostel?.roommates?.length > 0 ? (
                              hostel.roommates.map((r, i) => (
                                <div
                                  key={i}
                                  className="p-3 bg-gray-50 dark:bg-slate-700 rounded-xl flex items-center justify-between"
                                >
                                  <div>
                                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                      {r.name}
                                    </p>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                      ID: {r.student_id}
                                    </p>
                                  </div>
                                  <span className="text-[11px] px-2 py-1 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
                                    Bed {r.bed_number || "-"}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                No roommates
                              </p>
                            )}
                          </div>
                        </div>

                        {/* RECENT COMPLAINTS PREVIEW */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
                          <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                            <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                              Recent Complaints
                            </h4>
                            <button
                              onClick={() => setHostelTab("complaints")}
                              className="text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              View all
                            </button>
                          </div>

                          <div className="divide-y dark:divide-slate-700">
                            {hostel?.complaints?.length > 0 ? (
                              hostel.complaints.slice(0, 3).map((c) => (
                                <div
                                  key={c.id}
                                  className="p-4 flex items-center justify-between gap-3"
                                >
                                  <p className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate">
                                    {c.issue}
                                  </p>
                                  <span
                                    className={`shrink-0 px-2 py-1 text-[10px] sm:text-xs rounded-full ${statusBadgeClass(c.status)}`}
                                  >
                                    {c.status}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
                                No complaints found
                              </p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ================= FEES TAB ================= */}
                {hostelTab === "fees" && (
                  <div className="space-y-6">
                    {feesLoading ? (
                      <div className="flex justify-center items-center py-16">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Total Billed
                            </p>
                            <h4 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                              {formatCurrency(feeSummary?.total_amount ?? 0)}
                            </h4>
                          </div>
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Total Paid
                            </p>
                            <h4 className="text-lg sm:text-xl font-semibold text-green-600 dark:text-green-400">
                              {formatCurrency(feeSummary?.total_paid ?? 0)}
                            </h4>
                          </div>
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Outstanding Balance
                            </p>
                            <h4
                              className={`text-lg sm:text-xl font-semibold ${
                                (feeSummary?.total_balance || 0) > 0
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-green-600 dark:text-green-400"
                              }`}
                            >
                              {formatCurrency(feeSummary?.total_balance ?? 0)}
                            </h4>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
                          <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-700">
                            <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                              Fee Invoices
                            </h4>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs sm:text-sm min-w-[640px]">
                              <thead className="bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300">
                                <tr>
                                  <th className="py-3 px-3 text-left">
                                    Fee Type
                                  </th>
                                  <th className="text-left px-3">Due Date</th>
                                  <th className="text-right px-3">Amount</th>
                                  <th className="text-right px-3">Paid</th>
                                  <th className="text-right px-3">Balance</th>
                                  <th className="text-left px-3">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y dark:divide-slate-700">
                                {fees?.length > 0 ? (
                                  fees.map((f) => (
                                    <tr
                                      key={f.id}
                                      className="hover:bg-gray-50 dark:hover:bg-slate-700"
                                    >
                                      <td className="py-3 px-3 text-gray-900 dark:text-gray-100">
                                        {f.fee_type}
                                      </td>
                                      <td className="px-3 text-gray-600 dark:text-gray-300">
                                        {formatDate(f.due_date)}
                                      </td>
                                      <td className="px-3 text-right text-gray-900 dark:text-gray-100">
                                        {formatCurrency(f.amount)}
                                      </td>
                                      <td className="px-3 text-right text-green-600 dark:text-green-400">
                                        {formatCurrency(f.paid_amount)}
                                      </td>
                                      <td className="px-3 text-right text-gray-900 dark:text-gray-100">
                                        {formatCurrency(f.balance)}
                                      </td>
                                      <td className="px-3">
                                        <span
                                          className={`px-2 py-1 text-[10px] sm:text-xs rounded-full ${statusBadgeClass(f.status)}`}
                                        >
                                          {f.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td
                                      colSpan={6}
                                      className="py-6 px-3 text-center text-gray-500 dark:text-gray-400"
                                    >
                                      No fee invoices found
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* PAYMENT HISTORY */}
                        {fees?.some((f) => f.payments?.length > 0) && (
                          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
                            <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-700">
                              <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                                Payment History
                              </h4>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs sm:text-sm min-w-[560px]">
                                <thead className="bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300">
                                  <tr>
                                    <th className="py-3 px-3 text-left">
                                      Fee Type
                                    </th>
                                    <th className="text-left px-3">Date</th>
                                    <th className="text-right px-3">Amount</th>
                                    <th className="text-left px-3">Method</th>
                                    <th className="text-left px-3">
                                      Reference
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-slate-700">
                                  {fees.flatMap((f) =>
                                    (f.payments || []).map((p) => (
                                      <tr
                                        key={p.id}
                                        className="hover:bg-gray-50 dark:hover:bg-slate-700"
                                      >
                                        <td className="py-3 px-3 text-gray-900 dark:text-gray-100">
                                          {f.fee_type}
                                        </td>
                                        <td className="px-3 text-gray-600 dark:text-gray-300">
                                          {formatDate(p.payment_date)}
                                        </td>
                                        <td className="px-3 text-right text-gray-900 dark:text-gray-100">
                                          {formatCurrency(p.amount)}
                                        </td>
                                        <td className="px-3 text-gray-600 dark:text-gray-300">
                                          {p.payment_method}
                                        </td>
                                        <td className="px-3 text-gray-600 dark:text-gray-300">
                                          {p.transaction_reference || "-"}
                                        </td>
                                      </tr>
                                    )),
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ================= COMPLAINTS TAB ================= */}
                {hostelTab === "complaints" && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
                    <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                      <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                        Complaints
                      </h4>
                      <button
                        onClick={() => setShowComplaintModal(true)}
                        className="px-3 py-1.5 text-xs sm:text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                      >
                        + Raise Complaint
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs sm:text-sm min-w-[560px]">
                        <thead className="bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300">
                          <tr>
                            <th className="py-3 px-3 text-left">Issue</th>
                            <th className="text-left px-3">Category</th>
                            <th className="text-left px-3">Priority</th>
                            <th className="text-left px-3">Raised On</th>
                            <th className="text-left px-3">Status</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y dark:divide-slate-700">
                          {hostel?.complaints?.length > 0 ? (
                            hostel.complaints.map((c) => (
                              <tr
                                key={c.id}
                                className="hover:bg-gray-50 dark:hover:bg-slate-700 align-top"
                              >
                                <td className="py-3 px-3 text-gray-900 dark:text-gray-100 max-w-[220px]">
                                  {c.issue}
                                  {c.resolution_notes && (
                                    <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                                      Note: {c.resolution_notes}
                                    </p>
                                  )}
                                </td>
                                <td className="px-3 text-gray-600 dark:text-gray-300">
                                  {c.category || "-"}
                                </td>
                                <td className="px-3">
                                  <span
                                    className={`px-2 py-1 text-[10px] sm:text-xs rounded-full ${hostelPriorityBadgeClass(c.priority)}`}
                                  >
                                    {c.priority || "-"}
                                  </span>
                                </td>
                                <td className="px-3 text-gray-600 dark:text-gray-300">
                                  {formatDate(c.created_at)}
                                </td>
                                <td className="px-3">
                                  <span
                                    className={`px-2 py-1 text-[10px] sm:text-xs rounded-full ${statusBadgeClass(c.status)}`}
                                  >
                                    {c.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={5}
                                className="py-6 px-3 text-center text-gray-500 dark:text-gray-400"
                              >
                                No complaints found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ================= LEAVE TAB ================= */}
                {hostelTab === "leave" && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
                    <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                      <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                        Leave Requests
                      </h4>
                      <button
                        onClick={() => setShowLeaveModal(true)}
                        className="px-3 py-1.5 text-xs sm:text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                      >
                        + Apply Leave
                      </button>
                    </div>

                    {hostelLeaveLoading ? (
                      <div className="flex justify-center items-center py-16">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm min-w-[640px]">
                          <thead className="bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300">
                            <tr>
                              <th className="py-3 px-3 text-left">Type</th>
                              <th className="text-left px-3">From</th>
                              <th className="text-left px-3">To</th>
                              <th className="text-left px-3">Reason</th>
                              <th className="text-left px-3">Status</th>
                              <th className="text-right px-3">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y dark:divide-slate-700">
                            {leaveRequests?.length > 0 ? (
                              leaveRequests.map((lr) => (
                                <tr
                                  key={lr.id}
                                  className="hover:bg-gray-50 dark:hover:bg-slate-700"
                                >
                                  <td className="py-3 px-3 text-gray-900 dark:text-gray-100">
                                    {lr.leave_type}
                                  </td>
                                  <td className="px-3 text-gray-600 dark:text-gray-300">
                                    {formatDate(lr.from_date)}
                                  </td>
                                  <td className="px-3 text-gray-600 dark:text-gray-300">
                                    {formatDate(lr.to_date)}
                                  </td>
                                  <td className="px-3 text-gray-600 dark:text-gray-300 max-w-[200px] truncate">
                                    {lr.reason || "-"}
                                  </td>
                                  <td className="px-3">
                                    <span
                                      className={`px-2 py-1 text-[10px] sm:text-xs rounded-full ${statusBadgeClass(lr.status)}`}
                                    >
                                      {lr.status}
                                    </span>
                                  </td>
                                  <td className="px-3 text-right">
                                    {lr.status === "Pending" && (
                                      <button
                                        onClick={() => handleCancelLeave(lr.id)}
                                        className="text-[11px] sm:text-xs text-red-600 hover:underline"
                                      >
                                        Withdraw
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan={6}
                                  className="py-6 px-3 text-center text-gray-500 dark:text-gray-400"
                                >
                                  No leave requests found
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ================= VISITORS TAB ================= */}
                {hostelTab === "visitors" && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
                    <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                      <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                        Visitor Requests
                      </h4>
                      <button
                        onClick={() => setShowVisitorModal(true)}
                        className="px-3 py-1.5 text-xs sm:text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                      >
                        + Add Visitor
                      </button>
                    </div>

                    {visitorsLoading ? (
                      <div className="flex justify-center items-center py-16">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm min-w-[640px]">
                          <thead className="bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300">
                            <tr>
                              <th className="py-3 px-3 text-left">Visitor</th>
                              <th className="text-left px-3">Relation</th>
                              <th className="text-left px-3">Purpose</th>
                              <th className="text-left px-3">Check-in</th>
                              <th className="text-left px-3">Check-out</th>
                              <th className="text-left px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y dark:divide-slate-700">
                            {visitors?.length > 0 ? (
                              visitors.map((v) => (
                                <tr
                                  key={v.id}
                                  className="hover:bg-gray-50 dark:hover:bg-slate-700"
                                >
                                  <td className="py-3 px-3 text-gray-900 dark:text-gray-100">
                                    {v.visitor_name}
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                      {v.visitor_mobile || "-"}
                                    </p>
                                  </td>
                                  <td className="px-3 text-gray-600 dark:text-gray-300">
                                    {v.relation}
                                  </td>
                                  <td className="px-3 text-gray-600 dark:text-gray-300 max-w-[180px] truncate">
                                    {v.purpose || "-"}
                                  </td>
                                  <td className="px-3 text-gray-600 dark:text-gray-300">
                                    {formatDateTime(v.check_in_time)}
                                  </td>
                                  <td className="px-3 text-gray-600 dark:text-gray-300">
                                    {formatDateTime(v.check_out_time)}
                                  </td>
                                  <td className="px-3">
                                    <span
                                      className={`px-2 py-1 text-[10px] sm:text-xs rounded-full ${statusBadgeClass(v.status)}`}
                                    >
                                      {v.status}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan={6}
                                  className="py-6 px-3 text-center text-gray-500 dark:text-gray-400"
                                >
                                  No visitor requests found
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ================= MESS MENU TAB ================= */}
                {hostelTab === "mess" && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-700">
                      <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                        Weekly Mess Menu
                      </h4>
                    </div>

                    {messMenuLoading ? (
                      <div className="flex justify-center items-center py-16">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <div className="divide-y dark:divide-slate-700">
                        {MESS_DAY_ORDER.map((day) => (
                          <div
                            key={day}
                            className={`p-4 sm:p-5 ${
                              messMenu?.today === day
                                ? "bg-indigo-50/60 dark:bg-indigo-900/10"
                                : ""
                            }`}
                          >
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                              {day}
                              {messMenu?.today === day && (
                                <span className="ml-2 px-2 py-0.5 text-[10px] rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
                                  Today
                                </span>
                              )}
                            </p>

                            {messMenu?.menu?.[day]?.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {messMenu.menu[day].map((m, i) => (
                                  <div
                                    key={i}
                                    className="p-3 bg-gray-50 dark:bg-slate-700 rounded-xl"
                                  >
                                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                                      {m.meal_type}{" "}
                                      {m.timing && (
                                        <span className="text-gray-400 dark:text-gray-500">
                                          ({m.timing})
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 mt-1 whitespace-pre-line">
                                      {m.items || "-"}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                Menu not published
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ================= ATTENDANCE TAB ================= */}
                {hostelTab === "hostelAttendance" && (
                  <div className="space-y-6">
                    {hostelAttendanceLoading ? (
                      <div className="flex justify-center items-center py-16">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Today's Status
                            </p>
                            <h4
                              className={`inline-block mt-1 px-2 py-1 text-xs sm:text-sm rounded-full ${
                                hostelAttendance?.today
                                  ? statusBadgeClass(
                                      hostelAttendance.today.status,
                                    )
                                  : "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400"
                              }`}
                            >
                              {hostelAttendance?.today?.status || "Not marked"}
                            </h4>
                          </div>
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Attendance Rate (last 30 days)
                            </p>
                            <h4 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                              {hostelAttendance?.attendance_rate ?? "-"}
                              {hostelAttendance?.attendance_rate !== null &&
                              hostelAttendance?.attendance_rate !== undefined
                                ? "%"
                                : ""}
                            </h4>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
                          <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-700">
                            <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                              Recent Attendance
                            </h4>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs sm:text-sm min-w-[480px]">
                              <thead className="bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300">
                                <tr>
                                  <th className="py-3 px-3 text-left">Date</th>
                                  <th className="text-left px-3">Status</th>
                                  <th className="text-left px-3">Check-in</th>
                                  <th className="text-left px-3">Remarks</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y dark:divide-slate-700">
                                {hostelAttendance?.history?.length > 0 ? (
                                  hostelAttendance.history.map((a, i) => (
                                    <tr
                                      key={i}
                                      className="hover:bg-gray-50 dark:hover:bg-slate-700"
                                    >
                                      <td className="py-3 px-3 text-gray-900 dark:text-gray-100">
                                        {formatDate(a.date)}
                                      </td>
                                      <td className="px-3">
                                        <span
                                          className={`px-2 py-1 text-[10px] sm:text-xs rounded-full ${statusBadgeClass(a.status)}`}
                                        >
                                          {a.status}
                                        </span>
                                      </td>
                                      <td className="px-3 text-gray-600 dark:text-gray-300">
                                        {formatDateTime(a.check_in_time)}
                                      </td>
                                      <td className="px-3 text-gray-600 dark:text-gray-300">
                                        {a.remarks || "-"}
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td
                                      colSpan={4}
                                      className="py-6 px-3 text-center text-gray-500 dark:text-gray-400"
                                    >
                                      No hostelAttendance records found
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ================= RAISE COMPLAINT MODAL ================= */}
                {showComplaintModal && (
                  <div
                    className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50"
                    onClick={() => setShowComplaintModal(false)}
                  >
                    <div
                      className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-md shadow-lg space-y-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                          Raise Complaint
                        </h3>

                        <button
                          onClick={() => setShowComplaintModal(false)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400">
                            Category
                          </label>
                          <select
                            value={complaintCategory}
                            onChange={(e) =>
                              setComplaintCategory(e.target.value)
                            }
                            className="w-full mt-1 border rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600"
                          >
                            <option value="Electrical">Electrical</option>
                            <option value="Plumbing">Plumbing</option>
                            <option value="Cleaning">Cleaning</option>
                            <option value="Furniture">Furniture</option>
                            <option value="Internet">Internet</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400">
                            Priority
                          </label>
                          <select
                            value={complaintPriority}
                            onChange={(e) =>
                              setComplaintPriority(e.target.value)
                            }
                            className="w-full mt-1 border rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Urgent">Urgent</option>
                          </select>
                        </div>
                      </div>

                      <textarea
                        rows="4"
                        placeholder="Describe your issue..."
                        value={complaintText}
                        onChange={(e) => setComplaintText(e.target.value)}
                        className="w-full border rounded-lg p-3 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />

                      <div className="flex flex-col sm:flex-row justify-end gap-2">
                        <button
                          onClick={() => setShowComplaintModal(false)}
                          className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600"
                        >
                          Cancel
                        </button>

                        <button
                          disabled={complaintSubmitting}
                          onClick={async () => {
                            await handleRaiseComplaint();
                            setShowComplaintModal(false);
                          }}
                          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-60"
                        >
                          {complaintSubmitting ? "Submitting..." : "Submit"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= APPLY LEAVE MODAL ================= */}
                {showLeaveModal && (
                  <div
                    className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50"
                    onClick={() => setShowLeaveModal(false)}
                  >
                    <div
                      className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-md shadow-lg space-y-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                          Apply for Leave
                        </h3>
                        <button
                          onClick={() => setShowLeaveModal(false)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">
                          Leave Type
                        </label>
                        <select
                          value={hostelLeaveForm.leave_type}
                          onChange={(e) =>
                            setHostelLeaveForm((prev) => ({
                              ...prev,
                              leave_type: e.target.value,
                            }))
                          }
                          className="w-full mt-1 border rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600"
                        >
                          <option value="Weekend Leave">Weekend Leave</option>
                          <option value="Medical Leave">Medical Leave</option>
                          <option value="Emergency Leave">
                            Emergency Leave
                          </option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400">
                            From Date
                          </label>
                          <input
                            type="date"
                            value={hostelLeaveForm.from_date}
                            onChange={(e) =>
                              setHostelLeaveForm((prev) => ({
                                ...prev,
                                from_date: e.target.value,
                              }))
                            }
                            className="w-full mt-1 border rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400">
                            To Date
                          </label>
                          <input
                            type="date"
                            value={hostelLeaveForm.to_date}
                            onChange={(e) =>
                              setHostelLeaveForm((prev) => ({
                                ...prev,
                                to_date: e.target.value,
                              }))
                            }
                            className="w-full mt-1 border rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600"
                          />
                        </div>
                      </div>

                      <textarea
                        rows="3"
                        placeholder="Reason for leave..."
                        value={hostelLeaveForm.reason}
                        onChange={(e) =>
                          setHostelLeaveForm((prev) => ({
                            ...prev,
                            reason: e.target.value,
                          }))
                        }
                        className="w-full border rounded-lg p-3 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />

                      <div className="flex flex-col sm:flex-row justify-end gap-2">
                        <button
                          onClick={() => setShowLeaveModal(false)}
                          className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={leaveSubmitting}
                          onClick={async () => {
                            const success = await handleApplyLeave();
                            if (success) {
                              setShowLeaveModal(false);
                              setHostelTab("leave");
                            }
                          }}
                          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-60"
                        >
                          {leaveSubmitting ? "Submitting..." : "Submit Request"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= ADD VISITOR MODAL ================= */}
                {showVisitorModal && (
                  <div
                    className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50"
                    onClick={() => setShowVisitorModal(false)}
                  >
                    <div
                      className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-md shadow-lg space-y-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                          Request Visitor Pass
                        </h3>
                        <button
                          onClick={() => setShowVisitorModal(false)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">
                          Visitor Name
                        </label>
                        <input
                          type="text"
                          placeholder="Full name"
                          value={visitorForm.visitor_name}
                          onChange={(e) =>
                            setVisitorForm((prev) => ({
                              ...prev,
                              visitor_name: e.target.value,
                            }))
                          }
                          className="w-full mt-1 border rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400">
                            Mobile
                          </label>
                          <input
                            type="text"
                            placeholder="Mobile number"
                            value={visitorForm.visitor_mobile}
                            onChange={(e) =>
                              setVisitorForm((prev) => ({
                                ...prev,
                                visitor_mobile: e.target.value,
                              }))
                            }
                            className="w-full mt-1 border rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400">
                            Relation
                          </label>
                          <select
                            value={visitorForm.relation}
                            onChange={(e) =>
                              setVisitorForm((prev) => ({
                                ...prev,
                                relation: e.target.value,
                              }))
                            }
                            className="w-full mt-1 border rounded-lg p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600"
                          >
                            <option value="Parent">Parent</option>
                            <option value="Guardian">Guardian</option>
                            <option value="Friend">Friend</option>
                            <option value="Relative">Relative</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>

                      <textarea
                        rows="3"
                        placeholder="Purpose of visit..."
                        value={visitorForm.purpose}
                        onChange={(e) =>
                          setVisitorForm((prev) => ({
                            ...prev,
                            purpose: e.target.value,
                          }))
                        }
                        className="w-full border rounded-lg p-3 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />

                      <div className="flex flex-col sm:flex-row justify-end gap-2">
                        <button
                          onClick={() => setShowVisitorModal(false)}
                          className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={visitorSubmitting}
                          onClick={async () => {
                            const success = await handleRequestVisitor();
                            if (success) {
                              setShowVisitorModal(false);
                              setHostelTab("visitors");
                            }
                          }}
                          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-60"
                        >
                          {visitorSubmitting
                            ? "Submitting..."
                            : "Submit Request"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}
        {/* ===================== HOSTEL SECTION END ========================*/}

        {/* ===================== STUDENT LIBRARY ======================== */}
        {activeSection === "library" && (
          <section className="section p-4 sm:p-6 space-y-6 active">
            {studentLibraryLoading && !libraryProfile ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {/* HEADER */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-5 sm:p-6 rounded-2xl shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold">
                      📚 My Library
                    </h3>
                    <p className="text-xs sm:text-sm opacity-90">
                      Track your books, returns, fines and complete borrowing
                      history
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={refreshStudentLibrary}
                      disabled={studentLibraryLoading}
                      className="flex-1 sm:flex-none px-4 py-2 bg-white text-indigo-600 rounded-xl text-sm font-medium hover:bg-gray-100 transition disabled:opacity-60"
                    >
                      <i
                        className={`bi bi-arrow-clockwise mr-1 ${
                          studentLibraryLoading
                            ? "inline-block animate-spin"
                            : ""
                        }`}
                      ></i>
                      Refresh
                    </button>
                  </div>
                </div>

                {/* MEMBER CARD */}
                {libraryProfile && (
                  <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-indigo-100 text-lg sm:text-xl text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                          <i className="bi bi-person-badge"></i>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Library Member
                          </p>

                          <h3 className="mt-1 text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {libraryProfile.name ||
                              `${student?.first_name || ""} ${student?.last_name || ""}`}
                          </h3>

                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {libraryProfile.student_code ||
                              student?.student_id ||
                              "-"}
                            {libraryProfile.class_name
                              ? ` • ${libraryProfile.class_name}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-xl bg-gray-50 dark:bg-slate-700 px-4 py-3">
                          <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400">
                            Member Status
                          </p>
                          <p
                            className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadgeClass(
                              libraryProfile.status === "Blocked"
                                ? "Cancelled"
                                : "Active",
                            )}`}
                          >
                            {libraryProfile.status || "Active"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-gray-50 dark:bg-slate-700 px-4 py-3">
                          <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400">
                            Borrow Limit
                          </p>
                          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {libraryProfile.borrow_limit ?? "-"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-gray-50 dark:bg-slate-700 px-4 py-3">
                          <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400">
                            Current Books
                          </p>
                          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {studentLibrarySummary.currently_issued || 0}
                          </p>
                        </div>

                        <div className="rounded-xl bg-gray-50 dark:bg-slate-700 px-4 py-3">
                          <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400">
                            Remaining Limit
                          </p>
                          <p className="mt-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                            {libraryProfile.remaining_limit ?? "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* KPI CARDS */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    [
                      "Currently Issued",
                      studentLibrarySummary.currently_issued || 0,
                    ],
                    ["Due Soon", studentLibrarySummary.due_soon || 0],
                    ["Overdue", studentLibrarySummary.overdue || 0],
                    ["Books Returned", studentLibrarySummary.returned || 0],
                    [
                      "Fine Pending",
                      formatCurrency(studentLibrarySummary.fine_pending || 0),
                    ],
                    [
                      "Fine Paid",
                      formatCurrency(studentLibrarySummary.fine_paid || 0),
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm"
                    >
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {label}
                      </p>
                      <h4 className="mt-1 text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {value}
                      </h4>
                    </div>
                  ))}
                </div>

                {/* OVERDUE WARNING */}
                {studentLibrarySummary.overdue > 0 && (
                  <div className="flex flex-col gap-3 rounded-2xl bg-red-50 dark:bg-red-900/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <i className="bi bi-exclamation-triangle-fill mt-0.5 text-red-600"></i>
                      <div>
                        <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                          You have overdue library books
                        </p>
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                          Please return overdue books to avoid additional fines.
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white self-start sm:self-auto">
                      {studentLibrarySummary.overdue} Overdue
                    </span>
                  </div>
                )}

                {/* TABS */}
                <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-gray-200 dark:border-slate-700">
                  {[
                    ["issued", "Current Books", currentBooks.length, "bi-book"],
                    [
                      "history",
                      "Borrowing History",
                      borrowingHistory.length,
                      "bi-clock-history",
                    ],
                    [
                      "fines",
                      "My Fines",
                      fineRecords.length,
                      "bi-currency-rupee",
                    ],
                    [
                      "payments",
                      "Payments",
                      paymentHistory.length,
                      "bi-receipt",
                    ],
                    [
                      "notifications",
                      "Library Alerts",
                      libraryNotifications.length,
                      "bi-bell",
                    ],
                    [
                      "catalog",
                      "Book Catalog",
                      catalogPagination.total,
                      "bi-journal-bookmark",
                    ],
                  ].map(([key, label, count, icon]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setLibraryActiveTab(key)}
                      className={`flex items-center gap-1.5 whitespace-nowrap px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition ${
                        libraryActiveTab === key
                          ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                          : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                      }`}
                    >
                      <i className={`bi ${icon}`}></i>
                      {label}
                      {count > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300">
                          {count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* ================= CURRENT BOOKS TAB ================= */}
                {libraryActiveTab === "issued" && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                      <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                        Currently Issued Books
                      </h4>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative">
                          <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                          <input
                            type="search"
                            value={librarySearch}
                            onChange={(e) => setLibrarySearch(e.target.value)}
                            placeholder="Search book, author, ISBN..."
                            className="w-full sm:w-56 border rounded-lg pl-8 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600"
                          />
                        </div>
                        <select
                          value={libraryStatusFilter}
                          onChange={(e) =>
                            setLibraryStatusFilter(e.target.value)
                          }
                          className="border rounded-lg px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600"
                        >
                          <option value="">All Status</option>
                          <option value="Issued">Issued</option>
                          <option value="Due Soon">Due Soon</option>
                          <option value="Overdue">Overdue</option>
                        </select>
                      </div>
                    </div>

                    {studentLibraryLoading ? (
                      <div className="flex justify-center items-center py-16">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm min-w-[820px]">
                          <thead className="bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300">
                            <tr>
                              <th className="py-3 px-3 text-left">Book</th>
                              <th className="text-left px-3">Issue Date</th>
                              <th className="text-left px-3">Due Date</th>
                              <th className="text-center px-3">Days</th>
                              <th className="text-right px-3">Fine</th>
                              <th className="text-left px-3">Status</th>
                              <th className="text-right px-3">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y dark:divide-slate-700">
                            {filteredCurrentBooks.length > 0 ? (
                              filteredCurrentBooks.map((book) => (
                                <tr
                                  key={book.id}
                                  className="hover:bg-gray-50 dark:hover:bg-slate-700"
                                >
                                  <td className="py-3 px-3">
                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                      {book.book_title}
                                    </p>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                      {book.book_code}
                                      {book.author ? ` • ${book.author}` : ""}
                                    </p>
                                  </td>
                                  <td className="px-3 text-gray-600 dark:text-gray-300">
                                    {book.issue_date}
                                  </td>
                                  <td className="px-3 text-gray-600 dark:text-gray-300">
                                    {book.due_date}
                                  </td>
                                  <td className="px-3 text-center">
                                    <span
                                      className={
                                        Number(book.overdue_days || 0) > 0
                                          ? "font-semibold text-red-600"
                                          : "text-gray-600 dark:text-gray-300"
                                      }
                                    >
                                      {book.status === "Overdue"
                                        ? `${book.overdue_days} late`
                                        : book.days_left !== undefined
                                          ? `${book.days_left} left`
                                          : "-"}
                                    </span>
                                  </td>
                                  <td className="px-3 text-right">
                                    <span
                                      className={
                                        Number(book.pending_fine || 0) > 0
                                          ? "font-semibold text-red-600"
                                          : "text-green-600 dark:text-green-400"
                                      }
                                    >
                                      {formatCurrency(book.pending_fine || 0)}
                                    </span>
                                  </td>
                                  <td className="px-3">
                                    <span
                                      className={`px-2 py-1 text-[10px] sm:text-xs rounded-full ${statusBadgeClass(book.status)}`}
                                    >
                                      {book.status}
                                    </span>
                                  </td>
                                  <td className="px-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => openLibraryRecord(book)}
                                      className="text-[11px] sm:text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                                    >
                                      View
                                    </button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="py-6 px-3 text-center text-gray-500 dark:text-gray-400"
                                >
                                  No currently issued books
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ================= HISTORY TAB ================= */}
                {libraryActiveTab === "history" && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                      <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                        Borrowing History
                      </h4>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative">
                          <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                          <input
                            type="search"
                            value={librarySearch}
                            onChange={(e) => setLibrarySearch(e.target.value)}
                            placeholder="Search book, author, ISBN..."
                            className="w-full sm:w-56 border rounded-lg pl-8 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600"
                          />
                        </div>
                        <select
                          value={libraryStatusFilter}
                          onChange={(e) =>
                            setLibraryStatusFilter(e.target.value)
                          }
                          className="border rounded-lg px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600"
                        >
                          <option value="">All Status</option>
                          <option value="Issued">Issued</option>
                          <option value="Due Soon">Due Soon</option>
                          <option value="Overdue">Overdue</option>
                          <option value="Returned">Returned</option>
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs sm:text-sm min-w-[840px]">
                        <thead className="bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300">
                          <tr>
                            <th className="py-3 px-3 text-left">Book</th>
                            <th className="text-left px-3">Issue Date</th>
                            <th className="text-left px-3">Due Date</th>
                            <th className="text-left px-3">Return Date</th>
                            <th className="text-center px-3">Late Days</th>
                            <th className="text-right px-3">Fine</th>
                            <th className="text-left px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-700">
                          {filteredHistory.length > 0 ? (
                            filteredHistory.map((record) => (
                              <tr
                                key={record.id}
                                className="hover:bg-gray-50 dark:hover:bg-slate-700"
                              >
                                <td className="py-3 px-3">
                                  <button
                                    type="button"
                                    onClick={() => openLibraryRecord(record)}
                                    className="text-left"
                                  >
                                    <p className="font-medium text-indigo-600 dark:text-indigo-400">
                                      {record.book_title}
                                    </p>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                      {record.author}
                                    </p>
                                  </button>
                                </td>
                                <td className="px-3 text-gray-600 dark:text-gray-300">
                                  {record.issue_date}
                                </td>
                                <td className="px-3 text-gray-600 dark:text-gray-300">
                                  {record.due_date}
                                </td>
                                <td className="px-3 text-gray-600 dark:text-gray-300">
                                  {record.return_date || "-"}
                                </td>
                                <td className="px-3 text-center text-gray-600 dark:text-gray-300">
                                  {record.overdue_days || 0}
                                </td>
                                <td className="px-3 text-right text-gray-900 dark:text-gray-100">
                                  {formatCurrency(record.fine_amount || 0)}
                                </td>
                                <td className="px-3">
                                  <span
                                    className={`px-2 py-1 text-[10px] sm:text-xs rounded-full ${statusBadgeClass(record.status)}`}
                                  >
                                    {record.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={7}
                                className="py-6 px-3 text-center text-gray-500 dark:text-gray-400"
                              >
                                No borrowing history
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ================= FINES TAB ================= */}
                {libraryActiveTab === "fines" && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-700">
                      <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                        My Fines
                      </h4>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs sm:text-sm min-w-[860px]">
                        <thead className="bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300">
                          <tr>
                            <th className="py-3 px-3 text-left">Fine ID</th>
                            <th className="text-left px-3">Book</th>
                            <th className="text-center px-3">Late Days</th>
                            <th className="text-right px-3">Fine</th>
                            <th className="text-right px-3">Paid</th>
                            <th className="text-right px-3">Waived</th>
                            <th className="text-right px-3">Pending</th>
                            <th className="text-left px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-700">
                          {fineRecords.length > 0 ? (
                            fineRecords.map((fine) => (
                              <tr
                                key={fine.id}
                                className="hover:bg-gray-50 dark:hover:bg-slate-700"
                              >
                                <td className="py-3 px-3 font-medium text-gray-900 dark:text-gray-100">
                                  {fine.fine_code}
                                </td>
                                <td className="px-3">
                                  <p className="font-medium text-gray-900 dark:text-gray-100">
                                    {fine.book_title}
                                  </p>
                                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                    {fine.book_code}
                                  </p>
                                </td>
                                <td className="px-3 text-center text-red-600 dark:text-red-400">
                                  {fine.overdue_days}
                                </td>
                                <td className="px-3 text-right font-medium text-gray-900 dark:text-gray-100">
                                  {formatCurrency(fine.fine_amount || 0)}
                                </td>
                                <td className="px-3 text-right text-green-600 dark:text-green-400">
                                  {formatCurrency(fine.collected_amount || 0)}
                                </td>
                                <td className="px-3 text-right text-purple-600 dark:text-purple-400">
                                  {formatCurrency(fine.waived_amount || 0)}
                                </td>
                                <td className="px-3 text-right font-semibold text-red-600 dark:text-red-400">
                                  {formatCurrency(fine.pending_amount || 0)}
                                </td>
                                <td className="px-3">
                                  <span
                                    className={`px-2 py-1 text-[10px] sm:text-xs rounded-full ${statusBadgeClass(fine.status)}`}
                                  >
                                    {fine.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={8}
                                className="py-6 px-3 text-center text-gray-500 dark:text-gray-400"
                              >
                                No fine records 🎉
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ================= PAYMENTS TAB ================= */}
                {libraryActiveTab === "payments" && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-700">
                      <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                        Payment History
                      </h4>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs sm:text-sm min-w-[800px]">
                        <thead className="bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300">
                          <tr>
                            <th className="py-3 px-3 text-left">Transaction</th>
                            <th className="text-left px-3">Book</th>
                            <th className="text-right px-3">Amount</th>
                            <th className="text-left px-3">Method</th>
                            <th className="text-left px-3">Reference</th>
                            <th className="text-left px-3">Date</th>
                            <th className="text-left px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-700">
                          {paymentHistory.length > 0 ? (
                            paymentHistory.map((payment) => (
                              <tr
                                key={payment.id}
                                className="hover:bg-gray-50 dark:hover:bg-slate-700"
                              >
                                <td className="py-3 px-3 font-medium text-gray-900 dark:text-gray-100">
                                  {payment.transaction_code}
                                </td>
                                <td className="px-3 text-gray-600 dark:text-gray-300">
                                  {payment.book_title}
                                </td>
                                <td className="px-3 text-right font-semibold text-gray-900 dark:text-gray-100">
                                  {formatCurrency(payment.amount || 0)}
                                </td>
                                <td className="px-3 text-gray-600 dark:text-gray-300">
                                  {payment.payment_method}
                                </td>
                                <td className="px-3 text-gray-600 dark:text-gray-300">
                                  {payment.reference_no || "-"}
                                </td>
                                <td className="px-3 text-gray-600 dark:text-gray-300">
                                  {formatDateTime(payment.transaction_date)}
                                </td>
                                <td className="px-3">
                                  <span
                                    className={`px-2 py-1 text-[10px] sm:text-xs rounded-full ${statusBadgeClass(payment.status)}`}
                                  >
                                    {payment.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={7}
                                className="py-6 px-3 text-center text-gray-500 dark:text-gray-400"
                              >
                                No payment transactions
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ================= NOTIFICATIONS TAB ================= */}
                {libraryActiveTab === "notifications" && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-700">
                      <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                        Library Alerts
                      </h4>
                    </div>

                    <div className="divide-y dark:divide-slate-700">
                      {libraryNotifications.length > 0 ? (
                        libraryNotifications.map((notification) => (
                          <div
                            key={notification.id}
                            className="flex gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-700"
                          >
                            <span
                              className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl ${
                                notification.type === "overdue"
                                  ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300"
                                  : notification.type === "fine"
                                    ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-300"
                                    : "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"
                              }`}
                            >
                              <i
                                className={`bi ${
                                  notification.type === "overdue"
                                    ? "bi-exclamation-triangle"
                                    : notification.type === "fine"
                                      ? "bi-currency-rupee"
                                      : "bi-bell"
                                }`}
                              ></i>
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                  {notification.title}
                                </p>
                                <span className="text-[11px] text-gray-400">
                                  {formatDateTime(notification.created_at)}
                                </span>
                              </div>
                              <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                                {notification.message}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                          No library notifications
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ================= BOOK CATALOG TAB ================= */}
                {libraryActiveTab === "catalog" && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-700 space-y-3">
                      <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                        Book Catalog
                      </h4>

                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                        <div className="relative flex-1">
                          <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                          <input
                            type="search"
                            value={catalogSearch}
                            onChange={(e) => setCatalogSearch(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") searchCatalog();
                            }}
                            placeholder="Search catalog by title, author, ISBN..."
                            className="w-full border rounded-lg pl-8 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600"
                          />
                        </div>

                        <select
                          value={catalogCategoryId}
                          onChange={(e) => setCatalogCategoryId(e.target.value)}
                          className="border rounded-lg px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600"
                        >
                          <option value="">All Categories</option>
                          {catalogCategories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>

                        <select
                          value={catalogAuthorId}
                          onChange={(e) => setCatalogAuthorId(e.target.value)}
                          className="border rounded-lg px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600"
                        >
                          <option value="">All Authors</option>
                          {catalogAuthors.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>

                        <select
                          value={catalogStatusFilter}
                          onChange={(e) =>
                            setCatalogStatusFilter(e.target.value)
                          }
                          className="border rounded-lg px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600"
                        >
                          <option value="">Any Availability</option>
                          <option value="Available">Available</option>
                          <option value="Unavailable">Unavailable</option>
                        </select>

                        <button
                          type="button"
                          onClick={searchCatalog}
                          className="px-4 py-2 text-xs sm:text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                        >
                          Search
                        </button>
                      </div>
                    </div>

                    {catalogLoading ? (
                      <div className="flex justify-center items-center py-16">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : catalogBooks.length === 0 ? (
                      <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                        No books found. Try adjusting your search or filters.
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                          {catalogBooks.map((book) => (
                            <div
                              key={book.id}
                              className="p-3 bg-gray-50 dark:bg-slate-700 rounded-xl"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {book.title}
                                </p>
                                <span
                                  className={`shrink-0 px-2 py-0.5 text-[10px] rounded-full ${statusBadgeClass(book.status)}`}
                                >
                                  {book.status}
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                {book.author_name || "Unknown Author"}
                              </p>

                              <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-gray-600 dark:text-gray-300">
                                <p>
                                  <span className="text-gray-400">
                                    Category:{" "}
                                  </span>
                                  {book.category_name || "-"}
                                </p>
                                <p>
                                  <span className="text-gray-400">Shelf: </span>
                                  {book.shelf_no || "-"}
                                </p>
                                <p className="truncate">
                                  <span className="text-gray-400">ISBN: </span>
                                  {book.isbn || "-"}
                                </p>
                                <p>
                                  <span className="text-gray-400">
                                    Copies:{" "}
                                  </span>
                                  {book.available_copies}/{book.total_copies}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {catalogPagination.pages > 1 && (
                          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-slate-700">
                            <button
                              type="button"
                              disabled={!catalogPagination.has_prev}
                              onClick={() =>
                                changeCatalogPage(catalogPagination.page - 1)
                              }
                              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-40"
                            >
                              Previous
                            </button>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Page {catalogPagination.page} of{" "}
                              {catalogPagination.pages}
                            </span>
                            <button
                              type="button"
                              disabled={!catalogPagination.has_next}
                              onClick={() =>
                                changeCatalogPage(catalogPagination.page + 1)
                              }
                              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-40"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ================= BOOK DETAIL MODAL ================= */}
                {libraryRecordModalOpen && selectedLibraryRecord && (
                  <div
                    className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50"
                    onClick={closeLibraryRecord}
                  >
                    <div
                      className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto shadow-lg space-y-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Borrowing Details
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {selectedLibraryRecord.issue_code}
                          </p>
                        </div>
                        <button
                          onClick={closeLibraryRecord}
                          className="text-gray-500 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-4 sm:p-5 text-white">
                        <p className="text-xs uppercase text-indigo-200">
                          Book
                        </p>
                        <h3 className="mt-1 text-lg sm:text-xl font-semibold">
                          {selectedLibraryRecord.book_title}
                        </h3>
                        <p className="mt-1 text-xs sm:text-sm text-indigo-100">
                          {selectedLibraryRecord.author || "Unknown Author"}
                          {selectedLibraryRecord.category
                            ? ` • ${selectedLibraryRecord.category}`
                            : ""}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        {[
                          ["Book ID", selectedLibraryRecord.book_code],
                          ["ISBN", selectedLibraryRecord.isbn],
                          ["Issue Date", selectedLibraryRecord.issue_date],
                          ["Due Date", selectedLibraryRecord.due_date],
                          ["Return Date", selectedLibraryRecord.return_date],
                          ["Status", selectedLibraryRecord.status],
                          ["Days Left", selectedLibraryRecord.days_left],
                          ["Late Days", selectedLibraryRecord.overdue_days],
                          [
                            "Fine",
                            formatCurrency(
                              selectedLibraryRecord.fine_amount ||
                                selectedLibraryRecord.pending_fine ||
                                0,
                            ),
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="p-3 bg-gray-50 dark:bg-slate-700 rounded-xl"
                          >
                            <p className="text-[10px] font-medium uppercase text-gray-500 dark:text-gray-400">
                              {label}
                            </p>
                            <p className="mt-1 break-words text-sm font-semibold text-gray-800 dark:text-gray-100">
                              {value !== undefined &&
                              value !== null &&
                              value !== ""
                                ? value
                                : "-"}
                            </p>
                          </div>
                        ))}
                      </div>

                      {selectedLibraryRecord.status === "Overdue" && (
                        <div className="rounded-xl bg-red-50 dark:bg-red-900/10 p-4">
                          <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                            Return required
                          </p>
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                            This book is overdue. Please return it to the
                            library circulation desk.
                          </p>
                        </div>
                      )}

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={closeLibraryRecord}
                          className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}
        {/* ===================== STUDENT LIBRARY END ======================== */}

        {/* ===================== STUDENT LEAVE SECTION START ========================*/}

        {activeSection === "leaves" && (
          <section className="p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow">
              <h2 className="text-xl font-semibold">My Leave Requests</h2>
              <p className="text-sm opacity-90">Apply and track your leave</p>
            </div>

            {/* APPLY LEAVE */}
            <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-semibold">Apply for Leave</h3>

              {/* DATE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* FROM DATE */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-600">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={leaveForm.from_date}
                    onChange={(e) =>
                      setLeaveForm({ ...leaveForm, from_date: e.target.value })
                    }
                    className="px-4 py-2 border rounded-xl text-sm"
                  />
                </div>

                {/* TO DATE */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-600">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={leaveForm.to_date}
                    onChange={(e) =>
                      setLeaveForm({ ...leaveForm, to_date: e.target.value })
                    }
                    className="px-4 py-2 border rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* LEAVE TYPE DROPDOWN */}
              <select
                value={leaveForm.leave_type || "Casual"}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, leave_type: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-xl text-sm"
              >
                <option value="Casual">Casual Leave</option>
                <option value="Sick">Sick Leave</option>
                <option value="Emergency">Emergency Leave</option>
              </select>

              {/* REASON */}
              <textarea
                placeholder="Enter reason..."
                value={leaveForm.reason}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, reason: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-xl text-sm"
              />

              {/* DAYS + BUTTON */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-gray-500">
                  Total Days: <span>{totalDays}</span>
                </p>

                <button
                  onClick={applyLeave}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm w-full sm:w-auto"
                >
                  Submit Request
                </button>
              </div>
            </div>

            {/* HISTORY */}
            <div className="bg-white p-5 rounded-2xl shadow-sm">
              <h3 className="font-semibold mb-4">Leave History</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {studentLeaves.map((l) => (
                  <div key={l.id} className="border p-3 rounded-xl space-y-1">
                    {/* DATES */}
                    <p className="font-medium">
                      {l.from} → {l.to} ({l.days} days)
                    </p>

                    {/* TYPE */}
                    <p className="text-xs text-gray-500">
                      Type: {l.type || "N/A"}
                    </p>

                    {/* REASON */}
                    <p className="text-xs text-gray-500">
                      Reason: {l.reason || "N/A"}
                    </p>

                    {/* APPLIED DATE */}
                    <p className="text-xs text-gray-400">
                      Applied: {l.applied_at || "N/A"}
                    </p>

                    {/* APPROVED DATE */}
                    {l.status === "Approved" && (
                      <p className="text-xs text-green-600">
                        Approved on: {l.approved_at || "N/A"}
                      </p>
                    )}

                    {/* REJECTED DATE */}
                    {l.status === "Rejected" && (
                      <p className="text-xs text-red-500">
                        Rejected on: {l.rejected_at || "N/A"}
                      </p>
                    )}

                    {/* STATUS + ACTIONS */}
                    <div className="flex items-center justify-between pt-2">
                      {/* STATUS BADGE */}
                      <span
                        className={`text-xs px-3 py-1 rounded-full ${
                          l.status === "Approved"
                            ? "bg-green-100 text-green-600"
                            : l.status === "Rejected"
                              ? "bg-red-100 text-red-600"
                              : "bg-yellow-100 text-yellow-600"
                        }`}
                      >
                        {l.status}
                      </span>

                      {/* DELETE BUTTON (ONLY PENDING) */}
                      {l.status === "Pending" && (
                        <button
                          onClick={() => deleteLeave(l.id)}
                          className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-lg hover:bg-red-200"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ===================== STUDENT LEAVE SECTION END ========================*/}

        {/* ===================== ANNOUNCEMENTS + NOTIFICATIONS ========================*/}
        {activeSection === "announcements" && (
          <section className="section p-4 sm:p-6 space-y-6 active">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-5 sm:p-6 rounded-2xl shadow-md">
              <h3 className="text-lg sm:text-xl font-semibold">
                🔔 Updates Center
              </h3>
              <p className="text-xs sm:text-sm opacity-90">
                Announcements & Notifications in one place
              </p>
            </div>

            {/* 🔥 TABS */}
            <div className="flex gap-3 border-b pb-2">
              {/* ANNOUNCEMENTS TAB */}
              <button
                onClick={() => setNoticeTab("announcements")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition
        ${
          noticeTab === "announcements"
            ? "bg-indigo-600 text-white shadow"
            : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300"
        }`}
              >
                📢 Announcements
                {unreadCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* NOTIFICATIONS TAB */}
              <button
                onClick={() => setNoticeTab("notifications")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition
        ${
          noticeTab === "notifications"
            ? "bg-indigo-600 text-white shadow"
            : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300"
        }`}
              >
                🔔 Notifications
                {notificationUnread > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {notificationUnread}
                  </span>
                )}
              </button>
            </div>

            {/* ===================== CONTENT ===================== */}

            {/* 📢 ANNOUNCEMENTS */}
            {noticeTab === "announcements" && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4">
                {noticeLoading ? (
                  <p className="text-center">Loading...</p>
                ) : announcements.length === 0 ? (
                  <p className="text-center text-gray-400">No announcements</p>
                ) : (
                  announcements.map((n) => (
                    <div
                      key={n.id}
                      onClick={async () => {
                        if (!n.is_read) await markNoticeAsRead(n.id);
                      }}
                      className={`p-4 rounded-xl mb-3 cursor-pointer transition border
              ${
                !n.is_read
                  ? "bg-gray-50 dark:bg-slate-700 font-medium"
                  : "bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700"
              }`}
                    >
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {n.title}
                      </p>

                      <p className="text-sm text-gray-500">{n.description}</p>

                      <div className="flex justify-between text-xs mt-2">
                        <span>{n.category}</span>
                        <span>{n.date}</span>
                      </div>

                      {/* PRIORITY */}
                      <span
                        className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                          n.priority === "High"
                            ? "bg-red-100 text-red-600"
                            : n.priority === "Medium"
                              ? "bg-yellow-100 text-yellow-600"
                              : "bg-green-100 text-green-600"
                        }`}
                      >
                        {n.priority}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 🔔 NOTIFICATIONS */}
            {noticeTab === "notifications" && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4">
                {notificationLoading ? (
                  <p className="text-center">Loading...</p>
                ) : notifications.length === 0 ? (
                  <p className="text-center text-gray-400">No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={async () => {
                        if (!n.is_read) await markNotificationRead(n.id);
                      }}
                      className={`p-4 rounded-xl mb-3 cursor-pointer transition border
              ${
                !n.is_read
                  ? "bg-indigo-50 dark:bg-slate-700 font-medium"
                  : "bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700"
              }`}
                    >
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {n.title}
                      </p>

                      <p className="text-sm text-gray-500">{n.message}</p>

                      <div className="text-xs mt-2 text-gray-400">
                        {n.created_at}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        )}
        {/* ===================== NOTICES SECTION END ========================*/}

        {/* ===================== PROFILE SECTION START ========================*/}
        {activeSection === "profile" && (
          <section className="section p-4 sm:p-6 space-y-6 active">
            {/* PROFILE HEADER */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <img
                src="https://i.pravatar.cc/100"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white shadow"
              />

              <div className="text-center sm:text-left w-full">
                {editMode ? (
                  <div>
                    <label className="text-xs text-white font-medium">
                      Editing Name
                    </label>

                    <input
                      name="first_name"
                      value={formData.first_name || ""}
                      onChange={handleChange}
                      className="mt-1 w-full text-lg sm:text-xl font-semibold p-2 rounded-xl 
              bg-white/90 text-black focus:outline-none focus:ring-2 focus:ring-white"
                    />

                    <input
                      name="middle_name"
                      value={formData.middle_name || ""}
                      onChange={handleChange}
                      className="mt-1 w-full text-lg sm:text-xl font-semibold p-2 rounded-xl 
              bg-white/90 text-black focus:outline-none focus:ring-2 focus:ring-white"
                    />

                    <input
                      name="last_name"
                      value={formData.last_name || ""}
                      onChange={handleChange}
                      className="mt-1 w-full text-lg sm:text-xl font-semibold p-2 rounded-xl 
              bg-white/90 text-black focus:outline-none focus:ring-2 focus:ring-white"
                    />
                  </div>
                ) : (
                  <h3 className="font-semibold text-lg sm:text-xl text-white">
                    {student?.first_name} {student?.middle_name}{" "}
                    {student?.last_name}
                  </h3>
                )}

                <p className="text-xs sm:text-sm text-white mt-1 opacity-90">
                  Class: {student?.division_name} • Section:{" "}
                  {student?.section_name} • Roll No: {student?.roll_number}
                </p>
              </div>
            </div>

            {/* INPUT STYLE REUSE */}
            {(() => {
              const inputClass =
                "mt-1 w-full p-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition " +
                "bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 " +
                "border-gray-200 dark:border-slate-700 focus:ring-blue-500";

              const labelClass =
                "text-sm font-medium text-gray-700 dark:text-gray-300";

              return (
                <>
                  {/* DETAILS GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {/* PERSONAL */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-3">
                      <h4 className="font-semibold">Personal Details</h4>

                      {editMode ? (
                        <input
                          type="date"
                          name="date_of_birth"
                          value={formData.date_of_birth || ""}
                          onChange={handleChange}
                          className={inputClass}
                        />
                      ) : (
                        <p className="text-sm">
                          📅 DOB: {student?.date_of_birth || "-"}
                        </p>
                      )}

                      <p className="text-sm">
                        👤 Gender: {student?.gender || "-"}
                      </p>

                      {editMode ? (
                        <select
                          name="blood_group"
                          value={formData.blood_group || ""}
                          onChange={handleChange}
                          className={inputClass}
                        >
                          <option value="">Select Blood Group</option>
                          {[
                            "A+",
                            "A-",
                            "B+",
                            "B-",
                            "AB+",
                            "AB-",
                            "O+",
                            "O-",
                          ].map((bg) => (
                            <option key={bg} value={bg}>
                              {bg}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-sm">
                          🩸 Blood Group: {student?.blood_group || "-"}
                        </p>
                      )}

                      {editMode ? (
                        <input
                          name="mobile"
                          value={formData.mobile || ""}
                          onChange={handleChange}
                          placeholder="Mobile"
                          className={inputClass}
                        />
                      ) : (
                        <p className="text-sm">
                          📞 Phone: {student?.mobile || "-"}
                        </p>
                      )}

                      <p className="text-sm break-all">
                        📧 Email: {student?.email || "-"}
                      </p>
                    </div>

                    {/* FAMILY */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-3">
                      <h4 className="font-semibold">Family Details</h4>

                      {editMode ? (
                        <>
                          <input
                            name="father_name"
                            value={formData.father_name || ""}
                            onChange={handleChange}
                            placeholder="Father Name"
                            className={inputClass}
                          />
                          <input
                            name="father_mobile"
                            value={formData.father_mobile || ""}
                            onChange={handleChange}
                            placeholder="Father Mobile"
                            className={inputClass}
                          />
                        </>
                      ) : (
                        <>
                          <p className="text-sm">
                            👨 Father: {student?.father_name || "-"}
                          </p>
                          <p className="text-sm">
                            📞 {student?.father_mobile || "-"}
                          </p>
                        </>
                      )}

                      {editMode ? (
                        <>
                          <input
                            name="mother_name"
                            value={formData.mother_name || ""}
                            onChange={handleChange}
                            placeholder="Mother Name"
                            className={inputClass}
                          />
                          <input
                            name="mother_mobile"
                            value={formData.mother_mobile || ""}
                            onChange={handleChange}
                            placeholder="Mother Mobile"
                            className={inputClass}
                          />
                        </>
                      ) : (
                        <>
                          <p className="text-sm">
                            👩 Mother: {student?.mother_name || "-"}
                          </p>
                          <p className="text-sm">
                            📞 {student?.mother_mobile || "-"}
                          </p>
                        </>
                      )}

                      {editMode ? (
                        <textarea
                          name="address"
                          value={formData.address || ""}
                          onChange={handleChange}
                          placeholder="Address"
                          className={inputClass}
                        />
                      ) : (
                        <p className="text-sm">🏠 {student?.address || "-"}</p>
                      )}
                    </div>

                    {/* EMERGENCY */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-3">
                      <h4 className="font-semibold">Emergency Contact</h4>

                      {editMode ? (
                        <>
                          <input
                            name="emergency_contact_name"
                            value={formData.emergency_contact_name || ""}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="Name"
                          />
                          <input
                            name="emergency_contact_number"
                            value={formData.emergency_contact_number || ""}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="Number"
                          />
                          <input
                            name="emergency_contact_relation"
                            value={formData.emergency_contact_relation || ""}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="Relation"
                          />
                        </>
                      ) : (
                        <>
                          <p className="text-sm">
                            🚨 {student?.emergency_contact_name || "-"}
                          </p>
                          <p className="text-sm">
                            📞 {student?.emergency_contact_number || "-"}
                          </p>
                          <p className="text-sm">
                            🔗 {student?.emergency_contact_relation || "-"}
                          </p>
                        </>
                      )}
                    </div>

                    {/* MEDICAL */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-3">
                      <h4 className="font-semibold">Medical Info</h4>

                      {editMode ? (
                        <>
                          <textarea
                            name="medical_conditions"
                            value={formData.medical_conditions || ""}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="Medical Conditions"
                          />
                          <textarea
                            name="allergies"
                            value={formData.allergies || ""}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="Allergies"
                          />
                        </>
                      ) : (
                        <>
                          <p className="text-sm">
                            🩺 {student?.medical_conditions || "-"}
                          </p>
                          <p className="text-sm">
                            ⚠️ {student?.allergies || "-"}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6">
                    {editMode ? (
                      <div className="flex flex-col sm:flex-row justify-end gap-2">
                        <button
                          onClick={() => setEditMode(false)}
                          className="px-5 py-2 rounded-xl bg-gray-400 text-white w-full sm:w-auto"
                        >
                          Cancel
                        </button>

                        <button
                          onClick={handleSave}
                          className="px-5 py-2 rounded-xl bg-green-600 text-white w-full sm:w-auto"
                        >
                          Save Changes
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <button
                          onClick={() => setEditMode(true)}
                          className="px-5 py-2 rounded-xl bg-purple-600 text-white w-full sm:w-auto hover:bg-purple-700 transition"
                        >
                          Edit Profile
                        </button>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </section>
        )}
        {/* ===================== PROFILE SECTION END ========================*/}

        {passwordModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 w-full max-w-md border border-gray-100 dark:border-slate-700">
              {/* HEADER */}
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Change Password
              </h2>

              {/* INPUTS */}
              <div className="flex flex-col gap-3">
                {[
                  { name: "current_password", placeholder: "Current Password" },
                  { name: "new_password", placeholder: "New Password" },
                  { name: "confirm_password", placeholder: "Confirm Password" },
                ].map((field) => (
                  <input
                    key={field.name}
                    type={showPassword ? "text" : "password"}
                    name={field.name}
                    placeholder={field.placeholder}
                    value={passwordData[field.name]}
                    onChange={handlePasswordChange}
                    className="px-4 py-2 rounded-xl border text-sm
            bg-white dark:bg-slate-700
            text-gray-900 dark:text-white
            border-gray-200 dark:border-slate-600
            focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                ))}

                {/* TOGGLE */}
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300 mt-1 select-none hover:text-gray-700 dark:hover:text-white transition"
                >
                  {showPassword ? (
                    <i className="bi bi-eye-slash-fill"></i>
                  ) : (
                    <i className="bi bi-eye-fill"></i>
                  )}
                  <span>
                    {showPassword ? "Hide Passwords" : "Show Passwords"}
                  </span>
                </button>
              </div>

              {/* ACTIONS */}
              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={() => setPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-slate-700 
          hover:bg-gray-300 dark:hover:bg-slate-600 text-sm transition"
                >
                  Cancel
                </button>

                <button
                  onClick={handleChangePassword}
                  disabled={passwordLoading}
                  className={`px-4 py-2 rounded-xl text-white text-sm transition
            ${
              passwordLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
                >
                  {passwordLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default StudentDashboard;
