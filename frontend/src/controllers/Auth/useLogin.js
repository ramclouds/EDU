import { useState } from "react";
import { BASE_URL } from "../../config/appConfig";

export function useLogin() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // ================= LOGIN =================
  const login = async () => {
    if (!identifier || !password) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${BASE_URL}/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            identifier,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Login failed");
        return;
      }

      // ================= STORE AUTH =================

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      if (data.user?.admin_type) {
        localStorage.setItem(
          "admin_type",
          data.user.admin_type
        );
      } else {
        localStorage.removeItem("admin_type");
      }

      // ================= RBAC ACCESS SYNC =================
      // Keep the existing login and redirect logic unchanged.
      // RBAC failure must never block a valid login.
      try {
        let rbacAccess = data.rbac || null;

        if (!rbacAccess && data.token) {
          const rbacResponse = await fetch(
            `${BASE_URL}/rbac/my-access`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${data.token}`,
              },
            }
          );

          if (rbacResponse.ok) {
            rbacAccess = await rbacResponse.json();
          }
        }

        if (rbacAccess) {
          localStorage.setItem(
            "rbac_access",
            JSON.stringify(rbacAccess)
          );
          localStorage.setItem(
            "effective_permissions",
            JSON.stringify(
              rbacAccess.effective_permissions || {}
            )
          );
        } else {
          localStorage.removeItem("rbac_access");
          localStorage.removeItem("effective_permissions");
        }
      } catch (rbacError) {
        console.warn(
          "RBAC access could not be loaded:",
          rbacError
        );
        localStorage.removeItem("rbac_access");
        localStorage.removeItem("effective_permissions");
      }

      console.log("LOGIN SUCCESS", data);

      // Prefer backend-provided dashboard
      if (data.dashboard) {
        window.location.href = data.dashboard;
        return;
      }

      // Fallback redirects
      const fallbackRoutes = {
        student: "/student-dashboard",
        teacher: "/teacher-dashboard",
      };

      if (fallbackRoutes[data.role]) {
        window.location.href =
          fallbackRoutes[data.role];
        return;
      }

      if (data.role === "admin") {
        const adminRoutes = {
          "Super Admin": "/super-admin-dashboard",
          "Library Admin": "/library-admin-dashboard",
          "Accounts Admin": "/accounts-admin-dashboard",
          "Hostel Admin": "/hostel-admin-dashboard",
          "HR Admin": "/hr-admin-dashboard",
        };

        const route =
          adminRoutes[data.user?.admin_type];

        if (route) {
          window.location.href = route;
          return;
        }
      }

      alert("No dashboard route configured");

      // ================= ROLE BASED REDIRECT =================

      if (data.dashboard) {
        window.location.href = data.dashboard;
        return;
      }

      if (data.role === "student") {
        window.location.href = "/student-dashboard";
        return;
      }

      if (data.role === "teacher") {
        window.location.href = "/teacher-dashboard";
        return;
      }

      if (data.role === "admin") {
        const adminDashboardRoutes = {
          "Super Admin": "/super-admin-dashboard",
          "Library Admin": "/library-admin-dashboard",
          "Accounts Admin": "/accounts-admin-dashboard",
          "Hostel Admin": "/hostel-admin-dashboard",
          "HR Admin": "/hr-admin-dashboard",
        };

        const dashboard =
          adminDashboardRoutes[data.user?.admin_type];

        if (!dashboard) {
          console.error(
            "Unknown admin type:",
            data.user?.admin_type
          );
          alert("Dashboard access is not configured");
          return;
        }

        window.location.href = dashboard;
      }

    } catch (error) {
      console.error(error);
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  // ================= FORGOT PASSWORD =================

  const handleForgotPassword = async () => {

    if (!resetEmail) {
      alert("Please enter your email");
      return;
    }

    try {

      const response = await fetch(
        "http://localhost:5000/api/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: resetEmail,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {

        alert("Password reset link sent");
        setShowForgotModal(false);
        setResetEmail("");

      } else {

        alert(data.error);

      }

    } catch (error) {

      console.error(error);

      alert("Server error");

    }
  };

  return {
    identifier,
    setIdentifier,

    password,
    setPassword,

    resetEmail,
    setResetEmail,

    loading,

    showPassword,
    setShowPassword,

    showForgotModal,
    setShowForgotModal,

    login,

    handleForgotPassword,
  };
}