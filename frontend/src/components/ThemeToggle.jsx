import { useTheme } from "../controllers/theme";

// Sun/moon button. Works on every page; the choice is shared across the whole app.
export default function ThemeToggle({ className = "" }) {
  const { isDark, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-slate-700 ${className}`}
    >
      <i className={isDark ? "bi bi-sun-fill" : "bi bi-moon-stars-fill"} />
    </button>
  );
}
