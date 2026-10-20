import { useEffect, useMemo, useState } from "react";
import { useDeveloperDashboard } from "../controllers/Developer/useDeveloperDashboard";
import { APP_NAME, FILE_BASE_URL } from "../config/appConfig";
import "../css/dashboard.css";

const STATUS_STYLES = {
  Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Trial: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Suspended: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  Expired: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400",
};
const PLANS = ["Trial", "Basic", "Pro", "Enterprise"];
const card = "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800";
const input = "mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100";
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

function CreateSchoolModal({ onClose, onCreate, creating, prefix }) {
  const [form, setForm] = useState({
    name: "", contact_email: "", contact_phone: "", address: "", plan: "Trial",
    max_students: 200, max_staff: 30,
    admin_first_name: "", admin_last_name: "", admin_email: "", admin_password: "",
  });
  const update = (f) => (e) => setForm((s) => ({ ...s, [f]: e.target.value }));
  const [logoFile, setLogoFile] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    const r = await onCreate({ ...form, max_students: Number(form.max_students), max_staff: Number(form.max_staff) }, logoFile);
    if (r) onClose();
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
      <div className={`${card} max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6`}>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Onboard a school</h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Creates the school, its tenant key{prefix ? ` (${prefix}_…)` : ""}, and its first Super Admin login. All schools share the same MySQL database; the tenant key is a label that identifies the school.
        </p>
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2 text-sm font-medium">School name
            <input required className={input} value={form.name} onChange={update("name")} />
          </label>
          <label className="text-sm font-medium">Contact email
            <input type="email" className={input} value={form.contact_email} onChange={update("contact_email")} />
          </label>
          <label className="text-sm font-medium">Contact phone
            <input className={input} value={form.contact_phone} onChange={update("contact_phone")} />
          </label>
          <label className="sm:col-span-2 text-sm font-medium">Address
            <input className={input} value={form.address} onChange={update("address")} />
          </label>
          <label className="text-sm font-medium">Plan
            <select className={input} value={form.plan} onChange={update("plan")}>
              {PLANS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm font-medium">Max students
              <input type="number" min="1" className={input} value={form.max_students} onChange={update("max_students")} />
            </label>
            <label className="text-sm font-medium">Max staff
              <input type="number" min="1" className={input} value={form.max_staff} onChange={update("max_staff")} />
            </label>
          </div>
          <label className="sm:col-span-2 text-sm font-medium">School logo (optional, PNG, JPG or WEBP, up to 2 MB)
            <input type="file" accept="image/png,image/jpeg,image/webp" className={input} onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
          </label>
          <p className="sm:col-span-2 mt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">First Super Admin</p>
          <label className="text-sm font-medium">First name
            <input required className={input} value={form.admin_first_name} onChange={update("admin_first_name")} />
          </label>
          <label className="text-sm font-medium">Last name
            <input className={input} value={form.admin_last_name} onChange={update("admin_last_name")} />
          </label>
          <label className="text-sm font-medium">Admin email
            <input required type="email" className={input} value={form.admin_email} onChange={update("admin_email")} />
          </label>
          <label className="text-sm font-medium">Temporary password
            <input required minLength={8} className={input} value={form.admin_password} onChange={update("admin_password")} />
          </label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={onClose} className={btn}>Cancel</button>
            <button type="submit" disabled={creating} className={primary}>{creating ? "Creating…" : "Create school"}</button>
          </div>
        </form>
      </div>
    </div>
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
    setEdit(d ? { plan: d.plan, max_students: d.max_students, max_staff: d.max_staff, name: d.name, contact_email: d.contact_email || "", contact_phone: d.contact_phone || "", address: d.address || "" } : null);
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
              <p className="font-mono text-xs text-gray-500">{detail.school_code} · tenant key {detail.database_name}</p>
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
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[detail.status] || ""}`}>{detail.status}</span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs dark:bg-slate-700 dark:text-gray-200">{detail.plan}</span>
                {detail.login_allowed ? null : <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs text-red-700">Logins blocked</span>}
                {detail.near_student_limit && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-700">Near student limit</span>}
              </div>
              {detail.trial_days_left !== null && (
                <p className="text-sm text-gray-600 dark:text-gray-300">Trial: <strong>{detail.trial_days_left} day(s) left</strong> (ends {fmtDate(detail.trial_ends_at)})</p>
              )}
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-gray-400">Contact email</dt><dd>{detail.contact_email || "—"}</dd></div>
                <div><dt className="text-xs text-gray-400">Contact phone</dt><dd>{detail.contact_phone || "—"}</dd></div>
                <div className="col-span-2"><dt className="text-xs text-gray-400">Address</dt><dd>{detail.address || "—"}</dd></div>
                <div><dt className="text-xs text-gray-400">Onboarded</dt><dd>{fmtDate(detail.created_at)}</dd></div>
                <div><dt className="text-xs text-gray-400">Subscription ends</dt><dd>{fmtDate(detail.subscription_ends_at)}</dd></div>
                <div><dt className="text-xs text-gray-400">Students</dt><dd>{detail.student_count} / {detail.max_students}</dd></div>
                <div><dt className="text-xs text-gray-400">Staff</dt><dd>{detail.staff_count} / {detail.max_staff}</dd></div>
              </dl>
              <div className="space-y-3">
                <Bar label="Students used" pct={detail.usage.students_pct} />
                <Bar label="Staff used" pct={detail.usage.staff_pct} />
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyButton text={detail.school_code} label="Copy school code" />
                <CopyButton text={detail.database_name || ""} label="Copy tenant key" />
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
                <div className="grid grid-cols-2 gap-3">
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
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Plan, limits and details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm font-medium">Plan
                    <select className={input} value={edit.plan} onChange={(e) => setEdit({ ...edit, plan: e.target.value })}>
                      {PLANS.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-medium">Name
                    <input className={input} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                  </label>
                  <label className="text-sm font-medium">Max students
                    <input type="number" min="1" className={input} value={edit.max_students} onChange={(e) => setEdit({ ...edit, max_students: e.target.value })} />
                  </label>
                  <label className="text-sm font-medium">Max staff
                    <input type="number" min="1" className={input} value={edit.max_staff} onChange={(e) => setEdit({ ...edit, max_staff: e.target.value })} />
                  </label>
                  <label className="text-sm font-medium">Contact email
                    <input className={input} value={edit.contact_email} onChange={(e) => setEdit({ ...edit, contact_email: e.target.value })} />
                  </label>
                  <label className="text-sm font-medium">Contact phone
                    <input className={input} value={edit.contact_phone} onChange={(e) => setEdit({ ...edit, contact_phone: e.target.value })} />
                  </label>
                </div>
                <div className="flex justify-end">
                  <button type="button" disabled={busy} className={primary} onClick={() => act(() => api.updateSchool(schoolId, { ...edit, max_students: Number(edit.max_students), max_staff: Number(edit.max_staff) }))}>Save changes</button>
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
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
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
  const nearLimit = useMemo(
    () => schools.filter((s) => s.max_students && s.student_count >= 0.9 * s.max_students).length,
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
    const cols = ["name", "school_code", "database_name", "plan", "status", "student_count", "max_students", "staff_count", "max_staff", "trial_ends_at", "contact_email"];
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
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 p-2 text-white"><i className="bi bi-hdd-network" /></div>
          <div>
            <div className="font-semibold text-gray-800 dark:text-gray-100">Platform Console</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{APP_NAME}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {platform && (
            <button type="button" onClick={() => setTab("platform")} className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs dark:border-slate-600">
              <span className={`h-2 w-2 rounded-full ${platform.database.reachable ? "bg-emerald-500" : "bg-red-500"}`} />
              <span className="font-mono">{platform.database.name || platform.database.engine}</span>
            </button>
          )}
          <span className="text-sm text-gray-600 dark:text-gray-300">{developer?.name}</span>
          <button type="button" onClick={api.logout} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-300">Log out</button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
          <Stat label="Schools" value={stats?.total_schools} />
          <Stat label="Active" value={stats?.active_schools} />
          <Stat label="Trial" value={stats?.trial_schools} />
          <Stat label="Suspended" value={stats?.suspended_schools} />
          <Stat label="Trial ends ≤7d" value={expiringSoon} tone="text-amber-600" />
          <Stat label="Near student limit" value={nearLimit} tone="text-amber-600" />
          <Stat label="Students" value={stats?.total_students} />
        </div>

        <div className="flex gap-1 border-b border-gray-200 dark:border-slate-700">
          {[["schools", "Schools"], ["audit", "Audit log"], ["platform", "Platform"]].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={`px-4 py-2 text-sm font-medium ${tab === k ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-300" : "text-gray-500"}`}>{label}</button>
          ))}
        </div>

        {tab === "schools" && (
          <div className={`${card} overflow-hidden p-0`}>
            <div className="flex flex-col gap-3 border-b border-gray-100 p-5 lg:flex-row lg:items-center lg:justify-between dark:border-slate-700">
              <div className="flex flex-wrap gap-2">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, code, tenant key, email…" className={input + " mt-0 w-72"} />
                <select className={input + " mt-0 w-auto"} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All statuses</option>
                  {["Active", "Trial", "Suspended", "Expired"].map((s) => <option key={s}>{s}</option>)}
                </select>
                <select className={input + " mt-0 w-auto"} value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
                  <option value="all">All plans</option>
                  {PLANS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={exportCsv} disabled={!filtered.length} className={btn}>Export CSV</button>
                <button type="button" onClick={() => setShowCreate(true)} className={primary}><i className="bi bi-plus-lg mr-1" />New school</button>
              </div>
            </div>
            {loading ? (
              <div className="p-10 text-center text-gray-400">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center text-gray-400">{schools.length === 0 ? "No schools yet — onboard your first one." : "No schools match these filters."}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400 dark:border-slate-700">
                      <th className="px-5 py-3">School</th><th className="px-5 py-3">Code</th><th className="px-5 py-3">Tenant key</th><th className="px-5 py-3">Plan</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Students</th><th className="px-5 py-3">Trial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => {
                      const days = trialDaysLeft(s);
                      return (
                        <tr key={s.id} onClick={() => setOpenSchoolId(s.id)} className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50 dark:border-slate-700/50 dark:hover:bg-slate-700/40">
                          <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-100">{s.name}</td>
                          <td className="px-5 py-3 font-mono text-xs text-gray-500">{s.school_code}</td>
                          <td className="px-5 py-3 font-mono text-xs text-gray-500">{s.database_name || "—"}</td>
                          <td className="px-5 py-3">{s.plan}</td>
                          <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[s.status] || STATUS_STYLES.Expired}`}>{s.status}</span></td>
                          <td className="px-5 py-3">{s.student_count ?? "—"} / {s.max_students}</td>
                          <td className="px-5 py-3">{days === null ? "—" : <span className={days <= 7 ? "font-medium text-amber-600" : ""}>{days}d left</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "audit" && (
          <AuditPanel entries={audit} filterSchool={auditSchool} onFilter={(id) => setAuditSchool(id)} />
        )}

        {tab === "platform" && <PlatformPanel platform={platform} />}
      </div>

      {showCreate && (
        <CreateSchoolModal
          onClose={() => setShowCreate(false)}
          onCreate={api.createSchool}
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
