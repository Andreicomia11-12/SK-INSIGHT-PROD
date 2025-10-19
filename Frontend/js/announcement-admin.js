// 🔹 Redirect to login if no token or token expired
(function() {
  const token = sessionStorage.getItem("token"); // <-- Use only sessionStorage
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

document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector(".tables table tbody");
  const token = sessionStorage.getItem("token"); // <-- Use only sessionStorage
  const modal = document.getElementById("myModal");
  const addBtn = document.getElementById("myBtn");
  const closeBtn = document.querySelector(".close");
  const form = document.getElementById("announcementForm");

  let editingId = null; // Track whether we're editing
  let announcementsData = []; // Store all announcements globally

  // Show modal
  function showModal() {
    modal.style.display = "flex";
    setTimeout(() => modal.classList.add("show"), 10);
    document.body.style.overflow = "hidden"; // Prevent background scrolling
  }

  // Hide modal
  function hideModal() {
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
      document.body.style.overflow = ""; // Re-enable scrolling
    }, 300);
    form.reset(); // Reset form when closing
    editingId = null; // Reset editing state
  }

  // Modal triggers
  addBtn.onclick = showModal;
  closeBtn.onclick = hideModal;

  // Close on outside click
  window.onclick = (event) => {
    if (event.target === modal) {
      hideModal();
    }
  };

  // Fetch announcements
  async function fetchAnnouncements() {
    try {
      const res = await fetch("http://localhost:5000/api/announcements", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (!res.ok) throw new Error("Failed to fetch announcements");
      const data = await res.json();
      // Use data.announcements from backend
      announcementsData = Array.isArray(data.announcements) ? data.announcements : [];
      // Do NOT call renderTable here!
      // Only call renderCurrentTab after fetching
    } catch (err) {
      console.error("Error:", err);
      tableBody.innerHTML = "";
    }
  }

  // Render table rows (with pin/unpin button)
  function renderTable(data) {
    tableBody.innerHTML = "";
    if (!data.length) return;
    data.forEach(a => {
      const status = getAnnouncementStatus(a.eventDate || a.scheduledDateTime);
      const tr = document.createElement("tr");
      if (a.isPinned) tr.classList.add("pinned-row");
      tr.innerHTML = `
        <td>${a.title}</td>
        <td>${new Date(a.createdAt).toLocaleDateString()}</td>
        <td>${a.eventDate ? new Date(a.eventDate).toLocaleString() : "-"}</td>
        <td>${status}</td>
        <td>
          <button class="btn-edit" style="margin: 0 5%" data-id="${a._id}">
            <i class="fa-solid fa-pen-to-square" style="color: #225aa3ff"></i>
          </button>
          <button class="btn-pin ${a.isPinned ? "pinned" : ""}" style="margin: 0 5%" data-id="${a._id}" title="${a.isPinned ? "Unpin" : "Pin"}">
            <i class="fa-solid fa-location-pin" style="font-size:18px; color:${a.isPinned ? "#d4af37" : "#888"};"></i>
          </button>
          <button class="btn-delete" style="margin: 0 5%" data-id="${a._id}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // Helper to get current tab
  function getCurrentTab() {
    const activeBtn = document.querySelector('.tab-btn.active');
    return activeBtn ? activeBtn.dataset.tab : "pending";
  }

  // Tab logic
  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      tabButtons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");

      renderCurrentTab();
    });
  });

  // Render correct tab view
  function renderCurrentTab() {
    const tab = getCurrentTab();
    // Only show active announcements
    const activeAnnouncements = announcementsData.filter(a => a.isActive !== false);
    if (tab === "pending") {
      // Show only unpinned and active
      const unpinned = activeAnnouncements.filter(a => !a.isPinned);
      renderTable(unpinned);
    } else if (tab === "approved") {
      // Show only pinned and active
      const pinned = activeAnnouncements.filter(a => a.isPinned === true);
      renderTable(pinned);
    }
  }

  // On initial load, show only unpinned in "All"
  fetchAnnouncements().then(() => {
    renderCurrentTab();
  });

  // Handle delete, edit, pin/unpin
  document.addEventListener("click", async (e) => {
    // DELETE
    if (e.target.closest(".btn-delete")) {
      const id = e.target.closest(".btn-delete").dataset.id;
      if (confirm("Are you sure you want to delete this announcement?")) {
        try {
          const res = await fetch(`http://localhost:5000/api/announcements/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (res.ok) fetchAnnouncements();
        } catch (err) {
          console.error("Delete error:", err);
        }
      }
    }

    // EDIT
    if (e.target.closest(".btn-edit")) {
      const id = e.target.closest(".btn-edit").dataset.id;
      try {
        const res = await fetch(`http://localhost:5000/api/announcements/${id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch announcement");
        const announcement = await res.json();
        const a = announcement.announcement || announcement;

        document.getElementById("title").value = a.title;
        document.getElementById("content").value = a.content;

        if (a.eventDate) {
          const dt = new Date(a.eventDate);
          document.getElementById("date").value = dt.toISOString().split("T")[0];
          document.getElementById("time").value = dt.toTimeString().slice(0,5);
        }

        editingId = id;
        modal.style.display = "block";
      } catch (err) {
        console.error("Edit error:", err);
      }
    }

    // PIN/UNPIN
    if (e.target.closest(".btn-pin")) {
      const btn = e.target.closest(".btn-pin");
      const id = btn.dataset.id;
      const isPinned = btn.classList.contains("pinned");
      try {
        const res = await fetch(`http://localhost:5000/api/announcements/${id}/pin`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ isPinned: !isPinned })
        });
        if (res.ok) {
          // Refetch and re-render the current tab immediately
          await fetchAnnouncements();
          renderCurrentTab();
        } else {
          alert("Failed to pin/unpin announcement");
        }
      } catch (err) {
        console.error("Pin error:", err);
      }
    }
  });

  // Handle form submit (Add or Edit)
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value;
    const content = document.getElementById("content").value;
    const date = document.getElementById("date").value;
    const time = document.getElementById("time").value;
    const eventDate = new Date(`${date}T${time}:00`);

    const category = "General";
    const expiresAt = new Date(eventDate.getTime() + 2 * 24 * 60 * 60 * 1000); // +2 days

    try {
      let url = "http://localhost:5000/api/announcements";
      let method = "POST";

      if (editingId) {
        url = `http://localhost:5000/api/announcements/${editingId}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title, content, eventDate, category, expiresAt })
      });

      if (res.ok) {
        hideModal(); // Use the new hide function
        form.reset();
        editingId = null;
        await fetchAnnouncements();
        renderCurrentTab();
      } else {
        alert("Failed to save announcement");
      }
    } catch (err) {
      console.error("Submit error:", err);
    }
  });

  // Helper to format date/time
  function formatDateTime(dt) {
    if (!dt) return "";
    const date = new Date(dt);
    return date.toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  // Close view modal
  document.getElementById("closeAnnouncementModal").onclick = function() {
    document.getElementById("announcementModal").style.display = "none";
  };
  window.onclick = function(event) {
    if (event.target == document.getElementById("announcementModal")) {
      document.getElementById("announcementModal").style.display = "none";
    }
  };

  // Check announcement status (Upcoming/Expired)
  function getAnnouncementStatus(dateString) {
    const today = new Date();
    const announcementDate = new Date(dateString);

    if (announcementDate >= today) {
        return "Upcoming";
    } else {
        return "Expired";
    }
  }

  fetchAnnouncements();
});

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