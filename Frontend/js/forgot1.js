document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = form.email.value;

        // Show SweetAlert loading
        Swal.fire({
            title: 'Sending reset link...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const res = await fetch('http://localhost:5000/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            Swal.close(); // Close loading

            if (res.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Reset Link Sent!',
                    text: 'Please check your email for the password reset link.',
                    confirmButtonText: 'OK'
                }).then(() => {
                    window.location.href = 'forgot2.html';
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.error || 'Failed to send reset link. Please try again.'
                });
            }
        } catch (err) {
            Swal.close(); // Close loading
            Swal.fire({
                icon: 'error',
                title: 'Network Error',
                text: 'Could not connect to the server. Please try again later.'
            });
        }
    });
});