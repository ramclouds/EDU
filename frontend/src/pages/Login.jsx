import { useLogin } from "../controllers/Auth/useLogin";
import { APP_NAME, APP_TAGLINE, SUPPORT_EMAIL } from "../config/appConfig";
import { assetUrl, isDarkColor, useLoginBranding } from "../controllers/Auth/useLoginBranding";

const input =
  "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 placeholder:text-gray-400 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100 dark:placeholder:text-gray-500";
const primaryBtn =
  "w-full rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-medium text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

export default function Login() {
  const {
    identifier, setIdentifier, password, setPassword, schoolCode, setSchoolCode,
    resetEmail, setResetEmail, loading, showPassword, setShowPassword,
    showForgotModal, setShowForgotModal, login, handleForgotPassword,
  } = useLogin();

  const b = useLoginBranding() || {};
  const onSchoolAddress = !!b.scoped;
  const title = b.sign_in_title || b.school_name || APP_NAME;
  const headerDark = isDarkColor(b.header_background_color);

  const pageStyle = {
    backgroundColor: b.page_background_color || undefined,
    backgroundImage: b.background_image_url ? `url("${assetUrl(b.background_image_url)}")` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
  const headerStyle = b.header_background_color
    ? { backgroundColor: b.header_background_color, color: headerDark ? "#fff" : undefined }
    : undefined;

  return (
    <div
      className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-indigo-50 text-gray-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 dark:text-gray-100"
      style={pageStyle}
    >
      {/* Header: space across the top, with the header logo in the upper-left corner */}
      <header
        style={headerStyle}
        className="flex flex-col gap-3 border-b border-gray-100 bg-white/80 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-8 dark:border-slate-700 dark:bg-slate-800/80"
      >
        <div className="flex items-center gap-3">
          {b.header_logo_url ? (
            <img src={assetUrl(b.header_logo_url)} alt="" className="h-10 max-w-[180px] object-contain" />
          ) : (
            <div className="rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 p-2 text-white shadow-md">
              <i className="bi bi-book" />
            </div>
          )}
          {!b.header_logo_url && (
            <div>
              <div className="font-semibold">{onSchoolAddress ? b.school_name : APP_NAME}</div>
              <div className="text-xs opacity-70">{APP_TAGLINE}</div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
        <div className="text-sm opacity-80">
          Need help?{" "}
          {SUPPORT_EMAIL ? (
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">Contact support</a>
          ) : (
            <span>ask your school administrator</span>
          )}
        </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <section className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          {/* Banner logo at the top of the sign-in box */}
          {b.banner_logo_url && (
            <div className="mb-5 flex justify-center">
              <img src={assetUrl(b.banner_logo_url)} alt="" className="max-h-20 max-w-full object-contain" />
            </div>
          )}
          {/* Sign-in page title and description */}
          <h1 className="text-center text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
          {b.sign_in_description ? (
            <p className="mb-6 mt-2 text-center text-sm text-gray-600 dark:text-gray-400">{b.sign_in_description}</p>
          ) : (
            <p className="mb-6 mt-2 text-center text-sm text-gray-500 dark:text-gray-400">Sign in with your email or username.</p>
          )}

          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email or username</label>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter email or username"
              className={input}
            />
          </div>

          {/* On a school's own address the school is already known, so no school code is asked for */}
          {!onSchoolAddress && (
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                School code <span className="font-normal text-gray-400">(optional: only if you have a login in more than one school)</span>
              </label>
              <input
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value)}
                placeholder="For example SCH-XXXXXX"
                className={input}
              />
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center justify-between text-sm">
              <label className="font-medium text-gray-700 dark:text-gray-300">Password</label>
              {b.show_self_service_reset && (
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="font-medium text-indigo-600 hover:underline dark:text-indigo-300"
                >
                  Forgot password?
                </button>
              )}
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

          {/* Sign-in page text */}
          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            {b.sign_in_text || (onSchoolAddress
              ? "Your school administrator creates your account and gives you your login."
              : `New to ${APP_NAME}? Your school administrator creates your account and gives you your login.`)}
          </p>
        </section>
      </main>

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

      {/* Footer: footer text and footer links */}
      <footer
        className="border-t border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800"
        style={b.header_background_color ? { backgroundColor: b.header_background_color, color: headerDark ? "#fff" : undefined } : undefined}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-4 text-sm sm:flex-row">
          <div>
            {b.footer_text || (onSchoolAddress ? (
              <>© {new Date().getFullYear()} <span className="font-medium">{b.school_name}</span>. All rights reserved.</>
            ) : (
              <>© {new Date().getFullYear()} <span className="font-medium">{APP_NAME}</span>. All rights reserved.</>
            ))}
          </div>
          {(b.footer_links || []).length > 0 && (
            <nav className="flex flex-wrap gap-4">
              {b.footer_links.map((link) => (
                <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="hover:underline">
                  {link.label}
                </a>
              ))}
            </nav>
          )}
        </div>
      </footer>
    </div>
  );
}
