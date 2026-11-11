import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "./theme";

export function useDashboardUI() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarHover, setSidebarHover] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  // shared with every page (login, developer console): see controllers/theme.js
  const { isDark: darkMode, toggle: toggleTheme, setTheme } = useTheme(); // setTheme saves to the account

  // Kept for the dashboards that still call setDarkMode(true | false | updater).
  const setDarkMode = (next) => {
    const value = typeof next === "function" ? next(darkMode) : next;
    setTheme(value ? "dark" : "light");
  };

  const bellRef = useRef(null);

  const isDesktop = () => window.innerWidth >= 768;

  const sidebarExpanded = useMemo(() => {
    return sidebarOpen || sidebarHover;
  }, [sidebarOpen, sidebarHover]);

  const handleSidebarMouseEnter = () => {
    if (isDesktop() && !sidebarOpen) {
      setSidebarHover(true);
    }
  };

  const handleSidebarMouseLeave = () => {
    if (isDesktop()) {
      setSidebarHover(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarHover(false);
    setSidebarOpen((prev) => !prev);
  };

  const closeSidebarOnMobile = () => {
    if (!isDesktop()) {
      setSidebarOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (
        e.target.closest(".sidebar") ||
        e.target.closest(".profile-menu") ||
        e.target.closest(".sidebar-toggle")
      ) {
        return;
      }

      setProfileOpen(false);

      if (!isDesktop()) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  return {
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
  };
}