import { useEffect, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

export function useStudentLeaves({
  activeSection,
  fetchWithAuth,
  showToast,
}) {
  // ================= STATE =================
  const [leaveForm, setLeaveForm] = useState({
    from_date: "",
    to_date: "",
    reason: "",
    leave_type: "Casual",
  });

  const [studentLeaves, setStudentLeaves] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [totalDays, setTotalDays] = useState(0);


  // 🔐 AUTH HELPERS
  const getAuth = () => {
    try {
      return {
        user: JSON.parse(localStorage.getItem("user")),
        token: localStorage.getItem("token"),
      };
    } catch {
      return { user: null, token: null };
    }
  };

  // ================= FETCH LEAVES =================
  const fetchStudentLeaves = async () => {
    const { user } = getAuth();

    try {
      setLeaveLoading(true);

      const res = await fetchWithAuth(
        `${BASE_URL}/student/leave/history`
      );

      const data = await res.json();

      setStudentLeaves(data || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load leaves", "error");
    } finally {
      setLeaveLoading(false);
    }
  };

  // ================= APPLY LEAVE =================
  const applyLeave = async () => {
    const { user } = getAuth();

    if (!leaveForm.from_date || !leaveForm.to_date || !leaveForm.reason) {
      showToast("All fields required", "error");
      return;
    }

    try {
      const res = await fetchWithAuth(`${BASE_URL}/student/leave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...leaveForm,
          leave_type: leaveForm.leave_type, // ✅ use selected value
        }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast("Leave applied successfully");

        setLeaveForm({
          from_date: "",
          to_date: "",
          reason: "",
          leave_type: "Casual", // optional default reset
        });

        fetchStudentLeaves();
      } else {
        showToast(data.error || "Failed", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error applying leave", "error");
    }
  };
  //  HANDLE INPUT 
  const handleLeaveChange = (e) => {
    setLeaveForm({
      ...leaveForm,
      [e.target.name]: e.target.value,
    });
  };

  //  LOAD ON SECTION 
  useEffect(() => {
    if (activeSection !== "leaves") return;
    fetchStudentLeaves();
  }, [activeSection]);

  //  CALCULATE DAYS 
  useEffect(() => {
    if (leaveForm.from_date && leaveForm.to_date) {
      const from = new Date(leaveForm.from_date);
      const to = new Date(leaveForm.to_date);

      if (from <= to) {
        const diff = (to - from) / (1000 * 60 * 60 * 24) + 1;
        setTotalDays(diff);
      }
    }
  }, [leaveForm]);

  // Delete Pending leave
  const deleteLeave = async (id) => {
    try {
      const res = await fetchWithAuth(
        `${BASE_URL}/student/leave/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      let data = {};
      const text = await res.text();

      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        data = {};
      }

      if (res.ok) {
        showToast("Leave deleted successfully");
        fetchStudentLeaves(); // refresh list
      } else {
        showToast(data.error || "Failed to delete", "error");
      }

    } catch (err) {
      console.error(err);
      showToast("Server error", "error");
    }
  };

  return {
    // state
    leaveForm,
    studentLeaves,
    leaveLoading,
    totalDays,

    // actions
    setLeaveForm,
    handleLeaveChange,
    applyLeave,
    deleteLeave,
    fetchStudentLeaves,
  };
}
