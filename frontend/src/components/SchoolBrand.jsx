import { useEffect, useState } from "react";
import { refreshSchoolProfileOnce, schoolDisplayName, schoolLogoSrc, subscribeSchoolProfile } from "../lib/schoolProfile";

export function SchoolName({ className = "" }) {
  const [name, setName] = useState(schoolDisplayName());
  useEffect(() => {
    const unsubscribe = subscribeSchoolProfile(() => setName(schoolDisplayName()));
    refreshSchoolProfileOnce();
    return unsubscribe;
  }, []);
  return (
    <span className={`inline-block max-w-full truncate align-bottom ${className}`} title={name}>
      {name}
    </span>
  );
}

export function SchoolLogo({ className = "", title = "" }) {
  const [src, setSrc] = useState(schoolLogoSrc());
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const unsubscribe = subscribeSchoolProfile(() => {
      setSrc(schoolLogoSrc());
      setFailed(false);
    });
    return unsubscribe;
  }, []);
  if (!src || failed) return <i className={className} title={title} aria-hidden="true" />;
  return (
    <img
      src={src}
      alt={schoolDisplayName()}
      title={title}
      onError={() => setFailed(true)}
      className="h-8 w-8 shrink-0 rounded-md object-contain"
    />
  );
}
