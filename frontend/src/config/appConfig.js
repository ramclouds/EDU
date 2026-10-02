export const APP_NAME = "School ABC";
export const APP_TAGLINE = "School Management System";
export const APP_YEAR = "2025";
export const APP_FAVICON = "/graduation.png";

// Was hardcoded to http://localhost:5000 — meaning every dashboard, every
// API call, and every uploaded-file link would have pointed at localhost
// even in a production build. Now reads from the build-time env var
// (see .env.example) and falls back to localhost only for local dev.
const API_ROOT =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const BASE_URL = `${API_ROOT}/api`;
export const FILE_BASE_URL = API_ROOT;