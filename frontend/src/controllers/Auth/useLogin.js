import { useState } from "react";

export function useLogin() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // ================= LOGIN =================
  const login = async () => {
    if (!identifier || !password) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/login",
        {
          method: "POST",
          headers: {
            "Content-Type":"application/json"
          },
          body: JSON.stringify({
            identifier,
            password
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Login failed");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      console.log("LOGIN SUCCESS", data);

      if (data.role === "student") {
        window.location.href="/student-dashboard";
      }
      else if (data.role === "teacher") {
        window.location.href="/teacher-dashboard";
      }
      else if (data.role === "admin") {
        window.location.href="/admin-dashboard";
      }

    } catch (error) {
      console.error(error);
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };


  // ================= FORGOT PASSWORD =================
  const handleForgotPassword = async () => {
    if (!resetEmail) {
      alert("Please enter your email");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/forgot-password",
        {
          method:"POST",
          headers:{
            "Content-Type":"application/json"
          },
          body: JSON.stringify({
            email: resetEmail
          })
        }
      );

      const data = await response.json();

      if(response.ok){
        alert("Password reset link sent");
        setShowForgotModal(false);
        setResetEmail("");
      } else {
        alert(data.error);
      }

    } catch(error){
      console.error(error);
      alert("Server error");
    }
  };


  return {
    identifier,
    setIdentifier,

    password,
    setPassword,

    resetEmail,
    setResetEmail,

    loading,
    showPassword,
    setShowPassword,

    showForgotModal,
    setShowForgotModal,

    login,
    handleForgotPassword
  };
}