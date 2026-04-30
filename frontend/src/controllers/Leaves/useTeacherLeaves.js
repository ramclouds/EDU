import { useEffect, useState } from "react";

const BASE_URL = "http://localhost:5000/api";

export function useTeacherLeaves({
  activeSection,
  fetchWithAuth,
  showToast,
}) {
  // =========================
  // COMMON LEAVE STATE
  // =========================
  const [leaveLoading, setLeaveLoading] = useState(false);

  const [leaveFilter, setLeaveFilter] = useState("all");
  const [leaveSearch, setLeaveSearch] = useState("");

  // =========================
  // STUDENT LEAVES
  // =========================
  const [allStudentLeaves, setAllStudentLeaves] = useState([]);

  const fetchAllStudentLeaves = async () => {
    try {
      setLeaveLoading(true);

      const res = await fetchWithAuth(
        `${BASE_URL}/admin/student/leaves`
      );

      const data = await res.json();
      setAllStudentLeaves(data || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load student leaves", "error");
    } finally {
      setLeaveLoading(false);
    }
  };

  const updateLeaveStatus = async (leaveId, status) => {
    try {
      const res = await fetchWithAuth(
        `${BASE_URL}/admin/student/leave/${leaveId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      if (res.ok) {
        fetchAllStudentLeaves();
        showToast(`Leave ${status}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLeave = async (id, status) => {
    await updateLeaveStatus(id, status);
    fetchAllStudentLeaves();
  };

  useEffect(() => {
    window.approveLeave = (btn) => {
      const leaveId = btn.closest("[data-id]")?.dataset.id;
      if (leaveId) updateLeaveStatus(leaveId, "Approved");
    };

    window.rejectLeave = (btn) => {
      const leaveId = btn.closest("[data-id]")?.dataset.id;
      if (leaveId) updateLeaveStatus(leaveId, "Rejected");
    };

    return () => {
      delete window.approveLeave;
      delete window.rejectLeave;
    };
  }, []);

  useEffect(() => {
    if (activeSection !== "studentLeave") return;
    fetchAllStudentLeaves();
  }, [activeSection]);

  const filteredLeaves = (allStudentLeaves || [])
    .filter((l) => {
      if (leaveFilter === "all") return true;
      return l.status === leaveFilter;
    })
    .filter((l) => {
      if (!leaveSearch.trim()) return true;

      const search = leaveSearch.toLowerCase();

      return (
        (l.student_name || "")
          .toLowerCase()
          .includes(search) ||
        String(l.student_id).includes(search)
      );
    });


  // =========================
  // TEACHER LEAVES
  // =========================
  const [leaveBalance, setLeaveBalance] = useState({
    casual_leave: 0,
    sick_leave: 0,
    used_leave: 0,
  });

  const [leaveHistory, setLeaveHistory] = useState([]);

  const [leaveForm, setLeaveForm] = useState({
    from_date: "",
    to_date: "",
    leave_type: "CL",
    reason: "",
  });

  const fetchLeaveData = async () => {
    try {
      setLeaveLoading(true);

      const [balanceRes, historyRes] = await Promise.all([
        fetchWithAuth(`${BASE_URL}/teacher/leave/balance`),
        fetchWithAuth(`${BASE_URL}/teacher/leave/history`),
      ]);

      const balanceData = await balanceRes.json();
      const historyData = await historyRes.json();

      setLeaveBalance(balanceData);
      setLeaveHistory(historyData.leaves || []);

    } catch (err) {
      console.error(err);
      showToast("Failed to load leave data", "error");
    } finally {
      setLeaveLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection !== "teacherLeave") return;

    fetchLeaveData();

    const interval = setInterval(
      fetchLeaveData,
      10000
    );

    return () => clearInterval(interval);

  }, [activeSection]);

  const handleLeaveChange = (e) => {
    const { id, value } = e.target;

    setLeaveForm((prev) => ({
      ...prev,
      [id === "leaveFrom"
        ? "from_date"
        : id === "leaveTo"
        ? "to_date"
        : id === "leaveType"
        ? "leave_type"
        : "reason"]: value,
    }));
  };

  const calculateDays = () => {
    const { from_date, to_date } = leaveForm;

    if (!from_date || !to_date) return 0;

    const from = new Date(from_date);
    const to = new Date(to_date);

    const diff =
      (to - from) /
        (1000 * 60 * 60 * 24) +
      1;

    return diff > 0 ? diff : 0;
  };

  const handleApplyLeave = async () => {
    try {
      if (
        !leaveForm.from_date ||
        !leaveForm.to_date
      ) {
        showToast("Select dates", "error");
        return;
      }

      const res = await fetchWithAuth(
        `${BASE_URL}/teacher/leave/apply`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            leaveForm
          ),
        }
      );

      const data = await res.json();

      if (res.ok) {
        showToast(
          "Leave applied successfully"
        );

        setLeaveForm({
          from_date: "",
          to_date: "",
          leave_type: "CL",
          reason: "",
        });

        await fetchLeaveData();
      } else {
        showToast(
          data.error ||
            "Failed to apply leave",
          "error"
        );
      }

    } catch (err) {
      console.error(err);
      showToast(
        "Something went wrong",
        "error"
      );
    }
  };

  return {
    // shared loading
    leaveLoading,

    // student leaves
    allStudentLeaves,
    filteredLeaves,
    leaveFilter,
    setLeaveFilter,
    leaveSearch,
    setLeaveSearch,
    updateLeaveStatus,
    handleUpdateLeave,

    // teacher leaves
    leaveBalance,
    leaveHistory,
    leaveForm,
    setLeaveForm,
    handleLeaveChange,
    calculateDays,
    handleApplyLeave,
    fetchLeaveData,
  };
}