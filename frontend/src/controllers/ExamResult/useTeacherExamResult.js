// src/hooks/teacher/useTeacherExamResult.js

import { useEffect, useMemo, useState } from "react";
import { BASE_URL } from "../../config/appConfig";
import { DEFAULT_EXAM_MARKS } from "../../config/ExamConfig";

export function useTeacherExamResult(
  fetchWithAuth,
  activeSection,
  showToast
) {
  // ========================= STATE =========================
  const [loading, setLoading] = useState(false);

  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);

  const [selectedClass, setSelectedClass] =
    useState("all");

  const [selectedSubject, setSelectedSubject] =
    useState("");

  const [selectedExam, setSelectedExam] =
    useState("Unit Test 1");

  const [search, setSearch] = useState("");

  // ========================= MODALS =========================
  const [marksModalOpen, setMarksModalOpen] =
    useState(false);

  const [reportModalOpen, setReportModalOpen] =
    useState(false);

  // ========================= CURRENT STUDENT =========================
  const [currentStudentIndex, setCurrentStudentIndex] =
    useState(0);

  const [currentStudent, setCurrentStudent] =
    useState(null);

  // ========================= MARKS =========================
  const [marks, setMarks] = useState({
    internal: "",
    external: "",
    oral: "",
    practical: "",

    ...DEFAULT_EXAM_MARKS,

    remarks: "",
  });
  // ========================= REPORT CARD =========================
  const [reportCard, setReportCard] =
    useState(null);

  // ========================= GET USER =========================
  const getUser = () => {
    try {
      return JSON.parse(
        localStorage.getItem("user")
      );
    } catch {
      return null;
    }
  };

  // ========================= FILTERED STUDENTS =========================
  const filteredStudents = useMemo(() => {
    if (!Array.isArray(students)) return [];

    return students.filter((student) => {
      const matchClass =
        selectedClass === "all" ||
        student.className === selectedClass;

      const matchSearch = student.name
        ?.toLowerCase()
        ?.includes(search.toLowerCase());

      return matchClass && matchSearch;
    });
  }, [students, selectedClass, search]);

  // ========================= FETCH DATA =========================
  useEffect(() => {
    if (activeSection !== "exams") return;

    const user = getUser();

    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const [studentRes, subjectRes, classRes] =
          await Promise.all([
            fetchWithAuth(
              `${BASE_URL}/teacher/students?teacher_id=${user.id}`
            ),

            fetchWithAuth(
              `${BASE_URL}/teacher/subjects?teacher_id=${user.id}`
            ),

            fetchWithAuth(
              `${BASE_URL}/teacher/classes?teacher_id=${user.id}`
            ),
          ]);

        const studentData =
          await studentRes.json();

        const subjectData =
          await subjectRes.json();

        const classData =
          await classRes.json();

        // console.log(
        //   "Teacher Students =>",
        //   studentData
        // );

        // console.log(
        //   "Teacher Subjects =>",
        //   subjectData
        // );

        // console.log(
        //   "Teacher Classes =>",
        //   classData
        // );

        // ================= SAFE ARRAY =================
        const safeStudents = Array.isArray(
          studentData
        )
          ? studentData
          : [];

        const safeSubjects = Array.isArray(
          subjectData
        )
          ? subjectData
          : [];

        const safeClasses = Array.isArray(
          classData
        )
          ? classData
          : [];

        setStudents(safeStudents);
        setSubjects(safeSubjects);
        setClasses(safeClasses);

        // ================= DEFAULT SUBJECT =================
        if (
          safeSubjects.length > 0 &&
          !selectedSubject
        ) {
          setSelectedSubject(
            safeSubjects[0]?.name || ""
          );
        }

        // ================= DEFAULT CLASS =================
        if (
          safeClasses.length > 0 &&
          selectedClass === "all"
        ) {
          setSelectedClass("all");
        }
      } catch (err) {
        console.error(err);

        setStudents([]);
        setSubjects([]);
        setClasses([]);

        showToast(
          "Failed to load exam data",
          "error"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeSection]);

  // ========================= OPEN MARKS MODAL =========================
  const openMarksModal = async (
    student,
    index = 0
  ) => {
    try {
      if (!student) return;

      setCurrentStudent(student);

      setCurrentStudentIndex(index);

      setMarksModalOpen(true);

      const res = await fetchWithAuth(
        `${BASE_URL}/teacher/marks/${student.id}?subject=${selectedSubject}&exam=${selectedExam}`
      );

      const data = await res.json();

      setMarks({
        internal: data?.internal || "",
        external: data?.external || "",
        oral: data?.oral || "",
        practical: data?.practical || "",

        internalOutOf:
          data?.internalOutOf ||
          DEFAULT_EXAM_MARKS.internalOutOf,

        externalOutOf:
          data?.externalOutOf ||
          DEFAULT_EXAM_MARKS.externalOutOf,

        oralOutOf:
          data?.oralOutOf ||
          DEFAULT_EXAM_MARKS.oralOutOf,

        practicalOutOf:
          data?.practicalOutOf ||
          DEFAULT_EXAM_MARKS.practicalOutOf,

        remarks: data?.remarks || "",
      });
    } catch (err) {
      console.error(err);

      setMarks({
        internal: "",
        external: "",
        oral: "",
        practical: "",

        ...DEFAULT_EXAM_MARKS,

        remarks: "",
      });

      showToast(
        "Failed to load marks",
        "error"
      );
    }
  };

  // ========================= CLOSE MARKS MODAL =========================
  const closeMarksModal = () => {
    setMarksModalOpen(false);

    setMarks({
      internal: "",
      external: "",
      oral: "",
      practical: "",

      ...DEFAULT_EXAM_MARKS,

      remarks: "",
    });
  };

  // ========================= MARK CHANGE =========================
  const handleMarkChange = (e) => {
    const { name, value } = e.target;

    // ================= EMPTY VALUE =================
    if (value === "") {
      setMarks((prev) => ({
        ...prev,
        [name]: "",
      }));

      return;
    }

    // ================= ONLY POSITIVE =================
    if (Number(value) < 0) {
      showToast(
        "Negative marks not allowed",
        "error"
      );

      return;
    }

    // ================= MAX VALIDATION =================
    const validations = {
      internal: Number(marks.internalOutOf),
      external: Number(marks.externalOutOf),
      oral: Number(marks.oralOutOf),
      practical: Number(marks.practicalOutOf),
    };

    if (
      validations[name] !== undefined &&
      Number(value) > validations[name]
    ) {
      showToast(
        `${name} marks cannot exceed OutOf`,
        "error"
      );

      return;
    }

    setMarks((prev) => ({
      ...prev,
      [name]: value,
    }));
  };


  // ========================= TOTAL =========================
  const totalMarks =
    Number(marks.internal || 0) +
    Number(marks.external || 0) +
    Number(marks.oral || 0) +
    Number(marks.practical || 0);

  const totalOutOf =
    Number(marks.internalOutOf || 0) +
    Number(marks.externalOutOf || 0) +
    Number(marks.oralOutOf || 0) +
    Number(marks.practicalOutOf || 0);

  // ========================= PERCENTAGE =========================
  const percentage =
    totalOutOf > 0
      ? ((totalMarks / totalOutOf) * 100).toFixed(1)
      : "0.0";

  // ========================= GRADE =========================
  const grade = (() => {
    const p = Number(percentage);

    if (p >= 90) return "A+";
    if (p >= 80) return "A";
    if (p >= 70) return "B+";
    if (p >= 60) return "B";
    if (p >= 50) return "C";
    if (p >= 35) return "Pass";

    return "Fail";
  })();

  // ========================= SAVE MARKS =========================
  const saveMarks = async () => {
    try {
      if (!currentStudent) {
        showToast("No student selected", "error");
        return;
      }

      // ================= VALIDATION: NEGATIVE MARKS =================
      if (
        Number(marks.internal) < 0 ||
        Number(marks.external) < 0 ||
        Number(marks.oral) < 0 ||
        Number(marks.practical) < 0
      ) {
        showToast("Marks cannot be negative", "error");
        return;
      }

      // ================= VALIDATION: OUT OF LIMIT CHECK =================
      if (Number(marks.internal) > Number(marks.internalOutOf)) {
        showToast("Internal marks cannot exceed OutOf marks", "error");
        return;
      }

      if (Number(marks.external) > Number(marks.externalOutOf)) {
        showToast("External marks cannot exceed OutOf marks", "error");
        return;
      }

      if (Number(marks.oral) > Number(marks.oralOutOf)) {
        showToast("Oral marks cannot exceed OutOf marks", "error");
        return;
      }

      if (Number(marks.practical) > Number(marks.practicalOutOf)) {
        showToast("Practical marks cannot exceed OutOf marks", "error");
        return;
      }

      // ================= API CALL =================
      await fetchWithAuth(`${BASE_URL}/teacher/marks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: currentStudent.id,
          subject: selectedSubject,
          examType: selectedExam,
          internal: Number(marks.internal || 0),
          external: Number(marks.external || 0),
          oral: Number(marks.oral || 0),
          practical: Number(marks.practical || 0),

          internalOutOf: Number(
            marks.internalOutOf || 0
          ),

          externalOutOf: Number(
            marks.externalOutOf || 0
          ),

          oralOutOf: Number(
            marks.oralOutOf || 0
          ),

          practicalOutOf: Number(
            marks.practicalOutOf || 0
          ),
          remarks: marks.remarks,
          total: totalMarks,
          percentage,
          grade,
        }),
      });

      showToast("Marks saved successfully");

      setStudents((prev) =>
        prev.map((student) =>
          student.id === currentStudent.id
            ? { ...student, status: "Completed" }
            : student
        )
      );

      closeMarksModal();
    } catch (err) {
      console.error(err);
      showToast("Failed to save marks", "error");
    }
  };

  // ========================= NEXT STUDENT =========================
  const nextStudent = () => {
    if (
      currentStudentIndex <
      filteredStudents.length - 1
    ) {
      const nextIndex =
        currentStudentIndex + 1;

      openMarksModal(
        filteredStudents[nextIndex],
        nextIndex
      );
    }
  };

  // ========================= PREVIOUS STUDENT =========================
  const prevStudent = () => {
    if (currentStudentIndex > 0) {
      const prevIndex =
        currentStudentIndex - 1;

      openMarksModal(
        filteredStudents[prevIndex],
        prevIndex
      );
    }
  };

  // ========================= OPEN REPORT CARD =========================
  const openReportCard = async (student) => {
    try {
      if (!student) return;

      setReportModalOpen(true);

      const res = await fetchWithAuth(
        `${BASE_URL}/teacher/report-card/${student.id}`
      );

      const data = await res.json();

      setReportCard(data);
    } catch (err) {
      console.error(err);

      showToast(
        "Failed to load report card",
        "error"
      );
    }
  };

  // ========================= CLOSE REPORT CARD =========================
  const closeReportCard = () => {
    setReportModalOpen(false);

    setReportCard(null);
  };

  // ========================= PRINT =========================
  const printReport = () => {
    window.print();
  };

  return {
    loading,

    students,
    filteredStudents,

    subjects,
    classes,

    selectedClass,
    setSelectedClass,

    selectedSubject,
    setSelectedSubject,

    selectedExam,
    setSelectedExam,

    search,
    setSearch,

    marksModalOpen,
    reportModalOpen,

    currentStudent,

    marks,
    handleMarkChange,

    totalMarks,
    percentage,
    grade,

    openMarksModal,
    closeMarksModal,

    saveMarks,

    nextStudent,
    prevStudent,

    reportCard,

    openReportCard,
    closeReportCard,

    printReport,
  };
}