import { useCallback, useEffect, useState } from "react";
const MODULE_CODE = "academic";

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

const readAcademicAccess = () => {
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

export const Academic_READ_ONLY_MESSAGE =
  "You have read-only access to the Academic dashboard. Ask your Super Admin for Full Access if you need to make changes.";

export function useAcademicPermission() {
  const [access, setAccess] = useState(readAcademicAccess);

  const refreshAcademicPermission = useCallback(() => {
    setAccess(readAcademicAccess());
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
        refreshAcademicPermission();
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshAcademicPermission]);

  const canView = access.view;

  const canWrite = Boolean(access.create || access.edit || access.delete);

  const accessLevel = !canView ? "none" : canWrite ? "write" : "read";

  const guardWrite = useCallback(
    (handler, notify) =>
      (...args) => {
        if (!canWrite) {
          notify?.(Academic_READ_ONLY_MESSAGE, "error");
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
      return Academic_READ_ONLY_MESSAGE;
    }

    return null;
  }, []);

  return {
    AcademicAccess: access,
    canViewAcademic: canView,
    canWriteAcademic: canWrite,
    AcademicAccessLevel: accessLevel,
    refreshAcademicPermission,
    guardWrite,
    describePermissionError,
  };
}
