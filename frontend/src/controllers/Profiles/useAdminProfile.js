import { useEffect, useState, useRef } from "react";
import { BASE_URL } from "../../config/appConfig";

export function useAdminProfile({ fetchWithAuth }) {
    // 👤 Profile
    const [admin, setAdmin] = useState({});
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // 🔐 Password
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordData, setPasswordData] = useState({
        current_password: "",
        new_password: "",
        confirm_password: "",
    });

    // 🍞 Toast
    const [toast, setToast] = useState({
        show: false,
        message: "",
        type: "success",
    });

    // 🛑 Prevent duplicate API calls (IMPORTANT)
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

        // ❌ guard: no user or no fetch function
        if (!user || !fetchWithAuth) return;

        // ❌ prevent duplicate calls (React StrictMode safe)
        if (fetchedRef.current) return;
        fetchedRef.current = true;

        const fetchadmin = async () => {
            try {
                setLoading(true);

                const res = await fetchWithAuth(
                    `${BASE_URL}/${user.id}/admin`
                );

                const data = await res.json();

                setAdmin(data || {});
                setFormData(data || {});
            } catch (err) {
                console.error(err);
                showToast("Failed to load profile", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchadmin();
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
                `${BASE_URL}/${admin.id}/admin/update`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                }
            );

            const data = await res.json();

            if (res.ok) {
                setAdmin(formData);
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
                `${BASE_URL}/admin/${user.id}/change-password`,
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
        admin,
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