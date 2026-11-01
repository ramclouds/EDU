import { useEffect, useState } from "react";
import { APP_FAVICON, APP_NAME, FILE_BASE_URL } from "../../config/appConfig";

// The sign-in page's look, read once per page load. The request is shared: the entry check
// and the sign-in page use the same answer, so the server is asked only once.
//   * a school's own settings          -> the look of that school
//   * no school at this address        -> { notFound: true, ... }
//   * anything else (network, server)  -> null: the platform's default look
let brandingRequest = null;

export function requestBranding() {
  if (!brandingRequest) {
    brandingRequest = fetch(`${FILE_BASE_URL}/api/public/branding`)
      .then(async (r) => {
        if (r.ok) return r.json();
        const body = await r.json().catch(() => ({}));
        if (r.status === 404 && body.error_code === "SCHOOL_NOT_FOUND") {
          return { notFound: true, message: body.error, address: body.address };
        }
        return null;
      })
      .catch(() => null);
  }
  return brandingRequest;
}

export function useLoginBranding() {
  const [branding, setBranding] = useState(null);

  useEffect(() => {
    let cancelled = false;
    requestBranding().then((data) => {
      if (!cancelled) setBranding(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Browser tab: title and favicon
  useEffect(() => {
    const title = branding?.scoped
      ? `${branding.sign_in_title || branding.school_name} · Sign in`
      : `${APP_NAME} · Sign in`;
    document.title = title;

    const href = branding?.favicon_url ? `${FILE_BASE_URL}${branding.favicon_url}` : APP_FAVICON;
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [branding]);

  return branding;
}

export function assetUrl(path) {
  if (!path) return null;
  return path.startsWith("http") ? path : `${FILE_BASE_URL}${path}`;
}

export function isDarkColor(hex) {
  if (!hex || !/^#?[0-9a-f]{6}$/i.test(hex)) return false;
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) < 140;
}
