import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export function useDashboardUI() {
  const navigate = useNavigate();

  // UI STATES
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );

  // REFS
  const bellRef = useRef(null);

  // 🌙 Toggle Theme
  const toggleTheme = () => {
    setDarkMode((prev) => !prev);
  };

  // 🌙 Apply Theme
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

  // 🔔 Close Notifications on Outside Click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 📱 Close Sidebar/Profile on Outside Click
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
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // ✅ RETURN EVERYTHING YOU NEED
  return {
    navigate,

    // state
    sidebarOpen,
    profileOpen,
    mobileSearchOpen,
    showPassword,
    showNotifications,
    darkMode,

    // setters
    setSidebarOpen,
    setProfileOpen,
    setMobileSearchOpen,
    setShowPassword,
    setShowNotifications,
    setDarkMode,

    // refs
    bellRef,

    // actions
    toggleTheme,
  };
}