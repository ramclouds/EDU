import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { clearThemeCache, setThemeOverride, syncThemeFromServer } from "./controllers/theme";
import { resetDashboardAccessStore } from "./controllers/Auth/useDashboardAccess";
import PlanUpgradePage from "./components/PlanUpgradePage";

import SignInEntry from "./pages/SignInEntry";
import DeveloperLogin from "./pages/developer-login";
import ResetPassword from "./pages/ResetPassword";
import DeveloperDashboard from "./pages/developer-dashboard";

import StudentDashboard from "./pages/student-dashboard";
import TeacherDashboard from "./pages/teacher-dashboard";

// ADMIN DASHBOARDS

import SuperMainAdminDashboard from "./pages/super-admin-dashboard";
import LibraryAdminDashboard from "./pages/library-Mgmt-dashboard";
import AccountsAdminDashboard from "./pages/accounts-Mgmt-dashboard";
import HostelAdminDashboard from "./pages/hostels-Mgmt-dashboard";
import HRAdminDashboard from "./pages/hr-Mgmt-dashboard";
import AcademicAdminDashboard from "./pages/academic-Mgmt-dashboard";

// Adjust this relative path to wherever useDashboardAccess.js ends up
import { useDashboardAccess } from "./controllers/Auth/useDashboardAccess";
import UserIdInUrl from "./components/UserIdInUrl";

function AccessCheckLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center text-sm text-gray-400">
      Checking your access…
    </div>
  );
}

// PROTECTED ROUTE

function ProtectedRoute({ children, allowedRole, dashboardKey }) {
  const token = localStorage.getItem("signed_in");

  let savedUser = {};

  try {
    savedUser = JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    savedUser = {};
  }

  const userRole =
    localStorage.getItem("role") || savedUser.role || savedUser.user_type || "";

  const { canView, loaded, loading, dashboards, homeRoute } = useDashboardAccess();

  if (!token) {
    return <Navigate to="/" replace />;
  }

  // The backend stores a Super Admin's role as "super_admin". Every
  const ADMIN_ROLES = ["admin", "super_admin"];
  const roleMatches =
    allowedRole === "admin"
      ? ADMIN_ROLES.includes(userRole)
      : userRole === allowedRole;

  if (allowedRole && !roleMatches) {
    return <Navigate to="/" replace />;
  }

  if (
    dashboardKey === "student-dashboard" ||
    dashboardKey === "teacher-dashboard"
  ) {
    return (
      <>
        <UserIdInUrl />
        {children}
      </>
    );
  }

  if (!loaded && loading) {
    return <AccessCheckLoader />;
  }

  const locked = dashboardKey ? dashboards.find((d) => d.key === dashboardKey && d.plan_locked) : null;
  if (locked) {
    return <PlanUpgradePage message={locked.plan_message} plan={locked.plan} homeRoute={homeRoute} />;
  }

  if (dashboardKey && !canView(dashboardKey)) {
    return <Navigate to="/" replace state={{ accessDenied: dashboardKey }} />;
  }

  return (
    <>
      <UserIdInUrl />
      {children}
    </>
  );
}

// APP

export default function App() {
  const location = useLocation();

  useEffect(() => {
    const signedIn = Boolean(localStorage.getItem("signed_in") || localStorage.getItem("dev_signed_in"));
    const onSignInPage = ["/", "/Login", "/developer/login"].includes(location.pathname);

    // Sign-in pages are always light. Every other page keeps the person's own theme,
    // even if a request has just failed and the sign-in flag is missing.
    setThemeOverride(onSignInPage ? "light" : null);

    if (signedIn) {
      syncThemeFromServer();
    } else if (onSignInPage) {
      // Signed out: nothing of the last person is kept on this browser.
      clearThemeCache();
      resetDashboardAccessStore();
    }
  }, [location.pathname]);

  return (
    <>
      {/* react-hot-toast was already a dependency but its <Toaster/> */}
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      <Routes>
      {/* ================= PUBLIC ================= */}

      <Route path="/Login" element={<SignInEntry />} />
      <Route path="/" element={<SignInEntry />} />
      <Route path="/developer/login" element={<DeveloperLogin />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/developer/dashboard" element={<DeveloperDashboard />} />

      {/* ================= STUDENT ================= */}

      <Route
        path="/student-dashboard/*"
        element={
          <ProtectedRoute
            allowedRole="student"
            dashboardKey="student-dashboard"
          >
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      {/* ================= TEACHER ================= */}

      <Route
        path="/teacher-dashboard/*"
        element={
          <ProtectedRoute
            allowedRole="teacher"
            dashboardKey="teacher-dashboard"
          >
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />

      {/* ================= SUPER ADMIN ================= */}

      <Route
        path="/super-admin-dashboard/*"
        element={
          <ProtectedRoute
            allowedRole="admin"
            dashboardKey="super-admin-dashboard"
          >
            <SuperMainAdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* ================= LIBRARY ADMIN ================= */}

      <Route
        path="/library-admin-dashboard/*"
        element={
          <ProtectedRoute
            allowedRole="admin"
            dashboardKey="library-admin-dashboard"
          >
            <LibraryAdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* ================= ACADEMIC ADMIN ================= */}

      <Route
        path="/academic-admin-dashboard/*"
        element={
          <ProtectedRoute
            allowedRole="admin"
            dashboardKey="academic-admin-dashboard"
          >
            <AcademicAdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* ================= ACCOUNTS ADMIN ================= */}

      <Route
        path="/accounts-admin-dashboard/*"
        element={
          <ProtectedRoute
            allowedRole="admin"
            dashboardKey="accounts-admin-dashboard"
          >
            <AccountsAdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* ================= HOSTEL ADMIN ================= */}

      <Route
        path="/hostel-admin-dashboard/*"
        element={
          <ProtectedRoute
            allowedRole="admin"
            dashboardKey="hostel-admin-dashboard"
          >
            <HostelAdminDashboard />
          </ProtectedRoute>
        }
      />
      {/* =================== HR MANAGEMENT ===================== */}
      <Route
        path="/hr-admin-dashboard/*"
        element={
          <ProtectedRoute allowedRole="admin" dashboardKey="hr-admin-dashboard">
            <HRAdminDashboard />
          </ProtectedRoute>
        }
      />
      </Routes>
    </>
  );
}
