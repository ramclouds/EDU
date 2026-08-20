import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { BASE_URL } from "../../config/appConfig";

/* =========================================================
   CONSTANTS
========================================================= */

export const RBAC_ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
];

export const RBAC_USER_TYPES = [
  {
    value: "all",
    label: "All Users",
  },
  {
    value: "admin",
    label: "Admins",
  },
  {
    value: "teacher",
    label: "Teachers",
  },
  {
    value: "student",
    label: "Students",
  },
  {
    value: "staff",
    label: "Staff",
  },
];

export const DASHBOARD_PAGES = [
  {
    key: "library-admin-dashboard",
    moduleCode: "library",
    label: "Library Dashboard",
    description: "Library catalogue, issues, returns and fines.",
    icon: "fas fa-book",
  },
  {
    key: "accounts-admin-dashboard",
    moduleCode: "accounts",
    label: "Accounts Dashboard",
    description: "Fee collection, ledgers and financial reports.",
    icon: "fas fa-file-invoice-dollar",
  },
  {
    key: "hostel-admin-dashboard",
    moduleCode: "hostel",
    label: "Hostel Dashboard",
    description: "Room allocation, occupancy and hostel records.",
    icon: "fas fa-building",
  },
  {
    key: "hr-admin-dashboard",
    moduleCode: "hr",
    label: "HR Dashboard",
    description: "Staff records, payroll and HR administration.",
    icon: "fas fa-users-cog",
  },
];

export const DASHBOARD_ACCESS_LEVELS = [
  {
    value: "none",
    label: "No Access",
    description: "Page is hidden and blocked.",
  },
  {
    value: "read",
    label: "Read Only",
    description: "View, filter and download only.",
  },
  {
    value: "write",
    label: "Full Access",
    description: "View, filter, download and CRUD.",
  },
];

/** {view, create, edit, delete} -> "none" | "read" | "write" */
export const dashboardAccessLevelFromActions = (actions = {}) => {
  if (!actions || !actions.view) {
    return "none";
  }

  if (actions.create || actions.edit || actions.delete) {
    return "write";
  }

  return "read";
};

/** "none" | "read" | "write" -> {view, create, edit, delete} */
export const dashboardActionsFromAccessLevel = (level) => {
  if (level === "write") {
    return {
      view: true,
      create: true,
      edit: true,
      delete: true,
    };
  }

  if (level === "read") {
    return {
      view: true,
      create: false,
      edit: false,
      delete: false,
    };
  }

  return {
    view: false,
    create: false,
    edit: false,
    delete: false,
  };
};

const EMPTY_ROLE_FORM = {
  id: null,
  name: "",
  code: "",
  description: "",
  user_type: "admin",
  is_active: true,
};

const EMPTY_USER_FILTERS = {
  user_type: "all",
  search: "",
  role_id: "",
  status: "",
};

const EMPTY_TEMPORARY_ACCESS_FORM = {
  is_temporary: false,
  expires_at: "",
  reason: "",
};

const EMPTY_STATS = {
  total_roles: 0,
  active_roles: 0,
  total_users: 0,
  users_with_overrides: 0,
  temporary_access_users: 0,
};

/* =========================================================
   HELPER FUNCTIONS
========================================================= */

const buildUserKey = (
  userType,
  userId,
) => {
  return `${userType}:${userId}`;
};

const normalizeRolePermissions = (
  modules = [],
  permissions = {},
) => {
  const normalizedPermissions = {};

  modules.forEach((module) => {
    const moduleCode =
      module.code ||
      module.module_code ||
      module.slug;

    if (!moduleCode) {
      return;
    }

    const currentPermissions =
      permissions?.[moduleCode] || {};

    normalizedPermissions[moduleCode] = {
      view: Boolean(
        currentPermissions.view,
      ),
      create: Boolean(
        currentPermissions.create,
      ),
      edit: Boolean(
        currentPermissions.edit,
      ),
      delete: Boolean(
        currentPermissions.delete,
      ),
    };
  });

  return normalizedPermissions;
};

const normalizeOverridePermissions = (
  permissions = {},
) => {
  const normalizedPermissions = {};

  Object.entries(
    permissions || {},
  ).forEach(
    ([
      moduleCode,
      modulePermissions,
    ]) => {
      if (
        !moduleCode ||
        !modulePermissions ||
        typeof modulePermissions !==
        "object"
      ) {
        return;
      }

      const normalizedModule = {};

      RBAC_ACTIONS.forEach(
        (action) => {
          const value =
            modulePermissions[action];

          if (
            value === true ||
            value === false
          ) {
            normalizedModule[action] =
              value;
          }
        },
      );

      if (
        Object.keys(normalizedModule)
          .length > 0
      ) {
        normalizedPermissions[
          moduleCode
        ] = normalizedModule;
      }
    },
  );

  return normalizedPermissions;
};

const normalizeUser = (user) => {
  if (!user) {
    return null;
  }

  const userId =
    user.id ||
    user.user_id ||
    user.admin_id ||
    user.teacher_id ||
    user.student_id ||
    user.staff_id;

  const userType =
    user.user_type ||
    user.type ||
    "admin";

  const fullName =
    user.name ||
    user.full_name ||
    [
      user.first_name,
      user.middle_name,
      user.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    user.username ||
    `User ${userId}`;

  return {
    ...user,

    id: userId,
    user_type: userType,

    name: fullName,

    user_key:
      user.user_key ||
      buildUserKey(
        userType,
        userId,
      ),

    role_id:
      user.role_id ||
      user.role?.id ||
      null,

    role_name:
      user.role_name ||
      user.role?.name ||
      "No Role",

    has_overrides: Boolean(
      user.has_overrides,
    ),

    is_temporary: Boolean(
      user.is_temporary,
    ),
  };
};

const formatDateTimeLocal = (
  dateValue,
) => {
  if (!dateValue) {
    return "";
  }

  const parsedDate = new Date(
    dateValue,
  );

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return "";
  }

  const year =
    parsedDate.getFullYear();

  const month = String(
    parsedDate.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    parsedDate.getDate(),
  ).padStart(2, "0");

  const hours = String(
    parsedDate.getHours(),
  ).padStart(2, "0");

  const minutes = String(
    parsedDate.getMinutes(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const createApiError = async (
  response,
  fallbackMessage,
) => {
  let responseData = {};

  try {
    responseData =
      await response.json();
  } catch {
    responseData = {};
  }

  const error = new Error(
    responseData.error ||
    responseData.message ||
    fallbackMessage ||
    `Request failed with status ${response.status}`,
  );

  error.status = response.status;
  error.data = responseData;

  return error;
};

/* =========================================================
   MAIN HOOK
========================================================= */

export function useRolePermissionManagement({
  activeSection,
  fetchWithAuth,
  showToast,
} = {}) {
  /* =======================================================
     STABLE EXTERNAL FUNCTION REFERENCES
  ======================================================= */

  const mountedRef = useRef(false);

  const fetchWithAuthRef =
    useRef(fetchWithAuth);

  const showToastRef =
    useRef(showToast);

  const userFiltersRef = useRef(
    EMPTY_USER_FILTERS,
  );

  /* =======================================================
     REQUEST GUARDS
  ======================================================= */

  const bootstrapLoadedRef =
    useRef(false);

  const bootstrapInFlightRef =
    useRef(false);

  const bootstrapRequestIdRef =
    useRef(0);

  const rolesInFlightRef =
    useRef(false);

  const usersInFlightRef =
    useRef(false);

  const userAccessRequestIdRef =
    useRef(0);

  /* =======================================================
     MAIN DATA
  ======================================================= */

  const [
    rbacModules,
    setRbacModules,
  ] = useState([]);

  const [
    rbacRoles,
    setRbacRoles,
  ] = useState([]);

  const [
    rbacUsers,
    setRbacUsers,
  ] = useState([]);

  const [
    rbacStats,
    setRbacStats,
  ] = useState(EMPTY_STATS);

  /* =======================================================
     SELECTED ROLE AND USER
  ======================================================= */

  const [
    rbacSelectedRoleId,
    setRbacSelectedRoleId,
  ] = useState("");

  const [
    rbacSelectedUserKey,
    setRbacSelectedUserKey,
  ] = useState("");

  const [
    rbacSelectedUserAccess,
    setRbacSelectedUserAccess,
  ] = useState(null);

  /* =======================================================
     FORMS
  ======================================================= */

  const [
    rbacRoleForm,
    setRbacRoleForm,
  ] = useState(EMPTY_ROLE_FORM);

  const [
    rbacRolePermissionForm,
    setRbacRolePermissionForm,
  ] = useState({});

  const [
    rbacUserOverrideForm,
    setRbacUserOverrideForm,
  ] = useState({});

  const [
    rbacUserFilters,
    setRbacUserFilters,
  ] = useState(
    EMPTY_USER_FILTERS,
  );

  const [
    rbacTemporaryAccessForm,
    setRbacTemporaryAccessForm,
  ] = useState(
    EMPTY_TEMPORARY_ACCESS_FORM,
  );

  /* =======================================================
     MODALS
  ======================================================= */

  const [
    rbacRoleModalOpen,
    setRbacRoleModalOpen,
  ] = useState(false);

  const [
    rbacDeleteRoleModalOpen,
    setRbacDeleteRoleModalOpen,
  ] = useState(false);

  const [
    rbacUserAccessModalOpen,
    setRbacUserAccessModalOpen,
  ] = useState(false);

  /* =======================================================
     LOADING STATES
  ======================================================= */

  const [
    rbacLoading,
    setRbacLoading,
  ] = useState(false);

  const [
    rbacRolesLoading,
    setRbacRolesLoading,
  ] = useState(false);

  const [
    rbacUsersLoading,
    setRbacUsersLoading,
  ] = useState(false);

  const [
    rbacUserAccessLoading,
    setRbacUserAccessLoading,
  ] = useState(false);

  const [
    rbacSavingRole,
    setRbacSavingRole,
  ] = useState(false);

  const [
    rbacSavingPermissions,
    setRbacSavingPermissions,
  ] = useState(false);

  const [
    rbacSavingUserAccess,
    setRbacSavingUserAccess,
  ] = useState(false);

  const [
    rbacDeletingRole,
    setRbacDeletingRole,
  ] = useState(false);

  /* =======================================================
     KEEP PROPS INSIDE STABLE REFS
  ======================================================= */

  useEffect(() => {
    fetchWithAuthRef.current =
      fetchWithAuth;
  }, [fetchWithAuth]);

  useEffect(() => {
    showToastRef.current =
      showToast;
  }, [showToast]);

  useEffect(() => {
    userFiltersRef.current =
      rbacUserFilters;
  }, [rbacUserFilters]);

  /* =======================================================
     MOUNT STATUS
  ======================================================= */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      bootstrapRequestIdRef.current +=
        1;

      userAccessRequestIdRef.current +=
        1;
    };
  }, []);

  /* =======================================================
     DERIVED VALUES
  ======================================================= */

  const rbacSelectedRole =
    useMemo(() => {
      return (
        rbacRoles.find(
          (role) =>
            String(role.id) ===
            String(
              rbacSelectedRoleId,
            ),
        ) || null
      );
    }, [
      rbacRoles,
      rbacSelectedRoleId,
    ]);

  const rbacSelectedUser =
    useMemo(() => {
      const selectedFromList =
        rbacUsers.find(
          (user) =>
            user.user_key ===
            rbacSelectedUserKey,
        );

      return (
        selectedFromList ||
        normalizeUser(
          rbacSelectedUserAccess?.user,
        ) ||
        null
      );
    }, [
      rbacUsers,
      rbacSelectedUserKey,
      rbacSelectedUserAccess,
    ]);

  const rbacRoleOptions =
    useMemo(() => {
      return rbacRoles
        .filter(
          (role) =>
            role.is_active !== false,
        )
        .filter((role) => {
          if (
            !rbacSelectedUser?.user_type
          ) {
            return true;
          }

          return (
            role.user_type ===
            rbacSelectedUser.user_type ||
            role.user_type === "all" ||
            role.user_type === "common"
          );
        });
    }, [
      rbacRoles,
      rbacSelectedUser,
    ]);

  const rbacHasUnsavedRolePermissionChanges =
    useMemo(() => {
      if (!rbacSelectedRole) {
        return false;
      }

      const originalPermissions =
        normalizeRolePermissions(
          rbacModules,
          rbacSelectedRole.permissions,
        );

      return (
        JSON.stringify(
          originalPermissions,
        ) !==
        JSON.stringify(
          rbacRolePermissionForm,
        )
      );
    }, [
      rbacModules,
      rbacSelectedRole,
      rbacRolePermissionForm,
    ]);

  const rbacHasUnsavedOverrideChanges =
    useMemo(() => {
      if (!rbacSelectedUserAccess) {
        return false;
      }

      const originalOverrides =
        normalizeOverridePermissions(
          rbacSelectedUserAccess.override_permissions ||
          {},
        );

      const currentOverrides =
        normalizeOverridePermissions(
          rbacUserOverrideForm,
        );

      const originalTemporary = {
        is_temporary: Boolean(
          rbacSelectedUserAccess.is_temporary,
        ),

        expires_at:
          formatDateTimeLocal(
            rbacSelectedUserAccess.expires_at,
          ),

        reason:
          rbacSelectedUserAccess.access_reason ||
          rbacSelectedUserAccess.reason ||
          "",
      };

      const currentTemporary = {
        is_temporary: Boolean(
          rbacTemporaryAccessForm.is_temporary,
        ),

        expires_at:
          rbacTemporaryAccessForm.is_temporary
            ? rbacTemporaryAccessForm.expires_at
            : "",

        reason:
          rbacTemporaryAccessForm.reason ||
          "",
      };

      return (
        JSON.stringify(
          originalOverrides,
        ) !==
        JSON.stringify(
          currentOverrides,
        ) ||
        JSON.stringify(
          originalTemporary,
        ) !==
        JSON.stringify(
          currentTemporary,
        )
      );
    }, [
      rbacSelectedUserAccess,
      rbacUserOverrideForm,
      rbacTemporaryAccessForm,
    ]);

  /* =======================================================
     TOAST HELPER
  ======================================================= */

  const showRbacToast =
    useCallback(
      (
        message,
        type = "success",
      ) => {
        const toast =
          showToastRef.current;

        if (
          typeof toast === "function"
        ) {
          toast(message, type);
          return;
        }

        if (type === "error") {
          console.error(message);
        } else {
          console.log(message);
        }
      },
      [],
    );

  /* =======================================================
     API REQUEST HELPER
  ======================================================= */

  const rbacApiRequest =
    useCallback(
      async (
        path,
        options = {},
      ) => {
        const externalAuthenticatedFetch =
          fetchWithAuthRef.current;

        // Preserve the existing fetchWithAuth contract. When the parent
        // dashboard does not pass it, use the same stored auth token only
        // for RBAC requests instead of breaking the complete section.
        const authenticatedFetch =
          typeof externalAuthenticatedFetch === "function"
            ? externalAuthenticatedFetch
            : async (url, requestOptions = {}) => {
              const token = localStorage.getItem("token");

              return fetch(url, {
                ...requestOptions,
                headers: {
                  ...(requestOptions.headers || {}),
                  ...(token
                    ? { Authorization: `Bearer ${token}` }
                    : {}),
                },
              });
            };

        const hasBody =
          options.body !== undefined &&
          options.body !== null;

        const response =
          await authenticatedFetch(
            `${BASE_URL}${path}`,
            {
              ...options,

              headers: {
                ...(hasBody
                  ? {
                    "Content-Type":
                      "application/json",
                  }
                  : {}),

                ...(options.headers ||
                  {}),
              },
            },
          );

        if (!response?.ok) {
          throw await createApiError(
            response,
            "Role and permission request failed",
          );
        }

        if (
          response.status === 204
        ) {
          return null;
        }

        const contentType =
          response.headers?.get?.(
            "content-type",
          ) || "";

        if (
          !contentType.includes(
            "application/json",
          )
        ) {
          return null;
        }

        return response.json();
      },
      [],
    );

  /* =======================================================
     LOCAL STAT UPDATE
  ======================================================= */

  const updateRbacRoleStats =
    useCallback(
      (nextRoles) => {
        setRbacStats(
          (previousStats) => ({
            ...previousStats,

            total_roles:
              nextRoles.length,

            active_roles:
              nextRoles.filter(
                (role) =>
                  role.is_active !==
                  false,
              ).length,
          }),
        );
      },
      [],
    );

  /* =======================================================
     BOOTSTRAP
  ======================================================= */

  const loadRbacRolePermissionBootstrap =
    useCallback(
      async (
        forceRefresh = false,
      ) => {
        const shouldForceRefresh =
          forceRefresh === true;

        if (
          bootstrapInFlightRef.current
        ) {
          return null;
        }

        if (
          bootstrapLoadedRef.current &&
          !shouldForceRefresh
        ) {
          return null;
        }

        const requestId =
          ++bootstrapRequestIdRef.current;

        bootstrapInFlightRef.current =
          true;

        try {
          if (mountedRef.current) {
            setRbacLoading(true);
          }

          const responseData =
            await rbacApiRequest(
              "/rbac/bootstrap",
            );

          if (!mountedRef.current) {
            return null;
          }

          if (
            requestId !==
            bootstrapRequestIdRef.current
          ) {
            return null;
          }

          const nextModules =
            Array.isArray(
              responseData?.modules,
            )
              ? responseData.modules
              : [];

          const nextRoles =
            Array.isArray(
              responseData?.roles,
            )
              ? responseData.roles
              : [];

          setRbacModules(
            nextModules,
          );

          setRbacRoles(nextRoles);

          setRbacStats({
            ...EMPTY_STATS,
            ...(responseData?.stats ||
              {}),

            total_roles:
              responseData?.stats
                ?.total_roles ??
              nextRoles.length,

            active_roles:
              responseData?.stats
                ?.active_roles ??
              nextRoles.filter(
                (role) =>
                  role.is_active !==
                  false,
              ).length,
          });

          setRbacSelectedRoleId(
            (currentRoleId) => {
              const roleStillExists =
                currentRoleId &&
                nextRoles.some(
                  (role) =>
                    String(role.id) ===
                    String(
                      currentRoleId,
                    ),
                );

              if (roleStillExists) {
                return currentRoleId;
              }

              return nextRoles[0]?.id
                ? String(
                  nextRoles[0].id,
                )
                : "";
            },
          );

          bootstrapLoadedRef.current =
            true;

          return responseData;
        } catch (error) {
          console.error(
            "RBAC bootstrap error:",
            error,
          );

          bootstrapLoadedRef.current =
            false;

          showRbacToast(
            error.message ||
            "Failed to load role and permission management",
            "error",
          );

          return null;
        } finally {
          bootstrapInFlightRef.current =
            false;

          if (
            mountedRef.current &&
            requestId ===
            bootstrapRequestIdRef.current
          ) {
            setRbacLoading(false);
          }
        }
      },
      [
        rbacApiRequest,
        showRbacToast,
      ],
    );

  /* =======================================================
     LOAD ROLES
  ======================================================= */

  const loadRbacRoles =
    useCallback(
      async (
        showErrorToast = true,
      ) => {
        if (
          rolesInFlightRef.current
        ) {
          return [];
        }

        rolesInFlightRef.current =
          true;

        try {
          if (mountedRef.current) {
            setRbacRolesLoading(
              true,
            );
          }

          const responseData =
            await rbacApiRequest(
              "/rbac/roles",
            );

          if (!mountedRef.current) {
            return [];
          }

          const nextRoles =
            Array.isArray(
              responseData?.roles,
            )
              ? responseData.roles
              : [];

          setRbacRoles(nextRoles);

          updateRbacRoleStats(
            nextRoles,
          );

          setRbacSelectedRoleId(
            (currentRoleId) => {
              const roleStillExists =
                currentRoleId &&
                nextRoles.some(
                  (role) =>
                    String(role.id) ===
                    String(
                      currentRoleId,
                    ),
                );

              if (roleStillExists) {
                return currentRoleId;
              }

              return nextRoles[0]?.id
                ? String(
                  nextRoles[0].id,
                )
                : "";
            },
          );

          return nextRoles;
        } catch (error) {
          console.error(
            "Load roles error:",
            error,
          );

          if (showErrorToast) {
            showRbacToast(
              error.message ||
              "Failed to load roles",
              "error",
            );
          }

          return [];
        } finally {
          rolesInFlightRef.current =
            false;

          if (mountedRef.current) {
            setRbacRolesLoading(
              false,
            );
          }
        }
      },
      [
        rbacApiRequest,
        showRbacToast,
        updateRbacRoleStats,
      ],
    );

  /* =======================================================
     ROLE SELECTION
  ======================================================= */

  const selectRbacRole =
    useCallback(
      (roleOrRoleId) => {
        const roleId =
          typeof roleOrRoleId ===
            "object"
            ? roleOrRoleId?.id
            : roleOrRoleId;

        setRbacSelectedRoleId(
          roleId
            ? String(roleId)
            : "",
        );
      },
      [],
    );

  /* =======================================================
     ROLE MODAL
  ======================================================= */

  const openRbacCreateRoleModal =
    useCallback(
      (
        userType = "admin",
      ) => {
        setRbacRoleForm({
          ...EMPTY_ROLE_FORM,

          user_type:
            userType || "admin",
        });

        setRbacRoleModalOpen(
          true,
        );
      },
      [],
    );

  const openRbacEditRoleModal =
    useCallback((role) => {
      if (!role) {
        return;
      }

      setRbacRoleForm({
        id: role.id,

        name:
          role.name || "",

        code:
          role.code || "",

        description:
          role.description || "",

        user_type:
          role.user_type ||
          "admin",

        is_active:
          role.is_active !== false,
      });

      setRbacRoleModalOpen(true);
    }, []);

  const closeRbacRoleModal =
    useCallback(() => {
      if (rbacSavingRole) {
        return;
      }

      setRbacRoleModalOpen(
        false,
      );

      setRbacRoleForm({
        ...EMPTY_ROLE_FORM,
      });
    }, [rbacSavingRole]);

  const updateRbacRoleForm =
    useCallback(
      (
        fieldOrEvent,
        fieldValue,
      ) => {
        if (
          fieldOrEvent &&
          typeof fieldOrEvent ===
          "object" &&
          fieldOrEvent.target
        ) {
          const { target } =
            fieldOrEvent;

          setRbacRoleForm(
            (previousForm) => ({
              ...previousForm,

              [target.name]:
                target.type ===
                  "checkbox"
                  ? target.checked
                  : target.value,
            }),
          );

          return;
        }

        setRbacRoleForm(
          (previousForm) => ({
            ...previousForm,

            [fieldOrEvent]:
              fieldValue,
          }),
        );
      },
      [],
    );

  /* =======================================================
     SAVE ROLE
  ======================================================= */

  const saveRbacRole =
    useCallback(async () => {
      const roleName = String(
        rbacRoleForm.name || "",
      ).trim();

      const roleCode = String(
        rbacRoleForm.code || "",
      )
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");

      if (!roleName) {
        showRbacToast(
          "Role name is required",
          "error",
        );

        return false;
      }

      if (!roleCode) {
        showRbacToast(
          "Role code is required",
          "error",
        );

        return false;
      }

      const payload = {
        name: roleName,

        code: roleCode,

        description: String(
          rbacRoleForm.description ||
          "",
        ).trim(),

        user_type:
          rbacRoleForm.user_type ||
          "admin",

        is_active: Boolean(
          rbacRoleForm.is_active,
        ),
      };

      try {
        setRbacSavingRole(true);

        const responseData =
          rbacRoleForm.id
            ? await rbacApiRequest(
              `/rbac/roles/${rbacRoleForm.id}`,
              {
                method: "PUT",

                body: JSON.stringify(
                  payload,
                ),
              },
            )
            : await rbacApiRequest(
              "/rbac/roles",
              {
                method: "POST",

                body: JSON.stringify(
                  payload,
                ),
              },
            );

        const savedRole =
          responseData?.role;

        await loadRbacRoles(false);

        if (savedRole?.id) {
          setRbacSelectedRoleId(
            String(savedRole.id),
          );
        }

        setRbacRoleModalOpen(
          false,
        );

        setRbacRoleForm({
          ...EMPTY_ROLE_FORM,
        });

        showRbacToast(
          rbacRoleForm.id
            ? "Role updated successfully"
            : "Role created successfully",
        );

        return true;
      } catch (error) {
        console.error(
          "Save role error:",
          error,
        );

        showRbacToast(
          error.message ||
          "Failed to save role",
          "error",
        );

        return false;
      } finally {
        if (mountedRef.current) {
          setRbacSavingRole(
            false,
          );
        }
      }
    }, [
      rbacApiRequest,
      loadRbacRoles,
      rbacRoleForm,
      showRbacToast,
    ]);

  /* =======================================================
     DELETE ROLE
  ======================================================= */

  const openRbacDeleteRoleModal =
    useCallback((role) => {
      if (!role) {
        return;
      }

      setRbacSelectedRoleId(
        String(role.id),
      );

      setRbacDeleteRoleModalOpen(
        true,
      );
    }, []);

  const closeRbacDeleteRoleModal =
    useCallback(() => {
      if (rbacDeletingRole) {
        return;
      }

      setRbacDeleteRoleModalOpen(
        false,
      );
    }, [rbacDeletingRole]);

  const deleteRbacRole =
    useCallback(async () => {
      if (!rbacSelectedRoleId) {
        showRbacToast(
          "Select a role first",
          "error",
        );

        return false;
      }

      if (
        rbacSelectedRole?.is_system
      ) {
        showRbacToast(
          "Default system roles cannot be deleted",
          "error",
        );

        return false;
      }

      try {
        setRbacDeletingRole(true);

        const deleteResponse =
          await rbacApiRequest(
            `/rbac/roles/${rbacSelectedRoleId}`,
            {
              method: "DELETE",
            },
          );

        setRbacDeleteRoleModalOpen(
          false,
        );

        setRbacSelectedRoleId("");

        await loadRbacRoles(false);

        const unassignedUsers =
          Number(
            deleteResponse?.unassigned_users ||
            0,
          );

        showRbacToast(
          unassignedUsers > 0
            ? `Role deleted and removed from ${unassignedUsers} assigned user${unassignedUsers === 1 ? "" : "s"}`
            : "Role deleted successfully",
        );

        return true;
      } catch (error) {
        console.error(
          "Delete role error:",
          error,
        );

        showRbacToast(
          error.message ||
          "Failed to delete role",
          "error",
        );

        return false;
      } finally {
        if (mountedRef.current) {
          setRbacDeletingRole(
            false,
          );
        }
      }
    }, [
      rbacApiRequest,
      loadRbacRoles,
      rbacSelectedRole,
      rbacSelectedRoleId,
      showRbacToast,
    ]);

  /* =======================================================
     SYNC SELECTED ROLE PERMISSIONS
  ======================================================= */

  useEffect(() => {
    if (!rbacSelectedRole) {
      setRbacRolePermissionForm(
        normalizeRolePermissions(
          rbacModules,
          {},
        ),
      );

      return;
    }

    setRbacRolePermissionForm(
      normalizeRolePermissions(
        rbacModules,
        rbacSelectedRole.permissions,
      ),
    );
  }, [
    rbacModules,
    rbacSelectedRole,
  ]);

  /* =======================================================
     ROLE PERMISSION ACTIONS
  ======================================================= */

  const toggleRbacRolePermission =
    useCallback(
      (
        moduleCode,
        action,
        checked,
      ) => {
        if (
          !moduleCode ||
          !RBAC_ACTIONS.includes(
            action,
          )
        ) {
          return;
        }

        setRbacRolePermissionForm(
          (previousPermissions) => {
            const currentModule = {
              view: false,
              create: false,
              edit: false,
              delete: false,

              ...(previousPermissions[
                moduleCode
              ] || {}),
            };

            const nextValue =
              typeof checked ===
                "boolean"
                ? checked
                : !Boolean(
                  currentModule[
                  action
                  ],
                );

            const nextModule = {
              ...currentModule,

              [action]: nextValue,
            };

            if (
              [
                "create",
                "edit",
                "delete",
              ].includes(action) &&
              nextValue
            ) {
              nextModule.view = true;
            }

            if (
              action === "view" &&
              !nextValue
            ) {
              nextModule.create =
                false;

              nextModule.edit =
                false;

              nextModule.delete =
                false;
            }

            return {
              ...previousPermissions,

              [moduleCode]:
                nextModule,
            };
          },
        );
      },
      [],
    );

  const setAllRbacRolePermissions =
    useCallback(
      (enabled) => {
        const nextPermissions =
          {};

        rbacModules.forEach(
          (module) => {
            const moduleCode =
              module.code ||
              module.module_code ||
              module.slug;

            if (!moduleCode) {
              return;
            }

            nextPermissions[
              moduleCode
            ] = {
              view: Boolean(enabled),
              create: Boolean(
                enabled,
              ),
              edit: Boolean(enabled),
              delete: Boolean(
                enabled,
              ),
            };
          },
        );

        setRbacRolePermissionForm(
          nextPermissions,
        );
      },
      [rbacModules],
    );

  const setRbacRoleModulePermissions =
    useCallback(
      (
        moduleCode,
        enabled,
      ) => {
        if (!moduleCode) {
          return;
        }

        setRbacRolePermissionForm(
          (previousPermissions) => ({
            ...previousPermissions,

            [moduleCode]: {
              view: Boolean(enabled),
              create: Boolean(
                enabled,
              ),
              edit: Boolean(enabled),
              delete: Boolean(
                enabled,
              ),
            },
          }),
        );
      },
      [],
    );

  /* =======================================================
     DASHBOARD-PAGE PERMISSIONS (ROLE LEVEL)
     ---------------------------------------------------------
     Thin view over rbacRolePermissionForm that speaks in terms
     of whole dashboard pages (Read / Write / No Access) instead
     of individual view/create/edit/delete checkboxes per
     module. Saving still goes through the existing
     saveRbacRolePermissions()/RBACRolePermissionAPI flow, so no
     backend changes are required to support this view.
  ======================================================= */

  const rbacDashboardPermissionForm =
    useMemo(
      () =>
        DASHBOARD_PAGES.map((page) => ({
          ...page,
          access: dashboardAccessLevelFromActions(
            rbacRolePermissionForm?.[page.moduleCode],
          ),
        })),
      [rbacRolePermissionForm],
    );

  const setRbacDashboardAccess =
    useCallback(
      (moduleCode, level) => {
        if (!moduleCode) {
          return;
        }

        setRbacRolePermissionForm(
          (previousPermissions) => ({
            ...previousPermissions,
            [moduleCode]: dashboardActionsFromAccessLevel(level),
          }),
        );
      },
      [],
    );

  const saveRbacRolePermissions =
    useCallback(async () => {
      if (!rbacSelectedRoleId) {
        showRbacToast(
          "Select a role first",
          "error",
        );

        return false;
      }

      try {
        setRbacSavingPermissions(
          true,
        );

        const responseData =
          await rbacApiRequest(
            `/rbac/roles/${rbacSelectedRoleId}/permissions`,
            {
              method: "PUT",

              body: JSON.stringify({
                permissions:
                  rbacRolePermissionForm,
              }),
            },
          );

        const updatedRole =
          responseData?.role;

        if (updatedRole?.id) {
          setRbacRoles(
            (previousRoles) =>
              previousRoles.map(
                (role) =>
                  String(role.id) ===
                    String(
                      updatedRole.id,
                    )
                    ? updatedRole
                    : role,
              ),
          );

          setRbacRolePermissionForm(
            normalizeRolePermissions(
              rbacModules,
              updatedRole.permissions,
            ),
          );
        } else {
          await loadRbacRoles(
            false,
          );
        }

        showRbacToast(
          "Role permissions updated successfully",
        );

        return true;
      } catch (error) {
        console.error(
          "Save role permissions error:",
          error,
        );

        showRbacToast(
          error.message ||
          "Failed to update role permissions",
          "error",
        );

        return false;
      } finally {
        if (mountedRef.current) {
          setRbacSavingPermissions(
            false,
          );
        }
      }
    }, [
      rbacApiRequest,
      loadRbacRoles,
      rbacModules,
      rbacRolePermissionForm,
      rbacSelectedRoleId,
      showRbacToast,
    ]);

  /* =======================================================
     USER FILTERS
  ======================================================= */

  const updateRbacUserFilter =
    useCallback(
      (
        fieldOrEvent,
        fieldValue,
      ) => {
        if (
          fieldOrEvent &&
          typeof fieldOrEvent ===
          "object" &&
          fieldOrEvent.target
        ) {
          const { target } =
            fieldOrEvent;

          setRbacUserFilters(
            (previousFilters) => ({
              ...previousFilters,

              [target.name]:
                target.value,
            }),
          );

          return;
        }

        setRbacUserFilters(
          (previousFilters) => ({
            ...previousFilters,

            [fieldOrEvent]:
              fieldValue,
          }),
        );
      },
      [],
    );

  const resetRbacUserFilters =
    useCallback(() => {
      const resetFilters = {
        ...EMPTY_USER_FILTERS,
      };

      userFiltersRef.current =
        resetFilters;

      setRbacUserFilters(
        resetFilters,
      );

      return resetFilters;
    }, []);

  /* =======================================================
     LOAD USERS
  ======================================================= */

  const loadRbacUsers =
    useCallback(
      async (
        filtersOverride = null,
        options = {},
      ) => {
        if (
          usersInFlightRef.current
        ) {
          return [];
        }

        const filters =
          filtersOverride &&
            typeof filtersOverride ===
            "object" &&
            !filtersOverride.target
            ? {
              ...EMPTY_USER_FILTERS,
              ...filtersOverride,
            }
            : {
              ...EMPTY_USER_FILTERS,
              ...userFiltersRef.current,
            };

        const params =
          new URLSearchParams();

        if (filters.user_type) {
          params.set(
            "user_type",
            filters.user_type,
          );
        }

        const searchValue =
          String(
            filters.search || "",
          ).trim();

        if (searchValue) {
          params.set(
            "search",
            searchValue,
          );
        }

        if (filters.role_id) {
          params.set(
            "role_id",
            filters.role_id,
          );
        }

        if (filters.status) {
          params.set(
            "status",
            filters.status,
          );
        }

        usersInFlightRef.current =
          true;

        try {
          if (mountedRef.current) {
            setRbacUsersLoading(
              true,
            );
          }

          const queryString =
            params.toString();

          const responseData =
            await rbacApiRequest(
              queryString
                ? `/rbac/users?${queryString}`
                : "/rbac/users",
            );

          if (!mountedRef.current) {
            return [];
          }

          const nextUsers =
            Array.isArray(
              responseData?.users,
            )
              ? responseData.users
                .map(normalizeUser)
                .filter(Boolean)
              : [];

          setRbacUsers(nextUsers);

          setRbacStats(
            (previousStats) => ({
              ...previousStats,

              total_users:
                responseData?.stats
                  ?.total_users ??
                responseData?.total ??
                nextUsers.length,

              users_with_overrides:
                responseData?.stats
                  ?.users_with_overrides ??
                nextUsers.filter(
                  (user) =>
                    user.has_overrides,
                ).length,

              temporary_access_users:
                responseData?.stats
                  ?.temporary_access_users ??
                nextUsers.filter(
                  (user) =>
                    user.is_temporary,
                ).length,
            }),
          );

          if (
            options.clearSelectedUser ===
            true
          ) {
            userAccessRequestIdRef.current +=
              1;

            setRbacSelectedUserKey(
              "",
            );

            setRbacSelectedUserAccess(
              null,
            );

            setRbacUserOverrideForm(
              {},
            );

            setRbacTemporaryAccessForm({
              ...EMPTY_TEMPORARY_ACCESS_FORM,
            });

            setRbacUserAccessModalOpen(
              false,
            );
          } else {
            setRbacSelectedUserKey(
              (currentUserKey) => {
                const userStillExists =
                  currentUserKey &&
                  nextUsers.some(
                    (user) =>
                      user.user_key ===
                      currentUserKey,
                  );

                return userStillExists
                  ? currentUserKey
                  : "";
              },
            );
          }

          return nextUsers;
        } catch (error) {
          console.error(
            "Load RBAC users error:",
            error,
          );

          showRbacToast(
            error.message ||
            "Failed to load users",
            "error",
          );

          return [];
        } finally {
          usersInFlightRef.current =
            false;

          if (mountedRef.current) {
            setRbacUsersLoading(
              false,
            );
          }
        }
      },
      [
        rbacApiRequest,
        showRbacToast,
      ],
    );

  /* =======================================================
     LOAD SELECTED USER ACCESS
  ======================================================= */

  const loadRbacUserAccess =
    useCallback(
      async (
        userType,
        userId,
      ) => {
        if (
          !userType ||
          !userId
        ) {
          setRbacSelectedUserAccess(
            null,
          );

          setRbacUserOverrideForm(
            {},
          );

          setRbacTemporaryAccessForm({
            ...EMPTY_TEMPORARY_ACCESS_FORM,
          });

          return null;
        }

        const requestId =
          ++userAccessRequestIdRef.current;

        try {
          if (mountedRef.current) {
            setRbacUserAccessLoading(
              true,
            );
          }

          const responseData =
            await rbacApiRequest(
              `/rbac/users/${userType}/${userId}/access`,
            );

          if (!mountedRef.current) {
            return null;
          }

          if (
            requestId !==
            userAccessRequestIdRef.current
          ) {
            return null;
          }

          const normalizedUser =
            normalizeUser(
              responseData?.user,
            );

          const normalizedOverrides =
            normalizeOverridePermissions(
              responseData?.override_permissions ||
              {},
            );

          const normalizedAccessData = {
            ...responseData,

            user: normalizedUser,

            override_permissions:
              normalizedOverrides,

            is_temporary: Boolean(
              responseData?.is_temporary,
            ),

            expires_at:
              responseData?.expires_at ||
              null,

            access_reason:
              responseData?.access_reason ||
              responseData?.reason ||
              "",
          };

          setRbacSelectedUserAccess(
            normalizedAccessData,
          );

          setRbacUserOverrideForm(
            normalizedOverrides,
          );

          setRbacTemporaryAccessForm({
            is_temporary: Boolean(
              normalizedAccessData.is_temporary,
            ),

            expires_at:
              normalizedAccessData.expires_at
                ? formatDateTimeLocal(
                  normalizedAccessData.expires_at,
                )
                : "",

            reason:
              normalizedAccessData.access_reason ||
              "",
          });

          return normalizedAccessData;
        } catch (error) {
          console.error(
            "Load user access error:",
            error,
          );

          if (
            requestId ===
            userAccessRequestIdRef.current
          ) {
            showRbacToast(
              error.message ||
              "Failed to load user access",
              "error",
            );
          }

          return null;
        } finally {
          if (
            mountedRef.current &&
            requestId ===
            userAccessRequestIdRef.current
          ) {
            setRbacUserAccessLoading(
              false,
            );
          }
        }
      },
      [
        rbacApiRequest,
        showRbacToast,
      ],
    );

  /* =======================================================
     SELECT USER AND OPEN POPUP
  ======================================================= */

  const selectRbacUser =
    useCallback(
      async (
        userOrKey,
        openModal = true,
      ) => {
        let selectedUser = null;

        if (
          userOrKey &&
          typeof userOrKey ===
          "object"
        ) {
          selectedUser =
            normalizeUser(
              userOrKey,
            );
        } else {
          selectedUser =
            rbacUsers.find(
              (user) =>
                user.user_key ===
                userOrKey,
            ) || null;
        }

        if (!selectedUser) {
          userAccessRequestIdRef.current +=
            1;

          setRbacSelectedUserKey(
            "",
          );

          setRbacSelectedUserAccess(
            null,
          );

          setRbacUserOverrideForm(
            {},
          );

          setRbacTemporaryAccessForm({
            ...EMPTY_TEMPORARY_ACCESS_FORM,
          });

          setRbacUserAccessModalOpen(
            false,
          );

          setRbacUserAccessLoading(
            false,
          );

          return null;
        }

        setRbacSelectedUserKey(
          selectedUser.user_key,
        );

        if (openModal) {
          setRbacUserAccessModalOpen(
            true,
          );
        }

        return loadRbacUserAccess(
          selectedUser.user_type,
          selectedUser.id,
        );
      },
      [
        loadRbacUserAccess,
        rbacUsers,
      ],
    );

  const closeRbacUserAccessModal =
    useCallback(() => {
      if (
        rbacSavingUserAccess
      ) {
        return;
      }

      userAccessRequestIdRef.current +=
        1;

      setRbacUserAccessModalOpen(
        false,
      );

      setRbacUserAccessLoading(
        false,
      );
    }, [rbacSavingUserAccess]);

  /* =======================================================
     TEMPORARY ACCESS FORM
  ======================================================= */

  const updateRbacTemporaryAccessForm =
    useCallback(
      (
        fieldOrEvent,
        fieldValue,
      ) => {
        if (
          fieldOrEvent &&
          typeof fieldOrEvent ===
          "object" &&
          fieldOrEvent.target
        ) {
          const { target } =
            fieldOrEvent;

          setRbacTemporaryAccessForm(
            (previousForm) => {
              const nextValue =
                target.type ===
                  "checkbox"
                  ? target.checked
                  : target.value;

              const nextForm = {
                ...previousForm,

                [target.name]:
                  nextValue,
              };

              if (
                target.name ===
                "is_temporary" &&
                !nextValue
              ) {
                nextForm.expires_at =
                  "";
              }

              return nextForm;
            },
          );

          return;
        }

        setRbacTemporaryAccessForm(
          (previousForm) => {
            const nextForm = {
              ...previousForm,

              [fieldOrEvent]:
                fieldValue,
            };

            if (
              fieldOrEvent ===
              "is_temporary" &&
              !fieldValue
            ) {
              nextForm.expires_at =
                "";
            }

            return nextForm;
          },
        );
      },
      [],
    );

  /* =======================================================
     ASSIGN ROLE TO USER
  ======================================================= */

  const assignRbacRoleToUser =
    useCallback(
      async (roleId) => {
        if (!rbacSelectedUser) {
          showRbacToast(
            "Select a user first",
            "error",
          );

          return false;
        }

        try {
          setRbacSavingUserAccess(
            true,
          );

          const responseData =
            await rbacApiRequest(
              `/rbac/users/${rbacSelectedUser.user_type}/${rbacSelectedUser.id}/role`,
              {
                method: "PUT",

                body: JSON.stringify({
                  role_id: roleId
                    ? Number(roleId)
                    : null,
                }),
              },
            );

          const updatedUser =
            normalizeUser(
              responseData?.user ||
              {
                ...rbacSelectedUser,

                role_id:
                  roleId || null,
              },
            );

          const normalizedAccessData = {
            ...rbacSelectedUserAccess,
            ...responseData,

            user: updatedUser,

            override_permissions:
              normalizeOverridePermissions(
                responseData?.override_permissions ??
                rbacSelectedUserAccess?.override_permissions ??
                {},
              ),
          };

          setRbacSelectedUserAccess(
            normalizedAccessData,
          );

          setRbacUsers(
            (previousUsers) =>
              previousUsers.map(
                (user) => {
                  if (
                    user.user_key !==
                    rbacSelectedUser.user_key
                  ) {
                    return user;
                  }

                  return {
                    ...user,

                    ...updatedUser,

                    role:
                      responseData?.role ||
                      updatedUser?.role ||
                      null,

                    role_id:
                      responseData?.role
                        ?.id ||
                      updatedUser?.role_id ||
                      null,

                    role_name:
                      responseData?.role
                        ?.name ||
                      updatedUser?.role_name ||
                      "No Role",
                  };
                },
              ),
          );

          showRbacToast(
            "User role updated successfully",
          );

          return true;
        } catch (error) {
          console.error(
            "Assign role error:",
            error,
          );

          showRbacToast(
            error.message ||
            "Failed to assign role",
            "error",
          );

          return false;
        } finally {
          if (mountedRef.current) {
            setRbacSavingUserAccess(
              false,
            );
          }
        }
      },
      [
        rbacApiRequest,
        rbacSelectedUser,
        rbacSelectedUserAccess,
        showRbacToast,
      ],
    );

  /* =======================================================
     USER PERMISSION OVERRIDE
  ======================================================= */

  const setRbacUserPermissionOverride =
    useCallback(
      (
        moduleCode,
        action,
        value,
      ) => {
        if (
          !moduleCode ||
          !RBAC_ACTIONS.includes(
            action,
          )
        ) {
          return;
        }

        if (
          value !== true &&
          value !== false &&
          value !== null
        ) {
          return;
        }

        setRbacUserOverrideForm(
          (previousOverrides) => {
            const currentModule = {
              ...(previousOverrides[
                moduleCode
              ] || {}),
            };

            if (value === null) {
              delete currentModule[
                action
              ];
            } else {
              currentModule[
                action
              ] = value;
            }

            const nextOverrides = {
              ...previousOverrides,
            };

            if (
              Object.keys(
                currentModule,
              ).length === 0
            ) {
              delete nextOverrides[
                moduleCode
              ];
            } else {
              nextOverrides[
                moduleCode
              ] = currentModule;
            }

            return nextOverrides;
          },
        );
      },
      [],
    );

  const cycleRbacUserPermissionOverride =
    useCallback(
      (
        moduleCode,
        action,
      ) => {
        setRbacUserOverrideForm(
          (previousOverrides) => {
            const currentValue =
              previousOverrides?.[
              moduleCode
              ]?.[action];

            let nextValue = true;

            if (
              currentValue === true
            ) {
              nextValue = false;
            } else if (
              currentValue === false
            ) {
              nextValue = null;
            }

            const currentModule = {
              ...(previousOverrides[
                moduleCode
              ] || {}),
            };

            if (nextValue === null) {
              delete currentModule[
                action
              ];
            } else {
              currentModule[
                action
              ] = nextValue;
            }

            const nextOverrides = {
              ...previousOverrides,
            };

            if (
              Object.keys(
                currentModule,
              ).length === 0
            ) {
              delete nextOverrides[
                moduleCode
              ];
            } else {
              nextOverrides[
                moduleCode
              ] = currentModule;
            }

            return nextOverrides;
          },
        );
      },
      [],
    );

  /* =======================================================
     DASHBOARD-PAGE PERMISSIONS (PER-USER OVERRIDE)
     ---------------------------------------------------------
     Same idea as rbacDashboardPermissionForm, but for one
     individual user's overrides on top of their role - e.g.
     "give this one Accounts Admin temporary access to the
     Hostel dashboard". "Inherit" clears the override so the
     user simply follows their role again.
  ======================================================= */

  const rbacDashboardOverrideForm =
    useMemo(
      () =>
        DASHBOARD_PAGES.map((page) => {
          const overrideActions =
            rbacUserOverrideForm?.[page.moduleCode] || {};

          const hasOverride =
            Object.keys(overrideActions).length > 0;

          const inheritedLevel = dashboardAccessLevelFromActions(
            rbacSelectedUserAccess?.role_permissions?.[page.moduleCode],
          );

          const overrideLevel = hasOverride
            ? dashboardAccessLevelFromActions({
              view:
                overrideActions.view ??
                rbacSelectedUserAccess?.role_permissions?.[page.moduleCode]
                  ?.view,
              create:
                overrideActions.create ??
                rbacSelectedUserAccess?.role_permissions?.[page.moduleCode]
                  ?.create,
              edit:
                overrideActions.edit ??
                rbacSelectedUserAccess?.role_permissions?.[page.moduleCode]
                  ?.edit,
              delete:
                overrideActions.delete ??
                rbacSelectedUserAccess?.role_permissions?.[page.moduleCode]
                  ?.delete,
            })
            : inheritedLevel;

          return {
            ...page,
            hasOverride,
            inheritedLevel,
            effectiveLevel: dashboardAccessLevelFromActions(
              rbacSelectedUserAccess?.effective_permissions?.[
              page.moduleCode
              ],
            ),
            overrideLevel,
          };
        }),
      [
        rbacUserOverrideForm,
        rbacSelectedUserAccess,
      ],
    );

  const setRbacUserDashboardOverride =
    useCallback(
      (moduleCode, level) => {
        if (!moduleCode) {
          return;
        }

        if (level === "inherit") {
          setRbacUserOverrideForm((previousOverrides) => {
            const nextOverrides = { ...previousOverrides };
            delete nextOverrides[moduleCode];
            return nextOverrides;
          });
          return;
        }

        const actions = dashboardActionsFromAccessLevel(level);

        setRbacUserOverrideForm((previousOverrides) => ({
          ...previousOverrides,
          [moduleCode]: { ...actions },
        }));
      },
      [],
    );

  /* =======================================================
     SAVE USER PERMISSION OVERRIDES
  ======================================================= */

  const saveRbacUserOverrides =
    useCallback(async () => {
      if (!rbacSelectedUser) {
        showRbacToast(
          "Select a user first",
          "error",
        );

        return false;
      }

      const isTemporary =
        Boolean(
          rbacTemporaryAccessForm.is_temporary,
        );

      const expiryValue =
        rbacTemporaryAccessForm.expires_at;

      if (
        isTemporary &&
        !expiryValue
      ) {
        showRbacToast(
          "Select an expiry date and time for temporary access",
          "error",
        );

        return false;
      }

      let expiryIsoValue = null;

      if (isTemporary) {
        const expiryDate =
          new Date(expiryValue);

        if (
          Number.isNaN(
            expiryDate.getTime(),
          )
        ) {
          showRbacToast(
            "Invalid access expiry date and time",
            "error",
          );

          return false;
        }

        if (
          expiryDate.getTime() <=
          Date.now()
        ) {
          showRbacToast(
            "Access expiry must be a future date and time",
            "error",
          );

          return false;
        }

        expiryIsoValue =
          expiryDate.toISOString();
      }

      const normalizedOverrides =
        normalizeOverridePermissions(
          rbacUserOverrideForm,
        );

      try {
        setRbacSavingUserAccess(
          true,
        );

        const responseData =
          await rbacApiRequest(
            `/rbac/users/${rbacSelectedUser.user_type}/${rbacSelectedUser.id}/overrides`,
            {
              method: "PUT",

              body: JSON.stringify({
                permissions:
                  normalizedOverrides,

                is_temporary:
                  isTemporary,

                expires_at:
                  expiryIsoValue,

                reason: String(
                  rbacTemporaryAccessForm.reason ||
                  "",
                ).trim(),
              }),
            },
          );

        const responseOverrides =
          normalizeOverridePermissions(
            responseData?.override_permissions ??
            normalizedOverrides,
          );

        const updatedUser =
          normalizeUser(
            responseData?.user ||
            rbacSelectedUser,
          );

        const normalizedAccessData = {
          ...rbacSelectedUserAccess,
          ...responseData,

          user: updatedUser,

          override_permissions:
            responseOverrides,

          is_temporary:
            responseData?.is_temporary ??
            isTemporary,

          expires_at:
            responseData?.expires_at ??
            expiryIsoValue,

          access_reason:
            responseData?.access_reason ??
            responseData?.reason ??
            rbacTemporaryAccessForm.reason,
        };

        setRbacSelectedUserAccess(
          normalizedAccessData,
        );

        setRbacUserOverrideForm(
          responseOverrides,
        );

        setRbacTemporaryAccessForm({
          is_temporary: Boolean(
            normalizedAccessData.is_temporary,
          ),

          expires_at:
            normalizedAccessData.expires_at
              ? formatDateTimeLocal(
                normalizedAccessData.expires_at,
              )
              : "",

          reason:
            normalizedAccessData.access_reason ||
            "",
        });

        const hasOverrides =
          Object.keys(
            responseOverrides,
          ).length > 0;

        const hadOverrides =
          Boolean(
            rbacSelectedUser.has_overrides,
          );

        const wasTemporary =
          Boolean(
            rbacSelectedUser.is_temporary,
          );

        const nowTemporary =
          Boolean(
            normalizedAccessData.is_temporary,
          );

        setRbacUsers(
          (previousUsers) =>
            previousUsers.map(
              (user) =>
                user.user_key ===
                  rbacSelectedUser.user_key
                  ? {
                    ...user,

                    ...updatedUser,

                    has_overrides:
                      hasOverrides,

                    is_temporary:
                      nowTemporary,

                    expires_at:
                      normalizedAccessData.expires_at,
                  }
                  : user,
            ),
        );

        setRbacStats(
          (previousStats) => {
            let overrideCount =
              previousStats.users_with_overrides ||
              0;

            let temporaryCount =
              previousStats.temporary_access_users ||
              0;

            if (
              hasOverrides &&
              !hadOverrides
            ) {
              overrideCount += 1;
            }

            if (
              !hasOverrides &&
              hadOverrides
            ) {
              overrideCount =
                Math.max(
                  0,
                  overrideCount - 1,
                );
            }

            if (
              nowTemporary &&
              !wasTemporary
            ) {
              temporaryCount += 1;
            }

            if (
              !nowTemporary &&
              wasTemporary
            ) {
              temporaryCount =
                Math.max(
                  0,
                  temporaryCount - 1,
                );
            }

            return {
              ...previousStats,

              users_with_overrides:
                overrideCount,

              temporary_access_users:
                temporaryCount,
            };
          },
        );

        showRbacToast(
          isTemporary
            ? "Temporary user permissions saved successfully"
            : "User permissions saved successfully",
        );

        return true;
      } catch (error) {
        console.error(
          "Save user permissions error:",
          error,
        );

        showRbacToast(
          error.message ||
          "Failed to save user permissions",
          "error",
        );

        return false;
      } finally {
        if (mountedRef.current) {
          setRbacSavingUserAccess(
            false,
          );
        }
      }
    }, [
      rbacApiRequest,
      rbacSelectedUser,
      rbacSelectedUserAccess,
      rbacTemporaryAccessForm,
      rbacUserOverrideForm,
      showRbacToast,
    ]);

  /* =======================================================
     RESET USER PERMISSIONS TO ROLE
  ======================================================= */

  const resetRbacUserOverrides =
    useCallback(async () => {
      if (!rbacSelectedUser) {
        showRbacToast(
          "Select a user first",
          "error",
        );

        return false;
      }

      try {
        setRbacSavingUserAccess(
          true,
        );

        const responseData =
          await rbacApiRequest(
            `/rbac/users/${rbacSelectedUser.user_type}/${rbacSelectedUser.id}/overrides`,
            {
              method: "DELETE",
            },
          );

        const updatedUser =
          normalizeUser(
            responseData?.user ||
            rbacSelectedUser,
          );

        const previouslyHadOverrides =
          Boolean(
            rbacSelectedUser.has_overrides,
          );

        const previouslyTemporary =
          Boolean(
            rbacSelectedUser.is_temporary,
          );

        const normalizedAccessData = {
          ...rbacSelectedUserAccess,
          ...responseData,

          user: updatedUser,

          override_permissions:
            {},

          is_temporary: false,

          expires_at: null,

          access_reason: "",
        };

        setRbacSelectedUserAccess(
          normalizedAccessData,
        );

        setRbacUserOverrideForm(
          {},
        );

        setRbacTemporaryAccessForm({
          ...EMPTY_TEMPORARY_ACCESS_FORM,
        });

        setRbacUsers(
          (previousUsers) =>
            previousUsers.map(
              (user) =>
                user.user_key ===
                  rbacSelectedUser.user_key
                  ? {
                    ...user,

                    ...updatedUser,

                    has_overrides:
                      false,

                    is_temporary:
                      false,

                    expires_at:
                      null,
                  }
                  : user,
            ),
        );

        setRbacStats(
          (previousStats) => ({
            ...previousStats,

            users_with_overrides:
              previouslyHadOverrides
                ? Math.max(
                  0,
                  (previousStats.users_with_overrides ||
                    0) - 1,
                )
                : previousStats.users_with_overrides,

            temporary_access_users:
              previouslyTemporary
                ? Math.max(
                  0,
                  (previousStats.temporary_access_users ||
                    0) - 1,
                )
                : previousStats.temporary_access_users,
          }),
        );

        showRbacToast(
          "Custom permissions removed. User now uses role permissions.",
        );

        return true;
      } catch (error) {
        console.error(
          "Reset user permissions error:",
          error,
        );

        showRbacToast(
          error.message ||
          "Failed to reset user permissions",
          "error",
        );

        return false;
      } finally {
        if (mountedRef.current) {
          setRbacSavingUserAccess(
            false,
          );
        }
      }
    }, [
      rbacApiRequest,
      rbacSelectedUser,
      rbacSelectedUserAccess,
      showRbacToast,
    ]);

  /* =======================================================
     PERMISSION DISPLAY HELPERS
  ======================================================= */

  const getRbacEffectivePermission =
    useCallback(
      (
        moduleCode,
        action,
      ) => {
        return Boolean(
          rbacSelectedUserAccess
            ?.effective_permissions?.[
          moduleCode
          ]?.[action],
        );
      },
      [
        rbacSelectedUserAccess,
      ],
    );

  const getRbacInheritedPermission =
    useCallback(
      (
        moduleCode,
        action,
      ) => {
        return Boolean(
          rbacSelectedUserAccess
            ?.role_permissions?.[
          moduleCode
          ]?.[action],
        );
      },
      [
        rbacSelectedUserAccess,
      ],
    );

  const getRbacOverrideValue =
    useCallback(
      (
        moduleCode,
        action,
      ) => {
        const overrideValue =
          rbacUserOverrideForm?.[
          moduleCode
          ]?.[action];

        if (
          overrideValue === true
        ) {
          return true;
        }

        if (
          overrideValue === false
        ) {
          return false;
        }

        return null;
      },
      [
        rbacUserOverrideForm,
      ],
    );

  const getRbacOverrideLabel =
    useCallback(
      (
        moduleCode,
        action,
      ) => {
        const overrideValue =
          rbacUserOverrideForm?.[
          moduleCode
          ]?.[action];

        if (
          overrideValue === true
        ) {
          return "Allow";
        }

        if (
          overrideValue === false
        ) {
          return "Deny";
        }

        return "Role";
      },
      [
        rbacUserOverrideForm,
      ],
    );

  /* =======================================================
     ACTIVE SECTION EFFECT

     Stable refs and bootstrap lock prevent repeated requests.
  ======================================================= */

  useEffect(() => {
    if (
      activeSection !== "roles"
    ) {
      return;
    }

    loadRbacRolePermissionBootstrap(
      false,
    );
  }, [
    activeSection,
    loadRbacRolePermissionBootstrap,
  ]);

  /* =======================================================
     LOAD USERS AFTER BOOTSTRAP OR FILTER CHANGE

     Search text is not included. Search runs when user clicks
     Apply Filter or presses Enter.
  ======================================================= */

  useEffect(() => {
    if (
      activeSection !== "roles"
    ) {
      return;
    }

    if (
      !bootstrapLoadedRef.current
    ) {
      return;
    }

    loadRbacUsers(null, {
      clearSelectedUser: true,
    });
  }, [
    activeSection,
    rbacUserFilters.user_type,
    rbacUserFilters.role_id,
    rbacUserFilters.status,
    loadRbacUsers,
  ]);

  /* =======================================================
     FULL REFRESH
  ======================================================= */

  const refreshRbacRolePermissionManagement =
    useCallback(async () => {
      bootstrapLoadedRef.current =
        false;

      const bootstrapData =
        await loadRbacRolePermissionBootstrap(
          true,
        );

      if (bootstrapData) {
        await loadRbacUsers(
          userFiltersRef.current,
          {
            clearSelectedUser:
              true,
          },
        );
      }

      return bootstrapData;
    }, [
      loadRbacRolePermissionBootstrap,
      loadRbacUsers,
    ]);

  /* =======================================================
     RETURN
  ======================================================= */

  return {
    /* Constants */

    rbacActions:
      RBAC_ACTIONS,

    rbacUserTypes:
      RBAC_USER_TYPES,

    /* Main data */

    rbacModules,
    rbacRoles,
    rbacUsers,
    rbacStats,

    /* Selected role */

    rbacSelectedRole,
    rbacSelectedRoleId,

    /* Selected user */

    rbacSelectedUser,
    rbacSelectedUserKey,
    rbacSelectedUserAccess,

    /* Role options */

    rbacRoleOptions,

    /* Forms */

    rbacRoleForm,
    rbacRolePermissionForm,
    rbacUserOverrideForm,
    rbacUserFilters,
    rbacTemporaryAccessForm,

    /* Modals */

    rbacRoleModalOpen,
    rbacDeleteRoleModalOpen,
    rbacUserAccessModalOpen,

    /* Loading states */

    rbacLoading,
    rbacRolesLoading,
    rbacUsersLoading,
    rbacUserAccessLoading,
    rbacSavingRole,
    rbacSavingPermissions,
    rbacSavingUserAccess,
    rbacDeletingRole,

    /* Unsaved changes */

    rbacHasUnsavedRolePermissionChanges,
    rbacHasUnsavedOverrideChanges,

    /* Bootstrap and refresh */

    loadRbacRolePermissionBootstrap,
    refreshRbacRolePermissionManagement,

    /* Load actions */

    loadRbacRoles,
    loadRbacUsers,
    loadRbacUserAccess,

    /* Role actions */

    selectRbacRole,

    openRbacCreateRoleModal,
    openRbacEditRoleModal,
    closeRbacRoleModal,

    updateRbacRoleForm,
    saveRbacRole,

    openRbacDeleteRoleModal,
    closeRbacDeleteRoleModal,
    deleteRbacRole,

    /* Role permissions */

    toggleRbacRolePermission,
    setAllRbacRolePermissions,
    setRbacRoleModulePermissions,
    saveRbacRolePermissions,

    /* Dashboard-page permissions (configurable page registry) */

    dashboardPages: DASHBOARD_PAGES,
    dashboardAccessLevels: DASHBOARD_ACCESS_LEVELS,
    rbacDashboardPermissionForm,
    setRbacDashboardAccess,
    rbacDashboardOverrideForm,
    setRbacUserDashboardOverride,

    /* User filters */

    updateRbacUserFilter,
    resetRbacUserFilters,

    /* User selection and modal */

    selectRbacUser,
    closeRbacUserAccessModal,

    /* User role */

    assignRbacRoleToUser,

    /* User permission override */

    setRbacUserPermissionOverride,
    cycleRbacUserPermissionOverride,
    saveRbacUserOverrides,
    resetRbacUserOverrides,

    /* Temporary access */

    updateRbacTemporaryAccessForm,

    /* Permission helpers */

    getRbacEffectivePermission,
    getRbacInheritedPermission,
    getRbacOverrideValue,
    getRbacOverrideLabel,
  };
}

export default useRolePermissionManagement;