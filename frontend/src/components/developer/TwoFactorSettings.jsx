import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const field =
  "mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100";
const btn =
  "rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:opacity-90 disabled:opacity-50";
const ghost =
  "rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700";

// Two-factor sign-in: an authenticator app shows a new 6-digit code every 30 seconds.
export default function TwoFactorSettings({ api }) {
  const [enabled, setEnabled] = useState(null);
  const [setup, setSetup] = useState(null); // { secret, uri } while enabling
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const load = async () => {
    const r = await api.twoFactor.status();
    if (r.ok) setEnabled(Boolean(r.body.enabled));
  };
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => {
    setBusy(true);
    const r = await api.twoFactor.start();
    setBusy(false);
    if (!r.ok) return toast.error(r.error || "Could not start setup");
    setSetup({ secret: r.body.secret, uri: r.body.uri });
    setCode("");
  };

  const confirm = async (e) => {
    e.preventDefault();
    setBusy(true);
    const r = await api.twoFactor.enable(code.replace(/\s/g, ""));
    setBusy(false);
    if (!r.ok) return toast.error(r.error || "That code is not right");
    toast.success("Two-factor sign-in is on");
    setSetup(null);
    setCode("");
    setEnabled(true);
  };

  const turnOff = async (e) => {
    e.preventDefault();
    setBusy(true);
    const r = await api.twoFactor.disable(password, code.replace(/\s/g, ""));
    setBusy(false);
    if (!r.ok) return toast.error(r.error || "Could not turn it off");
    toast.success("Two-factor sign-in is off");
    setDisabling(false);
    setPassword("");
    setCode("");
    setEnabled(false);
  };

  if (enabled === null) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Two-factor sign-in</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {enabled
            ? "On. Signing in needs your password and a code from your authenticator app."
            : "Off. Add an extra step to protect the platform console."}
        </p>
      </div>

      {!enabled && !setup && (
        <button type="button" onClick={start} disabled={busy} className={btn}>
          Set up an authenticator app
        </button>
      )}

      {!enabled && setup && (
        <form onSubmit={confirm} className="space-y-4 rounded-xl border border-gray-100 p-4 dark:border-slate-700">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-600 dark:text-gray-300">
            <li>Open an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, Authy).</li>
            <li>Add an account and enter this key, or open the setup link on this computer.</li>
            <li>Type the 6-digit code it shows, below.</li>
          </ol>
          <div className="rounded-lg bg-gray-50 p-3 font-mono text-sm tracking-wider text-gray-800 break-all dark:bg-slate-900 dark:text-gray-100">
            {setup.secret}
          </div>
          <a href={setup.uri} className="inline-block text-xs text-indigo-600 hover:underline">Open the setup link</a>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Code from the app
            <input
              className={field}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              required
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={busy || code.replace(/\s/g, "").length !== 6} className={btn}>Turn on</button>
            <button type="button" onClick={() => setSetup(null)} className={ghost}>Cancel</button>
          </div>
        </form>
      )}

      {enabled && !disabling && (
        <button type="button" onClick={() => setDisabling(true)} className={ghost}>Turn off two-factor sign-in</button>
      )}

      {enabled && disabling && (
        <form onSubmit={turnOff} className="space-y-4 rounded-xl border border-gray-100 p-4 dark:border-slate-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Current password
            <input type="password" autoComplete="current-password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Current code from the app
            <input className={field} inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000" required />
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={btn}>Turn off</button>
            <button type="button" onClick={() => { setDisabling(false); setPassword(""); setCode(""); }} className={ghost}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
