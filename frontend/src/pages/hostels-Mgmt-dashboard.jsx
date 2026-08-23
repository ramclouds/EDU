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

function AdminDashboard() {
  // UI STATE (LOCAL COMPONENT STATE)
  const location = useLocation();

  const [activeSection, setActiveSection] = useState(
    location.state?.activeSection || "dashboard",
  );
  const [noticeTab, setNoticeTab] = useState("announcements");
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

  const { canWriteHostel, hostelAccessLevel } = useHostelPermission();
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
          <section className="section active space-y-6 p-4 sm:p-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Hostel Dashboard</h2>

                  <p className="mt-1 text-sm text-blue-100">
                    Structure, occupancy and student allocation overview
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => loadStructure({ silent: true })}
                  disabled={structureLoading}
                  className="self-start rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/25 disabled:opacity-50"
                >
                  <i
                    className={`bi bi-arrow-clockwise mr-2 ${
                      structureLoading ? "inline-block animate-spin" : ""
                    }`}
                  ></i>
                  Refresh
                </button>
              </div>
            </div>

            {/* PRIMARY KPIs */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {[
                [
                  "Hostels",
                  structureStats.hostels,
                  "bi-building",
                  "bg-indigo-100 text-indigo-700",
                ],
                [
                  "Blocks",
                  structureStats.blocks,
                  "bi-diagram-3",
                  "bg-blue-100 text-blue-700",
                ],
                [
                  "Floors",
                  structureStats.floors,
                  "bi-layers",
                  "bg-cyan-100 text-cyan-700",
                ],
                [
                  "Rooms",
                  structureStats.rooms,
                  "bi-door-open",
                  "bg-purple-100 text-purple-700",
                ],
                [
                  "Occupied Beds",
                  structureStats.occupied_beds,
                  "bi-person-check",
                  "bg-red-100 text-red-700",
                ],
                [
                  "Available Beds",
                  structureStats.available_beds,
                  "bi-door-closed",
                  "bg-green-100 text-green-700",
                ],
              ].map(([label, value, icon, iconClass]) => (
                <div
                  key={label}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {label}
                      </p>

                      <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                        {structureLoading ? "…" : (value ?? 0)}
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

            {/* QUICK LINKS */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                {
                  key: "floors",
                  title: "Manage Structure",
                  desc: "Hostels, blocks and floors",
                  icon: "bi-diagram-3",
                },
                {
                  key: "rooms",
                  title: "Manage Rooms",
                  desc: "Room inventory and status",
                  icon: "bi-door-open",
                },
                {
                  key: "beds",
                  title: "Manage Beds",
                  desc: "Bed allocation and vacancy",
                  icon: "bi-house-check",
                },
              ].map((card) => (
                <button
                  type="button"
                  key={card.key}
                  onClick={() => setActiveSection(card.key)}
                  className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                    <i className={`bi ${card.icon} text-xl`}></i>
                  </span>

                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {card.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {card.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* <!-- =========================== FLOORS & BLOCKS SECTION =========================== --> */}
        {activeSection === "floors" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
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
                    className="border dark:border-slate-700 rounded-2xl mb-6 overflow-hidden"
                  >
                    {/* Hostel header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-5 flex flex-col sm:flex-row justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold">
                          {hostel.hostel_name}
                        </h3>
                        <p className="text-indigo-100 text-sm">
                          {hostel.hostel_type} Hostel · {hostel.status}
                        </p>
                      </div>

                      <div className="space-x-2 flex flex-wrap gap-2">
                        <button
                          onClick={() => openCreateBlockModal(hostel.id)}
                          disabled={!canWriteHostel}
                          className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          + Block
                        </button>

                        <button
                          onClick={() => openEditHostelModal(hostel)}
                          disabled={!canWriteHostel}
                          className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => deleteHostel(hostel)}
                          disabled={!canWriteHostel}
                          className="bg-red-500/80 hover:bg-red-500 px-4 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Blocks */}
                    <div className="p-4 sm:p-6 space-y-5">
                      {(hostel.blocks || []).length === 0 && (
                        <p className="text-gray-400 text-sm">
                          No blocks yet in this hostel.
                        </p>
                      )}

                      {(hostel.blocks || []).map((block) => (
                        <div
                          key={block.id}
                          className="border dark:border-slate-700 rounded-xl"
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
                            className="w-full bg-slate-100 dark:bg-slate-700/60 p-4 flex justify-between items-center text-left cursor-pointer"
                          >
                            <div>
                              <h4 className="font-semibold flex items-center gap-2">
                                <i
                                  className={`bi ${
                                    expandedBlocks[block.id]
                                      ? "bi-chevron-down"
                                      : "bi-chevron-right"
                                  } text-xs`}
                                />
                                Block {block.block_name}
                              </h4>
                              <small className="text-gray-500">
                                Floors: {(block.floors || []).length}
                                {block.description
                                  ? ` · ${block.description}`
                                  : ""}
                              </small>
                            </div>

                            <div
                              className="flex gap-2"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => openCreateFloorModal(block.id)}
                                disabled={!canWriteHostel}
                                className="bg-green-600 text-white px-3 py-2 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                + Floor
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditBlockModal(block)}
                                disabled={!canWriteHostel}
                                className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteBlock(block)}
                                disabled={!canWriteHostel}
                                className="bg-red-500 text-white px-3 py-2 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          {expandedBlocks[block.id] && (
                            <div className="p-4 sm:p-5 space-y-4">
                              {(block.floors || []).length === 0 && (
                                <p className="text-gray-400 text-sm">
                                  No floors yet in this block.
                                </p>
                              )}

                              {(block.floors || []).map((floor) => (
                                <div
                                  key={floor.id}
                                  className="border dark:border-slate-700 rounded-xl"
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
                                    className="w-full bg-slate-50 dark:bg-slate-700/30 p-4 flex justify-between items-center text-left cursor-pointer"
                                  >
                                    <div>
                                      <h5 className="font-semibold flex items-center gap-2">
                                        <i
                                          className={`bi ${
                                            expandedFloors[floor.id]
                                              ? "bi-chevron-down"
                                              : "bi-chevron-right"
                                          } text-xs`}
                                        />
                                        {floor.floor_name ||
                                          `Floor ${floor.floor_number}`}
                                      </h5>
                                      <small className="text-gray-500">
                                        Rooms: {(floor.rooms || []).length}
                                      </small>
                                    </div>

                                    <div
                                      className="flex gap-2"
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
                                        className="bg-green-600 text-white px-3 py-2 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        + Room
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          openEditFloorModal(floor)
                                        }
                                        disabled={!canWriteHostel}
                                        className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        Edit
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => deleteFloor(floor)}
                                        disabled={!canWriteHostel}
                                        className="bg-red-500 text-white px-3 py-2 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>

                                  {expandedFloors[floor.id] && (
                                    <div className="grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 gap-4 p-4">
                                      {(floor.rooms || []).length === 0 && (
                                        <p className="text-gray-400 text-sm col-span-full">
                                          No rooms yet on this floor.
                                        </p>
                                      )}

                                      {(floor.rooms || []).map((room) => (
                                        <div
                                          key={room.id}
                                          className="rounded-xl border border-gray-100 p-4 transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700"
                                        >
                                          <div className="flex justify-between items-center mb-3">
                                            <h5 className="font-bold">
                                              {room.room_number}
                                            </h5>

                                            <span
                                              className={`px-2 py-1 rounded text-xs ${
                                                room.available_count > 0
                                                  ? "bg-green-100 text-green-700"
                                                  : "bg-red-100 text-red-700"
                                              }`}
                                            >
                                              {room.available_count > 0
                                                ? "Available"
                                                : "Full"}
                                            </span>
                                          </div>

                                          <div className="space-y-1 text-sm text-gray-500">
                                            <p>
                                              Capacity:{" "}
                                              <strong className="text-gray-800 dark:text-gray-200">
                                                {room.capacity} Beds
                                              </strong>
                                            </p>
                                            <p>
                                              Occupied:{" "}
                                              <strong className="text-gray-800 dark:text-gray-200">
                                                {room.occupied_count}
                                              </strong>
                                            </p>
                                            <p>
                                              Available:{" "}
                                              <strong className="text-gray-800 dark:text-gray-200">
                                                {room.available_count}
                                              </strong>
                                            </p>
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
                                            className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm"
                                          >
                                            View Beds
                                          </button>
                                        </div>
                                      ))}
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
              <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
                {hostelForm.id ? "Edit Hostel" : "New Hostel"}
              </h2>

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
              <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
                {blockForm.id ? "Edit Block" : "New Block"}
              </h2>

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
              <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
                {floorForm.id ? "Edit Floor" : "New Floor"}
              </h2>

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
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
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

              <div className="grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 gap-4">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="rounded-xl border border-gray-100 p-4 transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="font-bold">{room.room_number}</h5>

                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          room.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : room.status === "Maintenance"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {room.status}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mb-2">
                      {room.hostel_name} · Block {room.block_name} ·{" "}
                      {room.floor_name || `Floor ${room.floor_number}`}
                    </p>

                    <div className="space-y-1 text-sm text-gray-500">
                      <p>
                        Type:{" "}
                        <strong className="text-gray-800 dark:text-gray-200">
                          {room.room_type}
                        </strong>
                      </p>
                      <p>
                        Capacity:{" "}
                        <strong className="text-gray-800 dark:text-gray-200">
                          {room.capacity} Beds
                        </strong>
                      </p>
                      <p>
                        Occupied:{" "}
                        <strong className="text-gray-800 dark:text-gray-200">
                          {room.occupied_count}
                        </strong>{" "}
                        · Available:{" "}
                        <strong className="text-gray-800 dark:text-gray-200">
                          {room.available_count}
                        </strong>
                      </p>
                      {room.monthly_rent !== null &&
                        room.monthly_rent !== undefined && (
                          <p>
                            Rent:{" "}
                            <strong className="text-gray-800 dark:text-gray-200">
                              ₹{room.monthly_rent}/mo
                            </strong>
                          </p>
                        )}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => openRoomDetails(room)}
                        className="flex-1 bg-slate-100 dark:bg-slate-700 py-2 rounded-lg text-xs font-medium"
                      >
                        View
                      </button>

                      <button
                        onClick={() => openEditRoomModal(room)}
                        disabled={!canWriteHostel}
                        className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => deleteRoom(room)}
                        disabled={!canWriteHostel}
                        className="flex-1 bg-red-500 text-white py-2 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* ROOM MODAL */}
        {roomModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
                {roomForm.id ? "Edit Room" : "New Room"}
              </h2>

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
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 w-full max-w-lg border border-gray-100 dark:border-slate-700">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    Room {selectedRoom.room_number}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {selectedRoom.hostel_name} · Block {selectedRoom.block_name}{" "}
                    ·{" "}
                    {selectedRoom.floor_name ||
                      `Floor ${selectedRoom.floor_number}`}
                  </p>
                </div>

                <button
                  onClick={closeRoomDetails}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Capacity</p>
                  <p className="text-xl font-bold">{selectedRoom.capacity}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Occupied</p>
                  <p className="text-xl font-bold text-red-500">
                    {selectedRoom.occupied_count}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Available</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {selectedRoom.available_count}
                  </p>
                </div>
              </div>

              <h4 className="text-sm font-semibold mb-2">Wardens</h4>
              {(selectedRoom.wardens || []).length === 0 ? (
                <p className="text-sm text-gray-400 mb-4">
                  No warden assigned.
                </p>
              ) : (
                <ul className="text-sm space-y-1 mb-4">
                  {selectedRoom.wardens.map((warden) => (
                    <li key={warden.id}>
                      {warden.name} · {warden.mobile}
                    </li>
                  ))}
                </ul>
              )}

              <h4 className="text-sm font-semibold mb-2">Beds</h4>
              <div className="space-y-1 mb-4">
                {(selectedRoom.beds || []).map((bed) => (
                  <div
                    key={bed.id}
                    className="flex justify-between bg-gray-50 dark:bg-slate-700/40 rounded p-2 text-sm"
                  >
                    <span>Bed {bed.bed_number}</span>
                    <span
                      className={
                        bed.status === "Occupied"
                          ? "text-green-600 font-medium"
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
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm"
              >
                Manage Beds
              </button>
            </div>
          </div>
        )}

        {/* <!-- =========================== BED MANAGEMENT SECTION =========================== --> */}
        {/* <!-- =========================== BED MANAGEMENT SECTION =========================== --> */}
        {activeSection === "beds" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
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

            {/* BED TABLE */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Beds
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {beds.length} bed(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900/40 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Bed</th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Room
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Occupant
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {bedsLoading && beds.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                            <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                            Loading beds...
                          </div>
                        </td>
                      </tr>
                    )}

                    {!bedsLoading && beds.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-14 text-center">
                          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                            <i className="bi bi-grid-3x3-gap text-2xl" />
                          </span>
                          <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                            No beds found
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            No beds match these filters, or none exist yet.
                          </p>
                        </td>
                      </tr>
                    )}

                    {beds.map((bed) => (
                      <tr
                        key={bed.id}
                        className="transition hover:bg-gray-50 dark:hover:bg-slate-700/40"
                      >
                        <td className="px-4 py-3 font-medium">
                          {bed.bed_number}
                        </td>
                        <td className="px-4 py-3">Room #{bed.room_id}</td>
                        <td className="px-4 py-3">{bed.bed_type}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              bed.status === "Vacant"
                                ? "bg-emerald-100 text-emerald-700"
                                : bed.status === "Occupied"
                                  ? "bg-red-100 text-red-700"
                                  : bed.status === "Maintenance"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {bed.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {bed.occupant ? (
                            <span>
                              {bed.occupant.name}{" "}
                              <span className="text-gray-400 text-xs">
                                ({bed.occupant.student_code})
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2 flex-wrap">
                            {bed.status === "Vacant" && (
                              <button
                                onClick={() => openAllocateModal(bed)}
                                disabled={!canWriteHostel}
                                className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Allocate
                              </button>
                            )}

                            {bed.status === "Occupied" && (
                              <button
                                onClick={() => vacateBed(bed)}
                                disabled={
                                  !canWriteHostel || vacatingBedId === bed.id
                                }
                                className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {vacatingBedId === bed.id
                                  ? "Vacating…"
                                  : "Vacate"}
                              </button>
                            )}

                            <button
                              onClick={() => openEditBedModal(bed)}
                              disabled={!canWriteHostel}
                              className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => deleteBed(bed)}
                              disabled={
                                !canWriteHostel || bed.status === "Occupied"
                              }
                              className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Delete
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

        {/* BED MODAL */}
        {bedModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
                {bedForm.id ? "Edit Bed" : "New Bed"}
              </h2>

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
              <h2 className="text-lg font-semibold mb-1">Allocate Bed</h2>
              <p className="text-xs text-gray-500 mb-4">
                Bed {allocateTargetBed?.bed_number} · Room #
                {allocateTargetBed?.room_id}
              </p>

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
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm"
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
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm disabled:opacity-50"
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
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
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
                                ? "bg-green-100 text-green-700"
                                : row.fee_status === "Overdue"
                                  ? "bg-red-100 text-red-700"
                                  : row.fee_status === "Pending"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {row.fee_status || "—"}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              row.is_active
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-600"
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
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
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
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
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
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
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
                                ? "bg-green-100 text-green-700"
                                : staff.status === "On Leave"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-gray-100 text-gray-600"
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
                <div className="grid grid-cols-2 gap-3">
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
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
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
                                ? "bg-green-100 text-green-700"
                                : visitor.status === "Pending"
                                  ? "bg-amber-100 text-amber-700"
                                  : visitor.status === "Rejected"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-600"
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
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
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
                                ? "bg-green-100 text-green-700"
                                : row.status === "Absent"
                                  ? "bg-red-100 text-red-700"
                                  : row.status === "On Leave"
                                    ? "bg-amber-100 text-amber-700"
                                    : row.status === "Late Entry"
                                      ? "bg-purple-100 text-purple-700"
                                      : "bg-gray-100 text-gray-600"
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
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
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
                                ? "bg-green-100 text-green-700"
                                : movement.status === "Late Entry"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
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
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
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
                                ? "bg-green-100 text-green-700"
                                : leave.status === "Pending"
                                  ? "bg-amber-100 text-amber-700"
                                  : leave.status === "Rejected"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-600"
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

                <div className="grid grid-cols-2 gap-3">
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
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
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
            <div className="grid grid-cols-3 gap-4">
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
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
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
                                ? "bg-green-100 text-green-700"
                                : row.status === "Absent"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-600"
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
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
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
                                ? "bg-red-100 text-red-700"
                                : complaint.priority === "High"
                                  ? "bg-orange-100 text-orange-700"
                                  : complaint.priority === "Medium"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {complaint.priority}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              complaint.status === "Resolved"
                                ? "bg-green-100 text-green-700"
                                : complaint.status === "In Progress"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-amber-100 text-amber-700"
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
                <div className="grid grid-cols-2 gap-3">
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
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
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
                                ? "bg-red-100 text-red-700"
                                : req.priority === "High"
                                  ? "bg-orange-100 text-orange-700"
                                  : req.priority === "Medium"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {req.priority}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              req.status === "Resolved"
                                ? "bg-green-100 text-green-700"
                                : req.status === "In Progress"
                                  ? "bg-blue-100 text-blue-700"
                                  : req.status === "Cancelled"
                                    ? "bg-gray-100 text-gray-600"
                                    : "bg-amber-100 text-amber-700"
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

                <div className="grid grid-cols-2 gap-3">
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

                <div className="grid grid-cols-2 gap-3">
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
