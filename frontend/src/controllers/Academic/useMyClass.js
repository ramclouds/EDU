import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

const API_BASE = BASE_URL.replace(/\/$/, "");


const getStoredUser = () => {
    try {
        return (
            JSON.parse(localStorage.getItem("user")) ||
            JSON.parse(localStorage.getItem("authUser")) ||
            JSON.parse(localStorage.getItem("currentUser")) ||
            {}
        );
    } catch {
        return {};
    }
};

const getMyClassesUrl = () => {
    const user = getStoredUser();

    const role = String(user.role || localStorage.getItem("role") || "admin")
        .toLowerCase()
        .trim();

    const userId =
        user.id ||
        user.user_id ||
        user.admin_id ||
        user.teacher_id ||
        localStorage.getItem("user_id") ||
        localStorage.getItem("id");

    if (!userId) {
        throw new Error("Logged-in user id not found");
    }

    return `${API_BASE}/my-classes/${role}/${userId}`;

};

const normalize = (v) => String(v ?? "").toLowerCase().trim();

export function useMyClasses({ activeSection, fetchWithAuth, showToast }) {
    const [allClasses, setAllClasses] = useState([]);
    const [classesLoading, setClassesLoading] = useState(false);

    const [selectedMyClass, setSelectedMyClass] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);

    const [classSearch, setClassSearch] = useState("");
    const [divisionFilter, setDivisionFilter] = useState("");
    const [sectionFilter, setSectionFilter] = useState("");
    const [myClassStudentSearch, setMyClassStudentSearch] = useState("");

    const [isClassDetailOpen, setIsClassDetailOpen] = useState(false);
    const [isStudentProfileOpen, setIsStudentProfileOpen] = useState(false);

    const initializedRef = useRef(false);
    const loadingRef = useRef(false);

    const apiFetch = useCallback(
        async (url, options = {}) => {
            const fn = typeof fetchWithAuth === "function" ? fetchWithAuth : fetch;

            const res = await fn(url, {
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    ...(options.headers || {}),
                },
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.error || data.message || "Request failed");
            }

            return data;
        },
        [fetchWithAuth],
    );

    const loadMyClasses = useCallback(async () => {
        if (loadingRef.current) return;

        try {
            loadingRef.current = true;
            setClassesLoading(true);

            const data = await apiFetch(getMyClassesUrl());

            const rows = Array.isArray(data)
                ? data
                : data.classes || data.myclasses || data.data || [];

            setAllClasses(rows);
        } catch (err) {
            showToast?.(err.message || "Failed to load classes", "error");
            setAllClasses([]);
        } finally {
            loadingRef.current = false;
            setClassesLoading(false);
        }
    }, [apiFetch, showToast]);

    useEffect(() => {
        if (activeSection !== "students") return;
        if (initializedRef.current) return;

        initializedRef.current = true;
        loadMyClasses();
    }, [activeSection, loadMyClasses]);

    const divisionOptions = useMemo(() => {
        const map = new Map();

        allClasses.forEach((item) => {
            if (item.division_name) {
                map.set(item.division_name, item.division_name);
            }
        });

        return Array.from(map.values()).sort((a, b) =>
            String(a).localeCompare(String(b), undefined, { numeric: true }),
        );
    }, [allClasses]);

    const sectionOptions = useMemo(() => {
        const map = new Map();

        allClasses.forEach((item) => {
            if (item.section_name) {
                map.set(item.section_name, item.section_name);
            }
        });

        return Array.from(map.values()).sort();
    }, [allClasses]);

    const myclasses = useMemo(() => {
        const q = normalize(classSearch);

        return allClasses.filter((item) => {
            const matchesSearch =
                !q ||
                normalize(item.class_name).includes(q) ||
                normalize(item.batch_name).includes(q) ||
                normalize(item.subject_name).includes(q) ||
                normalize(item.division_name).includes(q) ||
                normalize(item.section_name).includes(q);

            const matchesDivision =
                !divisionFilter || item.division_name === divisionFilter;

            const matchesSection =
                !sectionFilter || item.section_name === sectionFilter;

            return matchesSearch && matchesDivision && matchesSection;
        });
    }, [allClasses, classSearch, divisionFilter, sectionFilter]);

    const filteredStudents = useMemo(() => {
        const q = normalize(myClassStudentSearch);
        const students = selectedMyClass?.students || [];

        if (!q) return students;

        return students.filter((student) => {
            return (
                normalize(student.full_name).includes(q) ||
                normalize(student.student_id).includes(q) ||
                normalize(student.mobile).includes(q) ||
                normalize(student.roll_number).includes(q) ||
                normalize(student.parent_name).includes(q)
            );
        });
    }, [selectedMyClass, myClassStudentSearch]);

    const openClassDetail = useCallback((item) => {
        setSelectedMyClass(item);
        setMyClassStudentSearch("");
        setIsClassDetailOpen(true);
    }, []);

    const closeClassDetail = useCallback(() => {
        setIsClassDetailOpen(false);
        setSelectedMyClass(null);
        setMyClassStudentSearch("");
    }, []);

    const openStudentProfile = useCallback((student) => {
        setSelectedStudent(student);
        setIsStudentProfileOpen(true);
    }, []);

    const closeStudentProfile = useCallback(() => {
        setIsStudentProfileOpen(false);
        setSelectedStudent(null);
    }, []);

    const resetClassFilters = useCallback(() => {
        setClassSearch("");
        setDivisionFilter("");
        setSectionFilter("");
    }, []);

    const activeStudents = useMemo(
        () =>
            (selectedMyClass?.students || []).filter(
                (s) => String(s.status || "").toLowerCase() === "active"
            ),
        [selectedMyClass]
    );

    const inactiveStudents = useMemo(
        () =>
            (selectedMyClass?.students || []).filter(
                (s) => String(s.status || "").toLowerCase() !== "active"
            ),
        [selectedMyClass]
    );

    return {
        // old names
        myclasses,
        selectedMyClass,
        myClassStudentSearch,
        setMyClassStudentSearch,

        // teacher dashboard aliases
        classes: myclasses,
        selectedClass: selectedMyClass,
        studentSearch: myClassStudentSearch,
        setStudentSearch: setMyClassStudentSearch,

        classesLoading,
        selectedStudent,

        isClassDetailOpen,
        isStudentProfileOpen,

        openClassDetail,
        closeClassDetail,
        openStudentProfile,
        closeStudentProfile,

        filteredStudents,
        activeStudents,
        inactiveStudents,

        divisionOptions,
        sectionOptions,

        classSearch,
        setClassSearch,
        divisionFilter,
        setDivisionFilter,
        sectionFilter,
        setSectionFilter,
        resetClassFilters,

        allClasses,
        loadMyClasses,
    };
}