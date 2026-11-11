import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getCurrentUserCode } from "../components/UserIdInUrl";

const SECTION_RE = /^[a-z0-9-]{1,60}$/;

// The current section goes into the address as a short token, so the address shows
// where the user is:  /<dashboard>/<user id>/<token>
// The token is encoded (base64url), not secret: section names are not sensitive, and
// a browser cannot keep a real secret. Anything that does not decode to a known-looking
// section name is ignored.
function encodeSection(section) {
  const bytes = new TextEncoder().encode(section);
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeSection(token) {
  try {
    const base64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const section = new TextDecoder().decode(bytes);
    return SECTION_RE.test(section) ? section : null;
  } catch {
    return null;
  }
}

export function useSectionInUrl(activeSection, setActiveSection) {
  const location = useLocation();
  const navigate = useNavigate();
  const parts = location.pathname.split("/").filter(Boolean);
  const token = parts[2] || "";
  const fromUrl = token ? decodeSection(token) : null;

  // address -> page (first load, back and forward buttons)
  useEffect(() => {
    if (fromUrl && fromUrl !== activeSection) setActiveSection(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // page -> address
  useEffect(() => {
    const code = parts[1] || getCurrentUserCode();
    if (!parts[0] || !code) return; // wait until the user id is known
    const wanted = encodeSection(activeSection || "dashboard");
    if (token === wanted) return;
    navigate(`/${parts[0]}/${code}/${wanted}`, { replace: true, state: location.state });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, parts[0], parts[1]]);
}
