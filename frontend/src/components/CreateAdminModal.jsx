import { useState } from "react";
import { ADMIN_TYPES } from "../controllers/AdminSide/useAdminManagement";

export default function CreateAdminModal({ onClose, onCreate, creating }) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    mobile: "",
    admin_type: "Academic Admin",
    username: "",
    password: "",
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
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Create admin account
        </h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          They'll be able to sign in immediately with the password you set
          below — share it with them and ask them to change it.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                First name
              </label>
              <input
                required
                value={form.first_name}
                onChange={update("first_name")}
                className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Last name
              </label>
              <input
                required
                value={form.last_name}
                onChange={update("last_name")}
                className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              required
              type="email"
              value={form.email}
              onChange={update("email")}
              className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Mobile (optional)
            </label>
            <input
              value={form.mobile}
              onChange={update("mobile")}
              className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Admin type
            </label>
            <select
              value={form.admin_type}
              onChange={update("admin_type")}
              className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100"
            >
              {ADMIN_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Username{" "}
              <span className="font-normal text-gray-400">
                (optional — generated from email if left blank)
              </span>
            </label>
            <input
              value={form.username}
              onChange={update("username")}
              className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Temporary password
            </label>
            <input
              required
              minLength={8}
              type="text"
              value={form.password}
              onChange={update("password")}
              placeholder="At least 8 characters"
              className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100"
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
              {creating ? "Creating…" : "Create admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
