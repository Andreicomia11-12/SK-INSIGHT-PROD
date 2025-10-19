        document.getElementById('resetForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const params = new URLSearchParams(window.location.search);
            const token = params.get('token');
            const password = document.getElementById('newPassword').value;
            if (!token) {
                Swal.fire('Error', 'No token found in URL.', 'error');
                return;
            }
            try {
                const res = await fetch(`http://localhost:5000/api/auth/reset-password/${token}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                });
                const data = await res.json();
                if (res.ok) {
                    Swal.fire('Success', 'Your password has been reset!', 'success').then(() => {
                        window.location.href = 'login.html';
                    });
                } else {
                    Swal.fire('Error', data.error || 'Failed to reset password.', 'error');
                }
            } catch (err) {
                Swal.fire('Error', 'Network error.', 'error');
            }
        });