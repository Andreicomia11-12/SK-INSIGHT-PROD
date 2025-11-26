// =========================
// ANNOUNCEMENT SECTION
// =========================

document.addEventListener("DOMContentLoaded", async () => {
  const tableBody = document.querySelector(".announcement-table tbody");
  const tableHead = document.querySelector(".announcement-table thead tr");
  const modal = document.getElementById("announcementModal");
  const modalTitle = modal.querySelector(".modal-header h3");
  const modalEventDate = modal.querySelector(".event-date");
  const modalCreatedDate = modal.querySelector(".created-date");
  const modalDescription = modal.querySelector(".description-box");
  const closeModalBtn = modal.querySelector(".close-modal");

  let cardsContainer = document.querySelector(".announcement-cards");
  if (!cardsContainer) {
    cardsContainer = document.createElement("div");
    cardsContainer.className = "announcement-cards";
    const tableEl = document.querySelector(".announcement-table");
    if (tableEl && tableEl.parentNode) {
      tableEl.parentNode.insertBefore(cardsContainer, tableEl);
    }
  }

  let lastAnnouncements = [];
  let generalAnnouncements = [];
  let expiredAnnouncements = [];
  let forYouAnnouncements = [];
  let currentUserId = null;

  async function loadCurrentUserId() {
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('http://localhost:5000/api/users/me', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      // API may return { user: {...} } or the user object directly
      const userObj = (data && data.user) ? data.user : data;
      currentUserId = (userObj && (userObj._id || userObj.id)) || null;
    } catch (err) {
      console.warn('Failed to load current user id', err);
    }
  }

  const tabBtns = document.querySelectorAll('.tab-btn');
  let currentTab = 'general';

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      updateTableHeader();
      renderTabAnnouncements();
    });
  });

  function updateTableHeader() {
    if (!tableHead) return;
    // Change the second column header based on tab
    const ths = tableHead.querySelectorAll("th");
    if (ths.length >= 2) {
      if (currentTab === "foryou") {
        ths[1].textContent = "Created At";
      } else {
        ths[1].textContent = "Event Date";
      }
    }
  }

  async function fetchGeneralAndExpired() {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const res = await fetch("http://localhost:5000/api/announcements", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const all = data.announcements || [];
    // Determine expiration based solely on expiresAt timestamp from the database
    // Determine expiration based solely on eventDate from the database
    const now = new Date();
    generalAnnouncements = all.filter(a => {
      if (a.recipient !== null) return false;
      // If there's no eventDate, keep it in general (status will be Unknown)
      if (!a.eventDate) return true;
      const ed = new Date(a.eventDate);
      if (isNaN(ed.getTime())) return true; // malformed date -> treat as general
      return ed >= now;
    });
    expiredAnnouncements = all.filter(a => {
      if (a.recipient !== null) return false;
      if (!a.eventDate) return false;
      const ed = new Date(a.eventDate);
      if (isNaN(ed.getTime())) return false;
      return ed < now;
    });
  }

  async function fetchForYou() {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const res = await fetch("http://localhost:5000/api/announcements/myannouncements", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    forYouAnnouncements = data.announcements || [];
    // Log for debugging
    console.log("For You Announcements:", forYouAnnouncements);
  }

  // Mark an announcement as viewed for the current user (server will push user id into viewedBy)
  async function markAnnouncementViewed(id) {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token || !id) return;
      const res = await fetch(`http://localhost:5000/api/announcements/${id}/view`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        // non-fatal: server may already have it marked or endpoint may be protected
        console.warn("Failed to mark announcement viewed", res.status);
      }
      // refresh announcements UI and the badge (if the badge script exposes the helper)
      try { await renderTabAnnouncements(); } catch (e) { /* ignore */ }
      if (window.updateNotificationBadge) {
        try { window.updateNotificationBadge(); } catch (e) { /* ignore */ }
      }
    } catch (err) {
      console.warn("markAnnouncementViewed error", err);
    }
  }

  async function renderTabAnnouncements() {
    if (currentTab === 'general' || currentTab === 'expired') {
      await fetchGeneralAndExpired();
    }
    if (currentTab === 'foryou') {
      await fetchForYou();
    }
    let announcements = [];
    if (currentTab === 'general') {
      announcements = generalAnnouncements;
    } else if (currentTab === 'foryou') {
      announcements = forYouAnnouncements;
    } else if (currentTab === 'expired') {
      announcements = expiredAnnouncements;
    }
    lastAnnouncements = announcements;
    renderAnnouncementsResponsive(announcements);
  }

  function renderAnnouncementsResponsive(announcements) {
    const isMobile = window.matchMedia('(max-width: 600px)').matches;
    const tableEl = document.querySelector('.announcement-table');
    if (isMobile) {
      if (tableEl) tableEl.classList.add('hidden');
      renderAnnouncementsCards(announcements);
    } else {
      // show the table and hide cards container
      if (tableEl) tableEl.classList.remove('hidden');
      // ensure cards container is hidden before rendering table
      if (cardsContainer) cardsContainer.style.display = 'none';
      renderAnnouncementsTable(announcements);
    }
  }

  function renderAnnouncementsTable(announcements) {
    // hide cards container when rendering the table
    if (cardsContainer) cardsContainer.style.display = 'none';
    tableBody.innerHTML = "";

    let displayAnnouncements = announcements;
    const now = new Date();

    if (currentTab === 'general') {
      displayAnnouncements = announcements.filter(a => {
        if (!a.eventDate) return true;
        const ed = new Date(a.eventDate);
        if (isNaN(ed.getTime())) return true;
        return ed >= now;
      });
      // Sort by nearest eventDate (soonest first)
      displayAnnouncements.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
      // ensure pinned announcements appear first while keeping relative order
      const pinned = displayAnnouncements.filter(x => x.isPinned);
      const unpinned = displayAnnouncements.filter(x => !x.isPinned);
      displayAnnouncements = pinned.concat(unpinned);
    }
    else if (currentTab === 'expired') {
      displayAnnouncements = announcements.filter(a => {
        if (!a.eventDate) return false;
        const ed = new Date(a.eventDate);
        if (isNaN(ed.getTime())) return false;
        return ed < now;
      });
      // Sort so latest expired (most recent eventDate) is on top
      displayAnnouncements.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
    }
    else if (currentTab === 'foryou') {
      displayAnnouncements = announcements.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      // pinned on top
      const pinnedFY = displayAnnouncements.filter(x => x.isPinned);
      const unpinnedFY = displayAnnouncements.filter(x => !x.isPinned);
      displayAnnouncements = pinnedFY.concat(unpinnedFY);
    }

    const itemsToShow = displayAnnouncements; // show all announcements

    itemsToShow.forEach(a => {
      let status, dateCol;
      if (currentTab === 'foryou') {
        status = "No Expiry";
        dateCol = a.createdAt ? formatDateTime(a.createdAt) : "-";
      } else {
        status = getAnnouncementStatus(a);
        dateCol = a.eventDate ? formatDateTime(a.eventDate) : "-";
      }
        const tr = document.createElement("tr");
      if (a.isPinned) {
        tr.classList.add("pinned-row");
      }
        // read/unread visual state
        try {
          const viewedBy = Array.isArray(a.viewedBy) ? a.viewedBy.map(String) : [];
          const isRead = currentUserId ? viewedBy.includes(String(currentUserId)) : false;
          tr.classList.add(isRead ? 'announcement-read' : 'announcement-notread');
        } catch (e) {
          // ignore
        }
      // Add status hue for For You tab
if (currentTab === 'foryou') {
  const title = (a.title || "").toLowerCase();
  if (title.includes("rejected") || title.includes("deleted")) {
    tr.classList.add("announcement-row-rejected");
  } else if (title.includes("approved") || title.includes("restored")) {
    tr.classList.add("announcement-row-approved");
  }
}
      tr.innerHTML = `
        <td>
          <div class="announcement-title">
            ${a.isPinned ? '<i class="fa-solid fa-location-pin" style="color: #d4af37; margin-right: 8px;"></i>' : ''}
            <i class="fa-solid fa-bullhorn"></i>
            ${a.title}
          </div>
        </td>
        <td>${dateCol}</td>
        <td><span class="status-badge ${status.toLowerCase().replace(/\s/g, '')}">${status}</span></td>
        <td>
          <button class="view-btn" data-id="${a._id}">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // If there are no announcements to show, render a friendly placeholder row
    if (!itemsToShow || itemsToShow.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="4" style="text-align:center; padding:16px;">No announcements found.</td>`;
      tableBody.appendChild(tr);
    }
    // make sure the table is visible (in case a previous code path hid it)
    const tableEl = document.querySelector('.announcement-table');
    if (tableEl) {
      tableEl.classList.remove('hidden');
      tableEl.style.display = '';
    }
  }

  function renderAnnouncementsCards(announcements) {
    if (!cardsContainer) return;
    cardsContainer.innerHTML = "";
    if (tableBody) tableBody.innerHTML = "";

    let displayAnnouncements = announcements;
    const now = new Date();

    if (currentTab === 'general') {
      displayAnnouncements = (announcements || []).filter(a => {
        if (!a.eventDate) return true;
        const ed = new Date(a.eventDate);
        if (isNaN(ed.getTime())) return true;
        return ed >= now;
      });
      displayAnnouncements.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
      // pinned first
      const pinned = displayAnnouncements.filter(x => x.isPinned);
      const unpinned = displayAnnouncements.filter(x => !x.isPinned);
      displayAnnouncements = pinned.concat(unpinned);
    }
    else if (currentTab === 'expired') {
      displayAnnouncements = (announcements || []).filter(a => {
        if (!a.eventDate) return false;
        const ed = new Date(a.eventDate);
        if (isNaN(ed.getTime())) return false;
        return ed < now;
      });
      displayAnnouncements.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
    }
    else if (currentTab === 'foryou') {
      displayAnnouncements = announcements.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      // pinned first
      const pinnedFY = displayAnnouncements.filter(x => x.isPinned);
      const unpinnedFY = displayAnnouncements.filter(x => !x.isPinned);
      displayAnnouncements = pinnedFY.concat(unpinnedFY);
    }

    const itemsToShow = displayAnnouncements; // show all announcements

    itemsToShow.forEach(a => {
      let status, dateCol;
      if (currentTab === 'foryou') {
        status = "No Expiry";
        dateCol = a.createdAt ? formatDateTime(a.createdAt) : "-";
      } else {
        status = getAnnouncementStatus(a);
        dateCol = a.eventDate ? formatDateTime(a.eventDate) : "-";
      }
      const card = document.createElement('div');
      // read/unread visual state for cards
      try {
        const viewedBy2 = Array.isArray(a.viewedBy) ? a.viewedBy.map(String) : [];
        const isReadCard = currentUserId ? viewedBy2.includes(String(currentUserId)) : false;
        card.className = 'announcement-card ' + (isReadCard ? 'announcement-read' : 'announcement-notread');
      } catch (e) {
        card.className = 'announcement-card';
      }
      // Add status hue for For You tab
if (currentTab === 'foryou') {
  const title = (a.title || "").toLowerCase();
  if (title.includes("rejected") || title.includes("deleted")) {
    card.classList.add("announcement-card-rejected");
  } else if (title.includes("approved") || title.includes("restored")) {
    card.classList.add("announcement-card-approved");
  }
}
      card.innerHTML = `
        <div class="card-header">
          <div class="title">
            ${a.isPinned ? '<i class="fa-solid fa-location-pin" style="color: #d4af37; margin-right: 8px;"></i>' : ''}
            <i class="fa-solid fa-bullhorn"></i>
            <span>${a.title}</span>
            <span class="status-badge ${status.toLowerCase().replace(/\s/g, '')}">${status}</span>
          </div>
        </div>
        <div class="card-meta">
          <div class="meta-row"><i class="fa-regular fa-calendar"></i> ${dateCol}</div>
          <div class="meta-row"><i class="fa-regular fa-clock"></i> Posted: ${a.createdAt ? formatDateTime(a.createdAt) : '-'}</div>
        </div>
      `;

      card.addEventListener('click', async () => {
        if (!validateTokenAndRedirect("announcement details")) {
          return;
        }
        try {
          const token = localStorage.getItem("token") || sessionStorage.getItem("token");
          const res = await fetch(`http://localhost:5000/api/announcements/${a._id}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (!res.ok) throw new Error("Announcement not found");
          const { announcement } = await res.json();
          modalTitle.textContent = announcement.title;
          // For "foryou" tab, hide event date in modal
          if (currentTab === 'foryou') {
            modalEventDate.style.display = "none";
          } else {
            modalEventDate.style.display = "";
            modalEventDate.textContent = formatDateTime(announcement.eventDate);
          }
          modalCreatedDate.textContent = `Posted: ${formatDateTime(announcement.createdAt)}`;
          modalDescription.textContent = announcement.content;
          modal.classList.add("active");
          // mark as viewed on the server and refresh badge/UI
          try { await markAnnouncementViewed(a._id); } catch (e) { /* ignore */ }
        } catch (err) {
          console.error("Error fetching announcement:", err);
          alert("Failed to load announcement details");
        }
      });

      cardsContainer.appendChild(card);
    });

    // If there are no cards to show, render a placeholder message
    if (!itemsToShow || itemsToShow.length === 0) {
      cardsContainer.innerHTML = '<div class="no-announcements" style="padding:16px; text-align:center;">No announcements found.</div>';
    }

    // show cards and hide the table using the "hidden" class
    cardsContainer.style.display = 'block';
    const tableEl = document.querySelector('.announcement-table');
    if (tableEl) tableEl.classList.add('hidden');
  }

  // Modal view for table (desktop)
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
        // For "foryou" tab, hide event date in modal
        if (currentTab === 'foryou') {
          modalEventDate.style.display = "none";
        } else {
          modalEventDate.style.display = "";
          modalEventDate.textContent = formatDateTime(announcement.eventDate);
        }
        modalCreatedDate.textContent = `Posted: ${formatDateTime(announcement.createdAt)}`;
        modalDescription.textContent = announcement.content;
        modal.classList.add("active");
  // mark as viewed on the server and refresh badge/UI
  try { await markAnnouncementViewed(id); } catch (e) { /* ignore */ }
      } catch (err) {
        console.error("Error fetching announcement:", err);
        alert("Failed to load announcement details");
      }
    }
  });

  closeModalBtn.addEventListener("click", () => {
    modal.classList.remove("active");
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("active");
  });

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

  function getAnnouncementStatus(announcement) {
    if (!announcement) return "Unknown";
    const eventDate = announcement.eventDate;
    if (!eventDate) return "Unknown";
    const ed = new Date(eventDate);
    if (isNaN(ed.getTime())) return "Unknown";
    const now = new Date();
    return ed >= now ? "Upcoming" : "Expired";
  }

  // Initial load: show general tab and update header
  await loadCurrentUserId();
  updateTableHeader();
  await renderTabAnnouncements();

  // WebSocket updates (optional, keep your logic here)
  const socket = io("http://localhost:5000", { transports: ["websocket"] });
  socket.on("announcement:created", renderTabAnnouncements);
  socket.on("announcement:updated", renderTabAnnouncements);
  socket.on("announcement:deleted", renderTabAnnouncements);
  socket.on("announcement:pinned", renderTabAnnouncements);
  socket.on("announcement:unpinned", renderTabAnnouncements);
  
  // Listen for breakpoint changes (mobile <-> desktop) and re-render accordingly.
  // Using matchMedia 'change' is more efficient than raw resize events.
  (function setupBreakpointListener() {
    try {
      const mq = window.matchMedia('(max-width: 600px)');
      const handleMqChange = (e) => {
        try {
          if (lastAnnouncements && lastAnnouncements.length) {
            renderAnnouncementsResponsive(lastAnnouncements);
          } else {
            // If data not yet loaded, trigger a full render which will fetch data
            renderTabAnnouncements();
          }
        } catch (err) {
          console.warn('Error handling media query change, falling back to full render', err);
          renderTabAnnouncements();
        }
      };
      // Initial sync in case JS loaded after a size change
      mq.matches ? renderAnnouncementsResponsive(lastAnnouncements) : renderAnnouncementsResponsive(lastAnnouncements);
      if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', handleMqChange);
      } else if (typeof mq.addListener === 'function') {
        // Older browsers
        mq.addListener(handleMqChange);
      }
    } catch (err) {
      // If matchMedia is not supported, fallback to a debounced resize listener
      let resizeTimer = null;
      window.addEventListener('resize', () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          try {
            if (lastAnnouncements && lastAnnouncements.length) {
              renderAnnouncementsResponsive(lastAnnouncements);
            } else {
              renderTabAnnouncements();
            }
          } catch (err2) {
            console.warn('Resize fallback failed', err2);
            renderTabAnnouncements();
          }
        }, 150);
      });
    }
  })();

});
// =========================
// NAVBAR & KK PROFILING SECTION
// =========================
document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.getElementById('navbarHamburger');
  const mobileMenu = document.getElementById('navbarMobileMenu');

  if (hamburger && mobileMenu) {
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
          if (result.isConfirmed) window.location.href = "confirmation/html/kkcofirmation.html";
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
          if (result.isConfirmed) window.location.href = "confirmation/html/kkcofirmation.html";
        });
        return;
      }
      // CASE 4: Form open, no profile → Show SweetAlert and go to form
      if (isFormOpen && !hasProfile) {
      Swal.fire({
        icon: "info",
        title: `No profile found`,
        text: `You don't have a profile yet. Please fill out the form to create one.`,
        showCancelButton: true, // Show the "No" button
        confirmButtonText: "Go to form", // Text for the "Go to Form" button
        cancelButtonText: "No", // Text for the "No" button
      }).then(result => {
        if (result.isConfirmed) {
          // Redirect to the form page when "Go to Form" is clicked
          window.location.href = "kkform-personal.html";
        } else if (result.dismiss === Swal.DismissReason.cancel) {
        }
      });
      return;
    }
    })
    .catch(() => window.location.href = "kkform-personal.html");
  }

  // LGBTQ+ Profile Navigation
  function handleLGBTQProfileNavClick(event) {
    event.preventDefault();
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
        showCancelButton: true, // Show the "No" button
        confirmButtonText: "Go to form", // Text for the "Go to Form" button
        cancelButtonText: "No", // Text for the "No" button
      }).then(result => {
        if (result.isConfirmed) {
          // Redirect to the form page when "Go to Form" is clicked
          window.location.href = "lgbtqform.html";
        } else if (result.dismiss === Swal.DismissReason.cancel) {
        }
      });
      return;
    }
    })
    .catch(() => window.location.href = "lgbtqform.html");
  }

  // Educational Assistance Navigation
  function handleEducAssistanceNavClick(event) {
    event.preventDefault();
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
        showCancelButton: true, // Show the "No" button
        confirmButtonText: "Go to form", // Text for the "Go to Form" button
        cancelButtonText: "No", // Text for the "No" button
      }).then(result => {
        if (result.isConfirmed) {
          // Redirect to the form page when "Go to Form" is clicked
          window.location.href = "Educational-assistance-user.html";
        } else if (result.dismiss === Swal.DismissReason.cancel) {
        }
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

    // Educational Assistance - prefer reusable helper when available
  function attachEducHandler(btn) {
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      if (window.checkAndPromptEducReapply) {
        try { window.checkAndPromptEducReapply({ event: e, redirectUrl: 'Educational-assistance-user.html' }); }
        catch (err) { handleEducAssistanceNavClick(e); }
      } else {
        handleEducAssistanceNavClick(e);
      }
    });
  }

  attachEducHandler(document.getElementById('educAssistanceNavBtnDesktop'));
  attachEducHandler(document.getElementById('educAssistanceNavBtnMobile'));

  // Embed educRejected helper so this page can prompt to reapply if needed
  (function () {
    async function getJsonSafe(res) { try { return await res.json(); } catch (e) { return null; } }

    async function checkAndPromptEducReapply(opts = {}) {
      const {
        event,
        redirectUrl = 'Educational-assistance-user.html',
        draftKeys = ['educDraft','educationalDraft','educAssistanceDraft'],
        formName = 'Educational Assistance',
        apiBase = 'http://localhost:5000'
      } = opts || {};

      if (event && typeof event.preventDefault === 'function') event.preventDefault();

      const token = opts.token || sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) return { redirected: false, isRejected: false, hasProfile: false, isFormOpen: false };

      try {
        const cycleUrl = `${apiBase}/api/formcycle/status?formName=${encodeURIComponent(formName)}`;
        const profileUrl = `${apiBase}/api/educational-assistance/me`;
        const [cycleRes, profileRes] = await Promise.all([
          fetch(cycleUrl, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(profileUrl, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const cycleData = await getJsonSafe(cycleRes);
        const profileData = await getJsonSafe(profileRes) || {};
        const latestCycle = Array.isArray(cycleData) ? cycleData[cycleData.length - 1] : cycleData;
        const isFormOpen = latestCycle?.isOpen ?? false;
        const hasProfile = Boolean(profileData && (profileData._id || profileData.id));

        const statusVal = (profileData && (profileData.status || profileData.decision || profileData.adminDecision || profileData.result)) || '';
        const isRejected = Boolean(
          (profileData && (profileData.rejected === true || profileData.isRejected === true)) ||
          (typeof statusVal === 'string' && /reject|denied|denied_by_admin|rejected/i.test(statusVal))
        );
        const isApproved = Boolean(
          (profileData && (profileData.status === 'approved' || profileData.approved === true)) ||
          (typeof statusVal === 'string' && /approve|approved/i.test(statusVal))
        );

        if (isFormOpen && (!hasProfile || isRejected)) {
          if (isRejected) {
            await Swal.fire({ icon: 'warning', title: 'Previous Application Rejected', text: 'Your previous application was rejected. You will be redirected to the form to submit a new application.' });
            try { draftKeys.forEach(k => sessionStorage.removeItem(k)); } catch (e) {}
            window.location.href = redirectUrl;
            return { redirected: true, isRejected, hasProfile, isFormOpen };
          } else {
            const text = `You don't have a profile yet. Please fill out the form to create one.`;
            const result = await Swal.fire({ icon: 'info', title: 'No profile found', text, showCancelButton: true, confirmButtonText: 'Go to form', cancelButtonText: 'No' });
            if (result && result.isConfirmed) {
              try { draftKeys.forEach(k => sessionStorage.removeItem(k)); } catch (e) {}
              window.location.href = redirectUrl;
              return { redirected: true, isRejected, hasProfile, isFormOpen };
            }
          }
        }

        if (!isFormOpen && hasProfile && isApproved) {
          const res2 = await Swal.fire({ icon: 'info', title: `The ${formName} is currently closed`, text: `Your application has been approved. Do you want to view your response?`, showCancelButton: true, confirmButtonText: 'Yes, view my response', cancelButtonText: 'No' });
          if (res2 && res2.isConfirmed) { window.location.href = `./confirmation/html/educConfirmation.html`; return { redirected: true, isRejected, hasProfile, isFormOpen }; }
        }

        return { redirected: false, isRejected, hasProfile, isFormOpen };
      } catch (err) {
        console.error('checkAndPromptEducReapply error', err);
        return { redirected: false, isRejected: false, hasProfile: false, isFormOpen: false };
      }
    }

    window.checkAndPromptEducReapply = checkAndPromptEducReapply;
  })();
});

document.addEventListener('DOMContentLoaded', function () {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  const verificationStrip = document.getElementById('verification-strip');

  if (token) {
    fetch('http://localhost:5000/api/users/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => response.json())
      .then(user => {
        if (!user.isVerified) {
          // Show verification strip for unverified accounts
          if (verificationStrip) {
            verificationStrip.style.display = 'flex';
          }

          // Disable navigation buttons
          const navSelectors = [
            '#kkProfileNavBtnDesktop',
            '#kkProfileNavBtnMobile',
            '#lgbtqProfileNavBtnDesktop',
            '#lgbtqProfileNavBtnMobile',
            '#educAssistanceNavBtnDesktop',
            '#educAssistanceNavBtnMobile',
            '.announcement-btn'
          ];
          navSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(btn => {
              btn.classList.add('disabled');
              btn.setAttribute('tabindex', '-1');
              btn.setAttribute('aria-disabled', 'true');
              btn.addEventListener('click', function (e) {
                e.preventDefault();
                Swal.fire({
                  icon: 'warning',
                  title: 'Account Verification Required',
                  text: 'Please verify your account to access this feature.',
                  confirmButtonText: 'OK'
                });
              });
            });
          });
        }
      })
      .catch(() => {
        console.error('Failed to fetch user verification status.');
      });
  }
});

document.addEventListener("DOMContentLoaded", function () {
  // Inject a small CSS block to make the announcement table body scrollable
  // while keeping the header visible. This avoids fragile inline styles
  // and ensures consistent behavior even after the table is re-rendered.
  if (!document.getElementById('announcement-table-scroll-style')) {
    const style = document.createElement('style');
    style.id = 'announcement-table-scroll-style';
    style.type = 'text/css';
    style.appendChild(document.createTextNode(`
      /* Make thead fixed and tbody scrollable */
      .announcement-table { width: 100%; border-collapse: collapse; }
      .announcement-table thead, .announcement-table tbody { display: block; }
      .announcement-table thead tr { display: table; width: 100%; table-layout: fixed; }
      .announcement-table tbody { display: block; width: 100%; overflow-y: auto; }
      .announcement-table tbody tr { display: table; width: 100%; table-layout: fixed; }
      .announcement-table th, .announcement-table td { box-sizing: border-box; }
    `));
    document.head.appendChild(style);
  }

  const tableEl = document.querySelector('.announcement-table');
  if (!tableEl) return;
  const announcementTableBody = tableEl.querySelector('tbody');
  const cardsContainerEl = document.querySelector('.announcement-cards');
  const containerEl = tableEl.parentElement || document.querySelector('.announcements-container') || null;

  // Compute a reasonable max height for the tbody based on viewport height.
  // Keep a sensible default (400px) but allow smaller viewports to reduce overflow.
  function recomputeMaxHeight() {
    if (!announcementTableBody) return;
    const defaultMax = 400; // fallback default
    // Use about 45% of the viewport height but clamp between 200 and defaultMax
    const computed = Math.max(200, Math.min(defaultMax, Math.floor(window.innerHeight * 0.45)));
    announcementTableBody.style.maxHeight = computed + 'px';
    // Let the browser control overflow; CSS already sets overflow-y: auto on tbody
    announcementTableBody.style.overflowY = 'auto';
    // Also make the cards container scrollable when in card view
    try {
      if (cardsContainerEl) {
        cardsContainerEl.style.maxHeight = computed + 'px';
        cardsContainerEl.style.overflowY = 'auto';
      }
      // As a secondary safeguard, allow the parent container to scroll if present
      if (containerEl) {
        containerEl.style.overflowY = 'auto';
        // don't force maxHeight on the container unless it's smaller than computed
        if (!containerEl.style.maxHeight) containerEl.style.maxHeight = (computed + 80) + 'px';
      }
    } catch (e) {
      // ignore styling errors
    }
  }

  // Initial compute and keep it responsive
  recomputeMaxHeight();
  window.addEventListener('resize', recomputeMaxHeight);

  // If the table gets re-rendered, ensure the style is maintained.
  // Use a MutationObserver to watch for tbody content changes and reapply height.
  try {
    const mo = new MutationObserver(() => {
      recomputeMaxHeight();
    });
    mo.observe(announcementTableBody, { childList: true, subtree: false });
    if (cardsContainerEl) {
      try { mo.observe(cardsContainerEl, { childList: true, subtree: true }); } catch (e) { /* ignore */ }
    }
  } catch (e) {
    // If MutationObserver isn't available, it's acceptable — resize handler will handle most cases.
    console.warn('MutationObserver not available for announcement table scroll handling', e);
  }
});