import { useMemo, useState } from "react";
import toast from "react-hot-toast";

const card = "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800";
const field = "rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100";
const iconBtn = "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700";
const primary = "inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:opacity-90";
const ghost = "inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700";

const STATUSES = ["All", "Active", "Trial", "Suspended", "Expired"];
const SORTS = [
  ["name", "Name (A–Z)"],
  ["newest", "Newest first"],
  ["trial", "Trial ending soonest"],
  ["students", "Most students"],
];

async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Could not copy. Select the text and copy it manually.");
  }
}

// The school list: one row per school. Each column says what it holds.
export default function SchoolsTable({
  schools, filtered, loading,
  search, onSearch, statusFilter, onStatusFilter, planFilter, onPlanFilter, plans,
  statusStyles, trialDaysLeft, onOpen, onCreate, onEmail, onExport, exportDisabled,
}) {
  const [sort, setSort] = useState("name");

  const counts = useMemo(() => {
    const c = { All: schools.length };
    schools.forEach((s) => { c[s.status] = (c[s.status] || 0) + 1; });
    return c;
  }, [schools]);

  const rows = useMemo(() => {
    const list = [...filtered];
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "newest") list.sort((a, b) => (b.id || 0) - (a.id || 0));
    if (sort === "students") list.sort((a, b) => (b.student_count || 0) - (a.student_count || 0));
    if (sort === "trial") {
      list.sort((a, b) => (trialDaysLeft(a) ?? 9999) - (trialDaysLeft(b) ?? 9999));
    }
    return list;
  }, [filtered, sort, trialDaysLeft]);

  return (
    <div className={`${card} overflow-hidden p-0`}>
      {/* Toolbar, row 1: search and actions */}
      <div className="flex flex-col gap-3 border-b border-gray-100 p-5 dark:border-slate-700 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <i className="bi bi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by school name, school code, tenant ID or contact email"
            className={`${field} w-full pl-9`}
            aria-label="Search schools"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onExport} disabled={exportDisabled} className={ghost}>
            <i className="bi bi-download" /> Export CSV
          </button>
          <button type="button" onClick={onEmail} className={ghost}>
            <i className="bi bi-envelope" /> Email
          </button>
          <button type="button" onClick={onCreate} className={primary}>
            <i className="bi bi-plus-lg" /> New school
          </button>
        </div>
      </div>

      {/* Toolbar, row 2: status chips and filters */}
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-3 dark:border-slate-700 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {STATUSES.map((s) => {
            const value = s === "All" ? "all" : s;
            const active = statusFilter === value;
            return (
              <button
                key={s}
                type="button"
                onClick={() => onStatusFilter(value)}
                aria-pressed={active}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${active ? "bg-indigo-600 text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600"}`}
              >
                {s} <span className={active ? "text-indigo-100" : "text-gray-400"}>{counts[s === "All" ? "All" : s] ?? 0}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            Plan
            <select className={field} value={planFilter} onChange={(e) => onPlanFilter(e.target.value)}>
              <option value="all">All plans</option>
              {plans.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            Sort by
            <select className={field} value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-10 text-center text-sm text-gray-400">Loading schools…</div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-400">
          {schools.length === 0 ? "No schools yet. Select New school to create the first one." : "No schools match these filters. Clear the search or choose All."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-xs font-semibold text-gray-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-gray-400">
                <th className="px-5 py-3">School</th>
                <th className="px-5 py-3">Sign-in page address</th>
                <th className="px-5 py-3">School code</th>
                <th className="px-5 py-3">Database</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Students</th>
                <th className="px-5 py-3">Trial left</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const days = trialDaysLeft(s);
                const used = s.student_count ?? 0;
                return (
                  <tr key={s.id} onClick={() => onOpen(s.id)} className="cursor-pointer border-b border-gray-50 transition last:border-0 hover:bg-indigo-50/40 dark:border-slate-700/60 dark:hover:bg-slate-700/40">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{s.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">ID: {s.tenant_id || "not set"}</div>
                    </td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      {s.login_url ? (
                        <div className="flex items-center gap-2">
                          <a href={s.login_url} target="_blank" rel="noreferrer" className="max-w-[260px] truncate font-mono text-xs text-indigo-600 hover:underline dark:text-indigo-300" title={s.login_url}>
                            {s.login_url}
                          </a>
                          <button type="button" className={iconBtn} title="Copy sign-in address" aria-label="Copy sign-in address" onClick={() => copyText(s.login_url, "Sign-in address")}>
                            <i className="bi bi-clipboard" />
                          </button>
                          <a href={s.login_url} target="_blank" rel="noreferrer" className={iconBtn} title="Open sign-in page" aria-label="Open sign-in page">
                            <i className="bi bi-box-arrow-up-right" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 dark:text-amber-400">Not available yet. Set TENANT_BASE_DOMAIN in the backend .env and restart.</span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">{s.school_code}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500 dark:text-gray-400" title={s.database_name || ""}>{s.database_name || "not created"}</td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-200">{s.plan}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[s.status] || statusStyles.Expired}`}>{s.status}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-800 dark:text-gray-100">{used}</td>
                    <td className="px-5 py-3">
                      {days === null ? (
                        <span className="text-gray-400">No trial</span>
                      ) : (
                        <span className={days <= 7 ? "font-medium text-amber-600 dark:text-amber-400" : "text-gray-700 dark:text-gray-200"}>
                          {days === 0 ? "Ends today" : `${days} day${days === 1 ? "" : "s"}`}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="border-t border-gray-100 px-5 py-2 text-xs text-gray-400 dark:border-slate-700">
        Showing {rows.length} of {schools.length} school{schools.length === 1 ? "" : "s"}. Select a row to open the school.
      </div>
    </div>
  );
}
