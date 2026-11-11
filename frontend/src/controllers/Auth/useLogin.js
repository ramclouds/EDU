import { useState } from "react";
import toast from "react-hot-toast";
import { BASE_URL } from "../../config/appConfig";
import {
  clearStoredDashboardAccess,
  storeDashboardAccess,
} from "./useDashboardAccess";
import { setSchoolProfile } from "../../lib/schoolProfile";

export function useLogin() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [resetEmail, setResetEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Shown as an inline banner on the login page instead of (or in
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
            school_code: schoolCode || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // The backend blocks login (and issues no token) whenever the
        if (data.error_code === "DASHBOARD_ACCESS_DENIED") {
          setLoginNotice({
            type: "error",
            message:
              data.error ||
              "Your account does not have access to any dashboard yet. Please contact a Super Administrator.",
          });
        } else if (data.error_code === "MULTIPLE_SCHOOLS") {
          // The same email/username and password exist in more than one school.
          const list = (data.schools || [])
            .map((s) => `${s.name} (${s.school_code})`)
            .join(", ");
          setLoginNotice({
            type: "error",
            message: `${data.error}${list ? ` Your schools: ${list}.` : ""}`,
          });
        } else if (data.error_code === "SCHOOL_ACCESS_DENIED") {
          // The school itself is suspended or its trial/subscription
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

      localStorage.setItem("signed_in", "1");
      setSchoolProfile(data.school ?? null);
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

      // DASHBOARD ACCESS
      if (Array.isArray(data.dashboard_access)) {
        storeDashboardAccess(data.dashboard_access);
      } else {
        clearStoredDashboardAccess();
      }

      // RBAC ACCESS SYNC
      try {
        let rbacAccess = data.rbac || null;

        if (!rbacAccess) {
          // the session cookie is sent automatically (see controllers/apiSession.js)
          const rbacResponse = await fetch(
            `${BASE_URL}/rbac/my-access`,
            { method: "GET" }
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
        `${BASE_URL}/password/forgot`,
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

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        // The same message whether or not an account matches, so this reveals nothing.
        toast.success(data.message || "If an account matches that email, a reset link has been sent.");
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