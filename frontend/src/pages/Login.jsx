import { useLogin } from "../controllers/Auth/useLogin";
import { APP_NAME, APP_TAGLINE, SUPPORT_EMAIL } from "../config/appConfig";

const input =
  "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 placeholder:text-gray-400 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100 dark:placeholder:text-gray-500";
const primaryBtn =
  "w-full rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-medium text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

export default function Login() {
  const {
    identifier,
    setIdentifier,
    password,
    setPassword,
    schoolCode,
    setSchoolCode,
    resetEmail,
    setResetEmail,
    loading,
    showPassword,
    setShowPassword,
    showForgotModal,
    setShowForgotModal,
    login,
    handleForgotPassword,
  } = useLogin();

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-indigo-50 text-gray-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 dark:text-gray-100">
      {/* Top bar */}
      <header className="flex flex-col gap-3 border-b border-gray-100 bg-white/80 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-8 dark:border-slate-700 dark:bg-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 p-2 text-white shadow-md">
            <i className="bi bi-book" />
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">{APP_NAME}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{APP_TAGLINE}</div>
          </div>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Need help?{" "}
          {SUPPORT_EMAIL ? (
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">Contact support</a>
          ) : (
            <span>ask your school administrator</span>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="flex w-full max-w-6xl flex-col items-center gap-10 lg:flex-row">
          {/* Intro panel */}
          <section className="hidden flex-1 rounded-3xl border border-gray-100 bg-white p-10 shadow-sm lg:block dark:border-slate-700 dark:bg-slate-800">
            <h1 className="text-4xl font-bold leading-tight text-gray-900 dark:text-gray-100">
              Welcome to <br />
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{APP_NAME}</span>
            </h1>
            <p className="mt-6 max-w-md text-gray-600 dark:text-gray-400">
              One secure system for running the whole school: academics, attendance, fees, library, hostel and communication.
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <Feature icon="bi-mortarboard-fill" title="Academics & exams" desc="Classes, subjects, marks, verified results and report cards." />
              <Feature icon="bi-calendar-check-fill" title="Attendance & timetable" desc="Daily attendance for students and staff, and class timetables." />
              <Feature icon="bi-journal-text" title="Assignments" desc="Teachers set work, students submit it and see their marks." />
              <Feature icon="bi-cash-coin" title="Fees & payroll" desc="Fee collection, pending dues, payslips and expenses." />
              <Feature icon="bi-book-half" title="Library & hostel" desc="Book lending, fines, room allotment and hostel requests." />
              <Feature icon="bi-megaphone-fill" title="Notices & events" desc="School notices, the school calendar and notifications." />
            </div>
            {/* <div className="mt-8 rounded-xl bg-indigo-50 p-4 text-sm text-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-200">
              <p className="font-semibold">Who signs in here</p>
              <p className="mt-1">Super Admins, admin staff, teachers and students. Each person sees only what their role allows, and each school&apos;s information stays private.</p>
            </div> */}
          </section>

          {/* Sign-in card */}
          <section className="w-full rounded-2xl border border-gray-100 bg-white p-8 shadow-xl sm:max-w-md dark:border-slate-700 dark:bg-slate-800">
            <h2 className="text-center text-2xl font-semibold text-gray-900 dark:text-gray-100">Sign In</h2>
            <p className="mb-6 mt-2 text-center text-sm text-gray-500 dark:text-gray-400">Sign in to continue to your portal</p>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                School code{" "}
                <span className="font-normal text-gray-400">(leave blank if your school hasn't been given one)</span>
              </label>
              <input
                type="text"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                placeholder="e.g. SCH-A1B2C3"
                className={`${input} uppercase placeholder:normal-case`}
              />
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email or username</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter email or username"
                className={input}
              />
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between text-sm">
                <label className="font-medium text-gray-700 dark:text-gray-300">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="font-medium text-indigo-600 hover:underline dark:text-indigo-300"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${input} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <i className={showPassword ? "bi bi-eye-slash-fill" : "bi bi-eye-fill"} />
                </button>
              </div>
            </div>

            <button onClick={login} disabled={loading} className={primaryBtn}>
              {loading ? "Signing in…" : "Sign In"}
            </button>

            <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
              New to {APP_NAME}? Your school administrator creates your account and gives you your login.
            </p>
          </section>
        </div>
      </main>

      {/* Forgot password */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              aria-label="Close"
              className="absolute right-3 top-3 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200"
            >
              <i className="bi bi-x-lg" />
            </button>
            <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">Forgot Password</h3>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Enter your email to receive a reset link</p>
            <input
              type="email"
              placeholder="Enter your email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className={`${input} mb-4 mt-0`}
            />
            <button onClick={handleForgotPassword} className={primaryBtn}>Send Reset Link</button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
          <div>
            © {new Date().getFullYear()} <span className="font-medium text-gray-800 dark:text-gray-200">{APP_NAME}</span>. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div className="flex items-start gap-4">
      <div className="rounded-lg bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
        <i className={`bi ${icon}`} />
      </div>
      <div>
        <div className="font-semibold text-gray-800 dark:text-gray-100">{title}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{desc}</div>
      </div>
    </div>
  );
}
