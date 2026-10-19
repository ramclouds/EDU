import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { BASE_URL } from "../../config/appConfig";

// A separate localStorage key from the school-side "token", so a develop
const DEV_TOKEN_KEY = "dev_token";

export function useDeveloperDashboard() {
  const navigate = useNavigate();

  const [developer, setDeveloper] = useState(null);
  const [schools, setSchools] = useState([]);
  const [stats, setStats] = useState(null);
  const [platform, setPlatform] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const getToken = () => localStorage.getItem(DEV_TOKEN_KEY);

  const authHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    }),
    [],
  );

  const handleUnauthorized = useCallback(
    (status) => {
      if (status === 401) {
        localStorage.removeItem(DEV_TOKEN_KEY);
        localStorage.removeItem("dev_profile");
        navigate("/developer/login");
        return true;
      }
      return false;
    },
    [navigate],
  );

  // One place for every developer API call, so error and 401 handling is uniform.
  const call = useCallback(
    async (method, path, payload) => {
      const res = await fetch(`${BASE_URL}/developer${path}`, {
        method,
        headers: authHeaders(),
        body: payload !== undefined ? JSON.stringify(payload) : undefined,
      });
      if (handleUnauthorized(res.status)) return { ok: false, unauthorized: true };
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: body.error || "Request failed", body };
      return { ok: true, body };
    },
    [authHeaders, handleUnauthorized],
  );

  // ================= LOGIN / LOGOUT =================
  const login = async (username, password) => {
    try {
      const res = await fetch(`${BASE_URL}/developer/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Login failed");
        return false;
      }
      localStorage.setItem(DEV_TOKEN_KEY, data.token);
      localStorage.setItem("dev_profile", JSON.stringify(data.developer));
      navigate("/developer/dashboard");
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Server error");
      return false;
    }
  };

  const logout = () => {
    const token = getToken();
    if (token) {
      fetch(`${BASE_URL}/developer/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(DEV_TOKEN_KEY);
    localStorage.removeItem("dev_profile");
    navigate("/developer/login");
  };

  // ================= LISTS =================
  const fetchSchools = useCallback(async () => {
    const r = await call("GET", "/schools");
    if (r.ok) setSchools(r.body);
  }, [call]);

  const fetchStats = useCallback(async () => {
    const r = await call("GET", "/stats");
    if (r.ok) setStats(r.body);
  }, [call]);

  const fetchPlatform = useCallback(async () => {
    const r = await call("GET", "/platform");
    if (r.ok) setPlatform(r.body);
  }, [call]);

  const fetchAudit = useCallback(
    async (schoolId) => {
      const r = await call("GET", `/audit${schoolId ? `?school_id=${schoolId}` : ""}`);
      if (r.ok) setAudit(r.body.entries || []);
    },
    [call],
  );

  useEffect(() => {
    const stored = localStorage.getItem("dev_profile");
    if (stored) {
      try {
        setDeveloper(JSON.parse(stored));
      } catch {
        // ignore a malformed cache
      }
    }
    (async () => {
      setLoading(true);
      await Promise.all([fetchSchools(), fetchStats(), fetchPlatform()]);
      setLoading(false);
    })();
  }, [fetchSchools, fetchStats, fetchPlatform]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchSchools(), fetchStats(), fetchPlatform()]);
  }, [fetchSchools, fetchStats, fetchPlatform]);

  // ================= SCHOOL ACTIONS =================
  const loadSchoolDetail = useCallback(
    async (schoolId) => {
      const r = await call("GET", `/schools/${schoolId}`);
      return r.ok ? r.body : null;
    },
    [call],
  );

  const loadActivity = useCallback(
    async (schoolId) => {
      const r = await call("GET", `/schools/${schoolId}/activity?limit=100`);
      return r.ok ? r.body.activity || [] : [];
    },
    [call],
  );

  const createSchool = async (payload, logoFile = null) => {
    setCreating(true);
    const r = await call("POST", "/schools", payload);
    setCreating(false);
    if (!r.ok) {
      if (!r.unauthorized) toast.error(r.error || "Failed to create school");
      return null;
    }
    toast.success(`School created — code ${r.body.school.school_code}`);
    if (logoFile) await uploadSchoolLogo(r.body.school.id, logoFile);
    await refreshAll();
    return r.body;
  };

  const setSchoolStatus = async (schoolId, action) => {
    const r = await call("POST", `/schools/${schoolId}/status`, { action });
    if (!r.ok) {
      if (!r.unauthorized) toast.error(r.error || "Action failed");
      return false;
    }
    toast.success(r.body.message || "Updated");
    await refreshAll();
    return true;
  };

  const updateSchool = async (schoolId, payload) => {
    const r = await call("PUT", `/schools/${schoolId}`, payload);
    if (!r.ok) {
      if (!r.unauthorized) toast.error(r.error || "Update failed");
      return false;
    }
    toast.success("School updated");
    await refreshAll();
    return true;
  };

  const extendTrial = async (schoolId, days) => {
    const r = await call("POST", `/schools/${schoolId}/extend-trial`, { days });
    if (!r.ok) {
      if (!r.unauthorized) toast.error(r.error || "Could not extend trial");
      return false;
    }
    toast.success(r.body.message);
    await refreshAll();
    return true;
  };

  const activateSubscription = async (schoolId, plan, subscriptionEndsAt) => {
    const r = await call("POST", `/schools/${schoolId}/status`, {
      action: "activate",
      plan,
      subscription_ends_at: subscriptionEndsAt,
    });
    if (!r.ok) {
      if (!r.unauthorized) toast.error(r.error || "Could not activate subscription");
      return false;
    }
    toast.success(r.body.message || "Subscription activated");
    await refreshAll();
    return true;
  };

  const uploadSchoolLogo = async (schoolId, file) => {
    const form = new FormData();
    form.append("logo", file);
    const res = await fetch(`${BASE_URL}/developer/schools/${schoolId}/logo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
      body: form,
    });
    if (handleUnauthorized(res.status)) return false;
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(body.error || "Logo upload failed");
      return false;
    }
    toast.success("Logo saved");
    await refreshAll();
    return true;
  };

  const removeSchoolLogo = async (schoolId) => {
    const r = await call("DELETE", `/schools/${schoolId}/logo`);
    if (!r.ok) {
      if (!r.unauthorized) toast.error(r.error || "Could not remove logo");
      return false;
    }
    toast.success("Logo removed");
    await refreshAll();
    return true;
  };

  const resetAdminPassword = async (schoolId, adminId, newPassword) => {
    const r = await call("POST", `/schools/${schoolId}/reset-admin-password`, {
      admin_id: adminId,
      new_password: newPassword,
    });
    if (!r.ok) {
      if (!r.unauthorized) toast.error(r.error || "Password reset failed");
      return false;
    }
    toast.success(r.body.message);
    return true;
  };

  return {
    developer,
    schools,
    stats,
    platform,
    audit,
    loading,
    creating,
    login,
    logout,
    refreshAll,
    fetchAudit,
    createSchool,
    setSchoolStatus,
    updateSchool,
    extendTrial,
    resetAdminPassword,
    uploadSchoolLogo,
    removeSchoolLogo,
    activateSubscription,
    loadSchoolDetail,
    loadActivity,
  };
}
