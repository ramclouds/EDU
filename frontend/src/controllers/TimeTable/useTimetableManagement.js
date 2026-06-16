import { useState, useMemo, useEffect, useRef, } from "react";
import { BASE_URL } from "../../config/appConfig";

export function useTimeTableManagement({ showToast, fetchWithAuth, activeSection, }) {
    const [lectureModalOpen, setLectureModalOpen] = useState(false);
    const [lectures, setLectures] = useState([]);
    const [loadingTimeTable, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        academic_class_id: "",
        subject_id: "",
        teacher_id: "",
    });

    const [lectureForm, setLectureForm] = useState({
        id: null,

        batch_id: "",
        academic_class_id: "",
        division_id: "",
        section_id: "",
        period_no: "",

        day: "",

        start_time: "",
        end_time: "",

        subject_id: "",
        subject_name: "",

        teacher_id: "",
        teacher_name: "",

        room_id: "",
        room_name: "",

        lecture_type: "Theory",

        remarks: "",
    });

    const [teachers, setTeachers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [classes, setClasses] = useState([]);
    const [divisions, setDivisions] = useState([]);
    const [sections, setSections] = useState([]);
    const [rooms, setRooms] = useState([]);

    // MODAL
    const periods = [
        {
            no: 1,
            start: "09:00",
            end: "10:00",
        },
        {
            no: 2,
            start: "10:00",
            end: "11:00",
        },
        {
            no: 3,
            start: "11:00",
            end: "12:00",
        },
        {
            no: 4,
            start: "12:00",
            end: "13:00",
        },
        {
            no: 5,
            start: "14:00",
            end: "15:00",
        },
        {
            no: 6,
            start: "15:00",
            end: "16:00",
        },
    ];

    const openLectureModal = (lecture = null) => {
        if (lecture) {
            setLectureForm({
                id: lecture.id,
                academic_class_id:
                    lecture.academic_class_id || "",
                division_id:
                    lecture.division_id || "",
                section_id:
                    lecture.section_id || "",
                period_no:
                    lecture.period_no || "",
                day:
                    lecture.day || "",
                start_time:
                    lecture.start_time || "",
                end_time:
                    lecture.end_time || "",

                subject_id:
                    lecture.subject_id || "",
                subject_name:
                    lecture.subject_name || "",

                teacher_id:
                    lecture.teacher_id || "",
                teacher_name:
                    lecture.teacher_name || "",

                room_no:
                    lecture.room_no || "",

                lecture_type:
                    lecture.lecture_type || "Theory",

                remarks:
                    lecture.remarks || "",
            });
        } else {
            resetLectureForm();
        }

        setLectureModalOpen(true);
    };

    const closeLectureModal = () => {
        resetLectureForm();
        setLectureModalOpen(false);
    };

    const resetLectureForm = () => {
        setLectureForm({
            id: null,

            batch_id: "",
            academic_class_id: "",
            division_id: "",
            section_id: "",
            period_no: "",

            day: "",

            start_time: "",
            end_time: "",

            subject_id: "",
            subject_name: "",

            teacher_id: "",
            teacher_name: "",

            room_id: "",
            lecture_type: "Theory",
            remarks: "",
        });
    };

    const updateFilter = (
        field,
        value
    ) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    // FORM CHANGE
    const updateLectureForm = (field, value) => {
        setLectureForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    // VALIDATION
    const validateLecture = () => {
        if (!lectureForm.day) {
            showToast?.("Select Day", "error");
            return false;
        }

        if (!lectureForm.start_time) {
            showToast?.("Select Start Time", "error");
            return false;
        }

        if (!lectureForm.end_time) {
            showToast?.("Select End Time", "error");
            return false;
        }

        if (
            lectureForm.start_time >=
            lectureForm.end_time
        ) {
            showToast?.(
                "End time must be greater than start time",
                "error"
            );

            return false;
        }

        if (!lectureForm.teacher_id) {
            showToast?.(
                "Select Teacher",
                "error"
            );
            return false;
        }

        if (!lectureForm.subject_id) {
            showToast?.(
                "Select Subject",
                "error"
            );
            return false;
        }

        return true;
    };

    // CONFLICT CHECK
    const hasTeacherConflict = () => {
        return lectures.some((lecture) => {
            if (
                lecture.teacher_id !==
                lectureForm.teacher_id
            )
                return false;

            if (
                lecture.day !== lectureForm.day
            )
                return false;

            if (
                lecture.id === lectureForm.id
            )
                return false;

            return (
                lectureForm.start_time <
                lecture.end_time &&
                lectureForm.end_time >
                lecture.start_time
            );
        });
    };

    const hasRoomConflict = () => {
        return lectures.some((lecture) => {
            if (
                lecture.room_no !==
                lectureForm.room_no
            )
                return false;

            if (
                lecture.day !== lectureForm.day
            )
                return false;

            if (
                lecture.id === lectureForm.id
            )
                return false;

            return (
                lectureForm.start_time <
                lecture.end_time &&
                lectureForm.end_time >
                lecture.start_time
            );
        });
    };

    // SAVE
    const saveLecture = async () => {

        if (!validateLecture()) {
            return;
        }

        if (hasTeacherConflict()) {

            showToast?.(
                "Teacher already assigned during this time",
                "error"
            );

            return;
        }

        if (hasRoomConflict()) {

            showToast?.(
                "Room already occupied",
                "error"
            );

            return;
        }

        try {

            const method =
                lectureForm.id
                    ? "PUT"
                    : "POST";

            const url =
                lectureForm.id
                    ? `${BASE_URL}/admin/timetable/${lectureForm.id}`
                    : `${BASE_URL}/admin/timetable`;

            const response =
                await fetchWithAuth(
                    url,
                    {
                        method,
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body: JSON.stringify(
                            lectureForm
                        ),
                    }
                );

            const result =
                await response.json();

            if (!response.ok) {

                showToast?.(
                    result.error ||
                    "Failed to save timetable",
                    "error"
                );

                return;
            }

            showToast?.(
                lectureForm.id
                    ? "Lecture Updated"
                    : "Lecture Scheduled",
                "success"
            );

            await loadTimetable(
                lectureForm.academic_class_id
            );
            closeLectureModal();

        } catch (error) {

            console.error(error);

            showToast?.(
                "Failed to save lecture",
                "error"
            );
        }
    };

    // DELETE
    const deleteLecture = async (
        lectureId
    ) => {

        try {

            const response =
                await fetchWithAuth(
                    `${BASE_URL}/admin/timetable/${lectureId}`,
                    {
                        method: "DELETE",
                    }
                );

            const result =
                await response.json();

            if (!response.ok) {

                showToast?.(
                    result.error,
                    "error"
                );

                return;
            }

            setLectures((prev) =>
                prev.filter(
                    (item) =>
                        item.id !== lectureId
                )
            );

            showToast?.(
                "Lecture Deleted",
                "success"
            );

        } catch (error) {

            console.error(error);

            showToast?.(
                "Delete failed",
                "error"
            );
        }
    };

    // FILTERED DATA
    const filteredLectures = useMemo(() => {
        return lectures.filter((lecture) => {
            if (
                filters.academic_class_id &&
                String(
                    lecture.academic_class_id
                ) !==
                String(
                    filters.academic_class_id
                )
            ) {
                return false;
            }

            if (
                filters.subject_id &&
                String(
                    lecture.subject_id
                ) !==
                String(
                    filters.subject_id
                )
            ) {
                return false;
            }

            if (
                filters.teacher_id &&
                String(
                    lecture.teacher_id
                ) !==
                String(
                    filters.teacher_id
                )
            ) {
                return false;
            }

            return true;
        });
    }, [lectures, filters]);

    // STATS
    const stats = useMemo(() => {
        return {
            totalLectures:
                lectures.length,

            totalSubjects:
                new Set(
                    lectures.map(
                        (x) => x.subject_id
                    )
                ).size,

            totalTeachers:
                new Set(
                    lectures.map(
                        (x) => x.teacher_id
                    )
                ).size,

            totalRooms:
                new Set(
                    lectures.map(
                        (x) => x.room_no
                    )
                ).size,

            weeklyLoad:
                lectures.length,
        };
    }, [lectures]);

    // TIMETABLE GRID
    const days = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ];

    const timeSlots = useMemo(() => {
        return [...new Set(

            lectures
                .sort((a, b) =>
                    a.period_no - b.period_no
                )
                .map(x =>
                    `${x.start_time}-${x.end_time}`
                )
        )];

    }, [lectures]);

    const getLecturesForSlot = (
        day,
        slot
    ) => {
        return filteredLectures.filter(
            (lecture) =>
                lecture.day === day &&
                `${lecture.start_time}-${lecture.end_time}` ===
                slot
        );
    };

    const exportTimetablePDF = async () => {
        if (!filters.academic_class_id) {
            showToast(
                "Select class",
                "error"
            );
            return;
        }
        window.open(
            `${BASE_URL}/admin/timetable/pdf?academic_class_id=${filters.academic_class_id}`,
            "_blank"
        );
    };

    const loadTimetable = async (
        academicClassId
    ) => {
        try {

            setLoading(true);

            const response =
                await fetchWithAuth(
                    academicClassId
                        ? `${BASE_URL}/admin/timetable?academic_class_id=${academicClassId}`
                        : `${BASE_URL}/admin/timetable`
                );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Failed to load timetable"
                );
            }

            setLectures(data);

        } catch (error) {
            console.error(error);
            showToast?.(
                error.message,
                "error"
            );

        } finally {
            setLoading(false);
        }
    };
    const loadTimetableOptions =
        async () => {

            try {

                const response =
                    await fetchWithAuth(
                        `${BASE_URL}/admin/timetable/options`
                    );

                const data =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                        "Failed to load options"
                    );
                }

                setTeachers(
                    data.teachers || []
                );

                setSubjects(
                    data.subjects || []
                );

                setClasses(
                    data.classes || []
                );

                setDivisions(
                    data.divisions || []
                );

                setSections(
                    data.sections || []
                );

                setRooms(
                    data.rooms || []
                );


            } catch (error) {

                console.error(error);

                showToast?.(
                    "Failed to load timetable options",
                    "error"
                );
            }
        };

    useEffect(() => {

        if (activeSection !== "timetable")
            return;

        const initialize = async () => {

            await loadTimetableOptions();
            await loadTimetable(
                filters.academic_class_id
            );
        };

        initialize();

    }, [activeSection]);

    // REFRESH
    const refreshTimetable = async () => {

        await loadTimetable(filters.academic_class_id);

        showToast?.(
            "Timetable Refreshed",
            "success"
        );
    };

    return {
        loadingTimeTable,
        lectureModalOpen,
        loadTimetable,
        lectureForm,
        updateLectureForm,
        periods,
        classes,
        divisions,
        sections,
        subjects,
        teachers,
        rooms,
        filters,
        updateFilter,
        setFilters,
        lectures,
        filteredLectures,
        stats,
        days,
        timeSlots,
        getLecturesForSlot,
        openLectureModal,
        closeLectureModal,
        saveLecture,
        deleteLecture,
        refreshTimetable,
        exportTimetablePDF,
    };
}