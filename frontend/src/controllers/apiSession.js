import { BASE_URL, FILE_BASE_URL } from "../config/appConfig";

// Browser sessions use an HttpOnly cookie that page scripts cannot read. This module:
//  * sends the cookie with every request to our API (credentials: "include");
//  * adds the CSRF header to every change (POST, PUT, PATCH, DELETE);
//  * never sends a bearer token from the page;
//  * signs the person out when the session has expired.
// localStorage keeps only "signed in" flags, never a credential.

const SAFE = ["GET", "HEAD", "OPTIONS"];

function cookieValue(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function isOurApi(url) {
  try {
    const target = new URL(url, window.location.href);
    const api = new URL(FILE_BASE_URL || BASE_URL, window.location.href);
    return target.origin === window.location.origin || target.origin === api.origin;
  } catch {
    return false;
  }
}

export function installApiSession() {
  if (typeof window === "undefined" || !window.fetch || window.__apiSessionInstalled) return;
  window.__apiSessionInstalled = true;

  // Credentials from older versions of the app are no longer used.
  localStorage.removeItem("token");
  localStorage.removeItem("dev_token");

  const original = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url;
    if (!isOurApi(url)) return original(input, init);

    const headers = new Headers(init.headers || (typeof input !== "string" && input.headers) || {});
    headers.delete("Authorization");

    const method = String(init.method || (typeof input !== "string" && input.method) || "GET").toUpperCase();
    if (!SAFE.includes(method)) {
      const csrf = cookieValue("edu_csrf");
      if (csrf) headers.set("X-CSRF-Token", csrf);
      const devCsrf = cookieValue("edu_dev_csrf");
      if (devCsrf) headers.set("X-Dev-CSRF-Token", devCsrf);
    }

    const response = await original(input, { ...init, headers, credentials: "include" });

    const isLogin = /\/login$/.test(url);
    if (response.status === 401 && !isLogin) {
      const isDeveloper = url.includes("/developer/");
      if (isDeveloper) localStorage.removeItem("dev_signed_in");
      else localStorage.removeItem("signed_in");
      const path = window.location.pathname;
      if (!["/", "/Login", "/developer/login"].includes(path)) {
        window.location.assign(isDeveloper ? "/developer/login" : "/");
      }
    }
    return response;
  };
}
