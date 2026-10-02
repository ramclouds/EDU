import { useState } from "react";
import { useDeveloperDashboard } from "../controllers/Developer/useDeveloperDashboard";
import { APP_NAME } from "../config/appConfig";
import "../css/dashboard.css";

const STATUS_STYLES = {
  Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Trial: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Suspended: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  Expired: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400",
};

function StatCard({ label, value, icon }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-gray-100">
            {value ?? "—"}
          </p>
        </div>
        <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
          <i className={`bi ${icon} text-xl`}></i>
        </div>
      </div>
    </div>
  );
}

function CreateSchoolModal({ onClose, onCreate, creating }) {
  const [form, setForm] = useState({
    name: "",
    contact_email: "",
    contact_phone: "",
    plan: "Trial",
    admin_first_name: "",
    admin_last_name: "",
    admin_email: "",
    admin_password: "",
  });

  const update = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await onCreate(form);
    if (result) onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Onboard a new school
        </h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          This creates the school and its first Super Admin login together.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              School name
            </label>
            <input
              required
              value={form.name}
              onChange={update("name")}
              className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100"
              placeholder="Greenwood High School"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Contact email
              </label>
              <input
                type="email"
                value={form.contact_email}
                onChange={update("contact_email")}
                className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Contact phone
              </label>
              <input
                value={form.contact_phone}
                onChange={update("contact_phone")}
                className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Plan
            </label>
            <select
              value={form.plan}
              onChange={update("plan")}
              className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100"
            >
              <option value="Trial">Trial (14 days)</option>
              <option value="Basic">Basic</option>
              <option value="Pro">Pro</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>

          <hr className="my-2 border-gray-100 dark:border-slate-700" />
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            First Super Admin (school's login)
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                First name
              </label>
              <input
                required
                value={form.admin_first_name}
                onChange={update("admin_first_name")}
                className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Last name
              </label>
              <input
                value={form.admin_last_name}
                onChange={update("admin_last_name")}
                className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Admin email
            </label>
            <input
              required
              type="email"
              value={form.admin_email}
              onChange={update("admin_email")}
              className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Temporary password
            </label>
            <input
              required
              type="text"
              value={form.admin_password}
              onChange={update("admin_password")}
              className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100"
              placeholder="Share this with the school, ask them to change it"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:opacity-90 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create school"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DeveloperDashboard() {
  const {
    developer,
    schools,
    stats,
    loading,
    creating,
    logout,
    createSchool,
    setSchoolStatus,
  } = useDeveloperDashboard();

  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = schools.filter((s) =>
    `${s.name} ${s.school_code}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* TOPBAR */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 p-2 text-white">
            <i className="bi bi-hdd-network"></i>
          </div>
          <div>
            <div className="font-semibold text-gray-800 dark:text-gray-100">
              Platform Console
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {APP_NAME}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {developer?.name}
          </span>
          <button
            onClick={logout}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            Log out
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* STATS */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Schools" value={stats?.total_schools} icon="bi-building" />
          <StatCard label="Active" value={stats?.active_schools} icon="bi-check-circle" />
          <StatCard label="Trial" value={stats?.trial_schools} icon="bi-hourglass-split" />
          <StatCard label="Suspended" value={stats?.suspended_schools} icon="bi-slash-circle" />
          <StatCard label="Students" value={stats?.total_students} icon="bi-people" />
          <StatCard label="Staff" value={stats?.total_staff} icon="bi-person-badge" />
        </div>

        {/* SCHOOLS TABLE */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Schools
            </h2>
            <div className="flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or code…"
                className="rounded-lg border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100"
              />
              <button
                onClick={() => setShowCreate(true)}
                className="whitespace-nowrap rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:opacity-90"
              >
                <i className="bi bi-plus-lg mr-1"></i> New school
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              {schools.length === 0
                ? "No schools yet — create your first one."
                : "No schools match your search."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400 dark:border-slate-700">
                    <th className="px-5 py-3">School</th>
                    <th className="px-5 py-3">Code</th>
                    <th className="px-5 py-3">Plan</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Students</th>
                    <th className="px-5 py-3">Staff</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-gray-50 last:border-0 dark:border-slate-700/50"
                    >
                      <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-100">
                        {s.name}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                        {s.school_code}
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                        {s.plan}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            STATUS_STYLES[s.status] || STATUS_STYLES.Expired
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                        {s.student_count ?? "—"} / {s.max_students}
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                        {s.staff_count ?? "—"} / {s.max_staff}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {s.status === "Suspended" ? (
                          <button
                            onClick={() => setSchoolStatus(s.id, "reactivate")}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                          >
                            Reactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => setSchoolStatus(s.id, "suspend")}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                          >
                            Suspend
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateSchoolModal
          onClose={() => setShowCreate(false)}
          onCreate={createSchool}
          creating={creating}
        />
      )}
    </div>
  );
}
