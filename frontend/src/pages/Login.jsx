import { Link } from "react-router-dom";
import { useLogin } from "../controllers/Auth/useLogin";
import { APP_NAME, APP_TAGLINE, APP_YEAR } from "../config/appConfig";

export default function Login() {
  const {
    identifier,
    setIdentifier,

    password,
    setPassword,

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
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* NAVBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-center px-4 sm:px-8 py-4 bg-white border-b gap-3 sm:gap-0">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 text-white p-2 rounded-lg">
            <i className="bi bi-book"></i>
          </div>

          <div>
            <div className="font-semibold text-gray-800 text-lg sm:text-base">
              {APP_NAME}
            </div>
            <div className="text-xs text-gray-500">{APP_TAGLINE}</div>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          Need help?{" "}
          <span className="text-purple-600 cursor-pointer">Support</span>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex flex-1 items-center justify-center px-4 sm:px-6 py-10">
        <div className="flex flex-col lg:flex-row items-center gap-10 max-w-6xl w-full">
          {/* LEFT PANEL */}
          <div className="flex-1 bg-gradient-to-br from-purple-50 via-white to-blue-50 p-10 rounded-3xl hidden lg:block">
            <h1 className="text-4xl font-bold text-gray-900 leading-tight">
              Welcome to <br />
              <span className="text-purple-600">{APP_NAME}</span>
            </h1>

            <p className="text-gray-600 mt-6 max-w-md">
              Streamline your school operations with our comprehensive
              management platform.
            </p>

            <div className="mt-10 space-y-6">
              <Feature
                icon="bi-people-fill"
                title="Student Management"
                desc="Track attendance, grades and academic progress effortlessly."
              />

              <Feature
                icon="bi-easel-fill"
                title="Teacher Portal"
                desc="Manage classes, assignments and communication."
              />

              <Feature
                icon="bi-bar-chart-fill"
                title="Analytics & Reports"
                desc="Powerful insights with detailed performance reports."
              />
            </div>
          </div>

          {/* LOGIN CARD */}
          <div className="w-full sm:max-w-md bg-white p-8 rounded-2xl shadow-xl border">
            <h2 className="text-2xl font-semibold text-center">Sign In</h2>

            <p className="text-sm text-gray-500 text-center mt-2 mb-6">
              Sign in to continue to your portal
            </p>

            {/* EMAIL OR USERNAME */}
            <div className="mb-4">
              <label className="text-sm font-medium">Email</label>

              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter email"
                className="w-full mt-1 px-3 py-2 border rounded-lg bg-gray-50"
              />
            </div>

            {/* PASSWORD */}
            <div className="mb-4">
              <div className="flex justify-between text-sm">
                <label className="font-medium">Password</label>

                <span
                  onClick={() => setShowForgotModal(true)}
                  className="text-purple-600 cursor-pointer hover:underline"
                >
                  Forgot Password?
                </span>
              </div>

              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                />

                <span
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <i className="bi bi-eye-slash-fill"></i>
                  ) : (
                    <i className="bi bi-eye-fill"></i>
                  )}
                </span>
              </div>
            </div>

            {/* LOGIN BUTTON */}
            <button
              onClick={login}
              disabled={loading}
              className="w-full py-2 rounded-lg text-white font-medium bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 transition disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <div className="text-sm text-center mt-6 text-gray-600">
              New to {APP_NAME}?{" "}
              <Link
                to="/signup"
                className="text-purple-600 font-medium hover:underline"
              >
                Request Access
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-3 right-3 text-gray-400"
            >
              ✕
            </button>

            <h3 className="text-xl font-semibold mb-2">Forgot Password</h3>

            <p className="text-sm text-gray-500 mb-4">
              Enter your email to receive reset link
            </p>

            <input
              type="email"
              placeholder="Enter your email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-gray-50 mb-4"
            />

            <button
              onClick={handleForgotPassword}
              className="w-full py-2 rounded-lg text-white font-medium bg-gradient-to-r from-purple-600 to-indigo-600"
            >
              Send Reset Link
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-white border-t">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center text-sm text-gray-600">
          <div>
            © {APP_YEAR} <span className="font-medium">{APP_NAME}</span>. All
            Rights Reserved
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div className="flex items-start gap-4">
      <div className="bg-purple-100 text-purple-600 p-3 rounded-lg">
        <i className={`bi ${icon}`}></i>
      </div>

      <div>
        <div className="font-semibold text-gray-800">{title}</div>

        <div className="text-sm text-gray-500">{desc}</div>
      </div>
    </div>
  );
}
