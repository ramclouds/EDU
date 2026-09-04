import { useEffect, useState, useCallback } from "react";
import { BASE_URL } from "../../config/appConfig";

export function useStudentHostel(fetchWithAuth, activeSection, showToast) {
    // ================= CORE HOSTEL DETAILS =================
    const [hostel, setHostel] = useState(null);
    const [hostelLoading, setHostelLoading] = useState(false);

    // ================= TAB (Overview / Fees / Complaints / Leave / Visitors / Mess / Attendance) ==
    const [hostelTab, setHostelTab] = useState("overview");

    // ================= FEES =================
    const [fees, setFees] = useState([]);
    const [feeSummary, setFeeSummary] = useState(null);
    const [feesLoading, setFeesLoading] = useState(false);
    const [feesLoaded, setFeesLoaded] = useState(false);

    // ================= COMPLAINTS (raise form) =================
    const [complaintText, setComplaintText] = useState("");
    const [complaintCategory, setComplaintCategory] = useState("Other");
    const [complaintPriority, setComplaintPriority] = useState("Medium");
    const [complaintSubmitting, setComplaintSubmitting] = useState(false);

    // ================= LEAVE REQUESTS =================
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [leaveLoading, setLeaveLoading] = useState(false);
    const [leaveLoaded, setLeaveLoaded] = useState(false);
    const [leaveSubmitting, setLeaveSubmitting] = useState(false);
    const [leaveForm, setLeaveForm] = useState({
        leave_type: "Weekend Leave",
        from_date: "",
        to_date: "",
        reason: "",
    });

    // ================= VISITORS =================
    const [visitors, setVisitors] = useState([]);
    const [visitorsLoading, setVisitorsLoading] = useState(false);
    const [visitorsLoaded, setVisitorsLoaded] = useState(false);
    const [visitorSubmitting, setVisitorSubmitting] = useState(false);
    const [visitorForm, setVisitorForm] = useState({
        visitor_name: "",
        visitor_mobile: "",
        relation: "Parent",
        purpose: "",
    });

    // ================= MESS MENU =================
    const [messMenu, setMessMenu] = useState(null);
    const [messMenuLoading, setMessMenuLoading] = useState(false);
    const [messMenuLoaded, setMessMenuLoaded] = useState(false);

    // ================= ATTENDANCE =================
    const [attendance, setAttendance] = useState(null);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [attendanceLoaded, setAttendanceLoaded] = useState(false);

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

    // ================= SHARED JSON HELPER =================
    const readJson = async (res) => {
        if (!res) throw new Error("No response from server");
        const data = await res.json();
        return { ok: res.ok, data };
    };

    // ================= FETCH HOSTEL (OVERVIEW) =================
    const fetchHostel = useCallback(async () => {
        const user = getUser();

        if (!user?.id) {
            showToast("User not found", "error");
            return;
        }

        try {
            setHostelLoading(true);

            const res = await fetchWithAuth(`${BASE_URL}/student/${user.id}/hostel`);
            const { ok, data } = await readJson(res);

            if (ok && data.success) {
                setHostel(data.data || null);
            } else {
                setHostel(null);
                showToast(data.message || "Failed to load hostel details", "error");
            }
        } catch (err) {
            console.error("Hostel Fetch Error:", err);
            setHostel(null);
            showToast(err.message || "Failed to load hostel details", "error");
        } finally {
            setHostelLoading(false);
        }
    }, [fetchWithAuth, showToast]);

    // ================= FETCH FEES =================
    const fetchFees = useCallback(async () => {
        const user = getUser();
        if (!user?.id) return;

        try {
            setFeesLoading(true);

            const res = await fetchWithAuth(`${BASE_URL}/student/${user.id}/hostel/fees`);
            const { ok, data } = await readJson(res);

            if (ok && data.success) {
                setFees(data.data?.fees || []);
                setFeeSummary(data.data?.summary || null);
            } else {
                showToast(data.message || "Failed to load fee details", "error");
            }
        } catch (err) {
            console.error("Fees Fetch Error:", err);
            showToast(err.message || "Failed to load fee details", "error");
        } finally {
            setFeesLoading(false);
            setFeesLoaded(true);
        }
    }, [fetchWithAuth, showToast]);

    // ================= FETCH LEAVE REQUESTS =================
    const fetchLeaveRequests = useCallback(async () => {
        const user = getUser();
        if (!user?.id) return;

        try {
            setLeaveLoading(true);

            const res = await fetchWithAuth(
                `${BASE_URL}/student/${user.id}/hostel/leave-requests`
            );
            const { ok, data } = await readJson(res);

            if (ok && data.success) {
                setLeaveRequests(data.data || []);
            } else {
                showToast(data.message || "Failed to load leave requests", "error");
            }
        } catch (err) {
            console.error("Leave Requests Fetch Error:", err);
            showToast(err.message || "Failed to load leave requests", "error");
        } finally {
            setLeaveLoading(false);
            setLeaveLoaded(true);
        }
    }, [fetchWithAuth, showToast]);

    // ================= FETCH VISITORS =================
    const fetchVisitors = useCallback(async () => {
        const user = getUser();
        if (!user?.id) return;

        try {
            setVisitorsLoading(true);

            const res = await fetchWithAuth(`${BASE_URL}/student/${user.id}/hostel/visitors`);
            const { ok, data } = await readJson(res);

            if (ok && data.success) {
                setVisitors(data.data || []);
            } else {
                showToast(data.message || "Failed to load visitor requests", "error");
            }
        } catch (err) {
            console.error("Visitors Fetch Error:", err);
            showToast(err.message || "Failed to load visitor requests", "error");
        } finally {
            setVisitorsLoading(false);
            setVisitorsLoaded(true);
        }
    }, [fetchWithAuth, showToast]);

    // ================= FETCH MESS MENU =================
    const fetchMessMenu = useCallback(async () => {
        const user = getUser();
        if (!user?.id) return;

        try {
            setMessMenuLoading(true);

            const res = await fetchWithAuth(
                `${BASE_URL}/student/${user.id}/hostel/mess-menu`
            );
            const { ok, data } = await readJson(res);

            if (ok && data.success) {
                setMessMenu(data.data || null);
            } else {
                showToast(data.message || "Failed to load mess menu", "error");
            }
        } catch (err) {
            console.error("Mess Menu Fetch Error:", err);
            showToast(err.message || "Failed to load mess menu", "error");
        } finally {
            setMessMenuLoading(false);
            setMessMenuLoaded(true);
        }
    }, [fetchWithAuth, showToast]);

    // ================= FETCH ATTENDANCE =================
    const fetchAttendance = useCallback(async () => {
        const user = getUser();
        if (!user?.id) return;

        try {
            setAttendanceLoading(true);

            const res = await fetchWithAuth(
                `${BASE_URL}/student/${user.id}/hostel/attendance`
            );
            const { ok, data } = await readJson(res);

            if (ok && data.success) {
                setAttendance(data.data || null);
            } else {
                showToast(data.message || "Failed to load attendance", "error");
            }
        } catch (err) {
            console.error("Attendance Fetch Error:", err);
            showToast(err.message || "Failed to load attendance", "error");
        } finally {
            setAttendanceLoading(false);
            setAttendanceLoaded(true);
        }
    }, [fetchWithAuth, showToast]);

    // ================= LOAD OVERVIEW WHEN SECTION OPENS =================
    useEffect(() => {
        if (activeSection !== "studhostel") return;
        setHostelTab("overview");
        fetchHostel();
        // reset "loaded" flags so switching away & back stays fresh for the next open
        setFeesLoaded(false);
        setLeaveLoaded(false);
        setVisitorsLoaded(false);
        setMessMenuLoaded(false);
        setAttendanceLoaded(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSection]);

    // ================= LAZY-LOAD EACH TAB ON FIRST VISIT =================
    useEffect(() => {
        if (activeSection !== "studhostel") return;

        if (hostelTab === "fees" && !feesLoaded) fetchFees();
        if (hostelTab === "leave" && !leaveLoaded) fetchLeaveRequests();
        if (hostelTab === "visitors" && !visitorsLoaded) fetchVisitors();
        if (hostelTab === "mess" && !messMenuLoaded) fetchMessMenu();
        if (hostelTab === "attendance" && !attendanceLoaded) fetchAttendance();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hostelTab, activeSection]);

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
            setComplaintSubmitting(true);

            const res = await fetchWithAuth(
                `${BASE_URL}/student/${user.id}/hostel/complaint`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        issue,
                        category: complaintCategory,
                        priority: complaintPriority,
                    }),
                }
            );

            const { ok, data } = await readJson(res);

            if (ok && data.success) {
                showToast(data.message || "Complaint submitted successfully", "success");

                setComplaintText("");
                setComplaintCategory("Other");
                setComplaintPriority("Medium");

                // prepend new complaint locally, then reconcile with server
                setHostel((prev) =>
                    prev
                        ? {
                            ...prev,
                            complaints: [data.data, ...(prev.complaints || [])].slice(0, 10),
                        }
                        : prev
                );

                fetchHostel();
            } else {
                showToast(data.message || "Failed to submit complaint", "error");
            }
        } catch (err) {
            console.error("Complaint Error:", err);
            showToast(err.message || "Failed to submit complaint", "error");
        } finally {
            setComplaintSubmitting(false);
        }
    };

    // ================= APPLY FOR LEAVE =================
    const handleApplyLeave = async () => {
        const user = getUser();

        if (!user?.id) {
            showToast("User not found", "error");
            return false;
        }

        if (!leaveForm.from_date || !leaveForm.to_date) {
            showToast("Select both from and to dates", "error");
            return false;
        }

        try {
            setLeaveSubmitting(true);

            const res = await fetchWithAuth(
                `${BASE_URL}/student/${user.id}/hostel/leave-requests`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(leaveForm),
                }
            );

            const { ok, data } = await readJson(res);

            if (ok && data.success) {
                showToast(data.message || "Leave request submitted", "success");
                setLeaveRequests((prev) => [data.data, ...prev]);
                setLeaveForm({
                    leave_type: "Weekend Leave",
                    from_date: "",
                    to_date: "",
                    reason: "",
                });
                return true;
            }

            showToast(data.message || "Failed to submit leave request", "error");
            return false;
        } catch (err) {
            console.error("Leave Request Error:", err);
            showToast(err.message || "Failed to submit leave request", "error");
            return false;
        } finally {
            setLeaveSubmitting(false);
        }
    };

    // ================= CANCEL / WITHDRAW LEAVE =================
    const handleCancelLeave = async (leaveId) => {
        const user = getUser();
        if (!user?.id) return;

        try {
            const res = await fetchWithAuth(
                `${BASE_URL}/student/${user.id}/hostel/leave-requests/${leaveId}`,
                { method: "DELETE" }
            );

            const { ok, data } = await readJson(res);

            if (ok && data.success) {
                showToast(data.message || "Leave request withdrawn", "success");
                setLeaveRequests((prev) => prev.filter((lr) => lr.id !== leaveId));
            } else {
                showToast(data.message || "Failed to withdraw leave request", "error");
            }
        } catch (err) {
            console.error("Cancel Leave Error:", err);
            showToast(err.message || "Failed to withdraw leave request", "error");
        }
    };

    // ================= REQUEST VISITOR PASS =================
    const handleRequestVisitor = async () => {
        const user = getUser();

        if (!user?.id) {
            showToast("User not found", "error");
            return false;
        }

        if (!visitorForm.visitor_name.trim()) {
            showToast("Visitor name is required", "error");
            return false;
        }

        try {
            setVisitorSubmitting(true);

            const res = await fetchWithAuth(
                `${BASE_URL}/student/${user.id}/hostel/visitors`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(visitorForm),
                }
            );

            const { ok, data } = await readJson(res);

            if (ok && data.success) {
                showToast(data.message || "Visitor request submitted", "success");
                setVisitors((prev) => [data.data, ...prev]);
                setVisitorForm({
                    visitor_name: "",
                    visitor_mobile: "",
                    relation: "Parent",
                    purpose: "",
                });
                return true;
            }

            showToast(data.message || "Failed to submit visitor request", "error");
            return false;
        } catch (err) {
            console.error("Visitor Request Error:", err);
            showToast(err.message || "Failed to submit visitor request", "error");
            return false;
        } finally {
            setVisitorSubmitting(false);
        }
    };

    // ================= RETURN =================
    return {
        // overview
        hostel,
        hostelLoading,
        fetchHostel,

        // tabs
        hostelTab,
        setHostelTab,

        // fees
        fees,
        feeSummary,
        feesLoading,

        // complaints
        complaintText,
        setComplaintText,
        complaintCategory,
        setComplaintCategory,
        complaintPriority,
        setComplaintPriority,
        complaintSubmitting,
        handleRaiseComplaint,

        // leave requests
        leaveRequests,
        leaveLoading,
        leaveForm,
        setLeaveForm,
        leaveSubmitting,
        handleApplyLeave,
        handleCancelLeave,

        // visitors
        visitors,
        visitorsLoading,
        visitorForm,
        setVisitorForm,
        visitorSubmitting,
        handleRequestVisitor,

        // mess menu
        messMenu,
        messMenuLoading,

        // attendance
        attendance,
        attendanceLoading,
    };
}
