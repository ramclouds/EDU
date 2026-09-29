import { useEffect, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

export function useStudentTimeTable({
    activeSection,
    fetchWithAuth,
    showToast,
}) {
    const [timetableLoading, setTimetableLoading] = useState(false);
    const [timetable, setTimetable] = useState({});

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

    // ================= TIMETABLE START =================
    useEffect(() => {
        if (activeSection !== "timetable" &&
            activeSection !== "dashboard"
        ) return;

        const { user } = getAuth();
        if (!user) return;

        const fetchTimetable = async () => {
            try {
                setTimetableLoading(true);

                const res = await fetchWithAuth(
                    `${BASE_URL}/timetable/${user.id}`
                );

                const data = await res.json();

                setTimetable(data?.timetable || {});
            } catch (err) {
                console.error(err);
                showToast("Failed to load timetable", "error");
            } finally {
                setTimetableLoading(false);
            }
        };

        fetchTimetable();
    }, [activeSection]);



    return {
        timetableLoading,
        timetable,

    };
}
