import { useState } from "react";
import { Link } from "react-router-dom";
import { APP_NAME, APP_TAGLINE, APP_YEAR } from "../config/appConfig";

export default function Signup() {
  const [role, setRole] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = {
      full_name: e.target.full_name.value,
      email: e.target.email.value,
      mobile: e.target.mobile.value,
      password: e.target.password.value,
      role: role,

      parent_name: e.target.parent_name?.value || null,
      parent_mobile: e.target.parent_mobile?.value || null,
      parent_email: e.target.parent_email?.value || null,

      gender: e.target.gender?.value || null,
      date_of_birth: e.target.date_of_birth?.value || null,
      address: e.target.address?.value || null,
      admission_date: e.target.admission_date?.value || null,
    };

    try {
      const response = await fetch("http://localhost:5000/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`User created successfully\nStudent ID: ${data.student_id}`);
        e.target.reset();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Server error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* NAVBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-center px-4 sm:px-8 py-4 bg-white border-b gap-3 sm:gap-0">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 text-white p-2 rounded-lg">
            <i className="bi bi-book"></i>
          </div>
          <div>
            <div className="font-semibold text-gray-800 text-lg sm:text-base">
              {APP_NAME}
            </div>
            <div className="text-xs text-gray-500">{APP_TAGLINE}</div>
          </div>
        </div>

        <div className="text-sm text-gray-500 text-center sm:text-right">
          Need help?{" "}
          <span className="text-purple-600 cursor-pointer">Support</span>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex flex-1 items-center justify-center px-4 sm:px-6 py-10">
        <div className="flex flex-col lg:flex-row items-center gap-10 max-w-6xl w-full">
          {/* LEFT SIDE */}
          <div className="flex-1 bg-gradient-to-br from-purple-50 via-white to-blue-50 p-8 md:p-12 rounded-3xl hidden lg:block">
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight">
              Join <br />
              <span className="text-purple-600">{APP_NAME}</span>
            </h1>

            <p className="text-gray-600 mt-6 max-w-md text-sm md:text-base">
              Request access to our powerful school management platform.
            </p>

            <div className="mt-10 space-y-6">
              <Feature
                icon="bi-shield-lock-fill"
                title="Secure Platform"
                desc="Your data is protected and encrypted."
              />
              <Feature
                icon="bi-person-check-fill"
                title="Role-Based Access"
                desc="Students, Teachers & Admins onboard easily."
              />
            </div>
          </div>

          {/* SIGNUP CARD */}
          <div className="w-full sm:max-w-md bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
            <h2 className="text-xl sm:text-2xl font-semibold text-center">
              Request Access
            </h2>

            <p className="text-sm text-gray-500 text-center mt-2 mb-6">
              Please fill in the details below
            </p>

            <form onSubmit={handleSubmit}>
              <Input label="Full Name" type="text" name="full_name" required />
              <Input label="Email Address" type="email" name="email" required />
              <Input label="Mobile Number" type="tel" name="mobile" required />
              <Input
                label="Password"
                type="password"
                name="password"
                required
              />

              {/* Role */}
              <div className="mb-4">
                <label className="text-sm font-medium">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="">Select Role</option>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* STUDENT EXTRA FIELDS */}
              {role === "student" && (
                <>
                  <Input label="Parent Name" name="parent_name" />
                  <Input label="Parent Mobile" name="parent_mobile" />
                  <Input label="Parent Email" name="parent_email" />
                  <Input
                    label="Date of Birth"
                    type="date"
                    name="date_of_birth"
                  />
                  <Input
                    label="Admission Date"
                    type="date"
                    name="admission_date"
                  />

                  <div className="mb-4">
                    <label className="text-sm font-medium">Gender</label>
                    <select
                      name="gender"
                      className="w-full mt-1 px-3 py-2 border rounded-lg bg-gray-50"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="text-sm font-medium">Address</label>
                    <textarea
                      name="address"
                      className="w-full mt-1 px-3 py-2 border rounded-lg bg-gray-50"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                className="w-full mt-4 py-2 rounded-lg text-white font-medium bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 transition"
              >
                Request Access
              </button>
            </form>

            <div className="text-sm text-center mt-6 text-gray-600">
              Already have an account?{" "}
              <Link
                to="/"
                className="text-purple-600 font-medium hover:underline"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-white border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-10 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-gray-600 text-center sm:text-left">
          <div>
            © {APP_YEAR} <span className="font-medium">{APP_NAME}</span>. All
            rights reserved.
          </div>

          <div className="space-x-4">
            <a href="#" className="hover:text-purple-600">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-purple-600">
              Terms
            </a>
            <a href="#" className="hover:text-purple-600">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* Reusable Input */
function Input({ label, type = "text", name, required }) {
  return (
    <div className="mb-4">
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        name={name}
        required={required}
        className="w-full mt-1 px-3 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-purple-500 outline-none"
      />
    </div>
  );
}

/* Feature */
function Feature({ icon, title, desc }) {
  return (
    <div className="flex items-start gap-4">
      <div className="bg-purple-100 text-purple-600 p-3 rounded-lg">
        <i className={`bi ${icon} text-lg`}></i>
      </div>
      <div>
        <div className="font-semibold text-gray-800">{title}</div>
        <div className="text-sm text-gray-500">{desc}</div>
      </div>
    </div>
  );
}
