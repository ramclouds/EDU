import { useState } from "react";
import { useDeveloperDashboard } from "../controllers/Developer/useDeveloperDashboard";
import { APP_NAME } from "../config/appConfig";

export default function DeveloperLogin() {
  const { login, loginWithCode } = useDeveloperDashboard();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [challenge, setChallenge] = useState(null); // set when two-factor sign-in is on
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await login(username, password);
    if (result && typeof result === "object" && result.challenge) {
      setChallenge(result.challenge);
      setCode("");
    }
    setSubmitting(false);
  };

  const handleCode = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const ok = await loginWithCode(challenge, code.replace(/\s/g, ""));
    if (!ok) setCode("");
    setSubmitting(false);
  };

  const inputClass =
    "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30";

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 p-2 text-white">
            <i className="bi bi-hdd-network"></i>
          </div>
          <div>
            <div className="text-lg font-semibold text-white">Platform Console</div>
            <div className="text-xs text-slate-400">{APP_NAME} — manage schools</div>
          </div>
        </div>

        {!challenge ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-slate-300">
              Username or email
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`mt-1 ${inputClass}`}
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-300">
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`mt-1 ${inputClass}`}
                required
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 font-medium text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Checking…" : "Continue"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCode} className="space-y-4">
            <p className="text-sm text-slate-300">
              Enter the 6-digit code from your authenticator app.
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={`${inputClass} text-center text-lg tracking-[0.4em]`}
              placeholder="000000"
              autoFocus
              required
            />
            <button
              type="submit"
              disabled={submitting || code.replace(/\s/g, "").length !== 6}
              className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 font-medium text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Verifying…" : "Verify and sign in"}
            </button>
            <button
              type="button"
              onClick={() => {
                setChallenge(null);
                setPassword("");
              }}
              className="w-full text-xs text-slate-400 hover:text-slate-200"
            >
              Start again
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          This console is for platform administration only. School staff and
          students should use the regular sign-in page.
        </p>
      </div>
    </div>
  );
}
