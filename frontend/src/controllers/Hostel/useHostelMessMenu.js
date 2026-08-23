import { useCallback, useEffect, useRef, useState } from "react";

import { BASE_URL } from "../../config/appConfig";
import { useHostelPermission, HOSTEL_READ_ONLY_MESSAGE } from "./useHostelPermission";

export const MESS_MENU_DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];

export const MESS_MENU_MEALS = ["Breakfast", "Lunch", "Snacks", "Dinner"];

const EMPTY_STATS = {
    configured: 0,
    total_slots: 28,
    missing: 28,
};

const EMPTY_ENTRY_FORM = {
    day_of_week: "",
    meal_type: "",
    items: "",
    timing: "",
};

export function useHostelMessMenu({ activeSection, fetchWithAuth, showToast }) {
    const { canWriteHostel } = useHostelPermission();

    const fetchRef = useRef(fetchWithAuth);
    const toastRef = useRef(showToast);
    const loadedRef = useRef(false);
    const runningRef = useRef(false);

    const [menuGrid, setMenuGrid] = useState([]);
    const [menuStats, setMenuStats] = useState({ ...EMPTY_STATS });
    const [menuLoading, setMenuLoading] = useState(false);

    const [entryModalOpen, setEntryModalOpen] = useState(false);
    const [entryForm, setEntryForm] = useState({ ...EMPTY_ENTRY_FORM });
    const [entrySaving, setEntrySaving] = useState(false);

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

    const loadMenu = useCallback(
        async ({ silent = false } = {}) => {
            if (runningRef.current) {
                return;
            }

            runningRef.current = true;
            setMenuLoading(true);

            try {
                const data = await request(`${BASE_URL}/admin/hostel/mess-menu`);

                setMenuGrid(Array.isArray(data.menu) ? data.menu : []);
                setMenuStats({ ...EMPTY_STATS, ...(data.stats || {}) });
            } catch (error) {
                console.error("Mess menu load error:", error);

                if (!silent) {
                    notify(error.message || "Failed to load mess menu", "error");
                }
            } finally {
                runningRef.current = false;
                setMenuLoading(false);
            }
        },
        [notify, request],
    );

    // ============================================================
    // EDIT ONE CELL
    // ============================================================
    const openEntryModal = useCallback((dayOfWeek, mealType, existingEntry) => {
        setEntryForm({
            day_of_week: dayOfWeek,
            meal_type: mealType,
            items: existingEntry?.items || "",
            timing: existingEntry?.timing || "",
        });
        setEntryModalOpen(true);
    }, []);

    const closeEntryModal = useCallback(() => {
        setEntryModalOpen(false);
    }, []);

    const updateEntryForm = useCallback((name, value) => {
        setEntryForm((current) => ({ ...current, [name]: value }));
    }, []);

    const saveEntry = useCallback(async () => {
        if (!entryForm.day_of_week || !entryForm.meal_type) {
            notify("Something went wrong - missing day/meal", "error");
            return;
        }

        if (!canWriteHostel) {
            notify(HOSTEL_READ_ONLY_MESSAGE, "error");
            return;
        }

        setEntrySaving(true);

        try {
            await request(`${BASE_URL}/admin/hostel/mess-menu`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    day_of_week: entryForm.day_of_week,
                    meal_type: entryForm.meal_type,
                    items: entryForm.items.trim(),
                    timing: entryForm.timing.trim(),
                }),
            });

            notify(`${entryForm.day_of_week} ${entryForm.meal_type} menu saved`, "success");
            setEntryModalOpen(false);
            await loadMenu({ silent: true });
        } catch (error) {
            notify(error.message || "Failed to save menu", "error");
        } finally {
            setEntrySaving(false);
        }
    }, [canWriteHostel, entryForm, loadMenu, notify, request]);

    const clearEntry = useCallback(
        async (entry) => {
            if (!entry?.id) {
                return;
            }

            if (!canWriteHostel) {
                notify(HOSTEL_READ_ONLY_MESSAGE, "error");
                return;
            }

            if (
                !window.confirm(
                    `Clear the ${entry.day_of_week} ${entry.meal_type} menu?`,
                )
            ) {
                return;
            }

            try {
                await request(`${BASE_URL}/admin/hostel/mess-menu/${entry.id}`, {
                    method: "DELETE",
                });

                notify("Menu entry cleared", "success");
                await loadMenu({ silent: true });
            } catch (error) {
                notify(error.message || "Failed to clear menu entry", "error");
            }
        },
        [canWriteHostel, loadMenu, notify, request],
    );

    useEffect(() => {
        if (activeSection !== "mess-menu") {
            loadedRef.current = false;
            return;
        }

        if (loadedRef.current) {
            return;
        }

        loadedRef.current = true;
        loadMenu();
    }, [activeSection, loadMenu]);

    return {
        menuGrid,
        menuStats,
        menuLoading,
        loadMenu,

        entryModalOpen,
        entryForm,
        entrySaving,
        openEntryModal,
        closeEntryModal,
        updateEntryForm,
        saveEntry,
        clearEntry,

        canWriteHostel,
    };
}
