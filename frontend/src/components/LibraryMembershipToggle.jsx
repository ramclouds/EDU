import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { BASE_URL } from "../config/appConfig";

// Admin control: whether this student is a library member. Members see the Library section.
export default function LibraryMembershipToggle({ studentId }) {
  const [member, setMember] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!studentId) return undefined;
    let cancelled = false;
    setMember(null);
    fetch(`${BASE_URL}/student/${studentId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setMember(Boolean(data?.library_member));
      })
      .catch(() => {
        if (!cancelled) setMember(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const toggle = async () => {
    if (member === null || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`${BASE_URL}/admin/students/${studentId}/library-membership`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member: !member }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not change library membership");
        return;
      }
      setMember(Boolean(data.library_member));
      toast.success(data.library_member ? "Marked as a library member" : "Library membership removed");
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  if (member === null) return null;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-500 dark:text-gray-400">Library member:</span>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
          member
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300"
        }`}
      >
        {member ? "Yes · remove" : "No · add"}
      </button>
    </div>
  );
}
