import { useEffect, useState } from "react";
import { BASE_URL } from "../../config/appConfig";

export function useStudentHostel(
    fetchWithAuth,
    activeSection,
    showToast
) {
    const [hostel, setHostel] = useState(null);

    const [hostelLoading, setHostelLoading] = useState(false);

    const [complaintText, setComplaintText] = useState("");

    // ================= GET USER =================
    const getUser = () => {
        try {
            const user = JSON.parse(localStorage.getItem("user"));
            return user || null;
        } catch (error) {
            console.error("Failed to parse user:", error);
            return null;
        }
    };

    // ================= FETCH HOSTEL =================
    useEffect(() => {
        if (activeSection !== "studhostel") return;

        const user = getUser();

        if (!user?.id) {
            showToast("User not found", "error");
            return;
        }

        const fetchHostel = async () => {
            try {
                setHostelLoading(true);

                const res = await fetchWithAuth(
                    `${BASE_URL}/student/${user.id}/hostel`
                );

                // HANDLE INVALID RESPONSE
                if (!res) {
                    throw new Error("No response from server");
                }

                const data = await res.json();

                // SUCCESS RESPONSE
                if (res.ok && data.success) {
                    setHostel(data.data || null);
                } else {
                    setHostel(null);

                    showToast(
                        data.message || "Failed to load hostel details",
                        "error"
                    );
                }

            } catch (err) {
                console.error("Hostel Fetch Error:", err);

                setHostel(null);

                showToast(
                    err.message || "Failed to load hostel details",
                    "error"
                );

            } finally {
                setHostelLoading(false);
            }
        };

        fetchHostel();

    }, [activeSection]);

    // ================= RAISE COMPLAINT =================
    const handleRaiseComplaint = async () => {

        const issue = complaintText.trim();

        if (!issue) {
            showToast("Enter complaint", "error");
            return;
        }

        const user = getUser();

        if (!user?.id) {
            showToast("User not found", "error");
            return;
        }

        try {
            const res = await fetchWithAuth(
                `${BASE_URL}/student/${user.id}/hostel/complaint`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        issue,
                    }),
                }
            );

            if (!res) {
                throw new Error("No response from server");
            }

            const data = await res.json();

            // SUCCESS
            if (res.ok && data.success) {

                showToast(
                    data.message || "Complaint submitted successfully",
                    "success"
                );

                setComplaintText("");

                // OPTIONAL: REFRESH HOSTEL DATA
                const hostelRes = await fetchWithAuth(
                    `${BASE_URL}/student/${user.id}/hostel`
                );

                const hostelData = await hostelRes.json();

                if (hostelRes.ok && hostelData.success) {
                    setHostel(hostelData.data || null);
                }

            } else {

                showToast(
                    data.message || "Failed to submit complaint",
                    "error"
                );
            }

        } catch (err) {
            console.error("Complaint Error:", err);

            showToast(
                err.message || "Failed to submit complaint",
                "error"
            );
        }
    };

    // ================= RETURN =================
    return {
        hostel,
        hostelLoading,

        complaintText,
        setComplaintText,

        handleRaiseComplaint,
    };
}