import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FILE_BASE_URL } from "../../config/appConfig";

const card = "rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800";
const field = "mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100";
const btn = "rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700";
const primary = "rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:opacity-90 disabled:opacity-50";

import TwoFactorSettings from "./TwoFactorSettings";

const TABS = [
  ["backend", "Backend (.env)"],
  ["frontend", "Website (frontend .env)"],
  ["service", "Service and backups"],
  ["security", "Account security"],
];

// The Settings window of the platform console. Everything shown comes from the server:
// the list of editable settings, their current values, and what each needs to take effect.
export default function DeveloperSettings({ api, onClose }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("backend");
  const [changes, setChanges] = useState({}); // { file: { KEY: value } }
  const [errors, setErrors] = useState([]);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null); // "save" | "apply" | "reload"
  const [lastResult, setLastResult] = useState(null);

  const load = async () => {
    const r = await api.loadSettings();
    if (r) setData(r);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fileKey = tab === "frontend" ? "frontend" : "backend";
  const pendingCount = Object.keys(changes[fileKey] || {}).length;
  const current = data?.[fileKey];

  const setValue = (key, value) => {
    setChanges((c) => ({ ...c, [fileKey]: { ...(c[fileKey] || {}), [key]: value } }));
  };

  const shown = (item) => {
    const edited = changes[fileKey] || {};
    return Object.prototype.hasOwnProperty.call(edited, item.key) ? edited[item.key] : item.value;
  };

  const confirm = async () => {
    if (!password) return toast.error("Enter your current password to continue.");
    setBusy(true);
    setErrors([]);
    try {
      if (pending === "save") {
        const r = await api.saveSettings(fileKey, changes[fileKey] || {}, password);
        if (r.ok) {
          setChanges((c) => ({ ...c, [fileKey]: {} }));
          setLastResult({ kind: "saved", ...r.body });
          await load();
          toast.success(r.body.message);
        } else {
          setErrors(r.body?.errors || [r.error || "Could not save"]);
          toast.error(r.error || "Please check the highlighted settings");
        }
      } else if (pending === "apply") {
        const r = await api.applySettings(password);
        if (r.ok) {
          setLastResult({ kind: "applied", ...r.body });
          toast.success(r.body.message);
        } else toast.error(r.error || "Could not apply the settings");
      } else if (pending === "reload") {
        const r = await api.reloadService(password);
        if (!r.ok) {
          toast.error(r.error || "Could not reload the service");
        } else if (r.body.mode === "supervised" || r.body.mode === "gunicorn") {
          setLastResult({ kind: "reloading", message: r.body.message });
          await waitForService();
        } else {
          setLastResult({ kind: "manual", message: r.body.message });
        }
      }
    } finally {
      setBusy(false);
      setPending(null);
      setPassword("");
    }
  };

  // Poll the backend until it answers again after a restart.
  const waitForService = async () => {
    const started = Date.now();
    while (Date.now() - started < 60000) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        const res = await fetch(`${FILE_BASE_URL}/healthz`);
        if (res.ok) {
          setLastResult({ kind: "back", message: "The service is back and running." });
          toast.success("Service restarted");
          await load();
          return;
        }
      } catch {
        // still restarting
      }
    }
    setLastResult({ kind: "manual", message: "The service did not come back within a minute. Check the backend window." });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
      <div className={`${card} flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Settings</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Change the server configuration. Every change asks for your password and keeps a backup of the previous file.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><i className="bi bi-x-lg" /></button>
        </div>

        <div className="flex gap-1 border-b border-gray-100 px-4 pt-2 text-sm dark:border-slate-700">
          {TABS.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className={`rounded-t-lg px-4 py-2 ${tab === key ? "border-b-2 border-indigo-600 font-medium text-indigo-600 dark:text-indigo-300" : "text-gray-500 dark:text-gray-400"}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!data && <p className="text-sm text-gray-400">Loading settings…</p>}

          {tab === "security" && <TwoFactorSettings api={api} />}

          {data && tab !== "service" && tab !== "security" && current && (
            <div className="space-y-6">
              {!current.exists && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">The file {current.file} was not found on the server.</p>}
              {current.groups.map((group) => (
                <section key={group.title}>
                  <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">{group.title}</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {group.items.map((item) => {
                      const value = shown(item);
                      const edited = Object.prototype.hasOwnProperty.call(changes[fileKey] || {}, item.key);
                      const fieldError = errors.find((e) => e.toLowerCase().includes(item.label.toLowerCase()));
                      return (
                        <label key={item.key} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          <span className="flex items-center justify-between gap-2">
                            {item.label}
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.live ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                              {item.live ? "Applies live" : "Needs restart"}
                            </span>
                          </span>
                          {item.type === "bool" ? (
                            <select className={field} value={value || "false"} onChange={(e) => setValue(item.key, e.target.value)}>
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          ) : item.type === "choice" ? (
                            <select className={field} value={value} onChange={(e) => setValue(item.key, e.target.value)}>
                              {item.options.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input
                              className={`${field} ${edited ? "border-indigo-400" : ""}`}
                              type={item.type === "int" ? "number" : item.type === "email" ? "email" : "text"}
                              min={item.min ?? undefined}
                              max={item.max ?? undefined}
                              value={value}
                              placeholder={item.allow_empty ? "(empty)" : ""}
                              onChange={(e) => setValue(item.key, e.target.value)}
                            />
                          )}
                          <span className="mt-1 block text-xs font-normal text-gray-500 dark:text-gray-400">{item.help}</span>
                          {fieldError && <span className="block text-xs text-red-600">{fieldError}</span>}
                        </label>
                      );
                    })}
                  </div>
                </section>
              ))}

              {current.protected.length > 0 && (
                <section>
                  <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Protected: change these on the server only</h4>
                  <ul className="divide-y rounded-xl border border-gray-100 text-sm dark:divide-slate-700 dark:border-slate-700">
                    {current.protected.map((p) => (
                      <li key={p.key} className="flex justify-between gap-4 px-4 py-2">
                        <span className="text-gray-600 dark:text-gray-300">{p.label}</span>
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{p.value}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          {data && tab === "service" && (
            <div className="space-y-6">
              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Reload the backend</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Settings marked <b>Applies live</b> are in use after <b>Apply live settings</b>. Settings marked <b>Needs restart</b> take effect after the backend restarts.
                </p>
                {data.service.supervised || data.service.gunicorn ? (
                  <p className="text-xs text-emerald-600">This server can restart itself from this window.</p>
                ) : (
                  <p className="text-xs text-amber-600">This server was not started with scripts/run_forever.py, so the reload button cannot restart it. Start it that way, or restart it from the server.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={btn} onClick={() => setPending("apply")}>Apply live settings</button>
                  <button type="button" className={primary} onClick={() => setPending("reload")}>Reload service</button>
                </div>
              </section>
              {lastResult && (
                <div className="rounded-xl border border-gray-100 p-4 text-sm dark:border-slate-700">
                  {lastResult.kind === "saved" && (
                    <>
                      <p className="font-medium text-gray-800 dark:text-gray-100">{lastResult.saved.length} setting{lastResult.saved.length === 1 ? "" : "s"} saved.</p>
                      {lastResult.live?.length > 0 && <p className="text-emerald-600">Applies live: {lastResult.live.join(", ")}. Press Apply live settings.</p>}
                      {lastResult.restart_required?.length > 0 && <p className="text-amber-600">Needs a restart: {lastResult.restart_required.join(", ")}.</p>}
                    </>
                  )}
                  {lastResult.kind !== "saved" && <p className="text-gray-700 dark:text-gray-200">{lastResult.message}</p>}
                </div>
              )}
              <section>
                <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Backups of the backend file</h4>
                {data.backend.backups.length === 0 ? <p className="text-xs text-gray-400">No backups yet. One is made before each save.</p> : (
                  <ul className="space-y-1 font-mono text-xs text-gray-600 dark:text-gray-300">
                    {data.backend.backups.map((b) => <li key={b}>{b}</li>)}
                  </ul>
                )}
                <p className="mt-2 text-xs text-gray-400">To restore one, copy it over the .env file on the server.</p>
              </section>
            </div>
          )}
        </div>

        {tab !== "service" && tab !== "security" && (
          <div className="border-t border-gray-100 px-6 py-4 dark:border-slate-700">
            {pending === "save" || pending === "apply" || pending === "reload" ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-gray-700 dark:text-gray-200">
                  {pending === "save" ? `Save ${pendingCount} change${pendingCount === 1 ? "" : "s"} to ${current?.file}.` : pending === "apply" ? "Apply live settings now." : "Reload the service now."} Enter your current password:
                </span>
                <input type="password" autoComplete="current-password" className={`${field} mt-0 max-w-xs`} value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className={btn} onClick={() => { setPending(null); setPassword(""); }}>Cancel</button>
                <button type="button" className={primary} disabled={busy || !password} onClick={confirm}>{busy ? "Working…" : "Confirm"}</button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">{pendingCount ? `${pendingCount} unsaved change${pendingCount === 1 ? "" : "s"}` : "No unsaved changes"}</span>
                <div className="flex gap-2">
                  <button type="button" className={btn} disabled={!pendingCount} onClick={() => setChanges((c) => ({ ...c, [fileKey]: {} }))}>Discard</button>
                  <button type="button" className={primary} disabled={!pendingCount} onClick={() => { setErrors([]); setPending("save"); }}>Save changes</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
