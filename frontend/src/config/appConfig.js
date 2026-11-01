export const APP_NAME = "Ramclouds LLP";
export const APP_TAGLINE = "School Management System";
export const APP_YEAR = "2026";
export const APP_FAVICON = "/graduation.png";
// Shown on the login page; leave blank to hide the mailto link.
export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || "";

// ---- Where is the API? ----------------------------------------------------
// One build serves every school. The API address is worked out from the address
// the app is opened on (set VITE_TENANT_BASE_DOMAIN, for example example.com):
//   https://apec.login.example.com  ->  https://apec.api.example.com
//   https://login.example.com       ->  https://api.example.com   (common login page)
//   https://portal.theirschool.edu  ->  the same address (a verified custom domain;
//                                       the web server forwards /y26 to the API)
// VITE_API_BASE_URL, if set, overrides all of this (local development).
// VITE_API_VERSION (for example y26) puts the version in every API address:
//   https://apec.api.example.com/y26/rbac/my-access
const TENANT_BASE_DOMAIN = (import.meta.env.VITE_TENANT_BASE_DOMAIN || "")
  .trim().toLowerCase().replace(/^\.+|\.+$/g, "");
const URL_SCHEME = (import.meta.env.VITE_TENANT_URL_SCHEME || "https").trim().toLowerCase();
const API_VERSION = (import.meta.env.VITE_API_VERSION || "").trim().toLowerCase();

const escapeRegExp = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function apiRootFromAddress() {
  if (!TENANT_BASE_DOMAIN || typeof window === "undefined") return null;
  const host = window.location.hostname.toLowerCase();
  // plain localhost and IP addresses (local development): use the default backend
  if (host === "localhost" || /^[0-9.]+$/.test(host)) return null;
  const base = escapeRegExp(TENANT_BASE_DOMAIN);

  // Single address per school: https://<tenant id>.<domain>/Login  (app and API together)
  const single = host.match(new RegExp(`^([a-z][a-z0-9-]{1,38})\\.${base}$`));
  const RESERVED = ["login", "api", "www", "app", "admin", "developer"];
  if (single && !RESERVED.includes(single[1])) return window.location.origin;

  // Earlier two-address style, still understood: <tenant>.login.<domain> -> <tenant>.api.<domain>
  const school = host.match(new RegExp(`^([a-z][a-z0-9-]{1,38})\\.login\\.${base}$`));
  if (school) return `${URL_SCHEME}://${school[1]}.api.${TENANT_BASE_DOMAIN}`;

  if (host === `login.${TENANT_BASE_DOMAIN}` || host === TENANT_BASE_DOMAIN) {
    return `${URL_SCHEME}://api.${TENANT_BASE_DOMAIN}`;
  }

  const isLocal = host === "localhost" || /^[0-9.]+$/.test(host);
  const underBase = host.endsWith(`.${TENANT_BASE_DOMAIN}`);
  if (!isLocal && !underBase) return window.location.origin; // a school's custom domain
  return null;
}

const API_ROOT =
  import.meta.env.VITE_API_BASE_URL || apiRootFromAddress() || "http://localhost:5000";

export const BASE_URL = API_VERSION ? `${API_ROOT}/${API_VERSION}` : `${API_ROOT}/api`;
export const FILE_BASE_URL = API_ROOT;