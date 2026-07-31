import { Routes, Route, Navigate } from "react-router-dom";

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
// import AcademicAdminDashboard from "./pages/admin/AcademicAdminDashboard";

/* =========================
   PROTECTED ROUTE
========================= */

function ProtectedRoute({ children, allowedRole, allowedAdminType }) {
  const token = localStorage.getItem("token");

  let savedUser = {};

  try {
    savedUser = JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    savedUser = {};
  }

  const userRole =
    localStorage.getItem("role") || savedUser.role || savedUser.user_type || "";

  const adminType =
    localStorage.getItem("admin_type") || savedUser.admin_type || "";

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (allowedRole && userRole !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  const isSuperAdmin =
    userRole === "super_admin" || adminType === "Super Admin";

  if (allowedAdminType && adminType !== allowedAdminType && !isSuperAdmin) {
    if (adminType === "Library Admin") {
      return <Navigate to="/library-admin-dashboard" replace />;
    }

    if (adminType === "Hostel Admin") {
      return <Navigate to="/hostel-admin-dashboard" replace />;
    }

    return <Navigate to="/" replace />;
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
          <ProtectedRoute allowedRole="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      {/* ================= TEACHER ================= */}

      <Route
        path="/teacher-dashboard"
        element={
          <ProtectedRoute allowedRole="teacher">
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />

      {/* ================= SUPER ADMIN ================= */}

      <Route
        path="/super-admin-dashboard"
        element={
          <ProtectedRoute allowedRole="admin" allowedAdminType="Super Admin">
            <SuperMainAdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* ================= LIBRARY ADMIN ================= */}

      <Route
        path="/library-admin-dashboard"
        element={
          <ProtectedRoute allowedRole="admin" allowedAdminType="Library Admin">
            <LibraryAdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* ================= ACCOUNTS ADMIN ================= */}

      <Route
        path="/accounts-admin-dashboard"
        element={
          <ProtectedRoute allowedRole="admin" allowedAdminType="Accounts Admin">
            <AccountsAdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* ================= HOSTEL ADMIN ================= */}

      <Route
        path="/hostel-admin-dashboard"
        element={
          <ProtectedRoute allowedRole="admin" allowedAdminType="Hostel Admin">
            <HostelAdminDashboard />
          </ProtectedRoute>
        }
      />
      {/* =================== HR MANAGEMENT ===================== */}
      <Route
        path="/hr-admin-dashboard"
        element={
          <ProtectedRoute allowedRole="admin" allowedAdminType="HR Admin">
            <HRAdminDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
