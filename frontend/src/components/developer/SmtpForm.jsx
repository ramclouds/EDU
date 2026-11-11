import { useEffect, useState } from "react";

const input = "mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100";
const btn = "rounded-lg border px-3 py-1.5 text-xs font-medium dark:border-slate-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50";
const primary = "rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:opacity-90 disabled:opacity-50";

const EMPTY = {
  host: "", port: 587, security: "starttls", username: "", password: "",
  from_name: "", from_email: "", reply_to: "", enabled: true,
};

// Mail server settings. The password is write-only: it is never shown again, only
// "saved" or "not set". Leaving it blank keeps the saved one.
export default function SmtpForm({ saved, onSave, onTest, onRemove, removeLabel, busy, hint }) {
  const [draft, setDraft] = useState(EMPTY);
  const [testTo, setTestTo] = useState("");
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (!saved) {
      setDraft(EMPTY);
      return;
    }
    setDraft({
      host: saved.host || "",
      port: saved.port || 587,
      security: saved.security || "starttls",
      username: saved.username || "",
      password: "",
      from_name: saved.from_name || "",
      from_email: saved.from_email || "",
      reply_to: saved.reply_to || "",
      enabled: saved.enabled !== false,
    });
  }, [saved]);

  const set = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setDraft((d) => ({ ...d, [field]: value }));
  };

  const emailOk = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const valid = draft.host.trim() && Number(draft.port) >= 1 && Number(draft.port) <= 65535
    && emailOk(draft.from_email) && draft.from_email && emailOk(draft.reply_to);

  const save = () => onSave({ ...draft, port: Number(draft.port) });

  const test = async () => {
    setTestResult(null);
    const r = await onTest(testTo.trim());
    setTestResult(r);
  };

  return (
    <div className="space-y-3">
      {hint && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium sm:col-span-2">Mail server
          <input className={input} value={draft.host} placeholder="smtp.yourprovider.com" onChange={set("host")} />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="text-sm font-medium">Port
            <input type="number" min="1" max="65535" className={input} value={draft.port} onChange={set("port")} />
          </label>
          <label className="text-sm font-medium">Security
            <select className={input} value={draft.security} onChange={set("security")}>
              <option value="starttls">STARTTLS (port 587)</option>
              <option value="ssl">SSL/TLS (port 465)</option>
            </select>
          </label>
        </div>
        <label className="text-sm font-medium">Username
          <input className={input} value={draft.username} autoComplete="off" onChange={set("username")} />
        </label>
        <label className="text-sm font-medium">Password
          <input
            type="password"
            className={input}
            autoComplete="new-password"
            value={draft.password}
            placeholder={saved?.password_set ? "Saved. Leave blank to keep it." : "Not set"}
            onChange={set("password")}
          />
        </label>
        <label className="text-sm font-medium">Sender name
          <input className={input} value={draft.from_name} placeholder="Apec International School" onChange={set("from_name")} />
        </label>
        <label className="text-sm font-medium">Sender email (from)
          <input className={input} value={draft.from_email} placeholder="noreply@yourdomain.com" onChange={set("from_email")} />
          {draft.from_email && !emailOk(draft.from_email) && <span className="block text-xs text-red-600">Enter a valid email address.</span>}
        </label>
        <label className="text-sm font-medium sm:col-span-2">Reply-to (optional)
          <input className={input} value={draft.reply_to} placeholder="support@yourdomain.com" onChange={set("reply_to")} />
          {draft.reply_to && !emailOk(draft.reply_to) && <span className="block text-xs text-red-600">Enter a valid email address or leave it empty.</span>}
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={draft.enabled} onChange={set("enabled")} />
        Use these settings for sending email
      </label>

      {saved?.last_error && (
        <p className="text-xs text-red-600">Last test failed: {saved.last_error}</p>
      )}
      {saved?.verified_at && !saved?.last_error && (
        <p className="text-xs text-emerald-600">Last test succeeded: {new Date(saved.verified_at).toLocaleString()}</p>
      )}

      <div className="flex flex-wrap items-end gap-2 border-t pt-3 dark:border-slate-700">
        <label className="min-w-0 flex-1 text-sm font-medium">Send a test email to
          <input className={input} value={testTo} placeholder="you@example.com" onChange={(e) => setTestTo(e.target.value)} />
        </label>
        <button type="button" className={btn} disabled={busy || !saved?.configured || !testTo.trim()} onClick={test}>Send test</button>
      </div>
      {testResult && (
        <p className={`text-xs ${testResult.sent ? "text-emerald-600" : "text-red-600"}`}>
          {testResult.sent ? testResult.message : testResult.error}
        </p>
      )}

      <div className="flex flex-wrap justify-between gap-2 pt-1">
        {onRemove ? <button type="button" className={btn} disabled={busy} onClick={onRemove}>{removeLabel || "Remove"}</button> : <span />}
        <button type="button" className={primary} disabled={busy || !valid} onClick={save}>
          {busy ? "Saving…" : "Save email settings"}
        </button>
      </div>
    </div>
  );
}
