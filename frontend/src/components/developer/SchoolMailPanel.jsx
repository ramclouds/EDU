import { useEffect, useState } from "react";
import SmtpForm from "./SmtpForm";

// One school's own mail server. Without its own, the school uses the platform's.
export default function SchoolMailPanel({ schoolId, schoolName, api }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => setData(await api.loadSchoolMail(schoolId));

  useEffect(() => {
    let cancelled = false;
    api.loadSchoolMail(schoolId).then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  if (!data) return <p className="text-xs text-gray-400">Loading email settings…</p>;

  const inUse = data.in_use === "school"
    ? `${schoolName} sends with its own mail server.`
    : data.in_use === "platform"
      ? "This school sends with the platform's mail server."
      : "No mail server is set up for this school or the platform yet.";

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Email (SMTP)</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">{inUse}</p>
      </div>
      <SmtpForm
        saved={data.smtp}
        busy={busy}
        hint="Set this only if the school has its own mail server or sender address. Otherwise leave it empty and it uses the platform's."
        onSave={async (fields) => {
          setBusy(true);
          const r = await api.saveSchoolMail(schoolId, fields);
          setBusy(false);
          if (r) await load();
        }}
        onTest={(to) => api.testSchoolMail(schoolId, to)}
        onRemove={data.smtp?.configured ? async () => {
          if (!window.confirm("Remove this school's own mail server? It will use the platform's.")) return;
          setBusy(true);
          const ok = await api.removeSchoolMail(schoolId);
          setBusy(false);
          if (ok) await load();
        } : null}
        removeLabel="Use the platform's mail server"
      />
    </section>
  );
}
