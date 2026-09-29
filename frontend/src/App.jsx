import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";

import StudentDashboard from "./pages/student-dashboard";
import TeacherDashboard from "./pages/teacher-dashboard";

/* =========================
   ADMIN DASHBOARDS
========================= */

import SuperMainAdminDashboard from "./pages/super-admin-dashboard";
import LibraryAdminDashboard from "./pages/library-Mgmt-dashboard";
import AccountsAdminDashboard from "./pages/accounts-Mgmt-dashboard";
import HostelAdminDashboard from "./pages/hostels-Mgmt-dashboard";
import HRAdminDashboard from "./pages/hr-Mgmt-dashboard";
import AcademicAdminDashboard from "./pages/academic-Mgmt-dashboard";

// Adjust this relative path to wherever useDashboardAccess.js ends up
// living in your project (it sits next to useLogin.js in this patch).
import { useDashboardAccess } from "./controllers/Auth/useDashboardAccess";

function AccessCheckLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center text-sm text-gray-400">
      Checking your access…
    </div>
  );
}

/* =========================
   PROTECTED ROUTE
========================= */

function ProtectedRoute({ children, allowedRole, dashboardKey }) {
  const token = localStorage.getItem("token");

  let savedUser = {};

  try {
    savedUser = JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    savedUser = {};
  }

  const userRole =
    localStorage.getItem("role") || savedUser.role || savedUser.user_type || "";

  const { canView, loaded, loading } = useDashboardAccess();

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (allowedRole && userRole !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  if (
    dashboardKey === "student-dashboard" ||
    dashboardKey === "teacher-dashboard"
  ) {
    return children;
  }

  if (!loaded && loading) {
    return <AccessCheckLoader />;
  }

  if (dashboardKey && !canView(dashboardKey)) {
    return <Navigate to="/" replace state={{ accessDenied: dashboardKey }} />;
  }

  return children;
}

/* =========================
   APP
========================= */

export default function App() {
  return (
    <Routes>
      {/* ================= PUBLIC ================= */}

      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* ================= STUDENT ================= */}

      <Route
        path="/student-dashboard"
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
        path="/teacher-dashboard"
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
        path="/super-admin-dashboard"
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
        path="/library-admin-dashboard"
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
        path="/academic-admin-dashboard"
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
        path="/accounts-admin-dashboard"
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
        path="/hostel-admin-dashboard"
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
        path="/hr-admin-dashboard"
        element={
          <ProtectedRoute allowedRole="admin" dashboardKey="hr-admin-dashboard">
            <HRAdminDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
