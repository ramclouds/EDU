import { useEffect, useState } from "react";
import { BASE_URL } from "../config/appConfig";
import toast from "react-hot-toast";
import UserAvatar, { notifyPhotoChanged } from "./UserAvatar";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const card = "rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800";
const input = "mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100";
const primary = "rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-md transition hover:opacity-90 disabled:opacity-50";
const ghost = "rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700";

// Edits the signed-in person's own profile. The fields come from the server, so each
// user type (student, teacher, admin, staff, platform owner) sees the fields it may edit.
//   mode="school"    -> /api/me/profile (session cookie)
//   mode="developer" -> /api/developer/me/profile (session cookie)
export default function ProfileModal({ mode = "school", onClose, initialTab = "details" }) {
  const isDeveloper = mode === "developer";
  const tokenKey = isDeveloper ? "dev_signed_in" : "signed_in";
  const base = isDeveloper ? `${BASE_URL}/developer/me` : `${BASE_URL}/me`;
  const minPassword = isDeveloper ? 10 : 8;

  const [tab, setTab] = useState(initialTab);
  const [profile, setProfile] = useState(null);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ current_password: "", new_password: "", confirm: "" });
  const [pwErrors, setPwErrors] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);

  // Profile photo (school accounts only). The saved user is updated so the avatars change at once.
  const saveUserPhoto = (profileImage) => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...user, profile_image: profileImage }));
    } catch {
      // storage unavailable: the photo still changes on the server
    }
    notifyPhotoChanged();
  };

  const uploadPhoto = async (file) => {
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("Choose a photo up to 2 MB");
      return;
    }
    const form = new FormData();
    form.append("photo", file);
    setPhotoBusy(true);
    try {
      const res = await fetch(`${base}/photo`, { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not save the photo");
        return;
      }
      saveUserPhoto(data.profile_image);
      toast.success("Photo saved");
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    try {
      const res = await fetch(`${base}/photo`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not remove the photo");
        return;
      }
      saveUserPhoto(null);
      toast.success("Photo removed");
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setPhotoBusy(false);
    }
  };

  const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem(tokenKey) || ""}`,
  });

  useEffect(() => {
    let cancelled = false;
    fetch(`${base}/profile`, { headers: headers() })
      .then((r) => r.json().then((b) => ({ ok: r.ok, body: b })))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) {
          toast.error(body.error || "Could not load your profile");
          return;
        }
        setProfile(body);
        setValues(body.values || {});
      })
      .catch(() => toast.error("Could not reach the server"));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const res = await fetch(`${base}/profile`, { method: "PUT", headers: headers(), body: JSON.stringify(values) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(body.errors || {});
        toast.error(body.error || "Could not save your profile");
        return;
      }
      setValues(isDeveloper ? body.values : body.profile.values);
      toast.success("Profile saved");
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setPwErrors("");
    if (pw.new_password.length < minPassword) return setPwErrors(`Use at least ${minPassword} characters.`);
    if (pw.new_password !== pw.confirm) return setPwErrors("The two new passwords do not match.");
    setSaving(true);
    try {
      const res = await fetch(`${base}/password`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ current_password: pw.current_password, new_password: pw.new_password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPwErrors(body.error || "Could not change the password");
        return;
      }
      setPw({ current_password: "", new_password: "", confirm: "" });
      toast.success("Password changed");
    } catch {
      setPwErrors("Could not reach the server");
    } finally {
      setSaving(false);
    }
  };

  const fields = profile?.fields || [];
  const set = (name) => (e) => setValues((v) => ({ ...v, [name]: e.target.value }));

  const renderField = (f) => {
    const value = values[f.name] ?? "";
    const common = {
      id: `pf-${f.name}`,
      value,
      onChange: set(f.name),
      className: `${input} ${errors[f.name] ? "border-red-400 focus:ring-red-400/30" : ""}`,
    };
    let control;
    if (f.kind === "textarea") control = <textarea rows={3} maxLength={f.max} {...common} />;
    else if (f.kind === "select") {
      control = (
        <select {...common}>
          <option value="">Not set</option>
          {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    } else if (f.kind === "date") control = <input type="date" {...common} />;
    else control = <input type={f.kind === "email" ? "email" : "text"} maxLength={f.max} {...common} />;
    return (
      <label key={f.name} htmlFor={`pf-${f.name}`} className={`text-sm font-medium text-gray-700 dark:text-gray-300 ${f.kind === "textarea" ? "sm:col-span-2" : ""}`}>
        {f.label}{f.required && <span className="text-red-500"> *</span>}
        {control}
        {errors[f.name] && <span className="mt-1 block text-xs text-red-600">{errors[f.name]}</span>}
      </label>
    );
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
      <div className={`${card} max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">My profile</h3>
            {profile && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Signed in as <span className="font-mono">{profile.login_name || "—"}</span>
                {profile.identity?.code && <> · ID <span className="font-mono">{profile.identity.code}</span></>}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="mb-5 inline-flex rounded-xl bg-gray-100 p-1 text-sm dark:bg-slate-900">
          {[["details", "Details"], ["password", "Password"]].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-lg px-4 py-1.5 transition ${tab === key ? "bg-white text-gray-900 shadow dark:bg-slate-700 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "details" && (
          profile === null ? (
            <p className="text-sm text-gray-500">Loading your profile…</p>
          ) : (
            <>
              {!isDeveloper && (
                <div className="mb-5 flex items-center gap-4">
                  <UserAvatar className="h-20 w-20 text-lg" />
                  <div className="space-y-2">
                    <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:opacity-90 ${photoBusy ? "pointer-events-none opacity-60" : ""}`}>
                      <i className="bi bi-camera" />
                      {photoBusy ? "Saving…" : "Upload photo"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={photoBusy}
                        onChange={(e) => {
                          uploadPhoto(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <div className="flex items-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={removePhoto}
                        disabled={photoBusy}
                        className="font-medium text-red-600 hover:underline disabled:opacity-50"
                      >
                        Remove photo
                      </button>
                      <span className="text-gray-400">PNG, JPEG or WEBP, up to 2 MB</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{fields.map(renderField)}</div>
              <p className="mt-4 text-xs text-gray-400">
                Fields marked * are required. Medical details, role, and status are managed by your school administrator.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" className={ghost} onClick={onClose}>Close</button>
                <button type="button" className={primary} disabled={saving} onClick={save}>{saving ? "Saving…" : "Save changes"}</button>
              </div>
            </>
          )
        )}

        {tab === "password" && (
          <div className="grid max-w-md grid-cols-1 gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Current password
              <input type="password" autoComplete="current-password" className={input} value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} />
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">New password <span className="font-normal text-gray-400">(at least {minPassword} characters)</span>
              <input type="password" autoComplete="new-password" className={input} value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} />
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirm new password
              <input type="password" autoComplete="new-password" className={input} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            </label>
            {pwErrors && <p className="text-xs text-red-600">{pwErrors}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className={ghost} onClick={onClose}>Close</button>
              <button type="button" className={primary} disabled={saving || !pw.current_password || !pw.new_password} onClick={changePassword}>
                {saving ? "Saving…" : "Change password"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
