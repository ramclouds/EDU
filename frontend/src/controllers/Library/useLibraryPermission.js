import { useCallback, useEffect, useState } from "react";
const MODULE_CODE = "library";

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

const readLibraryAccess = () => {
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

export const LIBRARY_READ_ONLY_MESSAGE =
  "You have read-only access to the Library dashboard. Ask your Super Admin for Full Access if you need to make changes.";

export function useLibraryPermission() {
  const [access, setAccess] = useState(readLibraryAccess);

  const refreshLibraryPermission = useCallback(() => {
    setAccess(readLibraryAccess());
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
        refreshLibraryPermission();
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshLibraryPermission]);

  const canView = access.view;

  // "Write" collapses create/edit/delete into one flag because the
  // Role & Permission UI only ever grants/revokes them together
  // (Read Only vs Full Access) - see setRbacDashboardAccess /
  // dashboardActionsFromAccessLevel in useRolePermissionManagement.js.
  const canWrite = Boolean(access.create || access.edit || access.delete);

  const accessLevel = !canView ? "none" : canWrite ? "write" : "read";

  /**
   * Wrap a write handler (save/delete/issue/return/etc.) so it no-ops
   * with a friendly toast instead of firing a request that the
   * backend would reject with 403 anyway.
   *
   * Usage: const saveBook = useCallback(guardWrite(async () => { ... }), [...]);
   */
  const guardWrite = useCallback(
    (handler, notify) =>
      (...args) => {
        if (!canWrite) {
          notify?.(LIBRARY_READ_ONLY_MESSAGE, "error");
          return undefined;
        }

        return handler(...args);
      },
    [canWrite],
  );

  /**
   * Turns a 403 "Permission denied" API response into the same
   * friendly message, so hooks that already have their own
   * try/catch error handling can stay consistent even if the UI
   * gate above was somehow bypassed (stale tab, race condition).
   */
  const describePermissionError = useCallback((error) => {
    const status = error?.status;
    const code = error?.data?.required_permission?.module;

    if (status === 403 && (code === MODULE_CODE || !code)) {
      return LIBRARY_READ_ONLY_MESSAGE;
    }

    return null;
  }, []);

  return {
    libraryAccess: access,
    canViewLibrary: canView,
    canWriteLibrary: canWrite,
    libraryAccessLevel: accessLevel,
    refreshLibraryPermission,
    guardWrite,
    describePermissionError,
  };
}
