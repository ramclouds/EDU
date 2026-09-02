import { useNavigate, useLocation } from "react-router-dom";
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
import { useDashboardAccess } from "../controllers/Auth/useDashboardAccess";
import { useHostelPermission } from "../controllers/Hostel/useHostelPermission";
import { useHostelBlocksFloors } from "../controllers/Hostel/useHostelBlocksFloors";
import { useHostelRooms } from "../controllers/Hostel/useHostelRooms";
import { useHostelBeds } from "../controllers/Hostel/useHostelBeds";
import { useHostelStudents } from "../controllers/Hostel/useHostelStudents";
import { useHostelRoomAllotment } from "../controllers/Hostel/useHostelRoomAllotment";
import { useHostelStaff } from "../controllers/Hostel/useHostelStaff";
import { useHostelVisitors } from "../controllers/Hostel/useHostelVisitors";
import { useHostelAttendance } from "../controllers/Hostel/useHostelAttendance";
import { useHostelMovement } from "../controllers/Hostel/useHostelMovement";
import { useHostelLeaveRequests } from "../controllers/Hostel/useHostelLeaveRequests";
import {
  useHostelMessMenu,
  MESS_MENU_DAYS,
  MESS_MENU_MEALS,
} from "../controllers/Hostel/useHostelMessMenu";
import { useHostelMealAttendance } from "../controllers/Hostel/useHostelMealAttendance";
import { useHostelComplaints } from "../controllers/Hostel/useHostelComplaints";
import { useHostelMaintenance } from "../controllers/Hostel/useHostelMaintenance";
import { useHostelFeeManagement } from "../controllers/Hostel/useHostelFeeManagement";
import { useHostelPayments } from "../controllers/Hostel/useHostelPayments";
import { useHostelPendingDues } from "../controllers/Hostel/useHostelPendingDues";
import { useHostelReports } from "../controllers/Hostel/useHostelReports";
import { useHostelActivityLogs } from "../controllers/Hostel/useHostelActivityLogs";

function AdminDashboard() {
  // UI STATE (LOCAL COMPONENT STATE)
  const location = useLocation();

  const [activeSection, setActiveSection] = useState(
    location.state?.activeSection || "dashboard",
  );
  const [search, setSearch] = useState("");

  // ================= NOTIFICATIONS SECTION (LOCAL UI STATE) =================
  const [notificationFilter, setNotificationFilter] = useState("all"); // "all" | "unread"

  // ================= ANNOUNCEMENTS SECTION (LOCAL UI STATE) =================
  const [noticeSearch, setNoticeSearch] = useState("");
  const [noticePriorityFilter, setNoticePriorityFilter] = useState("all");
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [noticeModalMode, setNoticeModalMode] = useState("create"); // "create" | "edit"
  const [noticeBeingEdited, setNoticeBeingEdited] = useState(null);
  const [noticeDeleteTarget, setNoticeDeleteTarget] = useState(null);
  const EMPTY_NOTICE_FORM = {
    title: "",
    description: "",
    category: "General",
    priority: "Medium",
    notice_date: new Date().toISOString().slice(0, 10),
    expiry_date: "",
    audience: "All",
  };
  const [noticeForm, setNoticeForm] = useState(EMPTY_NOTICE_FORM);
  const [noticeFormError, setNoticeFormError] = useState("");

  const openCreateNoticeModal = () => {
    setNoticeModalMode("create");
    setNoticeBeingEdited(null);
    setNoticeForm(EMPTY_NOTICE_FORM);
    setNoticeFormError("");
    setNoticeModalOpen(true);
  };

  const openEditNoticeModal = (notice) => {
    setNoticeModalMode("edit");
    setNoticeBeingEdited(notice);
    setNoticeForm({
      title: notice.title || "",
      description: notice.description || notice.message || "",
      category: notice.category || "General",
      priority: notice.priority || "Medium",
      notice_date: (notice.notice_date || notice.date || "").slice(0, 10),
      expiry_date: (notice.expiry_date || "").slice(0, 10),
      audience: notice.audience || "All",
    });
    setNoticeFormError("");
    setNoticeModalOpen(true);
  };

  const closeNoticeModal = () => {
    setNoticeModalOpen(false);
    setNoticeBeingEdited(null);
    setNoticeFormError("");
  };

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
    noticeSubmitting,
    markNoticeAsRead,
    fetchNotices,
    createNotice,
    updateNotice,
    deleteNotice,

    // notifications
    notifications,
    notificationUnread,
    notificationLoading,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    fetchNotifications,

    combinedNotifications,
    sortedNotifications,
    totalUnread,
    handleNotificationClick,

    toast,
    // 🐛 BUGFIX: this hook was previously called as
    // useAdminDashboard(activeSection) — without setActiveSection, so
    // handleNotificationClick's setActiveSection(...) call threw
    // "setActiveSection is not a function" the moment anyone clicked a
    // notification in the bell dropdown.
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

    isHostelAdmin,
    isSuperAdmin,
    canAccess,
    allowedModules,
  } = useAdminProfile({ fetchWithAuth, showToast });

  // Read vs Full Access for this whole dashboard, driven by Role &
  // Permission Management on the Super Admin dashboard. Read Only ->
  // can view/filter everywhere below, but every add/edit/delete/
  // allocate/vacate action is hidden or blocked.
  const { canWriteHostel, hostelAccessLevel } = useHostelPermission();

  // Every dashboard (including this one) this admin currently has
  // access to - powers the "OTHER DASHBOARDS" sidebar links below.
  const { dashboards: accessibleDashboards } = useDashboardAccess();

  const otherAccessibleDashboards = (accessibleDashboards || []).filter(
    (dashboard) => dashboard.key !== "hostel-admin-dashboard",
  );

  // ================= FLOORS & BLOCKS SECTION HOOK =================
  const {
    hostels,
    structureStats,
    structureLoading,
    loadStructure,

    expandedBlocks,
    expandedFloors,
    toggleBlockExpanded,
    toggleFloorExpanded,

    hostelOptions,
    blockOptions,

    hostelModalOpen,
    hostelForm,
    hostelSaving,
    openCreateHostelModal,
    openEditHostelModal,
    closeHostelModal,
    updateHostelForm,
    saveHostel,
    deleteHostel,

    blockModalOpen,
    blockForm,
    blockSaving,
    openCreateBlockModal,
    openEditBlockModal,
    closeBlockModal,
    updateBlockForm,
    saveBlock,
    deleteBlock,

    floorModalOpen,
    floorForm,
    floorSaving,
    openCreateFloorModal,
    openEditFloorModal,
    closeFloorModal,
    updateFloorForm,
    saveFloor,
    deleteFloor,
  } = useHostelBlocksFloors({ activeSection, fetchWithAuth, showToast });

  // ================= ROOMS SECTION HOOK =================
  const {
    rooms,
    roomsLoading,
    roomFilters,

    loadRooms,
    updateRoomFilter,
    applyRoomFilters,
    resetRoomFilters,

    roomModalOpen,
    roomForm,
    roomSaving,
    openCreateRoomModal,
    openEditRoomModal,
    closeRoomModal,
    updateRoomForm,
    saveRoom,
    deleteRoom,

    selectedRoom,
    roomDetailsOpen,
    openRoomDetails,
    closeRoomDetails,
  } = useHostelRooms({ activeSection, fetchWithAuth, showToast });

  // ================= BEDS SECTION HOOK =================
  const {
    beds,
    bedsLoading,
    bedFilters,

    loadBeds,
    updateBedFilter,
    applyBedFilters,
    resetBedFilters,

    bedModalOpen,
    bedForm,
    bedSaving,
    openCreateBedModal,
    openEditBedModal,
    closeBedModal,
    updateBedForm,
    saveBed,
    deleteBed,

    allocateModalOpen,
    allocateTargetBed,
    allocateSaving,
    studentSearch,
    setStudentSearch,
    studentResults,
    studentSearchLoading,
    selectedStudentId,
    setSelectedStudentId,
    openAllocateModal,
    closeAllocateModal,
    searchUnallocatedStudents,
    allocateBed,

    vacatingBedId,
    vacateBed,
  } = useHostelBeds({ activeSection, fetchWithAuth, showToast });

  // ================= STUDENTS SECTION HOOK =================
  const {
    allocations: studentAllocations,
    stats: studentStats,
    allocationsLoading: studentsLoading,
    filters: studentFilters,

    loadStudents,
    updateFilter: updateStudentFilter,
    applyFilters: applyStudentFilters,
    resetFilters: resetStudentFilters,

    checkingOutId: checkingOutStudentId,
    checkoutStudent,

    selectedAllocation,
    detailsOpen: studentDetailsOpen,
    openStudentDetails,
    closeStudentDetails,
  } = useHostelStudents({ activeSection, fetchWithAuth, showToast });

  // ================= ROOM ALLOTMENT SECTION HOOK =================
  const {
    allotments,
    stats: allotmentStats,
    allotmentsLoading,
    filters: allotmentFilters,

    loadAllotments,
    updateFilter: updateAllotmentFilter,
    applyFilters: applyAllotmentFilters,
    resetFilters: resetAllotmentFilters,

    checkingOutId: checkingOutAllotmentId,
    checkoutAllotment,

    transferModalOpen,
    transferSource,
    transferSaving,
    vacantBeds,
    vacantBedsLoading,
    selectedTargetBedId,
    setSelectedTargetBedId,
    openTransferModal,
    closeTransferModal,
    confirmTransfer,
  } = useHostelRoomAllotment({ activeSection, fetchWithAuth, showToast });

  // ================= STAFF SECTION HOOK =================
  const {
    staffList,
    staffStats,
    staffLoading,
    staffFilters,

    loadStaff,
    updateStaffFilter,
    applyStaffFilters,
    resetStaffFilters,

    staffModalOpen,
    staffForm,
    staffSaving,
    openCreateStaffModal,
    openEditStaffModal,
    closeStaffModal,
    updateStaffForm,
    saveStaff,
    deleteStaff,

    selectedStaff,
    staffDetailsOpen,
    openStaffDetails,
    closeStaffDetails,
  } = useHostelStaff({ activeSection, fetchWithAuth, showToast });

  // ================= VISITORS SECTION HOOK =================
  const {
    visitors,
    visitorStats,
    visitorsLoading,
    visitorFilters,

    loadVisitors,
    updateVisitorFilter,
    applyVisitorFilters,
    resetVisitorFilters,

    visitorModalOpen,
    visitorForm,
    visitorSaving,
    openVisitorModal,
    closeVisitorModal,
    updateVisitorForm,

    studentSearch: visitorStudentSearch,
    setStudentSearch: setVisitorStudentSearch,
    studentResults: visitorStudentResults,
    studentSearchLoading: visitorStudentSearchLoading,
    selectedStudent: selectedVisitorStudent,
    searchStudentsForVisitor,
    selectVisitorStudent,
    saveVisitor,

    actioningId: visitorActioningId,
    approveVisitor,
    rejectVisitor,
    checkoutVisitor,
    deleteVisitor,
  } = useHostelVisitors({ activeSection, fetchWithAuth, showToast });

  // ================= ATTENDANCE SECTION HOOK =================
  const {
    attendanceDate,
    changeAttendanceDate,

    attendance,
    attendanceStats,
    attendanceLoading,
    attendanceFilters,

    loadAttendance,
    updateAttendanceFilter,
    applyAttendanceFilters,
    resetAttendanceFilters,

    markingStudentId,
    markAttendance,
  } = useHostelAttendance({ activeSection, fetchWithAuth, showToast });

  // ================= CHECK-IN / CHECK-OUT SECTION HOOK =================
  const {
    movements,
    movementStats,
    movementsLoading,
    movementFilters,

    loadMovements,
    updateMovementFilter,
    applyMovementFilters,
    resetMovementFilters,

    checkoutModalOpen,
    checkoutForm,
    checkoutSaving,
    openCheckoutModal,
    closeCheckoutModal,
    updateCheckoutForm,

    studentSearch: movementStudentSearch,
    setStudentSearch: setMovementStudentSearch,
    studentResults: movementStudentResults,
    studentSearchLoading: movementStudentSearchLoading,
    selectedStudent: selectedMovementStudent,
    searchStudentsForMovement,
    selectMovementStudent,
    saveCheckout,

    checkingInId,
    checkInMovement,
  } = useHostelMovement({ activeSection, fetchWithAuth, showToast });

  // ================= LEAVE REQUESTS SECTION HOOK =================
  const {
    leaveRequests,
    leaveStats,
    leaveLoading,
    leaveFilters,

    loadLeaveRequests,
    updateLeaveFilter,
    applyLeaveFilters,
    resetLeaveFilters,

    leaveModalOpen,
    leaveForm,
    leaveSaving,
    openLeaveModal,
    closeLeaveModal,
    updateLeaveForm,

    studentSearch: leaveStudentSearch,
    setStudentSearch: setLeaveStudentSearch,
    studentResults: leaveStudentResults,
    studentSearchLoading: leaveStudentSearchLoading,
    selectedStudent: selectedLeaveStudent,
    searchStudentsForLeave,
    selectLeaveStudent,
    saveLeaveRequest,

    actioningId: leaveActioningId,
    approveLeave,
    rejectLeave,
    markLeaveReturned,
    deleteLeave,
  } = useHostelLeaveRequests({ activeSection, fetchWithAuth, showToast });

  // ================= MESS MENU SECTION HOOK =================
  const {
    menuGrid,
    menuStats,
    menuLoading,
    loadMenu,

    entryModalOpen,
    entryForm,
    entrySaving,
    openEntryModal,
    closeEntryModal,
    updateEntryForm,
    saveEntry,
    clearEntry,
  } = useHostelMessMenu({ activeSection, fetchWithAuth, showToast });

  // ================= MEAL ATTENDANCE SECTION HOOK =================
  const {
    mealDate,
    changeMealDate,
    mealType,
    changeMealType,

    mealAttendance,
    mealStats,
    mealAttendanceLoading,
    mealFilters,

    loadMealAttendance,
    updateMealFilter,
    applyMealFilters,
    resetMealFilters,

    markingStudentId: markingMealStudentId,
    markMealAttendance,

    bulkMarking,
    markAllPresent,
  } = useHostelMealAttendance({ activeSection, fetchWithAuth, showToast });

  // ================= COMPLAINTS SECTION HOOK =================
  const {
    complaints,
    complaintStats,
    complaintsLoading,
    complaintFilters,

    loadComplaints,
    updateComplaintFilter,
    applyComplaintFilters,
    resetComplaintFilters,

    selectedComplaint,
    complaintModalOpen,
    complaintSaving,
    openComplaintModal,
    closeComplaintModal,
    updateSelectedComplaint,
    saveComplaint,
    deleteComplaint,
  } = useHostelComplaints({ activeSection, fetchWithAuth, showToast });

  // ================= MAINTENANCE SECTION HOOK =================
  const {
    requests: maintenanceRequests,
    maintenanceStats,
    maintenanceLoading,
    maintenanceFilters,

    loadMaintenance,
    updateMaintenanceFilter,
    applyMaintenanceFilters,
    resetMaintenanceFilters,

    maintenanceModalOpen,
    maintenanceForm,
    maintenanceSaving,
    openCreateMaintenanceModal,
    openEditMaintenanceModal,
    closeMaintenanceModal,
    updateMaintenanceForm,
    saveMaintenance,
    deleteMaintenance,
    quickUpdateStatus,
  } = useHostelMaintenance({ activeSection, fetchWithAuth, showToast });

  // ================= FEE MANAGEMENT SECTION HOOK =================
  const {
    structures: feeStructures,
    structuresLoading: feeStructuresLoading,
    fees: feeManagementFees,
    feeStats: feeManagementStats,
    feesLoading: feeManagementLoading,
    refreshAll: refreshFeeManagement,
    loadFees: loadFeeManagementFees,

    structureModalOpen,
    structureForm,
    structureSaving,
    openCreateStructureModal,
    openEditStructureModal,
    closeStructureModal,
    updateStructureForm,
    saveStructure,
    deleteStructure,

    generateModalOpen,
    generateForm,
    generateSaving,
    openGenerateModal,
    closeGenerateModal,
    updateGenerateForm,
    generateInvoices,
  } = useHostelFeeManagement({ activeSection, fetchWithAuth, showToast });

  // ================= PAYMENT SECTION HOOK =================
  const {
    payments,
    paymentStats,
    paymentsLoading,
    paymentFilters,

    loadPayments,
    updatePaymentFilter,
    applyPaymentFilters,
    resetPaymentFilters,

    paymentModalOpen,
    paymentForm,
    paymentSaving,
    openPaymentModal,
    closePaymentModal,
    updatePaymentForm,

    studentSearch: paymentStudentSearch,
    setStudentSearch: setPaymentStudentSearch,
    studentResults: paymentStudentResults,
    studentSearchLoading: paymentStudentSearchLoading,
    selectedStudent: selectedPaymentStudent,
    searchStudentsForPayment,
    selectPaymentStudent,

    studentFees,
    studentFeesLoading,
    selectedFee,
    selectPaymentFee,

    savePayment,
  } = useHostelPayments({ activeSection, fetchWithAuth, showToast });

  // ================= PENDING DUES SECTION HOOK =================
  const {
    dues,
    duesStats,
    duesLoading,
    duesFilters,

    loadDues,
    updateDuesFilter,
    applyDuesFilters,
    resetDuesFilters,
  } = useHostelPendingDues({ activeSection, fetchWithAuth, showToast });

  // ================= REPORTS & ANALYTICS SECTION HOOK =================
  const { report, reportLoading, loadReport } = useHostelReports({
    activeSection,
    fetchWithAuth,
    showToast,
  });

  // ================= ACTIVITY LOGS SECTION HOOK =================
  const {
    logs,
    logStats,
    logsLoading,
    logFilters,

    loadLogs,
    updateLogFilter,
    applyLogFilters,
    resetLogFilters,
  } = useHostelActivityLogs({ activeSection, fetchWithAuth, showToast });

  useEffect(() => {
    if (window.innerWidth >= 768) {
      setSidebarOpen(true);
    }
  }, []);

  // ================= DASHBOARD OVERVIEW (LIVE DATA) =================
  // The landing "dashboard" tab has no dedicated section-hook of its own —
  // it's a live rollup of numbers each domain section already fetches
  // (structure, reports, staff, visitors, leave requests, dues, activity
  // logs). Pulling them together here means the dashboard always reflects
  // real DB state instead of a static/mock summary.
  const refreshDashboardOverview = (opts = {}) => {
    loadStructure(opts);
    loadReport();
    loadStaff();
    loadVisitors();
    loadLeaveRequests();
    loadDues();
    loadLogs();
  };

  useEffect(() => {
    if (activeSection === "dashboard") {
      refreshDashboardOverview({ silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  const dashboardLoading =
    structureLoading ||
    reportLoading ||
    staffLoading ||
    visitorsLoading ||
    leaveLoading ||
    duesLoading ||
    logsLoading;

  const formatTimeAgo = (isoString) => {
    if (!isoString) return "";

    const then = new Date(isoString).getTime();
    if (Number.isNaN(then)) return "";

    const diffSeconds = Math.max(0, Math.floor((Date.now() - then) / 1000));

    if (diffSeconds < 60) return "just now";
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(isoString).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
  };

  const ACTIVITY_CATEGORY_STYLES = {
    Allocation: {
      icon: "bi-door-open",
      classes:
        "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
    },
    Payment: {
      icon: "bi-cash-coin",
      classes:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    },
    Complaint: {
      icon: "bi-megaphone",
      classes:
        "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
    },
    Maintenance: {
      icon: "bi-tools",
      classes:
        "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
    },
    Leave: {
      icon: "bi-calendar2-x",
      classes: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
    },
    Staff: {
      icon: "bi-person-badge",
      classes: "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300",
    },
    Visitor: {
      icon: "bi-person-plus",
      classes:
        "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300",
    },
    Structure: {
      icon: "bi-diagram-3",
      classes: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
    },
  };

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
        {/* ========================= HOSTEL ADMIN SIDEBAR NAV ========================= */}
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
            // HOSTEL SETUP / INFRASTRUCTURE
            // =========================================================
            {
              title: "HOSTEL SETUP",
              items: [
                ["floors", "bi-building", "Floors & Blocks"],
                ["rooms", "bi-door-open", "Rooms"],
                ["beds", "bi-layout-sidebar-inset", "Bed Management"],
              ],
            },

            // =========================================================
            // RESIDENTS
            // =========================================================
            {
              title: "HOSTEL RESIDENTS",
              items: [
                ["students", "bi-mortarboard", "Students"],
                ["room-allotment", "bi-house-check", "Room Allotment"],
                ["staff", "bi-people", "Hostel Staff"],
                ["visitors", "bi-person-lines-fill", "Visitors"],
              ],
            },

            // =========================================================
            // DAILY OPERATIONS
            // =========================================================
            {
              title: "DAILY OPERATIONS",
              items: [
                ["attendance", "bi-calendar-check", "Attendance"],
                ["checkin-checkout", "bi-box-arrow-in-right", "Check In / Out"],
                ["leave-requests", "bi-journal-check", "Leave Requests"],
              ],
            },

            // =========================================================
            // HOSTEL FEES
            // =========================================================
            {
              title: "HOSTEL FEES",
              items: [
                ["fees", "bi-cash-coin", "Fee Management"],
                ["payments", "bi-credit-card", "Payments"],
                ["dues", "bi-exclamation-circle", "Pending Dues"],
              ],
            },

            // =========================================================
            // MESS
            // =========================================================
            {
              title: "MESS MANAGEMENT",
              items: [
                ["mess-menu", "bi-cup-hot", "Mess Menu"],
                ["meal-attendance", "bi-clipboard-check", "Meal Attendance"],
              ],
            },

            // =========================================================
            // COMPLAINTS / MAINTENANCE
            // =========================================================
            {
              title: "HOSTEL SUPPORT",
              items: [
                ["complaints", "bi-tools", "Complaints"],
                ["maintenance", "bi-wrench-adjustable", "Maintenance"],
                ["fee-management", "bi-cash-stack", "Fee Management"],
                ["payment", "bi-credit-card", "Payment"],
                ["pending-dues", "bi-exclamation-diamond", "Pending Dues"],
              ],
            },

            // =========================================================
            // COMMUNICATION
            // =========================================================
            {
              title: "COMMUNICATION",
              items: [
                ["announcements", "bi-megaphone", "Announcements"],
                ["notifications", "bi-bell", "Notifications"],
              ],
            },

            // =========================================================
            // REPORTS
            // =========================================================
            {
              title: "REPORTS",
              items: [["reports", "bi-bar-chart-line", "Reports & Analytics"]],
            },

            // =========================================================
            // SYSTEM
            // =========================================================
            {
              title: "SYSTEM",
              items: [
                ["activity-logs", "bi-shield-check", "Activity Logs"],
                ["settings", "bi-gear", "Settings"],
              ],
            },
          ].map((section) => (
            <div key={section.title}>
              {sidebarExpanded && (
                <p className="text-xs text-gray-400 px-2 mt-4 mb-2 font-medium tracking-wide">
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
                        className={`whitespace-nowrap truncate overflow-hidden transition-all duration-300 ease-in-out
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
                <p className="text-xs text-gray-400 px-2 mt-4 mb-2 font-medium tracking-wide">
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

          {/* READ-ONLY ACCESS BANNER */}
          {!canWriteHostel && (
            <div
              role="status"
              className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
            >
              <i className="bi bi-eye text-lg" />
              <span>
                <strong className="font-semibold">Read-only access.</strong> You
                can view and filter data on this dashboard, but adding, editing,
                deleting, allocating or vacating beds is turned off. Ask your
                Super Admin for Full Access if you need to make changes.
              </span>
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
                        <span>
                          Notifications
                          {totalUnread > 0 && (
                            <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
                              {totalUnread} new
                            </span>
                          )}
                        </span>

                        <div className="flex items-center gap-3">
                          {totalUnread > 0 && (
                            <button
                              type="button"
                              onClick={() => markAllNotificationsRead?.()}
                              className="text-xs font-medium text-purple-600 transition hover:text-purple-800 dark:text-purple-300"
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
                                  {item.message || item.description || ""}
                                </p>

                                <p className="mt-1 text-xs text-gray-400">
                                  {item.time}
                                </p>
                              </button>
                            ))
                        )}
                      </div>

                      <div className="grid grid-cols-2 divide-x border-t text-xs font-medium dark:divide-slate-700 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSection("notifications");
                            setShowNotifications(false);
                          }}
                          className="p-3 text-gray-600 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-700"
                        >
                          <i className="bi bi-bell me-1" />
                          All notifications
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveSection("announcements");
                            setShowNotifications(false);
                          }}
                          className="p-3 text-gray-600 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-700"
                        >
                          <i className="bi bi-megaphone me-1" />
                          All announcements
                        </button>
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
          <section className="section active space-y-6 p-4 sm:p-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold sm:text-xl">
                    Hostel Dashboard
                  </h2>

                  <p className="mt-1 text-sm text-blue-100">
                    Live occupancy, approvals and activity across the hostel
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => refreshDashboardOverview()}
                  disabled={dashboardLoading}
                  className="inline-flex items-center gap-2 self-start rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <i
                    className={`bi bi-arrow-clockwise ${
                      dashboardLoading ? "animate-spin" : ""
                    }`}
                  ></i>
                  Refresh
                </button>
              </div>
            </div>

            {/* PRIMARY KPIs */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
              {[
                {
                  label: "Active Residents",
                  value: report?.occupancy?.active_residents,
                  loading: reportLoading,
                  icon: "bi-people",
                  iconClass:
                    "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
                  onClick: () => setActiveSection("students"),
                },
                {
                  label: "Occupancy Rate",
                  value:
                    report?.occupancy?.occupancy_rate != null
                      ? `${report.occupancy.occupancy_rate}%`
                      : undefined,
                  loading: reportLoading,
                  icon: "bi-pie-chart",
                  iconClass:
                    "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
                  onClick: () => setActiveSection("beds"),
                },
                {
                  label: "Available Beds",
                  value: structureStats.available_beds,
                  loading: structureLoading,
                  icon: "bi-door-closed",
                  iconClass:
                    "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
                  onClick: () => setActiveSection("beds"),
                },
                {
                  label: "Rooms",
                  value: structureStats.rooms,
                  loading: structureLoading,
                  icon: "bi-door-open",
                  iconClass:
                    "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
                  onClick: () => setActiveSection("rooms"),
                },
                {
                  label: "Hostel Staff",
                  value: staffStats?.total,
                  loading: staffLoading,
                  icon: "bi-person-badge",
                  iconClass:
                    "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
                  onClick: () => setActiveSection("staff"),
                },
                {
                  label: "Pending Leave",
                  value: leaveStats?.pending,
                  loading: leaveLoading,
                  icon: "bi-calendar2-x",
                  iconClass:
                    "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
                  onClick: () => setActiveSection("leave-requests"),
                },
              ].map((kpi) => (
                <button
                  type="button"
                  key={kpi.label}
                  onClick={kpi.onClick}
                  className="rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {kpi.label}
                      </p>

                      <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                        {kpi.loading ? "…" : (kpi.value ?? 0)}
                      </p>
                    </div>

                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${kpi.iconClass}`}
                    >
                      <i className={`bi ${kpi.icon}`}></i>
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              {/* NEEDS ATTENTION */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 xl:col-span-1">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                  <i className="bi bi-exclamation-triangle text-amber-500" />
                  Needs Attention
                </h3>

                <div className="mt-4 space-y-2">
                  {(() => {
                    const openComplaints = Math.max(
                      (report?.complaints?.total ?? 0) -
                        (report?.complaints?.resolved ?? 0),
                      0,
                    );
                    const openMaintenance = Math.max(
                      (report?.maintenance?.total ?? 0) -
                        (report?.maintenance?.resolved ?? 0),
                      0,
                    );

                    const items = [
                      {
                        key: "leave",
                        label: "Pending leave requests",
                        count: leaveStats?.pending ?? 0,
                        icon: "bi-calendar2-x",
                        classes:
                          "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
                        target: "leave-requests",
                      },
                      {
                        key: "visitors",
                        label: "Visitor approvals waiting",
                        count: visitorStats?.pending ?? 0,
                        icon: "bi-person-plus",
                        classes:
                          "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300",
                        target: "visitors",
                      },
                      {
                        key: "complaints",
                        label: "Open complaints",
                        count: openComplaints,
                        icon: "bi-megaphone",
                        classes:
                          "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
                        target: "complaints",
                      },
                      {
                        key: "maintenance",
                        label: "Open maintenance requests",
                        count: openMaintenance,
                        icon: "bi-tools",
                        classes:
                          "bg-slate-50 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300",
                        target: "maintenance",
                      },
                      {
                        key: "dues",
                        label: "Overdue fee invoices",
                        count: duesStats?.overdue_count ?? 0,
                        icon: "bi-cash-coin",
                        classes:
                          "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
                        target: "pending-dues",
                      },
                    ].filter((item) => item.count > 0);

                    if (dashboardLoading && items.length === 0) {
                      return (
                        <div className="space-y-2">
                          {[...Array(3)].map((_, i) => (
                            <div
                              key={i}
                              className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-700"
                            />
                          ))}
                        </div>
                      );
                    }

                    if (items.length === 0) {
                      return (
                        <div className="flex flex-col items-center gap-2 py-8 text-center">
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-300">
                            <i className="bi bi-check2-circle text-xl" />
                          </span>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            All caught up — nothing pending
                          </p>
                        </div>
                      );
                    }

                    return items.map((item) => (
                      <button
                        type="button"
                        key={item.key}
                        onClick={() => setActiveSection(item.target)}
                        className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-gray-50 dark:hover:bg-slate-700/50"
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.classes}`}
                        >
                          <i className={`bi ${item.icon}`} />
                        </span>

                        <span className="min-w-0 flex-1 truncate text-sm text-gray-700 dark:text-gray-200">
                          {item.label}
                        </span>

                        <span className="shrink-0 rounded-full bg-gray-900/5 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-white/10 dark:text-gray-200">
                          {item.count}
                        </span>

                        <i className="bi bi-chevron-right shrink-0 text-xs text-gray-400" />
                      </button>
                    ));
                  })()}
                </div>
              </div>

              {/* FEE COLLECTION + ATTENDANCE TREND */}
              <div className="space-y-4 xl:col-span-2">
                {/* FEE COLLECTION */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                      <i className="bi bi-cash-stack text-emerald-500" />
                      Fee Collection
                    </h3>

                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {reportLoading
                        ? "…"
                        : `${report?.fees?.collection_rate ?? 0}%`}
                    </span>
                  </div>

                  <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all duration-700"
                      style={{
                        width: `${Math.min(report?.fees?.collection_rate ?? 0, 100)}%`,
                      }}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Invoiced
                      </p>
                      <p className="mt-0.5 font-semibold text-gray-900 dark:text-white">
                        ₹
                        {reportLoading
                          ? "…"
                          : (report?.fees?.total_invoiced ?? 0).toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Collected
                      </p>
                      <p className="mt-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                        ₹
                        {reportLoading
                          ? "…"
                          : (report?.fees?.total_collected ?? 0).toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Pending
                      </p>
                      <p className="mt-0.5 font-semibold text-amber-600 dark:text-amber-400">
                        ₹
                        {reportLoading
                          ? "…"
                          : (report?.fees?.total_pending ?? 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ATTENDANCE TREND */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                    <i className="bi bi-graph-up text-cyan-500" />
                    Attendance — Last 7 Days
                  </h3>

                  {reportLoading && !report?.attendance_trend ? (
                    <div className="mt-4 h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-700" />
                  ) : !report?.attendance_trend?.length ? (
                    <p className="mt-4 text-center text-sm text-gray-400">
                      No attendance recorded yet
                    </p>
                  ) : (
                    <div className="mt-5 flex h-32 items-end justify-between gap-2 sm:gap-3">
                      {report.attendance_trend.map((day) => {
                        const pct = day.marked
                          ? Math.round((day.present / day.marked) * 100)
                          : 0;

                        return (
                          <div
                            key={day.date}
                            className="flex flex-1 flex-col items-center gap-1.5"
                          >
                            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                              {pct}%
                            </span>

                            <div className="flex h-20 w-full items-end overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-700">
                              <div
                                className="w-full rounded-lg bg-gradient-to-t from-cyan-500 to-blue-500 transition-all duration-700"
                                style={{ height: `${Math.max(pct, 4)}%` }}
                              />
                            </div>

                            <span className="text-[10px] text-gray-400">
                              {new Date(day.date).toLocaleDateString(undefined, {
                                weekday: "narrow",
                              })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              {/* RECENT ACTIVITY */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 xl:col-span-2">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                    <i className="bi bi-clock-history text-indigo-500" />
                    Recent Activity
                  </h3>

                  <button
                    type="button"
                    onClick={() => setActiveSection("activity-logs")}
                    className="text-xs font-medium text-indigo-600 transition hover:text-indigo-800 dark:text-indigo-300"
                  >
                    View all
                  </button>
                </div>

                <div className="mt-3">
                  {logsLoading && !logs?.length ? (
                    <div className="space-y-3">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-700"
                        />
                      ))}
                    </div>
                  ) : !logs?.length ? (
                    <p className="py-8 text-center text-sm text-gray-400">
                      No activity recorded yet
                    </p>
                  ) : (
                    <ul className="divide-y dark:divide-slate-700">
                      {logs.slice(0, 6).map((log) => {
                        const style =
                          ACTIVITY_CATEGORY_STYLES[log.category] || {
                            icon: "bi-info-circle",
                            classes:
                              "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300",
                          };

                        return (
                          <li
                            key={log.id}
                            className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                          >
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.classes}`}
                            >
                              <i className={`bi ${style.icon}`} />
                            </span>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-gray-800 dark:text-gray-100">
                                {log.description}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-400">
                                {log.admin_name || "System"} ·{" "}
                                {formatTimeAgo(log.created_at)}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* TODAY SNAPSHOT */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                  <i className="bi bi-sun text-amber-500" />
                  Today
                </h3>

                <div className="mt-4 space-y-3">
                  {[
                    {
                      label: "Visitors checked in",
                      value: visitorStats?.today,
                      loading: visitorsLoading,
                      icon: "bi-person-plus",
                    },
                    {
                      label: "Currently outside",
                      value: report?.movement?.currently_outside,
                      loading: reportLoading,
                      icon: "bi-signpost-split",
                    },
                    {
                      label: "Wardens & security",
                      value:
                        (staffStats?.wardens ?? 0) + (staffStats?.security ?? 0),
                      loading: staffLoading,
                      icon: "bi-shield-check",
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-slate-900/50"
                    >
                      <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <i className={`bi ${row.icon} text-gray-400`} />
                        {row.label}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {row.loading ? "…" : (row.value ?? 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* QUICK LINKS */}
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Quick Links
              </h3>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {[
                  {
                    key: "floors",
                    title: "Structure",
                    desc: "Hostels, blocks & floors",
                    icon: "bi-diagram-3",
                  },
                  {
                    key: "rooms",
                    title: "Rooms",
                    desc: "Inventory & status",
                    icon: "bi-door-open",
                  },
                  {
                    key: "beds",
                    title: "Beds",
                    desc: "Allocation & vacancy",
                    icon: "bi-house-check",
                  },
                  {
                    key: "students",
                    title: "Students",
                    desc: "Residents directory",
                    icon: "bi-people",
                  },
                  {
                    key: "staff",
                    title: "Staff",
                    desc: "Wardens & support team",
                    icon: "bi-person-badge",
                  },
                  {
                    key: "complaints",
                    title: "Complaints",
                    desc: "Track & resolve issues",
                    icon: "bi-megaphone",
                  },
                  {
                    key: "fee-management",
                    title: "Fees",
                    desc: "Structures & invoices",
                    icon: "bi-cash-stack",
                  },
                  {
                    key: "reports",
                    title: "Reports",
                    desc: "Analytics & trends",
                    icon: "bi-bar-chart",
                  },
                ].map((card) => (
                  <button
                    type="button"
                    key={card.key}
                    onClick={() => setActiveSection(card.key)}
                    className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 sm:p-5"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                      <i className={`bi ${card.icon} text-lg`}></i>
                    </span>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900 dark:text-white">
                        {card.title}
                      </p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {card.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* <!-- =========================== FLOORS & BLOCKS SECTION =========================== --> */}
        {activeSection === "floors" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Hostel Structure Management
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Build your hierarchy: Hostel → Block → Floor → Room → Beds
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadStructure()}
                    disabled={structureLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i
                      className={`bi bi-arrow-clockwise ${
                        structureLoading ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={() => openCreateHostelModal()}
                    disabled={!canWriteHostel}
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i className="bi bi-building" />
                    New Hostel
                  </button>
                </div>
              </div>
            </div>

            {/* STATISTICS */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
              {[
                {
                  label: "Blocks",
                  value: structureStats.blocks,
                  icon: "bi-diagram-3",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Floors",
                  value: structureStats.floors,
                  icon: "bi-layers",
                  classes:
                    "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
                },
                {
                  label: "Rooms",
                  value: structureStats.rooms,
                  icon: "bi-door-open",
                  classes:
                    "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300",
                },
                {
                  label: "Beds",
                  value: structureStats.beds,
                  icon: "bi-grid-3x3-gap",
                  classes:
                    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
                },
                {
                  label: "Occupied",
                  value: structureStats.occupied_beds,
                  icon: "bi-person-check",
                  classes:
                    "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
                },
                {
                  label: "Available",
                  value: structureStats.available_beds,
                  icon: "bi-door-closed",
                  classes:
                    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
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
                        {structureLoading ? "…" : Number(stat.value || 0)}
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

            {/* Structure Tree */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Hostel Structure
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {hostels.length} hostel(s) configured
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {structureLoading && hostels.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-16 text-gray-500 dark:text-gray-400">
                    <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                    Loading structure...
                  </div>
                )}

                {!structureLoading && hostels.length === 0 && (
                  <div className="mx-auto max-w-sm py-14 text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                      <i className="bi bi-building text-2xl" />
                    </span>

                    <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                      No hostels yet
                    </h3>

                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Create your first hostel to start building its structure.
                    </p>

                    <button
                      type="button"
                      onClick={() => openCreateHostelModal()}
                      disabled={!canWriteHostel}
                      className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      New Hostel
                    </button>
                  </div>
                )}

                {hostels.map((hostel) => (
                  <div
                    key={hostel.id}
                    className="mb-6 overflow-hidden rounded-2xl border border-gray-100 shadow-sm transition hover:shadow-md dark:border-slate-700"
                  >
                    {/* Hostel header */}
                    <div className="relative flex flex-col gap-4 overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
                      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

                      <div className="relative flex items-center gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl backdrop-blur-sm">
                          <i className="bi bi-building" />
                        </span>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold">
                              {hostel.hostel_name}
                            </h3>

                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                hostel.status === "Active"
                                  ? "bg-emerald-400/20 text-emerald-100"
                                  : "bg-white/15 text-white/80"
                              }`}
                            >
                              {hostel.status}
                            </span>
                          </div>

                          <p className="mt-0.5 text-sm text-indigo-100">
                            {hostel.hostel_type} Hostel ·{" "}
                            {(hostel.blocks || []).length} block(s)
                          </p>
                        </div>
                      </div>

                      <div className="relative flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openCreateBlockModal(hostel.id)}
                          disabled={!canWriteHostel}
                          title="Add block"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <i className="bi bi-plus-lg" />
                          Block
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditHostelModal(hostel)}
                          disabled={!canWriteHostel}
                          title="Edit hostel"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <i className="bi bi-pencil-square" />
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteHostel(hostel)}
                          disabled={!canWriteHostel}
                          title="Delete hostel"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/25 text-white backdrop-blur-sm transition hover:bg-red-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </div>

                    {/* Blocks */}
                    <div className="space-y-4 bg-white p-4 dark:bg-slate-800 sm:p-6">
                      {(hostel.blocks || []).length === 0 && (
                        <div className="flex flex-col items-center gap-2 py-8 text-center">
                          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-slate-700">
                            <i className="bi bi-diagram-3" />
                          </span>
                          <p className="text-sm text-gray-400">
                            No blocks yet in this hostel.
                          </p>
                        </div>
                      )}

                      {(hostel.blocks || []).map((block) => (
                        <div
                          key={block.id}
                          className="overflow-hidden rounded-xl border border-gray-100 dark:border-slate-700"
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleBlockExpanded(block.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                toggleBlockExpanded(block.id);
                              }
                            }}
                            className="flex w-full cursor-pointer items-center justify-between gap-3 bg-slate-50 p-4 text-left transition hover:bg-slate-100 dark:bg-slate-700/40 dark:hover:bg-slate-700/60"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <i
                                className={`bi bi-chevron-right shrink-0 text-xs text-gray-400 transition-transform duration-200 ${
                                  expandedBlocks[block.id] ? "rotate-90" : ""
                                }`}
                              />

                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300">
                                <i className="bi bi-diagram-3 text-sm" />
                              </span>

                              <div className="min-w-0">
                                <h4 className="truncate font-semibold text-gray-900 dark:text-white">
                                  Block {block.block_name}
                                </h4>
                                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                  {(block.floors || []).length} floor(s)
                                  {block.description
                                    ? ` · ${block.description}`
                                    : ""}
                                </p>
                              </div>
                            </div>

                            <div
                              className="flex shrink-0 gap-1.5"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => openCreateFloorModal(block.id)}
                                disabled={!canWriteHostel}
                                title="Add floor"
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-700 transition hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-500/20 dark:text-green-300 dark:hover:bg-green-500/30"
                              >
                                <i className="bi bi-plus-lg text-xs" />
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditBlockModal(block)}
                                disabled={!canWriteHostel}
                                title="Edit block"
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30"
                              >
                                <i className="bi bi-pencil-square text-xs" />
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteBlock(block)}
                                disabled={!canWriteHostel}
                                title="Delete block"
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-700 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30"
                              >
                                <i className="bi bi-trash text-xs" />
                              </button>
                            </div>
                          </div>

                          {expandedBlocks[block.id] && (
                            <div className="space-y-3 border-t border-gray-100 p-4 dark:border-slate-700 sm:p-5">
                              {(block.floors || []).length === 0 && (
                                <p className="py-2 text-center text-sm text-gray-400">
                                  No floors yet in this block.
                                </p>
                              )}

                              {(block.floors || []).map((floor) => (
                                <div
                                  key={floor.id}
                                  className="overflow-hidden rounded-lg border border-gray-100 dark:border-slate-700"
                                >
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() =>
                                      toggleFloorExpanded(floor.id)
                                    }
                                    onKeyDown={(event) => {
                                      if (
                                        event.key === "Enter" ||
                                        event.key === " "
                                      ) {
                                        event.preventDefault();
                                        toggleFloorExpanded(floor.id);
                                      }
                                    }}
                                    className="flex w-full cursor-pointer items-center justify-between gap-3 bg-white p-3.5 text-left transition hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700/40"
                                  >
                                    <div className="flex min-w-0 items-center gap-3">
                                      <i
                                        className={`bi bi-chevron-right shrink-0 text-[11px] text-gray-400 transition-transform duration-200 ${
                                          expandedFloors[floor.id]
                                            ? "rotate-90"
                                            : ""
                                        }`}
                                      />

                                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300">
                                        <i className="bi bi-layers text-xs" />
                                      </span>

                                      <div className="min-w-0">
                                        <h5 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                          {floor.floor_name ||
                                            `Floor ${floor.floor_number}`}
                                        </h5>
                                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                          {(floor.rooms || []).length} room(s)
                                        </p>
                                      </div>
                                    </div>

                                    <div
                                      className="flex shrink-0 gap-1.5"
                                      onClick={(event) =>
                                        event.stopPropagation()
                                      }
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openCreateRoomModal(floor.id)
                                        }
                                        disabled={!canWriteHostel}
                                        title="Add room"
                                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-700 transition hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-500/20 dark:text-green-300 dark:hover:bg-green-500/30"
                                      >
                                        <i className="bi bi-plus-lg text-xs" />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          openEditFloorModal(floor)
                                        }
                                        disabled={!canWriteHostel}
                                        title="Edit floor"
                                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30"
                                      >
                                        <i className="bi bi-pencil-square text-xs" />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => deleteFloor(floor)}
                                        disabled={!canWriteHostel}
                                        title="Delete floor"
                                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-700 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30"
                                      >
                                        <i className="bi bi-trash text-xs" />
                                      </button>
                                    </div>
                                  </div>

                                  {expandedFloors[floor.id] && (
                                    <div className="grid grid-cols-1 gap-3 border-t border-gray-100 bg-gray-50/50 p-4 dark:border-slate-700 dark:bg-slate-900/30 sm:grid-cols-2 lg:grid-cols-4">
                                      {(floor.rooms || []).length === 0 && (
                                        <p className="col-span-full py-2 text-center text-sm text-gray-400">
                                          No rooms yet on this floor.
                                        </p>
                                      )}

                                      {(floor.rooms || []).map((room) => {
                                        const occupancyPct = room.capacity
                                          ? Math.round(
                                              (room.occupied_count /
                                                room.capacity) *
                                                100,
                                            )
                                          : 0;

                                        return (
                                          <div
                                            key={room.id}
                                            className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                                          >
                                            <div
                                              className={`h-1 w-full ${
                                                room.available_count > 0
                                                  ? "bg-emerald-500"
                                                  : "bg-red-500"
                                              }`}
                                            />

                                            <div className="p-3.5">
                                              <div className="mb-2 flex items-center justify-between">
                                                <h5 className="font-bold text-gray-900 dark:text-white">
                                                  {room.room_number}
                                                </h5>

                                                <span
                                                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                                    room.available_count > 0
                                                      ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                                                      : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                                                  }`}
                                                >
                                                  {room.available_count > 0
                                                    ? "Available"
                                                    : "Full"}
                                                </span>
                                              </div>

                                              <div className="mb-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                                <span>
                                                  {room.occupied_count}/
                                                  {room.capacity} beds
                                                </span>
                                                <span>{occupancyPct}%</span>
                                              </div>

                                              <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
                                                <div
                                                  className={`h-full rounded-full transition-all duration-500 ${
                                                    occupancyPct >= 100
                                                      ? "bg-red-500"
                                                      : occupancyPct >= 60
                                                        ? "bg-amber-500"
                                                        : "bg-emerald-500"
                                                  }`}
                                                  style={{
                                                    width: `${Math.min(occupancyPct, 100)}%`,
                                                  }}
                                                />
                                              </div>

                                              <button
                                                onClick={() => {
                                                  setActiveSection("beds");
                                                  updateBedFilter(
                                                    "room_id",
                                                    room.id,
                                                  );
                                                  loadBeds({
                                                    filters: {
                                                      room_id: room.id,
                                                      floor_id: "",
                                                      block_id: "",
                                                      status: "",
                                                    },
                                                  });
                                                }}
                                                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-50 py-2 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                                              >
                                                <i className="bi bi-grid-3x3-gap" />
                                                View Beds
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* HOSTEL MODAL */}
        {hostelModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                    <i className="bi bi-building" />
                  </span>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {hostelForm.id ? "Edit Hostel" : "New Hostel"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeHostelModal}
                  className="text-gray-400 transition hover:text-red-500"
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  value={hostelForm.hostel_name}
                  onChange={(e) =>
                    updateHostelForm("hostel_name", e.target.value)
                  }
                  placeholder="Hostel name (e.g. Boys Hostel A)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />

                <select
                  value={hostelForm.hostel_type}
                  onChange={(e) =>
                    updateHostelForm("hostel_type", e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Boys">Boys</option>
                  <option value="Girls">Girls</option>
                  <option value="Co-ed">Co-ed</option>
                </select>

                <input
                  value={hostelForm.address}
                  onChange={(e) => updateHostelForm("address", e.target.value)}
                  placeholder="Address (optional)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />

                <select
                  value={hostelForm.status}
                  onChange={(e) => updateHostelForm("status", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={closeHostelModal}
                  className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>

                <button
                  onClick={saveHostel}
                  disabled={hostelSaving}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {hostelSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BLOCK MODAL */}
        {blockModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300">
                    <i className="bi bi-diagram-3" />
                  </span>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {blockForm.id ? "Edit Block" : "New Block"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeBlockModal}
                  className="text-gray-400 transition hover:text-red-500"
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              <div className="space-y-3">
                <select
                  value={blockForm.hostel_id}
                  onChange={(e) => updateBlockForm("hostel_id", e.target.value)}
                  disabled={Boolean(blockForm.id)}
                  className="input w-full px-4 py-2 rounded-xl border text-sm dark:bg-slate-700 dark:border-slate-600 disabled:opacity-60"
                >
                  <option value="">Select hostel…</option>
                  {hostelOptions.map((hostel) => (
                    <option key={hostel.id} value={hostel.id}>
                      {hostel.name}
                    </option>
                  ))}
                </select>

                <input
                  value={blockForm.block_name}
                  onChange={(e) =>
                    updateBlockForm("block_name", e.target.value)
                  }
                  placeholder="Block name (e.g. A)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />

                <input
                  value={blockForm.description}
                  onChange={(e) =>
                    updateBlockForm("description", e.target.value)
                  }
                  placeholder="Description (optional)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />

                <select
                  value={blockForm.status}
                  onChange={(e) => updateBlockForm("status", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={closeBlockModal}
                  className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>

                <button
                  onClick={saveBlock}
                  disabled={blockSaving}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {blockSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FLOOR MODAL */}
        {floorModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-300">
                    <i className="bi bi-layers" />
                  </span>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {floorForm.id ? "Edit Floor" : "New Floor"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeFloorModal}
                  className="text-gray-400 transition hover:text-red-500"
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              <div className="space-y-3">
                <select
                  value={floorForm.block_id}
                  onChange={(e) => updateFloorForm("block_id", e.target.value)}
                  disabled={Boolean(floorForm.id)}
                  className="input w-full px-4 py-2 rounded-xl border text-sm dark:bg-slate-700 dark:border-slate-600 disabled:opacity-60"
                >
                  <option value="">Select block…</option>
                  {blockOptions.map((block) => (
                    <option key={block.id} value={block.id}>
                      {block.name}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  value={floorForm.floor_number}
                  onChange={(e) =>
                    updateFloorForm("floor_number", e.target.value)
                  }
                  placeholder="Floor number (e.g. 1)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />

                <input
                  value={floorForm.floor_name}
                  onChange={(e) =>
                    updateFloorForm("floor_name", e.target.value)
                  }
                  placeholder="Floor name (optional, e.g. Ground Floor)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />

                <select
                  value={floorForm.status}
                  onChange={(e) => updateFloorForm("status", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={closeFloorModal}
                  className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>

                <button
                  onClick={saveFloor}
                  disabled={floorSaving}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {floorSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* <!-- =========================== ROOMS SECTION =========================== --> */}
        {activeSection === "rooms" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">Rooms</h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Every room across every floor and block. Beds are managed in
                    the Bed Management section.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadRooms()}
                    disabled={roomsLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i
                      className={`bi bi-arrow-clockwise ${
                        roomsLoading ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={() => openCreateRoomModal()}
                    disabled={!canWriteHostel}
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i className="bi bi-plus-lg" />
                    New Room
                  </button>
                </div>
              </div>
            </div>

            {/* FILTERS */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="relative xl:col-span-2">
                  <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />

                  <input
                    type="search"
                    value={roomFilters.search}
                    onChange={(e) => updateRoomFilter("search", e.target.value)}
                    placeholder="Search room number..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={roomFilters.room_type}
                  onChange={(e) =>
                    updateRoomFilter("room_type", e.target.value)
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All Types</option>
                  <option value="Single">Single</option>
                  <option value="Double">Double</option>
                  <option value="Triple">Triple</option>
                  <option value="Dorm">Dorm</option>
                </select>

                <select
                  value={roomFilters.status}
                  onChange={(e) => updateRoomFilter("status", e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyRoomFilters}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                  >
                    <i className="bi bi-funnel" />
                    Filter
                  </button>

                  <button
                    type="button"
                    onClick={resetRoomFilters}
                    title="Reset filters"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              </div>
            </div>

            {/* ROOM GRID */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 p-4 sm:p-6">
              {roomsLoading && rooms.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-16 text-gray-500 dark:text-gray-400">
                  <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                  Loading rooms...
                </div>
              )}

              {!roomsLoading && rooms.length === 0 && (
                <div className="mx-auto max-w-sm py-14 text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                    <i className="bi bi-door-open text-2xl" />
                  </span>

                  <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                    No rooms found
                  </h3>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    No rooms match these filters, or none have been created yet.
                  </p>

                  <button
                    type="button"
                    onClick={() => openCreateRoomModal()}
                    disabled={!canWriteHostel}
                    className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    New Room
                  </button>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {rooms.map((room) => {
                  const occupancyPct = room.capacity
                    ? Math.round((room.occupied_count / room.capacity) * 100)
                    : 0;

                  const statusStyles =
                    room.status === "Active"
                      ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                      : room.status === "Maintenance"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                        : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300";

                  return (
                    <div
                      key={room.id}
                      className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div
                        className={`h-1.5 w-full ${
                          room.available_count > 0
                            ? "bg-gradient-to-r from-emerald-500 to-green-500"
                            : "bg-gradient-to-r from-red-500 to-rose-500"
                        }`}
                      />

                      <div className="p-4">
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                              <i className="bi bi-door-open text-sm" />
                            </span>
                            <h5 className="font-bold text-gray-900 dark:text-white">
                              {room.room_number}
                            </h5>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyles}`}
                          >
                            {room.status}
                          </span>
                        </div>

                        <p className="mb-3 truncate text-xs text-gray-500 dark:text-gray-400">
                          {room.hostel_name} · Block {room.block_name} ·{" "}
                          {room.floor_name || `Floor ${room.floor_number}`}
                        </p>

                        <div className="mb-3 flex items-center gap-2">
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:bg-slate-700 dark:text-gray-300">
                            {room.room_type}
                          </span>

                          {room.monthly_rent !== null &&
                            room.monthly_rent !== undefined && (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                ₹{room.monthly_rent}/mo
                              </span>
                            )}
                        </div>

                        <div className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>
                            {room.occupied_count}/{room.capacity} beds
                            occupied
                          </span>
                          <span>{occupancyPct}%</span>
                        </div>

                        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              occupancyPct >= 100
                                ? "bg-red-500"
                                : occupancyPct >= 60
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(occupancyPct, 100)}%` }}
                          />
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            onClick={() => openRoomDetails(room)}
                            title="View details"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600"
                          >
                            <i className="bi bi-eye text-xs" />
                          </button>

                          <button
                            onClick={() => openEditRoomModal(room)}
                            disabled={!canWriteHostel}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-50 py-2 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                          >
                            <i className="bi bi-pencil-square" />
                            Edit
                          </button>

                          <button
                            onClick={() => deleteRoom(room)}
                            disabled={!canWriteHostel}
                            title="Delete room"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                          >
                            <i className="bi bi-trash text-xs" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ROOM MODAL */}
        {roomModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
                    <i className="bi bi-door-open" />
                  </span>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {roomForm.id ? "Edit Room" : "New Room"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeRoomModal}
                  className="text-gray-400 transition hover:text-red-500"
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              <div className="space-y-3">
                <select
                  value={roomForm.floor_id}
                  onChange={(e) => updateRoomForm("floor_id", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">Select floor…</option>
                  {blockOptions.length === 0 && (
                    <option disabled>Create a block & floor first</option>
                  )}
                  {hostelOptions.length > 0 &&
                    hostels.flatMap((hostel) =>
                      (hostel.blocks || []).flatMap((block) =>
                        (block.floors || []).map((floor) => (
                          <option key={floor.id} value={floor.id}>
                            {hostel.hostel_name} - {block.block_name} -{" "}
                            {floor.floor_name || `Floor ${floor.floor_number}`}
                          </option>
                        )),
                      ),
                    )}
                </select>

                <input
                  value={roomForm.room_number}
                  onChange={(e) =>
                    updateRoomForm("room_number", e.target.value)
                  }
                  placeholder="Room number (e.g. 101)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />

                <select
                  value={roomForm.room_type}
                  onChange={(e) => updateRoomForm("room_type", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Single">Single</option>
                  <option value="Double">Double</option>
                  <option value="Triple">Triple</option>
                  <option value="Dorm">Dorm</option>
                </select>

                <select
                  value={roomForm.status}
                  onChange={(e) => updateRoomForm("status", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Active">Active</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <input
                  type="number"
                  value={roomForm.monthly_rent}
                  onChange={(e) =>
                    updateRoomForm("monthly_rent", e.target.value)
                  }
                  placeholder="Monthly rent (optional)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />

                <input
                  value={roomForm.description}
                  onChange={(e) =>
                    updateRoomForm("description", e.target.value)
                  }
                  placeholder="Description (optional)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />

                {!roomForm.id && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Auto-create beds (optional, 0-12)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="12"
                      value={roomForm.initial_bed_count}
                      onChange={(e) =>
                        updateRoomForm("initial_bed_count", e.target.value)
                      }
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Beds A, B, C… will be created automatically. You can
                      always add more later from Bed Management.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={closeRoomModal}
                  className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>

                <button
                  onClick={saveRoom}
                  disabled={roomSaving}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {roomSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ROOM DETAILS MODAL */}
        {roomDetailsOpen && selectedRoom && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-start justify-between bg-gradient-to-r from-violet-500 to-purple-600 p-5 text-white">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                    <i className="bi bi-door-open" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold">
                      Room {selectedRoom.room_number}
                    </h2>
                    <p className="text-xs text-violet-100">
                      {selectedRoom.hostel_name} · Block{" "}
                      {selectedRoom.block_name} ·{" "}
                      {selectedRoom.floor_name ||
                        `Floor ${selectedRoom.floor_number}`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={closeRoomDetails}
                  className="text-white/80 transition hover:text-white"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-5">
                <div className="mb-5 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-700/50">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Capacity
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedRoom.capacity}
                    </p>
                  </div>
                  <div className="rounded-xl bg-red-50 p-3 dark:bg-red-500/10">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Occupied
                    </p>
                    <p className="text-xl font-bold text-red-500">
                      {selectedRoom.occupied_count}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/10">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Available
                    </p>
                    <p className="text-xl font-bold text-emerald-600">
                      {selectedRoom.available_count}
                    </p>
                  </div>
                </div>

                <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                  <i className="bi bi-shield-check text-gray-400" />
                  Wardens
                </h4>
                {(selectedRoom.wardens || []).length === 0 ? (
                  <p className="mb-5 text-sm text-gray-400">
                    No warden assigned.
                  </p>
                ) : (
                  <ul className="mb-5 space-y-1.5">
                    {selectedRoom.wardens.map((warden) => (
                      <li
                        key={warden.id}
                        className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-slate-900/40"
                      >
                        <span className="text-gray-700 dark:text-gray-200">
                          {warden.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {warden.mobile}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                  <i className="bi bi-grid-3x3-gap text-gray-400" />
                  Beds
                </h4>
                <div className="mb-5 space-y-1.5">
                  {(selectedRoom.beds || []).map((bed) => (
                    <div
                      key={bed.id}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-slate-900/40"
                    >
                      <span className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            bed.status === "Occupied"
                              ? "bg-green-500"
                              : "bg-orange-400"
                          }`}
                        />
                        Bed {bed.bed_number}
                      </span>
                      <span
                        className={
                          bed.status === "Occupied"
                            ? "font-medium text-green-600"
                            : "text-orange-500"
                        }
                      >
                        {bed.status === "Occupied" && bed.occupant
                          ? bed.occupant.name
                          : bed.status}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    closeRoomDetails();
                    setActiveSection("beds");
                    updateBedFilter("room_id", selectedRoom.id);
                    loadBeds({
                      filters: {
                        room_id: selectedRoom.id,
                        floor_id: "",
                        block_id: "",
                        status: "",
                      },
                    });
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 active:scale-95"
                >
                  <i className="bi bi-grid-3x3-gap" />
                  Manage Beds
                </button>
              </div>
            </div>
          </div>
        )}

        {/* <!-- =========================== BED MANAGEMENT SECTION =========================== --> */}
        {/* <!-- =========================== BED MANAGEMENT SECTION =========================== --> */}
        {activeSection === "beds" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Bed Management
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Every bed, its status, and its current occupant if any.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadBeds()}
                    disabled={bedsLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i
                      className={`bi bi-arrow-clockwise ${
                        bedsLoading ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={() => openCreateBedModal()}
                    disabled={!canWriteHostel}
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i className="bi bi-plus-lg" />
                    New Bed
                  </button>
                </div>
              </div>
            </div>

            {/* FILTERS */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="relative">
                  <i className="bi bi-door-open absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />

                  <input
                    value={bedFilters.room_id}
                    onChange={(e) => updateBedFilter("room_id", e.target.value)}
                    placeholder="Filter by room ID..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={bedFilters.status}
                  onChange={(e) => updateBedFilter("status", e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  <option value="Vacant">Vacant</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Reserved">Reserved</option>
                </select>

                <div className="flex gap-2 sm:col-span-2 xl:col-span-2">
                  <button
                    type="button"
                    onClick={applyBedFilters}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                  >
                    <i className="bi bi-funnel" />
                    Filter
                  </button>

                  <button
                    type="button"
                    onClick={resetBedFilters}
                    title="Reset filters"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              </div>
            </div>

            {/* BED GRID */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Beds
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {beds.length} bed(s)
                </span>
              </div>

              {bedsLoading && beds.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-16 text-gray-500 dark:text-gray-400">
                  <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                  Loading beds...
                </div>
              )}

              {!bedsLoading && beds.length === 0 && (
                <div className="mx-auto max-w-sm py-14 text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                    <i className="bi bi-grid-3x3-gap text-2xl" />
                  </span>
                  <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                    No beds found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    No beds match these filters, or none exist yet.
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {beds.map((bed) => {
                  const statusAccent =
                    bed.status === "Vacant"
                      ? "from-emerald-500 to-green-500"
                      : bed.status === "Occupied"
                        ? "from-red-500 to-rose-500"
                        : bed.status === "Maintenance"
                          ? "from-amber-500 to-orange-500"
                          : "from-blue-500 to-indigo-500";

                  const statusBadge =
                    bed.status === "Vacant"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                      : bed.status === "Occupied"
                        ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                        : bed.status === "Maintenance"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300";

                  return (
                    <div
                      key={bed.id}
                      className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700"
                    >
                      <div className={`h-1.5 w-full bg-gradient-to-r ${statusAccent}`} />

                      <div className="bg-white p-4 dark:bg-slate-800">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                              <i className="bi bi-grid-3x3-gap text-sm" />
                            </span>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white">
                                Bed {bed.bed_number}
                              </p>
                              <p className="text-xs text-gray-400">
                                Room #{bed.room_id} · {bed.bed_type}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge}`}
                          >
                            {bed.status}
                          </span>
                        </div>

                        <div className="mb-3 flex min-h-[2rem] items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5 text-sm dark:bg-slate-900/40">
                          {bed.occupant ? (
                            <>
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                                {bed.occupant.name?.charAt(0) || "?"}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-gray-700 dark:text-gray-200">
                                {bed.occupant.name}
                              </span>
                              <span className="shrink-0 text-xs text-gray-400">
                                {bed.occupant.student_code}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">
                              No occupant
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {bed.status === "Vacant" && (
                            <button
                              onClick={() => openAllocateModal(bed)}
                              disabled={!canWriteHostel}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-medium text-white transition hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                            >
                              <i className="bi bi-person-plus" />
                              Allocate
                            </button>
                          )}

                          {bed.status === "Occupied" && (
                            <button
                              onClick={() => vacateBed(bed)}
                              disabled={
                                !canWriteHostel || vacatingBedId === bed.id
                              }
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange-500 py-2 text-xs font-medium text-white transition hover:bg-orange-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                            >
                              <i className="bi bi-box-arrow-right" />
                              {vacatingBedId === bed.id
                                ? "Vacating…"
                                : "Vacate"}
                            </button>
                          )}

                          <button
                            onClick={() => openEditBedModal(bed)}
                            disabled={!canWriteHostel}
                            title="Edit bed"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                          >
                            <i className="bi bi-pencil-square text-xs" />
                          </button>

                          <button
                            onClick={() => deleteBed(bed)}
                            disabled={
                              !canWriteHostel || bed.status === "Occupied"
                            }
                            title="Delete bed"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                          >
                            <i className="bi bi-trash text-xs" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* BED MODAL */}
        {bedModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300">
                    <i className="bi bi-grid-3x3-gap" />
                  </span>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {bedForm.id ? "Edit Bed" : "New Bed"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeBedModal}
                  className="text-gray-400 transition hover:text-red-500"
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  value={bedForm.room_id}
                  onChange={(e) => updateBedForm("room_id", e.target.value)}
                  disabled={Boolean(bedForm.id)}
                  placeholder="Room ID"
                  className="input w-full px-4 py-2 rounded-xl border text-sm dark:bg-slate-700 dark:border-slate-600 disabled:opacity-60"
                />

                <input
                  value={bedForm.bed_number}
                  onChange={(e) => updateBedForm("bed_number", e.target.value)}
                  placeholder="Bed number/label (e.g. A)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />

                <select
                  value={bedForm.bed_type}
                  onChange={(e) => updateBedForm("bed_type", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Standard">Standard</option>
                  <option value="Premium">Premium</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={closeBedModal}
                  className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>

                <button
                  onClick={saveBed}
                  disabled={bedSaving}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bedSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ALLOCATE (CHECK-IN) MODAL */}
        {allocateModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                    <i className="bi bi-person-plus" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Allocate Bed
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Bed {allocateTargetBed?.bed_number} · Room #
                      {allocateTargetBed?.room_id}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeAllocateModal}
                  className="text-gray-400 transition hover:text-red-500"
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        searchUnallocatedStudents(studentSearch);
                      }
                    }}
                    placeholder="Search student by name…"
                    className="input flex-1 px-4 py-2 rounded-xl border text-sm dark:bg-slate-700 dark:border-slate-600"
                  />

                  <button
                    onClick={() => searchUnallocatedStudents(studentSearch)}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 active:scale-95"
                  >
                    Search
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto border dark:border-slate-700 rounded-xl divide-y dark:divide-slate-700">
                  {studentSearchLoading && (
                    <p className="text-center text-gray-400 text-sm py-4">
                      Searching…
                    </p>
                  )}

                  {!studentSearchLoading && studentResults.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-4">
                      Search for a student without a current hostel allocation.
                    </p>
                  )}

                  {studentResults.map((student) => (
                    <button
                      type="button"
                      key={student.id}
                      onClick={() => setSelectedStudentId(student.id)}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm ${
                        selectedStudentId === student.id
                          ? "bg-indigo-50 dark:bg-indigo-500/20"
                          : "hover:bg-gray-50 dark:hover:bg-slate-700/50"
                      }`}
                    >
                      <span>
                        {student.name}
                        {student.class_name &&
                          student.class_name !== "Not Assigned" && (
                            <span className="ml-2 text-xs text-gray-400">
                              {student.class_name}
                            </span>
                          )}
                      </span>
                      <span className="text-xs text-gray-400">
                        {student.student_code}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={closeAllocateModal}
                  className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>

                <button
                  onClick={allocateBed}
                  disabled={allocateSaving || !selectedStudentId}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                >
                  {allocateSaving ? "Allocating…" : "Allocate"}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* <!-- =========================== STUDENTS SECTION =========================== --> */}
        {activeSection === "students" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Hostel Students
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Manage hostel student records, room details and stay
                    information
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => loadStudents()}
                  disabled={studentsLoading}
                  className="inline-flex items-center gap-2 self-start rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <i
                    className={`bi bi-arrow-clockwise ${
                      studentsLoading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </button>
              </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                {
                  label: "Total Allocations",
                  value: studentStats.total,
                  icon: "bi-people",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Currently Active",
                  value: studentStats.active,
                  icon: "bi-person-check",
                  classes:
                    "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
                },
                {
                  label: "Checked Out",
                  value: studentStats.checked_out,
                  icon: "bi-box-arrow-right",
                  classes:
                    "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300",
                },
                {
                  label: "Fees Pending",
                  value: studentStats.fee_pending,
                  icon: "bi-cash-coin",
                  classes:
                    "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
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
                        {studentsLoading ? "…" : Number(stat.value || 0)}
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
                    value={studentFilters.search}
                    onChange={(e) =>
                      updateStudentFilter("search", e.target.value)
                    }
                    placeholder="Search student name, code, room..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={studentFilters.status}
                  onChange={(e) =>
                    updateStudentFilter("status", e.target.value)
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="checked_out">Checked Out</option>
                  <option value="all">All</option>
                </select>

                <input
                  value={studentFilters.block_id}
                  onChange={(e) =>
                    updateStudentFilter("block_id", e.target.value)
                  }
                  placeholder="Block ID (optional)"
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyStudentFilters}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                  >
                    <i className="bi bi-funnel" />
                    Filter
                  </button>

                  <button
                    type="button"
                    onClick={resetStudentFilters}
                    title="Reset filters"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              </div>
            </div>

            {/* STUDENTS TABLE */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Hostel Student Records
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {studentAllocations.length} record(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900/40 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Course
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Room
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Block
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Check-In
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Fees
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {studentsLoading && studentAllocations.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                            <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                            Loading students...
                          </div>
                        </td>
                      </tr>
                    )}

                    {!studentsLoading && studentAllocations.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-14 text-center">
                          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                            <i className="bi bi-people text-2xl" />
                          </span>
                          <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                            No students found
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            No allocations match these filters.
                          </p>
                        </td>
                      </tr>
                    )}

                    {studentAllocations.map((row) => (
                      <tr
                        key={row.id}
                        className="transition hover:bg-gray-50 dark:hover:bg-slate-700/40"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                              {(row.student_name || "?")
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>

                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {row.student_name}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {row.student_code}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          <p>
                            {row.course && row.course !== "Not Assigned"
                              ? row.course
                              : "—"}
                          </p>
                          {row.roll_number && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Roll No. {row.roll_number}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {row.room_number || "—"}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {row.block_name || "—"}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {row.check_in_date || "—"}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              row.fee_status === "Paid"
                                ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                                : row.fee_status === "Overdue"
                                  ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                                  : row.fee_status === "Pending"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                    : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300"
                            }`}
                          >
                            {row.fee_status || "—"}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              row.is_active
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                                : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300"
                            }`}
                          >
                            {row.is_active ? "Active" : "Checked Out"}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-3 text-base">
                            <button
                              type="button"
                              onClick={() => openStudentDetails(row)}
                              title="View"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <i className="bi bi-eye" />
                            </button>

                            {row.is_active && (
                              <button
                                type="button"
                                onClick={() => checkoutStudent(row)}
                                disabled={
                                  !canWriteHostel ||
                                  checkingOutStudentId === row.id
                                }
                                title="Check out"
                                className="text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <i className="bi bi-box-arrow-right" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* STUDENT DETAILS MODAL */}
        {studentDetailsOpen && selectedAllocation && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {selectedAllocation.student_name}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedAllocation.student_code}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeStudentDetails}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-gray-50 p-3 dark:bg-slate-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Class
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedAllocation.course &&
                    selectedAllocation.course !== "Not Assigned"
                      ? selectedAllocation.course
                      : "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3 dark:bg-slate-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Roll No.
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedAllocation.roll_number || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3 dark:bg-slate-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Room
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedAllocation.room_number || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3 dark:bg-slate-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Bed
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedAllocation.bed_number || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3 dark:bg-slate-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Block
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedAllocation.block_name || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3 dark:bg-slate-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Floor
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedAllocation.floor_name ||
                      selectedAllocation.floor_number ||
                      "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3 dark:bg-slate-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Check-In
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedAllocation.check_in_date || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3 dark:bg-slate-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Check-Out
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedAllocation.check_out_date || "—"}
                  </p>
                </div>

                <div className="col-span-2 rounded-xl bg-gray-50 p-3 dark:bg-slate-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Fee Status
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedAllocation.fee_status || "—"}
                    {selectedAllocation.fee_amount !== null &&
                      selectedAllocation.fee_amount !== undefined &&
                      ` · ₹${selectedAllocation.fee_amount}`}
                  </p>
                </div>
              </div>

              {selectedAllocation.is_active && (
                <button
                  type="button"
                  onClick={() => {
                    closeStudentDetails();
                    checkoutStudent(selectedAllocation);
                  }}
                  disabled={!canWriteHostel}
                  className="mt-5 w-full rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Check Out Student
                </button>
              )}
            </div>
          </div>
        )}

        {/* <!-- =========================== ROOM ALLOTMENT SECTION =========================== --> */}
        {activeSection === "room-allotment" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Room Allotment
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Allocate hostel rooms and manage student assignments
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => loadAllotments()}
                  disabled={allotmentsLoading}
                  className="inline-flex items-center gap-2 self-start rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <i
                    className={`bi bi-arrow-clockwise ${
                      allotmentsLoading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </button>
              </div>
            </div>

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                {
                  label: "Total Allotments",
                  value: allotmentStats.total,
                  icon: "bi-house-check",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Active Students",
                  value: allotmentStats.active,
                  icon: "bi-person-check",
                  classes:
                    "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
                },
                {
                  label: "Checked Out",
                  value: allotmentStats.checked_out,
                  icon: "bi-box-arrow-right",
                  classes:
                    "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300",
                },
                {
                  label: "Fees Pending",
                  value: allotmentStats.fee_pending,
                  icon: "bi-cash-coin",
                  classes:
                    "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
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
                        {allotmentsLoading ? "…" : Number(stat.value || 0)}
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
                    value={allotmentFilters.search}
                    onChange={(e) =>
                      updateAllotmentFilter("search", e.target.value)
                    }
                    placeholder="Search student or room..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={allotmentFilters.room_type}
                  onChange={(e) =>
                    updateAllotmentFilter("room_type", e.target.value)
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All Room Types</option>
                  <option value="Single">Single</option>
                  <option value="Double">Double</option>
                  <option value="Triple">Triple</option>
                  <option value="Dorm">Dorm</option>
                </select>

                <select
                  value={allotmentFilters.status}
                  onChange={(e) =>
                    updateAllotmentFilter("status", e.target.value)
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="checked_out">Checked Out</option>
                  <option value="all">All</option>
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyAllotmentFilters}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                  >
                    <i className="bi bi-funnel" />
                    Filter
                  </button>

                  <button
                    type="button"
                    onClick={resetAllotmentFilters}
                    title="Reset filters"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              </div>
            </div>

            {/* ALLOTMENT TABLE */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Student Room Allotments
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {allotments.length} record(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900/40 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Room No
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Floor
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">Bed</th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Check-In Date
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {allotmentsLoading && allotments.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                            <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                            Loading allotments...
                          </div>
                        </td>
                      </tr>
                    )}

                    {!allotmentsLoading && allotments.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-14 text-center">
                          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                            <i className="bi bi-house-check text-2xl" />
                          </span>
                          <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                            No allotments found
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            No records match these filters.
                          </p>
                        </td>
                      </tr>
                    )}

                    {allotments.map((row) => (
                      <tr
                        key={row.id}
                        className="transition hover:bg-gray-50 dark:hover:bg-slate-700/40"
                      >
                        <td className="px-6 py-4">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {row.student_name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {row.student_code}
                          </p>
                        </td>

                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {row.room_number || "—"}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {row.floor_name || row.floor_number || "—"}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          Bed {row.bed_number || "—"}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {row.check_in_date || "—"}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              row.is_active
                                ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                                : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300"
                            }`}
                          >
                            {row.is_active ? "Active" : "Checked Out"}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-3 text-base">
                            {row.is_active && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openTransferModal(row)}
                                  disabled={!canWriteHostel}
                                  title="Transfer"
                                  className="text-orange-600 hover:text-orange-800 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <i className="bi bi-arrow-left-right" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => checkoutAllotment(row)}
                                  disabled={
                                    !canWriteHostel ||
                                    checkingOutAllotmentId === row.id
                                  }
                                  title="Check out"
                                  className="text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <i className="bi bi-box-arrow-right" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* TRANSFER MODAL */}
        {transferModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <h2 className="mb-1 text-lg font-bold text-gray-900 dark:text-white">
                Transfer Student
              </h2>
              <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                {transferSource?.student_name} · Currently Room{" "}
                {transferSource?.room_number}, Bed {transferSource?.bed_number}
              </p>

              <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-100 dark:border-slate-700 divide-y dark:divide-slate-700">
                {vacantBedsLoading && (
                  <p className="py-6 text-center text-sm text-gray-400">
                    Loading vacant beds...
                  </p>
                )}

                {!vacantBedsLoading && vacantBeds.length === 0 && (
                  <p className="py-6 text-center text-sm text-gray-400">
                    No vacant beds available right now.
                  </p>
                )}

                {vacantBeds.map((bed) => (
                  <button
                    type="button"
                    key={bed.id}
                    onClick={() => setSelectedTargetBedId(bed.id)}
                    className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm ${
                      selectedTargetBedId === bed.id
                        ? "bg-indigo-50 dark:bg-indigo-500/20"
                        : "hover:bg-gray-50 dark:hover:bg-slate-700/50"
                    }`}
                  >
                    <span>Bed {bed.bed_number}</span>
                    <span className="text-xs text-gray-400">
                      Room #{bed.room_id}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeTransferModal}
                  className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmTransfer}
                  disabled={transferSaving || !selectedTargetBedId}
                  className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {transferSaving ? "Transferring…" : "Transfer"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* <!-- =========================== HOSTEL STAFF SECTION =========================== --> */}
        {activeSection === "staff" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Hostel Staff Management
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Manage wardens, security staff, cleaners and hostel
                    employees
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadStaff()}
                    disabled={staffLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i
                      className={`bi bi-arrow-clockwise ${
                        staffLoading ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={() => openCreateStaffModal()}
                    disabled={!canWriteHostel}
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i className="bi bi-person-plus" />
                    Add Staff
                  </button>
                </div>
              </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                {
                  label: "Total Staff",
                  value: staffStats.total,
                  icon: "bi-people",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Wardens",
                  value: staffStats.wardens,
                  icon: "bi-shield-check",
                  classes:
                    "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300",
                },
                {
                  label: "Security Staff",
                  value: staffStats.security,
                  icon: "bi-shield-lock",
                  classes:
                    "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
                },
                {
                  label: "Support Staff",
                  value: staffStats.support,
                  icon: "bi-tools",
                  classes:
                    "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
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
                        {staffLoading ? "…" : Number(stat.value || 0)}
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
                    value={staffFilters.search}
                    onChange={(e) =>
                      updateStaffFilter("search", e.target.value)
                    }
                    placeholder="Search staff name or code..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={staffFilters.role}
                  onChange={(e) => updateStaffFilter("role", e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All Roles</option>
                  <option value="Warden">Warden</option>
                  <option value="Security Guard">Security Guard</option>
                  <option value="Cleaner">Cleaner</option>
                  <option value="Cook">Cook</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Other">Other</option>
                </select>

                <select
                  value={staffFilters.status}
                  onChange={(e) => updateStaffFilter("status", e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyStaffFilters}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                  >
                    <i className="bi bi-funnel" />
                    Filter
                  </button>

                  <button
                    type="button"
                    onClick={resetStaffFilters}
                    title="Reset filters"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              </div>
            </div>

            {/* STAFF TABLE */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Hostel Staff Records
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {staffList.length} staff member(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900/40 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">
                        Staff
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Assigned Block
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Shift
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {staffLoading && staffList.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                            <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                            Loading staff...
                          </div>
                        </td>
                      </tr>
                    )}

                    {!staffLoading && staffList.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-14 text-center">
                          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                            <i className="bi bi-people text-2xl" />
                          </span>
                          <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                            No staff found
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            No staff match these filters, or none have been
                            added yet.
                          </p>

                          <button
                            type="button"
                            onClick={() => openCreateStaffModal()}
                            disabled={!canWriteHostel}
                            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Add Staff
                          </button>
                        </td>
                      </tr>
                    )}

                    {staffList.map((staff) => (
                      <tr
                        key={staff.id}
                        className="transition hover:bg-gray-50 dark:hover:bg-slate-700/40"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                              {(staff.name || "?")
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>

                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {staff.name}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {staff.staff_code}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {staff.role}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {staff.block_name || "—"}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {staff.shift}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {staff.mobile || "—"}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              staff.status === "Active"
                                ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                                : staff.status === "On Leave"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                  : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300"
                            }`}
                          >
                            {staff.status}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-3 text-base">
                            <button
                              type="button"
                              onClick={() => openStaffDetails(staff)}
                              title="View"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <i className="bi bi-eye" />
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditStaffModal(staff)}
                              disabled={!canWriteHostel}
                              title="Edit"
                              className="text-green-600 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <i className="bi bi-pencil-square" />
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteStaff(staff)}
                              disabled={!canWriteHostel}
                              title="Remove"
                              className="text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <i className="bi bi-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* STAFF MODAL */}
        {staffModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
                {staffForm.id ? "Edit Staff Member" : "Add Staff Member"}
              </h2>

              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    value={staffForm.first_name}
                    onChange={(e) =>
                      updateStaffForm("first_name", e.target.value)
                    }
                    placeholder="First name"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />

                  <input
                    value={staffForm.last_name}
                    onChange={(e) =>
                      updateStaffForm("last_name", e.target.value)
                    }
                    placeholder="Last name"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={staffForm.role}
                  onChange={(e) => updateStaffForm("role", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Warden">Warden</option>
                  <option value="Security Guard">Security Guard</option>
                  <option value="Cleaner">Cleaner</option>
                  <option value="Cook">Cook</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Other">Other</option>
                </select>

                <select
                  value={staffForm.block_id}
                  onChange={(e) => updateStaffForm("block_id", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">No block (hostel-wide)</option>
                  {blockOptions.map((block) => (
                    <option key={block.id} value={block.id}>
                      {block.name}
                    </option>
                  ))}
                </select>

                <select
                  value={staffForm.shift}
                  onChange={(e) => updateStaffForm("shift", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Morning">Morning</option>
                  <option value="Evening">Evening</option>
                  <option value="Night">Night</option>
                </select>

                <input
                  value={staffForm.mobile}
                  onChange={(e) => updateStaffForm("mobile", e.target.value)}
                  placeholder="Mobile number"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />

                <input
                  value={staffForm.email}
                  onChange={(e) => updateStaffForm("email", e.target.value)}
                  placeholder="Email (optional)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />

                <select
                  value={staffForm.status}
                  onChange={(e) => updateStaffForm("status", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeStaffModal}
                  className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveStaff}
                  disabled={staffSaving}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {staffSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STAFF DETAILS MODAL */}
        {staffDetailsOpen && selectedStaff && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {selectedStaff.name}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedStaff.staff_code}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeStaffDetails}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-gray-50 p-3 dark:bg-slate-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Role
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedStaff.role}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3 dark:bg-slate-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Shift
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedStaff.shift}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3 dark:bg-slate-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Block
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedStaff.block_name || "Hostel-wide"}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3 dark:bg-slate-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Status
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedStaff.status}
                  </p>
                </div>

                <div className="col-span-2 rounded-xl bg-gray-50 p-3 dark:bg-slate-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Contact
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedStaff.mobile || "—"}
                    {selectedStaff.email && ` · ${selectedStaff.email}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* <!-- =========================== VISITORS SECTION =========================== --> */}
        {activeSection === "visitors" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Visitors Management
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Track hostel visitors, entry approvals and visitor history
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadVisitors()}
                    disabled={visitorsLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i
                      className={`bi bi-arrow-clockwise ${
                        visitorsLoading ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={() => openVisitorModal()}
                    disabled={!canWriteHostel}
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i className="bi bi-person-plus" />
                    Add Visitor
                  </button>
                </div>
              </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                {
                  label: "Today's Visitors",
                  value: visitorStats.today,
                  icon: "bi-calendar-check",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Inside Hostel",
                  value: visitorStats.inside,
                  icon: "bi-door-open",
                  classes:
                    "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
                },
                {
                  label: "Approved Visits",
                  value: visitorStats.approved,
                  icon: "bi-check-circle",
                  classes:
                    "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
                },
                {
                  label: "Pending Requests",
                  value: visitorStats.pending,
                  icon: "bi-hourglass-split",
                  classes:
                    "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
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
                        {visitorsLoading ? "…" : Number(stat.value || 0)}
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
                    value={visitorFilters.search}
                    onChange={(e) =>
                      updateVisitorFilter("search", e.target.value)
                    }
                    placeholder="Search visitor or student..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={visitorFilters.relation}
                  onChange={(e) =>
                    updateVisitorFilter("relation", e.target.value)
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All Visit Types</option>
                  <option value="Parent">Parent</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Friend">Friend</option>
                  <option value="Relative">Relative</option>
                  <option value="Other">Other</option>
                </select>

                <select
                  value={visitorFilters.status}
                  onChange={(e) =>
                    updateVisitorFilter("status", e.target.value)
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Checked Out">Checked Out</option>
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyVisitorFilters}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                  >
                    <i className="bi bi-funnel" />
                    Filter
                  </button>

                  <button
                    type="button"
                    onClick={resetVisitorFilters}
                    title="Reset filters"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              </div>
            </div>

            {/* VISITORS TABLE */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Visitor Entry Records
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {visitors.length} record(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900/40 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">
                        Visitor
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Relation
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Block / Room
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Check-In
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Check-Out
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {visitorsLoading && visitors.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                            <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                            Loading visitors...
                          </div>
                        </td>
                      </tr>
                    )}

                    {!visitorsLoading && visitors.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-14 text-center">
                          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                            <i className="bi bi-person-lines-fill text-2xl" />
                          </span>
                          <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                            No visitors found
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            No records match these filters.
                          </p>
                        </td>
                      </tr>
                    )}

                    {visitors.map((visitor) => (
                      <tr
                        key={visitor.id}
                        className="transition hover:bg-gray-50 dark:hover:bg-slate-700/40"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                              {(visitor.visitor_name || "?")
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>

                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {visitor.visitor_name}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {visitor.visitor_code}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {visitor.student_name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {visitor.student_code}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {visitor.relation}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {visitor.block_name && visitor.room_number
                            ? `${visitor.block_name} / ${visitor.room_number}`
                            : "—"}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {visitor.check_in_time
                            ? new Date(visitor.check_in_time).toLocaleString()
                            : "—"}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {visitor.check_out_time
                            ? new Date(visitor.check_out_time).toLocaleString()
                            : "—"}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              visitor.status === "Approved"
                                ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                                : visitor.status === "Pending"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                  : visitor.status === "Rejected"
                                    ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                                    : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300"
                            }`}
                          >
                            {visitor.status}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-3 text-base">
                            {visitor.status === "Pending" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => approveVisitor(visitor)}
                                  disabled={
                                    !canWriteHostel ||
                                    visitorActioningId === visitor.id
                                  }
                                  title="Approve"
                                  className="text-green-600 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <i className="bi bi-check-circle" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => rejectVisitor(visitor)}
                                  disabled={
                                    !canWriteHostel ||
                                    visitorActioningId === visitor.id
                                  }
                                  title="Reject"
                                  className="text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <i className="bi bi-x-circle" />
                                </button>
                              </>
                            )}

                            {visitor.status === "Approved" && (
                              <button
                                type="button"
                                onClick={() => checkoutVisitor(visitor)}
                                disabled={
                                  !canWriteHostel ||
                                  visitorActioningId === visitor.id
                                }
                                title="Check out"
                                className="text-orange-600 hover:text-orange-800 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <i className="bi bi-box-arrow-right" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => deleteVisitor(visitor)}
                              disabled={!canWriteHostel}
                              title="Delete"
                              className="text-gray-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <i className="bi bi-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* NEW VISITOR MODAL */}
        {visitorModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
                Add Visitor
              </h2>

              <div className="space-y-3">
                <input
                  value={visitorForm.visitor_name}
                  onChange={(e) =>
                    updateVisitorForm("visitor_name", e.target.value)
                  }
                  placeholder="Visitor name"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />

                <input
                  value={visitorForm.visitor_mobile}
                  onChange={(e) =>
                    updateVisitorForm("visitor_mobile", e.target.value)
                  }
                  placeholder="Visitor mobile (optional)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />

                <select
                  value={visitorForm.relation}
                  onChange={(e) =>
                    updateVisitorForm("relation", e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Parent">Parent</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Friend">Friend</option>
                  <option value="Relative">Relative</option>
                  <option value="Other">Other</option>
                </select>

                <input
                  value={visitorForm.purpose}
                  onChange={(e) => updateVisitorForm("purpose", e.target.value)}
                  placeholder="Purpose of visit (optional)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />

                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                    Visiting Student
                  </label>

                  <div className="flex gap-2">
                    <input
                      value={visitorStudentSearch}
                      onChange={(e) => setVisitorStudentSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          searchStudentsForVisitor(visitorStudentSearch);
                        }
                      }}
                      placeholder="Search student by name..."
                      className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        searchStudentsForVisitor(visitorStudentSearch)
                      }
                      className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                    >
                      Search
                    </button>
                  </div>

                  {selectedVisitorStudent && (
                    <p className="mt-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                      Selected: {selectedVisitorStudent.name} (
                      {selectedVisitorStudent.student_code})
                    </p>
                  )}

                  <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-gray-100 dark:border-slate-700 divide-y dark:divide-slate-700">
                    {visitorStudentSearchLoading && (
                      <p className="py-4 text-center text-xs text-gray-400">
                        Searching...
                      </p>
                    )}

                    {!visitorStudentSearchLoading &&
                      visitorStudentResults.length === 0 && (
                        <p className="py-4 text-center text-xs text-gray-400">
                          Search for a student to select them.
                        </p>
                      )}

                    {visitorStudentResults.map((student) => (
                      <button
                        type="button"
                        key={student.id}
                        onClick={() => selectVisitorStudent(student)}
                        className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                          selectedVisitorStudent?.id === student.id
                            ? "bg-indigo-50 dark:bg-indigo-500/20"
                            : "hover:bg-gray-50 dark:hover:bg-slate-700/50"
                        }`}
                      >
                        <span>
                          {student.name}
                          {student.is_hostel_resident &&
                            student.room_number && (
                              <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-500/10 dark:text-green-300">
                                Room {student.room_number}
                              </span>
                            )}
                        </span>
                        <span className="text-xs text-gray-400">
                          {student.student_code}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeVisitorModal}
                  className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveVisitor}
                  disabled={visitorSaving}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {visitorSaving ? "Saving…" : "Log Visitor"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* <!-- =========================== ATTENDANCE SECTION =========================== --> */}
        {activeSection === "attendance" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Hostel Attendance
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Track daily student attendance, hostel presence and
                    absentees
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => changeAttendanceDate(e.target.value)}
                    className="rounded-lg border-0 bg-white/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/70 focus:ring-2 focus:ring-white/40 [color-scheme:dark]"
                  />

                  <button
                    type="button"
                    onClick={() => loadAttendance()}
                    disabled={attendanceLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i
                      className={`bi bi-arrow-clockwise ${
                        attendanceLoading ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              {[
                {
                  label: "Total Residents",
                  value: attendanceStats.total,
                  icon: "bi-people",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Present",
                  value: attendanceStats.present,
                  icon: "bi-check-circle",
                  classes:
                    "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
                },
                {
                  label: "Absent",
                  value: attendanceStats.absent,
                  icon: "bi-x-circle",
                  classes:
                    "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
                },
                {
                  label: "On Leave",
                  value: attendanceStats.on_leave,
                  icon: "bi-airplane",
                  classes:
                    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                },
                {
                  label: "Late Entry",
                  value: attendanceStats.late_entry,
                  icon: "bi-clock-history",
                  classes:
                    "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300",
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
                        {attendanceLoading ? "…" : Number(stat.value || 0)}
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="relative xl:col-span-2">
                  <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />

                  <input
                    type="search"
                    value={attendanceFilters.search}
                    onChange={(e) =>
                      updateAttendanceFilter("search", e.target.value)
                    }
                    placeholder="Search student or room..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={attendanceFilters.status}
                  onChange={(e) =>
                    updateAttendanceFilter("status", e.target.value)
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Late Entry">Late Entry</option>
                  <option value="Not Marked">Not Marked</option>
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyAttendanceFilters}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                  >
                    <i className="bi bi-funnel" />
                    Filter
                  </button>

                  <button
                    type="button"
                    onClick={resetAttendanceFilters}
                    title="Reset filters"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              </div>
            </div>

            {/* ATTENDANCE TABLE */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Daily Attendance Records
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {attendanceDate} · {attendance.length} resident(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900/40 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Room
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Block
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Check-In Time
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Attendance
                      </th>
                      <th className="px-6 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {attendanceLoading && attendance.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                            <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                            Loading attendance...
                          </div>
                        </td>
                      </tr>
                    )}

                    {!attendanceLoading && attendance.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-14 text-center">
                          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                            <i className="bi bi-calendar-check text-2xl" />
                          </span>
                          <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                            No residents found
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            No students match these filters, or no one is
                            currently allocated a bed.
                          </p>
                        </td>
                      </tr>
                    )}

                    {attendance.map((row) => (
                      <tr
                        key={row.student_id}
                        className="transition hover:bg-gray-50 dark:hover:bg-slate-700/40"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                              {(row.student_name || "?")
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>

                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {row.student_name}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {row.student_code}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {row.room_number || "—"}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {row.block_name || "—"}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {row.check_in_time
                            ? new Date(row.check_in_time).toLocaleTimeString()
                            : "—"}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              row.status === "Present"
                                ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                                : row.status === "Absent"
                                  ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                                  : row.status === "On Leave"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                    : row.status === "Late Entry"
                                      ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
                                      : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-3 text-base">
                            <button
                              type="button"
                              onClick={() => markAttendance(row, "Present")}
                              disabled={
                                !canWriteHostel ||
                                markingStudentId === row.student_id
                              }
                              title="Mark Present"
                              className="text-green-600 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <i className="bi bi-check-circle" />
                            </button>

                            <button
                              type="button"
                              onClick={() => markAttendance(row, "Absent")}
                              disabled={
                                !canWriteHostel ||
                                markingStudentId === row.student_id
                              }
                              title="Mark Absent"
                              className="text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <i className="bi bi-x-circle" />
                            </button>

                            <button
                              type="button"
                              onClick={() => markAttendance(row, "On Leave")}
                              disabled={
                                !canWriteHostel ||
                                markingStudentId === row.student_id
                              }
                              title="Mark On Leave"
                              className="text-amber-600 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <i className="bi bi-airplane" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* <!-- =========================== CHECK-IN / CHECK-OUT SECTION =========================== --> */}
        {activeSection === "checkin-checkout" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Check-In / Check-Out Management
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Monitor hostel entries, exits, late returns and movement
                    records
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadMovements()}
                    disabled={movementsLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i
                      className={`bi bi-arrow-clockwise ${
                        movementsLoading ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={() => openCheckoutModal()}
                    disabled={!canWriteHostel}
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i className="bi bi-box-arrow-right" />
                    New Check-Out
                  </button>
                </div>
              </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                {
                  label: "Inside Hostel",
                  value: movementStats.inside,
                  icon: "bi-house-check",
                  classes:
                    "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
                },
                {
                  label: "Checked Out",
                  value: movementStats.checked_out,
                  icon: "bi-box-arrow-right",
                  classes:
                    "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
                },
                {
                  label: "Late Entries",
                  value: movementStats.late_entries,
                  icon: "bi-clock-history",
                  classes:
                    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                },
                {
                  label: "Returned",
                  value: movementStats.returned,
                  icon: "bi-box-arrow-in-right",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
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
                        {movementsLoading ? "…" : Number(stat.value || 0)}
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="relative xl:col-span-2">
                  <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />

                  <input
                    type="search"
                    value={movementFilters.search}
                    onChange={(e) =>
                      updateMovementFilter("search", e.target.value)
                    }
                    placeholder="Search student, room or ID..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={movementFilters.status}
                  onChange={(e) =>
                    updateMovementFilter("status", e.target.value)
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  <option value="Outside Hostel">Outside Hostel</option>
                  <option value="Returned">Returned</option>
                  <option value="Late Entry">Late Entry</option>
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyMovementFilters}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                  >
                    <i className="bi bi-funnel" />
                    Filter
                  </button>

                  <button
                    type="button"
                    onClick={resetMovementFilters}
                    title="Reset filters"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              </div>
            </div>

            {/* CHECK-IN / OUT TABLE */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Student Movement Records
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {movements.length} record(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900/40 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Room
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Block
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Check-Out
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Expected Return
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Check-In
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {movementsLoading && movements.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                            <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                            Loading movement records...
                          </div>
                        </td>
                      </tr>
                    )}

                    {!movementsLoading && movements.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-14 text-center">
                          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                            <i className="bi bi-box-arrow-in-right text-2xl" />
                          </span>
                          <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                            No movement records found
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            No records match these filters.
                          </p>
                        </td>
                      </tr>
                    )}

                    {movements.map((movement) => (
                      <tr
                        key={movement.id}
                        className="transition hover:bg-gray-50 dark:hover:bg-slate-700/40"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                              {(movement.student_name || "?")
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>

                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {movement.student_name}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {movement.student_code}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {movement.room_number || "—"}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {movement.block_name || "—"}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {movement.check_out_time
                            ? new Date(movement.check_out_time).toLocaleString()
                            : "—"}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {movement.expected_return_time
                            ? new Date(
                                movement.expected_return_time,
                              ).toLocaleString()
                            : "—"}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {movement.check_in_time
                            ? new Date(movement.check_in_time).toLocaleString()
                            : "—"}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              movement.status === "Returned"
                                ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                                : movement.status === "Late Entry"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                  : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                            }`}
                          >
                            {movement.status}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-3 text-base">
                            {movement.status === "Outside Hostel" && (
                              <button
                                type="button"
                                onClick={() => checkInMovement(movement)}
                                disabled={
                                  !canWriteHostel ||
                                  checkingInId === movement.id
                                }
                                title="Check in"
                                className="text-green-600 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <i className="bi bi-box-arrow-in-right" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* LATE ENTRY ALERT */}
            {movementStats.late_entries > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                    <i className="bi bi-exclamation-triangle" />
                  </div>

                  <div>
                    <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                      Late Entry Alert
                    </h3>

                    <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                      {movementStats.late_entries} student(s) entered the hostel
                      after their expected return time. Review the records
                      above.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* NEW CHECK-OUT MODAL */}
        {checkoutModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
                New Check-Out
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                    Student
                  </label>

                  <div className="flex gap-2">
                    <input
                      value={movementStudentSearch}
                      onChange={(e) => setMovementStudentSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          searchStudentsForMovement(movementStudentSearch);
                        }
                      }}
                      placeholder="Search student by name..."
                      className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        searchStudentsForMovement(movementStudentSearch)
                      }
                      className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                    >
                      Search
                    </button>
                  </div>

                  {selectedMovementStudent && (
                    <p className="mt-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                      Selected: {selectedMovementStudent.name} (
                      {selectedMovementStudent.student_code})
                    </p>
                  )}

                  <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-gray-100 dark:border-slate-700 divide-y dark:divide-slate-700">
                    {movementStudentSearchLoading && (
                      <p className="py-4 text-center text-xs text-gray-400">
                        Searching...
                      </p>
                    )}

                    {!movementStudentSearchLoading &&
                      movementStudentResults.length === 0 && (
                        <p className="py-4 text-center text-xs text-gray-400">
                          Search for a student to select them.
                        </p>
                      )}

                    {movementStudentResults.map((student) => (
                      <button
                        type="button"
                        key={student.id}
                        onClick={() => selectMovementStudent(student)}
                        className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                          selectedMovementStudent?.id === student.id
                            ? "bg-indigo-50 dark:bg-indigo-500/20"
                            : "hover:bg-gray-50 dark:hover:bg-slate-700/50"
                        }`}
                      >
                        <span>{student.name}</span>
                        <span className="text-xs text-gray-400">
                          {student.student_code}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                    Expected Return Time
                  </label>
                  <input
                    type="datetime-local"
                    value={checkoutForm.expected_return_time}
                    onChange={(e) =>
                      updateCheckoutForm("expected_return_time", e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <input
                  value={checkoutForm.purpose}
                  onChange={(e) =>
                    updateCheckoutForm("purpose", e.target.value)
                  }
                  placeholder="Purpose (optional)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCheckoutModal}
                  className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveCheckout}
                  disabled={checkoutSaving}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {checkoutSaving ? "Saving…" : "Record Check-Out"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* <!-- =========================== LEAVE REQUEST SECTION =========================== --> */}
        {activeSection === "leave-requests" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Leave Request Management
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Manage student leave applications, approvals and return
                    tracking
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadLeaveRequests()}
                    disabled={leaveLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i
                      className={`bi bi-arrow-clockwise ${
                        leaveLoading ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={() => openLeaveModal()}
                    disabled={!canWriteHostel}
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i className="bi bi-plus-circle" />
                    New Leave Request
                  </button>
                </div>
              </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                {
                  label: "Total Requests",
                  value: leaveStats.total,
                  icon: "bi-journal-text",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Pending Approval",
                  value: leaveStats.pending,
                  icon: "bi-hourglass-split",
                  classes:
                    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                },
                {
                  label: "Approved",
                  value: leaveStats.approved,
                  icon: "bi-check-circle",
                  classes:
                    "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
                },
                {
                  label: "Rejected",
                  value: leaveStats.rejected,
                  icon: "bi-x-circle",
                  classes:
                    "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
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
                        {leaveLoading ? "…" : Number(stat.value || 0)}
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="relative xl:col-span-2">
                  <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />

                  <input
                    type="search"
                    value={leaveFilters.search}
                    onChange={(e) =>
                      updateLeaveFilter("search", e.target.value)
                    }
                    placeholder="Search student or leave ID..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={leaveFilters.status}
                  onChange={(e) => updateLeaveFilter("status", e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Returned">Returned</option>
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyLeaveFilters}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                  >
                    <i className="bi bi-funnel" />
                    Filter
                  </button>

                  <button
                    type="button"
                    onClick={resetLeaveFilters}
                    title="Reset filters"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              </div>
            </div>

            {/* LEAVE REQUEST TABLE */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Leave Applications
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {leaveRequests.length} request(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900/40 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Room
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Leave Type
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        From
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">To</th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Reason
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {leaveLoading && leaveRequests.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                            <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                            Loading leave requests...
                          </div>
                        </td>
                      </tr>
                    )}

                    {!leaveLoading && leaveRequests.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-14 text-center">
                          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                            <i className="bi bi-journal-check text-2xl" />
                          </span>
                          <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                            No leave requests found
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            No records match these filters.
                          </p>
                        </td>
                      </tr>
                    )}

                    {leaveRequests.map((leave) => (
                      <tr
                        key={leave.id}
                        className="transition hover:bg-gray-50 dark:hover:bg-slate-700/40"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                              {(leave.student_name || "?")
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>

                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {leave.student_name}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {leave.student_code}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {leave.block_name && leave.room_number
                            ? `${leave.block_name}-${leave.room_number}`
                            : "—"}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {leave.leave_type}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {leave.from_date}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {leave.to_date}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {leave.reason || "—"}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              leave.status === "Approved"
                                ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                                : leave.status === "Pending"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                  : leave.status === "Rejected"
                                    ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                                    : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300"
                            }`}
                          >
                            {leave.status}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-3 text-base">
                            {leave.status === "Pending" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => approveLeave(leave)}
                                  disabled={
                                    !canWriteHostel ||
                                    leaveActioningId === leave.id
                                  }
                                  title="Approve"
                                  className="text-green-600 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <i className="bi bi-check-circle" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => rejectLeave(leave)}
                                  disabled={
                                    !canWriteHostel ||
                                    leaveActioningId === leave.id
                                  }
                                  title="Reject"
                                  className="text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <i className="bi bi-x-circle" />
                                </button>
                              </>
                            )}

                            {leave.status === "Approved" && (
                              <button
                                type="button"
                                onClick={() => markLeaveReturned(leave)}
                                disabled={
                                  !canWriteHostel ||
                                  leaveActioningId === leave.id
                                }
                                title="Mark returned"
                                className="text-indigo-600 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <i className="bi bi-box-arrow-in-right" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => deleteLeave(leave)}
                              disabled={!canWriteHostel}
                              title="Delete"
                              className="text-gray-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <i className="bi bi-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PENDING ALERT */}
            {leaveStats.pending > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                    <i className="bi bi-clock-history" />
                  </div>

                  <div>
                    <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                      Pending Leave Requests
                    </h3>

                    <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                      {leaveStats.pending} leave request(s) are waiting for
                      approval. Review pending applications to avoid delays.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* NEW LEAVE REQUEST MODAL */}
        {leaveModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
                New Leave Request
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                    Student
                  </label>

                  <div className="flex gap-2">
                    <input
                      value={leaveStudentSearch}
                      onChange={(e) => setLeaveStudentSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          searchStudentsForLeave(leaveStudentSearch);
                        }
                      }}
                      placeholder="Search student by name..."
                      className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />

                    <button
                      type="button"
                      onClick={() => searchStudentsForLeave(leaveStudentSearch)}
                      className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                    >
                      Search
                    </button>
                  </div>

                  {selectedLeaveStudent && (
                    <p className="mt-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                      Selected: {selectedLeaveStudent.name} (
                      {selectedLeaveStudent.student_code})
                    </p>
                  )}

                  <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-gray-100 dark:border-slate-700 divide-y dark:divide-slate-700">
                    {leaveStudentSearchLoading && (
                      <p className="py-4 text-center text-xs text-gray-400">
                        Searching...
                      </p>
                    )}

                    {!leaveStudentSearchLoading &&
                      leaveStudentResults.length === 0 && (
                        <p className="py-4 text-center text-xs text-gray-400">
                          Search for a student to select them.
                        </p>
                      )}

                    {leaveStudentResults.map((student) => (
                      <button
                        type="button"
                        key={student.id}
                        onClick={() => selectLeaveStudent(student)}
                        className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                          selectedLeaveStudent?.id === student.id
                            ? "bg-indigo-50 dark:bg-indigo-500/20"
                            : "hover:bg-gray-50 dark:hover:bg-slate-700/50"
                        }`}
                      >
                        <span>{student.name}</span>
                        <span className="text-xs text-gray-400">
                          {student.student_code}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <select
                  value={leaveForm.leave_type}
                  onChange={(e) =>
                    updateLeaveForm("leave_type", e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Weekend Leave">Weekend Leave</option>
                  <option value="Medical Leave">Medical Leave</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                  <option value="Other">Other</option>
                </select>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={leaveForm.from_date}
                      onChange={(e) =>
                        updateLeaveForm("from_date", e.target.value)
                      }
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={leaveForm.to_date}
                      onChange={(e) =>
                        updateLeaveForm("to_date", e.target.value)
                      }
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <textarea
                  value={leaveForm.reason}
                  onChange={(e) => updateLeaveForm("reason", e.target.value)}
                  placeholder="Reason (optional)"
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeLeaveModal}
                  className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveLeaveRequest}
                  disabled={leaveSaving}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {leaveSaving ? "Submitting…" : "Submit Request"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* <!-- =========================== MESS MENU SECTION =========================== --> */}
        {activeSection === "mess-menu" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-yellow-600 to-orange-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Mess Menu
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Plan and manage the weekly hostel mess menu
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => loadMenu()}
                  disabled={menuLoading}
                  className="inline-flex items-center gap-2 self-start rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <i
                    className={`bi bi-arrow-clockwise ${
                      menuLoading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </button>
              </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                {
                  label: "Meal Slots Planned",
                  value: menuStats.configured,
                  icon: "bi-check2-square",
                  classes:
                    "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
                },
                {
                  label: "Total Meal Slots",
                  value: menuStats.total_slots,
                  icon: "bi-grid-3x3",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Not Yet Planned",
                  value: menuStats.missing,
                  icon: "bi-exclamation-circle",
                  classes:
                    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
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
                        {menuLoading ? "…" : Number(stat.value || 0)}
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

            {/* WEEKLY MENU GRID */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Weekly Menu
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Click any cell to edit
                </span>
              </div>

              {menuLoading && menuGrid.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-gray-500 dark:text-gray-400">
                  <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                  Loading menu...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[960px] text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900/40 dark:text-gray-400">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">
                          Day
                        </th>
                        {MESS_MENU_MEALS.map((meal) => (
                          <th
                            key={meal}
                            className="px-4 py-3 text-left font-semibold"
                          >
                            {meal}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {menuGrid.map((dayRow) => (
                        <tr key={dayRow.day_of_week}>
                          <td className="px-4 py-3 align-top font-semibold text-gray-900 dark:text-white">
                            {dayRow.day_of_week}
                          </td>

                          {MESS_MENU_MEALS.map((meal) => {
                            const entry = dayRow.meals[meal];

                            return (
                              <td
                                key={meal}
                                className="group relative cursor-pointer px-4 py-3 align-top hover:bg-gray-50 dark:hover:bg-slate-700/40"
                                onClick={() =>
                                  openEntryModal(
                                    dayRow.day_of_week,
                                    meal,
                                    entry,
                                  )
                                }
                              >
                                {entry.items ? (
                                  <>
                                    <p className="whitespace-pre-line text-gray-700 dark:text-gray-200">
                                      {entry.items}
                                    </p>
                                    {entry.timing && (
                                      <p className="mt-1 text-xs text-gray-400">
                                        {entry.timing}
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-xs text-gray-400 italic">
                                    Not planned
                                  </span>
                                )}

                                <i className="bi bi-pencil-square absolute right-2 top-2 text-xs text-gray-300 opacity-0 transition group-hover:opacity-100" />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* MENU ENTRY MODAL */}
        {entryModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <h2 className="mb-1 text-lg font-bold text-gray-900 dark:text-white">
                {entryForm.day_of_week} · {entryForm.meal_type}
              </h2>
              <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                Edit the menu for this day and meal
              </p>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                    Items
                  </label>
                  <textarea
                    value={entryForm.items}
                    onChange={(e) => updateEntryForm("items", e.target.value)}
                    placeholder="e.g. Idli, Sambar, Chutney, Tea"
                    rows={4}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                    Timing (optional)
                  </label>
                  <input
                    value={entryForm.timing}
                    onChange={(e) => updateEntryForm("timing", e.target.value)}
                    placeholder="e.g. 7:30 AM - 9:00 AM"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEntryModal}
                  className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveEntry}
                  disabled={entrySaving}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {entrySaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* <!-- =========================== MEAL ATTENDANCE SECTION =========================== --> */}
        {activeSection === "meal-attendance" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-lime-600 to-emerald-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Meal Attendance
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Track which residents took each meal, for mess billing and
                    wastage control
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={mealDate}
                    onChange={(e) => changeMealDate(e.target.value)}
                    className="rounded-lg border-0 bg-white/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/70 focus:ring-2 focus:ring-white/40 [color-scheme:dark]"
                  />

                  <select
                    value={mealType}
                    onChange={(e) => changeMealType(e.target.value)}
                    className="rounded-lg border-0 bg-white/20 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-white/40 [&>option]:text-gray-900"
                  >
                    {MESS_MENU_MEALS.map((meal) => (
                      <option key={meal} value={meal}>
                        {meal}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => loadMealAttendance()}
                    disabled={mealAttendanceLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i
                      className={`bi bi-arrow-clockwise ${
                        mealAttendanceLoading ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={markAllPresent}
                    disabled={!canWriteHostel || bulkMarking}
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i className="bi bi-check2-all" />
                    {bulkMarking ? "Marking…" : "Mark All Present"}
                  </button>
                </div>
              </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                {
                  label: "Total Residents",
                  value: mealStats.total,
                  icon: "bi-people",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Present",
                  value: mealStats.present,
                  icon: "bi-check-circle",
                  classes:
                    "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
                },
                {
                  label: "Absent",
                  value: mealStats.absent,
                  icon: "bi-x-circle",
                  classes:
                    "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
                },
                {
                  label: "Not Marked",
                  value: mealStats.not_marked,
                  icon: "bi-question-circle",
                  classes:
                    "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300",
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
                        {mealAttendanceLoading ? "…" : Number(stat.value || 0)}
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="relative xl:col-span-2">
                  <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />

                  <input
                    type="search"
                    value={mealFilters.search}
                    onChange={(e) => updateMealFilter("search", e.target.value)}
                    placeholder="Search student or room..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={mealFilters.status}
                  onChange={(e) => updateMealFilter("status", e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Not Marked">Not Marked</option>
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyMealFilters}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                  >
                    <i className="bi bi-funnel" />
                    Filter
                  </button>

                  <button
                    type="button"
                    onClick={resetMealFilters}
                    title="Reset filters"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              </div>
            </div>

            {/* MEAL ATTENDANCE TABLE */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {mealType} Attendance
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {mealDate} · {mealAttendance.length} resident(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900/40 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Room
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Block
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {mealAttendanceLoading && mealAttendance.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                            <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                            Loading meal attendance...
                          </div>
                        </td>
                      </tr>
                    )}

                    {!mealAttendanceLoading && mealAttendance.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-14 text-center">
                          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                            <i className="bi bi-clipboard-check text-2xl" />
                          </span>
                          <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                            No residents found
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            No students match these filters, or no one is
                            currently allocated a bed.
                          </p>
                        </td>
                      </tr>
                    )}

                    {mealAttendance.map((row) => (
                      <tr
                        key={row.student_id}
                        className="transition hover:bg-gray-50 dark:hover:bg-slate-700/40"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                              {(row.student_name || "?")
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>

                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {row.student_name}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {row.student_code}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {row.room_number || "—"}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {row.block_name || "—"}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              row.status === "Present"
                                ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                                : row.status === "Absent"
                                  ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                                  : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-3 text-base">
                            <button
                              type="button"
                              onClick={() => markMealAttendance(row, "Present")}
                              disabled={
                                !canWriteHostel ||
                                markingMealStudentId === row.student_id
                              }
                              title="Mark Present"
                              className="text-green-600 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <i className="bi bi-check-circle" />
                            </button>

                            <button
                              type="button"
                              onClick={() => markMealAttendance(row, "Absent")}
                              disabled={
                                !canWriteHostel ||
                                markingMealStudentId === row.student_id
                              }
                              title="Mark Absent"
                              className="text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <i className="bi bi-x-circle" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* <!-- =========================== COMPLAINTS SECTION =========================== --> */}
        {activeSection === "complaints" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Hostel Complaints
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Complaints filed by residents through their student portal
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => loadComplaints()}
                  disabled={complaintsLoading}
                  className="inline-flex items-center gap-2 self-start rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <i
                    className={`bi bi-arrow-clockwise ${
                      complaintsLoading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </button>
              </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                {
                  label: "Total Complaints",
                  value: complaintStats.total,
                  icon: "bi-chat-square-text",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Pending",
                  value: complaintStats.pending,
                  icon: "bi-hourglass-split",
                  classes:
                    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                },
                {
                  label: "In Progress",
                  value: complaintStats.in_progress,
                  icon: "bi-arrow-repeat",
                  classes:
                    "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
                },
                {
                  label: "Resolved",
                  value: complaintStats.resolved,
                  icon: "bi-check-circle",
                  classes:
                    "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
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
                        {complaintsLoading ? "…" : Number(stat.value || 0)}
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
                    value={complaintFilters.search}
                    onChange={(e) =>
                      updateComplaintFilter("search", e.target.value)
                    }
                    placeholder="Search student, room or issue..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={complaintFilters.status}
                  onChange={(e) =>
                    updateComplaintFilter("status", e.target.value)
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>

                <select
                  value={complaintFilters.priority}
                  onChange={(e) =>
                    updateComplaintFilter("priority", e.target.value)
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All Priorities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyComplaintFilters}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                  >
                    <i className="bi bi-funnel" />
                    Filter
                  </button>

                  <button
                    type="button"
                    onClick={resetComplaintFilters}
                    title="Reset filters"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              </div>
            </div>

            {/* COMPLAINTS TABLE */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Complaint Records
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {complaints.length} complaint(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900/40 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Room
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Issue
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {complaintsLoading && complaints.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                            <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                            Loading complaints...
                          </div>
                        </td>
                      </tr>
                    )}

                    {!complaintsLoading && complaints.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-14 text-center">
                          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                            <i className="bi bi-chat-square-text text-2xl" />
                          </span>
                          <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                            No complaints found
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            No records match these filters.
                          </p>
                        </td>
                      </tr>
                    )}

                    {complaints.map((complaint) => (
                      <tr
                        key={complaint.id}
                        className="transition hover:bg-gray-50 dark:hover:bg-slate-700/40"
                      >
                        <td className="px-6 py-4">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {complaint.student_name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {complaint.student_code}
                          </p>
                        </td>

                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {complaint.room_number || "—"}
                        </td>

                        <td className="max-w-xs px-6 py-4 text-gray-600 dark:text-gray-300">
                          <p className="line-clamp-2">{complaint.issue}</p>
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {complaint.category}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              complaint.priority === "Urgent"
                                ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                                : complaint.priority === "High"
                                  ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300"
                                  : complaint.priority === "Medium"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                    : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300"
                            }`}
                          >
                            {complaint.priority}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              complaint.status === "Resolved"
                                ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                                : complaint.status === "In Progress"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                            }`}
                          >
                            {complaint.status}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-3 text-base">
                            <button
                              type="button"
                              onClick={() => openComplaintModal(complaint)}
                              title="Triage"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <i className="bi bi-pencil-square" />
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteComplaint(complaint)}
                              disabled={!canWriteHostel}
                              title="Delete"
                              className="text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <i className="bi bi-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* COMPLAINT TRIAGE MODAL */}
        {complaintModalOpen && selectedComplaint && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <h2 className="mb-1 text-lg font-bold text-gray-900 dark:text-white">
                {selectedComplaint.student_name}
              </h2>
              <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                Room {selectedComplaint.room_number || "—"}
              </p>

              <div className="mb-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-700 dark:bg-slate-700/50 dark:text-gray-200">
                {selectedComplaint.issue}
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <select
                    value={selectedComplaint.category}
                    onChange={(e) =>
                      updateSelectedComplaint("category", e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Internet">Internet</option>
                    <option value="Other">Other</option>
                  </select>

                  <select
                    value={selectedComplaint.priority}
                    onChange={(e) =>
                      updateSelectedComplaint("priority", e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <select
                  value={selectedComplaint.status}
                  onChange={(e) =>
                    updateSelectedComplaint("status", e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>

                <textarea
                  value={selectedComplaint.resolution_notes || ""}
                  onChange={(e) =>
                    updateSelectedComplaint("resolution_notes", e.target.value)
                  }
                  placeholder="Resolution notes (optional)"
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeComplaintModal}
                  className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveComplaint}
                  disabled={complaintSaving}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {complaintSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* <!-- =========================== MAINTENANCE SECTION =========================== --> */}
        {activeSection === "maintenance" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-slate-600 to-gray-700 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Maintenance Requests
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Infrastructure and equipment work, assignable to hostel
                    staff
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadMaintenance()}
                    disabled={maintenanceLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i
                      className={`bi bi-arrow-clockwise ${
                        maintenanceLoading ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={() => openCreateMaintenanceModal()}
                    disabled={!canWriteHostel}
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i className="bi bi-plus-lg" />
                    New Request
                  </button>
                </div>
              </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                {
                  label: "Total Requests",
                  value: maintenanceStats.total,
                  icon: "bi-tools",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Open",
                  value: maintenanceStats.open,
                  icon: "bi-exclamation-circle",
                  classes:
                    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                },
                {
                  label: "In Progress",
                  value: maintenanceStats.in_progress,
                  icon: "bi-arrow-repeat",
                  classes:
                    "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
                },
                {
                  label: "Resolved",
                  value: maintenanceStats.resolved,
                  icon: "bi-check-circle",
                  classes:
                    "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
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
                        {maintenanceLoading ? "…" : Number(stat.value || 0)}
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
                    value={maintenanceFilters.search}
                    onChange={(e) =>
                      updateMaintenanceFilter("search", e.target.value)
                    }
                    placeholder="Search title, room or block..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={maintenanceFilters.status}
                  onChange={(e) =>
                    updateMaintenanceFilter("status", e.target.value)
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                <select
                  value={maintenanceFilters.priority}
                  onChange={(e) =>
                    updateMaintenanceFilter("priority", e.target.value)
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All Priorities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyMaintenanceFilters}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                  >
                    <i className="bi bi-funnel" />
                    Filter
                  </button>

                  <button
                    type="button"
                    onClick={resetMaintenanceFilters}
                    title="Reset filters"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              </div>
            </div>

            {/* MAINTENANCE TABLE */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Maintenance Log
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {maintenanceRequests.length} request(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900/40 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">
                        Request
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Assigned To
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {maintenanceLoading && maintenanceRequests.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                            <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                            Loading maintenance requests...
                          </div>
                        </td>
                      </tr>
                    )}

                    {!maintenanceLoading &&
                      maintenanceRequests.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-14 text-center">
                            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                              <i className="bi bi-tools text-2xl" />
                            </span>
                            <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                              No maintenance requests found
                            </h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              No records match these filters, or none have been
                              logged yet.
                            </p>

                            <button
                              type="button"
                              onClick={() => openCreateMaintenanceModal()}
                              disabled={!canWriteHostel}
                              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              New Request
                            </button>
                          </td>
                        </tr>
                      )}

                    {maintenanceRequests.map((req) => (
                      <tr
                        key={req.id}
                        className="transition hover:bg-gray-50 dark:hover:bg-slate-700/40"
                      >
                        <td className="px-6 py-4">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {req.title}
                          </h4>
                          {req.description && (
                            <p className="line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
                              {req.description}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {req.room_number
                            ? `Room ${req.room_number}`
                            : req.block_name
                              ? `Block ${req.block_name}`
                              : "Hostel-wide"}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {req.category}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {req.assigned_staff_name || "Unassigned"}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              req.priority === "Urgent"
                                ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                                : req.priority === "High"
                                  ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300"
                                  : req.priority === "Medium"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                    : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300"
                            }`}
                          >
                            {req.priority}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              req.status === "Resolved"
                                ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                                : req.status === "In Progress"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                                  : req.status === "Cancelled"
                                    ? "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-3 text-base">
                            {req.status === "Open" && (
                              <button
                                type="button"
                                onClick={() =>
                                  quickUpdateStatus(req, "In Progress")
                                }
                                disabled={!canWriteHostel}
                                title="Start work"
                                className="text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <i className="bi bi-play-circle" />
                              </button>
                            )}

                            {req.status === "In Progress" && (
                              <button
                                type="button"
                                onClick={() =>
                                  quickUpdateStatus(req, "Resolved")
                                }
                                disabled={!canWriteHostel}
                                title="Mark resolved"
                                className="text-green-600 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <i className="bi bi-check-circle" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => openEditMaintenanceModal(req)}
                              disabled={!canWriteHostel}
                              title="Edit"
                              className="text-indigo-600 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <i className="bi bi-pencil-square" />
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteMaintenance(req)}
                              disabled={!canWriteHostel}
                              title="Delete"
                              className="text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <i className="bi bi-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* MAINTENANCE MODAL */}
        {maintenanceModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
                {maintenanceForm.id
                  ? "Edit Maintenance Request"
                  : "New Maintenance Request"}
              </h2>

              <div className="space-y-3">
                <input
                  value={maintenanceForm.title}
                  onChange={(e) =>
                    updateMaintenanceForm("title", e.target.value)
                  }
                  placeholder="Title (e.g. AC not working)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />

                <textarea
                  value={maintenanceForm.description}
                  onChange={(e) =>
                    updateMaintenanceForm("description", e.target.value)
                  }
                  placeholder="Description (optional)"
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    value={maintenanceForm.room_id}
                    onChange={(e) =>
                      updateMaintenanceForm("room_id", e.target.value)
                    }
                    placeholder="Room ID (optional)"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />

                  <select
                    value={maintenanceForm.block_id}
                    onChange={(e) =>
                      updateMaintenanceForm("block_id", e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="">No block (hostel-wide)</option>
                    {blockOptions.map((block) => (
                      <option key={block.id} value={block.id}>
                        {block.name}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="text-xs text-gray-400">
                  Set either a Room ID or a Block, or leave both blank for a
                  hostel-wide request.
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <select
                    value={maintenanceForm.category}
                    onChange={(e) =>
                      updateMaintenanceForm("category", e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Carpentry">Carpentry</option>
                    <option value="HVAC">HVAC</option>
                    <option value="Painting">Painting</option>
                    <option value="Other">Other</option>
                  </select>

                  <select
                    value={maintenanceForm.priority}
                    onChange={(e) =>
                      updateMaintenanceForm("priority", e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <select
                  value={maintenanceForm.assigned_staff_id}
                  onChange={(e) =>
                    updateMaintenanceForm("assigned_staff_id", e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">Unassigned</option>
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} ({staff.role})
                    </option>
                  ))}
                </select>

                {maintenanceForm.id && (
                  <>
                    <select
                      value={maintenanceForm.status}
                      onChange={(e) =>
                        updateMaintenanceForm("status", e.target.value)
                      }
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>

                    <textarea
                      value={maintenanceForm.resolution_notes}
                      onChange={(e) =>
                        updateMaintenanceForm(
                          "resolution_notes",
                          e.target.value,
                        )
                      }
                      placeholder="Resolution notes (optional)"
                      rows={2}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                  </>
                )}
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeMaintenanceModal}
                  className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveMaintenance}
                  disabled={maintenanceSaving}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {maintenanceSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* <!-- =========================== FEE MANAGEMENT SECTION =========================== --> */}
        {activeSection === "fee-management" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-green-600 to-emerald-700 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Fee Management
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Define fee structures and generate invoices for residents
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => refreshFeeManagement()}
                    disabled={feeManagementLoading || feeStructuresLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i
                      className={`bi bi-arrow-clockwise ${
                        feeManagementLoading || feeStructuresLoading
                          ? "animate-spin"
                          : ""
                      }`}
                    />
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={() => openCreateStructureModal()}
                    disabled={!canWriteHostel}
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i className="bi bi-plus-lg" />
                    New Fee Structure
                  </button>
                </div>
              </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                {
                  label: "Total Invoiced",
                  value: `₹${feeManagementStats.total_amount ?? 0}`,
                  icon: "bi-receipt",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Collected",
                  value: `₹${feeManagementStats.total_collected ?? 0}`,
                  icon: "bi-cash-coin",
                  classes:
                    "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
                },
                {
                  label: "Outstanding",
                  value: `₹${feeManagementStats.total_pending ?? 0}`,
                  icon: "bi-hourglass-split",
                  classes:
                    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                },
                {
                  label: "Overdue Invoices",
                  value: feeManagementStats.overdue_count ?? 0,
                  icon: "bi-exclamation-circle",
                  classes:
                    "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
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
                        {feeManagementLoading ? "…" : stat.value}
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

            {/* FEE STRUCTURES */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Fee Structures
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {feeStructures.length} structure(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900/40 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">
                        Fee Type
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Hostel
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Academic Year
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {feeStructuresLoading && feeStructures.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                            <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                            Loading fee structures...
                          </div>
                        </td>
                      </tr>
                    )}

                    {!feeStructuresLoading && feeStructures.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-14 text-center">
                          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                            <i className="bi bi-cash-stack text-2xl" />
                          </span>
                          <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                            No fee structures yet
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Create one to start generating invoices.
                          </p>

                          <button
                            type="button"
                            onClick={() => openCreateStructureModal()}
                            disabled={!canWriteHostel}
                            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            New Fee Structure
                          </button>
                        </td>
                      </tr>
                    )}

                    {feeStructures.map((structure) => (
                      <tr
                        key={structure.id}
                        className="transition hover:bg-gray-50 dark:hover:bg-slate-700/40"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {structure.fee_type}
                          {structure.description && (
                            <p className="text-xs font-normal text-gray-500 dark:text-gray-400">
                              {structure.description}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {structure.hostel_name || "All Hostels"}
                        </td>

                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          ₹{structure.amount}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {structure.academic_year || "—"}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              structure.status === "Active"
                                ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                                : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300"
                            }`}
                          >
                            {structure.status}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-3 text-base">
                            <button
                              type="button"
                              onClick={() => openGenerateModal(structure)}
                              disabled={!canWriteHostel}
                              title="Generate invoices"
                              className="text-emerald-600 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <i className="bi bi-send-check" />
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditStructureModal(structure)}
                              disabled={!canWriteHostel}
                              title="Edit"
                              className="text-indigo-600 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <i className="bi bi-pencil-square" />
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteStructure(structure)}
                              disabled={!canWriteHostel}
                              title="Delete"
                              className="text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <i className="bi bi-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* FEE INVOICES OVERVIEW */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  All Fee Invoices
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {feeManagementFees.length} invoice(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900/40 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Fee Type
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Paid
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Balance
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {feeManagementLoading && feeManagementFees.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                            <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                            Loading invoices...
                          </div>
                        </td>
                      </tr>
                    )}

                    {!feeManagementLoading &&
                      feeManagementFees.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-14 text-center text-gray-500 dark:text-gray-400"
                          >
                            No invoices generated yet.
                          </td>
                        </tr>
                      )}

                    {feeManagementFees.map((fee) => (
                      <tr
                        key={fee.id}
                        className="transition hover:bg-gray-50 dark:hover:bg-slate-700/40"
                      >
                        <td className="px-6 py-4">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {fee.student_name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {fee.student_code}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {fee.fee_type}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          ₹{fee.amount}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          ₹{fee.paid_amount}
                        </td>

                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          ₹{fee.balance}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              fee.status === "Paid"
                                ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                                : fee.status === "Partially Paid"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                                  : fee.status === "Overdue"
                                    ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                            }`}
                          >
                            {fee.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* FEE STRUCTURE MODAL */}
        {structureModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
                {structureForm.id ? "Edit Fee Structure" : "New Fee Structure"}
              </h2>

              <div className="space-y-3">
                <select
                  value={structureForm.fee_type}
                  onChange={(e) =>
                    updateStructureForm("fee_type", e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Admission">Admission</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Annual">Annual</option>
                  <option value="Security Deposit">Security Deposit</option>
                  <option value="Mess Fee">Mess Fee</option>
                  <option value="Other">Other</option>
                </select>

                <select
                  value={structureForm.hostel_id}
                  onChange={(e) =>
                    updateStructureForm("hostel_id", e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All Hostels</option>
                  {hostelOptions.map((hostel) => (
                    <option key={hostel.id} value={hostel.id}>
                      {hostel.name}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  value={structureForm.amount}
                  onChange={(e) =>
                    updateStructureForm("amount", e.target.value)
                  }
                  placeholder="Amount (₹)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />

                <input
                  value={structureForm.academic_year}
                  onChange={(e) =>
                    updateStructureForm("academic_year", e.target.value)
                  }
                  placeholder="Academic year (e.g. 2026-27)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />

                <input
                  value={structureForm.description}
                  onChange={(e) =>
                    updateStructureForm("description", e.target.value)
                  }
                  placeholder="Description (optional)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />

                <select
                  value={structureForm.status}
                  onChange={(e) =>
                    updateStructureForm("status", e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeStructureModal}
                  className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveStructure}
                  disabled={structureSaving}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {structureSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GENERATE INVOICES MODAL */}
        {generateModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <h2 className="mb-1 text-lg font-bold text-gray-900 dark:text-white">
                Generate Invoices
              </h2>
              <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                Creates an invoice for every current resident who doesn't
                already have one for this fee structure.
              </p>

              <div className="space-y-3">
                <select
                  value={generateForm.fee_structure_id}
                  onChange={(e) =>
                    updateGenerateForm("fee_structure_id", e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">Select fee structure…</option>
                  {feeStructures.map((structure) => (
                    <option key={structure.id} value={structure.id}>
                      {structure.fee_type} - ₹{structure.amount} (
                      {structure.hostel_name || "All Hostels"})
                    </option>
                  ))}
                </select>

                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                    Due Date (optional)
                  </label>
                  <input
                    type="date"
                    value={generateForm.due_date}
                    onChange={(e) =>
                      updateGenerateForm("due_date", e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeGenerateModal}
                  className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={generateInvoices}
                  disabled={generateSaving}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {generateSaving ? "Generating…" : "Generate"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* <!-- =========================== PAYMENT SECTION =========================== --> */}
        {activeSection === "payment" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">Payment</h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Record payments against a student's fee invoices and browse
                    the payment history
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadPayments()}
                    disabled={paymentsLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i
                      className={`bi bi-arrow-clockwise ${
                        paymentsLoading ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={() => openPaymentModal()}
                    disabled={!canWriteHostel}
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i className="bi bi-cash-coin" />
                    Record Payment
                  </button>
                </div>
              </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Total Payments
                    </p>
                    <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                      {paymentsLoading
                        ? "…"
                        : (paymentStats.total_payments ?? 0)}
                    </p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                    <i className="bi bi-receipt-cutoff text-lg" />
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Total Collected
                    </p>
                    <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                      {paymentsLoading
                        ? "…"
                        : `₹${paymentStats.total_collected ?? 0}`}
                    </p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300">
                    <i className="bi bi-cash-stack text-lg" />
                  </span>
                </div>
              </div>
            </div>

            {/* FILTERS */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="relative xl:col-span-2">
                  <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />

                  <input
                    type="search"
                    value={paymentFilters.search}
                    onChange={(e) =>
                      updatePaymentFilter("search", e.target.value)
                    }
                    placeholder="Search student or transaction ref..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={paymentFilters.payment_method}
                  onChange={(e) =>
                    updatePaymentFilter("payment_method", e.target.value)
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All Methods</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Other">Other</option>
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyPaymentFilters}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                  >
                    <i className="bi bi-funnel" />
                    Filter
                  </button>

                  <button
                    type="button"
                    onClick={resetPaymentFilters}
                    title="Reset filters"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              </div>
            </div>

            {/* PAYMENT HISTORY TABLE */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Payment History
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {payments.length} transaction(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900/40 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Fee Type
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Reference
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Date
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {paymentsLoading && payments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                            <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                            Loading payments...
                          </div>
                        </td>
                      </tr>
                    )}

                    {!paymentsLoading && payments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-14 text-center">
                          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                            <i className="bi bi-credit-card text-2xl" />
                          </span>
                          <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                            No payments recorded yet
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            No records match these filters.
                          </p>
                        </td>
                      </tr>
                    )}

                    {payments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="transition hover:bg-gray-50 dark:hover:bg-slate-700/40"
                      >
                        <td className="px-6 py-4">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {payment.student_name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {payment.student_code}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {payment.fee_type || "—"}
                        </td>

                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          ₹{payment.amount}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {payment.payment_method}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {payment.transaction_reference || "—"}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {payment.payment_date || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* RECORD PAYMENT MODAL */}
        {paymentModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
                Record Payment
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                    Student
                  </label>

                  <div className="flex gap-2">
                    <input
                      value={paymentStudentSearch}
                      onChange={(e) => setPaymentStudentSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          searchStudentsForPayment(paymentStudentSearch);
                        }
                      }}
                      placeholder="Search student by name..."
                      className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        searchStudentsForPayment(paymentStudentSearch)
                      }
                      className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                    >
                      Search
                    </button>
                  </div>

                  <div className="mt-2 max-h-32 overflow-y-auto rounded-xl border border-gray-100 dark:border-slate-700 divide-y dark:divide-slate-700">
                    {paymentStudentSearchLoading && (
                      <p className="py-4 text-center text-xs text-gray-400">
                        Searching...
                      </p>
                    )}

                    {!paymentStudentSearchLoading &&
                      paymentStudentResults.length === 0 && (
                        <p className="py-4 text-center text-xs text-gray-400">
                          Search for a student to select them.
                        </p>
                      )}

                    {paymentStudentResults.map((student) => (
                      <button
                        type="button"
                        key={student.id}
                        onClick={() => selectPaymentStudent(student)}
                        className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                          selectedPaymentStudent?.id === student.id
                            ? "bg-indigo-50 dark:bg-indigo-500/20"
                            : "hover:bg-gray-50 dark:hover:bg-slate-700/50"
                        }`}
                      >
                        <span>{student.name}</span>
                        <span className="text-xs text-gray-400">
                          {student.student_code}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedPaymentStudent && (
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                      Outstanding Invoice
                    </label>

                    {studentFeesLoading && (
                      <p className="py-3 text-center text-xs text-gray-400">
                        Loading dues...
                      </p>
                    )}

                    {!studentFeesLoading && studentFees.length === 0 && (
                      <p className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-slate-700/50 dark:text-gray-400">
                        This student has no outstanding invoices.
                      </p>
                    )}

                    <div className="space-y-1">
                      {studentFees.map((fee) => (
                        <button
                          type="button"
                          key={fee.id}
                          onClick={() => selectPaymentFee(fee)}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm ${
                            selectedFee?.id === fee.id
                              ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-500/20"
                              : "border-gray-100 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
                          }`}
                        >
                          <span>{fee.fee_type}</span>
                          <span className="font-medium text-gray-700 dark:text-gray-200">
                            Balance ₹{fee.balance}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => updatePaymentForm("amount", e.target.value)}
                  placeholder="Amount (₹)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />

                <select
                  value={paymentForm.payment_method}
                  onChange={(e) =>
                    updatePaymentForm("payment_method", e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Other">Other</option>
                </select>

                <input
                  value={paymentForm.transaction_reference}
                  onChange={(e) =>
                    updatePaymentForm("transaction_reference", e.target.value)
                  }
                  placeholder="Transaction reference (optional)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />

                <input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) =>
                    updatePaymentForm("payment_date", e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={savePayment}
                  disabled={paymentSaving}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {paymentSaving ? "Saving…" : "Record Payment"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* <!-- =========================== PENDING DUES SECTION =========================== --> */}
        {activeSection === "pending-dues" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Pending Dues
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Every invoice with an outstanding balance, most overdue
                    first
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => loadDues()}
                  disabled={duesLoading}
                  className="inline-flex items-center gap-2 self-start rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <i
                    className={`bi bi-arrow-clockwise ${
                      duesLoading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </button>
              </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                {
                  label: "Total Outstanding",
                  value: `₹${duesStats.total_pending ?? 0}`,
                  icon: "bi-hourglass-split",
                  classes:
                    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                },
                {
                  label: "Overdue Invoices",
                  value: duesStats.overdue_count ?? 0,
                  icon: "bi-exclamation-circle",
                  classes:
                    "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
                },
                {
                  label: "Total Invoiced",
                  value: `₹${duesStats.total_amount ?? 0}`,
                  icon: "bi-receipt",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Collected So Far",
                  value: `₹${duesStats.total_collected ?? 0}`,
                  icon: "bi-cash-coin",
                  classes:
                    "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
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
                        {duesLoading ? "…" : stat.value}
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="relative xl:col-span-2">
                  <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />

                  <input
                    type="search"
                    value={duesFilters.search}
                    onChange={(e) => updateDuesFilter("search", e.target.value)}
                    placeholder="Search student or room..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={duesFilters.status}
                  onChange={(e) => updateDuesFilter("status", e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All (Pending / Partial / Overdue)</option>
                  <option value="Pending">Pending</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Overdue">Overdue</option>
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyDuesFilters}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                  >
                    <i className="bi bi-funnel" />
                    Filter
                  </button>

                  <button
                    type="button"
                    onClick={resetDuesFilters}
                    title="Reset filters"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              </div>
            </div>

            {/* PENDING DUES TABLE */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Outstanding Invoices
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {dues.length} invoice(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900/40 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Room
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Fee Type
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Balance
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {duesLoading && dues.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                            <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                            Loading pending dues...
                          </div>
                        </td>
                      </tr>
                    )}

                    {!duesLoading && dues.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-14 text-center">
                          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-300">
                            <i className="bi bi-check2-circle text-2xl" />
                          </span>
                          <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                            No outstanding dues
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Every invoice matching these filters is fully paid.
                          </p>
                        </td>
                      </tr>
                    )}

                    {dues.map((fee) => (
                      <tr
                        key={fee.id}
                        className={`transition hover:bg-gray-50 dark:hover:bg-slate-700/40 ${
                          fee.status === "Overdue"
                            ? "bg-red-50/50 dark:bg-red-500/5"
                            : ""
                        }`}
                      >
                        <td className="px-6 py-4">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {fee.student_name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {fee.student_code}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {fee.room_number || "—"}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {fee.fee_type}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          ₹{fee.amount}
                        </td>

                        <td className="px-6 py-4 font-semibold text-red-600 dark:text-red-400">
                          ₹{fee.balance}
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {fee.due_date || "—"}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              fee.status === "Overdue"
                                ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                                : fee.status === "Partially Paid"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                            }`}
                          >
                            {fee.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {duesStats.overdue_count > 0 && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300">
                    <i className="bi bi-exclamation-triangle" />
                  </div>

                  <div>
                    <h3 className="font-semibold text-red-800 dark:text-red-300">
                      Overdue Fees
                    </h3>

                    <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                      {duesStats.overdue_count} invoice(s) are past their due
                      date. Head to the Payment section to record a collection.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* <!-- =========================== REPORTS & ANALYTICS SECTION =========================== --> */}
        {activeSection === "reports" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Reports &amp; Analytics
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    A snapshot across occupancy, fees, complaints and attendance
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => loadReport()}
                  disabled={reportLoading}
                  className="inline-flex items-center gap-2 self-start rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <i
                    className={`bi bi-arrow-clockwise ${
                      reportLoading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </button>
              </div>
            </div>

            {/* TOP-LEVEL KPIs */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                {
                  label: "Occupancy Rate",
                  value: `${report.occupancy.occupancy_rate}%`,
                  sub: `${report.occupancy.occupied_beds} / ${report.occupancy.total_beds} beds`,
                  icon: "bi-house-check",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Fee Collection Rate",
                  value: `${report.fees.collection_rate}%`,
                  sub: `₹${report.fees.total_collected} of ₹${report.fees.total_invoiced}`,
                  icon: "bi-cash-coin",
                  classes:
                    "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
                },
                {
                  label: "Complaint Resolution",
                  value: `${report.complaints.resolution_rate}%`,
                  sub: `${report.complaints.resolved} / ${report.complaints.total} resolved`,
                  icon: "bi-check2-circle",
                  classes:
                    "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
                },
                {
                  label: "Active Residents",
                  value: report.occupancy.active_residents,
                  sub: `${report.movement.currently_outside} currently outside`,
                  icon: "bi-people",
                  classes:
                    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
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
                        {reportLoading ? "…" : stat.value}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">{stat.sub}</p>
                    </div>

                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.classes}`}
                    >
                      <i className={`bi ${stat.icon} text-lg`} />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* OCCUPANCY BY BLOCK */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
                  Occupancy by Block
                </h3>

                {reportLoading && report.occupancy.by_block.length === 0 && (
                  <p className="py-8 text-center text-sm text-gray-400">
                    Loading...
                  </p>
                )}

                {!reportLoading && report.occupancy.by_block.length === 0 && (
                  <p className="py-8 text-center text-sm text-gray-400">
                    No blocks with beds configured yet.
                  </p>
                )}

                <div className="space-y-3">
                  {report.occupancy.by_block.map((block) => (
                    <div key={block.block_name}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          Block {block.block_name}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {block.occupied_beds}/{block.total_beds} (
                          {block.occupancy_rate}%)
                        </span>
                      </div>

                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${block.occupancy_rate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ATTENDANCE TREND (LAST 7 DAYS) */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
                  Attendance - Last 7 Days
                </h3>

                {reportLoading && report.attendance_trend.length === 0 && (
                  <p className="py-8 text-center text-sm text-gray-400">
                    Loading...
                  </p>
                )}

                <div className="flex items-end justify-between gap-2 h-40">
                  {report.attendance_trend.map((day) => {
                    const total = Math.max(day.marked, 1);
                    const presentPct = Math.round((day.present / total) * 100);

                    return (
                      <div
                        key={day.date}
                        className="flex flex-1 flex-col items-center gap-1"
                      >
                        <div className="flex h-32 w-full items-end overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-700">
                          <div
                            className="w-full bg-green-500 transition-all"
                            style={{
                              height: day.marked > 0 ? `${presentPct}%` : "2%",
                            }}
                            title={`${day.present} present / ${day.marked} marked`}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {new Date(day.date).toLocaleDateString(undefined, {
                            weekday: "short",
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* FEES & MAINTENANCE SUMMARY */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
                  Fee Collection
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      Total Invoiced
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ₹{report.fees.total_invoiced}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      Collected
                    </span>
                    <span className="font-semibold text-green-600">
                      ₹{report.fees.total_collected}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      Outstanding
                    </span>
                    <span className="font-semibold text-red-500">
                      ₹{report.fees.total_pending}
                    </span>
                  </div>

                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${report.fees.collection_rate}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
                  Complaints &amp; Maintenance
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      Complaints Resolved
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {report.complaints.resolved} / {report.complaints.total}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      Maintenance Resolved
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {report.maintenance.resolved} / {report.maintenance.total}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      Vacant Beds
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {report.occupancy.vacant_beds}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      Beds Under Maintenance
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {report.occupancy.maintenance_beds}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* <!-- =========================== ACTIVITY LOGS SECTION =========================== --> */}
        {activeSection === "activity-logs" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-slate-700 to-gray-800 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Activity Logs
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    An audit trail of significant admin actions across the
                    hostel module
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => loadLogs()}
                  disabled={logsLoading}
                  className="inline-flex items-center gap-2 self-start rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <i
                    className={`bi bi-arrow-clockwise ${
                      logsLoading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </button>
              </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                {
                  label: "Total Actions",
                  value: logStats.total,
                  icon: "bi-shield-check",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Allocations",
                  value: logStats.by_category?.Allocation || 0,
                  icon: "bi-house-check",
                  classes:
                    "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
                },
                {
                  label: "Payments",
                  value: logStats.by_category?.Payment || 0,
                  icon: "bi-cash-coin",
                  classes:
                    "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
                },
                {
                  label: "Leave / Visitor",
                  value:
                    (logStats.by_category?.Leave || 0) +
                    (logStats.by_category?.Visitor || 0),
                  icon: "bi-person-lines-fill",
                  classes:
                    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
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
                        {logsLoading ? "…" : Number(stat.value || 0)}
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="relative xl:col-span-2">
                  <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />

                  <input
                    type="search"
                    value={logFilters.search}
                    onChange={(e) => updateLogFilter("search", e.target.value)}
                    placeholder="Search description or admin..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={logFilters.category}
                  onChange={(e) => updateLogFilter("category", e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All Categories</option>
                  <option value="Allocation">Allocation</option>
                  <option value="Payment">Payment</option>
                  <option value="Complaint">Complaint</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Leave">Leave</option>
                  <option value="Staff">Staff</option>
                  <option value="Visitor">Visitor</option>
                  <option value="Structure">Structure</option>
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyLogFilters}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                  >
                    <i className="bi bi-funnel" />
                    Filter
                  </button>

                  <button
                    type="button"
                    onClick={resetLogFilters}
                    title="Reset filters"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              </div>
            </div>

            {/* ACTIVITY LOG TIMELINE */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Recent Activity
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {logs.length} entr{logs.length === 1 ? "y" : "ies"}
                </span>
              </div>

              <div className="max-h-[600px] overflow-y-auto">
                {logsLoading && logs.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-16 text-gray-500 dark:text-gray-400">
                    <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                    Loading activity...
                  </div>
                )}

                {!logsLoading && logs.length === 0 && (
                  <div className="mx-auto max-w-sm py-14 text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                      <i className="bi bi-shield-check text-2xl" />
                    </span>
                    <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                      No activity yet
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Actions taken across the hostel module will show up here.
                    </p>
                  </div>
                )}

                <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                  {logs.map((log) => {
                    const categoryStyles = {
                      Allocation:
                        "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
                      Payment:
                        "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
                      Complaint:
                        "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
                      Maintenance:
                        "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
                      Leave:
                        "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
                      Staff:
                        "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
                      Visitor:
                        "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300",
                      Structure:
                        "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300",
                    };

                    const categoryIcons = {
                      Allocation: "bi-house-check",
                      Payment: "bi-cash-coin",
                      Complaint: "bi-chat-square-text",
                      Maintenance: "bi-tools",
                      Leave: "bi-journal-check",
                      Staff: "bi-people",
                      Visitor: "bi-person-lines-fill",
                      Structure: "bi-building",
                    };

                    return (
                      <li
                        key={log.id}
                        className="flex items-start gap-3 px-5 py-4 transition hover:bg-gray-50 dark:hover:bg-slate-700/40"
                      >
                        <span
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                            categoryStyles[log.category] ||
                            "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300"
                          }`}
                        >
                          <i
                            className={`bi ${
                              categoryIcons[log.category] || "bi-dot"
                            }`}
                          />
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-800 dark:text-gray-100">
                            {log.description}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">
                            {log.admin_name} ·{" "}
                            {log.created_at
                              ? new Date(log.created_at).toLocaleString()
                              : "—"}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                            categoryStyles[log.category] ||
                            "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300"
                          }`}
                        >
                          {log.category}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* ===================== NOTIFICATIONS SECTION START ===================== */}
        {activeSection === "notifications" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                    <i className="bi bi-bell" />
                    Notifications
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Leave requests and system alerts sent to your account
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchNotifications && fetchNotifications()}
                    disabled={notificationLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i
                      className={`bi bi-arrow-clockwise ${
                        notificationLoading ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </button>

                  {notificationUnread > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        markAllNotificationsRead && markAllNotificationsRead()
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-700 shadow transition hover:bg-white/90"
                    >
                      <i className="bi bi-check2-all" />
                      Mark all read
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {[
                {
                  label: "Total",
                  value: notifications.length,
                  icon: "bi-bell",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Unread",
                  value: notificationUnread,
                  icon: "bi-envelope-exclamation",
                  classes:
                    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                },
                {
                  label: "Read",
                  value: Math.max(
                    notifications.length - notificationUnread,
                    0,
                  ),
                  icon: "bi-envelope-open",
                  classes:
                    "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
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
                        {notificationLoading ? "…" : Number(stat.value || 0)}
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

            {/* FILTER TABS */}
            <div className="flex w-fit items-center gap-1 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              {[
                ["all", "All"],
                ["unread", "Unread"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setNotificationFilter(key)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                    notificationFilter === key
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700"
                  }`}
                >
                  {label}
                  {key === "unread" && notificationUnread > 0 && (
                    <span className="rounded-full bg-purple-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {notificationUnread}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* LIST */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              {notificationLoading && notifications.length === 0 ? (
                <div className="space-y-3 p-5">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-700"
                    />
                  ))}
                </div>
              ) : (
                (() => {
                  const filtered = (notifications || []).filter((n) =>
                    notificationFilter === "unread" ? !n.is_read : true,
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
                        <i className="bi bi-bell-slash text-3xl text-gray-300 dark:text-slate-600" />
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {notificationFilter === "unread"
                            ? "You're all caught up — no unread notifications"
                            : "No notifications yet"}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <ul className="divide-y dark:divide-slate-700">
                      {filtered.map((n) => (
                        <li
                          key={n.id}
                          className={`flex items-start gap-4 p-4 transition sm:p-5 ${
                            !n.is_read
                              ? "bg-purple-50/60 dark:bg-purple-500/5"
                              : ""
                          }`}
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300">
                            <i className="bi bi-calendar2-check" />
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-medium text-gray-800 dark:text-white">
                                {n.title}
                              </p>

                              {!n.is_read && (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-purple-500" />
                              )}
                            </div>

                            <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">
                              {n.message}
                            </p>

                            <p className="mt-1 text-xs text-gray-400">
                              {n.time}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            {!n.is_read && (
                              <button
                                type="button"
                                title="Mark as read"
                                onClick={() =>
                                  markNotificationRead &&
                                  markNotificationRead(n.id)
                                }
                                className="rounded-lg p-2 text-gray-400 transition hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-500/10"
                              >
                                <i className="bi bi-check2" />
                              </button>
                            )}

                            <button
                              type="button"
                              title="Delete"
                              onClick={() =>
                                deleteNotification && deleteNotification(n.id)
                              }
                              className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                            >
                              <i className="bi bi-trash" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  );
                })()
              )}
            </div>
          </section>
        )}

        {/* ===================== ANNOUNCEMENTS SECTION START ===================== */}
        {activeSection === "announcements" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                    <i className="bi bi-megaphone" />
                    Announcements
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Notices published to students, teachers and staff
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchNotices && fetchNotices()}
                    disabled={noticeLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i
                      className={`bi bi-arrow-clockwise ${
                        noticeLoading ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={openCreateNoticeModal}
                    disabled={!canWriteHostel}
                    title={
                      !canWriteHostel
                        ? "Read-only access — ask your Super Admin for Full Access"
                        : ""
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-700 shadow transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i className="bi bi-plus-lg" />
                    New Announcement
                  </button>
                </div>
              </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                {
                  label: "Total",
                  value: noticeStats.total,
                  icon: "bi-megaphone",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "High Priority",
                  value: noticeStats.important,
                  icon: "bi-exclamation-circle",
                  classes:
                    "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
                },
                {
                  label: "This Week",
                  value: noticeStats.thisWeek,
                  icon: "bi-calendar-week",
                  classes:
                    "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
                },
                {
                  label: "Unread",
                  value: unreadCount,
                  icon: "bi-envelope-exclamation",
                  classes:
                    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
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
                        {noticeLoading ? "…" : Number(stat.value || 0)}
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="relative xl:col-span-2">
                  <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />

                  <input
                    type="search"
                    value={noticeSearch}
                    onChange={(e) => setNoticeSearch(e.target.value)}
                    placeholder="Search announcements..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={noticePriorityFilter}
                  onChange={(e) => setNoticePriorityFilter(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="all">All Priorities</option>
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
              </div>
            </div>

            {/* LIST */}
            <div className="space-y-4">
              {noticeLoading && announcements.length === 0 ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-28 animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-800"
                    />
                  ))}
                </div>
              ) : (
                (() => {
                  const filtered = (announcements || []).filter((n) => {
                    const matchesSearch =
                      !noticeSearch.trim() ||
                      n.title
                        ?.toLowerCase()
                        .includes(noticeSearch.trim().toLowerCase()) ||
                      (n.description || n.message || "")
                        .toLowerCase()
                        .includes(noticeSearch.trim().toLowerCase());

                    const matchesPriority =
                      noticePriorityFilter === "all" ||
                      n.priority === noticePriorityFilter;

                    return matchesSearch && matchesPriority;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <i className="bi bi-megaphone text-3xl text-gray-300 dark:text-slate-600" />
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {announcements.length === 0
                            ? "No announcements published yet"
                            : "No announcements match your filters"}
                        </p>
                      </div>
                    );
                  }

                  const priorityClasses = {
                    High: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
                    Medium:
                      "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
                    Low: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
                  };

                  return filtered.map((n) => (
                    <div
                      key={n.id}
                      className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md dark:bg-slate-800 ${
                        !n.is_read
                          ? "border-indigo-200 dark:border-indigo-500/40"
                          : "border-gray-100 dark:border-slate-700"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {n.title}
                            </h3>

                            {!n.is_read && (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                            )}

                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                priorityClasses[n.priority] ||
                                priorityClasses.Medium
                              }`}
                            >
                              {n.priority}
                            </span>

                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-slate-700 dark:text-gray-300">
                              {n.category}
                            </span>

                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-slate-700 dark:text-gray-300">
                              <i className="bi bi-people me-1" />
                              {n.audience}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            {n.description || n.message}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                            <span>
                              <i className="bi bi-calendar3 me-1" />
                              {n.date || n.notice_date}
                            </span>

                            {n.expiry_date && (
                              <span>
                                <i className="bi bi-hourglass-split me-1" />
                                Expires {n.expiry_date}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          {!n.is_read && (
                            <button
                              type="button"
                              title="Mark as read"
                              onClick={() =>
                                markNoticeAsRead && markNoticeAsRead(n.id)
                              }
                              className="rounded-lg p-2 text-gray-400 transition hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10"
                            >
                              <i className="bi bi-check2" />
                            </button>
                          )}

                          <button
                            type="button"
                            title={
                              !canWriteHostel
                                ? "Read-only access"
                                : "Edit announcement"
                            }
                            disabled={!canWriteHostel}
                            onClick={() => openEditNoticeModal(n)}
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-indigo-500/10"
                          >
                            <i className="bi bi-pencil-square" />
                          </button>

                          <button
                            type="button"
                            title={
                              !canWriteHostel
                                ? "Read-only access"
                                : "Remove announcement"
                            }
                            disabled={!canWriteHostel}
                            onClick={() => setNoticeDeleteTarget(n)}
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-500/10"
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ));
                })()
              )}
            </div>

            {/* CREATE / EDIT MODAL */}
            {noticeModalOpen && (
              <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
                  <div className="flex items-center justify-between border-b p-5 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {noticeModalMode === "create"
                        ? "New Announcement"
                        : "Edit Announcement"}
                    </h3>

                    <button
                      type="button"
                      onClick={closeNoticeModal}
                      className="text-gray-400 transition hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();

                      if (!noticeForm.title.trim()) {
                        setNoticeFormError("Title is required");
                        return;
                      }

                      if (!noticeForm.description.trim()) {
                        setNoticeFormError("Description is required");
                        return;
                      }

                      if (!noticeForm.notice_date) {
                        setNoticeFormError("Notice date is required");
                        return;
                      }

                      setNoticeFormError("");

                      const payload = {
                        title: noticeForm.title.trim(),
                        description: noticeForm.description.trim(),
                        category: noticeForm.category,
                        priority: noticeForm.priority,
                        notice_date: noticeForm.notice_date,
                        expiry_date: noticeForm.expiry_date || null,
                        audience: noticeForm.audience,
                      };

                      const result =
                        noticeModalMode === "create"
                          ? await createNotice(payload)
                          : await updateNotice(
                              noticeBeingEdited.id,
                              payload,
                            );

                      if (result?.success) {
                        closeNoticeModal();
                      } else if (result?.error) {
                        setNoticeFormError(result.error);
                      }
                    }}
                    className="max-h-[70vh] space-y-4 overflow-y-auto p-5"
                  >
                    {noticeFormError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                        {noticeFormError}
                      </div>
                    )}

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Title
                      </label>
                      <input
                        type="text"
                        value={noticeForm.title}
                        onChange={(e) =>
                          setNoticeForm((f) => ({
                            ...f,
                            title: e.target.value,
                          }))
                        }
                        placeholder="e.g. Hostel closed for maintenance"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Description
                      </label>
                      <textarea
                        rows={4}
                        value={noticeForm.description}
                        onChange={(e) =>
                          setNoticeForm((f) => ({
                            ...f,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Details residents need to know..."
                        className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Category
                        </label>
                        <select
                          value={noticeForm.category}
                          onChange={(e) =>
                            setNoticeForm((f) => ({
                              ...f,
                              category: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        >
                          {[
                            "Academic",
                            "Examination",
                            "Holiday",
                            "Event",
                            "General",
                          ].map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Priority
                        </label>
                        <select
                          value={noticeForm.priority}
                          onChange={(e) =>
                            setNoticeForm((f) => ({
                              ...f,
                              priority: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        >
                          {["High", "Medium", "Low"].map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Notice Date
                        </label>
                        <input
                          type="date"
                          value={noticeForm.notice_date}
                          onChange={(e) =>
                            setNoticeForm((f) => ({
                              ...f,
                              notice_date: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Expiry Date{" "}
                          <span className="text-gray-400">(optional)</span>
                        </label>
                        <input
                          type="date"
                          value={noticeForm.expiry_date}
                          onChange={(e) =>
                            setNoticeForm((f) => ({
                              ...f,
                              expiry_date: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Audience
                      </label>
                      <select
                        value={noticeForm.audience}
                        onChange={(e) =>
                          setNoticeForm((f) => ({
                            ...f,
                            audience: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      >
                        {["All", "Students", "Teachers", "Admins", "Staff"].map(
                          (a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div className="flex items-center justify-end gap-3 border-t pt-4 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={closeNoticeModal}
                        className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={noticeSubmitting}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {noticeSubmitting && (
                          <i className="bi bi-arrow-repeat animate-spin" />
                        )}
                        {noticeModalMode === "create"
                          ? "Publish"
                          : "Save Changes"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* DELETE CONFIRM MODAL */}
            {noticeDeleteTarget && (
              <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-slate-800">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300">
                    <i className="bi bi-exclamation-triangle text-xl" />
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Remove announcement?
                  </h3>

                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    "{noticeDeleteTarget.title}" will be taken down from
                    everyone's feed. This can't be undone from here.
                  </p>

                  <div className="mt-6 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setNoticeDeleteTarget(null)}
                      className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        await deleteNotice(noticeDeleteTarget.id);
                        setNoticeDeleteTarget(null);
                      }}
                      className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

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
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
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
