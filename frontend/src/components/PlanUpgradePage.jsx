import { useNavigate } from "react-router-dom";

// Shown in place of a dashboard that the school's plan does not include.
export default function PlanUpgradePage({ message, plan, homeRoute }) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <div className="w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-xl dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
          <i className="bi bi-lock-fill text-2xl" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Not in your plan</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {message || "This dashboard is not included in your school's plan."}
        </p>
        <p className="mt-1 text-xs text-gray-400">Your school is on the {plan || "current"} plan.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(homeRoute || "/")}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-md hover:opacity-90"
          >
            Go to my dashboard
          </button>
          <a href="mailto:support@ramclouds.com" className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200">
            Ask about upgrading
          </a>
        </div>
      </div>
    </div>
  );
}
