export const APP_NAME = "Ramclouds LLP";
export const APP_TAGLINE = "School Management System";
export const APP_YEAR = "2026";
export const APP_FAVICON = "/graduation.png";
// Shown on the login page; leave blank to hide the mailto link.
export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || "";

// Was hardcoded to http://localhost:5000 — meaning every dashboard, ever
const API_ROOT =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const BASE_URL = `${API_ROOT}/api`;
export const FILE_BASE_URL = API_ROOT;