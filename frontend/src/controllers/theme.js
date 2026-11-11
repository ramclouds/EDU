import { useEffect, useReducer } from "react";
import { BASE_URL } from "../config/appConfig";

// One theme for the app: "light", "dark" or "system" (follows the device).
//  * A choice is saved to the signed-in person's account, so it follows them to any device.
//  * It is loaded when they sign in. Another person on the same browser gets their own.
//  * Sign-in pages always use the light theme, and the cached choice is cleared at sign-out.
// The `dark` class on <html> drives every dark: style.
const CACHE_KEY = "theme";
const VALUES = ["light", "dark", "system"];
const listeners = new Set();
const media = typeof window !== "undefined" && window.matchMedia
  ? window.matchMedia("(prefers-color-scheme: dark)")
  : null;

const readCache = () => {
  try {
    const v = localStorage.getItem(CACHE_KEY);
    return VALUES.includes(v) ? v : "system";
  } catch {
    return "system";
  }
};

let preference = readCache();
let override = null; // "light" on sign-in pages, otherwise null

function resolvedTheme(pref = preference) {
  const chosen = override || pref;
  if (chosen === "system") return media && media.matches ? "dark" : "light";
  return chosen;
}

function apply() {
  const resolved = resolvedTheme();
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

function notify() {
  listeners.forEach((fn) => fn());
}

// Local only: changes this page, does not save anywhere.
function applyLocal(next) {
  if (!VALUES.includes(next)) return;
  preference = next;
  try {
    localStorage.setItem(CACHE_KEY, next);
  } catch {
    // storage unavailable: the choice lasts for this page only
  }
  apply();
  notify();
}

// The signed-in account, if any.
function activeAccount() {
  const dev = localStorage.getItem("dev_signed_in");
  if (dev) return { token: dev, url: `${BASE_URL}/developer/me/preferences` };
  const token = localStorage.getItem("signed_in");
  if (token) return { token, url: `${BASE_URL}/me/preferences` };
  return null;
}

async function saveRemote(next) {
  const account = activeAccount();
  if (!account) return;
  try {
    await fetch(account.url, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${account.token}` },
      body: JSON.stringify({ theme: next }),
    });
  } catch {
    // offline: this device keeps the choice; it is sent again the next time it is changed
  }
}

// A choice made by the person: shown now and saved to their account.
function chooseTheme(next) {
  if (!VALUES.includes(next)) return;
  applyLocal(next);
  saveRemote(next);
}

// Flip between light and dark (the sun/moon button).
export function toggleTheme() {
  chooseTheme(resolvedTheme() === "dark" ? "light" : "dark");
}

// Sign-in pages stay light; signed-in pages follow the person's choice.
export function setThemeOverride(value) {
  override = value;
  apply();
  notify();
}

// Load the signed-in person's saved theme. Runs once per sign-in.
let syncedFor = null;
export async function syncThemeFromServer() {
  const account = activeAccount();
  if (!account) {
    syncedFor = null;
    return;
  }
  if (syncedFor === account.token) return;
  syncedFor = account.token;
  try {
    const response = await fetch(account.url, {
      headers: { Authorization: `Bearer ${account.token}` },
    });
    if (!response.ok) return;
    const data = await response.json();
    applyLocal(VALUES.includes(data.theme) ? data.theme : "light");
  } catch {
    // keep the cached choice if the server cannot be reached
  }
}

// Forget the cached choice (used at sign-out).
export function clearThemeCache() {
  syncedFor = null;
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
  preference = "system";
  apply();
  notify();
}

// Call once, before the first render, so the page never flashes the wrong theme.
export function initTheme() {
  apply();
  if (media && media.addEventListener) {
    media.addEventListener("change", () => {
      apply();
      notify();
    });
  }
}

function subscribeTheme(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Components re-render when the theme changes. setTheme saves the choice.
export function useTheme() {
  const [, rerender] = useReducer((n) => n + 1, 0);
  useEffect(() => subscribeTheme(rerender), []);
  const resolved = resolvedTheme();
  return {
    preference,
    resolved,
    isDark: resolved === "dark",
    setTheme: chooseTheme,
    toggle: toggleTheme,
  };
}
