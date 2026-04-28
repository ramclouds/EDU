// ========================= DASHBOARD =================
document.addEventListener('DOMContentLoaded', function () {
    // 1. Context & Theme Detection
    const isDark = document.documentElement.classList.contains('dark');
    const labelColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    // 2. Student Growth Line Chart
    const growthCanvas = document.getElementById('userGrowthChart');
    if (growthCanvas) {
        const ctxGrowth = growthCanvas.getContext('2d');
        
        // Create a beautiful area gradient
        const growthGradient = ctxGrowth.createLinearGradient(0, 0, 0, 400);
        growthGradient.addColorStop(0, 'rgba(79, 70, 229, 0.4)');
        growthGradient.addColorStop(1, 'rgba(79, 70, 229, 0)');

        new Chart(ctxGrowth, {
            type: 'line',
            data: {
                labels: ['2020', '2021', '2022', '2023', '2024', '2025'],
                datasets: [{
                    label: 'Total Students',
                    data: [5000, 8500, 12000, 15500, 17200, 18540],
                    borderColor: '#4f46e5',
                    borderWidth: 3,
                    backgroundColor: growthGradient,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { 
                        grid: { color: gridColor }, 
                        ticks: { color: labelColor },
                        border: { display: false }
                    },
                    x: { 
                        grid: { display: false }, 
                        ticks: { color: labelColor },
                        border: { display: false }
                    }
                }
            }
        });
    }

    // 3. Attendance Bar Chart
    const attendanceCanvas = document.getElementById('attendanceChart');
    if (attendanceCanvas) {
        new Chart(attendanceCanvas, {
            type: 'bar',
            data: {
                labels: ['M', 'T', 'W', 'T', 'F', 'S'],
                datasets: [{
                    data: [95, 88, 92, 90, 85, 70],
                    backgroundColor: '#6366f1',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { display: false },
                    x: { 
                        grid: { display: false }, 
                        ticks: { color: labelColor },
                        border: { display: false }
                    }
                }
            }
        });
    }

    // 4. Fees Doughnut Chart
    const feesCanvas = document.getElementById('feesChart');
    if (feesCanvas) {
        new Chart(feesCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Paid', 'Pending'],
                datasets: [{
                    data: [85, 15],
                    backgroundColor: ['#10b981', isDark ? '#1e293b' : '#f1f5f9'],
                    borderWidth: 0,
                    weight: 0.5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '80%',
                plugins: {
                    legend: { 
                        position: 'bottom', 
                        labels: { 
                            color: labelColor, 
                            usePointStyle: true,
                            padding: 20
                        } 
                    }
                }
            }
        });
    }
});


//  =========== ACTIVIES & EVENTS ====================
let events = [
    { id: 1, title: "Annual Day", start: "2026-04-20", end: "2026-04-20" }
];

let holidays = [
    { id: 1, title: "Ambedkar Jayanti", start: "2026-04-14", end: "2026-04-14", type: "Public" }
];

let sports = [
    { title: "Football Match", date: "2026-04-18" }
];

let competitions = [
    { title: "Math Olympiad", result: "Rahul - 1st Rank" }
];

// RENDER EVENTS
function renderEvents() {
    const container = document.getElementById("eventList");

    container.innerHTML = events.map(e => `
        <div class="p-3 rounded-xl bg-gray-50 dark:bg-slate-700 flex justify-between items-center">
            <div>
                <p class="font-medium">${e.title}</p>
                <p class="text-xs text-gray-500">
                    ${e.start} ${e.end !== e.start ? '→ ' + e.end : ''}
                </p>
            </div>
            <button onclick="deleteEvent(${e.id})" class="text-red-500 text-xs">Delete</button>
        </div>
    `).join("");
}

// RENDER HOLIDAYS
function renderHolidays() {
    const container = document.getElementById("holidayList");

    container.innerHTML = holidays.map(h => `
        <div class="p-3 rounded-xl bg-gray-50 dark:bg-slate-700 flex justify-between items-center">
            <div>
                <p class="font-medium">${h.title}</p>
                <p class="text-xs text-gray-500">
                    ${h.start} ${h.end !== h.start ? '→ ' + h.end : ''}
                </p>
            </div>

            <div class="flex items-center gap-2">
                <span class="text-xs px-2 py-1 rounded-full 
                    ${h.type === 'Public' ? 'bg-green-100 text-green-700' : ''}
                    ${h.type === 'School' ? 'bg-blue-100 text-blue-700' : ''}
                    ${h.type === 'Optional' ? 'bg-yellow-100 text-yellow-700' : ''}
                ">
                    ${h.type}
                </span>

                <button onclick="deleteHoliday(${h.id})"
                    class="text-red-500 text-xs">✕</button>
            </div>
        </div>
    `).join("");
}

// SPORTS
function renderSports() {
    document.getElementById("sportsList").innerHTML = sports.map(s => `
        <div class="p-3 rounded-xl bg-gray-50 dark:bg-slate-700">
            <p class="font-medium">${s.title}</p>
            <p class="text-xs text-gray-500">${s.date}</p>
        </div>
    `).join("");
}

// COMPETITIONS
function renderCompetitions() {
    document.getElementById("competitionList").innerHTML = competitions.map(c => `
        <div class="p-3 rounded-xl bg-gray-50 dark:bg-slate-700">
            <p class="font-medium">${c.title}</p>
            <p class="text-xs text-green-600">${c.result}</p>
        </div>
    `).join("");
}

// ADD EVENT
function addEvent() {
    const title = document.getElementById("eventTitle").value;
    const start = document.getElementById("eventStart").value;
    const end = document.getElementById("eventEnd").value;

    if (!title || !start) return showToast("Fill required fields");

    events.push({
        id: Date.now(),
        title,
        start,
        end: end || start
    });

    renderEvents();
    closeEventModal();
    resetEventForm();
    showToast("Event Added ✅");
}

// DELETE EVENT
function deleteEvent(id) {
    events = events.filter(e => e.id !== id);
    renderEvents();
    showToast("Event Deleted");
}

// ADD HOLIDAY
function addHoliday() {
    const title = document.getElementById("holidayTitle").value;
    const start = document.getElementById("holidayStart").value;
    const end = document.getElementById("holidayEnd").value;
    const type = document.getElementById("holidayType").value;

    if (!title || !start) return showToast("Fill required fields");

    holidays.push({
        id: Date.now(),
        title,
        start,
        end: end || start,
        type
    });

    renderHolidays();
    closeHolidayModal();
    resetHolidayForm();
    showToast("Holiday Added 🎉");
}

// DELETE HOLIDAY
function deleteHoliday(id) {
    holidays = holidays.filter(h => h.id !== id);
    renderHolidays();
    showToast("Holiday Deleted");
}

// MODALS
function openEventModal() {
    document.getElementById("eventModal").classList.remove("hidden");
}
function closeEventModal() {
    document.getElementById("eventModal").classList.add("hidden");
}
function openHolidayModal() {
    document.getElementById("holidayModal").classList.remove("hidden");
}
function closeHolidayModal() {
    document.getElementById("holidayModal").classList.add("hidden");
}

// RESET FORMS
function resetEventForm() {
    eventTitle.value = "";
    eventStart.value = "";
    eventEnd.value = "";
}
function resetHolidayForm() {
    holidayTitle.value = "";
    holidayStart.value = "";
    holidayEnd.value = "";
}

// TOAST
function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.innerText = msg;
    toast.classList.remove("hidden");

    setTimeout(() => toast.classList.add("hidden"), 5000);
}

// INIT
renderEvents();
renderHolidays();
renderSports();
renderCompetitions();

// ================= LEAVE MANAGEMENT ========================
// DATA 
let currentTab = "teacher";

let leaves = [
    { id: 1, type: "teacher", name: "Mr. Sharma", dept: "Math", days: 2, date: "2026-04-20", reason: "Fever", status: "pending" },
    { id: 2, type: "staff", name: "Office Clerk", dept: "Admin", days: 1, date: "2026-04-24", reason: "Personal Work", status: "approved" },
    { id: 4, type: "Student", name: "Aarav Sharma", dept: "10.A", days: 1, date: "2026-04-24", reason: "Personal Work", status: "approved" },
    { id: 3, type: "teacher", name: "Ms. Patil", dept: "Science", days: 3, date: "2026-04-26", reason: "Medical", status: "pending" }
];

//  RENDER 
function renderLeaves() {
    const filter = document.getElementById("leaveFilter").value;
    const search = document.getElementById("leaveSearch").value.toLowerCase();
    const container = document.getElementById("leaveList");

    let filtered = leaves.filter(l =>
        l.type === currentTab &&
        (filter === "all" || l.status === filter) &&
        l.name.toLowerCase().includes(search)
    );

    container.innerHTML = filtered.map(l => `
        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm flex justify-between flex-wrap gap-3">

            <div>
                <p class="font-medium">${l.name}</p>
                <p class="text-xs text-gray-500">${l.dept} • ${l.days} Day(s)</p>
                <p class="text-xs text-gray-500">Leave Date: ${l.date}</p>
                <p class="text-xs text-gray-400">Reason: ${l.reason}</p>
            </div>

            <div class="flex items-center gap-2">

                <span class="text-xs px-3 py-1 rounded-full
                    ${l.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : ''}
                    ${l.status === 'approved' ? 'bg-green-100 text-green-600' : ''}
                    ${l.status === 'rejected' ? 'bg-red-100 text-red-600' : ''}
                ">
                    ${l.status}
                </span>

                ${l.status === "pending" ? `
                    <button onclick="updateLeave(${l.id}, 'approved')"
                        class="px-3 py-1 text-xs bg-green-100 text-green-600 rounded-lg">
                        Approve
                    </button>

                    <button onclick="updateLeave(${l.id}, 'rejected')"
                        class="px-3 py-1 text-xs bg-red-100 text-red-600 rounded-lg">
                        Reject
                    </button>
                ` : ""}
            </div>
        </div>
    `).join("");

    updateStats();
}

//  UPDATE 
function updateLeave(id, status) {
    leaves = leaves.map(l =>
        l.id === id ? { ...l, status } : l
    );

    renderLeaves();
    showToast(`Leave ${status}`);
}

//  TABS 
function switchTab(tab) {
    currentTab = tab;

    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.classList.remove("text-indigo-600", "border-b-2", "border-indigo-600");
        btn.classList.add("text-gray-500");
    });

    document.getElementById(tab + "Tab").classList.add("text-indigo-600", "border-b-2", "border-indigo-600");

    renderLeaves();
}

//  STATS 
function updateStats() {
    const filtered = leaves.filter(l => l.type === currentTab);

    document.getElementById("pendingCount").innerText =
        filtered.filter(l => l.status === "pending").length;

    document.getElementById("approvedCount").innerText =
        filtered.filter(l => l.status === "approved").length;

    document.getElementById("totalCount").innerText = filtered.length;
}

//  EVENTS 
document.getElementById("leaveFilter").addEventListener("change", renderLeaves);
document.getElementById("leaveSearch").addEventListener("input", renderLeaves);

//  INIT 
renderLeaves();


// ================= LIBRART MANAGEMENT =================
(function () {

    let libraryTab = "issued";

    //  DATA 
    let books = [
        { id: 1, name: "Math Guide", author: "R Sharma", category: "Education", qty: 5 },
        { id: 2, name: "Science Practical", author: "S Verma", category: "Science", qty: 3 },
        { id: 3, name: "JS Basics", author: "John Doe", category: "Technology", qty: 7 }
    ];

    let issued = [
        { id: 1, name: "Math Guide", user: "Student A", due: -5, fine: 50 },
        { id: 2, name: "Science Practical", user: "Teacher B", due: 3, fine: 0 }
    ];

    let history = [];

    //  ELEMENTS 
    const head = document.getElementById("tableHead");
    const body = document.getElementById("tableBody");
    const searchInput = document.getElementById("searchInput");
    const categoryFilter = document.getElementById("categoryFilter");

    //  TAB SWITCH 
    document.querySelectorAll("#librarySection .tab").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("#librarySection .tab").forEach(b => {
                b.classList.remove("active", "border-indigo-600", "text-indigo-600");
            });

            btn.classList.add("active", "border-indigo-600", "text-indigo-600");

            libraryTab = btn.dataset.tab;
            renderTable();
        });
    });

    //  FILTER LOGIC 
    function getSearchValue() {
        return searchInput?.value.toLowerCase() || "";
    }

    function getCategoryValue() {
        return categoryFilter?.value || "";
    }

    //  RENDER 
    function renderTable() {

        if (!head || !body) return;

        body.innerHTML = "";

        const search = getSearchValue();
        const category = getCategoryValue();

        //  ISSUED 
        if (libraryTab === "issued") {

            head.innerHTML = `<th class="p-3 text-left">Book</th>
                              <th class="p-3 text-left">User</th>
                              <th class="p-3 text-left">Due</th>
                              <th class="p-3 text-left">Fine</th>
                              <th class="p-3 text-left">Action</th>`;

            issued
                .filter(b =>
                    b.name.toLowerCase().includes(search) ||
                    b.user.toLowerCase().includes(search)
                )
                .forEach((b, i) => {

                    body.innerHTML += `
                    <tr class="hover:bg-gray-50">
                        <td class="p-3">${b.name}</td>
                        <td class="p-3">${b.user}</td>
                        <td class="p-3 ${b.due < 0 ? 'text-red-500 font-medium' : ''}">
                            ${b.due} days
                        </td>
                        <td class="p-3">₹${b.fine}</td>
                        <td class="p-3 space-x-2">
                            ${b.fine > 0
                            ? `<button onclick="payFine(${i})" class="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100">Pay</button>`
                            : ''
                        }
                            <button onclick="returnBook(${i})" class="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100">
                                Return
                            </button>
                        </td>
                    </tr>`;
                });
        }

        //  AVAILABLE 
        else if (libraryTab === "available") {

            head.innerHTML = `<th class="p-3 text-left">ID</th>
                              <th class="p-3 text-left">Name</th>
                              <th class="p-3 text-left">Author</th>
                              <th class="p-3 text-left">Category</th>
                              <th class="p-3 text-left">Qty</th>`;

            books
                .filter(b =>
                    (!category || b.category === category) &&
                    (b.name.toLowerCase().includes(search) ||
                        b.author.toLowerCase().includes(search))
                )
                .forEach(b => {

                    body.innerHTML += `
                    <tr class="hover:bg-gray-50">
                        <td class="p-3">${b.id}</td>
                        <td class="p-3">${b.name}</td>
                        <td class="p-3">${b.author}</td>
                        <td class="p-3">${b.category}</td>
                        <td class="p-3 font-medium">${b.qty}</td>
                    </tr>`;
                });
        }

        //  OVERDUE 
        else if (libraryTab === "overdue") {

            head.innerHTML = `<th class="p-3 text-left">Book</th>
                              <th class="p-3 text-left">User</th>
                              <th class="p-3 text-left">Fine</th>
                              <th class="p-3 text-left">Action</th>`;

            issued
                .filter(b => b.due < 0)
                .filter(b =>
                    b.name.toLowerCase().includes(search) ||
                    b.user.toLowerCase().includes(search)
                )
                .forEach((b, i) => {

                    body.innerHTML += `
                    <tr class="hover:bg-gray-50">
                        <td class="p-3">${b.name}</td>
                        <td class="p-3">${b.user}</td>
                        <td class="p-3 text-red-500 font-medium">₹${b.fine}</td>
                        <td class="p-3">
                            <button onclick="clearOverdue(${i})" 
                                class="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100">
                                Clear
                            </button>
                        </td>
                    </tr>`;
                });
        }

        //  HISTORY 
        else if (libraryTab === "history") {

            head.innerHTML = `<th class="p-3 text-left">Activity Log</th>`;

            history
                .filter(h => h.toLowerCase().includes(search))
                .forEach(h => {
                    body.innerHTML += `
                    <tr class="hover:bg-gray-50">
                        <td class="p-3">${h}</td>
                    </tr>`;
                });
        }

        updateStats();
    }

    //  ACTIONS 
    window.payFine = function (i) {
        history.push(`Fine Paid: ${issued[i].name} by ${issued[i].user}`);
        issued[i].fine = 0;
        renderTable();
    };

    window.returnBook = function (i) {
        history.push(`Returned: ${issued[i].name} by ${issued[i].user}`);
        issued.splice(i, 1);
        renderTable();
    };

    window.clearOverdue = function (i) {
        history.push(`Overdue Cleared: ${issued[i].name}`);
        issued.splice(i, 1);
        renderTable();
    };

    //  STATS 
    function updateStats() {
        document.getElementById("totalBooks").innerText = books.length;
        document.getElementById("issuedCount").innerText = issued.length;
        document.getElementById("availableCount").innerText =
            books.reduce((a, b) => a + b.qty, 0);
        document.getElementById("overdueCount").innerText =
            issued.filter(b => b.due < 0).length;
        document.getElementById("fineTotal").innerText =
            "₹" + issued.reduce((a, b) => a + b.fine, 0);
    }

    //  EVENTS 
    searchInput?.addEventListener("input", renderTable);
    categoryFilter?.addEventListener("change", renderTable);

    //  INIT 
    renderTable();

})();


// ============== ENROLLMENT SECTION LOGIC =====================

/**
 * Tab Switching Logic
 */
function showTab(tabId, btnElement) {
    // Hide all contents
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));

    // Show selected content
    document.getElementById(tabId).classList.remove('hidden');

    // Update Button Styles
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-indigo-600', 'text-white');
        btn.classList.add('bg-white', 'text-gray-600');
    });

    btnElement.classList.add('active', 'bg-indigo-600', 'text-white');
    btnElement.classList.remove('bg-white', 'text-gray-600');
}

/**
 * Handle Form Submission (Enrollment)
 */
function handleEnrollment(event) {
    event.preventDefault();

    // Capture All Fields
    const formData = {
        personal: {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('studentEmail').value,
            mobile: document.getElementById('studentMobile').value,
            gender: document.getElementById('gender').value,
            dob: document.getElementById('dob').value,
            blood: document.getElementById('bloodGroup').value
        },
        parent: {
            father: document.getElementById('fatherName').value,
            mother: document.getElementById('motherName').value
        },
        academic: {
            batch: document.getElementById('enrollBatch').value,
            division: document.getElementById('enrollDivision').value,
            section: document.getElementById('enrollSection').value,
            roll: document.getElementById('rollNumber').value,
            date: document.getElementById('admissionDate').value
        },
        system: {
            sid: document.getElementById('studentID').value,
            uid: document.getElementById('userID').value,
            status: document.getElementById('status').value
        }
    };

    console.log("Enrollment Data Prepared:", formData);
    alert("Student " + formData.personal.firstName + " Enrolled Successfully! (Check Console for JSON)");

    // Optional: event.target.reset();
}

/**
 * Load Reports
 */
let studentsData = [];

async function loadStudents() {
    const batch = document.getElementById('reportBatch').value;
    const division = document.getElementById('reportDivision').value;

    // UI Loading State
    const tbody = document.getElementById('studentTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center p-10">Searching database...</td></tr>';

    try {
        // Replace with your real backend endpoint
        // const response = await fetch(`/api/students/report?batch=${batch}&division=${division}`);
        // const data = await response.json();

        // MOCK DATA FOR DEMO
        const mockData = [
            { student_id: 'STU001', first_name: 'John', last_name: 'Doe', batch: '2025', division: 'Sec', section: 'A', roll_number: '10' },
            { student_id: 'STU002', first_name: 'Jane', last_name: 'Smith', batch: '2025', division: 'Sec', section: 'B', roll_number: '12' }
        ];

        studentsData = mockData;
        tbody.innerHTML = '';

        mockData.forEach(s => {
            tbody.innerHTML += `
                <tr class="hover:bg-slate-50 transition">
                    <td class="p-4 border-b font-mono text-xs">${s.student_id}</td>
                    <td class="p-4 border-b font-medium">${s.first_name} ${s.last_name}</td>
                    <td class="p-4 border-b">${s.batch}</td>
                    <td class="p-4 border-b">${s.division}</td>
                    <td class="p-4 border-b">${s.section}</td>
                    <td class="p-4 border-b">${s.roll_number}</td>
                </tr>
            `;
        });
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-10 text-red-500">Error connecting to server.</td></tr>';
    }
}

/**
 * CSV Download Logic
 */
function downloadCSV() {
    if (studentsData.length === 0) {
        alert("Please load student data first.");
        return;
    }

    let csv = "Student ID,Name,Batch,Division,Section,Roll No\n";
    studentsData.forEach(s => {
        csv += `${s.student_id},${s.first_name} ${s.last_name},${s.batch},${s.division},${s.section},${s.roll_number}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "School_Enrollment_Report.csv";
    a.click();
}

// =================== Attendance Section (Admin Dashboard) ======================
const demoData = [
    { id: "S101", name: "Rahul Sharma", role: "Student", status: "Present" },
    { id: "S102", name: "Aisha Khan", role: "Student", status: "Absent" },
    { id: "T201", name: "Mr. Verma", role: "Teacher", status: "Present" },
    { id: "ST301", name: "Office Staff", role: "Staff", status: "Present" }
];

function loadAttendance() {
    const role = document.getElementById('roleFilter').value;
    const tbody = document.getElementById('attendanceTableBody');

    tbody.innerHTML = '';

    const filtered = demoData.filter(d => {
        if (role === 'students') return d.role === 'Student';
        if (role === 'teachers') return d.role === 'Teacher';
        if (role === 'staff') return d.role === 'Staff';
    });

    let present = 0, absent = 0;

    filtered.forEach(d => {
        if (d.status === "Present") present++;
        else absent++;

        tbody.innerHTML += `
<tr class="hover:bg-gray-50 transition">

    <td class="p-3 font-medium text-gray-700">${d.id}</td>

    <td class="p-3 flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
            ${d.name.charAt(0)}
        </div>
        ${d.name}
    </td>

    <td class="p-3">
        <span class="px-2 py-1 text-xs rounded-full 
            ${d.role === 'Student' ? 'bg-blue-100 text-blue-600' :
                d.role === 'Teacher' ? 'bg-purple-100 text-purple-600' :
                    'bg-gray-100 text-gray-600'}">
            ${d.role}
        </span>
    </td>

    <td class="p-3">
        <span class="px-2 py-1 text-xs rounded-full 
            ${d.status === 'Present' ? 'bg-green-100 text-green-600' :
                'bg-red-100 text-red-500'}">
            ${d.status}
        </span>
    </td>

    <!-- ✅ REASON COLUMN -->
    <td class="p-3">
        ${d.status === 'Absent'
                ? `<span class="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">
                    ${d.reason || 'No reason'}
               </span>`
                : `<span class="text-xs text-gray-400">—</span>`
            }
    </td>

</tr>
`;
    });

    const total = present + absent;
    const percent = total ? ((present / total) * 100).toFixed(1) : 0;

    // ✅ Update stats UI
    document.getElementById('presentCount').innerText = present;
    document.getElementById('absentCount').innerText = absent;
    document.getElementById('totalCount').innerText = total;
    document.getElementById('percentage').innerText = percent + '%';

    renderChart(present, absent);
}

let chart;

function renderChart(present, absent) {
    const ctx = document.getElementById('attendanceChartA');

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Present', 'Absent'],
            datasets: [{
                data: [present, absent]
            }]
        },
        options: {
            responsive: false,   // ❗ prevents auto stretching
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 10,
                        font: {
                            size: 10
                        }
                    }
                }
            }
        }
    });
}

// load default
loadAttendance();

// reload on filter change
document.getElementById('roleFilter').addEventListener('change', loadAttendance);


// ======================= TIME TABLE SECTION ===========================

let timetable = [];
function addLecture() {

    const day = document.getElementById('lecDay').value.slice(0, 3);
    const start = document.getElementById('startTime').value;
    const end = document.getElementById('endTime').value;
    const subject = document.getElementById('lecSubject').value;
    const teacher = document.getElementById('lecTeacher').value;

    const errorBox = document.getElementById('timeError');

    // validation
    if (!validateTimeSlot(start, end)) {
        errorBox.classList.remove('hidden');
        return;
    } else {
        errorBox.classList.add('hidden');
    }

    const time = `${start}-${end}`;

    let row = timetable.find(r => r.time === time);

    if (!row) {
        row = { time };
        timetable.push(row);
    }

    row[day] = `${subject} - ${teacher}`;

    closeLectureModal();
    loadTimetable();
}

document.getElementById("endTime").addEventListener("change", () => {

    const start = document.getElementById("startTime").value;
    const end = document.getElementById("endTime").value;

    const errorBox = document.getElementById("timeError");

    if (start && end && !validateTimeSlot(start, end)) {
        errorBox.classList.remove("hidden");
    } else {
        errorBox.classList.add("hidden");
    }
});

function validateTimeSlot(start, end) {

    if (!start || !end) return false;

    const startDate = new Date(`2000-01-01T${start}`);
    const endDate = new Date(`2000-01-01T${end}`);

    return endDate > startDate;
}

function loadTimetable() {
    const tbody = document.getElementById('timetableBody');
    tbody.innerHTML = '';

    let subjects = new Set();
    let teachers = new Set();
    let total = 0;

    timetable.forEach(row => {

        let tr = `<tr><td class="p-2 border font-medium">${row.time}</td>`;

        ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(day => {
            let val = row[day];

            if (val !== "Break") {
                total++;

                let parts = val.split("-");
                if (parts.length > 1) {
                    subjects.add(parts[0].trim());
                    teachers.add(parts[1].trim());
                }
            }

            tr += `<td class="p-2 border hover:bg-indigo-50 cursor-pointer">${val}</td>`;
        });

        tr += `</tr>`;
        tbody.innerHTML += tr;
    });

    // STATS
    document.getElementById('totalLectures').innerText = total;
    document.getElementById('totalSubjects').innerText = subjects.size;
    document.getElementById('totalTeachers').innerText = teachers.size;
    document.getElementById('dailyLoad').innerText = Math.ceil(total / 6);
}

loadTimetable();



const teachers = [
    {
        id: "T101",
        name: "Rahul Sharma",
        subject: "Mathematics",
        status: "Present",
        attendance: 98,
        exp: "10 Years"
    },
    {
        id: "T102",
        name: "Aisha Khan",
        subject: "Science",
        status: "Leave",
        attendance: 92,
        exp: "7 Years"
    }
];

function loadTimetable() {

    const tbody = document.getElementById('timetableBody');
    tbody.innerHTML = '';

    let subjects = new Set();
    let teachers = new Set();
    let total = 0;

    timetable.forEach(row => {

        let tr = `<tr>
            <td class="p-2 border font-medium">${row.time}</td>`;

        ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(day => {

            let val = row[day] || "-";

            if (val !== "Break" && val !== "-") {
                total++;

                let parts = val.split("-");
                if (parts.length > 1) {
                    subjects.add(parts[0].trim());
                    teachers.add(parts[1].trim());
                }
            }

            tr += `<td class="p-2 border hover:bg-indigo-50 cursor-pointer">
                    ${val}
                </td>`;
        });

        tr += `</tr>`;
        tbody.innerHTML += tr;
    });

    // STATS
    document.getElementById('totalLectures').innerText = total;
    document.getElementById('totalSubjects').innerText = subjects.size;
    document.getElementById('totalTeachers').innerText = teachers.size;
    document.getElementById('dailyLoad').innerText = Math.ceil(total / 6);
}

loadTimetable();

function openLectureModal() {
    document.getElementById('lectureModal').classList.remove('hidden');
}

function closeLectureModal() {
    document.getElementById('lectureModal').classList.add('hidden');
}

// ========================= Student Section =========================
function openTeacherModal(id) {
    const teacher = teachers.find(t => t.id === id);

    document.getElementById('teacherModal').classList.remove('hidden');
    document.getElementById('teacherModal').classList.add('flex');

    document.getElementById('modalContent').innerHTML = `
    
    <!-- PROFILE HEADER (GLASS STYLE RESPONSIVE) -->
                <div
                    class="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-xl overflow-hidden">

                    <!-- blur overlay -->
                    <div class="absolute inset-0 bg-white/10 backdrop-blur-xl"></div>

                    <div class="relative flex flex-col sm:flex-row items-center gap-6">

                        <img src="https://i.pravatar.cc/120?img=12"
                            class="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-lg" />

                        <div class="text-center sm:text-left flex-1">
                            <h2 class="text-2xl sm:text-3xl font-bold tracking-tight">
                                Rahul Sharma
                            </h2>

                            <p class="text-sm opacity-90 mt-1">
                                Senior Lecturer • Mathematics Department
                            </p>

                            <!-- TAGS (RESPONSIVE WRAP) -->
                            <div class="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">

                                <span class="px-3 py-1 text-xs bg-white/20 rounded-full">T-102</span>
                                <span class="px-3 py-1 text-xs bg-white/20 rounded-full">10+ Years Exp</span>

                                <span class="px-3 py-1 text-xs bg-green-400 text-green-900 rounded-full font-medium">
                                    Verified
                                </span>

                            </div>
                        </div>

                    </div>
                </div>

                <!-- RESPONSIVE GRID (AUTO FIT CARDS) -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">

                    <!-- CARD -->
                    <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md hover:shadow-xl transition">
                        <h4 class="font-semibold mb-3">👤 Personal Info</h4>
                        <div class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            <p>DOB: <span class="font-medium text-gray-900 dark:text-white">1985-08-15</span></p>
                            <p>Gender: <span class="font-medium text-gray-900 dark:text-white">Male</span></p>
                            <p>Phone: <span class="font-medium text-gray-900 dark:text-white">9876543210</span></p>
                            <p>Email: <span class="font-medium text-gray-900 dark:text-white">rahul@mail.com</span></p>
                        </div>
                    </div>

                    <!-- CARD -->
                    <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md hover:shadow-xl transition">
                        <h4 class="font-semibold mb-3">💼 Professional</h4>
                        <div class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            <p>Designation: <span class="font-medium text-gray-900 dark:text-white">Senior
                                    Lecturer</span></p>
                            <p>Subjects: <span class="font-medium text-gray-900 dark:text-white">Math, Statistics</span>
                            </p>
                            <p>Classes: <span class="font-medium text-gray-900 dark:text-white">10-A, 9-B</span></p>
                        </div>
                    </div>

                    <!-- CARD -->
                    <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md hover:shadow-xl transition">
                        <h4 class="font-semibold mb-3">🎓 Academic</h4>
                        <div class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            <p>Degree: <span class="font-medium text-gray-900 dark:text-white">M.Sc</span></p>
                            <p>University: <span class="font-medium text-gray-900 dark:text-white">Delhi
                                    University</span></p>
                            <p>Experience: <span class="font-medium text-gray-900 dark:text-white">10 Years</span></p>
                            <p>Specialization: <span class="font-medium text-gray-900 dark:text-white">Algebra</span>
                            </p>
                        </div>
                    </div>

                    <!-- CARD -->
                    <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md hover:shadow-xl transition">
                        <h4 class="font-semibold mb-3">🏢 Employment</h4>
                        <div class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            <p>Joining: <span class="font-medium text-gray-900 dark:text-white">2015</span></p>
                            <p>Type: <span class="font-medium text-gray-900 dark:text-white">Full-Time</span></p>
                            <p>Shift: <span class="font-medium text-gray-900 dark:text-white">Morning</span></p>
                        </div>
                    </div>

                    <!-- CARD -->
                    <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md hover:shadow-xl transition">
                        <h4 class="font-semibold mb-3">📊 Performance</h4>
                        <div class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            <p>Classes: <span class="font-medium text-gray-900 dark:text-white">1250</span></p>
                            <p>Assignments: <span class="font-medium text-gray-900 dark:text-white">320</span></p>
                            <p>Rating: <span class="font-medium text-yellow-500">★ 4.6</span></p>
                            <p>Attendance: <span class="font-medium text-green-600">98%</span></p>
                        </div>
                    </div>

                    <!-- CARD -->
                    <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md hover:shadow-xl transition">
                        <h4 class="font-semibold mb-3">📍 Address</h4>
                        <div class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            <p>Mumbai, Maharashtra</p>
                            <p>Pincode: 400001</p>
                        </div>
                    </div>

                    <!-- CARD -->
                    <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md hover:shadow-xl transition">
                        <h4 class="font-semibold mb-3">🩺 Health & Emergency</h4>
                        <div class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            <p>Blood Group: <span class="font-medium text-red-600 dark:text-red-400">B+</span></p>
                            <p>Medical Condition: <span class="font-medium text-gray-900 dark:text-white">None</span>
                            </p>
                        </div>
                    </div>

                    <!-- CARD -->
                    <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md hover:shadow-xl transition">
                        <h4 class="font-semibold mb-3">Emergency Contact</h4>
                        <div class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            <p>Name: <span class="font-medium text-gray-900 dark:text-white">Suresh Sharma</span></p>
                            <p>Relation: <span class="font-medium text-gray-900 dark:text-white">Brother</span></p>
                            <p>Phone: <span class="font-medium text-gray-900 dark:text-white">9876501234</span></p>
                        </div>
                    </div>

                    <!-- CARD -->
                    <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md hover:shadow-xl transition">
                        <h4 class="font-semibold mb-3">⚙️ System</h4>
                        <div class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            <p>Username: <span class="font-medium text-gray-900 dark:text-white">rahul102</span></p>
                            <p>Status: <span class="text-green-600 font-medium">Active</span></p>
                            <p>Last Login: <span class="font-medium text-gray-900 dark:text-white">Yesterday</span></p>
                        </div>
                    </div>

                </div>
    `;
}

function closeModal() {
    document.getElementById('teacherModal').classList.add('hidden');
}

function openAddTeacher() {
    document.getElementById('addTeacherSection').classList.remove('hidden');
}

function closeAddTeacher() {
    document.getElementById('addTeacherSection').classList.add('hidden');
}
function previewImg(event) {
    const reader = new FileReader();
    reader.onload = function () {
        document.getElementById('previewImage').src = reader.result;
    };
    reader.readAsDataURL(event.target.files[0]);
}




// ======================= STAFF MANAGEMENT SECTION START =================
const staff = [
    {
        id: "ST101",
        name: "Ramesh Patil",
        role: "Accountant",
        department: "Accounts",
        status: "Active",
        mobile: "9876543210",
        experience: "8 Years"
    },
    {
        id: "ST102",
        name: "Sunita Joshi",
        role: "Clerk",
        department: "Admin",
        status: "Leave",
        mobile: "9876500000",
        experience: "5 Years"
    }
];

function loadStaff(data = staff) {
    const container = document.getElementById('staffList');
    container.innerHTML = '';

    let active = 0, leave = 0;
    let deptSet = new Set();

    data.forEach(s => {

        if (s.status === "Active") active++;
        else leave++;

        deptSet.add(s.department);

        container.innerHTML += `
        <div onclick="openStaffModal('${s.id}')"
            class="flex justify-between items-center p-3 rounded-xl border hover:bg-gray-50 cursor-pointer">

            <div class="flex items-center gap-3">

                <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700">
                    ${s.name.charAt(0)}
                </div>

                <div>
                    <p class="font-medium">${s.name}</p>
                    <p class="text-xs text-gray-500">
                        ${s.role} • ${s.department}
                    </p>
                </div>

            </div>

            <span class="text-xs px-2 py-1 rounded-full 
                ${s.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}">
                ${s.status}
            </span>

        </div>
        `;
    });

    // stats
    document.getElementById('totalStaff').innerText = staff.length;
    document.getElementById('activeStaff').innerText = active;
    document.getElementById('leaveStaff').innerText = leave;
    document.getElementById('totalDept').innerText = deptSet.size;
}

loadStaff();

function applyStaffFilter() {
    const search = document.getElementById('searchStaff').value.toLowerCase();
    const dept = document.getElementById('deptFilter').value;
    const status = document.getElementById('statusFilterStaff').value;

    const filtered = staff.filter(s => {
        return (
            s.name.toLowerCase().includes(search) &&
            (dept ? s.department === dept : true) &&
            (status ? s.status === status : true)
        );
    });

    loadStaff(filtered);
}

function openStaffModal(id) {
    const s = staff.find(x => x.id === id);

    document.getElementById('staffModal').classList.remove('hidden');
    document.getElementById('staffModal').classList.add('flex');

    document.getElementById('staffModalContent').innerHTML = `
    
    <div class="bg-gradient-to-r from-gray-700 to-black text-white p-5 rounded-xl mb-4">
        <h2 class="text-xl font-bold">${s.name}</h2>
        <p class="text-sm">${s.role} • ${s.department}</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">

        <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-semibold mb-2">👤 Personal</h4>
            <p>ID: <b>${s.id}</b></p>
            <p>Mobile: <b>${s.mobile}</b></p>
        </div>

        <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-semibold mb-2">💼 Work</h4>
            <p>Role: <b>${s.role}</b></p>
            <p>Department: <b>${s.department}</b></p>
            <p>Experience: <b>${s.experience}</b></p>
        </div>

        <div class="bg-gray-50 p-4 rounded-lg col-span-2">
            <h4 class="font-semibold mb-2">📍 Address</h4>
            <p>Mumbai, Maharashtra - 400001</p>
        </div>

    </div>
    `;
}

function closeStaffModal() {
    document.getElementById('staffModal').classList.add('hidden');
}


function toggleRoleFields() {
    const role = document.getElementById('roleSelect').value;

    const teacherFields = document.getElementById('teacherFields');
    const staffFields = document.getElementById('staffFields');

    if (role === "teacher") {
        teacherFields.classList.remove('hidden');
        staffFields.classList.add('hidden');
    } else {
        teacherFields.classList.add('hidden');
        staffFields.classList.remove('hidden');
    }
}

function openAddStaff() {
    document.getElementById('addStaffSection').classList.remove('hidden');
}

function closeAddStaff() {
    document.getElementById('addStaffSection').classList.add('hidden');
}

function previewStaffImg(event) {
    const reader = new FileReader();
    reader.onload = function () {
        document.getElementById('staffPreviewImage').src = reader.result;
    };
    reader.readAsDataURL(event.target.files[0]);
}

// ========== ROLE & PERMISSION CORE ENGINE ==========

const modules = ["Students", "Teachers", "Attendance", "Exams", "Fees", "Library", "HR", "Reports"];

const roles = [
    { name: "Super Admin", permissions: { "Reports": { view: true, create: true, edit: true, delete: true } } },
    { name: "Teacher", permissions: { "Attendance": { view: true, create: true, edit: true, delete: false } } },
    { name: "Accountant", permissions: { "Fees": { view: true, create: true, edit: true, delete: false } } }
];

const users = [
    { id: 1, name: "Rahul Sharma", role: "Teacher", type: "teaching", customPermissions: {} },
    { id: 2, name: "Aisha Khan", role: "Accountant", type: "nonTeaching", customPermissions: {} },
    { id: 3, name: "Priya Desai", role: "Teacher", type: "teaching", customPermissions: {} }
];

let selectedRoleIndex = null;
let currentSelectedUser = null;

// --- ROLE LOGIC ---

function loadRoles() {
    const container = document.getElementById("roleList");
    container.innerHTML = roles.map((role, index) => `
        <div onclick="selectRole(${index})" 
             class="group p-4 rounded-xl cursor-pointer border transition-all duration-200 ${selectedRoleIndex === index ? 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-200 shadow-lg' : 'bg-white border-slate-100 hover:border-indigo-300 hover:bg-indigo-50'}">
            <div class="flex justify-between items-center">
                <span class="font-bold ${selectedRoleIndex === index ? 'text-white' : 'text-slate-700'}">${role.name}</span>
                <span class="text-xs opacity-40 group-hover:opacity-100 transition-opacity">➔</span>
            </div>
        </div>
    `).join("");
}

function selectRole(index) {
    selectedRoleIndex = index;
    document.getElementById("selectedRoleTitle").innerText = roles[index].name;
    loadRoles();
    renderRoleTable();
}

function renderRoleTable() {
    const table = document.getElementById("permissionTable");
    const role = roles[selectedRoleIndex];
    table.innerHTML = modules.map(mod => `
        <tr class="hover:bg-slate-50/80 transition">
            <td class="p-4 font-bold text-slate-700">${mod}</td>
            ${["view", "create", "edit", "delete"].map(act => `
                <td class="p-4 text-center">
                    <input type="checkbox" class="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                           ${role.permissions[mod]?.[act] ? 'checked' : ''} 
                           onchange="updateRoleKey('${mod}', '${act}', this.checked)">
                </td>
            `).join("")}
        </tr>
    `).join("");
}

function updateRoleKey(mod, act, val) {
    if (!roles[selectedRoleIndex].permissions[mod]) roles[selectedRoleIndex].permissions[mod] = {};
    roles[selectedRoleIndex].permissions[mod][act] = val;
}

// --- USER OVERRIDE LOGIC ---

function filterUsers() {
    const type = document.getElementById("staffTypeFilter").value;
    const select = document.getElementById("userSelect");
    const filtered = type ? users.filter(u => u.type === type) : users;

    select.innerHTML = '<option value="">Choose User...</option>' +
        filtered.map(u => `<option value="${u.id}">${u.name} (${u.role})</option>`).join("");
}

function selectUser(userId) {
    currentSelectedUser = users.find(u => u.id == userId);
    const panel = document.getElementById("userOverridePanel");

    if (!currentSelectedUser) { panel.classList.add("hidden"); return; }

    panel.classList.remove("hidden");
    document.getElementById("userName").innerText = currentSelectedUser.name;
    document.getElementById("userInitial").innerText = currentSelectedUser.name.charAt(0);
    document.getElementById("userBaseRole").innerText = `Base Role: ${currentSelectedUser.role}`;

    renderUserTable();
}

function renderUserTable() {
    const table = document.getElementById("userPermissionTable");
    const baseRole = roles.find(r => r.name === currentSelectedUser.role);

    table.innerHTML = modules.map(mod => {
        return `<tr>
            <td class="p-3 font-semibold text-slate-600">${mod}</td>
            ${["view", "create", "edit", "delete"].map(act => {
            const roleVal = baseRole?.permissions[mod]?.[act] || false;
            const customVal = currentSelectedUser.customPermissions[mod]?.[act];

            // Final value: Custom if defined, otherwise Role
            const finalVal = (customVal !== undefined) ? customVal : roleVal;
            const isOverridden = customVal !== undefined;

            return `
                <td class="p-3 text-center ${isOverridden ? 'bg-amber-50/50' : ''}">
                    <input type="checkbox" class="w-4 h-4 rounded text-emerald-600" 
                           ${finalVal ? 'checked' : ''} 
                           onchange="updateUserOverride('${mod}', '${act}', this.checked)">
                    ${isOverridden ? '<div class="text-[8px] text-amber-600 font-black uppercase leading-none mt-1">Manual</div>' : ''}
                </td>`;
        }).join("")}
        </tr>`;
    }).join("");
}

function updateUserOverride(mod, act, val) {
    if (!currentSelectedUser.customPermissions[mod]) currentSelectedUser.customPermissions[mod] = {};
    currentSelectedUser.customPermissions[mod][act] = val;
    renderUserTable(); // Refresh to show "Manual" badge
}

function savePermissions() { alert("System Roles updated successfully!"); }
function saveUserPermissions() { alert("Individual user overrides saved!"); }

// Initialize
loadRoles();
filterUsers();


// =========== EXAM and RESULT ===============
// Demo Logic
function toggleDetails(className) {
    const detailSec = document.getElementById('classDetails');
    const nameDisplay = document.getElementById('selectedClassName');
    detailSec.classList.remove('hidden');
    nameDisplay.innerText = className.replace('grade', 'Grade ').replace('A', '-A').replace('B', '-B');
    detailSec.scrollIntoView({ behavior: 'smooth' });
}

function hideDetails() {
    document.getElementById('classDetails').classList.add('hidden');
}


// ============== FEES MANAGEMENT LOGIC =====================

// Mock Data for Students Fees
let feeRecords = [
    { id: 'STU101', name: 'Rahul Sharma', class: '10th', batch: '2025-26', total: 50000, paid: 50000, status: 'Paid' },
    { id: 'STU102', name: 'Ayesha Khan', class: '10th', batch: '2025-26', total: 50000, paid: 20000, status: 'Pending' },
    { id: 'STU103', name: 'Vikram Singh', class: '9th', batch: '2025-26', total: 45000, paid: 0, status: 'Pending' }
];

function filterFees() {
    const selectedBatch = document.getElementById('feeBatch').value;
    const selectedClass = document.getElementById('feeClass').value;
    const selectedStatus = document.getElementById('feeStatus').value;

    const filtered = feeRecords.filter(record => {
        return (selectedBatch === 'all' || record.batch === selectedBatch) &&
            (selectedClass === 'all' || record.class === selectedClass) &&
            (selectedStatus === 'all' || record.status === selectedStatus);
    });

    renderFeeTable(filtered);
}

function renderFeeTable(data) {
    const tbody = document.getElementById('feeTableBody');
    tbody.innerHTML = '';

    data.forEach(student => {
        const balance = student.total - student.paid;
        const statusColor = student.status === 'Paid' ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50';

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-4">
                    <div class="font-bold text-gray-800">${student.name}</div>
                    <div class="text-[10px] text-gray-400 font-mono">${student.id} | ${student.batch}</div>
                </td>
                <td class="p-4 font-semibold">₹${student.total}</td>
                <td class="p-4 text-emerald-600">₹${student.paid}</td>
                <td class="p-4 text-red-500 font-bold">₹${balance}</td>
                <td class="p-4">
                    <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase ${statusColor}">
                        ${student.status}
                    </span>
                </td>
                <td class="p-4 text-right space-x-2">
                    <button onclick="collectFeePrompt('${student.id}')" class="text-blue-600 hover:underline font-medium text-xs">Collect</button>
                    <button onclick="printReceipt('${student.id}')" class="bg-gray-100 p-2 rounded-lg hover:bg-gray-200">
                        🖨️
                    </button>
                </td>
            </tr>
        `;
    });
}

function printReceipt(studentId) {
    const student = feeRecords.find(s => s.id === studentId);
    if (!student) return;

    // Populate Print Template
    document.getElementById('rName').innerText = student.name;
    document.getElementById('rID').innerText = student.id;
    document.getElementById('rClass').innerText = student.class;
    document.getElementById('rAmount').innerText = "₹" + student.paid;
    document.getElementById('rDate').innerText = new Date().toLocaleDateString();
    document.getElementById('rNo').innerText = Math.floor(Math.random() * 10000);

    // Print Logic
    const printContents = document.getElementById('receiptPrintArea').innerHTML;
    const originalContents = document.body.innerHTML;

    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload(); // Reload to restore UI event listeners
}

function collectFeePrompt(studentId) {
    const amount = prompt("Enter amount to collect:");
    if (amount) {
        const student = feeRecords.find(s => s.id === studentId);
        student.paid += parseInt(amount);
        if (student.paid >= student.total) student.status = 'Paid';
        filterFees(); // Refresh table
        alert("Payment Recorded!");
    }
}

// Initialize
renderFeeTable(feeRecords);


// ============== FINANCIAL REPORTS LOGIC =====================

const transactions = [
    { id: 'TXN-9901', entity: 'Rahul Sharma', category: 'Admission Fee', method: 'Online', amount: 50000, date: '2026-04-10' },
    { id: 'TXN-9902', entity: 'Vendor: Office Depot', category: 'Maintenance', method: 'Cheque', amount: -4500, date: '2026-04-11' },
    { id: 'TXN-9903', entity: 'Ayesha Khan', category: 'Tuition Fee', method: 'Cash', amount: 20000, date: '2026-04-12' },
    { id: 'TXN-9904', entity: 'Staff Salaries', category: 'Payroll', method: 'Transfer', amount: -250000, date: '2026-04-13' },
    { id: 'TXN-9905', entity: 'Vikram Singh', category: 'Library Fine', method: 'Online', amount: 250, date: '2026-04-14' }
];

function renderAuditTable() {
    const tbody = document.getElementById('auditTableBody');
    tbody.innerHTML = '';

    transactions.forEach(txn => {
        const isExpense = txn.amount < 0;
        const amountDisplay = Math.abs(txn.amount).toLocaleString('en-IN', {
            style: 'currency',
            currency: 'INR'
        });

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-4 font-mono text-xs text-slate-400">${txn.id}</td>
                <td class="p-4 font-bold text-slate-700">${txn.entity}</td>
                <td class="p-4">
                    <span class="px-2 py-1 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                        ${txn.category}
                    </span>
                </td>
                <td class="p-4 text-slate-500 text-xs">${txn.method}</td>
                <td class="p-4 font-bold ${isExpense ? 'text-red-500' : 'text-emerald-600'}">
                    ${isExpense ? '-' : '+'} ${amountDisplay}
                </td>
                <td class="p-4 text-slate-400 text-xs">${txn.date}</td>
            </tr>
        `;
    });
}

function exportFullAudit() {
    let csv = "ID,Entity,Category,Method,Amount,Date\n";
    transactions.forEach(t => {
        csv += `${t.id},${t.entity},${t.category},${t.method},${t.amount},${t.date}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'School_Financial_Audit_2026.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Initial Run
renderAuditTable();


// ============== ASSETS MANAGEMENT LOGIC =====================

const assetsData = [
    { code: 'IT-PC-001', name: 'Dell Optiplex 7050', category: 'Electronics', location: 'Lab 1', date: '2024-05-12', value: 45000, status: 'Operational' },
    { code: 'FUR-DK-12', name: 'Office Desk - Oak', category: 'Furniture', location: 'Admin Office', date: '2023-01-20', value: 12000, status: 'Operational' },
    { code: 'LAB-MIC-04', name: 'Compound Microscope', category: 'Lab', location: 'Bio Lab', date: '2025-02-15', value: 8500, status: 'Under Repair' },
    { code: 'VEH-BUS-01', name: 'School Bus (MH-04)', category: 'Vehicles', location: 'Parking', date: '2022-11-10', value: 2200000, status: 'Operational' },
    { code: 'IT-PROJ-09', name: 'Epson Projector', category: 'Electronics', location: 'Class 10A', date: '2024-08-05', value: 35000, status: 'Retired' }
];

/**
 * Render Assets Table
 */
function renderAssets(filter = 'All') {
    const tbody = document.getElementById('assetTableBody');
    tbody.innerHTML = '';

    const filtered = filter === 'All' ? assetsData : assetsData.filter(a => a.category === filter);

    filtered.forEach(asset => {
        const statusClass = {
            'Operational': 'text-emerald-600 bg-emerald-50',
            'Under Repair': 'text-amber-600 bg-amber-50',
            'Retired': 'text-slate-400 bg-slate-100'
        }[asset.status];

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50/50 transition group">
                <td class="p-4">
                    <div class="font-bold text-slate-700">${asset.name}</div>
                    <div class="text-[10px] text-slate-400 font-mono tracking-tighter">${asset.code}</div>
                </td>
                <td class="p-4 text-xs font-semibold text-slate-500">${asset.category}</td>
                <td class="p-4 text-xs text-slate-600">${asset.location}</td>
                <td class="p-4 text-xs text-slate-400">${asset.date}</td>
                <td class="p-4 font-bold text-slate-700">₹${asset.value.toLocaleString()}</td>
                <td class="p-4">
                    <span class="px-2 py-1 rounded-lg text-[10px] font-black uppercase ${statusClass}">
                        ${asset.status}
                    </span>
                </td>
                <td class="p-4 text-right">
                    <button onclick="editAsset('${asset.code}')" class="text-indigo-500 opacity-0 group-hover:opacity-100 transition p-2 hover:bg-indigo-50 rounded-lg">
                        Edit
                    </button>
                </td>
            </tr>
        `;
    });
}

/**
 * Tab Filtering Logic
 */
function filterAssets(category) {
    // Update button UI
    document.querySelectorAll('.asset-tab').forEach(btn => {
        btn.classList.remove('active', 'bg-indigo-600', 'text-white');
        btn.classList.add('text-slate-500');
    });
    
    event.target.classList.add('active', 'bg-indigo-600', 'text-white');
    event.target.classList.remove('text-slate-500');

    renderAssets(category);
}

// Initial Call
renderAssets();


// ============== PAYROLL MANAGEMENT LOGIC =====================

const staffPayrollData = [
    { id: 'STF-001', name: 'Dr. Anjali Mehta', type: 'Teaching', basic: 60000, allowance: 5000, deduction: 2000, status: 'Pending' },
    { id: 'STF-002', name: 'Rajesh Kumar', type: 'Non-Teaching', basic: 25000, allowance: 2000, deduction: 500, status: 'Paid' },
    { id: 'STF-003', name: 'Suman Rao', type: 'Teaching', basic: 55000, allowance: 4000, deduction: 1500, status: 'Pending' },
    { id: 'STF-004', name: 'Vikram Singh', type: 'Non-Teaching', basic: 18000, allowance: 1000, deduction: 0, status: 'Paid' },
    { id: 'STF-005', name: 'Contract Security', type: 'Contract', basic: 15000, allowance: 0, deduction: 0, status: 'Pending' }
];

/**
 * Render Payroll Table
 */
function renderPayrollTable() {
    const tbody = document.getElementById('payrollTableBody');
    const filter = document.getElementById('staffCategoryFilter').value;
    tbody.innerHTML = '';

    const filteredData = filter === 'All' ? staffPayrollData : staffPayrollData.filter(s => s.type === filter);

    filteredData.forEach(staff => {
        const netPayable = (staff.basic + staff.allowance) - staff.deduction;
        const statusColor = staff.status === 'Paid' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50';

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50/50 transition">
                <td class="p-4">
                    <div class="font-bold text-slate-800">${staff.name}</div>
                    <div class="text-[10px] text-slate-400 font-bold uppercase tracking-tight">${staff.id} | ${staff.type}</div>
                </td>
                <td class="p-4 text-slate-600 font-medium">₹${staff.basic.toLocaleString()}</td>
                <td class="p-4 text-emerald-500 font-medium">+ ₹${staff.allowance.toLocaleString()}</td>
                <td class="p-4 text-red-400 font-medium">- ₹${staff.deduction.toLocaleString()}</td>
                <td class="p-4 font-black text-slate-900">₹${netPayable.toLocaleString()}</td>
                <td class="p-4">
                    <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase ${statusColor}">
                        ${staff.status}
                    </span>
                </td>
                <td class="p-4 text-right">
                    ${staff.status === 'Pending' ? 
                        `<button onclick="paySalary('${staff.id}')" class="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition">
                            Pay Now
                        </button>` : 
                        `<button class="text-slate-400 text-xs font-bold flex items-center justify-end gap-1 ml-auto">
                            <span>Payslip</span> <span class="text-lg">↓</span>
                        </button>`
                    }
                </td>
            </tr>
        `;
    });
}

/**
 * Process Single Payment
 */
function paySalary(staffId) {
    const staff = staffPayrollData.find(s => s.id === staffId);
    if (confirm(`Confirm salary disbursement for ${staff.name}?`)) {
        staff.status = 'Paid';
        renderPayrollTable();
        // Here you would typically make an API call to record the transaction
    }
}

/**
 * Bulk Disbursement
 */
function processBulkPayroll() {
    const pendingCount = staffPayrollData.filter(s => s.status === 'Pending').length;
    if (pendingCount === 0) return alert("All staff members have already been paid.");
    
    if (confirm(`Are you sure you want to disburse salary for ${pendingCount} staff members?`)) {
        staffPayrollData.forEach(s => s.status = 'Paid');
        renderPayrollTable();
        alert("Bulk payment processed successfully!");
    }
}

// Initial Call
renderPayrollTable();


