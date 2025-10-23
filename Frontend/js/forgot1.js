document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = form.email.value;

        Swal.fire({
            title: 'Sending OTP...',
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

            Swal.close();

            if (res.ok) {
                Swal.fire({
                    title: 'Enter OTP',
                    input: 'text',
                    inputLabel: 'Check your email for the OTP code',
                    inputPlaceholder: 'Enter OTP here',
                    showCancelButton: true,
                    confirmButtonText: 'Verify OTP'
                }).then(async (result) => {
                    if (result.isConfirmed && result.value) {
                        const verifyRes = await fetch('http://localhost:5000/api/auth/verify-otp', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, otpCode: result.value })
                        });
                        const verifyData = await verifyRes.json();

                        if (verifyRes.ok) {
                            // ✅ SweetAlert for successful OTP
                            Swal.fire({
                                icon: 'success',
                                title: 'OTP Verified!',
                                text: 'Enter your new password:',
                                input: 'password',
                                inputLabel: 'New Password',
                                inputPlaceholder: 'Enter new password',
                                confirmButtonText: 'Reset Password'
                            }).then(async (pwResult) => {
                                if (pwResult.isConfirmed && pwResult.value) {
                                    // Send new password to backend
                                    const resetRes = await fetch('http://localhost:5000/api/auth/verify-otp-reset', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ email, otpCode: result.value, newPassword: pwResult.value })
                                    });
                                    const resetData = await resetRes.json();
                                    if (resetRes.ok) {
                                        Swal.fire('Success', 'Your password has been reset!', 'success').then(() => {
                                            window.location.href = '../../html/user/login.html';
                                        });
                                    } else {
                                        Swal.fire('Error', resetData.error || 'Failed to reset password', 'error');
                                    }
                                }
                            });
                        } else {
                            // ❌ SweetAlert for failed OTP
                            Swal.fire({
                                icon: 'error',
                                title: 'Invalid OTP',
                                text: verifyData.error || 'The OTP you entered is incorrect or expired.'
                            });
                        }
                    }
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.error || 'Failed to send OTP. Please try again.'
                });
            }
        } catch (err) {
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Network Error',
                text: 'Could not connect to the server. Please try again later.'
            });
        }
    });
});