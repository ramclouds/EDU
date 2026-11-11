import { useState } from "react";
import toast from "react-hot-toast";

// Which dashboards each plan includes. Mirrors backend/utils/plans.py.
const DASHBOARD_OPTIONS = [
  ["super-admin-dashboard", "Super Admin dashboard"],
  ["academic-admin-dashboard", "Academic dashboard"],
  ["teacher-dashboard", "Teacher dashboard"],
  ["student-dashboard", "Student dashboard"],
  ["library-admin-dashboard", "Library dashboard"],
  ["hostel-admin-dashboard", "Hostel dashboard"],
  ["accounts-admin-dashboard", "Accounts dashboard"],
  ["hr-admin-dashboard", "HR dashboard"],
];
const BASIC = ["super-admin-dashboard", "academic-admin-dashboard", "teacher-dashboard", "student-dashboard"];
const PRO = [...BASIC, "library-admin-dashboard"];
const ENTERPRISE = [...PRO, "hostel-admin-dashboard", "accounts-admin-dashboard"];
const PLAN_INCLUDES = {
  Trial: DASHBOARD_OPTIONS.map(([k]) => k),
  Basic: BASIC,
  Pro: PRO,
  Enterprise: ENTERPRISE,
};
export const PLANS = ["Trial", "Basic", "Pro", "Enterprise", "Custom"];

const card = "rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-700 dark:bg-slate-800";
const input = "mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100";
const primary = "rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:opacity-90 disabled:opacity-50";

// The plan and the dashboards this school may use. Set by the platform owner.
export default function PlanEditor({ schoolId, school, api, onSaved }) {
  const [plan, setPlan] = useState(school.plan || "Trial");
  const [custom, setCustom] = useState(school.custom_dashboards || []);
  const [busy, setBusy] = useState(false);

  const included = plan === "Custom" ? custom : PLAN_INCLUDES[plan] || [];
  const toggle = (key) =>
    setCustom((c) => (c.includes(key) ? c.filter((k) => k !== key) : [...c, key]));

  const save = async () => {
    if (plan === "Custom" && custom.length === 0) return toast.error("Tick at least one dashboard for a custom plan.");
    setBusy(true);
    const r = await api.savePlan(schoolId, plan, plan === "Custom" ? custom : []);
    setBusy(false);
    if (r.ok) {
      toast.success(`Plan set to ${plan}`);
      onSaved?.();
    }
  };

  return (
    <section className={`${card} space-y-4`}>
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Plan and dashboards</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          The school can open only the dashboards in its plan. Anything else shows an upgrade message.
        </p>
      </div>
      <label className="block text-sm font-medium">Plan
        <select className={input} value={plan} onChange={(e) => setPlan(e.target.value)}>
          {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        {DASHBOARD_OPTIONS.map(([key, label]) => {
          const on = included.includes(key);
          return (
            <label key={key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${on ? "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950" : "border-gray-100 text-gray-500 dark:border-slate-700 dark:text-gray-400"}`}>
              <input
                type="checkbox"
                checked={on}
                disabled={plan !== "Custom"}
                onChange={() => toggle(key)}
              />
              {label}
            </label>
          );
        })}
      </div>
      {plan !== "Custom" && (
        <p className="text-xs text-gray-400">Choose Custom to pick the dashboards yourself.</p>
      )}
      <div className="flex justify-end">
        <button type="button" disabled={busy} onClick={save} className={primary}>
          {busy ? "Saving…" : "Save plan"}
        </button>
      </div>
    </section>
  );
}
