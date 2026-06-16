import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  APP_NAME,
  APP_YEAR,
  BASE_URL,
  FILE_BASE_URL,
} from "../config/appConfig";
import "../css/dashboard.css";
import { useDashboardUI } from "../controllers/useDashboardUI";
import { useAdminDashboard } from "../controllers/adminDashboard";
import { useAdminProfile } from "../controllers/Profiles/useAdminProfile";
import { useAssets } from "../controllers/Assets/useAssets";
import { useLeaveManagement } from "../controllers/Leaves/useLeaveManagement";
import { useAttendanceManagement } from "../controllers/Attendance/useAttendanceManagement";
import { useTimeTableManagement } from "../controllers/TimeTable/useTimetableManagement";

function AdminDashboard() {
  // UI STATE (LOCAL COMPONENT STATE)
  const [noticeTab, setNoticeTab] = useState("announcements");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [search, setSearch] = useState("");

  // ================= DASHBOARD HOOK =================
  const {
    navigate,
    // state
    sidebarOpen,
    profileOpen,
    mobileSearchOpen,
    showPassword,
    showNotifications,
    darkMode,

    // setters
    setSidebarOpen,
    setProfileOpen,
    setMobileSearchOpen,
    setShowPassword,
    setShowNotifications,
    setDarkMode,

    // refs
    bellRef,

    // actions
    toggleTheme,
  } = useDashboardUI();

  // ================= Admin DASHBOARD HOOK =================
  const {
    // shared helpers
    fetchWithAuth,
    showToast,

    // loading
    loading,
    noticeLoading,

    // notices
    unreadCount,
    announcements,
    noticeStats,
    markNoticeAsRead,

    // notifications
    notifications,
    notificationUnread,
    notificationLoading,
    markNotificationRead,

    combinedNotifications,
    sortedNotifications,
    totalUnread,
    handleNotificationClick,

    toast,
  } = useAdminDashboard(activeSection);

  // ================= LEAVE HOOK =================
  const {
    teacherLeaves,
    studentLeaves,
    leaveLoading,
    activeLeaveTab,
    setActiveLeaveTab,
    leaveSearch,
    setLeaveSearch,
    leaveFilter,
    setLeaveFilter,
    filteredLeaves,
    leaveCounts,
    approveTeacherLeave,
    rejectTeacherLeave,
    approveStudentLeave,
    rejectStudentLeave,
  } = useLeaveManagement(fetchWithAuth, showToast);

  // ================= TIME TABLE HOOK =================
  const {
    loadingTimeTable,
    lectureModalOpen,
    loadTimetable,
    lectureForm,
    updateLectureForm,

    periods: TTperiods,
    classes: TTClasses,
    divisions: TTDivisions,
    sections: TTsections,

    subjects,
    teachers,
    rooms,

    filters,
    updateFilter,

    lectures,
    getLecturesForSlot,

    stats,
    days,
    timeSlots,

    openLectureModal,
    closeLectureModal,
    saveLecture,
    deleteLecture,
    refreshTimetable,
    exportTimetablePDF,
  } = useTimeTableManagement({
    activeSection,
    showToast,
    fetchWithAuth,
  });

  // ================= ATTENDANCE HOOK =================
  const {
    role,
    setRole,
    selectedClass,
    setSelectedClass,
    selectedDivision,
    classes,
    divisions,
    setSelectedDivision,
    selectedStatus,
    setSelectedStatus,
    selectedDate,
    setSelectedDate,
    search: searchAttendance,
    setSearch: setSearchAttendance,
    attendanceStats,
    attendanceList,
    page,
    setPage,
    limit,
    setLimit,
    pagination,
    loading: loadingAttendance,
    statsLoading,
    refreshAttendance,
    fetchAttendanceList,
    fetchAttendanceStats,
    updateAttendanceStatus,
    markAllAttendance,
  } = useAttendanceManagement({
    activeSection,
    fetchWithAuth,
    showToast,
  });

  // ================= PROFILE HOOK =================
  const {
    // profile
    admin,
    formData,
    editMode,
    setEditMode,
    handleChange,
    handleSave,

    // password
    passwordModalOpen,
    setPasswordModalOpen,
    passwordData,
    passwordLoading,
    handlePasswordChange,
    handleChangePassword,

    // auth
    handleLogout,
  } = useAdminProfile({ fetchWithAuth });

  // ================= ASSETS HOOK =================
  const {
    // DATA
    assets,
    filteredAssets,
    deletedAssets,

    // LOADING
    assetLoading,

    // SEARCH
    assetSearch,
    setAssetSearch,

    // COUNTS
    assetCounts,

    // TAB
    activeAssetTab,
    setActiveAssetTab,

    // MODAL
    isAddAssetModalOpen,
    setIsAddAssetModalOpen,

    // EDIT MODE
    isEditMode,
    setIsEditMode,
    editingAssetId,
    setEditingAssetId,

    // FORM
    newAsset,
    setNewAsset,

    // METHODS
    fetchAssets,
    filterAssets,
    openAddAssetModal,
    closeAddAssetModal,
    handleInputChange,
    resetAssetForm,
    editAsset,

    // RESTORE
    restoreDeletedAsset,

    // CRUD
    addAsset,
    updateAsset,
    deleteAsset,
  } = useAssets(fetchWithAuth, showToast);

  useEffect(() => {
    if (window.innerWidth >= 768) {
      setSidebarOpen(true);
    }
  }, []);

  return (
    <div className="flex">
      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[50] md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

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
        {/* ================= LOGO ================= */}
        <div
          className={`border-b border-gray-100 dark:border-slate-700 
    flex items-center transition-all duration-300
    ${sidebarOpen ? "px-6 py-5 gap-2 justify-start" : "py-5 justify-center"}
  `}
        >
          <i
            className="bi bi-mortarboard text-purple-600 text-xl"
            title={!sidebarOpen ? APP_NAME : ""}
          ></i>

          <span
            className={`font-bold text-lg text-purple-600 transition-all duration-200
      ${sidebarOpen ? "opacity-100 ml-2" : "opacity-0 w-0 overflow-hidden"}
      md:${sidebarOpen ? "block" : "hidden"}
    `}
          >
            {APP_NAME}
          </span>
        </div>

        {/* ================= NAV ================= */}
        <nav className="flex-1 overflow-y-auto no-scrollbar scroll-smooth px-2 py-4 space-y-2 text-sm">
          {[
            {
              title: "MAIN",
              items: [
                ["dashboard", "bi-grid-fill", "Dashboard"],
                ["analytics", "bi-bar-chart", "Analytics"],
              ],
            },
            {
              title: "USER MANAGEMENT",
              items: [
                ["students", "bi-mortarboard", "Students"],
                ["teachers", "bi-person-badge", "Teachers"],
                ["parents", "bi-people-fill", "Parents"],
                ["roles", "bi-shield-lock", "Roles & Permissions"],
              ],
            },
            {
              title: "ACADEMIC",
              items: [
                ["classes", "bi-easel", "Classes & Sections"],
                ["subjects", "bi-book", "Subjects"],
                ["timetable", "bi-clock", "Timetable"],
                ["attendance", "bi-calendar-check", "Attendance"],
                ["exams", "bi-award", "Exams & Results"],
              ],
            },
            {
              title: "ADMISSIONS",
              items: [["admissions", "bi-file-earmark-text", "Applications"]],
            },
            {
              title: "FINANCE",
              items: [
                ["fees", "bi-cash-stack", "Fee Management"],
                ["reports", "bi-receipt", "Financial Reports"],
              ],
            },
            {
              title: "COMMUNICATION",
              items: [["notices", "bi-bell", "Notices"]],
            },
            {
              title: "EVENTS",
              items: [["events", "bi-calendar-event", "Events"]],
            },
            {
              title: "HR MANAGEMENT",
              items: [
                ["staff", "bi-person-lines-fill", "Staff"],
                ["payroll", "bi-wallet2", "Payroll"],
                ["leave", "bi-calendar-plus", "Leave Management"],
              ],
            },
            {
              title: "RESOURCES",
              items: [
                ["library", "bi-journal-bookmark", "Library"],
                ["assets", "bi-box-seam", "Assets"],
              ],
            },
            {
              title: "SYSTEM",
              items: [
                ["settings", "bi-gear", "Settings"],
                ["security", "bi-shield-check", "Security & Logs"],
              ],
            },
          ].map((section, i) => (
            <div key={i}>
              {/* SECTION TITLE */}
              {sidebarOpen && (
                <p className="text-xs text-gray-400 px-3 mt-4">
                  {section.title}
                </p>
              )}

              {/* MENU ITEMS */}
              {section.items.map(([key, icon, label]) => {
                const isActive = activeSection === key;

                return (
                  <button
                    key={key}
                    title={!sidebarOpen ? label : ""}
                    onClick={() => {
                      setActiveSection(key);
                      setSidebarOpen(false);
                    }}
                    className={`relative group flex w-full items-center
              ${sidebarOpen ? "gap-3 px-4 justify-start" : "justify-center"}
              py-3 rounded-xl transition-all duration-200
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

                    {/* ICON */}
                    <i className={`bi ${icon} text-base`}></i>

                    {/* LABEL */}
                    <span
                      className={`${
                        sidebarOpen ? "md:block" : "md:hidden"
                      } truncate`}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        {/* ================= FOOTER ================= */}
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
      animate-slideInRight transition-all duration-500
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
                          navigate("/admin/announcements "); // ✅ better route
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
                      {admin?.first_name}
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
                          {admin?.first_name} {admin?.last_name}
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
          <section>
            <h1>hello Super Admin</h1>
          </section>
        )}

        {/* <!-- =========================== TEACHERS SECTION START ============================ --> */}
        {activeSection === "teachers" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* <!-- TEXT --> */}
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Teachers Management
                  </h2>
                  <p className="text-xs sm:text-sm opacity-90">
                    View teachers, attendance & leave overview
                  </p>
                </div>

                {/* <!-- BUTTON --> */}
                <button
                  onclick="openAddTeacher()"
                  className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium shadow"
                >
                  + Add Teacher
                </button>
              </div>
            </div>

            {/* <!-- STATS --> */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl shadow text-center">
                <p className="text-xs text-gray-500">Total Teachers</p>
                <h2 id="totalTeachers" className="font-bold text-lg">
                  0
                </h2>
              </div>

              <div className="bg-white p-4 rounded-xl shadow text-center">
                <p className="text-xs text-gray-500">Present Today</p>
                <h2
                  id="presentTeachers"
                  className="font-bold text-green-600 text-lg"
                >
                  0
                </h2>
              </div>

              <div className="bg-white p-4 rounded-xl shadow text-center">
                <p className="text-xs text-gray-500">On Leave</p>
                <h2
                  id="leaveTeachers"
                  className="font-bold text-red-500 text-lg"
                >
                  0
                </h2>
              </div>

              <div className="bg-white p-4 rounded-xl shadow text-center">
                <p className="text-xs text-gray-500">Avg Attendance</p>
                <h2
                  id="avgAttendance"
                  className="font-bold text-indigo-600 text-lg"
                >
                  0%
                </h2>
              </div>
            </div>

            {/* <!-- FILTER --> */}
            <div className="bg-white p-4 rounded-2xl shadow flex flex-col sm:flex-row sm:items-end gap-4">
              {/* <!-- SEARCH --> */}
              <div className="flex-1">
                <label className="text-xs text-gray-500">Search Teacher</label>
                <input
                  type="text"
                  id="searchTeacher"
                  placeholder="Enter name..."
                  className="input mt-1 w-full"
                />
              </div>

              {/* <!-- STATUS FILTER --> */}
              <div className="w-full sm:w-48">
                <label className="text-xs text-gray-500">Status</label>
                <select id="statusFilter" className="input mt-1 w-full">
                  <option value="">All</option>
                  <option value="Present">Present</option>
                  <option value="Leave">On Leave</option>
                </select>
              </div>

              {/* <!-- ACTION BUTTONS --> */}
              <div className="flex gap-2">
                <button
                  onclick="applyFilter()"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
                >
                  Apply
                </button>

                <button
                  onclick="resetFilter()"
                  className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-100"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* <!-- TEACHER LIST --> */}
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold mb-3">Teacher List</h3>

              <div id="teacherList" className="space-y-3"></div>
            </div>
          </section>
        )}

        {/* <!-- MODAL --> */}
        <div
          id="teacherModal"
          className="hidden fixed inset-0 md:pl-64 z-50 flex items-center justify-center 
    bg-black/40 backdrop-blur-sm p-4"
        >
          <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl p-4 relative">
            {/* <!-- CLOSE --> */}
            <button
              onclick="closeModal()"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
            >
              ✕
            </button>

            {/* <!-- PROFILE CONTENT --> */}
            <div id="modalContent"></div>
          </div>
        </div>

        {/* <!-- ADD TEACHER MODAL --> */}
        <div
          id="addTeacherSection"
          className="hidden fixed inset-0 md:pl-64 z-50 flex items-center justify-center 
    bg-black/40 backdrop-blur-sm p-4"
        >
          <div
            className="bg-white w-full max-w-6xl max-h-[90vh] overflow-y-auto 
    rounded-2xl shadow-lg p-5 space-y-6"
          >
            {/* <!-- HEADER --> */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Add New Teacher</h2>
                <p className="text-xs text-gray-500">Fill teacher details</p>
              </div>
              <button
                onclick="closeAddTeacher()"
                className="text-gray-500 text-lg"
              >
                ✕
              </button>
            </div>

            {/* <!-- PROFILE HEADER --> */}
            <div className="rounded-2xl p-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex flex-col items-center">
                  <img
                    id="previewImage"
                    src="https://i.pravatar.cc/120"
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
                  />

                  <input
                    type="file"
                    className="mt-2 text-xs"
                    onchange="previewImg(event)"
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <div>
                    <label className="text-xs">Full Name</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Enter full name"
                    />
                  </div>

                  <div>
                    <label className="text-xs">Designation & Department</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Lecturer • Mathematics"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* <!-- FORM GRID --> */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {/* <!-- PERSONAL --> */}
              <div className="card">
                <h4>👤 Personal Info</h4>

                <label>DOB</label>
                <input type="date" className="input" />

                <label>Gender</label>
                <select className="input">
                  <option>Select</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>

                <label>Mobile</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Phone number"
                />

                <label>Email</label>
                <input type="email" className="input" placeholder="Email" />
              </div>

              {/* <!-- PROFESSIONAL --> */}
              <div className="card">
                <h4>💼 Professional</h4>

                <label>Teacher ID</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Auto / Manual"
                />

                <label>Designation</label>
                <input type="text" className="input" placeholder="Lecturer" />

                <label>Department</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Mathematics"
                />

                <label>Subjects</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Math, Physics"
                />

                <label>Assigned Classes</label>
                <input type="text" className="input" placeholder="10-A, 9-B" />
              </div>

              {/* <!-- ACADEMIC --> */}
              <div className="card">
                <h4>🎓 Academic</h4>

                <label>Highest Degree</label>
                <input type="text" className="input" placeholder="M.Sc" />

                <label>University</label>
                <input
                  type="text"
                  className="input"
                  placeholder="University Name"
                />

                <label>Experience (Years)</label>
                <input type="number" className="input" />

                <label>Specialization</label>
                <input type="text" className="input" placeholder="Algebra" />
              </div>

              {/* <!-- EMPLOYMENT --> */}
              <div className="card">
                <h4>🏢 Employment</h4>

                <label>Joining Date</label>
                <input type="date" className="input" />

                <label>Employment Type</label>
                <select className="input">
                  <option>Full-Time</option>
                  <option>Part-Time</option>
                </select>

                <label>Shift</label>
                <select className="input">
                  <option>Morning</option>
                  <option>Evening</option>
                </select>

                <label>Status</label>
                <select className="input">
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>

              {/* <!-- ADDRESS --> */}
              <div className="card">
                <h4>📍 Address</h4>

                <label>Address</label>
                <input type="text" className="input" />

                <label>City</label>
                <input type="text" className="input" />

                <label>Pincode</label>
                <input type="text" className="input" />
              </div>

              {/* <!-- HEALTH --> */}
              <div className="card">
                <h4>🩺 Health</h4>

                <label>Blood Group</label>
                <input type="text" className="input" />

                <label>Medical Conditions</label>
                <input type="text" className="input" />
              </div>

              {/* <!-- EMERGENCY --> */}
              <div className="card">
                <h4>🆘 Emergency Contact</h4>

                <label>Name</label>
                <input type="text" className="input" />

                <label>Relation</label>
                <input type="text" className="input" />

                <label>Phone</label>
                <input type="text" className="input" />
              </div>

              {/* <!-- SYSTEM --> */}
              <div className="card">
                <h4>⚙️ System</h4>

                <label>Username</label>
                <input type="text" className="input" />

                <label>Password</label>
                <input type="password" className="input" />
              </div>
            </div>

            {/* <!-- ACTION --> */}
            <div className="flex justify-end gap-3">
              <button
                onclick="closeAddTeacher()"
                className="px-5 py-2 border rounded-lg"
              >
                Cancel
              </button>

              <button className="px-6 py-2 bg-indigo-600 text-white rounded-lg">
                Save Teacher
              </button>
            </div>
          </div>
        </div>
        {/* <!-- =========================== TEACHERS SECTION END ============================ --> */}

        {/* =========================== PREMIUM TIMETABLE SECTION ============================ */}
        {activeSection === "timetable" && (
          <section className="space-y-6 animate-in fade-in duration-500">
            {/* <!-- HEADER --> */}
            <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Timetable Management</h2>

                  <p className="text-sm opacity-90 mt-1">
                    Create and manage class schedules, teacher lectures and
                    classroom allocation.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto">
                  <button
                    onClick={() => openLectureModal()}
                    className="w-full sm:w-auto bg-white text-indigo-600 px-4 py-3 rounded-xl font-medium shadow hover:shadow-md transition"
                  >
                    + Schedule Lecture
                  </button>

                  <button
                    onClick={refreshTimetable}
                    className="bg-indigo-800 px-4 py-2 rounded-xl"
                  >
                    Refresh
                  </button>

                  <button
                    onClick={exportTimetablePDF}
                    className="bg-green-600 px-4 py-2 rounded-xl"
                  >
                    Export PDF
                  </button>
                </div>
              </div>
            </div>
            {/* FILTERS */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <select
                  value={filters.academic_class_id}
                  onChange={(e) =>
                    updateFilter("academic_class_id", e.target.value)
                  }
                  className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="">All Classes</option>

                  {TTClasses?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.display_name || item.class_name}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.subject_id}
                  onChange={(e) => updateFilter("subject_id", e.target.value)}
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="">All Subjects</option>

                  {subjects?.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.subject_name}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.teacher_id}
                  onChange={(e) => updateFilter("teacher_id", e.target.value)}
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="">All Teachers</option>

                  {teachers?.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.first_name} {teacher.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
              {[
                {
                  title: "Total Lectures",
                  value: stats.totalLectures,
                  icon: "📚",
                },
                {
                  title: "Subjects",
                  value: stats.totalSubjects,
                  icon: "📖",
                },
                {
                  title: "Teachers",
                  value: stats.totalTeachers,
                  icon: "👨‍🏫",
                },
                {
                  title: "Rooms",
                  value: stats.totalRooms,
                  icon: "🏫",
                },
                {
                  title: "Weekly Load",
                  value: stats.weeklyLoad,
                  icon: "📊",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        {item.title}
                      </p>

                      <h3 className="mt-2 text-2xl font-bold text-slate-900">
                        {item.value}
                      </h3>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-xl">
                      {item.icon}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* TIMETABLE */}
            <div className="w-full max-w-full overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Weekly Timetable
                  </h3>

                  <p className="text-sm text-slate-500">
                    View and manage scheduled lectures.
                  </p>
                </div>

                <button
                  onClick={refreshTimetable}
                  className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                >
                  Refresh Data
                </button>
              </div>

              {/* ================= MOBILE VIEW ================= */}
              <div className="lg:hidden space-y-4">
                {timeSlots.map((slot) => (
                  <div
                    key={slot}
                    className="bg-white rounded-2xl shadow-sm border p-4"
                  >
                    <h3 className="font-semibold mb-4">{slot}</h3>

                    <div className="space-y-3">
                      {days.map((day) => {
                        const lectures = getLecturesForSlot(day, slot);

                        return (
                          <div key={day} className="border rounded-xl p-3">
                            <p className="font-medium text-indigo-600 mb-2">
                              {day}
                            </p>

                            {lectures.length > 0 ? (
                              lectures.map((lecture) => (
                                <div key={lecture.id} className="space-y-2">
                                  <p className="font-semibold">
                                    {lecture.subject_name}
                                  </p>

                                  <p className="text-sm text-gray-500">
                                    👨‍🏫 {lecture.teacher_name}
                                  </p>

                                  <p className="text-sm text-gray-500">
                                    🏫 Room {lecture.room_no || "N/A"}
                                  </p>

                                  <p className="text-sm text-gray-500">
                                    {lecture.start_time}-{lecture.end_time}
                                  </p>

                                  <div className="flex gap-2 pt-2">
                                    <button
                                      onClick={() => openLectureModal(lecture)}
                                      className="flex-1 rounded-lg bg-blue-50 py-2 text-blue-600"
                                    >
                                      Edit
                                    </button>

                                    <button
                                      onClick={() => deleteLecture(lecture.id)}
                                      className="flex-1 rounded-lg bg-red-50 py-2 text-red-600"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <button
                                onClick={() =>
                                  openLectureModal({
                                    day,
                                    slot,
                                  })
                                }
                                className="w-full border-2 border-dashed rounded-xl py-4 text-gray-400"
                              >
                                + Add Lecture
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* ================= DESKTOP VIEW ================= */}
              <div className="hidden lg:block w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                <table className="w-full table-fixed border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                    <tr>
                      <th className="border-b border-r border-slate-200 px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                        Time Slot
                      </th>

                      {days.map((day) => (
                        <th
                          key={day}
                          className="border-b border-r border-slate-200 px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600"
                        >
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {timeSlots.length === 0 ? (
                      <tr>
                        <td
                          colSpan={days.length + 1}
                          className="px-6 py-16 text-center"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <div className="text-5xl">📅</div>

                            <h4 className="text-lg font-semibold text-slate-900">
                              No Lectures Scheduled
                            </h4>

                            <p className="text-sm text-slate-500">
                              Create your first lecture schedule.
                            </p>

                            <button
                              onClick={() => openLectureModal()}
                              className="mt-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                            >
                              Schedule Lecture
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      timeSlots.map((slot) => (
                        <tr key={slot} className="hover:bg-slate-50/50">
                          <td className="border-r border-b border-slate-200 px-4 py-5 align-top font-semibold text-slate-700 whitespace-nowrap">
                            {slot}
                          </td>

                          {days.map((day) => {
                            const lectures = getLecturesForSlot(day, slot);

                            return (
                              <td
                                key={`${day}-${slot}`}
                                className="border-r border-b border-slate-200 p-3 align-top min-w-[280px]"
                              >
                                <div className="space-y-3">
                                  {lectures.length > 0 ? (
                                    lectures.map((lecture) => (
                                      <div
                                        key={lecture.id}
                                        className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div>
                                            <h4 className="font-bold text-indigo-700">
                                              {lecture.subject_name}
                                            </h4>

                                            <p className="mt-1 text-xs text-slate-500">
                                              {lecture.lecture_type}
                                            </p>
                                          </div>

                                          <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                                            P{lecture.period_no}
                                          </span>
                                        </div>

                                        <div className="mt-4 space-y-2 text-sm">
                                          <div className="flex items-center gap-2 text-slate-600">
                                            <span>👨‍🏫</span>
                                            <span>
                                              {lecture.teacher_name ||
                                                "Not Assigned"}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-2 text-slate-600">
                                            <span>🏫</span>
                                            <span>
                                              Room {lecture.room_no || "N/A"}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-2 text-slate-600">
                                            <span>⏰</span>
                                            <span>
                                              {lecture.start_time} -{" "}
                                              {lecture.end_time}
                                            </span>
                                          </div>
                                        </div>

                                        {lecture.remarks && (
                                          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                                            📝 {lecture.remarks}
                                          </div>
                                        )}

                                        <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                                          <button
                                            onClick={() =>
                                              openLectureModal(lecture)
                                            }
                                            className="flex-1 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
                                          >
                                            Edit
                                          </button>

                                          <button
                                            onClick={() =>
                                              deleteLecture(lecture.id)
                                            }
                                            className="flex-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <button
                                      onClick={() =>
                                        openLectureModal({
                                          day,
                                          slot,
                                        })
                                      }
                                      className="flex h-24 w-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-sm font-medium text-slate-400 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600"
                                    >
                                      + Add Lecture
                                    </button>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ================= LECTURE MODAL ================= */}
        <div
          id="lectureModal"
          className={`fixed inset-0 z-[70] ${
            lectureModalOpen ? "flex" : "hidden"
          } items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4`}
        >
          <div
            className="
      relative
      w-full
      max-w-5xl
      max-h-[92vh]
      overflow-hidden
      rounded-2xl
      bg-white
      shadow-2xl
      border border-slate-200
      flex flex-col
      animate-in fade-in zoom-in-95 duration-200
    "
          >
            {/* HEADER */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center justify-between">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                  Schedule Lecture
                </h2>

                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Create and manage timetable entries
                </p>
              </div>

              <button
                onClick={closeLectureModal}
                className="
          flex items-center justify-center
          h-10 w-10 rounded-xl
          text-slate-500 hover:text-slate-700
          hover:bg-slate-100
          transition-all duration-200
          flex-shrink-0
        "
              >
                ✕
              </button>
            </div>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* CLASS */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Class
                  </label>

                  <select
                    value={lectureForm.academic_class_id || ""}
                    onChange={(e) =>
                      updateLectureForm("academic_class_id", e.target.value)
                    }
                    className="
              w-full h-11 px-4
              rounded-xl
              border border-slate-200
              bg-white
              text-sm
              focus:ring-2 focus:ring-indigo-500/20
              focus:border-indigo-500
              outline-none
              transition-all
            "
                  >
                    <option value="">Select Class</option>

                    {TTClasses?.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.display_name || item.class_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">
                    Division
                  </label>

                  <select
                    value={selectedDivision}
                    onChange={(e) => setSelectedDivision(e.target.value)}
                    className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm"
                  >
                    <option value="">All Divisions</option>

                    {divisions.map((division) => (
                      <option key={division} value={division}>
                        {division}
                      </option>
                    ))}
                  </select>
                </div>
                {/* DIVISION */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Division
                  </label>

                  <select
                    value={lectureForm.division_id || ""}
                    onChange={(e) =>
                      updateLectureForm("division_id", e.target.value)
                    }
                    className="
              w-full h-11 px-4 rounded-xl border border-slate-200
              text-sm focus:ring-2 focus:ring-indigo-500/20
              focus:border-indigo-500 outline-none
            "
                  >
                    <option value="">Select Division</option>

                    {TTDivisions?.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.division_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SECTION */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Section
                  </label>

                  <select
                    value={lectureForm.section_id || ""}
                    onChange={(e) =>
                      updateLectureForm("section_id", e.target.value)
                    }
                    className="
              w-full h-11 px-4 rounded-xl border border-slate-200
              text-sm focus:ring-2 focus:ring-indigo-500/20
              focus:border-indigo-500 outline-none
            "
                  >
                    <option value="">Select Section</option>

                    {TTsections?.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.section_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* DAY */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Day
                  </label>

                  <select
                    value={lectureForm.day}
                    onChange={(e) => updateLectureForm("day", e.target.value)}
                    className="
              w-full h-11 px-4 rounded-xl border border-slate-200
              text-sm focus:ring-2 focus:ring-indigo-500/20
              focus:border-indigo-500 outline-none
            "
                  >
                    <option value="">Select Day</option>

                    <option>Monday</option>
                    <option>Tuesday</option>
                    <option>Wednesday</option>
                    <option>Thursday</option>
                    <option>Friday</option>
                    <option>Saturday</option>
                  </select>
                </div>

                {/* LECTURE TYPE */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Lecture Type
                  </label>

                  <select
                    value={lectureForm.lecture_type || "Theory"}
                    onChange={(e) =>
                      updateLectureForm("lecture_type", e.target.value)
                    }
                    className="
              w-full h-11 px-4 rounded-xl border border-slate-200
              text-sm focus:ring-2 focus:ring-indigo-500/20
              focus:border-indigo-500 outline-none
            "
                  >
                    <option>Theory</option>
                    <option>Practical</option>
                    <option>Lab</option>
                    <option>Sports</option>
                    <option>Activity</option>
                    <option>Exam</option>
                  </select>
                </div>

                {/* PERIOD */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Period
                  </label>

                  <select
                    value={lectureForm.period_no || ""}
                    onChange={(e) => {
                      const period = TTperiods.find(
                        (p) => p.no === Number(e.target.value),
                      );
                      updateLectureForm("period_no", Number(e.target.value));
                      updateLectureForm("start_time", period?.start || "");
                      updateLectureForm("end_time", period?.end || "");
                    }}
                    className="
              w-full h-11 px-4 rounded-xl border border-slate-200
              text-sm focus:ring-2 focus:ring-indigo-500/20
              focus:border-indigo-500 outline-none
            "
                  >
                    <option value="">Select Period</option>

                    {TTperiods.map((p) => (
                      <option key={p.no} value={p.no}>
                        P{p.no} ({p.start}-{p.end})
                      </option>
                    ))}
                  </select>
                </div>

                {/* TIME SLOT */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Time Slot
                  </label>

                  <input
                    readOnly
                    value={`${lectureForm.start_time || ""} - ${
                      lectureForm.end_time || ""
                    }`}
                    className="
              w-full h-11 px-4 rounded-xl border border-slate-200
              bg-slate-50 text-sm text-slate-600
            "
                  />
                </div>

                {/* SUBJECT */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Subject
                  </label>

                  <select
                    value={lectureForm.subject_id || ""}
                    onChange={(e) =>
                      updateLectureForm("subject_id", e.target.value)
                    }
                    className="
              w-full h-11 px-4 rounded-xl border border-slate-200
              text-sm focus:ring-2 focus:ring-indigo-500/20
              focus:border-indigo-500 outline-none
            "
                  >
                    <option value="">Select Subject</option>

                    {subjects?.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.subject_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* TEACHER */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Assigned Teacher
                  </label>

                  <select
                    value={lectureForm.teacher_id || ""}
                    onChange={(e) =>
                      updateLectureForm("teacher_id", e.target.value)
                    }
                    className="
              w-full h-11 px-4 rounded-xl border border-slate-200
              text-sm focus:ring-2 focus:ring-indigo-500/20
              focus:border-indigo-500 outline-none
            "
                  >
                    <option value="">Select Teacher</option>

                    {teachers?.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.first_name} {item.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ROOM */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Classroom
                  </label>

                  <select
                    value={lectureForm.room_no || ""}
                    onChange={(e) =>
                      updateLectureForm("room_no", e.target.value)
                    }
                    className="
              w-full h-11 px-4 rounded-xl border border-slate-200
              text-sm focus:ring-2 focus:ring-indigo-500/20
              focus:border-indigo-500 outline-none
            "
                  >
                    <option value="">Select Room</option>

                    {rooms?.map((item) => (
                      <option key={item.id} value={item.room_no}>
                        {item.room_no}
                      </option>
                    ))}
                  </select>
                </div>

                {/* CAPACITY */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Room Capacity
                  </label>

                  <input
                    readOnly
                    value={
                      rooms.find((r) => r.room_no === lectureForm.room_no)
                        ?.capacity || "-"
                    }
                    className="
              w-full h-11 px-4 rounded-xl border border-slate-200
              bg-slate-50 text-sm text-slate-600
            "
                  />
                </div>

                {/* REMARKS */}
                <div className="md:col-span-2 xl:col-span-3 space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Remarks
                  </label>

                  <textarea
                    rows={4}
                    value={lectureForm.remarks}
                    onChange={(e) =>
                      updateLectureForm("remarks", e.target.value)
                    }
                    className="
              w-full rounded-xl border border-slate-200
              px-4 py-3 text-sm resize-none
              focus:ring-2 focus:ring-indigo-500/20
              focus:border-indigo-500 outline-none
            "
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              {/* CONFLICT ALERT */}
              <div
                id="lectureConflict"
                className="hidden mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600"
              />
            </div>

            {/* FOOTER */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-4 sm:px-6 py-4">
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button
                  onClick={closeLectureModal}
                  className="
            w-full sm:w-auto
            px-5 py-2.5
            rounded-xl
            border border-slate-300
            bg-white
            text-slate-700
            font-medium
            hover:bg-slate-50
            transition-all
          "
                >
                  Cancel
                </button>

                <button
                  onClick={saveLecture}
                  className="
            w-full sm:w-auto
            px-5 py-2.5
            rounded-xl
            bg-indigo-600
            text-white
            font-medium
            hover:bg-indigo-700
            shadow-sm
            transition-all
          "
                >
                  Save Lecture
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* ================= LECTURE MODAL END ================= */}
        {/* =========================== ATTENDANCE SECTION START ============================ */}
        {activeSection === "attendance" && (
          <section className="section active p-3 sm:p-5 lg:p-6 space-y-6 min-h-screen dark:bg-slate-900 dark:text-gray-100">
            {/* HEADER */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 p-6 sm:p-8 shadow-xl">
              <div className="relative z-10">
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  Attendance Management
                </h2>

                <p className="text-blue-100 mt-2 text-sm sm:text-base">
                  Monitor and manage students & teachers attendance records
                </p>
              </div>

              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute right-20 bottom-0 w-28 h-28 bg-cyan-300/20 rounded-full blur-2xl"></div>
            </div>

            {/* ================= STATS ================= */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <div className="xl:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* PRESENT */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Present</p>
                      <h2 className="text-2xl font-bold text-green-600 mt-1">
                        {attendanceStats?.present ?? 0}
                      </h2>
                    </div>

                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                      <i className="fas fa-check text-green-600"></i>
                    </div>
                  </div>
                </div>

                {/* ABSENT */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Absent</p>
                      <h2 className="text-2xl font-bold text-red-500 mt-1">
                        {attendanceStats.absent ?? 0}
                      </h2>
                    </div>

                    <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                      <i className="fas fa-times text-red-500"></i>
                    </div>
                  </div>
                </div>

                {/* TOTAL */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Total</p>
                      <h2 className="text-2xl font-bold text-blue-600 mt-1">
                        {attendanceStats.total ?? 0}
                      </h2>
                    </div>

                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <i className="fas fa-users text-blue-600"></i>
                    </div>
                  </div>
                </div>

                {/* PERCENTAGE */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Attendance %</p>
                      <h2 className="text-2xl font-bold text-purple-600 mt-1">
                        {attendanceStats.percentage ?? 0}%
                      </h2>
                    </div>

                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                      <i className="fas fa-chart-pie text-purple-600"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ================= FILTERS ================= */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* ROLE */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">
                    Role
                  </label>

                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="students">Students</option>

                    <option value="teachers">Teachers</option>
                  </select>
                </div>

                {/* DATE */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">
                    Date
                  </label>

                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* CLASS */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">
                    Class
                  </label>
                  <select
                    value={selectedClass}
                    className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    onChange={(e) => setSelectedClass(e.target.value)}
                  >
                    <option value="">All Classes</option>

                    {classes.map((cls) => (
                      <option key={`class-${cls.id}`} value={cls.id}>
                        {cls.class_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SEARCH */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">
                    Search
                  </label>

                  <div className="relative">
                    <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>

                    <input
                      type="text"
                      value={searchAttendance}
                      onChange={(e) => setSearchAttendance(e.target.value)}
                      placeholder="Search..."
                      className="w-full h-11 rounded-xl border border-gray-200 pl-11 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ================= TABLE ================= */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              {/* TOP */}
              <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-gray-800">
                    Attendance List
                  </h3>

                  <p className="text-sm text-gray-500 mt-1">
                    Manage daily attendance records
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => markAllAttendance(selectedClass, "Present")}
                    className="px-4 h-10 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition"
                  >
                    Mark All Present
                  </button>

                  <button
                    onClick={() => markAllAttendance(selectedClass, "Absent")}
                    className="px-4 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition"
                  >
                    Mark All Absent
                  </button>
                </div>
              </div>

              {/* TABLE */}
              <div className="overflow-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10 text-gray-600">
                    <tr>
                      <th className="p-4 text-left font-semibold">ID</th>

                      <th className="p-4 text-left font-semibold">Name</th>

                      <th className="p-4 text-left font-semibold">Role</th>

                      <th className="p-4 text-left font-semibold">Status</th>

                      <th className="p-4 text-left font-semibold">Reason</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 bg-white">
                    {loadingAttendance ? (
                      <tr>
                        <td colSpan="5" className="text-center p-8">
                          Loading...
                        </td>
                      </tr>
                    ) : attendanceList.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="text-center p-8 text-gray-500"
                        >
                          No attendance records found
                        </td>
                      </tr>
                    ) : (
                      attendanceList.map((row) => (
                        <tr
                          key={`${row.role}-${row.student_id || row.teacher_id}-${row.session_id || "none"}-${row.record_id || "new"}`}
                          className="hover:bg-gray-50"
                        >
                          <td className="p-4">
                            {row.student_id ?? row.teacher_id ?? "-"}
                          </td>

                          <td className="p-4 font-medium">{row.name}</td>

                          <td className="p-4">{row.role}</td>

                          <td className="p-4">
                            <select
                              value={row.status || "Not Marked"}
                              onChange={(e) =>
                                updateAttendanceStatus(
                                  row,
                                  e.target.value,
                                  row.reason || "",
                                )
                              }
                              className="border rounded-lg px-3 py-2"
                            >
                              <option value="Not Marked" disabled>
                                Not Marked
                              </option>

                              <option value="Present">Present</option>

                              <option value="Absent">Absent</option>

                              <option value="Late">Late</option>
                            </select>
                          </td>

                          <td className="p-4">{row.reason || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {attendanceList.length} of {pagination.total} records
                </p>

                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="w-10 h-10 rounded-xl border border-gray-200 hover:bg-gray-100 transition disabled:opacity-50"
                  >
                    <i className="fas fa-chevron-left text-xs"></i>
                  </button>

                  <span className="px-4 h-10 flex items-center rounded-xl bg-indigo-600 text-white">
                    {page}
                  </span>

                  <button
                    disabled={
                      pagination.pages === 0 || page >= pagination.pages
                    }
                    onClick={() => setPage(page + 1)}
                    className="w-10 h-10 rounded-xl border border-gray-200 hover:bg-gray-100 transition disabled:opacity-50"
                  >
                    <i className="fas fa-chevron-right text-xs"></i>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
        {/* =========================== ATTENDANCE SECTION END ============================ */}
        {/* ============================= LEAVE MANAGEMENT SECTION START ============================= */}
        {activeSection === "leave" && (
          <section className="section active p-4 sm:p-6 space-y-6 dark:bg-slate-900 dark:text-gray-100">
            {/* HEADER */}
            <div
              className="bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600
      rounded-2xl p-5 sm:p-6 text-white shadow-lg"
            >
              <h2 className="text-2xl font-bold">Leave Management</h2>

              <p className="text-sm opacity-90">
                Manage Teacher & Student Leave Requests
              </p>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-yellow-50 dark:bg-yellow-500/10 p-5 rounded-xl text-center">
                <p className="text-sm text-yellow-600">Pending</p>

                <h3 className="text-2xl font-bold">
                  {leaveCounts?.pending ?? 0}
                </h3>
              </div>

              <div className="bg-green-50 dark:bg-green-500/10 p-5 rounded-xl text-center">
                <p className="text-sm text-green-600">Approved</p>

                <h3 className="text-2xl font-bold">{leaveCounts.approved}</h3>
              </div>

              <div className="bg-blue-50 dark:bg-blue-500/10 p-5 rounded-xl text-center">
                <p className="text-sm text-blue-600">Total</p>

                <h3 className="text-2xl font-bold">{leaveCounts.total}</h3>
              </div>
            </div>

            {/* TABS */}
            <div className="flex gap-4 border-b dark:border-slate-700">
              <button
                onClick={() => setActiveLeaveTab("teacher")}
                className={`pb-2 text-sm font-medium transition ${
                  activeLeaveTab === "teacher"
                    ? "border-b-2 border-indigo-600 text-indigo-600"
                    : "text-gray-500"
                }`}
              >
                Teachers
              </button>

              <button
                onClick={() => setActiveLeaveTab("student")}
                className={`pb-2 text-sm font-medium transition ${
                  activeLeaveTab === "student"
                    ? "border-b-2 border-indigo-600 text-indigo-600"
                    : "text-gray-500"
                }`}
              >
                Students
              </button>
            </div>

            {/* FILTERS */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow flex flex-col md:flex-row gap-3 justify-between">
              <select
                value={leaveFilter}
                onChange={(e) => setLeaveFilter(e.target.value)}
                className="px-4 py-2 border dark:border-slate-700 rounded-lg dark:bg-slate-900"
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>

              <input
                type="text"
                value={leaveSearch}
                onChange={(e) => setLeaveSearch(e.target.value)}
                placeholder="Search leave requests..."
                className="flex-1 px-4 py-2 border dark:border-slate-700 rounded-lg dark:bg-slate-900"
              />
            </div>

            {/* LOADING */}
            {leaveLoading ? (
              <div className="bg-white dark:bg-slate-800 p-10 rounded-xl text-center">
                Loading leave requests...
              </div>
            ) : (
              <>
                {/* TEACHER LEAVES */}
                {activeLeaveTab === "teacher" && (
                  <div className="space-y-4">
                    {filteredLeaves.length === 0 ? (
                      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl text-center">
                        No teacher leave requests found
                      </div>
                    ) : (
                      filteredLeaves.map((leave) => (
                        <div
                          key={leave.id}
                          className="bg-white dark:bg-slate-800 rounded-xl shadow p-5"
                        >
                          <div className="flex flex-col lg:flex-row lg:justify-between gap-4">
                            <div>
                              <h4 className="font-semibold text-lg">
                                {leave.teacher_name ||
                                  `Teacher #${leave.teacher_id}`}
                              </h4>

                              <p className="text-sm text-gray-500">
                                Leave Type : {leave.leave_type}
                              </p>

                              <p className="text-sm text-gray-500">
                                Days : {leave.total_days}
                              </p>

                              <p className="text-sm text-gray-500">
                                {leave.from_date} → {leave.to_date}
                              </p>

                              {leave.reason && (
                                <p className="mt-2 text-sm">{leave.reason}</p>
                              )}
                            </div>

                            <div className="flex flex-col items-start lg:items-end gap-3">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  leave.status === "Approved"
                                    ? "bg-green-100 text-green-700"
                                    : leave.status === "Rejected"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {leave.status}
                              </span>

                              {leave.status === "Pending" && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() =>
                                      approveTeacherLeave(leave.id)
                                    }
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                                  >
                                    Approve
                                  </button>

                                  <button
                                    onClick={() => rejectTeacherLeave(leave.id)}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* STUDENT LEAVES */}
                {activeLeaveTab === "student" && (
                  <div className="space-y-4">
                    {filteredLeaves.length === 0 ? (
                      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl text-center">
                        No student leave requests found
                      </div>
                    ) : (
                      filteredLeaves.map((leave) => (
                        <div
                          key={leave.id}
                          className="bg-white dark:bg-slate-800 rounded-xl shadow p-5"
                        >
                          <div className="flex flex-col lg:flex-row lg:justify-between gap-4">
                            <div>
                              <h4 className="font-semibold text-lg">
                                {leave.student_name}
                              </h4>

                              <p className="text-sm text-gray-500">
                                {leave.batch} / {leave.division} /{" "}
                                {leave.section}
                              </p>

                              <p className="text-sm text-gray-500">
                                Leave Type : {leave.type}
                              </p>

                              <p className="text-sm text-gray-500">
                                Days : {leave.days}
                              </p>

                              <p className="text-sm text-gray-500">
                                {leave.from} → {leave.to}
                              </p>

                              {leave.reason && (
                                <p className="mt-2 text-sm">{leave.reason}</p>
                              )}
                            </div>

                            <div className="flex flex-col items-start lg:items-end gap-3">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  leave.status === "Approved"
                                    ? "bg-green-100 text-green-700"
                                    : leave.status === "Rejected"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {leave.status}
                              </span>

                              {leave.status === "Pending" && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() =>
                                      approveStudentLeave(leave.id)
                                    }
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                                  >
                                    Approve
                                  </button>

                                  <button
                                    onClick={() => rejectStudentLeave(leave.id)}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        )}
        {/* ============================= LEAVE MANAGEMENT SECTION END ============================= */}
        {/* ============================= Asset Inventory START ============================= */}
        {activeSection === "assets" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* TOP SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* MAIN CARD */}
              <div className="lg:col-span-2 bg-gradient-to-r from-indigo-600 to-blue-500 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-black tracking-tight">
                      Asset Inventory
                    </h2>

                    <p className="text-sm text-indigo-100 mt-2">
                      Manage all institutional assets
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <div className="bg-white/10 backdrop-blur px-4 py-2 rounded-xl">
                        <p className="text-[10px] uppercase font-bold text-indigo-100">
                          Total
                        </p>

                        <p className="text-xl font-black">{assetCounts.all}</p>
                      </div>

                      <div className="bg-white/10 backdrop-blur px-4 py-2 rounded-xl">
                        <p className="text-[10px] uppercase font-bold text-indigo-100">
                          Active
                        </p>

                        <p className="text-xl font-black">
                          {assetCounts.operational}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsEditMode(false);
                      resetAssetForm();
                      openAddAssetModal();
                    }}
                    className="bg-white text-indigo-700 hover:bg-indigo-50 px-5 py-3 rounded-2xl text-sm font-bold shadow-lg transition"
                  >
                    + Register Asset
                  </button>
                </div>

                <div className="absolute -bottom-14 -right-10 w-52 h-52 rounded-full bg-white/10"></div>
              </div>

              {/* OPERATIONAL */}
              <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-black text-slate-400">
                      Operational
                    </p>

                    <h3 className="text-3xl font-black text-emerald-600 mt-2">
                      {assetCounts.operational}
                    </h3>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-xl">
                    ✅
                  </div>
                </div>

                <div className="mt-5 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full w-[90%] bg-emerald-500 rounded-full"></div>
                </div>
              </div>

              {/* REPAIR */}
              <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-black text-slate-400">
                      Under Repair
                    </p>

                    <h3 className="text-3xl font-black text-amber-500 mt-2">
                      {assetCounts.repair}
                    </h3>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-xl">
                    🛠️
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-5">
                  Assets currently in maintenance
                </p>
              </div>
            </div>

            {/* SEARCH + FILTERS */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-5">
              {/* SEARCH */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by asset name, code, category, location..."
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />

                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  🔍
                </div>
              </div>

              {/* CATEGORY TABS */}
              <div className="flex flex-wrap gap-3">
                {[
                  "All",
                  "Electronics",
                  "Furniture",
                  "Lab Equipment",
                  "Vehicles",
                ].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveAssetTab(tab)}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition ${
                      activeAssetTab === tab
                        ? "bg-indigo-600 text-white shadow-lg"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* ASSET TABLE */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="px-6 py-4 font-black">Asset</th>

                      <th className="px-6 py-4 font-black">Category</th>

                      <th className="px-6 py-4 font-black">Details</th>

                      <th className="px-6 py-4 font-black">Location</th>

                      <th className="px-6 py-4 font-black">Purchase</th>

                      <th className="px-6 py-4 font-black">Value</th>

                      <th className="px-6 py-4 font-black">Status</th>

                      <th className="px-6 py-4 font-black text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {assetLoading ? (
                      <tr>
                        <td
                          colSpan="8"
                          className="py-16 text-center text-slate-400"
                        >
                          Loading assets...
                        </td>
                      </tr>
                    ) : filteredAssets.length > 0 ? (
                      filteredAssets.map((asset) => (
                        <tr
                          key={asset.id}
                          className="hover:bg-slate-50 transition"
                        >
                          {/* ASSET */}
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black">
                                {asset.asset_code?.slice(0, 2)}
                              </div>

                              <div>
                                <h3 className="font-bold text-slate-800">
                                  {asset.asset_name}
                                </h3>

                                <p className="text-xs text-slate-500 mt-1">
                                  {asset.asset_code}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* CATEGORY */}
                          <td className="px-6 py-5">
                            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                              {asset.category}
                            </span>
                          </td>

                          {/* DETAILS */}
                          <td className="px-6 py-5">
                            {asset.category === "Vehicles" && (
                              <div className="space-y-1 text-xs">
                                <p>
                                  <span className="font-bold">Vehicle:</span>{" "}
                                  {asset.vehicle_number || "-"}
                                </p>

                                <p>
                                  <span className="font-bold">
                                    Registration:
                                  </span>{" "}
                                  {asset.registration_number || "-"}
                                </p>

                                <p>
                                  <span className="font-bold">Fuel:</span>{" "}
                                  {asset.fuel_type || "-"}
                                </p>
                              </div>
                            )}

                            {asset.category === "Electronics" && (
                              <div className="space-y-1 text-xs">
                                <p>
                                  <span className="font-bold">Brand:</span>{" "}
                                  {asset.brand || "-"}
                                </p>

                                <p>
                                  <span className="font-bold">RAM:</span>{" "}
                                  {asset.ram || "-"}
                                </p>

                                <p>
                                  <span className="font-bold">Storage:</span>{" "}
                                  {asset.storage || "-"}
                                </p>
                              </div>
                            )}

                            {asset.category === "Furniture" && (
                              <div className="space-y-1 text-xs">
                                <p>
                                  <span className="font-bold">Material:</span>{" "}
                                  {asset.material || "-"}
                                </p>

                                <p>
                                  <span className="font-bold">Color:</span>{" "}
                                  {asset.color || "-"}
                                </p>
                              </div>
                            )}

                            {asset.category === "Lab Equipment" && (
                              <div className="space-y-1 text-xs">
                                <p>
                                  <span className="font-bold">Accuracy:</span>{" "}
                                  {asset.equipment_accuracy || "-"}
                                </p>

                                <p>
                                  <span className="font-bold">
                                    Calibration:
                                  </span>{" "}
                                  {asset.calibration_date || "-"}
                                </p>
                              </div>
                            )}
                          </td>

                          {/* LOCATION */}
                          <td className="px-6 py-5 text-slate-600">
                            {asset.location || "-"}
                          </td>

                          {/* PURCHASE */}
                          <td className="px-6 py-5">
                            <div>
                              <p className="font-semibold text-slate-700">
                                {asset.purchase_date || "-"}
                              </p>

                              <p className="text-xs text-slate-400 mt-1">
                                {asset.vendor_name || "No Vendor"}
                              </p>
                            </div>
                          </td>

                          {/* VALUE */}
                          <td className="px-6 py-5 font-black text-slate-800">
                            ₹{" "}
                            {Number(asset.purchase_cost || 0).toLocaleString()}
                          </td>

                          {/* STATUS */}
                          <td className="px-6 py-5">
                            <span
                              className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                                asset.status === "Operational"
                                  ? "bg-emerald-100 text-emerald-600"
                                  : asset.status === "Under Repair"
                                    ? "bg-amber-100 text-amber-600"
                                    : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {asset.status}
                            </span>
                          </td>

                          {/* ACTIONS */}
                          <td className="px-6 py-5">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => editAsset(asset)}
                                className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-bold transition"
                              >
                                Edit
                              </button>

                              <button
                                onClick={() => deleteAsset(asset.id)}
                                className="px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold transition"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="text-5xl">📦</div>

                            <h3 className="mt-4 font-bold text-slate-700">
                              No assets found
                            </h3>

                            <p className="text-sm text-slate-400 mt-1">
                              Try changing filters or add new asset
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DELETED ASSET HISTORY */}
            {deletedAssets?.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-800">
                      Deleted Asset History
                    </h3>

                    <p className="text-sm text-slate-400 mt-1">
                      Restore deleted assets
                    </p>
                  </div>

                  <div className="bg-red-100 text-red-600 px-4 py-2 rounded-2xl text-xs font-black">
                    {deletedAssets.length} Deleted
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-[11px] uppercase text-slate-500">
                        <th className="px-6 py-4 font-black">Asset</th>

                        <th className="px-6 py-4 font-black">Category</th>

                        <th className="px-6 py-4 font-black">Deleted At</th>

                        <th className="px-6 py-4 font-black text-right">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {deletedAssets.map((asset, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-bold text-slate-700">
                                {asset.asset_name}
                              </p>

                              <p className="text-xs text-slate-400">
                                {asset.asset_code}
                              </p>
                            </div>
                          </td>

                          <td className="px-6 py-4">{asset.category}</td>

                          <td className="px-6 py-4">{asset.deleted_at}</td>

                          <td className="px-6 py-4">
                            <div className="flex justify-end">
                              <button
                                onClick={() => restoreDeletedAsset(asset)}
                                className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-600 hover:bg-emerald-200 text-xs font-bold"
                              >
                                Restore
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}
        {/* ============================= Asset Inventory END ============================= */}
        {/*  Add Asset Modal START  */}
        {isAddAssetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 overflow-y-auto py-10">
            <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden animate-[fadeIn_.3s_ease]">
              {/* HEADER */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-blue-500 text-white">
                <div>
                  <h2 className="text-xl font-bold">
                    {isEditMode ? "Update Asset" : "Register New Asset"}
                  </h2>

                  <p className="text-xs text-indigo-100">
                    Add and manage organizational assets
                  </p>
                </div>

                <button
                  onClick={closeAddAssetModal}
                  className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center text-xl transition"
                >
                  ✕
                </button>
              </div>

              {/* FORM */}
              <form onSubmit={addAsset} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* ASSET ID */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Asset ID
                    </label>

                    <input
                      type="text"
                      name="asset_id"
                      value={newAsset.asset_id}
                      onChange={handleInputChange}
                      placeholder="AST-2026-0001"
                      className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                      required
                    />
                  </div>

                  {/* ASSET CODE */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Asset Code
                    </label>

                    <input
                      type="text"
                      name="asset_code"
                      value={newAsset.asset_code}
                      onChange={handleInputChange}
                      placeholder="LAP-001"
                      className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                      required
                    />
                  </div>

                  {/* NAME */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Asset Name
                    </label>

                    <input
                      type="text"
                      name="asset_name"
                      value={newAsset.asset_name}
                      onChange={handleInputChange}
                      placeholder="Dell Latitude"
                      className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                      required
                    />
                  </div>

                  {/* CATEGORY */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Category
                    </label>

                    <select
                      name="category"
                      value={newAsset.category}
                      onChange={handleInputChange}
                      className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                    >
                      <option value="Electronics">Electronics</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Lab Equipment">Lab Equipment</option>
                      <option value="Vehicles">Vehicles</option>
                    </select>
                  </div>

                  {/* BRAND */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Brand
                    </label>

                    <input
                      type="text"
                      name="brand"
                      value={newAsset.brand}
                      onChange={handleInputChange}
                      placeholder="Dell"
                      className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                    />
                  </div>

                  {/* MODEL */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Model Number
                    </label>

                    <input
                      type="text"
                      name="model_number"
                      value={newAsset.model_number}
                      onChange={handleInputChange}
                      placeholder="7420"
                      className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                    />
                  </div>

                  {/* LOCATION */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Location
                    </label>

                    <input
                      type="text"
                      name="location"
                      value={newAsset.location}
                      onChange={handleInputChange}
                      placeholder="Computer Lab"
                      className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                    />
                  </div>

                  {/* PURCHASE DATE */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Purchase Date
                    </label>

                    <input
                      type="date"
                      name="purchase_date"
                      value={newAsset.purchase_date}
                      onChange={handleInputChange}
                      className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                    />
                  </div>

                  {/* PURCHASE COST */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Purchase Cost
                    </label>

                    <input
                      type="number"
                      name="purchase_cost"
                      value={newAsset.purchase_cost}
                      onChange={handleInputChange}
                      placeholder="85000"
                      className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                    />
                  </div>

                  {/* VEHICLE FIELDS */}
                  {newAsset.category === "Vehicles" && (
                    <>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          Vehicle Number
                        </label>

                        <input
                          type="text"
                          name="vehicle_number"
                          value={newAsset.vehicle_number}
                          onChange={handleInputChange}
                          placeholder="MH-46-AB-2026"
                          className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          Registration Number
                        </label>

                        <input
                          type="text"
                          name="registration_number"
                          value={newAsset.registration_number}
                          onChange={handleInputChange}
                          placeholder="REG-22334"
                          className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          Fuel Type
                        </label>

                        <select
                          name="fuel_type"
                          value={newAsset.fuel_type}
                          onChange={handleInputChange}
                          className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                        >
                          <option value="">Select</option>
                          <option value="Petrol">Petrol</option>
                          <option value="Diesel">Diesel</option>
                          <option value="Electric">Electric</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* ELECTRONICS */}
                  {newAsset.category === "Electronics" && (
                    <>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          Processor
                        </label>

                        <input
                          type="text"
                          name="processor"
                          value={newAsset.processor}
                          onChange={handleInputChange}
                          placeholder="Intel i7"
                          className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          RAM
                        </label>

                        <input
                          type="text"
                          name="ram"
                          value={newAsset.ram}
                          onChange={handleInputChange}
                          placeholder="16GB"
                          className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          Storage
                        </label>

                        <input
                          type="text"
                          name="storage"
                          value={newAsset.storage}
                          onChange={handleInputChange}
                          placeholder="512GB SSD"
                          className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                        />
                      </div>
                    </>
                  )}

                  {/* FURNITURE */}
                  {newAsset.category === "Furniture" && (
                    <>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          Material
                        </label>

                        <input
                          type="text"
                          name="material"
                          value={newAsset.material}
                          onChange={handleInputChange}
                          placeholder="Wood"
                          className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          Color
                        </label>

                        <input
                          type="text"
                          name="color"
                          value={newAsset.color}
                          onChange={handleInputChange}
                          placeholder="Brown"
                          className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                        />
                      </div>
                    </>
                  )}

                  {/* LAB EQUIPMENT */}
                  {newAsset.category === "Lab Equipment" && (
                    <>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          Calibration Date
                        </label>

                        <input
                          type="date"
                          name="calibration_date"
                          value={newAsset.calibration_date}
                          onChange={handleInputChange}
                          className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          Equipment Accuracy
                        </label>

                        <input
                          type="text"
                          name="equipment_accuracy"
                          value={newAsset.equipment_accuracy}
                          onChange={handleInputChange}
                          placeholder="±0.01%"
                          className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* STATUS */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Status
                  </label>

                  <div className="flex flex-wrap gap-3 mt-3">
                    {["Operational", "Under Repair", "Inactive"].map(
                      (status) => (
                        <label
                          key={status}
                          className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-3 cursor-pointer hover:border-indigo-500"
                        >
                          <input
                            type="radio"
                            name="status"
                            value={status}
                            checked={newAsset.status === status}
                            onChange={handleInputChange}
                          />

                          <span className="text-sm">{status}</span>
                        </label>
                      ),
                    )}
                  </div>
                </div>

                {/* FOOTER */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={closeAddAssetModal}
                    className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg transition"
                  >
                    {isEditMode ? "Update Asset" : "Save Asset"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* ============================= Add Asset Modal END ============================= */}
        {/* ===================== PROFILE SECTION START ========================*/}
        {activeSection === "profile" && (
          <section className="section hidden p-4 sm:p-6 space-y-6 dark:bg-slate-900 dark:text-gray-100 active">
            {/* ================= PROFILE HEADER ================= */}
            <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-xl overflow-hidden">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-xl"></div>

              <div className="relative flex flex-col sm:flex-row items-center gap-6">
                <img
                  src="https://i.pravatar.cc/120?img=12"
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-lg"
                />

                <div className="text-center sm:text-left flex-1">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {editMode ? (
                      <div className="space-y-2">
                        <input
                          name="first_name"
                          value={formData.first_name || ""}
                          onChange={handleChange}
                          placeholder="First Name"
                          className="w-full p-2 rounded-xl text-sm border bg-white/90 text-gray-900"
                        />
                        <input
                          name="middle_name"
                          value={formData.middle_name || ""}
                          onChange={handleChange}
                          placeholder="Middle Name"
                          className="w-full p-2 rounded-xl text-sm border bg-white/90 text-gray-900"
                        />
                        <input
                          name="last_name"
                          value={formData.last_name || ""}
                          onChange={handleChange}
                          placeholder="Last Name"
                          className="w-full p-2 rounded-xl text-sm border bg-white/90 text-gray-900"
                        />
                      </div>
                    ) : (
                      `${admin?.first_name} ${admin?.middle_name} ${admin?.last_name}`
                    )}
                  </h2>

                  <p className="text-sm opacity-90 mt-1">
                    {admin?.designation} • {admin?.specialization || "NA"}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                    <span className="px-3 py-1 text-xs bg-white/20 rounded-full">
                      {admin?.admin_id}
                    </span>

                    <span className="px-3 py-1 text-xs bg-white/20 rounded-full">
                      {admin?.access_level || "NA"}
                    </span>

                    <span className="px-3 py-1 text-xs bg-green-400 text-green-900 rounded-full font-medium">
                      {admin?.status || "NA"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ================= GRID ================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {/* PERSONAL INFO */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md">
                <h4 className="font-semibold mb-3">👤 Personal Info</h4>

                <div className="space-y-2 text-sm">
                  <p>
                    DOB:{" "}
                    {editMode ? (
                      <input
                        type="date"
                        name="date_of_birth"
                        value={formData.date_of_birth || ""}
                        onChange={handleChange}
                        className="input"
                      />
                    ) : (
                      <span className="font-medium">
                        {admin?.date_of_birth}
                      </span>
                    )}
                  </p>

                  <p>
                    Gender:{" "}
                    {editMode ? (
                      <input
                        name="gender"
                        value={formData.gender || ""}
                        onChange={handleChange}
                        className="input"
                      />
                    ) : (
                      <span className="font-medium">{admin?.gender}</span>
                    )}
                  </p>

                  <p>
                    Phone:{" "}
                    {editMode ? (
                      <input
                        name="mobile"
                        value={formData.mobile || ""}
                        onChange={handleChange}
                        className="input"
                      />
                    ) : (
                      <span className="font-medium">{admin?.mobile}</span>
                    )}
                  </p>

                  <p>
                    Email:{" "}
                    {editMode ? (
                      <input
                        name="email"
                        value={formData.email || ""}
                        onChange={handleChange}
                        className="input"
                      />
                    ) : (
                      <span className="font-medium">{admin?.email}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* ROLE & ACCESS */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md">
                <h4 className="font-semibold mb-3">🛡️ Role & Access</h4>

                <div className="space-y-2 text-sm">
                  <p>
                    Role:{" "}
                    <span className="font-medium">
                      {admin?.designation || "NA"}
                    </span>
                  </p>

                  <p>
                    Permissions:{" "}
                    <span className="font-medium">
                      {" "}
                      {admin?.permissions || "NA"}
                    </span>
                  </p>

                  <p>
                    Access Level:{" "}
                    <span className="text-green-600 font-medium">
                      {admin?.access_level || "NA"}
                    </span>
                  </p>
                </div>
              </div>

              {/* SCHOOL INFO */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md">
                <h4 className="font-semibold mb-3">🏫 School Info</h4>

                <div className="space-y-2 text-sm">
                  <p>
                    School Name:{" "}
                    <span className="font-medium">
                      {admin?.school_name || "NA"}
                    </span>
                  </p>

                  <p>
                    Code:{" "}
                    <span className="font-medium">
                      {admin?.school_code || "NA"}
                    </span>
                  </p>

                  <p>
                    Board:{" "}
                    <span className="font-medium">{admin?.board || "NA"}</span>
                  </p>

                  <p>
                    Established:{" "}
                    <span className="font-medium">
                      {admin?.established_year || "NA"}
                    </span>
                  </p>
                </div>
              </div>

              {/* SYSTEM CONTROL */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md">
                <h4 className="font-semibold mb-3">⚙️ System Control</h4>

                <div className="space-y-2 text-sm">
                  <p>
                    Users Managed:{" "}
                    <span className="font-medium">
                      {admin?.users_managed || "NA"}
                    </span>
                  </p>

                  <p>
                    Active Sessions:{" "}
                    <span className="font-medium">
                      {admin?.active_sessions || "NA"}
                    </span>
                  </p>

                  <p>
                    Modules Enabled: <span className="font-medium">All</span>
                  </p>
                </div>
              </div>

              {/* FINANCE */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md">
                <h4 className="font-semibold mb-3">💰 Finance Control</h4>

                <div className="space-y-2 text-sm">
                  <p>
                    Fee Access:{" "}
                    <span className="text-green-600 font-medium">
                      {admin?.fee_access || "NA"}
                    </span>
                  </p>

                  <p>
                    Discount Authority:{" "}
                    <span className="font-medium">
                      {admin?.discount_authority || "NA"}
                    </span>
                  </p>

                  <p>
                    Revenue View:{" "}
                    <span className="font-medium">
                      {admin?.revenue_view || "NA"}
                    </span>
                  </p>
                </div>
              </div>

              {/* SECURITY */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md">
                <h4 className="font-semibold mb-3">🔐 Security</h4>

                <div className="space-y-2 text-sm">
                  <p>
                    Last Login:{" "}
                    <span className="font-medium">
                      {admin?.last_login || "Today"}
                    </span>
                  </p>

                  <p>
                    2FA:{" "}
                    <span className="text-green-600 font-medium">
                      {admin?.two_factor_enabled || "NA"}
                    </span>
                  </p>

                  <p>
                    Login Alerts:{" "}
                    <span className="font-medium">
                      {admin?.login_alerts || "NA"}
                    </span>
                  </p>
                </div>
              </div>

              {/* ACTIVITY */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md">
                <h4 className="font-semibold mb-3">📊 Activity</h4>

                <div className="space-y-2 text-sm">
                  <p>
                    Logins (30d):{" "}
                    <span className="font-medium">
                      {admin?.logins_30d || "NA"}
                    </span>
                  </p>

                  <p>
                    Actions:{" "}
                    <span className="font-medium">
                      {admin?.actions_count || "NA"}
                    </span>
                  </p>

                  <p>
                    Last Action:{" "}
                    <span className="font-medium">
                      {admin?.last_action || "NA"}
                    </span>
                  </p>
                </div>
              </div>

              {/* ADDRESS */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md">
                <h4 className="font-semibold mb-3">📍 Address</h4>

                <div className="space-y-2 text-sm">
                  <p>
                    {editMode ? (
                      <>
                        <input
                          name="city"
                          value={formData.city || ""}
                          onChange={handleChange}
                          placeholder="City"
                          className="input mb-2"
                        />

                        <input
                          name="state"
                          value={formData.state || ""}
                          onChange={handleChange}
                          placeholder="State"
                          className="input"
                        />
                      </>
                    ) : (
                      `${admin?.city}, ${admin?.state}`
                    )}
                  </p>

                  <p>
                    Pincode:{" "}
                    {editMode ? (
                      <input
                        name="pincode"
                        value={formData.pincode || ""}
                        onChange={handleChange}
                        className="input"
                      />
                    ) : (
                      <span>{admin?.pincode}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* EMERGENCY */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md">
                <h4 className="font-semibold mb-3">🚨 Emergency Contact</h4>

                <div className="space-y-2 text-sm">
                  <p>
                    Name:{" "}
                    {editMode ? (
                      <input
                        name="emergency_name"
                        value={formData.emergency_name || ""}
                        onChange={handleChange}
                        className="input"
                      />
                    ) : (
                      <span className="font-medium">
                        {admin?.emergency_name}
                      </span>
                    )}
                  </p>

                  <p>
                    Relation:{" "}
                    {editMode ? (
                      <input
                        name="emergency_relation"
                        value={formData.emergency_relation || ""}
                        onChange={handleChange}
                        className="input"
                      />
                    ) : (
                      <span className="font-medium">
                        {admin?.emergency_relation}
                      </span>
                    )}
                  </p>

                  <p>
                    Phone:{" "}
                    {editMode ? (
                      <input
                        name="emergency_phone"
                        value={formData.emergency_phone || ""}
                        onChange={handleChange}
                        className="input"
                      />
                    ) : (
                      <span className="font-medium">
                        {admin?.emergency_phone}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* ACCOUNT */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md">
                <h4 className="font-semibold mb-3">🖥️ Account</h4>

                <div className="space-y-2 text-sm">
                  <p>
                    Username:{" "}
                    <span className="font-medium">{admin?.username}</span>
                  </p>

                  <p>
                    Status:{" "}
                    <span className="text-green-600 font-medium">
                      {admin?.status}
                    </span>
                  </p>

                  <p>
                    Created On:{" "}
                    <span className="font-medium">
                      {admin?.created_on || "NA"}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* ================= ACTION BAR ================= */}
            <div className="sticky bottom-4 flex justify-center sm:justify-end gap-3">
              {editMode ? (
                <>
                  <button
                    onClick={handleSave}
                    className="px-6 py-3 rounded-xl bg-green-600 text-white shadow-lg hover:opacity-90"
                  >
                    Save
                  </button>

                  <button
                    onClick={() => setEditMode(false)}
                    className="px-6 py-3 rounded-xl bg-gray-500 text-white shadow-lg hover:opacity-90"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium shadow-lg hover:opacity-90"
                >
                  Edit Profile
                </button>
              )}
            </div>
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

export default AdminDashboard;
