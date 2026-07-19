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
import { useStudentEnrollment } from "../controllers/Enrollments/useStudentEnrollment";
import { useMyClasses } from "../controllers/MyClasses/useMyClass";
import { useTeacherManagement } from "../controllers/MyClasses/useTeachersManagement";
import { useSubjectManagements } from "../controllers/Subjects/useSubjectManagements";
import { useExamResultManagement } from "../controllers/ExamResult/useExamResultManagement";

function AdminDashboard() {
  // UI STATE (LOCAL COMPONENT STATE)
  const [noticeTab, setNoticeTab] = useState("announcements");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [search, setSearch] = useState("");

  // ================= DASHBOARD HOOK =================
  const {
    navigate,

    sidebarOpen,
    sidebarHover,
    sidebarExpanded,
    profileOpen,
    mobileSearchOpen,
    showPassword,
    showNotifications,
    darkMode,

    setSidebarOpen,
    setSidebarHover,
    setProfileOpen,
    setMobileSearchOpen,
    setShowPassword,
    setShowNotifications,
    setDarkMode,

    bellRef,

    toggleTheme,
    toggleSidebar,
    closeSidebarOnMobile,
    handleSidebarMouseEnter,
    handleSidebarMouseLeave,
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

  // ================== Exam And Result Hook =================
  const {
    updateAdminResultMarks,
    updateMarksEntryPermission,
    examManagementOptions,
    examManagementStats,
    examManagementClasses,
    examManagementTerms,
    examManagementFilteredResults,

    examManagementForm,
    examManagementPublishForm,
    examManagementSelectedDetails,

    examManagementModalOpen,
    examManagementDetailsModalOpen,
    examManagementLoading,
    examManagementSaving,
    examManagementActionLoading,

    examManagementFilters,
    updateExamManagementFilter,
    resetExamManagementFilters,
    refreshExamManagement,

    updateExamManagementForm,
    toggleExamManagementFormArrayValue,
    openExamManagementModal,
    closeExamManagementModal,
    saveExamManagementExam,

    openExamManagementDetails,
    closeExamManagementDetails,
    verifyExamManagementExam,
    publishExamManagementExam,

    openExamManagementPublishModal,
    closeExamManagementPublishModal,
    updateExamManagementPublishForm,
    scheduleExamManagementPublish,

    exportExamManagementReportsPDF,
    exportExamManagementReportCardsPDF,
  } = useExamResultManagement({
    activeSection,
    fetchWithAuth,
    showToast,
  });

  // ================= ENROLLMENT HOOK =================
  const {
    enrollmentActiveTab,
    setEnrollmentActiveTab,

    studentEnrollmentForm,
    setStudentEnrollmentForm,
    handleStudentEnrollmentChange,
    submitStudentEnrollment,
    resetStudentEnrollmentForm,

    studentEnrollmentLoading,
    latestEnrolledStudent,

    enrollmentAcademicClasses,
    enrollmentBatches,
    enrollmentDivisions,
    enrollmentSections,

    studentPromotionForm,
    setStudentPromotionForm,
    studentPromotionLoading,
    promoteWholeClassStudents,

    studentReportFilters,
    setStudentReportFilters,
    studentReportRows,
    studentReportLoading,
    loadStudentReportRows,
    downloadStudentReportCSV,
  } = useStudentEnrollment({
    fetchWithAuth,
    showToast,
  });

  // ================= SUBJECTS HOOK =================
  const {
    subjects,
    subjectsLoading,
    subjectSaving,
    subjectForm,
    handleSubjectChange,
    isSubjectModalOpen,
    openSubjectModal,
    closeSubjectModal,
    subjectSearch,
    setSubjectSearch,
    subjectTypeFilter,
    setSubjectTypeFilter,
    subjectStatusFilter,
    setSubjectStatusFilter,
    resetSubjectFilters,
    loadSubjects,
    saveSubject,
    deleteSubject,
    subjectTypeOptions,
    subjectStats,
  } = useSubjectManagements({
    activeSection,
    fetchWithAuth,
    showToast,
  });

  // ================= STUDENTS HOOK =================
  const {
    myclasses,
    classesLoading,
    selectedMyClass,
    selectedStudent,
    myClassStudentSearch,
    setMyClassStudentSearch,
    isClassDetailOpen,
    isStudentProfileOpen,
    openClassDetail,
    closeClassDetail,
    openStudentProfile,
    closeStudentProfile,
    filteredStudents,
    divisionOptions,
    sectionOptions,
    classSearch,
    setClassSearch,
    divisionFilter,
    setDivisionFilter,
    sectionFilter,
    setSectionFilter,
    resetClassFilters,
    allClasses,
  } = useMyClasses({
    activeSection,
    fetchWithAuth,
    showToast,
  });

  // ================= Teacher Management HOOK =================
  const {
    teacherManagementTeachers,
    teacherManagementOptions,
    teacherManagementForm,
    teacherManagementSelectedTeacher,

    teacherManagementModalOpen,
    teacherManagementViewModalOpen,

    teacherManagementLoading,
    teacherManagementSaving,

    teacherManagementFilters,

    teacherManagementStats,

    updateTeacherManagementFilter,
    resetTeacherManagementFilter,

    loadTeacherManagementTeachers,
    loadTeacherManagementOptions,

    updateTeacherManagementForm,
    BLOOD_GROUPS,

    openTeacherManagementAddModal,
    openTeacherManagementEditModal,
    closeTeacherManagementModal,

    openTeacherManagementViewModal,
    closeTeacherManagementViewModal,

    addTeacherManagementAssignment,
    updateTeacherManagementAssignment,
    removeTeacherManagementAssignment,

    saveTeacherManagementTeacher,
    deleteTeacherManagementTeacher,
    updateTeacherManagementStatus,
  } = useTeacherManagement({
    activeSection,
    fetchWithAuth,
    showToast,
  });

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

    subjects: TTSubjects,
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

    // access
    isSuperAdmin,
    isHostelAdmin,
    isAccountsAdmin,
    isHRAdmin,
    canAccess,
    dashboardType,
    modules,

    // auth
    handleLogout,
  } = useAdminProfile({ fetchWithAuth, showToast });

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
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
        className={`sidebar fixed top-0 left-0 h-screen
    bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
    border-r border-gray-200 dark:border-slate-700
    shadow-2xl z-[60] flex flex-col
    transition-[width,transform] duration-300 ease-in-out
    ${sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"}
    md:translate-x-0
    ${sidebarExpanded ? "md:w-64" : "md:w-20"}
  `}
      >
        {/* LOGO */}
        <div
          className={`border-b border-gray-100 dark:border-slate-700
      flex items-center transition-all duration-300 ease-in-out
      ${sidebarExpanded ? "px-6 py-5 gap-2 justify-start" : "py-5 justify-center"}
    `}
        >
          <i
            className="bi bi-mortarboard text-purple-600 text-xl"
            title={!sidebarExpanded ? APP_NAME : ""}
          />

          <span
            className={`font-bold text-lg text-purple-600 whitespace-nowrap
        transition-all duration-300 ease-in-out overflow-hidden
        ${sidebarExpanded ? "opacity-100 max-w-[180px] ml-2" : "opacity-0 max-w-0 ml-0"}
      `}
          >
            {APP_NAME}
          </span>
        </div>

        {/* NAV */}
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
                ["accounts-dashboard", "bi-bank", "Accounts Dashboard"],
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
                ["hr-dashboard", "bi-people-fill", "HR Dashboard"],
              ],
            },
            {
              title: "RESOURCES",
              items: [
                ["library-dashboard", "bi-journal-bookmark", "Library"],
                ["assets", "bi-box-seam", "Assets"],
                ["hostels-dashboard", "bi-building", "Hostel"],
              ],
            },
            {
              title: "SYSTEM",
              items: [
                ["settings", "bi-gear", "Settings"],
                ["security", "bi-shield-check", "Security & Logs"],
              ],
            },
          ].map((section) => (
            <div key={section.title}>
              {sidebarExpanded && (
                <p className="text-xs text-gray-400 px-3 mt-4 transition-all duration-300">
                  {section.title}
                </p>
              )}

              {section.items.map(([key, icon, label]) => {
                const isDashboardLink = [
                  "library-dashboard",
                  "accounts-dashboard",
                  "hostels-dashboard",
                  "hr-dashboard",
                ].includes(key);

                const isActive = !isDashboardLink && activeSection === key;

                return (
                  <button
                    key={key}
                    type="button"
                    title={!sidebarExpanded ? label : ""}
                    onClick={() => {
                      if (key === "library-dashboard") {
                        navigate("/library-admin-dashboard", {
                          state: {
                            from: "super-admin-dashboard",
                            accessBy: "super_admin",
                            activeSection: "dashboard",
                          },
                        });

                        closeSidebarOnMobile();
                        return;
                      }

                      if (key === "accounts-dashboard") {
                        navigate("/accounts-admin-dashboard", {
                          state: {
                            from: "super-admin-dashboard",
                            accessBy: "super_admin",
                            activeSection: "dashboard",
                          },
                        });

                        closeSidebarOnMobile();
                        return;
                      }

                      if (key === "hostels-dashboard") {
                        navigate("/hostel-admin-dashboard", {
                          state: {
                            from: "super-admin-dashboard",
                            accessBy: "super_admin",
                            activeSection: "dashboard",
                          },
                        });

                        closeSidebarOnMobile();
                        return;
                      }

                      if (key === "hr-dashboard") {
                        navigate("/hr-admin-dashboard", {
                          state: {
                            from: "super-admin-dashboard",
                            accessBy: "super_admin",
                            activeSection: "dashboard",
                          },
                        });

                        closeSidebarOnMobile();
                        return;
                      }

                      setActiveSection(key);
                      closeSidebarOnMobile();
                    }}
                    className={`relative group flex w-full items-center
              ${
                sidebarExpanded
                  ? "gap-3 px-4 justify-start"
                  : "justify-center px-0"
              }
              py-3 rounded-xl transition-all duration-300 ease-in-out
              ${
                isActive
                  ? "bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-500/20 dark:to-indigo-500/20 text-purple-700 dark:text-purple-300 font-semibold shadow-sm"
                  : "text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-800 dark:hover:text-white"
              }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 bg-purple-600 rounded-r-full" />
                    )}

                    <i className={`bi ${icon} text-base shrink-0`} />

                    <span
                      className={`whitespace-nowrap truncate overflow-hidden
                transition-all duration-300 ease-in-out
                ${
                  sidebarExpanded
                    ? "opacity-100 max-w-[180px]"
                    : "opacity-0 max-w-0"
                }`}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        {/* FOOTER */}
        <div
          className={`border-t border-gray-100 dark:border-slate-700
      text-xs text-gray-400 dark:text-gray-500
      transition-all duration-300 ease-in-out
      ${sidebarExpanded ? "p-4 text-center" : "py-4 flex justify-center"}
    `}
        >
          {sidebarExpanded ? (
            <span className="whitespace-nowrap transition-all duration-300">
              {APP_NAME} © {APP_YEAR}
            </span>
          ) : (
            <i
              className="bi bi-mortarboard text-purple-500"
              title={`${APP_NAME} © ${APP_YEAR}`}
            />
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
          ${
            toast.type === "success" ? "bg-emerald-500/90" : "bg-indigo-500/90"
          }`}
              >
                {toast.message}
              </div>
            </div>
          )}

          {/* HEADER */}
          <header
            className="sticky top-0 z-40 flex items-center justify-between gap-4
      rounded-2xl border border-white/40 dark:border-slate-700
      bg-gradient-to-r from-white/75 via-white/65 to-white/75
      px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.08)]
      backdrop-blur-2xl transition-all duration-300
      dark:from-slate-800/85 dark:via-slate-800/75 dark:to-slate-800/85
      sm:px-6"
          >
            <div className="flex w-full items-center justify-between gap-3 sm:gap-4">
              {/* MOBILE BRAND */}
              <div className="flex shrink-0 items-center gap-2 md:hidden">
                <i className="bi bi-mortarboard text-lg text-indigo-600" />
                <span className="max-w-[145px] truncate text-sm font-bold text-indigo-600">
                  {APP_NAME}
                </span>
              </div>

              {/* DESKTOP SIDEBAR BUTTON */}
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                className="sidebar-toggle hidden h-10 w-10 shrink-0 items-center justify-center
          rounded-full bg-white/70 shadow-md backdrop-blur-md
          transition-all duration-300 hover:scale-105 hover:bg-white
          dark:bg-slate-700/70 dark:hover:bg-slate-600 md:flex"
              >
                <i
                  className={`bi ${
                    sidebarOpen ? "bi-chevron-left" : "bi-list"
                  } text-lg text-gray-700 transition-transform duration-300 dark:text-gray-200`}
                />
              </button>

              {/* DESKTOP SEARCH */}
              <div className="relative hidden w-full max-w-xl flex-1 px-2 md:block">
                <i className="bi bi-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-full border border-gray-200 bg-white/70 py-2.5 pl-10 pr-4
            text-sm text-gray-800 shadow-sm outline-none backdrop-blur-md
            transition-all duration-300 placeholder:text-gray-400
            hover:shadow-md focus:bg-white focus:ring-2 focus:ring-indigo-500
            dark:border-slate-600 dark:bg-slate-700/70 dark:text-white
            dark:placeholder:text-gray-400 dark:focus:bg-slate-700"
                  placeholder="Search anything here..."
                />
              </div>

              {/* RIGHT ACTIONS */}
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                {/* MOBILE SIDEBAR BUTTON */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSidebarOpen(true);
                  }}
                  aria-label="Open sidebar"
                  className="rounded-full bg-white/70 p-2.5 shadow-md backdrop-blur-md
            transition-all duration-300 hover:scale-105 hover:bg-white
            dark:bg-slate-700/70 dark:hover:bg-slate-600 md:hidden"
                >
                  <i className="bi bi-list text-lg text-gray-700 dark:text-gray-200" />
                </button>

                {/* MOBILE SEARCH BUTTON */}
                <button
                  type="button"
                  onClick={() => setMobileSearchOpen((prev) => !prev)}
                  aria-label="Toggle search"
                  className="rounded-full bg-white/70 p-2.5 shadow-md backdrop-blur-md
            transition-all duration-300 hover:scale-105 hover:bg-white
            dark:bg-slate-700/70 dark:hover:bg-slate-600 md:hidden"
                >
                  <i className="bi bi-search text-lg text-gray-700 dark:text-gray-200" />
                </button>

                {/* NOTIFICATIONS */}
                <div ref={bellRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowNotifications((prev) => !prev)}
                    aria-label="Notifications"
                    className="relative rounded-full bg-white/70 p-2.5 shadow-md backdrop-blur-md
              transition-all duration-300 hover:scale-105 hover:bg-white
              dark:bg-slate-700/70 dark:hover:bg-slate-600"
                  >
                    <i className="bi bi-bell text-lg text-gray-700 dark:text-gray-200" />

                    {totalUnread > 0 && (
                      <span
                        className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px]
                  items-center justify-center rounded-full bg-gradient-to-r
                  from-red-500 to-pink-500 px-1 text-[10px] text-white shadow animate-pulse"
                      >
                        {totalUnread > 99 ? "99+" : totalUnread}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div
                      className="fixed left-1/2 top-20 z-[70] w-[92vw] max-w-md
                -translate-x-1/2 overflow-hidden rounded-2xl border border-white/40
                bg-white/95 shadow-2xl backdrop-blur-2xl animate-fadeIn
                dark:border-slate-700 dark:bg-slate-800/95 md:absolute md:left-auto
                md:right-0 md:top-[calc(100%+12px)] md:w-96 md:translate-x-0"
                    >
                      <div className="flex items-center justify-between border-b p-4 font-semibold text-gray-800 dark:border-slate-700 dark:text-white">
                        <span>Notifications</span>

                        <button
                          type="button"
                          onClick={() => setShowNotifications(false)}
                          className="text-xs text-gray-500 transition hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="max-h-80 overflow-y-auto">
                        {(sortedNotifications || []).filter(
                          (item) => !item.is_read,
                        ).length === 0 ? (
                          <p className="p-4 text-center text-sm text-gray-500">
                            🎉 You're all caught up
                          </p>
                        ) : (
                          (sortedNotifications || [])
                            .filter((item) => !item.is_read)
                            .slice(0, 5)
                            .map((item) => (
                              <button
                                type="button"
                                key={`${item.source}-${item.id}-${item.time || item.date}`}
                                onClick={() =>
                                  handleNotificationClick &&
                                  handleNotificationClick(item)
                                }
                                className="w-full border-b p-4 text-left text-sm transition
                          hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700"
                              >
                                <p className="flex items-center gap-2 truncate text-gray-800 dark:text-white">
                                  {item.source === "leave" ? "📩" : "📢"}{" "}
                                  {item.title}
                                </p>

                                <p className="mt-1 truncate text-xs text-gray-500">
                                  {item.message || ""}
                                </p>

                                <p className="mt-1 text-xs text-gray-400">
                                  {item.time}
                                </p>
                              </button>
                            ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* PROFILE */}
                <div
                  className="profile-menu relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setProfileOpen((prev) => !prev)}
                    className="flex items-center gap-2 rounded-full
              bg-gradient-to-r from-white/70 to-white/60 px-2 py-1.5 shadow-md
              backdrop-blur-md transition-all duration-300 hover:scale-105
              dark:from-slate-700/70 dark:to-slate-700/60"
                  >
                    <img
                      src="https://i.pravatar.cc/100"
                      alt="Admin profile"
                      className="h-9 w-9 rounded-full border-2 border-white shadow dark:border-slate-600"
                    />

                    <span className="hidden max-w-[120px] truncate text-sm font-medium text-gray-800 dark:text-gray-200 sm:inline">
                      {admin?.first_name || "Admin"}
                    </span>

                    <i className="bi bi-chevron-down hidden text-xs text-gray-500 sm:inline dark:text-gray-400" />
                  </button>

                  {profileOpen && (
                    <div
                      className="absolute right-0 z-50 mt-4 w-56 overflow-hidden rounded-2xl
                border border-white/40 bg-white/95 shadow-2xl backdrop-blur-2xl
                dark:border-slate-700 dark:bg-slate-800/95"
                    >
                      <div className="border-b px-4 py-4 dark:border-slate-700">
                        <p className="font-semibold text-gray-800 dark:text-white">
                          {admin?.first_name} {admin?.last_name}
                        </p>
                      </div>

                      <ul className="py-2 text-sm">
                        <li
                          onClick={() => {
                            setActiveSection("profile");
                            setProfileOpen(false);
                          }}
                          className="flex cursor-pointer items-center gap-2 px-4 py-2
                    text-gray-700 transition hover:bg-gray-100 dark:text-gray-200
                    dark:hover:bg-slate-700"
                        >
                          <i className="fa-solid fa-user text-gray-500 dark:text-gray-400" />
                          My Profile
                        </li>

                        <li
                          onClick={() => {
                            setPasswordModalOpen(true);
                            setProfileOpen(false);
                          }}
                          className="flex cursor-pointer items-center gap-2 px-4 py-2
                    text-gray-700 transition hover:bg-gray-100 dark:text-gray-200
                    dark:hover:bg-slate-700"
                        >
                          <i className="fa-solid fa-lock text-gray-500 dark:text-gray-400" />
                          Password Change
                        </li>

                        <li
                          onClick={toggleTheme}
                          className="flex cursor-pointer items-center justify-between px-4 py-2
                    transition hover:bg-gray-100 dark:hover:bg-slate-700"
                        >
                          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                            <i className="bi bi-moon text-gray-500 dark:text-gray-400" />
                            <span>Dark Mode</span>
                          </div>

                          <span className="text-xs text-gray-400">
                            {darkMode ? "ON" : "OFF"}
                          </span>
                        </li>
                      </ul>

                      <div className="border-t dark:border-slate-700">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full px-4 py-3 text-left text-sm text-red-600
                    transition hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                          <i className="bi bi-box-arrow-right me-2" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* MOBILE SEARCH */}
          {mobileSearchOpen && (
            <div className="animate-fadeIn md:hidden">
              <div className="relative">
                <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-3 pl-11
            text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-indigo-500
            dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  placeholder="Search anything here..."
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>
        {/* ===================== DASHBOARD SECTION START =========================== */}
        {activeSection === "dashboard" && (
          <section>
            <h1>hello Super Admin</h1>
          </section>
        )}

        {/* =========================== TEACHERS SECTION START ============================ */}
        {activeSection === "teachers" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Teachers Management
                  </h2>
                  <p className="text-xs sm:text-sm opacity-90">
                    Add, update, delete and assign teachers to classes and
                    subjects
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openTeacherManagementAddModal}
                  className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium shadow"
                >
                  + Add Teacher
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl shadow text-center">
                <p className="text-xs text-gray-500">Total Teachers</p>
                <h2 className="font-bold text-lg">
                  {teacherManagementStats.total}
                </h2>
              </div>

              <div className="bg-white p-4 rounded-xl shadow text-center">
                <p className="text-xs text-gray-500">Active</p>
                <h2 className="font-bold text-green-600 text-lg">
                  {teacherManagementStats.active}
                </h2>
              </div>

              <div className="bg-white p-4 rounded-xl shadow text-center">
                <p className="text-xs text-gray-500">Inactive</p>
                <h2 className="font-bold text-red-500 text-lg">
                  {teacherManagementStats.inactive}
                </h2>
              </div>

              <div className="bg-white p-4 rounded-xl shadow text-center">
                <p className="text-xs text-gray-500">Suspended</p>
                <h2 className="font-bold text-indigo-600 text-lg">
                  {teacherManagementStats.suspended}
                </h2>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1">
                <label className="text-xs text-gray-500">Search Teacher</label>
                <input
                  type="text"
                  value={teacherManagementFilters.q}
                  onChange={(e) =>
                    updateTeacherManagementFilter("q", e.target.value)
                  }
                  placeholder="Search name, email, mobile, username..."
                  className="input mt-1 w-full"
                />
              </div>

              <div className="w-full sm:w-48">
                <label className="text-xs text-gray-500">Status</label>
                <select
                  value={teacherManagementFilters.status}
                  onChange={(e) =>
                    updateTeacherManagementFilter("status", e.target.value)
                  }
                  className="input mt-1 w-full"
                >
                  <option value="">All</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={loadTeacherManagementTeachers}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
                >
                  Apply
                </button>

                <button
                  type="button"
                  onClick={resetTeacherManagementFilter}
                  className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-100"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Teacher List</h3>

                {teacherManagementLoading && (
                  <span className="text-xs text-gray-500">Loading...</span>
                )}
              </div>

              <div className="space-y-3">
                {!teacherManagementLoading &&
                  teacherManagementTeachers.length === 0 && (
                    <div className="text-center py-10 text-sm text-gray-500">
                      No teachers found
                    </div>
                  )}

                {teacherManagementTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="border rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <h4 className="font-semibold text-gray-800">
                        {teacher.full_name ||
                          `${teacher.first_name || ""} ${teacher.last_name || ""}`}
                      </h4>

                      <p className="text-xs text-gray-500">
                        {teacher.teacher_id} • {teacher.email || "No email"} •{" "}
                        {teacher.mobile || "No mobile"}
                      </p>

                      <p className="text-xs text-gray-500">
                        {teacher.designation || "Teacher"} •{" "}
                        {teacher.specialization || "No specialization"}
                      </p>

                      <div className="flex flex-wrap gap-2 mt-2">
                        {(teacher.assignments || []).length === 0 ? (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">
                            No class assigned
                          </span>
                        ) : (
                          teacher.assignments.map((a) => (
                            <span
                              key={
                                a.id || `${a.academic_class_id}-${a.subject_id}`
                              }
                              className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded"
                            >
                              {a.class_name || "Class"} •{" "}
                              {a.subject_name || "Subject"}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={teacher.status || "Active"}
                        onChange={(e) =>
                          updateTeacherManagementStatus(
                            teacher.id,
                            e.target.value,
                          )
                        }
                        className="input text-xs"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Suspended">Suspended</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => openTeacherManagementViewModal(teacher)}
                        className="px-3 py-2 rounded-lg border text-xs hover:bg-gray-100"
                      >
                        View
                      </button>

                      <button
                        type="button"
                        onClick={() => openTeacherManagementEditModal(teacher)}
                        className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteTeacherManagementTeacher(teacher.id)
                        }
                        className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ADD / EDIT TEACHER MODAL */}
        {teacherManagementModalOpen && (
          <div className="fixed inset-0 md:pl-64 z-50 bg-slate-950/60 backdrop-blur-md p-2 sm:p-4">
            <div className="h-full w-full flex items-center justify-center">
              <div className="w-full max-w-7xl max-h-[95vh] overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-white/20 dark:border-slate-700">
                {/* HEADER */}
                <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                        Teacher Management
                      </p>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                        {teacherManagementForm.id
                          ? "Update Teacher"
                          : "Add New Teacher"}
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Fill teacher profile, employment details and assign
                        classes with subjects.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeTeacherManagementModal}
                      className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto max-h-[calc(95vh-84px)] p-4 sm:p-6 space-y-6">
                  {/* NAME HERO */}
                  <div className="rounded-3xl p-4 sm:p-6 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          First Name *
                        </label>
                        <input
                          type="text"
                          value={teacherManagementForm.first_name || ""}
                          onChange={(e) =>
                            updateTeacherManagementForm(
                              "first_name",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-xl border-0 bg-white/95 px-4 py-2.5 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-white"
                          placeholder="Enter first name"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          Middle Name
                        </label>
                        <input
                          type="text"
                          value={teacherManagementForm.middle_name || ""}
                          onChange={(e) =>
                            updateTeacherManagementForm(
                              "middle_name",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-xl border-0 bg-white/95 px-4 py-2.5 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-white"
                          placeholder="Enter middle name"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          value={teacherManagementForm.last_name || ""}
                          onChange={(e) =>
                            updateTeacherManagementForm(
                              "last_name",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-xl border-0 bg-white/95 px-4 py-2.5 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-white"
                          placeholder="Enter last name"
                        />
                      </div>
                    </div>
                  </div>

                  {/* FORM GRID */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                    {/* Personal */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm space-y-4">
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        👤 Personal Info
                      </h3>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={teacherManagementForm.date_of_birth || ""}
                          onChange={(e) =>
                            updateTeacherManagementForm(
                              "date_of_birth",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Gender
                        </label>
                        <select
                          value={teacherManagementForm.gender || ""}
                          onChange={(e) =>
                            updateTeacherManagementForm(
                              "gender",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm outline-none"
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Mobile Number
                        </label>
                        <input
                          type="text"
                          value={teacherManagementForm.mobile || ""}
                          onChange={(e) =>
                            updateTeacherManagementForm(
                              "mobile",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm outline-none"
                          placeholder="Enter mobile number"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          value={teacherManagementForm.email || ""}
                          onChange={(e) =>
                            updateTeacherManagementForm("email", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm outline-none"
                          placeholder="teacher@example.com"
                        />
                      </div>
                    </div>

                    {/* Professional */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm space-y-4">
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        💼 Professional
                      </h3>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Teacher ID
                        </label>
                        <input
                          type="text"
                          value={teacherManagementForm.teacher_id || ""}
                          onChange={(e) =>
                            updateTeacherManagementForm(
                              "teacher_id",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm outline-none"
                          placeholder="Auto generated if empty"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Designation
                        </label>
                        <input
                          type="text"
                          value={teacherManagementForm.designation || ""}
                          onChange={(e) =>
                            updateTeacherManagementForm(
                              "designation",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm outline-none"
                          placeholder="Math Teacher"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Specialization
                        </label>
                        <input
                          type="text"
                          value={teacherManagementForm.specialization || ""}
                          onChange={(e) =>
                            updateTeacherManagementForm(
                              "specialization",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm outline-none"
                          placeholder="Mathematics"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Status
                        </label>
                        <select
                          value={teacherManagementForm.status || "Active"}
                          onChange={(e) =>
                            updateTeacherManagementForm(
                              "status",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm outline-none"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Suspended">Suspended</option>
                        </select>
                      </div>
                    </div>

                    {/* Academic */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm space-y-4">
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        🎓 Academic
                      </h3>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Highest Degree
                        </label>
                        <input
                          type="text"
                          value={teacherManagementForm.degree || ""}
                          onChange={(e) =>
                            updateTeacherManagementForm(
                              "degree",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          University
                        </label>
                        <input
                          type="text"
                          value={teacherManagementForm.university || ""}
                          onChange={(e) =>
                            updateTeacherManagementForm(
                              "university",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Experience Years
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={teacherManagementForm.experience_years || ""}
                          onChange={(e) =>
                            updateTeacherManagementForm(
                              "experience_years",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm outline-none"
                        />
                      </div>

                      <select
                        value={teacherManagementForm.blood_group || ""}
                        onChange={(e) =>
                          updateTeacherManagementForm(
                            "blood_group",
                            e.target.value,
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm outline-none"
                      >
                        <option value="">Select Blood Group</option>

                        {BLOOD_GROUPS.map((group) => (
                          <option key={group} value={group}>
                            {group}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Employment */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm space-y-4">
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        🏢 Employment
                      </h3>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Joining Date
                        </label>
                        <input
                          type="date"
                          value={teacherManagementForm.joining_date || ""}
                          onChange={(e) =>
                            updateTeacherManagementForm(
                              "joining_date",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Employment Type
                        </label>
                        <select
                          value={
                            teacherManagementForm.employment_type || "Full Time"
                          }
                          onChange={(e) =>
                            updateTeacherManagementForm(
                              "employment_type",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm outline-none"
                        >
                          <option value="Full Time">Full Time</option>
                          <option value="Part Time">Part Time</option>
                          <option value="Contract">Contract</option>
                          <option value="Temporary">Temporary</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Shift
                        </label>
                        <select
                          value={teacherManagementForm.shift || "Morning"}
                          onChange={(e) =>
                            updateTeacherManagementForm("shift", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm outline-none"
                        >
                          <option value="Morning">Morning</option>
                          <option value="Evening">Evening</option>
                        </select>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm space-y-4">
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        📍 Address
                      </h3>

                      {["address", "city", "state", "pincode"].map((field) => (
                        <div key={field}>
                          <label className="block text-xs font-medium text-slate-500 mb-1 capitalize">
                            {field === "pincode" ? "Pincode" : field}
                          </label>
                          <input
                            type="text"
                            value={teacherManagementForm[field] || ""}
                            onChange={(e) =>
                              updateTeacherManagementForm(field, e.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm outline-none"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Health + Emergency + System */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm space-y-4">
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        🆘 Health & System
                      </h3>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Medical Conditions
                        </label>
                        <input
                          type="text"
                          value={teacherManagementForm.medical_condition || ""}
                          onChange={(e) =>
                            updateTeacherManagementForm(
                              "medical_condition",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Emergency Name
                        </label>
                        <input
                          type="text"
                          value={teacherManagementForm.emergency_name || ""}
                          onChange={(e) =>
                            updateTeacherManagementForm(
                              "emergency_name",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Emergency Relation
                        </label>
                        <input
                          type="text"
                          value={teacherManagementForm.emergency_relation || ""}
                          onChange={(e) =>
                            updateTeacherManagementForm(
                              "emergency_relation",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Emergency Phone
                        </label>
                        <input
                          type="text"
                          value={teacherManagementForm.emergency_phone || ""}
                          onChange={(e) =>
                            updateTeacherManagementForm(
                              "emergency_phone",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Username
                        </label>
                        <input
                          type="text"
                          value={teacherManagementForm.username || ""}
                          onChange={(e) =>
                            updateTeacherManagementForm(
                              "username",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Password
                        </label>
                        <input
                          type="password"
                          value={teacherManagementForm.password || ""}
                          onChange={(e) =>
                            updateTeacherManagementForm(
                              "password",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm outline-none"
                          placeholder={
                            teacherManagementForm.id
                              ? "Leave blank to keep old password"
                              : "Enter password"
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* ASSIGNMENTS */}
                  <div className="rounded-3xl border border-indigo-100 dark:border-slate-700 bg-indigo-50/70 dark:bg-slate-800 p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">
                          Multiple Class & Subject Assignments
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Add multiple classes and subjects for this teacher.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={addTeacherManagementAssignment}
                        className="w-full sm:w-auto rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 text-sm font-semibold"
                      >
                        + Add Class & Subject
                      </button>
                    </div>

                    {(teacherManagementForm.assignments || []).length === 0 && (
                      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-900/40 p-6 text-center text-sm text-slate-500">
                        No assignment added yet. Click “Add Class & Subject”.
                      </div>
                    )}

                    <div className="space-y-3">
                      {(teacherManagementForm.assignments || []).map(
                        (assignment, index) => (
                          <div
                            key={index}
                            className="grid grid-cols-1 md:grid-cols-12 gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4"
                          >
                            <div className="md:col-span-1 flex items-center">
                              <span className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                {index + 1}
                              </span>
                            </div>

                            <div className="md:col-span-5">
                              <label className="block text-xs font-medium text-slate-500 mb-1">
                                Class
                              </label>
                              <select
                                value={assignment.academic_class_id || ""}
                                onChange={(e) =>
                                  updateTeacherManagementAssignment(
                                    index,
                                    "academic_class_id",
                                    e.target.value,
                                  )
                                }
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm outline-none"
                              >
                                <option value="">Select Class</option>
                                {(
                                  teacherManagementOptions.academic_classes ||
                                  []
                                ).map((cls) => (
                                  <option key={cls.id} value={cls.id}>
                                    {cls.display_name}
                                    {cls.batch_name
                                      ? ` (${cls.batch_name})`
                                      : ""}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="md:col-span-4">
                              <label className="block text-xs font-medium text-slate-500 mb-1">
                                Subject
                              </label>
                              <select
                                value={assignment.subject_id || ""}
                                onChange={(e) =>
                                  updateTeacherManagementAssignment(
                                    index,
                                    "subject_id",
                                    e.target.value,
                                  )
                                }
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm outline-none"
                              >
                                <option value="">Select Subject</option>
                                {(teacherManagementOptions.subjects || []).map(
                                  (subject) => (
                                    <option key={subject.id} value={subject.id}>
                                      {subject.subject_name}
                                    </option>
                                  ),
                                )}
                              </select>
                            </div>

                            <div className="md:col-span-2 flex items-end">
                              <button
                                type="button"
                                onClick={() =>
                                  removeTeacherManagementAssignment(index)
                                }
                                className="w-full rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 px-4 py-2.5 text-sm font-semibold hover:bg-red-100"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  {/* FOOTER */}
                  <div className="sticky bottom-0 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-4">
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                      <button
                        type="button"
                        onClick={closeTeacherManagementModal}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={saveTeacherManagementTeacher}
                        disabled={teacherManagementSaving}
                        className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm disabled:opacity-60"
                      >
                        {teacherManagementSaving
                          ? "Saving..."
                          : teacherManagementForm.id
                            ? "Update Teacher"
                            : "Save Teacher"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW TEACHER MODAL */}
        {teacherManagementViewModalOpen && teacherManagementSelectedTeacher && (
          <div className="fixed inset-0 md:pl-64 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-5 relative">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    {teacherManagementSelectedTeacher.full_name}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {teacherManagementSelectedTeacher.teacher_id} •{" "}
                    {teacherManagementSelectedTeacher.status}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeTeacherManagementViewModal}
                  className="text-gray-500 text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="border rounded-xl p-4">
                  <h4 className="font-semibold mb-2">Contact</h4>
                  <p>Email: {teacherManagementSelectedTeacher.email || "-"}</p>
                  <p>
                    Mobile: {teacherManagementSelectedTeacher.mobile || "-"}
                  </p>
                  <p>
                    Username: {teacherManagementSelectedTeacher.username || "-"}
                  </p>
                </div>

                <div className="border rounded-xl p-4">
                  <h4 className="font-semibold mb-2">Professional</h4>
                  <p>
                    Designation:{" "}
                    {teacherManagementSelectedTeacher.designation || "-"}
                  </p>
                  <p>
                    Specialization:{" "}
                    {teacherManagementSelectedTeacher.specialization || "-"}
                  </p>
                  <p>
                    Experience:{" "}
                    {teacherManagementSelectedTeacher.experience_years || 0}{" "}
                    years
                  </p>
                </div>

                <div className="border rounded-xl p-4">
                  <h4 className="font-semibold mb-2">Employment</h4>
                  <p>
                    Joining:{" "}
                    {teacherManagementSelectedTeacher.joining_date || "-"}
                  </p>
                  <p>
                    Type:{" "}
                    {teacherManagementSelectedTeacher.employment_type || "-"}
                  </p>
                  <p>Shift: {teacherManagementSelectedTeacher.shift || "-"}</p>
                </div>

                <div className="border rounded-xl p-4">
                  <h4 className="font-semibold mb-2">Emergency</h4>
                  <p>
                    Name:{" "}
                    {teacherManagementSelectedTeacher.emergency_name || "-"}
                  </p>
                  <p>
                    Relation:{" "}
                    {teacherManagementSelectedTeacher.emergency_relation || "-"}
                  </p>
                  <p>
                    Phone:{" "}
                    {teacherManagementSelectedTeacher.emergency_phone || "-"}
                  </p>
                </div>
              </div>

              <div className="border rounded-xl p-4 mt-4">
                <h4 className="font-semibold mb-2">
                  Assigned Classes & Subjects
                </h4>

                {(teacherManagementSelectedTeacher.assignments || []).length ===
                0 ? (
                  <p className="text-sm text-gray-500">No assignments</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {teacherManagementSelectedTeacher.assignments.map((a) => (
                      <span
                        key={a.id || `${a.academic_class_id}-${a.subject_id}`}
                        className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded"
                      >
                        {a.class_name || "Class"} •{" "}
                        {a.subject_name || "Subject"}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => {
                    closeTeacherManagementViewModal();
                    openTeacherManagementEditModal(
                      teacherManagementSelectedTeacher,
                    );
                  }}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={closeTeacherManagementViewModal}
                  className="px-5 py-2 border rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        {/* =========================== TEACHERS SECTION END ============================ */}
        {/*  ============================= MY CLASSES START =============================  */}
        {activeSection === "students" && (
          <section className="section p-4 sm:p-6 space-y-6 hidden active">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 sm:p-6 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Students Management
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Manage students, profiles and academic records
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveSection("admissions");
                    // setEnrollmentActiveTab("enrollment"); // optional
                  }}
                  className="bg-white text-indigo-600 px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg hover:bg-indigo-50 transition-all duration-200"
                >
                  <i className="bi bi-person-plus-fill me-2"></i>
                  Add Student
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Search class, batch, subject..."
                value={classSearch}
                onChange={(e) => setClassSearch(e.target.value)}
                className="px-4 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl text-sm outline-none"
              />

              <select
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value)}
                className="px-4 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl text-sm outline-none"
              >
                <option value="">All Divisions</option>
                {(divisionOptions || []).map((division) => (
                  <option key={division} value={division}>
                    {division}
                  </option>
                ))}
              </select>

              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="px-4 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl text-sm outline-none"
              >
                <option value="">All Sections</option>
                {(sectionOptions || []).map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={resetClassFilters}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm font-medium"
              >
                Reset
              </button>
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
              {filteredStudents?.length > 0 ? (
                filteredStudents.map((student) => (
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
        {/* ================== ENROLLMENT SECTION START ================= */}
        {activeSection === "admissions" && (
          <section
            className="section active p-4 sm:p-6 space-y-6"
            id="admissionsSection"
          >
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 sm:p-6 text-white shadow-lg">
              <h2 className="text-xl sm:text-2xl font-semibold">
                Student Admissions
              </h2>
              <p className="text-xs sm:text-sm opacity-90">
                Manage students, promotions & reports
              </p>
            </div>

            {/* TABS */}
            <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl shadow text-sm">
              {["enroll", "promote", "report"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setEnrollmentActiveTab(tab)}
                  className={`tab-btn px-4 py-2 rounded-lg transition-all ${
                    enrollmentActiveTab === tab
                      ? "bg-indigo-600 text-white shadow"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  {tab === "enroll" && "Enroll Student"}
                  {tab === "promote" && "Promote Students"}
                  {tab === "report" && "Download Reports"}
                </button>
              ))}
            </div>

            {/* ENROLL TAB */}
            {enrollmentActiveTab === "enroll" && (
              <div className="rounded-3xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in duration-300">
                <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-5 sm:p-7 text-white">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-indigo-100">
                        Student Application
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-bold mt-1">
                        New Student Enrollment
                      </h2>
                      <p className="text-sm text-indigo-100 mt-2 max-w-2xl">
                        Add student personal details, parent information,
                        academic assignment and login credentials.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                      <div className="rounded-2xl bg-white/15 backdrop-blur px-4 py-3">
                        <p className="text-[11px] text-indigo-100">
                          Student ID
                        </p>
                        <h4 className="font-bold text-sm">
                          {studentEnrollmentForm.studentID || "Auto"}
                        </h4>
                      </div>

                      <div className="rounded-2xl bg-white/15 backdrop-blur px-4 py-3">
                        <p className="text-[11px] text-indigo-100">User ID</p>
                        <h4 className="font-bold text-sm">
                          {studentEnrollmentForm.userID || "Auto"}
                        </h4>
                      </div>

                      <div className="rounded-2xl bg-white/15 backdrop-blur px-4 py-3 col-span-2 sm:col-span-1">
                        <p className="text-[11px] text-indigo-100">Roll No</p>
                        <h4 className="font-bold text-sm">
                          {studentEnrollmentForm.rollNumber || "Auto"}
                        </h4>
                      </div>
                    </div>
                  </div>
                </div>

                <form
                  className="p-4 sm:p-6 lg:p-8 space-y-8"
                  onSubmit={submitStudentEnrollment}
                >
                  {/* BASIC INFORMATION */}
                  <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-10 w-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <i className="bi bi-person-fill"></i>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">
                          Basic Information
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Student identity and contact details
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="firstName"
                          value={studentEnrollmentForm.firstName}
                          onChange={handleStudentEnrollmentChange}
                          type="text"
                          placeholder="Enter first name"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Middle Name
                        </label>
                        <input
                          id="middleName"
                          value={studentEnrollmentForm.middleName}
                          onChange={handleStudentEnrollmentChange}
                          type="text"
                          placeholder="Enter middle name"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="lastName"
                          value={studentEnrollmentForm.lastName}
                          onChange={handleStudentEnrollmentChange}
                          type="text"
                          placeholder="Enter last name"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Email Address
                        </label>
                        <input
                          id="studentEmail"
                          value={studentEnrollmentForm.studentEmail}
                          onChange={handleStudentEnrollmentChange}
                          type="email"
                          placeholder="student@example.com"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Mobile Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="studentMobile"
                          value={studentEnrollmentForm.studentMobile}
                          onChange={handleStudentEnrollmentChange}
                          type="text"
                          placeholder="Enter mobile number"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Gender
                        </label>
                        <select
                          id="gender"
                          value={studentEnrollmentForm.gender}
                          onChange={handleStudentEnrollmentChange}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Date of Birth
                        </label>
                        <input
                          id="dob"
                          value={studentEnrollmentForm.dob}
                          onChange={handleStudentEnrollmentChange}
                          type="date"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Blood Group
                        </label>
                        <select
                          id="bloodGroup"
                          value={studentEnrollmentForm.bloodGroup}
                          onChange={handleStudentEnrollmentChange}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select blood group</option>
                          {[
                            "A+",
                            "A-",
                            "B+",
                            "B-",
                            "AB+",
                            "AB-",
                            "O+",
                            "O-",
                          ].map((group) => (
                            <option key={group} value={group}>
                              {group}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* PARENT DETAILS */}
                  <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-10 w-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
                        <i className="bi bi-people-fill"></i>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">
                          Parent Details
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Father and mother contact information
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {[
                        [
                          "fatherName",
                          "Father Name",
                          "Enter father name",
                          "text",
                        ],
                        [
                          "fatherMobile",
                          "Father Mobile",
                          "Enter father mobile",
                          "text",
                        ],
                        [
                          "fatherEmail",
                          "Father Email",
                          "father@example.com",
                          "email",
                        ],
                        [
                          "motherName",
                          "Mother Name",
                          "Enter mother name",
                          "text",
                        ],
                        [
                          "motherMobile",
                          "Mother Mobile",
                          "Enter mother mobile",
                          "text",
                        ],
                        [
                          "motherEmail",
                          "Mother Email",
                          "mother@example.com",
                          "email",
                        ],
                      ].map(([id, label, placeholder, type]) => (
                        <div key={id}>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            {label}
                          </label>
                          <input
                            id={id}
                            value={studentEnrollmentForm[id]}
                            onChange={handleStudentEnrollmentChange}
                            type={type}
                            placeholder={placeholder}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ACADEMIC ASSIGNMENT */}
                  <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-10 w-10 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center">
                        <i className="bi bi-mortarboard-fill"></i>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">
                          Academic Assignment
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Select batch, division and section. Roll number is
                          auto assigned.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Batch <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="enrollBatch"
                          value={studentEnrollmentForm.enrollBatch}
                          onChange={handleStudentEnrollmentChange}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                          required
                        >
                          <option value="">Select batch</option>
                          {enrollmentBatches.map((batch) => (
                            <option key={batch} value={batch}>
                              {batch}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Division / Class{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="enrollDivision"
                          value={studentEnrollmentForm.enrollDivision}
                          onChange={handleStudentEnrollmentChange}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                          required
                        >
                          <option value="">Select division</option>
                          {enrollmentDivisions.map((division) => (
                            <option key={division} value={division}>
                              {division}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Section <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="enrollSection"
                          value={studentEnrollmentForm.enrollSection}
                          onChange={handleStudentEnrollmentChange}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                          required
                        >
                          <option value="">Select section</option>
                          {enrollmentSections.map((section) => (
                            <option key={section} value={section}>
                              {section}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Roll Number
                        </label>
                        <input
                          id="rollNumber"
                          value={studentEnrollmentForm.rollNumber}
                          readOnly
                          type="number"
                          placeholder="Auto roll number"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-4 py-3 text-sm outline-none text-slate-500 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ADDITIONAL INFO */}
                  <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-10 w-10 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
                        <i className="bi bi-file-earmark-text-fill"></i>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">
                          Additional Information
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Admission, address and medical details
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Admission Date
                        </label>
                        <input
                          id="admissionDate"
                          value={studentEnrollmentForm.admissionDate}
                          onChange={handleStudentEnrollmentChange}
                          type="date"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Previous School
                        </label>
                        <input
                          id="prevSchool"
                          value={studentEnrollmentForm.prevSchool}
                          onChange={handleStudentEnrollmentChange}
                          type="text"
                          placeholder="Enter previous school"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Residential Address
                        </label>
                        <textarea
                          id="address"
                          value={studentEnrollmentForm.address}
                          onChange={handleStudentEnrollmentChange}
                          placeholder="Enter full residential address"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-500 min-h-[110px] resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Medical Conditions / Allergies
                        </label>
                        <textarea
                          id="medical"
                          value={studentEnrollmentForm.medical}
                          onChange={handleStudentEnrollmentChange}
                          placeholder="Enter medical conditions, allergies or notes"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-500 min-h-[110px] resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SYSTEM CREDENTIALS */}
                  <div className="rounded-3xl border border-indigo-100 dark:border-slate-700 bg-indigo-50/70 dark:bg-slate-800 p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                        <i className="bi bi-shield-lock-fill"></i>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">
                          System Credentials
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Student ID and User ID are generated automatically
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Student ID
                        </label>
                        <input
                          id="studentID"
                          value={studentEnrollmentForm.studentID}
                          readOnly
                          type="text"
                          placeholder="Auto student ID"
                          className="w-full rounded-xl border border-indigo-100 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none text-slate-500 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          User ID / Username
                        </label>
                        <input
                          id="userID"
                          value={studentEnrollmentForm.userID}
                          readOnly
                          type="text"
                          placeholder="Auto username"
                          className="w-full rounded-xl border border-indigo-100 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none text-slate-500 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Password
                        </label>
                        <input
                          id="password"
                          value={studentEnrollmentForm.password}
                          onChange={handleStudentEnrollmentChange}
                          type="password"
                          placeholder="Enter password"
                          className="w-full rounded-xl border border-indigo-100 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Account Status
                        </label>
                        <select
                          id="status"
                          value={studentEnrollmentForm.status}
                          onChange={handleStudentEnrollmentChange}
                          className="w-full rounded-xl border border-indigo-100 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {latestEnrolledStudent && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 p-4 text-sm flex items-start gap-3">
                      <i className="bi bi-check-circle-fill text-lg"></i>
                      <div>
                        <p className="font-semibold">
                          Student enrolled successfully
                        </p>
                        <p className="mt-1">
                          Student ID: <b>{latestEnrolledStudent.student_id}</b>
                          {latestEnrolledStudent.password && (
                            <>
                              {" "}
                              | Password:{" "}
                              <b>{latestEnrolledStudent.password}</b>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ACTION BUTTONS */}
                  <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 -mb-4 sm:-mb-6 lg:-mb-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700 p-4 sm:p-6">
                    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
                      <button
                        type="button"
                        onClick={resetStudentEnrollmentForm}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      >
                        Reset Form
                      </button>

                      <button
                        disabled={studentEnrollmentLoading}
                        type="submit"
                        className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl shadow-lg font-bold transition"
                      >
                        {studentEnrollmentLoading
                          ? "Enrolling..."
                          : "Enroll Student"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* PROMOTE TAB */}
            {enrollmentActiveTab === "promote" && (
              <div className="bg-white p-6 rounded-xl shadow animate-in fade-in duration-300">
                <h3 className="font-bold text-lg mb-4 text-orange-600">
                  Mass Promotion Module
                </h3>

                <div className="bg-orange-50 p-4 rounded-lg mb-6 text-sm text-orange-800 border border-orange-100">
                  ⚠️ This will move all current students from selected class to
                  destination class.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <p className="font-semibold text-gray-500 uppercase text-xs">
                      From Current
                    </p>

                    <select
                      value={studentPromotionForm.source_class_id}
                      onChange={(e) =>
                        setStudentPromotionForm((p) => ({
                          ...p,
                          source_class_id: e.target.value,
                        }))
                      }
                      className="input w-full border p-2 rounded-lg"
                    >
                      <option value="">Select Source Class</option>
                      {enrollmentAcademicClasses.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.batch_name} - {cls.division_name} -{" "}
                          {cls.section_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-4">
                    <p className="font-semibold text-gray-500 uppercase text-xs">
                      To Destination
                    </p>

                    <select
                      value={studentPromotionForm.target_class_id}
                      onChange={(e) =>
                        setStudentPromotionForm((p) => ({
                          ...p,
                          target_class_id: e.target.value,
                        }))
                      }
                      className="input w-full border p-2 rounded-lg"
                    >
                      <option value="">Select Target Class</option>
                      {enrollmentAcademicClasses.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.batch_name} - {cls.division_name} -{" "}
                          {cls.section_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={studentPromotionLoading}
                  onClick={promoteWholeClassStudents}
                  className="mt-8 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-6 py-3 rounded-xl font-bold w-full shadow-md"
                >
                  {studentPromotionLoading
                    ? "Promoting..."
                    : "Confirm & Promote All Students"}
                </button>
              </div>
            )}

            {/* REPORT TAB */}
            {enrollmentActiveTab === "report" && (
              <div className="bg-white p-5 rounded-xl shadow animate-in fade-in duration-300">
                <h3 className="font-bold mb-4">Export Student Data</h3>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
                  <select
                    value={studentReportFilters.batch}
                    onChange={(e) =>
                      setStudentReportFilters((p) => ({
                        ...p,
                        batch: e.target.value,
                      }))
                    }
                    className="input border p-2 rounded-lg"
                  >
                    <option value="">All Batches</option>
                    {enrollmentBatches.map((batch) => (
                      <option key={batch} value={batch}>
                        {batch}
                      </option>
                    ))}
                  </select>

                  <select
                    value={studentReportFilters.division}
                    onChange={(e) =>
                      setStudentReportFilters((p) => ({
                        ...p,
                        division: e.target.value,
                      }))
                    }
                    className="input border p-2 rounded-lg"
                  >
                    <option value="">All Divisions</option>
                    {enrollmentDivisions.map((division) => (
                      <option key={division} value={division}>
                        {division}
                      </option>
                    ))}
                  </select>

                  <select
                    value={studentReportFilters.section}
                    onChange={(e) =>
                      setStudentReportFilters((p) => ({
                        ...p,
                        section: e.target.value,
                      }))
                    }
                    className="input border p-2 rounded-lg"
                  >
                    <option value="">All Sections</option>
                    {enrollmentSections.map((section) => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>

                  <input
                    value={studentReportFilters.date}
                    onChange={(e) =>
                      setStudentReportFilters((p) => ({
                        ...p,
                        date: e.target.value,
                      }))
                    }
                    type="date"
                    className="input border p-2 rounded-lg"
                  />

                  <button
                    type="button"
                    onClick={loadStudentReportRows}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow font-medium"
                  >
                    Apply Filters
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="p-4">ID</th>
                        <th className="p-4">Student Name</th>
                        <th className="p-4">Batch</th>
                        <th className="p-4">Class</th>
                        <th className="p-4">Section</th>
                        <th className="p-4">Roll</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-50">
                      {studentReportRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan="6"
                            className="text-center p-10 text-gray-400 italic"
                          >
                            No students loaded. Use filters above.
                          </td>
                        </tr>
                      ) : (
                        studentReportRows.map((student) => (
                          <tr key={student.id}>
                            <td className="p-4">{student.student_id}</td>
                            <td className="p-4">
                              {student.first_name} {student.last_name}
                            </td>
                            <td className="p-4">{student.batch_name || "-"}</td>
                            <td className="p-4">
                              {student.division_name || "-"}
                            </td>
                            <td className="p-4">
                              {student.section_name || "-"}
                            </td>
                            <td className="p-4">
                              {student.roll_number || "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={downloadStudentReportCSV}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg shadow"
                  >
                    Excel/CSV Download
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
        {/* ================== ENROLLMENT SECTION END ================= */}

        {/* ============================= SUBJECT MANAGEMENT SECTION START ============================= */}
        {activeSection === "subjects" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-4 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
                <div>
                  <h2 className="text-2xl font-bold">Subject Management</h2>
                  <p className="text-sm opacity-90">
                    Create, update and manage academic subjects
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => openSubjectModal()}
                  className="bg-white text-indigo-700 px-5 py-3 rounded-xl font-black shadow hover:bg-indigo-50 transition"
                >
                  + Add Subject
                </button>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-indigo-500">
                <p className="text-xs text-gray-500 font-bold uppercase">
                  Total Subjects
                </p>
                <p className="text-xl font-bold text-gray-800">
                  {subjectStats.total}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-emerald-500">
                <p className="text-xs text-gray-500 font-bold uppercase">
                  Active Subjects
                </p>
                <p className="text-xl font-bold text-gray-800">
                  {subjectStats.active}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-red-500">
                <p className="text-xs text-gray-500 font-bold uppercase">
                  Inactive Subjects
                </p>
                <p className="text-xl font-bold text-gray-800">
                  {subjectStats.inactive}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[220px]">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                  Search Subject
                </label>
                <input
                  type="text"
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                  placeholder="Search by subject name or code"
                  className="w-full mt-1 border border-gray-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                  Subject Type
                </label>
                <select
                  value={subjectTypeFilter}
                  onChange={(e) => setSubjectTypeFilter(e.target.value)}
                  className="w-full mt-1 border border-gray-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Types</option>
                  {subjectTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                  Status
                </label>
                <select
                  value={subjectStatusFilter}
                  onChange={(e) => setSubjectStatusFilter(e.target.value)}
                  className="w-full mt-1 border border-gray-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <button
                type="button"
                onClick={loadSubjects}
                className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-black transition"
              >
                Filter
              </button>

              <button
                type="button"
                onClick={resetSubjectFilters}
                className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-xl font-bold hover:bg-gray-200 transition"
              >
                Reset
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="font-black text-gray-800">Subject List</h3>
                  <p className="text-xs text-gray-500">
                    Manage all subjects from one place
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-4">Subject</th>
                      <th className="p-4">Code</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-50">
                    {subjectsLoading ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="p-6 text-center text-gray-500"
                        >
                          Loading subjects...
                        </td>
                      </tr>
                    ) : subjects.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="p-6 text-center text-gray-500"
                        >
                          No subjects found
                        </td>
                      </tr>
                    ) : (
                      subjects.map((subject) => (
                        <tr
                          key={subject.id}
                          className="hover:bg-gray-50 transition"
                        >
                          <td className="p-4">
                            <p className="font-black text-gray-800">
                              {subject.subject_name}
                            </p>
                          </td>

                          <td className="p-4">
                            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs">
                              {subject.subject_code}
                            </span>
                          </td>

                          <td className="p-4 text-gray-700">
                            {subject.subject_type || "Core"}
                          </td>

                          <td className="p-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                subject.status === "Inactive"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {subject.status || "Active"}
                            </span>
                          </td>

                          <td className="p-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openSubjectModal(subject)}
                                className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteSubject(subject.id)}
                                className="px-3 py-2 rounded-lg bg-red-50 text-red-700 font-bold hover:bg-red-100"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {isSubjectModalOpen && (
              <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
                  <div className="p-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-black">
                        {subjectForm.id ? "Update Subject" : "Add Subject"}
                      </h3>
                      <p className="text-sm opacity-90">
                        Enter subject details carefully
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeSubjectModal}
                      className="text-white text-2xl font-black"
                    >
                      &times;
                    </button>
                  </div>

                  <form
                    onSubmit={saveSubject}
                    className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">
                        Subject Name
                      </label>
                      <input
                        name="subject_name"
                        value={subjectForm.subject_name}
                        onChange={handleSubjectChange}
                        required
                        placeholder="Example: Mathematics"
                        className="w-full mt-1 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">
                        Subject Code
                      </label>
                      <input
                        name="subject_code"
                        value={subjectForm.subject_code}
                        onChange={handleSubjectChange}
                        required
                        placeholder="Example: MATH101"
                        className="w-full mt-1 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">
                        Subject Type
                      </label>
                      <select
                        name="subject_type"
                        value={subjectForm.subject_type}
                        onChange={handleSubjectChange}
                        className="w-full mt-1 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Core">Core</option>
                        <option value="Optional">Optional</option>
                        <option value="Practical">Practical</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">
                        Status
                      </label>
                      <select
                        name="status"
                        value={subjectForm.status}
                        onChange={handleSubjectChange}
                        className="w-full mt-1 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 flex justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={closeSubjectModal}
                        className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={subjectSaving}
                        className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {subjectSaving
                          ? "Saving..."
                          : subjectForm.id
                            ? "Update Subject"
                            : "Save Subject"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </section>
        )}
        {/* ============================= SUBJECT MANAGEMENT SECTION END ============================= */}
        {/* =========================== PREMIUM TIMETABLE SECTION ============================ */}
        {activeSection === "timetable" && (
          <section className="space-y-6 animate-in fade-in duration-500">
            {/*  HEADER  */}
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

                  {TTSubjects?.map((subject) => (
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

                    {TTSubjects?.map((item) => (
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

        {/* ================= EXAM & RESULT SECTION START ================= */}
        {activeSection === "exams" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    Exam & Result Control Center
                  </h2>
                  <p className="text-indigo-100 text-sm mt-1">
                    Manage exams, marks entry, verification, publishing, report
                    cards, and analytics.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={exportExamManagementReportsPDF}
                    className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm transition border border-white/20"
                  >
                    Export Reports
                  </button>

                  <button
                    type="button"
                    onClick={exportExamManagementReportCardsPDF}
                    className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm transition border border-white/20"
                  >
                    Export Report Cards
                  </button>

                  <button
                    type="button"
                    onClick={() => openExamManagementModal()}
                    className="bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-lg text-sm font-semibold transition shadow-md"
                  >
                    + Create Examination
                  </button>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Academic Year
                  </label>
                  <select
                    value={examManagementFilters.academic_year}
                    onChange={(e) =>
                      updateExamManagementFilter(
                        "academic_year",
                        e.target.value,
                      )
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">All Years</option>
                    {(examManagementOptions.batches || []).map((batch) => (
                      <option key={batch.id} value={batch.batch_name}>
                        {batch.batch_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Exam
                  </label>
                  <select
                    value={examManagementFilters.exam_name}
                    onChange={(e) =>
                      updateExamManagementFilter("exam_name", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">All Exams</option>
                    {(examManagementOptions.exams || []).map((exam) => (
                      <option key={exam} value={exam}>
                        {exam}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Class
                  </label>
                  <select
                    value={examManagementFilters.academic_class_id}
                    onChange={(e) =>
                      updateExamManagementFilter(
                        "academic_class_id",
                        e.target.value,
                      )
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">All Classes</option>
                    {(examManagementOptions.classes || []).map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.display_name ||
                          cls.class_name ||
                          `${cls.division_name}-${cls.section_name}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Subject
                  </label>
                  <select
                    value={examManagementFilters.subject_id}
                    onChange={(e) =>
                      updateExamManagementFilter("subject_id", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">All Subjects</option>
                    {(examManagementOptions.subjects || []).map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name || subject.subject_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Teacher
                  </label>
                  <select
                    value={examManagementFilters.teacher_id}
                    onChange={(e) =>
                      updateExamManagementFilter("teacher_id", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">All Teachers</option>
                    {(examManagementOptions.teachers || []).map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name ||
                          `${teacher.first_name || ""} ${teacher.last_name || ""}`.trim() ||
                          teacher.teacher_id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Status
                  </label>
                  <select
                    value={examManagementFilters.status}
                    onChange={(e) =>
                      updateExamManagementFilter("status", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">All Status</option>
                    {(examManagementOptions.statuses || []).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Search Student
                  </label>
                  <input
                    type="text"
                    value={examManagementFilters.search}
                    onChange={(e) =>
                      updateExamManagementFilter("search", e.target.value)
                    }
                    placeholder="Name, roll no, class..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  type="button"
                  onClick={refreshExamManagement}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700"
                >
                  {examManagementLoading ? "Loading..." : "Apply / Refresh"}
                </button>

                <button
                  type="button"
                  onClick={resetExamManagementFilters}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
              {[
                ["Total Exams", examManagementStats.totalExams],
                ["Classes Covered", examManagementStats.classesCovered],
                ["Students", examManagementStats.students],
                ["Published", examManagementStats.resultsPublished],
                ["Pending Marks", examManagementStats.pendingMarks],
                ["Pass %", `${examManagementStats.passPercentage || 0}%`],
                ["Average Score", `${examManagementStats.averageScore || 0}%`],
                ["At Risk", examManagementStats.atRiskStudents],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm"
                >
                  <p className="text-xs text-gray-500 font-medium">{label}</p>
                  <h5 className="text-xl font-bold text-gray-800">
                    {value || 0}
                  </h5>
                </div>
              ))}
            </div>

            {/* Workflow */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4">
                Exam Result Workflow
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3 text-sm">
                {[
                  "Create Exam",
                  "Assign Subjects",
                  "Schedule Exam",
                  "Marks Entry",
                  "Verification",
                  "Approval",
                  "Publish",
                ].map((step, index) => (
                  <div
                    key={step}
                    className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-center"
                  >
                    <p className="font-bold text-indigo-700">{index + 1}</p>
                    <p className="font-semibold">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Class Progress */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <div>
                    <h3 className="font-bold text-gray-800">
                      Class Wise Exam Progress
                    </h3>
                    <p className="text-xs text-gray-500">
                      Track marks entry, verification, and publishing status.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={refreshExamManagement}
                    className="text-sm text-indigo-600 font-semibold hover:underline"
                  >
                    Refresh
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
                  {(examManagementClasses || []).length === 0 ? (
                    <div className="md:col-span-2 text-sm text-gray-500 text-center py-8">
                      No exam class progress found.
                    </div>
                  ) : (
                    examManagementClasses.map((item) => (
                      <div
                        key={item.exam_id}
                        className="border border-gray-200 rounded-2xl p-5 hover:shadow-md transition"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-gray-800">
                              {item.class_name}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {item.exam_name} • {item.academic_session}
                            </p>
                          </div>
                          <span className="bg-indigo-100 text-indigo-700 text-[10px] uppercase font-bold px-2 py-1 rounded-full">
                            {item.status || "Pending"}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-semibold text-indigo-600">
                              {item.marks_submitted_percentage || 0}%
                            </span>
                          </div>

                          <div className="w-full bg-gray-100 rounded-full h-2.5">
                            <div
                              className="bg-indigo-600 h-2.5 rounded-full"
                              style={{
                                width: `${item.marks_submitted_percentage || 0}%`,
                              }}
                            />
                          </div>

                          <p className="text-xs text-gray-400">
                            {item.marked || 0}/{item.expected || 0} marks
                            submitted • {item.subject_count || 0} subjects
                          </p>

                          <p
                            className={`inline-flex mt-2 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                              item.marks_entry_enabled
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {item.marks_entry_enabled
                              ? "Teacher Marks Entry Open"
                              : "Teacher Marks Entry Locked"}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                          <button
                            type="button"
                            onClick={() => openExamManagementDetails(item)}
                            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-gray-200"
                          >
                            Details
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              updateMarksEntryPermission(
                                item.exam_id,
                                !item.marks_entry_enabled,
                              )
                            }
                            disabled={
                              item.is_published || examManagementActionLoading
                            }
                            className={`px-3 py-2 rounded-lg text-xs font-semibold disabled:bg-gray-300 disabled:text-gray-500 ${
                              item.marks_entry_enabled
                                ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            }`}
                            title={
                              item.is_published
                                ? "Published exam cannot be changed"
                                : item.marks_entry_enabled
                                  ? "Disable teacher marks entry"
                                  : "Allow teacher marks entry"
                            }
                          >
                            {item.marks_entry_enabled
                              ? "Lock Entry"
                              : "Allow Entry"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              verifyExamManagementExam(item.exam_id)
                            }
                            disabled={
                              item.is_verified || examManagementActionLoading
                            }
                            className="bg-blue-600 disabled:bg-gray-300 text-white px-3 py-2 rounded-lg text-xs font-semibold"
                          >
                            Verify
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              publishExamManagementExam(item.exam_id)
                            }
                            disabled={
                              !item.is_verified ||
                              item.is_published ||
                              examManagementActionLoading
                            }
                            className="bg-emerald-600 disabled:bg-gray-300 text-white px-3 py-2 rounded-lg text-xs font-semibold"
                          >
                            Publish
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Publish Panel */}
              <div className="bg-gray-900 rounded-2xl p-6 text-white shadow-xl">
                <h4 className="text-lg font-bold mb-1">Result Publishing</h4>
                <p className="text-sm text-gray-300 mb-5">
                  Schedule verified exam results for publishing.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase text-gray-400 mb-1">
                      Select Exam
                    </label>
                    <select
                      value={examManagementPublishForm.exam_id}
                      onChange={(e) =>
                        updateExamManagementPublishForm(
                          "exam_id",
                          e.target.value,
                        )
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm"
                    >
                      <option value="">Select Exam</option>
                      {(examManagementTerms || []).map((exam) => (
                        <option key={exam.id} value={exam.id}>
                          {exam.class_name} • {exam.exam_name} •{" "}
                          {exam.academic_year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-gray-400 mb-1">
                      Publish At
                    </label>
                    <input
                      type="datetime-local"
                      value={examManagementPublishForm.publish_at}
                      onChange={(e) =>
                        updateExamManagementPublishForm(
                          "publish_at",
                          e.target.value,
                        )
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={Boolean(examManagementPublishForm.force)}
                      onChange={(e) =>
                        updateExamManagementPublishForm(
                          "force",
                          e.target.checked,
                        )
                      }
                    />
                    Force schedule even if not fully complete
                  </label>

                  <button
                    type="button"
                    onClick={scheduleExamManagementPublish}
                    disabled={examManagementActionLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white py-2 rounded-lg text-sm font-semibold"
                  >
                    {examManagementActionLoading
                      ? "Saving..."
                      : "Schedule Publish"}
                  </button>
                </div>
              </div>
            </div>

            {/* Exam Terms Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50">
                <h3 className="font-bold text-gray-800">
                  Created Examinations
                </h3>
                <p className="text-xs text-gray-500">
                  All created exam terms by class and academic year.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3">Exam</th>
                      <th className="px-4 py-3">Year</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Dates</th>
                      <th className="px-4 py-3">Verified</th>
                      <th className="px-4 py-3">Published</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 text-sm">
                    {(examManagementTerms || []).length === 0 ? (
                      <tr>
                        <td
                          colSpan="8"
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          No exams found.
                        </td>
                      </tr>
                    ) : (
                      examManagementTerms.map((exam) => (
                        <tr key={exam.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold">
                            {exam.class_name}
                          </td>
                          <td className="px-4 py-3">{exam.exam_name}</td>
                          <td className="px-4 py-3">{exam.academic_year}</td>
                          <td className="px-4 py-3">
                            {exam.exam_type || "N/A"}
                          </td>
                          <td className="px-4 py-3">
                            {exam.start_date || "-"} to {exam.end_date || "-"}
                          </td>
                          <td className="px-4 py-3">
                            {exam.is_verified ? "Yes" : "No"}
                          </td>
                          <td className="px-4 py-3">
                            {exam.is_published ? "Yes" : "No"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openExamManagementDetails(exam)}
                              className="text-indigo-600 font-semibold hover:underline text-xs"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Result Rows */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50">
                <h3 className="font-bold text-gray-800">Student Result Rows</h3>
                <p className="text-xs text-gray-500">
                  Searchable result data from submitted marks.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3">Roll</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3">Exam</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">%</th>
                      <th className="px-4 py-3">Grade</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 text-sm">
                    {(examManagementFilteredResults || []).length === 0 ? (
                      <tr>
                        <td
                          colSpan="9"
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          No result rows found.
                        </td>
                      </tr>
                    ) : (
                      examManagementFilteredResults.map((row, index) => (
                        <tr
                          key={
                            row.result_id ||
                            `${row.student_id}-${row.subject_id}-${index}`
                          }
                        >
                          <td className="px-4 py-3">{row.roll_no || "-"}</td>
                          <td className="px-4 py-3 font-semibold">
                            {row.student_name}
                          </td>
                          <td className="px-4 py-3">{row.class_name}</td>
                          <td className="px-4 py-3">{row.exam_name}</td>
                          <td className="px-4 py-3">{row.subject}</td>
                          <td className="px-4 py-3">{row.total_marks || 0}</td>
                          <td className="px-4 py-3">{row.percentage || 0}%</td>
                          <td className="px-4 py-3">{row.grade || "-"}</td>
                          <td className="px-4 py-3">
                            {row.status || "Pending"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
        {/* ================= EXAM & RESULT SECTION END ================= */}

        {/* ================= CREATE EXAM MODAL START ================= */}
        {examManagementModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 sm:p-5">
            <div className="relative w-full max-w-5xl max-h-[94vh] overflow-hidden rounded-3xl bg-white shadow-2xl">
              {/* Header */}
              <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-slate-200">
                <div className="flex items-start justify-between gap-4 px-5 sm:px-7 py-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
                      Exam Management
                    </p>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                      Create Examination
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Configure exam details, assign classes, and select
                      subjects.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeExamManagementModal}
                    className="h-10 w-10 shrink-0 rounded-full bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveExamManagementExam();
                }}
                className="overflow-y-auto max-h-[calc(94vh-92px)]"
              >
                <div className="p-5 sm:p-7 space-y-6">
                  {/* Exam Basic Details */}
                  <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-5 sm:p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-11 w-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                        <i className="bi bi-award text-lg"></i>
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900">
                          Basic Exam Details
                        </h4>
                        <p className="text-xs text-slate-500">
                          Add exam name, year, type, and schedule dates.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      <div className="xl:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Exam Name *
                        </label>
                        <input
                          required
                          type="text"
                          value={examManagementForm.exam_name}
                          onChange={(e) =>
                            updateExamManagementForm(
                              "exam_name",
                              e.target.value,
                            )
                          }
                          placeholder="Annual Examination"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Academic Year *
                        </label>
                        <select
                          required
                          value={examManagementForm.academic_year}
                          onChange={(e) =>
                            updateExamManagementForm(
                              "academic_year",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
                        >
                          <option value="">Select Academic Batch</option>
                          {(examManagementOptions.batches || []).map(
                            (batch) => (
                              <option key={batch.id} value={batch.batch_name}>
                                {batch.batch_name}
                              </option>
                            ),
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Exam Type
                        </label>
                        <select
                          value={examManagementForm.exam_type}
                          onChange={(e) =>
                            updateExamManagementForm(
                              "exam_type",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
                        >
                          <option value="Unit Test">Unit Test</option>
                          <option value="Mid Term">Mid Term</option>
                          <option value="Annual">Annual</option>
                          <option value="Practical">Practical</option>
                          <option value="Internal">Internal</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={examManagementForm.start_date}
                          onChange={(e) =>
                            updateExamManagementForm(
                              "start_date",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={examManagementForm.end_date}
                          onChange={(e) =>
                            updateExamManagementForm("end_date", e.target.value)
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Assignment Details */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Classes */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                          <h4 className="font-black text-slate-900">
                            Assign Classes
                          </h4>
                          <p className="text-xs text-slate-500">
                            Select one or more classes for this exam.
                          </p>
                        </div>
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                          {(examManagementForm.academic_class_ids || []).length}{" "}
                          Selected
                        </span>
                      </div>

                      <select
                        multiple
                        value={(
                          examManagementForm.academic_class_ids || []
                        ).map(String)}
                        onChange={(e) => {
                          const values = Array.from(
                            e.target.selectedOptions,
                          ).map((option) => Number(option.value));
                          updateExamManagementForm(
                            "academic_class_ids",
                            values,
                          );
                        }}
                        className="w-full min-h-[180px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
                      >
                        {(examManagementOptions.classes || []).map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.display_name ||
                              cls.class_name ||
                              `${cls.division_name}-${cls.section_name}`}
                          </option>
                        ))}
                      </select>

                      <p className="mt-3 text-xs text-slate-400">
                        Hold Ctrl on Windows or Cmd on Mac to select multiple
                        classes.
                      </p>
                    </div>

                    {/* Subjects */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                          <h4 className="font-black text-slate-900">
                            Assign Subjects
                          </h4>
                          <p className="text-xs text-slate-500">
                            Select subjects included in this examination.
                          </p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          {(examManagementForm.subject_ids || []).length}{" "}
                          Selected
                        </span>
                      </div>

                      <select
                        multiple
                        value={(examManagementForm.subject_ids || []).map(
                          String,
                        )}
                        onChange={(e) => {
                          const values = Array.from(
                            e.target.selectedOptions,
                          ).map((option) => Number(option.value));
                          updateExamManagementForm("subject_ids", values);
                        }}
                        className="w-full min-h-[180px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
                      >
                        {(examManagementOptions.subjects || []).map(
                          (subject) => (
                            <option key={subject.id} value={subject.id}>
                              {subject.name || subject.subject_name}
                            </option>
                          ),
                        )}
                      </select>

                      <p className="mt-3 text-xs text-slate-400">
                        Hold Ctrl on Windows or Cmd on Mac to select multiple
                        subjects.
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="sticky bottom-0 -mx-5 sm:-mx-7 -mb-5 sm:-mb-7 border-t border-slate-200 bg-white/95 backdrop-blur-xl px-5 sm:px-7 py-4">
                    <div className="flex flex-col-reverse sm:flex-row justify-between gap-3">
                      <button
                        type="button"
                        onClick={closeExamManagementModal}
                        className="w-full sm:w-auto rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={examManagementSaving}
                        className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                      >
                        {examManagementSaving
                          ? "Saving Examination..."
                          : "Save Examination"}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* ================= CREATE EXAM MODAL END ================= */}

        {/* ================= EXAM DETAILS MODAL START ================= */}
        {examManagementDetailsModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {examManagementSelectedDetails?.exam?.class_name || "Exam"}{" "}
                    Details
                  </h3>
                  <p className="text-xs text-gray-500">
                    {examManagementSelectedDetails?.exam?.name} •{" "}
                    {examManagementSelectedDetails?.exam?.academic_year}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeExamManagementDetails}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 overflow-y-auto max-h-[75vh] space-y-6">
                {examManagementActionLoading ? (
                  <div className="text-center text-gray-500 py-10">
                    Loading details...
                  </div>
                ) : (
                  <>
                    <div>
                      <h4 className="font-bold text-gray-800 mb-3">
                        Subject Status
                      </h4>
                      <div className="overflow-x-auto border rounded-xl">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                            <tr>
                              <th className="px-4 py-3">Subject</th>
                              <th className="px-4 py-3">Teacher</th>
                              <th className="px-4 py-3">Submitted</th>
                              <th className="px-4 py-3">Pending</th>
                              <th className="px-4 py-3">Total Students</th>
                              <th className="px-4 py-3">Status</th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-gray-100">
                            {(
                              examManagementSelectedDetails?.subjects || []
                            ).map((subject) => (
                              <tr
                                key={subject.subject_id}
                                onClick={() =>
                                  openExamManagementDetails({
                                    exam_id:
                                      examManagementSelectedDetails?.exam?.id,
                                    subject_id: subject.subject_id,
                                  })
                                }
                                className="cursor-pointer hover:bg-indigo-50"
                              >
                                <td className="px-4 py-3 font-semibold">
                                  {subject.subject}
                                </td>
                                <td className="px-4 py-3">{subject.teacher}</td>
                                <td className="px-4 py-3">
                                  {subject.submitted_marks || 0}
                                </td>
                                <td className="px-4 py-3">
                                  {subject.pending_marks || 0}
                                </td>
                                <td className="px-4 py-3">
                                  {subject.total_students || 0}
                                </td>
                                <td className="px-4 py-3">{subject.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {(examManagementSelectedDetails?.students || []).length >
                      0 && (
                      <div>
                        <h4 className="font-bold text-gray-800 mb-3">
                          Student Marks
                        </h4>
                        <div className="overflow-x-auto border rounded-xl">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                              <tr>
                                <th className="px-4 py-3">Roll</th>
                                <th className="px-4 py-3">Student</th>
                                <th className="px-4 py-3">Subject</th>
                                <th className="px-4 py-3">Internal</th>
                                <th className="px-4 py-3">External</th>
                                <th className="px-4 py-3">Oral</th>
                                <th className="px-4 py-3">Practical</th>
                                <th className="px-4 py-3">Total</th>
                                <th className="px-4 py-3">%</th>
                                <th className="px-4 py-3">Grade</th>
                                <th className="px-4 py-3">Verification</th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100 bg-white">
                              {examManagementSelectedDetails.students.map(
                                (student, index) => {
                                  const hasResult = Boolean(student.result_id);
                                  const isSavingThisRow =
                                    examManagementActionLoading ===
                                    student.result_id;

                                  const saveMarksField = async (
                                    fieldName,
                                    value,
                                  ) => {
                                    if (!hasResult) {
                                      showToast?.(
                                        "Marks are not submitted by the teacher for this student yet.",
                                        "warning",
                                      );
                                      return;
                                    }

                                    const numericValue = Number(value);

                                    if (
                                      Number.isNaN(numericValue) ||
                                      numericValue < 0
                                    ) {
                                      showToast?.(
                                        "Please enter a valid marks value.",
                                        "error",
                                      );
                                      return;
                                    }

                                    await updateAdminResultMarks(
                                      student.result_id,
                                      {
                                        [fieldName]: numericValue,
                                      },
                                    );
                                  };

                                  const marksInputClass =
                                    "w-[72px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

                                  return (
                                    <tr
                                      key={
                                        student.result_id ||
                                        `${student.student_id}-${index}`
                                      }
                                      className="transition hover:bg-indigo-50/40"
                                    >
                                      <td className="px-4 py-3 text-sm font-medium text-slate-600">
                                        {student.roll_no || "-"}
                                      </td>

                                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                                        {student.student_name}
                                      </td>

                                      <td className="px-4 py-3 text-sm font-medium text-slate-700">
                                        {student.subject}
                                      </td>

                                      <td className="px-4 py-3">
                                        <input
                                          type="number"
                                          min="0"
                                          defaultValue={
                                            student.internal_marks ?? 0
                                          }
                                          disabled={
                                            !hasResult || isSavingThisRow
                                          }
                                          onBlur={(event) =>
                                            saveMarksField(
                                              "internal_marks",
                                              event.target.value,
                                            )
                                          }
                                          className={marksInputClass}
                                          title={
                                            hasResult
                                              ? "Update internal marks"
                                              : "Teacher has not submitted marks yet"
                                          }
                                        />
                                      </td>

                                      <td className="px-4 py-3">
                                        <input
                                          type="number"
                                          min="0"
                                          defaultValue={
                                            student.external_marks ?? 0
                                          }
                                          disabled={
                                            !hasResult || isSavingThisRow
                                          }
                                          onBlur={(event) =>
                                            saveMarksField(
                                              "external_marks",
                                              event.target.value,
                                            )
                                          }
                                          className={marksInputClass}
                                          title={
                                            hasResult
                                              ? "Update external marks"
                                              : "Teacher has not submitted marks yet"
                                          }
                                        />
                                      </td>

                                      <td className="px-4 py-3">
                                        <input
                                          type="number"
                                          min="0"
                                          defaultValue={student.oral_marks ?? 0}
                                          disabled={
                                            !hasResult || isSavingThisRow
                                          }
                                          onBlur={(event) =>
                                            saveMarksField(
                                              "oral_marks",
                                              event.target.value,
                                            )
                                          }
                                          className={marksInputClass}
                                          title={
                                            hasResult
                                              ? "Update oral marks"
                                              : "Teacher has not submitted marks yet"
                                          }
                                        />
                                      </td>

                                      <td className="px-4 py-3">
                                        <input
                                          type="number"
                                          min="0"
                                          defaultValue={
                                            student.practical_marks ?? 0
                                          }
                                          disabled={
                                            !hasResult || isSavingThisRow
                                          }
                                          onBlur={(event) =>
                                            saveMarksField(
                                              "practical_marks",
                                              event.target.value,
                                            )
                                          }
                                          className={marksInputClass}
                                          title={
                                            hasResult
                                              ? "Update practical marks"
                                              : "Teacher has not submitted marks yet"
                                          }
                                        />
                                      </td>

                                      <td className="px-4 py-3 text-sm font-bold text-slate-900">
                                        {student.total_marks ?? 0}
                                      </td>

                                      <td className="px-4 py-3">
                                        <span
                                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                                            Number(student.percentage || 0) >=
                                            35
                                              ? "bg-emerald-100 text-emerald-700"
                                              : "bg-rose-100 text-rose-700"
                                          }`}
                                        >
                                          {student.percentage ?? 0}%
                                        </span>
                                      </td>

                                      <td className="px-4 py-3">
                                        <span
                                          className={`inline-flex min-w-[42px] justify-center rounded-lg px-2 py-1 text-xs font-bold ${
                                            student.grade === "Fail"
                                              ? "bg-rose-100 text-rose-700"
                                              : "bg-indigo-100 text-indigo-700"
                                          }`}
                                        >
                                          {student.grade || "-"}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3">
                                        {!hasResult ? (
                                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                                            Pending
                                          </span>
                                        ) : (
                                          <button
                                            type="button"
                                            disabled={isSavingThisRow}
                                            onClick={async () => {
                                              const nextStatus =
                                                student.status === "Verified"
                                                  ? "Submitted"
                                                  : "Verified";

                                              const actionLabel =
                                                nextStatus === "Verified"
                                                  ? "verify"
                                                  : "unverify";

                                              const confirmed = window.confirm(
                                                `Do you want to ${actionLabel} marks for ${student.student_name}?`,
                                              );

                                              if (!confirmed) return;

                                              await updateAdminResultMarks(
                                                student.result_id,
                                                {
                                                  status: nextStatus,
                                                },
                                              );
                                            }}
                                            className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                              student.status === "Verified"
                                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                                : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                            }`}
                                            title={
                                              student.status === "Verified"
                                                ? "Click to move this result back to Submitted"
                                                : "Click to verify this student's marks"
                                            }
                                          >
                                            {isSavingThisRow
                                              ? "Saving..."
                                              : student.status === "Verified"
                                                ? "✓ Verified"
                                                : "Verify Marks"}
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                },
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        {/* ================= EXAM DETAILS MODAL END ================= */}

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
