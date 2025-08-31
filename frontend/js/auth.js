document.addEventListener("DOMContentLoaded", function () {
    const API_URL = "http://127.0.0.1:5000";

    const signupForm = document.getElementById("signup-form");
    const loginForm = document.getElementById("login-form");

    if (signupForm) {
        signupForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const username = document.getElementById("username").value.trim();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value.trim();
            const confirmPassword = document.getElementById("confirm-password").value.trim();

            if (!username || !email || !password || !confirmPassword) {
                alert("All required fields must be filled!");
                return;
            }

            if (password !== confirmPassword) {
                alert("Passwords don't match!");
                return;
            }

            try {
                const response = await fetch(`${API_URL}/auth/signup`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        username, 
                        email, 
                        password,
                    }),
                });

                const data = await response.json();
                
                if (response.ok) {
                    alert("Registration successful! Please login.");
                    window.location.href = "login.html";
                } else {
                    alert(data.error || "Registration failed");
                }
            } catch (error) {
                console.error("Signup Error:", error);
                alert("Failed to connect to the server.");
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const email = document.getElementById("email").value.trim(); // Changed from login-email
            const password = document.getElementById("password").value.trim(); // Changed from login-password
            if (!email || !password) {
                alert("Email and password are required!");
                return;
            }
            try {
                const response = await fetch(`${API_URL}/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                });
                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem("token", data.token);
                    localStorage.setItem("userData", JSON.stringify({
                        username: data.username,
                        email: data.email,
                        lastWork: data.last_work || ""
                    }));
                    window.location.href = "dashboard.html";
                } else {
                    alert(data.error || "Login failed");
                }
            } catch (error) {
                console.error("Login Error:", error);
                alert("Failed to connect to the server.");
            }
        });
    }

    if (localStorage.getItem("token") && window.location.pathname.endsWith("login.html")) {
        window.location.href = "dashboard.html";
    }
});