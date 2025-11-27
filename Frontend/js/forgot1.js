// Load `check-rejected.js` dynamically so pages don't require an HTML script include.
try {
    if (!window.__checkRejectedLoaderAdded) {
        window.__checkRejectedLoaderAdded = true;
        (function () {
            var s = document.createElement('script');
            s.src = '/Frontend/js/check-rejected.js';
            s.async = false;
            s.defer = false;
            s.onload = function () { console.debug('check-rejected.js loaded'); };
            document.head.appendChild(s);
        })();
    }
} catch (e) { console.debug('checkRejected loader error', e); }

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', async function (e) {
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
                // Create custom OTP input fields
                const otpHtml = `
                    <div style="display: flex; justify-content: center; gap: 10px;">
                        ${Array.from({ length: 6 }).map((_, i) => `
                            <input type="text" id="otp-${i}" maxlength="1" 
                                style="width: 40px; height: 40px; text-align: center; font-size: 18px; border: 1px solid #000; border-radius: 5px;" />
                        `).join('')}
                    </div>
                `;

                Swal.fire({
                    title: 'Enter OTP',
                    html: `
                        <p>Check your email for the OTP code</p>
                        ${otpHtml}
                    `,
                    showCancelButton: true,
                    confirmButtonText: 'Verify OTP',
                    didOpen: () => {
                        // Focus on the first input field
                        const firstInput = document.getElementById('otp-0');
                        if (firstInput) firstInput.focus();

                        // Add event listeners for auto-focus and navigation
                        Array.from({ length: 6 }).forEach((_, i) => {
                            const input = document.getElementById(`otp-${i}`);
                            input.addEventListener('input', (e) => {
                                if (e.target.value.length === 1 && i < 5) {
                                    document.getElementById(`otp-${i + 1}`).focus();
                                }
                            });
                            input.addEventListener('keydown', (e) => {
                                if (e.key === 'Backspace' && !e.target.value && i > 0) {
                                    document.getElementById(`otp-${i - 1}`).focus();
                                }
                            });
                        });
                    }
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        // Collect the OTP from the input fields
                        const otpCode = Array.from({ length: 6 })
                            .map((_, i) => document.getElementById(`otp-${i}`).value)
                            .join('');

                        if (otpCode.length === 6) {
                            const verifyRes = await fetch('http://localhost:5000/api/auth/verify-otp', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ email, otpCode })
                            });
                            const verifyData = await verifyRes.json();

                            if (verifyRes.ok) {
                                // ✅ SweetAlert for successful OTP
                                Swal.fire({
                                    icon: 'success',
                                    title: 'OTP Verified!',
                                    html: `
                                        <p>Enter your new password:</p>
                                        <div style="position: relative; display: flex; align-items: center;">
                                            <input type="password" id="newPassword" placeholder="Enter new password" 
                                                style="width: 100%; padding-right: 40px; height: 40px; border: 1px solid #000; border-radius: 5px;" />
                                            <i id="togglePassword" class="fa fa-eye" 
                                                style="position: absolute; right: 10px; cursor: pointer;"></i>
                                        </div>
                                    `,
                                    showCancelButton: true,
                                    confirmButtonText: 'Reset Password',
                                    didOpen: () => {
                                        const togglePassword = document.getElementById('togglePassword');
                                        const passwordInput = document.getElementById('newPassword');

                                        togglePassword.addEventListener('click', () => {
                                            const isHidden = passwordInput.type === "password";
                                        
                                            passwordInput.type = isHidden ? "text" : "password";
                                        
                                            if (isHidden) {
                                                togglePassword.classList.remove("fa-eye");
                                                togglePassword.classList.add("fa-eye-slash");
                                            } else {
                                                togglePassword.classList.remove("fa-eye-slash");
                                                togglePassword.classList.add("fa-eye");
                                            }
                                        });
                                    }
                                }).then(async (pwResult) => {
                                    if (pwResult.isConfirmed) {
                                        const newPassword = document.getElementById('newPassword').value;

                                        // Send new password to backend
                                        const resetRes = await fetch('http://localhost:5000/api/auth/verify-otp-reset', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ email, otpCode, newPassword })
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
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Incomplete OTP',
                                text: 'Please enter all 6 digits of the OTP.'
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