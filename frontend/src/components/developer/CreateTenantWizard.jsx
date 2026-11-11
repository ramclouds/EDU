import { useEffect, useRef, useState } from "react";

const card = "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800";
const input = "mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100";
const btn = "rounded-lg border px-3 py-1.5 text-xs font-medium dark:border-slate-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700";
const primary = "rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:opacity-90 disabled:opacity-50";

const PLANS = ["Trial", "Basic", "Pro", "Enterprise", "Custom"];
const DASHBOARDS = [["super-admin-dashboard","Super Admin"],["academic-admin-dashboard","Academic"],["teacher-dashboard","Teacher"],["student-dashboard","Student"],["library-admin-dashboard","Library"],["hostel-admin-dashboard","Hostel"],["accounts-admin-dashboard","Accounts"],["hr-admin-dashboard","HR"]];
const STEPS = ["Basics", "Configuration", "Administrator", "Review + Create"];

// ISO 3166-1 alpha-2 codes. Add more as schools need them.
const COUNTRIES = [
  ["IN", "India"], ["US", "United States"], ["GB", "United Kingdom"], ["AE", "United Arab Emirates"],
  ["AU", "Australia"], ["BD", "Bangladesh"], ["CA", "Canada"], ["DE", "Germany"], ["EG", "Egypt"],
  ["FR", "France"], ["GH", "Ghana"], ["ID", "Indonesia"], ["KE", "Kenya"], ["LK", "Sri Lanka"],
  ["MY", "Malaysia"], ["NG", "Nigeria"], ["NP", "Nepal"], ["NZ", "New Zealand"], ["OM", "Oman"],
  ["PH", "Philippines"], ["PK", "Pakistan"], ["QA", "Qatar"], ["SA", "Saudi Arabia"],
  ["SG", "Singapore"], ["TZ", "Tanzania"], ["UG", "Uganda"], ["ZA", "South Africa"],
];

const slugify = (v) =>
  v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 39);

const randomPassword = () => {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
};

function CopyBtn({ text, label = "Copy" }) {
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

function Row({ label, children }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 py-2 text-sm last:border-0 dark:border-slate-700">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="min-w-0 break-all text-right font-medium text-gray-800 dark:text-gray-100">{children}</span>
    </div>
  );
}

export default function CreateTenantWizard({ onClose, api, creating, prefix }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "", tenant_id: "", country: "IN",
    plan: "Trial", custom_dashboards: [],
    contact_email: "", contact_phone: "", address: "",
    admin_first_name: "", admin_last_name: "", admin_email: "", admin_password: "",
  });
  const [idTouched, setIdTouched] = useState(false);
  const [check, setCheck] = useState({ state: "idle" });
  const [logoFile, setLogoFile] = useState(null);
  const [result, setResult] = useState(null);

  // The dashboard hands over a new api object on every render, so keep the latest
  // one in a ref and let the availability check depend only on the typed name.
  const apiRef = useRef(api);
  apiRef.current = api;
  const timer = useRef(null);
  const seq = useRef(0);

  useEffect(() => {
    const id = form.tenant_id.trim();
    if (!id) {
      setCheck({ state: "idle" });
      return undefined;
    }
    setCheck({ state: "checking" });
    const mine = ++seq.current;
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const r = await apiRef.current.checkTenantId(id);
      if (mine !== seq.current) return; // a newer keystroke replaced this check
      setCheck(
        r.available
          ? { state: "ok", login_url: r.login_url, api_url: r.api_url }
          : { state: "bad", reason: r.reason || "Not available" },
      );
    }, 400);
    return () => clearTimeout(timer.current);
  }, [form.tenant_id]);

  const set = (field) => (e) => setForm((s) => ({ ...s, [field]: e.target.value }));

  const onName = (e) => {
    const name = e.target.value;
    setForm((s) => ({ ...s, name, tenant_id: idTouched ? s.tenant_id : slugify(name) }));
  };

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.admin_email);
  // One check per step, in order: Basics, Configuration, Administrator, Review.
  const valid = [
    form.name.trim().length > 1 && check.state === "ok",   // Basics
    true,                                                  // Configuration (plan and limits are optional)
    Boolean(form.admin_first_name.trim() && emailOk && form.admin_password.length >= 8), // Administrator
    true,                                                  // Review
  ];

  const submit = async () => {
    const body = await api.createSchool(
      {
        ...form,
      },
      logoFile,
    );
    if (body) setResult(body);
  };

  const countryName = COUNTRIES.find(([code]) => code === form.country)?.[1] || form.country;

  // ---------------- success: like "Your new tenant is created with the domain ..." ----------------
  if (result) {
    const a = result.admin_login || {};
    const loginHost = (a.login_url || "").replace(/^https?:\/\//, "");
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
        <div className={`${card} max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6`}>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            <i className="bi bi-check-circle-fill mr-2 text-emerald-500" />
            Your new tenant is created
          </h3>
          <p className="mb-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
            {result.school?.name} is live{loginHost ? <> at <b>{loginHost}</b></> : null}, with its own database.
            The administrator below was made the Super Admin of the new tenant.
          </p>
          <div className="rounded-xl border border-gray-100 px-4 dark:border-slate-700">
            {a.login_url && (
              <Row label="Login URL">
                <a href={a.login_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">{a.login_url}</a>{" "}
                <CopyBtn text={a.login_url} />
              </Row>
            )}
            {a.api_url && <Row label="API URL">{a.api_url} <CopyBtn text={a.api_url} /></Row>}
            <Row label="Tenant ID">{a.tenant_id || result.school?.tenant_id}</Row>
            <Row label="School code">{a.school_code} <CopyBtn text={a.school_code || ""} /></Row>
            <Row label="Database">{result.school?.database_name}</Row>
            <Row label="Super Admin login">{a.email}</Row>
          </div>
          {!a.login_url && (
            <p className="mt-3 text-xs text-amber-600">
              No web address is shown because TENANT_BASE_DOMAIN is not set on the server. Until it is set,
              people sign in on the common login page.
            </p>
          )}
          <p className="mt-3 text-xs text-gray-400">
            Share the temporary password with the administrator securely. They can change it after signing in.
          </p>
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={onClose} className={primary}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- the steps ----------------
  const availability =
    check.state === "checking" ? <span className="text-gray-400">Checking…</span>
    : check.state === "ok" ? <span className="text-emerald-600">Available{check.login_url ? ` · ${check.login_url}` : ""}</span>
    : check.state === "bad" ? <span className="text-red-600">{check.reason}</span>
    : <span className="text-gray-400">Lowercase letters, digits and hyphens. This becomes the school&apos;s address.</span>;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
      <div className={`${card} max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6`}>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Create a tenant</h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Creates the school, provisions its own database{prefix ? ` (${prefix}_…)` : ""}, and makes the administrator its Super Admin.
        </p>

        <ol className="mb-5 flex flex-wrap gap-2 text-xs">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className={`rounded-full px-3 py-1 ${i === step ? "bg-indigo-600 text-white" : i < step ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-300"}`}
            >
              {i + 1}. {label}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2 text-sm font-medium">Organization name
              <input className={input} value={form.name} onChange={onName} placeholder="For example Apec International School" />
            </label>
            <label className="sm:col-span-2 text-sm font-medium">Initial domain name
              <input
                className={input}
                value={form.tenant_id}
                placeholder="apec"
                onChange={(e) => { setIdTouched(true); setForm((s) => ({ ...s, tenant_id: e.target.value.toLowerCase() })); }}
              />
              <span className="mt-1 block text-xs">{availability}</span>
            </label>
            <label className="sm:col-span-2 text-sm font-medium">Country/Region
              <select className={input} value={form.country} onChange={set("country")}>
                {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Plan
              <select className={input} value={form.plan} onChange={set("plan")}>
                {PLANS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            {form.plan === "Custom" && (
              <div className="sm:col-span-2 grid gap-2 sm:grid-cols-2">
                {DASHBOARDS.map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.custom_dashboards.includes(key)}
                      onChange={() => setForm((f) => ({ ...f, custom_dashboards: f.custom_dashboards.includes(key) ? f.custom_dashboards.filter((x) => x !== key) : [...f.custom_dashboards, key] }))}
                    />
                    {label} dashboard
                  </label>
                ))}
              </div>
            )}
            <label className="text-sm font-medium">Contact email
              <input type="email" className={input} value={form.contact_email} onChange={set("contact_email")} />
            </label>
            <label className="text-sm font-medium">Contact phone
              <input className={input} value={form.contact_phone} onChange={set("contact_phone")} />
            </label>
            <label className="sm:col-span-2 text-sm font-medium">Address
              <input className={input} value={form.address} onChange={set("address")} />
            </label>
            <label className="sm:col-span-2 text-sm font-medium">School logo (optional, PNG, JPG or WEBP, up to 2 MB)
              <input type="file" accept="image/png,image/jpeg,image/webp" className={input} onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <p className="sm:col-span-2 text-xs text-gray-500 dark:text-gray-400">
              This person becomes the Super Admin of the new tenant, with full access to everything in it.
            </p>
            <label className="text-sm font-medium">First name
              <input className={input} value={form.admin_first_name} onChange={set("admin_first_name")} />
            </label>
            <label className="text-sm font-medium">Last name
              <input className={input} value={form.admin_last_name} onChange={set("admin_last_name")} />
            </label>
            <label className="sm:col-span-2 text-sm font-medium">Admin email (used to sign in)
              <input type="email" className={input} value={form.admin_email} onChange={set("admin_email")} />
              {form.admin_email && !emailOk && <span className="mt-1 block text-xs text-red-600">Enter a valid email address.</span>}
            </label>
            <label className="sm:col-span-2 text-sm font-medium">Temporary password (at least 8 characters)
              <div className="flex gap-2">
                <input className={input} value={form.admin_password} onChange={set("admin_password")} />
                <button type="button" className={`${btn} mt-1 shrink-0`} onClick={() => setForm((s) => ({ ...s, admin_password: randomPassword() }))}>Generate</button>
              </div>
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="rounded-xl border border-gray-100 px-4 dark:border-slate-700">
            <Row label="Organization name">{form.name}</Row>
            <Row label="Initial domain name">{form.tenant_id}{check.login_url ? ` · ${check.login_url}` : ""}</Row>
            <Row label="Country/Region">{countryName}</Row>
            <Row label="Plan">{form.plan}{form.plan === "Custom" ? ` · ${form.custom_dashboards.length} dashboard(s)` : ""}</Row>
            <Row label="Super Admin">{form.admin_first_name} {form.admin_last_name} · {form.admin_email}</Row>
            <Row label="Logo">{logoFile ? logoFile.name : "None"}</Row>
            <p className="py-3 text-xs text-gray-500 dark:text-gray-400">
              Review the information, then select Create. A new database is made for this school and cannot be shared with another school.
            </p>
          </div>
        )}

        <div className="mt-5 flex justify-between gap-2">
          <button type="button" onClick={onClose} className={btn}>Cancel</button>
          <div className="flex gap-2">
            {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className={btn}>Previous</button>}
            {step < 3 ? (
              <button type="button" disabled={!valid[step]} onClick={() => setStep(step + 1)} className={primary}>
                Next: {STEPS[step + 1]}
              </button>
            ) : (
              <button type="button" disabled={creating} onClick={submit} className={primary}>
                {creating ? "Creating…" : "Create"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
