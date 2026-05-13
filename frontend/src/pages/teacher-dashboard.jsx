import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { APP_NAME, APP_YEAR } from "../config/appConfig";
import "../css/dashboard.css";
import { useTeacherDashboard } from "../controllers/teacherDashboard";
import { useTeacherAssignments } from "../controllers/Assingments/useTeacherAssignments";
import { useDashboardUI } from "../controllers/useDashboardUI";
import { useTeacherLeaves } from "../controllers/Leaves/useTeacherLeaves";
import { useTeacherTimetable } from "../controllers/TimeTable/useTeacherTimetable";
import { useTeacherProfile } from "../controllers/Profiles/useTeacherProfile";
import { useTeacherAttendance } from "../controllers/Attendance/useTeacherAttendance";
import { useMyClasses } from "../controllers/MyClasses/useMyClass";

function TeacherDashboard() {
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
  } = useTeacherDashboard(activeSection);

  // ================= Leaves HOOK =================
  const {
    // shared loading
    leaveLoading,

    // student leaves
    allStudentLeaves,
    filteredLeaves,
    leaveFilter,
    setLeaveFilter,
    leaveSearch,
    setLeaveSearch,
    updateLeaveStatus,
    handleUpdateLeave,

    // teacher leaves
    leaveBalance,
    leaveHistory,
    leaveForm,
    setLeaveForm,
    handleLeaveChange,
    calculateDays,
    handleApplyLeave,
    fetchLeaveData,
  } = useTeacherLeaves({ activeSection, fetchWithAuth, showToast });

  // ================= ASSIGNMENTS HOOK =================
  const {
    // assignment list
    teacherAssignments,
    assignmentLoading,
    assignmentProgress,
    fetchTeacherAssignments,

    // create/edit modal
    showModal,
    setShowModal,
    editingAssignment,
    setEditingAssignment,

    assignmentForm,
    setAssignmentForm,
    handleAssignmentChange,
    handleClassSelect,
    handleCreateAssignment,
    handleEditAssignment,
    handleDeleteAssignment,

    // assigned classes
    assignedClasses,

    // assignment details modal
    selectedAssignment,
    setSelectedAssignment,
    openAssignmentDetails,

    // submissions
    assignmentSubmissions,
    submissionLoading,
    fetchAssignmentSubmissions,

    submissionTab,
    setSubmissionTab,
    submittedStudents,
    pendingStudents,
    studentSearch,
    setStudentSearch,
    // grading
    gradingData,
    setGradingData,
    gradeSubmission,
    saveGrade,
    forceResubmit,
  } = useTeacherAssignments(activeSection, fetchWithAuth, showToast);

  // ================= TIMETABLE HOOK =================
  const {
    teacherTimetableLoading,
    teacherTimetable,
    selectedClass,
    setSelectedClass,
    selectedSubject,
    setSelectedSubject,
    classOptions,
    subjectOptions,
    // DOWNLOAD
    downloadLoading,
    downloadTeacherTimetablePDF,
  } = useTeacherTimetable({ activeSection, fetchWithAuth, showToast });

  // ================ My Classes ===================
  const {
    classesLoading,
    classes: myclasses,

    selectedClass: selectedMyClass,
    selectedStudent,

    isClassDetailOpen,
    openClassDetail,
    closeClassDetail,

    isStudentProfileOpen,
    openStudentProfile,
    closeStudentProfile,

    filteredStudents,
    studentSearch: myClassStudentSearch,
    setStudentSearch: setMyClassStudentSearch,

    activeStudents,
    inactiveStudents,
  } = useMyClasses(activeSection, fetchWithAuth, showToast);

  // ================= ATTENDANCE HOOK =================
  const {
    classes,
    students,
    attendance,
    selectedClass: attendanceClass,
    setSelectedClass: setAttendanceClass,
    selectedDate,
    setSelectedDate,
    attendanceCounts,
    markAttendance,
    markAll,
    saveAttendance,
    getTodayDate,
    updateRemark,
    selectedMonth,
    setSelectedMonth,
    downloadAttendanceReport,
  } = useTeacherAttendance(fetchWithAuth, showToast);

  // ================= PROFILE HOOK =================
  const {
    // profile
    teacher,
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
  } = useTeacherProfile({ fetchWithAuth });

  useEffect(() => {
    if (isStudentProfileOpen || isClassDetailOpen) {
      setSidebarOpen(false);
    } else if (window.innerWidth >= 768) {
      setSidebarOpen(true);
    }
  }, [isStudentProfileOpen, isClassDetailOpen]);

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
          {/* SECTION TITLE */}
          {sidebarOpen && (
            <p className="text-xs text-gray-400 px-3 mt-2">MAIN</p>
          )}

          {[
            ["dashboard", "bi-grid-fill", "Dashboard"],
            ["analytics", "bi-bar-chart", "Analytics"],
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
                className={`relative group flex w-full items-center
          ${sidebarOpen ? "gap-3 px-4 justify-start" : "justify-center"}
          py-3 rounded-xl transition-all duration-200
          ${
            isActive
              ? "bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-500/20 dark:to-indigo-500/20 text-purple-700 dark:text-purple-300 font-semibold shadow-sm"
              : "text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-800 dark:hover:text-white"
          }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-purple-600 rounded-r-full"></span>
                )}

                <i className={`bi ${icon}`}></i>

                {/* LABEL */}
                <span
                  className={`${sidebarOpen ? "md:block" : "md:hidden"} truncate`}
                >
                  {label}
                </span>
              </button>
            );
          })}

          {/* ================= OTHER SECTIONS ================= */}
          {[
            {
              title: "ACADEMIC",
              items: [
                ["classes", "bi-easel", "My Classes"],
                ["attendance", "bi-calendar-check", "Attendance"],
                ["assignments", "bi-journal-text", "Assignments"],
                ["exams", "bi-award", "Results & Marks"],
                ["timetable", "bi-clock", "Timetable"],
              ],
            },
            {
              title: "STUDENTS",
              items: [
                ["announcements", "bi-bell", "Notices"],
                ["studentLeave", "bi-envelope-paper", "Student Leave"],
              ],
            },
            {
              title: "MY SPACE",
              items: [
                ["teacherLeave", "bi-calendar-plus", "My Leave"],
                ["profile", "bi-person", "Profile"],
              ],
            },
            {
              title: "SYSTEM",
              items: [["settings", "bi-gear", "Settings"]],
            },
          ].map((section, i) => (
            <div key={i}>
              {sidebarOpen && (
                <p className="text-xs text-gray-400 px-3 mt-4">
                  {section.title}
                </p>
              )}

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
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 bg-purple-600 rounded-r-full"></span>
                    )}

                    <i className={`bi ${icon}`}></i>

                    <span
                      className={`${sidebarOpen ? "md:block" : "md:hidden"} truncate`}
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
                          navigate("/teacher/announcements "); // ✅ better route
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
                      {teacher?.first_name}
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
                          {teacher?.first_name} {teacher?.last_name}
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
            {/*  HEADER  */}
            <div
              className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 
        rounded-2xl p-5 sm:p-6 text-white shadow-lg"
            >
              <h2 className="text-xl sm:text-2xl font-semibold">
                Welcome Back 👋 {teacher?.first_name}
              </h2>
              <p className="text-xs sm:text-sm opacity-90">
                Here’s your complete teaching overview
              </p>
            </div>
          </section>
        )}
        {/* ===================== DASHBOARD SECTION END =========================== */}
        {/*  ============================= MY CLASSES START =============================  */}
        {activeSection === "classes" && (
          <section className="section p-4 sm:p-6 space-y-6 hidden active">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 sm:p-6 text-white">
              <h2 className="text-lg sm:text-xl font-semibold">My Classes</h2>

              <p className="text-xs sm:text-sm opacity-90">
                Manage your assigned classes and students
              </p>
            </div>

            {/* LOADING */}
            {classesLoading && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-center shadow-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Loading classes...
                </p>
              </div>
            )}

            {/* EMPTY */}
            {!classesLoading && myclasses?.length === 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-center shadow-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No assigned classes found
                </p>
              </div>
            )}

            {/* CLASS CARDS */}
            {!classesLoading && myclasses?.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {myclasses.map((item) => {
                  const activeStudents =
                    item.students?.filter((s) => s.status === "Active")
                      .length || 0;

                  return (
                    <div
                      key={item.teacher_class_id}
                      onClick={() => openClassDetail(item)}
                      className="cursor-pointer bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all duration-200 hover:-translate-y-1"
                    >
                      {/* TOP */}
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {item.class_name}
                          </h3>

                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {item.subject_name}
                          </p>
                        </div>

                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 px-2 py-1 rounded-full whitespace-nowrap">
                          Active
                        </span>
                      </div>

                      {/* STATS */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded-xl text-center">
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Students
                          </p>

                          <h4 className="font-semibold text-lg">
                            {item.total_students || 0}
                          </h4>
                        </div>

                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-xl text-center">
                          <p className="text-xs text-indigo-600">Active</p>

                          <h4 className="font-semibold text-indigo-600 text-lg">
                            {activeStudents}
                          </h4>
                        </div>
                      </div>

                      {/* PROGRESS */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>Class Strength</span>

                          <span>{item.total_students || 0}</span>
                        </div>

                        <div className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{
                              width: `${
                                item.total_students > 0
                                  ? (activeStudents / item.total_students) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
        {/* ================= CLASS DETAIL MODAL ================= */}
        <div
          className={`${
            isClassDetailOpen ? "flex" : "hidden"
          } fixed inset-0 bg-black/50 backdrop-blur-sm items-end sm:items-center justify-center z-50 p-2 sm:p-4`}
        >
          <div className="w-full max-w-6xl mx-auto bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 space-y-5 max-h-[95vh] overflow-hidden">
            {/* HEADER */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold">
                  {selectedMyClass?.class_name}
                </h2>

                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {selectedMyClass?.subject_name} • Student Directory
                </p>
              </div>

              <button
                onClick={closeClassDetail}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* SEARCH + STATS */}
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <input
                type="text"
                placeholder="Search student..."
                value={myClassStudentSearch}
                onChange={(e) => setMyClassStudentSearch(e.target.value)}
                className="w-full lg:w-72 px-4 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
              />

              <div className="flex gap-2 text-xs flex-wrap">
                <span className="bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                  Total: {selectedMyClass?.total_students || 0}
                </span>

                <span className="bg-green-100 dark:bg-green-900/30 text-green-600 px-3 py-1 rounded-full">
                  Active:{" "}
                  {selectedMyClass?.students?.filter(
                    (s) => s.status === "Active",
                  ).length || 0}
                </span>

                <span className="bg-red-100 dark:bg-red-900/30 text-red-600 px-3 py-1 rounded-full">
                  Inactive:{" "}
                  {selectedMyClass?.students?.filter(
                    (s) => s.status === "Inactive",
                  ).length || 0}
                </span>
              </div>
            </div>

            {/* TABLE HEADER */}
            <div className="hidden md:grid grid-cols-12 text-xs text-gray-500 dark:text-gray-400 px-4 py-3 bg-gray-50 dark:bg-slate-700 rounded-xl">
              <div className="col-span-3">Student</div>
              <div className="col-span-2">Roll No</div>
              <div className="col-span-2">Mobile</div>
              <div className="col-span-2">Parent</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1 text-right">Action</div>
            </div>

            {/* STUDENTS */}
            <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1">
              {selectedMyClass?.students?.length > 0 ? (
                selectedMyClass.students.map((student) => (
                  <div
                    key={student.student_id || student.id}
                    className="grid grid-cols-1 md:grid-cols-12 items-center gap-3 px-4 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl hover:shadow-sm transition"
                  >
                    {/* STUDENT */}
                    <div className="md:col-span-3 flex items-center gap-3">
                      <img
                        src={`https://i.pravatar.cc/150?u=${student.student_id}`}
                        alt={student.full_name}
                        className="w-11 h-11 rounded-full object-cover"
                      />

                      <div>
                        <p className="text-sm font-medium">
                          {student.full_name}
                        </p>

                        <p className="text-xs text-gray-400">
                          {student.gender || "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* ROLL */}
                    <div className="md:col-span-2 text-sm">
                      {student.roll_number || "-"}
                    </div>

                    {/* MOBILE */}
                    <div className="md:col-span-2 text-sm">
                      {student.mobile || "-"}
                    </div>

                    {/* PARENT */}
                    <div className="md:col-span-2 text-sm">
                      {student.parent_name || "-"}
                    </div>

                    {/* STATUS */}
                    <div className="md:col-span-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          student.status === "Active"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-600"
                            : "bg-red-100 dark:bg-red-900/30 text-red-600"
                        }`}
                      >
                        {student.status}
                      </span>
                    </div>

                    {/* ACTION */}
                    <div className="md:col-span-1 md:text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openStudentProfile(student);
                        }}
                        className="text-indigo-600 text-xs font-medium hover:underline"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-gray-50 dark:bg-slate-700 rounded-2xl p-6 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No students found
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* ================= STUDENT PROFILE MODAL ================= */}
        <div
          className={`${
            isStudentProfileOpen ? "flex" : "hidden"
          } fixed inset-0 bg-black/50 backdrop-blur-sm items-end sm:items-center justify-center z-[60] p-2 sm:p-4`}
        >
          <div className="bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 w-full max-w-5xl rounded-3xl shadow-2xl p-6 space-y-6 overflow-y-auto max-h-[90vh]">
            {/* HEADER */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Student Profile</h2>

              <button
                onClick={closeStudentProfile}
                className="text-gray-400 text-2xl hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* PROFILE */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <img
                src={`https://i.pravatar.cc/150?u=${selectedStudent?.student_id}`}
                alt={selectedStudent?.full_name}
                className="w-24 h-24 rounded-2xl object-cover border dark:border-slate-600 shadow-sm"
              />

              <div className="text-center sm:text-left">
                <h3 className="text-xl font-semibold">
                  {selectedStudent?.full_name}
                </h3>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Student ID: {selectedStudent?.student_id || "N/A"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 px-2 py-1 rounded-full">
                    {selectedStudent?.status || "Unknown"}
                  </span>

                  <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 px-2 py-1 rounded-full">
                    {selectedStudent?.gender || "N/A"}
                  </span>

                  <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 px-2 py-1 rounded-full">
                    {selectedStudent?.blood_group || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* INFO */}
            <div className="grid sm:grid-cols-2 gap-6 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 dark:text-gray-300">
                  Contact Info
                </h4>

                <div>Email: {selectedStudent?.email || "-"}</div>

                <div>Mobile: {selectedStudent?.mobile || "-"}</div>

                <div>Address: {selectedStudent?.address || "-"}</div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 dark:text-gray-300">
                  Academic
                </h4>

                <div>DOB: {selectedStudent?.date_of_birth || "-"}</div>

                <div>Roll No: {selectedStudent?.roll_number || "-"}</div>

                <div>
                  Previous School: {selectedStudent?.previous_school || "-"}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 dark:text-gray-300">
                  Family
                </h4>

                <div>Father: {selectedStudent?.father_name || "-"}</div>

                <div>Mother: {selectedStudent?.mother_name || "-"}</div>

                <div>Parent: {selectedStudent?.parent_name || "-"}</div>

                <div>
                  Parent Mobile: {selectedStudent?.parent_mobile || "-"}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 dark:text-gray-300">
                  Emergency
                </h4>

                <div>
                  Contact: {selectedStudent?.emergency_contact_name || "-"}
                </div>

                <div>
                  Number: {selectedStudent?.emergency_contact_number || "-"}
                </div>

                <div>
                  Relation: {selectedStudent?.emergency_contact_relation || "-"}
                </div>
              </div>
            </div>

            {/* MEDICAL */}
            <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-xl text-sm">
              <h4 className="font-medium text-red-600 mb-2">Medical Info</h4>

              <p>
                Medical Conditions:{" "}
                {selectedStudent?.medical_conditions || "None"}
              </p>

              <p>Allergies: {selectedStudent?.allergies || "None"}</p>
            </div>
          </div>
        </div>
        {/*  ============================= MY CLASS SECTION END =============================  */}
        {/*  ============================= ATTENDANCE SECTION START =============================  */}
        {activeSection === "attendance" && (
          <section className="p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-3xl p-5 sm:p-6 shadow-lg">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
                {/* LEFT */}
                <div>
                  <h2 className="text-white text-xl sm:text-2xl font-bold">
                    Student Attendance
                  </h2>

                  <p className="text-white/80 text-sm mt-1">
                    Manage subject-wise attendance records and monthly reports
                  </p>
                </div>

                {/* RIGHT */}
                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                  {/* MONTH */}
                  <div className="flex flex-col">
                    <label className="text-white text-xs mb-1">
                      Report Month
                    </label>

                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="px-4 py-2 rounded-xl text-sm border border-white/20 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-white"
                    />
                  </div>

                  {/* DOWNLOAD */}
                  <div className="flex items-end">
                    <button
                      onClick={downloadAttendanceReport}
                      className="bg-white hover:bg-gray-100 transition text-indigo-600 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm"
                    >
                      Download Monthly Report
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* FILTERS */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* DATE */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Attendance Date
                  </label>

                  <input
                    type="date"
                    value={selectedDate}
                    max={getTodayDate()}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-4 py-2.5 border rounded-xl text-sm dark:bg-slate-900 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                {/* CLASS + SUBJECT */}
                <div className="flex flex-col md:col-span-2">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Assigned Class & Subject
                  </label>

                  <select
                    value={
                      attendanceClass
                        ? `${attendanceClass.academic_class_id}-${attendanceClass.subject_id}`
                        : ""
                    }
                    onChange={(e) => {
                      const selected = myclasses.find(
                        (c) =>
                          `${c.academic_class_id}-${c.subject_id}` ===
                          e.target.value,
                      );

                      setAttendanceClass(selected);
                    }}
                    className="px-4 py-2.5 border rounded-xl text-sm dark:bg-slate-900 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">Select Assigned Subject</option>

                    {myclasses.map((c) => (
                      <option
                        key={`${c.academic_class_id}-${c.subject_id}`}
                        value={`${c.academic_class_id}-${c.subject_id}`}
                      >
                        {c.class_name} • {c.subject_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex gap-2 items-end">
                  <button
                    onClick={() => markAll("Present")}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 transition text-white px-4 py-2.5 rounded-xl text-sm font-medium"
                  >
                    All Present
                  </button>

                  <button
                    onClick={() => markAll("Absent")}
                    className="flex-1 bg-red-500 hover:bg-red-600 transition text-white px-4 py-2.5 rounded-xl text-sm font-medium"
                  >
                    All Absent
                  </button>
                </div>
              </div>
            </div>

            {/* SUMMARY */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* TOTAL */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total Students
                </p>

                <h3 className="text-2xl font-bold mt-1 text-gray-800 dark:text-white">
                  {attendanceCounts?.total || 0}
                </h3>
              </div>

              {/* PRESENT */}
              <div className="bg-green-50 dark:bg-green-500/10 rounded-2xl p-5 border border-green-100 dark:border-green-500/20">
                <p className="text-xs text-green-700 dark:text-green-400">
                  Present
                </p>

                <h3 className="text-2xl font-bold mt-1 text-green-600">
                  {attendanceCounts?.present || 0}
                </h3>
              </div>

              {/* ABSENT */}
              <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl p-5 border border-red-100 dark:border-red-500/20">
                <p className="text-xs text-red-700 dark:text-red-400">Absent</p>

                <h3 className="text-2xl font-bold mt-1 text-red-600">
                  {attendanceCounts?.absent || 0}
                </h3>
              </div>

              {/* PENDING */}
              <div className="bg-yellow-50 dark:bg-yellow-500/10 rounded-2xl p-5 border border-yellow-100 dark:border-yellow-500/20">
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  Pending
                </p>

                <h3 className="text-2xl font-bold mt-1 text-yellow-600">
                  {attendanceCounts?.pending || 0}
                </h3>
              </div>
            </div>

            {/* STUDENT LIST */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
              {/* HEADER */}
              <div className="px-5 py-4 border-b dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white">
                    Student Attendance List
                  </h3>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Mark attendance subject-wise for selected class
                  </p>
                </div>
              </div>

              {/* STUDENTS */}
              <div className="divide-y dark:divide-slate-700 max-h-[600px] overflow-y-auto">
                {students.length > 0 ? (
                  students.map((s) => (
                    <div
                      key={s.student_id}
                      className="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition"
                    >
                      {/* LEFT */}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                          {s.name}
                        </p>

                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Roll No: {s.roll_number} • {s.class_label}
                        </p>
                      </div>

                      {/* RIGHT */}
                      <div className="flex flex-col sm:flex-row gap-3 sm:items-center w-full lg:w-auto">
                        {/* STATUS */}
                        <div className="flex gap-2">
                          {/* PRESENT */}
                          <button
                            onClick={() =>
                              markAttendance(s.student_id, "Present")
                            }
                            className={`px-4 py-2 rounded-xl text-xs font-medium transition ${
                              attendance[s.student_id]?.status === "Present"
                                ? "bg-green-500 text-white shadow"
                                : "bg-gray-100 dark:bg-slate-700 hover:bg-green-100"
                            }`}
                          >
                            Present
                          </button>

                          {/* ABSENT */}
                          <button
                            onClick={() =>
                              markAttendance(s.student_id, "Absent")
                            }
                            className={`px-4 py-2 rounded-xl text-xs font-medium transition ${
                              attendance[s.student_id]?.status === "Absent"
                                ? "bg-red-500 text-white shadow"
                                : "bg-gray-100 dark:bg-slate-700 hover:bg-red-100"
                            }`}
                          >
                            Absent
                          </button>

                          {/* LATE */}
                          <button
                            onClick={() => markAttendance(s.student_id, "Late")}
                            className={`px-4 py-2 rounded-xl text-xs font-medium transition ${
                              attendance[s.student_id]?.status === "Late"
                                ? "bg-yellow-500 text-white shadow"
                                : "bg-gray-100 dark:bg-slate-700 hover:bg-yellow-100"
                            }`}
                          >
                            Late
                          </button>
                        </div>

                        {/* REMARK */}
                        <input
                          type="text"
                          placeholder="Optional remarks"
                          value={attendance[s.student_id]?.remarks || ""}
                          onChange={(e) =>
                            updateRemark(s.student_id, e.target.value)
                          }
                          className="border dark:border-slate-700 dark:bg-slate-900 px-3 py-2 rounded-xl text-xs w-full sm:w-52 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-16 text-center">
                    <p className="text-sm text-gray-400">No students found</p>
                  </div>
                )}
              </div>
            </div>

            {/* SAVE BUTTON */}
            <div className="flex justify-end">
              <button
                onClick={saveAttendance}
                className="bg-indigo-600 hover:bg-indigo-700 transition text-white px-8 py-3 rounded-2xl text-sm font-semibold shadow-lg"
              >
                Save Attendance
              </button>
            </div>
          </section>
        )}
        {/*  ============================= ATTENDANCE SECTION END =============================  */}
        {/*  ============================= TIMETABLE SECTION START =============================  */}
        {activeSection === "timetable" && (
          <section className="section p-4 sm:p-6 space-y-6 dark:bg-slate-900 dark:text-gray-100 active">
            {/* ================= HEADER ================= */}
            <div
              className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white
flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div>
                <h2 className="text-xl font-semibold">Teacher Timetable</h2>

                <p className="text-sm opacity-90">
                  Manage your weekly class schedule
                </p>
              </div>

              <button
                onClick={downloadTeacherTimetablePDF}
                disabled={downloadLoading}
                className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {downloadLoading ? "Downloading..." : "Download PDF"}
              </button>
            </div>

            {/* ================= FILTERS ================= */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm flex flex-wrap gap-3">
              <select
                value={selectedMyClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-4 py-2 border rounded-xl text-sm
bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-gray-100"
              >
                {classOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-4 py-2 border rounded-xl text-sm
bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-gray-100"
              >
                {subjectOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {/* ================= LOADING ================= */}
            {teacherTimetableLoading && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center shadow-sm">
                <p className="text-sm text-gray-500">Loading timetable...</p>
              </div>
            )}

            {/* ================= DESKTOP ================= */}
            {!teacherTimetableLoading && (
              <>
                <div className="hidden lg:block bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
                  <div
                    className="grid grid-cols-7 bg-gray-50 dark:bg-slate-700
text-xs text-gray-500 dark:text-gray-300 px-4 py-3"
                  >
                    <div>Day</div>
                    <div>Period 1</div>
                    <div>Period 2</div>
                    <div>Period 3</div>
                    <div>Period 4</div>
                    <div>Period 5</div>
                    <div>Period 6</div>
                  </div>

                  {[
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                  ].map((day) => {
                    const periods = teacherTimetable?.[day] || [];

                    return (
                      <div
                        key={day}
                        className="grid grid-cols-7 border-t dark:border-slate-700 text-sm"
                      >
                        <div className="p-4 font-medium text-gray-600 dark:text-gray-300">
                          {day}
                        </div>

                        {[1, 2, 3, 4, 5, 6].map((period) => {
                          const slot = periods.find((p) => p.period === period);

                          return (
                            <div key={period} className="p-3">
                              {slot ? (
                                <div className="bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-xl">
                                  <p className="font-medium">{slot.subject}</p>

                                  <p className="text-xs text-gray-500 dark:text-gray-300">
                                    {slot.class_name}
                                  </p>

                                  <p className="text-[11px] text-gray-400 mt-1">
                                    {slot.start_time} - {slot.end_time}
                                  </p>

                                  {slot.room && (
                                    <p className="text-[11px] text-gray-400">
                                      Room {slot.room}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div
                                  className="h-full min-h-[70px] rounded-xl border border-dashed
border-gray-200 dark:border-slate-700"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* ================= MOBILE ================= */}
                <div className="lg:hidden space-y-4">
                  {Object.keys(teacherTimetable).length === 0 && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl text-center shadow-sm">
                      No timetable available
                    </div>
                  )}

                  {Object.entries(teacherTimetable).map(([day, periods]) => (
                    <div
                      key={day}
                      className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm space-y-3"
                    >
                      <h3 className="font-semibold text-gray-700 dark:text-gray-200">
                        {day}
                      </h3>

                      {periods.length === 0 ? (
                        <p className="text-sm text-gray-400">
                          No classes scheduled
                        </p>
                      ) : (
                        periods.map((item, index) => (
                          <div
                            key={index}
                            className="bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-xl
flex justify-between items-center"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {item.subject}
                              </p>

                              <p className="text-xs text-gray-500 dark:text-gray-300">
                                {item.class_name}
                              </p>

                              {item.room && (
                                <p className="text-xs text-gray-400">
                                  Room {item.room}
                                </p>
                              )}
                            </div>

                            <div className="text-right">
                              <p className="text-xs text-gray-400">
                                {item.start_time}
                              </p>

                              <p className="text-[11px] text-gray-400">
                                P-{item.period}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}{" "}
        {/*  ============================= TIMETABLE SECTION END =============================  */}
        {/*  ============================= ASSIGNMENTS START =============================  */}
        {activeSection === "assignments" && (
          <section className="section p-4 sm:p-6 space-y-6 hidden active">
            {/* HEADER */}
            <div
              className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 sm:p-6 
flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div>
                <h2 className="text-white text-lg sm:text-xl font-semibold">
                  Assignments
                </h2>

                <p className="text-white text-xs sm:text-sm opacity-90">
                  Manage assignments and track student submissions
                </p>
              </div>

              <button
                onClick={() => setShowModal(true)}
                className="bg-white text-purple-600 px-5 py-2 rounded-xl text-sm font-medium hover:bg-gray-100"
              >
                + New Assignment
              </button>
            </div>

            {/* FILTER */}
            <div className="flex gap-3 flex-wrap">
              <select
                className="px-4 py-2 rounded-xl border border-gray-200 
dark:border-slate-600 bg-white dark:bg-slate-700 
text-gray-800 dark:text-white text-sm"
              >
                <option>All Classes</option>

                {assignedClasses.map((cls) => (
                  <option
                    key={cls.academic_class_id}
                    value={cls.academic_class_id}
                  >
                    {cls.class_name}
                  </option>
                ))}
              </select>
            </div>

            {/* ACCORDION */}
            <div className="space-y-4">
              {assignmentLoading ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-center">
                  Loading assignments...
                </div>
              ) : teacherAssignments.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-center">
                  No assignments found
                </div>
              ) : (
                Object.entries(
                  teacherAssignments.reduce((acc, a) => {
                    if (!acc[a.class_name]) {
                      acc[a.class_name] = {
                        subject: a.subject,
                        items: [],
                      };
                    }
                    acc[a.class_name].items.push(a);
                    return acc;
                  }, {}),
                ).map(([className, classData]) => (
                  <div
                    key={className}
                    className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm"
                  >
                    {/* CLASS HEADER */}
                    <div className="flex justify-between items-center p-5 cursor-pointer">
                      <div>
                        <h3 className="font-semibold text-lg">{className}</h3>

                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {classData.subject}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 px-3 py-1 rounded-full">
                          {classData.items.length} Assignments
                        </span>

                        <span className="arrow text-gray-400 transition-transform duration-300">
                          ▼
                        </span>
                      </div>
                    </div>

                    {/* BODY */}
                    <div className="px-5 pb-5 space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        {classData.items.map((a) => (
                          <div
                            key={a.id}
                            onClick={() => openAssignmentDetails(a)}
                            className={`cursor-pointer p-4 rounded-xl space-y-3 ${
                              a.pending > 0
                                ? `
border-2 border-purple-200 dark:border-purple-700 
bg-purple-50 dark:bg-purple-900/20
`
                                : `
bg-gray-50 dark:bg-slate-700
`
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <h4 className="font-medium flex items-center gap-2">
                                {a.title}

                                {a.pending > 0 && (
                                  <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full">
                                    NEW
                                  </span>
                                )}
                              </h4>

                              <span className="text-xs text-gray-400">Due</span>
                            </div>

                            <div>
                              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                <span>{a.submitted} Submitted</span>

                                <span>{a.pending} Pending</span>
                              </div>

                              <div className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full">
                                <div
                                  style={{
                                    width: `${assignmentProgress(a)}%`,
                                  }}
                                  className={`h-full ${
                                    a.pending > 0
                                      ? "bg-purple-500"
                                      : "bg-green-500"
                                  }`}
                                ></div>
                              </div>
                            </div>

                            <div className="flex justify-between items-center">
                              {a.pending > 0 ? (
                                <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 px-2 py-1 rounded-full">
                                  Pending Review
                                </span>
                              ) : (
                                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 px-2 py-1 rounded-full">
                                  Completed
                                </span>
                              )}

                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditAssignment(a);
                                  }}
                                  className="text-xs text-blue-600 font-medium"
                                >
                                  Edit
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAssignment(a.id);
                                  }}
                                  className="text-xs text-red-600 font-medium"
                                >
                                  Delete
                                </button>

                                <span className="text-xs text-purple-600 font-medium">
                                  Open →
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
        {/* ASSIGNMENT DETAIL MODAL */}
        {selectedAssignment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 w-full max-w-3xl rounded-t-3xl sm:rounded-3xl flex flex-col h-[95vh] sm:max-h-[90vh] overflow-hidden">
              {/* HEADER */}
              <div className="p-4 sm:p-5 border-b dark:border-slate-700 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div>
                  <h2 className="text-lg font-semibold">
                    {selectedAssignment.title}
                  </h2>

                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedAssignment.class_name}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="text-gray-400 text-xl"
                >
                  ✕
                </button>
              </div>

              {/* STATS BAR */}
              <div className="px-4 sm:px-5 py-3 border-b dark:border-slate-700 grid grid-cols-3 sm:flex sm:flex-wrap gap-2 text-xs bg-gray-50 dark:bg-slate-900">
                <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 px-3 py-1 rounded-full">
                  Total: {assignmentSubmissions.length}
                </span>

                <span className="bg-green-100 dark:bg-green-900/30 text-green-600 px-3 py-1 rounded-full">
                  Submitted: {submittedStudents.length}
                </span>

                <span className="bg-red-100 dark:bg-red-900/30 text-red-600 px-3 py-1 rounded-full">
                  Pending: {pendingStudents.length}
                </span>
              </div>

              {/* TABS */}
              <div className="px-4 sm:px-5 pt-3 flex gap-3 sm:gap-5 border-b dark:border-slate-700 text-sm">
                <button
                  onClick={() => setSubmissionTab("submitted")}
                  className={`pb-2 ${
                    submissionTab === "submitted"
                      ? "text-purple-600 font-medium border-b-2 border-purple-600"
                      : "text-gray-500"
                  }`}
                >
                  Submitted
                </button>

                <button
                  onClick={() => setSubmissionTab("pending")}
                  className={`pb-2 ${
                    submissionTab === "pending"
                      ? "text-purple-600 font-medium border-b-2 border-purple-600"
                      : "text-gray-500"
                  }`}
                >
                  Pending
                </button>
              </div>

              {/* SEARCH */}
              <div className="px-4 sm:px-5 pt-3">
                <input
                  type="text"
                  placeholder="Search student..."
                  className="w-full border dark:border-slate-600 rounded-xl px-3 py-2 text-sm"
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>

              {/* BODY */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
                {submissionLoading ? (
                  <div className="text-center text-sm text-gray-500 py-10">
                    Loading submissions...
                  </div>
                ) : (
                  (submissionTab === "submitted"
                    ? submittedStudents
                    : pendingStudents
                  )
                    .filter(
                      (sub) =>
                        !studentSearch ||
                        (sub.student_name || "")
                          .toLowerCase()
                          .includes(studentSearch.toLowerCase()),
                    )
                    .slice(0, 100)
                    .map((sub) => {
                      const isGraded =
                        sub.marks_obtained !== null &&
                        sub.marks_obtained !== undefined;

                      return submissionTab === "submitted" ? (
                        <div
                          key={sub.id}
                          className="p-3 sm:p-4 rounded-xl bg-gray-50 dark:bg-slate-700 space-y-3"
                        >
                          {/* HEADER */}
                          <div className="flex justify-between">
                            <div>
                              <p className="text-sm font-medium">
                                {sub.student_name}
                              </p>

                              <p className="text-xs text-green-500">
                                Submitted
                              </p>
                            </div>

                            <a
                              href={sub.submission_file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg"
                            >
                              View
                            </a>
                          </div>

                          {/* GRADE SECTION */}
                          {sub.marks_obtained !== null ? (
                            // ✅ GRADED (LOCKED VIEW)
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 px-3 py-1 rounded-lg">
                                  {sub.marks_obtained} /{" "}
                                  {selectedAssignment.total_marks}
                                </span>

                                <span className="text-xs text-green-500">
                                  Graded
                                </span>
                              </div>

                              {sub.feedback && (
                                <p className="text-xs text-gray-400">
                                  {sub.feedback}
                                </p>
                              )}
                            </div>
                          ) : (
                            // ✅ NOT GRADED (INPUT MODE)
                            <div className="grid grid-cols-1 sm:flex gap-2">
                              <input
                                type="number"
                                placeholder="Marks"
                                value={gradingData?.[sub.id]?.marks || ""}
                                onChange={(e) =>
                                  setGradingData((prev) => ({
                                    ...prev,
                                    [sub.id]: {
                                      ...prev[sub.id],
                                      marks: e.target.value,
                                    },
                                  }))
                                }
                                className="w-full sm:w-24 border dark:border-slate-600 rounded-lg px-2 py-1 text-sm"
                              />

                              <input
                                type="text"
                                placeholder="Remarks"
                                value={gradingData?.[sub.id]?.feedback || ""}
                                onChange={(e) =>
                                  setGradingData((prev) => ({
                                    ...prev,
                                    [sub.id]: {
                                      ...prev[sub.id],
                                      feedback: e.target.value,
                                    },
                                  }))
                                }
                                className="w-full sm:w-40 border dark:border-slate-600 rounded-lg px-2 py-1 text-sm"
                              />

                              <button
                                onClick={() => saveGrade(sub)}
                                className="w-full sm:w-auto px-3 py-2 sm:py-1 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg text-xs hover:scale-105 transition"
                              >
                                Save
                              </button>

                              <button
                                onClick={() => forceResubmit(sub.id)}
                                className="w-full sm:w-auto px-3 py-2 sm:py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 rounded-lg text-xs hover:scale-105 transition"
                              >
                                {sub.status === "Needs Resubmission"
                                  ? "Recheck Sent"
                                  : "Recheck"}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          key={sub.id}
                          className="flex justify-between items-center p-4 rounded-xl bg-red-50 dark:bg-red-900/30"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {sub.student_name}
                            </p>
                            <p className="text-xs text-red-400">
                              Not Submitted
                            </p>
                          </div>

                          <button className="text-xs px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 rounded-lg">
                            Remind
                          </button>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        )}
        {/* CREATE / EDIT ASSIGNMENT MODAL */}
        {showModal && (
          <div
            onClick={() => setShowModal(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-2 sm:p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white/95 backdrop-blur-xl dark:bg-slate-800 
      text-gray-800 dark:text-gray-100 rounded-t-3xl sm:rounded-3xl 
      w-full max-w-2xl shadow-2xl border border-gray-100 dark:border-slate-700
      p-5 sm:p-7 space-y-6 animate-slideUp max-h-[95vh] overflow-y-auto"
            >
              {/* HEADER */}
              <div className="flex justify-between items-center border-b pb-4 dark:border-slate-700">
                <div>
                  <h3 className="text-xl font-semibold">
                    {editingAssignment
                      ? "Edit Assignment"
                      : "Create Assignment"}
                  </h3>

                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Create assignments, attach files and schedule due dates
                  </p>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-700 hover:scale-105"
                >
                  ✕
                </button>
              </div>

              {/* FORM */}
              <div className="space-y-5">
                {/* TITLE */}
                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Assignment Title *
                  </label>

                  <input
                    type="text"
                    name="title"
                    value={assignmentForm.title}
                    onChange={handleAssignmentChange}
                    placeholder="Ex: Algebra Worksheet 5"
                    className="w-full mt-2 border border-gray-200 dark:border-slate-600 
            bg-white dark:bg-slate-700 p-3 rounded-xl text-sm
            focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                {/* CLASS + SUBJECT */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* CLASS */}
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      Class *
                    </label>

                    <select
                      name="academic_class_id"
                      value={assignmentForm.academic_class_id}
                      onChange={(e) => handleClassSelect(e.target.value)}
                      className="w-full mt-2 border border-gray-200 dark:border-slate-600
              bg-white dark:bg-slate-700 p-3 rounded-xl text-sm"
                    >
                      <option value="">Select Class</option>

                      {assignedClasses.map((c) => (
                        <option
                          key={`${c.academic_class_id}-${c.subject_id}`}
                          value={c.academic_class_id}
                        >
                          {c.class_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* SUBJECT FIXED */}
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      Subject *
                    </label>

                    <select
                      name="subject_id"
                      value={assignmentForm.subject_id}
                      onChange={handleAssignmentChange}
                      className="w-full mt-2 border border-gray-200 dark:border-slate-600
              bg-white dark:bg-slate-700 p-3 rounded-xl text-sm"
                    >
                      <option value="">Select Subject</option>

                      {assignedClasses
                        .filter(
                          (c) =>
                            String(c.academic_class_id) ===
                            String(assignmentForm.academic_class_id),
                        )
                        .map((c) => (
                          <option key={c.subject_id} value={c.subject_id}>
                            {c.subject_name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* DATES */}
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      Assigned Date
                    </label>

                    <input
                      type="date"
                      name="assigned_date"
                      value={assignmentForm.assigned_date}
                      onChange={handleAssignmentChange}
                      className="w-full mt-2 border p-3 rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      Due Date
                    </label>

                    <input
                      type="date"
                      name="due_date"
                      value={assignmentForm.due_date}
                      onChange={handleAssignmentChange}
                      className="w-full mt-2 border p-3 rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      Total Marks
                    </label>

                    <input
                      type="number"
                      min="1"
                      name="total_marks"
                      value={assignmentForm.total_marks}
                      onChange={handleAssignmentChange}
                      className="w-full mt-2 border p-3 rounded-xl text-sm"
                    />
                  </div>
                </div>

                {/* ATTACH FILE */}
                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Attachment (optional)
                  </label>

                  <label
                    className="mt-2 border-2 border-dashed border-purple-300
            rounded-2xl p-6 text-center cursor-pointer block
            hover:border-purple-500 transition"
                  >
                    <input
                      type="file"
                      name="file"
                      onChange={handleAssignmentChange}
                      className="hidden"
                    />

                    <div className="space-y-2">
                      <div className="text-3xl">📎</div>

                      <p className="text-sm">Click to upload PDF / DOC</p>

                      {assignmentForm.file && (
                        <p className="text-purple-600 text-xs font-medium">
                          Selected: {assignmentForm.file.name}
                        </p>
                      )}
                    </div>
                  </label>
                </div>

                {/* DESCRIPTION */}
                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Instructions
                  </label>

                  <textarea
                    rows="5"
                    name="description"
                    value={assignmentForm.description}
                    onChange={handleAssignmentChange}
                    placeholder="Write assignment instructions..."
                    className="w-full mt-2 border border-gray-200 dark:border-slate-600
            p-4 rounded-2xl text-sm"
                  />
                </div>
              </div>

              {/* FOOTER */}
              <div className="flex flex-col sm:flex-row justify-between gap-3 pt-3 border-t dark:border-slate-700">
                <button
                  onClick={() => {
                    localStorage.setItem(
                      "assignmentDraft",
                      JSON.stringify(assignmentForm),
                    );
                    alert("Draft saved");
                  }}
                  className="px-5 py-3 rounded-xl bg-gray-100 dark:bg-slate-700 text-sm"
                >
                  Save Draft
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-slate-700 text-sm"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleCreateAssignment}
                    className="px-7 py-3 rounded-xl text-sm
            bg-gradient-to-r from-purple-600 to-indigo-600
            text-white shadow-lg hover:opacity-90"
                  >
                    {editingAssignment
                      ? "Update Assignment"
                      : "Create Assignment"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ============================= ASSIGNMENTS END ============================= */}
        {/* ===================== TEACHER ANNOUNCEMENTS and NOTIFICATIONS CENTER ========================*/}
        {activeSection === "announcements" && (
          <section className="p-4 sm:p-6 space-y-6">
            {/* 🔥 HEADER */}
            <div
              className="relative overflow-hidden rounded-2xl p-5 sm:p-6 text-white shadow-xl
      bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500"
            >
              <div className="relative z-10">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  📊 Teacher Updates Center
                </h3>
                <p className="text-sm opacity-90 mt-1">
                  Manage announcements & track student notifications
                </p>
              </div>

              {/* Glow Effect */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
            </div>

            {/* 📊 STATS (Teacher Insights) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Total Announcements", value: announcements.length },
                { label: "Unread Notifications", value: notificationUnread },
                {
                  label: "Pending Actions",
                  value: notifications.filter((n) => !n.is_read).length,
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow border"
                >
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <h4 className="text-xl font-semibold mt-1">{item.value}</h4>
                </div>
              ))}
            </div>

            {/* 🔥 TABS */}
            <div className="flex gap-3 border-b pb-3">
              {/* ANNOUNCEMENTS */}
              <button
                onClick={() => setNoticeTab("announcements")}
                className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all
        ${
          noticeTab === "announcements"
            ? "text-white bg-indigo-600 shadow-md"
            : "bg-gray-100 dark:bg-slate-700 text-gray-600"
        }`}
              >
                📢 Announcements
                {unreadCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* NOTIFICATIONS */}
              <button
                onClick={() => setNoticeTab("notifications")}
                className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all
        ${
          noticeTab === "notifications"
            ? "text-white bg-indigo-600 shadow-md"
            : "bg-gray-100 dark:bg-slate-700 text-gray-600"
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

            {/*  CONTENT  */}

            {/* 📢 ANNOUNCEMENTS */}
            {noticeTab === "announcements" && (
              <div className="grid gap-4">
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
                      className={`p-4 rounded-2xl border shadow-sm transition cursor-pointer
                hover:shadow-md
                ${
                  !n.is_read
                    ? "bg-indigo-50 dark:bg-slate-700 border-indigo-200"
                    : "bg-white dark:bg-slate-800 border-gray-100"
                }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {n.title}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {n.description}
                          </p>
                        </div>

                        {/* Priority */}
                        <span
                          className={`text-xs px-2 py-1 rounded-full
                  ${
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

                      <div className="flex justify-between text-xs mt-3 text-gray-400">
                        <span>{n.category}</span>
                        <span>{n.date}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 🔔 NOTIFICATIONS */}
            {noticeTab === "notifications" && (
              <div className="grid gap-4">
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
                      className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition
                hover:shadow-md
                ${
                  !n.is_read
                    ? "bg-purple-50 dark:bg-slate-700 border-purple-200"
                    : "bg-white dark:bg-slate-800 border-gray-100"
                }`}
                    >
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {n.title}
                      </p>

                      <p className="text-sm text-gray-500 mt-1">{n.message}</p>

                      <div className="flex justify-between items-center mt-3 text-xs text-gray-400">
                        <span>{n.created_at}</span>

                        {!n.is_read && (
                          <span className="text-indigo-600 font-medium">
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        )}
        {/* ===================== TEACHER ANNOUNCEMENTS and NOTIFICATIONS END ========================*/}
        {/* ============================= STUDENT LEAVE REQUEST SECTION ============================= */}
        {activeSection === "studentLeave" && (
          <section className="section p-4 sm:p-6 space-y-6 dark:bg-slate-900 dark:text-gray-100 active">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow">
              <h2 className="text-xl font-semibold">Leave Requests</h2>
              <p className="text-sm opacity-90">
                Manage student leave applications
              </p>
            </div>

            {/* FILTER */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm flex flex-wrap gap-3 items-center justify-between">
              <select
                value={leaveFilter}
                onChange={(e) => setLeaveFilter(e.target.value)}
                className="px-4 py-2 border rounded-xl text-sm 
        bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-gray-100"
              >
                <option value="all">All Requests</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>

              <input
                type="text"
                placeholder="Search student..."
                value={leaveSearch}
                onChange={(e) => setLeaveSearch(e.target.value)}
                className="px-4 py-2 border rounded-xl text-sm 
        bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-gray-100"
              />
            </div>

            {/* REQUEST LIST */}
            <div className="space-y-3">
              {leaveLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : filteredLeaves.length === 0 ? (
                <p className="text-sm text-gray-500">No leave requests</p>
              ) : (
                filteredLeaves.map((l) => (
                  <div
                    key={l.id}
                    className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    {/* LEFT INFO */}
                    <div className="space-y-1">
                      {/* STUDENT NAME + CLASS */}
                      <p className="font-semibold text-sm sm:text-base">
                        {l.student_name || `Student #${l.student_id}`}
                      </p>

                      {(l.batch || l.division || l.section) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {l.batch && `${l.batch}`}
                          {l.division && ` • ${l.division}`}
                          {l.section && ` • ${l.section}`}
                        </p>
                      )}

                      {/* DATE */}
                      <p className="text-xs text-gray-500 dark:text-gray-300">
                        {l.from} → {l.to} • {l.days} Days
                      </p>

                      {/* TYPE */}
                      <p className="text-xs text-blue-500 dark:text-blue-300">
                        Type: {l.type}
                      </p>

                      {/* REASON */}
                      <p className="text-xs text-gray-400 dark:text-gray-400">
                        Reason: {l.reason || "N/A"}
                      </p>
                    </div>

                    {/* RIGHT ACTION */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* STATUS */}
                      <span
                        className={`text-xs px-3 py-1 rounded-full ${
                          l.status === "Approved"
                            ? "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-300"
                            : l.status === "Rejected"
                              ? "bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-300"
                              : "bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-300"
                        }`}
                      >
                        {l.status}
                      </span>

                      {/* ACTION BUTTONS */}
                      {l.status === "Pending" && (
                        <>
                          <button
                            onClick={() => handleUpdateLeave(l.id, "Approved")}
                            className="px-3 py-1 text-xs bg-green-100 text-green-600 
                    dark:bg-green-500/20 dark:text-green-300 rounded-lg hover:scale-105 transition"
                          >
                            Approve
                          </button>

                          <button
                            onClick={() => handleUpdateLeave(l.id, "Rejected")}
                            className="px-3 py-1 text-xs bg-red-100 text-red-500 
                    dark:bg-red-500/20 dark:text-red-300 rounded-lg hover:scale-105 transition"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
        {/* ============================= STUDENT LEAVE SECTION END ============================= */}
        {/*  ============================= TEACHER LEAVE SECTION END =============================  */}
        {activeSection === "teacherLeave" && (
          <section className="section p-4 sm:p-6 space-y-6 hidden dark:bg-slate-900 dark:text-gray-100 active">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow">
              <h2 className="text-xl font-semibold">My Leave Requests</h2>
              <p className="text-sm opacity-90">Apply and track your leave</p>
            </div>

            {/* LEAVE BALANCE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-green-50 dark:bg-green-500/10 p-4 rounded-xl text-center">
                <p className="text-sm text-green-600 dark:text-green-300">
                  Casual Leave
                </p>
                <h3
                  id="clBalance"
                  className="text-xl font-bold text-green-700 dark:text-green-300"
                >
                  {leaveBalance.casual_leave}
                </h3>
              </div>

              <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-xl text-center">
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  Sick Leave
                </p>
                <h3
                  id="slBalance"
                  className="text-xl font-bold text-blue-700 dark:text-blue-300"
                >
                  {leaveBalance.sick_leave}
                </h3>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-500/10 p-4 rounded-xl text-center sm:col-span-2 lg:col-span-1">
                <p className="text-sm text-yellow-600 dark:text-yellow-300">
                  Used Leaves
                </p>
                <h3
                  id="usedLeaves"
                  className="text-xl font-bold text-yellow-700 dark:text-yellow-300"
                >
                  {leaveBalance.used_leave}
                </h3>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-md space-y-6 border dark:border-slate-700">
              <h3 className="font-semibold text-lg">Apply for Leave</h3>

              {/* DATE FIELDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* FROM DATE */}
                <div className="relative">
                  <input
                    type="date"
                    value={leaveForm.from_date}
                    onChange={(e) =>
                      setLeaveForm({ ...leaveForm, from_date: e.target.value })
                    }
                    className="peer w-full px-4 pt-5 pb-2 text-sm border rounded-xl bg-transparent 
        dark:bg-slate-700 dark:border-slate-600 dark:text-white
        focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                  <label
                    className="absolute left-3 top-2 text-xs text-gray-500 dark:text-gray-400 
        peer-focus:text-indigo-500"
                  >
                    From Date
                  </label>
                </div>

                {/* TO DATE */}
                <div className="relative">
                  <input
                    type="date"
                    value={leaveForm.to_date}
                    onChange={(e) =>
                      setLeaveForm({ ...leaveForm, to_date: e.target.value })
                    }
                    className="peer w-full px-4 pt-5 pb-2 text-sm border rounded-xl bg-transparent 
        dark:bg-slate-700 dark:border-slate-600 dark:text-white
        focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                  <label
                    className="absolute left-3 top-2 text-xs text-gray-500 dark:text-gray-400 
        peer-focus:text-indigo-500"
                  >
                    To Date
                  </label>
                </div>
              </div>

              {/* LEAVE TYPE */}
              <div className="relative">
                <select
                  value={leaveForm.leave_type}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, leave_type: e.target.value })
                  }
                  className="w-full px-4 py-3 text-sm border rounded-xl bg-white 
      dark:bg-slate-700 dark:border-slate-600 dark:text-white
      focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                >
                  <option value="CL">Casual Leave</option>
                  <option value="SL">Sick Leave</option>
                </select>
              </div>

              {/* REASON */}
              <div className="relative">
                <textarea
                  value={leaveForm.reason}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, reason: e.target.value })
                  }
                  placeholder=" "
                  rows="3"
                  className="peer w-full px-4 pt-5 pb-2 text-sm border rounded-xl bg-transparent 
      dark:bg-slate-700 dark:border-slate-600 dark:text-white
      focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                ></textarea>
                <label
                  className="absolute left-3 top-2 text-xs text-gray-500 dark:text-gray-400 
      peer-focus:text-indigo-500"
                >
                  Reason
                </label>
              </div>

              {/* DAYS + BUTTON */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* DAYS BADGE */}
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Total Days:{" "}
                  <span className="ml-1 px-3 py-1 rounded-full bg-indigo-100 text-indigo-600 text-xs font-medium">
                    {calculateDays()}
                  </span>
                </div>

                {/* BUTTON */}
                <button
                  onClick={handleApplyLeave}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 
      hover:from-indigo-700 hover:to-purple-700 
      text-white px-6 py-2.5 rounded-xl text-sm font-medium 
      shadow-md hover:shadow-lg transition-all duration-200 w-full sm:w-auto"
                >
                  Submit Request
                </button>
              </div>
            </div>

            {/* LEAVE HISTORY */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm">
              <h3 className="font-semibold mb-4">Leave History</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {leaveHistory.length === 0 ? (
                  <p className="text-gray-400">No leave records</p>
                ) : (
                  leaveHistory.map((l) => {
                    const statusColor =
                      l.status === "Approved"
                        ? "bg-green-100 text-green-600"
                        : l.status === "Rejected"
                          ? "bg-red-100 text-red-600"
                          : "bg-yellow-100 text-yellow-600";

                    return (
                      <div
                        key={l.id}
                        className="p-4 rounded-xl border dark:border-slate-600 flex justify-between items-center"
                      >
                        {/* LEFT SIDE */}
                        <div>
                          <p className="font-medium">
                            {l.from} → {l.to} ({l.days} days)
                          </p>

                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {l.reason || "No reason provided"}
                          </p>

                          <p className="text-xs mt-1 text-gray-400">
                            Type: {l.type}
                          </p>
                        </div>

                        {/* RIGHT SIDE STATUS */}
                        <span
                          className={`text-xs px-3 py-1 rounded-full ${statusColor}`}
                        >
                          {l.status}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        )}
        {/*  ============================= TEACHER LEAVE SECTION END ============================= */}
        {/* ===================== PROFILE SECTION START ========================*/}
        {activeSection === "profile" && (
          <section className="section hidden p-4 sm:p-6 space-y-6 dark:bg-slate-900 dark:text-gray-100 active">
            {/* PROFILE HEADER */}
            <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-xl overflow-hidden">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-xl"></div>

              <div className="relative flex flex-col sm:flex-row items-center gap-6">
                <img
                  src="https://i.pravatar.cc/120?img=12"
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-lg"
                />

                <div className="text-center sm:text-left flex-1">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {editMode ? (
                      <>
                        <input
                          name="first_name"
                          value={formData.first_name || ""}
                          onChange={handleChange}
                          placeholder="First Name"
                          className="mt-1 w-full p-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition 
                bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 
                border-gray-200 dark:border-slate-700 focus:ring-blue-500"
                        />
                        <input
                          name="middle_name"
                          value={formData.middle_name || ""}
                          onChange={handleChange}
                          placeholder="Middle Name"
                          className="mt-1 w-full p-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition 
                bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 
                border-gray-200 dark:border-slate-700 focus:ring-blue-500"
                        />
                        <input
                          name="last_name"
                          value={formData.last_name || ""}
                          onChange={handleChange}
                          placeholder="Last Name"
                          className="mt-1 w-full p-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition 
                bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 
                border-gray-200 dark:border-slate-700 focus:ring-blue-500"
                        />
                      </>
                    ) : (
                      `${teacher?.first_name} ${teacher?.middle_name} ${teacher?.last_name}`
                    )}
                  </h2>

                  <p className="text-sm opacity-90 mt-1">
                    {teacher?.designation} •{" "}
                    {teacher?.specialization || "Department"}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                    <span className="px-3 py-1 text-xs bg-white/20 rounded-full">
                      {teacher?.teacher_id}
                    </span>

                    <span className="px-3 py-1 text-xs bg-white/20 rounded-full">
                      {teacher?.experience_years || 0}+ Years Exp
                    </span>

                    <span className="px-3 py-1 text-xs bg-green-400 text-green-900 rounded-full font-medium">
                      {teacher?.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {/* PERSONAL */}
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
                        className="mt-1 w-full p-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition 
                bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 
                border-gray-200 dark:border-slate-700 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="font-medium">
                        {teacher?.date_of_birth}
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
                        className="mt-1 w-full p-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition 
                bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 
                border-gray-200 dark:border-slate-700 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="font-medium">{teacher?.gender}</span>
                    )}
                  </p>

                  <p>
                    Phone:{" "}
                    {editMode ? (
                      <input
                        name="mobile"
                        value={formData.mobile || ""}
                        onChange={handleChange}
                        className="mt-1 w-full p-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition 
                bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 
                border-gray-200 dark:border-slate-700 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="font-medium">{teacher?.mobile}</span>
                    )}
                  </p>

                  <p>
                    Email:{" "}
                    {editMode ? (
                      <input
                        name="email"
                        value={formData.email || ""}
                        onChange={handleChange}
                        className="mt-1 w-full p-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition 
                bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 
                border-gray-200 dark:border-slate-700 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="font-medium">{teacher?.email}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* PROFESSIONAL */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md">
                <h4 className="font-semibold mb-3">💼 Professional</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    Designation:{" "}
                    {editMode ? (
                      <input
                        name="designation"
                        value={formData.designation || ""}
                        onChange={handleChange}
                        className="mt-1 w-full p-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition 
                bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 
                border-gray-200 dark:border-slate-700 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="font-medium">
                        {teacher?.designation}
                      </span>
                    )}
                  </p>

                  <p>
                    Subjects:
                    <span className="font-medium">
                      {teacher?.classes?.length
                        ? teacher.classes
                            .map((c) => c.subject_name)
                            .filter(Boolean)
                            .join(", ")
                        : "N/A"}
                    </span>
                  </p>

                  <p>
                    Classes:
                    <span className="font-medium">
                      {teacher?.classes?.length
                        ? teacher.classes
                            .map((c) => c.class_name)
                            .filter(Boolean)
                            .join(", ")
                        : "N/A"}
                    </span>
                  </p>
                </div>
              </div>

              {/* ACADEMIC */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md">
                <h4 className="font-semibold mb-3">🎓 Academic</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    Degree:{" "}
                    {editMode ? (
                      <input
                        name="degree"
                        value={formData.degree || ""}
                        onChange={handleChange}
                        className="mt-1 w-full p-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition 
                bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 
                border-gray-200 dark:border-slate-700 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="font-medium">{teacher?.degree}</span>
                    )}
                  </p>

                  <p>
                    University:{" "}
                    {editMode ? (
                      <input
                        name="university"
                        value={formData.university || ""}
                        onChange={handleChange}
                        className="mt-1 w-full p-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition 
                bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 
                border-gray-200 dark:border-slate-700 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="font-medium">{teacher?.university}</span>
                    )}
                  </p>

                  <p>
                    Experience:{" "}
                    {editMode ? (
                      <input
                        name="experience_years"
                        value={formData.experience_years || ""}
                        onChange={handleChange}
                        className="mt-1 w-full p-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition 
                bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 
                border-gray-200 dark:border-slate-700 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="font-medium">
                        {teacher?.experience_years} Years
                      </span>
                    )}
                  </p>

                  <p>
                    Specialization:{" "}
                    {editMode ? (
                      <input
                        name="specialization"
                        value={formData.specialization || ""}
                        onChange={handleChange}
                        className="mt-1 w-full p-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition 
                bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 
                border-gray-200 dark:border-slate-700 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="font-medium">
                        {teacher?.specialization}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* EMPLOYMENT */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md">
                <h4 className="font-semibold mb-3">🏢 Employment</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    Joining:{" "}
                    {editMode ? (
                      <input
                        type="date"
                        name="joining_date"
                        value={formData.joining_date || ""}
                        onChange={handleChange}
                        className="mt-1 w-full p-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition 
                bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 
                border-gray-200 dark:border-slate-700 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="font-medium">
                        {teacher?.joining_date}
                      </span>
                    )}
                  </p>

                  <p>
                    Type:{" "}
                    {editMode ? (
                      <input
                        name="employment_type"
                        value={formData.employment_type || ""}
                        onChange={handleChange}
                        className="mt-1 w-full p-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition 
                bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 
                border-gray-200 dark:border-slate-700 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="font-medium">
                        {teacher?.employment_type}
                      </span>
                    )}
                  </p>

                  <p>
                    Shift: <span className="font-medium">{teacher?.shift}</span>
                  </p>
                </div>
              </div>

              {/* PERFORMANCE (READ ONLY) */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md">
                <h4 className="font-semibold mb-3">📊 Performance</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    Classes:{" "}
                    <span className="font-medium">
                      {teacher?.total_classes_taken}
                    </span>
                  </p>
                  <p>
                    Assignments:{" "}
                    <span className="font-medium">
                      {teacher?.assignments_count}
                    </span>
                  </p>
                  <p>
                    Rating:{" "}
                    <span className="text-yellow-500">★ {teacher?.rating}</span>
                  </p>
                  <p>
                    Attendance:{" "}
                    <span className="text-green-600">
                      {teacher?.attendance_percentage}%
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
                          className="input mr-2"
                        />
                        <input
                          name="state"
                          value={formData.state || ""}
                          onChange={handleChange}
                          className="mt-1 w-full p-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition 
                bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 
                border-gray-200 dark:border-slate-700 focus:ring-blue-500"
                        />
                      </>
                    ) : (
                      `${teacher?.city}, ${teacher?.state}`
                    )}
                  </p>

                  <p>
                    Pincode:{" "}
                    {editMode ? (
                      <input
                        name="pincode"
                        value={formData.pincode || ""}
                        onChange={handleChange}
                        className="mt-1 w-full p-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition 
                bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 
                border-gray-200 dark:border-slate-700 focus:ring-blue-500"
                      />
                    ) : (
                      teacher?.pincode
                    )}
                  </p>
                </div>
              </div>

              {/* HEALTH */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md">
                <h4 className="font-semibold mb-3">🩺 Health & Emergency</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    Blood Group:{" "}
                    {editMode ? (
                      <select
                        name="blood_group"
                        value={formData.blood_group || ""}
                        onChange={handleChange}
                        className="mt-1 w-full p-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition 
                bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 
                border-gray-200 dark:border-slate-700 focus:ring-blue-500"
                      >
                        <option value="">Select Blood Group</option>
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                          (bg) => (
                            <option key={bg} value={bg}>
                              {bg}
                            </option>
                          ),
                        )}
                      </select>
                    ) : (
                      <span className="text-red-500">
                        {teacher?.blood_group || "N/A"}
                      </span>
                    )}
                  </p>

                  <p>
                    Medical Condition:{" "}
                    {editMode ? (
                      <input
                        name="medical_condition"
                        value={formData.medical_condition || ""}
                        onChange={handleChange}
                        className="mt-1 w-full p-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition 
                bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 
                border-gray-200 dark:border-slate-700 focus:ring-blue-500"
                      />
                    ) : (
                      teacher?.medical_condition || "None"
                    )}
                  </p>
                </div>
              </div>

              {/* EMERGENCY */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md">
                <h4 className="font-semibold mb-3">Emergency Contact</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    Name:{" "}
                    {editMode ? (
                      <input
                        name="emergency_name"
                        value={formData.emergency_name || ""}
                        onChange={handleChange}
                        className="mt-1 w-full p-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition 
                bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 
                border-gray-200 dark:border-slate-700 focus:ring-blue-500"
                      />
                    ) : (
                      teacher?.emergency_name
                    )}
                  </p>

                  <p>
                    Relation:{" "}
                    {editMode ? (
                      <input
                        name="emergency_relation"
                        value={formData.emergency_relation || ""}
                        onChange={handleChange}
                        className="mt-1 w-full p-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition 
                bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 
                border-gray-200 dark:border-slate-700 focus:ring-blue-500"
                      />
                    ) : (
                      teacher?.emergency_relation
                    )}
                  </p>

                  <p>
                    Phone:{" "}
                    {editMode ? (
                      <input
                        name="emergency_phone"
                        value={formData.emergency_phone || ""}
                        onChange={handleChange}
                        className="mt-1 w-full p-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition 
                bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 
                border-gray-200 dark:border-slate-700 focus:ring-blue-500"
                      />
                    ) : (
                      teacher?.emergency_phone
                    )}
                  </p>
                </div>
              </div>

              {/* SYSTEM */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md">
                <h4 className="font-semibold mb-3">⚙️ System</h4>
                <div className="space-y-2 text-sm">
                  <p>Username: {teacher?.username}</p>
                  <p>
                    Status:{" "}
                    <span className="text-green-600">{teacher?.status}</span>
                  </p>
                  <p>Last Login: {teacher?.last_login || "—"}</p>
                </div>
              </div>
            </div>

            {/* ACTION */}
            <div className="sticky bottom-4 flex justify-center sm:justify-end gap-3">
              {editMode ? (
                <>
                  <button
                    onClick={handleSave}
                    className="px-6 py-3 rounded-xl bg-green-600 text-white"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-6 py-3 rounded-xl bg-gray-400 text-white"
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

export default TeacherDashboard;
