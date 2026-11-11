import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { BASE_URL } from "../../config/appConfig";

// A separate localStorage key from the school-side "token", so a develop
const DEV_TOKEN_KEY = "dev_signed_in";

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
      // Two-factor sign-in is on: the page asks for the authenticator code next.
      if (data.requires_2fa) return { challenge: data.challenge };
      localStorage.setItem(DEV_TOKEN_KEY, "1");
      localStorage.setItem("dev_profile", JSON.stringify(data.developer));
      navigate("/developer/dashboard");
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Server error");
      return false;
    }
  };

  // Second step: the code from the authenticator app.
  const loginWithCode = async (challenge, code) => {
    try {
      const res = await fetch(`${BASE_URL}/developer/login/2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not sign in");
        return false;
      }
      localStorage.setItem(DEV_TOKEN_KEY, "1");
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
    const url = r.body.admin_login?.login_url;
    toast.success(`School created — code ${r.body.school.school_code}${url ? ` · ${url}` : ""}`, { duration: 8000 });
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

  // ================= TENANT CREATION HELPERS =================
  // Is this initial domain name (tenant ID) free? Used by the creation wizard.
  const checkTenantId = useCallback(
    async (tenantId) => {
      const r = await call("GET", `/tenants/check?tenant_id=${encodeURIComponent(tenantId)}`);
      if (r.ok) return r.body;
      return { available: false, reason: r.error || "Could not check this name" };
    },
    [call],
  );

  // ================= CUSTOM DOMAINS =================
  const loadDomains = useCallback(
    async (schoolId) => {
      const r = await call("GET", `/schools/${schoolId}/domains`);
      return r.ok ? r.body.domains || [] : [];
    },
    [call],
  );

  const addDomain = async (schoolId, domain) => {
    const r = await call("POST", `/schools/${schoolId}/domains`, { domain });
    if (!r.ok) {
      if (!r.unauthorized) toast.error(r.error || "Could not add the domain");
      return false;
    }
    toast.success(r.body.message || "Domain added");
    return true;
  };

  const verifyDomain = async (schoolId, domainId) => {
    const r = await call("POST", `/schools/${schoolId}/domains/${domainId}/verify`);
    if (!r.ok) {
      if (!r.unauthorized) toast.error(r.error || "Verification failed");
      return false;
    }
    if (r.body.verified) toast.success(r.body.message || "Domain verified");
    else toast.error(r.body.message || "Not verified yet");
    return !!r.body.verified;
  };

  const removeDomain = async (schoolId, domainId) => {
    const r = await call("DELETE", `/schools/${schoolId}/domains/${domainId}`);
    if (!r.ok) {
      if (!r.unauthorized) toast.error(r.error || "Could not remove the domain");
      return false;
    }
    toast.success("Domain removed");
    return true;
  };

  // ================= SCHOOL DATABASE HEALTH =================
  const loadDatabase = useCallback(
    async (schoolId) => {
      const r = await call("GET", `/schools/${schoolId}/database`);
      return r.ok ? r.body : null;
    },
    [call],
  );

  const updateDatabase = async (schoolId) => {
    const r = await call("POST", `/schools/${schoolId}/database`);
    if (!r.ok) {
      if (!r.unauthorized) toast.error(r.error || "The update failed");
      return false;
    }
    toast.success(r.body.message || "Database is up to date");
    return true;
  };

  // ================= SIGN-IN PAGE BRANDING =================
  const loadBranding = useCallback(
    async (schoolId) => {
      const r = await call("GET", `/schools/${schoolId}/branding`);
      return r.ok ? r.body.branding : null;
    },
    [call],
  );

  const saveBranding = async (schoolId, fields) => {
    const r = await call("PUT", `/schools/${schoolId}/branding`, fields);
    if (!r.ok) {
      if (!r.unauthorized) toast.error(r.error || "Could not save the sign-in page");
      return null;
    }
    toast.success(r.body.message || "Sign-in page saved");
    return r.body.branding;
  };

  // Images are sent as multipart files, so the JSON header is left out on purpose.
  const uploadBrandingImage = async (schoolId, kind, file) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE_URL}/developer/schools/${schoolId}/branding/${kind}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
      body: form,
    });
    if (handleUnauthorized(res.status)) return null;
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(body.error || "Upload failed");
      return null;
    }
    toast.success(body.message || "Image saved");
    return body.branding;
  };

  const removeBrandingImage = async (schoolId, kind) => {
    const r = await call("DELETE", `/schools/${schoolId}/branding/${kind}`);
    if (!r.ok) {
      if (!r.unauthorized) toast.error(r.error || "Could not remove the image");
      return null;
    }
    toast.success(r.body.message || "Image removed");
    return r.body.branding;
  };

  // ================= EMAIL (SMTP) =================
  const loadPlatformMail = useCallback(async () => {
    const r = await call("GET", "/mail/platform");
    return r.ok ? r.body.smtp : null;
  }, [call]);

  const savePlatformMail = async (fields) => {
    const r = await call("PUT", "/mail/platform", fields);
    if (!r.ok) {
      if (!r.unauthorized) toast.error(r.error || "Could not save the email settings");
      return null;
    }
    toast.success(r.body.message || "Email settings saved");
    return r.body.smtp;
  };

  const testPlatformMail = async (to) => {
    const r = await call("POST", "/mail/platform/test", { to });
    if (!r.ok) {
      if (!r.unauthorized) toast.error(r.error || "Test failed");
      return { sent: false, error: r.error || "Test failed" };
    }
    if (r.body.sent) toast.success(r.body.message);
    else toast.error(r.body.error || "The test email was not sent");
    return r.body;
  };

  const loadSchoolMail = useCallback(
    async (schoolId) => {
      const r = await call("GET", `/schools/${schoolId}/mail`);
      return r.ok ? r.body : null;
    },
    [call],
  );

  const saveSchoolMail = async (schoolId, fields) => {
    const r = await call("PUT", `/schools/${schoolId}/mail`, fields);
    if (!r.ok) {
      if (!r.unauthorized) toast.error(r.error || "Could not save the email settings");
      return null;
    }
    toast.success(r.body.message || "Email settings saved");
    return r.body.smtp;
  };

  const testSchoolMail = async (schoolId, to) => {
    const r = await call("POST", `/schools/${schoolId}/mail/test`, { to });
    if (!r.ok) {
      if (!r.unauthorized) toast.error(r.error || "Test failed");
      return { sent: false, error: r.error || "Test failed" };
    }
    if (r.body.sent) toast.success(r.body.message);
    else toast.error(r.body.error || "The test email was not sent");
    return r.body;
  };

  const removeSchoolMail = async (schoolId) => {
    const r = await call("DELETE", `/schools/${schoolId}/mail`);
    if (!r.ok) {
      if (!r.unauthorized) toast.error(r.error || "Could not remove the settings");
      return false;
    }
    toast.success(r.body.message || "Removed");
    return true;
  };

  // ================= BROADCASTS TO SCHOOLS =================
  const loadBroadcasts = useCallback(async () => {
    const r = await call("GET", "/broadcasts");
    return r.ok ? r.body.broadcasts || [] : [];
  }, [call]);

  const loadBroadcast = useCallback(
    async (id) => {
      const r = await call("GET", `/broadcasts/${id}`);
      return r.ok ? r.body.broadcast : null;
    },
    [call],
  );

  const sendBroadcast = async (fields) => {
    const r = await call("POST", "/broadcasts", fields);
    if (!r.ok) {
      if (!r.unauthorized) toast.error(r.error || "Could not send the message");
      return null;
    }
    toast.success(r.body.message || "Message queued");
    return r.body.broadcast;
  };

  // ================= SETTINGS (.env) AND SERVICE =================
  const loadSettings = useCallback(async () => {
    const r = await call("GET", "/settings");
    return r.ok ? r.body : null;
  }, [call]);

  // Returns { ok, body, error }; the window shows the field errors itself.
  const saveSettings = async (file, changes, password) => {
    const r = await call("PUT", "/settings", { file, changes, current_password: password });
    return { ok: !!r.ok, body: r.body || {}, error: r.error };
  };

  const applySettings = async (password) => {
    const r = await call("POST", "/settings/apply", { current_password: password });
    return { ok: !!r.ok, body: r.body || {}, error: r.error };
  };

  const reloadService = async (password) => {
    const r = await call("POST", "/service/reload", { current_password: password });
    return { ok: !!r.ok, body: r.body || {}, error: r.error };
  };

  // Sets the plan and, for Custom, the dashboards. Returns { ok, body, error }.
  const savePlan = async (schoolId, plan, customDashboards) => {
    const r = await call("PUT", `/schools/${schoolId}/plan`, { plan, custom_dashboards: customDashboards });
    if (!r.ok) {
      if (!r.unauthorized) toast.error(r.error || "Could not change the plan");
      return { ok: false, body: r.body || {}, error: r.error };
    }
    return { ok: true, body: r.body || {}, error: null };
  };

  // Two-factor sign-in for the platform owner (authenticator app).
  const twoFactor = {
    status: () => call("GET", "/2fa"),
    start: () => call("POST", "/2fa"),
    enable: (code) => call("PUT", "/2fa", { code }),
    disable: (password, code) => call("DELETE", "/2fa", { password, code }),
  };

  return {
    twoFactor,
    savePlan,
    loadSettings,
    saveSettings,
    applySettings,
    reloadService,
    loadPlatformMail,
    savePlatformMail,
    testPlatformMail,
    loadSchoolMail,
    saveSchoolMail,
    testSchoolMail,
    removeSchoolMail,
    loadBroadcasts,
    loadBroadcast,
    sendBroadcast,
    loadBranding,
    saveBranding,
    uploadBrandingImage,
    removeBrandingImage,
    checkTenantId,
    loadDomains,
    addDomain,
    verifyDomain,
    removeDomain,
    loadDatabase,
    updateDatabase,
    developer,
    schools,
    stats,
    platform,
    audit,
    loading,
    creating,
    login,
    loginWithCode,
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
