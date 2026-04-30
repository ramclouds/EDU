import { useEffect, useMemo, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

export function useTeacherTimetable({
    activeSection,
    fetchWithAuth,
    showToast,
}) {

    const [teacherTimetableLoading, setTeacherTimetableLoading] =
        useState(false);

    const [teacherTimetable, setTeacherTimetable] =
        useState({});

    // DOWNLOAD LOADING
    const [downloadLoading, setDownloadLoading] =
        useState(false);

    // filters
    const [selectedClass, setSelectedClass] =
        useState("All Classes");

    const [selectedSubject, setSelectedSubject] =
        useState("All Subjects");


    // ----------------------------
    // AUTH HELPER
    // ----------------------------
    const getAuth = () => {
        try {
            return {
                user: JSON.parse(
                    localStorage.getItem("user")
                ),
                token: localStorage.getItem("token"),
            };
        } catch {
            return {
                user: null,
                token: null
            };
        }
    };


    // ============================
    // FETCH TEACHER TIMETABLE
    // ============================
    useEffect(() => {

        if (activeSection !== "timetable") return;

        const { user } = getAuth();

        if (!user) return;

        const fetchTeacherTimetable = async () => {

            try {

                setTeacherTimetableLoading(true);

                const res = await fetchWithAuth(
                    `${BASE_URL}/teachers/${user.id}/timetable`
                );

                const data = await res.json();

                setTeacherTimetable(
                    data?.timetable || {}
                );

            } catch (error) {

                console.error(error);

                showToast(
                    "Failed to load teacher timetable",
                    "error"
                );

            } finally {

                setTeacherTimetableLoading(false);

            }
        };

        fetchTeacherTimetable();

    }, [activeSection]);


    // ============================
    // DOWNLOAD TIMETABLE PDF
    // ============================
    const downloadTeacherTimetablePDF = async () => {

        try {

            const { user, token } = getAuth();

            if (!user || !token) {
                showToast(
                    "Authentication failed",
                    "error"
                );
                return;
            }

            setDownloadLoading(true);

            const response = await fetch(
                `${BASE_URL}/teacher/timetable/pdf/${user.id}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(
                    "Failed to download PDF"
                );
            }

            // CONVERT TO BLOB
            const blob =
                await response.blob();

            // CREATE DOWNLOAD URL
            const url =
                window.URL.createObjectURL(blob);

            // CREATE TEMP LINK
            const link =
                document.createElement("a");

            link.href = url;

            link.download =
                `teacher_${user.id}_timetable.pdf`;

            document.body.appendChild(link);

            link.click();

            link.remove();

            // CLEAN MEMORY
            window.URL.revokeObjectURL(url);

            showToast(
                "Timetable PDF downloaded",
                "success"
            );

        } catch (error) {

            console.error(error);

            showToast(
                "Failed to download timetable PDF",
                "error"
            );

        } finally {

            setDownloadLoading(false);

        }
    };


    // ============================
    // CLASS FILTER OPTIONS
    // ============================
    const classOptions = useMemo(() => {

        const set = new Set();

        Object.values(teacherTimetable)
            .flat()
            .forEach(item => {

                if (item.class_name) {
                    set.add(item.class_name);
                }

            });

        return [
            "All Classes",
            ...Array.from(set)
        ];

    }, [teacherTimetable]);


    // ============================
    // SUBJECT FILTER OPTIONS
    // ============================
    const subjectOptions = useMemo(() => {

        const set = new Set();

        Object.values(teacherTimetable)
            .flat()
            .forEach(item => {

                if (item.subject) {
                    set.add(item.subject);
                }

            });

        return [
            "All Subjects",
            ...Array.from(set)
        ];

    }, [teacherTimetable]);


    // ============================
    // FILTERED TIMETABLE
    // ============================
    const filteredTimetable = useMemo(() => {

        const filtered = {};

        Object.keys(teacherTimetable)
            .forEach(day => {

                let entries =
                    teacherTimetable[day] || [];

                if (
                    selectedClass !==
                    "All Classes"
                ) {
                    entries = entries.filter(
                        item =>
                            item.class_name ===
                            selectedClass
                    );
                }

                if (
                    selectedSubject !==
                    "All Subjects"
                ) {
                    entries = entries.filter(
                        item =>
                            item.subject ===
                            selectedSubject
                    );
                }

                filtered[day] = entries;
            });

        return filtered;

    }, [
        teacherTimetable,
        selectedClass,
        selectedSubject
    ]);


    return {

        teacherTimetableLoading,

        teacherTimetable:
            filteredTimetable,

        selectedClass,
        setSelectedClass,

        selectedSubject,
        setSelectedSubject,

        classOptions,
        subjectOptions,

        // DOWNLOAD
        downloadLoading,
        downloadTeacherTimetablePDF,
    };
}