import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";

export function useDashboardUI() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarHover, setSidebarHover] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );

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

  const toggleTheme = () => {
    setDarkMode((prev) => !prev);
  };

  useEffect(() => {
    const root = document.documentElement;

    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

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