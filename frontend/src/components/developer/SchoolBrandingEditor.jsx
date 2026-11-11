import { useEffect, useState } from "react";

const input = "mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100";
const btn = "rounded-lg border px-3 py-1.5 text-xs font-medium dark:border-slate-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50";
const primary = "rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:opacity-90 disabled:opacity-50";

// Each image the platform owner can set, with the size it should be and what it is used for.
const IMAGES = [
  { kind: "favicon", label: "Favicon", hint: "Small icon on the browser tab. PNG, ICO or WEBP, up to 512 KB. Square, about 64 × 64 px." },
  { kind: "header_logo", label: "Header logo", hint: "Upper-left corner of the sign-in page. PNG, JPEG or WEBP, up to 2 MB." },
  { kind: "banner_logo", label: "Banner logo", hint: "Top of the sign-in box. PNG, JPEG or WEBP, up to 2 MB." },
  { kind: "background_image", label: "Background image", hint: "Fills the whole page behind the sign-in box. PNG, JPEG or WEBP, up to 5 MB." },
];

const COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function ColorField({ label, value, onChange, hint }) {
  const valid = !value || COLOR_RE.test(value);
  return (
    <label className="text-sm font-medium">
      {label}
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={COLOR_RE.test(value || "") && value.length === 7 ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border dark:border-slate-600"
          aria-label={label}
        />
        <input className={`${input} mt-0`} value={value || ""} placeholder="#1e3a8a" onChange={(e) => onChange(e.target.value)} />
        {value && (
          <button type="button" className={btn} onClick={() => onChange("")}>Clear</button>
        )}
      </div>
      {!valid ? <span className="mt-1 block text-xs text-red-600">Use a colour such as #1e3a8a.</span> : <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
    </label>
  );
}

// Sign-in page look for one school. Only the fields the sign-in page needs are editable.
export default function SchoolBrandingEditor({ schoolId, schoolName, api }) {
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);
  const [previewBust, setPreviewBust] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api.loadBranding(schoolId).then((b) => {
      if (cancelled || !b) return;
      setSaved(b);
      setDraft({
        header_background_color: b.header_background_color || "",
        page_background_color: b.page_background_color || "",
        sign_in_title: b.sign_in_title || "",
        sign_in_description: b.sign_in_description || "",
        sign_in_text: b.sign_in_text || "",
        footer_text: b.footer_text || "",
        footer_links: b.footer_links || [],
        show_self_service_reset: !!b.show_self_service_reset,
      });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  if (!draft) return <p className="text-xs text-gray-400">Loading sign-in page settings…</p>;

  const set = (field) => (value) => setDraft((d) => ({ ...d, [field]: value }));
  const text = (field) => (e) => set(field)(e.target.value);

  const colorsValid = [draft.header_background_color, draft.page_background_color]
    .every((c) => !c || COLOR_RE.test(c));
  const linksValid = draft.footer_links.every(
    (l) => l.label.trim() && /^(https?:\/\/\S+|mailto:\S+@\S+\.\S+)$/i.test(l.url.trim()),
  );

  const save = async () => {
    setBusy(true);
    const payload = {
      ...draft,
      footer_links: draft.footer_links.map((l) => ({ label: l.label.trim(), url: l.url.trim() })),
    };
    const result = await api.saveBranding(schoolId, payload);
    setBusy(false);
    if (result) setSaved(result);
  };

  const upload = async (kind, file) => {
    if (!file) return;
    setBusy(true);
    const result = await api.uploadBrandingImage(schoolId, kind, file);
    setBusy(false);
    if (result) {
      setSaved(result);
      setPreviewBust((n) => n + 1);
    }
  };

  const removeImage = async (kind) => {
    setBusy(true);
    const result = await api.removeBrandingImage(schoolId, kind);
    setBusy(false);
    if (result) {
      setSaved(result);
      setPreviewBust((n) => n + 1);
    }
  };

  const addLink = () => {
    if (draft.footer_links.length >= 5) return;
    set("footer_links")([...draft.footer_links, { label: "", url: "" }]);
  };
  const updateLink = (i, field, value) =>
    set("footer_links")(draft.footer_links.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  const removeLink = (i) => set("footer_links")(draft.footer_links.filter((_, idx) => idx !== i));

  // Preview: the school's own sign-in page (opens on its address once the domain is live)
  const previewUrl = saved?.login_url || null;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Sign-in page</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            What {schoolName}&apos;s users see before they sign in. Saved changes show up on its sign-in page within a minute.
          </p>
        </div>
        {previewUrl && (
          <a href={previewUrl} target="_blank" rel="noreferrer" className={btn}>Open sign-in page</a>
        )}
      </div>

      {/* Images */}
      <div className="grid gap-3 sm:grid-cols-2">
        {IMAGES.map(({ kind, label, hint }) => {
          const hasImage = !!saved?.assets?.[kind];
          const src = hasImage && saved?.login_url
            ? `${saved.login_url.replace(/\/Login$/, "")}/api/public/branding/asset/${kind}?v=${saved.version}&p=${previewBust}`
            : null;
          return (
            <div key={kind} className="rounded-xl border border-gray-100 p-3 dark:border-slate-700">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{label}</p>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-24 items-center justify-center overflow-hidden rounded-lg bg-gray-50 dark:bg-slate-900">
                  {src ? <img src={src} alt="" className="max-h-14 max-w-full object-contain" /> : <span className="text-xs text-gray-400">None</span>}
                </div>
                <label className={`${btn} cursor-pointer`}>
                  {hasImage ? "Replace" : "Upload"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon"
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => { upload(kind, e.target.files?.[0]); e.target.value = ""; }}
                  />
                </label>
                {hasImage && <button type="button" disabled={busy} className={btn} onClick={() => removeImage(kind)}>Remove</button>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Colours */}
      <div className="grid gap-3 sm:grid-cols-2">
        <ColorField label="Header colour" value={draft.header_background_color} onChange={set("header_background_color")} hint="Behind the header across the top." />
        <ColorField label="Page background colour" value={draft.page_background_color} onChange={set("page_background_color")} hint="Behind the sign-in box, when there is no background image." />
      </div>

      {/* Text */}
      <div className="grid gap-3">
        <label className="text-sm font-medium">Sign-in page title
          <input className={input} maxLength={120} value={draft.sign_in_title} onChange={text("sign_in_title")} placeholder={schoolName} />
        </label>
        <label className="text-sm font-medium">Sign-in page description
          <textarea className={input} rows={2} maxLength={400} value={draft.sign_in_description} onChange={text("sign_in_description")} />
        </label>
        <label className="text-sm font-medium">Sign-in page text (below the button)
          <textarea className={input} rows={2} maxLength={400} value={draft.sign_in_text} onChange={text("sign_in_text")} />
        </label>
      </div>

      {/* Footer */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Footer text
          <input className={input} maxLength={200} value={draft.footer_text} onChange={text("footer_text")} />
        </label>
        <p className="text-sm font-medium">Footer links <span className="font-normal text-gray-400">(up to 5)</span></p>
        {draft.footer_links.map((link, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <input className={`${input} mt-0 sm:w-40`} placeholder="Label" maxLength={40} value={link.label} onChange={(e) => updateLink(i, "label", e.target.value)} />
            <input className={`${input} mt-0 min-w-0 flex-1`} placeholder="https://… or mailto:…" maxLength={300} value={link.url} onChange={(e) => updateLink(i, "url", e.target.value)} />
            <button type="button" className={btn} onClick={() => removeLink(i)}>Remove</button>
          </div>
        ))}
        {draft.footer_links.length < 5 && <button type="button" className={btn} onClick={addLink}>Add footer link</button>}
      </div>

      {/* Self-service password reset */}
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={draft.show_self_service_reset}
          onChange={(e) => set("show_self_service_reset")(e.target.checked)}
        />
        <span>
          Show &ldquo;Forgot password?&rdquo; on the sign-in page
          <span className="block text-xs text-gray-500 dark:text-gray-400">
            Turn this on only when password reset is set up for the school.
          </span>
        </span>
      </label>

      <div className="flex justify-end">
        <button type="button" disabled={busy || !colorsValid || !linksValid} onClick={save} className={primary}>
          {busy ? "Saving…" : "Save sign-in page"}
        </button>
      </div>
    </section>
  );
}
