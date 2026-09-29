import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { APP_NAME, APP_YEAR, FILE_BASE_URL } from "../config/appConfig";
import "../css/dashboard.css";
import { useDashboardUI } from "../controllers/useDashboardUI";
import { useAdminDashboard } from "../controllers/AdminSide/adminDashboard";
import { useAdminProfile } from "../controllers/AdminSide/useAdminProfile";
import { useDashboardAccess } from "../controllers/Auth/useDashboardAccess";
import { useLibraryCategories } from "../controllers/Library/useLibraryCategories";
import { useLibraryAuthors } from "../controllers/Library/useLibraryAuthors";
import { useLibraryStudents } from "../controllers/Library/useAddLibraryStudents";
import { useAddLibraryBook } from "../controllers/Library/useAddLibraryBook";
import { useLibraryTeachers } from "../controllers/Library/useLibraryTeachers";
import { useLibraryMembers } from "../controllers/Library/useLibraryMembers";
import { useLibraryCirculation } from "../controllers/Library/useLibraryCirculation";
import { useLibraryReturns } from "../controllers/Library/useLibraryReturns";
import { useLibraryFines } from "../controllers/Library/useLibraryFines";
import { useLibraryTransactions } from "../controllers/Library/useLibraryTransactions";
import { useLibraryReports } from "../controllers/Library/useLibraryReports";
import { useLibraryDashboard } from "../controllers/Library/useLibraryDashboard";
import { useLibraryNotifications } from "../controllers/Library/useLibraryNotifications";
import { useLibraryPermission } from "../controllers/Library/useLibraryPermission";

const BookDetailItem = ({ label, value }) => {
  const displayValue =
    value !== null && value !== undefined && value !== "" ? value : "—";

  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <div className="min-h-[42px] rounded-lg bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700">
        {displayValue}
      </div>
    </div>
  );
};

const StudentDetailItem = ({ label, value }) => {
  const displayValue =
    value !== null && value !== undefined && value !== "" ? value : "—";

  return (
    <div className="rounded-xl bg-white/10 p-3">
      <p className="text-xs text-indigo-100">{label}</p>

      <p className="mt-1 break-words text-sm font-medium text-white">
        {displayValue}
      </p>
    </div>
  );
};

const TeacherStatCard = ({ label, value }) => {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-gray-900">{value ?? 0}</p>
    </div>
  );
};

function AdminDashboard() {
  // UI STATE (LOCAL COMPONENT STATE)
  const location = useLocation();

  const [activeSection, setActiveSection] = useState(
    location.state?.activeSection || "dashboard",
  );
  // const [noticeTab, setNoticeTab] = useState("announcements");
  const [search, setSearch] = useState("");

  const { canWriteLibrary, libraryAccessLevel } = useLibraryPermission();
  const { dashboards: accessibleDashboards } = useDashboardAccess();

  const otherAccessibleDashboards = (accessibleDashboards || []).filter(
    (dashboard) => dashboard.key !== "library-admin-dashboard",
  );

  // ================= DASHBOARD HOOK =================
  const {
    navigate,

    sidebarOpen,
    sidebarExpanded,
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

    markAllNotificationsRead,
    deleteNotification,
    fetchNotifications,

    toast,
  } = useAdminDashboard(activeSection, setActiveSection);

  // ================= PROFILE HOOK =================
  const {
    admin,
    formData,
    editMode,
    setEditMode,
    handleChange,
    handleSave,
    passwordModalOpen,
    setPasswordModalOpen,
    passwordData,
    passwordLoading,
    handlePasswordChange,
    handleChangePassword,
    handleLogout,

    isLibraryAdmin,
    isSuperAdmin,
    canAccess,
    allowedModules,
    dashboardType,
  } = useAdminProfile({ fetchWithAuth, showToast });

  const {
    dashboardStats,

    dashboardIssueTrend,
    dashboardRevenueTrend,

    dashboardRecentActivity,
    dashboardOverdueAlerts,
    dashboardRecentBooks,

    libraryDashboardLoading,

    maxIssueTrend,
    maxRevenueTrend,

    loadLibraryDashboard,
    formatActivityTime,
  } = useLibraryDashboard({
    activeSection,
    fetchWithAuth,
    showToast,
  });

  // ================= LIBRARY CATEGORIES =================
  const {
    categories,
    categoryStats,
    categoryPagination,
    categoryFilters,
    categoryForm,
    categoryModalOpen,
    categoryDeleteModal,
    categoryLoading,
    categorySaving,
    categoryDeleting,
    categoryStatusLoadingId,
    categoryErrors,
    categoryPageNumbers,

    loadCategories,
    updateCategoryFilter,
    resetCategoryFilters,
    updateCategoryForm,
    openCreateCategoryModal,
    openEditCategoryModal,
    closeCategoryModal,
    saveCategory,
    toggleCategoryStatus,
    requestDeleteCategory,
    closeDeleteCategoryModal,
    deleteCategory,
  } = useLibraryCategories({
    activeSection,
    fetchWithAuth,
    showToast,
  });

  const {
    authors,
    authorCountries,
    authorStats,
    authorPagination,
    authorFilters,
    authorForm,
    authorModalOpen,
    authorDeleteModal,
    authorLoading,
    authorSaving,
    authorDeleting,
    authorStatusLoadingId,
    authorErrors,
    authorPageNumbers,

    loadAuthors,
    updateAuthorFilter,
    resetAuthorFilters,
    updateAuthorForm,
    openCreateAuthorModal,
    openEditAuthorModal,
    closeAuthorModal,
    saveAuthor,
    toggleAuthorStatus,
    requestDeleteAuthor,
    closeDeleteAuthorModal,
    deleteAuthor,
  } = useLibraryAuthors({
    activeSection,
    fetchWithAuth,
    showToast,
  });

  const {
    bookForm,
    bookFormErrors,
    bookSaving,
    updateBookForm,
    saveBook,
    resetBookForm,

    bookAuthors,
    bookCategories,
    bookOptionsLoading,
    hasBookOptions,
    loadBookOptions,

    recentBooks,
    recentBooksLoading,
    loadRecentBooks,
    refreshAddBookSection,

    bookRows,
    bookStats,
    bookFilters,
    bookPagination,
    booksLoading,
    deletingBookId,

    updateBookFilter,
    loadBooks,
    applyBookFilters,
    resetBookFilters,
    changeBookPage,
    changeBookPageSize,
    refreshBookSection,

    selectedBook,
    bookDetailsModalOpen,
    openBookDetails,
    closeBookDetails,
    openEditBook,
    deleteBook,
    editingBookId,
  } = useAddLibraryBook({
    activeSection,
    fetchWithAuth,
    showToast,
    setActiveSection,
  });

  const {
    students,
    studentClasses,
    studentFilters,
    studentPagination,
    studentStats,
    studentsLoading,

    selectedLibraryStudent,
    studentDetails,
    studentDetailsLoading,
    studentDetailsModalOpen,

    fineModalOpen,
    fineSaving,
    fineForm,
    fineFormErrors,

    updateStudentFilter,
    applyStudentFilters,
    resetStudentFilters,
    changeStudentPage,
    changeStudentPageSize,
    refreshStudents,
    exportStudentsCSV,

    openStudentDetails,
    closeStudentDetails,

    openFineModal,
    closeFineModal,
    updateFineForm,
    saveFinePayment,

    issueBookToStudent,
  } = useLibraryStudents({
    activeSection,
    fetchWithAuth,
    showToast,
    setActiveSection,
  });

  const {
    libraryTeachers,
    teacherDepartments,
    teacherLibraryFilters,
    teacherLibraryPagination,
    teacherLibraryStats,
    libraryTeachersLoading,

    selectedLibraryTeacher,
    teacherLibraryDetails,
    teacherDetailsLoading,
    teacherDetailsModalOpen,

    teacherFineModalOpen,
    teacherFineSaving,
    teacherFineForm,
    teacherFineErrors,

    updateTeacherLibraryFilter,
    applyTeacherLibraryFilters,
    resetTeacherLibraryFilters,
    changeTeacherLibraryPage,

    openTeacherLibraryDetails,
    closeTeacherLibraryDetails,
    issueBookToTeacher,

    openTeacherFineModal,
    closeTeacherFineModal,
    updateTeacherFineForm,
    saveTeacherFine,

    exportLibraryTeachersCSV,
  } = useLibraryTeachers({
    activeSection,
    fetchWithAuth,
    showToast,
    setActiveSection,
  });

  const {
    libraryMembers,
    memberDepartments,
    memberFilters,
    memberPagination,
    memberStats,
    membersLoading,

    selectedMember,
    memberModalOpen,
    memberDetails,
    memberDetailsLoading,

    updateMemberFilter,
    applyMemberFilters,
    resetMemberFilters,
    changeMemberPage,

    openMemberDetails,
    closeMemberDetails,
    issueBookToMember,
    payMemberFine,
    exportMembersCSV,
  } = useLibraryMembers({
    activeSection,
    fetchWithAuth,
    showToast,
    setActiveSection,
  });

  const {
    issueForm,
    issueFormErrors,
    issueMembers,
    availableBooks,

    circulationRows,
    circulationFilters,
    circulationStats,
    circulationPagination,

    optionsLoading,
    circulationLoading,
    issueSaving,
    returningIssueKey,

    selectedIssue,
    issueDetailsOpen,

    updateIssueForm,
    resetIssueForm,
    saveIssue,

    updateCirculationFilter,
    applyCirculationFilters,
    resetCirculationFilters,
    changeCirculationPage,

    returnIssuedBook,
    openIssueDetails,
    closeIssueDetails,

    memberSearch,
    memberDropdownOpen,
    selectedIssueMember,

    updateMemberSearch,
    selectIssueMember,
    clearSelectedMember,
    setMemberDropdownOpen,
    circulationExporting,
    exportCirculationReport,
  } = useLibraryCirculation({
    activeSection,
    fetchWithAuth,
    showToast,
  });

  const {
    returnForm,
    returnFormErrors,

    activeIssueOptions,
    issueSearch,
    issueDropdownOpen,
    selectedIssuedRecord,
    calculatedReturnInfo,

    returnRecords,
    returnFilters,
    returnStats,
    returnPagination,

    returnOptionsLoading,
    returnRecordsLoading,
    returnSaving,
    returnExporting,

    selectedReturnRecord,
    returnDetailsOpen,

    updateReturnForm,
    selectIssuedRecord,
    clearIssuedRecord,
    setIssueSearch,
    setIssueDropdownOpen,
    resetReturnForm,
    processReturn,

    updateReturnFilter,
    applyReturnFilters,
    resetReturnFilters,
    changeReturnPage,
    exportReturnReport,

    loadReturnOptions,
    loadReturnRecords,

    openReturnDetails,
    closeReturnDetails,
  } = useLibraryReturns({
    activeSection,
    fetchWithAuth,
    showToast,
  });

  const {
    fineRows,
    fineFilters,
    fineStats,
    finePagination,

    finesLoading,
    finesExporting,

    selectedFine,
    fineDetails,
    fineDetailsLoading,
    fineDetailsOpen,

    fineActionOpen,
    fineActionSaving,
    fineActionForm,
    fineActionErrors,

    loadFines,
    updateFineFilter,
    applyFineFilters,
    resetFineFilters,
    changeFinePage,

    openFineDetails,
    closeFineDetails,

    openFineAction,
    closeFineAction,
    updateFineActionForm,
    saveFineAction,

    exportFineReport,
  } = useLibraryFines({
    activeSection,
    fetchWithAuth,
    showToast,
  });

  const {
    transactionRows,
    transactionFilters,
    transactionStats,
    transactionPagination,

    transactionsLoading,
    transactionsExporting,

    selectedTransaction,
    transactionDetailsOpen,

    loadTransactions,
    updateTransactionFilter,
    applyTransactionFilters,
    resetTransactionFilters,
    changeTransactionPage,
    exportTransactionReport,

    openTransactionDetails,
    closeTransactionDetails,
  } = useLibraryTransactions({
    activeSection,
    fetchWithAuth,
    showToast,
  });

  const {
    reportFilters,
    reportStats,
    reportRows,

    issueTrend,
    memberDistribution,
    categoryDistribution,
    topBooks,

    reportPagination,

    reportsLoading,
    reportsExporting,

    maxTrendValue,
    maxMemberValue,

    loadReports,
    updateReportFilter,
    applyReportFilters,
    resetReportFilters,
    changeReportPage,
    exportReport,
  } = useLibraryReports({
    activeSection,
    fetchWithAuth,
    showToast,
  });

  const {
    libraryNotifications,
    libraryNotificationStats,
    libraryNotificationFilters,
    libraryNotificationPagination,

    libraryNotificationsLoading,

    notificationModalOpen,
    notificationForm,
    notificationFormErrors,
    notificationSaving,

    selectedLibraryNotification,
    notificationDetailsOpen,

    notificationRetryingId,

    loadLibraryNotifications,

    updateNotificationFilter,
    applyNotificationFilters,
    resetNotificationFilters,
    changeNotificationPage,

    openNotificationModal,
    closeNotificationModal,

    updateNotificationForm,
    saveNotification,

    openNotificationDetails,
    closeNotificationDetails,

    retryNotification,
  } = useLibraryNotifications({
    activeSection,
    fetchWithAuth,
    showToast,
  });

  useEffect(() => {
    if (!admin?.id) return;

    if (!isSuperAdmin && !isLibraryAdmin) {
      showToast("You do not have access to the Library Dashboard", "error");
      navigate("/super-admin-dashboard", { replace: true });
    }
  }, [admin?.id, isSuperAdmin, isLibraryAdmin, navigate, showToast]);

  useEffect(() => {
    const desktopMedia = window.matchMedia("(min-width: 768px)");

    const syncSidebar = (event) => {
      if (event.matches) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    syncSidebar(desktopMedia);
    desktopMedia.addEventListener("change", syncSidebar);

    return () => {
      desktopMedia.removeEventListener("change", syncSidebar);
    };
  }, [setSidebarOpen]);

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-gray-50 dark:bg-slate-950">
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
        className={`sidebar fixed inset-y-0 left-0 z-[60] flex h-dvh flex-col
    border-r border-gray-200 bg-white/95 shadow-2xl backdrop-blur-xl
    transition-[width,transform] duration-300 ease-in-out
    dark:border-slate-700 dark:bg-slate-900/95
    ${sidebarOpen ? "translate-x-0 w-72" : "-translate-x-full w-72"}
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
        {/* ========================= LIBRARY ADMIN SIDEBAR NAV ========================= */}
        <nav
          aria-label="Library management navigation"
          className="min-h-0 flex-1 space-y-2 no-scrollbar overflow-y-auto overscroll-contain px-3 py-4 text-sm [scrollbar-width:thin]"
        >
          {[
            {
              title: "MAIN",
              items: [["dashboard", "bi-grid-fill", "Dashboard"]],
            },
            {
              title: "CATALOG SETUP",
              items: [
                ["categories", "bi-tags", "Categories"],
                ["authors", "bi-person-lines-fill", "Authors"],
                ["add-book", "bi-plus-circle", "Add Book"],
                ["book", "bi-book", "All Books"],
              ],
            },
            {
              title: "LIBRARY USERS",
              items: [
                ["students", "bi-mortarboard", "Students"],
                ["teachers", "bi-person-badge", "Teachers"],
                ["members", "bi-people", "All Members"],
              ],
            },
            {
              title: "CIRCULATION",
              items: [
                ["issued-books", "bi-box-arrow-up-right", "Issued Books"],
                ["return-books", "bi-box-arrow-in-down-left", "Returned Books"],
              ],
            },
            {
              title: "FINES & PAYMENTS",
              items: [
                ["fines", "bi-cash-coin", "Fine Management"],
                ["transactions", "bi-receipt", "Transactions"],
              ],
            },
            {
              title: "REPORTS & COMMUNICATION",
              items: [
                ["reports", "bi-bar-chart-line", "Reports & Analytics"],
                ["notifications", "bi-bell", "Notifications"],
              ],
            },
            {
              title: "SYSTEM",
              items: [
                ["settings", "bi-gear", "Settings"],
                ["activity-logs", "bi-shield-check", "Activity Logs"],
              ],
            },
          ].map((section) => (
            <div key={section.title}>
              {sidebarExpanded && (
                <p className="text-xs text-gray-400 px-2 mt-4">
                  {section.title}
                </p>
              )}

              {section.items.map(([key, icon, label]) => {
                const isActive = activeSection === key;

                return (
                  <button
                    key={key}
                    type="button"
                    title={!sidebarExpanded ? label : ""}
                    onClick={() => {
                      setActiveSection(key);
                      closeSidebarOnMobile();
                    }}
                    className={`relative flex w-full items-center rounded-xl py-3
              transition-all duration-300 ease-in-out
              ${
                sidebarExpanded
                  ? "gap-3 px-4 justify-start"
                  : "justify-center px-0"
              }
              ${
                isActive
                  ? "bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-500/20 dark:to-indigo-500/20 text-purple-700 dark:text-purple-300 font-semibold shadow"
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
                    ? "opacity-100 max-w-[190px]"
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

          {/* OTHER DASHBOARDS THIS ADMIN HAS BEEN GRANTED ACCESS TO */}
          {otherAccessibleDashboards.length > 0 && (
            <div>
              {sidebarExpanded && (
                <p className="text-xs text-gray-400 px-2 mt-4">
                  OTHER DASHBOARDS
                </p>
              )}

              {otherAccessibleDashboards.map((dashboard) => (
                <button
                  key={dashboard.key}
                  type="button"
                  title={!sidebarExpanded ? dashboard.label : ""}
                  onClick={() => {
                    navigate(dashboard.route);
                    closeSidebarOnMobile();
                  }}
                  className={`relative flex w-full items-center rounded-xl py-3
              transition-all duration-300 ease-in-out
              ${
                sidebarExpanded
                  ? "gap-3 px-4 justify-start"
                  : "justify-center px-0"
              }
              text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-800 dark:hover:text-white`}
                >
                  <i className="bi bi-grid-3x3-gap-fill text-base shrink-0" />

                  <span
                    className={`whitespace-nowrap truncate overflow-hidden
                transition-all duration-300 ease-in-out
                ${
                  sidebarExpanded
                    ? "opacity-100 max-w-[190px]"
                    : "opacity-0 max-w-0"
                }`}
                  >
                    {dashboard.label}
                  </span>

                  {sidebarExpanded && (
                    <i className="bi bi-box-arrow-up-right ml-auto shrink-0 text-xs opacity-60" />
                  )}
                </button>
              ))}
            </div>
          )}
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
        className={`maincolor min-h-screen min-w-0 flex-1 overflow-x-hidden
    px-3 py-4 text-gray-800 transition-[margin,width] duration-300
    dark:bg-slate-900 dark:text-gray-100
    sm:px-5 sm:py-6 lg:px-8
    ${sidebarExpanded ? "md:ml-64" : "md:ml-20"}`}
      >
        {/* CENTER WRAPPER */}
        <div className="mx-auto w-full max-w-[1600px] space-y-5 sm:space-y-6">
          {/* TOAST */}
          {toast.show && (
            <div className="pointer-events-none fixed inset-x-3 top-20 z-[9999] flex justify-end sm:inset-x-auto sm:right-6 sm:top-[90px]">
              <div
                role="status"
                aria-live="polite"
                className={`pointer-events-auto w-full max-w-sm rounded-2xl px-5 py-3 text-sm text-white shadow-2xl
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

          {/* READ-ONLY ACCESS BANNER */}
          {!canWriteLibrary && (
            <div
              role="status"
              className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
            >
              <i className="bi bi-eye text-lg" />
              <span>
                <strong className="font-semibold">Read-only access.</strong> You
                can view, filter and download data on this dashboard, but
                adding, editing, issuing, returning or deleting records is
                turned off. Ask your Super Admin for Full Access if you need to
                make changes.
              </span>
            </div>
          )}

          {/* HEADER */}
          <header
            className="sticky top-2 z-40 flex items-center justify-between gap-3
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
                aria-label={
                  sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"
                }
                title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
                aria-expanded={sidebarExpanded}
                className="sidebar-toggle hidden h-10 w-10 shrink-0 items-center justify-center
          rounded-full bg-white/70 shadow-md backdrop-blur-md
          transition-all duration-300 hover:scale-105 hover:bg-white
          dark:bg-slate-700/70 dark:hover:bg-slate-600 md:flex"
              >
                <i
                  className={`bi ${
                    sidebarExpanded ? "bi-chevron-left" : "bi-chevron-right"
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
                        <span>
                          Notifications
                          {totalUnread > 0 && (
                            <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                              {totalUnread} new
                            </span>
                          )}
                        </span>

                        <div className="flex items-center gap-3">
                          {totalUnread > 0 && (
                            <button
                              type="button"
                              onClick={() => markAllNotificationsRead?.()}
                              className="text-xs font-medium text-indigo-600 transition hover:text-indigo-800 dark:text-indigo-300"
                            >
                              Mark all read
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setShowNotifications(false)}
                            className="text-xs text-gray-500 transition hover:text-red-500"
                          >
                            ✕
                          </button>
                        </div>
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

                      <button
                        type="button"
                        onClick={() => {
                          setActiveSection("notifications");
                          setShowNotifications(false);
                        }}
                        className="w-full border-t p-3 text-center text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-700"
                      >
                        <i className="bi bi-bell me-1" />
                        All notifications
                      </button>
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
        {/* ================= LIBRARY DASHBOARD ================= */}
        {activeSection === "dashboard" && (
          <section className="section active space-y-6 p-4 sm:p-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Library Dashboard</h2>

                  <p className="mt-1 text-sm text-blue-100">
                    Today&apos;s circulation, inventory, members and fine
                    overview
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    loadLibraryDashboard({
                      silent: true,
                    })
                  }
                  disabled={libraryDashboardLoading}
                  className="self-start rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/25 disabled:opacity-50"
                >
                  <i
                    className={`bi bi-arrow-clockwise mr-2 ${
                      libraryDashboardLoading ? "inline-block animate-spin" : ""
                    }`}
                  ></i>
                  Refresh
                </button>
              </div>
            </div>

            {/* PRIMARY KPIs */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
              {[
                [
                  "Book Titles",
                  dashboardStats.total_titles,
                  "bi-book",
                  "bg-indigo-100 text-indigo-700",
                ],
                [
                  "Total Copies",
                  dashboardStats.total_copies,
                  "bi-bookshelf",
                  "bg-blue-100 text-blue-700",
                ],
                [
                  "Issued",
                  dashboardStats.currently_issued,
                  "bi-box-arrow-up-right",
                  "bg-cyan-100 text-cyan-700",
                ],
                [
                  "Overdue",
                  dashboardStats.overdue_books,
                  "bi-exclamation-triangle",
                  "bg-red-100 text-red-700",
                ],
                [
                  "Members",
                  dashboardStats.total_members,
                  "bi-people",
                  "bg-purple-100 text-purple-700",
                ],
                [
                  "Fine Collected",
                  `₹${Number(dashboardStats.fine_collected || 0).toFixed(2)}`,
                  "bi-cash-stack",
                  "bg-green-100 text-green-700",
                ],
              ].map(([label, value, icon, iconClass]) => (
                <div
                  key={label}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        {label}
                      </p>

                      <p className="mt-2 text-xl font-bold text-gray-900">
                        {value ?? 0}
                      </p>
                    </div>

                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
                    >
                      <i className={`bi ${icon}`}></i>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* TODAY STATS */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Available Copies</p>

                <p className="mt-1 text-xl font-bold text-green-700">
                  {dashboardStats.available_copies || 0}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Issued Today</p>

                <p className="mt-1 text-xl font-bold text-blue-700">
                  {dashboardStats.issued_today || 0}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Returned Today</p>

                <p className="mt-1 text-xl font-bold text-green-700">
                  {dashboardStats.returned_today || 0}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Due Soon</p>

                <p className="mt-1 text-xl font-bold text-amber-700">
                  {dashboardStats.due_soon || 0}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Pending Fine</p>

                <p className="mt-1 text-xl font-bold text-red-700">
                  ₹{Number(dashboardStats.fine_pending || 0).toFixed(2)}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Fine Waived</p>

                <p className="mt-1 text-xl font-bold text-purple-700">
                  ₹{Number(dashboardStats.fine_waived || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* QUICK SHORTCUTS */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Quick Shortcuts
                  </h3>

                  <p className="mt-1 text-xs text-gray-500">
                    Common library operations
                  </p>
                </div>

                <i className="bi bi-lightning-charge text-xl text-amber-500"></i>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {[
                  {
                    label: "Issue Book",
                    section: "issued-books",
                    icon: "bi-box-arrow-up-right",
                    className:
                      "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
                  },
                  {
                    label: "Return Book",
                    section: "return-books",
                    icon: "bi-box-arrow-in-down-left",
                    className: "bg-green-50 text-green-700 hover:bg-green-100",
                  },
                  {
                    label: "Add Book",
                    section: "add-book",
                    icon: "bi-book-half",
                    className: "bg-amber-50 text-amber-700 hover:bg-amber-100",
                  },
                  {
                    label: "All Books",
                    section: "book",
                    icon: "bi-bookshelf",
                    className: "bg-blue-50 text-blue-700 hover:bg-blue-100",
                  },
                  {
                    label: "Students",
                    section: "students",
                    icon: "bi-mortarboard",
                    className: "bg-cyan-50 text-cyan-700 hover:bg-cyan-100",
                  },
                  {
                    label: "Teachers",
                    section: "teachers",
                    icon: "bi-person-workspace",
                    className:
                      "bg-purple-50 text-purple-700 hover:bg-purple-100",
                  },
                  {
                    label: "Other Members",
                    section: "members",
                    icon: "bi-people",
                    className: "bg-slate-50 text-slate-700 hover:bg-slate-100",
                  },
                  {
                    label: "Fine Management",
                    section: "fines",
                    icon: "bi-currency-rupee",
                    className: "bg-red-50 text-red-700 hover:bg-red-100",
                  },
                  {
                    label: "Transactions",
                    section: "transactions",
                    icon: "bi-receipt",
                    className:
                      "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                  },
                  {
                    label: "Categories",
                    section: "categories",
                    icon: "bi-tags",
                    className:
                      "bg-orange-50 text-orange-700 hover:bg-orange-100",
                  },
                  {
                    label: "Authors",
                    section: "authors",
                    icon: "bi-person-lines-fill",
                    className:
                      "bg-violet-50 text-violet-700 hover:bg-violet-100",
                  },
                  {
                    label: "Reports",
                    section: "reports",
                    icon: "bi-bar-chart-line",
                    className: "bg-sky-50 text-sky-700 hover:bg-sky-100",
                  },
                ].map((shortcut) => (
                  <button
                    key={shortcut.section}
                    type="button"
                    onClick={() => setActiveSection(shortcut.section)}
                    className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-transparent p-4 text-center transition ${shortcut.className}`}
                  >
                    <i className={`bi ${shortcut.icon} text-xl`}></i>

                    <span className="text-xs font-semibold">
                      {shortcut.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* MEMBER SUMMARY */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                ["Students", dashboardStats.students, "bi-mortarboard"],
                ["Teachers", dashboardStats.teachers, "bi-person-workspace"],
                ["Non-Teaching Staff", dashboardStats.staff, "bi-person-badge"],
                ["Administrators", dashboardStats.admins, "bi-person-gear"],
              ].map(([label, value, icon]) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                    <i className={`bi ${icon} text-lg`}></i>
                  </span>

                  <div>
                    <p className="text-xs text-gray-500">{label}</p>

                    <p className="text-lg font-bold text-gray-900">
                      {value || 0}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* CHARTS */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {/* ISSUE / RETURN TREND */}
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-5">
                  <h3 className="font-semibold text-gray-900">
                    7-Day Circulation Trend
                  </h3>

                  <p className="mt-1 text-xs text-gray-500">
                    Issued versus returned books
                  </p>
                </div>

                <div className="flex h-64 items-end gap-3 border-b border-l px-3 pb-8">
                  {dashboardIssueTrend.map((item) => {
                    const issuedHeight = Math.max(
                      (Number(item.issued || 0) / maxIssueTrend) * 170,
                      3,
                    );

                    const returnedHeight = Math.max(
                      (Number(item.returned || 0) / maxIssueTrend) * 170,
                      3,
                    );

                    return (
                      <div
                        key={item.date}
                        className="flex flex-1 flex-col items-center"
                      >
                        <div className="flex h-[180px] items-end gap-1">
                          <div
                            className="w-3 rounded-t bg-indigo-500"
                            style={{
                              height: `${issuedHeight}px`,
                            }}
                            title={`${item.issued} issued`}
                          ></div>

                          <div
                            className="w-3 rounded-t bg-green-500"
                            style={{
                              height: `${returnedHeight}px`,
                            }}
                            title={`${item.returned} returned`}
                          ></div>
                        </div>

                        <span className="mt-2 text-[10px] text-gray-500">
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex justify-center gap-5 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded bg-indigo-500"></span>
                    Issued
                  </span>

                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded bg-green-500"></span>
                    Returned
                  </span>
                </div>
              </div>

              {/* REVENUE TREND */}
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-5">
                  <h3 className="font-semibold text-gray-900">
                    7-Day Fine Collection
                  </h3>

                  <p className="mt-1 text-xs text-gray-500">
                    Fine payments collected each day
                  </p>
                </div>

                <div className="flex h-64 items-end gap-4 border-b border-l px-3 pb-8">
                  {dashboardRevenueTrend.map((item) => {
                    const height = Math.max(
                      (Number(item.amount || 0) / maxRevenueTrend) * 170,
                      3,
                    );

                    return (
                      <div
                        key={item.date}
                        className="flex flex-1 flex-col items-center"
                      >
                        <span className="mb-1 text-[10px] font-medium text-gray-500">
                          ₹{Number(item.amount || 0).toFixed(0)}
                        </span>

                        <div
                          className="w-full max-w-8 rounded-t bg-emerald-500"
                          style={{
                            height: `${height}px`,
                          }}
                        ></div>

                        <span className="mt-2 text-[10px] text-gray-500">
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* OVERDUE + RECENT BOOKS */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {/* OVERDUE ALERTS */}
              <div className="overflow-hidden rounded-xl border border-red-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-red-100 bg-red-50 px-5 py-4">
                  <div>
                    <h3 className="font-semibold text-red-700">
                      Overdue Alerts
                    </h3>

                    <p className="mt-1 text-xs text-red-500">
                      Members requiring immediate follow-up
                    </p>
                  </div>

                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                    {dashboardStats.overdue_books || 0}
                  </span>
                </div>

                <div className="max-h-[360px] overflow-y-auto">
                  {dashboardOverdueAlerts.length === 0 ? (
                    <div className="p-10 text-center">
                      <i className="bi bi-check-circle text-3xl text-green-500"></i>

                      <p className="mt-2 text-sm font-medium text-gray-700">
                        No overdue books
                      </p>
                    </div>
                  ) : (
                    dashboardOverdueAlerts.map((alert) => (
                      <button
                        key={`${alert.member_type}-${alert.id}`}
                        type="button"
                        onClick={() => setActiveSection("issued-books")}
                        className="flex w-full items-center justify-between gap-4 border-b px-5 py-4 text-left hover:bg-red-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {alert.member_name}
                          </p>

                          <p className="mt-1 truncate text-xs text-gray-500">
                            {alert.member_code}
                            {" • "}
                            {alert.book_title}
                          </p>

                          <p className="mt-1 text-xs text-red-600">
                            Due {alert.due_date}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold text-red-600">
                            {alert.overdue_days} days
                          </p>

                          <p className="text-xs text-gray-500">
                            ₹{Number(alert.fine_amount || 0).toFixed(2)}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* RECENTLY ADDED BOOKS */}
              <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b px-5 py-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Recently Added Books
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      Latest books added to the library
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveSection("book")}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    View All
                  </button>
                </div>

                <div>
                  {dashboardRecentBooks.length === 0 ? (
                    <div className="p-10 text-center text-sm text-gray-500">
                      No books available.
                    </div>
                  ) : (
                    dashboardRecentBooks.map((book) => (
                      <button
                        key={book.id}
                        type="button"
                        onClick={() => setActiveSection("book")}
                        className="flex w-full items-center gap-3 border-b px-5 py-4 text-left hover:bg-gray-50"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                          <i className="bi bi-book"></i>
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {book.title}
                          </p>

                          <p className="mt-1 truncate text-xs text-gray-500">
                            {book.book_code}
                            {book.author ? ` • ${book.author}` : ""}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-semibold text-green-700">
                            {book.available_copies}/{book.total_copies}
                          </p>

                          <p className="text-[10px] text-gray-500">Available</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* RECENT ACTIVITY */}
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Recent Activity
                  </h3>

                  <p className="mt-1 text-xs text-gray-500">
                    Latest circulation and fine activity
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSection("transactions")}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Transactions
                </button>
              </div>

              <div className="divide-y">
                {dashboardRecentActivity.length === 0 ? (
                  <div className="p-10 text-center text-sm text-gray-500">
                    No recent activity.
                  </div>
                ) : (
                  dashboardRecentActivity.map((activity) => {
                    const icon =
                      activity.type === "issue"
                        ? "bi-box-arrow-up-right"
                        : activity.type === "return"
                          ? "bi-box-arrow-in-down-left"
                          : activity.type === "payment"
                            ? "bi-cash-coin"
                            : "bi-slash-circle";

                    const iconClass =
                      activity.type === "issue"
                        ? "bg-blue-100 text-blue-700"
                        : activity.type === "return"
                          ? "bg-green-100 text-green-700"
                          : activity.type === "payment"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-purple-100 text-purple-700";

                    return (
                      <div
                        key={activity.id}
                        className="flex items-center gap-4 px-5 py-4"
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
                        >
                          <i className={`bi ${icon}`}></i>
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-800">
                            {activity.title}
                          </p>
                        </div>

                        <span className="shrink-0 text-xs text-gray-400">
                          {formatActivityTime(activity.date)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        )}

        {/* ================= CATEGORIES SECTION ================= */}
        {activeSection === "categories" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Book Categories
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Create, organize and maintain your library catalogue
                    categories.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadCategories()}
                    disabled={categoryLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i
                      className={`bi bi-arrow-clockwise ${
                        categoryLoading ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={openCreateCategoryModal}
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow transition hover:bg-gray-100"
                  >
                    <i className="bi bi-plus-lg" />
                    Add Category
                  </button>
                </div>
              </div>
            </div>

            {/* STATISTICS */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                {
                  label: "Total Categories",
                  value: categoryStats.total_categories,
                  icon: "bi-tags",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Active",
                  value: categoryStats.active_categories,
                  icon: "bi-check-circle",
                  classes:
                    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
                },
                {
                  label: "Inactive",
                  value: categoryStats.inactive_categories,
                  icon: "bi-pause-circle",
                  classes:
                    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                },
                {
                  label: "Categorized Books",
                  value: categoryStats.assigned_books,
                  icon: "bi-book",
                  classes:
                    "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
                },
                {
                  label: "Uncategorized",
                  value: categoryStats.uncategorized_books,
                  icon: "bi-exclamation-circle",
                  classes:
                    "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {stat.label}
                      </p>

                      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                        {Number(stat.value || 0)}
                      </p>
                    </div>

                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.classes}`}
                    >
                      <i className={`bi ${stat.icon} text-lg`} />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* FILTERS */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="relative xl:col-span-2">
                  <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />

                  <input
                    type="search"
                    value={categoryFilters.search}
                    onChange={(event) =>
                      updateCategoryFilter("search", event.target.value)
                    }
                    placeholder="Search name or description..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={categoryFilters.status}
                  onChange={(event) =>
                    updateCategoryFilter("status", event.target.value)
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <select
                  value={categoryFilters.sort_by}
                  onChange={(event) =>
                    updateCategoryFilter("sort_by", event.target.value)
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="display_order">Display Order</option>
                  <option value="name">Category Name</option>
                  <option value="total_books">Total Books</option>
                  <option value="created_at">Date Created</option>
                  <option value="updated_at">Last Updated</option>
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateCategoryFilter(
                        "sort_direction",
                        categoryFilters.sort_direction === "asc"
                          ? "desc"
                          : "asc",
                      )
                    }
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                  >
                    <i
                      className={`bi ${
                        categoryFilters.sort_direction === "asc"
                          ? "bi-sort-up"
                          : "bi-sort-down"
                      }`}
                    />

                    {categoryFilters.sort_direction === "asc"
                      ? "Ascending"
                      : "Descending"}
                  </button>

                  <button
                    type="button"
                    onClick={resetCategoryFilters}
                    title="Reset filters"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              </div>
            </div>

            {/* CATEGORY TABLE */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-col justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-slate-700 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Category Directory
                  </h2>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {categoryPagination.total || 0} category record(s) found
                  </p>
                </div>

                <select
                  value={categoryFilters.per_page}
                  onChange={(event) =>
                    updateCategoryFilter("per_page", Number(event.target.value))
                  }
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>

              <div className="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900/70 dark:text-gray-400">
                    <tr>
                      <th className="px-5 py-3">#</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Books</th>
                      <th className="px-5 py-3">Order</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Updated</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {categoryLoading ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-500">
                            <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                            Loading categories...
                          </div>
                        </td>
                      </tr>
                    ) : categories.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-16 text-center">
                          <div className="mx-auto max-w-sm">
                            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                              <i className="bi bi-tags text-2xl" />
                            </span>

                            <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                              No categories found
                            </h3>

                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              Add your first book category or change the current
                              filters.
                            </p>

                            <button
                              type="button"
                              onClick={openCreateCategoryModal}
                              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                            >
                              Add Category
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      categories.map((category, index) => (
                        <tr
                          key={category.id}
                          className="transition hover:bg-gray-50/80 dark:hover:bg-slate-700/40"
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-gray-500">
                            {(categoryPagination.page - 1) *
                              categoryPagination.per_page +
                              index +
                              1}
                          </td>

                          <td className="min-w-[260px] px-5 py-4">
                            <div className="flex items-start gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                                <i className="bi bi-tag-fill" />
                              </span>

                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {category.name}
                                </p>

                                <p className="mt-0.5 line-clamp-2 max-w-md text-xs text-gray-500 dark:text-gray-400">
                                  {category.description ||
                                    "No description provided"}
                                </p>

                                <p className="mt-1 text-[11px] text-gray-400">
                                  {category.slug}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                              <i className="bi bi-book" />
                              {category.total_books || 0}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-gray-600 dark:text-gray-300">
                            {category.display_order ?? 0}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <button
                              type="button"
                              onClick={() => toggleCategoryStatus(category)}
                              disabled={categoryStatusLoadingId === category.id}
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                category.status === "Active"
                                  ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300"
                                  : "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300"
                              }`}
                            >
                              {categoryStatusLoadingId === category.id ? (
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    category.status === "Active"
                                      ? "bg-emerald-500"
                                      : "bg-amber-500"
                                  }`}
                                />
                              )}

                              {category.status}
                            </button>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500 dark:text-gray-400">
                            {category.updated_at
                              ? new Date(
                                  category.updated_at,
                                ).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditCategoryModal(category)}
                                title="Edit category"
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-100 text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                              >
                                <i className="bi bi-pencil-square" />
                              </button>

                              <button
                                type="button"
                                onClick={() => requestDeleteCategory(category)}
                                title="Delete category"
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-600 transition hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10"
                              >
                                <i className="bi bi-trash3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              {!categoryLoading && categoryPagination.total > 0 && (
                <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 px-5 py-4 dark:border-slate-700 sm:flex-row">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Page {categoryPagination.page} of{" "}
                    {categoryPagination.pages || 1}
                  </p>

                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      disabled={!categoryPagination.has_prev}
                      onClick={() =>
                        updateCategoryFilter(
                          "page",
                          categoryPagination.page - 1,
                        )
                      }
                      className="flex h-9 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                    >
                      <i className="bi bi-chevron-left" />
                      Previous
                    </button>

                    {categoryPageNumbers.map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => updateCategoryFilter("page", pageNumber)}
                        className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-xs font-semibold transition ${
                          categoryPagination.page === pageNumber
                            ? "bg-indigo-600 text-white shadow"
                            : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={!categoryPagination.has_next}
                      onClick={() =>
                        updateCategoryFilter(
                          "page",
                          categoryPagination.page + 1,
                        )
                      }
                      className="flex h-9 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                    >
                      Next
                      <i className="bi bi-chevron-right" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ADD / EDIT MODAL */}
            {categoryModalOpen && (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    closeCategoryModal();
                  }
                }}
              >
                <form
                  onSubmit={saveCategory}
                  className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-700">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        {categoryForm.id
                          ? "Update Category"
                          : "Add New Category"}
                      </h2>

                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Category names must be unique.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeCategoryModal}
                      disabled={categorySaving}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>

                  <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Category Name <span className="text-red-500">*</span>
                      </label>

                      <input
                        type="text"
                        value={categoryForm.name}
                        onChange={(event) =>
                          updateCategoryForm("name", event.target.value)
                        }
                        maxLength={100}
                        autoFocus
                        placeholder="Example: Science and Technology"
                        className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition dark:bg-slate-900 dark:text-white ${
                          categoryErrors.name
                            ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                            : "border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600"
                        }`}
                      />

                      <div className="mt-1 flex justify-between gap-3">
                        <p className="text-xs text-red-500">
                          {categoryErrors.name || ""}
                        </p>

                        <span className="text-[11px] text-gray-400">
                          {categoryForm.name.length}/100
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Description
                      </label>

                      <textarea
                        value={categoryForm.description}
                        onChange={(event) =>
                          updateCategoryForm("description", event.target.value)
                        }
                        maxLength={1000}
                        rows={4}
                        placeholder="Describe what type of books belong to this category..."
                        className={`w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition dark:bg-slate-900 dark:text-white ${
                          categoryErrors.description
                            ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                            : "border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600"
                        }`}
                      />

                      <div className="mt-1 flex justify-between gap-3">
                        <p className="text-xs text-red-500">
                          {categoryErrors.description || ""}
                        </p>

                        <span className="text-[11px] text-gray-400">
                          {categoryForm.description.length}
                          /1000
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Status
                        </label>

                        <select
                          value={categoryForm.status}
                          onChange={(event) =>
                            updateCategoryForm("status", event.target.value)
                          }
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Display Order
                        </label>

                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={categoryForm.display_order}
                          onChange={(event) =>
                            updateCategoryForm(
                              "display_order",
                              event.target.value,
                            )
                          }
                          className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition dark:bg-slate-900 dark:text-white ${
                            categoryErrors.display_order
                              ? "border-red-500"
                              : "border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600"
                          }`}
                        />

                        {categoryErrors.display_order && (
                          <p className="mt-1 text-xs text-red-500">
                            {categoryErrors.display_order}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/50 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeCategoryModal}
                      disabled={categorySaving}
                      className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-white disabled:opacity-60 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={categorySaving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {categorySaving ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <i
                            className={`bi ${
                              categoryForm.id
                                ? "bi-check2-circle"
                                : "bi-plus-lg"
                            }`}
                          />

                          {categoryForm.id
                            ? "Update Category"
                            : "Create Category"}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* DELETE MODAL */}
            {categoryDeleteModal.open && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
                    <i className="bi bi-trash3 text-2xl" />
                  </span>

                  <div className="mt-4 text-center">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Delete Category?
                    </h2>

                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      You are deleting{" "}
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {categoryDeleteModal.category?.name}
                      </span>
                      .
                    </p>

                    {categoryDeleteModal.assignedBooks > 0 && (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                        <div className="flex gap-2">
                          <i className="bi bi-exclamation-triangle-fill mt-0.5" />

                          <p>
                            This category contains{" "}
                            <strong>
                              {categoryDeleteModal.assignedBooks} book(s)
                            </strong>
                            . Force deletion will move those books to
                            Uncategorized.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                    <button
                      type="button"
                      onClick={closeDeleteCategoryModal}
                      disabled={categoryDeleting}
                      className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteCategory(categoryDeleteModal.assignedBooks > 0)
                      }
                      disabled={categoryDeleting}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {categoryDeleting ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-trash3" />

                          {categoryDeleteModal.assignedBooks > 0
                            ? "Delete & Unassign"
                            : "Delete Category"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================= AUTHORS SECTION ================= */}
        {activeSection === "authors" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Authors Management
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Create, update and manage library book authors
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateAuthorModal}
                  className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 px-4 py-2.5 rounded-xl text-sm font-semibold shadow hover:bg-indigo-50 transition"
                >
                  <span className="text-lg leading-none">+</span>
                  Add Author
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
                <p className="text-xs font-medium text-gray-500">
                  Total Authors
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {authorStats.total_authors || 0}
                </p>
              </div>

              <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
                <p className="text-xs font-medium text-gray-500">
                  Active Authors
                </p>

                <p className="mt-2 text-2xl font-bold text-green-600">
                  {authorStats.active_authors || 0}
                </p>
              </div>

              <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
                <p className="text-xs font-medium text-gray-500">
                  Inactive Authors
                </p>

                <p className="mt-2 text-2xl font-bold text-amber-600">
                  {authorStats.inactive_authors || 0}
                </p>
              </div>

              <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
                <p className="text-xs font-medium text-gray-500">
                  Books Assigned
                </p>

                <p className="mt-2 text-2xl font-bold text-indigo-600">
                  {authorStats.assigned_books || 0}
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                <div className="xl:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Search
                  </label>

                  <input
                    type="text"
                    value={authorFilters.search}
                    onChange={(event) =>
                      updateAuthorFilter("search", event.target.value)
                    }
                    placeholder="Search by author or country..."
                    className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Country
                  </label>

                  <select
                    value={authorFilters.country}
                    onChange={(event) =>
                      updateAuthorFilter("country", event.target.value)
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Countries</option>

                    {authorCountries.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Status
                  </label>

                  <select
                    value={authorFilters.status}
                    onChange={(event) =>
                      updateAuthorFilter("status", event.target.value)
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={resetAuthorFilters}
                    className="w-full border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={() => loadAuthors()}
                    disabled={authorLoading}
                    className="w-full bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
              <div className="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
                <table className="w-full text-sm min-w-[850px]">
                  <thead className="bg-gray-50 text-gray-600 border-b">
                    <tr>
                      <th className="p-3 text-left font-semibold">#</th>
                      <th className="p-3 text-left font-semibold">Author</th>
                      <th className="p-3 text-left font-semibold">Country</th>
                      <th className="p-3 text-left font-semibold">Books</th>
                      <th className="p-3 text-left font-semibold">Status</th>
                      <th className="p-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {authorLoading ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="p-10 text-center text-gray-500"
                        >
                          Loading authors...
                        </td>
                      </tr>
                    ) : authors.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-10 text-center">
                          <div className="text-gray-400 text-3xl mb-2">✍</div>

                          <p className="font-medium text-gray-700">
                            No authors found
                          </p>

                          <p className="text-xs text-gray-500 mt-1">
                            Add an author or change your filters.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      authors.map((author, index) => (
                        <tr
                          key={author.id}
                          className="hover:bg-gray-50 transition"
                        >
                          <td className="p-3 text-gray-500">
                            {(authorPagination.page - 1) *
                              authorPagination.per_page +
                              index +
                              1}
                          </td>

                          <td className="p-3">
                            <div className="font-semibold text-gray-900">
                              {author.name}
                            </div>

                            {author.biography && (
                              <p className="text-xs text-gray-500 mt-1 max-w-md truncate">
                                {author.biography}
                              </p>
                            )}
                          </td>

                          <td className="p-3 text-gray-700">
                            {author.country || "—"}
                          </td>

                          <td className="p-3">
                            <span className="inline-flex items-center justify-center min-w-8 px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                              {author.total_books || 0}
                            </span>
                          </td>

                          <td className="p-3">
                            <button
                              type="button"
                              disabled={authorStatusLoadingId === author.id}
                              onClick={() => toggleAuthorStatus(author)}
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                author.status === "Active"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-600"
                              } disabled:opacity-50`}
                            >
                              {authorStatusLoadingId === author.id
                                ? "Updating..."
                                : author.status}
                            </button>
                          </td>

                          <td className="p-3">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditAuthorModal(author)}
                                className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => requestDeleteAuthor(author)}
                                className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100"
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

              {/* Pagination */}
              {!authorLoading && authorPagination.total > 0 && (
                <div className="border-t px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    Showing page {authorPagination.page} of{" "}
                    {authorPagination.pages || 1}
                    {" • "}
                    {authorPagination.total} author(s)
                  </p>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={!authorPagination.has_prev}
                      onClick={() =>
                        updateAuthorFilter("page", authorPagination.page - 1)
                      }
                      className="px-3 py-1.5 border rounded-lg text-xs disabled:opacity-40"
                    >
                      Previous
                    </button>

                    {authorPageNumbers.map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => updateAuthorFilter("page", pageNumber)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold ${
                          authorPagination.page === pageNumber
                            ? "bg-indigo-600 text-white"
                            : "border text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={!authorPagination.has_next}
                      onClick={() =>
                        updateAuthorFilter("page", authorPagination.page + 1)
                      }
                      className="px-3 py-1.5 border rounded-lg text-xs disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Create/Edit Modal */}
            {authorModalOpen && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {authorForm.id ? "Edit Author" : "Add Author"}
                      </h3>

                      <p className="text-xs text-gray-500">
                        Enter the author information.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeAuthorModal}
                      disabled={authorSaving}
                      className="w-9 h-9 rounded-full hover:bg-gray-100 text-gray-500 text-xl"
                    >
                      ×
                    </button>
                  </div>

                  <form onSubmit={saveAuthor} className="p-5 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Author Name *
                      </label>

                      <input
                        type="text"
                        value={authorForm.name}
                        onChange={(event) =>
                          updateAuthorForm("name", event.target.value)
                        }
                        placeholder="e.g. H.C. Verma"
                        className={`border rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 ${
                          authorErrors.name
                            ? "border-red-400 focus:ring-red-200"
                            : "border-gray-300 focus:ring-indigo-500"
                        }`}
                      />

                      {authorErrors.name && (
                        <p className="mt-1 text-xs text-red-600">
                          {authorErrors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Country
                      </label>

                      <input
                        type="text"
                        value={authorForm.country}
                        onChange={(event) =>
                          updateAuthorForm("country", event.target.value)
                        }
                        placeholder="e.g. India"
                        className={`border rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 ${
                          authorErrors.country
                            ? "border-red-400 focus:ring-red-200"
                            : "border-gray-300 focus:ring-indigo-500"
                        }`}
                      />

                      {authorErrors.country && (
                        <p className="mt-1 text-xs text-red-600">
                          {authorErrors.country}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Biography
                      </label>

                      <textarea
                        rows="4"
                        value={authorForm.biography}
                        onChange={(event) =>
                          updateAuthorForm("biography", event.target.value)
                        }
                        placeholder="Short information about the author..."
                        className={`border rounded-lg px-3 py-2.5 text-sm w-full resize-none focus:outline-none focus:ring-2 ${
                          authorErrors.biography
                            ? "border-red-400 focus:ring-red-200"
                            : "border-gray-300 focus:ring-indigo-500"
                        }`}
                      />

                      {authorErrors.biography && (
                        <p className="mt-1 text-xs text-red-600">
                          {authorErrors.biography}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Status
                      </label>

                      <select
                        value={authorForm.status}
                        onChange={(event) =>
                          updateAuthorForm("status", event.target.value)
                        }
                        className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>

                    <div className="pt-3 border-t flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={closeAuthorModal}
                        disabled={authorSaving}
                        className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 disabled:opacity-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={authorSaving}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {authorSaving
                          ? "Saving..."
                          : authorForm.id
                            ? "Update Author"
                            : "Add Author"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Delete Modal */}
            {authorDeleteModal.open && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                  <div className="p-5">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xl mb-4">
                      !
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900">
                      Delete Author
                    </h3>

                    <p className="text-sm text-gray-600 mt-2">
                      Are you sure you want to delete{" "}
                      <strong>{authorDeleteModal.author?.name}</strong>?
                    </p>

                    {authorDeleteModal.requiresForce && (
                      <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-sm">
                        This author has{" "}
                        <strong>{authorDeleteModal.assignedBooks}</strong>{" "}
                        assigned book(s). Force deleting will remove the author
                        connection from those books while keeping the old author
                        name as text.
                      </div>
                    )}
                  </div>

                  <div className="px-5 py-4 bg-gray-50 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeDeleteAuthorModal}
                      disabled={authorDeleting}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteAuthor(authorDeleteModal.requiresForce)
                      }
                      disabled={authorDeleting}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                    >
                      {authorDeleting
                        ? "Deleting..."
                        : authorDeleteModal.requiresForce
                          ? "Force Delete"
                          : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================= ADD BOOK SECTION ================= */}
        {activeSection === "add-book" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold ">
                    {editingBookId ? "Edit Book" : "Add New Book"}
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Add a new book and connect it with an existing author and
                    category.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={refreshAddBookSection}
                  disabled={bookOptionsLoading || recentBooksLoading}
                  className="bg-white/15 hover:bg-white/25 border border-white/30 px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50"
                >
                  {bookOptionsLoading || recentBooksLoading
                    ? "Refreshing..."
                    : "Refresh"}
                </button>
              </div>
            </div>

            {/* Warning when master records are missing */}
            {(!bookAuthors.length || !bookCategories.length) &&
              !bookOptionsLoading && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  {!bookAuthors.length && (
                    <p>
                      No active authors are available. Create an author from
                      Authors Management first.
                    </p>
                  )}

                  {!bookCategories.length && (
                    <p>
                      No active categories are available. Create a category from
                      Categories Management first.
                    </p>
                  )}
                </div>
              )}

            {/* Form */}
            <form
              onSubmit={saveBook}
              className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">
                  Book Information
                </h3>

                <p className="text-xs text-gray-500 mt-1">
                  Fields marked with * are required.
                </p>
              </div>

              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {/* Title */}
                <div className="xl:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Book Title *
                  </label>

                  <input
                    type="text"
                    value={bookForm.title}
                    onChange={(event) =>
                      updateBookForm("title", event.target.value)
                    }
                    placeholder="e.g. Physics Fundamentals"
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                      bookFormErrors.title
                        ? "border-red-400 focus:ring-red-200"
                        : "border-gray-300 focus:ring-indigo-500"
                    }`}
                  />

                  {bookFormErrors.title && (
                    <p className="text-xs text-red-600 mt-1">
                      {bookFormErrors.title}
                    </p>
                  )}
                </div>

                {/* ISBN */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    ISBN Number
                  </label>

                  <input
                    type="text"
                    value={bookForm.isbn}
                    onChange={(event) =>
                      updateBookForm("isbn", event.target.value)
                    }
                    placeholder="e.g. 978-3-16-148410-0"
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                      bookFormErrors.isbn
                        ? "border-red-400 focus:ring-red-200"
                        : "border-gray-300 focus:ring-indigo-500"
                    }`}
                  />

                  {bookFormErrors.isbn && (
                    <p className="text-xs text-red-600 mt-1">
                      {bookFormErrors.isbn}
                    </p>
                  )}
                </div>

                {/* Author */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Author *
                  </label>

                  <select
                    value={bookForm.author_id}
                    onChange={(event) =>
                      updateBookForm("author_id", event.target.value)
                    }
                    disabled={bookOptionsLoading || !bookAuthors.length}
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 disabled:bg-gray-100 ${
                      bookFormErrors.author_id
                        ? "border-red-400 focus:ring-red-200"
                        : "border-gray-300 focus:ring-indigo-500"
                    }`}
                  >
                    <option value="">
                      {bookOptionsLoading
                        ? "Loading authors..."
                        : "Select Author"}
                    </option>

                    {bookAuthors.map((author) => (
                      <option key={author.id} value={author.id}>
                        {author.name}
                        {author.country ? ` — ${author.country}` : ""}
                      </option>
                    ))}
                  </select>

                  {bookFormErrors.author_id && (
                    <p className="text-xs text-red-600 mt-1">
                      {bookFormErrors.author_id}
                    </p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Category *
                  </label>

                  <select
                    value={bookForm.category_id}
                    onChange={(event) =>
                      updateBookForm("category_id", event.target.value)
                    }
                    disabled={bookOptionsLoading || !bookCategories.length}
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 disabled:bg-gray-100 ${
                      bookFormErrors.category_id
                        ? "border-red-400 focus:ring-red-200"
                        : "border-gray-300 focus:ring-indigo-500"
                    }`}
                  >
                    <option value="">
                      {bookOptionsLoading
                        ? "Loading categories..."
                        : "Select Category"}
                    </option>

                    {bookCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>

                  {bookFormErrors.category_id && (
                    <p className="text-xs text-red-600 mt-1">
                      {bookFormErrors.category_id}
                    </p>
                  )}
                </div>

                {/* Shelf */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Shelf / Rack No *
                  </label>

                  <input
                    type="text"
                    value={bookForm.shelf_no}
                    onChange={(event) =>
                      updateBookForm("shelf_no", event.target.value)
                    }
                    placeholder="e.g. A-12"
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                      bookFormErrors.shelf_no
                        ? "border-red-400 focus:ring-red-200"
                        : "border-gray-300 focus:ring-indigo-500"
                    }`}
                  />

                  {bookFormErrors.shelf_no && (
                    <p className="text-xs text-red-600 mt-1">
                      {bookFormErrors.shelf_no}
                    </p>
                  )}
                </div>

                {/* Total Copies */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Total Copies *
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={bookForm.total_copies}
                    onChange={(event) =>
                      updateBookForm("total_copies", event.target.value)
                    }
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                      bookFormErrors.total_copies
                        ? "border-red-400 focus:ring-red-200"
                        : "border-gray-300 focus:ring-indigo-500"
                    }`}
                  />

                  {bookFormErrors.total_copies && (
                    <p className="text-xs text-red-600 mt-1">
                      {bookFormErrors.total_copies}
                    </p>
                  )}
                </div>

                {/* Available Copies */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Available Copies *
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    max={Number(bookForm.total_copies) || undefined}
                    value={bookForm.available_copies}
                    onChange={(event) =>
                      updateBookForm("available_copies", event.target.value)
                    }
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                      bookFormErrors.available_copies
                        ? "border-red-400 focus:ring-red-200"
                        : "border-gray-300 focus:ring-indigo-500"
                    }`}
                  />

                  {bookFormErrors.available_copies && (
                    <p className="text-xs text-red-600 mt-1">
                      {bookFormErrors.available_copies}
                    </p>
                  )}
                </div>

                {/* Publisher */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Publisher
                  </label>

                  <input
                    type="text"
                    value={bookForm.publisher}
                    onChange={(event) =>
                      updateBookForm("publisher", event.target.value)
                    }
                    placeholder="e.g. Pearson"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Published Year */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Published Year
                  </label>

                  <input
                    type="number"
                    min="1000"
                    max={new Date().getFullYear() + 1}
                    value={bookForm.published_year}
                    onChange={(event) =>
                      updateBookForm("published_year", event.target.value)
                    }
                    placeholder="e.g. 2020"
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                      bookFormErrors.published_year
                        ? "border-red-400 focus:ring-red-200"
                        : "border-gray-300 focus:ring-indigo-500"
                    }`}
                  />

                  {bookFormErrors.published_year && (
                    <p className="text-xs text-red-600 mt-1">
                      {bookFormErrors.published_year}
                    </p>
                  )}
                </div>

                {/* Language */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Language
                  </label>

                  <input
                    type="text"
                    value={bookForm.language}
                    onChange={(event) =>
                      updateBookForm("language", event.target.value)
                    }
                    placeholder="e.g. English"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2 xl:col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Description
                  </label>

                  <textarea
                    rows="4"
                    value={bookForm.description}
                    onChange={(event) =>
                      updateBookForm("description", event.target.value)
                    }
                    placeholder="Short description about the book..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="px-5 py-4 bg-gray-50 border-t flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={resetBookForm}
                  disabled={bookSaving}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-50"
                >
                  Reset
                </button>

                <button
                  type="submit"
                  disabled={bookSaving}
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {bookSaving ? (
                    <>
                      <i className="fas fa-spinner animate-spin mr-2"></i>

                      {editingBookId ? "Updating..." : "Saving..."}
                    </>
                  ) : (
                    <>
                      <i
                        className={`fas ${
                          editingBookId ? "fa-save" : "fa-plus"
                        } mr-2`}
                      ></i>

                      {editingBookId ? "Update Book" : "Add Book"}
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Recently Added */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Recently Added Books
                  </h3>

                  <p className="text-xs text-gray-500">
                    Latest 10 books added to the library.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadRecentBooks}
                  disabled={recentBooksLoading}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                >
                  {recentBooksLoading ? "Loading..." : "Refresh List"}
                </button>
              </div>

              <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                <div className="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
                  <table className="w-full text-sm min-w-[1000px]">
                    <thead className="bg-gray-50 text-gray-600 border-b">
                      <tr>
                        <th className="p-3 text-left">Book ID</th>
                        <th className="p-3 text-left">Title</th>
                        <th className="p-3 text-left">Author</th>
                        <th className="p-3 text-left">Category</th>
                        <th className="p-3 text-center">Copies</th>
                        <th className="p-3 text-left">Shelf</th>
                        <th className="p-3 text-left">Status</th>
                        <th className="p-3 text-left">Added On</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {recentBooksLoading ? (
                        <tr>
                          <td
                            colSpan="8"
                            className="p-10 text-center text-gray-500"
                          >
                            Loading recent books...
                          </td>
                        </tr>
                      ) : recentBooks.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="p-10 text-center">
                            <p className="font-medium text-gray-700">
                              No books added yet
                            </p>

                            <p className="text-xs text-gray-500 mt-1">
                              New books will appear here after saving.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        recentBooks.map((book) => (
                          <tr key={book.id} className="hover:bg-gray-50">
                            <td className="p-3 font-mono text-xs font-semibold text-indigo-700">
                              {book.book_code}
                            </td>

                            <td className="p-3">
                              <p className="font-semibold text-gray-900">
                                {book.title}
                              </p>

                              {book.isbn && (
                                <p className="text-xs text-gray-500 mt-1">
                                  ISBN: {book.isbn}
                                </p>
                              )}
                            </td>

                            <td className="p-3 text-gray-700">
                              {book.author_name || "—"}
                            </td>

                            <td className="p-3">
                              <span className="inline-flex px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                                {book.category_name || "Uncategorized"}
                              </span>
                            </td>

                            <td className="p-3 text-center">
                              <p className="font-semibold text-gray-900">
                                {book.available_copies}/{book.total_copies}
                              </p>

                              <p className="text-[11px] text-gray-500">
                                Available / Total
                              </p>
                            </td>

                            <td className="p-3 text-gray-700">
                              {book.shelf_no || "—"}
                            </td>

                            <td className="p-3">
                              <span
                                className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  book.status === "Available"
                                    ? "bg-green-100 text-green-700"
                                    : book.status === "Unavailable"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {book.status}
                              </span>
                            </td>

                            <td className="p-3 text-gray-600">
                              {book.created_at
                                ? new Date(book.created_at).toLocaleDateString(
                                    "en-IN",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "2-digit",
                                    },
                                  )
                                : "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ============================= ALL BOOKS SECTION START ============================= */}
        {activeSection === "book" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Library Books
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Manage, search and maintain all library books
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadBooks({ force: true })}
                    disabled={booksLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i
                      className={`fas fa-rotate ${
                        booksLoading ? "animate-spin" : ""
                      }`}
                    ></i>
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSection("add-book")}
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow transition hover:bg-gray-100"
                  >
                    <i className="fas fa-plus"></i>
                    Add Book
                  </button>
                </div>
              </div>
            </div>

            {/* STATISTICS */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Total Books
                    </p>

                    <p className="mt-2 text-2xl font-bold text-gray-800">
                      {bookStats?.total_books || 0}
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <i className="fas fa-book"></i>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Available
                    </p>

                    <p className="mt-2 text-2xl font-bold text-green-600">
                      {bookStats?.available_books || 0}
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-600">
                    <i className="fas fa-circle-check"></i>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Unavailable
                    </p>

                    <p className="mt-2 text-2xl font-bold text-amber-600">
                      {bookStats?.unavailable_books || 0}
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <i className="fas fa-circle-exclamation"></i>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Total Copies
                    </p>

                    <p className="mt-2 text-2xl font-bold text-indigo-600">
                      {bookStats?.total_copies || 0}
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                    <i className="fas fa-layer-group"></i>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Copies Available
                    </p>

                    <p className="mt-2 text-2xl font-bold text-purple-600">
                      {bookStats?.available_copies || 0}
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                    <i className="fas fa-box-open"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* SEARCH AND FILTERS */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div className="relative xl:col-span-2">
                  <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400"></i>

                  <input
                    type="text"
                    value={bookFilters.search}
                    onChange={(event) =>
                      updateBookFilter("search", event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        applyBookFilters();
                      }
                    }}
                    placeholder="Search title, author, ISBN, code..."
                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <select
                  value={bookFilters.category_id}
                  onChange={(event) =>
                    updateBookFilter("category_id", event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">All Categories</option>

                  {bookCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <select
                  value={bookFilters.author_id}
                  onChange={(event) =>
                    updateBookFilter("author_id", event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">All Authors</option>

                  {bookAuthors.map((author) => (
                    <option key={author.id} value={author.id}>
                      {author.name}
                    </option>
                  ))}
                </select>

                <select
                  value={bookFilters.status}
                  onChange={(event) =>
                    updateBookFilter("status", event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">All Statuses</option>
                  <option value="Available">Available</option>
                  <option value="Unavailable">Unavailable</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-gray-500">
                  Search by book title, code, author, category, ISBN, publisher
                  or shelf number.
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetBookFilters}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                  >
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={applyBookFilters}
                    disabled={booksLoading}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>

            {/* TABLE */}
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">Book Records</h3>

                  <p className="text-xs text-gray-500">
                    {bookPagination?.total || 0} record(s) found
                  </p>
                </div>

                <select
                  value={bookPagination?.per_page || 10}
                  onChange={(event) =>
                    changeBookPageSize(Number(event.target.value))
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                >
                  <option value={10}>10 rows</option>
                  <option value={20}>20 rows</option>
                  <option value={50}>50 rows</option>
                  <option value={100}>100 rows</option>
                </select>
              </div>

              <div className="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
                <table className="min-w-[1200px] w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Book</th>

                      <th className="px-4 py-3 text-left">Author</th>

                      <th className="px-4 py-3 text-left">Category</th>

                      <th className="px-4 py-3 text-left">ISBN</th>

                      <th className="px-4 py-3 text-left">Shelf</th>

                      <th className="px-4 py-3 text-center">Copies</th>

                      <th className="px-4 py-3 text-center">Available</th>

                      <th className="px-4 py-3 text-left">Status</th>

                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {booksLoading ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-14 text-center">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <i className="fas fa-spinner animate-spin text-2xl text-indigo-600"></i>

                            <p className="text-sm text-gray-500">
                              Loading books...
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : bookRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-14 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                              <i className="fas fa-book-open text-xl"></i>
                            </div>

                            <p className="font-medium text-gray-700">
                              No books found
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              Add a new book or change the filters.
                            </p>

                            <button
                              type="button"
                              onClick={() => setActiveSection("add-book")}
                              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                            >
                              Add First Book
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      bookRows.map((book) => (
                        <tr
                          key={book.id}
                          className="transition hover:bg-gray-50"
                        >
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => openBookDetails(book)}
                              className="text-left"
                            >
                              <div className="font-semibold text-gray-800 hover:text-indigo-600">
                                {book.title}
                              </div>

                              <div className="mt-1 text-xs text-gray-500">
                                {book.book_code ||
                                  `B${String(book.id).padStart(5, "0")}`}
                              </div>
                            </button>
                          </td>

                          <td className="px-4 py-3 text-gray-700">
                            {book.author_name || book.author || "—"}
                          </td>

                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                              {book.category_name ||
                                book.category ||
                                "Uncategorized"}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-gray-600">
                            {book.isbn || "—"}
                          </td>

                          <td className="px-4 py-3 text-gray-600">
                            {book.shelf_no || "—"}
                          </td>

                          <td className="px-4 py-3 text-center font-medium text-gray-700">
                            {book.total_copies || 0}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span
                              className={`font-semibold ${
                                Number(book.available_copies) > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {book.available_copies || 0}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                book.status === "Available"
                                  ? "bg-green-100 text-green-700"
                                  : book.status === "Unavailable"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {book.status || "Unknown"}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openBookDetails(book)}
                                title="View book"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition hover:bg-blue-50"
                              >
                                <i className="fas fa-eye"></i>
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditBook(book)}
                                title="Edit book"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-indigo-600 transition hover:bg-indigo-50"
                              >
                                <i className="fas fa-pen"></i>
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteBook(book)}
                                disabled={deletingBookId === book.id}
                                title="Delete book"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                              >
                                <i
                                  className={`fas ${
                                    deletingBookId === book.id
                                      ? "fa-spinner animate-spin"
                                      : "fa-trash"
                                  }`}
                                ></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              {!booksLoading && bookRows.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-gray-500">
                    Page {bookPagination?.page || 1} of{" "}
                    {bookPagination?.pages || 1}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        changeBookPage((bookPagination?.page || 1) - 1)
                      }
                      disabled={!bookPagination?.has_prev}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <i className="fas fa-chevron-left mr-1"></i>
                      Previous
                    </button>

                    <span className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-600">
                      {bookPagination?.page || 1}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        changeBookPage((bookPagination?.page || 1) + 1)
                      }
                      disabled={!bookPagination?.has_next}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                      <i className="fas fa-chevron-right ml-1"></i>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* BOOK DETAILS MODAL */}
            {bookDetailsModalOpen && selectedBook && (
              <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
                <div className="max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl dark:bg-slate-800 sm:rounded-2xl">
                  <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        Book Details
                      </h3>

                      <p className="text-xs text-gray-500">
                        {selectedBook.book_code}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeBookDetails}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                    <BookDetailItem
                      label="Book Title"
                      value={selectedBook.title}
                    />

                    <BookDetailItem
                      label="Book Code"
                      value={selectedBook.book_code}
                    />

                    <BookDetailItem
                      label="Author"
                      value={selectedBook.author_name || selectedBook.author}
                    />

                    <BookDetailItem
                      label="Category"
                      value={
                        selectedBook.category_name || selectedBook.category
                      }
                    />

                    <BookDetailItem label="ISBN" value={selectedBook.isbn} />

                    <BookDetailItem
                      label="Shelf Number"
                      value={selectedBook.shelf_no}
                    />

                    <BookDetailItem
                      label="Publisher"
                      value={selectedBook.publisher}
                    />

                    <BookDetailItem
                      label="Published Year"
                      value={selectedBook.published_year}
                    />

                    <BookDetailItem
                      label="Language"
                      value={selectedBook.language}
                    />

                    <BookDetailItem
                      label="Total Copies"
                      value={selectedBook.total_copies}
                    />

                    <BookDetailItem
                      label="Available Copies"
                      value={selectedBook.available_copies}
                    />

                    <BookDetailItem
                      label="Status"
                      value={selectedBook.status}
                    />

                    <div className="sm:col-span-2">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                        Description
                      </p>

                      <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                        {selectedBook.description || "No description provided"}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t px-5 py-4">
                    <button
                      type="button"
                      onClick={closeBookDetails}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Close
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        closeBookDetails();
                        openEditBook(selectedBook);
                      }}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      Edit Book
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
        {/* ============================= ALL BOOKS SECTION END ============================= */}

        {/* ================= LIBRARY STUDENTS ================= */}
        {activeSection === "students" && (
          <section className="section active space-y-6 p-4 sm:p-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Library Students</h2>

                  <p className="mt-1 text-sm text-blue-100">
                    View issued books, return history and fine records
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={refreshStudents}
                    disabled={studentsLoading}
                    className="rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/25 disabled:opacity-60"
                  >
                    <i
                      className={`bi bi-arrow-clockwise mr-2 ${
                        studentsLoading ? "inline-block animate-spin" : ""
                      }`}
                    ></i>
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={exportStudentsCSV}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-green-700"
                  >
                    <i className="bi bi-download mr-2"></i>
                    Export CSV
                  </button>
                </div>
              </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Total Students
                </p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {studentStats.total_students}
                </p>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                  Currently Issued
                </p>
                <p className="mt-2 text-2xl font-bold text-blue-700">
                  {studentStats.active_issues}
                </p>
              </div>

              <div className="rounded-xl border border-red-100 bg-red-50 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-red-600">
                  Students With Fine
                </p>
                <p className="mt-2 text-2xl font-bold text-red-700">
                  {studentStats.students_with_fine}
                </p>
              </div>

              <div className="rounded-xl border border-green-100 bg-green-50 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-green-600">
                  Fine Collected
                </p>
                <p className="mt-2 text-2xl font-bold text-green-700">
                  ₹{Number(studentStats.collected_fine || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* FILTERS */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                <input
                  type="text"
                  value={studentFilters.search}
                  onChange={(event) =>
                    updateStudentFilter("search", event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applyStudentFilters();
                    }
                  }}
                  placeholder="Name, ID, roll no, mobile..."
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 xl:col-span-2"
                />

                <select
                  value={studentFilters.class_name}
                  onChange={(event) =>
                    updateStudentFilter("class_name", event.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="">All Classes</option>

                  {studentClasses.map((classItem) => (
                    <option
                      key={classItem.academic_class_id}
                      value={classItem.class_name}
                    >
                      {classItem.class_name}
                      {classItem.batch_name ? ` (${classItem.batch_name})` : ""}
                    </option>
                  ))}
                </select>

                <select
                  value={studentFilters.status}
                  onChange={(event) =>
                    updateStudentFilter("status", event.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="">All Student Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Blocked">Blocked</option>
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyStudentFilters}
                    disabled={studentsLoading}
                    className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    Search
                  </button>

                  <button
                    type="button"
                    onClick={resetStudentFilters}
                    disabled={studentsLoading}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* TABLE */}
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
                <table className="min-w-[1100px] w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="p-3 text-left">Student</th>
                      <th className="p-3 text-left">Class</th>
                      <th className="p-3 text-center">Issued</th>
                      <th className="p-3 text-center">Returned</th>
                      <th className="p-3 text-center">Overdue</th>
                      <th className="p-3 text-right">Pending Fine</th>
                      <th className="p-3 text-right">Collected</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {studentsLoading ? (
                      <tr>
                        <td
                          colSpan="9"
                          className="p-10 text-center text-gray-500"
                        >
                          <i className="bi bi-arrow-repeat mr-2 inline-block animate-spin"></i>
                          Loading students...
                        </td>
                      </tr>
                    ) : students.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="p-10 text-center">
                          <i className="bi bi-people text-4xl text-gray-300"></i>

                          <p className="mt-3 font-medium text-gray-600">
                            No students found
                          </p>
                        </td>
                      </tr>
                    ) : (
                      students.map((student) => {
                        const status =
                          student.library_status || student.status || "Active";

                        const statusClass =
                          status === "Blocked"
                            ? "bg-red-100 text-red-700"
                            : status === "Fine Pending"
                              ? "bg-amber-100 text-amber-700"
                              : status === "Inactive"
                                ? "bg-gray-100 text-gray-600"
                                : "bg-green-100 text-green-700";

                        return (
                          <tr key={student.id} className="hover:bg-gray-50">
                            <td className="p-3">
                              <button
                                type="button"
                                onClick={() => openStudentDetails(student)}
                                className="text-left"
                              >
                                <p className="font-semibold text-indigo-700 hover:underline">
                                  {student.name}
                                </p>

                                <p className="mt-0.5 text-xs text-gray-500">
                                  {student.student_id}
                                  {student.mobile ? ` • ${student.mobile}` : ""}
                                </p>
                              </button>
                            </td>

                            <td className="p-3">
                              <p className="font-medium text-gray-800">
                                {student.class_name}
                              </p>

                              <p className="text-xs text-gray-500">
                                Roll: {student.roll_number || "—"}
                              </p>
                            </td>

                            <td className="p-3 text-center">
                              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                {student.active_books}
                              </span>
                            </td>

                            <td className="p-3 text-center">
                              {student.returned_books}
                            </td>

                            <td className="p-3 text-center">
                              <span
                                className={
                                  student.overdue_books > 0
                                    ? "font-semibold text-red-600"
                                    : "text-gray-500"
                                }
                              >
                                {student.overdue_books}
                              </span>
                            </td>

                            <td className="p-3 text-right font-semibold text-red-600">
                              ₹{Number(student.pending_fine || 0).toFixed(2)}
                            </td>

                            <td className="p-3 text-right font-medium text-green-600">
                              ₹{Number(student.collected_fine || 0).toFixed(2)}
                            </td>

                            <td className="p-3 text-center">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass}`}
                              >
                                {status}
                              </span>
                            </td>

                            <td className="p-3">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openStudentDetails(student)}
                                  className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                                >
                                  View
                                </button>

                                <button
                                  type="button"
                                  onClick={() => issueBookToStudent(student)}
                                  className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                                >
                                  Issue
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openFineModal(student)}
                                  disabled={Number(student.pending_fine) <= 0}
                                  className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  Pay Fine
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Rows:</span>

                  <select
                    value={studentPagination.per_page}
                    onChange={(event) =>
                      changeStudentPageSize(Number(event.target.value))
                    }
                    className="rounded border border-gray-300 px-2 py-1"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>

                  <span>Total: {studentPagination.total}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!studentPagination.has_prev || studentsLoading}
                    onClick={() =>
                      changeStudentPage(studentPagination.page - 1)
                    }
                    className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="text-sm text-gray-600">
                    Page {studentPagination.page} of {studentPagination.pages}
                  </span>

                  <button
                    type="button"
                    disabled={!studentPagination.has_next || studentsLoading}
                    onClick={() =>
                      changeStudentPage(studentPagination.page + 1)
                    }
                    className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* STUDENT DETAILS MODAL */}
            {studentDetailsModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-6">
                <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Student Library Record
                      </h3>

                      <p className="text-sm text-gray-500">
                        Complete issue, return and fine history
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeStudentDetails}
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>

                  {studentDetailsLoading ? (
                    <div className="p-16 text-center text-gray-500">
                      <i className="bi bi-arrow-repeat mr-2 inline-block animate-spin"></i>
                      Loading student record...
                    </div>
                  ) : !studentDetails ? (
                    <div className="p-16 text-center text-gray-500">
                      Student record unavailable.
                    </div>
                  ) : (
                    <div className="space-y-6 p-5">
                      {/* STUDENT HEADER */}
                      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-5 text-white">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
                              {studentDetails.student.name
                                ?.charAt(0)
                                ?.toUpperCase()}
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                              <StudentDetailItem
                                label="Student ID"
                                value={studentDetails.student.student_id}
                              />

                              <StudentDetailItem
                                label="Class"
                                value={studentDetails.student.class_name}
                              />

                              <StudentDetailItem
                                label="Batch"
                                value={studentDetails.student.batch_name}
                              />

                              <StudentDetailItem
                                label="Roll Number"
                                value={studentDetails.student.roll_number}
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                issueBookToStudent(studentDetails.student)
                              }
                              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-700"
                            >
                              <i className="bi bi-journal-plus mr-2"></i>
                              Issue Book
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openFineModal(studentDetails.student)
                              }
                              disabled={
                                Number(studentDetails.summary.pending_fine) <= 0
                              }
                              className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                            >
                              <i className="bi bi-cash-coin mr-2"></i>
                              Collect Fine
                            </button>
                          </div>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-white/20 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <p className="text-xs text-indigo-200">Mobile</p>
                            <p className="mt-1 text-sm font-medium">
                              {studentDetails.student.mobile || "Not available"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-indigo-200">Email</p>
                            <p className="mt-1 break-all text-sm font-medium">
                              {studentDetails.student.email || "Not available"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-indigo-200">Parent</p>
                            <p className="mt-1 text-sm font-medium">
                              {studentDetails.student.father_name ||
                                studentDetails.student.mother_name ||
                                "Not available"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-indigo-200">
                              Parent Contact
                            </p>
                            <p className="mt-1 text-sm font-medium">
                              {studentDetails.student.father_mobile ||
                                studentDetails.student.mother_mobile ||
                                "Not available"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* SUMMARY */}
                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                        {[
                          [
                            "Active Books",
                            studentDetails.summary.active_books,
                            "text-blue-700",
                          ],
                          [
                            "Returned",
                            studentDetails.summary.returned_books,
                            "text-green-700",
                          ],
                          [
                            "Overdue",
                            studentDetails.summary.overdue_books,
                            "text-red-700",
                          ],
                          [
                            "Transactions",
                            studentDetails.summary.total_transactions,
                            "text-gray-800",
                          ],
                          [
                            "Pending Fine",
                            `₹${Number(
                              studentDetails.summary.pending_fine || 0,
                            ).toFixed(2)}`,
                            "text-red-700",
                          ],
                          [
                            "Collected",
                            `₹${Number(
                              studentDetails.summary.collected_fine || 0,
                            ).toFixed(2)}`,
                            "text-green-700",
                          ],
                        ].map(([label, value, valueClass]) => (
                          <div
                            key={label}
                            className="rounded-xl border bg-gray-50 p-3"
                          >
                            <p className="text-xs text-gray-500">{label}</p>
                            <p
                              className={`mt-1 text-lg font-bold ${valueClass}`}
                            >
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* ACTIVE ISSUES */}
                      <div>
                        <h4 className="mb-3 text-base font-semibold text-gray-900">
                          Currently Issued Books
                        </h4>

                        <div className="overflow-x-auto rounded-xl border">
                          <table className="min-w-[900px] w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                              <tr>
                                <th className="p-3 text-left">Book</th>
                                <th className="p-3 text-left">Issue Date</th>
                                <th className="p-3 text-left">Due Date</th>
                                <th className="p-3 text-center">Status</th>
                                <th className="p-3 text-center">Late Days</th>
                                <th className="p-3 text-right">Pending Fine</th>
                                <th className="p-3 text-right">Action</th>
                              </tr>
                            </thead>

                            <tbody className="divide-y">
                              {studentDetails.active_issues.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan="7"
                                    className="p-8 text-center text-gray-500"
                                  >
                                    No currently issued books.
                                  </td>
                                </tr>
                              ) : (
                                studentDetails.active_issues.map((issue) => (
                                  <tr key={issue.id}>
                                    <td className="p-3">
                                      <p className="font-medium text-gray-900">
                                        {issue.book_title}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {issue.author || "Unknown author"}
                                      </p>
                                    </td>

                                    <td className="p-3">
                                      {issue.issue_date || "—"}
                                    </td>

                                    <td className="p-3">
                                      {issue.due_date || "—"}
                                    </td>

                                    <td className="p-3 text-center">
                                      <span
                                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                                          issue.status === "Overdue"
                                            ? "bg-red-100 text-red-700"
                                            : issue.status === "Due Soon"
                                              ? "bg-amber-100 text-amber-700"
                                              : "bg-blue-100 text-blue-700"
                                        }`}
                                      >
                                        {issue.status}
                                      </span>
                                    </td>

                                    <td className="p-3 text-center">
                                      {issue.overdue_days}
                                    </td>

                                    <td className="p-3 text-right font-semibold text-red-600">
                                      ₹
                                      {Number(issue.pending_fine || 0).toFixed(
                                        2,
                                      )}
                                    </td>

                                    <td className="p-3 text-right">
                                      <button
                                        type="button"
                                        disabled={
                                          Number(issue.pending_fine) <= 0
                                        }
                                        onClick={() =>
                                          openFineModal(
                                            studentDetails.student,
                                            issue,
                                          )
                                        }
                                        className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-40"
                                      >
                                        Pay
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* RETURN HISTORY */}
                      <div>
                        <h4 className="mb-3 text-base font-semibold text-gray-900">
                          Book Return History
                        </h4>

                        <div className="overflow-x-auto rounded-xl border">
                          <table className="min-w-[850px] w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                              <tr>
                                <th className="p-3 text-left">Book</th>
                                <th className="p-3 text-left">Issued</th>
                                <th className="p-3 text-left">Due</th>
                                <th className="p-3 text-left">Returned</th>
                                <th className="p-3 text-center">Late Days</th>
                                <th className="p-3 text-right">Fine</th>
                              </tr>
                            </thead>

                            <tbody className="divide-y">
                              {studentDetails.return_history.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan="6"
                                    className="p-8 text-center text-gray-500"
                                  >
                                    No return history.
                                  </td>
                                </tr>
                              ) : (
                                studentDetails.return_history.map((issue) => (
                                  <tr key={issue.id}>
                                    <td className="p-3">
                                      <p className="font-medium">
                                        {issue.book_title}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {issue.author}
                                      </p>
                                    </td>
                                    <td className="p-3">{issue.issue_date}</td>
                                    <td className="p-3">{issue.due_date}</td>
                                    <td className="p-3">{issue.return_date}</td>
                                    <td className="p-3 text-center">
                                      {issue.overdue_days}
                                    </td>
                                    <td className="p-3 text-right">
                                      ₹
                                      {Number(issue.fine_amount || 0).toFixed(
                                        2,
                                      )}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* FINE HISTORY */}
                      <div>
                        <h4 className="mb-3 text-base font-semibold text-gray-900">
                          Fine Collection History
                        </h4>

                        <div className="overflow-x-auto rounded-xl border">
                          <table className="min-w-[800px] w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                              <tr>
                                <th className="p-3 text-left">Date</th>
                                <th className="p-3 text-left">Issue ID</th>
                                <th className="p-3 text-right">Amount</th>
                                <th className="p-3 text-left">Method</th>
                                <th className="p-3 text-left">Reference</th>
                                <th className="p-3 text-center">Status</th>
                              </tr>
                            </thead>

                            <tbody className="divide-y">
                              {studentDetails.fine_payments.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan="6"
                                    className="p-8 text-center text-gray-500"
                                  >
                                    No fine payments recorded.
                                  </td>
                                </tr>
                              ) : (
                                studentDetails.fine_payments.map((payment) => (
                                  <tr key={payment.id}>
                                    <td className="p-3">
                                      {payment.collected_at
                                        ? new Date(
                                            payment.collected_at,
                                          ).toLocaleString()
                                        : "—"}
                                    </td>
                                    <td className="p-3">
                                      {payment.book_issue_id
                                        ? `#${payment.book_issue_id}`
                                        : "General"}
                                    </td>
                                    <td className="p-3 text-right font-semibold">
                                      ₹{Number(payment.amount || 0).toFixed(2)}
                                    </td>
                                    <td className="p-3">
                                      {payment.payment_method}
                                    </td>
                                    <td className="p-3">
                                      {payment.reference_no || "—"}
                                    </td>
                                    <td className="p-3 text-center">
                                      <span
                                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                                          payment.status === "Waived"
                                            ? "bg-gray-100 text-gray-700"
                                            : "bg-green-100 text-green-700"
                                        }`}
                                      >
                                        {payment.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* FINE PAYMENT MODAL */}
            {fineModalOpen && (
              <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b px-5 py-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Record Fine Payment
                      </h3>

                      <p className="text-sm text-gray-500">
                        {selectedLibraryStudent?.name}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeFineModal}
                      disabled={fineSaving}
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>

                  <form onSubmit={saveFinePayment} className="space-y-4 p-5">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Payment Type
                      </label>

                      <select
                        value={fineForm.status}
                        onChange={(event) =>
                          updateFineForm("status", event.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                      >
                        <option value="Collected">Collect Fine</option>
                        <option value="Waived">Waive Fine</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Amount
                      </label>

                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={fineForm.amount}
                        onChange={(event) =>
                          updateFineForm("amount", event.target.value)
                        }
                        className={`w-full rounded-lg border px-3 py-2.5 text-sm ${
                          fineFormErrors.amount
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />

                      {fineFormErrors.amount && (
                        <p className="mt-1 text-xs text-red-600">
                          {fineFormErrors.amount}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Payment Method
                      </label>

                      <select
                        value={fineForm.payment_method}
                        onChange={(event) =>
                          updateFineForm("payment_method", event.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Card">Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Reference Number
                      </label>

                      <input
                        type="text"
                        value={fineForm.reference_no}
                        onChange={(event) =>
                          updateFineForm("reference_no", event.target.value)
                        }
                        placeholder="UPI ID, receipt or transaction no."
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Remarks
                      </label>

                      <textarea
                        rows="3"
                        value={fineForm.remarks}
                        onChange={(event) =>
                          updateFineForm("remarks", event.target.value)
                        }
                        className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                      />
                    </div>

                    <div className="flex justify-end gap-3 border-t pt-4">
                      <button
                        type="button"
                        onClick={closeFineModal}
                        disabled={fineSaving}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={fineSaving}
                        className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                      >
                        {fineSaving ? (
                          <>
                            <i className="bi bi-arrow-repeat mr-2 inline-block animate-spin"></i>
                            Saving...
                          </>
                        ) : fineForm.status === "Waived" ? (
                          "Waive Fine"
                        ) : (
                          "Collect Payment"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================= LIBRARY TEACHERS ================= */}
        {activeSection === "teachers" && (
          <section className="section active space-y-6 p-4 sm:p-6">
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Library Teachers</h2>

                  <p className="text-sm opacity-90">
                    Manage teacher issues, returns and fines
                  </p>
                </div>

                <button
                  type="button"
                  onClick={exportLibraryTeachersCSV}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-green-700"
                >
                  <i className="bi bi-download mr-2"></i>
                  Export CSV
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <TeacherStatCard
                label="Total Teachers"
                value={teacherLibraryStats.total_teachers}
              />

              <TeacherStatCard
                label="Currently Issued"
                value={teacherLibraryStats.active_issues}
              />

              <TeacherStatCard
                label="Teachers With Fine"
                value={teacherLibraryStats.teachers_with_fine}
              />

              <TeacherStatCard
                label="Fine Collected"
                value={`₹${Number(
                  teacherLibraryStats.collected_fine || 0,
                ).toFixed(2)}`}
              />
            </div>

            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                <input
                  type="text"
                  value={teacherLibraryFilters.search}
                  onChange={(event) =>
                    updateTeacherLibraryFilter("search", event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applyTeacherLibraryFilters();
                    }
                  }}
                  placeholder="Name, employee ID, mobile..."
                  className="rounded-lg border px-3 py-2.5 text-sm xl:col-span-2"
                />

                <select
                  value={teacherLibraryFilters.department}
                  onChange={(event) =>
                    updateTeacherLibraryFilter("department", event.target.value)
                  }
                  className="rounded-lg border px-3 py-2.5 text-sm"
                >
                  <option value="">All Departments</option>

                  {teacherDepartments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>

                <select
                  value={teacherLibraryFilters.status}
                  onChange={(event) =>
                    updateTeacherLibraryFilter("status", event.target.value)
                  }
                  className="rounded-lg border px-3 py-2.5 text-sm"
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyTeacherLibraryFilters}
                    className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white"
                  >
                    Search
                  </button>

                  <button
                    type="button"
                    onClick={resetTeacherLibraryFilters}
                    className="rounded-lg border px-4 py-2 text-sm"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl bg-white shadow">
              <div className="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
                <table className="min-w-[1100px] w-full text-sm">
                  <thead className="bg-gray-100 text-gray-600">
                    <tr>
                      <th className="p-3 text-left">Teacher</th>
                      <th className="p-3 text-left">Department</th>
                      <th className="p-3 text-left">Designation</th>
                      <th className="p-3 text-center">Issued</th>
                      <th className="p-3 text-center">Returned</th>
                      <th className="p-3 text-center">Overdue</th>
                      <th className="p-3 text-right">Pending Fine</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {libraryTeachersLoading ? (
                      <tr>
                        <td colSpan="9" className="p-10 text-center">
                          Loading teachers...
                        </td>
                      </tr>
                    ) : libraryTeachers.length === 0 ? (
                      <tr>
                        <td
                          colSpan="9"
                          className="p-10 text-center text-gray-500"
                        >
                          No teachers found.
                        </td>
                      </tr>
                    ) : (
                      libraryTeachers.map((teacher) => (
                        <tr key={teacher.id} className="hover:bg-gray-50">
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => openTeacherLibraryDetails(teacher)}
                              className="text-left"
                            >
                              <p className="font-semibold text-indigo-700 hover:underline">
                                {teacher.name}
                              </p>

                              <p className="text-xs text-gray-500">
                                {teacher.teacher_id}
                                {teacher.mobile ? ` • ${teacher.mobile}` : ""}
                              </p>
                            </button>
                          </td>

                          <td className="p-3">
                            {teacher.department || "Not Assigned"}
                          </td>

                          <td className="p-3">{teacher.designation || "—"}</td>

                          <td className="p-3 text-center">
                            {teacher.active_books}
                          </td>

                          <td className="p-3 text-center">
                            {teacher.returned_books}
                          </td>

                          <td className="p-3 text-center font-medium text-red-600">
                            {teacher.overdue_books}
                          </td>

                          <td className="p-3 text-right font-semibold text-red-600">
                            ₹{Number(teacher.pending_fine || 0).toFixed(2)}
                          </td>

                          <td className="p-3 text-center">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                teacher.library_status === "Blocked"
                                  ? "bg-red-100 text-red-700"
                                  : teacher.library_status === "Fine Pending"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-green-100 text-green-700"
                              }`}
                            >
                              {teacher.library_status}
                            </span>
                          </td>

                          <td className="p-3">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openTeacherLibraryDetails(teacher)
                                }
                                className="text-xs text-blue-600"
                              >
                                View
                              </button>

                              <button
                                type="button"
                                onClick={() => issueBookToTeacher(teacher)}
                                className="text-xs text-indigo-600"
                              >
                                Issue
                              </button>

                              <button
                                type="button"
                                disabled={Number(teacher.pending_fine) <= 0}
                                onClick={() => openTeacherFineModal(teacher)}
                                className="text-xs text-green-600 disabled:opacity-40"
                              >
                                Pay
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t p-4">
                <span className="text-sm text-gray-600">
                  Page {teacherLibraryPagination.page} of{" "}
                  {teacherLibraryPagination.pages}
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!teacherLibraryPagination.has_prev}
                    onClick={() =>
                      changeTeacherLibraryPage(
                        teacherLibraryPagination.page - 1,
                      )
                    }
                    className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={!teacherLibraryPagination.has_next}
                    onClick={() =>
                      changeTeacherLibraryPage(
                        teacherLibraryPagination.page + 1,
                      )
                    }
                    className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* TEACHER DETAILS MODAL */}
            {teacherDetailsModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-6">
                <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Teacher Library Record
                      </h3>

                      <p className="text-sm text-gray-500">
                        Complete issue, return and fine history
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeTeacherLibraryDetails}
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>

                  {teacherDetailsLoading ? (
                    <div className="p-16 text-center text-gray-500">
                      <i className="bi bi-arrow-repeat mr-2 inline-block animate-spin"></i>
                      Loading teacher record...
                    </div>
                  ) : !teacherLibraryDetails ? (
                    <div className="p-16 text-center text-gray-500">
                      Teacher record unavailable.
                    </div>
                  ) : (
                    <div className="space-y-6 p-5">
                      {/* TEACHER HEADER */}
                      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-5 text-white">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
                              {teacherLibraryDetails.teacher?.name
                                ?.charAt(0)
                                ?.toUpperCase()}
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                              <StudentDetailItem
                                label="Teacher ID"
                                value={
                                  teacherLibraryDetails.teacher?.teacher_id
                                }
                              />

                              <StudentDetailItem
                                label="Department"
                                value={
                                  teacherLibraryDetails.teacher?.department
                                }
                              />

                              <StudentDetailItem
                                label="Designation"
                                value={
                                  teacherLibraryDetails.teacher?.designation
                                }
                              />

                              <StudentDetailItem
                                label="Mobile"
                                value={teacherLibraryDetails.teacher?.mobile}
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                issueBookToTeacher(
                                  teacherLibraryDetails.teacher,
                                )
                              }
                              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-700"
                            >
                              <i className="bi bi-journal-plus mr-2"></i>
                              Issue Book
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openTeacherFineModal(
                                  teacherLibraryDetails.teacher,
                                )
                              }
                              disabled={
                                Number(
                                  teacherLibraryDetails.summary?.pending_fine,
                                ) <= 0
                              }
                              className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                            >
                              <i className="bi bi-cash-coin mr-2"></i>
                              Collect Fine
                            </button>
                          </div>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-white/20 pt-4 sm:grid-cols-2 lg:grid-cols-3">
                          <div>
                            <p className="text-xs text-indigo-200">Email</p>
                            <p className="mt-1 break-all text-sm font-medium">
                              {teacherLibraryDetails.teacher?.email ||
                                "Not available"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-indigo-200">Status</p>
                            <p className="mt-1 text-sm font-medium">
                              {teacherLibraryDetails.teacher?.library_status ||
                                "Active"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-indigo-200">
                              Joining Date
                            </p>
                            <p className="mt-1 text-sm font-medium">
                              {teacherLibraryDetails.teacher?.joining_date ||
                                "Not available"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* SUMMARY STATS */}
                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                        {[
                          [
                            "Active Books",
                            teacherLibraryDetails.summary?.active_books || 0,
                            "text-blue-700",
                          ],
                          [
                            "Returned",
                            teacherLibraryDetails.summary?.returned_books || 0,
                            "text-green-700",
                          ],
                          [
                            "Overdue",
                            teacherLibraryDetails.summary?.overdue_books || 0,
                            "text-red-700",
                          ],
                          [
                            "Transactions",
                            teacherLibraryDetails.summary?.total_transactions ||
                              0,
                            "text-gray-800",
                          ],
                          [
                            "Pending Fine",
                            `₹${Number(
                              teacherLibraryDetails.summary?.pending_fine || 0,
                            ).toFixed(2)}`,
                            "text-red-700",
                          ],
                          [
                            "Collected",
                            `₹${Number(
                              teacherLibraryDetails.summary?.collected_fine ||
                                0,
                            ).toFixed(2)}`,
                            "text-green-700",
                          ],
                        ].map(([label, value, valueClass]) => (
                          <div
                            key={label}
                            className="rounded-xl border bg-gray-50 p-3"
                          >
                            <p className="text-xs text-gray-500">{label}</p>
                            <p
                              className={`mt-1 text-lg font-bold ${valueClass}`}
                            >
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* ACTIVE ISSUES */}
                      <div>
                        <h4 className="mb-3 text-base font-semibold text-gray-900">
                          Currently Issued Books
                        </h4>

                        <div className="overflow-x-auto rounded-xl border">
                          <table className="min-w-[900px] w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                              <tr>
                                <th className="p-3 text-left">Book</th>
                                <th className="p-3 text-left">Issue Date</th>
                                <th className="p-3 text-left">Due Date</th>
                                <th className="p-3 text-center">Status</th>
                                <th className="p-3 text-center">Late Days</th>
                                <th className="p-3 text-right">Pending Fine</th>
                                <th className="p-3 text-right">Action</th>
                              </tr>
                            </thead>

                            <tbody className="divide-y">
                              {teacherLibraryDetails.active_issues?.length ===
                              0 ? (
                                <tr>
                                  <td
                                    colSpan="7"
                                    className="p-8 text-center text-gray-500"
                                  >
                                    No currently issued books.
                                  </td>
                                </tr>
                              ) : (
                                teacherLibraryDetails.active_issues?.map(
                                  (issue) => (
                                    <tr key={issue.id}>
                                      <td className="p-3">
                                        <p className="font-medium text-gray-900">
                                          {issue.book_title}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {issue.author || "Unknown author"}
                                        </p>
                                      </td>

                                      <td className="p-3">
                                        {issue.issue_date || "—"}
                                      </td>

                                      <td className="p-3">
                                        {issue.due_date || "—"}
                                      </td>

                                      <td className="p-3 text-center">
                                        <span
                                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                                            issue.status === "Overdue"
                                              ? "bg-red-100 text-red-700"
                                              : issue.status === "Due Soon"
                                                ? "bg-amber-100 text-amber-700"
                                                : "bg-blue-100 text-blue-700"
                                          }`}
                                        >
                                          {issue.status}
                                        </span>
                                      </td>

                                      <td className="p-3 text-center">
                                        {issue.overdue_days}
                                      </td>

                                      <td className="p-3 text-right font-semibold text-red-600">
                                        ₹
                                        {Number(
                                          issue.pending_fine || 0,
                                        ).toFixed(2)}
                                      </td>

                                      <td className="p-3 text-right">
                                        <button
                                          type="button"
                                          disabled={
                                            Number(issue.pending_fine) <= 0
                                          }
                                          onClick={() =>
                                            openTeacherFineModal(
                                              teacherLibraryDetails.teacher,
                                              issue,
                                            )
                                          }
                                          className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-40"
                                        >
                                          Pay
                                        </button>
                                      </td>
                                    </tr>
                                  ),
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* RETURN HISTORY */}
                      <div>
                        <h4 className="mb-3 text-base font-semibold text-gray-900">
                          Book Return History
                        </h4>

                        <div className="overflow-x-auto rounded-xl border">
                          <table className="min-w-[850px] w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                              <tr>
                                <th className="p-3 text-left">Book</th>
                                <th className="p-3 text-left">Issued</th>
                                <th className="p-3 text-left">Due</th>
                                <th className="p-3 text-left">Returned</th>
                                <th className="p-3 text-center">Late Days</th>
                                <th className="p-3 text-right">Fine</th>
                              </tr>
                            </thead>

                            <tbody className="divide-y">
                              {teacherLibraryDetails.return_history?.length ===
                              0 ? (
                                <tr>
                                  <td
                                    colSpan="6"
                                    className="p-8 text-center text-gray-500"
                                  >
                                    No return history.
                                  </td>
                                </tr>
                              ) : (
                                teacherLibraryDetails.return_history?.map(
                                  (issue) => (
                                    <tr key={issue.id}>
                                      <td className="p-3">
                                        <p className="font-medium">
                                          {issue.book_title}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {issue.author}
                                        </p>
                                      </td>
                                      <td className="p-3">
                                        {issue.issue_date}
                                      </td>
                                      <td className="p-3">{issue.due_date}</td>
                                      <td className="p-3">
                                        {issue.return_date}
                                      </td>
                                      <td className="p-3 text-center">
                                        {issue.overdue_days}
                                      </td>
                                      <td className="p-3 text-right">
                                        ₹
                                        {Number(issue.fine_amount || 0).toFixed(
                                          2,
                                        )}
                                      </td>
                                    </tr>
                                  ),
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* FINE COLLECTION HISTORY */}
                      <div>
                        <h4 className="mb-3 text-base font-semibold text-gray-900">
                          Fine Collection History
                        </h4>

                        <div className="overflow-x-auto rounded-xl border">
                          <table className="min-w-[800px] w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                              <tr>
                                <th className="p-3 text-left">Date</th>
                                <th className="p-3 text-left">Issue ID</th>
                                <th className="p-3 text-right">Amount</th>
                                <th className="p-3 text-left">Method</th>
                                <th className="p-3 text-left">Reference</th>
                                <th className="p-3 text-center">Status</th>
                              </tr>
                            </thead>

                            <tbody className="divide-y">
                              {teacherLibraryDetails.fine_payments?.length ===
                              0 ? (
                                <tr>
                                  <td
                                    colSpan="6"
                                    className="p-8 text-center text-gray-500"
                                  >
                                    No fine payments recorded.
                                  </td>
                                </tr>
                              ) : (
                                teacherLibraryDetails.fine_payments?.map(
                                  (payment) => (
                                    <tr key={payment.id}>
                                      <td className="p-3">
                                        {payment.collected_at
                                          ? new Date(
                                              payment.collected_at,
                                            ).toLocaleString()
                                          : "—"}
                                      </td>
                                      <td className="p-3">
                                        {payment.book_issue_id
                                          ? `#${payment.book_issue_id}`
                                          : "General"}
                                      </td>
                                      <td className="p-3 text-right font-semibold">
                                        ₹
                                        {Number(payment.amount || 0).toFixed(2)}
                                      </td>
                                      <td className="p-3">
                                        {payment.payment_method}
                                      </td>
                                      <td className="p-3">
                                        {payment.reference_no || "—"}
                                      </td>
                                      <td className="p-3 text-center">
                                        <span
                                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                                            payment.status === "Waived"
                                              ? "bg-gray-100 text-gray-700"
                                              : "bg-green-100 text-green-700"
                                          }`}
                                        >
                                          {payment.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ),
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {teacherFineModalOpen && (
              <TeacherFineModal
                teacher={selectedLibraryTeacher}
                form={teacherFineForm}
                errors={teacherFineErrors}
                saving={teacherFineSaving}
                onChange={updateTeacherFineForm}
                onClose={closeTeacherFineModal}
                onSubmit={saveTeacherFine}
              />
            )}
          </section>
        )}

        {/* ================= ALL LIBRARY MEMBERS ================= */}
        {activeSection === "members" && (
          <section className="section active space-y-6 p-4 sm:p-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">All Library Members</h2>

                  <p className="mt-1 text-sm text-blue-100">
                    Administrators and non-teaching staff using the library
                  </p>
                </div>

                <button
                  type="button"
                  onClick={exportMembersCSV}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-green-700"
                >
                  <i className="bi bi-download mr-2"></i>
                  Export CSV
                </button>
              </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                ["Total Members", memberStats.total_members],
                ["Administrators", memberStats.admins],
                ["Non-Teaching Staff", memberStats.staff],
                ["Currently Issued", memberStats.active_issues],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {label}
                  </p>

                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {value || 0}
                  </p>
                </div>
              ))}
            </div>

            {/* FILTERS */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                <input
                  type="text"
                  value={memberFilters.search}
                  onChange={(event) =>
                    updateMemberFilter("search", event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applyMemberFilters();
                    }
                  }}
                  placeholder="Name, member ID, mobile, email..."
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 xl:col-span-2"
                />

                <select
                  value={memberFilters.role}
                  onChange={(event) =>
                    updateMemberFilter("role", event.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">All Member Types</option>

                  <option value="admin">Administrators</option>

                  <option value="staff">Non-Teaching Staff</option>
                </select>

                <select
                  value={memberFilters.department}
                  onChange={(event) =>
                    updateMemberFilter("department", event.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">All Departments</option>

                  {memberDepartments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>

                <select
                  value={memberFilters.status}
                  onChange={(event) =>
                    updateMemberFilter("status", event.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">All Library Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Fine Pending</option>
                  <option value="blocked">Blocked</option>
                  <option value="inactive">Inactive</option>
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyMemberFilters}
                    disabled={membersLoading}
                    className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Search
                  </button>

                  <button
                    type="button"
                    onClick={resetMemberFilters}
                    disabled={membersLoading}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* TABLE */}
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
                <table className="min-w-[1150px] w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="p-3 text-left">Member</th>
                      <th className="p-3 text-left">Role</th>
                      <th className="p-3 text-left">Class / Department</th>
                      <th className="p-3 text-center">Issued</th>
                      <th className="p-3 text-center">Returned</th>
                      <th className="p-3 text-center">Overdue</th>
                      <th className="p-3 text-right">Pending Fine</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {membersLoading ? (
                      <tr>
                        <td
                          colSpan="9"
                          className="p-10 text-center text-gray-500"
                        >
                          <i className="bi bi-arrow-repeat mr-2 inline-block animate-spin"></i>
                          Loading members...
                        </td>
                      </tr>
                    ) : libraryMembers.length === 0 ? (
                      <tr>
                        <td
                          colSpan="9"
                          className="p-10 text-center text-gray-500"
                        >
                          No library members found.
                        </td>
                      </tr>
                    ) : (
                      libraryMembers.map((member) => {
                        const roleClass =
                          member.member_type === "student"
                            ? "bg-blue-100 text-blue-700"
                            : member.member_type === "teacher"
                              ? "bg-purple-100 text-purple-700"
                              : member.member_type === "admin"
                                ? "bg-red-100 text-red-700"
                                : "bg-cyan-100 text-cyan-700";

                        const statusClass =
                          member.library_status === "Blocked"
                            ? "bg-red-100 text-red-700"
                            : member.library_status === "Pending" ||
                                member.library_status === "Fine Pending"
                              ? "bg-amber-100 text-amber-700"
                              : member.library_status === "Inactive"
                                ? "bg-gray-100 text-gray-600"
                                : "bg-green-100 text-green-700";

                        return (
                          <tr
                            key={member.member_key}
                            className="hover:bg-gray-50"
                          >
                            <td className="p-3">
                              <button
                                type="button"
                                onClick={() => openMemberDetails(member)}
                                className="text-left"
                              >
                                <p className="font-semibold text-indigo-700 hover:underline">
                                  {member.name}
                                </p>

                                <p className="mt-0.5 text-xs text-gray-500">
                                  {member.member_code}

                                  {member.mobile ? ` • ${member.mobile}` : ""}
                                </p>
                              </button>
                            </td>

                            <td className="p-3">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleClass}`}
                              >
                                {member.role}
                              </span>
                            </td>

                            <td className="p-3">
                              <p className="font-medium text-gray-800">
                                {member.class_or_department || "Not Assigned"}
                              </p>

                              <p className="text-xs text-gray-500">
                                {member.designation || member.batch_name || "—"}
                              </p>
                            </td>

                            <td className="p-3 text-center">
                              {member.active_books || 0}
                            </td>

                            <td className="p-3 text-center">
                              {member.returned_books || 0}
                            </td>

                            <td className="p-3 text-center font-medium text-red-600">
                              {member.overdue_books || 0}
                            </td>

                            <td className="p-3 text-right font-semibold text-red-600">
                              ₹{Number(member.pending_fine || 0).toFixed(2)}
                            </td>

                            <td className="p-3 text-center">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass}`}
                              >
                                {member.library_status || "Active"}
                              </span>
                            </td>

                            <td className="p-3">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openMemberDetails(member)}
                                  className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                                >
                                  View
                                </button>

                                <button
                                  type="button"
                                  disabled={member.library_status === "Blocked"}
                                  onClick={() => issueBookToMember(member)}
                                  className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  Issue
                                </button>

                                <button
                                  type="button"
                                  disabled={Number(member.pending_fine) <= 0}
                                  onClick={() => payMemberFine(member)}
                                  className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  Pay
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">
                  Total {memberPagination.total} members
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!memberPagination.has_prev || membersLoading}
                    onClick={() => changeMemberPage(memberPagination.page - 1)}
                    className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="text-sm text-gray-600">
                    Page {memberPagination.page} of {memberPagination.pages}
                  </span>

                  <button
                    type="button"
                    disabled={!memberPagination.has_next || membersLoading}
                    onClick={() => changeMemberPage(memberPagination.page + 1)}
                    className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* ================= MEMBER LIBRARY DETAILS MODAL ================= */}
            {memberModalOpen && (
              <div
                className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-3 sm:p-6"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    closeMemberDetails();
                  }
                }}
              >
                <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                  {/* MODAL HEADER */}
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Member Library Record
                      </h3>

                      <p className="text-sm text-gray-500">
                        Complete profile, issue, return and fine history
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeMemberDetails}
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>

                  {memberDetailsLoading ? (
                    <div className="p-16 text-center text-gray-500">
                      <i className="bi bi-arrow-repeat mr-2 inline-block animate-spin"></i>
                      Loading member record...
                    </div>
                  ) : !memberDetails ? (
                    <div className="p-16 text-center text-gray-500">
                      Member record unavailable.
                    </div>
                  ) : (
                    <div className="space-y-6 p-5">
                      {/* MEMBER HEADER */}
                      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-5 text-white">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
                              {memberDetails.member?.name
                                ?.charAt(0)
                                ?.toUpperCase() || "M"}
                            </div>

                            <div>
                              <h3 className="text-xl font-semibold">
                                {memberDetails.member?.name}
                              </h3>

                              <p className="mt-1 text-sm text-indigo-100">
                                {memberDetails.member?.member_code}

                                {" • "}

                                {memberDetails.member?.member_type === "admin"
                                  ? "Administrator"
                                  : "Non-Teaching Staff"}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                issueBookToMember(memberDetails.member)
                              }
                              disabled={
                                memberDetails.member?.library_status ===
                                "Blocked"
                              }
                              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <i className="bi bi-journal-plus mr-2"></i>
                              Issue Book
                            </button>

                            {memberDetails.member?.member_type === "staff" && (
                              <button
                                type="button"
                                onClick={() =>
                                  payMemberFine(memberDetails.member)
                                }
                                disabled={
                                  Number(
                                    memberDetails.summary?.pending_fine || 0,
                                  ) <= 0
                                }
                                className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                              >
                                <i className="bi bi-cash-coin mr-2"></i>
                                Collect Fine
                              </button>
                            )}
                          </div>
                        </div>

                        {/* MEMBER PRIMARY INFORMATION */}
                        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-white/20 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                          <StudentDetailItem
                            label="Member ID"
                            value={memberDetails.member?.member_code}
                          />

                          <StudentDetailItem
                            label="Department"
                            value={memberDetails.member?.department}
                          />

                          <StudentDetailItem
                            label="Designation"
                            value={memberDetails.member?.designation}
                          />

                          <StudentDetailItem
                            label="Status"
                            value={memberDetails.member?.library_status}
                          />
                        </div>
                      </div>

                      {/* SUMMARY */}
                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                        {[
                          [
                            "Active Books",
                            memberDetails.summary?.active_books || 0,
                            "text-blue-700",
                          ],
                          [
                            "Returned",
                            memberDetails.summary?.returned_books || 0,
                            "text-green-700",
                          ],
                          [
                            "Overdue",
                            memberDetails.summary?.overdue_books || 0,
                            "text-red-700",
                          ],
                          [
                            "Transactions",
                            memberDetails.summary?.total_transactions || 0,
                            "text-gray-800",
                          ],
                          [
                            "Pending Fine",
                            `₹${Number(
                              memberDetails.summary?.pending_fine || 0,
                            ).toFixed(2)}`,
                            "text-red-700",
                          ],
                          [
                            "Collected",
                            `₹${Number(
                              memberDetails.summary?.collected_fine || 0,
                            ).toFixed(2)}`,
                            "text-green-700",
                          ],
                        ].map(([label, value, valueClass]) => (
                          <div
                            key={label}
                            className="rounded-xl border bg-gray-50 p-3"
                          >
                            <p className="text-xs text-gray-500">{label}</p>

                            <p
                              className={`mt-1 text-lg font-bold ${valueClass}`}
                            >
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* PROFILE INFORMATION */}
                      <div>
                        <h4 className="mb-3 text-base font-semibold text-gray-900">
                          Member Information
                        </h4>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          {[
                            ["Full Name", memberDetails.member?.name],
                            ["Email", memberDetails.member?.email],
                            ["Mobile", memberDetails.member?.mobile],
                            [
                              "Alternate Mobile",
                              memberDetails.member?.alternate_mobile,
                            ],
                            ["Gender", memberDetails.member?.gender],
                            [
                              "Date of Birth",
                              memberDetails.member?.date_of_birth,
                            ],
                            ["Blood Group", memberDetails.member?.blood_group],
                            ["Department", memberDetails.member?.department],
                            ["Designation", memberDetails.member?.designation],
                            [
                              "Staff Type",
                              memberDetails.member?.staff_type ||
                                memberDetails.member?.admin_type,
                            ],
                            [
                              "Qualification",
                              memberDetails.member?.qualification,
                            ],
                            [
                              "Specialization",
                              memberDetails.member?.specialization,
                            ],
                            [
                              "Experience",
                              memberDetails.member?.experience_years !==
                                undefined &&
                              memberDetails.member?.experience_years !== null
                                ? `${memberDetails.member.experience_years} Years`
                                : "",
                            ],
                            [
                              "Joining Date",
                              memberDetails.member?.joining_date,
                            ],
                            [
                              "Employment Type",
                              memberDetails.member?.employment_type,
                            ],
                            ["Shift", memberDetails.member?.shift],
                            ["Address", memberDetails.member?.address],
                            ["City", memberDetails.member?.city],
                            ["State", memberDetails.member?.state],
                            ["Pincode", memberDetails.member?.pincode],
                            [
                              "Emergency Person",
                              memberDetails.member?.emergency_name,
                            ],
                            [
                              "Emergency Relation",
                              memberDetails.member?.emergency_relation,
                            ],
                            [
                              "Emergency Contact",
                              memberDetails.member?.emergency_phone,
                            ],
                            [
                              "Medical Condition",
                              memberDetails.member?.medical_condition,
                            ],
                          ].map(([label, value]) => (
                            <div
                              key={label}
                              className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                            >
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                {label}
                              </p>

                              <p className="mt-1 break-words text-sm font-medium text-gray-800">
                                {value !== null &&
                                value !== undefined &&
                                value !== ""
                                  ? value
                                  : "—"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ACTIVE ISSUES */}
                      <div>
                        <h4 className="mb-3 text-base font-semibold text-gray-900">
                          Currently Issued Books
                        </h4>

                        <div className="overflow-x-auto rounded-xl border">
                          <table className="min-w-[900px] w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                              <tr>
                                <th className="p-3 text-left">Book</th>
                                <th className="p-3 text-left">Issue Date</th>
                                <th className="p-3 text-left">Due Date</th>
                                <th className="p-3 text-center">Status</th>
                                <th className="p-3 text-center">Late Days</th>
                                <th className="p-3 text-right">Pending Fine</th>
                                <th className="p-3 text-right">Action</th>
                              </tr>
                            </thead>

                            <tbody className="divide-y">
                              {!memberDetails.active_issues?.length ? (
                                <tr>
                                  <td
                                    colSpan="7"
                                    className="p-8 text-center text-gray-500"
                                  >
                                    No currently issued books.
                                  </td>
                                </tr>
                              ) : (
                                memberDetails.active_issues.map((issue) => (
                                  <tr key={issue.id}>
                                    <td className="p-3">
                                      <p className="font-medium text-gray-900">
                                        {issue.book_title}
                                      </p>

                                      <p className="text-xs text-gray-500">
                                        {issue.author || "Unknown author"}
                                      </p>
                                    </td>

                                    <td className="p-3">
                                      {issue.issue_date || "—"}
                                    </td>

                                    <td className="p-3">
                                      {issue.due_date || "—"}
                                    </td>

                                    <td className="p-3 text-center">
                                      <span
                                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                                          issue.status === "Overdue"
                                            ? "bg-red-100 text-red-700"
                                            : issue.status === "Due Soon"
                                              ? "bg-amber-100 text-amber-700"
                                              : "bg-blue-100 text-blue-700"
                                        }`}
                                      >
                                        {issue.status}
                                      </span>
                                    </td>

                                    <td className="p-3 text-center">
                                      {issue.overdue_days || 0}
                                    </td>

                                    <td className="p-3 text-right font-semibold text-red-600">
                                      ₹
                                      {Number(issue.pending_fine || 0).toFixed(
                                        2,
                                      )}
                                    </td>

                                    <td className="p-3 text-right">
                                      {memberDetails.member?.member_type ===
                                        "staff" && (
                                        <button
                                          type="button"
                                          disabled={
                                            Number(issue.pending_fine) <= 0
                                          }
                                          onClick={() =>
                                            payMemberFine({
                                              ...memberDetails.member,
                                              selected_issue: issue,
                                            })
                                          }
                                          className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-40"
                                        >
                                          Pay
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* RETURN HISTORY */}
                      <div>
                        <h4 className="mb-3 text-base font-semibold text-gray-900">
                          Book Return History
                        </h4>

                        <div className="overflow-x-auto rounded-xl border">
                          <table className="min-w-[850px] w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                              <tr>
                                <th className="p-3 text-left">Book</th>
                                <th className="p-3 text-left">Issued</th>
                                <th className="p-3 text-left">Due</th>
                                <th className="p-3 text-left">Returned</th>
                                <th className="p-3 text-center">Late Days</th>
                                <th className="p-3 text-right">Fine</th>
                              </tr>
                            </thead>

                            <tbody className="divide-y">
                              {!memberDetails.return_history?.length ? (
                                <tr>
                                  <td
                                    colSpan="6"
                                    className="p-8 text-center text-gray-500"
                                  >
                                    No return history.
                                  </td>
                                </tr>
                              ) : (
                                memberDetails.return_history.map((issue) => (
                                  <tr key={issue.id}>
                                    <td className="p-3">
                                      <p className="font-medium">
                                        {issue.book_title}
                                      </p>

                                      <p className="text-xs text-gray-500">
                                        {issue.author}
                                      </p>
                                    </td>

                                    <td className="p-3">
                                      {issue.issue_date || "—"}
                                    </td>

                                    <td className="p-3">
                                      {issue.due_date || "—"}
                                    </td>

                                    <td className="p-3">
                                      {issue.return_date || "—"}
                                    </td>

                                    <td className="p-3 text-center">
                                      {issue.overdue_days || 0}
                                    </td>

                                    <td className="p-3 text-right">
                                      ₹
                                      {Number(issue.fine_amount || 0).toFixed(
                                        2,
                                      )}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* FINE HISTORY */}
                      <div>
                        <h4 className="mb-3 text-base font-semibold text-gray-900">
                          Fine Collection History
                        </h4>

                        <div className="overflow-x-auto rounded-xl border">
                          <table className="min-w-[800px] w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                              <tr>
                                <th className="p-3 text-left">Date</th>
                                <th className="p-3 text-left">Issue ID</th>
                                <th className="p-3 text-right">Amount</th>
                                <th className="p-3 text-left">Method</th>
                                <th className="p-3 text-left">Reference</th>
                                <th className="p-3 text-center">Status</th>
                              </tr>
                            </thead>

                            <tbody className="divide-y">
                              {!memberDetails.fine_payments?.length ? (
                                <tr>
                                  <td
                                    colSpan="6"
                                    className="p-8 text-center text-gray-500"
                                  >
                                    No fine payments recorded.
                                  </td>
                                </tr>
                              ) : (
                                memberDetails.fine_payments.map((payment) => (
                                  <tr key={payment.id}>
                                    <td className="p-3">
                                      {payment.collected_at
                                        ? new Date(
                                            payment.collected_at,
                                          ).toLocaleString()
                                        : "—"}
                                    </td>

                                    <td className="p-3">
                                      {payment.book_issue_id
                                        ? `#${payment.book_issue_id}`
                                        : "General"}
                                    </td>

                                    <td className="p-3 text-right font-semibold">
                                      ₹{Number(payment.amount || 0).toFixed(2)}
                                    </td>

                                    <td className="p-3">
                                      {payment.payment_method || "—"}
                                    </td>

                                    <td className="p-3">
                                      {payment.reference_no || "—"}
                                    </td>

                                    <td className="p-3 text-center">
                                      <span
                                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                                          payment.status === "Waived"
                                            ? "bg-gray-100 text-gray-700"
                                            : "bg-green-100 text-green-700"
                                        }`}
                                      >
                                        {payment.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================= ISSUE AND MANAGE BOOKS ================= */}
        {activeSection === "issued-books" && (
          <section className="section active space-y-6 p-4 sm:p-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    Issue & Manage Books
                  </h2>

                  <p className="mt-1 text-sm text-blue-100">
                    Issue books to students, teachers, administrators and
                    non-teaching staff
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={exportCirculationReport}
                    disabled={
                      circulationExporting ||
                      circulationLoading ||
                      circulationStats.total_records === 0
                    }
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {circulationExporting ? (
                      <>
                        <i className="bi bi-arrow-repeat mr-2 inline-block animate-spin"></i>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-file-earmark-spreadsheet mr-2"></i>
                        Export Filtered Report
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      loadCirculationOptions({
                        silent: true,
                      });

                      loadCirculationRows({
                        page: circulationPagination.page,
                        perPage: circulationPagination.per_page,
                        filters: circulationFilters,
                        silent: true,
                      });
                    }}
                    disabled={circulationLoading || optionsLoading}
                    className="rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/25 disabled:opacity-50"
                  >
                    <i
                      className={`bi bi-arrow-clockwise mr-2 ${
                        circulationLoading ? "inline-block animate-spin" : ""
                      }`}
                    ></i>
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {[
                [
                  "Total Records",
                  circulationStats.total_records,
                  "bi-journals",
                  "text-gray-700 bg-gray-100",
                ],
                [
                  "Currently Issued",
                  circulationStats.currently_issued,
                  "bi-box-arrow-up-right",
                  "text-blue-700 bg-blue-100",
                ],
                [
                  "Due Soon",
                  circulationStats.due_soon,
                  "bi-clock",
                  "text-amber-700 bg-amber-100",
                ],
                [
                  "Overdue",
                  circulationStats.overdue,
                  "bi-exclamation-triangle",
                  "text-red-700 bg-red-100",
                ],
                [
                  "Returned",
                  circulationStats.returned,
                  "bi-box-arrow-in-down-left",
                  "text-green-700 bg-green-100",
                ],
                [
                  "Outstanding Fine",
                  `₹${Number(circulationStats.outstanding_fine || 0).toFixed(
                    2,
                  )}`,
                  "bi-cash-coin",
                  "text-purple-700 bg-purple-100",
                ],
              ].map(([label, value, icon, classes]) => (
                <div
                  key={label}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        {label}
                      </p>

                      <p className="mt-2 text-2xl font-bold text-gray-900">
                        {value || 0}
                      </p>
                    </div>

                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${classes}`}
                    >
                      <i className={`bi ${icon}`}></i>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* ISSUE FORM */}
            <form
              onSubmit={saveIssue}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <div className="border-b border-gray-100 px-5 py-4">
                <h3 className="font-semibold text-gray-900">Issue New Book</h3>

                <p className="mt-1 text-xs text-gray-500">
                  Select an active member and an available book copy.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 xl:grid-cols-4">
                {/* MEMBER TYPE */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Member Type *
                  </label>

                  <select
                    value={issueForm.member_type}
                    onChange={(event) =>
                      updateIssueForm("member_type", event.target.value)
                    }
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-100 ${
                      issueFormErrors.member_type
                        ? "border-red-500"
                        : "border-gray-300 focus:border-indigo-500"
                    }`}
                  >
                    <option value="">Select Type</option>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="staff">Non-Teaching Staff</option>
                    <option value="admin">Administrator</option>
                  </select>

                  {issueFormErrors.member_type && (
                    <p className="mt-1 text-xs text-red-600">
                      {issueFormErrors.member_type}
                    </p>
                  )}
                </div>

                {/* MEMBER */}
                <div className="relative xl:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Select Member *
                  </label>

                  <div className="relative">
                    <input
                      type="text"
                      value={memberSearch}
                      disabled={!issueForm.member_type || optionsLoading}
                      onFocus={() => setMemberDropdownOpen(true)}
                      onChange={(event) => {
                        updateMemberSearch(event.target.value);

                        if (issueForm.member_id) {
                          clearSelectedMember();
                        }
                      }}
                      placeholder={
                        optionsLoading
                          ? "Loading members..."
                          : issueForm.member_type
                            ? "Search by name, ID, mobile..."
                            : "Select member type first"
                      }
                      autoComplete="off"
                      className={`w-full rounded-lg border px-3 py-2.5 pr-20 text-sm outline-none disabled:bg-gray-100 ${
                        issueFormErrors.member_id
                          ? "border-red-500"
                          : "border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      }`}
                    />

                    {selectedIssueMember && (
                      <button
                        type="button"
                        onClick={clearSelectedMember}
                        className="absolute right-9 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600"
                        title="Clear selected member"
                      >
                        <i className="bi bi-x-circle"></i>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={!issueForm.member_type || optionsLoading}
                      onClick={() => setMemberDropdownOpen(!memberDropdownOpen)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 disabled:opacity-40"
                    >
                      <i
                        className={`bi ${
                          memberDropdownOpen
                            ? "bi-chevron-up"
                            : "bi-chevron-down"
                        }`}
                      ></i>
                    </button>
                  </div>

                  {memberDropdownOpen && issueForm.member_type && (
                    <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                      {issueMembers
                        .filter(
                          (member) =>
                            member.member_type === issueForm.member_type,
                        )
                        .filter((member) => {
                          const searchValue = memberSearch.trim().toLowerCase();

                          if (!searchValue) {
                            return true;
                          }

                          return (
                            String(member.name || "")
                              .toLowerCase()
                              .includes(searchValue) ||
                            String(member.member_code || "")
                              .toLowerCase()
                              .includes(searchValue) ||
                            String(member.mobile || "")
                              .toLowerCase()
                              .includes(searchValue) ||
                            String(member.group || "")
                              .toLowerCase()
                              .includes(searchValue)
                          );
                        })
                        .slice(0, 50)
                        .map((member) => (
                          <button
                            key={`${member.member_type}-${member.id}`}
                            type="button"
                            onClick={() => selectIssueMember(member)}
                            className={`flex w-full items-center justify-between border-b border-gray-100 px-4 py-3 text-left last:border-b-0 hover:bg-indigo-50 ${
                              String(issueForm.member_id) === String(member.id)
                                ? "bg-indigo-50"
                                : ""
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {member.name}
                              </p>

                              <p className="mt-0.5 truncate text-xs text-gray-500">
                                {member.member_code}
                                {member.group ? ` • ${member.group}` : ""}
                                {member.mobile ? ` • ${member.mobile}` : ""}
                              </p>
                            </div>

                            <span className="ml-3 shrink-0 rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium capitalize text-gray-600">
                              {member.member_type}
                            </span>
                          </button>
                        ))}

                      {issueMembers
                        .filter(
                          (member) =>
                            member.member_type === issueForm.member_type,
                        )
                        .filter((member) => {
                          const searchValue = memberSearch.trim().toLowerCase();

                          if (!searchValue) {
                            return true;
                          }

                          return (
                            String(member.name || "")
                              .toLowerCase()
                              .includes(searchValue) ||
                            String(member.member_code || "")
                              .toLowerCase()
                              .includes(searchValue) ||
                            String(member.mobile || "")
                              .toLowerCase()
                              .includes(searchValue) ||
                            String(member.group || "")
                              .toLowerCase()
                              .includes(searchValue)
                          );
                        }).length === 0 && (
                        <div className="px-4 py-8 text-center">
                          <i className="bi bi-search text-2xl text-gray-300"></i>

                          <p className="mt-2 text-sm font-medium text-gray-600">
                            No members found
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            Search by name, ID, mobile or department
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedIssueMember && (
                    <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2">
                      <p className="text-xs font-semibold text-indigo-700">
                        Selected Member
                      </p>

                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {selectedIssueMember.name}
                      </p>

                      <p className="text-xs text-gray-500">
                        {selectedIssueMember.member_code}
                        {selectedIssueMember.group
                          ? ` • ${selectedIssueMember.group}`
                          : ""}
                      </p>
                    </div>
                  )}

                  {issueFormErrors.member_id && (
                    <p className="mt-1 text-xs text-red-600">
                      {issueFormErrors.member_id}
                    </p>
                  )}
                </div>

                {/* BOOK */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Available Book *
                  </label>

                  <select
                    value={issueForm.book_id}
                    disabled={optionsLoading}
                    onChange={(event) =>
                      updateIssueForm("book_id", event.target.value)
                    }
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none disabled:bg-gray-100 ${
                      issueFormErrors.book_id
                        ? "border-red-500"
                        : "border-gray-300 focus:border-indigo-500"
                    }`}
                  >
                    <option value="">Select Book</option>

                    {availableBooks.map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.title} — {book.book_code} ({book.available_copies}{" "}
                        available)
                      </option>
                    ))}
                  </select>

                  {issueFormErrors.book_id && (
                    <p className="mt-1 text-xs text-red-600">
                      {issueFormErrors.book_id}
                    </p>
                  )}
                </div>

                {/* ISSUE DATE */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Issue Date *
                  </label>

                  <input
                    type="date"
                    value={issueForm.issue_date}
                    onChange={(event) =>
                      updateIssueForm("issue_date", event.target.value)
                    }
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm ${
                      issueFormErrors.issue_date
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />

                  {issueFormErrors.issue_date && (
                    <p className="mt-1 text-xs text-red-600">
                      {issueFormErrors.issue_date}
                    </p>
                  )}
                </div>

                {/* DUE DATE */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Expected Return Date *
                  </label>

                  <input
                    type="date"
                    min={issueForm.issue_date}
                    value={issueForm.due_date}
                    onChange={(event) =>
                      updateIssueForm("due_date", event.target.value)
                    }
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm ${
                      issueFormErrors.due_date
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />

                  {issueFormErrors.due_date && (
                    <p className="mt-1 text-xs text-red-600">
                      {issueFormErrors.due_date}
                    </p>
                  )}
                </div>

                {/* FINE */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Fine Per Late Day
                  </label>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                      ₹
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={issueForm.fine_per_day}
                      onChange={(event) =>
                        updateIssueForm("fine_per_day", event.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 py-2.5 pl-7 pr-3 text-sm"
                    />
                  </div>
                </div>

                {/* REMARKS */}
                <div className="md:col-span-2 xl:col-span-3">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Remarks
                  </label>

                  <input
                    type="text"
                    maxLength={500}
                    value={issueForm.remarks}
                    onChange={(event) =>
                      updateIssueForm("remarks", event.target.value)
                    }
                    placeholder="Optional condition, purpose or note"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  />
                </div>

                {/* BUTTONS */}
                <div className="flex items-end justify-end gap-2">
                  <button
                    type="button"
                    onClick={resetIssueForm}
                    disabled={issueSaving}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Reset
                  </button>

                  <button
                    type="submit"
                    disabled={issueSaving || optionsLoading}
                    className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {issueSaving ? (
                      <>
                        <i className="bi bi-arrow-repeat mr-2 inline-block animate-spin"></i>
                        Issuing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-journal-plus mr-2"></i>
                        Issue Book
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* FILTERS */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                <input
                  type="search"
                  value={circulationFilters.search}
                  onChange={(event) =>
                    updateCirculationFilter("search", event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applyCirculationFilters();
                    }
                  }}
                  placeholder="Member, ID, book, ISBN..."
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm xl:col-span-2"
                />

                <select
                  value={circulationFilters.member_type}
                  onChange={(event) =>
                    updateCirculationFilter("member_type", event.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">All Member Types</option>
                  <option value="student">Students</option>
                  <option value="teacher">Teachers</option>
                  <option value="staff">Non-Teaching Staff</option>
                  <option value="admin">Administrators</option>
                </select>

                <select
                  value={circulationFilters.status}
                  onChange={(event) =>
                    updateCirculationFilter("status", event.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">All Status</option>
                  <option value="Issued">Issued</option>
                  <option value="Due Soon">Due Soon</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Returned">Returned</option>
                </select>

                <input
                  type="date"
                  value={circulationFilters.date_from}
                  onChange={(event) =>
                    updateCirculationFilter("date_from", event.target.value)
                  }
                  title="Issue date from"
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyCirculationFilters}
                    disabled={circulationLoading}
                    className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white"
                  >
                    Filter
                  </button>

                  <button
                    type="button"
                    onClick={resetCirculationFilters}
                    disabled={circulationLoading}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* TABLE */}
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
                <table className="min-w-[1250px] w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="p-3 text-left">Issue ID</th>
                      <th className="p-3 text-left">Member</th>
                      <th className="p-3 text-left">Book</th>
                      <th className="p-3 text-left">Issue Date</th>
                      <th className="p-3 text-left">Due Date</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Late Days</th>
                      <th className="p-3 text-right">Fine</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {circulationLoading ? (
                      <tr>
                        <td
                          colSpan="9"
                          className="p-12 text-center text-gray-500"
                        >
                          <i className="bi bi-arrow-repeat mr-2 inline-block animate-spin"></i>
                          Loading circulation records...
                        </td>
                      </tr>
                    ) : circulationRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan="9"
                          className="p-12 text-center text-gray-500"
                        >
                          No issued-book records found.
                        </td>
                      </tr>
                    ) : (
                      circulationRows.map((issue) => {
                        const issueKey = `${issue.member_type}-${issue.id}`;

                        const statusClass =
                          issue.status === "Overdue"
                            ? "bg-red-100 text-red-700"
                            : issue.status === "Due Soon"
                              ? "bg-amber-100 text-amber-700"
                              : issue.status === "Returned"
                                ? "bg-gray-100 text-gray-700"
                                : "bg-blue-100 text-blue-700";

                        return (
                          <tr key={issueKey} className="hover:bg-gray-50">
                            <td className="p-3 font-medium text-gray-700">
                              {issue.issue_code}
                            </td>

                            <td className="p-3">
                              <p className="font-semibold text-gray-900">
                                {issue.member_name}
                              </p>

                              <p className="text-xs text-gray-500">
                                {issue.member_code} • {issue.member_type}
                              </p>
                            </td>

                            <td className="p-3">
                              <p className="font-medium text-gray-900">
                                {issue.book_title}
                              </p>

                              <p className="text-xs text-gray-500">
                                {issue.book_code}
                                {issue.author ? ` • ${issue.author}` : ""}
                              </p>
                            </td>

                            <td className="p-3">{issue.issue_date || "—"}</td>

                            <td className="p-3">{issue.due_date || "—"}</td>

                            <td className="p-3 text-center">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass}`}
                              >
                                {issue.status}
                              </span>
                            </td>

                            <td className="p-3 text-center">
                              <span
                                className={
                                  issue.overdue_days > 0
                                    ? "font-semibold text-red-600"
                                    : "text-gray-500"
                                }
                              >
                                {issue.overdue_days}
                              </span>
                            </td>

                            <td className="p-3 text-right font-semibold text-red-600">
                              ₹{Number(issue.fine_amount || 0).toFixed(2)}
                            </td>

                            <td className="p-3">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openIssueDetails(issue)}
                                  className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                                >
                                  View
                                </button>

                                {issue.status !== "Returned" && (
                                  <button
                                    type="button"
                                    disabled={returningIssueKey === issueKey}
                                    onClick={() => returnIssuedBook(issue)}
                                    className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                                  >
                                    {returningIssueKey === issueKey
                                      ? "Returning..."
                                      : "Return"}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">
                  Total {circulationPagination.total} record(s)
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      !circulationPagination.has_prev || circulationLoading
                    }
                    onClick={() =>
                      changeCirculationPage(circulationPagination.page - 1)
                    }
                    className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="text-sm text-gray-600">
                    Page {circulationPagination.page} of{" "}
                    {circulationPagination.pages}
                  </span>

                  <button
                    type="button"
                    disabled={
                      !circulationPagination.has_next || circulationLoading
                    }
                    onClick={() =>
                      changeCirculationPage(circulationPagination.page + 1)
                    }
                    className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* ISSUE DETAIL MODAL */}
            {issueDetailsOpen && selectedIssue && (
              <div
                className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    closeIssueDetails();
                  }
                }}
              >
                <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b px-5 py-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Issue Record
                      </h3>

                      <p className="text-sm text-gray-500">
                        {selectedIssue.issue_code}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeIssueDetails}
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>

                  <div className="space-y-5 p-5">
                    <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-5 text-white">
                      <h3 className="text-xl font-semibold">
                        {selectedIssue.book_title}
                      </h3>

                      <p className="mt-1 text-sm text-indigo-100">
                        Issued to {selectedIssue.member_name} •{" "}
                        {selectedIssue.member_code}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        ["Member Type", selectedIssue.member_type],
                        ["Class / Department", selectedIssue.member_group],
                        ["Book Code", selectedIssue.book_code],
                        ["ISBN", selectedIssue.isbn],
                        ["Shelf", selectedIssue.shelf_no],
                        ["Author", selectedIssue.author],
                        ["Issue Date", selectedIssue.issue_date],
                        ["Due Date", selectedIssue.due_date],
                        ["Return Date", selectedIssue.return_date],
                        ["Status", selectedIssue.status],
                        ["Late Days", selectedIssue.overdue_days],
                        [
                          "Fine",
                          `₹${Number(selectedIssue.fine_amount || 0).toFixed(
                            2,
                          )}`,
                        ],
                        [
                          "Fine Per Day",
                          `₹${Number(selectedIssue.fine_per_day || 0).toFixed(
                            2,
                          )}`,
                        ],
                        ["Remarks", selectedIssue.remarks],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                        >
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            {label}
                          </p>

                          <p className="mt-1 break-words text-sm font-medium text-gray-800">
                            {value !== null &&
                            value !== undefined &&
                            value !== ""
                              ? value
                              : "—"}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end gap-3 border-t pt-4">
                      <button
                        type="button"
                        onClick={closeIssueDetails}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                      >
                        Close
                      </button>

                      {selectedIssue.status !== "Returned" && (
                        <button
                          type="button"
                          onClick={() => returnIssuedBook(selectedIssue)}
                          disabled={
                            returningIssueKey ===
                            `${selectedIssue.member_type}-${selectedIssue.id}`
                          }
                          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                        >
                          Return Book
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================= RETURN BOOKS ================= */}
        {activeSection === "return-books" && (
          <section className="section active space-y-6 p-4 sm:p-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Return Books</h2>

                  <p className="mt-1 text-sm text-blue-100">
                    Process returns, calculate fines and manage payments
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={exportReturnReport}
                    disabled={
                      returnExporting ||
                      returnRecordsLoading ||
                      returnStats.total_returned === 0
                    }
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-green-700 disabled:opacity-50"
                  >
                    {returnExporting ? (
                      <>
                        <i className="bi bi-arrow-repeat mr-2 inline-block animate-spin"></i>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-file-earmark-spreadsheet mr-2"></i>
                        Export Filtered Report
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      loadReturnOptions({
                        silent: true,
                      });

                      loadReturnRecords({
                        page: returnPagination.page,
                        perPage: returnPagination.per_page,
                        filters: returnFilters,
                        silent: true,
                      });
                    }}
                    disabled={returnOptionsLoading || returnRecordsLoading}
                    className="rounded-lg bg-white/15 px-4 py-2 text-sm font-medium hover:bg-white/25 disabled:opacity-50"
                  >
                    <i
                      className={`bi bi-arrow-clockwise mr-2 ${
                        returnRecordsLoading ? "inline-block animate-spin" : ""
                      }`}
                    ></i>
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {[
                ["Total Returned", returnStats.total_returned, "text-gray-700"],
                ["Returned Today", returnStats.returned_today, "text-blue-700"],
                ["Late Returns", returnStats.late_returns, "text-red-700"],
                ["Pending Fines", returnStats.pending_fines, "text-amber-700"],
                [
                  "Fine Collected",
                  `₹${Number(returnStats.fine_collected || 0).toFixed(2)}`,
                  "text-green-700",
                ],
                [
                  "Fine Waived",
                  `₹${Number(returnStats.fine_waived || 0).toFixed(2)}`,
                  "text-purple-700",
                ],
              ].map(([label, value, valueClass]) => (
                <div
                  key={label}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {label}
                  </p>

                  <p className={`mt-2 text-2xl font-bold ${valueClass}`}>
                    {value || 0}
                  </p>
                </div>
              ))}
            </div>

            {/* RETURN FORM */}
            <form
              onSubmit={(event) => processReturn(event, returnForm.fine_action)}
              className="overflow-visible rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <div className="border-b px-5 py-4">
                <h3 className="font-semibold text-gray-900">
                  Process Book Return
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  Search and select an active issued-book record.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 xl:grid-cols-4">
                {/* MEMBER TYPE */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-gray-600">
                    Member Type
                  </label>

                  <select
                    value={returnForm.member_type}
                    onChange={(event) =>
                      updateReturnForm("member_type", event.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  >
                    <option value="">All Member Types</option>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="staff">Non-Teaching Staff</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                {/* SEARCHABLE ISSUED RECORD */}
                <div className="relative md:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-gray-600">
                    Select Issued Record *
                  </label>

                  <div className="relative">
                    <input
                      type="text"
                      value={issueSearch}
                      disabled={returnOptionsLoading}
                      onFocus={() => setIssueDropdownOpen(true)}
                      onChange={(event) => {
                        setIssueSearch(event.target.value);

                        setIssueDropdownOpen(true);

                        if (returnForm.issue_id) {
                          clearIssuedRecord();
                        }
                      }}
                      placeholder={
                        returnOptionsLoading
                          ? "Loading issued records..."
                          : "Search issue ID, member, book, ISBN..."
                      }
                      autoComplete="off"
                      className={`w-full rounded-lg border px-3 py-2.5 pr-20 text-sm ${
                        returnFormErrors.issue_id
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />

                    {selectedIssuedRecord && (
                      <button
                        type="button"
                        onClick={clearIssuedRecord}
                        className="absolute right-9 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600"
                      >
                        <i className="bi bi-x-circle"></i>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setIssueDropdownOpen(!issueDropdownOpen)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      <i
                        className={`bi ${
                          issueDropdownOpen
                            ? "bi-chevron-up"
                            : "bi-chevron-down"
                        }`}
                      ></i>
                    </button>
                  </div>

                  {issueDropdownOpen && (
                    <div className="absolute z-[80] mt-1 max-h-80 w-full overflow-y-auto rounded-xl border bg-white shadow-xl">
                      {activeIssueOptions
                        .filter(
                          (record) =>
                            !returnForm.member_type ||
                            record.member_type === returnForm.member_type,
                        )
                        .filter((record) => {
                          const value = issueSearch.trim().toLowerCase();

                          if (!value) {
                            return true;
                          }

                          return [
                            record.issue_code,
                            record.member_name,
                            record.member_code,
                            record.book_title,
                            record.book_code,
                            record.isbn,
                          ].some((item) =>
                            String(item || "")
                              .toLowerCase()
                              .includes(value),
                          );
                        })
                        .slice(0, 50)
                        .map((record) => (
                          <button
                            key={`${record.member_type}-${record.id}`}
                            type="button"
                            onClick={() => selectIssuedRecord(record)}
                            className="flex w-full items-center justify-between border-b px-4 py-3 text-left hover:bg-indigo-50"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {record.book_title}
                              </p>

                              <p className="mt-1 truncate text-xs text-gray-500">
                                {record.issue_code}
                                {" • "}
                                {record.member_name}
                                {" • "}
                                {record.member_code}
                              </p>

                              <p className="mt-1 text-xs text-gray-400">
                                Due: {record.due_date}
                              </p>
                            </div>

                            <span className="ml-3 rounded-full bg-blue-100 px-2 py-1 text-xs capitalize text-blue-700">
                              {record.member_type}
                            </span>
                          </button>
                        ))}

                      {activeIssueOptions.length === 0 && (
                        <div className="p-8 text-center text-sm text-gray-500">
                          No active issued records.
                        </div>
                      )}
                    </div>
                  )}

                  {returnFormErrors.issue_id && (
                    <p className="mt-1 text-xs text-red-600">
                      {returnFormErrors.issue_id}
                    </p>
                  )}
                </div>

                {/* RETURN DATE */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-gray-600">
                    Actual Return Date *
                  </label>

                  <input
                    type="date"
                    min={selectedIssuedRecord?.issue_date || undefined}
                    value={returnForm.return_date}
                    onChange={(event) =>
                      updateReturnForm("return_date", event.target.value)
                    }
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm ${
                      returnFormErrors.return_date
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />

                  {returnFormErrors.return_date && (
                    <p className="mt-1 text-xs text-red-600">
                      {returnFormErrors.return_date}
                    </p>
                  )}
                </div>

                {/* SELECTED RECORD INFORMATION */}
                <div className="md:col-span-2 xl:col-span-4">
                  {selectedIssuedRecord ? (
                    <div className="grid grid-cols-1 gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4 sm:grid-cols-2 lg:grid-cols-6">
                      {[
                        ["Member", selectedIssuedRecord.member_name],
                        ["Type", selectedIssuedRecord.member_type],
                        ["Book", selectedIssuedRecord.book_title],
                        ["Issue Date", selectedIssuedRecord.issue_date],
                        ["Due Date", selectedIssuedRecord.due_date],
                        [
                          "Fine Per Day",
                          `₹${Number(
                            selectedIssuedRecord.fine_per_day || 0,
                          ).toFixed(2)}`,
                        ],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <p className="text-xs font-medium uppercase text-indigo-500">
                            {label}
                          </p>

                          <p className="mt-1 break-words text-sm font-semibold text-gray-800">
                            {value || "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                      Select an issued record to view return and fine
                      information.
                    </div>
                  )}
                </div>

                {/* CALCULATED FINE */}
                {selectedIssuedRecord && (
                  <div className="md:col-span-2 xl:col-span-4">
                    <div
                      className={`grid grid-cols-1 gap-4 rounded-xl border p-4 sm:grid-cols-3 ${
                        calculatedReturnInfo.overdueDays > 0
                          ? "border-red-200 bg-red-50"
                          : "border-green-200 bg-green-50"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-medium uppercase text-gray-500">
                          Late Days
                        </p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">
                          {calculatedReturnInfo.overdueDays}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase text-gray-500">
                          Calculated Fine
                        </p>
                        <p className="mt-1 text-2xl font-bold text-red-600">
                          ₹{Number(calculatedReturnInfo.fineAmount).toFixed(2)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase text-gray-500">
                          Return Condition
                        </p>
                        <p className="mt-1 text-sm font-semibold text-gray-800">
                          {calculatedReturnInfo.overdueDays > 0
                            ? "Late Return"
                            : "Returned On Time"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* FINE ACTION */}
                {calculatedReturnInfo.fineAmount > 0 && (
                  <>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase text-gray-600">
                        Fine Action
                      </label>

                      <select
                        value={returnForm.fine_action}
                        onChange={(event) =>
                          updateReturnForm("fine_action", event.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                      >
                        <option value="pending">Keep Pending</option>
                        <option value="collect">Collect Now</option>
                        <option value="waive">Waive Fine</option>
                      </select>
                    </div>

                    {returnForm.fine_action === "collect" && (
                      <>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase text-gray-600">
                            Payment Method
                          </label>

                          <select
                            value={returnForm.payment_method}
                            onChange={(event) =>
                              updateReturnForm(
                                "payment_method",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                          >
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Card">Card</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cheque">Cheque</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase text-gray-600">
                            Payment Reference
                          </label>

                          <input
                            type="text"
                            value={returnForm.reference_no}
                            onChange={(event) =>
                              updateReturnForm(
                                "reference_no",
                                event.target.value,
                              )
                            }
                            placeholder="Receipt / transaction no."
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                          />
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* REMARKS */}
                <div className="md:col-span-2 xl:col-span-4">
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-gray-600">
                    Return Remarks
                  </label>

                  <textarea
                    rows="3"
                    value={returnForm.remarks}
                    onChange={(event) =>
                      updateReturnForm("remarks", event.target.value)
                    }
                    placeholder="Book condition, damage notes or other remarks"
                    className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  />
                </div>

                {/* ACTIONS */}
                <div className="flex flex-wrap justify-end gap-3 md:col-span-2 xl:col-span-4">
                  <button
                    type="button"
                    onClick={resetReturnForm}
                    disabled={returnSaving}
                    className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700"
                  >
                    Reset
                  </button>

                  {calculatedReturnInfo.fineAmount > 0 && (
                    <>
                      <button
                        type="button"
                        disabled={returnSaving || !selectedIssuedRecord}
                        onClick={(event) => processReturn(event, "waive")}
                        className="rounded-lg bg-gray-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                      >
                        Waive & Return
                      </button>

                      <button
                        type="button"
                        disabled={returnSaving || !selectedIssuedRecord}
                        onClick={(event) => processReturn(event, "collect")}
                        className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                      >
                        Collect Fine & Return
                      </button>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={returnSaving || !selectedIssuedRecord}
                    className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {returnSaving ? (
                      <>
                        <i className="bi bi-arrow-repeat mr-2 inline-block animate-spin"></i>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-box-arrow-in-down-left mr-2"></i>
                        Return Book
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* RETURN HISTORY FILTERS */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
                <input
                  type="search"
                  value={returnFilters.search}
                  onChange={(event) =>
                    updateReturnFilter("search", event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applyReturnFilters();
                    }
                  }}
                  placeholder="Member, issue ID, book, ISBN..."
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm xl:col-span-2"
                />

                <select
                  value={returnFilters.member_type}
                  onChange={(event) =>
                    updateReturnFilter("member_type", event.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">All Member Types</option>
                  <option value="student">Students</option>
                  <option value="teacher">Teachers</option>
                  <option value="staff">Non-Teaching Staff</option>
                  <option value="admin">Administrators</option>
                </select>

                <select
                  value={returnFilters.fine_status}
                  onChange={(event) =>
                    updateReturnFilter("fine_status", event.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">All Fine Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Waived">Waived</option>
                  <option value="No Fine">No Fine</option>
                </select>

                <input
                  type="date"
                  value={returnFilters.date_from}
                  onChange={(event) =>
                    updateReturnFilter("date_from", event.target.value)
                  }
                  title="Return date from"
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />

                <input
                  type="date"
                  min={returnFilters.date_from || undefined}
                  value={returnFilters.date_to}
                  onChange={(event) =>
                    updateReturnFilter("date_to", event.target.value)
                  }
                  title="Return date to"
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyReturnFilters}
                    disabled={returnRecordsLoading}
                    className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white"
                  >
                    Filter
                  </button>

                  <button
                    type="button"
                    onClick={resetReturnFilters}
                    disabled={returnRecordsLoading}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* RETURNED RECORDS */}
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Returned Books
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  Latest returned books are displayed first.
                </p>
              </div>

              <div className="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
                <table className="min-w-[1200px] w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                    <tr>
                      <th className="p-3 text-left">Issue ID</th>
                      <th className="p-3 text-left">Member</th>
                      <th className="p-3 text-left">Book</th>
                      <th className="p-3 text-left">Issued</th>
                      <th className="p-3 text-left">Due</th>
                      <th className="p-3 text-left">Returned</th>
                      <th className="p-3 text-center">Late Days</th>
                      <th className="p-3 text-right">Fine</th>
                      <th className="p-3 text-center">Fine Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {returnRecordsLoading ? (
                      <tr>
                        <td
                          colSpan="10"
                          className="p-12 text-center text-gray-500"
                        >
                          <i className="bi bi-arrow-repeat mr-2 inline-block animate-spin"></i>
                          Loading returned books...
                        </td>
                      </tr>
                    ) : returnRecords.length === 0 ? (
                      <tr>
                        <td
                          colSpan="10"
                          className="p-12 text-center text-gray-500"
                        >
                          No returned books found.
                        </td>
                      </tr>
                    ) : (
                      returnRecords.map((record) => {
                        const fineClass =
                          record.fine_status === "Pending"
                            ? "bg-amber-100 text-amber-700"
                            : record.fine_status === "Paid"
                              ? "bg-green-100 text-green-700"
                              : record.fine_status === "Waived"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-gray-100 text-gray-700";

                        return (
                          <tr
                            key={`${record.member_type}-${record.id}`}
                            className="hover:bg-gray-50"
                          >
                            <td className="p-3 font-medium">
                              {record.issue_code}
                            </td>

                            <td className="p-3">
                              <p className="font-semibold text-gray-900">
                                {record.member_name}
                              </p>

                              <p className="text-xs text-gray-500">
                                {record.member_code} • {record.member_type}
                              </p>
                            </td>

                            <td className="p-3">
                              <p className="font-medium">{record.book_title}</p>

                              <p className="text-xs text-gray-500">
                                {record.book_code}
                                {record.author ? ` • ${record.author}` : ""}
                              </p>
                            </td>

                            <td className="p-3">{record.issue_date || "—"}</td>

                            <td className="p-3">{record.due_date || "—"}</td>

                            <td className="p-3 font-medium text-green-700">
                              {record.return_date || "—"}
                            </td>

                            <td className="p-3 text-center">
                              <span
                                className={
                                  record.overdue_days > 0
                                    ? "font-bold text-red-600"
                                    : "text-gray-500"
                                }
                              >
                                {record.overdue_days}
                              </span>
                            </td>

                            <td className="p-3 text-right font-semibold text-red-600">
                              ₹{Number(record.fine_amount || 0).toFixed(2)}
                            </td>

                            <td className="p-3 text-center">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${fineClass}`}
                              >
                                {record.fine_status}
                              </span>
                            </td>

                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => openReturnDetails(record)}
                                className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">
                  Total {returnPagination.total} record(s)
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      !returnPagination.has_prev || returnRecordsLoading
                    }
                    onClick={() => changeReturnPage(returnPagination.page - 1)}
                    className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="text-sm text-gray-600">
                    Page {returnPagination.page} of {returnPagination.pages}
                  </span>

                  <button
                    type="button"
                    disabled={
                      !returnPagination.has_next || returnRecordsLoading
                    }
                    onClick={() => changeReturnPage(returnPagination.page + 1)}
                    className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* RETURN DETAIL MODAL */}
            {returnDetailsOpen && selectedReturnRecord && (
              <div
                className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    closeReturnDetails();
                  }
                }}
              >
                <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                  <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4">
                    <div>
                      <h3 className="text-lg font-semibold">Return Record</h3>

                      <p className="text-sm text-gray-500">
                        {selectedReturnRecord.issue_code}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeReturnDetails}
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>

                  <div className="space-y-5 p-5">
                    <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-5 text-white">
                      <h3 className="text-xl font-semibold">
                        {selectedReturnRecord.book_title}
                      </h3>

                      <p className="mt-1 text-sm text-indigo-100">
                        Returned by {selectedReturnRecord.member_name} •{" "}
                        {selectedReturnRecord.member_code}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        ["Member Type", selectedReturnRecord.member_type],
                        [
                          "Class / Department",
                          selectedReturnRecord.member_group,
                        ],
                        ["Book Code", selectedReturnRecord.book_code],
                        ["ISBN", selectedReturnRecord.isbn],
                        ["Issue Date", selectedReturnRecord.issue_date],
                        ["Due Date", selectedReturnRecord.due_date],
                        ["Return Date", selectedReturnRecord.return_date],
                        ["Late Days", selectedReturnRecord.overdue_days],
                        [
                          "Fine Amount",
                          `₹${Number(
                            selectedReturnRecord.fine_amount || 0,
                          ).toFixed(2)}`,
                        ],
                        [
                          "Paid Fine",
                          `₹${Number(
                            selectedReturnRecord.paid_fine || 0,
                          ).toFixed(2)}`,
                        ],
                        [
                          "Waived Fine",
                          `₹${Number(
                            selectedReturnRecord.waived_fine || 0,
                          ).toFixed(2)}`,
                        ],
                        [
                          "Pending Fine",
                          `₹${Number(
                            selectedReturnRecord.pending_fine || 0,
                          ).toFixed(2)}`,
                        ],
                        ["Fine Status", selectedReturnRecord.fine_status],
                        ["Remarks", selectedReturnRecord.remarks],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-xl border bg-gray-50 p-3"
                        >
                          <p className="text-xs font-medium uppercase text-gray-500">
                            {label}
                          </p>

                          <p className="mt-1 break-words text-sm font-medium text-gray-800">
                            {value !== null &&
                            value !== undefined &&
                            value !== ""
                              ? value
                              : "—"}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end border-t pt-4">
                      <button
                        type="button"
                        onClick={closeReturnDetails}
                        className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================= FINE MANAGEMENT ================= */}
        {activeSection === "fines" && (
          <section className="section active space-y-6 p-4 sm:p-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Fine Management</h2>

                  <p className="mt-1 text-sm text-blue-100">
                    Track, collect and waive library fines
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={exportFineReport}
                    disabled={
                      finesExporting ||
                      finesLoading ||
                      fineStats.total_fines === 0
                    }
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-green-700 disabled:opacity-50"
                  >
                    {finesExporting ? (
                      <>
                        <i className="bi bi-arrow-repeat mr-2 inline-block animate-spin"></i>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-file-earmark-spreadsheet mr-2"></i>
                        Export Filtered Report
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      loadFines({
                        page: finePagination.page,
                        perPage: finePagination.per_page,
                        filters: fineFilters,
                        silent: true,
                      })
                    }
                    disabled={finesLoading}
                    className="rounded-lg bg-white/15 px-4 py-2 text-sm font-medium hover:bg-white/25 disabled:opacity-50"
                  >
                    <i
                      className={`bi bi-arrow-clockwise mr-2 ${
                        finesLoading ? "inline-block animate-spin" : ""
                      }`}
                    ></i>
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
              {[
                ["Total Fines", fineStats.total_fines, "text-gray-800"],
                ["Pending", fineStats.pending_count, "text-amber-700"],
                ["Partial", fineStats.partially_paid_count, "text-orange-700"],
                ["Paid", fineStats.paid_count, "text-green-700"],
                ["Waived", fineStats.waived_count, "text-purple-700"],
                [
                  "Pending Amount",
                  `₹${Number(fineStats.pending_amount || 0).toFixed(2)}`,
                  "text-red-700",
                ],
                [
                  "Collected",
                  `₹${Number(fineStats.collected_amount || 0).toFixed(2)}`,
                  "text-green-700",
                ],
              ].map(([label, value, valueClass]) => (
                <div
                  key={label}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {label}
                  </p>

                  <p className={`mt-2 text-2xl font-bold ${valueClass}`}>
                    {value || 0}
                  </p>
                </div>
              ))}
            </div>

            {/* FILTERS */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
                <input
                  type="search"
                  value={fineFilters.search}
                  onChange={(event) =>
                    updateFineFilter("search", event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applyFineFilters();
                    }
                  }}
                  placeholder="Member, fine ID, book, ISBN..."
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm xl:col-span-2"
                />

                <select
                  value={fineFilters.member_type}
                  onChange={(event) =>
                    updateFineFilter("member_type", event.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">All Member Types</option>
                  <option value="student">Students</option>
                  <option value="teacher">Teachers</option>
                  <option value="staff">Non-Teaching Staff</option>
                </select>

                <select
                  value={fineFilters.status}
                  onChange={(event) =>
                    updateFineFilter("status", event.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">All Fine Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Partially Waived">Partially Waived</option>
                  <option value="Paid">Paid</option>
                  <option value="Waived">Waived</option>
                  <option value="Partially Paid & Waived">Paid & Waived</option>
                </select>

                <input
                  type="date"
                  value={fineFilters.date_from}
                  onChange={(event) =>
                    updateFineFilter("date_from", event.target.value)
                  }
                  title="Due date from"
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />

                <input
                  type="date"
                  min={fineFilters.date_from || undefined}
                  value={fineFilters.date_to}
                  onChange={(event) =>
                    updateFineFilter("date_to", event.target.value)
                  }
                  title="Due date to"
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyFineFilters}
                    disabled={finesLoading}
                    className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white"
                  >
                    Filter
                  </button>

                  <button
                    type="button"
                    onClick={resetFineFilters}
                    disabled={finesLoading}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* FINES TABLE */}
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-[1350px] w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="p-3 text-left">Fine ID</th>
                      <th className="p-3 text-left">Member</th>
                      <th className="p-3 text-left">Role</th>
                      <th className="p-3 text-left">Book</th>
                      <th className="p-3 text-center">Late Days</th>
                      <th className="p-3 text-right">Total Fine</th>
                      <th className="p-3 text-right">Collected</th>
                      <th className="p-3 text-right">Waived</th>
                      <th className="p-3 text-right">Pending</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {finesLoading ? (
                      <tr>
                        <td
                          colSpan="11"
                          className="p-12 text-center text-gray-500"
                        >
                          <i className="bi bi-arrow-repeat mr-2 inline-block animate-spin"></i>
                          Loading fines...
                        </td>
                      </tr>
                    ) : fineRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan="11"
                          className="p-12 text-center text-gray-500"
                        >
                          No fine records found.
                        </td>
                      </tr>
                    ) : (
                      fineRows.map((fine) => {
                        const roleClass =
                          fine.member_type === "student"
                            ? "bg-blue-100 text-blue-700"
                            : fine.member_type === "teacher"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-cyan-100 text-cyan-700";

                        const statusClass =
                          fine.status === "Pending"
                            ? "bg-amber-100 text-amber-700"
                            : fine.status === "Paid"
                              ? "bg-green-100 text-green-700"
                              : fine.status === "Waived"
                                ? "bg-purple-100 text-purple-700"
                                : fine.status.includes("Partial")
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-gray-100 text-gray-700";

                        const canResolve = Number(fine.pending_amount || 0) > 0;

                        return (
                          <tr key={fine.id} className="hover:bg-gray-50">
                            <td className="p-3 font-medium text-gray-700">
                              {fine.fine_code}
                            </td>

                            <td className="p-3">
                              <p className="font-semibold text-gray-900">
                                {fine.member_name}
                              </p>

                              <p className="text-xs text-gray-500">
                                {fine.member_code}
                                {fine.member_group
                                  ? ` • ${fine.member_group}`
                                  : ""}
                              </p>
                            </td>

                            <td className="p-3">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${roleClass}`}
                              >
                                {fine.member_type === "staff"
                                  ? "Non-Teaching Staff"
                                  : fine.member_type}
                              </span>
                            </td>

                            <td className="p-3">
                              <p className="font-medium text-gray-900">
                                {fine.book_title}
                              </p>

                              <p className="text-xs text-gray-500">
                                {fine.book_code}
                                {fine.author ? ` • ${fine.author}` : ""}
                              </p>
                            </td>

                            <td className="p-3 text-center font-semibold text-red-600">
                              {fine.overdue_days}
                            </td>

                            <td className="p-3 text-right font-semibold text-gray-800">
                              ₹{Number(fine.fine_amount || 0).toFixed(2)}
                            </td>

                            <td className="p-3 text-right font-medium text-green-700">
                              ₹{Number(fine.collected_amount || 0).toFixed(2)}
                            </td>

                            <td className="p-3 text-right font-medium text-purple-700">
                              ₹{Number(fine.waived_amount || 0).toFixed(2)}
                            </td>

                            <td className="p-3 text-right font-bold text-red-600">
                              ₹{Number(fine.pending_amount || 0).toFixed(2)}
                            </td>

                            <td className="p-3 text-center">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass}`}
                              >
                                {fine.status}
                              </span>
                            </td>

                            <td className="p-3">
                              <div className="flex justify-end gap-2">
                                {canResolve && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openFineAction(fine, "collect")
                                      }
                                      className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50"
                                    >
                                      Pay
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        openFineAction(fine, "waive")
                                      }
                                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                                    >
                                      Waive
                                    </button>
                                  </>
                                )}

                                <button
                                  type="button"
                                  onClick={() => openFineDetails(fine)}
                                  className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                                >
                                  View
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">
                  Total {finePagination.total} fine record(s)
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!finePagination.has_prev || finesLoading}
                    onClick={() => changeFinePage(finePagination.page - 1)}
                    className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="text-sm text-gray-600">
                    Page {finePagination.page} of {finePagination.pages}
                  </span>

                  <button
                    type="button"
                    disabled={!finePagination.has_next || finesLoading}
                    onClick={() => changeFinePage(finePagination.page + 1)}
                    className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* PAY / WAIVE MODAL */}
            {fineActionOpen && selectedFine && (
              <div
                className="fixed inset-0 z-[160] flex items-center justify-center bg-black/50 p-4"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    closeFineAction();
                  }
                }}
              >
                <form
                  onSubmit={saveFineAction}
                  className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b px-5 py-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {fineActionForm.action === "waive"
                          ? "Waive Fine"
                          : "Collect Fine"}
                      </h3>

                      <p className="text-sm text-gray-500">
                        {selectedFine.fine_code}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeFineAction}
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="font-semibold text-gray-900">
                        {selectedFine.member_name}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {selectedFine.book_title}
                      </p>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Pending Fine
                        </span>

                        <span className="text-xl font-bold text-red-600">
                          ₹{Number(selectedFine.pending_amount || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase text-gray-600">
                        Amount *
                      </label>

                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        max={selectedFine.pending_amount}
                        value={fineActionForm.amount}
                        onChange={(event) =>
                          updateFineActionForm("amount", event.target.value)
                        }
                        className={`w-full rounded-lg border px-3 py-2.5 text-sm ${
                          fineActionErrors.amount
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />

                      {fineActionErrors.amount && (
                        <p className="mt-1 text-xs text-red-600">
                          {fineActionErrors.amount}
                        </p>
                      )}
                    </div>

                    {fineActionForm.action === "collect" && (
                      <>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase text-gray-600">
                            Payment Method *
                          </label>

                          <select
                            value={fineActionForm.payment_method}
                            onChange={(event) =>
                              updateFineActionForm(
                                "payment_method",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                          >
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Card">Card</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cheque">Cheque</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase text-gray-600">
                            Reference Number
                          </label>

                          <input
                            type="text"
                            value={fineActionForm.reference_no}
                            onChange={(event) =>
                              updateFineActionForm(
                                "reference_no",
                                event.target.value,
                              )
                            }
                            placeholder="Receipt / transaction number"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase text-gray-600">
                        {fineActionForm.action === "waive"
                          ? "Waiver Reason *"
                          : "Remarks"}
                      </label>

                      <textarea
                        rows="3"
                        value={fineActionForm.remarks}
                        onChange={(event) =>
                          updateFineActionForm("remarks", event.target.value)
                        }
                        placeholder={
                          fineActionForm.action === "waive"
                            ? "Enter reason for waiving the fine"
                            : "Optional payment remarks"
                        }
                        className={`w-full resize-none rounded-lg border px-3 py-2.5 text-sm ${
                          fineActionErrors.remarks
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />

                      {fineActionErrors.remarks && (
                        <p className="mt-1 text-xs text-red-600">
                          {fineActionErrors.remarks}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 border-t pt-4">
                      <button
                        type="button"
                        onClick={closeFineAction}
                        disabled={fineActionSaving}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={fineActionSaving}
                        className={`rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                          fineActionForm.action === "waive"
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        {fineActionSaving
                          ? "Saving..."
                          : fineActionForm.action === "waive"
                            ? "Confirm Waiver"
                            : "Collect Fine"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* FINE DETAILS MODAL */}
            {fineDetailsOpen && (
              <div
                className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    closeFineDetails();
                  }
                }}
              >
                <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Fine Details
                      </h3>

                      <p className="text-sm text-gray-500">
                        Fine summary and transaction history
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeFineDetails}
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>

                  {fineDetailsLoading ? (
                    <div className="p-16 text-center text-gray-500">
                      <i className="bi bi-arrow-repeat mr-2 inline-block animate-spin"></i>
                      Loading fine details...
                    </div>
                  ) : !fineDetails ? (
                    <div className="p-16 text-center text-gray-500">
                      Fine details unavailable.
                    </div>
                  ) : (
                    <div className="space-y-6 p-5">
                      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-5 text-white">
                        <h3 className="text-xl font-semibold">
                          {fineDetails.fine.member_name}
                        </h3>

                        <p className="mt-1 text-sm text-indigo-100">
                          {fineDetails.fine.fine_code}
                          {" • "}
                          {fineDetails.fine.book_title}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                        {[
                          [
                            "Total Fine",
                            `₹${Number(
                              fineDetails.fine.fine_amount || 0,
                            ).toFixed(2)}`,
                          ],
                          [
                            "Collected",
                            `₹${Number(
                              fineDetails.fine.collected_amount || 0,
                            ).toFixed(2)}`,
                          ],
                          [
                            "Waived",
                            `₹${Number(
                              fineDetails.fine.waived_amount || 0,
                            ).toFixed(2)}`,
                          ],
                          [
                            "Pending",
                            `₹${Number(
                              fineDetails.fine.pending_amount || 0,
                            ).toFixed(2)}`,
                          ],
                          ["Status", fineDetails.fine.status],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-xl border bg-gray-50 p-3"
                          >
                            <p className="text-xs uppercase text-gray-500">
                              {label}
                            </p>

                            <p className="mt-1 text-lg font-bold text-gray-900">
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                          ["Member ID", fineDetails.fine.member_code],
                          ["Member Type", fineDetails.fine.member_type],
                          ["Class / Department", fineDetails.fine.member_group],
                          ["Issue ID", fineDetails.fine.issue_code],
                          ["Book Code", fineDetails.fine.book_code],
                          ["ISBN", fineDetails.fine.isbn],
                          ["Issue Date", fineDetails.fine.issue_date],
                          ["Due Date", fineDetails.fine.due_date],
                          ["Return Date", fineDetails.fine.return_date],
                          ["Days Late", fineDetails.fine.overdue_days],
                          [
                            "Fine Per Day",
                            `₹${Number(
                              fineDetails.fine.fine_per_day || 0,
                            ).toFixed(2)}`,
                          ],
                          [
                            "Book Returned",
                            fineDetails.fine.book_returned ? "Yes" : "No",
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-xl border bg-gray-50 p-3"
                          >
                            <p className="text-xs font-medium uppercase text-gray-500">
                              {label}
                            </p>

                            <p className="mt-1 break-words text-sm font-medium text-gray-800">
                              {value !== null &&
                              value !== undefined &&
                              value !== ""
                                ? value
                                : "—"}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div>
                        <h4 className="mb-3 text-base font-semibold text-gray-900">
                          Payment & Waiver History
                        </h4>

                        <div className="overflow-x-auto rounded-xl border">
                          <table className="min-w-[850px] w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                              <tr>
                                <th className="p-3 text-left">Date</th>
                                <th className="p-3 text-right">Amount</th>
                                <th className="p-3 text-left">Method</th>
                                <th className="p-3 text-left">Reference</th>
                                <th className="p-3 text-left">Remarks</th>
                                <th className="p-3 text-center">Status</th>
                              </tr>
                            </thead>

                            <tbody className="divide-y">
                              {!fineDetails.payments?.length ? (
                                <tr>
                                  <td
                                    colSpan="6"
                                    className="p-8 text-center text-gray-500"
                                  >
                                    No payment or waiver history.
                                  </td>
                                </tr>
                              ) : (
                                fineDetails.payments.map((payment) => (
                                  <tr key={payment.id}>
                                    <td className="p-3">
                                      {payment.collected_at
                                        ? new Date(
                                            payment.collected_at,
                                          ).toLocaleString()
                                        : "—"}
                                    </td>

                                    <td className="p-3 text-right font-semibold">
                                      ₹{Number(payment.amount || 0).toFixed(2)}
                                    </td>

                                    <td className="p-3">
                                      {payment.payment_method || "—"}
                                    </td>

                                    <td className="p-3">
                                      {payment.reference_no || "—"}
                                    </td>

                                    <td className="p-3">
                                      {payment.remarks || "—"}
                                    </td>

                                    <td className="p-3 text-center">
                                      <span
                                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                                          payment.status === "Collected"
                                            ? "bg-green-100 text-green-700"
                                            : payment.status === "Waived"
                                              ? "bg-purple-100 text-purple-700"
                                              : "bg-gray-100 text-gray-700"
                                        }`}
                                      >
                                        {payment.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 border-t pt-4">
                        {Number(fineDetails.fine.pending_amount || 0) > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                closeFineDetails();

                                openFineAction(fineDetails.fine, "waive");
                              }}
                              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700"
                            >
                              Waive Fine
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                closeFineDetails();

                                openFineAction(fineDetails.fine, "collect");
                              }}
                              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white"
                            >
                              Collect Fine
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={closeFineDetails}
                          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================= LIBRARY TRANSACTIONS ================= */}
        {activeSection === "transactions" && (
          <section className="section active space-y-6 p-4 sm:p-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    Library Transactions
                  </h2>

                  <p className="mt-1 text-sm text-blue-100">
                    Track fine collections, waivers, refunds and payment history
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={exportTransactionReport}
                    disabled={
                      transactionsExporting ||
                      transactionsLoading ||
                      transactionStats.total_transactions === 0
                    }
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {transactionsExporting ? (
                      <>
                        <i className="bi bi-arrow-repeat mr-2 inline-block animate-spin"></i>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-file-earmark-spreadsheet mr-2"></i>
                        Export Filtered Report
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      loadTransactions({
                        page: transactionPagination.page,
                        perPage: transactionPagination.per_page,
                        filters: transactionFilters,
                        silent: true,
                      })
                    }
                    disabled={transactionsLoading}
                    className="rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/25 disabled:opacity-50"
                  >
                    <i
                      className={`bi bi-arrow-clockwise mr-2 ${
                        transactionsLoading ? "inline-block animate-spin" : ""
                      }`}
                    ></i>
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
              {[
                [
                  "Total Transactions",
                  transactionStats.total_transactions,
                  "bi-receipt",
                  "bg-gray-100 text-gray-700",
                ],
                [
                  "Gross Collection",
                  `₹${Number(transactionStats.total_collected || 0).toFixed(
                    2,
                  )}`,
                  "bi-cash-stack",
                  "bg-green-100 text-green-700",
                ],
                [
                  "Net Collection",
                  `₹${Number(transactionStats.net_collection || 0).toFixed(2)}`,
                  "bi-graph-up-arrow",
                  "bg-blue-100 text-blue-700",
                ],
                [
                  "Pending Fines",
                  `₹${Number(transactionStats.pending_fine || 0).toFixed(2)}`,
                  "bi-hourglass-split",
                  "bg-amber-100 text-amber-700",
                ],
                [
                  "Waived",
                  `₹${Number(transactionStats.total_waived || 0).toFixed(2)}`,
                  "bi-slash-circle",
                  "bg-purple-100 text-purple-700",
                ],
                [
                  "Refunded",
                  `₹${Number(transactionStats.total_refunded || 0).toFixed(2)}`,
                  "bi-arrow-counterclockwise",
                  "bg-red-100 text-red-700",
                ],
              ].map(([label, value, icon, iconClass]) => (
                <div
                  key={label}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        {label}
                      </p>

                      <p className="mt-2 text-xl font-bold text-gray-900">
                        {value || 0}
                      </p>
                    </div>

                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
                    >
                      <i className={`bi ${icon}`}></i>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* FILTERS */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-8">
                <input
                  type="search"
                  value={transactionFilters.search}
                  onChange={(event) =>
                    updateTransactionFilter("search", event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applyTransactionFilters();
                    }
                  }}
                  placeholder="Transaction ID, member, book, reference..."
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm xl:col-span-2"
                />

                <select
                  value={transactionFilters.member_type}
                  onChange={(event) =>
                    updateTransactionFilter("member_type", event.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">All Member Types</option>

                  <option value="student">Students</option>

                  <option value="teacher">Teachers</option>

                  <option value="staff">Non-Teaching Staff</option>
                </select>

                <select
                  value={transactionFilters.status}
                  onChange={(event) =>
                    updateTransactionFilter("status", event.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">All Status</option>

                  <option value="Paid">Paid</option>

                  <option value="Waived">Waived</option>

                  <option value="Refunded">Refunded</option>
                </select>

                <select
                  value={transactionFilters.payment_method}
                  onChange={(event) =>
                    updateTransactionFilter(
                      "payment_method",
                      event.target.value,
                    )
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">All Payment Methods</option>

                  <option value="Cash">Cash</option>

                  <option value="UPI">UPI</option>

                  <option value="Card">Card</option>

                  <option value="Bank Transfer">Bank Transfer</option>

                  <option value="Cheque">Cheque</option>

                  <option value="Waiver">Waiver</option>
                </select>

                <input
                  type="date"
                  value={transactionFilters.date_from}
                  onChange={(event) =>
                    updateTransactionFilter("date_from", event.target.value)
                  }
                  title="Transaction date from"
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />

                <input
                  type="date"
                  min={transactionFilters.date_from || undefined}
                  value={transactionFilters.date_to}
                  onChange={(event) =>
                    updateTransactionFilter("date_to", event.target.value)
                  }
                  title="Transaction date to"
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyTransactionFilters}
                    disabled={transactionsLoading}
                    className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Filter
                  </button>

                  <button
                    type="button"
                    onClick={resetTransactionFilters}
                    disabled={transactionsLoading}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* TRANSACTION TABLE */}
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Transaction History
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  Latest payment, waiver and refund transactions are displayed
                  first.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1350px] w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="p-3 text-left">Transaction ID</th>

                      <th className="p-3 text-left">Member</th>

                      <th className="p-3 text-left">Role</th>

                      <th className="p-3 text-left">Book / Issue</th>

                      <th className="p-3 text-right">Amount</th>

                      <th className="p-3 text-left">Method</th>

                      <th className="p-3 text-left">Reference</th>

                      <th className="p-3 text-left">Date</th>

                      <th className="p-3 text-center">Status</th>

                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {transactionsLoading ? (
                      <tr>
                        <td
                          colSpan="10"
                          className="p-12 text-center text-gray-500"
                        >
                          <i className="bi bi-arrow-repeat mr-2 inline-block animate-spin"></i>
                          Loading transactions...
                        </td>
                      </tr>
                    ) : transactionRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan="10"
                          className="p-12 text-center text-gray-500"
                        >
                          No transaction records found.
                        </td>
                      </tr>
                    ) : (
                      transactionRows.map((transaction) => {
                        const roleClass =
                          transaction.member_type === "student"
                            ? "bg-blue-100 text-blue-700"
                            : transaction.member_type === "teacher"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-cyan-100 text-cyan-700";

                        const statusClass =
                          transaction.status === "Paid"
                            ? "bg-green-100 text-green-700"
                            : transaction.status === "Waived"
                              ? "bg-purple-100 text-purple-700"
                              : transaction.status === "Refunded"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700";

                        return (
                          <tr key={transaction.id} className="hover:bg-gray-50">
                            <td className="p-3 font-semibold text-gray-700">
                              {transaction.transaction_code}
                            </td>

                            <td className="p-3">
                              <p className="font-semibold text-gray-900">
                                {transaction.member_name}
                              </p>

                              <p className="text-xs text-gray-500">
                                {transaction.member_code}

                                {transaction.member_group
                                  ? ` • ${transaction.member_group}`
                                  : ""}
                              </p>
                            </td>

                            <td className="p-3">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleClass}`}
                              >
                                {transaction.member_type === "staff"
                                  ? "Non-Teaching Staff"
                                  : transaction.member_type
                                      ?.charAt(0)
                                      .toUpperCase() +
                                    transaction.member_type?.slice(1)}
                              </span>
                            </td>

                            <td className="p-3">
                              <p className="font-medium text-gray-900">
                                {transaction.book_title}
                              </p>

                              <p className="text-xs text-gray-500">
                                {transaction.issue_code || "General payment"}

                                {transaction.book_code
                                  ? ` • ${transaction.book_code}`
                                  : ""}
                              </p>
                            </td>

                            <td className="p-3 text-right text-base font-bold text-gray-900">
                              ₹{Number(transaction.amount || 0).toFixed(2)}
                            </td>

                            <td className="p-3">
                              {transaction.payment_method}
                            </td>

                            <td className="p-3">
                              {transaction.reference_no || "—"}
                            </td>

                            <td className="p-3">
                              {transaction.transaction_date
                                ? new Date(
                                    transaction.transaction_date,
                                  ).toLocaleString()
                                : "—"}
                            </td>

                            <td className="p-3 text-center">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass}`}
                              >
                                {transaction.status}
                              </span>
                            </td>

                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  openTransactionDetails(transaction)
                                }
                                className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">
                  Total {transactionPagination.total} transaction(s)
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      !transactionPagination.has_prev || transactionsLoading
                    }
                    onClick={() =>
                      changeTransactionPage(transactionPagination.page - 1)
                    }
                    className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="text-sm text-gray-600">
                    Page {transactionPagination.page} of{" "}
                    {transactionPagination.pages}
                  </span>

                  <button
                    type="button"
                    disabled={
                      !transactionPagination.has_next || transactionsLoading
                    }
                    onClick={() =>
                      changeTransactionPage(transactionPagination.page + 1)
                    }
                    className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* TRANSACTION DETAILS MODAL */}
            {transactionDetailsOpen && selectedTransaction && (
              <div
                className="fixed inset-0 z-[160] flex items-center justify-center bg-black/50 p-4"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    closeTransactionDetails();
                  }
                }}
              >
                <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Transaction Details
                      </h3>

                      <p className="text-sm text-gray-500">
                        {selectedTransaction.transaction_code}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeTransactionDetails}
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>

                  <div className="space-y-5 p-5">
                    <div
                      className={`rounded-2xl p-5 text-white ${
                        selectedTransaction.status === "Paid"
                          ? "bg-gradient-to-r from-green-600 to-emerald-600"
                          : selectedTransaction.status === "Waived"
                            ? "bg-gradient-to-r from-purple-600 to-indigo-600"
                            : "bg-gradient-to-r from-red-600 to-orange-600"
                      }`}
                    >
                      <p className="text-sm text-white/80">
                        Transaction Amount
                      </p>

                      <h3 className="mt-1 text-3xl font-bold">
                        ₹{Number(selectedTransaction.amount || 0).toFixed(2)}
                      </h3>

                      <p className="mt-2 text-sm text-white/90">
                        {selectedTransaction.member_name} •{" "}
                        {selectedTransaction.status}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        [
                          "Transaction ID",
                          selectedTransaction.transaction_code,
                        ],
                        ["Status", selectedTransaction.status],
                        ["Member Name", selectedTransaction.member_name],
                        ["Member ID", selectedTransaction.member_code],
                        [
                          "Member Type",
                          selectedTransaction.member_type === "staff"
                            ? "Non-Teaching Staff"
                            : selectedTransaction.member_type,
                        ],
                        [
                          "Class / Department",
                          selectedTransaction.member_group,
                        ],
                        ["Book", selectedTransaction.book_title],
                        ["Book Code", selectedTransaction.book_code],
                        ["Issue ID", selectedTransaction.issue_code],
                        ["ISBN", selectedTransaction.isbn],
                        ["Payment Method", selectedTransaction.payment_method],
                        ["Reference Number", selectedTransaction.reference_no],
                        [
                          "Transaction Date",
                          selectedTransaction.transaction_date
                            ? new Date(
                                selectedTransaction.transaction_date,
                              ).toLocaleString()
                            : "",
                        ],
                        ["Collected By", selectedTransaction.collected_by],
                        ["Issue Date", selectedTransaction.issue_date],
                        ["Due Date", selectedTransaction.due_date],
                        ["Return Date", selectedTransaction.return_date],
                        ["Remarks", selectedTransaction.remarks],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                        >
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            {label}
                          </p>

                          <p className="mt-1 break-words text-sm font-medium text-gray-800">
                            {value !== null &&
                            value !== undefined &&
                            value !== ""
                              ? value
                              : "—"}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end border-t pt-4">
                      <button
                        type="button"
                        onClick={closeTransactionDetails}
                        className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================= REPORTS & ANALYTICS ================= */}
        {activeSection === "reports" && (
          <section className="section active space-y-6 p-4 sm:p-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Reports & Analytics</h2>

                  <p className="mt-1 text-sm text-blue-100">
                    Analyze circulation, members, books and library fine
                    activity
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={exportReport}
                    disabled={
                      reportsExporting ||
                      reportsLoading ||
                      reportPagination.total === 0
                    }
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-green-700 disabled:opacity-50"
                  >
                    {reportsExporting ? (
                      <>
                        <i className="bi bi-arrow-repeat mr-2 inline-block animate-spin"></i>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-file-earmark-spreadsheet mr-2"></i>
                        Export Filtered Report
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      loadReports({
                        page: reportPagination.page,
                        perPage: reportPagination.per_page,
                        filters: reportFilters,
                        silent: true,
                      })
                    }
                    disabled={reportsLoading}
                    className="rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/25 disabled:opacity-50"
                  >
                    <i
                      className={`bi bi-arrow-clockwise mr-2 ${
                        reportsLoading ? "inline-block animate-spin" : ""
                      }`}
                    ></i>
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* FILTERS */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
                <input
                  type="search"
                  value={reportFilters.search}
                  onChange={(event) =>
                    updateReportFilter("search", event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applyReportFilters();
                    }
                  }}
                  placeholder="Member, book, issue ID, ISBN..."
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm xl:col-span-2"
                />

                <select
                  value={reportFilters.member_type}
                  onChange={(event) =>
                    updateReportFilter("member_type", event.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">All Members</option>

                  <option value="student">Students</option>

                  <option value="teacher">Teachers</option>

                  <option value="staff">Non-Teaching Staff</option>

                  <option value="admin">Administrators</option>
                </select>

                <select
                  value={reportFilters.status}
                  onChange={(event) =>
                    updateReportFilter("status", event.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">All Circulation Status</option>

                  <option value="Issued">Issued</option>

                  <option value="Due Soon">Due Soon</option>

                  <option value="Overdue">Overdue</option>

                  <option value="Returned">Returned</option>
                </select>

                <input
                  type="date"
                  value={reportFilters.date_from}
                  onChange={(event) =>
                    updateReportFilter("date_from", event.target.value)
                  }
                  title="Issue date from"
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />

                <input
                  type="date"
                  min={reportFilters.date_from || undefined}
                  value={reportFilters.date_to}
                  onChange={(event) =>
                    updateReportFilter("date_to", event.target.value)
                  }
                  title="Issue date to"
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyReportFilters}
                    disabled={reportsLoading}
                    className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Apply
                  </button>

                  <button
                    type="button"
                    onClick={resetReportFilters}
                    disabled={reportsLoading}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
              {[
                [
                  "Book Titles",
                  reportStats.total_titles,
                  "bi-book",
                  "bg-indigo-100 text-indigo-700",
                ],
                [
                  "Total Copies",
                  reportStats.total_copies,
                  "bi-bookshelf",
                  "bg-blue-100 text-blue-700",
                ],
                [
                  "Currently Issued",
                  reportStats.currently_issued,
                  "bi-box-arrow-up-right",
                  "bg-cyan-100 text-cyan-700",
                ],
                [
                  "Overdue",
                  reportStats.overdue_books,
                  "bi-exclamation-triangle",
                  "bg-red-100 text-red-700",
                ],
                [
                  "Fine Collected",
                  `₹${Number(reportStats.fine_collected || 0).toFixed(2)}`,
                  "bi-cash-stack",
                  "bg-green-100 text-green-700",
                ],
                [
                  "Pending Fine",
                  `₹${Number(reportStats.fine_pending || 0).toFixed(2)}`,
                  "bi-hourglass-split",
                  "bg-amber-100 text-amber-700",
                ],
              ].map(([label, value, icon, iconClass]) => (
                <div
                  key={label}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        {label}
                      </p>

                      <p className="mt-2 text-xl font-bold text-gray-900">
                        {value || 0}
                      </p>
                    </div>

                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
                    >
                      <i className={`bi ${icon}`}></i>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* SECONDARY KPIs */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Available Copies</p>

                <p className="mt-1 text-xl font-bold text-green-700">
                  {reportStats.available_copies || 0}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Returned Books</p>

                <p className="mt-1 text-xl font-bold text-blue-700">
                  {reportStats.returned_books || 0}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Active Borrowers</p>

                <p className="mt-1 text-xl font-bold text-purple-700">
                  {reportStats.active_members || 0}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Fine Waived</p>

                <p className="mt-1 text-xl font-bold text-gray-700">
                  ₹{Number(reportStats.fine_waived || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* ANALYTICS */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {/* ISSUE TREND */}
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-5">
                  <h3 className="font-semibold text-gray-900">
                    Book Issue Trend
                  </h3>

                  <p className="mt-1 text-xs text-gray-500">
                    Number of books issued by date
                  </p>
                </div>

                {reportsLoading ? (
                  <div className="flex h-64 items-center justify-center text-sm text-gray-500">
                    Loading analytics...
                  </div>
                ) : issueTrend.length === 0 ? (
                  <div className="flex h-64 items-center justify-center text-sm text-gray-500">
                    No issue data available.
                  </div>
                ) : (
                  <div className="h-64 overflow-x-auto">
                    <div className="flex h-full min-w-[650px] items-end gap-2 border-b border-l px-3 pb-7">
                      {issueTrend.map((item) => {
                        const height = Math.max(
                          (Number(item.issued || 0) / maxTrendValue) * 180,
                          4,
                        );

                        return (
                          <div
                            key={item.date}
                            className="flex min-w-[28px] flex-1 flex-col items-center justify-end"
                          >
                            <span className="mb-1 text-[10px] font-medium text-gray-500">
                              {item.issued}
                            </span>

                            <div
                              className="w-full max-w-[28px] rounded-t bg-indigo-500"
                              style={{
                                height: `${height}px`,
                              }}
                              title={`${item.date}: ${item.issued} issued`}
                            ></div>

                            <span className="mt-2 rotate-[-45deg] whitespace-nowrap text-[9px] text-gray-500">
                              {item.date.slice(5)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* MEMBER DISTRIBUTION */}
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-5">
                  <h3 className="font-semibold text-gray-900">
                    Borrower Distribution
                  </h3>

                  <p className="mt-1 text-xs text-gray-500">
                    Unique members represented in the selected report
                  </p>
                </div>

                <div className="space-y-5">
                  {memberDistribution.map((member) => {
                    const percentage =
                      maxMemberValue > 0
                        ? Math.round(
                            (Number(member.value || 0) / maxMemberValue) * 100,
                          )
                        : 0;

                    return (
                      <div key={member.key}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            {member.label}
                          </span>

                          <span className="text-sm font-bold text-gray-900">
                            {member.value}
                          </span>
                        </div>

                        <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{
                              width: `${percentage}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}

                  {memberDistribution.length === 0 && (
                    <div className="flex h-48 items-center justify-center text-sm text-gray-500">
                      No member data available.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* TOP BOOKS + CATEGORY DISTRIBUTION */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {/* TOP BOOKS */}
              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900">
                  Most Issued Books
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  Top titles for the selected filters
                </p>

                <div className="mt-4 space-y-3">
                  {topBooks.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-500">
                      No book usage data.
                    </p>
                  ) : (
                    topBooks.map((book, index) => (
                      <div
                        key={book.book_id}
                        className="flex items-center gap-3 rounded-lg border border-gray-100 p-3"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-700">
                          {index + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {book.title}
                          </p>

                          <p className="truncate text-xs text-gray-500">
                            {book.book_code}
                            {book.author ? ` • ${book.author}` : ""}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-indigo-700">
                            {book.issues}
                          </p>

                          <p className="text-[10px] text-gray-500">Issues</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* CATEGORY DISTRIBUTION */}
              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900">Book Categories</h3>

                <p className="mt-1 text-xs text-gray-500">
                  Current library collection by category
                </p>

                <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">
                  {categoryDistribution.map((category) => (
                    <div
                      key={category.name}
                      className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {category.name}
                        </p>

                        <p className="text-xs text-gray-500">
                          {category.total_copies} total copies
                        </p>
                      </div>

                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        {category.book_count} titles
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* REPORT TABLE */}
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Circulation Report
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  Detailed issue, return and overdue activity
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1300px] w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="p-3 text-left">Report ID</th>

                      <th className="p-3 text-left">Member</th>

                      <th className="p-3 text-left">Type</th>

                      <th className="p-3 text-left">Book</th>

                      <th className="p-3 text-left">Issue Date</th>

                      <th className="p-3 text-left">Due Date</th>

                      <th className="p-3 text-left">Return Date</th>

                      <th className="p-3 text-center">Late Days</th>

                      <th className="p-3 text-right">Fine</th>

                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {reportsLoading ? (
                      <tr>
                        <td
                          colSpan="10"
                          className="p-12 text-center text-gray-500"
                        >
                          <i className="bi bi-arrow-repeat mr-2 inline-block animate-spin"></i>
                          Loading report...
                        </td>
                      </tr>
                    ) : reportRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan="10"
                          className="p-12 text-center text-gray-500"
                        >
                          No report records found.
                        </td>
                      </tr>
                    ) : (
                      reportRows.map((record) => {
                        const statusClass =
                          record.status === "Returned"
                            ? "bg-green-100 text-green-700"
                            : record.status === "Overdue"
                              ? "bg-red-100 text-red-700"
                              : record.status === "Due Soon"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700";

                        return (
                          <tr
                            key={`${record.member_type}-${record.id}`}
                            className="hover:bg-gray-50"
                          >
                            <td className="p-3 font-medium">
                              {record.report_id}
                            </td>

                            <td className="p-3">
                              <p className="font-semibold text-gray-900">
                                {record.member_name}
                              </p>

                              <p className="text-xs text-gray-500">
                                {record.member_code}

                                {record.member_group
                                  ? ` • ${record.member_group}`
                                  : ""}
                              </p>
                            </td>

                            <td className="p-3 capitalize">
                              {record.member_type === "staff"
                                ? "Non-Teaching Staff"
                                : record.member_type}
                            </td>

                            <td className="p-3">
                              <p className="font-medium text-gray-900">
                                {record.book_title}
                              </p>

                              <p className="text-xs text-gray-500">
                                {record.book_code}

                                {record.author ? ` • ${record.author}` : ""}
                              </p>
                            </td>

                            <td className="p-3">{record.issue_date || "—"}</td>

                            <td className="p-3">{record.due_date || "—"}</td>

                            <td className="p-3">{record.return_date || "—"}</td>

                            <td className="p-3 text-center">
                              <span
                                className={
                                  Number(record.overdue_days || 0) > 0
                                    ? "font-bold text-red-600"
                                    : "text-gray-500"
                                }
                              >
                                {record.overdue_days || 0}
                              </span>
                            </td>

                            <td className="p-3 text-right font-semibold">
                              ₹{Number(record.fine_amount || 0).toFixed(2)}
                            </td>

                            <td className="p-3 text-center">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass}`}
                              >
                                {record.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">
                  Total {reportPagination.total} record(s)
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!reportPagination.has_prev || reportsLoading}
                    onClick={() => changeReportPage(reportPagination.page - 1)}
                    className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="text-sm text-gray-600">
                    Page {reportPagination.page} of {reportPagination.pages}
                  </span>

                  <button
                    type="button"
                    disabled={!reportPagination.has_next || reportsLoading}
                    onClick={() => changeReportPage(reportPagination.page + 1)}
                    className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= LIBRARY NOTIFICATIONS ================= */}
        {activeSection === "notifications" && (
          <section className="section active space-y-6 p-4 sm:p-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Notifications</h2>

                  <p className="mt-1 text-sm text-blue-100">
                    Manage overdue reminders, fine alerts and library
                    communication
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openNotificationModal}
                    className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow hover:bg-indigo-50"
                  >
                    <i className="bi bi-plus-lg mr-2"></i>
                    Send Notification
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      loadLibraryNotifications({
                        page: libraryNotificationPagination.page,

                        perPage: libraryNotificationPagination.per_page,

                        filters: libraryNotificationFilters,

                        silent: true,
                      })
                    }
                    disabled={libraryNotificationsLoading}
                    className="rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/25 disabled:opacity-50"
                  >
                    <i
                      className={`bi bi-arrow-clockwise mr-2 ${
                        libraryNotificationsLoading
                          ? "inline-block animate-spin"
                          : ""
                      }`}
                    ></i>
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                [
                  "Total",
                  libraryNotificationStats.total,
                  "bi-bell",
                  "bg-indigo-100 text-indigo-700",
                ],

                [
                  "Sent",
                  libraryNotificationStats.sent,
                  "bi-check-circle",
                  "bg-green-100 text-green-700",
                ],

                [
                  "Pending",
                  libraryNotificationStats.pending,
                  "bi-clock",
                  "bg-amber-100 text-amber-700",
                ],

                [
                  "Failed",
                  libraryNotificationStats.failed,
                  "bi-exclamation-circle",
                  "bg-red-100 text-red-700",
                ],
              ].map(([label, value, icon, iconClass]) => (
                <div
                  key={label}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        {label}
                      </p>

                      <p className="mt-2 text-2xl font-bold text-gray-900">
                        {value || 0}
                      </p>
                    </div>

                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
                    >
                      <i className={`bi ${icon}`}></i>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* FILTERS */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
                <input
                  type="search"
                  value={libraryNotificationFilters.search}
                  onChange={(event) =>
                    updateNotificationFilter("search", event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applyNotificationFilters();
                    }
                  }}
                  placeholder="Search title, member, message..."
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm xl:col-span-2"
                />

                <select
                  value={libraryNotificationFilters.type}
                  onChange={(event) =>
                    updateNotificationFilter("type", event.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">All Types</option>

                  <option value="overdue">Overdue</option>

                  <option value="fine">Fine</option>

                  <option value="return_reminder">Return Reminder</option>

                  <option value="announcement">Announcement</option>

                  <option value="general">General</option>
                </select>

                <select
                  value={libraryNotificationFilters.status}
                  onChange={(event) =>
                    updateNotificationFilter("status", event.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">All Status</option>

                  <option value="Sent">Sent</option>

                  <option value="Pending">Pending</option>

                  <option value="Failed">Failed</option>
                </select>

                <select
                  value={libraryNotificationFilters.channel}
                  onChange={(event) =>
                    updateNotificationFilter("channel", event.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">All Channels</option>

                  <option value="App">App</option>

                  <option value="Email">Email</option>

                  <option value="SMS">SMS</option>

                  <option value="WhatsApp">WhatsApp</option>
                </select>

                <select
                  value={libraryNotificationFilters.role}
                  onChange={(event) =>
                    updateNotificationFilter("role", event.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">All Recipients</option>

                  <option value="student">Students</option>

                  <option value="teacher">Teachers</option>

                  <option value="staff">Non-Teaching Staff</option>

                  <option value="admin">Administrators</option>
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyNotificationFilters}
                    disabled={libraryNotificationsLoading}
                    className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Filter
                  </button>

                  <button
                    type="button"
                    onClick={resetNotificationFilters}
                    disabled={libraryNotificationsLoading}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* TABLE */}
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-[1350px] w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="p-3 text-left">ID</th>

                      <th className="p-3 text-left">Notification</th>

                      <th className="p-3 text-left">Type</th>

                      <th className="p-3 text-left">Recipient</th>

                      <th className="p-3 text-left">Channel</th>

                      <th className="p-3 text-left">Created</th>

                      <th className="p-3 text-center">Status</th>

                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {libraryNotificationsLoading ? (
                      <tr>
                        <td
                          colSpan="8"
                          className="p-12 text-center text-gray-500"
                        >
                          <i className="bi bi-arrow-repeat mr-2 inline-block animate-spin"></i>
                          Loading notifications...
                        </td>
                      </tr>
                    ) : libraryNotifications.length === 0 ? (
                      <tr>
                        <td
                          colSpan="8"
                          className="p-12 text-center text-gray-500"
                        >
                          No notifications found.
                        </td>
                      </tr>
                    ) : (
                      libraryNotifications.map((notification) => {
                        const statusClass =
                          notification.delivery_status === "Sent"
                            ? "bg-green-100 text-green-700"
                            : notification.delivery_status === "Pending"
                              ? "bg-amber-100 text-amber-700"
                              : notification.delivery_status === "Failed"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700";

                        const typeClass =
                          notification.type === "overdue"
                            ? "bg-red-100 text-red-700"
                            : notification.type === "fine"
                              ? "bg-amber-100 text-amber-700"
                              : notification.type === "announcement"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700";

                        return (
                          <tr
                            key={notification.id}
                            className="hover:bg-gray-50"
                          >
                            <td className="p-3 font-medium text-gray-700">
                              N{String(notification.id).padStart(5, "0")}
                            </td>

                            <td className="p-3">
                              <p className="font-semibold text-gray-900">
                                {notification.title}
                              </p>

                              <p className="mt-1 max-w-md truncate text-xs text-gray-500">
                                {notification.message}
                              </p>
                            </td>

                            <td className="p-3">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${typeClass}`}
                              >
                                {String(notification.type || "general").replace(
                                  "_",
                                  " ",
                                )}
                              </span>
                            </td>

                            <td className="p-3">
                              <p className="font-medium text-gray-800">
                                {notification.recipient_name || "All Members"}
                              </p>

                              <p className="text-xs text-gray-500">
                                {notification.recipient_code ||
                                  notification.role}
                              </p>
                            </td>

                            <td className="p-3">
                              <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                                {notification.channel}
                              </span>
                            </td>

                            <td className="p-3">
                              {notification.created_at
                                ? new Date(
                                    notification.created_at,
                                  ).toLocaleString()
                                : "—"}
                            </td>

                            <td className="p-3 text-center">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass}`}
                              >
                                {notification.delivery_status}
                              </span>
                            </td>

                            <td className="p-3">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openNotificationDetails(notification)
                                  }
                                  className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                                >
                                  View
                                </button>

                                {notification.delivery_status !== "Sent" && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      retryNotification(notification)
                                    }
                                    disabled={
                                      notificationRetryingId === notification.id
                                    }
                                    className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                                  >
                                    {notificationRetryingId === notification.id
                                      ? "Retrying..."
                                      : "Retry"}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">
                  Total {libraryNotificationPagination.total} notification(s)
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      !libraryNotificationPagination.has_prev ||
                      libraryNotificationsLoading
                    }
                    onClick={() =>
                      changeNotificationPage(
                        libraryNotificationPagination.page - 1,
                      )
                    }
                    className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="text-sm text-gray-600">
                    Page {libraryNotificationPagination.page} of{" "}
                    {libraryNotificationPagination.pages}
                  </span>

                  <button
                    type="button"
                    disabled={
                      !libraryNotificationPagination.has_next ||
                      libraryNotificationsLoading
                    }
                    onClick={() =>
                      changeNotificationPage(
                        libraryNotificationPagination.page + 1,
                      )
                    }
                    className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* SEND NOTIFICATION MODAL */}
            {notificationModalOpen && (
              <div
                className="fixed inset-0 z-[170] flex items-center justify-center bg-black/50 p-4"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    closeNotificationModal();
                  }
                }}
              >
                <form
                  onSubmit={saveNotification}
                  className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
                >
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Send Notification
                      </h3>

                      <p className="mt-1 text-xs text-gray-500">
                        Send library reminders and alerts
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeNotificationModal}
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        Recipient Type *
                      </label>

                      <select
                        value={notificationForm.role}
                        onChange={(event) =>
                          updateNotificationForm("role", event.target.value)
                        }
                        className="w-full rounded-lg border px-3 py-2.5 text-sm"
                      >
                        <option value="student">Student</option>

                        <option value="teacher">Teacher</option>

                        <option value="staff">Non-Teaching Staff</option>

                        <option value="admin">Administrator</option>

                        <option value="all">All Members</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        Notification Type *
                      </label>

                      <select
                        value={notificationForm.type}
                        onChange={(event) =>
                          updateNotificationForm("type", event.target.value)
                        }
                        className="w-full rounded-lg border px-3 py-2.5 text-sm"
                      >
                        <option value="general">General</option>

                        <option value="overdue">Overdue</option>

                        <option value="fine">Fine Reminder</option>

                        <option value="return_reminder">Return Reminder</option>

                        <option value="announcement">Announcement</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        Recipient Name
                      </label>

                      <input
                        type="text"
                        value={notificationForm.recipient_name}
                        onChange={(event) =>
                          updateNotificationForm(
                            "recipient_name",
                            event.target.value,
                          )
                        }
                        placeholder="e.g. Rahul Verma"
                        className="w-full rounded-lg border px-3 py-2.5 text-sm"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        Member ID
                      </label>

                      <input
                        type="text"
                        value={notificationForm.recipient_code}
                        onChange={(event) =>
                          updateNotificationForm(
                            "recipient_code",
                            event.target.value,
                          )
                        }
                        placeholder="Student / teacher / staff ID"
                        className="w-full rounded-lg border px-3 py-2.5 text-sm"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        Channel *
                      </label>

                      <select
                        value={notificationForm.channel}
                        onChange={(event) =>
                          updateNotificationForm("channel", event.target.value)
                        }
                        className="w-full rounded-lg border px-3 py-2.5 text-sm"
                      >
                        <option value="App">App Notification</option>

                        <option value="Email">Email</option>

                        <option value="SMS">SMS</option>

                        <option value="WhatsApp">WhatsApp</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        Schedule
                      </label>

                      <input
                        type="datetime-local"
                        value={notificationForm.scheduled_at}
                        onChange={(event) =>
                          updateNotificationForm(
                            "scheduled_at",
                            event.target.value,
                          )
                        }
                        className="w-full rounded-lg border px-3 py-2.5 text-sm"
                      />
                    </div>

                    {notificationForm.channel === "Email" && (
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-semibold text-gray-600">
                          Recipient Email
                        </label>

                        <input
                          type="email"
                          value={notificationForm.recipient_email}
                          onChange={(event) =>
                            updateNotificationForm(
                              "recipient_email",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-lg border px-3 py-2.5 text-sm"
                        />
                      </div>
                    )}

                    {["SMS", "WhatsApp"].includes(notificationForm.channel) && (
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-semibold text-gray-600">
                          Mobile Number
                        </label>

                        <input
                          type="tel"
                          value={notificationForm.recipient_mobile}
                          onChange={(event) =>
                            updateNotificationForm(
                              "recipient_mobile",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-lg border px-3 py-2.5 text-sm"
                        />
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        Title *
                      </label>

                      <input
                        type="text"
                        maxLength="255"
                        value={notificationForm.title}
                        onChange={(event) =>
                          updateNotificationForm("title", event.target.value)
                        }
                        placeholder="Notification title"
                        className={`w-full rounded-lg border px-3 py-2.5 text-sm ${
                          notificationFormErrors.title ? "border-red-500" : ""
                        }`}
                      />

                      {notificationFormErrors.title && (
                        <p className="mt-1 text-xs text-red-600">
                          {notificationFormErrors.title}
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        Message *
                      </label>

                      <textarea
                        rows="5"
                        value={notificationForm.message}
                        onChange={(event) =>
                          updateNotificationForm("message", event.target.value)
                        }
                        placeholder="Enter notification message..."
                        className={`w-full resize-none rounded-lg border px-3 py-2.5 text-sm ${
                          notificationFormErrors.message ? "border-red-500" : ""
                        }`}
                      ></textarea>

                      <div className="mt-1 flex justify-between text-xs text-gray-400">
                        <span>Use clear and concise communication.</span>

                        <span>{notificationForm.message.length} chars</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 border-t px-5 py-4">
                    <button
                      type="button"
                      onClick={closeNotificationModal}
                      disabled={notificationSaving}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={notificationSaving}
                      className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {notificationSaving ? "Sending..." : "Send Notification"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* DETAIL MODAL */}
            {notificationDetailsOpen && selectedLibraryNotification && (
              <div
                className="fixed inset-0 z-[170] flex items-center justify-center bg-black/50 p-4"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    closeNotificationDetails();
                  }
                }}
              >
                <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b px-5 py-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        Notification Details
                      </h3>

                      <p className="text-xs text-gray-500">
                        N
                        {String(selectedLibraryNotification.id).padStart(
                          5,
                          "0",
                        )}
                      </p>
                    </div>

                    <button type="button" onClick={closeNotificationDetails}>
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>

                  <div className="space-y-5 p-5">
                    <div className="rounded-xl bg-indigo-50 p-4">
                      <h4 className="font-semibold text-indigo-900">
                        {selectedLibraryNotification.title}
                      </h4>

                      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                        {selectedLibraryNotification.message}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        [
                          "Recipient",
                          selectedLibraryNotification.recipient_name,
                        ],

                        [
                          "Member ID",
                          selectedLibraryNotification.recipient_code,
                        ],

                        ["Role", selectedLibraryNotification.role],

                        ["Type", selectedLibraryNotification.type],

                        ["Channel", selectedLibraryNotification.channel],

                        ["Status", selectedLibraryNotification.delivery_status],

                        ["Retries", selectedLibraryNotification.retry_count],

                        ["Sent At", selectedLibraryNotification.sent_at],

                        [
                          "Scheduled At",
                          selectedLibraryNotification.scheduled_at,
                        ],

                        ["Email", selectedLibraryNotification.recipient_email],

                        [
                          "Mobile",
                          selectedLibraryNotification.recipient_mobile,
                        ],

                        [
                          "Failure Reason",
                          selectedLibraryNotification.failure_reason,
                        ],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-xl border bg-gray-50 p-3"
                        >
                          <p className="text-xs uppercase text-gray-500">
                            {label}
                          </p>

                          <p className="mt-1 break-words text-sm font-medium text-gray-800">
                            {value || "—"}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end gap-3 border-t pt-4">
                      {selectedLibraryNotification.delivery_status !==
                        "Sent" && (
                        <button
                          type="button"
                          onClick={() =>
                            retryNotification(selectedLibraryNotification)
                          }
                          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
                        >
                          Retry Notification
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={closeNotificationDetails}
                        className="rounded-lg border px-4 py-2 text-sm"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ===================== PROFILE SECTION START ========================*/}
        {activeSection === "profile" && (
          <section className="space-y-6 py-2 text-gray-800 dark:text-gray-100">
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
                        className="mt-1 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
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
                        className="mt-1 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
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
                        className="mt-1 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
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
                        className="mt-1 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      />
                    ) : (
                      <span className="font-medium">{admin?.email}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* ROLE & ACCESS */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md min-w-0 overflow-hidden">
                <h4 className="font-semibold mb-3">🛡️ Role & Access</h4>

                <div className="space-y-3 text-sm min-w-0">
                  <p>
                    Role:{" "}
                    <span className="font-medium">
                      {admin?.designation || "NA"}
                    </span>
                  </p>

                  <div className="min-w-0">
                    <p className="mb-2">Permissions:</p>

                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                      {(admin?.allowed_modules || admin?.permissions || "")
                        ?.toString()
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean)
                        .map((permission) => (
                          <span
                            key={permission}
                            className="inline-flex max-w-full rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 break-all"
                          >
                            {permission}
                          </span>
                        ))}
                    </div>
                  </div>

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
                          className="mt-1 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
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
                        className="mt-1 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
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
                        className="mt-1 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
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
                        className="mt-1 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
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
                        className="mt-1 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
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
            <div className="sticky bottom-3 z-30 flex flex-col-reverse gap-3 rounded-2xl border border-gray-200/80 bg-white/90 p-3 shadow-xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-800/90 sm:flex-row sm:justify-end">
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
          <div
            className="fixed inset-0 z-[200] flex items-end justify-center overflow-y-auto bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !passwordLoading) {
                setPasswordModalOpen(false);
              }
            }}
          >
            <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-gray-100 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-800 sm:max-w-md sm:rounded-2xl sm:p-6">
              {/* HEADER */}
              <h2
                id="change-password-title"
                className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100"
              >
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
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  disabled={passwordLoading}
                  className="rounded-xl bg-gray-200 px-4 py-2 text-sm transition hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600
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
