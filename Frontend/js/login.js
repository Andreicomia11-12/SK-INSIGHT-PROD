document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const passwordField = document.getElementById('passwordField');
    // const rememberMeCheckbox = document.getElementById('rememberMe');
    const togglePassword = document.getElementById('togglePassword');

    // On page load, check for token in sessionStorage or localStorage
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (token) {
        window.location.href = 'index.html';
        return;
    }

    // Show/Hide password toggle
    togglePassword.addEventListener('click', () => {
        const isPassword = passwordField.type === 'password';
        passwordField.type = isPassword ? 'text' : 'password';
        togglePassword.innerHTML = isPassword 
            ? '<i class="fa-solid fa-eye-slash"></i>' 
            : '<i class="fa-solid fa-eye"></i>';
    });

    // Login form submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = loginForm.email.value;
        const password = passwordField.value;
        // const rememberMe = rememberMeCheckbox.checked;

        try {
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.token) {
                // Store token based on Remember Me
                // if (rememberMe) {
                //     localStorage.setItem('token', data.token);
                //     sessionStorage.removeItem('token');
                // } else {
                //     sessionStorage.setItem('token', data.token);
                //     localStorage.removeItem('token');
                // }
                sessionStorage.setItem('token', data.token);
                localStorage.removeItem('token');
                Swal.fire({
                    icon: 'success',
                    title: 'Login Successful!',
                    text: 'Welcome SK Residents, you have successfully logged in.',
                    showConfirmButton: false,
                    timer: 2000
                }).then(() => {
                    window.location.href = 'index.html';
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Login Failed',
                    text: data.error || 'Login failed. Please check your credentials and try again.'
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Network Error',
                text: 'Unable to connect to the server. Please try again later.'
            });
        }
    });
});