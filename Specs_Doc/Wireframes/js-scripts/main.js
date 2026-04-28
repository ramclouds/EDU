const APP_NAME = "MySchool";
document.querySelectorAll(".app-name").forEach(el => {
    el.textContent = APP_NAME;
});

function openSection(sectionName) {
    const allSections = document.querySelectorAll('.section');
    const menuButtons = document.querySelectorAll('.menu-btn');

    // hide all sections
    allSections.forEach(sec => sec.classList.add('hidden'));

    // show selected section
    document.getElementById(sectionName + 'Section')?.classList.remove('hidden');

    // update sidebar active state
    menuButtons.forEach(btn => {
        btn.classList.remove(
            'bg-gradient-to-r', 'from-purple-100', 'to-indigo-100',
            'text-purple-700', 'font-semibold', 'shadow'
        );
    });

    document.querySelector(`[data-section="${sectionName}"]`)?.classList.add(
        'bg-gradient-to-r', 'from-purple-100', 'to-indigo-100',
        'text-purple-700', 'font-semibold', 'shadow'
    );

    // close profile dropdown
    document.getElementById('profileMenu')?.classList.add('hidden');
}

document.addEventListener("DOMContentLoaded", () => {

    // ============================
    // SECTION SWITCHING
    // ============================
    const menuButtons = document.querySelectorAll('.menu-btn');
    const allSections = document.querySelectorAll('.section');

    menuButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.section;

            // Remove active style from all buttons
            menuButtons.forEach(b => {
                b.classList.remove(
                    'bg-gradient-to-r', 'from-purple-100', 'to-indigo-100',
                    'text-purple-700', 'font-semibold', 'shadow'
                );
            });

            // Add active style to clicked button
            btn.classList.add(
                'bg-gradient-to-r', 'from-purple-100', 'to-indigo-100',
                'text-purple-700', 'font-semibold', 'shadow'
            );

            // Hide ALL sections
            allSections.forEach(sec => sec.classList.add('hidden'));

            // Show selected section
            const activeEl = document.getElementById(`${target}Section`);
            if (activeEl) activeEl.classList.remove('hidden');
        });
    });

    // ============================
    // MOBILE SEARCH
    // ============================
    const mobileSearchBtn = document.getElementById('mobileSearchBtn');
    const mobileSearch = document.getElementById('mobileSearch');
    mobileSearchBtn?.addEventListener('click', () => {
        mobileSearch.classList.toggle('hidden');
    });

    // ============================
    // NOTIFICATIONS
    // ============================
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationMenu = document.getElementById('notificationMenu');
    const closeNotifications = document.getElementById('closeNotifications');

    notificationBtn?.addEventListener('click', () => notificationMenu?.classList.toggle('hidden'));
    closeNotifications?.addEventListener('click', () => notificationMenu?.classList.add('hidden'));

    // ============================
    // PROFILE MENU
    // ============================
    const profileBtn = document.getElementById('profileBtn');
    const profileMenu = document.getElementById('profileMenu');
    profileBtn?.addEventListener('click', () => profileMenu?.classList.toggle('hidden'));

    // ============================
    // MOBILE SIDEBAR
    // ============================
    const mobileSidebarBtn = document.getElementById('mobileSidebarBtn');
    const sidebar = document.getElementById('sidebar');
    const mobileOverlay = document.getElementById('mobileOverlay');

    mobileSidebarBtn?.addEventListener('click', () => {
        sidebar?.classList.remove('-translate-x-full');
        mobileOverlay?.classList.remove('hidden');
    });

    mobileOverlay?.addEventListener('click', () => {
        sidebar?.classList.add('-translate-x-full');
        mobileOverlay?.classList.add('hidden');
    });

    // ============================
    // MODALS UTILITY
    // ============================
    function setupModal(openBtnId, modalId, closeBtnIds = []) {
        const modal = document.getElementById(modalId);
        const openBtn = document.getElementById(openBtnId);

        openBtn?.addEventListener('click', () => modal?.classList.remove('hidden'));

        closeBtnIds.forEach(id => {
            const btn = document.getElementById(id);
            btn?.addEventListener('click', () => modal?.classList.add('hidden'));
        });

        modal?.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    }

    // Assignment modal
    setupModal('openAssignmentModal', 'assignmentModal', ['closeAssignmentModal', 'cancelAssignment']);
    // Notice modal
    setupModal('openNoticeModal', 'noticeModal', ['closeNoticeModal']);
    // Complaint modal
    setupModal('openComplaintBtn', 'complaintModal', ['closeComplaintBtn', 'cancelComplaintBtn']);
    // Password modal
    setupModal('openPasswordModal', 'passwordModal', ['closePasswordModal']);

    // ============================
    // ASSIGNMENT SAVE DEMO
    // ============================
    document.getElementById('saveAssignment')?.addEventListener('click', () => {
        const title = document.getElementById('assignmentTitle').value.trim();
        const cls = document.getElementById('assignmentClassSelect').value;
        const due = document.getElementById('assignmentDue').value;

        if (!title || !cls || !due) return alert("Please fill all required fields");

        const container = document.getElementById('assignmentList');
        const card = document.createElement('div');
        card.className = "assignment-card bg-white p-5 rounded-2xl shadow-sm space-y-3";
        card.setAttribute('data-class', cls);

        card.innerHTML = `
            <p class="text-xs text-gray-500">${cls}</p>
            <h3 class="font-semibold">${title}</h3>
            <p class="text-xs text-gray-400">Due: ${due}</p>
            <span class="text-xs px-2 py-1 bg-yellow-100 text-yellow-600 rounded-full">New</span>
        `;
        container?.prepend(card);
        document.getElementById('assignmentModal')?.classList.add('hidden');
        document.getElementById('assignmentForm')?.reset();
    });

    // ============================
    // NOTICE SAVE DEMO
    // ============================
    document.getElementById('saveNotice')?.addEventListener('click', () => {
        const title = document.getElementById('noticeTitle').value.trim();
        const cls = document.getElementById('noticeClass').value;
        const desc = document.getElementById('noticeDesc').value.trim();
        if (!title || !desc) return alert("Please fill all fields");

        const container = document.getElementById('noticeList');
        const card = document.createElement('div');
        card.className = "notice-card bg-white p-4 rounded-2xl shadow-sm";
        card.setAttribute('data-class', cls);

        const today = new Date().toLocaleDateString();
        card.innerHTML = `
            <div class="flex justify-between">
                <div>
                    <h3 class="font-semibold text-sm">📢 ${title}</h3>
                    <p class="text-xs text-gray-500 mt-1">Class ${cls} • ${today}</p>
                </div>
                <span class="text-xs px-2 py-1 bg-yellow-100 text-yellow-600 rounded-full">New</span>
            </div>
            <p class="text-sm text-gray-600 mt-2">${desc}</p>
        `;
        container?.prepend(card);
        document.getElementById('noticeModal')?.classList.add('hidden');
        document.getElementById('noticeForm')?.reset();
    });

    // ============================
    // PASSWORD TOGGLE & SAVE
    // ============================
    const togglePassword = document.getElementById("togglePassword");
    const currentPass = document.getElementById("currentPass");
    const newPass = document.getElementById("newPass");
    const confirmPass = document.getElementById("confirmPass");
    const savePasswordBtn = document.getElementById("savePasswordBtn");

    let showPass = false;
    togglePassword?.addEventListener("click", () => {
        showPass = !showPass;
        const type = showPass ? "text" : "password";
        [currentPass, newPass, confirmPass].forEach(el => el && (el.type = type));
        togglePassword.innerHTML = showPass
            ? '<i class="bi bi-eye-slash-fill"></i><span>Hide Passwords</span>'
            : '<i class="bi bi-eye-fill"></i><span>Show Passwords</span>';
    });

    savePasswordBtn?.addEventListener("click", () => {
        const current = currentPass.value.trim();
        const newP = newPass.value.trim();
        const confirm = confirmPass.value.trim();

        if (!current || !newP || !confirm) return alert("All fields are required!");
        if (newP.length < 6) return alert("New password must be at least 6 characters.");
        if (newP !== confirm) return alert("Passwords do not match!");

        alert("Password changed successfully!");
        [currentPass, newPass, confirmPass].forEach(el => el.value = "");
        document.getElementById('passwordModal')?.classList.add('hidden');
    });

    // ============================
    // LOGOUT
    // ============================
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
        window.location.href = "index.html";
    });

});

// ================================= POPUP NOTIFICATION ========================================
function showNotification(message, type = "info", duration = 4000) {
    const container = document.getElementById("notificationContainer");

    const notif = document.createElement("div");
    notif.className = `notification ${type}`;

    notif.innerHTML = `
        <div>${message}</div>
        <button onclick="this.parentElement.remove()">✖</button>
    `;

    container.appendChild(notif);

    // Show animation
    setTimeout(() => notif.classList.add("show"), 100);

    // Auto remove
    setTimeout(() => {
        notif.classList.remove("show");
        setTimeout(() => notif.remove(), 300);
    }, duration);
}


window.onload = function () {
    showNotification("👋 Welcome back, Teacher!", "success");

    setTimeout(() => {
        showNotification("📌 You have 3 pending tasks", "warning");
    }, 1500);

    setTimeout(() => {
        showNotification("📊 New analytics report available", "info");
    }, 3000);
};


// ================= DARK MODE ====================
document.addEventListener("DOMContentLoaded", function () {
    const toggle = document.getElementById("darkToggle");

    // LOAD SAVED MODE
    const isDark = localStorage.getItem("darkMode") === "true";

    if (isDark) {
        document.documentElement.classList.add("dark");
        toggle.checked = true;
    }

    // TOGGLE MODE
    toggle.addEventListener("change", function () {
        if (this.checked) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("darkMode", "true");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("darkMode", "false");
        }
    });
});

// const btn = document.getElementById("darkToggleBtn");
// const icon = document.getElementById("darkIcon");

// btn.addEventListener("click", () => {
//     document.documentElement.classList.toggle("dark");

//     const isDark = document.documentElement.classList.contains("dark");

//     localStorage.setItem("darkMode", isDark);

//     icon.textContent = isDark ? "☀️" : "🌙";
// });