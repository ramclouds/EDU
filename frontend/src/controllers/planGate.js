import toast from "react-hot-toast";

// When the server blocks a dashboard because the school's plan does not include it,
// the response has status 402. Show its upgrade message on any page, so no page has to
// handle it separately.
let installed = false;

export function installPlanNotice() {
  if (installed || typeof window === "undefined" || !window.fetch) return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await original(...args);
    if (response.status === 402) {
      try {
        const body = await response.clone().json();
        if (body?.error_code === "PLAN_UPGRADE_REQUIRED") {
          toast.error(body.error, { id: `plan-${body.dashboard}`, duration: 7000 });
        }
      } catch {
        // not JSON: nothing to show
      }
    }
    return response;
  };
}
