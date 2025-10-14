// =========================
// ANNOUNCEMENT SECTION
// =========================
document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector(".announcement-table tbody");
  const modal = document.getElementById("announcementModal");
  const modalTitle = modal.querySelector(".modal-header h3");
  const modalEventDate = modal.querySelector(".event-date");
  const modalCreatedDate = modal.querySelector(".created-date");
  const modalDescription = modal.querySelector(".description");
  const closeModalBtn = modal.querySelector(".close-modal");

  // Fetch announcements
  async function fetchAnnouncements() {
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

      renderAnnouncements(data.announcements || []);
    } catch (err) {
      console.error("Error fetching announcements:", err);
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center">Error loading announcements</td>
        </tr>
      `;
    }
  }

  // Render announcements into table
  function renderAnnouncements(announcements) {
    tableBody.innerHTML = "";

    const now = new Date();
    const upcomingAnnouncements = announcements.filter(a => {
      const ev = new Date(a.eventDate);
      return ev >= now;
    });

    upcomingAnnouncements.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
    const limitedAnnouncements = upcomingAnnouncements.slice(0, 5);

    limitedAnnouncements.forEach(a => {
      const status = getAnnouncementStatus(a.eventDate);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div class="announcement-title">
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

    for (let i = limitedAnnouncements.length; i < 5; i++) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td colspan="4" style="text-align:center; color: #888;">No announcements yet</td>
      `;
      tableBody.appendChild(tr);
    }
  }

  // View modal handler
  document.addEventListener("click", async (e) => {
    if (e.target.closest(".view-btn")) {
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
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) {
      Swal.fire({
        icon: 'warning',
        title: 'You need to log in first',
        text: 'Please log in to access KK Profiling.',
        confirmButtonText: 'OK'
      }).then(() => {
        window.location.href = '/Frontend/html/user/login.html';
      });
      return;
    }
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
          if (result.isConfirmed) window.location.href = "confirmation/html/kkconfirmation.html";
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
          if (result.isConfirmed) window.location.href = "confirmation/html/kkconfirmation.html";
        });
        return;
      }
      // CASE 4: Form open, no profile → Go to form
      window.location.href = "kkform-personal.html";
    })
    .catch(() => window.location.href = "kkform-personal.html");
  }

  // ✅ KK Profile click handler
  async function handleKKProfileNavClick(event) {
    event.preventDefault();
    console.log("🟢 KK Profile button clicked");

    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) {
      Swal.fire({
        icon: 'warning',
        title: 'You need to log in first',
        text: 'Please log in to access KK Profiling.',
        confirmButtonText: 'OK'
      }).then(() => {
        window.location.href = '/Frontend/html/user/login.html';
      });
      return;
    }

    try {
      console.log("📡 Fetching profile...");
      const res = await fetch('http://localhost:5000/api/kkprofiling/me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("📩 Response status:", res.status);

      if (res.status === 404) {
        const data = await res.json();
        console.log("ℹ️ No KK profile yet:", data);
        if (data.error === "You have not submitted a KK profile yet for the current cycle.") {
          window.location.href = "kkform-personal.html";
          return;
        }
      }

      if (res.ok) {
        console.log("✅ Profile exists, showing SweetAlert...");
        Swal.fire({
          title: "You already answered KK Profiling Form",
          text: "Do you want to view your response?",
          icon: "info",
          showCancelButton: true,
          confirmButtonText: "Yes",
          cancelButtonText: "No"
        }).then(result => {
          if (result.isConfirmed) {
            console.log("➡️ Redirecting to confirmation page...");
            window.location.href = "confirmation/html/kkcofirmation.html";
          }
        });
      } else {
        console.log("❌ Not OK response, redirecting to form...");
        window.location.href = "kkform-personal.html";
      }
    } catch (error) {
      console.error('🔥 Fetch error:', error);
      window.location.href = "kkform-personal.html";
    }
  }

  // ✅ Attach event listeners to both nav links
  const kkProfileNavBtn = document.querySelector('.navbar-center a[href="./kkform-personal.html"]');
  const kkProfileNavBtnMobile = document.getElementById('kkProfileNavBtnMobile');

  if (kkProfileNavBtn) {
    console.log("✅ Desktop KK Profile button found");
    kkProfileNavBtn.addEventListener('click', handleKKProfileNavClick);
  } else {
    console.warn("⚠️ Desktop KK Profile button NOT found");
  }

  if (kkProfileNavBtnMobile) {
    console.log("✅ Mobile KK Profile button found");
    kkProfileNavBtnMobile.addEventListener('click', handleKKProfileNavClick);
  } else {
    console.warn("⚠️ Mobile KK Profile button NOT found");
  }

  // ✅ LGBTQ Profile click handler
  async function handleLGBTQProfileNavClick(event) {
    event.preventDefault();
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) {
      Swal.fire({
        icon: 'warning',
        title: 'You need to log in first',
        text: 'Please log in to access LGBTQ+ Profiling.',
        confirmButtonText: 'OK'
      }).then(() => {
        window.location.href = '/Frontend/html/user/login.html';
      });
      return;
    }

    fetch('http://localhost:5000/api/lgbtqprofiling/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async res => {
        const data = await res.json();
        // If profile exists (res.ok), go to confirmation
        if (res.ok && data && data._id) {
          window.location.href = "confirmation/html/lgbtqconfirmation.html";
          return;
        }
        // If no profile (404 or error), go to profiling form
        window.location.href = "lgbtqform.html";
      })
      .catch(() => {
        window.location.href = "lgbtqform.html";
      });
  }

  // Attach to desktop nav button
  const lgbtqProfileNavBtnDesktop = document.getElementById('lgbtqProfileNavBtnDesktop');
  if (lgbtqProfileNavBtnDesktop) {
    lgbtqProfileNavBtnDesktop.addEventListener('click', handleLGBTQProfileNavClick);
  }

  // Attach to mobile nav button
  const lgbtqProfileNavBtnMobile = document.getElementById('lgbtqProfileNavBtnMobile');
  if (lgbtqProfileNavBtnMobile) {
    lgbtqProfileNavBtnMobile.addEventListener('click', handleLGBTQProfileNavClick);
  }

  // Educational Assistance Navigation
  function handleEducAssistanceNavClick(event) {
    event.preventDefault();
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) {
      Swal.fire({
        icon: 'warning',
        title: 'You need to log in first',
        text: 'Please log in to access Educational Assistance.',
        confirmButtonText: 'OK'
      }).then(() => {
        window.location.href = '/Frontend/html/user/login.html';
      });
      return;
    }
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
      // CASE 4: Form open, no profile → Go to form
      window.location.href = "Educational-assistance-user.html";
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
