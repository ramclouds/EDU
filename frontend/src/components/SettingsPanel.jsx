import { useEffect, useState } from "react";
import { getSchoolProfile, refreshSchoolProfileOnce, subscribeSchoolProfile } from "../lib/schoolProfile";
import { getCurrentUserCode } from "./UserIdInUrl";
import ProfileModal from "./ProfileModal";

// Shared Settings section for every dashboard
export default function SettingsPanel({
  user = {},
  darkMode,
  onToggleTheme,
  onChangePassword,
  onLogout,
  compact = false,
}) {
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [school, setSchool] = useState(getSchoolProfile());
  // The School section (address and API links) is for the super admin only.
  const isSuperAdmin = user?.role === "super_admin" || user?.admin_type === "Super Admin";
  const [copied, setCopied] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [profileTab, setProfileTab] = useState("details");

  useEffect(() => {
    const unsubscribe = subscribeSchoolProfile(() => setSchool(getSchoolProfile()));
    refreshSchoolProfileOnce();
    return unsubscribe;
  }, []);

  const copy = async (label, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      // clipboard unavailable (older browser or insecure origin)
    }
  };

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

      {/* MY PROFILE */}
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">My profile</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Update your contact details, address, and password.</p>
          </div>
          <button type="button" onClick={() => setShowProfile(true)} className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:opacity-90">
            Edit profile
          </button>
        </div>
      </section>
      {showProfile && <ProfileModal mode="school" initialTab={profileTab} onClose={() => setShowProfile(false)} />}

      {/* SCHOOL: super admin only */}
      {school && isSuperAdmin && (
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            School
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-gray-400">School name</p>
              <p className="font-medium text-gray-800 dark:text-gray-100">{school.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">School code</p>
              <p className="font-mono text-gray-800 dark:text-gray-100">{school.school_code}</p>
            </div>
            {!compact && getCurrentUserCode() && (
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-400">Your page (your user ID is in the address)</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="break-all font-mono text-sm text-gray-800 dark:text-gray-100">
                    {(school.login_url || window.location.origin) + window.location.pathname}
                  </span>
                  <button type="button" onClick={() => copy("page", (school.login_url || window.location.origin) + window.location.pathname)} className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700">
                    {copied === "page" ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}
            {!compact && school.login_url && (
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-400">School login URL</p>
                <div className="flex flex-wrap items-center gap-2">
                  <a href={school.login_url} target="_blank" rel="noreferrer" className="break-all font-mono text-sm text-indigo-600 hover:underline dark:text-indigo-400">
                    {school.login_url}
                  </a>
                  <button type="button" onClick={() => copy("login", school.login_url)} className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700">
                    {copied === "login" ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}
            {!compact && school.api_url && (
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-400">School API URL</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="break-all font-mono text-sm text-gray-800 dark:text-gray-100">{school.api_url}</span>
                  <button type="button" onClick={() => copy("api", school.api_url)} className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700">
                    {copied === "api" ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

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
          {!compact && user.username && (
            <div>
              <p className="text-xs text-gray-400">Username</p>
              <p className="font-medium text-gray-800 dark:text-gray-100">
                {user.username}
              </p>
            </div>
          )}
          {!compact && (user.designation || user.role || user.admin_type) && (
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
            onClick={() => { setProfileTab("password"); setShowProfile(true); }}
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
