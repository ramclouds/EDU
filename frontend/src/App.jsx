import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";

import StudentDashboard from "./pages/student-dashboard";
import TeacherDashboard from "./pages/teacher-dashboard";

/* =========================
   ADMIN DASHBOARDS
========================= */

import SuperMainAdminDashboard from "./pages/super-admin-dashboard";
// import LibraryAdminDashboard from "./pages/admin/LibraryAdminDashboard";
// import AccountsAdminDashboard from "./pages/admin/AccountsAdminDashboard";
// import HostelAdminDashboard from "./pages/admin/HostelAdminDashboard";
// import AcademicAdminDashboard from "./pages/admin/AcademicAdminDashboard";

/* =========================
   PROTECTED ROUTE
========================= */

function ProtectedRoute({
  children,
  allowedRole,
  allowedAdminType,
}) {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");
  const adminType = localStorage.getItem("admin_type");

  // Not logged in
  if (!token) {
    return <Navigate to="/" />;
  }

  // Wrong role
  if (allowedRole && userRole !== allowedRole) {
    return <Navigate to="/" />;
  }

  // Wrong admin type
  if (
    allowedAdminType &&
    adminType !== allowedAdminType
  ) {
    return <Navigate to="/" />;
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
          <ProtectedRoute
            allowedRole="admin"
            allowedAdminType="Super Admin"
          >
            <SuperMainAdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* ================= LIBRARY ADMIN ================= */}

      {/* <Route
        path="/library-admin-dashboard"
        element={
          <ProtectedRoute
            allowedRole="admin"
            allowedAdminType="Library Admin"
          >
            <LibraryAdminDashboard />
          </ProtectedRoute>
        }
      /> */}

      {/* ================= ACCOUNTS ADMIN ================= */}

      {/* <Route
        path="/accounts-admin-dashboard"
        element={
          <ProtectedRoute
            allowedRole="admin"
            allowedAdminType="Accounts Admin"
          >
            <AccountsAdminDashboard />
          </ProtectedRoute>
        }
      /> */}

      {/* ================= HOSTEL ADMIN ================= */}

      {/* <Route
        path="/hostel-admin-dashboard"
        element={
          <ProtectedRoute
            allowedRole="admin"
            allowedAdminType="Hostel Admin"
          >
            <HostelAdminDashboard />
          </ProtectedRoute>
        }
      />       */}
    </Routes>
  );
}