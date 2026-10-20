import { APP_NAME, BASE_URL, FILE_BASE_URL } from "../config/appConfig";

const KEY = "school_profile";
const CHANGED = "school-profile-changed";
let refreshed = false;

export function getSchoolProfile() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

export function setSchoolProfile(profile) {
  if (profile) localStorage.setItem(KEY, JSON.stringify(profile));
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(CHANGED));
}

export function schoolDisplayName() {
  return getSchoolProfile()?.name || APP_NAME;
}

export function schoolLogoSrc() {
  const logo = getSchoolProfile()?.logo_url;
  return logo ? `${FILE_BASE_URL}${logo}` : null;
}

export function subscribeSchoolProfile(callback) {
  window.addEventListener(CHANGED, callback);
  return () => window.removeEventListener(CHANGED, callback);
}

export async function refreshSchoolProfileOnce() {
  if (refreshed) return;
  refreshed = true;
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch(`${BASE_URL}/school/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const body = await res.json();
    if (body.school) setSchoolProfile(body.school);
  } catch {
    // keep the cached details if the server is unreachable
  }
}
