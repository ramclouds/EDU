/*Login Page Section*/
function login(event) {
    event.preventDefault(); // Stop form reload

    const role = document.getElementById("role").value;

    if (!role) {
        alert("Please select your role");
        return;
    }

    if (role === "student") {
        window.location.href = "Student-dashboard.html";
    }
    else if (role === "teacher") {
        window.location.href = "Teacher-dashboard.html";
    }
    else if (role === "admin") {
        window.location.href = "Super-admin-dashboard.html";
    }
}

//Forget Password Modal
function openForgotModal() {
    document.getElementById("forgotModal").classList.remove("hidden");
    document.getElementById("forgotModal").classList.add("flex");
}

function closeForgotModal() {
    document.getElementById("forgotModal").classList.add("hidden");
    document.getElementById("forgotModal").classList.remove("flex");
}

function sendResetLink() {
    const email = document.getElementById("resetEmail").value;

    if (!email) {
        alert("Please enter your email");
        return;
    }

    // Demo only (connect backend later)
    alert("Reset link sent to " + email);

    closeForgotModal();
}

// /* signup page*/
// const roleSelect = document.getElementById('roleSelect');
// const studentFields = document.getElementById('studentFields');
// const teacherFields = document.getElementById('teacherFields');
// const adminFields = document.getElementById('adminFields');

// roleSelect.addEventListener('change', () => {
//     studentFields.classList.add('hidden');
//     teacherFields.classList.add('hidden');
//     adminFields.classList.add('hidden');

//     if (roleSelect.value === 'student') studentFields.classList.remove('hidden');
//     if (roleSelect.value === 'teacher') teacherFields.classList.remove('hidden');
//     if (roleSelect.value === 'admin') adminFields.classList.remove('hidden');
// });