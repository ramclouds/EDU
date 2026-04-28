document.addEventListener("DOMContentLoaded", () => {

    // ============================
    // ASSIGNMENT TABS
    // ============================
    const tabs = document.querySelectorAll(".tab-btn");
    const cards = document.querySelectorAll(".assignment-card");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {

            // Remove active styles
            tabs.forEach(t =>
                t.classList.remove("active", "text-blue-600", "border-b-2", "border-blue-600")
            );

            // Add active to clicked
            tab.classList.add("active", "text-blue-600", "border-b-2", "border-blue-600");

            const selectedTab = tab.dataset.tab;

            // Show / hide cards
            cards.forEach(card => {
                if (selectedTab === "all" || card.dataset.tab === selectedTab) {
                    card.style.display = ""; // better than "block"
                } else {
                    card.style.display = "none";
                }
            });
        });
    });


    // ============================
    // ATTENDANCE CHARTS
    // ============================
    const attendanceData = {
        labels: ["Present", "Absent", "Late"],
        datasets: [{
            data: [164, 28, 6],
            backgroundColor: ["#22c55e", "#ef4444", "#f59e0b"],
            borderWidth: 0
        }]
    };

    const attendanceOptions = {
        cutout: "70%",
        plugins: {
            legend: { position: "bottom" }
        }
    };

    // Dashboard Chart
    const dashboardCtx = document.getElementById("attendanceChartDashboard");
    if (dashboardCtx) {
        new Chart(dashboardCtx, {
            type: "doughnut",
            data: attendanceData,
            options: attendanceOptions
        });
    }

    // Section Chart
    const sectionCtx = document.getElementById("attendanceChartSection");
    if (sectionCtx) {
        new Chart(sectionCtx, {
            type: "doughnut",
            data: attendanceData,
            options: attendanceOptions
        });
    }


    // ============================
    // EXAM / RESULT CHARTS
    // ============================
    const examData = {
        labels: ["Term 1", "Midterm", "Term 2", "Pre-Final", "Final"],
        datasets: [{
            label: "Marks (%)",
            data: [72, 75, 78, 82, 85],
            borderColor: "#4f46e5",
            backgroundColor: "rgba(79, 70, 229, 0.1)",
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: "#4f46e5"
        }]
    };

    const examOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 100
            }
        }
    };

    // Section Chart
    const examSection = document.getElementById("examChartSection");
    if (examSection) {
        new Chart(examSection, {
            type: "line",
            data: examData,
            options: examOptions
        });
    }

    // Dashboard Chart
    const examDashboard = document.getElementById("examChartDashboard");
    if (examDashboard) {
        new Chart(examDashboard, {
            type: "line",
            data: examData,
            options: examOptions
        });
    }




});

function openClass(classId) {

    // Hide classes
    document.getElementById('classesSection').classList.add('hidden');

    // Show students section
    document.getElementById('studentsSection').classList.remove('hidden');

    // Hide all student groups
    document.querySelectorAll('.student-group').forEach(group => {
        group.classList.add('hidden');
    });

    // Show selected class students
    document.getElementById(classId).classList.remove('hidden');

    // Set title
    document.getElementById('classTitle').innerText = "Class " + classId.replace("A", "-A").replace("B", "-B") + " Students";
}

function goBack() {
    document.getElementById('studentsSection').classList.add('hidden');
    document.getElementById('classesSection').classList.remove('hidden');
}


function openModal() {
    document.getElementById('studentModal').classList.remove('hidden');
    document.getElementById('studentModal').classList.add('flex');
}

function closeModal() {
    document.getElementById('studentModal').classList.add('hidden');
}

// TAB SWITCH
function switchTab(tabId) {

    // hide all
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });

    // remove active style
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('border-blue-500', 'text-blue-600');
    });

    // show selected
    document.getElementById(tabId).classList.remove('hidden');

    // highlight active tab
    event.target.classList.add('border-blue-500', 'text-blue-600');
}

// ================= STUDENT LEAVE =================

// AUTO CALCULATE DAYS
document.getElementById("sLeaveFrom").addEventListener("change", calcStudentDays);
document.getElementById("sLeaveTo").addEventListener("change", calcStudentDays);

function calcStudentDays() {
    const from = new Date(document.getElementById("sLeaveFrom").value);
    const to = new Date(document.getElementById("sLeaveTo").value);

    if (from && to && to >= from) {
        const diff = (to - from) / (1000 * 60 * 60 * 24) + 1;
        document.getElementById("sTotalDays").innerText = diff;
    }
}

function applyStudentLeave() {
    const from = document.getElementById("sLeaveFrom").value;
    const to = document.getElementById("sLeaveTo").value;
    const reason = document.getElementById("sLeaveReason").value;
    const days = parseInt(document.getElementById("sTotalDays").innerText);

    if (!from || !to || !reason || days <= 0) {
        alert("Fill all details correctly");
        return;
    }

    const leaveList = document.getElementById("studentLeaveList");

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
    document.getElementById("sLeaveFrom").value = "";
    document.getElementById("sLeaveTo").value = "";
    document.getElementById("sLeaveReason").value = "";
    document.getElementById("sTotalDays").innerText = "0";
}