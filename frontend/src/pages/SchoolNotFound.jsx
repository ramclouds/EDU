// Shown when the web address does not belong to any school on this system.
export default function SchoolNotFound({ message, address }) {
  const host = typeof window !== "undefined" ? window.location.host : "";
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-xl dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
          <i className="bi bi-question-diamond text-2xl" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">School not found</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {message || "No school was found at this web address."}
        </p>
        <p className="mt-3 break-all rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-500 dark:bg-slate-900 dark:text-gray-400">
          {host}
        </p>
        <p className="mt-4 text-xs text-gray-400">
          Check the spelling of the address{address ? ` (${address})` : ""}. Schools get their own address when they are
          created. If you are sure it is correct, ask the platform administrator.
        </p>
        <a href="/" className="mt-6 inline-block rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200">
          Go to the main sign-in page
        </a>
      </div>
    </div>
  );
}
