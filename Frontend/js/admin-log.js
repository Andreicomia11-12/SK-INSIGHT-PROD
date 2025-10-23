document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const passwordField = document.getElementById("passwordField");
  const togglePassword = document.getElementById("togglePassword");

  // Show/Hide Password Toggle
  togglePassword.addEventListener("click", () => {
    const isPassword = passwordField.type === "password";
    passwordField.type = isPassword ? "text" : "password";

    togglePassword.innerHTML = isPassword
      ? '<i class="fa-solid fa-eye-slash"></i>'
      : '<i class="fa-solid fa-eye"></i>';
  });

  // Login Form Submit
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = loginForm.username.value.trim();
    const password = passwordField.value.trim();

    try {
      const res = await fetch("http://localhost:5000/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Save token to sessionStorage
        sessionStorage.setItem("token", data.token);

        Swal.fire({
          icon: "success",
          title: "Login Successful",
          text: data.message || "Welcome Admin!",
          timer: 1000,
          showConfirmButton: false,
        }).then(() => {
          window.location.href = "../admin/admin-dashboard.html";
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Login Failed",
          text: data.message || "Invalid credentials",
        });
      }
    } catch (err) {
      console.error("Error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Something went wrong. Please try again.",
      });
    }
  });
});
