// ================== ASSIGNMENTS SECTION =========================
function toggleClass(header) {
    const allBodies = document.querySelectorAll("#assignmentsSection .bg-white > div:nth-child(2)");
    const allArrows = document.querySelectorAll(".arrow");

    const body = header.nextElementSibling;
    const arrow = header.querySelector(".arrow");

    // Close all
    allBodies.forEach(b => b.classList.add("hidden"));
    allArrows.forEach(a => a.classList.remove("rotate-180"));

    // Open clicked
    body.classList.remove("hidden");
    arrow.classList.add("rotate-180");
}

function openAssignmentDetail() {
    document.getElementById("assignmentDetailModal").classList.remove("hidden");
}

function closeAssignmentDetail() {
    document.getElementById("assignmentDetailModal").classList.add("hidden");
}

// ================== ATTENDACE SECTION =========================
function markPresent(btn) {
    const row = btn.closest(".attendance-row");
    const buttons = row.querySelectorAll("button");

    buttons.forEach(b => b.classList.remove("bg-green-500", "text-white", "bg-red-500"));

    btn.classList.add("bg-green-500", "text-white");

    updateCounts();
}

function markAbsent(btn) {
    const row = btn.closest(".attendance-row");
    const buttons = row.querySelectorAll("button");

    buttons.forEach(b => b.classList.remove("bg-green-500", "text-white", "bg-red-500"));

    btn.classList.add("bg-red-500", "text-white");

    updateCounts();
}

function markAllPresent() {
    document.querySelectorAll(".attendance-row button:first-child").forEach(btn => {
        markPresent(btn);
    });
}

function markAllAbsent() {
    document.querySelectorAll(".attendance-row button:nth-child(2)").forEach(btn => {
        markAbsent(btn);
    });
}

function updateCounts() {
    let present = 0, absent = 0, total = document.querySelectorAll(".attendance-row").length;

    document.querySelectorAll(".attendance-row").forEach(row => {
        if (row.querySelector(".bg-green-500")) present++;
        if (row.querySelector(".bg-red-500")) absent++;
    });

    document.getElementById("presentCount").innerText = present;
    document.getElementById("absentCount").innerText = absent;
    document.getElementById("pendingCount").innerText = total - (present + absent);
}


// ================== MY CLASS SECTION =========================
function openClassDetail() {
    document.getElementById("classDetailModal").classList.remove("hidden");
}

function closeClassDetail() {
    document.getElementById("classDetailModal").classList.add("hidden");
}

function openStudentProfile() {
    document.getElementById("studentProfileModal").classList.remove("hidden");
}

function closeStudentProfile() {
    document.getElementById("studentProfileModal").classList.add("hidden");
}

// ====================== TIME TABLE ================================
function highlightCurrentPeriod() {
    const now = new Date();
    const hour = now.getHours();

    document.querySelectorAll('[data-time]').forEach(el => {
        const [start] = el.dataset.time.split('-');
        const startHour = parseInt(start);

        if (hour === startHour) {
            el.classList.add('ring-2', 'ring-indigo-500');
        }
    });
}

highlightCurrentPeriod();


// ============================ NOTICE TAB SWITCH ============================
// SWITCH TAB
function switchNoticeTab(tab) {
    document.getElementById('receivedTab').classList.add('hidden');
    document.getElementById('sentTab').classList.add('hidden');

    document.getElementById(tab + 'Tab').classList.remove('hidden');

    document.querySelectorAll('.notice-tab').forEach(btn => {
        btn.classList.remove('text-indigo-600', 'border-indigo-600', 'font-medium');
        btn.classList.add('text-gray-500');
    });

    event.target.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600', 'font-medium');
}

// MARK AS READ
function markAsRead(btn) {
    const card = btn.closest('.notice');
    card.classList.remove('unread');

    btn.remove();

    // decrease count
    const count = document.getElementById('receivedCount');
    let val = parseInt(count.innerText);
    if (val > 0) count.innerText = val - 1;
}


// =========================================================================
//                   EXAM MATRIX ENGINE AND MARKS MANAGEMENT SYSTEM
// =========================================================================

// CONFIGURATION SCHEMAS RECEIVED FROM ADMIN CONFIGURATION CONTROL MANIFESTS
const componentsLayout = ["Internal", "External", "Oral", "Practical"];

// SEED STUDENT REPOSITORY DATA (EXTENDED WITH ADAPTIVE SCHEMAS FOR EVALUATIONS)
let students = [
    { 
        id: 1, 
        name: "Aditya Patil", 
        roll: "01", 
        division: "10-A", 
        // Architecture handles isolated evaluations independently across multi-criteria matrices
        evaluations: {
            "Mathematics": {
                "Unit Test 1": { earned: [14, 38, 8, 15], max: [20, 50, 10, 20], status: "Draft" }
            }
        }
    },
    { 
        id: 2, 
        name: "Digvijay Patil", 
        roll: "02", 
        division: "10-A", 
        evaluations: {} 
    }
];

let currentIndex = 0;

// HELPER STATE UTILITIES TO MAP DOM SELECTIONS
function getActiveConfigurationContext() {
    return {
        subject: document.getElementById("filterSubject")?.value || "Mathematics",
        exam: document.getElementById("filterExam")?.value || "Unit Test 1"
    };
}

// DETAILED COMPONENT MAXIMUM LABELS FALLBACK STRUCTURE 
function getDefaultComponentMaxBounds(component) {
    switch (component) {
        case "Internal": return 20;
        case "External": return 50;
        case "Oral": return 10;
        case "Practical": return 20;
        default: return 100;
    }
}

// RENDERING PIPELINE ENGINE - BINDS MEMORY POINTERS TO SYSTEM INTERFACE
function filterAndRenderStudents() {
    const container = document.getElementById("studentListContainer");
    if (!container) return;

    const classFilter = document.getElementById("filterClass").value;
    const searchQuery = document.getElementById("studentSearchInput").value.toLowerCase();
    const ctx = getActiveConfigurationContext();

    let htmlBuffer = "";

    // Iterate across active contextual array
    students.forEach((student, index) => {
        // Evaluate filter criteria match
        if (classFilter !== "All" && student.division !== classFilter) return;
        if (searchQuery && !student.name.toLowerCase().includes(searchQuery)) return;

        // Extract situational status properties tracking back validation pipeline 
        const examRecord = student.evaluations[ctx.subject]?.[ctx.exam];
        let status = "Pending";
        let displayBadgeClass = "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400";

        if (examRecord) {
            status = examRecord.status;
            if (status === "Draft") {
                displayBadgeClass = "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400";
            } else if (status === "Pending Admin Verification") {
                displayBadgeClass = "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400";
            } else if (status === "Published") {
                displayBadgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400";
            }
        }

        htmlBuffer += `
        <div class="student-row p-4 flex flex-wrap justify-between items-center hover:bg-gray-50/50 dark:hover:bg-slate-700/20 transition gap-4">
            <div>
                <p class="student-name text-sm font-semibold text-gray-900 dark:text-white">${student.name}</p>
                <p class="text-xs text-gray-400">Roll ${student.roll} • Division ${student.division}</p>
            </div>
            <div class="flex items-center gap-3">
                <span class="px-2.5 py-1 text-xs font-medium rounded-full ${displayBadgeClass}">
                    ${status}
                </span>
                <button onclick="openMarksModal(${index})" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-xl transition shadow-sm active:scale-95">
                    Enter Marks
                </button>
                <button onclick="openReportCard(${index})" class="px-3 py-1.5 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                    View Ledger
                </button>
            </div>
        </div>`;
    });

    if (!htmlBuffer) {
        htmlBuffer = `<div class="p-8 text-center text-xs text-gray-400">No student matching selected workspace query criteria found.</div>`;
    }

    container.innerHTML = htmlBuffer;
}

// MODAL WINDOW INTERACTIVE HANDLERS
function openMarksModal(index) {
    currentIndex = index;
    document.getElementById("marksModal").classList.remove("hidden");
    loadStudentModalData();
}

function closeMarksModal() {
    document.getElementById("marksModal").classList.add("hidden");
}

// PROGRAMMATIC EVALUATION MATRIX GENERATOR (EARNED VS OUT OF MATCH)
function loadStudentModalData() {
    const student = students[currentIndex];
    const ctx = getActiveConfigurationContext();

    document.getElementById("studentModalName").textContent = student.name;
    document.getElementById("studentModalMeta").textContent = `Roll: ${student.roll} | Division: ${student.division}`;
    document.getElementById("modalActiveExamSubject").textContent = `${ctx.exam} - ${ctx.subject}`;

    const record = student.evaluations[ctx.subject]?.[ctx.exam];
    const gridContainer = document.getElementById("dynamicInputMarkGrid");
    gridContainer.innerHTML = "";

    componentsLayout.forEach((component, i) => {
        // Determine values matching evaluation history or structural standard initialization
        const defaultMax = getDefaultComponentMaxBounds(component);
        const earnedVal = record ? (record.earned[i] !== undefined ? record.earned[i] : "") : "";
        const maxVal = record ? (record.max[i] !== undefined ? record.max[i] : defaultMax) : defaultMax;

        const boxHTML = `
        <div class="bg-gray-50 dark:bg-slate-800 p-3 rounded-xl border dark:border-slate-700 space-y-1.5">
            <label class="block text-[11px] font-bold tracking-wide uppercase text-gray-500 dark:text-gray-400">${component}</label>
            <div class="flex items-center gap-1.5">
                <input type="number" value="${earnedVal}" placeholder="Earned" 
                    class="mark-earned-input w-full px-2 py-1 text-sm rounded bg-white dark:bg-slate-700 border dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center font-medium"
                    oninput="validateAndRecalculateRealTime(this, ${i})">
                <span class="text-gray-400 text-xs">/</span>
                <input type="number" value="${maxVal}" placeholder="Max" 
                    class="mark-max-input w-full px-2 py-1 text-sm rounded bg-white dark:bg-slate-700 border dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center text-gray-500 dark:text-gray-400"
                    oninput="validateAndRecalculateRealTime(this, ${i})">
            </div>
        </div>`;
        gridContainer.insertAdjacentHTML("beforeend", boxHTML);
    });

    calculateModalMetrics();
}

// INPUT LEVEL REACTIONARY CHECKS AND CAP CONTROLS
function validateAndRecalculateRealTime(inputElement, index) {
    const rowContainer = inputElement.closest('.flex');
    const earnedInput = rowContainer.querySelector('.mark-earned-input');
    const maxInput = rowContainer.querySelector('.mark-max-input');

    let earnedValue = parseFloat(earnedInput.value) || 0;
    let maxValue = parseFloat(maxInput.value) || 0;

    // Boundary constraints rule enforcement
    if (earnedValue < 0) { earnedValue = 0; earnedInput.value = 0; }
    if (maxValue < 0) { maxValue = 0; maxInput.value = 0; }
    
    if (earnedValue > maxValue) {
        earnedValue = maxValue;
        earnedInput.value = earnedValue;
    }

    calculateModalMetrics();
}

// METRICS ENGINE - CALCULATES ACCURATE FRACTIONAL PERCENTAGES AND GRADES
function calculateModalMetrics() {
    const earnedInputs = document.querySelectorAll(".mark-earned-input");
    const maxInputs = document.querySelectorAll(".mark-max-input");

    let aggregateEarned = 0;
    let aggregatePossibleMax = 0;

    earnedInputs.forEach((input, idx) => {
        const eVal = parseFloat(input.value) || 0;
        const mVal = parseFloat(maxInputs[idx].value) || 0;
        aggregateEarned += eVal;
        aggregatePossibleMax += mVal;
    });

    let exactPercent = 0;
    if (aggregatePossibleMax > 0) {
        exactPercent = (aggregateEarned / aggregatePossibleMax) * 100;
    }

    document.getElementById("modalTotal").textContent = aggregateEarned;
    document.getElementById("modalMaxTotal").textContent = aggregatePossibleMax;
    document.getElementById("modalPercent").textContent = exactPercent.toFixed(1) + "%";
    document.getElementById("modalGrade").textContent = determineCalculatedGrade(exactPercent);
}

// STANDARDIZED SCORING GRADE CHART MAPPER
function determineCalculatedGrade(percentage) {
    if (percentage >= 90) return "A+";
    if (percentage >= 75) return "A";
    if (percentage >= 60) return "B";
    if (percentage >= 40) return "C";
    return "F";
}

// DATA WRITERS MAPPING CHANGES INTO THE SIMULATED VOLATILE MEMORY ARRAYS
function captureFormStateDataPayload(targetStatusString) {
    const earnedInputs = document.querySelectorAll(".mark-earned-input");
    const maxInputs = document.querySelectorAll(".mark-max-input");

    const earnedDataArray = [];
    const maxDataArray = [];

    earnedInputs.forEach((input, index) => {
        const eVal = parseFloat(input.value) || 0;
        const mVal = parseFloat(maxInputs[index].value) || 0;
        earnedDataArray.push(eVal);
        maxDataArray.push(mVal);
    });

    const ctx = getActiveConfigurationContext();
    const student = students[currentIndex];

    if (!student.evaluations[ctx.subject]) {
        student.evaluations[ctx.subject] = {};
    }

    student.evaluations[ctx.subject][ctx.exam] = {
        earned: earnedDataArray,
        max: maxDataArray,
        status: targetStatusString
    };

    filterAndRenderStudents();
}

function saveDraftMarks() {
    captureFormStateDataPayload("Draft");
    showToast("Evaluation progress cached locally as Draft 📁");
}

function submitToAdminPipeline() {
    captureFormStateDataPayload("Pending Admin Verification");
    showToast("Marks routing executed to Admin pipeline verification desk 🚀");
    closeMarksModal();
}

// DYNAMIC RUNTIME EVALUATOR FOR ACADEMIC RECORD CARDS
function openReportCard(studentIndex) {
    const student = students[studentIndex];
    const reportMeta = document.getElementById("reportStudentMeta");
    const tableBody = document.getElementById("reportCardTableBody");

    if (!reportMeta || !tableBody) return;

    // Map configuration fields onto container layout
    reportMeta.innerHTML = `
        <div><b>Full Name:</b> ${student.name}</div>
        <div><b>Roll Reference:</b> ${student.roll}</div>
        <div><b>Class Designation:</b> ${student.division}</div>
        <div><b>Academic Cycle:</b> 2025-2026</div>
    `;

    tableBody.innerHTML = "";
    let cumulativeEarned = 0;
    let cumulativeMax = 0;
    let recordsCount = 0;

    // Loop nested object metrics to build custom arrays dynamically
    Object.keys(student.evaluations).forEach(subject => {
        Object.keys(student.evaluations[subject]).forEach(exam => {
            const entry = student.evaluations[subject][exam];
            recordsCount++;

            let rowTotalEarned = 0;
            let rowTotalMax = 0;
            entry.earned.forEach((v, i) => {
                rowTotalEarned += v;
                rowTotalMax += entry.max[i] || 0;
            });

            cumulativeEarned += rowTotalEarned;
            cumulativeMax += rowTotalMax;

            const rowPercent = rowTotalMax > 0 ? (rowTotalEarned / rowTotalMax) * 100 : 0;

            tableBody.innerHTML += `
                <tr class="hover:bg-gray-50 dark:hover:bg-slate-700/10 text-center border-t dark:border-slate-700">
                    <td class="p-3 text-left font-medium text-gray-900 dark:text-white">${subject}</td>
                    <td class="p-3 text-gray-500">${exam}</td>
                    <td class="p-3">${entry.earned[0] ?? 0} / ${entry.max[0] ?? 0}</td>
                    <td class="p-3">${entry.earned[1] ?? 0} / ${entry.max[1] ?? 0}</td>
                    <td class="p-3">${entry.earned[2] ?? 0} / ${entry.max[2] ?? 0}</td>
                    <td class="p-3">${entry.earned[3] ?? 0} / ${entry.max[3] ?? 0}</td>
                    <td class="p-3 font-semibold">${rowTotalEarned} / ${rowTotalMax}</td>
                    <td class="p-3 font-bold text-indigo-600 dark:text-indigo-400">${determineCalculatedGrade(rowPercent)}</td>
                </tr>
            `;
        });
    });

    if (recordsCount === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-gray-400 text-xs">No records verified or published available for summary.</td></tr>`;
        document.getElementById("reportSummaryTotal").textContent = "---";
        document.getElementById("reportSummaryPercent").textContent = "---";
        document.getElementById("reportSummaryGrade").textContent = "---";
    } else {
        const finalCalculatedPercent = cumulativeMax > 0 ? (cumulativeEarned / cumulativeMax) * 100 : 0;
        document.getElementById("reportSummaryTotal").textContent = `${cumulativeEarned} / ${cumulativeMax}`;
        document.getElementById("reportSummaryPercent").textContent = `${finalCalculatedPercent.toFixed(1)}%`;
        document.getElementById("reportSummaryGrade").textContent = determineCalculatedGrade(finalCalculatedPercent);
    }

    document.getElementById("reportCardModal").classList.remove("hidden");
}

function closeReportCard() {
    document.getElementById("reportCardModal").classList.add("hidden");
}

function printReport() {
    window.print();
}

// SEQUENTIAL LISTING DIRECTION ARROW CAROUSEL CONTROLS
function nextStudent() {
    if (currentIndex < students.length - 1) {
        currentIndex++;
        loadStudentModalData();
    } else {
        showToast("Terminal record position reached inside view block.");
    }
}

function prevStudent() {
    if (currentIndex > 0) {
        currentIndex--;
        loadStudentModalData();
    } else {
        showToast("First index record bounds hit inside current view block.");
    }
}

// ACCESSIBILITY & UTILITY EVENT LISTENER HANDLERS
document.addEventListener("keydown", (e) => {
    const modalOpen = !document.getElementById("marksModal").classList.contains("hidden");
    if (!modalOpen) return;

    if (e.key === "ArrowRight") nextStudent();
    if (e.key === "ArrowLeft") prevStudent();
    if (e.key === "Escape") closeMarksModal();
});

function showToast(message) {
    const targetToast = document.createElement("div");
    targetToast.textContent = message;
    targetToast.className = `fixed bottom-5 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs px-4 py-2.5 rounded-xl shadow-xl z-50 transition-all duration-300 transform font-medium tracking-wide`;
    document.body.appendChild(targetToast);
    setTimeout(() => { targetToast.remove(); }, 3000);
}

// SYSTEM APP INITS SETUP
document.addEventListener("DOMContentLoaded", () => {
    filterAndRenderStudents();
});

// ======================== MAIN DASHBOARD Charts ====================================

new Chart(document.getElementById('dashboardAttendanceChart'), {
    type: 'line',
    data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        datasets: [{
            data: [85, 88, 90, 92, 87],
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.1)',
            fill: true
        }]
    }
});

new Chart(document.getElementById('dashboardPerformanceChart'), {
    type: 'bar',
    data: {
        labels: ['10-A', '9-B', '8-C'],
        datasets: [{
            data: [78, 85, 72],
            backgroundColor: '#8b5cf6'
        }]
    }
});


// ======================= ANALYSTICS ==============================
// CLASS PERFORMANCE
const classCtx = document.getElementById('classPerformanceChart');

new Chart(classCtx, {
    type: 'bar',
    data: {
        labels: ['10-A', '9-B', '8-C', '7-A'],
        datasets: [{
            label: 'Average Marks',
            data: [78, 85, 72, 80],
            backgroundColor: '#6366f1'
        }]
    }
});

// SUBJECT ANALYSIS
const subjectCtx = document.getElementById('subjectChart');

new Chart(subjectCtx, {
    type: 'doughnut',
    data: {
        labels: ['Math', 'Science', 'English', 'History'],
        datasets: [{
            data: [80, 75, 85, 70],
            backgroundColor: [
                '#6366f1',
                '#f65c8d',
                '#22c55e',
                '#f59e0b'
            ]
        }]
    },
    options: {
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.label || '';
                        let value = context.raw || 0;
                        return `${label}: ${value}% average marks`;
                    }
                }
            }
        }
    }
});

// SAMPLE DATA (can replace with backend later)
const studentData = [
    { name: "Rahul", class: "10-A", subject: "math", marks: 96 },
    { name: "Sneha", class: "10-A", subject: "math", marks: 92 },
    { name: "Amit", class: "10-A", subject: "math", marks: 45 },
    { name: "Riya", class: "9-B", subject: "science", marks: 50 },
    { name: "Karan", class: "9-B", subject: "science", marks: 52 }
];

// FILTER FUNCTION
document.getElementById("classFilter").addEventListener("change", updateAnalytics);
document.getElementById("subjectFilter").addEventListener("change", updateAnalytics);

function updateAnalytics() {
    const selectedClass = document.getElementById("classFilter").value;
    const selectedSubject = document.getElementById("subjectFilter").value;

    let filtered = studentData;

    if (selectedClass !== "all") {
        filtered = filtered.filter(s => s.class === selectedClass);
    }

    if (selectedSubject !== "all") {
        filtered = filtered.filter(s => s.subject === selectedSubject);
    }

    generateAIInsight(filtered);
}

// AI INSIGHT (SMART LOGIC)
function generateAIInsight(data) {
    const weakStudents = data.filter(s => s.marks < 50);

    let text = "";

    if (weakStudents.length > 0) {
        text = `⚠️ ${weakStudents.length} students need attention: ` +
            weakStudents.map(s => s.name).join(", ");
    } else {
        text = "✅ All students are performing well!";
    }

    document.getElementById("aiInsightText").innerText = text;
}

// INITIAL LOAD
updateAnalytics();

// ================ LEAVE REQUEST ======================
// APPROVE
function approveLeave(btn) {
    const parent = btn.closest("div.flex");
    parent.innerHTML = `
            <span class="text-xs bg-green-100 text-green-600 px-3 py-1 rounded-full">
                Approved
            </span>
        `;
}

// REJECT
function rejectLeave(btn) {
    const parent = btn.closest("div.flex");
    parent.innerHTML = `
            <span class="text-xs bg-red-100 text-red-500 px-3 py-1 rounded-full">
                Rejected
            </span>
        `;
}

// FILTER
document.getElementById("leaveFilter").addEventListener("change", function () {
    const value = this.value;
    const cards = document.querySelectorAll("#leaveList > div");

    cards.forEach(card => {
        const text = card.innerText.toLowerCase();

        if (value === "all" || text.includes(value)) {
            card.style.display = "flex";
        } else {
            card.style.display = "none";
        }
    });
});


// ====================== MY LEAVE SECTION(TEACHER) ===================
let clBalance = 10;
let slBalance = 8;
let usedLeaves = 0;

// AUTO CALCULATE DAYS
document.getElementById("leaveFrom").addEventListener("change", calcDays);
document.getElementById("leaveTo").addEventListener("change", calcDays);

function calcDays() {
    const from = new Date(document.getElementById("leaveFrom").value);
    const to = new Date(document.getElementById("leaveTo").value);

    if (from && to && to >= from) {
        const diff = (to - from) / (1000 * 60 * 60 * 24) + 1;
        document.getElementById("totalDays").innerText = diff;
    }
}

function applyLeave() {
    const from = document.getElementById("leaveFrom").value;
    const to = document.getElementById("leaveTo").value;
    const reason = document.getElementById("leaveReason").value;
    const type = document.getElementById("leaveType").value;
    const days = parseInt(document.getElementById("totalDays").innerText);

    if (!from || !to || !reason || days <= 0) {
        alert("Fill all details correctly");
        return;
    }

    // CHECK BALANCE
    if (type === "CL" && days > clBalance) {
        alert("Not enough Casual Leave balance");
        return;
    }

    if (type === "SL" && days > slBalance) {
        alert("Not enough Sick Leave balance");
        return;
    }

    // UPDATE BALANCE
    if (type === "CL") clBalance -= days;
    if (type === "SL") slBalance -= days;

    usedLeaves += days;

    document.getElementById("clBalance").innerText = clBalance;
    document.getElementById("slBalance").innerText = slBalance;
    document.getElementById("usedLeaves").innerText = usedLeaves;

    // ADD TO LIST
    const leaveList = document.getElementById("teacherLeaveList");

    const item = document.createElement("div");
    item.className = "flex justify-between bg-yellow-50 p-3 rounded-xl";

    item.innerHTML = `
            <div>
                <p>${from} → ${to} (${days} days)</p>
                <p class="text-xs text-gray-500">${reason}</p>
            </div>
            <span class="text-xs bg-yellow-100 text-yellow-600 px-3 py-1 rounded-full">
                Pending
            </span>
        `;

    leaveList.prepend(item);

    // RESET
    document.getElementById("leaveFrom").value = "";
    document.getElementById("leaveTo").value = "";
    document.getElementById("leaveReason").value = "";
    document.getElementById("totalDays").innerText = "0";
}
