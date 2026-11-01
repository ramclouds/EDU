import { useEffect, useState } from "react";

// The signed-in person's photo, or their initials when they have not added one.
// Updates straight away when the photo changes (see ProfileModal).
const PHOTO_EVENT = "profile-photo-changed";

function storedUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}") || {};
  } catch {
    return {};
  }
}

export function notifyPhotoChanged() {
  window.dispatchEvent(new Event(PHOTO_EVENT));
}

// name: show another person's initials (used for students on the staff screens).
export default function UserAvatar({ className = "w-9 h-9", name = null }) {
  const [user, setUser] = useState(storedUser);

  useEffect(() => {
    const refresh = () => setUser(storedUser());
    window.addEventListener(PHOTO_EVENT, refresh);
    return () => window.removeEventListener(PHOTO_EVENT, refresh);
  }, []);

  // Initials from the name given, or from the signed-in person's own first and last name.
  const words = (name ? String(name) : `${user.first_name || ""} ${user.last_name || ""}`)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const initials =
    words.length > 1
      ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
      : (words[0]?.[0] || "U").toUpperCase();
  // Another person's photo is not shown here: only the signed-in person's own photo is known.
  const src = name ? null : user.profile_image || null;

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`rounded-full object-cover border-2 border-white dark:border-slate-600 shadow ${className}`}
      />
    );
  }
  return (
    <span
      aria-label="Your initials"
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-xs border-2 border-white dark:border-slate-600 shadow ${className}`}
    >
      {initials}
    </span>
  );
}
