import { useState } from "react";
import toast from "react-hot-toast";
import { BASE_URL } from "../../config/appConfig";
import {
  clearStoredDashboardAccess,
  storeDashboardAccess,
} from "./useDashboardAccess";

export function useLogin() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [resetEmail, setResetEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Shown as an inline banner on the login page instead of (or in
  // addition to) the blocking alert, so the "no dashboard access"
  // message stays visible and readable rather than flashing by.
  const [loginNotice, setLoginNotice] = useState(null);

  // ================= LOGIN =================
  const login = async () => {
    if (!identifier || !password) {
      toast.error("Please fill all fields");
      return;
    }

    setLoading(true);
    setLoginNotice(null);

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
            // Optional: only schools onboarded through the Developer
            // dashboard have a code. Omitting it falls back to the
            // legacy unscoped lookup on the backend.
            school_code: schoolCode || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // The backend blocks login (and issues no token) whenever the
        // account's own dashboard has not been granted to it, e.g. a
        // Library Admin whose "library" dashboard access was revoked
        // or was never assigned by a Super Admin.
        if (data.error_code === "DASHBOARD_ACCESS_DENIED") {
          setLoginNotice({
            type: "error",
            message:
              data.error ||
              "Your account does not have access to any dashboard yet. Please contact a Super Administrator.",
          });
        } else if (data.error_code === "SCHOOL_ACCESS_DENIED") {
          // The school itself is suspended or its trial/subscription
          // has expired — distinct from a wrong password, so it gets
          // its own clear, persistent banner rather than a toast that
          // disappears before the user finishes reading it.
          setLoginNotice({
            type: "error",
            message: data.error || "This school's account is not active.",
          });
        } else {
          toast.error(data.error || "Login failed");
        }

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

      // ================= DASHBOARD ACCESS =================
      // List of dashboards this user may open, each flagged with
      // can_view / can_write. Drives the sidebar nav and route guards.
      if (Array.isArray(data.dashboard_access)) {
        storeDashboardAccess(data.dashboard_access);
      } else {
        clearStoredDashboardAccess();
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

      if (data.role === "admin" || data.role === "super_admin") {
        const adminRoutes = {
          "Super Admin": "/super-admin-dashboard",
          "Library Admin": "/library-admin-dashboard",
          "Academic Admin": "/academic-admin-dashboard",
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

        console.error(
          "Unknown admin type:",
          data.user?.admin_type
        );
      }

      // The backend always sends `data.dashboard`, so in practice we
      // never get here - this only fires if the backend response is
      // missing both `dashboard` and a role we recognise.
      toast.error("No dashboard route configured");

    } catch (error) {
      console.error(error);
      toast.error("Server error");
    } finally {
      setLoading(false);
    }
  };

  // ================= FORGOT PASSWORD =================

  const handleForgotPassword = async () => {

    if (!resetEmail) {
      toast.error("Please enter your email");
      return;
    }

    try {

      const response = await fetch(
        `${BASE_URL}/forgot-password`,
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

        toast.success("Password reset link sent");
        setShowForgotModal(false);
        setResetEmail("");

      } else {

        toast.error(data.error || "Something went wrong");

      }

    } catch (error) {

      console.error(error);

      toast.error("Server error");

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

    loginNotice,
    setLoginNotice,

    login,

    handleForgotPassword,
  };
}