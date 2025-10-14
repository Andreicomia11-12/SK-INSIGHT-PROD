document.addEventListener('DOMContentLoaded', () => {
    console.log('Signup.js loaded');

    const signupForm = document.getElementById('signupForm');
    const passwordField = document.getElementById('passwordField');
    const togglePassword = document.getElementById('togglePassword');

    if (!signupForm) {
        console.error('Signup form not found.');
        return;
    }

    // Show/Hide Password Toggle
    togglePassword.addEventListener('click', () => {
        const isPassword = passwordField.type === 'password';
        passwordField.type = isPassword ? 'text' : 'password';
        togglePassword.innerHTML = isPassword
            ? '<i class="fa-solid fa-eye-slash"></i>'
            : '<i class="fa-solid fa-eye"></i>';
    });

    // Submit Form
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Form submitted. Preparing FormData...');

        const formData = new FormData(signupForm);

        try {
            const response = await fetch('http://localhost:5000/api/users/smart/register', {
                method: 'POST',
                body: formData
            });

            console.log('Fetch completed. Status:', response.status);

            const responseText = await response.text();
            console.log('Response Text:', responseText);

            let data;
            try {
                data = JSON.parse(responseText);
                console.log('Parsed Data:', data);
            } catch (error) {
                console.error('Invalid JSON response:', responseText);
                Swal.fire({
                    icon: 'error',
                    title: 'Unexpected Response',
                    text: 'The server returned an invalid response.',
                });
                return;
            }

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Registration Successful!',
                    text: data.message || 'You can now log in.',
                    timer: 1000,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = '/Frontend/html/user/login.html';
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Registration Failed',
                    text: data.message || 'Please try again.',
                });
            }

        } catch (error) {
            console.error('Fetch Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Network Error',
                text: 'An error occurred during registration.',
            });
        }
    });
});