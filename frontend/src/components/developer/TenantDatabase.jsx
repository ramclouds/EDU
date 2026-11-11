import { useCallback, useEffect, useState } from "react";

const btn = "rounded-lg border px-3 py-1.5 text-xs font-medium dark:border-slate-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50";

// Health of this school's own database, and a safe one-click update that adds
// any tables or columns a newer release needs (it never removes anything).
export default function TenantDatabase({ schoolId, api }) {
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setInfo(await api.loadDatabase(schoolId));
  }, [api, schoolId]);

  useEffect(() => {
    let cancelled = false;
    api.loadDatabase(schoolId).then((d) => { if (!cancelled) setInfo(d); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const update = async () => {
    setBusy(true);
    try { await api.updateDatabase(schoolId); await load(); } finally { setBusy(false); }
  };

  const pending = info?.pending;
  const changes = pending ? pending.created_tables.length + pending.added_columns.length : 0;

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Database</h3>
      {!info && <p className="text-xs text-gray-400">Checking…</p>}
      {info && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 p-3 dark:border-slate-700">
          <div className="min-w-0 text-sm">
            <p className="break-all font-mono text-gray-800 dark:text-gray-100">{info.database_name || "—"}</p>
            <p className="text-xs">
              {!info.reachable && <span className="text-red-600">{info.error || "Not reachable"}</span>}
              {info.reachable && info.up_to_date && <span className="text-emerald-600">Reachable · structure up to date</span>}
              {info.reachable && info.up_to_date === false && (
                <span className="text-amber-600">
                  Reachable · {changes} update{changes === 1 ? "" : "s"} available
                </span>
              )}
            </p>
            {pending?.skipped?.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">Needs a hand-written migration: {pending.skipped.join("; ")}</p>
            )}
          </div>
          {info.reachable && info.up_to_date === false && (
            <button type="button" disabled={busy} className={btn} onClick={update}>
              {busy ? "Updating…" : "Update database"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
