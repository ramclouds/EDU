import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { APP_NAME, APP_YEAR, BASE_URL } from "../config/appConfig";
import "../css/dashboard.css";
import SettingsPanel from "../components/SettingsPanel";
import { useDashboardUI } from "../controllers/useDashboardUI";
import { useAdminDashboard } from "../controllers/AdminSide/adminDashboard";
import { useAdminProfile } from "../controllers/AdminSide/useAdminProfile";
import { useAcademicPermission } from "../controllers/Academic/useAcademicPermission";
import { useDivisionsSections } from "../controllers/Academic/useDivisionsSections";
import { useAcademicClasses } from "../controllers/Academic/useAcademicClasses";
import { useSubjectManagements } from "../controllers/Academic/useSubjectManagements";
import { useBatches } from "../controllers/Academic/useBatches";
import { useStudents } from "../controllers/Academic/useStudents";
import { useMyClasses } from "../controllers/Academic/useMyClass";
import { useTeacherManagement } from "../controllers/Academic/useTeachersManagement";
import { useExamResultManagement } from "../controllers/Academic/useExamResultManagement";
import { useTimeTableManagement } from "../controllers/Academic/useTimetableManagement";
import { useAttendanceManagement } from "../controllers/Academic/useAttendanceManagement";

function AdminDashboard() {
  // UI STATE (LOCAL COMPONENT STATE)
  const location = useLocation();

  const [activeSection, setActiveSection] = useState(
    location.state?.activeSection || "dashboard",
  );
  // const [noticeTab, setNoticeTab] = useState("announcements");
  const [search, setSearch] = useState("");
  const [notificationFilterTab, setNotificationFilterTab] = useState("all");
  const [notificationSearch, setNotificationSearch] = useState("");
  const [createNotifModalOpen, setCreateNotifModalOpen] = useState(false);
  const [createNotifForm, setCreateNotifForm] = useState({
    title: "",
    message: "",
    priority: "Medium",
    target_role: "all",
  });
  const [createNotifSaving, setCreateNotifSaving] = useState(false);
  const [createNotifError, setCreateNotifError] = useState("");

  const submitCreateNotification = async (event) => {
    event?.preventDefault?.();

    if (!createNotifForm.title.trim() || !createNotifForm.message.trim()) {
      setCreateNotifError("Title and message are required");
      return;
    }

    setCreateNotifSaving(true);
    setCreateNotifError("");

    try {
      const response = await fetchWithAuth(`${BASE_URL}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createNotifForm),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create notification");
      }

      showToast?.("Notification created", "success");
      setCreateNotifModalOpen(false);
      setCreateNotifForm({
        title: "",
        message: "",
        priority: "Medium",
        target_role: "all",
      });
    } catch (err) {
      console.error("Create notification failed:", err);
      setCreateNotifError(err.message || "Failed to create notification");
    } finally {
      setCreateNotifSaving(false);
    }
  };

  const { canWriteAcademic, AcademicAccessLevel } = useAcademicPermission();

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

  // ================= ACADEMIC SETUP (Classes / Divisions & Sections / Subjects) =================
  const divisionsSections = useDivisionsSections();
  const academicClasses = useAcademicClasses();
  const subjectManagement = useSubjectManagements({
    activeSection,
    fetchWithAuth,
    showToast,
  });
  const batchManagement = useBatches();
  const studentManagement = useStudents();

  // ================= STUDENTS ("My Classes" browse UI) HOOK =================
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
    loadMyClasses,
  } = useMyClasses({
    activeSection,
    fetchWithAuth,
    showToast,
  });

  // Refresh the class roster after a successful enrollment, so a newly
  // enrolled student shows up in "My Classes" without a manual reload.
  useEffect(() => {
    if (studentManagement.enrollResult) {
      loadMyClasses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentManagement.enrollResult]);

  // ================= STUDENT PROFILE TABS (attendance + leaves) =================
  const [studentProfileTab, setStudentProfileTab] = useState("overview");
  const [studentProfileAttendance, setStudentProfileAttendance] = useState(null);
  const [studentProfileAttendanceLoading, setStudentProfileAttendanceLoading] = useState(false);
  const [studentProfileLeaves, setStudentProfileLeaves] = useState([]);
  const [studentProfileLeavesLoading, setStudentProfileLeavesLoading] = useState(false);

  useEffect(() => {
    if (!isStudentProfileOpen || !selectedStudent) return;

    setStudentProfileTab("overview");

    const studentDbId = selectedStudent.id;

    const loadAttendance = async () => {
      if (!studentDbId) return;
      setStudentProfileAttendanceLoading(true);
      try {
        const res = await fetchWithAuth(
          `${BASE_URL}/student/attendance/${studentDbId}`,
        );
        const data = await res.json().catch(() => null);
        setStudentProfileAttendance(data || null);
      } catch (err) {
        console.error("Failed to load student attendance:", err);
        setStudentProfileAttendance(null);
      } finally {
        setStudentProfileAttendanceLoading(false);
      }
    };

    const loadLeaves = async () => {
      setStudentProfileLeavesLoading(true);
      try {
        const res = await fetchWithAuth(`${BASE_URL}/admin/student/leaves`);
        const data = await res.json().catch(() => []);
        const all = Array.isArray(data) ? data : [];
        const mine = studentDbId
          ? all.filter((l) => l.student_id === studentDbId)
          : all.filter(
              (l) =>
                l.student_name &&
                selectedStudent.full_name &&
                l.student_name === selectedStudent.full_name,
            );
        setStudentProfileLeaves(mine);
      } catch (err) {
        console.error("Failed to load student leaves:", err);
        setStudentProfileLeaves([]);
      } finally {
        setStudentProfileLeavesLoading(false);
      }
    };

    loadAttendance();
    loadLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStudentProfileOpen, selectedStudent]);

  // ================= TEACHER MANAGEMENT HOOK =================
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

  // ================= TEACHER PROFILE TABS (assigned classes + attendance + leaves) =================
  const [teacherProfileTab, setTeacherProfileTab] = useState("overview");
  const [teacherProfileAttendance, setTeacherProfileAttendance] = useState([]);
  const [teacherProfileAttendanceLoading, setTeacherProfileAttendanceLoading] = useState(false);
  const [teacherProfileLeaves, setTeacherProfileLeaves] = useState([]);
  const [teacherProfileLeavesLoading, setTeacherProfileLeavesLoading] = useState(false);

  useEffect(() => {
    if (!teacherManagementViewModalOpen || !teacherManagementSelectedTeacher) return;

    setTeacherProfileTab("overview");

    const teacherDbId = teacherManagementSelectedTeacher.id;

    const loadTeacherAttendance = async () => {
      setTeacherProfileAttendanceLoading(true);
      try {
        const params = new URLSearchParams({
          role: "teachers",
          search: teacherManagementSelectedTeacher.teacher_id || "",
          limit: 15,
        });
        const res = await fetchWithAuth(
          `${BASE_URL}/admin/attendance/list?${params.toString()}`,
        );
        const data = await res.json().catch(() => null);
        setTeacherProfileAttendance(data?.items || []);
      } catch (err) {
        console.error("Failed to load teacher attendance:", err);
        setTeacherProfileAttendance([]);
      } finally {
        setTeacherProfileAttendanceLoading(false);
      }
    };

    const loadTeacherLeaves = async () => {
      setTeacherProfileLeavesLoading(true);
      try {
        const res = await fetchWithAuth(`${BASE_URL}/admin/teacher/leaves`);
        const data = await res.json().catch(() => []);
        const all = Array.isArray(data) ? data : [];
        const mine = teacherDbId
          ? all.filter((l) => l.teacher_id === teacherDbId)
          : all.filter(
              (l) =>
                l.teacher_name &&
                l.teacher_name === teacherManagementSelectedTeacher.full_name,
            );
        setTeacherProfileLeaves(mine);
      } catch (err) {
        console.error("Failed to load teacher leaves:", err);
        setTeacherProfileLeaves([]);
      } finally {
        setTeacherProfileLeavesLoading(false);
      }
    };

    loadTeacherAttendance();
    loadTeacherLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherManagementViewModalOpen, teacherManagementSelectedTeacher]);

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

  // ================= ON LEAVE TODAY (cross-referenced with Attendance) =================
  // Lets an Academic Admin see, right alongside the attendance list,
  // who is marked absent because they're on an approved leave rather
  // than an unexplained absence.
  const [onLeaveToday, setOnLeaveToday] = useState([]);
  const [onLeaveLoading, setOnLeaveLoading] = useState(false);

  useEffect(() => {
    if (activeSection !== "attendance") return;

    const loadOnLeaveToday = async () => {
      setOnLeaveLoading(true);
      try {
        const checkDate = selectedDate || new Date().toISOString().split("T")[0];

        const [studentRes, teacherRes] = await Promise.all([
          fetchWithAuth(`${BASE_URL}/admin/student/leaves`),
          fetchWithAuth(`${BASE_URL}/admin/teacher/leaves`),
        ]);

        const studentLeaves = await studentRes.json().catch(() => []);
        const teacherLeaves = await teacherRes.json().catch(() => []);

        const isCoveringDate = (leave) => {
          if (leave.status !== "Approved") return false;
          const from = leave.from_date || leave.from;
          const to = leave.to_date || leave.to;
          if (!from || !to) return false;
          return checkDate >= from && checkDate <= to;
        };

        const students = (Array.isArray(studentLeaves) ? studentLeaves : [])
          .filter(isCoveringDate)
          .map((l) => ({
            id: `student-${l.id}`,
            name: l.student_name,
            role: "Student",
            reason: l.reason,
            leave_type: l.leave_type,
          }));

        const teachersOnLeave = (Array.isArray(teacherLeaves) ? teacherLeaves : [])
          .filter(isCoveringDate)
          .map((l) => ({
            id: `teacher-${l.id}`,
            name: l.teacher_name,
            role: "Teacher",
            reason: l.reason,
            leave_type: l.leave_type,
          }));

        setOnLeaveToday([...teachersOnLeave, ...students]);
      } catch (err) {
        console.error("Failed to load leave cross-reference:", err);
        setOnLeaveToday([]);
      } finally {
        setOnLeaveLoading(false);
      }
    };

    loadOnLeaveToday();
  }, [activeSection, selectedDate]);

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

    isAcademicAdmin,
    isSuperAdmin,
  } = useAdminProfile({ fetchWithAuth, showToast });

  useEffect(() => {
    if (!admin?.id) return;

    if (!isSuperAdmin && !isAcademicAdmin) {
      showToast("You do not have access to the Academic Dashboard", "error");
      navigate("/super-admin-dashboard", { replace: true });
    }
  }, [admin?.id, isSuperAdmin, isAcademicAdmin, navigate, showToast]);

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
        {/* ========================= Academic ADMIN SIDEBAR NAV ========================= */}
        <nav
          aria-label="Academic management navigation"
          className="min-h-0 flex-1 space-y-2 no-scrollbar overflow-y-auto overscroll-contain px-3 py-4 text-sm [scrollbar-width:thin]"
        >
          {[
            {
              title: "MAIN",
              items: [["dashboard", "bi-grid-fill", "Dashboard"]],
            },
            {
              title: "ACADEMIC SETUP",
              items: [
                ["classes", "bi-collection", "Classes"],
                ["divisions-sections", "bi-diagram-3", "Grades & Sections"],
                ["subjects", "bi-journal-bookmark", "Subjects"],
                ["batches", "bi-layers", "Academic Years"],
              ],
            },
            {
              title: "STUDENTS & TEACHERS",
              items: [
                ["students", "bi-mortarboard", "Students"],
                ["teachers", "bi-person-badge", "Teachers"],
              ],
            },
            {
              title: "TIMETABLE & ATTENDANCE",
              items: [
                ["timetable", "bi-calendar-week", "Timetable"],
                ["attendance", "bi-calendar-check", "Attendance"],
              ],
            },
            {
              title: "EXAMS & RESULTS",
              items: [
                ["exams", "bi-clipboard-data", "Exams"],
                ["results", "bi-award", "Results"],
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
          {!canWriteAcademic && (
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
        {/* ================= Academic DASHBOARD ================= */}
        {activeSection === "dashboard" && (
          <section className="section active space-y-6 p-4 sm:p-6">
            {/* HEADER */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    Welcome back, {admin?.first_name || "Admin"}
                  </h2>

                  <p className="mt-1 text-sm text-blue-100">
                    Today&apos;s classes, timetable, attendance and exam
                    overview
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSection("reports")}
                    className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm transition border border-white/20"
                  >
                    <i className="bi bi-bar-chart-line me-1.5" />
                    Full Reports
                  </button>
                </div>
              </div>
            </div>

            {/* QUICK STATS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Students",
                  value: academicClasses.classStats.total_students_assigned,
                  icon: "bi-mortarboard",
                  cls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                  section: "students",
                },
                {
                  label: "Teachers",
                  value: teacherManagementStats.total,
                  icon: "bi-person-badge",
                  cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
                  section: "teachers",
                },
                {
                  label: "Today's Attendance",
                  value: `${attendanceStats.percentage ?? 0}%`,
                  icon: "bi-calendar-check",
                  cls: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
                  section: "attendance",
                },
                {
                  label: "Unread Notifications",
                  value: totalUnread || 0,
                  icon: "bi-bell",
                  cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
                  section: "notifications",
                },
              ].map((kpi) => (
                <button
                  type="button"
                  key={kpi.label}
                  onClick={() => setActiveSection(kpi.section)}
                  className="text-left bg-white rounded-2xl border border-gray-200 shadow-sm p-4 transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {kpi.label}
                      </p>
                      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                        {kpi.value ?? 0}
                      </p>
                    </div>
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${kpi.cls}`}
                    >
                      <i className={`bi ${kpi.icon} text-lg`} />
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* QUICK ACTIONS */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="font-bold text-gray-800 dark:text-white mb-4">
                Quick Actions
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  {
                    label: "Enroll Student",
                    icon: "bi-person-plus",
                    onClick: () => {
                      setActiveSection("students");
                      studentManagement.openEnrollModal();
                    },
                  },
                  {
                    label: "Add Teacher",
                    icon: "bi-person-badge",
                    onClick: () => {
                      setActiveSection("teachers");
                      openTeacherManagementAddModal();
                    },
                  },
                  {
                    label: "Create Exam",
                    icon: "bi-clipboard-plus",
                    onClick: () => {
                      setActiveSection("exams");
                      openExamManagementModal();
                    },
                  },
                  {
                    label: "Mark Attendance",
                    icon: "bi-calendar-check",
                    onClick: () => setActiveSection("attendance"),
                  },
                  {
                    label: "Add Class",
                    icon: "bi-collection",
                    onClick: () => {
                      setActiveSection("classes");
                      academicClasses.openCreateClassModal();
                    },
                  },
                ].map((action) => (
                  <button
                    type="button"
                    key={action.label}
                    onClick={action.onClick}
                    className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 dark:border-slate-700 p-4 text-center transition hover:border-indigo-200 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                      <i className={`bi ${action.icon} text-lg`} />
                    </span>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* RECENT NOTIFICATIONS */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-700">
                  <h3 className="font-bold text-gray-800 dark:text-white">
                    Recent Notifications
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveSection("notifications")}
                    className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
                  >
                    View All →
                  </button>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                  {(sortedNotifications || []).length === 0 ? (
                    <p className="py-10 text-center text-sm text-gray-400">
                      🎉 You&apos;re all caught up
                    </p>
                  ) : (
                    sortedNotifications.slice(0, 5).map((item) => (
                      <button
                        type="button"
                        key={`${item.source}-${item.id}-${item.time || item.date}`}
                        onClick={() =>
                          handleNotificationClick &&
                          handleNotificationClick(item)
                        }
                        className={`w-full p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-700/50 ${
                          !item.is_read
                            ? "bg-indigo-50/40 dark:bg-indigo-500/5"
                            : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${
                              item.source === "notice"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                : "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300"
                            }`}
                          >
                            {item.source === "notice" ? "📢" : "📩"}
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-800 dark:text-white">
                              {item.title}
                            </p>
                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                              {item.message || ""}
                            </p>
                          </div>

                          {!item.is_read && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* TODAY'S ATTENDANCE SNAPSHOT */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800 dark:text-white">
                    Today&apos;s Attendance
                  </h3>
                  <span className="text-xs text-gray-400">
                    {attendanceStats.total ?? 0} marked
                  </span>
                </div>

                {(() => {
                  const total = attendanceStats.total || 0;
                  const bars = [
                    {
                      label: "Present",
                      value: attendanceStats.present || 0,
                      cls: "bg-emerald-500",
                    },
                    {
                      label: "Absent",
                      value: attendanceStats.absent || 0,
                      cls: "bg-red-500",
                    },
                    {
                      label: "Late",
                      value: attendanceStats.late || 0,
                      cls: "bg-amber-500",
                    },
                  ];

                  if (total === 0) {
                    return (
                      <p className="py-8 text-center text-sm text-gray-400">
                        No attendance marked yet today.
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {bars.map((bar) => {
                        const pct =
                          total > 0 ? Math.round((bar.value / total) * 100) : 0;
                        return (
                          <div key={bar.label}>
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="font-medium text-gray-600 dark:text-gray-300">
                                {bar.label}
                              </span>
                              <span className="text-gray-400">
                                {bar.value} ({pct}%)
                              </span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${bar.cls}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
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
          <div className="fixed inset-0 md:pl-64 z-[100] bg-slate-950/60 backdrop-blur-md p-2 sm:p-4">
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
          <div className="fixed inset-0 md:pl-64 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
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

              {/* TABS */}
              <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700 mb-4">
                {[
                  { key: "overview", label: "Overview", icon: "bi-person-lines-fill" },
                  { key: "classes", label: "Assigned Classes", icon: "bi-journal-bookmark" },
                  { key: "attendance", label: "Attendance", icon: "bi-calendar-check" },
                  { key: "leaves", label: "Leaves", icon: "bi-calendar-x" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setTeacherProfileTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                      teacherProfileTab === tab.key
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <i className={`bi ${tab.icon}`} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ================= OVERVIEW TAB ================= */}
              {teacherProfileTab === "overview" && (
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
              )}

              {/* ================= ASSIGNED CLASSES TAB ================= */}
              {teacherProfileTab === "classes" && (
              <div className="border rounded-xl p-4">
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
              )}

              {/* ================= ATTENDANCE TAB ================= */}
              {teacherProfileTab === "attendance" && (
                <div className="space-y-3">
                  {teacherProfileAttendanceLoading ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-gray-500">
                      <span className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                      Loading attendance...
                    </div>
                  ) : teacherProfileAttendance.length === 0 ? (
                    <p className="py-10 text-center text-sm text-gray-400">
                      No attendance records found.
                    </p>
                  ) : (
                    <div className="overflow-x-auto overflow-hidden rounded-xl border border-gray-100">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                          <tr>
                            <th className="px-4 py-2.5">Date</th>
                            <th className="px-4 py-2.5">Status</th>
                            <th className="px-4 py-2.5">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {teacherProfileAttendance.map((record, idx) => (
                            <tr key={record.record_id || idx}>
                              <td className="px-4 py-2.5 text-gray-700">
                                {record.date}
                              </td>
                              <td className="px-4 py-2.5">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                    record.status === "Present"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : record.status === "Late"
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-red-50 text-red-700"
                                  }`}
                                >
                                  {record.status}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-gray-500">
                                {record.remarks || record.reason || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ================= LEAVES TAB ================= */}
              {teacherProfileTab === "leaves" && (
                <div className="space-y-3">
                  {teacherProfileLeavesLoading ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-gray-500">
                      <span className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                      Loading leaves...
                    </div>
                  ) : teacherProfileLeaves.length === 0 ? (
                    <p className="py-10 text-center text-sm text-gray-400">
                      No leave records found for this teacher.
                    </p>
                  ) : (
                    teacherProfileLeaves.map((leave, idx) => (
                      <div
                        key={leave.id || idx}
                        className="flex items-center justify-between rounded-xl border border-gray-100 p-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {leave.leave_type || "Leave"} · {leave.from_date} to{" "}
                            {leave.to_date}
                          </p>
                          <p className="text-xs text-gray-500">
                            {leave.reason || "No reason given"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            leave.status === "Approved"
                              ? "bg-emerald-50 text-emerald-700"
                              : leave.status === "Rejected"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {leave.status || "Pending"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

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
                  onClick={studentManagement.openEnrollModal}
                  className="bg-white text-indigo-600 px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg hover:bg-indigo-50 transition-all duration-200"
                >
                  <i className="bi bi-person-plus-fill me-2"></i>
                  Enroll Student
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
          } fixed inset-0 bg-black/50 backdrop-blur-sm items-end sm:items-center justify-center z-[100] p-2 sm:p-4`}
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

            {/* TABS */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700">
              {[
                { key: "overview", label: "Overview", icon: "bi-person-lines-fill" },
                { key: "attendance", label: "Attendance", icon: "bi-calendar-check" },
                { key: "leaves", label: "Leaves", icon: "bi-calendar-x" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStudentProfileTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                    studentProfileTab === tab.key
                      ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  <i className={`bi ${tab.icon}`} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ================= OVERVIEW TAB ================= */}
            {studentProfileTab === "overview" && (
              <>
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
              </>
            )}

            {/* ================= ATTENDANCE TAB ================= */}
            {studentProfileTab === "attendance" && (
              <div className="space-y-4">
                {studentProfileAttendanceLoading ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-gray-500">
                    <span className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                    Loading attendance...
                  </div>
                ) : studentProfileAttendance?.summary ? (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-4 text-center">
                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                          {studentProfileAttendance.summary.present || 0}
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          Present
                        </p>
                      </div>
                      <div className="rounded-xl bg-red-50 dark:bg-red-500/10 p-4 text-center">
                        <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                          {studentProfileAttendance.summary.absent || 0}
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400">
                          Absent
                        </p>
                      </div>
                      <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 p-4 text-center">
                        <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                          {studentProfileAttendance.summary.late || 0}
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Late
                        </p>
                      </div>
                    </div>

                    {(studentProfileAttendance.records || []).length > 0 && (
                      <div className="overflow-x-auto overflow-hidden rounded-xl border border-gray-100 dark:border-slate-700">
                        <table className="min-w-full text-left text-sm">
                          <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-900/70 dark:text-gray-400">
                            <tr>
                              <th className="px-4 py-2.5">Date</th>
                              <th className="px-4 py-2.5">Status</th>
                              <th className="px-4 py-2.5">Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {studentProfileAttendance.records
                              .slice(0, 15)
                              .map((record, idx) => (
                                <tr key={record.id || idx}>
                                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-200">
                                    {record.date}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                        record.status === "Present"
                                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                                          : record.status === "Late"
                                          ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                                          : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                                      }`}
                                    >
                                      {record.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">
                                    {record.remarks || record.reason || "—"}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="py-10 text-center text-sm text-gray-400">
                    No attendance data available yet.
                  </p>
                )}
              </div>
            )}

            {/* ================= LEAVES TAB ================= */}
            {studentProfileTab === "leaves" && (
              <div className="space-y-3">
                {studentProfileLeavesLoading ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-gray-500">
                    <span className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                    Loading leaves...
                  </div>
                ) : studentProfileLeaves.length === 0 ? (
                  <p className="py-10 text-center text-sm text-gray-400">
                    No leave records found for this student.
                  </p>
                ) : (
                  studentProfileLeaves.map((leave, idx) => (
                    <div
                      key={leave.id || idx}
                      className="flex items-center justify-between rounded-xl border border-gray-100 p-3 dark:border-slate-700"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {leave.leave_type || "Leave"} · {leave.from_date} to{" "}
                          {leave.to_date}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {leave.reason || "No reason given"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          leave.status === "Approved"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : leave.status === "Rejected"
                            ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                        }`}
                      >
                        {leave.status || "Pending"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* ============ ENROLL STUDENT MODAL (kept from Academic's own enroll flow) ============ */}
                    {/* ============ ENROLL STUDENT MODAL ============ */}
            {studentManagement.enrollModalOpen && (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    studentManagement.closeEnrollModal();
                  }
                }}
              >
                <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-800">
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5 dark:border-slate-700 dark:bg-slate-800">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      {studentManagement.enrollResult
                        ? "Student Enrolled"
                        : "Enroll Student"}
                    </h2>

                    <button
                      type="button"
                      onClick={studentManagement.closeEnrollModal}
                      disabled={studentManagement.enrollSaving}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>

                  {studentManagement.enrollResult ? (
                    <div className="space-y-4 px-6 py-6">
                      <div className="flex flex-col items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
                        <i className="bi bi-check-circle text-3xl text-emerald-600 dark:text-emerald-300" />
                        <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                          {studentManagement.enrollForm.first_name} was
                          enrolled successfully
                        </p>
                      </div>

                      <div className="rounded-xl border border-gray-200 p-4 dark:border-slate-600">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Login Credentials - share these with the student
                        </p>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div>
                            <p className="text-xs text-gray-400">
                              Student ID
                            </p>
                            <p className="font-mono font-semibold text-gray-900 dark:text-white">
                              {studentManagement.enrollResult.student_id}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">User ID</p>
                            <p className="font-mono font-semibold text-gray-900 dark:text-white">
                              {studentManagement.enrollResult.user_id}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">
                              Temporary Password
                            </p>
                            <p className="font-mono font-semibold text-gray-900 dark:text-white">
                              {studentManagement.enrollResult.password}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={studentManagement.closeEnrollModal}
                          className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          onClick={studentManagement.enrollAnother}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-700"
                        >
                          <i className="bi bi-person-plus" />
                          Enroll Another
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form
                      onSubmit={studentManagement.submitEnrollment}
                      className="space-y-6 px-6 py-6"
                    >
                      {studentManagement.enrollOptions.academic_classes
                        .length === 0 &&
                        !studentManagement.enrollOptionsLoading && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                            <i className="bi bi-exclamation-triangle mr-1.5" />
                            No classes have been set up yet. Go to{" "}
                            <span className="font-semibold">
                              Grades &amp; Sections
                            </span>{" "}
                            and{" "}
                            <span className="font-semibold">Classes</span>{" "}
                            first, then come back to enroll students.
                          </div>
                        )}

                      {studentManagement.enrollErrors.form && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                          {studentManagement.enrollErrors.form}
                        </div>
                      )}

                      {/* CLASS */}
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Class <span className="text-red-500">*</span>
                        </label>

                        <select
                          value={studentManagement.enrollForm.academic_class_id}
                          onChange={(event) =>
                            studentManagement.updateEnrollForm(
                              "academic_class_id",
                              event.target.value,
                            )
                          }
                          className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition dark:bg-slate-900 dark:text-white ${
                            studentManagement.enrollErrors.academic_class_id
                              ? "border-red-500"
                              : "border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600"
                          }`}
                        >
                          <option value="">Select class</option>
                          {studentManagement.enrollOptions.academic_classes.map(
                            (cls) => (
                              <option key={cls.id} value={cls.id}>
                                {cls.display_name}
                              </option>
                            ),
                          )}
                        </select>
                      </div>

                      {/* LOGIN CREDENTIALS (editable, auto-suggested) */}
                      {studentManagement.enrollForm.academic_class_id && (
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                            Login Credentials
                          </p>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                                Student ID{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={studentManagement.enrollForm.student_id}
                                onChange={(event) =>
                                  studentManagement.updateEnrollForm(
                                    "student_id",
                                    event.target.value,
                                  )
                                }
                                placeholder={
                                  studentManagement.enrollPreviewLoading
                                    ? "Loading suggestion..."
                                    : "Auto-suggested, editable"
                                }
                                className={`w-full rounded-lg border px-3 py-2 font-mono text-sm outline-none dark:bg-slate-800 dark:text-gray-200 ${
                                  studentManagement.enrollErrors.student_id
                                    ? "border-red-500"
                                    : "border-gray-200 focus:border-indigo-500 dark:border-slate-600"
                                }`}
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                                User ID{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={studentManagement.enrollForm.user_id}
                                onChange={(event) =>
                                  studentManagement.updateEnrollForm(
                                    "user_id",
                                    event.target.value,
                                  )
                                }
                                placeholder={
                                  studentManagement.enrollPreviewLoading
                                    ? "Loading suggestion..."
                                    : "Auto-suggested, editable"
                                }
                                className={`w-full rounded-lg border px-3 py-2 font-mono text-sm outline-none dark:bg-slate-800 dark:text-gray-200 ${
                                  studentManagement.enrollErrors.user_id
                                    ? "border-red-500"
                                    : "border-gray-200 focus:border-indigo-500 dark:border-slate-600"
                                }`}
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                                Roll Number
                              </label>
                              <input
                                type="number"
                                value={studentManagement.enrollForm.roll_number}
                                onChange={(event) =>
                                  studentManagement.updateEnrollForm(
                                    "roll_number",
                                    event.target.value,
                                  )
                                }
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                                Password
                              </label>
                              <input
                                type="text"
                                value={studentManagement.enrollForm.password}
                                onChange={(event) =>
                                  studentManagement.updateEnrollForm(
                                    "password",
                                    event.target.value,
                                  )
                                }
                                placeholder="Leave blank to auto-generate"
                                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none dark:bg-slate-800 dark:text-gray-200 ${
                                  studentManagement.enrollErrors.password
                                    ? "border-red-500"
                                    : "border-gray-200 focus:border-indigo-500 dark:border-slate-600"
                                }`}
                              />
                              {studentManagement.enrollErrors.password && (
                                <p className="mt-1 text-xs text-red-500">
                                  {studentManagement.enrollErrors.password}
                                </p>
                              )}
                            </div>
                          </div>

                          <p className="mt-2 text-xs text-indigo-600/80 dark:text-indigo-300/80">
                            Student ID and User ID are auto-suggested but you
                            can edit them. Leave Password blank to
                            auto-generate one from the mobile number.
                          </p>
                        </div>
                      )}

                      {/* BASIC INFO */}
                      <div>
                        <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
                          Basic Information
                        </h3>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                              First Name{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={studentManagement.enrollForm.first_name}
                              onChange={(event) =>
                                studentManagement.updateEnrollForm(
                                  "first_name",
                                  event.target.value,
                                )
                              }
                              className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none dark:bg-slate-900 dark:text-white ${
                                studentManagement.enrollErrors.first_name
                                  ? "border-red-500"
                                  : "border-gray-200 focus:border-indigo-500 dark:border-slate-600"
                              }`}
                            />
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                              Middle Name
                            </label>
                            <input
                              type="text"
                              value={studentManagement.enrollForm.middle_name}
                              onChange={(event) =>
                                studentManagement.updateEnrollForm(
                                  "middle_name",
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                              Last Name{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={studentManagement.enrollForm.last_name}
                              onChange={(event) =>
                                studentManagement.updateEnrollForm(
                                  "last_name",
                                  event.target.value,
                                )
                              }
                              className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none dark:bg-slate-900 dark:text-white ${
                                studentManagement.enrollErrors.last_name
                                  ? "border-red-500"
                                  : "border-gray-200 focus:border-indigo-500 dark:border-slate-600"
                              }`}
                            />
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                              Mobile <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={studentManagement.enrollForm.mobile}
                              onChange={(event) =>
                                studentManagement.updateEnrollForm(
                                  "mobile",
                                  event.target.value,
                                )
                              }
                              className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none dark:bg-slate-900 dark:text-white ${
                                studentManagement.enrollErrors.mobile
                                  ? "border-red-500"
                                  : "border-gray-200 focus:border-indigo-500 dark:border-slate-600"
                              }`}
                            />
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                              Email
                            </label>
                            <input
                              type="email"
                              value={studentManagement.enrollForm.email}
                              onChange={(event) =>
                                studentManagement.updateEnrollForm(
                                  "email",
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                              Gender
                            </label>
                            <select
                              value={studentManagement.enrollForm.gender}
                              onChange={(event) =>
                                studentManagement.updateEnrollForm(
                                  "gender",
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                            >
                              <option value="">Select</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                              Date of Birth
                            </label>
                            <input
                              type="date"
                              value={studentManagement.enrollForm.date_of_birth}
                              onChange={(event) =>
                                studentManagement.updateEnrollForm(
                                  "date_of_birth",
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                              Blood Group
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. O+"
                              value={studentManagement.enrollForm.blood_group}
                              onChange={(event) =>
                                studentManagement.updateEnrollForm(
                                  "blood_group",
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                              Address
                            </label>
                            <input
                              type="text"
                              value={studentManagement.enrollForm.address}
                              onChange={(event) =>
                                studentManagement.updateEnrollForm(
                                  "address",
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>

                      {/* PARENT / GUARDIAN */}
                      <div>
                        <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
                          Parent / Guardian
                        </h3>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <input
                            type="text"
                            placeholder="Father's name"
                            value={studentManagement.enrollForm.father_name}
                            onChange={(event) =>
                              studentManagement.updateEnrollForm(
                                "father_name",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            placeholder="Father's mobile"
                            value={studentManagement.enrollForm.father_mobile}
                            onChange={(event) =>
                              studentManagement.updateEnrollForm(
                                "father_mobile",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                          />
                          <input
                            type="email"
                            placeholder="Father's email"
                            value={studentManagement.enrollForm.father_email}
                            onChange={(event) =>
                              studentManagement.updateEnrollForm(
                                "father_email",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            placeholder="Mother's name"
                            value={studentManagement.enrollForm.mother_name}
                            onChange={(event) =>
                              studentManagement.updateEnrollForm(
                                "mother_name",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            placeholder="Mother's mobile"
                            value={studentManagement.enrollForm.mother_mobile}
                            onChange={(event) =>
                              studentManagement.updateEnrollForm(
                                "mother_mobile",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                          />
                          <input
                            type="email"
                            placeholder="Mother's email"
                            value={studentManagement.enrollForm.mother_email}
                            onChange={(event) =>
                              studentManagement.updateEnrollForm(
                                "mother_email",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* HEALTH & ENROLLMENT DETAILS */}
                      <div>
                        <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
                          Health &amp; Enrollment Details
                        </h3>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <input
                            type="text"
                            placeholder="Medical conditions (optional)"
                            value={studentManagement.enrollForm.medical_conditions}
                            onChange={(event) =>
                              studentManagement.updateEnrollForm(
                                "medical_conditions",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            placeholder="Allergies (optional)"
                            value={studentManagement.enrollForm.allergies}
                            onChange={(event) =>
                              studentManagement.updateEnrollForm(
                                "allergies",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                          />

                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                              Admission Date
                            </label>
                            <input
                              type="date"
                              value={studentManagement.enrollForm.admission_date}
                              onChange={(event) =>
                                studentManagement.updateEnrollForm(
                                  "admission_date",
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                            />
                            <p className="mt-1 text-xs text-gray-400">
                              Leave blank to use today&apos;s date.
                            </p>
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                              Status
                            </label>
                            <select
                              value={studentManagement.enrollForm.status}
                              onChange={(event) =>
                                studentManagement.updateEnrollForm(
                                  "status",
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* EMERGENCY + OTHER */}
                      <div>
                        <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
                          Emergency Contact
                        </h3>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <input
                            type="text"
                            placeholder="Contact name"
                            value={
                              studentManagement.enrollForm
                                .emergency_contact_name
                            }
                            onChange={(event) =>
                              studentManagement.updateEnrollForm(
                                "emergency_contact_name",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            placeholder="Contact number"
                            value={
                              studentManagement.enrollForm
                                .emergency_contact_number
                            }
                            onChange={(event) =>
                              studentManagement.updateEnrollForm(
                                "emergency_contact_number",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            placeholder="Relation"
                            value={
                              studentManagement.enrollForm
                                .emergency_contact_relation
                            }
                            onChange={(event) =>
                              studentManagement.updateEnrollForm(
                                "emergency_contact_relation",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                          />
                        </div>

                        <input
                          type="text"
                          placeholder="Previous school (optional)"
                          value={studentManagement.enrollForm.previous_school}
                          onChange={(event) =>
                            studentManagement.updateEnrollForm(
                              "previous_school",
                              event.target.value,
                            )
                          }
                          className="mt-4 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 dark:border-slate-700 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={studentManagement.closeEnrollModal}
                          disabled={studentManagement.enrollSaving}
                          className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-white disabled:opacity-60 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={
                            studentManagement.enrollSaving ||
                            studentManagement.enrollOptions.academic_classes
                              .length === 0
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {studentManagement.enrollSaving ? (
                            <>
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Enrolling...
                            </>
                          ) : (
                            "Enroll Student"
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}




        {/* ================= ACADEMIC YEARS (BATCHES) ================= */}
        {activeSection === "batches" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Academic Years
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Manage school years like 2025-26, see which one is
                    active, and review any year&apos;s data.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => batchManagement.loadBatches()}
                    disabled={batchManagement.batchLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i
                      className={`bi bi-arrow-clockwise ${
                        batchManagement.batchLoading ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </button>

                  {canWriteAcademic && (
                    <button
                      type="button"
                      onClick={batchManagement.openCreateBatchModal}
                      className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow transition hover:bg-gray-100"
                    >
                      <i className="bi bi-plus-lg" />
                      Add Academic Year
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* PLAIN-LANGUAGE EXPLAINER */}
            <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10 sm:p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                <i className="bi bi-info-circle text-lg" />
              </span>

              <p className="text-sm text-indigo-900 dark:text-indigo-200">
                An <span className="font-semibold">Academic Year</span> is a
                school year like &quot;2025-26&quot;. Mark one as{" "}
                <span className="font-semibold">Current</span> so new
                admissions and classes default to it. Click{" "}
                <span className="font-semibold">View</span> on any year -
                past or present - to see its grades, sections and student
                counts. Use{" "}
                <span className="font-semibold">Copy Classes</span> to
                reuse last year&apos;s grade/section setup instead of
                rebuilding it from scratch.
              </p>
            </div>

            {/* STATISTICS */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                {
                  label: "Total Academic Years",
                  value: batchManagement.batchStats.total,
                  icon: "bi-layers",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Currently Active",
                  value: batchManagement.batchStats.current_batch || "Not set",
                  icon: "bi-star-fill",
                  classes:
                    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                  isText: true,
                },
                {
                  label: "In Use By Classes",
                  value: batchManagement.batchStats.in_use,
                  icon: "bi-check-circle",
                  classes:
                    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
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

                      <p
                        className={`mt-2 font-bold text-gray-900 dark:text-white ${
                          stat.isText ? "text-lg" : "text-2xl"
                        }`}
                      >
                        {stat.isText ? stat.value : Number(stat.value || 0)}
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

            {/* SEARCH */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
              <div className="relative">
                <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />

                <input
                  type="search"
                  value={batchManagement.batchSearch}
                  onChange={(event) => {
                    batchManagement.setBatchSearch(event.target.value);
                    batchManagement.loadBatches(event.target.value);
                  }}
                  placeholder="Search academic years..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* ACADEMIC YEAR CARDS */}
            {batchManagement.batchLoading ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                  <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                  Loading academic years...
                </div>
              </div>
            ) : batchManagement.batches.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                  <i className="bi bi-layers text-2xl" />
                </span>

                <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                  No academic years yet
                </h3>

                <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                  Add your first academic year (e.g. &quot;2025-26&quot;) to
                  start building classes.
                </p>

                {canWriteAcademic && (
                  <button
                    type="button"
                    onClick={batchManagement.openCreateBatchModal}
                    className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    Add Academic Year
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {batchManagement.batches.map((batch) => (
                  <div
                    key={batch.id}
                    onClick={() => batchManagement.openBatchOverview(batch)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        batchManagement.openBatchOverview(batch);
                      }
                    }}
                    className={`cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-800 ${
                      batch.is_current
                        ? "border-indigo-300 ring-2 ring-indigo-100 dark:border-indigo-500/50 dark:ring-indigo-500/20"
                        : "border-gray-100 dark:border-slate-700"
                    }`}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                              batch.is_current
                                ? "bg-indigo-600 text-white"
                                : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"
                            }`}
                          >
                            <i className="bi bi-layers text-lg" />
                          </span>

                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">
                              {batch.batch_name}
                            </p>

                            <span
                              className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                batch.academic_status === "Current"
                                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                                  : batch.academic_status === "Upcoming"
                                  ? "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300"
                                  : batch.academic_status === "Completed"
                                  ? "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                              }`}
                            >
                              {batch.academic_status === "Current" && (
                                <i className="bi bi-star-fill" />
                              )}
                              {batch.academic_status}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                        <div className="rounded-xl bg-gray-50 p-3 dark:bg-slate-900/50">
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {batch.class_count || 0}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Classes
                          </p>
                        </div>

                        <div className="rounded-xl bg-gray-50 p-3 dark:bg-slate-900/50">
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {batch.student_count || 0}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Students
                          </p>
                        </div>
                      </div>

                      {(batch.start_date || batch.end_date) && (
                        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                          <i className="bi bi-calendar3 mr-1.5" />
                          {batch.start_date || "?"} → {batch.end_date || "?"}
                        </p>
                      )}
                    </div>

                    <div
                      onClick={(event) => event.stopPropagation()}
                      className="flex flex-wrap items-center gap-2 border-t border-gray-100 bg-gray-50/60 px-5 py-3 dark:border-slate-700 dark:bg-slate-900/40"
                    >
                      <button
                        type="button"
                        onClick={() => batchManagement.openBatchOverview(batch)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
                      >
                        <i className="bi bi-eye" />
                        View
                      </button>

                      {canWriteAcademic && !batch.is_current && (
                        <button
                          type="button"
                          onClick={() => batchManagement.setCurrentBatch(batch)}
                          disabled={
                            batchManagement.settingCurrentId === batch.id
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-500/30 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                        >
                          {batchManagement.settingCurrentId === batch.id ? (
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
                          ) : (
                            <i className="bi bi-star" />
                          )}
                          Set Current
                        </button>
                      )}

                      {canWriteAcademic && (
                        <button
                          type="button"
                          onClick={() => batchManagement.openRolloverModal(batch)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
                        >
                          <i className="bi bi-copy" />
                          Copy Classes
                        </button>
                      )}

                      {canWriteAcademic && (
                        <div className="ml-auto flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              batchManagement.openEditBatchModal(batch)
                            }
                            title="Edit academic year"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-100 text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                          >
                            <i className="bi bi-pencil-square" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              batchManagement.requestDeleteBatch(batch)
                            }
                            title="Delete academic year"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 text-red-600 transition hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10"
                          >
                            <i className="bi bi-trash3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ============ ADD/EDIT MODAL ============ */}
            {batchManagement.batchModalOpen && (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    batchManagement.closeBatchModal();
                  }
                }}
              >
                <form
                  onSubmit={batchManagement.saveBatch}
                  className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      {batchManagement.batchForm.id
                        ? "Update Academic Year"
                        : "Add New Academic Year"}
                    </h2>

                    <button
                      type="button"
                      onClick={batchManagement.closeBatchModal}
                      disabled={batchManagement.batchSaving}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>

                  <div className="space-y-4 px-6 py-5">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Academic Year Name{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <input
                        type="text"
                        value={batchManagement.batchForm.batch_name}
                        onChange={(event) =>
                          batchManagement.updateBatchForm(
                            "batch_name",
                            event.target.value,
                          )
                        }
                        maxLength={20}
                        autoFocus
                        placeholder="Example: 2026-27"
                        className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition dark:bg-slate-900 dark:text-white ${
                          batchManagement.batchErrors.batch_name
                            ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                            : "border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600"
                        }`}
                      />

                      {batchManagement.batchErrors.batch_name && (
                        <p className="mt-1 text-xs text-red-500">
                          {batchManagement.batchErrors.batch_name}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Start Date
                        </label>

                        <input
                          type="date"
                          value={batchManagement.batchForm.start_date}
                          onChange={(event) =>
                            batchManagement.updateBatchForm(
                              "start_date",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                          End Date
                        </label>

                        <input
                          type="date"
                          value={batchManagement.batchForm.end_date}
                          onChange={(event) =>
                            batchManagement.updateBatchForm(
                              "end_date",
                              event.target.value,
                            )
                          }
                          className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition dark:bg-slate-900 dark:text-white ${
                            batchManagement.batchErrors.end_date
                              ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                              : "border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600"
                          }`}
                        />

                        {batchManagement.batchErrors.end_date && (
                          <p className="mt-1 text-xs text-red-500">
                            {batchManagement.batchErrors.end_date}
                          </p>
                        )}
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3 dark:border-slate-600">
                      <input
                        type="checkbox"
                        checked={batchManagement.batchForm.is_current}
                        onChange={(event) =>
                          batchManagement.updateBatchForm(
                            "is_current",
                            event.target.checked,
                          )
                        }
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />

                      <span className="text-sm text-gray-700 dark:text-gray-200">
                        <span className="font-semibold">
                          Make this the current academic year
                        </span>
                        <br />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Any other year marked current will be unmarked
                          automatically.
                        </span>
                      </span>
                    </label>
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/50 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={batchManagement.closeBatchModal}
                      disabled={batchManagement.batchSaving}
                      className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-white disabled:opacity-60 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={batchManagement.batchSaving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {batchManagement.batchSaving ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Saving...
                        </>
                      ) : batchManagement.batchForm.id ? (
                        "Update Academic Year"
                      ) : (
                        "Create Academic Year"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ============ DELETE MODAL ============ */}
            {batchManagement.batchDeleteModal.open && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
                    <i className="bi bi-trash3 text-2xl" />
                  </span>

                  <div className="mt-4 text-center">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Delete Academic Year?
                    </h2>

                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      You are deleting{" "}
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {batchManagement.batchDeleteModal.batch?.batch_name}
                      </span>
                      .
                    </p>

                    {batchManagement.batchDeleteError && (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-left text-xs text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                        <div className="flex gap-2">
                          <i className="bi bi-exclamation-triangle-fill mt-0.5" />
                          <p>{batchManagement.batchDeleteError}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                    <button
                      type="button"
                      onClick={batchManagement.closeDeleteBatchModal}
                      disabled={batchManagement.batchDeleting}
                      className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={batchManagement.deleteBatch}
                      disabled={batchManagement.batchDeleting}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {batchManagement.batchDeleting ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-trash3" />
                          Delete Academic Year
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ============ OVERVIEW (VIEW OLD BATCH DATA) MODAL ============ */}
            {batchManagement.overviewModal.open && (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    batchManagement.closeBatchOverview();
                  }
                }}
              >
                <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-800">
                  <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5 dark:border-slate-700 dark:bg-slate-800">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        {batchManagement.overviewModal.batch?.batch_name}
                      </h2>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Grade-by-grade breakdown for this academic year
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={batchManagement.closeBatchOverview}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>

                  <div className="px-6 py-5">
                    {batchManagement.overviewLoading ? (
                      <div className="flex flex-col items-center gap-3 py-16 text-gray-500">
                        <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                        Loading academic year data...
                      </div>
                    ) : batchManagement.overviewError ? (
                      <div className="flex flex-col items-center gap-2 py-16 text-center">
                        <i className="bi bi-exclamation-triangle text-2xl text-red-500" />
                        <p className="text-sm text-red-600">
                          {batchManagement.overviewError}
                        </p>
                      </div>
                    ) : batchManagement.overviewData ? (
                      <>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="rounded-xl bg-indigo-50 p-3 text-center dark:bg-indigo-500/10">
                            <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
                              {
                                batchManagement.overviewData.summary
                                  .total_classes
                              }
                            </p>
                            <p className="text-[11px] text-indigo-600 dark:text-indigo-400">
                              Classes
                            </p>
                          </div>

                          <div className="rounded-xl bg-emerald-50 p-3 text-center dark:bg-emerald-500/10">
                            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                              {
                                batchManagement.overviewData.summary
                                  .total_students
                              }
                            </p>
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                              Students
                            </p>
                          </div>

                          <div className="rounded-xl bg-sky-50 p-3 text-center dark:bg-sky-500/10">
                            <p className="text-xl font-bold text-sky-700 dark:text-sky-300">
                              {
                                batchManagement.overviewData.summary
                                  .average_class_size
                              }
                            </p>
                            <p className="text-[11px] text-sky-600 dark:text-sky-400">
                              Avg / Class
                            </p>
                          </div>
                        </div>

                        {batchManagement.overviewData.classes.length === 0 ? (
                          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                            No classes were set up for this academic year.
                          </p>
                        ) : (
                          <div className="mt-5 overflow-x-auto overflow-hidden rounded-xl border border-gray-100 dark:border-slate-700">
                            <table className="min-w-full text-left text-sm">
                              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900/70 dark:text-gray-400">
                                <tr>
                                  <th className="px-4 py-2.5">Class</th>
                                  <th className="px-4 py-2.5 text-right">
                                    Students
                                  </th>
                                </tr>
                              </thead>

                              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {batchManagement.overviewData.classes.map(
                                  (cls) => (
                                    <tr key={cls.id}>
                                      <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200">
                                        {cls.division_name}{" "}
                                        {cls.section_name}
                                      </td>
                                      <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">
                                        {cls.student_count}
                                      </td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {/* ============ ROLLOVER (COPY CLASSES) MODAL ============ */}
            {batchManagement.rolloverModal.open && (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    batchManagement.closeRolloverModal();
                  }
                }}
              >
                <form
                  onSubmit={batchManagement.submitRollover}
                  className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-700">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        Copy Classes
                      </h2>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Reuse{" "}
                        <span className="font-semibold">
                          {batchManagement.rolloverModal.batch?.batch_name}
                        </span>
                        &apos;s grade &amp; section setup in another year.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={batchManagement.closeRolloverModal}
                      disabled={batchManagement.rolloverSaving}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>

                  <div className="space-y-4 px-6 py-5">
                    {batchManagement.rolloverResult ? (
                      <div className="flex flex-col items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
                        <i className="bi bi-check-circle text-2xl text-emerald-600 dark:text-emerald-300" />
                        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                          {batchManagement.rolloverResult.message}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Copy into{" "}
                            <span className="text-red-500">*</span>
                          </label>

                          <select
                            value={batchManagement.rolloverTargetId}
                            onChange={(event) =>
                              batchManagement.setRolloverTargetId(
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                          >
                            <option value="">Select target academic year</option>
                            {batchManagement.batches
                              .filter(
                                (b) =>
                                  b.id !==
                                  batchManagement.rolloverModal.batch?.id,
                              )
                              .map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.batch_name}
                                </option>
                              ))}
                          </select>
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Only the grade + section combinations are copied
                          - no students are moved, and classes that
                          already exist in the target year are skipped
                          automatically.
                        </p>

                        {batchManagement.rolloverError && (
                          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                            {batchManagement.rolloverError}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/50 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={batchManagement.closeRolloverModal}
                      disabled={batchManagement.rolloverSaving}
                      className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-white disabled:opacity-60 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                    >
                      {batchManagement.rolloverResult ? "Close" : "Cancel"}
                    </button>

                    {!batchManagement.rolloverResult && (
                      <button
                        type="submit"
                        disabled={batchManagement.rolloverSaving}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {batchManagement.rolloverSaving ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Copying...
                          </>
                        ) : (
                          "Copy Classes"
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </section>
        )}

        {/* ================= SUBJECTS ================= */}
        {activeSection === "subjects" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Subjects
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    The subjects taught across your school - Math, Science,
                    English and so on.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => subjectManagement.loadSubjects()}
                    disabled={subjectManagement.subjectsLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i
                      className={`bi bi-arrow-clockwise ${
                        subjectManagement.subjectsLoading
                          ? "animate-spin"
                          : ""
                      }`}
                    />
                    Refresh
                  </button>

                  {canWriteAcademic && (
                    <button
                      type="button"
                      onClick={() => subjectManagement.openSubjectModal()}
                      className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow transition hover:bg-gray-100"
                    >
                      <i className="bi bi-plus-lg" />
                      Add Subject
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* PLAIN-LANGUAGE EXPLAINER */}
            <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10 sm:p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                <i className="bi bi-info-circle text-lg" />
              </span>

              <p className="text-sm text-indigo-900 dark:text-indigo-200">
                <span className="font-semibold">Core</span> subjects are
                compulsory for every student.{" "}
                <span className="font-semibold">Optional</span> subjects let
                students choose.{" "}
                <span className="font-semibold">Practical</span> subjects
                involve labs or hands-on work. Marking a subject{" "}
                <span className="font-semibold">Inactive</span> hides it
                from new timetables and exams without deleting its history.
              </p>
            </div>

            {/* STATISTICS */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                {
                  label: "Total Subjects",
                  value: subjectManagement.subjectStats.total,
                  icon: "bi-journal-bookmark",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Active Subjects",
                  value: subjectManagement.subjectStats.active,
                  icon: "bi-check-circle",
                  classes:
                    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
                },
                {
                  label: "Inactive Subjects",
                  value: subjectManagement.subjectStats.inactive,
                  icon: "bi-pause-circle",
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="relative md:col-span-2">
                  <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />

                  <input
                    type="search"
                    value={subjectManagement.subjectSearch}
                    onChange={(event) =>
                      subjectManagement.setSubjectSearch(event.target.value)
                    }
                    placeholder="Search by subject name or code..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={subjectManagement.subjectTypeFilter}
                  onChange={(event) =>
                    subjectManagement.setSubjectTypeFilter(event.target.value)
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="all">All Types</option>
                  {subjectManagement.subjectTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <select
                  value={subjectManagement.subjectStatusFilter}
                  onChange={(event) =>
                    subjectManagement.setSubjectStatusFilter(
                      event.target.value,
                    )
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {(subjectManagement.subjectSearch ||
                subjectManagement.subjectTypeFilter !== "all" ||
                subjectManagement.subjectStatusFilter !== "all") && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={subjectManagement.resetSubjectFilters}
                    className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
                  >
                    Reset filters
                  </button>
                </div>
              )}
            </div>

            {/* SUBJECTS TABLE */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Subject List
                </h2>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {subjectManagement.subjects.length} subject(s) found
                </p>
              </div>

              <div className="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900/70 dark:text-gray-400">
                    <tr>
                      <th className="px-5 py-3">Subject</th>
                      <th className="px-5 py-3">Code</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {subjectManagement.subjectsLoading ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-500">
                            <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                            Loading subjects...
                          </div>
                        </td>
                      </tr>
                    ) : subjectManagement.subjects.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-16 text-center">
                          <div className="mx-auto max-w-sm">
                            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                              <i className="bi bi-journal-bookmark text-2xl" />
                            </span>

                            <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                              No subjects found
                            </h3>

                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              Add your first subject or adjust the current
                              filters.
                            </p>

                            {canWriteAcademic && (
                              <button
                                type="button"
                                onClick={() =>
                                  subjectManagement.openSubjectModal()
                                }
                                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                              >
                                Add Subject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      subjectManagement.subjects.map((subject) => (
                        <tr
                          key={subject.id}
                          className="transition hover:bg-gray-50/80 dark:hover:bg-slate-700/40"
                        >
                          <td className="min-w-[160px] px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                                <i className="bi bi-journal-bookmark" />
                              </span>

                              <p className="font-semibold text-gray-900 dark:text-white">
                                {subject.subject_name}
                              </p>
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                              {subject.subject_code}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-gray-600 dark:text-gray-300">
                            {subject.subject_type || "Core"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                subject.status === "Inactive"
                                  ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                              }`}
                            >
                              <i
                                className={`bi ${
                                  subject.status === "Inactive"
                                    ? "bi-pause-circle"
                                    : "bi-check-circle"
                                }`}
                              />
                              {subject.status || "Active"}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right">
                            {canWriteAcademic ? (
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    subjectManagement.openSubjectModal(
                                      subject,
                                    )
                                  }
                                  title="Edit subject"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-100 text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                                >
                                  <i className="bi bi-pencil-square" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    subjectManagement.deleteSubject(
                                      subject.id,
                                    )
                                  }
                                  disabled={subjectManagement.subjectDeleting}
                                  title="Delete subject"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10"
                                >
                                  <i className="bi bi-trash3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">
                                View only
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ============ SUBJECT MODAL ============ */}
            {subjectManagement.isSubjectModalOpen && (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    subjectManagement.closeSubjectModal();
                  }
                }}
              >
                <form
                  onSubmit={subjectManagement.saveSubject}
                  className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      {subjectManagement.subjectForm.id
                        ? "Update Subject"
                        : "Add New Subject"}
                    </h2>

                    <button
                      type="button"
                      onClick={subjectManagement.closeSubjectModal}
                      disabled={subjectManagement.subjectSaving}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Subject Name <span className="text-red-500">*</span>
                      </label>

                      <input
                        name="subject_name"
                        type="text"
                        value={subjectManagement.subjectForm.subject_name}
                        onChange={subjectManagement.handleSubjectChange}
                        required
                        autoFocus
                        placeholder="Example: Mathematics"
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Subject Code <span className="text-red-500">*</span>
                      </label>

                      <input
                        name="subject_code"
                        type="text"
                        value={subjectManagement.subjectForm.subject_code}
                        onChange={subjectManagement.handleSubjectChange}
                        required
                        placeholder="Example: MATH101"
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm uppercase outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Subject Type
                      </label>

                      <select
                        name="subject_type"
                        value={subjectManagement.subjectForm.subject_type}
                        onChange={subjectManagement.handleSubjectChange}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="Core">Core</option>
                        <option value="Optional">Optional</option>
                        <option value="Practical">Practical</option>
                      </select>

                      <p className="mt-1 text-xs text-gray-400">
                        Core = compulsory for all students.
                      </p>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Status
                      </label>

                      <select
                        name="status"
                        value={subjectManagement.subjectForm.status}
                        onChange={subjectManagement.handleSubjectChange}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>

                      <p className="mt-1 text-xs text-gray-400">
                        Inactive subjects are hidden from new timetables.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/50 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={subjectManagement.closeSubjectModal}
                      disabled={subjectManagement.subjectSaving}
                      className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-white disabled:opacity-60 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={subjectManagement.subjectSaving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {subjectManagement.subjectSaving ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Saving...
                        </>
                      ) : subjectManagement.subjectForm.id ? (
                        "Update Subject"
                      ) : (
                        "Create Subject"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>
        )}

        {/* ================= DIVISIONS & SECTIONS ================= */}
        {activeSection === "divisions-sections" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Grades & Sections
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Set up the building blocks you&apos;ll use to create
                    classes.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      divisionsSections.loadDivisions();
                      divisionsSections.loadSections();
                    }}
                    disabled={
                      divisionsSections.divisionLoading ||
                      divisionsSections.sectionLoading
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i
                      className={`bi bi-arrow-clockwise ${
                        divisionsSections.divisionLoading ||
                        divisionsSections.sectionLoading
                          ? "animate-spin"
                          : ""
                      }`}
                    />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* PLAIN-LANGUAGE EXPLAINER */}
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/5 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                  <i className="bi bi-lightbulb" />
                </span>

                <div className="text-sm text-indigo-900 dark:text-indigo-200">
                  <p className="font-semibold">How this works</p>
                  <p className="mt-1 leading-relaxed text-indigo-800/90 dark:text-indigo-200/80">
                    <span className="font-semibold">Grades</span> are your
                    year levels, like{" "}
                    <span className="italic">Class 1, Class 2, Nursery</span>.{" "}
                    <span className="font-semibold">Sections</span> split a
                    grade into smaller groups, like{" "}
                    <span className="italic">A, B, C</span>. Once you have
                    both set up, head to{" "}
                    <span className="font-semibold">Classes</span> to combine
                    a grade and section into an actual class, like{" "}
                    <span className="italic">Class 10 - A</span>.
                  </p>
                </div>
              </div>
            </div>

            {/* STATISTICS */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Total Grades",
                  value: divisionsSections.divisionStats.total,
                  icon: "bi-diagram-3",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Grades In Use",
                  value: divisionsSections.divisionStats.in_use,
                  icon: "bi-check-circle",
                  classes:
                    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
                },
                {
                  label: "Total Sections",
                  value: divisionsSections.sectionStats.total,
                  icon: "bi-grid-3x3-gap",
                  classes:
                    "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
                },
                {
                  label: "Sections In Use",
                  value: divisionsSections.sectionStats.in_use,
                  icon: "bi-check-circle",
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

            {/* TWO PANEL LAYOUT */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {/* ============ DIVISIONS PANEL ============ */}
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex flex-col justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-slate-700 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">
                      Grades
                    </h2>

                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {divisionsSections.divisions.length} grade(s) found
                    </p>
                  </div>

                  {canWriteAcademic && (
                    <button
                      type="button"
                      onClick={divisionsSections.openCreateDivisionModal}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-indigo-700"
                    >
                      <i className="bi bi-plus-lg" />
                      Add Grade
                    </button>
                  )}
                </div>

                <div className="border-b border-gray-100 px-5 py-3 dark:border-slate-700">
                  <div className="relative">
                    <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />

                    <input
                      type="search"
                      value={divisionsSections.divisionSearch}
                      onChange={(event) => {
                        divisionsSections.setDivisionSearch(
                          event.target.value,
                        );
                        divisionsSections.loadDivisions(event.target.value);
                      }}
                      placeholder="Search grades..."
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900/70 dark:text-gray-400">
                      <tr>
                        <th className="px-5 py-3">Grade</th>
                        <th className="px-5 py-3">Classes</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {divisionsSections.divisionLoading ? (
                        <tr>
                          <td colSpan={3} className="px-5 py-14 text-center">
                            <div className="flex flex-col items-center gap-3 text-gray-500">
                              <span className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                              Loading grades...
                            </div>
                          </td>
                        </tr>
                      ) : divisionsSections.divisions.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-5 py-14 text-center">
                            <div className="mx-auto max-w-sm">
                              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                                <i className="bi bi-diagram-3 text-xl" />
                              </span>

                              <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">
                                No grades yet
                              </h3>

                              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Add your first grade, like{" "}
                                <span className="italic">Class 1</span>, to
                                get started.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        divisionsSections.divisions.map((division) => (
                          <tr
                            key={division.id}
                            className="transition hover:bg-gray-50/80 dark:hover:bg-slate-700/40"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                                  <i className="bi bi-diagram-3" />
                                </span>

                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {division.division_name}
                                </p>
                              </div>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                                <i className="bi bi-collection" />
                                {division.class_count || 0}
                              </span>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-right">
                              {canWriteAcademic ? (
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      divisionsSections.openEditDivisionModal(
                                        division,
                                      )
                                    }
                                    title="Edit division"
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-100 text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                                  >
                                    <i className="bi bi-pencil-square" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      divisionsSections.requestDeleteDivision(
                                        division,
                                      )
                                    }
                                    title="Delete division"
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-600 transition hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10"
                                  >
                                    <i className="bi bi-trash3" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  View only
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ============ SECTIONS PANEL ============ */}
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex flex-col justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-slate-700 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">
                      Sections
                    </h2>

                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {divisionsSections.sections.length} section(s) found
                    </p>
                  </div>

                  {canWriteAcademic && (
                    <button
                      type="button"
                      onClick={divisionsSections.openCreateSectionModal}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-indigo-700"
                    >
                      <i className="bi bi-plus-lg" />
                      Add Section
                    </button>
                  )}
                </div>

                <div className="border-b border-gray-100 px-5 py-3 dark:border-slate-700">
                  <div className="relative">
                    <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />

                    <input
                      type="search"
                      value={divisionsSections.sectionSearch}
                      onChange={(event) => {
                        divisionsSections.setSectionSearch(
                          event.target.value,
                        );
                        divisionsSections.loadSections(event.target.value);
                      }}
                      placeholder="Search sections..."
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900/70 dark:text-gray-400">
                      <tr>
                        <th className="px-5 py-3">Section</th>
                        <th className="px-5 py-3">Classes</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {divisionsSections.sectionLoading ? (
                        <tr>
                          <td colSpan={3} className="px-5 py-14 text-center">
                            <div className="flex flex-col items-center gap-3 text-gray-500">
                              <span className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                              Loading sections...
                            </div>
                          </td>
                        </tr>
                      ) : divisionsSections.sections.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-5 py-14 text-center">
                            <div className="mx-auto max-w-sm">
                              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
                                <i className="bi bi-grid-3x3-gap text-xl" />
                              </span>

                              <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">
                                No sections found
                              </h3>

                              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Add your first section to get started.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        divisionsSections.sections.map((section) => (
                          <tr
                            key={section.id}
                            className="transition hover:bg-gray-50/80 dark:hover:bg-slate-700/40"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
                                  <i className="bi bi-grid-3x3-gap" />
                                </span>

                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {section.section_name}
                                </p>
                              </div>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                                <i className="bi bi-collection" />
                                {section.class_count || 0}
                              </span>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-right">
                              {canWriteAcademic ? (
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      divisionsSections.openEditSectionModal(
                                        section,
                                      )
                                    }
                                    title="Edit section"
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-100 text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                                  >
                                    <i className="bi bi-pencil-square" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      divisionsSections.requestDeleteSection(
                                        section,
                                      )
                                    }
                                    title="Delete section"
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-600 transition hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10"
                                  >
                                    <i className="bi bi-trash3" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  View only
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ============ DIVISION MODAL ============ */}
            {divisionsSections.divisionModalOpen && (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    divisionsSections.closeDivisionModal();
                  }
                }}
              >
                <form
                  onSubmit={divisionsSections.saveDivision}
                  className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      {divisionsSections.divisionForm.id
                        ? "Update Grade"
                        : "Add New Grade"}
                    </h2>

                    <button
                      type="button"
                      onClick={divisionsSections.closeDivisionModal}
                      disabled={divisionsSections.divisionSaving}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>

                  <div className="space-y-4 px-6 py-5">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Grade Name <span className="text-red-500">*</span>
                      </label>

                      <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                        A year level students belong to, e.g.{" "}
                        <span className="italic">Class 1</span>,{" "}
                        <span className="italic">Nursery</span>.
                      </p>

                      <input
                        type="text"
                        value={divisionsSections.divisionForm.division_name}
                        onChange={(event) =>
                          divisionsSections.updateDivisionForm(
                            "division_name",
                            event.target.value,
                          )
                        }
                        maxLength={20}
                        autoFocus
                        placeholder="Example: Class 10"
                        className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition dark:bg-slate-900 dark:text-white ${
                          divisionsSections.divisionErrors.division_name
                            ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                            : "border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600"
                        }`}
                      />

                      {divisionsSections.divisionErrors.division_name && (
                        <p className="mt-1 text-xs text-red-500">
                          {divisionsSections.divisionErrors.division_name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/50 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={divisionsSections.closeDivisionModal}
                      disabled={divisionsSections.divisionSaving}
                      className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-white disabled:opacity-60 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={divisionsSections.divisionSaving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {divisionsSections.divisionSaving ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Saving...
                        </>
                      ) : divisionsSections.divisionForm.id ? (
                        "Update Grade"
                      ) : (
                        "Create Grade"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ============ SECTION MODAL ============ */}
            {divisionsSections.sectionModalOpen && (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    divisionsSections.closeSectionModal();
                  }
                }}
              >
                <form
                  onSubmit={divisionsSections.saveSection}
                  className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      {divisionsSections.sectionForm.id
                        ? "Update Section"
                        : "Add New Section"}
                    </h2>

                    <button
                      type="button"
                      onClick={divisionsSections.closeSectionModal}
                      disabled={divisionsSections.sectionSaving}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>

                  <div className="space-y-4 px-6 py-5">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Section Name <span className="text-red-500">*</span>
                      </label>

                      <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                        A smaller group within a grade, e.g.{" "}
                        <span className="italic">A</span>,{" "}
                        <span className="italic">B</span>,{" "}
                        <span className="italic">C</span>.
                      </p>

                      <input
                        type="text"
                        value={divisionsSections.sectionForm.section_name}
                        onChange={(event) =>
                          divisionsSections.updateSectionForm(
                            "section_name",
                            event.target.value,
                          )
                        }
                        maxLength={10}
                        autoFocus
                        placeholder="Example: A"
                        className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition dark:bg-slate-900 dark:text-white ${
                          divisionsSections.sectionErrors.section_name
                            ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                            : "border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600"
                        }`}
                      />

                      {divisionsSections.sectionErrors.section_name && (
                        <p className="mt-1 text-xs text-red-500">
                          {divisionsSections.sectionErrors.section_name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/50 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={divisionsSections.closeSectionModal}
                      disabled={divisionsSections.sectionSaving}
                      className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-white disabled:opacity-60 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={divisionsSections.sectionSaving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {divisionsSections.sectionSaving ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Saving...
                        </>
                      ) : divisionsSections.sectionForm.id ? (
                        "Update Section"
                      ) : (
                        "Create Section"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ============ DIVISION DELETE MODAL ============ */}
            {divisionsSections.divisionDeleteModal.open && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
                    <i className="bi bi-trash3 text-2xl" />
                  </span>

                  <div className="mt-4 text-center">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Delete Grade?
                    </h2>

                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      You are deleting{" "}
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {
                          divisionsSections.divisionDeleteModal.division
                            ?.division_name
                        }
                      </span>
                      .
                    </p>

                    {divisionsSections.divisionDeleteError && (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-left text-xs text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                        <div className="flex gap-2">
                          <i className="bi bi-exclamation-triangle-fill mt-0.5" />
                          <p>{divisionsSections.divisionDeleteError}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                    <button
                      type="button"
                      onClick={divisionsSections.closeDeleteDivisionModal}
                      disabled={divisionsSections.divisionDeleting}
                      className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={divisionsSections.deleteDivision}
                      disabled={divisionsSections.divisionDeleting}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {divisionsSections.divisionDeleting ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-trash3" />
                          Delete Grade
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ============ SECTION DELETE MODAL ============ */}
            {divisionsSections.sectionDeleteModal.open && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
                    <i className="bi bi-trash3 text-2xl" />
                  </span>

                  <div className="mt-4 text-center">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Delete Section?
                    </h2>

                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      You are deleting{" "}
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {
                          divisionsSections.sectionDeleteModal.section
                            ?.section_name
                        }
                      </span>
                      .
                    </p>

                    {divisionsSections.sectionDeleteError && (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-left text-xs text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                        <div className="flex gap-2">
                          <i className="bi bi-exclamation-triangle-fill mt-0.5" />
                          <p>{divisionsSections.sectionDeleteError}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                    <button
                      type="button"
                      onClick={divisionsSections.closeDeleteSectionModal}
                      disabled={divisionsSections.sectionDeleting}
                      className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={divisionsSections.deleteSection}
                      disabled={divisionsSections.sectionDeleting}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {divisionsSections.sectionDeleting ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-trash3" />
                          Delete Section
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================= CLASSES ================= */}
        {activeSection === "classes" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Classes
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Combine a Grade, Section and Academic Year into a
                    class.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => academicClasses.loadClasses()}
                    disabled={academicClasses.classLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i
                      className={`bi bi-arrow-clockwise ${
                        academicClasses.classLoading ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </button>

                  {canWriteAcademic && (
                    <button
                      type="button"
                      onClick={academicClasses.openCreateClassModal}
                      className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow transition hover:bg-gray-100"
                    >
                      <i className="bi bi-plus-lg" />
                      Add Class
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* PLAIN-LANGUAGE EXPLAINER */}
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/5 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                  <i className="bi bi-lightbulb" />
                </span>

                <div className="text-sm text-indigo-900 dark:text-indigo-200">
                  <p className="font-semibold">How this works</p>
                  <p className="mt-1 leading-relaxed text-indigo-800/90 dark:text-indigo-200/80">
                    A class is simply a{" "}
                    <span className="font-semibold">Grade</span> +{" "}
                    <span className="font-semibold">Section</span> for a
                    specific <span className="font-semibold">
                      Academic Year
                    </span>{" "}
                    - like{" "}
                    <span className="italic">
                      Class 10 - A (2025-26)
                    </span>
                    . No grades or sections yet? Set them up on the{" "}
                    <span className="font-semibold">
                      Grades &amp; Sections
                    </span>{" "}
                    page first.
                  </p>
                </div>
              </div>
            </div>

            {/* STATISTICS */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[
                {
                  label: "Total Classes",
                  value: academicClasses.classStats.total,
                  icon: "bi-collection",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Students Assigned",
                  value: academicClasses.classStats.total_students_assigned,
                  icon: "bi-mortarboard",
                  classes:
                    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
                },
                {
                  label: "Academic Years Available",
                  value: academicClasses.options.batches.length,
                  icon: "bi-calendar-range",
                  classes:
                    "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="relative">
                  <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />

                  <input
                    type="search"
                    value={academicClasses.classSearch}
                    onChange={(event) => {
                      academicClasses.setClassSearch(event.target.value);
                      academicClasses.loadClasses(event.target.value);
                    }}
                    placeholder="Search class name..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={academicClasses.batchFilter}
                  onChange={(event) => {
                    academicClasses.setBatchFilter(event.target.value);
                    academicClasses.loadClasses(
                      academicClasses.classSearch,
                      event.target.value,
                    );
                  }}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All Academic Years</option>
                  {academicClasses.options.batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batch_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* CLASSES TABLE */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Class Directory
                </h2>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {academicClasses.classes.length} class(es) found
                </p>
              </div>

              <div className="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900/70 dark:text-gray-400">
                    <tr>
                      <th className="px-5 py-3">Class</th>
                      <th className="px-5 py-3">Academic Year</th>
                      <th className="px-5 py-3">Grade</th>
                      <th className="px-5 py-3">Section</th>
                      <th className="px-5 py-3">Students</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {academicClasses.classLoading ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-500">
                            <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                            Loading classes...
                          </div>
                        </td>
                      </tr>
                    ) : academicClasses.classes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-16 text-center">
                          <div className="mx-auto max-w-sm">
                            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                              <i className="bi bi-collection text-2xl" />
                            </span>

                            <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                              No classes found
                            </h3>

                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              Add your first class, or adjust the filters
                              above. You&apos;ll need at least one Grade,
                              Section and Academic Year first.
                            </p>

                            {canWriteAcademic && (
                              <button
                                type="button"
                                onClick={academicClasses.openCreateClassModal}
                                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                              >
                                Add Class
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      academicClasses.classes.map((academicClass) => (
                        <tr
                          key={academicClass.id}
                          className="transition hover:bg-gray-50/80 dark:hover:bg-slate-700/40"
                        >
                          <td className="min-w-[180px] px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                                <i className="bi bi-collection" />
                              </span>

                              <p className="font-semibold text-gray-900 dark:text-white">
                                {academicClass.display_name}
                              </p>
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-gray-600 dark:text-gray-300">
                            {academicClass.batch_name || "—"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-gray-600 dark:text-gray-300">
                            {academicClass.division_name || "—"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-gray-600 dark:text-gray-300">
                            {academicClass.section_name || "—"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                              <i className="bi bi-mortarboard" />
                              {academicClass.student_count || 0}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right">
                            {canWriteAcademic ? (
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    academicClasses.openEditClassModal(
                                      academicClass,
                                    )
                                  }
                                  title="Edit class"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-100 text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                                >
                                  <i className="bi bi-pencil-square" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    academicClasses.requestDeleteClass(
                                      academicClass,
                                    )
                                  }
                                  title="Delete class"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-600 transition hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10"
                                >
                                  <i className="bi bi-trash3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">
                                View only
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ============ CLASS MODAL ============ */}
            {academicClasses.classModalOpen && (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    academicClasses.closeClassModal();
                  }
                }}
              >
                <form
                  onSubmit={academicClasses.saveClass}
                  className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-700">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        {academicClasses.classForm.id
                          ? "Update Class"
                          : "Add New Class"}
                      </h2>

                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Pick a Grade, Section and Academic Year - together
                        they make one class.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={academicClasses.closeClassModal}
                      disabled={academicClasses.classSaving}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>

                  <div className="space-y-4 px-6 py-5">
                    {academicClasses.classErrors.form && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                        {academicClasses.classErrors.form}
                      </div>
                    )}

                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Academic Year{" "}
                          <span className="text-red-500">*</span>
                        </label>

                        {!academicClasses.newBatchOpen && (
                          <button
                            type="button"
                            onClick={academicClasses.openNewBatchField}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
                          >
                            <i className="bi bi-plus-circle" />
                            Add new
                          </button>
                        )}
                      </div>

                      <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                        Which school year is this class for, e.g.{" "}
                        <span className="italic">2025-26</span>.
                      </p>

                      {academicClasses.newBatchOpen ? (
                        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-500/30 dark:bg-indigo-500/10">
                          <label className="mb-1 block text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                            New Academic Year
                          </label>

                          <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                              type="text"
                              value={academicClasses.newBatchName}
                              onChange={(event) =>
                                academicClasses.setNewBatchName(
                                  event.target.value,
                                )
                              }
                              placeholder="Example: 2025-26"
                              autoFocus
                              maxLength={20}
                              className="flex-1 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-indigo-500/30 dark:bg-slate-900 dark:text-white"
                            />

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={academicClasses.submitNewBatch}
                                disabled={academicClasses.newBatchSaving}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {academicClasses.newBatchSaving ? (
                                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                  <i className="bi bi-check-lg" />
                                )}
                                Save
                              </button>

                              <button
                                type="button"
                                onClick={academicClasses.closeNewBatchField}
                                disabled={academicClasses.newBatchSaving}
                                className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-white disabled:opacity-60 dark:border-indigo-500/30 dark:text-indigo-200"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>

                          {academicClasses.newBatchError && (
                            <p className="mt-1.5 text-xs text-red-600">
                              {academicClasses.newBatchError}
                            </p>
                          )}
                        </div>
                      ) : (
                        <>
                          <select
                            value={academicClasses.classForm.batch_id}
                            onChange={(event) =>
                              academicClasses.updateClassForm(
                                "batch_id",
                                event.target.value,
                              )
                            }
                            className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition dark:bg-slate-900 dark:text-white ${
                              academicClasses.classErrors.batch_id
                                ? "border-red-500"
                                : "border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600"
                            }`}
                          >
                            <option value="">Select academic year</option>
                            {academicClasses.options.batches.map((batch) => (
                              <option key={batch.id} value={batch.id}>
                                {batch.batch_name}
                              </option>
                            ))}
                          </select>

                          {academicClasses.classErrors.batch_id && (
                            <p className="mt-1 text-xs text-red-500">
                              {academicClasses.classErrors.batch_id}
                            </p>
                          )}

                          {academicClasses.options.batches.length === 0 && (
                            <p className="mt-1 text-xs text-amber-600">
                              No academic years yet - click{" "}
                              <span className="font-semibold">
                                Add new
                              </span>{" "}
                              above to create one.
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Grade <span className="text-red-500">*</span>
                        </label>

                        <select
                          value={academicClasses.classForm.division_id}
                          onChange={(event) =>
                            academicClasses.updateClassForm(
                              "division_id",
                              event.target.value,
                            )
                          }
                          className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition dark:bg-slate-900 dark:text-white ${
                            academicClasses.classErrors.division_id
                              ? "border-red-500"
                              : "border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600"
                          }`}
                        >
                          <option value="">Select grade</option>
                          {academicClasses.options.divisions.map(
                            (division) => (
                              <option key={division.id} value={division.id}>
                                {division.division_name}
                              </option>
                            ),
                          )}
                        </select>

                        {academicClasses.classErrors.division_id && (
                          <p className="mt-1 text-xs text-red-500">
                            {academicClasses.classErrors.division_id}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Section <span className="text-red-500">*</span>
                        </label>

                        <select
                          value={academicClasses.classForm.section_id}
                          onChange={(event) =>
                            academicClasses.updateClassForm(
                              "section_id",
                              event.target.value,
                            )
                          }
                          className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition dark:bg-slate-900 dark:text-white ${
                            academicClasses.classErrors.section_id
                              ? "border-red-500"
                              : "border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600"
                          }`}
                        >
                          <option value="">Select section</option>
                          {academicClasses.options.sections.map((section) => (
                            <option key={section.id} value={section.id}>
                              {section.section_name}
                            </option>
                          ))}
                        </select>

                        {academicClasses.classErrors.section_id && (
                          <p className="mt-1 text-xs text-red-500">
                            {academicClasses.classErrors.section_id}
                          </p>
                        )}
                      </div>
                    </div>

                    {(academicClasses.options.divisions.length === 0 ||
                      academicClasses.options.sections.length === 0) && (
                      <p className="text-xs text-amber-600">
                        Add grades and sections first from the{" "}
                        &quot;Grades &amp; Sections&quot; page.
                      </p>
                    )}

                    {/* LIVE PREVIEW - makes the abstract picks feel concrete */}
                    {academicClasses.classForm.division_id &&
                      academicClasses.classForm.section_id &&
                      academicClasses.classForm.batch_id && (
                        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                            <i className="bi bi-check-circle-fill" />
                          </span>

                          <p className="text-sm text-emerald-900 dark:text-emerald-200">
                            This will create:{" "}
                            <span className="font-bold">
                              Class{" "}
                              {
                                academicClasses.options.divisions.find(
                                  (d) =>
                                    String(d.id) ===
                                    String(
                                      academicClasses.classForm.division_id,
                                    ),
                                )?.division_name
                              }{" "}
                              -{" "}
                              {
                                academicClasses.options.sections.find(
                                  (s) =>
                                    String(s.id) ===
                                    String(
                                      academicClasses.classForm.section_id,
                                    ),
                                )?.section_name
                              }{" "}
                              (
                              {
                                academicClasses.options.batches.find(
                                  (b) =>
                                    String(b.id) ===
                                    String(academicClasses.classForm.batch_id),
                                )?.batch_name
                              }
                              )
                            </span>
                          </p>
                        </div>
                      )}
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/50 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={academicClasses.closeClassModal}
                      disabled={academicClasses.classSaving}
                      className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-white disabled:opacity-60 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={academicClasses.classSaving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {academicClasses.classSaving ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Saving...
                        </>
                      ) : academicClasses.classForm.id ? (
                        "Update Class"
                      ) : (
                        "Create Class"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ============ CLASS DELETE MODAL ============ */}
            {academicClasses.classDeleteModal.open && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
                    <i className="bi bi-trash3 text-2xl" />
                  </span>

                  <div className="mt-4 text-center">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Delete Class?
                    </h2>

                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      You are deleting{" "}
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {
                          academicClasses.classDeleteModal.academicClass
                            ?.display_name
                        }
                      </span>
                      .
                    </p>

                    {academicClasses.classDeleteError && (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-left text-xs text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                        <div className="flex gap-2">
                          <i className="bi bi-exclamation-triangle-fill mt-0.5" />
                          <p>{academicClasses.classDeleteError}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                    <button
                      type="button"
                      onClick={academicClasses.closeDeleteClassModal}
                      disabled={academicClasses.classDeleting}
                      className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={academicClasses.deleteClass}
                      disabled={academicClasses.classDeleting}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {academicClasses.classDeleting ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-trash3" />
                          Delete Class
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

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

            {/* ================= ON LEAVE TODAY (leaves cross-reference) ================= */}
            {(onLeaveLoading || onLeaveToday.length > 0) && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10 sm:p-5">
                <div className="flex items-center gap-2">
                  <i className="bi bi-calendar-x text-amber-600 dark:text-amber-300" />
                  <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    On Approved Leave{" "}
                    {selectedDate ? `- ${selectedDate}` : "Today"}
                  </h3>
                  {!onLeaveLoading && (
                    <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/30 dark:text-amber-100">
                      {onLeaveToday.length}
                    </span>
                  )}
                </div>

                {onLeaveLoading ? (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                    Checking leave records...
                  </p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {onLeaveToday.map((person) => (
                      <span
                        key={person.id}
                        title={person.reason || ""}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-amber-800 shadow-sm dark:bg-slate-800 dark:text-amber-200"
                      >
                        <i
                          className={`bi ${
                            person.role === "Teacher"
                              ? "bi-person-badge"
                              : "bi-mortarboard"
                          }`}
                        />
                        {person.name}
                        <span className="text-amber-500 dark:text-amber-400">
                          ({person.leave_type || person.role})
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

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
                    disabled={!selectedClass}
                    title={
                      !selectedClass
                        ? "Select a specific class above first"
                        : "Mark everyone in this class Present"
                    }
                    className="px-4 h-10 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-green-500"
                  >
                    Mark All Present
                  </button>

                  <button
                    onClick={() => markAllAttendance(selectedClass, "Absent")}
                    disabled={!selectedClass}
                    title={
                      !selectedClass
                        ? "Select a specific class above first"
                        : "Mark everyone in this class Absent"
                    }
                    className="px-4 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-red-500"
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


        {/* ===================== PROFILE SECTION START ========================*/}
                {activeSection === "exams" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    Exam Control Center
                  </h2>
                  <p className="text-indigo-100 text-sm mt-1">
                    Schedule exams, track marks entry, verify, and publish
                    results. For marks and report cards, see the Results
                    section.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={refreshExamManagement}
                    className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm transition border border-white/20"
                  >
                    <i className="bi bi-arrow-clockwise me-1.5" />
                    Refresh
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

          </section>
        )}

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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
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


                {activeSection === "results" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    Results
                  </h2>
                  <p className="text-indigo-100 text-sm mt-1">
                    Search, review, and export student marks. Click any row
                    to verify or edit its marks directly.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={refreshExamManagement}
                    className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm transition border border-white/20"
                  >
                    <i className="bi bi-arrow-clockwise me-1.5" />
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={exportExamManagementReportsPDF}
                    className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm transition border border-white/20"
                  >
                    Export Reports (PDF)
                  </button>

                  <button
                    type="button"
                    onClick={exportExamManagementReportCardsPDF}
                    className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm transition border border-white/20"
                  >
                    Export Report Cards (PDF)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const rows = examManagementFilteredResults || [];
                      if (rows.length === 0) {
                        showToast?.("No results to export", "error");
                        return;
                      }

                      const headers = [
                        "Roll",
                        "Student",
                        "Class",
                        "Exam",
                        "Subject",
                        "Total",
                        "Percentage",
                        "Grade",
                        "Status",
                      ];

                      const csvRows = rows.map((row) =>
                        [
                          row.roll_no || "",
                          row.student_name || "",
                          row.class_name || "",
                          row.exam_name || "",
                          row.subject || "",
                          row.total_marks || 0,
                          row.percentage || 0,
                          row.grade || "",
                          row.status || "",
                        ]
                          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
                          .join(","),
                      );

                      const csvContent = [headers.join(","), ...csvRows].join(
                        "\n",
                      );

                      const blob = new Blob([csvContent], {
                        type: "text/csv;charset=utf-8;",
                      });
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `results_${
                        new Date().toISOString().split("T")[0]
                      }.csv`;
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      window.URL.revokeObjectURL(url);

                      showToast?.("Results exported as CSV", "success");
                    }}
                    className="bg-white text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-lg text-sm font-semibold transition shadow-md"
                  >
                    <i className="bi bi-filetype-csv me-1.5" />
                    Export CSV
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

            {/* Summary Stats */}
            {(() => {
              const rows = examManagementFilteredResults || [];
              const total = rows.length;
              const passCount = rows.filter(
                (r) => String(r.status || "").toLowerCase() === "pass",
              ).length;
              const failCount = rows.filter(
                (r) => String(r.status || "").toLowerCase() === "fail",
              ).length;
              const avgPercentage =
                total > 0
                  ? (
                      rows.reduce(
                        (sum, r) => sum + (Number(r.percentage) || 0),
                        0,
                      ) / total
                    ).toFixed(1)
                  : 0;
              const passRate =
                total > 0 ? ((passCount / total) * 100).toFixed(1) : 0;

              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <p className="text-xs font-semibold uppercase text-gray-400">
                      Total Results
                    </p>
                    <p className="mt-2 text-2xl font-bold text-gray-800">
                      {total}
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <p className="text-xs font-semibold uppercase text-gray-400">
                      Average %
                    </p>
                    <p className="mt-2 text-2xl font-bold text-indigo-600">
                      {avgPercentage}%
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <p className="text-xs font-semibold uppercase text-gray-400">
                      Pass Rate
                    </p>
                    <p className="mt-2 text-2xl font-bold text-emerald-600">
                      {passRate}%
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {passCount} passed
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <p className="text-xs font-semibold uppercase text-gray-400">
                      Failing
                    </p>
                    <p className="mt-2 text-2xl font-bold text-red-600">
                      {failCount}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      needs attention
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Result Rows */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50">
                <h3 className="font-bold text-gray-800">Student Result Rows</h3>
                <p className="text-xs text-gray-500">
                  Searchable result data from submitted marks. Click a row to
                  verify or edit.
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
                          onClick={() =>
                            row.exam_id &&
                            openExamManagementDetails({
                              exam_id: row.exam_id,
                              subject_id: row.subject_id,
                            })
                          }
                          className={
                            row.exam_id
                              ? "cursor-pointer hover:bg-indigo-50 transition"
                              : ""
                          }
                          title={
                            row.exam_id
                              ? "Click to view/edit this subject's marks"
                              : ""
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
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                ["A+", "A", "A-"].includes(row.grade)
                                  ? "bg-emerald-100 text-emerald-700"
                                  : ["B+", "B", "B-"].includes(row.grade)
                                  ? "bg-sky-100 text-sky-700"
                                  : ["C+", "C", "C-"].includes(row.grade)
                                  ? "bg-amber-100 text-amber-700"
                                  : row.grade
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {row.grade || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                String(row.status).toLowerCase() === "pass"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : String(row.status).toLowerCase() ===
                                    "fail"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {row.status || "Pending"}
                            </span>
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


        {/* ================= REPORTS & ANALYTICS ================= */}
        {activeSection === "reports" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    Reports &amp; Analytics
                  </h2>
                  <p className="text-indigo-100 text-sm mt-1">
                    A live snapshot of your school&apos;s academic
                    performance, pulled from every section on this
                    dashboard.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    refreshExamManagement?.();
                    refreshAttendance?.();
                    loadTeacherManagementTeachers?.();
                    loadMyClasses?.();
                  }}
                  className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm transition border border-white/20 self-start"
                >
                  <i className="bi bi-arrow-clockwise me-1.5" />
                  Refresh All
                </button>
              </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {[
                {
                  label: "Students",
                  value: academicClasses.classStats.total_students_assigned,
                  icon: "bi-mortarboard",
                  cls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                  onClick: () => setActiveSection("students"),
                },
                {
                  label: "Teachers",
                  value: teacherManagementStats.total,
                  icon: "bi-person-badge",
                  cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
                  onClick: () => setActiveSection("teachers"),
                },
                {
                  label: "Classes",
                  value: academicClasses.classStats.total,
                  icon: "bi-collection",
                  cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
                  onClick: () => setActiveSection("classes"),
                },
                {
                  label: "Subjects",
                  value: subjectManagement.subjectStats.total,
                  icon: "bi-journal-bookmark",
                  cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                  onClick: () => setActiveSection("subjects"),
                },
                {
                  label: "Today's Attendance",
                  value: `${attendanceStats.percentage ?? 0}%`,
                  icon: "bi-calendar-check",
                  cls: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
                  onClick: () => setActiveSection("attendance"),
                },
                {
                  label: "Exam Pass Rate",
                  value: `${examManagementStats.passPercentage || 0}%`,
                  icon: "bi-award",
                  cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
                  onClick: () => setActiveSection("results"),
                },
              ].map((kpi) => (
                <button
                  type="button"
                  key={kpi.label}
                  onClick={kpi.onClick}
                  className="text-left bg-white rounded-2xl border border-gray-200 shadow-sm p-4 transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {kpi.label}
                      </p>
                      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                        {kpi.value ?? 0}
                      </p>
                    </div>
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${kpi.cls}`}
                    >
                      <i className={`bi ${kpi.icon} text-lg`} />
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ATTENDANCE BREAKDOWN */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800 dark:text-white">
                    Today&apos;s Attendance Breakdown
                  </h3>
                  <span className="text-xs text-gray-400">
                    {attendanceStats.total ?? 0} marked
                  </span>
                </div>

                {(() => {
                  const total = attendanceStats.total || 0;
                  const bars = [
                    {
                      label: "Present",
                      value: attendanceStats.present || 0,
                      cls: "bg-emerald-500",
                    },
                    {
                      label: "Absent",
                      value: attendanceStats.absent || 0,
                      cls: "bg-red-500",
                    },
                    {
                      label: "Late",
                      value: attendanceStats.late || 0,
                      cls: "bg-amber-500",
                    },
                  ];

                  if (total === 0) {
                    return (
                      <p className="py-8 text-center text-sm text-gray-400">
                        No attendance marked yet today.
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {bars.map((bar) => {
                        const pct = total > 0 ? Math.round((bar.value / total) * 100) : 0;
                        return (
                          <div key={bar.label}>
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="font-medium text-gray-600 dark:text-gray-300">
                                {bar.label}
                              </span>
                              <span className="text-gray-400">
                                {bar.value} ({pct}%)
                              </span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${bar.cls}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => setActiveSection("attendance")}
                  className="mt-4 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
                >
                  View full attendance →
                </button>
              </div>

              {/* EXAM & RESULTS SUMMARY */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800 dark:text-white">
                    Exams &amp; Results Summary
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Total Exams", examManagementStats.totalExams],
                    ["Classes Covered", examManagementStats.classesCovered],
                    ["Results Published", examManagementStats.resultsPublished],
                    ["Pending Marks", examManagementStats.pendingMarks],
                    ["Average Score", `${examManagementStats.averageScore || 0}%`],
                    ["At Risk Students", examManagementStats.atRiskStudents],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl bg-gray-50 dark:bg-slate-900/50 p-3"
                    >
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                        {value ?? 0}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSection("exams")}
                  className="mt-4 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
                >
                  View full exam control center →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ACADEMIC STRUCTURE */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 dark:border-slate-700 dark:bg-slate-800">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4">
                  Academic Structure
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    {
                      label: "Grades",
                      value: divisionsSections.divisionStats.total,
                      section: "divisions-sections",
                    },
                    {
                      label: "Sections",
                      value: divisionsSections.sectionStats.total,
                      section: "divisions-sections",
                    },
                    {
                      label: "Classes",
                      value: academicClasses.classStats.total,
                      section: "classes",
                    },
                    {
                      label: "Subjects",
                      value: subjectManagement.subjectStats.total,
                      section: "subjects",
                    },
                    {
                      label: "Academic Years",
                      value: batchManagement.batchStats.total,
                      section: "batches",
                    },
                    {
                      label: "Current Year",
                      value: batchManagement.batchStats.current_batch || "—",
                      section: "batches",
                      isText: true,
                    },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.label}
                      onClick={() => setActiveSection(item.section)}
                      className="text-left rounded-xl border border-gray-100 dark:border-slate-700 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10"
                    >
                      <p className="text-xs text-gray-400">{item.label}</p>
                      <p
                        className={`font-bold text-gray-800 dark:text-gray-100 ${
                          item.isText ? "text-sm" : "text-lg"
                        }`}
                      >
                        {item.value}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* TEACHER WORKLOAD */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 dark:border-slate-700 dark:bg-slate-800">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4">
                  Teacher Status
                </h3>

                {(() => {
                  const total = teacherManagementStats.total || 0;
                  const bars = [
                    {
                      label: "Active",
                      value: teacherManagementStats.active || 0,
                      cls: "bg-emerald-500",
                    },
                    {
                      label: "Inactive",
                      value: teacherManagementStats.inactive || 0,
                      cls: "bg-gray-400",
                    },
                    {
                      label: "Suspended",
                      value: teacherManagementStats.suspended || 0,
                      cls: "bg-amber-500",
                    },
                  ];

                  if (total === 0) {
                    return (
                      <p className="py-8 text-center text-sm text-gray-400">
                        No teachers added yet.
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {bars.map((bar) => {
                        const pct = total > 0 ? Math.round((bar.value / total) * 100) : 0;
                        return (
                          <div key={bar.label}>
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="font-medium text-gray-600 dark:text-gray-300">
                                {bar.label}
                              </span>
                              <span className="text-gray-400">
                                {bar.value} ({pct}%)
                              </span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${bar.cls}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => setActiveSection("teachers")}
                  className="mt-4 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
                >
                  View all teachers →
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ================= NOTIFICATIONS ================= */}
        {activeSection === "notifications" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    Notifications
                  </h2>
                  <p className="text-indigo-100 text-sm mt-1">
                    School announcements and alerts, all in one place.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {canWriteAcademic && (
                    <button
                      type="button"
                      onClick={() => setCreateNotifModalOpen(true)}
                      className="bg-white text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-lg text-sm font-semibold transition shadow-md self-start"
                    >
                      <i className="bi bi-plus-lg me-1.5" />
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
                    className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm transition border border-white/20 self-start disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <i className="bi bi-check2-all me-1.5" />
                    Mark All Read
                  </button>
                </div>
              </div>
            </div>

            {/* ============ CREATE NOTIFICATION MODAL ============ */}
            {createNotifModalOpen && (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget && !createNotifSaving) {
                    setCreateNotifModalOpen(false);
                  }
                }}
              >
                <form
                  onSubmit={submitCreateNotification}
                  className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Create Notification
                    </h2>
                    <button
                      type="button"
                      onClick={() => setCreateNotifModalOpen(false)}
                      disabled={createNotifSaving}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>

                  <div className="space-y-4 px-6 py-5">
                    {createNotifError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                        {createNotifError}
                      </div>
                    )}

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={createNotifForm.title}
                        onChange={(event) =>
                          setCreateNotifForm((prev) => ({
                            ...prev,
                            title: event.target.value,
                          }))
                        }
                        autoFocus
                        placeholder="e.g. Parent-Teacher Meeting on Friday"
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Message <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        value={createNotifForm.message}
                        onChange={(event) =>
                          setCreateNotifForm((prev) => ({
                            ...prev,
                            message: event.target.value,
                          }))
                        }
                        placeholder="Details for this notification..."
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Priority
                        </label>
                        <select
                          value={createNotifForm.priority}
                          onChange={(event) =>
                            setCreateNotifForm((prev) => ({
                              ...prev,
                              priority: event.target.value,
                            }))
                          }
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
                          value={createNotifForm.target_role}
                          onChange={(event) =>
                            setCreateNotifForm((prev) => ({
                              ...prev,
                              target_role: event.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        >
                          <option value="all">Everyone</option>
                          <option value="students">Students only</option>
                          <option value="teachers">Teachers only</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/50 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setCreateNotifModalOpen(false)}
                      disabled={createNotifSaving}
                      className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-white disabled:opacity-60 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createNotifSaving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {createNotifSaving ? (
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
                  cls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Unread",
                  value: totalUnread || 0,
                  icon: "bi-envelope-exclamation",
                  cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
                },
                {
                  label: "Announcements",
                  value: (announcements || []).length,
                  icon: "bi-megaphone",
                  cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                },
                {
                  label: "Alerts",
                  value: (notifications || []).length,
                  icon: "bi-exclamation-circle",
                  cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 dark:border-slate-700 dark:bg-slate-800"
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
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.cls}`}
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
                if (notificationFilterTab === "unread" && item.is_read)
                  return false;
                if (
                  notificationFilterTab === "announcements" &&
                  item.source !== "notice"
                )
                  return false;
                if (
                  notificationFilterTab === "alerts" &&
                  item.source !== "leave"
                )
                  return false;

                if (!notificationSearch.trim()) return true;

                const q = notificationSearch.toLowerCase();
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
                        value={notificationSearch}
                        onChange={(event) =>
                          setNotificationSearch(event.target.value)
                        }
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
                          onClick={() => setNotificationFilterTab(tab.key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            notificationFilterTab === tab.key
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
                        {notificationSearch
                          ? "No notifications match your search."
                          : "🎉 You're all caught up"}
                      </p>
                    ) : (
                      filtered.map((item) => (
                        <button
                          type="button"
                          key={`${item.source}-${item.id}-${item.time || item.date}`}
                          onClick={() =>
                            handleNotificationClick &&
                            handleNotificationClick(item)
                          }
                          className={`w-full p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-700/50 ${
                            !item.is_read
                              ? "bg-indigo-50/40 dark:bg-indigo-500/5"
                              : ""
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

                              <p className="mt-1 text-xs text-gray-400">
                                {item.time}
                              </p>
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
