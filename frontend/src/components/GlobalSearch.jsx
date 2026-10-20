import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { BASE_URL } from "../config/appConfig";

// Header search used by every dashboard

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

// Which dashboard section each kind of result opens, in order of preference.
const TARGET_SECTIONS = {
  student: ["students", "student-roster", "student-enrolment", "enrolment", "roster", "student-profiles"],
  teacher: ["teachers", "teacher-management", "teacher-roster", "staff"],
  staff: ["staff", "staff-directory", "teachers"],
  book: ["books", "book-catalog", "catalogue", "library", "issued-books"],
  asset: ["assets", "asset-register"],
  notice: ["notices", "announcements", "notifications"],
  event: ["events", "calendar"],
};

const card = "absolute left-0 right-0 top-full z-[90] mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-2 text-sm shadow-xl dark:border-slate-700 dark:bg-slate-800";

export default function GlobalSearch({ sections = [], onNavigate }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [groups, setGroups] = useState([]);
  const [active, setActive] = useState(-1);
  const rootRef = useRef(null);
  const requestId = useRef(0);

  const term = query.trim();
  const available = useMemo(() => new Set(sections.map((s) => s.key)), [sections]);

  // Dashboard sections whose name matches the text.
  const sectionHits = useMemo(() => {
    if (term.length < MIN_CHARS) return [];
    const t = term.toLowerCase();
    return sections.filter((s) => s.label.toLowerCase().includes(t)).slice(0, 5)
      .map((s) => ({ kind: "section", key: s.key, title: s.label, subtitle: "Open section" }));
  }, [term, sections]);

  // Server search, debounced, with stale responses ignored.
  useEffect(() => {
    if (term.length < MIN_CHARS) {
      setGroups([]);
      setError("");
      setLoading(false);
      return undefined;
    }
    const id = ++requestId.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(term)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const body = await res.json().catch(() => ({}));
        if (id !== requestId.current) return;
        if (!res.ok) {
          setError(body.error || "Search failed. Please try again.");
          setGroups([]);
        } else {
          setError("");
          setGroups(body.groups || []);
        }
      } catch {
        if (id === requestId.current) setError("Could not reach the server.");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  // Close when clicking outside.
  useEffect(() => {
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Flat list used for keyboard navigation.
  const flat = useMemo(() => {
    const items = [...sectionHits];
    groups.forEach((g) =>
      g.items.forEach((it) => items.push({ kind: g.type, ...it, group: g.label })));
    return items;
  }, [sectionHits, groups]);

  useEffect(() => setActive(-1), [term]);

  const choose = (item) => {
    let key = null;
    if (item.kind === "section") {
      key = item.key;
    } else {
      key = (TARGET_SECTIONS[item.kind] || []).find((k) => available.has(k)) || null;
    }
    setOpen(false);
    if (key) {
      onNavigate(key);
      setQuery("");
    } else {
      toast(`Open the ${item.group || "matching"} section to see this record.`);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      e.currentTarget.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && open && flat.length) {
      e.preventDefault();
      choose(flat[active >= 0 ? active : 0]);
    }
  };

  const showPanel = open && term.length >= MIN_CHARS;
  let index = -1;

  return (
    <>
      <input
        type="search"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={showPanel}
        aria-label="Search the school"
        autoComplete="off"
        className="w-full rounded-full border border-gray-200 bg-white/70 py-2.5 pl-10 pr-4 text-sm text-gray-800 shadow-sm outline-none backdrop-blur-md transition-all duration-300 placeholder:text-gray-400 hover:shadow-md focus:bg-white focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700/70 dark:text-white dark:placeholder:text-gray-400 dark:focus:bg-slate-700"
        placeholder="Search students, teachers, books, notices…"
      />
      {showPanel && (
        <div ref={rootRef} className={card} role="listbox">
          {loading && <p className="px-3 py-2 text-gray-400">Searching…</p>}
          {error && <p className="px-3 py-2 text-red-500">{error}</p>}
          {!loading && !error && flat.length === 0 && (
            <p className="px-3 py-2 text-gray-400">No results for “{term}”.</p>
          )}
          {sectionHits.length > 0 && <Heading>Go to</Heading>}
          {sectionHits.map((it) => {
            index += 1;
            return <Row key={`s-${it.key}`} item={it} active={active === index} onPick={() => choose(it)} />;
          })}
          {groups.map((g) => (
            <div key={g.type}>
              <Heading>{g.label}</Heading>
              {g.items.map((it) => {
                index += 1;
                const i = index;
                return <Row key={`${g.type}-${it.id}`} item={{ ...it, kind: g.type, group: g.label }} active={active === i} onPick={() => choose({ ...it, kind: g.type, group: g.label })} />;
              })}
            </div>
          ))}
          {!loading && !error && term.length >= MIN_CHARS && (
            <p className="border-t border-gray-100 px-3 pt-2 text-xs text-gray-400 dark:border-slate-700">
              Results only include what your role may see.
            </p>
          )}
        </div>
      )}
    </>
  );
}

function Heading({ children }) {
  return <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{children}</p>;
}

function Row({ item, active, onPick }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPick}
      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left ${active ? "bg-indigo-50 dark:bg-slate-700" : "hover:bg-gray-50 dark:hover:bg-slate-700/60"}`}
    >
      <span className="min-w-0">
        <span className="block truncate font-medium text-gray-800 dark:text-gray-100">{item.title}</span>
        {item.subtitle && <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{item.subtitle}</span>}
      </span>
    </button>
  );
}
