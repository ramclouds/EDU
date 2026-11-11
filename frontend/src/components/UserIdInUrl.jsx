import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// The logged-in user's readable id (ADM-0001, STU0007, ...), saved at login.
export function getCurrentUserCode() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.user_code ? String(user.user_code) : "";
  } catch {
    return "";
  }
}

// Keeps the address bar as  /<dashboard>/<user id>  for the signed-in user.
// Cosmetic only: access is still decided by the login token, never by this id.
// If someone edits the id in the address, it is put back to their own.
export default function UserIdInUrl() {
  const location = useLocation();
  const navigate = useNavigate();
  const code = getCurrentUserCode();

  useEffect(() => {
    if (!code) return;
    // /<dashboard>[/<user id>][/<page>/<action>...]  ->  same path with this user's id
    const parts = location.pathname.split("/").filter(Boolean);
    if (!parts.length) return;
    const rest = parts.slice(2);
    const wanted = `/${parts[0]}/${encodeURIComponent(code)}${rest.length ? `/${rest.join("/")}` : ""}`;
    if (location.pathname !== wanted) {
      // keep location.state so dashboards still open on the section they were sent to
      navigate({ pathname: wanted, search: location.search }, { replace: true, state: location.state });
    }
  }, [code, location.pathname, location.search, location.state, navigate]);

  return null;
}
