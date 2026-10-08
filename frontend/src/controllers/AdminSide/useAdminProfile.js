import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { BASE_URL } from "../../config/appConfig";

/* =========================================================
   DASHBOARD PERMISSIONS
========================================================= */

const DASHBOARD_PERMISSIONS = {
    SUPER_ADMIN: "all-dashboards",
    ACADEMIC_ADMIN: "academic-admin-dashboard",
    HR_ADMIN: "hr-admin-dashboard",
    HOSTEL_ADMIN: "hostel-admin-dashboard",
    LIBRARY_ADMIN: "library-admin-dashboard",
    ACCOUNTS_ADMIN: "accounts-admin-dashboard",
};

const ALL_RIGHTS = ["read", "write", "edit"];

/* =========================================================
   ADMIN TYPE CONFIGURATION
========================================================= */

const ADMIN_TYPE_CONFIG = {
    "Academic Admin": {
        dashboardType: "admin-dashboard",
        dashboardRoute: "/admin-dashboard",
        permission: DASHBOARD_PERMISSIONS.ACADEMIC_ADMIN,
        flag: "academic",
    },

    "HR Admin": {
        dashboardType: "hr-Mgmt-dashboard",
        dashboardRoute: "/hr-admin-dashboard",
        permission: DASHBOARD_PERMISSIONS.HR_ADMIN,
        flag: "hr",
    },

    "Hostel Admin": {
        dashboardType: "hostels-Mgmt-dashboard",
        dashboardRoute: "/hostel-admin-dashboard",
        permission: DASHBOARD_PERMISSIONS.HOSTEL_ADMIN,
        flag: "hostel",
    },

    "Library Admin": {
        dashboardType: "library-Mgmt-dashboard",
        dashboardRoute: "/library-admin-dashboard",
        permission: DASHBOARD_PERMISSIONS.LIBRARY_ADMIN,
        flag: "library",
    },

    "Accounts Admin": {
        dashboardType: "accounts-Mgmt-dashboard",
        dashboardRoute: "/accounts-admin-dashboard",
        permission: DASHBOARD_PERMISSIONS.ACCOUNTS_ADMIN,
        flag: "accounts",
    },
};

/* =========================================================
   SAFE JSON PARSER
========================================================= */

const safeJson = (value, fallback = null) => {
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

/* =========================================================
   NORMALIZE STRING / ARRAY VALUES
========================================================= */

const normalizeList = (value) => {
    if (!value) return [];

    if (Array.isArray(value)) {
        return value
            .map((item) => String(item).trim())
            .filter(Boolean);
    }

    if (typeof value === "string") {
        const trimmedValue = value.trim();

        if (!trimmedValue) return [];

        const parsedValue = safeJson(trimmedValue);

        if (Array.isArray(parsedValue)) {
            return parsedValue
                .map((item) => String(item).trim())
                .filter(Boolean);
        }

        return trimmedValue
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
};

/* =========================================================
   NORMALIZE PERMISSIONS
========================================================= */

const normalizePermissions = (value) => {
    return [
        ...new Set(
            normalizeList(value).map((permission) =>
                permission.toLowerCase(),
            ),
        ),
    ];
};

/* =========================================================
   NORMALIZE RIGHTS
========================================================= */

const normalizeRights = (value) => {
    return [
        ...new Set(
            normalizeList(value)
                .map((right) => right.toLowerCase())
                .filter((right) => ALL_RIGHTS.includes(right)),
        ),
    ];
};

/* =========================================================
   BUILD ADMIN ACCESS
========================================================= */

const buildAccess = (admin = {}) => {
    const role = String(admin.role || "")
        .trim()
        .toLowerCase();

    const adminType = String(admin.admin_type || "").trim();

    const storedPermissions = normalizePermissions(
        admin.permissions,
    );

    const storedModules = normalizePermissions(
        admin.modules_enabled,
    );

    const storedRights = normalizeRights(admin.access_level);

    const isSuperAdmin =
        role === "super_admin" ||
        adminType === "Super Admin";

    /*
     * SUPER ADMIN
     * Permission: all-dashboards
     * Rights: read, write, edit
     */
    if (isSuperAdmin) {
        return {
            dashboardType: "super-admin-dashboard",
            dashboardRoute: "/super-admin-dashboard",

            isSuperAdmin: true,
            isAcademicAdmin: false,
            isHRAdmin: false,
            isHostelAdmin: false,
            isLibraryAdmin: false,
            isAccountsAdmin: false,

            dashboardPermissions: [
                DASHBOARD_PERMISSIONS.SUPER_ADMIN,
            ],

            permissions: [
                DASHBOARD_PERMISSIONS.SUPER_ADMIN,
            ],

            modules: ["*"],
            allowedModules: ["*"],

            rights: ALL_RIGHTS,

            canRead: true,
            canWrite: true,
            canEdit: true,
            canDelete: true,

            canAccess: () => true,
            canAccessDashboard: () => true,
            hasPermission: () => true,
            hasRight: () => true,
        };
    }

    const config = ADMIN_TYPE_CONFIG[adminType];

    /*
     * KNOWN ADMIN TYPES:
     * Academic, HR, Hostel, Library and Accounts
     */
    if (config) {
        const dashboardPermissions = [
            ...new Set([
                config.permission,
                ...storedPermissions,
            ]),
        ];

        /*
         * modules_enabled may contain old values.
         * Do not automatically use old module values as permissions.
         *
         * Only dashboard permission is used for dashboard access.
         */
        const allowedModules = [
            ...new Set([
                config.permission,
                ...storedModules.filter((module) =>
                    Object.values(
                        DASHBOARD_PERMISSIONS,
                    ).includes(module),
                ),
            ]),
        ];

        const canRead = storedRights.includes("read");
        const canWrite = storedRights.includes("write");
        const canEdit = storedRights.includes("edit");

        return {
            dashboardType: config.dashboardType,
            dashboardRoute: config.dashboardRoute,

            isSuperAdmin: false,
            isAcademicAdmin:
                config.flag === "academic",
            isHRAdmin: config.flag === "hr",
            isHostelAdmin: config.flag === "hostel",
            isLibraryAdmin: config.flag === "library",
            isAccountsAdmin:
                config.flag === "accounts",

            dashboardPermissions,
            permissions: dashboardPermissions,

            modules: allowedModules,
            allowedModules,

            rights: storedRights,

            canRead,
            canWrite,
            canEdit,

            /*
             * Delete can be connected separately later.
             * Currently edit permission also controls delete.
             */
            canDelete: canEdit,

            canAccess: (permissionName) => {
                const normalizedPermission = String(
                    permissionName || "",
                )
                    .trim()
                    .toLowerCase();

                return dashboardPermissions.includes(
                    normalizedPermission,
                );
            },

            canAccessDashboard: (dashboardName) => {
                const normalizedDashboard = String(
                    dashboardName || "",
                )
                    .trim()
                    .toLowerCase();

                return dashboardPermissions.includes(
                    normalizedDashboard,
                );
            },

            hasPermission: (permissionName) => {
                const normalizedPermission = String(
                    permissionName || "",
                )
                    .trim()
                    .toLowerCase();

                return dashboardPermissions.includes(
                    normalizedPermission,
                );
            },

            hasRight: (rightName) => {
                const normalizedRight = String(
                    rightName || "",
                )
                    .trim()
                    .toLowerCase();

                return storedRights.includes(
                    normalizedRight,
                );
            },
        };
    }

    /*
     * FALLBACK ADMIN
     */
    const fallbackPermissions = [
        ...new Set([
            ...storedPermissions,
            ...storedModules.filter((module) =>
                Object.values(
                    DASHBOARD_PERMISSIONS,
                ).includes(module),
            ),
        ]),
    ];

    const canRead = storedRights.includes("read");
    const canWrite = storedRights.includes("write");
    const canEdit = storedRights.includes("edit");

    return {
        dashboardType: "admin-dashboard",
        dashboardRoute: "/admin-dashboard",

        isSuperAdmin: false,
        isAcademicAdmin: false,
        isHRAdmin: false,
        isHostelAdmin: false,
        isLibraryAdmin: false,
        isAccountsAdmin: false,

        dashboardPermissions: fallbackPermissions,
        permissions: fallbackPermissions,

        modules: fallbackPermissions,
        allowedModules: fallbackPermissions,

        rights: storedRights,

        canRead,
        canWrite,
        canEdit,
        canDelete: canEdit,

        canAccess: (permissionName) => {
            const normalizedPermission = String(
                permissionName || "",
            )
                .trim()
                .toLowerCase();

            return fallbackPermissions.includes(
                normalizedPermission,
            );
        },

        canAccessDashboard: (dashboardName) => {
            const normalizedDashboard = String(
                dashboardName || "",
            )
                .trim()
                .toLowerCase();

            return fallbackPermissions.includes(
                normalizedDashboard,
            );
        },

        hasPermission: (permissionName) => {
            const normalizedPermission = String(
                permissionName || "",
            )
                .trim()
                .toLowerCase();

            return fallbackPermissions.includes(
                normalizedPermission,
            );
        },

        hasRight: (rightName) => {
            const normalizedRight = String(
                rightName || "",
            )
                .trim()
                .toLowerCase();

            return storedRights.includes(
                normalizedRight,
            );
        },
    };
};

/* =========================================================
   ADMIN PROFILE HOOK
========================================================= */

export function useAdminProfile({
    fetchWithAuth,
    showToast: externalToast,
} = {}) {
    const [admin, setAdmin] = useState({});
    const [formData, setFormData] = useState({});

    const [loading, setLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);

    const [
        passwordModalOpen,
        setPasswordModalOpen,
    ] = useState(false);

    const [
        passwordLoading,
        setPasswordLoading,
    ] = useState(false);

    const [passwordData, setPasswordData] = useState({
        current_password: "",
        new_password: "",
        confirm_password: "",
    });

    const [toast, setToast] = useState({
        show: false,
        message: "",
        type: "success",
    });

    const fetchedRef = useRef(false);
    const toastTimerRef = useRef(null);

    const access = useMemo(
        () => buildAccess(admin),
        [admin],
    );

    /* =====================================================
       TOAST
    ===================================================== */

    const showToast = useCallback(
        (message, type = "success") => {
            if (externalToast) {
                externalToast(message, type);
                return;
            }

            if (toastTimerRef.current) {
                clearTimeout(toastTimerRef.current);
            }

            setToast({
                show: true,
                message,
                type,
            });

            toastTimerRef.current = setTimeout(() => {
                setToast({
                    show: false,
                    message: "",
                    type,
                });
            }, 3000);
        },
        [externalToast],
    );

    /* =====================================================
       GET AUTH DATA
    ===================================================== */

    const getAuth = useCallback(() => {
        return {
            user: safeJson(
                localStorage.getItem("user"),
                null,
            ),
            token: localStorage.getItem("token"),
        };
    }, []);

    /* =====================================================
       UPDATE LOCAL STORAGE USER
    ===================================================== */

    const updateStoredUser = useCallback(
        (adminData = {}) => {
            const existingUser = safeJson(
                localStorage.getItem("user"),
                {},
            );

            const adminAccess = buildAccess(adminData);

            const updatedUser = {
                ...existingUser,

                id:
                    adminData.id ??
                    existingUser.id,

                admin_id:
                    adminData.admin_id ??
                    existingUser.admin_id,

                user_id:
                    adminData.user_id ??
                    existingUser.user_id,

                role:
                    adminData.role ??
                    existingUser.role,

                admin_type:
                    adminData.admin_type ??
                    existingUser.admin_type,

                permissions:
                    adminData.permissions ??
                    existingUser.permissions,

                modules_enabled:
                    adminData.modules_enabled ??
                    existingUser.modules_enabled,

                access_level:
                    adminData.access_level ??
                    existingUser.access_level,

                dashboard_type:
                    adminData.dashboard_type ??
                    adminAccess.dashboardType,

                dashboard_route:
                    adminAccess.dashboardRoute,

                dashboard_permissions:
                    adminAccess.dashboardPermissions,

                rights: adminAccess.rights,

                can_read: adminAccess.canRead,
                can_write: adminAccess.canWrite,
                can_edit: adminAccess.canEdit,

                is_super_admin:
                    adminAccess.isSuperAdmin,

                is_academic_admin:
                    adminAccess.isAcademicAdmin,

                is_hr_admin:
                    adminAccess.isHRAdmin,

                is_hostel_admin:
                    adminAccess.isHostelAdmin,

                is_library_admin:
                    adminAccess.isLibraryAdmin,

                is_accounts_admin:
                    adminAccess.isAccountsAdmin,
            };

            localStorage.setItem(
                "user",
                JSON.stringify(updatedUser),
            );

            return updatedUser;
        },
        [],
    );

    /* =====================================================
       LOGOUT
    ===================================================== */

    const handleLogout = useCallback(() => {
        // Best-effort server-side revocation: the backend now issues a
        // real expiring token and can invalidate it on logout (previously
        // there was no /api/logout at all, so a token stayed valid until
        // it naturally expired even after the user "logged out" here).
        // Fire-and-forget: don't block clearing local state on the network
        // call, since the user should be able to log out even offline.
        const token = localStorage.getItem("token");
        if (token) {
            fetch(`${BASE_URL}/logout`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {
                // Ignore — local session is cleared regardless below.
            });
        }

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        window.location.href = "/";
    }, []);

    /* =====================================================
       LOAD ADMIN PROFILE
    ===================================================== */

    const loadAdminProfile = useCallback(async () => {
        const { user } = getAuth();

        if (!user?.id) {
            showToast(
                "Admin user information not found",
                "error",
            );
            return;
        }

        if (typeof fetchWithAuth !== "function") {
            console.error(
                "useAdminProfile: fetchWithAuth is not a function",
            );

            showToast(
                "Authentication request function is unavailable",
                "error",
            );
            return;
        }

        try {
            setLoading(true);

            const response = await fetchWithAuth(
                `${BASE_URL}/${user.id}/admin`,
            );

            const data = await response
                .json()
                .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Failed to load admin profile",
                );
            }

            const normalizedAdmin = {
                ...data,

                permissions:
                    data.permissions || "",

                access_level:
                    data.access_level || "",

                modules_enabled:
                    data.modules_enabled || "",
            };

            setAdmin(normalizedAdmin);
            setFormData(normalizedAdmin);

            updateStoredUser(normalizedAdmin);
        } catch (error) {
            console.error(
                "Load admin profile error:",
                error,
            );

            showToast(
                error.message ||
                "Failed to load admin profile",
                "error",
            );
        } finally {
            setLoading(false);
        }
    }, [
        fetchWithAuth,
        getAuth,
        showToast,
        updateStoredUser,
    ]);

    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    useEffect(() => {
        if (fetchedRef.current) return;

        fetchedRef.current = true;
        loadAdminProfile();

        return () => {
            if (toastTimerRef.current) {
                clearTimeout(toastTimerRef.current);
            }
        };
    }, [loadAdminProfile]);

    /* =====================================================
       PROFILE FORM CHANGE
    ===================================================== */

    const handleChange = useCallback((event) => {
        const {
            name,
            value,
            type,
            checked,
        } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]:
                type === "checkbox"
                    ? checked
                    : value,
        }));
    }, []);

    /* =====================================================
       DIRECT FORM FIELD UPDATE
    ===================================================== */

    const updateFormField = useCallback(
        (name, value) => {
            setFormData((previous) => ({
                ...previous,
                [name]: value,
            }));
        },
        [],
    );

    /* =====================================================
       RESET PROFILE FORM
    ===================================================== */

    const resetForm = useCallback(() => {
        setFormData(admin);
        setEditMode(false);
    }, [admin]);

    /* =====================================================
       SAVE PROFILE
    ===================================================== */

    const handleSave = useCallback(async () => {
        if (!admin?.id) {
            showToast(
                "Admin profile ID is missing",
                "error",
            );
            return;
        }

        if (typeof fetchWithAuth !== "function") {
            showToast(
                "Authentication request function is unavailable",
                "error",
            );
            return;
        }

        try {
            setLoading(true);

            const response = await fetchWithAuth(
                `${BASE_URL}/${admin.id}/admin/update`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify(formData),
                },
            );

            const data = await response
                .json()
                .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Admin profile update failed",
                );
            }

            const updatedAdmin = {
                ...admin,
                ...formData,
                ...(data.admin || {}),
            };

            setAdmin(updatedAdmin);
            setFormData(updatedAdmin);
            setEditMode(false);

            updateStoredUser(updatedAdmin);

            showToast(
                data.message ||
                "Profile updated successfully",
                "success",
            );
        } catch (error) {
            console.error(
                "Update admin profile error:",
                error,
            );

            showToast(
                error.message ||
                "Admin profile update failed",
                "error",
            );
        } finally {
            setLoading(false);
        }
    }, [
        admin,
        fetchWithAuth,
        formData,
        showToast,
        updateStoredUser,
    ]);

    /* =====================================================
       PASSWORD FORM CHANGE
    ===================================================== */

    const handlePasswordChange = useCallback(
        (event) => {
            const { name, value } = event.target;

            setPasswordData((previous) => ({
                ...previous,
                [name]: value,
            }));
        },
        [],
    );

    /* =====================================================
       RESET PASSWORD FORM
    ===================================================== */

    const resetPasswordForm = useCallback(() => {
        setPasswordData({
            current_password: "",
            new_password: "",
            confirm_password: "",
        });
    }, []);

    /* =====================================================
       CLOSE PASSWORD MODAL
    ===================================================== */

    const closePasswordModal = useCallback(() => {
        setPasswordModalOpen(false);
        resetPasswordForm();
    }, [resetPasswordForm]);

    /* =====================================================
       CHANGE PASSWORD
    ===================================================== */

    const handleChangePassword =
        useCallback(async () => {
            const { user } = getAuth();

            if (!user?.id) {
                showToast(
                    "Admin user information not found",
                    "error",
                );
                return;
            }

            if (
                !passwordData.current_password ||
                !passwordData.new_password ||
                !passwordData.confirm_password
            ) {
                showToast(
                    "All password fields are required",
                    "error",
                );
                return;
            }

            if (
                passwordData.new_password !==
                passwordData.confirm_password
            ) {
                showToast(
                    "New password and confirm password do not match",
                    "error",
                );
                return;
            }

            if (
                passwordData.new_password.length < 8
            ) {
                showToast(
                    "New password must be at least 8 characters",
                    "error",
                );
                return;
            }

            if (
                passwordData.current_password ===
                passwordData.new_password
            ) {
                showToast(
                    "New password must be different from current password",
                    "error",
                );
                return;
            }

            if (
                typeof fetchWithAuth !== "function"
            ) {
                showToast(
                    "Authentication request function is unavailable",
                    "error",
                );
                return;
            }

            try {
                setPasswordLoading(true);

                const response =
                    await fetchWithAuth(
                        `${BASE_URL}/admin/${user.id}/change-password`,
                        {
                            method: "PUT",
                            headers: {
                                "Content-Type":
                                    "application/json",
                            },
                            body: JSON.stringify(
                                passwordData,
                            ),
                        },
                    );

                const data = await response
                    .json()
                    .catch(() => ({}));

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                        "Password update failed",
                    );
                }

                showToast(
                    data.message ||
                    "Password updated successfully",
                    "success",
                );

                closePasswordModal();
            } catch (error) {
                console.error(
                    "Change password error:",
                    error,
                );

                showToast(
                    error.message ||
                    "Password update failed",
                    "error",
                );
            } finally {
                setPasswordLoading(false);
            }
        }, [
            closePasswordModal,
            fetchWithAuth,
            getAuth,
            passwordData,
            showToast,
        ]);

    /* =====================================================
       REFRESH PROFILE
    ===================================================== */

    const refreshAdminProfile =
        useCallback(async () => {
            await loadAdminProfile();
        }, [loadAdminProfile]);

    /* =====================================================
       RETURN
    ===================================================== */

    return {
        /* Profile */
        admin,
        setAdmin,

        formData,
        setFormData,

        loading,

        editMode,
        setEditMode,

        handleChange,
        updateFormField,
        handleSave,
        resetForm,

        loadAdminProfile,
        refreshAdminProfile,

        /* Password */
        passwordModalOpen,
        setPasswordModalOpen,

        passwordData,
        setPasswordData,

        passwordLoading,

        handlePasswordChange,
        handleChangePassword,

        resetPasswordForm,
        closePasswordModal,

        /* Toast */
        toast,
        showToast,

        /* Authentication */
        getAuth,
        handleLogout,

        /* Dashboard */
        dashboardType: access.dashboardType,
        dashboardRoute: access.dashboardRoute,

        /* Admin types */
        isSuperAdmin: access.isSuperAdmin,
        isAcademicAdmin: access.isAcademicAdmin,
        isHRAdmin: access.isHRAdmin,
        isHostelAdmin: access.isHostelAdmin,
        isLibraryAdmin: access.isLibraryAdmin,
        isAccountsAdmin:
            access.isAccountsAdmin,

        /* Dashboard permissions */
        dashboardPermissions:
            access.dashboardPermissions,

        permissions: access.permissions,

        modules: access.modules,
        allowedModules: access.allowedModules,

        /* Rights */
        rights: access.rights,

        canRead: access.canRead,
        canWrite: access.canWrite,
        canEdit: access.canEdit,
        canDelete: access.canDelete,

        /* Permission methods */
        canAccess: access.canAccess,
        canAccessDashboard:
            access.canAccessDashboard,

        hasPermission: access.hasPermission,
        hasRight: access.hasRight,
    };
}

export default useAdminProfile; 