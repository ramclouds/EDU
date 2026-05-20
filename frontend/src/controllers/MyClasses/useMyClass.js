import { useEffect, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

export function useMyClasses(
    activeSection,
    fetchWithAuth,
    showToast
) {

    // ================= STATES =================
    const [classes, setClasses] = useState([]);

    const [students, setStudents] = useState([]);

    const [selectedClass, setSelectedClass] =
        useState(null);

    const [selectedStudent, setSelectedStudent] =
        useState(null);

    const [classesLoading, setClassesLoading] =
        useState(false);

    const [studentSearch, setStudentSearch] =
        useState("");

    // ================= MODALS =================
    const [isClassDetailOpen, setIsClassDetailOpen] =
        useState(false);

    const [isStudentProfileOpen,
        setIsStudentProfileOpen] =
        useState(false);

    // ================= USER =================
    const getUser = () => {

        try {

            return JSON.parse(
                localStorage.getItem("user")
            );

        } catch {

            return null;
        }
    };

    // ================= FETCH CLASSES =================
    const fetchMyClasses = async () => {

        try {

            setClassesLoading(true);

            const user = getUser();

            if (!user) {
                showToast("User not found", "error");
                return;
            }

            // ================= API =================
            const res = await fetchWithAuth(
                `${BASE_URL}/teacher/my-classes/${user.id}`
            );

            const data = await res.json();

            if (!res.ok) {

                showToast(
                    data?.error ||
                    "Failed to load classes",
                    "error"
                );

                return;
            }

            setClasses(data || []);

        } catch (err) {

            console.error(
                "FETCH MY CLASSES ERROR:",
                err
            );

            showToast(
                "Failed to load classes",
                "error"
            );

        } finally {

            setClassesLoading(false);
        }
    };

    // ================= OPEN CLASS =================
    const openClassDetail = (classItem) => {

        setSelectedClass(classItem);

        setStudents(
            classItem?.students || []
        );

        setIsClassDetailOpen(true);
    };

    // ================= CLOSE CLASS =================
    const closeClassDetail = () => {

        setIsClassDetailOpen(false);

        setSelectedClass(null);

        setStudents([]);

        setStudentSearch("");
    };

    // ================= OPEN STUDENT =================
    const openStudentProfile = (student) => {

        setSelectedStudent(student);

        setIsStudentProfileOpen(true);
    };

    // ================= CLOSE STUDENT =================
    const closeStudentProfile = () => {

        setIsStudentProfileOpen(false);

        setSelectedStudent(null);
    };

    // ================= SEARCH FILTER =================
    const filteredStudents =
        students.filter((student) => {

            const keyword =
                studentSearch.toLowerCase();

            return (
                student?.full_name
                    ?.toLowerCase()
                    ?.includes(keyword)

                ||

                student?.student_id
                    ?.toLowerCase()
                    ?.includes(keyword)

                ||

                student?.mobile
                    ?.toLowerCase()
                    ?.includes(keyword)
            );
        });

    // ================= COUNTS =================
    const activeStudents =
        students.filter(
            (s) => s.status === "Active"
        ).length;

    const inactiveStudents =
        students.filter(
            (s) => s.status !== "Active"
        ).length;

    // ================= LOAD =================
    useEffect(() => {

        if (activeSection !== "classes")
            return;

        fetchMyClasses();

    }, [activeSection]);

    // ================= RETURN =================
    return {

        // DATA
        classes,
        students,
        filteredStudents,

        selectedClass,
        selectedStudent,

        // SEARCH
        studentSearch,
        setStudentSearch,

        // COUNTS
        activeStudents,
        inactiveStudents,

        // LOADING
        classesLoading,

        // CLASS MODAL
        isClassDetailOpen,
        openClassDetail,
        closeClassDetail,

        // STUDENT MODAL
        isStudentProfileOpen,
        openStudentProfile,
        closeStudentProfile,

        // REFRESH
        fetchMyClasses,
    };
}