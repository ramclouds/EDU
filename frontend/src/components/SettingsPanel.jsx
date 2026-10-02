import { useState } from "react";

/**
 * Shared Settings section for every dashboard.
 *
 * The "Settings" sidebar item existed in every dashboard's menu already
 * (key: "settings", icon: bi-gear) but there was no
 * `activeSection === "settings"` block anywhere to render — clicking it
 * did nothing. This fills that gap with real, working functionality
 * built on top of state each dashboard already has (no new backend
 * endpoints invented, no decorative "coming soon" left behind):
 *
 *   - Appearance: the dashboard's existing dark-mode toggle (useDashboardUI)
 *   - Security: opens the existing change-password modal
 *   - Session: the existing logout handler
 *   - Account: read-only summary of who's signed in
 *
 * One component, used by all 7 dashboards, so the section looks and
 * behaves identically everywhere rather than being reimplemented 7 times.
 */
export default function SettingsPanel({
  user = {},
  darkMode,
  onToggleTheme,
  onChangePassword,
  onLogout,
}) {
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.name ||
    user.username ||
    "—";

  return (
    <div className="max-w-3xl space-y-6 animate-[fadeIn_0.3s_ease]">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          Settings
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage your account, appearance, and session.
        </p>
      </div>

      {/* ACCOUNT */}
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Account
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-gray-400">Name</p>
            <p className="font-medium text-gray-800 dark:text-gray-100">
              {displayName}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Email</p>
            <p className="font-medium text-gray-800 dark:text-gray-100">
              {user.email || "—"}
            </p>
          </div>
          {user.username && (
            <div>
              <p className="text-xs text-gray-400">Username</p>
              <p className="font-medium text-gray-800 dark:text-gray-100">
                {user.username}
              </p>
            </div>
          )}
          {(user.designation || user.role || user.admin_type) && (
            <div>
              <p className="text-xs text-gray-400">Role</p>
              <p className="font-medium text-gray-800 dark:text-gray-100">
                {user.designation || user.role || user.admin_type}
              </p>
            </div>
          )}
        </div>
        <p className="mt-4 text-xs text-gray-400">
          To edit these details, use the Profile section.
        </p>
      </section>

      {/* APPEARANCE */}
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Appearance
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-800 dark:text-gray-100">
              Dark mode
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Switch between light and dark theme.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!darkMode}
            onClick={onToggleTheme}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${
              darkMode ? "bg-indigo-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                darkMode ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </section>

      {/* SECURITY */}
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Security
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-800 dark:text-gray-100">
              Password
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Change the password used to sign in.
            </p>
          </div>
          <button
            type="button"
            onClick={onChangePassword}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900"
          >
            Change password
          </button>
        </div>
      </section>

      {/* SESSION */}
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Session
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-800 dark:text-gray-100">
              Log out
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sign out of this account on this device.
            </p>
          </div>

          {!confirmingLogout ? (
            <button
              type="button"
              onClick={() => setConfirmingLogout(true)}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
            >
              Log out
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmingLogout(false)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Confirm log out
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
