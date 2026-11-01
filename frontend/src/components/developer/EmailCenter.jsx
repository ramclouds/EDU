import { useEffect, useState } from "react";
import SmtpForm from "./SmtpForm";

const card = "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800";
const input = "mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100";
const btn = "rounded-lg border px-3 py-1.5 text-xs font-medium dark:border-slate-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50";
const primary = "rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:opacity-90 disabled:opacity-50";

const STATUS = {
  sent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  skipped: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300",
  queued: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  sending: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

// The platform owner's email tools: the platform mail server, and messages to school owners.
export default function EmailCenter({ onClose, api, schools }) {
  const [tab, setTab] = useState("server");
  const [platform, setPlatform] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.loadPlatformMail().then((d) => { if (!cancelled) setPlatform(d); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
      <div className={`${card} max-h-[90vh] w-full max-w-4xl overflow-y-auto p-6`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Email</h3>
          <button type="button" onClick={onClose} className={btn}>Close</button>
        </div>

        <div className="mb-5 flex gap-2 text-sm">
          {[["server", "Platform mail server"], ["message", "Message school owners"]].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-full px-4 py-1.5 ${tab === key ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-200"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "server" && (
          platform === null ? <p className="text-xs text-gray-400">Loading…</p> : (
            <SmtpForm
              saved={platform.configured ? platform : null}
              busy={busy}
              hint="Used for every school that has no mail server of its own, and for messages you send to school owners."
              onSave={async (fields) => {
                setBusy(true);
                const r = await api.savePlatformMail(fields);
                setBusy(false);
                if (r) setPlatform(r);
              }}
              onTest={(to) => api.testPlatformMail(to)}
            />
          )
        )}

        {tab === "message" && <Composer api={api} schools={schools} />}
      </div>
    </div>
  );
}

function Composer({ api, schools }) {
  const [audience, setAudience] = useState("all");
  const [picked, setPicked] = useState([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [open, setOpen] = useState(null);

  const loadHistory = async () => setHistory(await api.loadBroadcasts());
  useEffect(() => { loadHistory(); }, []);

  // poll while anything is still being sent
  useEffect(() => {
    if (!history.some((b) => b.status !== "done")) return undefined;
    const t = setTimeout(loadHistory, 2000);
    return () => clearTimeout(t);
  }, [history]);

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const reachable = schools.filter((s) => s.contact_email && !s.is_archived);
  const recipients = audience === "all" ? reachable.length : picked.length;

  const send = async () => {
    setSending(true);
    const created = await api.sendBroadcast({
      audience, subject, body,
      school_ids: audience === "selected" ? picked : undefined,
    });
    setSending(false);
    if (created) {
      setSubject("");
      setBody("");
      await loadHistory();
    }
  };

  const showDetail = async (id) => {
    setOpen(await api.loadBroadcast(id));
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Send a notice to the owner of each school (its contact email). Each school receives its own copy,
          sent through the mail server it uses.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="radio" checked={audience === "all"} onChange={() => setAudience("all")} /> All schools ({reachable.length} with a contact email)</label>
          <label className="flex items-center gap-2"><input type="radio" checked={audience === "selected"} onChange={() => setAudience("selected")} /> Selected schools</label>
        </div>
        {audience === "selected" && (
          <div className="grid max-h-40 grid-cols-1 gap-1 overflow-y-auto rounded-lg border p-2 text-sm dark:border-slate-700 sm:grid-cols-2">
            {schools.map((s) => (
              <label key={s.id} className="flex items-center gap-2">
                <input type="checkbox" checked={picked.includes(s.id)} onChange={() => toggle(s.id)} disabled={!s.contact_email} />
                <span className={s.contact_email ? "" : "text-gray-400"}>{s.name}{s.contact_email ? "" : " (no contact email)"}</span>
              </label>
            ))}
          </div>
        )}
        <label className="block text-sm font-medium">Subject
          <input className={input} maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">Message <span className="font-normal text-gray-400">(plain text, up to 10,000 characters)</span>
          <textarea className={input} rows={6} maxLength={10000} value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Will be sent to {recipients} school{recipients === 1 ? "" : "s"}.</span>
          <button
            type="button"
            className={primary}
            disabled={sending || !subject.trim() || !body.trim() || recipients === 0}
            onClick={send}
          >
            {sending ? "Queuing…" : "Send message"}
          </button>
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Sent messages</h4>
        {history.length === 0 && <p className="text-xs text-gray-400">Nothing sent yet.</p>}
        <ul className="divide-y text-sm dark:divide-slate-700">
          {history.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <button type="button" onClick={() => showDetail(b.id)} className="min-w-0 text-left hover:underline">
                <span className="font-medium">{b.subject}</span>
                <span className="block text-xs text-gray-500">{b.created_at ? new Date(b.created_at).toLocaleString() : ""} · by {b.created_by || "—"}</span>
              </button>
              <span className="flex items-center gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 ${STATUS[b.status] || ""}`}>{b.status === "done" ? "Finished" : "Sending"}</span>
                <span>{b.sent} sent</span>
                {b.failed > 0 && <span className="text-red-600">{b.failed} failed</span>}
                {b.skipped > 0 && <span className="text-gray-500">{b.skipped} skipped</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {open && (
        <div className="rounded-xl border border-gray-100 p-4 dark:border-slate-700">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold">{open.subject}</h4>
            <button type="button" className={btn} onClick={() => setOpen(null)}>Close</button>
          </div>
          <pre className="mb-3 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs dark:bg-slate-900">{open.body}</pre>
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="text-left text-gray-500"><th className="py-1">School</th><th>Address</th><th>Result</th></tr></thead>
            <tbody>
              {(open.deliveries || []).map((d, i) => (
                <tr key={i} className="border-t dark:border-slate-700">
                  <td className="py-1">{d.school_name || "—"}</td>
                  <td className="font-mono">{d.recipient || "—"}</td>
                  <td>
                    <span className={`rounded-full px-2 py-0.5 ${STATUS[d.status] || ""}`}>{d.status}</span>
                    {d.error && <span className="ml-2 text-red-600">{d.error}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}
