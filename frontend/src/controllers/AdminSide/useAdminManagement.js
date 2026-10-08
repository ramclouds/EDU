import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { BASE_URL } from "../../config/appConfig";

export const ADMIN_TYPES = [
  "Super Admin",
  "Academic Admin",
  "Library Admin",
  "Accounts Admin",
  "Hostel Admin",
  "HR Admin",
];

// Deliberately does NOT take fetchWithAuth as a parameter and instead
// reads the token directly (matching useLibraryOverview.js's pattern).
// fetchWithAuth in this codebase's dashboard hooks is a plain function,
// not wrapped in useCallback, so it's a new reference every render —
// depending on it here caused fetchAdmins -> useEffect -> setState ->
// re-render -> new fetchWithAuth -> fetchAdmins changes again -> infinite
// loop ("Maximum update depth exceeded", /api/admin/list firing
// continuously). Building a self-contained fetch avoids that entirely.
function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

export function useAdminManagement() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/admin/list`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setAdmins(data);
      } else {
        toast.error(data.error || "Failed to load admins");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load admins");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const createAdmin = async (payload) => {
    setCreating(true);
    try {
      const res = await fetch(`${BASE_URL}/admin/create`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create admin");
        return null;
      }

      toast.success(
        `${payload.admin_type} account created for ${payload.first_name}`,
      );
      await fetchAdmins();
      return data;
    } catch (err) {
      console.error(err);
      toast.error("Server error");
      return null;
    } finally {
      setCreating(false);
    }
  };

  return { admins, loading, creating, createAdmin, refetchAdmins: fetchAdmins };
}
