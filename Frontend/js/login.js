document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
        ? window.API_BASE
        : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:5000'
            : 'https://sk-insight.online';
    const loginForm = document.getElementById('loginForm');
    const passwordField = document.getElementById('passwordField');
    const togglePassword = document.getElementById('togglePassword');

    // On page load, check for token in sessionStorage or localStorage
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (token) {
        window.location.href = 'index.html';
        return;
    }

    // Show/Hide password toggle
    togglePassword.addEventListener('click', (e) => {
        e.preventDefault();
        const isPassword = passwordField.type === 'password';
        passwordField.type = isPassword ? 'text' : 'password';
        togglePassword.innerHTML = isPassword 
            ? '<i class="fa-solid fa-eye-slash"></i>' 
            : '<i class="fa-solid fa-eye"></i>';
    });

    // Login form submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = loginForm.email.value.trim();
        const password = passwordField.value;

        if (!email || !password) {
            Swal.fire({
                icon: 'error',
                title: 'Missing Fields',
                text: 'Please enter both email and password.'
            });
            return;
        }

        // Show loading
        Swal.fire({
            title: 'Signing In...',
            text: 'Please wait while we verify your credentials.',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json().catch(() => null);

            Swal.close();

            if (response.ok && data.token) {
                sessionStorage.setItem('token', data.token);
                localStorage.removeItem('token');
                
                Swal.fire({
                    icon: 'success',
                    title: 'Login Successful!',
                    text: 'Welcome to SK Insight.',
                    showConfirmButton: false,
                    timer: 1200
                }).then(() => {
                    window.location.href = 'index.html';
                });
            } else {
                // Check if account is rejected
                if (data && data.code === 'account_rejected') {
                    let errorMsg = data.error || 'Your account ID has been rejected.';
                    if (data.reason) {
                        errorMsg += `\n\nReason: ${data.reason}`;
                    }
                    Swal.fire({
                        icon: 'error',
                        title: 'Account Rejected',
                        text: errorMsg,
                        confirmButtonColor: '#0A2C59'
                    });
                } else if (data && data.code === 'account_not_approved') {
                    let errorMsg = data.error || 'Your account is pending ID verification.';
                    if (data.rejectionReason) {
                        errorMsg += `\n\nRejection Reason: ${data.rejectionReason}`;
                    }
                    Swal.fire({
                        icon: 'warning',
                        title: 'Account Pending',
                        text: errorMsg,
                        confirmButtonColor: '#0A2C59'
                    });
                } else {
                    const errorMsg = (data && (data.error || data.message)) || 'Login failed. Please check your credentials.';
                    Swal.fire({
                        icon: 'error',
                        title: 'Login Failed',
                        text: errorMsg
                    });
                }
            }
        } catch (error) {
            Swal.close();
            console.error('Fetch Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Network Error',
                text: 'Unable to connect to the server. Please try again later.'
            });
        }
    });
});