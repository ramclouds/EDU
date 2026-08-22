import { useCallback, useEffect, useRef, useState } from "react";

import { BASE_URL } from "../../config/appConfig";
import { useHostelPermission, HOSTEL_READ_ONLY_MESSAGE } from "./useHostelPermission";

const todayISO = () => new Date().toISOString().slice(0, 10);

const EMPTY_FILTERS = {
    search: "",
    block_id: "",
    status: "",
};

const EMPTY_STATS = {
    total: 0,
    present: 0,
    absent: 0,
    on_leave: 0,
    late_entry: 0,
};

/**
 * Drives the "Attendance" dashboard section: a daily roster of every
 * currently-resident student (present or not yet marked), with a
 * date picker and quick Present/Absent/On Leave mark actions.
 */
export function useHostelAttendance({ activeSection, fetchWithAuth, showToast }) {
    const { canWriteHostel } = useHostelPermission();

    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);
    const loadedRef = useRef(false);
    const runningRef = useRef(false);

    const [attendanceDate, setAttendanceDate] = useState(todayISO());
    const [attendance, setAttendance] = useState([]);
    const [attendanceStats, setAttendanceStats] = useState({ ...EMPTY_STATS });
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [attendanceFilters, setAttendanceFilters] = useState({ ...EMPTY_FILTERS });

    const [markingStudentId, setMarkingStudentId] = useState(null);

    useEffect(() => {
        fetchRef.current = fetchWithAuth;
    }, [fetchWithAuth]);

    useEffect(() => {
        toastRef.current = showToast;
    }, [showToast]);

    const notify = useCallback((message, type = "info") => {
        toastRef.current?.(message, type);
    }, []);

    const request = useCallback(async (url, options = {}) => {
        if (typeof fetchRef.current !== "function") {
            throw new Error("Authenticated request unavailable");
        }

        const response = await fetchRef.current(url, options);

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            const error = new Error(
                data.error || data.message || `Request failed (${response.status})`,
            );

            error.data = data;
            error.status = response.status;

            throw error;
        }

        return data;
    }, []);

    const loadAttendance = useCallback(
        async ({
            date: nextDate = attendanceDate,
            filters: nextFilters = attendanceFilters,
            silent = false,
        } = {}) => {
            if (runningRef.current) {
                return;
            }

            runningRef.current = true;
            setAttendanceLoading(true);

            try {
                const params = new URLSearchParams();
                params.set("date", nextDate);

                Object.entries(nextFilters).forEach(([key, value]) => {
                    const normalized = String(value ?? "").trim();

                    if (normalized) {
                        params.set(key, normalized);
                    }
                });

                const data = await request(
                    `${BASE_URL}/admin/hostel/attendance?${params.toString()}`,
                );

                setAttendance(Array.isArray(data.attendance) ? data.attendance : []);
                setAttendanceStats({ ...EMPTY_STATS, ...(data.stats || {}) });
            } catch (error) {
                console.error("Hostel attendance load error:", error);

                if (!silent) {
                    notify(error.message || "Failed to load attendance", "error");
                }
            } finally {
                runningRef.current = false;
                setAttendanceLoading(false);
            }
        },
        [attendanceDate, attendanceFilters, notify, request],
    );

    const updateAttendanceFilter = useCallback((name, value) => {
        setAttendanceFilters((current) => ({ ...current, [name]: value }));
    }, []);

    const applyAttendanceFilters = useCallback(() => {
        loadAttendance({ filters: attendanceFilters });
    }, [attendanceFilters, loadAttendance]);

    const resetAttendanceFilters = useCallback(() => {
        const next = { ...EMPTY_FILTERS };
        setAttendanceFilters(next);
        loadAttendance({ filters: next });
    }, [loadAttendance]);

    const changeAttendanceDate = useCallback(
        (nextDate) => {
            setAttendanceDate(nextDate);
            loadAttendance({ date: nextDate, silent: true });
        },
        [loadAttendance],
    );

    const markAttendance = useCallback(
        async (student, status, remarks = "") => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            setMarkingStudentId(student.student_id);

            try {
                await request(`${BASE_URL}/admin/hostel/attendance/mark`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        student_id: student.student_id,
                        attendance_date: attendanceDate,
                        status,
                        remarks,
                    }),
                });

                notify(`${student.student_name} marked ${status}`, "success");
                await loadAttendance({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to mark attendance", "error");
            } finally {
                setMarkingStudentId(null);
            }
        },
        [attendanceDate, canWriteHostel, loadAttendance, notify, request],
    );

    useEffect(() => {
        if (activeSection !== "attendance") {
            loadedRef.current = false;
            return;
        }

        if (loadedRef.current) {
            return;
        }

        loadedRef.current = true;
        loadAttendance({ date: attendanceDate, filters: EMPTY_FILTERS });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSection]);

    return {
        attendanceDate,
        changeAttendanceDate,

        attendance,
        attendanceStats,
        attendanceLoading,
        attendanceFilters,

        loadAttendance,
        updateAttendanceFilter,
        applyAttendanceFilters,
        resetAttendanceFilters,

        markingStudentId,
        markAttendance,

        canWriteHostel,
    };
}
