document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');

    if (!token) {
        console.warn('No token found. Redirecting to login...');
        window.location.href = 'login.html';
        return;
    }

    try {
        // Verify if the current user is an admin
        const meRes = await fetch('http://localhost:5000/api/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!meRes.ok) {
            console.warn('Token invalid or expired. Redirecting to login...');
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        const currentUser = await meRes.json();
        if (currentUser.role !== 'admin') {
            alert('Access denied. Admins only.');
            window.location.href = 'login.html';
            return;
        }

        // Fetch all users (admin-only route)
        const res = await fetch('http://localhost:5000/api/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status} - ${res.statusText}`);
        }

        const users = await res.json();
        if (!Array.isArray(users)) {
            throw new Error('Expected an array of users from backend.');
        }

        // Render the table
        const tableBody = document.querySelector('#tables tbody');
        tableBody.innerHTML = '';

        users.forEach((user, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${user.fullName || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.role || 'N/A'}</td>
                <td>${user.isVerified ? '✅ Verified' : '❌ Not Verified'}</td>
            `;
            tableBody.appendChild(row);
        });

    } catch (err) {
        console.error('Error loading users:', err);
        alert('Failed to load user accounts.');
    }
});
