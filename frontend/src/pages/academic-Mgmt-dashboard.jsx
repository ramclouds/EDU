import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { APP_NAME, APP_YEAR } from "../config/appConfig";
import "../css/dashboard.css";
import { useDashboardUI } from "../controllers/useDashboardUI";
import { useAdminDashboard } from "../controllers/adminDashboard";
import { useAdminProfile } from "../controllers/Profiles/useAdminProfile";
import { useDashboardAccess } from "../controllers/Auth/useDashboardAccess";
import { useAcademicPermission } from "../controllers/Academic/useAcademicPermission";
import { useDivisionsSections } from "../controllers/Academic/useDivisionsSections";
import { useAcademicClasses } from "../controllers/Academic/useAcademicClasses";
import { useSubjectManagements } from "../controllers/Subjects/useSubjectManagements";
import { useBatches } from "../controllers/Academic/useBatches";
import { useStudents } from "../controllers/Academic/useStudents";
import { useTeachers } from "../controllers/Academic/useTeachers";

function AdminDashboard() {
  // UI STATE (LOCAL COMPONENT STATE)
  const location = useLocation();

  const [activeSection, setActiveSection] = useState(
    location.state?.activeSection || "dashboard",
  );
  // const [noticeTab, setNoticeTab] = useState("announcements");
  const [search, setSearch] = useState("");

  const { canWriteAcademic, AcademicAccessLevel } = useAcademicPermission();
  const { dashboards: accessibleDashboards } = useDashboardAccess();
  const otherAccessibleDashboards = (accessibleDashboards || []).filter(
    (dashboard) => dashboard.key !== "academic-admin-dashboard",
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

    toast,
  } = useAdminDashboard(activeSection);

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
  const teacherManagement = useTeachers();

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
                  <h2 className="text-xl font-semibold"> Dashboard</h2>

                  <p className="mt-1 text-sm text-blue-100">
                    Today&apos;s classes, timetable, attendance and exam
                    overview
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= STUDENTS ================= */}
        {activeSection === "students" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Students
                  </h2>

                  <p className="text-xs sm:text-sm opacity-90">
                    Every enrolled student and which class they belong to.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => studentManagement.loadStudents()}
                    disabled={studentManagement.studentsLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i
                      className={`bi bi-arrow-clockwise ${
                        studentManagement.studentsLoading ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </button>

                  {canWriteAcademic && (
                    <button
                      type="button"
                      onClick={studentManagement.openEnrollModal}
                      className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow transition hover:bg-gray-100"
                    >
                      <i className="bi bi-person-plus" />
                      Enroll Student
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* STATISTICS */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                {
                  label: "Total Students",
                  value: studentManagement.studentStats.total,
                  icon: "bi-mortarboard",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Active",
                  value: studentManagement.studentStats.active,
                  icon: "bi-check-circle",
                  classes:
                    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
                },
                {
                  label: "Inactive",
                  value: studentManagement.studentStats.inactive,
                  icon: "bi-pause-circle",
                  classes:
                    "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
                },
                {
                  label: "Unassigned",
                  value: studentManagement.studentStats.unassigned,
                  icon: "bi-exclamation-triangle",
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

            {/* FILTERS */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="relative md:col-span-2">
                  <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />

                  <input
                    type="search"
                    value={studentManagement.studentSearch}
                    onChange={(event) => {
                      studentManagement.setStudentSearch(event.target.value);
                      studentManagement.loadStudents({
                        search: event.target.value,
                      });
                    }}
                    placeholder="Search by name, student ID, mobile..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={studentManagement.studentClassFilter}
                  onChange={(event) => {
                    studentManagement.setStudentClassFilter(event.target.value);
                    studentManagement.loadStudents({
                      classId: event.target.value,
                    });
                  }}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All Classes</option>
                  {studentManagement.enrollOptions.academic_classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.display_name}
                    </option>
                  ))}
                </select>

                <select
                  value={studentManagement.studentStatusFilter}
                  onChange={(event) => {
                    studentManagement.setStudentStatusFilter(event.target.value);
                    studentManagement.loadStudents({
                      status: event.target.value,
                    });
                  }}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <label className="mt-3 flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={studentManagement.showUnassignedOnly}
                  onChange={(event) => {
                    studentManagement.setShowUnassignedOnly(
                      event.target.checked,
                    );
                    studentManagement.loadStudents({
                      unassigned: event.target.checked,
                    });
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Show only students without a class
              </label>
            </div>

            {/* ROSTER TABLE */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Student Roster
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {studentManagement.students.length} student(s) found
                </p>
              </div>

              <div className="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900/70 dark:text-gray-400">
                    <tr>
                      <th className="px-5 py-3">Student</th>
                      <th className="px-5 py-3">Class</th>
                      <th className="px-5 py-3">Roll No.</th>
                      <th className="px-5 py-3">Mobile</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {studentManagement.studentsLoading ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-500">
                            <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                            Loading students...
                          </div>
                        </td>
                      </tr>
                    ) : studentManagement.students.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-16 text-center">
                          <div className="mx-auto max-w-sm">
                            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                              <i className="bi bi-mortarboard text-2xl" />
                            </span>

                            <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                              No students found
                            </h3>

                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              Enroll your first student or adjust the
                              current filters.
                            </p>

                            {canWriteAcademic && (
                              <button
                                type="button"
                                onClick={studentManagement.openEnrollModal}
                                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                              >
                                Enroll Student
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      studentManagement.students.map((student) => (
                        <tr
                          key={student.id}
                          className="cursor-pointer transition hover:bg-gray-50/80 dark:hover:bg-slate-700/40"
                          onClick={() =>
                            studentManagement.openStudentDetail(student)
                          }
                        >
                          <td className="min-w-[200px] px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                                <i className="bi bi-person" />
                              </span>

                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {student.first_name} {student.last_name}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {student.student_id}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-gray-600 dark:text-gray-300">
                            {student.division_name ? (
                              <>
                                {student.division_name}{" "}
                                {student.section_name}
                                <span className="ml-1 text-xs text-gray-400">
                                  ({student.batch_name})
                                </span>
                              </>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                                <i className="bi bi-exclamation-triangle" />
                                Unassigned
                              </span>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-gray-600 dark:text-gray-300">
                            {student.roll_number ?? "—"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-gray-600 dark:text-gray-300">
                            {student.mobile || "—"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                student.status === "Active"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                                  : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                              }`}
                            >
                              {student.status || "Active"}
                            </span>
                          </td>

                          <td
                            className="whitespace-nowrap px-5 py-4 text-right"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                studentManagement.openStudentDetail(student)
                              }
                              title="View student"
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-100 text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                            >
                              <i className="bi bi-eye" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

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

                      {/* AUTO PREVIEW */}
                      {studentManagement.enrollForm.academic_class_id && (
                        <div className="grid grid-cols-1 gap-3 rounded-xl bg-gray-50 p-4 dark:bg-slate-900/50 sm:grid-cols-3">
                          <div>
                            <p className="text-xs text-gray-400">
                              Student ID (auto)
                            </p>
                            <p className="font-mono text-sm font-semibold text-gray-800 dark:text-gray-200">
                              {studentManagement.enrollPreviewLoading
                                ? "..."
                                : studentManagement.enrollPreview.student_id}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">
                              User ID (auto)
                            </p>
                            <p className="font-mono text-sm font-semibold text-gray-800 dark:text-gray-200">
                              {studentManagement.enrollPreviewLoading
                                ? "..."
                                : studentManagement.enrollPreview.user_id}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs text-gray-400">
                              Roll Number
                            </label>
                            <input
                              type="number"
                              value={
                                studentManagement.enrollForm.roll_number ||
                                studentManagement.enrollPreview.roll_number ||
                                ""
                              }
                              onChange={(event) =>
                                studentManagement.updateEnrollForm(
                                  "roll_number",
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm font-semibold text-gray-800 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200"
                            />
                          </div>
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

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            {/* ============ VIEW STUDENT DETAIL MODAL ============ */}
            {studentManagement.detailModal.open && (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    studentManagement.closeStudentDetail();
                  }
                }}
              >
                <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-800">
                  <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5 dark:border-slate-700 dark:bg-slate-800">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Student Profile
                    </h2>

                    <button
                      type="button"
                      onClick={studentManagement.closeStudentDetail}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>

                  <div className="px-6 py-5">
                    {studentManagement.detailLoading ? (
                      <div className="flex flex-col items-center gap-3 py-16 text-gray-500">
                        <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                        Loading student...
                      </div>
                    ) : studentManagement.detailError ? (
                      <p className="py-10 text-center text-sm text-red-600">
                        {studentManagement.detailError}
                      </p>
                    ) : studentManagement.detailData ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                            {studentManagement.detailData.first_name?.[0]}
                            {studentManagement.detailData.last_name?.[0]}
                          </span>
                          <div>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              {studentManagement.detailData.first_name}{" "}
                              {studentManagement.detailData.last_name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {studentManagement.detailData.student_id}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-4 text-sm dark:bg-slate-900/50">
                          <div>
                            <p className="text-xs text-gray-400">Class</p>
                            <p className="font-medium text-gray-800 dark:text-gray-200">
                              {studentManagement.detailData.division_name
                                ? `${studentManagement.detailData.division_name} ${studentManagement.detailData.section_name}`
                                : "Unassigned"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Roll No.</p>
                            <p className="font-medium text-gray-800 dark:text-gray-200">
                              {studentManagement.detailData.roll_number ?? "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Mobile</p>
                            <p className="font-medium text-gray-800 dark:text-gray-200">
                              {studentManagement.detailData.mobile || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Email</p>
                            <p className="font-medium text-gray-800 dark:text-gray-200">
                              {studentManagement.detailData.email || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">
                              Father&apos;s Name
                            </p>
                            <p className="font-medium text-gray-800 dark:text-gray-200">
                              {studentManagement.detailData.father_name ||
                                "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">
                              Mother&apos;s Name
                            </p>
                            <p className="font-medium text-gray-800 dark:text-gray-200">
                              {studentManagement.detailData.mother_name ||
                                "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">
                              Admission Date
                            </p>
                            <p className="font-medium text-gray-800 dark:text-gray-200">
                              {studentManagement.detailData.admission_date ||
                                "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Status</p>
                            <p className="font-medium text-gray-800 dark:text-gray-200">
                              {studentManagement.detailData.status || "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================= TEACHERS ================= */}
        {activeSection === "teachers" && (
          <section className="section active p-4 sm:p-6 space-y-6">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Teachers
                  </h2>
                  <p className="text-xs sm:text-sm opacity-90">
                    Every teacher on staff and what they&apos;re currently
                    teaching.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => teacherManagement.loadTeachers()}
                    disabled={teacherManagement.teachersLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i
                      className={`bi bi-arrow-clockwise ${
                        teacherManagement.teachersLoading ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </button>

                  {canWriteAcademic && (
                    <button
                      type="button"
                      onClick={teacherManagement.openCreateTeacherModal}
                      className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow transition hover:bg-gray-100"
                    >
                      <i className="bi bi-person-plus" />
                      Add Teacher
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* STATISTICS */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                {
                  label: "Total Teachers",
                  value: teacherManagement.teacherStats.total,
                  icon: "bi-person-badge",
                  classes:
                    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
                },
                {
                  label: "Active",
                  value: teacherManagement.teacherStats.active,
                  icon: "bi-check-circle",
                  classes:
                    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
                },
                {
                  label: "Inactive",
                  value: teacherManagement.teacherStats.inactive,
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="relative md:col-span-2">
                  <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={teacherManagement.teacherSearch}
                    onChange={(event) => {
                      teacherManagement.setTeacherSearch(event.target.value);
                      teacherManagement.loadTeachers({
                        search: event.target.value,
                      });
                    }}
                    placeholder="Search by name, email, mobile, teacher ID..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <select
                  value={teacherManagement.teacherStatusFilter}
                  onChange={(event) => {
                    teacherManagement.setTeacherStatusFilter(
                      event.target.value,
                    );
                    teacherManagement.loadTeachers({
                      status: event.target.value,
                    });
                  }}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            {/* ROSTER TABLE */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Teacher Directory
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {teacherManagement.teachers.length} teacher(s) found
                </p>
              </div>

              <div className="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900/70 dark:text-gray-400">
                    <tr>
                      <th className="px-5 py-3">Teacher</th>
                      <th className="px-5 py-3">Designation</th>
                      <th className="px-5 py-3">Contact</th>
                      <th className="px-5 py-3">Teaching Load</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {teacherManagement.teachersLoading ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-500">
                            <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                            Loading teachers...
                          </div>
                        </td>
                      </tr>
                    ) : teacherManagement.teachers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-16 text-center">
                          <div className="mx-auto max-w-sm">
                            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                              <i className="bi bi-person-badge text-2xl" />
                            </span>
                            <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                              No teachers found
                            </h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              Add your first teacher or adjust the current
                              filters.
                            </p>
                            {canWriteAcademic && (
                              <button
                                type="button"
                                onClick={teacherManagement.openCreateTeacherModal}
                                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                              >
                                Add Teacher
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      teacherManagement.teachers.map((teacher) => (
                        <tr
                          key={teacher.id}
                          className="cursor-pointer transition hover:bg-gray-50/80 dark:hover:bg-slate-700/40"
                          onClick={() =>
                            teacherManagement.openTeacherDetail(teacher)
                          }
                        >
                          <td className="min-w-[200px] px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                                <i className="bi bi-person" />
                              </span>
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {teacher.full_name ||
                                    `${teacher.first_name} ${teacher.last_name}`}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {teacher.teacher_id}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-gray-600 dark:text-gray-300">
                            {teacher.designation || "—"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-gray-600 dark:text-gray-300">
                            <p>{teacher.mobile || "—"}</p>
                            <p className="text-xs text-gray-400">
                              {teacher.email}
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                              <i className="bi bi-journal-bookmark" />
                              {(teacher.assignments || []).length} class
                              {(teacher.assignments || []).length === 1
                                ? ""
                                : "es"}
                            </span>
                          </td>

                          <td
                            className="whitespace-nowrap px-5 py-4"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {canWriteAcademic ? (
                              <select
                                value={teacher.status || "Active"}
                                disabled={
                                  teacherManagement.statusUpdatingId ===
                                  teacher.id
                                }
                                onChange={(event) =>
                                  teacherManagement.changeTeacherStatus(
                                    teacher,
                                    event.target.value,
                                  )
                                }
                                className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ${
                                  teacher.status === "Active"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                                    : teacher.status === "Suspended"
                                    ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                                    : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                                }`}
                              >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Suspended">Suspended</option>
                              </select>
                            ) : (
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  teacher.status === "Active"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                                    : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                                }`}
                              >
                                {teacher.status || "Active"}
                              </span>
                            )}
                          </td>

                          <td
                            className="whitespace-nowrap px-5 py-4 text-right"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  teacherManagement.openTeacherDetail(teacher)
                                }
                                title="View teacher"
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-100 text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                              >
                                <i className="bi bi-eye" />
                              </button>

                              {canWriteAcademic && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      teacherManagement.openEditTeacherModal(
                                        teacher,
                                      )
                                    }
                                    title="Edit teacher"
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-100 text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                                  >
                                    <i className="bi bi-pencil-square" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      teacherManagement.openPasswordModal(
                                        teacher,
                                      )
                                    }
                                    title="Reset password"
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                                  >
                                    <i className="bi bi-key" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      teacherManagement.requestDeleteTeacher(
                                        teacher,
                                      )
                                    }
                                    title="Delete teacher"
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-600 transition hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10"
                                  >
                                    <i className="bi bi-trash3" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ============ ADD/EDIT TEACHER MODAL ============ */}
            {teacherManagement.teacherModalOpen && (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    teacherManagement.closeTeacherModal();
                  }
                }}
              >
                <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-800">
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5 dark:border-slate-700 dark:bg-slate-800">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      {teacherManagement.teacherSaveResult
                        ? "Teacher Saved"
                        : teacherManagement.teacherForm.id
                        ? "Update Teacher"
                        : "Add New Teacher"}
                    </h2>
                    <button
                      type="button"
                      onClick={teacherManagement.closeTeacherModal}
                      disabled={teacherManagement.teacherSaving}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>

                  {teacherManagement.teacherSaveResult ? (
                    <div className="space-y-4 px-6 py-6">
                      <div className="flex flex-col items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
                        <i className="bi bi-check-circle text-3xl text-emerald-600 dark:text-emerald-300" />
                        <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                          {teacherManagement.teacherSaveResult.teacher
                            ?.full_name || "Teacher"}{" "}
                          {teacherManagement.teacherSaveResult.isEdit
                            ? "was updated successfully"
                            : "was added successfully"}
                        </p>
                      </div>

                      {teacherManagement.teacherSaveResult.defaultPassword && (
                        <div className="rounded-xl border border-gray-200 p-4 dark:border-slate-600">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Login Credentials - share with the teacher
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-gray-400">
                                Username
                              </p>
                              <p className="font-mono font-semibold text-gray-900 dark:text-white">
                                {teacherManagement.teacherSaveResult.teacher
                                  ?.username}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">
                                Temporary Password
                              </p>
                              <p className="font-mono font-semibold text-gray-900 dark:text-white">
                                {
                                  teacherManagement.teacherSaveResult
                                    .defaultPassword
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={teacherManagement.closeTeacherModal}
                          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form
                      onSubmit={teacherManagement.saveTeacher}
                      className="space-y-6 px-6 py-6"
                    >
                      {teacherManagement.teacherErrors.form && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                          {teacherManagement.teacherErrors.form}
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
                              value={teacherManagement.teacherForm.first_name}
                              onChange={(event) =>
                                teacherManagement.updateTeacherForm(
                                  "first_name",
                                  event.target.value,
                                )
                              }
                              className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none dark:bg-slate-900 dark:text-white ${
                                teacherManagement.teacherErrors.first_name
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
                              value={teacherManagement.teacherForm.middle_name}
                              onChange={(event) =>
                                teacherManagement.updateTeacherForm(
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
                              value={teacherManagement.teacherForm.last_name}
                              onChange={(event) =>
                                teacherManagement.updateTeacherForm(
                                  "last_name",
                                  event.target.value,
                                )
                              }
                              className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none dark:bg-slate-900 dark:text-white ${
                                teacherManagement.teacherErrors.last_name
                                  ? "border-red-500"
                                  : "border-gray-200 focus:border-indigo-500 dark:border-slate-600"
                              }`}
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                              Email <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="email"
                              value={teacherManagement.teacherForm.email}
                              onChange={(event) =>
                                teacherManagement.updateTeacherForm(
                                  "email",
                                  event.target.value,
                                )
                              }
                              className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none dark:bg-slate-900 dark:text-white ${
                                teacherManagement.teacherErrors.email
                                  ? "border-red-500"
                                  : "border-gray-200 focus:border-indigo-500 dark:border-slate-600"
                              }`}
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                              Mobile
                            </label>
                            <input
                              type="text"
                              value={teacherManagement.teacherForm.mobile}
                              onChange={(event) =>
                                teacherManagement.updateTeacherForm(
                                  "mobile",
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
                              value={teacherManagement.teacherForm.gender}
                              onChange={(event) =>
                                teacherManagement.updateTeacherForm(
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
                        </div>
                      </div>

                      {/* PROFESSIONAL */}
                      <div>
                        <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
                          Professional Details
                        </h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <input
                            type="text"
                            placeholder="Designation"
                            value={teacherManagement.teacherForm.designation}
                            onChange={(event) =>
                              teacherManagement.updateTeacherForm(
                                "designation",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            placeholder="Specialization"
                            value={teacherManagement.teacherForm.specialization}
                            onChange={(event) =>
                              teacherManagement.updateTeacherForm(
                                "specialization",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                          />
                          <input
                            type="number"
                            placeholder="Experience (years)"
                            value={
                              teacherManagement.teacherForm.experience_years
                            }
                            onChange={(event) =>
                              teacherManagement.updateTeacherForm(
                                "experience_years",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            placeholder="Degree"
                            value={teacherManagement.teacherForm.degree}
                            onChange={(event) =>
                              teacherManagement.updateTeacherForm(
                                "degree",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            placeholder="University"
                            value={teacherManagement.teacherForm.university}
                            onChange={(event) =>
                              teacherManagement.updateTeacherForm(
                                "university",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                          />
                          <select
                            value={teacherManagement.teacherForm.employment_type}
                            onChange={(event) =>
                              teacherManagement.updateTeacherForm(
                                "employment_type",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                          >
                            <option value="">Employment type</option>
                            <option value="Full Time">Full Time</option>
                            <option value="Part Time">Part Time</option>
                            <option value="Contract">Contract</option>
                          </select>
                        </div>
                      </div>

                      {/* ASSIGNMENTS */}
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                            Class &amp; Subject Assignments
                          </h3>
                          <button
                            type="button"
                            onClick={teacherManagement.addAssignmentRow}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                          >
                            <i className="bi bi-plus-lg" />
                            Add Assignment
                          </button>
                        </div>

                        {teacherManagement.teacherForm.assignments.length ===
                        0 ? (
                          <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400 dark:border-slate-600">
                            No classes assigned yet. Add one above.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {teacherManagement.teacherForm.assignments.map(
                              (assignment, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2"
                                >
                                  <select
                                    value={assignment.academic_class_id}
                                    onChange={(event) =>
                                      teacherManagement.updateAssignmentRow(
                                        index,
                                        "academic_class_id",
                                        event.target.value,
                                      )
                                    }
                                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                                  >
                                    <option value="">Select class</option>
                                    {teacherManagement.teacherOptions.academic_classes.map(
                                      (cls) => (
                                        <option key={cls.id} value={cls.id}>
                                          {cls.display_name}
                                        </option>
                                      ),
                                    )}
                                  </select>

                                  <select
                                    value={assignment.subject_id}
                                    onChange={(event) =>
                                      teacherManagement.updateAssignmentRow(
                                        index,
                                        "subject_id",
                                        event.target.value,
                                      )
                                    }
                                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                                  >
                                    <option value="">Select subject</option>
                                    {teacherManagement.teacherOptions.subjects.map(
                                      (subject) => (
                                        <option
                                          key={subject.id}
                                          value={subject.id}
                                        >
                                          {subject.subject_name}
                                        </option>
                                      ),
                                    )}
                                  </select>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      teacherManagement.removeAssignmentRow(
                                        index,
                                      )
                                    }
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-100 text-red-600 transition hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10"
                                  >
                                    <i className="bi bi-trash3" />
                                  </button>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 dark:border-slate-700 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={teacherManagement.closeTeacherModal}
                          disabled={teacherManagement.teacherSaving}
                          className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-white disabled:opacity-60 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={teacherManagement.teacherSaving}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {teacherManagement.teacherSaving ? (
                            <>
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Saving...
                            </>
                          ) : teacherManagement.teacherForm.id ? (
                            "Update Teacher"
                          ) : (
                            "Add Teacher"
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* ============ VIEW TEACHER DETAIL MODAL ============ */}
            {teacherManagement.detailModal.open && (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    teacherManagement.closeTeacherDetail();
                  }
                }}
              >
                <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-800">
                  <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5 dark:border-slate-700 dark:bg-slate-800">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Teacher Profile
                    </h2>
                    <button
                      type="button"
                      onClick={teacherManagement.closeTeacherDetail}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>

                  <div className="px-6 py-5">
                    {teacherManagement.detailLoading ? (
                      <div className="flex flex-col items-center gap-3 py-16 text-gray-500">
                        <span className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                        Loading teacher...
                      </div>
                    ) : teacherManagement.detailError ? (
                      <p className="py-10 text-center text-sm text-red-600">
                        {teacherManagement.detailError}
                      </p>
                    ) : teacherManagement.detailData ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                            {teacherManagement.detailData.first_name?.[0]}
                            {teacherManagement.detailData.last_name?.[0]}
                          </span>
                          <div>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              {teacherManagement.detailData.full_name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {teacherManagement.detailData.teacher_id} ·{" "}
                              {teacherManagement.detailData.designation ||
                                "Teacher"}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-4 text-sm dark:bg-slate-900/50">
                          <div>
                            <p className="text-xs text-gray-400">Mobile</p>
                            <p className="font-medium text-gray-800 dark:text-gray-200">
                              {teacherManagement.detailData.mobile || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Email</p>
                            <p className="font-medium text-gray-800 dark:text-gray-200">
                              {teacherManagement.detailData.email || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">
                              Experience
                            </p>
                            <p className="font-medium text-gray-800 dark:text-gray-200">
                              {teacherManagement.detailData.experience_years ||
                                0}{" "}
                              years
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Status</p>
                            <p className="font-medium text-gray-800 dark:text-gray-200">
                              {teacherManagement.detailData.status || "—"}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Teaching Load (
                            {(teacherManagement.detailData.assignments || [])
                              .length}
                            )
                          </p>

                          {(teacherManagement.detailData.assignments || [])
                            .length === 0 ? (
                            <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400 dark:border-slate-600">
                              No classes assigned yet.
                            </p>
                          ) : (
                            <div className="space-y-1.5">
                              {teacherManagement.detailData.assignments.map(
                                (assignment) => (
                                  <div
                                    key={assignment.id}
                                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-slate-900/50"
                                  >
                                    <span className="text-gray-700 dark:text-gray-200">
                                      {assignment.division_name}{" "}
                                      {assignment.section_name}
                                    </span>
                                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                                      {assignment.subject_name}
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {/* ============ DELETE CONFIRM MODAL ============ */}
            {teacherManagement.deleteModal.open && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
                    <i className="bi bi-trash3 text-2xl" />
                  </span>
                  <div className="mt-4 text-center">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Delete Teacher?
                    </h2>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      You are deleting{" "}
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {teacherManagement.deleteModal.teacher?.full_name}
                      </span>
                      . This also removes their class assignments.
                    </p>
                    {teacherManagement.deleteError && (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-left text-xs text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                        <div className="flex gap-2">
                          <i className="bi bi-exclamation-triangle-fill mt-0.5" />
                          <p>{teacherManagement.deleteError}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                    <button
                      type="button"
                      onClick={teacherManagement.closeDeleteModal}
                      disabled={teacherManagement.deleting}
                      className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={teacherManagement.deleteTeacher}
                      disabled={teacherManagement.deleting}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {teacherManagement.deleting ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-trash3" />
                          Delete Teacher
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ============ PASSWORD RESET MODAL ============ */}
            {teacherManagement.passwordModal.open && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                <form
                  onSubmit={teacherManagement.submitPasswordReset}
                  className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Reset Password
                    </h2>
                    <button
                      type="button"
                      onClick={teacherManagement.closePasswordModal}
                      disabled={teacherManagement.passwordSaving}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>

                  <div className="space-y-4 px-6 py-5">
                    {teacherManagement.passwordSuccess ? (
                      <div className="flex flex-col items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
                        <i className="bi bi-check-circle text-2xl text-emerald-600 dark:text-emerald-300" />
                        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                          Password reset for{" "}
                          {teacherManagement.passwordModal.teacher?.full_name}
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Set a new password for{" "}
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {
                              teacherManagement.passwordModal.teacher
                                ?.full_name
                            }
                          </span>
                          .
                        </p>

                        <input
                          type="text"
                          value={teacherManagement.passwordValue}
                          onChange={(event) =>
                            teacherManagement.setPasswordValue(
                              event.target.value,
                            )
                          }
                          placeholder="New password (min 6 characters)"
                          autoFocus
                          className={`w-full rounded-xl border px-4 py-3 text-sm outline-none dark:bg-slate-900 dark:text-white ${
                            teacherManagement.passwordError
                              ? "border-red-500"
                              : "border-gray-200 focus:border-indigo-500 dark:border-slate-600"
                          }`}
                        />

                        {teacherManagement.passwordError && (
                          <p className="text-xs text-red-500">
                            {teacherManagement.passwordError}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/50 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={teacherManagement.closePasswordModal}
                      disabled={teacherManagement.passwordSaving}
                      className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-white disabled:opacity-60 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                    >
                      {teacherManagement.passwordSuccess ? "Close" : "Cancel"}
                    </button>

                    {!teacherManagement.passwordSuccess && (
                      <button
                        type="submit"
                        disabled={teacherManagement.passwordSaving}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {teacherManagement.passwordSaving ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Saving...
                          </>
                        ) : (
                          "Reset Password"
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </section>
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
                          <div className="mt-5 overflow-hidden rounded-xl border border-gray-100 dark:border-slate-700">
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
