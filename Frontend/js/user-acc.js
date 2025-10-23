document.addEventListener("DOMContentLoaded", () => {

  (function() {
  const token = sessionStorage.getItem("token"); // Only sessionStorage!
  function sessionExpired() {
    Swal.fire({
      icon: 'warning',
      title: 'Session Expired',
      text: 'Please login again.',
      confirmButtonColor: '#0A2C59',
      allowOutsideClick: false,
      allowEscapeKey: false,
    }).then(() => {
      window.location.href = "./admin-log.html";
    });
  }
  if (!token) {
    sessionExpired();
    return;
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      sessionStorage.removeItem("token");
      sessionExpired();
    }
  } catch (e) {
    sessionStorage.removeItem("token");
    sessionExpired();
  }
})();

  const tableBody = document.querySelector(".tables table tbody");
  const token = sessionStorage.getItem("token") || localStorage.getItem("token"); // <-- Updated line
  const searchInput = document.getElementById("userSearch"); // <-- Add this line

  let allUsers = []; // Store all users for filtering

  // Fetch all users
  async function fetchUsers() {
    try {
      const res = await fetch("http://localhost:5000/api/users", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) throw new Error("Failed to fetch users");

      const users = await res.json();
      allUsers = users.filter(u => u.role !== "admin"); // Store non-admins
      renderTable(allUsers);
    } catch (err) {
      console.error("Error:", err);
      tableBody.innerHTML = `<tr><td colspan="4">Error loading users</td></tr>`;
    }
  }

  // Render table rows
  function renderTable(data) {
    tableBody.innerHTML = "";

    // Update user account counter
    const counter = document.getElementById("userAccCount");
    if (counter) counter.textContent = data.length;

    if (!data.length) {
      tableBody.innerHTML = `<tr><td colspan="5">No users found</td></tr>`;
      return;
    }

    data.forEach((u, index) => {
      const tr = document.createElement("tr");
      tr.setAttribute("data-id", u._id); // For modal
      tr.innerHTML = `
        <td style="text-align: center;">${index + 1}</td>
        <td>${u.username}</td>
        <td>${u.email}</td>
        <td style="text-align: center;">${u.birthday ? new Date(u.birthday).toLocaleDateString() : "-"}</td>
        <td style="text-align: center;">
          <button class="view-btn" data-id="${u._id}" title="View">
            <i class="fa-solid fa-eye"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // Attach modal openers
    attachUserModalOpeners();
  }

  // Search filter
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const term = searchInput.value.trim().toLowerCase();
      const filtered = allUsers.filter(u =>
        (u.username && u.username.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term))
      );
      renderTable(filtered);
    });
  }

  // Initial load
  fetchUsers();

const socket = io("http://localhost:5000", { transports: ["websocket"] });

socket.on("educational-assistance:newSubmission", (data) => {
  Swal.fire({
    icon: 'info',
    title: 'New Educational Assistance Application',
    text: 'A new application has arrived!',
    timer: 8000,
    showConfirmButton: false,
    toast: true,
    position: 'top-end'
  });
  // Optionally refresh or update something if needed
});
});

function attachUserModalOpeners() {
  document.querySelectorAll(".view-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = btn.dataset.id;
      // Fetch user details if needed, then show modal
      showUserModal(userId);
    });
  });
}

async function showUserModal(userId) {
  try {
    const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
      },
    });
    const user = await response.json();

    Swal.fire({
      title: '<h2 style="color: #0A2C59; font-size: 24px;">User Details</h2>',
      html: `
        <div class="user-modal-content">
          <div class="user-info-group">
            <label>Username:</label>
            <span>${user.username}</span>
          </div>
          <div class="user-info-group">
            <label>Email:</label>
            <span>${user.email}</span>
          </div>
          <div class="user-info-group">
            <label>Birthday:</label>
            <span>${user.birthday ? new Date(user.birthday).toLocaleDateString() : 'Not set'}</span>
          </div>
        </div>
      `,
      showCloseButton: true,
      showConfirmButton: false,
      width: '500px',
      customClass: {
        popup: 'user-modal-popup',
        closeButton: 'user-modal-close'
      }
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to load user details'
    });
  }
}
