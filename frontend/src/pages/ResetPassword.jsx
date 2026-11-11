import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { BASE_URL } from "../config/appConfig";

const input =
  "mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100";

// Opened from the link in the reset email: /reset-password?token=...
export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Use at least 8 characters");
    if (password !== confirm) return toast.error("The two passwords do not match");
    setBusy(true);
    try {
      const res = await fetch(`${BASE_URL}/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not reset the password");
        return;
      }
      setDone(true);
      toast.success("Password changed. You can sign in now.");
      setTimeout(() => navigate("/", { replace: true }), 2500);
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-800">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Choose a new password</h1>
        {!token ? (
          <p className="mt-3 text-sm text-red-600">This link is incomplete. Open the link from your email again.</p>
        ) : done ? (
          <p className="mt-3 text-sm text-emerald-600">Your password has been changed. Taking you to sign in…</p>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              New password
              <input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={input} required />
            </label>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Confirm new password
              <input type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} required />
            </label>
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-md hover:opacity-90 disabled:opacity-50">
              {busy ? "Saving…" : "Save new password"}
            </button>
          </form>
        )}
        <p className="mt-6 text-center text-xs text-gray-400">
          <Link to="/" className="text-indigo-600 hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
