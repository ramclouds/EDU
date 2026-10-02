import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  APP_NAME,
  APP_YEAR,
  BASE_URL,
  FILE_BASE_URL,
} from "../config/appConfig";
import "../css/dashboard.css";
import SettingsPanel from "../components/SettingsPanel";
import { useDashboardUI } from "../controllers/useDashboardUI";
import { useAdminDashboard } from "../controllers/AdminSide/adminDashboard";
import { useAdminProfile } from "../controllers/AdminSide/useAdminProfile";
import { useAccountsPermission } from "../controllers/Accounts/useAccountsPermission";
import { useAccountsStudents } from "../controllers/Accounts/useAccountsStudents";
import {
  useAccountsStaff,
  STAFF_CATEGORY_TABS,
} from "../controllers/Accounts/useAccountsStaff";
import { useStudentFeeDetails } from "../controllers/Accounts/useStudentFeeDetails";
import { useStaffSalaryDetails } from "../controllers/Accounts/useStaffSalaryDetails";
import { useFeeCollection } from "../controllers/Accounts/useFeeCollection";
import { useFeeStructures } from "../controllers/Accounts/useFeeStructures";
import { usePendingFees } from "../controllers/Accounts/usePendingFees";
import { useFeeReports } from "../controllers/Accounts/useFeeReports";
import { useExpenses } from "../controllers/Accounts/useExpenses";
import { useExpenseCategories } from "../controllers/Accounts/useExpenseCategories";
import {
  useSalaryManagement,
  SALARY_CATEGORY_TABS,
} from "../controllers/Accounts/useSalaryManagement";
import { usePayslips } from "../controllers/Accounts/usePayslips";
import { useIncome } from "../controllers/Accounts/useIncome";
import { useTransactions } from "../controllers/Accounts/useTransactions";
import { useBankAccounts } from "../controllers/Accounts/useBankAccounts";
import { useFinancialOverview } from "../controllers/Accounts/useFinancialOverview";
import { useProfitLoss } from "../controllers/Accounts/useProfitLoss";
import { useAccountsNotifications } from "../controllers/Accounts/useAccountsNotifications";
import { useAccountsActivityLogs } from "../controllers/Accounts/useAccountsActivityLogs";

function AdminDashboard() {
  // UI STATE (LOCAL COMPONENT STATE)
  const location = useLocation();

  const [activeSection, setActiveSection] = useState(
    location.state?.activeSection || "dashboard",
  );
  const [noticeTab, setNoticeTab] = useState("announcements");
  const [search, setSearch] = useState("");

  const { canViewAccounts, canWriteAccounts, AccountsAccessLevel } =
    useAccountsPermission();

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

    toast,
  } = useAdminDashboard(activeSection);

  // ================= STUDENTS SECTION HOOK =================
  const {
    students,
    stats: studentStats,
    loading: studentsLoading,
    filters: studentFilters,
    updateFilter: updateStudentFilter,
    applyFilters: applyStudentFilters,
    resetFilters: resetStudentFilters,
    reloadStudents,
    displayName: studentDisplayName,
  } = useAccountsStudents({ fetchWithAuth, showToast });

  // ================= STAFF SECTION HOOK =================
  const {
    staff,
    stats: staffStats,
    loading: staffLoading,
    filters: staffFilters,
    updateFilter: updateStaffFilter,
    setCategory: setStaffCategory,
    applyFilters: applyStaffFilters,
    resetFilters: resetStaffFilters,
    reloadStaff,
  } = useAccountsStaff({ fetchWithAuth, showToast });

  // ================= STUDENT FEE DETAILS MODAL HOOK =================
  const {
    open: feeModalOpen,
    loading: feeModalLoading,
    saving: feeModalSaving,
    student: feeModalStudent,
    summary: feeModalSummary,
    installments: feeModalInstallments,
    payments: feeModalPayments,
    load: loadStudentFeeDetails,
    close: closeStudentFeeDetails,
    addInstallment: addFeeInstallment,
    recordPayment: recordFeePayment,
    showInstallmentForm,
    setShowInstallmentForm,
    installmentForm,
    updateInstallmentForm,
    submitInstallment,
    payingInstallmentId,
    paymentForm,
    updatePaymentForm,
    togglePayment,
    submitPayment,
  } = useStudentFeeDetails({ fetchWithAuth, showToast });

  // ================= STAFF SALARY DETAILS MODAL HOOK =================
  const {
    open: salaryModalOpen,
    loading: salaryModalLoading,
    saving: salaryModalSaving,
    staffMember: salaryModalStaff,
    salaryStructure: salaryModalStructure,
    payslips: salaryModalPayslips,
    summary: salaryModalSummary,
    load: loadStaffSalaryDetails,
    close: closeStaffSalaryDetails,
    saveSalaryStructure,
    generatePayslip,
    markPayslipPaid,
    showSalaryForm,
    setShowSalaryForm,
    salaryForm,
    updateSalaryForm,
    openSalaryEditForm,
    submitSalaryStructure,
    showPayslipForm,
    setShowPayslipForm,
    payslipForm,
    updatePayslipForm,
    submitPayslip,
  } = useStaffSalaryDetails({ fetchWithAuth, showToast });

  // ================= FEE COLLECTION SECTION HOOK =================
  const {
    summary: collectionSummary,
    recentPayments,
    loading: collectionLoading,
    searchTerm: collectionSearchTerm,
    searchResults: collectionSearchResults,
    searching: collectionSearching,
    searchStudents: searchCollectionStudents,
    clearSearch: clearCollectionSearch,
  } = useFeeCollection({ fetchWithAuth, showToast });

  // ================= FEE STRUCTURE SECTION HOOK =================
  const {
    structures: feeStructures,
    batches: feeStructureBatches,
    loading: feeStructuresLoading,
    saving: feeStructureSaving,
    applyingId: feeStructureApplyingId,
    createStructure,
    deleteStructure,
    applyStructure,
    showStructureForm,
    setShowStructureForm,
    structureForm,
    updateStructureForm,
    submitStructure,
  } = useFeeStructures({ fetchWithAuth, showToast });

  // ================= PENDING FEES SECTION HOOK =================
  const {
    pendingFees,
    summary: pendingFeesSummary,
    loading: pendingFeesLoading,
    filters: pendingFeesFilters,
    updateFilter: updatePendingFeesFilter,
    applyFilters: applyPendingFeesFilters,
    resetFilters: resetPendingFeesFilters,
    sendReminders: sendFeeReminders,
    sendingReminders: sendingFeeReminders,
  } = usePendingFees({ fetchWithAuth, showToast });

  // ================= FEE REPORTS SECTION HOOK =================
  const {
    summary: reportsSummary,
    monthlyTrend,
    categoryBreakdown,
    paymentModeBreakdown,
    batchBreakdown,
    topDefaulters,
    loading: reportsLoading,
    academicYear: reportsAcademicYear,
    applyAcademicYear,
  } = useFeeReports({ fetchWithAuth, showToast });

  // ================= EXPENSES SECTION HOOK =================
  const {
    expenses,
    summary: expensesSummary,
    loading: expensesLoading,
    saving: expenseSaving,
    filters: expenseFilters,
    updateFilter: updateExpenseFilter,
    applyFilters: applyExpenseFilters,
    addExpense,
    deleteExpense,
    showExpenseForm,
    setShowExpenseForm,
    expenseForm,
    updateExpenseForm,
    submitExpense,
  } = useExpenses({ fetchWithAuth, showToast });

  // ================= EXPENSE CATEGORIES SECTION HOOK =================
  const {
    categories: expenseCategories,
    loading: expenseCategoriesLoading,
    saving: expenseCategorySaving,
    createCategory,
    updateCategory: updateExpenseCategory,
    deleteCategory: deleteExpenseCategory,
    showCategoryForm,
    setShowCategoryForm,
    categoryForm,
    updateCategoryForm,
    submitCategory,
  } = useExpenseCategories({ fetchWithAuth, showToast });

  // ================= SALARY MANAGEMENT SECTION HOOK =================
  const {
    staff: salaryRoster,
    stats: salaryRosterStats,
    loading: salaryRosterLoading,
    filters: salaryRosterFilters,
    updateFilter: updateSalaryRosterFilter,
    setCategory: setSalaryRosterCategory,
    setSetupFilter: setSalaryRosterSetupFilter,
    applyFilters: applySalaryRosterFilters,
  } = useSalaryManagement({ fetchWithAuth, showToast });

  // ================= PAYSLIPS SECTION HOOK =================
  const {
    payslips: allPayslips,
    summary: payslipsSummary,
    loading: payslipsLoading,
    runningPayroll,
    filters: payslipFilters,
    updateFilter: updatePayslipFilter,
    applyFilters: applyPayslipFilters,
    runPayroll,
    reload: reloadAllPayslips,
  } = usePayslips({ fetchWithAuth, showToast });

  // ================= INCOME SECTION HOOK =================
  const {
    incomes,
    summary: incomeSummary,
    loading: incomeLoading,
    saving: incomeSaving,
    filters: incomeFilters,
    updateFilter: updateIncomeFilter,
    applyFilters: applyIncomeFilters,
    deleteIncome,
    showIncomeForm,
    setShowIncomeForm,
    incomeForm,
    updateIncomeForm,
    submitIncome,
  } = useIncome({ fetchWithAuth, showToast });

  // ================= TRANSACTIONS SECTION HOOK =================
  const {
    transactions,
    summary: transactionsSummary,
    loading: transactionsLoading,
    deleting: transactionDeleting,
    filters: transactionFilters,
    updateFilter: updateTransactionFilter,
    applyFilters: applyTransactionFilters,
    resetFilters: resetTransactionFilters,
    deleteTransaction,
  } = useTransactions({ fetchWithAuth, showToast });

  // ================= BANK ACCOUNTS SECTION HOOK =================
  const {
    accounts: bankAccounts,
    summary: bankAccountsSummary,
    loading: bankAccountsLoading,
    saving: bankAccountSaving,
    updateAccount: updateBankAccount,
    deleteAccount: deleteBankAccount,
    showAccountForm,
    setShowAccountForm,
    accountForm,
    updateAccountForm,
    submitAccount,
  } = useBankAccounts({ fetchWithAuth, showToast });

  // ================= FINANCIAL REPORTS SECTION HOOK =================
  const {
    summary: financialSummary,
    trend: financialTrend,
    loading: financialLoading,
    month: financialMonth,
    setMonth: setFinancialMonth,
    year: financialYear,
    setYear: setFinancialYear,
    applyPeriod: applyFinancialPeriod,
  } = useFinancialOverview({ fetchWithAuth, showToast });

  // ================= PROFIT & LOSS SECTION HOOK =================
  const {
    statement: plStatement,
    previousPeriod: plPreviousPeriod,
    periodLabel: plPeriodLabel,
    loading: plLoading,
    month: plMonth,
    setMonth: setPlMonth,
    year: plYear,
    setYear: setPlYear,
    applyPeriod: applyPlPeriod,
  } = useProfitLoss({ fetchWithAuth, showToast });

  // ================= NOTIFICATIONS SECTION HOOK =================
  const {
    modalOpen: notifModalOpen,
    openModal: openNotifModal,
    closeModal: closeNotifModal,
    form: notifForm,
    updateForm: updateNotifForm,
    saving: notifSaving,
    error: notifError,
    submit: submitNotification,
    audienceOptions: notifAudienceOptions,
    categoryOptions: notifCategoryOptions,
    filterTab: notifFilterTab,
    setFilterTab: setNotifFilterTab,
    search: notifSearch,
    setSearch: setNotifSearch,
  } = useAccountsNotifications({ fetchWithAuth, showToast });

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

    isAccountsAdmin,
    isSuperAdmin,
  } = useAdminProfile({ fetchWithAuth, showToast });

  // ================= ACTIVITY LOGS SECTION HOOK (Super Admin only) =================
  const {
    logs: activityLogs,
    summary: activityLogsSummary,
    accountsAdmins: activityLogsAdmins,
    loading: activityLogsLoading,
    filters: activityLogsFilters,
    updateFilter: updateActivityLogsFilter,
    applyFilters: applyActivityLogsFilters,
    resetFilters: resetActivityLogsFilters,
  } = useAccountsActivityLogs({ fetchWithAuth, showToast, enabled: isSuperAdmin });

  useEffect(() => {
    if (!admin?.id) return;

    if (!isSuperAdmin && !isAccountsAdmin) {
      showToast("You do not have access to the Accounts Dashboard", "error");
      navigate("/super-admin-dashboard", { replace: true });
    }
  }, [admin?.id, isSuperAdmin, isAccountsAdmin, navigate, showToast]);

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
            className="bi bi-calculator text-purple-600 text-xl"
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
        {/* ========================= ACCOUNTS ADMIN SIDEBAR NAV ========================= */}
        <nav className="h-full overflow-y-auto no-scrollbar scroll-smooth px-4 py-4 space-y-2 text-sm">
          {[
            // =========================================================
            // MAIN
            // =========================================================
            {
              title: "MAIN",
              items: [["dashboard", "bi-grid", "Dashboard"]],
            },

            // =========================================================
            // USERS
            // =========================================================
            {
              title: "USERS",
              items: [
                ["students", "bi-mortarboard", "Students"],
                ["staff", "bi-people", "Staff Management"],
              ],
            },

            // =========================================================
            // FEE MANAGEMENT
            // =========================================================
            {
              title: "FEE MANAGEMENT",
              items: [
                ["fee-collection", "bi-cash-coin", "Fee Collection"],
                ["fee-structure", "bi-diagram-3", "Fee Structure"],
                ["pending-fees", "bi-exclamation-circle", "Pending Fees"],
                ["fee-reports", "bi-bar-chart-line", "Fee Reports"],
              ],
            },

            // =========================================================
            // EXPENSES & PAYROLL
            // =========================================================
            {
              title: "EXPENSES & PAYROLL",
              items: [
                ["expense-list", "bi-list-check", "Expenses"],
                ["expense-categories", "bi-tags", "Expense Categories"],
                ["salary-management", "bi-wallet2", "Salary Management"],
                ["payslips", "bi-receipt-cutoff", "Payslips"],
              ],
            },

            // =========================================================
            // ACCOUNTS & BANKING
            // =========================================================
            {
              title: "ACCOUNTS & BANKING",
              items: [
                ["income", "bi-graph-up-arrow", "Income"],
                ["transactions", "bi-arrow-left-right", "Transactions"],
                ["bank-accounts", "bi-bank", "Bank Accounts"],
              ],
            },

            // =========================================================
            // REPORTS & COMMUNICATION
            // =========================================================
            {
              title: "REPORTS & COMMUNICATION",
              items: [
                ["financial-reports", "bi-pie-chart", "Financial Reports"],
                ["profit-loss", "bi-graph-down", "Profit & Loss"],
                ["notifications", "bi-bell", "Notifications"],
              ],
            },

            // =========================================================
            // SYSTEM
            // =========================================================
            {
              title: "SYSTEM",
              items: [
                ["settings", "bi-gear", "Settings"],
                // Activity Logs is Super Admin oversight of what the
                // Accounts Admin has done - an Accounts Admin must
                // never even see this exists, let alone open it, so
                // it's left out of the array entirely rather than
                // shown-but-blocked.
                ...(isSuperAdmin
                  ? [["logs", "bi-shield-check", "Activity Logs"]]
                  : []),
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
          {!canWriteAccounts && (
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
                        <p className="font-bold text-gray-800 dark:text-white">
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
            <div className="rounded-3xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 p-6 text-white shadow-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-purple-100">
                    Finance Administration
                  </p>

                  <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                    Accounts Admin Dashboard
                  </h1>

                  <p className="mt-2 text-sm text-purple-100">
                    Manage student fees, expenses, payroll, transactions and
                    financial reporting.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                  <p className="text-xs text-purple-100">Signed in as</p>

                  <p className="font-semibold">
                    {admin?.first_name || "Accounts"}{" "}
                    {admin?.last_name || "Administrator"}
                  </p>

                  <p className="mt-1 text-xs text-purple-100">
                    {isSuperAdmin ? "Super Admin Access" : "Accounts Admin"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Fee Collection (This Month)",
                  value: `₹${collectionSummary.collected_this_month}`,
                  icon: "bi-cash-coin",
                },
                {
                  label: "Pending Fees",
                  value: `₹${pendingFeesSummary.total_pending_amount}`,
                  icon: "bi-exclamation-circle",
                },
                {
                  label: "Total Expenses (This Month)",
                  value: `₹${expensesSummary.total_expense}`,
                  icon: "bi-list-check",
                },
                {
                  label: "Net Balance",
                  value: `₹${transactionsSummary.net}`,
                  icon: "bi-wallet2",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.label}
                      </p>

                      <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                        {item.value}
                      </h2>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
                      <i className={`bi ${item.icon} text-xl`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ===================== STUDENTS SECTION START ========================*/}
        {activeSection === "students" && (
          <section className="section active p-0 space-y-6">
            {!canViewAccounts ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <i className="bi bi-lock text-3xl text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You don't have access to the Students section. Ask your
                  Super Admin for Accounts access.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold">
                        Students
                      </h2>
                      <p className="text-xs sm:text-sm opacity-90">
                        Full student roster for fee lookup, contact details
                        and class placement.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={reloadStudents}
                      className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium shadow"
                    >
                      <i className="bi bi-arrow-clockwise mr-1" />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* STATS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    {
                      label: "Total Students",
                      icon: "bi-mortarboard",
                      badgeCls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                      value: studentStats.total,
                      className: "text-gray-900 dark:text-white",
                    },
                    {
                      label: "Active",
                      icon: "bi-check-circle",
                      badgeCls: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
                      value: studentStats.active,
                      className: "text-green-600",
                    },
                    {
                      label: "Inactive",
                      icon: "bi-x-circle",
                      badgeCls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
                      value: studentStats.inactive,
                      className: "text-red-500",
                    },
                    {
                      label: "Unassigned Class",
                      icon: "bi-question-circle",
                      badgeCls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                      value: studentStats.unassigned,
                      className: "text-amber-500",
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {card.label}
                          </p>
                          <p className={`mt-2 text-2xl font-bold ${card.className}`}>
                            {card.value}
                          </p>
                        </div>
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.badgeCls}`}
                        >
                          <i className={`bi ${card.icon} text-lg`} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* FILTERS */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Search Student
                    </label>
                    <input
                      type="text"
                      value={studentFilters.search}
                      onChange={(e) =>
                        updateStudentFilter("search", e.target.value)
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" && applyStudentFilters()
                      }
                      placeholder="Search name, student ID, mobile, email..."
                      className="input mt-1 w-full"
                    />
                  </div>

                  <div className="w-full sm:w-48">
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Status
                    </label>
                    <select
                      value={studentFilters.status}
                      onChange={(e) =>
                        updateStudentFilter("status", e.target.value)
                      }
                      className="input mt-1 w-full"
                    >
                      <option value="">All</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={applyStudentFilters}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
                    >
                      Apply
                    </button>

                    <button
                      type="button"
                      onClick={resetStudentFilters}
                      className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-100 dark:border-slate-600 dark:hover:bg-slate-700"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* LIST */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800 dark:text-white">
                      Student List
                    </h3>

                    {studentsLoading && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Loading...
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    {!studentsLoading && students.length === 0 && (
                      <div className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">
                        No students found
                      </div>
                    )}

                    {students.map((student) => (
                      <div
                        key={student.id}
                        className="border dark:border-slate-700 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <h4
                            role="button"
                            tabIndex={0}
                            onClick={() => loadStudentFeeDetails(student.id)}
                            onKeyDown={(e) =>
                              e.key === "Enter" &&
                              loadStudentFeeDetails(student.id)
                            }
                            className="font-semibold text-gray-800 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline underline-offset-2"
                            title="View fee details"
                          >
                            {studentDisplayName(student)}
                          </h4>

                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {student.student_id} •{" "}
                            {student.email || "No email"} •{" "}
                            {student.mobile || "No mobile"}
                          </p>

                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {student.batch_name
                              ? `${student.batch_name} • ${student.division_name || ""} ${
                                  student.section_name || ""
                                }`.trim()
                              : "No class assigned"}
                            {student.roll_number
                              ? ` • Roll #${student.roll_number}`
                              : ""}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-xs px-3 py-1 rounded-full font-medium ${
                              student.status === "Active"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-600"
                            }`}
                          >
                            {student.status || "Active"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        )}
        {/* ===================== STUDENTS SECTION END ==========================*/}

        {/* ===================== STAFF SECTION START ===========================*/}
        {activeSection === "staff" && (
          <section className="section active p-0 space-y-6">
            {!canViewAccounts ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <i className="bi bi-lock text-3xl text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You don't have access to the Staff section. Ask your Super
                  Admin for Accounts access.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold">
                        Staff Management
                      </h2>
                      <p className="text-xs sm:text-sm opacity-90">
                        Teaching staff, non-teaching staff and admin staff -
                        everyone on payroll, in one directory.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={reloadStaff}
                      className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium shadow"
                    >
                      <i className="bi bi-arrow-clockwise mr-1" />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* STATS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    {
                      label: "Total Staff",
                      icon: "bi-people",
                      badgeCls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                      value: staffStats.total,
                      className: "text-gray-900 dark:text-white",
                    },
                    {
                      label: "Teaching",
                      icon: "bi-person-badge",
                      badgeCls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
                      value: staffStats.teaching,
                      className: "text-indigo-600",
                    },
                    {
                      label: "Non-Teaching",
                      icon: "bi-person-workspace",
                      badgeCls: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
                      value: staffStats.non_teaching,
                      className: "text-blue-600",
                    },
                    {
                      label: "Admin",
                      icon: "bi-shield-lock",
                      badgeCls: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300",
                      value: staffStats.admin,
                      className: "text-purple-600",
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {card.label}
                          </p>
                          <p className={`mt-2 text-2xl font-bold ${card.className}`}>
                            {card.value}
                          </p>
                        </div>
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.badgeCls}`}
                        >
                          <i className={`bi ${card.icon} text-lg`} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CATEGORY TABS */}
                <div className="flex flex-wrap gap-2">
                  {STAFF_CATEGORY_TABS.map((tab) => (
                    <button
                      key={tab.value || "all"}
                      type="button"
                      onClick={() => setStaffCategory(tab.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        (staffFilters.category || "") === tab.value
                          ? "bg-indigo-600 text-white shadow"
                          : "bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* FILTERS */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Search Staff
                    </label>
                    <input
                      type="text"
                      value={staffFilters.search}
                      onChange={(e) =>
                        updateStaffFilter("search", e.target.value)
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" && applyStaffFilters()
                      }
                      placeholder="Search name, staff ID, mobile, email..."
                      className="input mt-1 w-full"
                    />
                  </div>

                  <div className="w-full sm:w-48">
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Status
                    </label>
                    <select
                      value={staffFilters.status}
                      onChange={(e) =>
                        updateStaffFilter("status", e.target.value)
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
                      onClick={applyStaffFilters}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
                    >
                      Apply
                    </button>

                    <button
                      type="button"
                      onClick={resetStaffFilters}
                      className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-100 dark:border-slate-600 dark:hover:bg-slate-700"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* LIST */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800 dark:text-white">
                      Staff List
                    </h3>

                    {staffLoading && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Loading...
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    {!staffLoading && staff.length === 0 && (
                      <div className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">
                        No staff found
                      </div>
                    )}

                    {staff.map((person) => (
                      <div
                        key={person.staff_uid}
                        className="border dark:border-slate-700 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4
                              role="button"
                              tabIndex={0}
                              onClick={() =>
                                loadStaffSalaryDetails(
                                  person.record_type,
                                  person.id,
                                )
                              }
                              onKeyDown={(e) =>
                                e.key === "Enter" &&
                                loadStaffSalaryDetails(
                                  person.record_type,
                                  person.id,
                                )
                              }
                              className="font-semibold text-gray-800 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline underline-offset-2"
                              title="View salary details"
                            >
                              {person.name}
                            </h4>

                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide ${
                                person.record_type === "teacher"
                                  ? "bg-indigo-100 text-indigo-700"
                                  : person.record_type === "staff"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-purple-100 text-purple-700"
                              }`}
                            >
                              {person.category}
                            </span>
                          </div>

                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {person.staff_code} •{" "}
                            {person.email || "No email"} •{" "}
                            {person.mobile || "No mobile"}
                          </p>

                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {person.designation || "—"}
                            {person.department
                              ? ` • ${person.department}`
                              : ""}
                            {person.employment_type
                              ? ` • ${person.employment_type}`
                              : ""}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-xs px-3 py-1 rounded-full font-medium ${
                              person.status === "Active"
                                ? "bg-green-100 text-green-700"
                                : person.status === "Suspended"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-600"
                            }`}
                          >
                            {person.status || "Active"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        )}
        {/* ===================== STAFF SECTION END =============================*/}

        {/* ===================== FEE COLLECTION SECTION START ==================*/}
        {activeSection === "fee-collection" && (
          <section className="section active p-0 space-y-6">
            {!canViewAccounts ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <i className="bi bi-lock text-3xl text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You don't have access to Fee Collection. Ask your Super
                  Admin for Accounts access.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Fee Collection
                  </h2>
                  <p className="text-xs sm:text-sm opacity-90">
                    Find a student and record a fee payment, or review
                    what's come in recently.
                  </p>
                </div>

                {/* STATS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      label: "Collected This Month",
                      icon: "bi-cash-coin",
                      badgeCls: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
                      value: `₹${collectionSummary.collected_this_month}`,
                      className: "text-green-600",
                    },
                    {
                      label: "Total Outstanding",
                      icon: "bi-exclamation-circle",
                      badgeCls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                      value: `₹${collectionSummary.total_outstanding}`,
                      className: "text-amber-500",
                    },
                    {
                      label: "Overdue Installments",
                      icon: "bi-alarm",
                      badgeCls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
                      value: collectionSummary.overdue_installments,
                      className: "text-red-500",
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {card.label}
                          </p>
                          <p className={`mt-2 text-2xl font-bold ${card.className}`}>
                            {card.value}
                          </p>
                        </div>
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.badgeCls}`}
                        >
                          <i className={`bi ${card.icon} text-lg`} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* QUICK COLLECT - SEARCH A STUDENT */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
                  <h3 className="font-bold text-gray-800 dark:text-white mb-3">
                    Collect a Fee
                  </h3>

                  <div className="relative">
                    <input
                      type="text"
                      value={collectionSearchTerm}
                      onChange={(e) => searchCollectionStudents(e.target.value)}
                      placeholder="Search a student by name, ID or mobile to collect a payment..."
                      className="input w-full"
                    />

                    {collectionSearchTerm && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                        {collectionSearching && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 p-3">
                            Searching...
                          </p>
                        )}

                        {!collectionSearching &&
                          collectionSearchResults.length === 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 p-3">
                              No students found
                            </p>
                          )}

                        {collectionSearchResults.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              loadStudentFeeDetails(s.id);
                              clearCollectionSearch();
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-600 border-b last:border-b-0 dark:border-slate-600"
                          >
                            <span className="font-medium text-gray-800 dark:text-white">
                              {[s.first_name, s.middle_name, s.last_name]
                                .filter(Boolean)
                                .join(" ")}
                            </span>{" "}
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              • {s.student_id} • {s.batch_name || "No class"}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* RECENT PAYMENTS */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800 dark:text-white">
                      Recent Payments
                    </h3>
                    {collectionLoading && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Loading...
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {!collectionLoading && recentPayments.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-6">
                        No payments recorded yet.
                      </p>
                    )}

                    {recentPayments.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => loadStudentFeeDetails(p.student_id)}
                        className="w-full flex items-center justify-between border dark:border-slate-700 rounded-lg p-3 text-xs text-left hover:bg-gray-50 dark:hover:bg-slate-700"
                      >
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">
                            {p.student_name}{" "}
                            <span className="text-gray-400">
                              ({p.student_code})
                            </span>
                          </p>
                          <p className="text-gray-500 dark:text-gray-400">
                            {p.receipt_number} • {p.payment_mode} •{" "}
                            {p.payment_date}
                          </p>
                        </div>
                        <span className="font-semibold text-green-600">
                          ₹{p.amount}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        )}
        {/* ===================== FEE COLLECTION SECTION END ====================*/}

        {/* ===================== FEE STRUCTURE SECTION START ===================*/}
        {activeSection === "fee-structure" && (
          <section className="section active p-0 space-y-6">
            {!canViewAccounts ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <i className="bi bi-lock text-3xl text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You don't have access to Fee Structure. Ask your Super
                  Admin for Accounts access.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold">
                        Fee Structure
                      </h2>
                      <p className="text-xs sm:text-sm opacity-90">
                        Set up a fee template once, then apply it to bill
                        an entire batch (or the whole school) in one go.
                      </p>
                    </div>

                    {canWriteAccounts && (
                      <button
                        type="button"
                        onClick={() => setShowStructureForm((v) => !v)}
                        className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium shadow"
                      >
                        {showStructureForm ? "Cancel" : "+ New Template"}
                      </button>
                    )}
                  </div>
                </div>

                {showStructureForm && canWriteAccounts && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-3 -mt-1 mb-1 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                        <i className="bi bi-diagram-3" />
                      </span>
                      <h4 className="text-sm font-bold text-gray-800 dark:text-white">
                        New Fee Structure Template
                      </h4>
                    </div>
                    <input
                      className="input"
                      placeholder="Template Name (e.g. Class 10 Term 1 Tuition)"
                      value={structureForm.name}
                      onChange={(e) =>
                        updateStructureForm("name", e.target.value)
                      }
                    />
                    <select
                      className="input"
                      value={structureForm.fee_category}
                      onChange={(e) =>
                        updateStructureForm("fee_category", e.target.value)
                      }
                    >
                      {[
                        "Tuition", "Admission", "Transport", "Hostel", "Exam",
                        "Library", "Lab", "Sports", "Miscellaneous",
                      ].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <select
                      className="input"
                      value={structureForm.batch_id}
                      onChange={(e) =>
                        updateStructureForm("batch_id", e.target.value)
                      }
                    >
                      <option value="">All Students (no batch limit)</option>
                      {feeStructureBatches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.batch_name}
                        </option>
                      ))}
                    </select>
                    <input
                      className="input"
                      placeholder="Academic Year (2026-2027)"
                      value={structureForm.academic_year}
                      onChange={(e) =>
                        updateStructureForm("academic_year", e.target.value)
                      }
                    />
                    <input
                      className="input"
                      type="number"
                      placeholder="Amount"
                      value={structureForm.amount}
                      onChange={(e) =>
                        updateStructureForm("amount", e.target.value)
                      }
                    />
                    <input
                      className="input"
                      type="date"
                      value={structureForm.due_date}
                      onChange={(e) =>
                        updateStructureForm("due_date", e.target.value)
                      }
                    />
                    <input
                      className="input sm:col-span-3"
                      placeholder="Description (optional)"
                      value={structureForm.description}
                      onChange={(e) =>
                        updateStructureForm("description", e.target.value)
                      }
                    />

                    <button
                      type="button"
                      disabled={feeStructureSaving}
                      onClick={submitStructure}
                      className="sm:col-span-3 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {feeStructureSaving ? "Saving..." : "Save Template"}
                    </button>
                  </div>
                )}

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800 dark:text-white">
                      Templates
                    </h3>
                    {feeStructuresLoading && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Loading...
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    {!feeStructuresLoading && feeStructures.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-6">
                        No fee structure templates yet.
                      </p>
                    )}

                    {feeStructures.map((s) => (
                      <div
                        key={s.id}
                        className="border dark:border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-white">
                            {s.name}{" "}
                            <span className="text-[10px] text-gray-400">
                              ({s.fee_category})
                            </span>
                            {!s.is_active && (
                              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                                Inactive
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            ₹{s.amount} • Due {s.due_date} • Applied to{" "}
                            {s.applied_count}/{s.target_count} student(s)
                          </p>
                        </div>

                        {canWriteAccounts && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={feeStructureApplyingId === s.id}
                              onClick={() => applyStructure(s.id)}
                              className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {feeStructureApplyingId === s.id
                                ? "Applying..."
                                : "Apply to Students"}
                            </button>

                            {s.applied_count === 0 && (
                              <button
                                type="button"
                                onClick={() => deleteStructure(s.id)}
                                className="text-xs border border-red-300 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        )}
        {/* ===================== FEE STRUCTURE SECTION END =====================*/}

        {/* ===================== PENDING FEES SECTION START ====================*/}
        {activeSection === "pending-fees" && (
          <section className="section active p-0 space-y-6">
            {!canViewAccounts ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <i className="bi bi-lock text-3xl text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You don't have access to Pending Fees. Ask your Super
                  Admin for Accounts access.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold">
                        Pending Fees
                      </h2>
                      <p className="text-xs sm:text-sm opacity-90">
                        Every student with an unpaid, partially paid or
                        overdue installment - click a name to collect.
                      </p>
                    </div>

                    {canWriteAccounts && (
                      <button
                        type="button"
                        disabled={sendingFeeReminders}
                        onClick={() => sendFeeReminders(3)}
                        className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium shadow disabled:opacity-50"
                      >
                        <i className="bi bi-bell mr-1.5" />
                        {sendingFeeReminders ? "Sending..." : "Send Fee Reminders"}
                      </button>
                    )}
                  </div>
                </div>

                {/* STATS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      label: "Students Pending",
                      icon: "bi-hourglass-split",
                      badgeCls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                      value: pendingFeesSummary.count,
                      className: "text-gray-900 dark:text-white",
                    },
                    {
                      label: "Overdue",
                      icon: "bi-alarm",
                      badgeCls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
                      value: pendingFeesSummary.overdue_count,
                      className: "text-red-500",
                    },
                    {
                      label: "Total Pending Amount",
                      icon: "bi-wallet2",
                      badgeCls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                      value: `₹${pendingFeesSummary.total_pending_amount}`,
                      className: "text-amber-500",
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {card.label}
                          </p>
                          <p className={`mt-2 text-2xl font-bold ${card.className}`}>
                            {card.value}
                          </p>
                        </div>
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.badgeCls}`}
                        >
                          <i className={`bi ${card.icon} text-lg`} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* FILTERS */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Search Student
                    </label>
                    <input
                      type="text"
                      value={pendingFeesFilters.search}
                      onChange={(e) =>
                        updatePendingFeesFilter("search", e.target.value)
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" && applyPendingFeesFilters()
                      }
                      placeholder="Search name, student ID, mobile..."
                      className="input mt-1 w-full"
                    />
                  </div>

                  <div className="w-full sm:w-48">
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Status
                    </label>
                    <select
                      value={pendingFeesFilters.status}
                      onChange={(e) =>
                        updatePendingFeesFilter("status", e.target.value)
                      }
                      className="input mt-1 w-full"
                    >
                      <option value="">All (Pending + Partial + Overdue)</option>
                      <option value="Pending">Pending</option>
                      <option value="Partial">Partial</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={applyPendingFeesFilters}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={resetPendingFeesFilters}
                      className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-100 dark:border-slate-600 dark:hover:bg-slate-700"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* LIST */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800 dark:text-white">
                      Outstanding Installments
                    </h3>
                    {pendingFeesLoading && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Loading...
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {!pendingFeesLoading && pendingFees.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-6">
                        Nothing pending - everyone's paid up 🎉
                      </p>
                    )}

                    {pendingFees.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => loadStudentFeeDetails(row.student_id)}
                        className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border dark:border-slate-700 rounded-lg p-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white">
                            {row.student_name}{" "}
                            <span className="text-xs text-gray-400">
                              ({row.student_code})
                            </span>
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {row.title} • {row.class_class_name || "Not Assigned"} •
                            Due {row.due_date} • Balance ₹{row.balance}
                          </p>
                        </div>

                        <span
                          className={`text-xs px-3 py-1 rounded-full font-medium self-start sm:self-auto ${
                            row.status === "Overdue"
                              ? "bg-red-100 text-red-600"
                              : row.status === "Partial"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {row.status}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        )}
        {/* ===================== PENDING FEES SECTION END ======================*/}

        {/* ===================== FEE REPORTS SECTION START ======================*/}
        {activeSection === "fee-reports" && (
          <section className="section active p-0 space-y-6">
            {!canViewAccounts ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <i className="bi bi-lock text-3xl text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You don't have access to Fee Reports. Ask your Super
                  Admin for Accounts access.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold">
                        Fee Reports
                      </h2>
                      <p className="text-xs sm:text-sm opacity-90">
                        Collection trend, category and batch breakdowns,
                        and who's furthest behind.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={reportsAcademicYear}
                        onChange={(e) => applyAcademicYear(e.target.value)}
                        placeholder="Filter by year (2026-2027)"
                        className="input !bg-white/90 !text-gray-800 text-sm w-56"
                      />
                    </div>
                  </div>
                </div>

                {/* SUMMARY */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    {
                      label: "Total Billed",
                      icon: "bi-receipt",
                      badgeCls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                      value: `₹${reportsSummary.total_billed}`,
                      className: "text-gray-900 dark:text-white",
                    },
                    {
                      label: "Total Collected",
                      icon: "bi-cash-stack",
                      badgeCls: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
                      value: `₹${reportsSummary.total_collected}`,
                      className: "text-green-600",
                    },
                    {
                      label: "Outstanding",
                      icon: "bi-exclamation-circle",
                      badgeCls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                      value: `₹${reportsSummary.total_outstanding}`,
                      className: "text-amber-500",
                    },
                    {
                      label: "Collection Rate",
                      icon: "bi-percent",
                      badgeCls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                      value: `${reportsSummary.collection_rate}%`,
                      className: "text-indigo-600",
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {card.label}
                          </p>
                          <p className={`mt-2 text-2xl font-bold ${card.className}`}>
                            {card.value}
                          </p>
                        </div>
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.badgeCls}`}
                        >
                          <i className={`bi ${card.icon} text-lg`} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {reportsLoading && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Loading reports...
                  </p>
                )}

                {/* MONTHLY COLLECTION TREND */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-4">
                    Collection Trend (Last 12 Months)
                  </h3>

                  <div className="flex items-end gap-2 h-40">
                    {monthlyTrend.map((m) => {
                      const max = Math.max(
                        1,
                        ...monthlyTrend.map((x) => x.collected),
                      );
                      const heightPct = Math.max(
                        2,
                        Math.round((m.collected / max) * 100),
                      );
                      return (
                        <div
                          key={`${m.year}-${m.month}`}
                          className="flex-1 flex flex-col items-center justify-end h-full group relative"
                        >
                          <div className="absolute -top-6 text-[10px] text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition">
                            ₹{m.collected}
                          </div>
                          <div
                            className="w-full bg-indigo-500 dark:bg-indigo-400 rounded-t-md"
                            style={{ height: `${heightPct}%` }}
                          />
                          <span className="mt-1 text-[9px] text-gray-500 dark:text-gray-400 rotate-0 whitespace-nowrap">
                            {m.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* CATEGORY BREAKDOWN */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-3">
                      Billed vs Collected by Category
                    </h3>

                    <div className="space-y-3">
                      {categoryBreakdown.length === 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          No fee data yet.
                        </p>
                      )}

                      {categoryBreakdown.map((c) => {
                        const pct =
                          c.billed > 0
                            ? Math.min(100, Math.round((c.collected / c.billed) * 100))
                            : 0;
                        return (
                          <div key={c.category}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-medium text-gray-700 dark:text-gray-200">
                                {c.category}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400">
                                ₹{c.collected} / ₹{c.billed}
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                              <div
                                className="h-full bg-green-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* PAYMENT MODE BREAKDOWN */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-3">
                      Collections by Payment Mode
                    </h3>

                    <div className="space-y-3">
                      {paymentModeBreakdown.length === 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          No payments recorded yet.
                        </p>
                      )}

                      {paymentModeBreakdown.map((m) => {
                        const max = Math.max(
                          1,
                          ...paymentModeBreakdown.map((x) => x.amount),
                        );
                        const pct = Math.round((m.amount / max) * 100);
                        return (
                          <div key={m.mode}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-medium text-gray-700 dark:text-gray-200">
                                {m.mode}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400">
                                ₹{m.amount} ({m.count})
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                              <div
                                className="h-full bg-indigo-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* BATCH-WISE BREAKDOWN */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
                  <h3 className="font-bold text-gray-800 dark:text-white mb-3">
                    Billed vs Collected by Batch
                  </h3>

                  <div className="space-y-3">
                    {batchBreakdown.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        No fee data yet.
                      </p>
                    )}

                    {batchBreakdown.map((b) => {
                      const pct =
                        b.billed > 0
                          ? Math.min(100, Math.round((b.collected / b.billed) * 100))
                          : 0;
                      return (
                        <div key={b.batch_name}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-gray-700 dark:text-gray-200">
                              {b.batch_name}{" "}
                              <span className="text-gray-400">
                                ({b.student_count} students)
                              </span>
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              ₹{b.collected} / ₹{b.billed} • ₹{b.outstanding} pending
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* TOP DEFAULTERS */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
                  <h3 className="font-bold text-gray-800 dark:text-white mb-3">
                    Top Outstanding Balances
                  </h3>

                  <div className="space-y-2">
                    {topDefaulters.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        No outstanding balances - everyone's paid up.
                      </p>
                    )}

                    {topDefaulters.map((d, idx) => (
                      <button
                        key={d.student_id}
                        type="button"
                        onClick={() => loadStudentFeeDetails(d.student_id)}
                        className="w-full flex items-center justify-between border dark:border-slate-700 rounded-lg p-3 text-xs text-left hover:bg-gray-50 dark:hover:bg-slate-700"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 flex items-center justify-center rounded-full bg-red-100 text-red-600 font-semibold text-[10px]">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-medium text-gray-800 dark:text-white">
                              {d.student_name}{" "}
                              <span className="text-gray-400">
                                ({d.student_code})
                              </span>
                            </p>
                            <p className="text-gray-500 dark:text-gray-400">
                              {d.class_name}
                            </p>
                          </div>
                        </div>
                        <span className="font-semibold text-red-600">
                          ₹{d.balance}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        )}
        {/* ===================== FEE REPORTS SECTION END ========================*/}

        {/* ===================== EXPENSES SECTION START =========================*/}
        {activeSection === "expense-list" && (
          <section className="section active p-0 space-y-6">
            {!canViewAccounts ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <i className="bi bi-lock text-3xl text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You don't have access to Expenses. Ask your Super Admin
                  for Accounts access.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold">
                        Expenses
                      </h2>
                      <p className="text-xs sm:text-sm opacity-90">
                        Utilities, maintenance, supplies and everything
                        else the school pays for.
                      </p>
                    </div>

                    {canWriteAccounts && (
                      <button
                        type="button"
                        onClick={() => setShowExpenseForm((v) => !v)}
                        className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium shadow"
                      >
                        {showExpenseForm ? "Cancel" : "+ Add Expense"}
                      </button>
                    )}
                  </div>
                </div>

                {/* FILTERS + STATS */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="w-full sm:w-40">
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Month
                    </label>
                    <select
                      className="input mt-1 w-full"
                      value={expenseFilters.month}
                      onChange={(e) =>
                        updateExpenseFilter("month", Number(e.target.value))
                      }
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {new Date(2000, m - 1).toLocaleString("default", {
                            month: "long",
                          })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full sm:w-32">
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Year
                    </label>
                    <input
                      type="number"
                      className="input mt-1 w-full"
                      value={expenseFilters.year}
                      onChange={(e) =>
                        updateExpenseFilter("year", Number(e.target.value))
                      }
                    />
                  </div>
                  <button
                    type="button"
                    onClick={applyExpenseFilters}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
                  >
                    Apply
                  </button>

                  <div className="ml-auto text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Total for period
                    </p>
                    <p className="font-bold text-lg text-red-500">
                      ₹{expensesSummary.total_expense}
                    </p>
                  </div>
                </div>

                {showExpenseForm && canWriteAccounts && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-3 -mt-1 mb-1 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white">
                        <i className="bi bi-cash-stack" />
                      </span>
                      <h4 className="text-sm font-bold text-gray-800 dark:text-white">
                        New Expense
                      </h4>
                    </div>
                    {expenseCategories.length > 0 ? (
                      <select
                        className="input"
                        value={expenseForm.category}
                        onChange={(e) =>
                          updateExpenseForm("category", e.target.value)
                        }
                      >
                        <option value="">Select Category</option>
                        {expenseCategories
                          .filter((c) => c.is_active)
                          .map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <input
                        className="input"
                        placeholder="Category"
                        value={expenseForm.category}
                        onChange={(e) =>
                          updateExpenseForm("category", e.target.value)
                        }
                      />
                    )}
                    <input
                      className="input"
                      type="number"
                      placeholder="Amount"
                      value={expenseForm.amount}
                      onChange={(e) =>
                        updateExpenseForm("amount", e.target.value)
                      }
                    />
                    <input
                      className="input"
                      type="date"
                      value={expenseForm.transaction_date}
                      onChange={(e) =>
                        updateExpenseForm("transaction_date", e.target.value)
                      }
                    />
                    <select
                      className="input"
                      value={expenseForm.payment_mode}
                      onChange={(e) =>
                        updateExpenseForm("payment_mode", e.target.value)
                      }
                    >
                      {["Cash", "Card", "UPI", "Bank Transfer", "Cheque", "Online"].map(
                        (m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ),
                      )}
                    </select>
                    <input
                      className="input"
                      placeholder="Reference No (optional)"
                      value={expenseForm.reference_no}
                      onChange={(e) =>
                        updateExpenseForm("reference_no", e.target.value)
                      }
                    />
                    <input
                      className="input"
                      placeholder="Description (optional)"
                      value={expenseForm.description}
                      onChange={(e) =>
                        updateExpenseForm("description", e.target.value)
                      }
                    />

                    <button
                      type="button"
                      disabled={expenseSaving}
                      onClick={submitExpense}
                      className="sm:col-span-3 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {expenseSaving ? "Saving..." : "Save Expense"}
                    </button>
                  </div>
                )}

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800 dark:text-white">
                      Expenses
                    </h3>
                    {expensesLoading && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Loading...
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {!expensesLoading && expenses.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-6">
                        No expenses recorded for this period.
                      </p>
                    )}

                    {expenses.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center justify-between border dark:border-slate-700 rounded-lg p-3 text-xs"
                      >
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">
                            {e.category}
                          </p>
                          <p className="text-gray-500 dark:text-gray-400">
                            {e.transaction_date} • {e.payment_mode}
                            {e.reference_no ? ` • ${e.reference_no}` : ""}
                            {e.description ? ` • ${e.description}` : ""}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-red-500">
                            ₹{e.amount}
                          </span>
                          {canWriteAccounts && (
                            <button
                              type="button"
                              onClick={() => deleteExpense(e.id)}
                              className="text-red-500 hover:text-red-700"
                              title="Delete expense"
                            >
                              <i className="bi bi-trash" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        )}
        {/* ===================== EXPENSES SECTION END ===========================*/}

        {/* ===================== EXPENSE CATEGORIES SECTION START ===============*/}
        {activeSection === "expense-categories" && (
          <section className="section active p-0 space-y-6">
            {!canViewAccounts ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <i className="bi bi-lock text-3xl text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You don't have access to Expense Categories. Ask your
                  Super Admin for Accounts access.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold">
                        Expense Categories
                      </h2>
                      <p className="text-xs sm:text-sm opacity-90">
                        Set an optional monthly budget per category and
                        track spend against it.
                      </p>
                    </div>

                    {canWriteAccounts && (
                      <button
                        type="button"
                        onClick={() => setShowCategoryForm((v) => !v)}
                        className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium shadow"
                      >
                        {showCategoryForm ? "Cancel" : "+ New Category"}
                      </button>
                    )}
                  </div>
                </div>

                {showCategoryForm && canWriteAccounts && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-3 -mt-1 mb-1 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 text-white">
                        <i className="bi bi-tags" />
                      </span>
                      <h4 className="text-sm font-bold text-gray-800 dark:text-white">
                        New Expense Category
                      </h4>
                    </div>
                    <input
                      className="input"
                      placeholder="Category Name"
                      value={categoryForm.name}
                      onChange={(e) =>
                        updateCategoryForm("name", e.target.value)
                      }
                    />
                    <input
                      className="input"
                      type="number"
                      placeholder="Monthly Budget (optional)"
                      value={categoryForm.monthly_budget}
                      onChange={(e) =>
                        updateCategoryForm("monthly_budget", e.target.value)
                      }
                    />
                    <input
                      className="input"
                      placeholder="Description (optional)"
                      value={categoryForm.description}
                      onChange={(e) =>
                        updateCategoryForm("description", e.target.value)
                      }
                    />

                    <button
                      type="button"
                      disabled={expenseCategorySaving}
                      onClick={submitCategory}
                      className="sm:col-span-3 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {expenseCategorySaving ? "Saving..." : "Save Category"}
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {expenseCategoriesLoading && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 col-span-full">
                      Loading...
                    </p>
                  )}

                  {!expenseCategoriesLoading && expenseCategories.length === 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 col-span-full text-center py-6">
                      No expense categories yet.
                    </p>
                  )}

                  {expenseCategories.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm text-gray-800 dark:text-white">
                          {c.name}
                        </h4>
                        {!c.is_active && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                            Inactive
                          </span>
                        )}
                      </div>

                      {c.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {c.description}
                        </p>
                      )}

                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Spent this month: ₹{c.spent_this_month}
                        {c.monthly_budget ? ` / ₹${c.monthly_budget}` : ""}
                      </p>

                      {c.monthly_budget && (
                        <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden mt-1">
                          <div
                            className={`h-full ${
                              c.utilization_pct >= 100 ? "bg-red-500" : "bg-indigo-500"
                            }`}
                            style={{
                              width: `${Math.min(100, c.utilization_pct || 0)}%`,
                            }}
                          />
                        </div>
                      )}

                      {canWriteAccounts && (
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() =>
                              updateExpenseCategory(c.id, { is_active: !c.is_active })
                            }
                            className="text-xs border px-3 py-1 rounded-lg hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700"
                          >
                            {c.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteExpenseCategory(c.id)}
                            className="text-xs border border-red-300 text-red-600 px-3 py-1 rounded-lg hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
        {/* ===================== EXPENSE CATEGORIES SECTION END =================*/}

        {/* ===================== SALARY MANAGEMENT SECTION START ================*/}
        {activeSection === "salary-management" && (
          <section className="section active p-0 space-y-6">
            {!canViewAccounts ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <i className="bi bi-lock text-3xl text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You don't have access to Salary Management. Ask your
                  Super Admin for Accounts access.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Salary Management
                  </h2>
                  <p className="text-xs sm:text-sm opacity-90">
                    Every staff member's salary setup status - click a
                    name to set up or edit their structure.
                  </p>
                </div>

                {/* STATS */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    {
                      label: "Total Staff",
                      icon: "bi-people",
                      badgeCls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                      value: salaryRosterStats.total,
                      className: "text-gray-900 dark:text-white",
                    },
                    {
                      label: "Set Up",
                      icon: "bi-check-circle",
                      badgeCls: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
                      value: salaryRosterStats.set_up,
                      className: "text-green-600",
                    },
                    {
                      label: "Not Set Up",
                      icon: "bi-exclamation-triangle",
                      badgeCls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                      value: salaryRosterStats.not_set_up,
                      className: "text-amber-500",
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {card.label}
                          </p>
                          <p className={`mt-2 text-2xl font-bold ${card.className}`}>
                            {card.value}
                          </p>
                        </div>
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.badgeCls}`}
                        >
                          <i className={`bi ${card.icon} text-lg`} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CATEGORY TABS */}
                <div className="flex flex-wrap gap-2">
                  {SALARY_CATEGORY_TABS.map((tab) => (
                    <button
                      key={tab.value || "all"}
                      type="button"
                      onClick={() => setSalaryRosterCategory(tab.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        (salaryRosterFilters.category || "") === tab.value
                          ? "bg-indigo-600 text-white shadow"
                          : "bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* FILTERS */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Search
                    </label>
                    <input
                      type="text"
                      value={salaryRosterFilters.search}
                      onChange={(e) =>
                        updateSalaryRosterFilter("search", e.target.value)
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" && applySalaryRosterFilters()
                      }
                      placeholder="Search name or staff ID..."
                      className="input mt-1 w-full"
                    />
                  </div>

                  <div className="w-full sm:w-48">
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Setup Status
                    </label>
                    <select
                      value={salaryRosterFilters.setup}
                      onChange={(e) => setSalaryRosterSetupFilter(e.target.value)}
                      className="input mt-1 w-full"
                    >
                      <option value="">All</option>
                      <option value="set">Set Up</option>
                      <option value="not_set">Not Set Up</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={applySalaryRosterFilters}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
                  >
                    Apply
                  </button>
                </div>

                {/* LIST */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800 dark:text-white">
                      Staff
                    </h3>
                    {salaryRosterLoading && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Loading...
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {!salaryRosterLoading && salaryRoster.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-6">
                        No staff found.
                      </p>
                    )}

                    {salaryRoster.map((person) => (
                      <button
                        key={`${person.record_type}-${person.id}`}
                        type="button"
                        onClick={() =>
                          loadStaffSalaryDetails(person.record_type, person.id)
                        }
                        className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border dark:border-slate-700 rounded-lg p-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white">
                            {person.name}{" "}
                            <span className="text-xs text-gray-400">
                              ({person.staff_code})
                            </span>
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {person.designation}
                            {person.department ? ` • ${person.department}` : ""}
                            {person.has_salary_structure
                              ? ` • Net ₹${person.net}`
                              : ""}
                          </p>
                        </div>

                        <span
                          className={`text-xs px-3 py-1 rounded-full font-medium self-start sm:self-auto ${
                            person.has_salary_structure
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {person.has_salary_structure ? "Set Up" : "Not Set Up"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        )}
        {/* ===================== SALARY MANAGEMENT SECTION END ==================*/}

        {/* ===================== PAYSLIPS SECTION START =========================*/}
        {activeSection === "payslips" && (
          <section className="section active p-0 space-y-6">
            {!canViewAccounts ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <i className="bi bi-lock text-3xl text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You don't have access to Payslips. Ask your Super Admin
                  for Accounts access.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold">
                        Payslips
                      </h2>
                      <p className="text-xs sm:text-sm opacity-90">
                        Every payslip school-wide. Run payroll to
                        generate this month's in one click.
                      </p>
                    </div>

                    {canWriteAccounts && (
                      <button
                        type="button"
                        disabled={runningPayroll}
                        onClick={runPayroll}
                        className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium shadow disabled:opacity-50"
                      >
                        {runningPayroll ? "Running..." : "▶ Run Payroll"}
                      </button>
                    )}
                  </div>
                </div>

                {/* FILTERS + STATS */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="w-full sm:w-40">
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Month
                    </label>
                    <select
                      className="input mt-1 w-full"
                      value={payslipFilters.month}
                      onChange={(e) =>
                        updatePayslipFilter("month", Number(e.target.value))
                      }
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {new Date(2000, m - 1).toLocaleString("default", {
                            month: "long",
                          })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full sm:w-32">
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Year
                    </label>
                    <input
                      type="number"
                      className="input mt-1 w-full"
                      value={payslipFilters.year}
                      onChange={(e) =>
                        updatePayslipFilter("year", Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Status
                    </label>
                    <select
                      className="input mt-1 w-full"
                      value={payslipFilters.status}
                      onChange={(e) =>
                        updatePayslipFilter("status", e.target.value)
                      }
                    >
                      <option value="">All</option>
                      <option value="Pending">Pending</option>
                      <option value="Processing">Processing</option>
                      <option value="Paid">Paid</option>
                      <option value="Failed">Failed</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={applyPayslipFilters}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
                  >
                    Apply
                  </button>

                  <div className="ml-auto text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Paid ₹{payslipsSummary.paid_amount} • Pending ₹
                      {payslipsSummary.pending_amount}
                    </p>
                  </div>
                </div>

                {/* LIST */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800 dark:text-white">
                      Payslips
                    </h3>
                    {payslipsLoading && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Loading...
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {!payslipsLoading && allPayslips.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-6">
                        No payslips for this period yet.
                      </p>
                    )}

                    {allPayslips.map((slip) => (
                      <div
                        key={slip.id}
                        className="flex items-center justify-between border dark:border-slate-700 rounded-lg p-3 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            loadStaffSalaryDetails(slip.record_type, slip.record_id)
                          }
                          className="text-left hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          <p className="font-medium text-gray-800 dark:text-white">
                            {slip.staff_name}{" "}
                            <span className="text-gray-400">
                              ({slip.staff_code})
                            </span>
                          </p>
                          <p className="text-gray-500 dark:text-gray-400">
                            {slip.designation} • Gross ₹{slip.gross_salary} − Ded ₹
                            {slip.total_deductions} = Net ₹{slip.net_salary}
                          </p>
                        </button>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded-full font-medium ${
                              slip.status === "Paid"
                                ? "bg-green-100 text-green-700"
                                : slip.status === "Failed"
                                  ? "bg-red-100 text-red-600"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {slip.status}
                          </span>

                          {canWriteAccounts && slip.status !== "Paid" && (
                            <button
                              type="button"
                              onClick={async () => {
                                await markPayslipPaid(
                                  slip.record_type,
                                  slip.record_id,
                                  slip.id,
                                  { payment_mode: "Bank Transfer" },
                                );
                                reloadAllPayslips();
                              }}
                              className="bg-green-600 text-white px-2 py-1 rounded-lg hover:bg-green-700"
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        )}
        {/* ===================== PAYSLIPS SECTION END ===========================*/}

        {/* ===================== INCOME SECTION START ============================*/}
        {activeSection === "income" && (
          <section className="section active p-0 space-y-6">
            {!canViewAccounts ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <i className="bi bi-lock text-3xl text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You don't have access to Income. Ask your Super Admin
                  for Accounts access.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold">
                        Income
                      </h2>
                      <p className="text-xs sm:text-sm opacity-90">
                        Donations, rent, grants and any other money
                        coming in that isn't student fees.
                      </p>
                    </div>

                    {canWriteAccounts && (
                      <button
                        type="button"
                        onClick={() => setShowIncomeForm((v) => !v)}
                        className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium shadow"
                      >
                        {showIncomeForm ? "Cancel" : "+ Add Income"}
                      </button>
                    )}
                  </div>
                </div>

                {/* FILTERS + STATS */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="w-full sm:w-40">
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Month
                    </label>
                    <select
                      className="input mt-1 w-full"
                      value={incomeFilters.month}
                      onChange={(e) =>
                        updateIncomeFilter("month", Number(e.target.value))
                      }
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {new Date(2000, m - 1).toLocaleString("default", {
                            month: "long",
                          })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full sm:w-32">
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Year
                    </label>
                    <input
                      type="number"
                      className="input mt-1 w-full"
                      value={incomeFilters.year}
                      onChange={(e) =>
                        updateIncomeFilter("year", Number(e.target.value))
                      }
                    />
                  </div>
                  <button
                    type="button"
                    onClick={applyIncomeFilters}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
                  >
                    Apply
                  </button>

                  <div className="ml-auto text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Total for period
                    </p>
                    <p className="font-bold text-lg text-green-600">
                      ₹{incomeSummary.total_income}
                    </p>
                  </div>
                </div>

                {showIncomeForm && canWriteAccounts && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-3 -mt-1 mb-1 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                        <i className="bi bi-graph-up-arrow" />
                      </span>
                      <h4 className="text-sm font-bold text-gray-800 dark:text-white">
                        New Income Entry
                      </h4>
                    </div>
                    <input
                      className="input"
                      placeholder="Category (Donation, Rent, Grant, Interest...)"
                      value={incomeForm.category}
                      onChange={(e) => updateIncomeForm("category", e.target.value)}
                    />
                    <input
                      className="input"
                      type="number"
                      placeholder="Amount"
                      value={incomeForm.amount}
                      onChange={(e) => updateIncomeForm("amount", e.target.value)}
                    />
                    <input
                      className="input"
                      type="date"
                      value={incomeForm.transaction_date}
                      onChange={(e) =>
                        updateIncomeForm("transaction_date", e.target.value)
                      }
                    />
                    <select
                      className="input"
                      value={incomeForm.payment_mode}
                      onChange={(e) =>
                        updateIncomeForm("payment_mode", e.target.value)
                      }
                    >
                      {["Cash", "Card", "UPI", "Bank Transfer", "Cheque", "Online"].map(
                        (m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ),
                      )}
                    </select>
                    <select
                      className="input"
                      value={incomeForm.bank_account_id}
                      onChange={(e) =>
                        updateIncomeForm("bank_account_id", e.target.value)
                      }
                    >
                      <option value="">No bank account (cash / unlinked)</option>
                      {bankAccounts
                        .filter((a) => a.is_active)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.account_name} ({a.masked_account_number})
                          </option>
                        ))}
                    </select>
                    <input
                      className="input"
                      placeholder="Reference No (optional)"
                      value={incomeForm.reference_no}
                      onChange={(e) =>
                        updateIncomeForm("reference_no", e.target.value)
                      }
                    />
                    <input
                      className="input sm:col-span-3"
                      placeholder="Description (optional)"
                      value={incomeForm.description}
                      onChange={(e) =>
                        updateIncomeForm("description", e.target.value)
                      }
                    />

                    <button
                      type="button"
                      disabled={incomeSaving}
                      onClick={submitIncome}
                      className="sm:col-span-3 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {incomeSaving ? "Saving..." : "Save Income"}
                    </button>
                  </div>
                )}

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800 dark:text-white">
                      Income
                    </h3>
                    {incomeLoading && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Loading...
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {!incomeLoading && incomes.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-6">
                        No income recorded for this period.
                      </p>
                    )}

                    {incomes.map((i) => (
                      <div
                        key={i.id}
                        className="flex items-center justify-between border dark:border-slate-700 rounded-lg p-3 text-xs"
                      >
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">
                            {i.category}
                          </p>
                          <p className="text-gray-500 dark:text-gray-400">
                            {i.transaction_date} • {i.payment_mode}
                            {i.bank_account_name ? ` • ${i.bank_account_name}` : ""}
                            {i.reference_no ? ` • ${i.reference_no}` : ""}
                            {i.description ? ` • ${i.description}` : ""}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-green-600">
                            ₹{i.amount}
                          </span>
                          {canWriteAccounts && (
                            <button
                              type="button"
                              onClick={() => deleteIncome(i.id)}
                              className="text-red-500 hover:text-red-700"
                              title="Delete income"
                            >
                              <i className="bi bi-trash" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        )}
        {/* ===================== INCOME SECTION END ==============================*/}

        {/* ===================== TRANSACTIONS SECTION START ======================*/}
        {activeSection === "transactions" && (
          <section className="section active p-0 space-y-6">
            {!canViewAccounts ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <i className="bi bi-lock text-3xl text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You don't have access to Transactions. Ask your Super
                  Admin for Accounts access.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Transactions
                  </h2>
                  <p className="text-xs sm:text-sm opacity-90">
                    The master ledger - every income and expense entry,
                    for review and reconciliation.
                  </p>
                </div>

                {/* STATS */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    {
                      label: "Total Income",
                      icon: "bi-graph-up-arrow",
                      badgeCls: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
                      value: `₹${transactionsSummary.total_income}`,
                      className: "text-green-600",
                    },
                    {
                      label: "Total Expense",
                      icon: "bi-graph-down-arrow",
                      badgeCls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
                      value: `₹${transactionsSummary.total_expense}`,
                      className: "text-red-500",
                    },
                    {
                      label: "Net",
                      icon: "bi-calculator",
                      badgeCls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                      value: `₹${transactionsSummary.net}`,
                      className:
                        transactionsSummary.net >= 0
                          ? "text-indigo-600"
                          : "text-red-500",
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {card.label}
                          </p>
                          <p className={`mt-2 text-2xl font-bold ${card.className}`}>
                            {card.value}
                          </p>
                        </div>
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.badgeCls}`}
                        >
                          <i className={`bi ${card.icon} text-lg`} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* FILTERS */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Type
                    </label>
                    <select
                      className="input mt-1 w-full"
                      value={transactionFilters.entry_type}
                      onChange={(e) =>
                        updateTransactionFilter("entry_type", e.target.value)
                      }
                    >
                      <option value="">All</option>
                      <option value="Income">Income</option>
                      <option value="Expense">Expense</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Month
                    </label>
                    <select
                      className="input mt-1 w-full"
                      value={transactionFilters.month}
                      onChange={(e) =>
                        updateTransactionFilter("month", Number(e.target.value))
                      }
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {new Date(2000, m - 1).toLocaleString("default", {
                            month: "long",
                          })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Year
                    </label>
                    <input
                      type="number"
                      className="input mt-1 w-full"
                      value={transactionFilters.year}
                      onChange={(e) =>
                        updateTransactionFilter("year", Number(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Bank Account
                    </label>
                    <select
                      className="input mt-1 w-full"
                      value={transactionFilters.bank_account_id}
                      onChange={(e) =>
                        updateTransactionFilter("bank_account_id", e.target.value)
                      }
                    >
                      <option value="">All</option>
                      {bankAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.account_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={applyTransactionFilters}
                      className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={resetTransactionFilters}
                      className="flex-1 border px-4 py-2 rounded-lg text-sm hover:bg-gray-100 dark:border-slate-600 dark:hover:bg-slate-700"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* LIST */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800 dark:text-white">
                      Ledger
                    </h3>
                    {transactionsLoading && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Loading...
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {!transactionsLoading && transactions.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-6">
                        No transactions match these filters.
                      </p>
                    )}

                    {transactions.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between border dark:border-slate-700 rounded-lg p-3 text-xs"
                      >
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">
                            {t.category}{" "}
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full ml-1 ${
                                t.entry_type === "Income"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-600"
                              }`}
                            >
                              {t.entry_type}
                            </span>
                          </p>
                          <p className="text-gray-500 dark:text-gray-400">
                            {t.transaction_date} • {t.payment_mode}
                            {t.bank_account_name ? ` • ${t.bank_account_name}` : ""}
                            {t.reference_no ? ` • ${t.reference_no}` : ""}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`font-semibold ${
                              t.entry_type === "Income"
                                ? "text-green-600"
                                : "text-red-500"
                            }`}
                          >
                            {t.entry_type === "Income" ? "+" : "-"}₹{t.amount}
                          </span>
                          {canWriteAccounts && (
                            <button
                              type="button"
                              disabled={transactionDeleting}
                              onClick={() => deleteTransaction(t.id)}
                              className="text-red-500 hover:text-red-700 disabled:opacity-50"
                              title="Delete transaction"
                            >
                              <i className="bi bi-trash" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        )}
        {/* ===================== TRANSACTIONS SECTION END ========================*/}

        {/* ===================== BANK ACCOUNTS SECTION START =====================*/}
        {activeSection === "bank-accounts" && (
          <section className="section active p-0 space-y-6">
            {!canViewAccounts ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <i className="bi bi-lock text-3xl text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You don't have access to Bank Accounts. Ask your Super
                  Admin for Accounts access.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold">
                        Bank Accounts
                      </h2>
                      <p className="text-xs sm:text-sm opacity-90">
                        Balances are computed from every income and
                        expense entry linked to each account.
                      </p>
                    </div>

                    {canWriteAccounts && (
                      <button
                        type="button"
                        onClick={() => setShowAccountForm((v) => !v)}
                        className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium shadow"
                      >
                        {showAccountForm ? "Cancel" : "+ Add Account"}
                      </button>
                    )}
                  </div>
                </div>

                {/* STATS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      label: "Total Accounts",
                      icon: "bi-bank",
                      badgeCls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                      value: bankAccountsSummary.total_accounts,
                      className: "text-gray-900 dark:text-white",
                    },
                    {
                      label: "Active",
                      icon: "bi-check-circle",
                      badgeCls: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
                      value: bankAccountsSummary.active_accounts,
                      className: "text-green-600",
                    },
                    {
                      label: "Total Balance (Active)",
                      icon: "bi-wallet2",
                      badgeCls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                      value: `₹${bankAccountsSummary.total_balance}`,
                      className: "text-indigo-600",
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {card.label}
                          </p>
                          <p className={`mt-2 text-2xl font-bold ${card.className}`}>
                            {card.value}
                          </p>
                        </div>
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.badgeCls}`}
                        >
                          <i className={`bi ${card.icon} text-lg`} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {showAccountForm && canWriteAccounts && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-3 -mt-1 mb-1 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                        <i className="bi bi-bank" />
                      </span>
                      <h4 className="text-sm font-bold text-gray-800 dark:text-white">
                        New Bank Account
                      </h4>
                    </div>
                    <input
                      className="input"
                      placeholder="Account Name (e.g. Main Operating Account)"
                      value={accountForm.account_name}
                      onChange={(e) =>
                        updateAccountForm("account_name", e.target.value)
                      }
                    />
                    <input
                      className="input"
                      placeholder="Bank Name"
                      value={accountForm.bank_name}
                      onChange={(e) => updateAccountForm("bank_name", e.target.value)}
                    />
                    <select
                      className="input"
                      value={accountForm.account_type}
                      onChange={(e) =>
                        updateAccountForm("account_type", e.target.value)
                      }
                    >
                      <option value="Current">Current</option>
                      <option value="Savings">Savings</option>
                    </select>
                    <input
                      className="input"
                      placeholder="Account Number"
                      value={accountForm.account_number}
                      onChange={(e) =>
                        updateAccountForm("account_number", e.target.value)
                      }
                    />
                    <input
                      className="input"
                      placeholder="IFSC Code (optional)"
                      value={accountForm.ifsc_code}
                      onChange={(e) => updateAccountForm("ifsc_code", e.target.value)}
                    />
                    <input
                      className="input"
                      type="number"
                      placeholder="Opening Balance"
                      value={accountForm.opening_balance}
                      onChange={(e) =>
                        updateAccountForm("opening_balance", e.target.value)
                      }
                    />
                    <input
                      className="input sm:col-span-3"
                      placeholder="Notes (optional)"
                      value={accountForm.notes}
                      onChange={(e) => updateAccountForm("notes", e.target.value)}
                    />

                    <button
                      type="button"
                      disabled={bankAccountSaving}
                      onClick={submitAccount}
                      className="sm:col-span-3 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {bankAccountSaving ? "Saving..." : "Save Account"}
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {bankAccountsLoading && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 col-span-full">
                      Loading...
                    </p>
                  )}

                  {!bankAccountsLoading && bankAccounts.length === 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 col-span-full text-center py-6">
                      No bank accounts added yet.
                    </p>
                  )}

                  {bankAccounts.map((a) => (
                    <div
                      key={a.id}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-sm text-gray-800 dark:text-white">
                            {a.account_name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {a.bank_name} • {a.masked_account_number} •{" "}
                            {a.account_type}
                          </p>
                        </div>
                        {!a.is_active && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                            Inactive
                          </span>
                        )}
                      </div>

                      <p className="text-xl font-bold text-indigo-600 mt-2">
                        ₹{a.current_balance}
                      </p>

                      {a.recent_transactions?.length > 0 && (
                        <div className="mt-3 space-y-1 border-t dark:border-slate-700 pt-2">
                          {a.recent_transactions.map((t) => (
                            <div
                              key={t.id}
                              className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400"
                            >
                              <span>
                                {t.category} • {t.transaction_date}
                              </span>
                              <span
                                className={
                                  t.entry_type === "Income"
                                    ? "text-green-600"
                                    : "text-red-500"
                                }
                              >
                                {t.entry_type === "Income" ? "+" : "-"}₹{t.amount}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {canWriteAccounts && (
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() =>
                              updateBankAccount(a.id, { is_active: !a.is_active })
                            }
                            className="text-xs border px-3 py-1 rounded-lg hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700"
                          >
                            {a.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteBankAccount(a.id)}
                            className="text-xs border border-red-300 text-red-600 px-3 py-1 rounded-lg hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
        {/* ===================== BANK ACCOUNTS SECTION END =======================*/}

        {/* ===================== FINANCIAL REPORTS SECTION START =================*/}
        {activeSection === "financial-reports" && (
          <section className="section active p-0 space-y-6">
            {!canViewAccounts ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <i className="bi bi-lock text-3xl text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You don't have access to Financial Reports. Ask your
                  Super Admin for Accounts access.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold">
                        Financial Reports
                      </h2>
                      <p className="text-xs sm:text-sm opacity-90">
                        The full picture: fee collections, payroll and
                        the general ledger, combined.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <select
                        className="input !bg-white/90 !text-gray-800 text-sm"
                        value={financialMonth}
                        onChange={(e) => setFinancialMonth(Number(e.target.value))}
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <option key={m} value={m}>
                            {new Date(2000, m - 1).toLocaleString("default", {
                              month: "long",
                            })}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        className="input !bg-white/90 !text-gray-800 text-sm w-24"
                        value={financialYear}
                        onChange={(e) => setFinancialYear(Number(e.target.value))}
                      />
                      <button
                        type="button"
                        onClick={applyFinancialPeriod}
                        className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium shadow"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>

                {financialLoading && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Loading...
                  </p>
                )}

                {/* HEADLINE */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      label: "Total Revenue",
                      value: `₹${financialSummary.total_revenue}`,
                      icon: "bi-graph-up-arrow",
                      badgeCls:
                        "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
                      valueCls: "text-green-600",
                    },
                    {
                      label: "Total Cost",
                      value: `₹${financialSummary.total_cost}`,
                      icon: "bi-graph-down-arrow",
                      badgeCls:
                        "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
                      valueCls: "text-red-500",
                    },
                    {
                      label: "Net",
                      value: `₹${financialSummary.net}`,
                      icon: "bi-wallet2",
                      badgeCls:
                        "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                      valueCls:
                        financialSummary.net >= 0 ? "text-indigo-600" : "text-red-500",
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {card.label}
                          </p>
                          <p className={`mt-2 text-2xl font-bold ${card.valueCls}`}>
                            {card.value}
                          </p>
                        </div>
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.badgeCls}`}
                        >
                          <i className={`bi ${card.icon} text-lg`} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* BREAKDOWN */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-3">
                      Revenue Sources
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">
                          Fee Collections
                        </span>
                        <span className="font-semibold text-green-600">
                          ₹{financialSummary.fee_collected}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">
                          Other Income
                        </span>
                        <span className="font-semibold text-green-600">
                          ₹{financialSummary.other_income}
                        </span>
                      </div>
                      <div className="flex justify-between border-t dark:border-slate-700 pt-2 font-bold text-gray-800 dark:text-white">
                        <span>Total Revenue</span>
                        <span>₹{financialSummary.total_revenue}</span>
                      </div>
                      <p className="text-xs text-gray-400 pt-1">
                        Fee outstanding (not yet collected): ₹
                        {financialSummary.fee_outstanding}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-3">
                      Cost Sources
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">
                          Payroll (Paid)
                        </span>
                        <span className="font-semibold text-red-500">
                          ₹{financialSummary.payroll_paid}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">
                          Other Expenses
                        </span>
                        <span className="font-semibold text-red-500">
                          ₹{financialSummary.other_expense}
                        </span>
                      </div>
                      <div className="flex justify-between border-t dark:border-slate-700 pt-2 font-bold text-gray-800 dark:text-white">
                        <span>Total Cost</span>
                        <span>₹{financialSummary.total_cost}</span>
                      </div>
                      <p className="text-xs text-gray-400 pt-1">
                        Payroll pending (not yet paid): ₹
                        {financialSummary.payroll_pending}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 6-MONTH TREND */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
                  <h3 className="font-bold text-gray-800 dark:text-white mb-4">
                    Revenue vs Cost (Last 6 Months)
                  </h3>

                  <div className="flex items-end gap-3 h-40">
                    {financialTrend.map((m) => {
                      const max = Math.max(
                        1,
                        ...financialTrend.map((x) => Math.max(x.revenue, x.cost)),
                      );
                      const revenueH = Math.max(2, Math.round((m.revenue / max) * 100));
                      const costH = Math.max(2, Math.round((m.cost / max) * 100));
                      return (
                        <div
                          key={`${m.year}-${m.month}`}
                          className="flex-1 flex flex-col items-center justify-end h-full"
                        >
                          <div className="flex items-end gap-1 h-full w-full justify-center">
                            <div
                              className="w-3 bg-green-500 rounded-t-md"
                              style={{ height: `${revenueH}%` }}
                              title={`Revenue ₹${m.revenue}`}
                            />
                            <div
                              className="w-3 bg-red-400 rounded-t-md"
                              style={{ height: `${costH}%` }}
                              title={`Cost ₹${m.cost}`}
                            />
                          </div>
                          <span className="mt-1 text-[9px] text-gray-500 dark:text-gray-400">
                            {m.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-green-500" /> Revenue
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-400" /> Cost
                    </span>
                  </div>
                </div>
              </>
            )}
          </section>
        )}
        {/* ===================== FINANCIAL REPORTS SECTION END ===================*/}

        {/* ===================== PROFIT & LOSS SECTION START =====================*/}
        {activeSection === "profit-loss" && (
          <section className="section active p-0 space-y-6">
            {!canViewAccounts ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <i className="bi bi-lock text-3xl text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You don't have access to Profit & Loss. Ask your Super
                  Admin for Accounts access.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold">
                        Profit &amp; Loss
                      </h2>
                      <p className="text-xs sm:text-sm opacity-90">
                        {plPeriodLabel || "Monthly statement"}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <select
                        className="input !bg-white/90 !text-gray-800 text-sm"
                        value={plMonth}
                        onChange={(e) => setPlMonth(Number(e.target.value))}
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <option key={m} value={m}>
                            {new Date(2000, m - 1).toLocaleString("default", {
                              month: "long",
                            })}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        className="input !bg-white/90 !text-gray-800 text-sm w-24"
                        value={plYear}
                        onChange={(e) => setPlYear(Number(e.target.value))}
                      />
                      <button
                        type="button"
                        onClick={applyPlPeriod}
                        className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium shadow"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>

                {plLoading && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Loading...
                  </p>
                )}

                {/* NET PROFIT HEADLINE + COMPARISON */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      label: "Net Profit / Loss",
                      value: `₹${plStatement.net_profit}`,
                      icon: plStatement.net_profit >= 0 ? "bi-graph-up-arrow" : "bi-graph-down-arrow",
                      badgeCls:
                        plStatement.net_profit >= 0
                          ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300"
                          : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
                      valueCls: plStatement.net_profit >= 0 ? "text-green-600" : "text-red-500",
                    },
                    {
                      label: `Previous Month (${plPreviousPeriod.label || "—"})`,
                      value: `₹${plPreviousPeriod.net_profit}`,
                      icon: "bi-calendar-minus",
                      badgeCls:
                        "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300",
                      valueCls: "text-gray-600 dark:text-gray-300",
                    },
                    {
                      label: "Total Revenue",
                      value: `₹${plStatement.revenue.total}`,
                      icon: "bi-cash-stack",
                      badgeCls:
                        "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                      valueCls: "text-indigo-600",
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {card.label}
                          </p>
                          <p className={`mt-2 text-2xl font-bold ${card.valueCls}`}>
                            {card.value}
                          </p>
                        </div>
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.badgeCls}`}
                        >
                          <i className={`bi ${card.icon} text-lg`} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* STATEMENT */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-100 dark:border-slate-700">
                    <h3 className="font-bold text-gray-800 dark:text-white">
                      Statement - {plPeriodLabel}
                    </h3>
                  </div>

                  <div className="p-5 space-y-6">
                    {/* REVENUE */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wide text-green-600 mb-2">
                        Revenue
                      </h4>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">
                            Fee Collections
                          </span>
                          <span className="font-medium text-gray-800 dark:text-white">
                            ₹{plStatement.revenue.fee_collections}
                          </span>
                        </div>
                        {plStatement.revenue.other_income.map((row) => (
                          <div key={row.category} className="flex justify-between pl-3">
                            <span className="text-gray-500 dark:text-gray-400">
                              {row.category}
                            </span>
                            <span className="text-gray-700 dark:text-gray-200">
                              ₹{row.amount}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between border-t dark:border-slate-700 pt-2 font-bold text-gray-800 dark:text-white">
                          <span>Total Revenue</span>
                          <span>₹{plStatement.revenue.total}</span>
                        </div>
                      </div>
                    </div>

                    {/* EXPENSES */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wide text-red-500 mb-2">
                        Expenses
                      </h4>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">
                            Payroll
                          </span>
                          <span className="font-medium text-gray-800 dark:text-white">
                            ₹{plStatement.expenses.payroll}
                          </span>
                        </div>
                        {plStatement.expenses.other_expenses.map((row) => (
                          <div key={row.category} className="flex justify-between pl-3">
                            <span className="text-gray-500 dark:text-gray-400">
                              {row.category}
                            </span>
                            <span className="text-gray-700 dark:text-gray-200">
                              ₹{row.amount}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between border-t dark:border-slate-700 pt-2 font-bold text-gray-800 dark:text-white">
                          <span>Total Expenses</span>
                          <span>₹{plStatement.expenses.total}</span>
                        </div>
                      </div>
                    </div>

                    {/* NET */}
                    <div
                      className={`flex justify-between items-center rounded-xl p-4 font-bold ${
                        plStatement.net_profit >= 0
                          ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300"
                          : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                      }`}
                    >
                      <span>Net {plStatement.net_profit >= 0 ? "Profit" : "Loss"}</span>
                      <span className="text-lg">₹{plStatement.net_profit}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        )}
        {/* ===================== PROFIT & LOSS SECTION END =======================*/}

        {/* ===================== NOTIFICATIONS SECTION START =====================*/}
        {activeSection === "notifications" && (
          <section className="section active p-0 space-y-6">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Notifications
                  </h2>
                  <p className="text-xs sm:text-sm opacity-90">
                    Fee reminders, payroll alerts and general
                    announcements, all in one place.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {canWriteAccounts && (
                    <button
                      type="button"
                      onClick={openNotifModal}
                      className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium shadow"
                    >
                      <i className="bi bi-plus-lg mr-1.5" />
                      Create Notification
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={!totalUnread}
                    onClick={() => {
                      (sortedNotifications || [])
                        .filter((item) => !item.is_read)
                        .forEach((item) => {
                          if (item.source === "notice") {
                            markNoticeAsRead?.(item.id);
                          } else {
                            markNotificationRead?.(item.id);
                          }
                        });
                    }}
                    className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm transition border border-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <i className="bi bi-check2-all mr-1.5" />
                    Mark All Read
                  </button>
                </div>
              </div>
            </div>

            {/* CREATE NOTIFICATION MODAL */}
            {notifModalOpen && (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget && !notifSaving) {
                    closeNotifModal();
                  }
                }}
              >
                <form
                  onSubmit={submitNotification}
                  className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Create Notification
                    </h2>
                    <button
                      type="button"
                      onClick={closeNotifModal}
                      disabled={notifSaving}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>

                  <div className="space-y-4 px-6 py-5">
                    {notifError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                        {notifError}
                      </div>
                    )}

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={notifForm.title}
                        onChange={(e) => updateNotifForm("title", e.target.value)}
                        autoFocus
                        placeholder="e.g. Term 2 Fee Due by 15th"
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Message <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        value={notifForm.message}
                        onChange={(e) => updateNotifForm("message", e.target.value)}
                        placeholder="Details for this notification..."
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Category
                        </label>
                        <select
                          value={notifForm.category}
                          onChange={(e) => updateNotifForm("category", e.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        >
                          {notifCategoryOptions.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Priority
                        </label>
                        <select
                          value={notifForm.priority}
                          onChange={(e) => updateNotifForm("priority", e.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Audience
                        </label>
                        <select
                          value={notifForm.audience}
                          onChange={(e) => updateNotifForm("audience", e.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        >
                          {notifAudienceOptions.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/50 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeNotifModal}
                      disabled={notifSaving}
                      className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-white disabled:opacity-60 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={notifSaving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {notifSaving ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Sending...
                        </>
                      ) : (
                        "Send Notification"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STATS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Total",
                  value: (sortedNotifications || []).length,
                  icon: "bi-bell",
                  badgeCls:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Unread",
                  value: totalUnread || 0,
                  icon: "bi-envelope-exclamation",
                  badgeCls:
                    "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
                },
                {
                  label: "Announcements",
                  value: (announcements || []).length,
                  icon: "bi-megaphone",
                  badgeCls:
                    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                },
                {
                  label: "Alerts",
                  value: (notifications || []).length,
                  icon: "bi-exclamation-circle",
                  badgeCls:
                    "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {stat.label}
                      </p>
                      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                        {stat.value}
                      </p>
                    </div>
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.badgeCls}`}
                    >
                      <i className={`bi ${stat.icon} text-lg`} />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* FILTERS + LIST */}
            {(() => {
              const filtered = (sortedNotifications || []).filter((item) => {
                if (notifFilterTab === "unread" && item.is_read) return false;
                if (notifFilterTab === "announcements" && item.source !== "notice")
                  return false;
                if (notifFilterTab === "alerts" && item.source === "notice")
                  return false;

                if (!notifSearch.trim()) return true;

                const q = notifSearch.toLowerCase();
                return (
                  (item.title || "").toLowerCase().includes(q) ||
                  (item.message || "").toLowerCase().includes(q)
                );
              });

              return (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden dark:border-slate-700 dark:bg-slate-800">
                  <div className="p-5 border-b border-gray-100 dark:border-slate-700 space-y-4">
                    <div className="relative">
                      <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="search"
                        value={notifSearch}
                        onChange={(e) => setNotifSearch(e.target.value)}
                        placeholder="Search notifications..."
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: "all", label: "All" },
                        { key: "unread", label: "Unread" },
                        { key: "announcements", label: "Announcements" },
                        { key: "alerts", label: "Alerts" },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setNotifFilterTab(tab.key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            notifFilterTab === tab.key
                              ? "bg-indigo-600 text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="max-h-[32rem] overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700">
                    {notificationLoading || noticeLoading ? (
                      <div className="flex flex-col items-center gap-3 py-16 text-gray-500">
                        <span className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                        Loading notifications...
                      </div>
                    ) : filtered.length === 0 ? (
                      <p className="py-16 text-center text-sm text-gray-400">
                        {notifSearch
                          ? "No notifications match your search."
                          : "🎉 You're all caught up"}
                      </p>
                    ) : (
                      filtered.map((item) => (
                        <button
                          type="button"
                          key={`${item.source}-${item.id}-${item.time || item.date}`}
                          onClick={() =>
                            handleNotificationClick && handleNotificationClick(item)
                          }
                          className={`w-full p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-700/50 ${
                            !item.is_read ? "bg-indigo-50/40 dark:bg-indigo-500/5" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
                                item.source === "notice"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                  : "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300"
                              }`}
                            >
                              {item.source === "notice" ? "📢" : "📩"}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate font-semibold text-gray-800 dark:text-white">
                                  {item.title}
                                </p>
                                {!item.is_read && (
                                  <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                                )}
                              </div>

                              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                                {item.message || ""}
                              </p>

                              <p className="mt-1 text-xs text-gray-400">{item.time}</p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}
          </section>
        )}
        {/* ===================== NOTIFICATIONS SECTION END =======================*/}

        {/* ===================== ACTIVITY LOGS SECTION START (Super Admin only) ==*/}
        {activeSection === "logs" && (
          <section className="section active p-0 space-y-6">
            {!isSuperAdmin ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <i className="bi bi-shield-lock text-3xl text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Activity Logs are visible to Super Admin only.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Activity Logs
                  </h2>
                  <p className="text-xs sm:text-sm opacity-90">
                    Every action the Accounts Admin has taken on this
                    dashboard - Super Admin oversight only.
                  </p>
                </div>

                {/* STATS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    {
                      label: "Total Actions",
                      value: activityLogsSummary.total,
                      icon: "bi-list-check",
                      badgeCls:
                        "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                    },
                    {
                      label: "Flagged Alerts",
                      value: activityLogsSummary.alert_count,
                      icon: "bi-exclamation-triangle",
                      badgeCls:
                        "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
                    },
                    {
                      label: "Period",
                      value: `${activityLogsSummary.period_days} days`,
                      icon: "bi-calendar-range",
                      badgeCls:
                        "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
                    },
                    {
                      label: "Accounts Admins",
                      value: activityLogsAdmins.length,
                      icon: "bi-people",
                      badgeCls:
                        "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300",
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {card.label}
                          </p>
                          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                            {card.value}
                          </p>
                        </div>
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.badgeCls}`}
                        >
                          <i className={`bi ${card.icon} text-lg`} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* FILTERS */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Search
                    </label>
                    <input
                      type="text"
                      value={activityLogsFilters.search}
                      onChange={(e) => updateActivityLogsFilter("search", e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && applyActivityLogsFilters()
                      }
                      placeholder="Search description or action..."
                      className="input mt-1 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Accounts Admin
                    </label>
                    <select
                      className="input mt-1 w-full"
                      value={activityLogsFilters.admin_id}
                      onChange={(e) => updateActivityLogsFilter("admin_id", e.target.value)}
                    >
                      <option value="">All</option>
                      {activityLogsAdmins.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Period
                    </label>
                    <select
                      className="input mt-1 w-full"
                      value={activityLogsFilters.days}
                      onChange={(e) =>
                        updateActivityLogsFilter("days", Number(e.target.value))
                      }
                    >
                      <option value={7}>Last 7 days</option>
                      <option value={30}>Last 30 days</option>
                      <option value={90}>Last 90 days</option>
                      <option value={365}>Last year</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={applyActivityLogsFilters}
                      className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={resetActivityLogsFilters}
                      className="flex-1 border px-4 py-2 rounded-lg text-sm hover:bg-gray-100 dark:border-slate-600 dark:hover:bg-slate-700"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* LOG LIST */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-100 dark:border-slate-700">
                    <h3 className="font-bold text-gray-800 dark:text-white">
                      Log
                    </h3>
                  </div>

                  <div className="max-h-[36rem] overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700">
                    {activityLogsLoading && (
                      <p className="p-6 text-center text-xs text-gray-500 dark:text-gray-400">
                        Loading...
                      </p>
                    )}

                    {!activityLogsLoading && activityLogs.length === 0 && (
                      <p className="p-10 text-center text-sm text-gray-400">
                        No activity recorded in this period.
                      </p>
                    )}

                    {activityLogs.map((log) => (
                      <div
                        key={log.id}
                        className={`p-4 flex items-start gap-3 ${
                          log.is_alert ? "bg-red-50/60 dark:bg-red-500/5" : ""
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            log.is_alert
                              ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300"
                              : "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300"
                          }`}
                        >
                          <i
                            className={`bi ${
                              log.is_alert ? "bi-exclamation-triangle-fill" : "bi-check2"
                            } text-sm`}
                          />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-sm text-gray-800 dark:text-white">
                              {log.admin_name}
                            </p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-300 uppercase tracking-wide">
                              {log.action}
                            </span>
                            {log.is_alert && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300 font-semibold">
                                FLAGGED
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                            {log.description}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {log.created_at
                              ? new Date(log.created_at).toLocaleString()
                              : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        )}
        {/* ===================== ACTIVITY LOGS SECTION END ========================*/}

        {/* ===================== PROFILE SECTION START ========================*/}
        {activeSection === "settings" && (
          <SettingsPanel
            user={admin}
            darkMode={darkMode}
            onToggleTheme={toggleTheme}
            onChangePassword={() => setPasswordModalOpen(true)}
            onLogout={handleLogout}
          />
        )}

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
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-[100]">
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

        {/* ===================== STUDENT FEE DETAILS MODAL ====================*/}
        {feeModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-[100] p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-slate-700">
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b dark:border-slate-700 p-5 flex items-start justify-between z-10">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {feeModalStudent
                      ? feeModalStudent.name
                      : "Loading..."}
                  </h2>
                  {feeModalStudent && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {feeModalStudent.student_id} • {feeModalStudent.class_name}
                      {feeModalStudent.roll_number
                        ? ` • Roll #${feeModalStudent.roll_number}`
                        : ""}{" "}
                      • {feeModalStudent.email || "No email"} •{" "}
                      {feeModalStudent.mobile || "No mobile"}
                    </p>
                  )}
                  {feeModalStudent &&
                    (feeModalStudent.father_name || feeModalStudent.parent_name) && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Parent: {feeModalStudent.father_name || feeModalStudent.parent_name}
                        {" • "}
                        {feeModalStudent.father_mobile ||
                          feeModalStudent.parent_mobile ||
                          "No contact"}
                      </p>
                    )}
                </div>

                <button
                  onClick={closeStudentFeeDetails}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl leading-none"
                >
                  &times;
                </button>
              </div>

              <div className="p-5 space-y-5">
                {feeModalLoading ? (
                  <div className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">
                    Loading fee details...
                  </div>
                ) : (
                  <>
                    {/* SUMMARY */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        {
                          label: "Total Billed",
                          icon: "bi-receipt",
                          badgeCls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                          value: `₹${feeModalSummary.total_billed}`,
                          className: "text-gray-900 dark:text-white",
                        },
                        {
                          label: "Total Paid",
                          icon: "bi-check-circle",
                          badgeCls: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
                          value: `₹${feeModalSummary.total_paid}`,
                          className: "text-green-600",
                        },
                        {
                          label: "Pending",
                          icon: "bi-hourglass-split",
                          badgeCls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                          value: `₹${feeModalSummary.total_pending}`,
                          className: "text-amber-500",
                        },
                        {
                          label: "Overdue",
                          icon: "bi-alarm",
                          badgeCls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
                          value: feeModalSummary.overdue_installments,
                          className: "text-red-500",
                        },
                      ].map((card) => (
                        <div
                          key={card.label}
                          className="bg-gray-50 dark:bg-slate-700 p-3 rounded-xl text-center"
                        >
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {card.label}
                          </p>
                          <h3 className={`font-bold text-sm ${card.className}`}>
                            {card.value}
                          </h3>
                        </div>
                      ))}
                    </div>

                    {/* INSTALLMENTS */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-sm text-gray-800 dark:text-white">
                          Fee Installments
                        </h3>

                        {canWriteAccounts && (
                          <button
                            type="button"
                            onClick={() => setShowInstallmentForm((v) => !v)}
                            className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
                          >
                            {showInstallmentForm ? "Cancel" : "+ Add Installment"}
                          </button>
                        )}
                      </div>

                      {showInstallmentForm && canWriteAccounts && (
                        <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3 mb-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-3 flex items-center gap-2 mb-1">
                        <i className="bi bi-receipt text-indigo-600 dark:text-indigo-400" />
                        <h5 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          New Fee Installment
                        </h5>
                      </div>
                          <input
                            className="input"
                            placeholder="Title (e.g. Term 1 Tuition)"
                            value={installmentForm.title}
                            onChange={(e) =>
                              updateInstallmentForm("title", e.target.value)
                            }
                          />
                          <select
                            className="input"
                            value={installmentForm.fee_category}
                            onChange={(e) =>
                              updateInstallmentForm("fee_category", e.target.value)
                            }
                          >
                            {[
                              "Tuition", "Admission", "Transport", "Hostel", "Exam",
                              "Library", "Lab", "Sports", "Miscellaneous",
                            ].map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <input
                            className="input"
                            placeholder="Academic Year (2026-2027)"
                            value={installmentForm.academic_year}
                            onChange={(e) =>
                              updateInstallmentForm("academic_year", e.target.value)
                            }
                          />
                          <input
                            className="input"
                            type="number"
                            placeholder="Amount"
                            value={installmentForm.amount}
                            onChange={(e) =>
                              updateInstallmentForm("amount", e.target.value)
                            }
                          />
                          <input
                            className="input"
                            type="number"
                            placeholder="Late Fee"
                            value={installmentForm.late_fee}
                            onChange={(e) =>
                              updateInstallmentForm("late_fee", e.target.value)
                            }
                          />
                          <input
                            className="input"
                            type="number"
                            placeholder="Discount"
                            value={installmentForm.discount}
                            onChange={(e) =>
                              updateInstallmentForm("discount", e.target.value)
                            }
                          />
                          <input
                            className="input"
                            type="date"
                            value={installmentForm.due_date}
                            onChange={(e) =>
                              updateInstallmentForm("due_date", e.target.value)
                            }
                          />
                          <input
                            className="input sm:col-span-2"
                            placeholder="Remarks (optional)"
                            value={installmentForm.remarks}
                            onChange={(e) =>
                              updateInstallmentForm("remarks", e.target.value)
                            }
                          />

                          <button
                            type="button"
                            disabled={feeModalSaving}
                            onClick={submitInstallment}
                            className="sm:col-span-3 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {feeModalSaving ? "Saving..." : "Save Installment"}
                          </button>
                        </div>
                      )}

                      <div className="space-y-2">
                        {feeModalInstallments.length === 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            No fee installments yet.
                          </p>
                        )}

                        {feeModalInstallments.map((inst) => (
                          <div
                            key={inst.id}
                            className="border dark:border-slate-700 rounded-lg p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-gray-800 dark:text-white">
                                  {inst.title}{" "}
                                  <span className="text-[10px] text-gray-400">
                                    ({inst.fee_category})
                                  </span>
                                </p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                  Due {inst.due_date} • Net ₹{inst.net_payable} • Paid ₹
                                  {inst.paid_amount} • Balance ₹{inst.balance}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                                    inst.status === "Paid"
                                      ? "bg-green-100 text-green-700"
                                      : inst.status === "Overdue"
                                        ? "bg-red-100 text-red-600"
                                        : inst.status === "Partial"
                                          ? "bg-amber-100 text-amber-700"
                                          : inst.status === "Waived"
                                            ? "bg-gray-200 text-gray-600"
                                            : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {inst.status}
                                </span>

                                {canWriteAccounts && inst.balance > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => togglePayment(inst)}
                                    className="text-[11px] bg-green-600 text-white px-2 py-1 rounded-lg hover:bg-green-700"
                                  >
                                    Record Payment
                                  </button>
                                )}
                              </div>
                            </div>

                            {payingInstallmentId === inst.id && canWriteAccounts && (
                              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <input
                                  className="input"
                                  type="number"
                                  placeholder="Amount"
                                  value={paymentForm.amount}
                                  onChange={(e) =>
                                    updatePaymentForm("amount", e.target.value)
                                  }
                                />
                                <select
                                  className="input"
                                  value={paymentForm.payment_mode}
                                  onChange={(e) =>
                                    updatePaymentForm("payment_mode", e.target.value)
                                  }
                                >
                                  {["Cash", "Card", "UPI", "Bank Transfer", "Cheque", "Online"].map(
                                    (m) => (
                                      <option key={m} value={m}>
                                        {m}
                                      </option>
                                    ),
                                  )}
                                </select>
                                <input
                                  className="input"
                                  placeholder="Transaction Ref"
                                  value={paymentForm.transaction_ref}
                                  onChange={(e) =>
                                    updatePaymentForm("transaction_ref", e.target.value)
                                  }
                                />
                                <input
                                  className="input"
                                  type="date"
                                  value={paymentForm.payment_date}
                                  onChange={(e) =>
                                    updatePaymentForm("payment_date", e.target.value)
                                  }
                                />

                                <button
                                  type="button"
                                  disabled={feeModalSaving}
                                  onClick={() => submitPayment(inst.id)}
                                  className="col-span-2 sm:col-span-4 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                                >
                                  {feeModalSaving ? "Saving..." : "Confirm Payment"}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* PAYMENT HISTORY */}
                    <div>
                      <h3 className="font-semibold text-sm text-gray-800 dark:text-white mb-2">
                        Payment History
                      </h3>

                      {feeModalPayments.length === 0 ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          No payments recorded yet.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {feeModalPayments.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between border dark:border-slate-700 rounded-lg p-3 text-xs"
                            >
                              <div>
                                <p className="font-medium text-gray-800 dark:text-white">
                                  ₹{p.amount} • {p.payment_mode}
                                </p>
                                <p className="text-gray-500 dark:text-gray-400">
                                  {p.receipt_number} • {p.payment_date}
                                </p>
                              </div>
                              <span
                                className={`px-2 py-1 rounded-full font-medium ${
                                  p.status === "Success"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-600"
                                }`}
                              >
                                {p.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================== STAFF SALARY DETAILS MODAL ===================*/}
        {salaryModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-[100] p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-slate-700">
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b dark:border-slate-700 p-5 flex items-start justify-between z-10">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {salaryModalStaff ? salaryModalStaff.name : "Loading..."}
                  </h2>
                  {salaryModalStaff && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {salaryModalStaff.staff_code} • {salaryModalStaff.designation}
                      {salaryModalStaff.department
                        ? ` • ${salaryModalStaff.department}`
                        : ""}{" "}
                      • {salaryModalStaff.email || "No email"} •{" "}
                      {salaryModalStaff.mobile || "No mobile"}
                    </p>
                  )}
                </div>

                <button
                  onClick={closeStaffSalaryDetails}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl leading-none"
                >
                  &times;
                </button>
              </div>

              <div className="p-5 space-y-5">
                {salaryModalLoading ? (
                  <div className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">
                    Loading salary details...
                  </div>
                ) : (
                  <>
                    {/* SUMMARY */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          label: "Paid This Year",
                          icon: "bi-cash-coin",
                          badgeCls: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
                          value: `₹${salaryModalSummary.paid_this_year}`,
                          className: "text-green-600",
                        },
                        {
                          label: "Payslips",
                          icon: "bi-receipt-cutoff",
                          badgeCls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                          value: salaryModalSummary.payslip_count,
                          className: "text-gray-900 dark:text-white",
                        },
                        {
                          label: "Pending",
                          icon: "bi-hourglass-split",
                          badgeCls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                          value: salaryModalSummary.pending_payslips,
                          className: "text-amber-500",
                        },
                      ].map((card) => (
                        <div
                          key={card.label}
                          className="bg-gray-50 dark:bg-slate-700 p-3 rounded-xl text-center"
                        >
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {card.label}
                          </p>
                          <h3 className={`font-bold text-sm ${card.className}`}>
                            {card.value}
                          </h3>
                        </div>
                      ))}
                    </div>

                    {/* SALARY STRUCTURE */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-sm text-gray-800 dark:text-white">
                          Salary Structure
                        </h3>

                        {canWriteAccounts && (
                          <button
                            type="button"
                            onClick={() =>
                              showSalaryForm
                                ? setShowSalaryForm(false)
                                : openSalaryEditForm()
                            }
                            className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
                          >
                            {showSalaryForm
                              ? "Cancel"
                              : salaryModalStructure
                                ? "Edit Structure"
                                : "+ Set Up Structure"}
                          </button>
                        )}
                      </div>

                      {!showSalaryForm && salaryModalStructure && (
                        <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                          <p>Basic: ₹{salaryModalStructure.basic}</p>
                          <p>HRA: ₹{salaryModalStructure.hra}</p>
                          <p>DA: ₹{salaryModalStructure.da}</p>
                          <p>Conveyance: ₹{salaryModalStructure.conveyance_allowance}</p>
                          <p>Medical: ₹{salaryModalStructure.medical_allowance}</p>
                          <p>Other Allowance: ₹{salaryModalStructure.other_allowance}</p>
                          <p>PF: ₹{salaryModalStructure.provident_fund}</p>
                          <p>Prof. Tax: ₹{salaryModalStructure.professional_tax}</p>
                          <p>Income Tax: ₹{salaryModalStructure.income_tax}</p>
                          <p className="col-span-2 sm:col-span-3 font-semibold text-gray-800 dark:text-white pt-1 border-t dark:border-slate-600">
                            Gross ₹{salaryModalStructure.gross} − Deductions ₹
                            {salaryModalStructure.total_deductions} = Net ₹
                            {salaryModalStructure.net}
                          </p>
                        </div>
                      )}

                      {!showSalaryForm && !salaryModalStructure && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          No salary structure set up yet.
                        </p>
                      )}

                      {showSalaryForm && canWriteAccounts && (
                        <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div className="col-span-2 sm:col-span-3 flex items-center gap-2 mb-1">
                        <i className="bi bi-wallet2 text-indigo-600 dark:text-indigo-400" />
                        <h5 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Salary Structure
                        </h5>
                      </div>
                          {[
                            ["basic", "Basic"],
                            ["hra", "HRA"],
                            ["da", "DA"],
                            ["conveyance_allowance", "Conveyance"],
                            ["medical_allowance", "Medical"],
                            ["other_allowance", "Other Allowance"],
                            ["provident_fund", "Provident Fund"],
                            ["professional_tax", "Professional Tax"],
                            ["income_tax", "Income Tax"],
                            ["other_deduction", "Other Deduction"],
                          ].map(([key, label]) => (
                            <input
                              key={key}
                              className="input"
                              type="number"
                              placeholder={label}
                              value={salaryForm[key]}
                              onChange={(e) =>
                                updateSalaryForm(key, e.target.value)
                              }
                            />
                          ))}

                          <button
                            type="button"
                            disabled={salaryModalSaving}
                            onClick={submitSalaryStructure}
                            className="col-span-2 sm:col-span-3 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {salaryModalSaving ? "Saving..." : "Save Salary Structure"}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* PAYSLIPS */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-sm text-gray-800 dark:text-white">
                          Payslips
                        </h3>

                        {canWriteAccounts && salaryModalStructure && (
                          <button
                            type="button"
                            onClick={() => setShowPayslipForm((v) => !v)}
                            className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
                          >
                            {showPayslipForm ? "Cancel" : "+ Generate Payslip"}
                          </button>
                        )}
                      </div>

                      {showPayslipForm && canWriteAccounts && (
                        <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                      <div className="col-span-2 sm:col-span-4 flex items-center gap-2 mb-1">
                        <i className="bi bi-receipt-cutoff text-indigo-600 dark:text-indigo-400" />
                        <h5 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Generate Payslip
                        </h5>
                      </div>
                          <select
                            className="input"
                            value={payslipForm.month}
                            onChange={(e) =>
                              updatePayslipForm("month", Number(e.target.value))
                            }
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                              <option key={m} value={m}>
                                {new Date(2000, m - 1).toLocaleString("default", {
                                  month: "long",
                                })}
                              </option>
                            ))}
                          </select>
                          <input
                            className="input"
                            type="number"
                            placeholder="Year"
                            value={payslipForm.year}
                            onChange={(e) =>
                              updatePayslipForm("year", Number(e.target.value))
                            }
                          />
                          <input
                            className="input"
                            type="number"
                            placeholder="Working Days"
                            value={payslipForm.working_days}
                            onChange={(e) =>
                              updatePayslipForm("working_days", Number(e.target.value))
                            }
                          />
                          <input
                            className="input"
                            type="number"
                            placeholder="LOP Days"
                            value={payslipForm.lop_days}
                            onChange={(e) =>
                              updatePayslipForm("lop_days", Number(e.target.value))
                            }
                          />

                          <button
                            type="button"
                            disabled={salaryModalSaving}
                            onClick={submitPayslip}
                            className="col-span-2 sm:col-span-4 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {salaryModalSaving ? "Generating..." : "Generate Payslip"}
                          </button>
                        </div>
                      )}

                      <div className="space-y-2">
                        {salaryModalPayslips.length === 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            No payslips generated yet.
                          </p>
                        )}

                        {salaryModalPayslips.map((slip) => (
                          <div
                            key={slip.id}
                            className="flex items-center justify-between border dark:border-slate-700 rounded-lg p-3 text-xs"
                          >
                            <div>
                              <p className="font-medium text-gray-800 dark:text-white">
                                {new Date(2000, slip.month - 1).toLocaleString("default", {
                                  month: "long",
                                })}{" "}
                                {slip.year} • Net ₹{slip.net_salary}
                              </p>
                              <p className="text-gray-500 dark:text-gray-400">
                                Gross ₹{slip.gross_salary} − Deductions ₹
                                {slip.total_deductions}
                                {slip.payment_date ? ` • Paid ${slip.payment_date}` : ""}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-1 rounded-full font-medium ${
                                  slip.status === "Paid"
                                    ? "bg-green-100 text-green-700"
                                    : slip.status === "Failed"
                                      ? "bg-red-100 text-red-600"
                                      : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {slip.status}
                              </span>

                              {canWriteAccounts && slip.status !== "Paid" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    markPayslipPaid(
                                      salaryModalStaff.record_type,
                                      salaryModalStaff.id,
                                      slip.id,
                                      { payment_mode: "Bank Transfer" },
                                    )
                                  }
                                  className="bg-green-600 text-white px-2 py-1 rounded-lg hover:bg-green-700"
                                >
                                  Mark Paid
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
