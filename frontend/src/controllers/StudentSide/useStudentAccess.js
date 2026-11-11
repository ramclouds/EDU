import { useEffect, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

// Which optional sections this student uses. The Hostel and Library menu items are shown
// only to students who have a hostel room or are library members.
// Until the answer arrives, both stay hidden, so nothing flashes on screen.
export function useStudentAccess() {
  const [hostelAllocated, setHostelAllocated] = useState(false);
  const [libraryMember, setLibraryMember] = useState(false);
  let userId = null;
  try {
    userId = JSON.parse(localStorage.getItem("user") || "{}").id || null;
  } catch {
    userId = null;
  }

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;

    const load = async () => {
      try {
        const [hostelRes, profileRes] = await Promise.all([
          fetch(`${BASE_URL}/student/${userId}/hostel`),
          fetch(`${BASE_URL}/student/${userId}`),
        ]);
        const hostel = hostelRes.ok ? await hostelRes.json() : null;
        const profile = profileRes.ok ? await profileRes.json() : null;
        if (cancelled) return;
        setHostelAllocated(Boolean(hostel?.data?.room_number));
        setLibraryMember(Boolean(profile?.library_member));
      } catch {
        // keep both hidden if the server cannot be reached
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { hostelAllocated, libraryMember };
}
