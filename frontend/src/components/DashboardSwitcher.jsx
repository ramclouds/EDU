import { useEffect } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { useDashboardAccess } from "../controllers/Auth/useDashboardAccess";

// "My dashboards": every dashboard this admin may open, so a custom permission granted
// for another dashboard appears as a link right away. The list is refreshed on load.
export default function DashboardSwitcher({ expanded = true }) {
  const { dashboards, refresh } = useDashboardAccess();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = "/" + (location.pathname.split("/").filter(Boolean)[0] || "");
  const others = dashboards.filter((d) => d.route !== current && (d.can_view || d.plan_locked));
  if (others.length === 0) return null;

  return (
    <div className="space-y-1">
      {expanded && (
        <p className="mt-4 px-2 text-xs text-gray-400">MY DASHBOARDS</p>
      )}
      {others.map((d) => (
        <button
          key={d.key}
          type="button"
          onClick={() => (d.plan_locked ? toast.error(d.plan_message, { duration: 7000 }) : navigate(d.route))}
          title={d.plan_locked ? `${d.label}: not in your plan` : d.label}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${d.plan_locked ? "text-gray-400 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-slate-700" : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700"}`}
        >
          <i className={d.plan_locked ? "bi bi-lock" : "bi bi-box-arrow-up-right"} />
          {expanded && <span className="truncate">{d.label}</span>}
        </button>
      ))}
    </div>
  );
}
