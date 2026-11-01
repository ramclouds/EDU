import { useEffect, useState } from "react";
import Login from "./Login";
import SchoolNotFound from "./SchoolNotFound";
import { requestBranding } from "../controllers/Auth/useLoginBranding";

// The sign-in address. If the address belongs to no school, show "School not found" instead
// of a sign-in page that cannot work there.
export default function SignInEntry() {
  const [state, setState] = useState({ ready: false, notFound: null });

  useEffect(() => {
    let cancelled = false;
    requestBranding().then((data) => {
      if (cancelled) return;
      setState({ ready: true, notFound: data && data.notFound ? data : null });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state.ready) return null;
  if (state.notFound) return <SchoolNotFound message={state.notFound.message} address={state.notFound.address} />;
  return <Login />;
}
