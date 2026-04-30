import { useState, useEffect } from "react";
import { BASE_URL } from "../../config/appConfig";

export function useTeacherAssignments(
  activeSection,
  fetchWithAuth,
  showToast
) {
  const [studentSearch, setStudentSearch] = useState("");
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    description: "",
    academic_class_id: "",
    subject_id: "",
    assigned_date: "",
    due_date: "",
    total_marks: 100,
    file: null
  });

  const [selectedAssignment, setSelectedAssignment] =
    useState(null);

  const [submissionTab, setSubmissionTab] =
    useState("submitted");

  const [gradingData, setGradingData] = useState({});

  const [assignmentSubmissions, setAssignmentSubmissions] =
    useState([]);

  const [submissionLoading, setSubmissionLoading] =
    useState(false);


  const getAuth = () => {
    try {
      return {
        user: JSON.parse(localStorage.getItem("user")),
      };
    } catch {
      return { user: null };
    }
  };



  // ================= FETCH CLASSES =================
  const fetchAssignedClasses = async () => {
    try {
      const { user } = getAuth();
      if (!user) return;

      const res = await fetchWithAuth(
        `${BASE_URL}/teacher/${user.id}/assigned-classes`
      );

      const data = await res.json();

      setAssignedClasses(data || []);

    } catch (err) {
      console.error(err);
    }
  };


  // ================= FETCH ASSIGNMENTS =================
  const fetchTeacherAssignments = async () => {

    try {
      const { user } = getAuth();

      setAssignmentLoading(true);

      const res = await fetchWithAuth(
        `${BASE_URL}/teacher/${user.id}/assignments`
      );

      const data = await res.json();

      setTeacherAssignments(data || []);

    } catch (err) {

      console.error(err);

      showToast(
        "Failed loading assignments",
        "error"
      );

    } finally {
      setAssignmentLoading(false);
    }
  };


  useEffect(() => {

    if (activeSection !== "assignments") return;

    fetchAssignedClasses();
    fetchTeacherAssignments();
    return;

  }, [activeSection]);


  // ================= FORM CHANGE =================
  const handleAssignmentChange = (e) => {

    const { name, value, files } = e.target;

    if (files) {
      setAssignmentForm(prev => ({
        ...prev,
        [name]: files[0]
      }));
      return;
    }

    setAssignmentForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // ================= CLASS SELECT =================
  const handleClassSelect = (classId) => {

    const relatedSubjects = assignedClasses.filter(
      c => String(c.academic_class_id) === String(classId)
    );

    setAssignmentForm(prev => ({
      ...prev,
      academic_class_id: classId,
      subject_id:
        relatedSubjects.length === 1
          ? relatedSubjects[0].subject_id
          : ""
    }));
  };

  // ================= CREATE ASSIGNMENT =================
  const handleCreateAssignment = async () => {

    try {

      const { user } = getAuth();

      const formData = new FormData();

      Object.entries(assignmentForm).forEach(
        ([key, val]) => {
          if (
            val !== null &&
            val !== ""
          ) {
            formData.append(key, val);
          }
        });

      const url = editingAssignment
        ? `${BASE_URL}/teacher/${user.id}/assignments/${editingAssignment.id}`
        : `${BASE_URL}/teacher/${user.id}/assignments/create`;

      const res = await fetchWithAuth(
        url,
        {
          method: editingAssignment ? "PUT" : "POST",
          body: formData
        }
      );

      if (!res.ok) {
        throw new Error(
          "Save failed"
        );
      }

      showToast(
        editingAssignment
          ? "Assignment updated"
          : "Assignment created"
      );

      setShowModal(false);

      setEditingAssignment(null);

      setAssignmentForm({
        title: "",
        description: "",
        academic_class_id: "",
        subject_id: "",
        assigned_date: "",
        due_date: "",
        total_marks: 100,
        file: null
      });

      fetchTeacherAssignments();

    } catch (err) {
      console.error(err);

      showToast(
        "Failed saving assignment",
        "error"
      );
    }

  };

  // ================= EDIT ASSIGNMENT =================
  const handleEditAssignment = (assignment) => {

    setEditingAssignment(assignment);

    setAssignmentForm({
      title: assignment.title || "",
      description: assignment.description || "",
      academic_class_id: assignment.academic_class_id || "",
      subject_id: assignment.subject_id || "",
      assigned_date: assignment.assigned_date || "",
      due_date: assignment.due_date || "",
      total_marks: assignment.total_marks || 100,
      file: null
    });

    setShowModal(true);
  };


  // ================= SUBMISSIONS =================
  const fetchAssignmentSubmissions = async (assignmentId) => {
    try {
      setSubmissionLoading(true);

      const res = await fetchWithAuth(
        `${BASE_URL}/assignments/${assignmentId}/submissions`
      );

      const data = await res.json();

      setAssignmentSubmissions(data || []);

      // ✅ AUTO FILL GRADING DATA (FIXED)
      const prefill = {};

      (data || []).forEach((s) => {
        if (s.marks_obtained === null) {
          prefill[s.id] = {
            marks: "",
            feedback: "",
          };
        }
      });

      setGradingData(prefill);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmissionLoading(false);
    }
  };


  const openAssignmentDetails = (assignment) => {
    setSelectedAssignment(assignment);
    fetchAssignmentSubmissions(assignment.id);
  };

  // ================= GRADING =================
  const gradeSubmission = async (
    submissionId,
    marks,
    feedback = ""
  ) => {

    try {

      const res = await fetchWithAuth(
        `${BASE_URL}/submissions/${submissionId}/grade`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            marks,
            feedback
          })
        }
      );

      if (res.ok) {

        showToast("Marks saved");

        fetchAssignmentSubmissions(
          selectedAssignment.id
        );

      }

    } catch (err) {
      console.error(err);
    }

  };

  // delete handler
  const handleDeleteAssignment = async (id) => {
    if (
      !window.confirm(
        "Delete assignment?"
      )
    ) return;

    try {
      const { user } = getAuth();

      const res = await fetchWithAuth(
        `${BASE_URL}/teacher/${user.id}/assignments/${id}`,
        {
          method: "DELETE"
        }
      );

      if (res.ok) {
        showToast("Deleted");
        fetchTeacherAssignments();
      }

    } catch (err) {
      showToast(
        "Delete failed",
        "error"
      );
    }
  };


  // ================= PROGRESS =================
  const assignmentProgress = (a) => {
    const total = (a.submitted || 0) + (a.pending || 0);

    if (!total) return 0;

    return Math.round((a.submitted / total) * 100);
  };

  // ================= HELPERS =================
  const submittedStudents =
    assignmentSubmissions.filter(
      s => !!s.submission_file_url
    );

  const pendingStudents =
    assignmentSubmissions.filter(
      s => !s.submission_file_url
    );

  const saveGrade = async (sub) => {
    // 🔥 Prevent overwrite if already graded
    if (sub.marks_obtained !== null) {
      showToast("Already graded", "error");
      return;
    }

    const marks = gradingData[sub.id]?.marks || "";
    const feedback = gradingData[sub.id]?.feedback || "";

    if (!marks) {
      showToast("Enter marks", "error");
      return;
    }

    await gradeSubmission(sub.id, marks, feedback);
  };

  const forceResubmit = async (submissionId) => {
    try {
      const res = await fetchWithAuth(
        `${BASE_URL}/assignments/recheck/${submissionId}`, // ✅ FIXED URL
        {
          method: "POST", // ✅ FIXED METHOD
        }
      );

      if (res.ok) {
        showToast("Marked for recheck ✅");

        // 🔄 refresh modal data
        fetchAssignmentSubmissions(selectedAssignment.id);

        // 🔄 optional: refresh dashboard list
        silentRefreshAssignments();
      } else {
        showToast("Failed to mark recheck", "error");
      }

    } catch (e) {
      console.error(e);
      showToast("Error requesting recheck", "error");
    }
  };

  // soft refresh helper
  const silentRefreshAssignments = async () => {
    try {
      const { user } = getAuth();
      if (!user) return;

      const res = await fetchWithAuth(
        `${BASE_URL}/teacher/${user.id}/assignments`
      );

      const data = await res.json(); // ✅ FIX: define data here

      setTeacherAssignments(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  return {

    // ---------------- UI STATE ----------------
    showModal,
    setShowModal,

    selectedAssignment,
    setSelectedAssignment,

    editingAssignment,
    setEditingAssignment,

    submissionTab,
    setSubmissionTab,

    assignmentLoading,
    submissionLoading,

    // ---------------- DATA ----------------
    teacherAssignments,
    assignedClasses,
    assignmentSubmissions,

    assignmentForm,
    setAssignmentForm,

    gradingData,
    setGradingData,

    // ---------------- DERIVED ----------------
    submittedStudents,
    pendingStudents,

    // ---------------- ASSIGNMENT ACTIONS ----------------
    handleAssignmentChange,
    handleClassSelect,

    handleCreateAssignment,
    handleEditAssignment,
    handleDeleteAssignment,

    // ---------------- SUBMISSION ACTIONS ----------------
    openAssignmentDetails,
    gradeSubmission,
    saveGrade,
    forceResubmit,
    studentSearch,
    setStudentSearch,
    // ---------------- FETCHERS ----------------
    fetchTeacherAssignments,
    fetchAssignmentSubmissions,

    // ---------------- HELPERS ----------------
    assignmentProgress

  };
}
