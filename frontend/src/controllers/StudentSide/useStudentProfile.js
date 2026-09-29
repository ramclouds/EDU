import { useEffect, useState, useRef } from "react";

const BASE_URL = "http://localhost:5000/api";

export function useStudentProfile({ fetchWithAuth }) {
    // 👤 PROFILE
    const [student, setStudent] = useState({});
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // 🔐 PASSWORD
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordData, setPasswordData] = useState({
        current_password: "",
        new_password: "",
        confirm_password: "",
    });

    // 🍞 TOAST
    const [toast, setToast] = useState({
        show: false,
        message: "",
        type: "success",
    });

    // 🛑 prevent duplicate API calls (React StrictMode safe)
    const fetchedRef = useRef(false);

    // ================= TOAST =================
    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });

        setTimeout(() => {
            setToast({ show: false, message: "", type });
        }, 3000);
    };

    // ================= AUTH =================
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

    // ================= LOGOUT =================
    const logoutUser = () => {
        localStorage.clear();
        window.location.href = "/";
    };

    // ================= PROFILE FETCH =================
    useEffect(() => {
        const { user } = getAuth();

        if (!user || !fetchWithAuth) return;

        // prevent duplicate fetch (StrictMode safe)
        if (fetchedRef.current) return;
        fetchedRef.current = true;

        const fetchStudent = async () => {
            try {
                setLoading(true);

                const res = await fetchWithAuth(
                    `${BASE_URL}/student/${user.id}`
                );

                const data = await res.json();

                setStudent(data || {});
                setFormData(data || {});
            } catch (err) {
                console.error(err);
                showToast("Failed to load profile", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchStudent();
    }, [fetchWithAuth]);

    // ================= PROFILE UPDATE =================
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSave = async () => {
        try {
            const res = await fetchWithAuth(
                `${BASE_URL}/student/update/${student.id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                }
            );

            const data = await res.json();

            if (res.ok) {
                setStudent(formData);
                setEditMode(false);
                showToast("Profile updated");
            } else {
                showToast(data.error || "Update failed", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Update failed", "error");
        }
    };

    // ================= PASSWORD =================
    const handlePasswordChange = (e) => {
        const { name, value } = e.target;

        setPasswordData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleChangePassword = async () => {
        const { user } = getAuth();
        if (!user) return;

        setPasswordLoading(true);

        try {
            const res = await fetchWithAuth(
                `${BASE_URL}/student/change-password/${user.id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(passwordData),
                }
            );

            const data = await res.json();

            if (res.ok) {
                showToast("Password updated successfully ✅");

                setPasswordModalOpen(false);
                setPasswordData({
                    current_password: "",
                    new_password: "",
                    confirm_password: "",
                });
            } else {
                showToast(data.error || "Password update failed", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Something went wrong", "error");
        } finally {
            setPasswordLoading(false);
        }
    };

    // ================= RETURN =================
    return {
        // profile
        student,
        formData,
        loading,
        editMode,
        setEditMode,
        handleChange,
        handleSave,

        // password
        passwordModalOpen,
        setPasswordModalOpen,
        passwordData,
        passwordLoading,
        handlePasswordChange,
        handleChangePassword,

        // logout
        handleLogout: logoutUser,

        // toast
        toast,
        showToast,
    };
}