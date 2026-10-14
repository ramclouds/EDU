import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { BASE_URL } from "../config/appConfig";

function authHeaders(json = false) {
  const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

function useSectionData(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    fetch(`${BASE_URL}${path}`, { headers: authHeaders() })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(body.error || `Failed to load (${res.status})`);
          setData(null);
        } else {
          setData(body);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not reach the server");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, loading, error, reload };
}

async function sendJson(method, path, payload) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: authHeaders(payload !== undefined),
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Request failed");
  return body;
}

const card =
  "rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800";
const inputCls =
  "mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100";
const primaryBtn =
  "rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:opacity-90 disabled:opacity-50";
const dangerBtn =
  "rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-300";

const money = (n) =>
  n === null || n === undefined || n === ""
    ? "—"
    : Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });

function SectionHeader({ title, subtitle, action }) {
  return (
    <div className={`${card} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className={card}>
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-gray-100">
        {value ?? "—"}
      </p>
    </div>
  );
}

function Table({ columns, rows, empty }) {
  if (!rows || rows.length === 0) {
    return <div className="p-10 text-center text-gray-400">{empty}</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400 dark:border-slate-700">
            {columns.map((c) => (
              <th key={c.key} className="px-5 py-3">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i} className="border-b border-gray-50 last:border-0 dark:border-slate-700/50">
              {columns.map((c) => (
                <td key={c.key} className="px-5 py-3 text-gray-700 dark:text-gray-200">
                  {c.render ? c.render(row) : row[c.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Panel({ loading, error, children }) {
  if (loading) return <div className={`${card} p-10 text-center text-gray-400`}>Loading…</div>;
  if (error) return <div className={`${card} p-10 text-center text-red-500`}>{error}</div>;
  return children;
}

/* =========================================================
   STAFF  — /api/admin/staff
========================================================= */
export function StaffSection() {
  const { data, loading, error } = useSectionData("/admin/staff");
  const [search, setSearch] = useState("");
  const rows = (data?.staff || []).filter((s) =>
    `${s.name} ${s.staff_code} ${s.designation} ${s.department}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const stats = data?.stats || {};

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Staff"
        subtitle="Teaching and non-teaching staff across this school."
        action={
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, code, dept…"
            className={inputCls + " sm:w-64"}
          />
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total" value={stats.total} />
        <Stat label="Teaching" value={stats.teaching} />
        <Stat label="Non-teaching" value={stats.non_teaching} />
        <Stat label="Active" value={stats.active} />
      </div>
      <div className={card + " p-0"}>
        <Panel loading={loading} error={error}>
          <Table
            rows={rows}
            empty="No staff recorded yet."
            columns={[
              { key: "name", label: "Name" },
              { key: "staff_code", label: "Code" },
              { key: "designation", label: "Designation" },
              { key: "department", label: "Department" },
              { key: "status", label: "Status" },
              { key: "mobile", label: "Mobile" },
            ]}
          />
        </Panel>
      </div>
    </section>
  );
}

/* =========================================================
   NOTICES  — /api/announcements/manage, POST /api/announcements,
              DELETE /api/announcements/<id>
========================================================= */
const AUDIENCES = ["All", "Students", "Teachers", "Admins", "Staff"];
const CATEGORIES = ["Academic", "Examination", "Holiday", "Event", "General"];
const PRIORITIES = ["High", "Medium", "Low"];

export function NoticesSection() {
  const { data, loading, error, reload } = useSectionData("/announcements/manage");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const blank = {
    title: "", description: "", notice_date: new Date().toISOString().slice(0, 10),
    expiry_date: "", category: "General", priority: "Medium", audience: "All",
  };
  const [form, setForm] = useState(blank);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await sendJson("POST", "/announcements", {
        ...form,
        expiry_date: form.expiry_date || undefined,
      });
      toast.success("Notice published");
      setForm(blank);
      setShowForm(false);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this notice? Students and staff will no longer see it.")) return;
    try {
      await sendJson("DELETE", `/announcements/${id}`);
      toast.success("Notice removed");
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Notices"
        subtitle="Announcements published to students, teachers, admins and staff."
        action={
          <button type="button" onClick={() => setShowForm((v) => !v)} className={primaryBtn}>
            {showForm ? "Close" : "New notice"}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={submit} className={`${card} grid grid-cols-1 gap-3 sm:grid-cols-2`}>
          <label className="sm:col-span-2 text-sm font-medium">Title
            <input required value={form.title} onChange={set("title")} className={inputCls} />
          </label>
          <label className="sm:col-span-2 text-sm font-medium">Message
            <textarea required rows={3} value={form.description} onChange={set("description")} className={inputCls} />
          </label>
          <label className="text-sm font-medium">Date
            <input required type="date" value={form.notice_date} onChange={set("notice_date")} className={inputCls} />
          </label>
          <label className="text-sm font-medium">Expires (optional)
            <input type="date" value={form.expiry_date} onChange={set("expiry_date")} className={inputCls} />
          </label>
          <label className="text-sm font-medium">Audience
            <select value={form.audience} onChange={set("audience")} className={inputCls}>
              {AUDIENCES.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">Category
            <select value={form.category} onChange={set("category")} className={inputCls}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">Priority
            <select value={form.priority} onChange={set("priority")} className={inputCls}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <div className="flex justify-end sm:col-span-2">
            <button type="submit" disabled={saving} className={primaryBtn}>
              {saving ? "Publishing…" : "Publish notice"}
            </button>
          </div>
        </form>
      )}

      <div className={card + " p-0"}>
        <Panel loading={loading} error={error}>
          <Table
            rows={data?.notices || []}
            empty="No notices published yet."
            columns={[
              { key: "title", label: "Title" },
              { key: "audience", label: "Audience" },
              { key: "category", label: "Category" },
              { key: "priority", label: "Priority" },
              { key: "notice_date", label: "Date" },
              {
                key: "actions",
                label: "",
                render: (n) => (
                  <button type="button" onClick={() => remove(n.id)} className={dangerBtn}>Remove</button>
                ),
              },
            ]}
          />
        </Panel>
      </div>
    </section>
  );
}

/* =========================================================
   FEES  — /api/accounts/fees/summary, /fee-structures, /fees/pending
========================================================= */
export function FeesSection() {
  const summary = useSectionData("/accounts/fees/summary");
  const structures = useSectionData("/accounts/fee-structures");
  const pending = useSectionData("/accounts/fees/pending");
  const s = summary.data?.summary || {};
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const blank = { name: "", fee_category: "Tuition", academic_year: "", amount: "", due_date: "" };
  const [form, setForm] = useState(blank);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await sendJson("POST", "/accounts/fee-structures", { ...form, amount: Number(form.amount) });
      toast.success("Fee structure created");
      setForm(blank);
      setShowForm(false);
      structures.reload();
      summary.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Fee Management"
        subtitle="Collections, fee structures and dues."
        action={
          <button type="button" onClick={() => setShowForm((v) => !v)} className={primaryBtn}>
            {showForm ? "Close" : "New fee structure"}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={submit} className={`${card} grid grid-cols-1 gap-3 sm:grid-cols-2`}>
          <label className="text-sm font-medium">Name
            <input required value={form.name} onChange={set("name")} className={inputCls} />
          </label>
          <label className="text-sm font-medium">Category
            <input required value={form.fee_category} onChange={set("fee_category")} className={inputCls} />
          </label>
          <label className="text-sm font-medium">Academic year
            <input required placeholder="2026-27" value={form.academic_year} onChange={set("academic_year")} className={inputCls} />
          </label>
          <label className="text-sm font-medium">Amount
            <input required type="number" min="0" step="0.01" value={form.amount} onChange={set("amount")} className={inputCls} />
          </label>
          <label className="text-sm font-medium">Due date
            <input required type="date" value={form.due_date} onChange={set("due_date")} className={inputCls} />
          </label>
          <div className="flex justify-end sm:col-span-2">
            <button type="submit" disabled={saving} className={primaryBtn}>
              {saving ? "Saving…" : "Create fee structure"}
            </button>
          </div>
        </form>
      )}
      <Panel loading={summary.loading} error={summary.error}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Stat label="Collected this month" value={money(s.collected_this_month)} />
          <Stat label="Total outstanding" value={money(s.total_outstanding)} />
          <Stat label="Overdue installments" value={s.overdue_installments} />
        </div>
      </Panel>

      <div className={card + " p-0"}>
        <div className="border-b border-gray-100 p-5 dark:border-slate-700">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">Fee structures</h3>
        </div>
        <Panel loading={structures.loading} error={structures.error}>
          <Table
            rows={structures.data?.fee_structures || []}
            empty="No fee structures yet."
            columns={[
              { key: "name", label: "Name" },
              { key: "fee_category", label: "Category" },
              { key: "academic_year", label: "Year" },
              { key: "amount", label: "Amount", render: (r) => money(r.amount) },
              { key: "due_date", label: "Due" },
              { key: "applied_count", label: "Applied to" },
            ]}
          />
        </Panel>
      </div>

      <div className={card + " p-0"}>
        <div className="border-b border-gray-100 p-5 dark:border-slate-700">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">Pending dues</h3>
        </div>
        <Panel loading={pending.loading} error={pending.error}>
          <Table
            rows={pending.data?.pending_fees || []}
            empty="No pending dues."
            columns={[
              { key: "title", label: "Installment" },
              { key: "class_class_name", label: "Class", render: (r) => r.class_class_name || "Not assigned" },
              { key: "student_id", label: "Student ID" },
              { key: "balance", label: "Balance", render: (r) => money(r.balance) },
              { key: "due_date", label: "Due" },
              { key: "status", label: "Status" },
            ]}
          />
        </Panel>
      </div>
    </section>
  );
}

/* =========================================================
   PAYROLL  — /api/accounts/payroll/summary, /payroll/staff
========================================================= */
export function PayrollSection() {
  const summary = useSectionData("/accounts/payroll/summary");
  const staff = useSectionData("/accounts/payroll/staff");
  const s = summary.data?.summary || {};
  const [running, setRunning] = useState(false);

  const runPayroll = async () => {
    if (!window.confirm("Generate payslips for the current month for all staff with a salary structure?")) return;
    setRunning(true);
    try {
      const body = await sendJson("POST", "/accounts/payroll/run", {});
      toast.success(body.message || "Payroll run complete");
      summary.reload();
      staff.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Payroll"
        subtitle={s.month && s.year ? `Pay period ${s.month}/${s.year}` : "Salaries and payslips for this school."}
        action={
          <button type="button" onClick={runPayroll} disabled={running} className={primaryBtn}>
            {running ? "Running…" : "Run payroll"}
          </button>
        }
      />
      <Panel loading={summary.loading} error={summary.error}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Paid" value={money(s.paid_amount)} />
          <Stat label="Pending" value={money(s.pending_amount)} />
          <Stat label="Payslips" value={s.total_payslips} />
          <Stat label="Pending payslips" value={s.pending_count} />
        </div>
      </Panel>
      <div className={card + " p-0"}>
        <Panel loading={staff.loading} error={staff.error}>
          <Table
            rows={staff.data?.staff || []}
            empty="No staff on the payroll yet."
            columns={[
              { key: "name", label: "Name" },
              { key: "designation", label: "Designation" },
              { key: "department", label: "Department" },
              { key: "gross", label: "Gross", render: (r) => money(r.gross) },
              { key: "net", label: "Net", render: (r) => money(r.net) },
              {
                key: "has_salary_structure",
                label: "Salary set",
                render: (r) => (r.has_salary_structure ? "Yes" : "No"),
              },
            ]}
          />
        </Panel>
      </div>
    </section>
  );
}

/* =========================================================
   REPORTS  — /api/accounts/financial-overview
========================================================= */
export function ReportsSection() {
  const { data, loading, error } = useSectionData("/accounts/financial-overview");
  const s = data?.summary || {};
  const trend = data?.trend || [];

  return (
    <section className="space-y-6">
      <SectionHeader title="Financial Reports" subtitle={data?.period ? `Period: ${data.period}` : "Revenue, costs and net position."} />
      <Panel loading={loading} error={error}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Total revenue" value={money(s.total_revenue)} />
          <Stat label="Total cost" value={money(s.total_cost)} />
          <Stat label="Net" value={money(s.net)} />
          <Stat label="Fees outstanding" value={money(s.fee_outstanding)} />
        </div>
        <div className={card + " mt-6 p-0"}>
          <Table
            rows={trend}
            empty="No financial activity in this period."
            columns={[
              { key: "label", label: "Period" },
              { key: "revenue", label: "Revenue", render: (r) => money(r.revenue) },
              { key: "cost", label: "Cost", render: (r) => money(r.cost) },
              { key: "net", label: "Net", render: (r) => money(r.net) },
            ]}
          />
        </div>
      </Panel>
    </section>
  );
}

/* =========================================================
   ANALYTICS  — students stats, today's attendance, exam dashboard
========================================================= */
export function AnalyticsSection() {
  const today = new Date().toISOString().slice(0, 10);
  const students = useSectionData("/admin/students");
  const attendance = useSectionData(`/admin/attendance/stats?date=${today}&role=students`);
  const exams = useSectionData("/admin/exams/dashboard");
  const st = students.data?.stats || {};
  const at = attendance.data || {};
  const ex = exams.data?.stats || {};

  return (
    <section className="space-y-6">
      <SectionHeader title="Analytics" subtitle={`Students, attendance today (${today}) and exam performance.`} />
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Students</h3>
      <Panel loading={students.loading} error={students.error}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Total" value={st.total} />
          <Stat label="Active" value={st.active} />
          <Stat label="Inactive" value={st.inactive} />
          <Stat label="Unassigned to a class" value={st.unassigned} />
        </div>
      </Panel>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Attendance today</h3>
      <Panel loading={attendance.loading} error={attendance.error}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Present" value={at.present} />
          <Stat label="Absent" value={at.absent} />
          <Stat label="Late" value={at.late} />
          <Stat label="Attendance %" value={at.percentage !== undefined ? `${at.percentage}%` : undefined} />
        </div>
      </Panel>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Exams</h3>
      <Panel loading={exams.loading} error={exams.error}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Pass %" value={ex.pass_percentage !== undefined ? `${ex.pass_percentage}%` : undefined} />
          <Stat label="Average score" value={ex.average_score} />
          <Stat label="Results published" value={ex.results_published} />
          <Stat label="At-risk students" value={ex.at_risk_students} />
        </div>
      </Panel>
    </section>
  );
}

/* =========================================================
   PARENTS  — /api/admin/parents (guardian details on each student)
========================================================= */
export function ParentsSection() {
  const [search, setSearch] = useState("");
  const path = `/admin/parents${search ? `?search=${encodeURIComponent(search)}` : ""}`;
  const { data, loading, error } = useSectionData(path);
  const stats = data?.stats || {};

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Parents"
        subtitle="Guardian details recorded for each student."
        action={
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student or guardian…"
            className={inputCls + " sm:w-64"}
          />
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Students" value={stats.students} />
        <Stat label="With guardian" value={stats.with_guardian} />
        <Stat label="Missing guardian" value={stats.without_guardian} />
      </div>
      <div className={card + " p-0"}>
        <Panel loading={loading} error={error}>
          <Table
            rows={data?.parents || []}
            empty="No students with guardian details yet."
            columns={[
              { key: "student_name", label: "Student" },
              { key: "student_id", label: "Student ID" },
              { key: "father_name", label: "Father" },
              { key: "father_mobile", label: "Father mobile" },
              { key: "mother_name", label: "Mother" },
              { key: "parent_email", label: "Email" },
            ]}
          />
        </Panel>
      </div>
    </section>
  );
}

/* =========================================================
   EVENTS  — /api/admin/events (GET, POST) and /api/admin/events/<id> (DELETE)
========================================================= */
const EVENT_CATEGORIES = ["Academic", "Sports", "Cultural", "Holiday", "Meeting", "Other"];

export function EventsSection() {
  const { data, loading, error, reload } = useSectionData("/admin/events");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const blank = { title: "", event_date: new Date().toISOString().slice(0, 10), location: "", category: "Other", description: "" };
  const [form, setForm] = useState(blank);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await sendJson("POST", "/admin/events", form);
      toast.success("Event added");
      setForm(blank);
      setShowForm(false);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this event?")) return;
    try {
      await sendJson("DELETE", `/admin/events/${id}`);
      toast.success("Event deleted");
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Events"
        subtitle="School calendar: sports days, meetings, holidays and more."
        action={
          <button type="button" onClick={() => setShowForm((v) => !v)} className={primaryBtn}>
            {showForm ? "Close" : "New event"}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={submit} className={`${card} grid grid-cols-1 gap-3 sm:grid-cols-2`}>
          <label className="sm:col-span-2 text-sm font-medium">Title
            <input required value={form.title} onChange={set("title")} className={inputCls} />
          </label>
          <label className="text-sm font-medium">Date
            <input required type="date" value={form.event_date} onChange={set("event_date")} className={inputCls} />
          </label>
          <label className="text-sm font-medium">Category
            <select value={form.category} onChange={set("category")} className={inputCls}>
              {EVENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2 text-sm font-medium">Location (optional)
            <input value={form.location} onChange={set("location")} className={inputCls} />
          </label>
          <label className="sm:col-span-2 text-sm font-medium">Details (optional)
            <textarea rows={2} value={form.description} onChange={set("description")} className={inputCls} />
          </label>
          <div className="flex justify-end sm:col-span-2">
            <button type="submit" disabled={saving} className={primaryBtn}>
              {saving ? "Saving…" : "Add event"}
            </button>
          </div>
        </form>
      )}

      <div className={card + " p-0"}>
        <Panel loading={loading} error={error}>
          <Table
            rows={data?.events || []}
            empty="No events scheduled."
            columns={[
              { key: "title", label: "Title" },
              { key: "event_date", label: "Date" },
              { key: "category", label: "Category" },
              { key: "location", label: "Location" },
              {
                key: "actions",
                label: "",
                render: (ev) => (
                  <button type="button" onClick={() => remove(ev.id)} className={dangerBtn}>Delete</button>
                ),
              },
            ]}
          />
        </Panel>
      </div>
    </section>
  );
}
