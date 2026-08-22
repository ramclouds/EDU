import { useCallback, useEffect, useRef, useState } from "react";

import { BASE_URL } from "../../config/appConfig";
import { useHostelPermission, HOSTEL_READ_ONLY_MESSAGE } from "./useHostelPermission";
import { MESS_MENU_MEALS } from "./useHostelMessMenu";

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
    not_marked: 0,
};

/**
 * Drives the "Meal Attendance" dashboard section: a per-meal roster
 * (date + meal type) of every currently-resident student, with quick
 * Present/Absent mark actions and a "Mark All Present" shortcut for
 * the ones nobody has touched yet.
 */
export function useHostelMealAttendance({ activeSection, fetchWithAuth, showToast }) {
    const { canWriteHostel } = useHostelPermission();

    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);
    const loadedRef = useRef(false);
    const runningRef = useRef(false);

    const [mealDate, setMealDate] = useState(todayISO());
    const [mealType, setMealType] = useState(MESS_MENU_MEALS[0]);

    const [mealAttendance, setMealAttendance] = useState([]);
    const [mealStats, setMealStats] = useState({ ...EMPTY_STATS });
    const [mealAttendanceLoading, setMealAttendanceLoading] = useState(false);
    const [mealFilters, setMealFilters] = useState({ ...EMPTY_FILTERS });

    const [markingStudentId, setMarkingStudentId] = useState(null);
    const [bulkMarking, setBulkMarking] = useState(false);

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

    const loadMealAttendance = useCallback(
        async ({
            date: nextDate = mealDate,
            meal: nextMeal = mealType,
            filters: nextFilters = mealFilters,
            silent = false,
        } = {}) => {
            if (runningRef.current) {
                return;
            }

            runningRef.current = true;
            setMealAttendanceLoading(true);

            try {
                const params = new URLSearchParams();
                params.set("date", nextDate);
                params.set("meal_type", nextMeal);

                Object.entries(nextFilters).forEach(([key, value]) => {
                    const normalized = String(value ?? "").trim();

                    if (normalized) {
                        params.set(key, normalized);
                    }
                });

                const data = await request(
                    `${BASE_URL}/admin/hostel/meal-attendance?${params.toString()}`,
                );

                setMealAttendance(
                    Array.isArray(data.meal_attendance) ? data.meal_attendance : [],
                );
                setMealStats({ ...EMPTY_STATS, ...(data.stats || {}) });
            } catch (error) {
                console.error("Meal attendance load error:", error);

                if (!silent) {
                    notify(error.message || "Failed to load meal attendance", "error");
                }
            } finally {
                runningRef.current = false;
                setMealAttendanceLoading(false);
            }
        },
        [mealDate, mealFilters, mealType, notify, request],
    );

    const updateMealFilter = useCallback((name, value) => {
        setMealFilters((current) => ({ ...current, [name]: value }));
    }, []);

    const applyMealFilters = useCallback(() => {
        loadMealAttendance({ filters: mealFilters });
    }, [loadMealAttendance, mealFilters]);

    const resetMealFilters = useCallback(() => {
        const next = { ...EMPTY_FILTERS };
        setMealFilters(next);
        loadMealAttendance({ filters: next });
    }, [loadMealAttendance]);

    const changeMealDate = useCallback(
        (nextDate) => {
            setMealDate(nextDate);
            loadMealAttendance({ date: nextDate, silent: true });
        },
        [loadMealAttendance],
    );

    const changeMealType = useCallback(
        (nextMeal) => {
            setMealType(nextMeal);
            loadMealAttendance({ meal: nextMeal, silent: true });
        },
        [loadMealAttendance],
    );

    const markMealAttendance = useCallback(
        async (student, status) => {
            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            setMarkingStudentId(student.student_id);

            try {
                await request(`${BASE_URL}/admin/hostel/meal-attendance/mark`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        student_id: student.student_id,
                        meal_date: mealDate,
                        meal_type: mealType,
                        status,
                    }),
                });

                notify(`${student.student_name} marked ${status}`, "success");
                await loadMealAttendance({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to mark meal attendance", "error");
            } finally {
                setMarkingStudentId(null);
            }
        },
        [canWriteHostel, loadMealAttendance, mealDate, mealType, notify, request],
    );

    const markAllPresent = useCallback(async () => {
        if (!canWriteHostel) {
            notify(HOSTEL_READ_ONLY_MESSAGE, "error");
            return;
        }

        setBulkMarking(true);

        try {
            const data = await request(
                `${BASE_URL}/admin/hostel/meal-attendance/bulk-mark`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        meal_date: mealDate,
                        meal_type: mealType,
                    }),
                },
            );

            notify(
                data.message || "Unmarked students marked Present",
                "success",
            );
            await loadMealAttendance({ silent: true });
        } catch (error) {
            notify(error.message || "Failed to bulk-mark attendance", "error");
        } finally {
            setBulkMarking(false);
        }
    }, [canWriteHostel, loadMealAttendance, mealDate, mealType, notify, request]);

    useEffect(() => {
        if (activeSection !== "meal-attendance") {
            loadedRef.current = false;
            return;
        }

        if (loadedRef.current) {
            return;
        }

        loadedRef.current = true;
        loadMealAttendance({ date: mealDate, meal: mealType, filters: EMPTY_FILTERS });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSection]);

    return {
        mealDate,
        changeMealDate,
        mealType,
        changeMealType,

        mealAttendance,
        mealStats,
        mealAttendanceLoading,
        mealFilters,

        loadMealAttendance,
        updateMealFilter,
        applyMealFilters,
        resetMealFilters,

        markingStudentId,
        markMealAttendance,

        bulkMarking,
        markAllPresent,

        canWriteHostel,
    };
}
