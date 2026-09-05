import { useCallback, useEffect, useState } from "react";

const MODULE_CODE = "hostel";

const EMPTY_ACCESS = {
  view: false,
  create: false,
  edit: false,
  delete: false,
};

const readEffectivePermissions = () => {
  try {
    const raw = localStorage.getItem("effective_permissions");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const readHostelAccess = () => {
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

export const HOSTEL_READ_ONLY_MESSAGE =
  "You have read-only access to the Hostel dashboard. Ask your Super Admin for Full Access if you need to make changes.";

export function useHostelPermission() {
  const [access, setAccess] = useState(readHostelAccess);

  const refreshHostelPermission = useCallback(() => {
    setAccess(readHostelAccess());
  }, []);

  useEffect(() => {
    const onStorage = (event) => {
      if (!event || !event.key || event.key === "effective_permissions") {
        refreshHostelPermission();
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshHostelPermission]);

  const canView = access.view;

  const canWrite = Boolean(access.create || access.edit || access.delete);

  const accessLevel = !canView ? "none" : canWrite ? "write" : "read";

  const guardWrite = useCallback(
    (handler, notify) =>
      (...args) => {
        if (!canWrite) {
          notify?.(HOSTEL_READ_ONLY_MESSAGE, "error");
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
      return HOSTEL_READ_ONLY_MESSAGE;
    }

    return null;
  }, []);

  return {
    hostelAccess: access,
    canViewHostel: canView,
    canWriteHostel: canWrite,
    hostelAccessLevel: accessLevel,
    refreshHostelPermission,
    guardWrite,
    describePermissionError,
  };
}
