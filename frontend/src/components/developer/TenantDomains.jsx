import { useCallback, useEffect, useState } from "react";

const input = "mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100";
const btn = "rounded-lg border px-3 py-1.5 text-xs font-medium dark:border-slate-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50";
const primary = "rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:opacity-90 disabled:opacity-50";

function Record({ label, name, value }) {
  return (
    <div className="rounded-lg bg-gray-50 p-2 text-xs dark:bg-slate-900">
      <p className="font-semibold text-gray-600 dark:text-gray-300">{label}</p>
      <p className="break-all font-mono text-gray-700 dark:text-gray-200">Name: {name}</p>
      <p className="break-all font-mono text-gray-700 dark:text-gray-200">Value: {value}</p>
      <button type="button" className={`${btn} mt-1`} onClick={() => navigator.clipboard?.writeText(value)}>
        Copy value
      </button>
    </div>
  );
}

// Custom domains: the school's own address (portal.theirschool.edu) in front of
// its dashboards. Ownership is proven with a DNS TXT record.
export default function TenantDomains({ schoolId, api }) {
  const [domains, setDomains] = useState(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setDomains(await api.loadDomains(schoolId));
  }, [api, schoolId]);

  // load once per school; the api object changes identity on every render
  useEffect(() => {
    let cancelled = false;
    api.loadDomains(schoolId).then((d) => { if (!cancelled) setDomains(d); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const run = async (fn) => {
    setBusy(true);
    try { await fn(); await load(); } finally { setBusy(false); }
  };

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Custom domains</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Let this school use its own address, for example portal.yourschool.edu. Add the domain, publish the two
        DNS records shown, then select Verify.
      </p>

      {domains === null && <p className="text-xs text-gray-400">Loading…</p>}
      {domains && domains.length === 0 && <p className="text-xs text-gray-400">No custom domains yet.</p>}

      {(domains || []).map((d) => (
        <div key={d.id} className="space-y-2 rounded-xl border border-gray-100 p-3 dark:border-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="break-all font-mono text-sm text-gray-800 dark:text-gray-100">{d.domain}</span>
            <span className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${d.verified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {d.verified ? "Verified" : "Not verified"}
              </span>
              {!d.verified && (
                <button type="button" disabled={busy} className={btn} onClick={() => run(() => api.verifyDomain(schoolId, d.id))}>Verify</button>
              )}
              <button type="button" disabled={busy} className={btn} onClick={() => { if (window.confirm(`Remove ${d.domain}?`)) run(() => api.removeDomain(schoolId, d.id)); }}>Remove</button>
            </span>
          </div>
          {!d.verified && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Record label="1. TXT record (proves you own the domain)" name={d.txt_name} value={d.txt_value} />
              {d.cname_target && <Record label="2. CNAME record (sends visitors here)" name={d.cname_name} value={d.cname_target} />}
            </div>
          )}
        </div>
      ))}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!value.trim()) return;
          run(async () => { if (await api.addDomain(schoolId, value.trim())) setValue(""); });
        }}
      >
        <input className={input} value={value} onChange={(e) => setValue(e.target.value)} placeholder="portal.yourschool.edu" />
        <button type="submit" disabled={busy || !value.trim()} className={`${primary} mt-1 shrink-0`}>Add domain</button>
      </form>
    </section>
  );
}
