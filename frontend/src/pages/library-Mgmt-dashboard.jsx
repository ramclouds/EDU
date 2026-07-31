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
import { useLibraryCategories } from "../controllers/Library/useLibraryCategories";
import { useLibraryAuthors } from "../controllers/Library/useLibraryAuthors";
import { useAddLibraryBook } from "../controllers/Library/useAddLibraryBook";

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

    isLibraryAdmin,
    isSuperAdmin,
    canAccess,
    allowedModules,
    dashboardType,
  } = useAdminProfile({ fetchWithAuth, showToast });

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

  useEffect(() => {
    if (!admin?.id) return;

    if (!isSuperAdmin && !isLibraryAdmin) {
      showToast("You do not have access to the Library Dashboard", "error");
      navigate("/super-admin-dashboard", { replace: true });
    }
  }, [admin?.id, isSuperAdmin, isLibraryAdmin, navigate, showToast]);

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

              {section.items
                .filter(() => true)
                .map(([key, icon, label]) => {
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
            <h2>All Section are Coming Soon.....</h2>
          </section>
        )}

        {/* ================= CATEGORIES SECTION ================= */}
        {activeSection === "categories" && (
          <section className="space-y-6">
            {/* HEADER */}
            <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-700 p-5 text-white shadow-xl sm:p-7">
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                      <i className="bi bi-tags-fill text-xl" />
                    </span>

                    <div>
                      <h1 className="text-xl font-bold sm:text-2xl">
                        Book Categories
                      </h1>

                      <p className="mt-1 text-sm text-indigo-100">
                        Create, organize and maintain your library catalogue
                        categories.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => loadCategories()}
                    disabled={categoryLoading}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
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
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
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

              <div className="overflow-x-auto">
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
              <div className="overflow-x-auto">
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
                  <h2 className="text-xl font-semibold text-gray-800">
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
                <div className="overflow-x-auto">
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

              <div className="overflow-x-auto">
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
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
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
