import { useCallback, useEffect, useState } from "react";

const MODULE_CODE = "accounts";

const EMPTY_ACCESS = {
  view: false,
  create: false,
  edit: false,
  delete: false,
};

const isSuperAdminSession = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const role = String(
      localStorage.getItem("role") || user.role || user.user_type || "",
    ).toLowerCase();
    const adminType = String(
      localStorage.getItem("admin_type") || user.admin_type || "",
    ).toLowerCase();
    return role === "super_admin" || adminType === "super admin";
  } catch {
    return false;
  }
};

const readEffectivePermissions = () => {
  try {
    const raw = localStorage.getItem("effective_permissions");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const readAccountsAccess = () => {
  // Super Admin has full access to every dashboard by default.
  if (isSuperAdminSession()) {
    return { view: true, create: true, edit: true, delete: true };
  }

  const all = readEffectivePermissions();
  const access = all?.[MODULE_CODE];

  if (!access || typeof access !== "object") {
    return { ...EMPTY_ACCESS };
  }

  return {
    view: Boolean(access.view),
    create: Boolean(access.create),
    edit: Boolean(access.edit),
    delete: Boolean(access.delete),
  };
};

export const Accounts_READ_ONLY_MESSAGE =
  "You have read-only access to the Accounts dashboard. Ask your Super Admin for Full Access if you need to make changes.";

export function useAccountsPermission() {
  const [access, setAccess] = useState(readAccountsAccess);

  const refreshAccountsPermission = useCallback(() => {
    setAccess(readAccountsAccess());
  }, []);

  useEffect(() => {
    // Picks up permission changes made in another tab (e.g. Super
    // Admin revokes access while this tab is open).
    const onStorage = (event) => {
      if (
        !event ||
        !event.key ||
        event.key === "effective_permissions"
      ) {
        refreshAccountsPermission();
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshAccountsPermission]);

  const canView = access.view;

  const canWrite = Boolean(access.create || access.edit || access.delete);

  const accessLevel = !canView ? "none" : canWrite ? "write" : "read";

  const guardWrite = useCallback(
    (handler, notify) =>
      (...args) => {
        if (!canWrite) {
          notify?.(Accounts_READ_ONLY_MESSAGE, "error");
          return undefined;
        }

        return handler(...args);
      },
    [canWrite],
  );
  const describePermissionError = useCallback((error) => {
    const status = error?.status;
    const code = error?.data?.required_permission?.module;

    if (status === 403 && (code === MODULE_CODE || !code)) {
      return Accounts_READ_ONLY_MESSAGE;
    }

    return null;
  }, []);

  return {
    AccountsAccess: access,
    canViewAccounts: canView,
    canWriteAccounts: canWrite,
    AccountsAccessLevel: accessLevel,
    refreshAccountsPermission,
    guardWrite,
    describePermissionError,
  };
}