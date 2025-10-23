// =========================
// ANNOUNCEMENT SECTION
// =========================

// Token validation helper function
function validateTokenAndRedirect(featureName = "this feature") {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) {
    Swal.fire({
      icon: 'warning',
      title: 'Authentication Required',
      text: `You need to log in first to access ${featureName}.`,
      confirmButtonText: 'Go to Login',
      confirmButtonColor: '#0A2C59',
      allowOutsideClick: false,
      allowEscapeKey: false,
    }).then(() => {
      window.location.href = '/Frontend/html/user/login.html';
    });
    return false;
  }
  return true;
}

document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector(".announcement-table tbody");
  const modal = document.getElementById("announcementModal");
  const modalTitle = modal.querySelector(".modal-header h3");
  const modalEventDate = modal.querySelector(".event-date");
  const modalCreatedDate = modal.querySelector(".created-date");
  const modalDescription = modal.querySelector(".description-box");
  const closeModalBtn = modal.querySelector(".close-modal");

  // Create or select a cards container for mobile view
  let cardsContainer = document.querySelector(".announcement-cards");
  if (!cardsContainer) {
    cardsContainer = document.createElement("div");
    cardsContainer.className = "announcement-cards";
    // Insert before the table for layout consistency
    const tableEl = document.querySelector(".announcement-table");
    if (tableEl && tableEl.parentNode) {
      tableEl.parentNode.insertBefore(cardsContainer, tableEl);
    }
  }

  // Keep last loaded announcements to support responsive re-rendering
  let lastAnnouncements = [];

  // Fetch announcements
  async function fetchAnnouncements() {
    // Check token first
    if (!validateTokenAndRedirect("announcements")) {
      return;
    }

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/announcements", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        console.error("Fetch failed:", res.status, await res.text());
        throw new Error("Failed to fetch announcements");
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch announcements");
      }

      lastAnnouncements = data.announcements || [];
      renderAnnouncementsResponsive(lastAnnouncements);
    } catch (err) {
      console.error("Error fetching announcements:", err);
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center">Error loading announcements</td>
        </tr>
      `;
    }
  }

  // Responsive renderer: choose cards (mobile) or table (desktop)
  function renderAnnouncementsResponsive(announcements) {
    const isMobile = window.matchMedia('(max-width: 600px)').matches;
    if (isMobile) {
      document.querySelector('.announcement-table')?.classList.add('hidden');
      renderAnnouncementsCards(announcements);
    } else {
      document.querySelector('.announcement-table')?.classList.remove('hidden');
      renderAnnouncementsTable(announcements);
    }
  }

  // Render announcements into table (desktop)
  function renderAnnouncementsTable(announcements) {
    tableBody.innerHTML = "";

    const now = new Date();
    const upcomingAnnouncements = announcements.filter(a => {
      const ev = new Date(a.eventDate);
      return ev >= now;
    });

    // Sort: pinned announcements first, then by event date
    upcomingAnnouncements.sort((a, b) => {
      // If one is pinned and the other isn't, pinned comes first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      // If both are pinned or both are not pinned, sort by event date
      return new Date(a.eventDate) - new Date(b.eventDate);
    });
    
    const limitedAnnouncements = upcomingAnnouncements.slice(0, 8);

    limitedAnnouncements.forEach(a => {
      const status = getAnnouncementStatus(a.eventDate);
      const tr = document.createElement("tr");
      
      // Add pinned class for styling
      if (a.isPinned) {
        tr.classList.add("pinned-row");
      }
      
      tr.innerHTML = `
        <td>
          <div class="announcement-title">
            ${a.isPinned ? '<i class="fa-solid fa-location-pin" style="color: #d4af37; margin-right: 8px;"></i>' : ''}
            <i class="fa-solid fa-bullhorn"></i>
            ${a.title}
          </div>
        </td>
        <td>${a.eventDate ? formatDateTime(a.eventDate) : "-"}</td>
        <td><span class="status-badge ${status.toLowerCase()}">${status}</span></td>
        <td>
          <button class="view-btn" data-id="${a._id}">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    for (let i = limitedAnnouncements.length; i < 8; i++) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
      `;
      tableBody.appendChild(tr);
    }
  }

  // Render announcements as cards (mobile)
  function renderAnnouncementsCards(announcements) {
    // Ensure container exists
    if (!cardsContainer) return;
    cardsContainer.innerHTML = "";

    // Hide the table body content when in mobile cards mode
    if (tableBody) tableBody.innerHTML = "";

    const now = new Date();
    const upcomingAnnouncements = (announcements || []).filter(a => {
      const ev = new Date(a.eventDate);
      return ev >= now;
    });

    upcomingAnnouncements.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(a.eventDate) - new Date(b.eventDate);
    });

    const limitedAnnouncements = upcomingAnnouncements.slice(0, 8);

    limitedAnnouncements.forEach(a => {
      const status = getAnnouncementStatus(a.eventDate);
      const card = document.createElement('div');
      card.className = 'announcement-card';
      card.innerHTML = `
        <div class="card-header">
          <div class="title">
            ${a.isPinned ? '<i class="fa-solid fa-location-pin" style="color: #d4af37; margin-right: 8px;"></i>' : ''}
            <i class="fa-solid fa-bullhorn"></i>
            <span>${a.title}</span>
          </div>
          <span class="status-badge ${status.toLowerCase()}">${status}</span>
        </div>
        <div class="card-meta">
          <div class="meta-row"><i class="fa-regular fa-calendar"></i> ${a.eventDate ? formatDateTime(a.eventDate) : '-'}</div>
          <div class="meta-row"><i class="fa-regular fa-clock"></i> Posted: ${a.createdAt ? formatDateTime(a.createdAt) : '-'}</div>
        </div>
        <div class="card-actions">
          <button class="view-btn" data-id="${a._id}"><i class="fas fa-eye"></i> View</button>
        </div>
      `;
      cardsContainer.appendChild(card);
    });

    // Show cards container and hide table on mobile
    cardsContainer.style.display = 'block';
    const tableEl = document.querySelector('.announcement-table');
    if (tableEl) tableEl.style.display = 'none';
  }

  // Handle resize to re-render appropriately
  window.addEventListener('resize', () => {
    if (!lastAnnouncements) return;
    // Toggle visibility styles back when moving to desktop
    const tableEl = document.querySelector('.announcement-table');
    if (window.matchMedia('(max-width: 600px)').matches) {
      if (cardsContainer) cardsContainer.style.display = 'block';
      if (tableEl) tableEl.style.display = 'none';
    } else {
      if (cardsContainer) cardsContainer.style.display = 'none';
      if (tableEl) tableEl.style.display = '';
    }
    renderAnnouncementsResponsive(lastAnnouncements);
  });

  // View modal handler
  document.addEventListener("click", async (e) => {
    if (e.target.closest(".view-btn")) {
      if (!validateTokenAndRedirect("announcement details")) {
        return;
      }
      
      const id = e.target.closest(".view-btn").dataset.id;
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");

        const res = await fetch(`http://localhost:5000/api/announcements/${id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Announcement not found");
        const { announcement } = await res.json();

        modalTitle.textContent = announcement.title;
        modalEventDate.textContent = formatDateTime(announcement.eventDate);
        modalCreatedDate.textContent = `Posted: ${formatDateTime(announcement.createdAt)}`;
        modalDescription.textContent = announcement.content;

        modal.classList.add("active");
      } catch (err) {
        console.error("Error fetching announcement:", err);
        alert("Failed to load announcement details");
      }
    }
  });

  // Close modal
  closeModalBtn.addEventListener("click", () => {
    modal.classList.remove("active");
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("active");
  });

  // Helper functions
  function formatDateTime(dt) {
    if (!dt) return "";
    return new Date(dt).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  }

  function getAnnouncementStatus(eventDate) {
    if (!eventDate) return "Unknown";
    const now = new Date();
    const ev = new Date(eventDate);
    return ev >= now ? "Upcoming" : "Expired";
  }

  // Load announcements on page load
  fetchAnnouncements();

  // =========================
  // REALTIME UPDATES WITH WEBSOCKET
  // =========================
  // Connect to WebSocket server
  const socket = io("http://localhost:5000", { transports: ["websocket"] });

  // Listen for announcement updates
  socket.on("announcement:created", (data) => {
    console.log("New announcement created:", data);
    // Refresh announcements to show the new one
    fetchAnnouncements();
  });

  socket.on("announcement:updated", (data) => {
    console.log("Announcement updated:", data);
    // Refresh announcements to show the updated one
    fetchAnnouncements();
  });

  socket.on("announcement:deleted", (data) => {
    console.log("Announcement deleted:", data);
    // Refresh announcements to remove the deleted one
    fetchAnnouncements();
  });

  socket.on("announcement:pinned", (data) => {
    console.log("Announcement pinned:", data);
    // Refresh announcements to show pin status
    fetchAnnouncements();
  });

  socket.on("announcement:unpinned", (data) => {
    console.log("Announcement unpinned:", data);
    // Refresh announcements to show pin status
    fetchAnnouncements();
  });

  // Handle connection errors
  socket.on("connect_error", (error) => {
    console.log("WebSocket connection error:", error);
  });

  socket.on("disconnect", (reason) => {
    console.log("WebSocket disconnected:", reason);
  });
});


// =========================
// NAVBAR & KK PROFILING SECTION
// =========================
document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.getElementById('navbarHamburger');
  const mobileMenu = document.getElementById('navbarMobileMenu');

  if (hamburger && mobileMenu) {
    console.log('✅ Navbar loaded');
    hamburger.addEventListener('click', function(e) {
      e.stopPropagation();
      mobileMenu.classList.toggle('active');
    });
    document.addEventListener('click', function(e) {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('active');
      }
    });
  }

  // KK Profile Navigation
  function handleKKProfileNavClick(event) {
    event.preventDefault();
    if (!validateTokenAndRedirect("KK Profiling")) {
      return;
    }
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    Promise.all([
      fetch('http://localhost:5000/api/formcycle/status?formName=KK%20Profiling', {
        headers: { Authorization: `Bearer ${token}` }
      }),
      fetch('http://localhost:5000/api/kkprofiling/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
    ])
    .then(async ([cycleRes, profileRes]) => {
      let cycleData = await cycleRes.json().catch(() => null);
      let profileData = await profileRes.json().catch(() => ({}));
      const latestCycle = Array.isArray(cycleData) ? cycleData[cycleData.length - 1] : cycleData;
      const formName = latestCycle?.formName || "KK Profiling";
      const isFormOpen = latestCycle?.isOpen ?? false;
      const hasProfile = profileRes.ok && profileData && profileData._id;
      // CASE 1: Form closed, user already has profile
      if (!isFormOpen && hasProfile) {
        Swal.fire({
          icon: "info",
          title: `The ${formName} is currently closed`,
          text: `but you already have a ${formName} profile. Do you want to view your response?`,
          showCancelButton: true,
          confirmButtonText: "Yes, view my response",
          cancelButtonText: "No"
        }).then(result => {
          if (result.isConfirmed) window.location.href = "./confirmation/html/kkcofirmation.html";
        });
        return;
      }
      // CASE 2: Form closed, user has NO profile
      if (!isFormOpen && !hasProfile) {
        Swal.fire({
          icon: "warning",
          title: `The ${formName} form is currently closed`,
          text: "You cannot submit a new response at this time.",
          confirmButtonText: "OK"
        });
        return;
      }
      // CASE 3: Form open, user already has a profile
      if (isFormOpen && hasProfile) {
        Swal.fire({
          title: `You already answered ${formName} Form`,
          text: "Do you want to view your response?",
          icon: "info",
          showCancelButton: true,
          confirmButtonText: "Yes",
          cancelButtonText: "No"
        }).then(result => {
          if (result.isConfirmed) window.location.href = "./confirmation/html/kkcofirmation.html";
        });
        return;
      }
      // CASE 4: Form open, no profile → Show SweetAlert and go to form
      if (isFormOpen && !hasProfile) {
        Swal.fire({
          icon: "info",
          title: `No profile found`,
          text: `You don't have a profile yet. Please fill out the form to create one.`,
          confirmButtonText: "Go to form"
        }).then(() => {
          window.location.href = "kkform-personal.html";
        });
        return;
      }
    })
    .catch(() => window.location.href = "kkform-personal.html");
  }

  // LGBTQ+ Profile Navigation
  function handleLGBTQProfileNavClick(event) {
    event.preventDefault();
    if (!validateTokenAndRedirect("LGBTQ+ Profiling")) {
      return;
    }
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    Promise.all([
      fetch('http://localhost:5000/api/formcycle/status?formName=LGBTQIA%2B%20Profiling', {
        headers: { Authorization: `Bearer ${token}` }
      }),
      fetch('http://localhost:5000/api/lgbtqprofiling/me/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
    ])
    .then(async ([cycleRes, profileRes]) => {
      let cycleData = await cycleRes.json().catch(() => null);
      let profileData = await profileRes.json().catch(() => ({}));
      const latestCycle = Array.isArray(cycleData) ? cycleData[cycleData.length - 1] : cycleData;
      const formName = latestCycle?.formName || "LGBTQIA+ Profiling";
      const isFormOpen = latestCycle?.isOpen ?? false;
      const hasProfile = profileData && profileData._id ? true : false;
      // CASE 1: Form closed, user already has profile
      if (!isFormOpen && hasProfile) {
        Swal.fire({
          icon: "info",
          title: `The ${formName} is currently closed`,
          text: `but you already have a ${formName} profile. Do you want to view your response?`,
          showCancelButton: true,
          confirmButtonText: "Yes, view my response",
          cancelButtonText: "No"
        }).then(result => {
          if (result.isConfirmed) window.location.href = "confirmation/html/lgbtqconfirmation.html";
        });
        return;
      }
      // CASE 2: Form closed, user has NO profile
      if (!isFormOpen && !hasProfile) {
        Swal.fire({
          icon: "warning",
          title: `The ${formName} form is currently closed`,
          text: "You cannot submit a new response at this time.",
          confirmButtonText: "OK"
        });
        return;
      }
      // CASE 3: Form open, user already has a profile
      if (isFormOpen && hasProfile) {
        Swal.fire({
          title: `You already answered ${formName} Form`,
          text: "Do you want to view your response?",
          icon: "info",
          showCancelButton: true,
          confirmButtonText: "Yes",
          cancelButtonText: "No"
        }).then(result => {
          if (result.isConfirmed) window.location.href = "confirmation/html/lgbtqconfirmation.html";
        });
        return;
      }
      // CASE 4: Form open, no profile → Show SweetAlert and go to form
      if (isFormOpen && !hasProfile) {
        Swal.fire({
          icon: "info",
          title: `No profile found`,
          text: `You don't have a profile yet. Please fill out the form to create one.`,
          confirmButtonText: "Go to form"
        }).then(() => {
          window.location.href = "lgbtqform.html";
        });
        return;
      }
    })
    .catch(() => window.location.href = "lgbtqform.html");
  }

  // Educational Assistance Navigation
  function handleEducAssistanceNavClick(event) {
    event.preventDefault();
    if (!validateTokenAndRedirect("Educational Assistance")) {
      return;
    }
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    Promise.all([
      fetch('http://localhost:5000/api/formcycle/status?formName=Educational%20Assistance', {
        headers: { Authorization: `Bearer ${token}` }
      }),
      fetch('http://localhost:5000/api/educational-assistance/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
    ])
    .then(async ([cycleRes, profileRes]) => {
      let cycleData = await cycleRes.json().catch(() => null);
      let profileData = await profileRes.json().catch(() => ({}));
      const latestCycle = Array.isArray(cycleData) ? cycleData[cycleData.length - 1] : cycleData;
      const formName = latestCycle?.formName || "Educational Assistance";
      const isFormOpen = latestCycle?.isOpen ?? false;
      const hasProfile = profileData && profileData._id ? true : false;
      // CASE 1: Form closed, user already has profile
      if (!isFormOpen && hasProfile) {
        Swal.fire({
          icon: "info",
          title: `The ${formName} is currently closed`,
          text: `but you already have an application. Do you want to view your response?`,
          showCancelButton: true,
          confirmButtonText: "Yes, view my response",
          cancelButtonText: "No"
        }).then(result => {
          if (result.isConfirmed) window.location.href = "confirmation/html/educConfirmation.html";
        });
        return;
      }
      // CASE 2: Form closed, user has NO profile
      if (!isFormOpen && !hasProfile) {
        Swal.fire({
          icon: "warning",
          title: `The ${formName} form is currently closed`,
          text: "You cannot submit a new application at this time.",
          confirmButtonText: "OK"
        });
        return;
      }
      // CASE 3: Form open, user already has a profile
      if (isFormOpen && hasProfile) {
        Swal.fire({
          title: `You already applied for ${formName}`,
          text: "Do you want to view your response?",
          icon: "info",
          showCancelButton: true,
          confirmButtonText: "Yes",
          cancelButtonText: "No"
        }).then(result => {
          if (result.isConfirmed) window.location.href = "confirmation/html/educConfirmation.html";
        });
        return;
      }
      // CASE 4: Form open, no profile → Show SweetAlert and go to form
      if (isFormOpen && !hasProfile) {
        Swal.fire({
          icon: "info",
          title: `No profile found`,
          text: `You don't have a profile yet. Please fill out the form to create one.`,
          confirmButtonText: "Go to form"
        }).then(() => {
          window.location.href = "Educational-assistance-user.html";
        });
        return;
      }
    })
    .catch(() => window.location.href = "Educational-assistance-user.html");
  }

  // KK Profile
  document.getElementById('kkProfileNavBtnDesktop')?.addEventListener('click', handleKKProfileNavClick);
  document.getElementById('kkProfileNavBtnMobile')?.addEventListener('click', handleKKProfileNavClick);

  // LGBTQ+ Profile
  document.getElementById('lgbtqProfileNavBtnDesktop')?.addEventListener('click', handleLGBTQProfileNavClick);
  document.getElementById('lgbtqProfileNavBtnMobile')?.addEventListener('click', handleLGBTQProfileNavClick);

  // Educational Assistance
  document.getElementById('educAssistanceNavBtnDesktop')?.addEventListener('click', handleEducAssistanceNavClick);
  document.getElementById('educAssistanceNavBtnMobile')?.addEventListener('click', handleEducAssistanceNavClick);
});
