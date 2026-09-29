import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useDashboardAccess } from "../controllers/Auth/useDashboardAccess";
import {
  APP_NAME,
  APP_YEAR,
  BASE_URL,
  FILE_BASE_URL,
} from "../config/appConfig";
import "../css/dashboard.css";
import { useDashboardUI } from "../controllers/useDashboardUI";
import { useAdminDashboard } from "../controllers/AdminSide/adminDashboard";
import { useAdminProfile } from "../controllers/AdminSide/useAdminProfile";
import { useAssets } from "../controllers/Assets/useAssets";
import { useLeaveManagement } from "../controllers/academic/useLeaveManagement";
import { useStudentEnrollment } from "../controllers/Academic/useStudentEnrollment";
import { useRolePermissionManagement } from "../controllers/Auth/useRolePermissionManagement";
import { useLibraryOverview } from "../controllers/Library/useLibraryOverview";

function AdminDashboard() {
  // UI STATE (LOCAL COMPONENT STATE)
  const [noticeTab, setNoticeTab] = useState("announcements");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [search, setSearch] = useState("");

  // Which of the other admin dashboards this account may currently
  // open - Super Admin normally sees all of them, but this stays
  // driven by Role & Permission Management rather than assumed, so a
  // future "restricted super admin" style role also works correctly.
  const { canView: canViewDashboard } = useDashboardAccess();

  // Real-time library stats for the overview widget below - see
  // controllers/Library/useLibraryOverview.js. Only fetched/rendered
  // when this Super Admin actually has view access to the library
  // dashboard, matching the same gate used for the sidebar link.
  const {
    stats: libraryStats,
    occupancyRate: libraryOccupancyRate,
    recentActivity: libraryRecentActivity,
    overdueAlerts: libraryOverdueAlerts,
    recentBooks: libraryRecentBooks,
    loading: libraryOverviewLoading,
    refreshing: libraryOverviewRefreshing,
    error: libraryOverviewError,
    lastUpdated: libraryOverviewUpdatedAt,
    refresh: refreshLibraryOverview,
  } = useLibraryOverview();

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

  // ============== Role and Permission Hook ==============
  const {
    rbacUserTypes,

    rbacRoles,
    rbacUsers,
    rbacStats,

    rbacSelectedRole,
    rbacSelectedRoleId,

    rbacSelectedUser,
    rbacSelectedUserKey,
    rbacSelectedUserAccess,

    rbacRoleOptions,

    rbacRoleForm,
    rbacUserFilters,
    rbacTemporaryAccessForm,

    rbacRoleModalOpen,
    rbacDeleteRoleModalOpen,
    rbacUserAccessModalOpen,

    rbacLoading,
    rbacRolesLoading,
    rbacUsersLoading,
    rbacUserAccessLoading,
    rbacSavingRole,
    rbacSavingPermissions,
    rbacSavingUserAccess,
    rbacDeletingRole,

    rbacHasUnsavedRolePermissionChanges,
    rbacHasUnsavedOverrideChanges,

    loadRbacRolePermissionBootstrap,
    refreshRbacRolePermissionManagement,

    loadRbacRoles,
    loadRbacUsers,
    loadRbacUserAccess,

    selectRbacRole,

    openRbacCreateRoleModal,
    openRbacEditRoleModal,
    closeRbacRoleModal,

    updateRbacRoleForm,
    saveRbacRole,

    openRbacDeleteRoleModal,
    closeRbacDeleteRoleModal,
    deleteRbacRole,

    saveRbacRolePermissions,

    dashboardPages,
    dashboardAccessLevels,
    rbacDashboardPermissionForm,
    setRbacDashboardAccess,
    rbacDashboardOverrideForm,
    setRbacUserDashboardOverride,

    updateRbacUserFilter,
    resetRbacUserFilters,

    selectRbacUser,
    closeRbacUserAccessModal,

    assignRbacRoleToUser,

    saveRbacUserOverrides,
    resetRbacUserOverrides,

    updateRbacTemporaryAccessForm,
  } = useRolePermissionManagement({
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

  // Enrolling new students now happens from the Academic Dashboard - if
  // this tab is ever selected (e.g. a stale default from the hook),
  // land on Promote instead of showing a blank tab.
  useEffect(() => {
    if (enrollmentActiveTab === "enroll") {
      setEnrollmentActiveTab("promote");
    }
  }, [enrollmentActiveTab, setEnrollmentActiveTab]);

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
                ["parents", "bi-people-fill", "Parents"],
                ["roles", "bi-shield-lock", "Roles & Permissions"],
              ],
            },
            {
              title: "ACADEMIC",
              items: [
                ["academic-dashboard", "bi-mortarboard", "Academic Dashboard"],
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
          ].map((section) => {
            // key -> dashboardRegistry key, used to check real access
            // before showing a cross-dashboard nav link. Add new
            // cross-dashboard links to this map (and to the backend +
            // frontend dashboardRegistry) - nothing else needs to change.
            const DASHBOARD_LINK_TARGETS = {
              "library-dashboard": "library-admin-dashboard",
              "accounts-dashboard": "accounts-admin-dashboard",
              "hostels-dashboard": "hostel-admin-dashboard",
              "hr-dashboard": "hr-admin-dashboard",
              "academic-dashboard": "academic-admin-dashboard",
            };

            const visibleItems = section.items.filter(([key]) => {
              const targetDashboardKey = DASHBOARD_LINK_TARGETS[key];
              return (
                !targetDashboardKey || canViewDashboard(targetDashboardKey)
              );
            });

            if (visibleItems.length === 0) {
              return null;
            }

            return (
              <div key={section.title}>
                {sidebarExpanded && (
                  <p className="text-xs text-gray-400 px-3 mt-4 transition-all duration-300">
                    {section.title}
                  </p>
                )}

                {visibleItems.map(([key, icon, label]) => {
                  const isDashboardLink = [
                    "library-dashboard",
                    "accounts-dashboard",
                    "hostels-dashboard",
                    "hr-dashboard",
                    "academic-dashboard",
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

                        if (key === "academic-dashboard") {
                          navigate("/academic-admin-dashboard", {
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
            );
          })}
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
          <section className="space-y-6">
            {/* =====================================================
        WELCOME HEADER
    ====================================================== */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h1 className="text-xl font-bold text-slate-900">
                Welcome back, Super Admin
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Here&apos;s a real-time snapshot of what&apos;s happening across
                the school.
              </p>
            </div>

            {/* =====================================================
        LIBRARY OVERVIEW - real-time data via useLibraryOverview
        (controllers/Library/useLibraryOverview.js -> GET
        /api/admin/library/dashboard). Gated the same way as the
        sidebar's Library link so it stays consistent if a
        restricted Super Admin role is ever introduced.
    ====================================================== */}
            {canViewDashboard("library-admin-dashboard") && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                      <i className="fas fa-book text-xl" />
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Library Overview
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        {libraryOverviewUpdatedAt
                          ? `Updated ${libraryOverviewUpdatedAt.toLocaleTimeString()}`
                          : "Live circulation, inventory and fine stats."}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={refreshLibraryOverview}
                      disabled={
                        libraryOverviewLoading || libraryOverviewRefreshing
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <i
                        className={`fas fa-sync-alt ${
                          libraryOverviewRefreshing ? "animate-spin" : ""
                        }`}
                      />
                      Refresh
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        navigate("/library-admin-dashboard", {
                          state: {
                            from: "super-admin-dashboard",
                            accessBy: "super_admin",
                            activeSection: "dashboard",
                          },
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                      Open Library Dashboard
                      <i className="fas fa-arrow-right" />
                    </button>
                  </div>
                </div>

                <div className="p-5">
                  {libraryOverviewLoading ? (
                    <div className="flex min-h-[200px] items-center justify-center">
                      <div className="text-center">
                        <i className="fas fa-spinner animate-spin text-3xl text-indigo-600" />

                        <p className="mt-3 text-sm font-medium text-slate-500">
                          Loading library stats...
                        </p>
                      </div>
                    </div>
                  ) : libraryOverviewError ? (
                    <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 text-center">
                      <i className="fas fa-triangle-exclamation text-2xl text-rose-500" />

                      <p className="text-sm font-medium text-rose-600">
                        {libraryOverviewError}
                      </p>

                      <button
                        type="button"
                        onClick={refreshLibraryOverview}
                        className="mt-1 text-sm font-semibold text-indigo-600 hover:underline"
                      >
                        Try again
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* =========================================
                  STAT CARDS
              ========================================== */}
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                        {[
                          {
                            label: "Titles",
                            value: libraryStats.total_titles,
                            icon: "fas fa-book",
                            wrap: "bg-indigo-100 text-indigo-700",
                          },
                          {
                            label: "Total Copies",
                            value: libraryStats.total_copies,
                            icon: "fas fa-layer-group",
                            wrap: "bg-slate-100 text-slate-700",
                          },
                          {
                            label: "Currently Issued",
                            value: libraryStats.currently_issued,
                            icon: "fas fa-right-from-bracket",
                            wrap: "bg-amber-100 text-amber-700",
                          },
                          {
                            label: "Available",
                            value: libraryStats.available_copies,
                            icon: "fas fa-circle-check",
                            wrap: "bg-emerald-100 text-emerald-700",
                          },
                          {
                            label: "Overdue",
                            value: libraryStats.overdue_books,
                            icon: "fas fa-triangle-exclamation",
                            wrap: "bg-rose-100 text-rose-700",
                          },
                          {
                            label: "Due Soon",
                            value: libraryStats.due_soon,
                            icon: "fas fa-clock",
                            wrap: "bg-orange-100 text-orange-700",
                          },
                        ].map((card) => (
                          <div
                            key={card.label}
                            className="rounded-xl border border-slate-200 p-4"
                          >
                            <div
                              className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${card.wrap}`}
                            >
                              <i className={`${card.icon} text-sm`} />
                            </div>

                            <p className="text-xl font-bold text-slate-900">
                              {card.value ?? 0}
                            </p>

                            <p className="text-xs text-slate-500">
                              {card.label}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* =========================================
                  OCCUPANCY + FINE SUMMARY
              ========================================== */}
                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-slate-200 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Copies In Circulation
                          </p>

                          <div className="mt-2 flex items-center gap-3">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-indigo-600"
                                style={{
                                  width: `${Math.min(
                                    libraryOccupancyRate,
                                    100,
                                  )}%`,
                                }}
                              />
                            </div>

                            <span className="text-sm font-bold text-slate-900">
                              {libraryOccupancyRate}%
                            </span>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Fine Collected
                          </p>

                          <p className="mt-2 text-lg font-bold text-emerald-700">
                            &#8377;
                            {Number(libraryStats.fine_collected || 0).toFixed(
                              2,
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Fine Pending
                          </p>

                          <p className="mt-2 text-lg font-bold text-rose-700">
                            &#8377;
                            {Number(libraryStats.fine_pending || 0).toFixed(2)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Fine Waived
                          </p>

                          <p className="mt-2 text-lg font-bold text-slate-700">
                            &#8377;
                            {Number(libraryStats.fine_waived || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* =========================================
                  RECENT ACTIVITY + OVERDUE ALERTS
              ========================================== */}
                      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-slate-200">
                          <div className="border-b border-slate-200 p-4">
                            <h3 className="text-sm font-bold text-slate-900">
                              Recent Activity
                            </h3>
                          </div>

                          <div className="max-h-72 overflow-y-auto p-2">
                            {libraryRecentActivity.length === 0 ? (
                              <p className="p-3 text-sm text-slate-400">
                                No recent library activity.
                              </p>
                            ) : (
                              libraryRecentActivity.map((activity) => (
                                <div
                                  key={activity.id}
                                  className="flex items-start gap-3 rounded-lg p-3 hover:bg-slate-50"
                                >
                                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                    <i
                                      className={`text-xs ${
                                        activity.type === "issue"
                                          ? "fas fa-arrow-up text-amber-600"
                                          : activity.type === "return"
                                            ? "fas fa-arrow-down text-emerald-600"
                                            : activity.type === "payment"
                                              ? "fas fa-indian-rupee-sign text-emerald-600"
                                              : "fas fa-hand-holding-dollar text-slate-500"
                                      }`}
                                    />
                                  </div>

                                  <div className="min-w-0">
                                    <p className="truncate text-sm text-slate-700">
                                      {activity.title}
                                    </p>

                                    {activity.date && (
                                      <p className="text-xs text-slate-400">
                                        {new Date(
                                          activity.date,
                                        ).toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200">
                          <div className="flex items-center justify-between border-b border-slate-200 p-4">
                            <h3 className="text-sm font-bold text-slate-900">
                              Overdue Alerts
                            </h3>

                            {libraryOverdueAlerts.length > 0 && (
                              <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                                {libraryOverdueAlerts.length}
                              </span>
                            )}
                          </div>

                          <div className="max-h-72 overflow-y-auto p-2">
                            {libraryOverdueAlerts.length === 0 ? (
                              <p className="p-3 text-sm text-slate-400">
                                No overdue books right now.
                              </p>
                            ) : (
                              libraryOverdueAlerts.map((alert) => (
                                <div
                                  key={`${alert.member_type}-${alert.id}`}
                                  className="flex items-center justify-between gap-3 rounded-lg p-3 hover:bg-slate-50"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-700">
                                      {alert.book_title}
                                    </p>

                                    <p className="truncate text-xs text-slate-400">
                                      {alert.member_name}
                                      {alert.member_code
                                        ? ` (${alert.member_code})`
                                        : ""}
                                    </p>
                                  </div>

                                  <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                                    {alert.overdue_days}d overdue
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {/* =========================================
                  RECENTLY ADDED BOOKS
              ========================================== */}
                      {libraryRecentBooks.length > 0 && (
                        <div className="mt-6">
                          <h3 className="mb-3 text-sm font-bold text-slate-900">
                            Recently Added Books
                          </h3>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                            {libraryRecentBooks.map((book) => (
                              <div
                                key={book.id}
                                className="rounded-xl border border-slate-200 p-3"
                              >
                                <p className="truncate text-sm font-semibold text-slate-800">
                                  {book.title}
                                </p>

                                <p className="truncate text-xs text-slate-400">
                                  {book.author || "Unknown author"}
                                </p>

                                <p className="mt-2 text-xs text-slate-500">
                                  {book.available_copies}/{book.total_copies}{" "}
                                  available
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {activeSection === "roles" && (
          <section className="space-y-6">
            {/* =====================================================
        SECTION HEADER
    ====================================================== */}
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <i className="fas fa-user-shield text-xl" />
                </div>

                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    Roles & Permissions
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    Manage roles, user permissions and temporary access.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={refreshRbacRolePermissionManagement}
                  disabled={rbacLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <i
                    className={`fas fa-sync-alt ${
                      rbacLoading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={() => openRbacCreateRoleModal("admin")}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  <i className="fas fa-plus" />
                  Add New Role
                </button>
              </div>
            </div>

            {/* =====================================================
        LOADING
    ====================================================== */}
            {rbacLoading ? (
              <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="text-center">
                  <i className="fas fa-spinner animate-spin text-4xl text-indigo-600" />

                  <p className="mt-3 text-sm font-medium text-slate-500">
                    Loading roles and permissions...
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* =================================================
            CARD 1: ROLES AND PERMISSIONS
        ================================================== */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">
                          Role Permission Management
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          Select a default or custom role to manage its
                          permissions.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                          {rbacStats.total_roles || rbacRoles.length} Roles
                        </span>

                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {rbacStats.active_roles || 0} Active
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    {/* =============================================
                ROLE CARDS
            ============================================== */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {/* ADD ROLE CARD */}
                      <button
                        type="button"
                        onClick={() => openRbacCreateRoleModal("admin")}
                        className="group min-h-[160px] rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 p-5 text-left transition hover:border-indigo-500 hover:bg-indigo-50"
                      >
                        <div className="flex h-full flex-col items-center justify-center text-center">
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                            <i className="fas fa-plus" />
                          </div>

                          <p className="font-bold text-indigo-700">
                            Add New Role
                          </p>

                          <p className="mt-1 text-xs text-indigo-500">
                            Create a custom role with module permissions.
                          </p>
                        </div>
                      </button>

                      {/* ROLE LIST */}
                      {rbacRoles.map((role) => {
                        const isSelected =
                          String(rbacSelectedRoleId) === String(role.id);

                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => selectRbacRole(role)}
                            className={`min-h-[160px] rounded-2xl border p-5 text-left transition ${
                              isSelected
                                ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
                                : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div
                                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                                  isSelected
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                <i className="fas fa-users-cog" />
                              </div>

                              <div className="flex flex-col items-end gap-1">
                                {role.is_system && (
                                  <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-bold uppercase text-violet-700">
                                    Default
                                  </span>
                                )}

                                <span
                                  className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                                    role.is_active !== false
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-rose-100 text-rose-700"
                                  }`}
                                >
                                  {role.is_active !== false
                                    ? "Active"
                                    : "Inactive"}
                                </span>
                              </div>
                            </div>

                            <h3 className="mt-4 truncate font-bold text-slate-900">
                              {role.name}
                            </h3>

                            <p className="mt-1 line-clamp-2 min-h-[32px] text-xs text-slate-500">
                              {role.description ||
                                "Role permission configuration"}
                            </p>

                            <div className="mt-3 flex items-center justify-between">
                              <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase text-slate-600">
                                {role.user_type || "admin"}
                              </span>

                              <i
                                className={`fas fa-chevron-right text-xs ${
                                  isSelected
                                    ? "text-indigo-600"
                                    : "text-slate-400"
                                }`}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* =============================================
                SELECTED ROLE PERMISSION MATRIX
            ============================================== */}
                    {rbacSelectedRole ? (
                      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                        <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 p-5 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-bold text-slate-900">
                                {rbacSelectedRole.name}
                              </h3>

                              {rbacSelectedRole.is_system && (
                                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                                  Default Role
                                </span>
                              )}

                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  rbacSelectedRole.is_active !== false
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-rose-100 text-rose-700"
                                }`}
                              >
                                {rbacSelectedRole.is_active !== false
                                  ? "Active"
                                  : "Inactive"}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                              Grant Read or Full Access per dashboard page, then
                              save. This controls whether the page is even
                              visible to this role - not what happens inside it.
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                dashboardPages.forEach((page) =>
                                  setRbacDashboardAccess(
                                    page.moduleCode,
                                    "write",
                                  ),
                                )
                              }
                              disabled={rbacSelectedRole.code === "super-admin"}
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <i className="fas fa-check-double mr-1.5" />
                              Full Access - All Pages
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                dashboardPages.forEach((page) =>
                                  setRbacDashboardAccess(
                                    page.moduleCode,
                                    "none",
                                  ),
                                )
                              }
                              disabled={rbacSelectedRole.code === "super-admin"}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <i className="fas fa-times mr-1.5" />
                              Revoke All
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openRbacEditRoleModal(rbacSelectedRole)
                              }
                              disabled={rbacSelectedRole.is_system}
                              className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <i className="fas fa-edit" />
                              Edit Role
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openRbacDeleteRoleModal(rbacSelectedRole)
                              }
                              disabled={rbacSelectedRole.is_system}
                              className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <i className="fas fa-trash" />
                              Delete
                            </button>
                          </div>
                        </div>

                        {rbacSelectedRole.code === "super-admin" ? (
                          <div className="mx-5 mt-5 flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
                            <i className="fas fa-shield-alt" />
                            <span>
                              This is the Super Admin role - it always has Full
                              Access to every dashboard page and can't be
                              restricted here.
                            </span>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px]">
                              <thead className="bg-white">
                                <tr className="border-b border-slate-200">
                                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Dashboard Page
                                  </th>

                                  <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Access Level
                                  </th>
                                </tr>
                              </thead>

                              <tbody className="divide-y divide-slate-100">
                                {rbacDashboardPermissionForm.map((page) => (
                                  <tr
                                    key={page.moduleCode}
                                    className="transition hover:bg-slate-50"
                                  >
                                    <td className="px-5 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                          <i className={page.icon} />
                                        </div>

                                        <div>
                                          <p className="font-semibold text-slate-800">
                                            {page.label}
                                          </p>

                                          <p className="text-xs text-slate-500">
                                            {page.description}
                                          </p>
                                        </div>
                                      </div>
                                    </td>

                                    <td className="px-4 py-4">
                                      <div className="mx-auto flex w-fit rounded-lg border border-slate-200 bg-slate-50 p-1">
                                        {dashboardAccessLevels.map(
                                          (levelOption) => {
                                            const active =
                                              page.access === levelOption.value;

                                            return (
                                              <button
                                                key={levelOption.value}
                                                type="button"
                                                title={levelOption.description}
                                                onClick={() =>
                                                  setRbacDashboardAccess(
                                                    page.moduleCode,
                                                    levelOption.value,
                                                  )
                                                }
                                                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                                                  active
                                                    ? levelOption.value ===
                                                      "write"
                                                      ? "bg-emerald-600 text-white shadow-sm"
                                                      : levelOption.value ===
                                                          "read"
                                                        ? "bg-indigo-600 text-white shadow-sm"
                                                        : "bg-slate-500 text-white shadow-sm"
                                                    : "text-slate-500 hover:text-slate-800"
                                                }`}
                                              >
                                                {levelOption.label}
                                              </button>
                                            );
                                          },
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}

                                {rbacDashboardPermissionForm.length === 0 && (
                                  <tr>
                                    <td
                                      colSpan={2}
                                      className="px-5 py-12 text-center text-sm text-slate-500"
                                    >
                                      No dashboard pages are configured yet.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}

                        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p
                              className={`text-sm ${
                                rbacHasUnsavedRolePermissionChanges
                                  ? "font-semibold text-amber-700"
                                  : "text-slate-500"
                              }`}
                            >
                              {rbacHasUnsavedRolePermissionChanges
                                ? "You have unsaved permission changes."
                                : "All permission changes are saved."}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={saveRbacRolePermissions}
                            disabled={
                              rbacSavingPermissions ||
                              !rbacHasUnsavedRolePermissionChanges
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {rbacSavingPermissions ? (
                              <>
                                <i className="fas fa-spinner animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-save" />
                                Save Changes
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                          <i className="fas fa-user-tag text-xl" />
                        </div>

                        <p className="mt-3 font-semibold text-slate-700">
                          Select a role
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Select one of the roles above to manage permissions.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* =================================================
            CARD 2: USER ROLE ASSIGNMENT
        ================================================== */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">
                          User Role Assignment
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          Filter users and select a user to assign roles,
                          permissions or temporary access.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-indigo-50 px-3 py-1.5 font-semibold text-indigo-700">
                          {rbacStats.total_users || rbacUsers.length} Users
                        </span>

                        <span className="rounded-full bg-amber-50 px-3 py-1.5 font-semibold text-amber-700">
                          {rbacStats.users_with_overrides || 0} Custom Access
                        </span>

                        <span className="rounded-full bg-rose-50 px-3 py-1.5 font-semibold text-rose-700">
                          {rbacStats.temporary_access_users || 0} Temporary
                        </span>
                      </div>
                    </div>

                    {/* FILTERS */}
                    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[220px_minmax(260px,1fr)_190px_160px_auto_auto]">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                          User Type
                        </label>

                        <select
                          name="user_type"
                          value={rbacUserFilters.user_type}
                          onChange={updateRbacUserFilter}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        >
                          {rbacUserTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                          Search User
                        </label>

                        <div className="relative">
                          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400" />

                          <input
                            type="text"
                            name="search"
                            value={rbacUserFilters.search}
                            onChange={updateRbacUserFilter}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                loadRbacUsers(rbacUserFilters);
                              }
                            }}
                            placeholder="Name, email, username or ID..."
                            className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                          Role
                        </label>

                        <select
                          name="role_id"
                          value={rbacUserFilters.role_id}
                          onChange={updateRbacUserFilter}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        >
                          <option value="">All Roles</option>

                          {rbacRoles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                          Status
                        </label>

                        <select
                          name="status"
                          value={rbacUserFilters.status}
                          onChange={updateRbacUserFilter}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        >
                          <option value="">All Status</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="temporary">Temporary Access</option>
                          <option value="override">Custom Permission</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => loadRbacUsers(rbacUserFilters)}
                        disabled={rbacUsersLoading}
                        className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {rbacUsersLoading ? (
                          <i className="fas fa-spinner animate-spin" />
                        ) : (
                          <i className="fas fa-filter" />
                        )}
                        Apply
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const resetFilters = resetRbacUserFilters();
                          loadRbacUsers(resetFilters, {
                            clearSelectedUser: true,
                          });
                        }}
                        className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <i className="fas fa-undo" />
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* USER LIST */}
                  <div className="p-5">
                    {rbacUsersLoading ? (
                      <div className="flex min-h-[260px] items-center justify-center">
                        <div className="text-center">
                          <i className="fas fa-spinner animate-spin text-3xl text-indigo-600" />

                          <p className="mt-3 text-sm text-slate-500">
                            Loading users...
                          </p>
                        </div>
                      </div>
                    ) : rbacUsers.length === 0 ? (
                      <div className="py-16 text-center">
                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                          <i className="fas fa-users" />
                        </div>

                        <p className="font-semibold text-slate-700">
                          No users found
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Change the user type or filter options.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {rbacUsers.map((user) => {
                          const isSelected =
                            rbacSelectedUserKey === user.user_key;

                          return (
                            <button
                              key={user.user_key}
                              type="button"
                              onClick={() => selectRbacUser(user, true)}
                              className={`rounded-xl border p-4 text-left transition ${
                                isSelected
                                  ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
                                  : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 hover:shadow-sm"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {user.profile_image ? (
                                  <img
                                    src={user.profile_image}
                                    alt={user.name}
                                    className="h-12 w-12 shrink-0 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
                                    {user.name?.charAt(0)?.toUpperCase() ||
                                      user.username?.charAt(0)?.toUpperCase() ||
                                      "U"}
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="truncate font-bold text-slate-900">
                                        {user.name ||
                                          user.username ||
                                          `User ${user.id}`}
                                      </p>

                                      <p className="mt-1 truncate text-xs text-slate-500">
                                        {user.email ||
                                          user.username ||
                                          `ID: ${user.id}`}
                                      </p>
                                    </div>

                                    <i className="fas fa-chevron-right mt-1 text-xs text-slate-400" />
                                  </div>

                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">
                                      {user.user_type}
                                    </span>

                                    <span className="rounded-md bg-indigo-100 px-2 py-1 text-[10px] font-bold text-indigo-700">
                                      {user.role_name ||
                                        user.role?.name ||
                                        "No Role"}
                                    </span>

                                    {user.has_overrides && (
                                      <span className="rounded-md bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">
                                        Custom Permission
                                      </span>
                                    )}

                                    {user.is_temporary && (
                                      <span className="rounded-md bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-700">
                                        Temporary
                                      </span>
                                    )}

                                    {user.status && (
                                      <span
                                        className={`rounded-md px-2 py-1 text-[10px] font-bold ${
                                          String(user.status).toLowerCase() ===
                                          "active"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-slate-100 text-slate-600"
                                        }`}
                                      >
                                        {user.status}
                                      </span>
                                    )}
                                  </div>

                                  {user.is_temporary && user.expires_at && (
                                    <p className="mt-2 text-[11px] font-medium text-rose-600">
                                      <i className="fas fa-clock mr-1" />
                                      Expires:{" "}
                                      {new Date(
                                        user.expires_at,
                                      ).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* =====================================================
        USER ACCESS POPUP
    ====================================================== */}
            {rbacUserAccessModalOpen && rbacSelectedUser && (
              <div
                className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    closeRbacUserAccessModal();
                  }
                }}
              >
                <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                  {/* POPUP HEADER */}
                  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6 sm:py-5">
                    <div className="flex min-w-0 items-center gap-4">
                      {rbacSelectedUser.profile_image ? (
                        <img
                          src={rbacSelectedUser.profile_image}
                          alt={rbacSelectedUser.name}
                          className="h-12 w-12 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">
                          {rbacSelectedUser.name?.charAt(0)?.toUpperCase() ||
                            rbacSelectedUser.username
                              ?.charAt(0)
                              ?.toUpperCase() ||
                            "U"}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-bold text-slate-900">
                          {rbacSelectedUser.name || rbacSelectedUser.username}
                        </h3>

                        <p className="truncate text-sm text-slate-500">
                          {rbacSelectedUser.email ||
                            rbacSelectedUser.username ||
                            `User ID: ${rbacSelectedUser.id}`}
                        </p>

                        <div className="mt-1 flex flex-wrap gap-2">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                            {rbacSelectedUser.user_type}
                          </span>

                          <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                            {rbacSelectedUser.role_name ||
                              rbacSelectedUserAccess?.role?.name ||
                              "No Role"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={closeRbacUserAccessModal}
                      disabled={rbacSavingUserAccess}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      <i className="fas fa-times" />
                    </button>
                  </div>

                  {rbacUserAccessLoading ? (
                    <div className="flex min-h-[500px] items-center justify-center">
                      <div className="text-center">
                        <i className="fas fa-spinner animate-spin text-4xl text-indigo-600" />

                        <p className="mt-3 text-sm text-slate-500">
                          Loading user access...
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-y-auto p-5 sm:p-6">
                      {/* ===========================================
                  ROLE AND TEMPORARY ACCESS
              ============================================ */}
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        {/* ASSIGN ROLE */}
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                              <i className="fas fa-user-tag" />
                            </div>

                            <div>
                              <h4 className="font-bold text-slate-900">
                                Assigned Role
                              </h4>

                              <p className="text-xs text-slate-500">
                                Select the main role for this user.
                              </p>
                            </div>
                          </div>

                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Role
                          </label>

                          <select
                            value={
                              rbacSelectedUserAccess?.role?.id ||
                              rbacSelectedUser.role_id ||
                              ""
                            }
                            onChange={(event) =>
                              assignRbacRoleToUser(event.target.value)
                            }
                            disabled={rbacSavingUserAccess}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <option value="">No Role Assigned</option>

                            {rbacRoleOptions.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>

                          <p className="mt-2 text-xs text-slate-500">
                            Role permissions are inherited automatically.
                            Individual permissions below can override them.
                          </p>
                        </div>

                        {/* TEMPORARY ACCESS */}
                        <div
                          className={`rounded-xl border p-4 ${
                            rbacTemporaryAccessForm.is_temporary
                              ? "border-amber-300 bg-amber-50"
                              : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <label className="flex cursor-pointer items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                                  rbacTemporaryAccessForm.is_temporary
                                    ? "bg-amber-200 text-amber-800"
                                    : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                <i className="fas fa-clock" />
                              </div>

                              <div>
                                <p
                                  className={`font-bold ${
                                    rbacTemporaryAccessForm.is_temporary
                                      ? "text-amber-900"
                                      : "text-slate-900"
                                  }`}
                                >
                                  Temporary Permission
                                </p>

                                <p
                                  className={`mt-1 text-xs ${
                                    rbacTemporaryAccessForm.is_temporary
                                      ? "text-amber-700"
                                      : "text-slate-500"
                                  }`}
                                >
                                  Automatically revoke custom permissions after
                                  the selected date and time.
                                </p>
                              </div>
                            </div>

                            <div className="relative mt-1 shrink-0">
                              <input
                                type="checkbox"
                                name="is_temporary"
                                checked={Boolean(
                                  rbacTemporaryAccessForm.is_temporary,
                                )}
                                onChange={updateRbacTemporaryAccessForm}
                                className="peer sr-only"
                              />

                              <div className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-amber-600" />

                              <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                            </div>
                          </label>

                          {rbacTemporaryAccessForm.is_temporary && (
                            <div className="mt-4 space-y-4 border-t border-amber-200 pt-4">
                              <div>
                                <label className="mb-1.5 block text-xs font-bold text-amber-900">
                                  Access Expiry Date & Time
                                  <span className="ml-1 text-rose-600">*</span>
                                </label>

                                <input
                                  type="datetime-local"
                                  name="expires_at"
                                  value={rbacTemporaryAccessForm.expires_at}
                                  onChange={updateRbacTemporaryAccessForm}
                                  className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                                />
                              </div>

                              <div>
                                <label className="mb-1.5 block text-xs font-bold text-amber-900">
                                  Reason
                                </label>

                                <textarea
                                  name="reason"
                                  rows={3}
                                  value={rbacTemporaryAccessForm.reason}
                                  onChange={updateRbacTemporaryAccessForm}
                                  placeholder="Example: Temporary exam result verification access"
                                  className="w-full resize-none rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                                />
                              </div>

                              <div className="rounded-lg border border-amber-200 bg-white/70 p-3">
                                <p className="text-xs font-medium text-amber-800">
                                  <i className="fas fa-info-circle mr-1.5" />
                                  After expiry, the user will continue using
                                  only the assigned role permissions.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ===========================================
                  PERMISSION OVERRIDES
              ============================================ */}
                      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
                        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h4 className="font-bold text-slate-900">
                              Individual Dashboard Access Overrides
                            </h4>

                            <p className="mt-1 text-xs text-slate-500">
                              Give this one user extra (or reduced) access to a
                              dashboard page, without changing their whole role.
                              Pick "Inherit" to go back to what their role
                              allows.
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                            <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-indigo-700">
                              Inherit = From Role
                            </span>

                            <span className="rounded-md border border-slate-300 bg-slate-100 px-2 py-1 text-slate-600">
                              No Access = Blocked
                            </span>

                            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
                              Read / Write = Granted
                            </span>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[640px]">
                            <thead className="bg-white">
                              <tr className="border-b border-slate-200">
                                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                  Dashboard Page
                                </th>

                                <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                                  Access Level
                                </th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                              {rbacDashboardOverrideForm.map((page) => (
                                <tr
                                  key={`popup-${page.moduleCode}`}
                                  className="transition hover:bg-slate-50"
                                >
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                        <i className={page.icon} />
                                      </div>

                                      <div>
                                        <p className="font-semibold text-slate-800">
                                          {page.label}
                                        </p>

                                        <p className="text-xs text-slate-500">
                                          Role grants:{" "}
                                          {page.inheritedLevel === "none"
                                            ? "No Access"
                                            : page.inheritedLevel === "write"
                                              ? "Full Access"
                                              : "Read Only"}
                                        </p>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="px-4 py-4">
                                    <div className="mx-auto flex w-fit flex-wrap justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                                      <button
                                        type="button"
                                        title="Use whatever the user's role grants for this page"
                                        onClick={() =>
                                          setRbacUserDashboardOverride(
                                            page.moduleCode,
                                            "inherit",
                                          )
                                        }
                                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                                          !page.hasOverride
                                            ? "bg-indigo-600 text-white shadow-sm"
                                            : "text-slate-500 hover:text-slate-800"
                                        }`}
                                      >
                                        Inherit
                                      </button>

                                      {dashboardAccessLevels.map(
                                        (levelOption) => {
                                          const active =
                                            page.hasOverride &&
                                            page.overrideLevel ===
                                              levelOption.value;

                                          return (
                                            <button
                                              key={levelOption.value}
                                              type="button"
                                              title={levelOption.description}
                                              onClick={() =>
                                                setRbacUserDashboardOverride(
                                                  page.moduleCode,
                                                  levelOption.value,
                                                )
                                              }
                                              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                                                active
                                                  ? levelOption.value ===
                                                    "write"
                                                    ? "bg-emerald-600 text-white shadow-sm"
                                                    : levelOption.value ===
                                                        "read"
                                                      ? "bg-indigo-600 text-white shadow-sm"
                                                      : "bg-slate-500 text-white shadow-sm"
                                                  : "text-slate-500 hover:text-slate-800"
                                              }`}
                                            >
                                              {levelOption.label}
                                            </button>
                                          );
                                        },
                                      )}
                                    </div>

                                    <p
                                      className={`mt-1.5 text-center text-[10px] font-medium ${
                                        page.effectiveLevel !== "none"
                                          ? "text-emerald-600"
                                          : "text-rose-500"
                                      }`}
                                    >
                                      Effective:{" "}
                                      {page.effectiveLevel === "none"
                                        ? "No Access"
                                        : page.effectiveLevel === "write"
                                          ? "Full Access"
                                          : "Read Only"}
                                    </p>
                                  </td>
                                </tr>
                              ))}

                              {rbacDashboardOverrideForm.length === 0 && (
                                <tr>
                                  <td
                                    colSpan={2}
                                    className="px-5 py-12 text-center text-sm text-slate-500"
                                  >
                                    No dashboard pages are configured yet.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* POPUP FOOTER */}
                  <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <button
                      type="button"
                      onClick={resetRbacUserOverrides}
                      disabled={rbacSavingUserAccess || rbacUserAccessLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <i className="fas fa-undo" />
                      Reset to Role Permissions
                    </button>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={closeRbacUserAccessModal}
                        disabled={rbacSavingUserAccess}
                        className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={saveRbacUserOverrides}
                        disabled={
                          rbacSavingUserAccess ||
                          rbacUserAccessLoading ||
                          (rbacTemporaryAccessForm.is_temporary &&
                            !rbacTemporaryAccessForm.expires_at)
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {rbacSavingUserAccess ? (
                          <>
                            <i className="fas fa-spinner animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save" />
                            Apply Role & Permissions
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================
        CREATE / EDIT ROLE MODAL
    ====================================================== */}
            {rbacRoleModalOpen && (
              <div
                className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    closeRbacRoleModal();
                  }
                }}
              >
                <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {rbacRoleForm.id ? "Edit Role" : "Add New Role"}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {rbacRoleForm.id
                          ? "Update role information."
                          : "Create a role and configure permissions after saving."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeRbacRoleModal}
                      disabled={rbacSavingRole}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      <i className="fas fa-times" />
                    </button>
                  </div>

                  <div className="space-y-4 p-6">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Role Name
                        <span className="ml-1 text-rose-500">*</span>
                      </label>

                      <input
                        type="text"
                        name="name"
                        value={rbacRoleForm.name}
                        onChange={updateRbacRoleForm}
                        placeholder="Example: Hostel Administrator"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Role Code
                        <span className="ml-1 text-rose-500">*</span>
                      </label>

                      <input
                        type="text"
                        name="code"
                        value={rbacRoleForm.code}
                        onChange={updateRbacRoleForm}
                        placeholder="Example: hostel_administrator"
                        disabled={Boolean(rbacRoleForm.id)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                      />

                      <p className="mt-1 text-xs text-slate-500">
                        Use lowercase letters and underscores. The code cannot
                        be changed after creation.
                      </p>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        User Type
                      </label>

                      <select
                        name="user_type"
                        value={rbacRoleForm.user_type}
                        onChange={updateRbacRoleForm}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      >
                        {rbacUserTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}

                        <option value="all">All User Types</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Description
                      </label>

                      <textarea
                        name="description"
                        rows={4}
                        value={rbacRoleForm.description}
                        onChange={updateRbacRoleForm}
                        placeholder="Describe the role responsibilities..."
                        className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <p className="font-semibold text-slate-800">
                          Active Role
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Inactive roles cannot be assigned to new users.
                        </p>
                      </div>

                      <div className="relative">
                        <input
                          type="checkbox"
                          name="is_active"
                          checked={Boolean(rbacRoleForm.is_active)}
                          onChange={updateRbacRoleForm}
                          className="peer sr-only"
                        />

                        <div className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-indigo-600" />

                        <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                      </div>
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                    <button
                      type="button"
                      onClick={closeRbacRoleModal}
                      disabled={rbacSavingRole}
                      className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={saveRbacRole}
                      disabled={
                        rbacSavingRole ||
                        !rbacRoleForm.name.trim() ||
                        !rbacRoleForm.code.trim()
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {rbacSavingRole ? (
                        <>
                          <i className="fas fa-spinner animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save" />
                          {rbacRoleForm.id ? "Update Role" : "Create Role"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================
        DELETE ROLE CONFIRMATION
    ====================================================== */}
            {rbacDeleteRoleModalOpen && rbacSelectedRole && (
              <div
                className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    closeRbacDeleteRoleModal();
                  }
                }}
              >
                <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
                  <div className="p-6 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                      <i className="fas fa-trash-alt text-2xl" />
                    </div>

                    <h3 className="mt-4 text-lg font-bold text-slate-900">
                      Delete Role?
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Are you sure you want to delete{" "}
                      <span className="font-bold text-slate-800">
                        {rbacSelectedRole.name}
                      </span>
                      ? Users assigned to this role may lose access.
                    </p>
                  </div>

                  <div className="flex gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                    <button
                      type="button"
                      onClick={closeRbacDeleteRoleModal}
                      disabled={rbacDeletingRole}
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={deleteRbacRole}
                      disabled={rbacDeletingRole}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {rbacDeletingRole ? (
                        <>
                          <i className="fas fa-spinner animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-trash" />
                          Delete Role
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

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
                Promote students and download reports. Enrolling new students
                now happens from the Academic Dashboard.
              </p>
            </div>

            {/* TABS */}
            <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl shadow text-sm">
              {["promote", "report"].map((tab) => (
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
                  {tab === "promote" && "Promote Students"}
                  {tab === "report" && "Download Reports"}
                </button>
              ))}
            </div>

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

        {/* =========================== ATTENDANCE SECTION START ============================ */}
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
