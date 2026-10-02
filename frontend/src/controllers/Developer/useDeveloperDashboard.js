import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { BASE_URL } from "../../config/appConfig";

// Deliberately a different localStorage key from the school-side "token" —
// a Developer session and a school user's session must never be mixable,
// and using the same key would let one silently clobber the other if
// both were ever open in the same browser.
const DEV_TOKEN_KEY = "dev_token";

export function useDeveloperDashboard() {
  const navigate = useNavigate();

  const [developer, setDeveloper] = useState(null);
  const [schools, setSchools] = useState([]);
  const [stats, setStats] = useState(null);
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

  // ================= DATA =================
  const fetchSchools = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/developer/schools`, {
        headers: authHeaders(),
      });
      if (handleUnauthorized(res.status)) return;
      const data = await res.json();
      if (res.ok) setSchools(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load schools");
    }
  }, [authHeaders, handleUnauthorized]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/developer/stats`, {
        headers: authHeaders(),
      });
      if (handleUnauthorized(res.status)) return;
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch (err) {
      console.error(err);
    }
  }, [authHeaders, handleUnauthorized]);

  useEffect(() => {
    const stored = localStorage.getItem("dev_profile");
    if (stored) {
      try {
        setDeveloper(JSON.parse(stored));
      } catch {
        // ignore malformed cache
      }
    }

    (async () => {
      setLoading(true);
      await Promise.all([fetchSchools(), fetchStats()]);
      setLoading(false);
    })();
  }, [fetchSchools, fetchStats]);

  const createSchool = async (payload) => {
    setCreating(true);
    try {
      const res = await fetch(`${BASE_URL}/developer/schools`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (handleUnauthorized(res.status)) return null;
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create school");
        return null;
      }

      toast.success(`School created — code ${data.school.school_code}`);
      await Promise.all([fetchSchools(), fetchStats()]);
      return data;
    } catch (err) {
      console.error(err);
      toast.error("Server error");
      return null;
    } finally {
      setCreating(false);
    }
  };

  const setSchoolStatus = async (schoolId, action) => {
    try {
      const res = await fetch(
        `${BASE_URL}/developer/schools/${schoolId}/status`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ action }),
        },
      );
      if (handleUnauthorized(res.status)) return;
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return;
      }

      toast.success(data.message || "Updated");
      await Promise.all([fetchSchools(), fetchStats()]);
    } catch (err) {
      console.error(err);
      toast.error("Server error");
    }
  };

  return {
    developer,
    schools,
    stats,
    loading,
    creating,
    login,
    logout,
    createSchool,
    setSchoolStatus,
  };
}
