const APP_NAME = "School Name";
document.querySelectorAll(".app-name").forEach(el => {
  el.textContent = APP_NAME;
});

// UTILITIES
// Debounce (prevents performance issues on resize)
function debounce(fn, delay = 100) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Safe query helper
const $ = (sel, scope = document) => scope.querySelector(sel);
const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));

// PROFILE DROPDOWN
const profileBtn = $("#profileBtn");
const profileMenu = $("#profileMenu");

if (profileBtn && profileMenu) {
  profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    profileMenu.classList.toggle("hidden");
  });

  document.addEventListener("click", () => {
    profileMenu.classList.add("hidden");
  });
}

// MOBILE SIDEBAR TOGGLE (USING YOUR BUTTON)
const sidebar = document.querySelector("aside");
const mobileSidebarBtn = document.getElementById("mobileSidebarBtn");

if (mobileSidebarBtn) {
  mobileSidebarBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebar.classList.toggle("-translate-x-full");
  });
}

// Prepare sidebar for mobile
function setupResponsiveSidebar() {
  if (window.innerWidth < 768) {
    sidebar.classList.add(
      "fixed",
      "top-0",
      "left-0",
      "z-40",
      "-translate-x-full",
      "transition-transform",
      "duration-300"
    );
  } else {
    sidebar.classList.remove("-translate-x-full", "fixed", "z-40");
  }
}

window.addEventListener("resize", debounce(setupResponsiveSidebar));
setupResponsiveSidebar();

// Close sidebar when clicking outside on mobile
document.addEventListener("click", (e) => {
  if (
    window.innerWidth < 768 &&
    !sidebar.contains(e.target) &&
    e.target !== mobileSidebarBtn
  ) {
    sidebar.classList.add("-translate-x-full");
  }
});

// MOBILE SEARCH TOGGLE (NEW)
const searchIcon = document.getElementById("searchIcon");
const mobileSearch = document.getElementById("mobileSearch");

if (searchIcon && mobileSearch) {
  searchIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    mobileSearch.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!mobileSearch.contains(e.target) && e.target !== searchIcon) {
      mobileSearch.classList.add("hidden");
    }
  });
}

// SECTION SWITCHING (SAFE + SMOOTH)
const menus = $$(".menu");
const sections = $$(".section");

menus.forEach((m) => {
  m.addEventListener("click", () => {
    // Update active menu
    menus.forEach((x) =>
      x.classList.remove("bg-purple-100", "text-purple-600", "font-semibold")
    );
    m.classList.add("bg-purple-100", "text-purple-600", "font-semibold");

    // Switch sections safely
    sections.forEach((s) => s.classList.remove("active"));

    const target = document.getElementById(m.dataset.target);
    if (target) target.classList.add("active");

    // Auto-close sidebar on mobile after click
    if (window.innerWidth < 768) {
      sidebar.classList.add("-translate-x-full");
    }
  });
});

// CHART HELPER (SAFE)
function createChart(id, config) {
  const el = document.getElementById(id);
  if (!el) return;

  // Destroy existing chart if exists (prevents memory leaks)
  if (el._chartInstance) {
    el._chartInstance.destroy();
  }

  el._chartInstance = new Chart(el, {
    ...config,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      ...config.options,
    },
  });
}

// DASHBOARD CHARTS

// Attendance (Student Dashboard)
createChart("attendanceChart", {
  type: "doughnut",
  data: {
    labels: ["Present", "Absent"],
    datasets: [
      {
        data: [92, 8],
        backgroundColor: ["#22c55e", "#ef4444"],
        borderWidth: 0,
      },
    ],
  },
  options: {
    cutout: "70%",
    plugins: {
      legend: { position: "bottom" },
    },
  },
});

// Extra charts (won’t break if elements don’t exist)
createChart("attendanceDonut", {
  type: "doughnut",
  data: {
    labels: ["Present", "Absent", "Late"],
    datasets: [
      {
        data: [92, 8, 3],
        backgroundColor: ["#22c55e", "#ef4444", "#facc15"],
        borderWidth: 0,
      },
    ],
  },
  options: {
    plugins: { legend: { position: "bottom" } },
    cutout: "65%",
  },
});

createChart("performanceChart", {
  type: "doughnut",
  data: {
    labels: ["Excellent", "Good", "Needs Improvement"],
    datasets: [
      {
        data: [45, 35, 20],
        backgroundColor: ["#22c55e", "#3b82f6", "#f97316"],
        borderWidth: 0,
      },
    ],
  },
  options: {
    cutout: "70%",
  },
});

//Admin dashboard chart
createChart("chart", {
  type: "doughnut",
  data: {
    labels: ["Completed", "Remaining"],
    datasets: [
      {
        data: [12000, 3000],
        backgroundColor: ["#22c55e", "#e5e7eb"],
        borderWidth: 0,
      },
    ],
  },
  options: {
    cutout: "70%",
    plugins: {
      legend: { position: "bottom" },
    },
  },
});


// ACCESSIBILITY + UX IMPROVEMENTS

// Add keyboard support to menu items
menus.forEach((m) => {
  m.setAttribute("tabindex", "0");
  m.addEventListener("keypress", (e) => {
    if (e.key === "Enter") m.click();
  });
});


// ======= FIX: LINK DROPDOWN "MY PROFILE" TO PROFILE SECTION =======

const myProfileLink = document.getElementById("myProfileLink");

if (myProfileLink) {
  myProfileLink.addEventListener("click", () => {

    // 1) Close dropdown
    profileMenu.classList.add("hidden");

    // 2) Remove active from all sections
    sections.forEach((s) => s.classList.remove("active"));

    // 3) Show profile section
    const profileSection = document.getElementById("profile");
    if (profileSection) profileSection.classList.add("active");

    // 4) Update sidebar active menu (same style as others)
    menus.forEach((x) =>
      x.classList.remove("bg-purple-100", "text-purple-600", "font-semibold")
    );

    const sidebarProfile = document.querySelector('.menu[data-target="profile"]');
    if (sidebarProfile) {
      sidebarProfile.classList.add(
        "bg-purple-100",
        "text-purple-600",
        "font-semibold"
      );
    }

    // 5) Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function toggleEventForm() {
  const form = document.getElementById("eventForm");
  form.classList.toggle("translate-x-full");
}

// admina dashboard notice and event section tab button
function showTab(tab) {

  const noticesTab = document.getElementById('noticesTab');
  const eventTab = document.getElementById('eventTab');

  const noticesBtn = document.getElementById('noticesBtn');
  const eventBtn = document.getElementById('eventBtn');

  // Hide both tabs
  noticesTab.classList.add('hidden');
  eventTab.classList.add('hidden');

  // Reset button styles
  noticesBtn.classList.remove('border-indigo-600', 'text-indigo-600');
  noticesBtn.classList.add('text-gray-500');

  eventBtn.classList.remove('border-indigo-600', 'text-indigo-600');
  eventBtn.classList.add('text-gray-500');

  // Show selected tab
  if (tab === 'notices') {
    noticesTab.classList.remove('hidden');
    noticesBtn.classList.add('border-b-2', 'border-indigo-600', 'text-indigo-600');
    noticesBtn.classList.remove('text-gray-500');
  } else {
    eventTab.classList.remove('hidden');
    eventBtn.classList.add('border-b-2', 'border-indigo-600', 'text-indigo-600');
    eventBtn.classList.remove('text-gray-500');
  }
}