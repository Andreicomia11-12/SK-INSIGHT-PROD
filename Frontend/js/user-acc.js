document.addEventListener("DOMContentLoaded", () => {
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
      tableBody.innerHTML = `<tr><td colspan="4">No users found</td></tr>`;
      return;
    }

    data.forEach((u, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${u.username}</td>
        <td>${u.email}</td>
        <td>${u.birthday ? new Date(u.birthday).toLocaleDateString() : "-"}</td>
      `;
      tableBody.appendChild(tr);
    });
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
});
