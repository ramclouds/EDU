import { useState, useEffect } from "react";
import { BASE_URL } from "../../config/appConfig";

export function useStudentAssignments(fetchWithAuth, showToast) {
  const [assignments, setAssignments] = useState([]);
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState({});

  const [assignmentCounts, setAssignmentCounts] = useState({
    all: 0,
    new: 0,
    pending: 0,
    late: 0,
    submitted: 0,
    recheck: 0, // ✅ NEW
  });

  // 🔐 Get user
  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  };

  // ================= FETCH =================
  const fetchAssignments = async () => {
    const user = getUser();
    if (!user) return;

    try {
      setAssignmentLoading(true);

      const res = await fetchWithAuth(
        `${BASE_URL}/assignments/${user.id}`
      );

      const data = await res.json();
      const list = data.assignments || [];

      setAssignments(list);

      // ✅ UPDATED COUNTS
      setAssignmentCounts({
        all: list.length,
        new: list.filter(a => a.status === "New").length,
        pending: list.filter(a => a.status === "New").length,
        late: list.filter(
          a => a.status === "Late" || a.status === "Late Submitted"
        ).length,
        submitted: list.filter(
          a => a.status === "Submitted" || a.status === "Late Submitted"
        ).length,

        // ✅ NEW
        resubmit: list.filter(
          a => a.status === "Needs Resubmission"
        ).length,
      });

    } catch (err) {
      console.error(err);
      showToast("Failed to load assignments", "error");
    } finally {
      setAssignmentLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  // ================= SEARCH =================
  const filteredAssignments = assignments.filter(a =>
    a.title?.toLowerCase().includes(assignmentSearch.toLowerCase())
  );

  // ================= FILE =================
  const handleFileChange = (assignmentId, file) => {
    setSelectedFiles(prev => ({
      ...prev,
      [assignmentId]: file,
    }));
  };

  // ================= FILTER =================
  const filterAssignments = (tab) => {
    if (tab === "all") return filteredAssignments;

    return filteredAssignments.filter(a => {
      if (tab === "pending") return a.status === "New";
      if (tab === "submitted") return a.status === "Submitted";
      if (tab === "late") return a.status.includes("Late");
      if (tab === "resubmit")
        return (
          a.status === "Needs Resubmission" ||
          a.status === "Resubmit" ||
          a.status === "Recheck"
        ); // ✅
      return true;
    });
  };

  // ================= SUBMIT =================
  const submitAssignment = async (assignmentId) => {
    const user = getUser();
    const file = selectedFiles[assignmentId];

    if (!file) {
      showToast("Please select a file", "error");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetchWithAuth(
        `${BASE_URL}/assignments/submit/${user.id}/${assignmentId}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

      if (res.ok) {
        showToast("Assignment submitted successfully ✅");

        fetchAssignments();

        setSelectedFiles(prev => ({
          ...prev,
          [assignmentId]: null,
        }));

      } else {
        showToast(data.error || "Submission failed", "error");
      }

    } catch (err) {
      console.error(err);
      showToast("Upload failed", "error");
    }
  };

  return {
    assignments: filteredAssignments,
    assignmentSearch,
    setAssignmentSearch,
    assignmentCounts,
    assignmentLoading,
    fetchAssignments,

    selectedFiles,
    handleFileChange,

    filterAssignments,
    submitAssignment,
  };
}