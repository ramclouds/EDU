import { useEffect, useMemo, useState } from "react";
import { useDeveloperDashboard } from "../controllers/Developer/useDeveloperDashboard";
import { APP_NAME, FILE_BASE_URL } from "../config/appConfig";
import CreateTenantWizard from "../components/developer/CreateTenantWizard";
import TenantDomains from "../components/developer/TenantDomains";
import TenantDatabase from "../components/developer/TenantDatabase";
import SchoolBrandingEditor from "../components/developer/SchoolBrandingEditor";
import SchoolMailPanel from "../components/developer/SchoolMailPanel";
import PlanEditor from "../components/developer/PlanEditor";
import EmailCenter from "../components/developer/EmailCenter";
import DeveloperSettings from "../components/developer/DeveloperSettings";
import ProfileModal from "../components/ProfileModal";
import ThemeToggle from "../components/ThemeToggle";
import SchoolsTable from "../components/developer/SchoolsTable";

const STATUS_STYLES = {
  Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Trial: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Suspended: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  Expired: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400",
};
const PLANS = ["Trial", "Basic", "Pro", "Enterprise", "Custom"];
const card = "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800";
const input = "mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100";
const developerInitials = (d) => {
  const source = (d?.name || d?.username || "P").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "P") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
};
const btn = "rounded-lg border px-3 py-1.5 text-xs font-medium dark:border-slate-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700";
const primary = "rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:opacity-90 disabled:opacity-50";

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "—");
const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

// Days until a trial ends, for the list view (the server computes the
function trialDaysLeft(s) {
  if (s.status !== "Trial" || !s.trial_ends_at) return null;
  const ms = new Date(s.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

function Stat({ label, value, tone }) {
  return (
    <div className={`${card} p-4`}>
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone || "text-gray-800 dark:text-gray-100"}`}>{value ?? "—"}</p>
    </div>
  );
}

function Bar({ label, pct }) {
  const width = Math.min(100, pct ?? 0);
  const tone = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-indigo-500";
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{label}</span>
        <span>{pct === null || pct === undefined ? "no limit" : `${pct}%`}</span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-gray-100 dark:bg-slate-700">
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function CopyButton({ text, label = "Copy" }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={btn}
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}

function SchoolLogoManager({ detail, api, busy, onChanged }) {
  const [file, setFile] = useState(null);
  const logo = detail.logo_url ? `${FILE_BASE_URL}${detail.logo_url}` : null;
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">School logo</h3>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50 dark:border-slate-700 dark:bg-slate-900">
          {logo ? <img src={logo} alt={detail.name} className="h-full w-full object-contain" /> : <i className="bi bi-image text-2xl text-gray-400" />}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input type="file" accept="image/png,image/jpeg,image/webp" className={input} onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy || !file} className={primary}
              onClick={async () => { if (await api.uploadSchoolLogo(detail.id, file)) { setFile(null); onChanged(); } }}>
              Upload logo
            </button>
            {logo && (
              <button type="button" disabled={busy} className={btn}
                onClick={async () => { if (await api.removeSchoolLogo(detail.id)) onChanged(); }}>
                Remove logo
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function SchoolDetail({ schoolId, listRow, api, onClose, onChanged }) {
  const [tab, setTab] = useState("overview");
  const [detail, setDetail] = useState(null);
  const [activity, setActivity] = useState([]);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(null);
  const [resetFor, setResetFor] = useState(null);
  const [subPlan, setSubPlan] = useState("Basic");
  const [subEnd, setSubEnd] = useState("");
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [newPassword, setNewPassword] = useState("");

  const reload = async () => {
    const [d, a] = await Promise.all([api.loadSchoolDetail(schoolId), api.loadActivity(schoolId)]);
    setDetail(d);
    setActivity(a);
    setEdit(d ? { name: d.name, contact_email: d.contact_email || "", contact_phone: d.contact_phone || "", address: d.address || "" } : null);
  };
  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [schoolId]);

  const act = async (fn) => {
    setBusy(true);
    const ok = await fn();
    setBusy(false);
    if (ok) {
      await reload();
      onChanged();
    }
  };

  if (!detail) {
    return (
      <div className="fixed inset-0 z-[100] flex justify-end bg-black/40">
        <div className={`${card} h-full w-full max-w-xl overflow-y-auto p-6`}>Loading school…</div>
      </div>
    );
  }

  const tabBtn = (key, label) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={`px-3 py-2 text-sm font-medium ${tab === key ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-300" : "text-gray-500 dark:text-gray-400"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/40" onClick={onClose}>
      <div className={`${card} h-full w-full max-w-xl overflow-y-auto rounded-none`} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{detail.name}</h2>
              <p className="font-mono text-xs text-gray-500">{detail.school_code} · database {detail.database_name}</p>
              {detail.login_url && (
                <p className="mt-1 text-xs text-gray-500">Login: <a href={detail.login_url} target="_blank" rel="noreferrer" className="font-mono text-indigo-600 hover:underline dark:text-indigo-400">{detail.login_url}</a></p>
              )}
              {detail.api_url && (
                <p className="text-xs text-gray-500">API: <span className="font-mono">{detail.api_url}</span></p>
              )}
            </div>
            <button type="button" onClick={onClose} className={btn}>Close</button>
          </div>
          <div className="mt-3 flex gap-1 border-b border-gray-100 dark:border-slate-700">
            {tabBtn("overview", "Overview")}
            {tabBtn("admins", `Admins (${detail.admins.length})`)}
            {tabBtn("activity", "Activity")}
            {tabBtn("actions", "Actions")}
          </div>
        </div>

        <div className="space-y-5 p-5">
          {tab === "overview" && (
            <>
              <SchoolLogoManager detail={detail} api={api} busy={busy} onChanged={() => { reload(); onChanged(); }} />
              <TenantDatabase schoolId={detail.id} api={api} />
              <TenantDomains schoolId={detail.id} api={api} />
              <PlanEditor schoolId={detail.id} school={detail} api={api} onSaved={reload} />
              <SchoolBrandingEditor schoolId={detail.id} schoolName={detail.name} api={api} />
              <SchoolMailPanel schoolId={detail.id} schoolName={detail.name} api={api} />
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[detail.status] || ""}`}>{detail.status}</span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs dark:bg-slate-700 dark:text-gray-200">{detail.plan}</span>
                {detail.login_allowed ? null : <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs text-red-700">Logins blocked</span>}
              </div>
              {detail.trial_days_left !== null && (
                <p className="text-sm text-gray-600 dark:text-gray-300">Trial: <strong>{detail.trial_days_left} day(s) left</strong> (ends {fmtDate(detail.trial_ends_at)})</p>
              )}
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-gray-400">Contact email</dt><dd>{detail.contact_email || "—"}</dd></div>
                <div><dt className="text-xs text-gray-400">Country/Region</dt><dd>{detail.country || "—"}</dd></div>
                <div><dt className="text-xs text-gray-400">Created by</dt><dd>{detail.created_by || "—"}</dd></div>
                <div><dt className="text-xs text-gray-400">Contact phone</dt><dd>{detail.contact_phone || "—"}</dd></div>
                <div className="col-span-2"><dt className="text-xs text-gray-400">Address</dt><dd>{detail.address || "—"}</dd></div>
                <div><dt className="text-xs text-gray-400">Onboarded</dt><dd>{fmtDate(detail.created_at)}</dd></div>
                <div><dt className="text-xs text-gray-400">Subscription ends</dt><dd>{fmtDate(detail.subscription_ends_at)}</dd></div>
                <div><dt className="text-xs text-gray-400">Students</dt><dd>{detail.student_count}</dd></div>
                <div><dt className="text-xs text-gray-400">Staff</dt><dd>{detail.staff_count}</dd></div>
              </dl>
              <div className="space-y-3">
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyButton text={detail.school_code} label="Copy school code" />
                {detail.login_url && <CopyButton text={detail.login_url} label="Copy login URL" />}
                {detail.api_url && <CopyButton text={detail.api_url} label="Copy API URL" />}
                <CopyButton text={detail.database_name || ""} label="Copy database name" />
              </div>
            </>
          )}

          {tab === "admins" && (
            <div className="space-y-3">
              {detail.admins.length === 0 && <p className="text-sm text-gray-500">No admins in this school.</p>}
              {detail.admins.map((a) => (
                <div key={a.id} className="rounded-xl border border-gray-100 p-3 dark:border-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-100">{a.name || a.username}</p>
                      <p className="text-xs text-gray-500">{a.username} · {a.email} · {a.admin_type}</p>
                    </div>
                    <button type="button" className={btn} onClick={() => { setResetFor(resetFor === a.id ? null : a.id); setNewPassword(""); }}>
                      {resetFor === a.id ? "Cancel" : "Reset password"}
                    </button>
                  </div>
                  {resetFor === a.id && (
                    <div className="mt-3 flex gap-2">
                      <input type="password" minLength={8} placeholder="New password (8+ characters)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={input} />
                      <button
                        type="button"
                        disabled={busy || newPassword.length < 8}
                        className={primary}
                        onClick={() => act(async () => {
                          const ok = await api.resetAdminPassword(schoolId, a.id, newPassword);
                          if (ok) { setResetFor(null); setNewPassword(""); }
                          return ok;
                        })}
                      >
                        Set
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <p className="text-xs text-gray-400">Resetting a password signs that admin out everywhere and is recorded in the audit log.</p>
            </div>
          )}

          {tab === "activity" && (
            <div className="space-y-2">
              {activity.length === 0 && <p className="text-sm text-gray-500">No activity recorded for this school yet.</p>}
              {activity.map((x) => (
                <div key={x.id} className="rounded-lg border border-gray-100 p-3 text-sm dark:border-slate-700">
                  <div className="flex justify-between text-xs text-gray-400"><span>{x.role} · {x.action}</span><span>{fmtDateTime(x.time)}</span></div>
                  <p className="mt-1 text-gray-700 dark:text-gray-200">{x.description}</p>
                </div>
              ))}
            </div>
          )}

          {tab === "actions" && edit && (
            <div className="space-y-6">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Subscription</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Status <strong>{detail.status}</strong> · plan <strong>{detail.plan}</strong>
                  {detail.subscription_ends_at ? <> · paid until <strong>{fmtDate(detail.subscription_ends_at)}</strong></> : " · no paid subscription"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-sm font-medium">Plan
                    <select className={input} value={subPlan} onChange={(e) => setSubPlan(e.target.value)}>
                      {["Basic", "Pro", "Enterprise"].map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-medium">Subscription ends
                    <input type="date" min={tomorrow} className={input} value={subEnd} onChange={(e) => setSubEnd(e.target.value)} />
                  </label>
                </div>
                <div className="flex justify-end">
                  <button type="button" disabled={busy || !subEnd} className={primary}
                    onClick={() => act(() => api.activateSubscription(schoolId, subPlan, subEnd))}>
                    Activate or renew subscription
                  </button>
                </div>
              </section>
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Lifecycle</h3>
                {!detail.subscription_ends_at && (
                  <div className="flex flex-wrap gap-2">
                    {[7, 14, 30].map((d) => (
                      <button key={d} type="button" disabled={busy} className={btn} onClick={() => act(() => api.extendTrial(schoolId, d))}>+{d} days trial</button>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {detail.status === "Suspended"
                    ? <button type="button" disabled={busy} className={btn} onClick={() => act(() => api.setSchoolStatus(schoolId, "reactivate"))}>Reactivate</button>
                    : <button type="button" disabled={busy} className={btn} onClick={() => act(() => api.setSchoolStatus(schoolId, "suspend"))}>Suspend</button>}
                  {!detail.is_archived && (
                    <button type="button" disabled={busy} className={btn} onClick={() => { if (window.confirm("Archive this school? Its users will be locked out.")) act(() => api.setSchoolStatus(schoolId, "archive")); }}>Archive</button>
                  )}
                </div>
              </section>
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">School details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-sm font-medium">Name
                    <input className={input} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                  </label>
                  <label className="text-sm font-medium">Contact email
                    <input className={input} value={edit.contact_email} onChange={(e) => setEdit({ ...edit, contact_email: e.target.value })} />
                  </label>
                  <label className="text-sm font-medium">Contact phone
                    <input className={input} value={edit.contact_phone} onChange={(e) => setEdit({ ...edit, contact_phone: e.target.value })} />
                  </label>
                </div>
                <div className="flex justify-end">
                  <button type="button" disabled={busy} className={primary} onClick={() => act(() => api.updateSchool(schoolId, { ...edit }))}>Save changes</button>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlatformPanel({ platform }) {
  if (!platform) return <div className={`${card} p-10 text-center text-gray-400`}>Loading platform…</div>;
  const db = platform.database;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className={`${card} p-5`}>
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">Database</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-gray-500">Engine</dt><dd>{db.engine}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Database name</dt><dd className="font-mono">{db.name}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Host</dt><dd>{db.host || "local"}{db.port ? `:${db.port}` : ""}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">User</dt><dd>{db.user || "—"}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Connection</dt><dd className={db.reachable ? "text-emerald-600" : "text-red-600"}>{db.reachable ? "Reachable" : "Unreachable"}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Tenant DB prefix</dt><dd className="font-mono">{platform.tenant_db_prefix}_</dd></div>
        </dl>
        <p className="mt-3 break-all rounded-lg bg-gray-50 p-2 font-mono text-xs text-gray-500 dark:bg-slate-900">{db.dsn}</p>
        <p className="mt-2 text-xs text-gray-400">The password is never shown here.</p>
      </div>
      <div className={`${card} p-5`}>
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">Application</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-gray-500">Environment</dt><dd>{platform.app.env}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Session length</dt><dd>{platform.app.token_expiry_hours} h idle</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Allowed origins</dt><dd className="max-w-[60%] truncate">{platform.app.cors_origins}</dd></div>
        </dl>
        <h3 className="mt-6 font-semibold text-gray-800 dark:text-gray-100">Totals</h3>
        <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div><dt className="text-gray-500">Schools</dt><dd className="text-lg font-semibold">{platform.totals.schools}</dd></div>
          <div><dt className="text-gray-500">Students</dt><dd className="text-lg font-semibold">{platform.totals.students}</dd></div>
          <div><dt className="text-gray-500">Staff</dt><dd className="text-lg font-semibold">{platform.totals.staff}</dd></div>
          <div><dt className="text-gray-500">Developers</dt><dd className="text-lg font-semibold">{platform.totals.developers}</dd></div>
        </dl>
      </div>
    </div>
  );
}

function AuditPanel({ entries, onFilter, filterSchool }) {
  return (
    <div className={`${card} overflow-hidden p-0`}>
      <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-slate-700">
        <p className="text-sm text-gray-500">{filterSchool ? "Filtered to one school." : "All developer actions, newest first."}</p>
        {filterSchool && <button type="button" className={btn} onClick={() => onFilter(null)}>Show all</button>}
      </div>
      {entries.length === 0 ? (
        <div className="p-10 text-center text-gray-400">No actions recorded yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400 dark:border-slate-700">
                <th className="px-4 py-3">When</th><th className="px-4 py-3">Who</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">School</th><th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-gray-50 dark:border-slate-700/50">
                  <td className="whitespace-nowrap px-4 py-2 text-gray-500">{fmtDateTime(e.created_at)}</td>
                  <td className="px-4 py-2">{e.developer}</td>
                  <td className="px-4 py-2 font-mono text-xs">{e.action}</td>
                  <td className="px-4 py-2">
                    {e.school_id ? <button type="button" className="text-indigo-600 hover:underline dark:text-indigo-300" onClick={() => onFilter(e.school_id)}>{e.school_name || `#${e.school_id}`}</button> : "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-500">{e.detail || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function DeveloperDashboard() {
  const api = useDeveloperDashboard();
  const { developer, schools, stats, platform, audit, loading, creating } = api;

  const [tab, setTab] = useState("schools");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [openSchoolId, setOpenSchoolId] = useState(null);
  const [auditSchool, setAuditSchool] = useState(null);

  useEffect(() => {
    if (tab === "audit") api.fetchAudit(auditSchool);
    // fetchAudit is memoised in the hook; only the tab and the filter should drive this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, auditSchool]);

  const expiringSoon = useMemo(
    () => schools.filter((s) => { const d = trialDaysLeft(s); return d !== null && d <= 7; }).length,
    [schools],
  );

  const filtered = schools.filter((s) => {
    const q = search.trim().toLowerCase();
    const hit = !q || `${s.name} ${s.school_code} ${s.database_name || ""} ${s.contact_email || ""}`.toLowerCase().includes(q);
    const st = statusFilter === "all" || s.status === statusFilter;
    const pl = planFilter === "all" || s.plan === planFilter;
    return hit && st && pl;
  });

  const exportCsv = () => {
    const cols = ["name", "school_code", "database_name", "plan", "status", "student_count", "staff_count", "trial_ends_at", "contact_email"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = cols.map((c) => (c === "database_name" ? "tenant_key" : c));
    const rows = [header.join(","), ...filtered.map((s) => cols.map((c) => esc(s[c])).join(","))];
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `schools-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-800/90">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 p-2.5 text-white shadow-md"><i className="bi bi-hdd-network" /></div>
            <div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">Platform Console</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{APP_NAME}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {platform && (
              <button type="button" onClick={() => setTab("platform")} title="Database status" className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700">
                <span className={`h-2 w-2 rounded-full ${platform.database.reachable ? "bg-emerald-500" : "bg-red-500"}`} />
                <span className="font-mono">{platform.database.name || platform.database.engine}</span>
              </button>
            )}
            <ThemeToggle />
            <button type="button" onClick={() => setShowSettings(true)} className={btn}><i className="bi bi-gear mr-1" />Settings</button>
            <button type="button" onClick={() => setShowProfile(true)} className="flex items-center gap-3 rounded-full border border-gray-200 py-1 pl-1 pr-4 transition hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-semibold text-white">{developerInitials(developer)}</span>
              <span className="text-left leading-tight">
                <span className="block text-sm font-medium text-gray-800 dark:text-gray-100">{developer?.name || developer?.username || "Platform owner"}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">Platform owner · My profile</span>
              </span>
            </button>
            <button type="button" onClick={api.logout} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-300">Log out</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
          <Stat label="Total schools" value={stats?.total_schools} />
          <Stat label="Active" value={stats?.active_schools} />
          <Stat label="On trial" value={stats?.trial_schools} />
          <Stat label="Suspended" value={stats?.suspended_schools} />
          <Stat label="Trials ending in 7 days" value={expiringSoon} tone="text-amber-600" />
          <Stat label="Students (all schools)" value={stats?.total_students} />
        </div>

        <div className="flex gap-1 border-b border-gray-200 dark:border-slate-700">
          {[["schools", "Schools"], ["audit", "Audit log"], ["platform", "Platform"]].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={`px-4 py-2 text-sm font-medium ${tab === k ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-300" : "text-gray-500"}`}>{label}</button>
          ))}
        </div>

        {tab === "schools" && (
          <SchoolsTable
            schools={schools}
            filtered={filtered}
            loading={loading}
            search={search}
            onSearch={setSearch}
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            planFilter={planFilter}
            onPlanFilter={setPlanFilter}
            plans={PLANS}
            statusStyles={STATUS_STYLES}
            trialDaysLeft={trialDaysLeft}
            onOpen={(id) => setOpenSchoolId(id)}
            onCreate={() => setShowCreate(true)}
            onEmail={() => setShowEmail(true)}
            onExport={exportCsv}
            exportDisabled={!filtered.length}
          />
        )}

        {tab === "audit" && (
          <AuditPanel entries={audit} filterSchool={auditSchool} onFilter={(id) => setAuditSchool(id)} />
        )}

        {tab === "platform" && <PlatformPanel platform={platform} />}
      </div>

      {showSettings && <DeveloperSettings api={api} onClose={() => setShowSettings(false)} />}

      {showProfile && <ProfileModal mode="developer" onClose={() => setShowProfile(false)} />}

      {showEmail && (
        <EmailCenter onClose={() => setShowEmail(false)} api={api} schools={schools} />
      )}

      {showCreate && (
        <CreateTenantWizard
          onClose={() => setShowCreate(false)}
          api={api}
          creating={creating}
          prefix={platform?.tenant_db_prefix}
        />
      )}

      {openSchoolId && (
        <SchoolDetail
          schoolId={openSchoolId}
          listRow={schools.find((s) => s.id === openSchoolId)}
          api={api}
          onClose={() => setOpenSchoolId(null)}
          onChanged={() => { api.refreshAll(); if (tab === "audit") api.fetchAudit(auditSchool); }}
        />
      )}
    </div>
  );
}
