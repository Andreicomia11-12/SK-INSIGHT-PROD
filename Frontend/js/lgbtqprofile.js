// lgbtqprofile.js
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

(function() {
  if (!sessionStorage.getItem("token")) {
    const channel = new BroadcastChannel("skinsight-auth");
    channel.onmessage = (ev) => {
      if (ev.data && ev.data.token) {
        sessionStorage.setItem("token", ev.data.token);
        channel.close();
        location.reload();
      }
    };
    setTimeout(() => channel.close(), 3000);
  }
})();
// 🔹 Redirect to login if no token
(function() {
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
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
      localStorage.removeItem("token");
      sessionExpired();
    }
  } catch (e) {
    sessionStorage.removeItem("token");
    localStorage.removeItem("token");
    sessionExpired();
  }
})();

let allProfiles = [];

document.addEventListener("DOMContentLoaded", () => {

  updateNotifBadge();
  updateLGBTQNotifBadge();
  fetchProfiles({});

  const tableBody = document.querySelector(".tables tbody");

  // Custom dropdown elements
  const yearDropdown = document.getElementById("yearDropdown");
  const yearButton = yearDropdown.querySelector(".dropdown-button");
  const yearContent = yearDropdown.querySelector(".dropdown-content");
  const cycleDropdown = document.getElementById("cycleDropdown");
  const cycleButton = cycleDropdown.querySelector(".dropdown-button");
  const cycleContent = cycleDropdown.querySelector(".dropdown-content");
  const classificationDropdown = document.getElementById("classificationDropdown");
  const classificationButton = classificationDropdown.querySelector(".dropdown-button");
  const classificationContent = classificationDropdown.querySelector(".dropdown-content");
  const filterBtn = document.getElementById("filterBtn");
  const clearFilterBtn = document.getElementById("clearFilterBtn");

  let yearMap = {};
  let sortedYears = [];
  let currentFilters = {
    year: "",
    cycle: "",
    lgbtqClassification: "",
    search: ""
  };

  // 🔹 Fetch cycles for LGBTQ
  async function fetchCycles() {
    try {
      const res = await fetch("http://localhost:5000/api/formcycle/lgbtq", {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch cycles");

      const cycles = await res.json();

      // Group cycles by year
      yearMap = {};
      cycles.forEach((c) => {
        if (!yearMap[c.year]) yearMap[c.year] = [];
        yearMap[c.year].push(c.cycleNumber);
      });

      sortedYears = Object.keys(yearMap).sort((a, b) => b - a);

      // Populate year dropdown
      yearContent.innerHTML = "";
      sortedYears.forEach(year => {
        const yearOption = document.createElement("a");
        yearOption.href = "#";
        yearOption.className = "dropdown-option";
        yearOption.textContent = year;
        yearOption.addEventListener("click", (e) => {
          e.preventDefault();
          yearButton.textContent = year;
          currentFilters.year = year;

          // Reset cycle/classification
          cycleButton.textContent = "Cycle";
          currentFilters.cycle = "";
          cycleButton.disabled = false;
          classificationButton.textContent = "Classification";
          classificationButton.disabled = true;

          // Populate cycle dropdown for selected year
          populateCycleDropdown(yearMap[year]);
          yearContent.style.display = "none";
        });
        yearContent.appendChild(yearOption);
      });

      // Reset buttons on load
      yearButton.textContent = "Year";
      cycleButton.textContent = "Cycle";
      cycleButton.disabled = true;
      classificationButton.textContent = "Classification";
      classificationButton.disabled = true;
    } catch (err) {
      console.error("Error fetching cycles:", err);
    }
  }

  // Populate cycle dropdown for selected year
  function populateCycleDropdown(cycles) {
    cycleContent.innerHTML = "";
    cycles.forEach(cycle => {
      const cycleOption = document.createElement("a");
      cycleOption.href = "#";
      cycleOption.className = "dropdown-option";
      cycleOption.textContent = `Cycle ${cycle}`;
      cycleOption.addEventListener("click", (e) => {
        e.preventDefault();
        cycleButton.textContent = `Cycle ${cycle}`;
        currentFilters.cycle = cycle;

        // Enable classification dropdown
        classificationButton.disabled = false;
        cycleContent.style.display = "none";
      });
      cycleContent.appendChild(cycleOption);
    });
  }

  // Dropdown open/close logic (same as KK)
  yearButton.addEventListener("click", (e) => {
    e.stopPropagation();
    yearContent.style.display = yearContent.style.display === "block" ? "none" : "block";
    cycleContent.style.display = "none";
    classificationContent.style.display = "none";
  });
  cycleButton.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!cycleButton.disabled) {
      cycleContent.style.display = cycleContent.style.display === "block" ? "none" : "block";
      yearContent.style.display = "none";
      classificationContent.style.display = "none";
    }
  });
  classificationButton.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!classificationButton.disabled) {
      classificationContent.style.display = classificationContent.style.display === "block" ? "none" : "block";
      yearContent.style.display = "none";
      cycleContent.style.display = "none";
    }
  });
  window.addEventListener("click", () => {
    yearContent.style.display = "none";
    cycleContent.style.display = "none";
    classificationContent.style.display = "none";
  });

  // Classification dropdown options
  const classifications = [
    "Lesbian", "Gay", "Bisexual", "Transgender", "Queer", "Intersex", "Asexual", "Other"
  ];
  classificationContent.innerHTML = "";
  classifications.forEach(c => {
    const option = document.createElement("a");
    option.href = "#";
    option.className = "dropdown-option";
    option.textContent = c;
    option.addEventListener("click", (e) => {
      e.preventDefault();
      classificationButton.textContent = c;
      currentFilters.lgbtqClassification = c;
      classificationContent.style.display = "none";
    });
    classificationContent.appendChild(option);
  });

  // 🔹 Fetch profiles
  async function fetchProfiles(params = {}) {
    try {
      let url = "http://localhost:5000/api/lgbtqprofiling";
      const queryObj = {};

      if (params.year) queryObj.year = params.year;
      if (params.cycle && params.year) queryObj.cycle = params.cycle;
      if (params.lgbtqClassification) queryObj.lgbtqClassification = params.lgbtqClassification;
      if (params.search) queryObj.search = params.search;

      const query = new URLSearchParams(queryObj).toString();
      if (query) url += `?${query}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();

      // Filter out deleted profiles and sort newest -> oldest
      const visibleProfiles = (Array.isArray(data) ? data : [])
        .filter(p => !p.isDeleted)
        .sort((a, b) => {
          const ta = getProfileTimestamp(a);
          const tb = getProfileTimestamp(b);
          return tb - ta; // newest first
        });
      allProfiles = visibleProfiles;
      renderProfiles(visibleProfiles);
    } catch (err) {
      console.error("❌ Error fetching profiles:", err);
    }
  }

  // Helper: determine most reliable timestamp for a profile
  function getProfileTimestamp(p) {
    // prefer explicit submittedAt or createdAt or displayData.createdAt
    const t = p?.submittedAt || p?.createdAt || p?.displayData?.submittedAt || p?.displayData?.createdAt || null;
    if (t) {
      const d = new Date(t);
      if (!isNaN(d)) return d.getTime();
    }
    // fallback to ObjectId timestamp
    try {
      if (p && p._id && typeof p._id === "string" && p._id.length >= 8) {
        return parseInt(p._id.substring(0, 8), 16) * 1000;
      }
    } catch (e) {}
    return 0;
  }

  const PROFILES_PER_PAGE = 30;
  let currentPage = 1;

  // Replace your renderProfiles function with this paginated version:
  function renderProfiles(profiles) {
    const totalPages = Math.ceil(profiles.length / PROFILES_PER_PAGE);
    const startIdx = (currentPage - 1) * PROFILES_PER_PAGE;
    const endIdx = startIdx + PROFILES_PER_PAGE;
    const pageProfiles = profiles.slice(startIdx, endIdx);

    tableBody.innerHTML = "";
    if (!pageProfiles.length) {
      tableBody.innerHTML = `<tr><td colspan="7">No profiles found</td></tr>`;
      renderPagination(profiles.length, totalPages);
      return;
    }

    pageProfiles.forEach((p, i) => {
      const birthday = p.displayData?.birthday
        ? new Date(p.displayData.birthday).toLocaleDateString()
        : "N/A";
      const age = p.displayData?.age ?? "N/A";
      let formattedName = "N/A";
      if (p.lastname || p.firstname || p.middlename) {
        const last = p.lastname ? p.lastname.trim() : "";
        const first = p.firstname ? p.firstname.trim() : "";
        const middle = p.middlename && p.middlename.trim() !== ""
          ? p.middlename.trim()[0].toUpperCase() + "."
          : "";
        formattedName = [last, first].filter(Boolean).join(", ");
        if (middle) formattedName += " " + middle;
      } else if (p.displayData?.residentName) {
        formattedName = p.displayData.residentName;
      }
      const row = document.createElement("tr");
      row.className = p.isRead ? 'row-read' : 'row-unread';
      row.setAttribute('data-id', p._id); // Ensure this is set correctly
      row.innerHTML = `
        <td>${startIdx + i + 1}</td>
        <td>${formattedName}</td>
        <td>${age}</td>
        <td>${birthday}</td>
        <td>${p.displayData?.lgbtqClassification ?? "N/A"}</td>
        <td>${p.displayData?.sexAssignedAtBirth ?? "N/A"}</td>
        <td>
          <button class="view-btn" data-id="${p._id}" style="color: white;">
            <i class="fa-solid fa-eye" style="color: #ffffffff"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    renderPagination(profiles.length, totalPages);

    // Attach modal openers
    document.querySelectorAll(".view-btn").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const res = await fetch(
          `http://localhost:5000/api/lgbtqprofiling/${btn.dataset.id}`,
          {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            },
          }
        );
        const profile = await res.json();
        if (!profile || !profile._id) {
          Swal.fire("Error", profile.error || "Profile not found.", "error");
          return;
        }
        showProfileModal(profile);

        // After modal is opened and profile is fetched:
        const row = document.querySelector(`tr[data-id="${profile._id}"]`);
        if (row) {
          row.classList.remove('row-unread');
          row.classList.add('row-read');
        }
      })
    );

    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!id) {
          Swal.fire("Error", "Profile ID is missing. Please refresh the page.", "error");
          return;
        }
        const result = await Swal.fire({
          title: "Are you sure?",
          text: "Do you really want to delete this form?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#0A2C59",
          cancelButtonColor: "#d33",
          confirmButtonText: "Yes",
          cancelButtonText: "No"
        });
        if (result.isConfirmed) {
          const res = await fetch(`http://localhost:5000/api/lgbtqprofiling/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
          });
          if (res.ok) {
            Swal.fire("Deleted!", "Profile moved to recycle bin.", "success");
            fetchProfiles(); // Refresh table
          }
        }
      });
    });
  }

  // Add this function for pagination controls:
  function renderPagination(totalProfiles, totalPages) {
    const pagination = document.getElementById("pagination");
    pagination.innerHTML = "";

    if (totalPages <= 1) return;

    // Previous button
    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.textContent = "Prev";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderProfiles(allProfiles);
      }
    };
    pagination.appendChild(prevBtn);

    // Page numbers (show max 5 pages at a time)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.className = "pagination-btn" + (i === currentPage ? " active" : "");
      pageBtn.textContent = i;
      pageBtn.onclick = () => {
        currentPage = i;
        renderProfiles(allProfiles);
      };
      pagination.appendChild(pageBtn);
    }

    // Next button
    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.textContent = "Next";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderProfiles(allProfiles);
      }
    };
    pagination.appendChild(nextBtn);
  }

  // 🔹 Render profiles
  function renderProfiles(profiles) {
    const totalPages = Math.ceil(profiles.length / PROFILES_PER_PAGE);
    const startIdx = (currentPage - 1) * PROFILES_PER_PAGE;
    const endIdx = startIdx + PROFILES_PER_PAGE;
    const pageProfiles = profiles.slice(startIdx, endIdx);

    tableBody.innerHTML = "";
    if (!pageProfiles.length) {
      tableBody.innerHTML = `<tr><td colspan="7">No profiles found</td></tr>`;
      renderPagination(profiles.length, totalPages);
      return;
    }

    pageProfiles.forEach((p, i) => {
      const birthday = p.displayData?.birthday
        ? new Date(p.displayData.birthday).toLocaleDateString()
        : "N/A";
      const age = p.displayData?.age ?? "N/A";
      let formattedName = "N/A";
      if (p.lastname || p.firstname || p.middlename) {
        const last = p.lastname ? p.lastname.trim() : "";
        const first = p.firstname ? p.firstname.trim() : "";
        const middle = p.middlename && p.middlename.trim() !== ""
          ? p.middlename.trim()[0].toUpperCase() + "."
          : "";
        formattedName = [last, first].filter(Boolean).join(", ");
        if (middle) formattedName += " " + middle;
      } else if (p.displayData?.residentName) {
        formattedName = p.displayData.residentName;
      }
      const row = document.createElement("tr");
      row.className = p.isRead ? 'row-read' : 'row-unread';
      row.setAttribute('data-id', p._id); // Ensure this is set correctly
      row.innerHTML = `
        <td>${startIdx + i + 1}</td>
        <td>${formattedName}</td>
        <td>${age}</td>
        <td>${birthday}</td>
        <td>${p.displayData?.lgbtqClassification ?? "N/A"}</td>
        <td>${p.displayData?.sexAssignedAtBirth ?? "N/A"}</td>
        <td>
          <button class="view-btn" data-id="${p._id}" style="color: white;">
            <i class="fa-solid fa-eye" style="color: #ffffffff"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    renderPagination(profiles.length, totalPages);

    // Attach modal openers
    document.querySelectorAll(".view-btn").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const res = await fetch(
          `http://localhost:5000/api/lgbtqprofiling/${btn.dataset.id}`,
          {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            },
          }
        );
        const profile = await res.json();
        if (!profile || !profile._id) {
          Swal.fire("Error", profile.error || "Profile not found.", "error");
          return;
        }
        showProfileModal(profile);

        // After modal is opened and profile is fetched:
        const row = document.querySelector(`tr[data-id="${profile._id}"]`);
        if (row) {
          row.classList.remove('row-unread');
          row.classList.add('row-read');
        }
      })
    );

    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!id) {
          Swal.fire("Error", "Profile ID is missing. Please refresh the page.", "error");
          return;
        }
        const result = await Swal.fire({
          title: "Are you sure?",
          text: "Do you really want to delete this form?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#0A2C59",
          cancelButtonColor: "#d33",
          confirmButtonText: "Yes",
          cancelButtonText: "No"
        });
        if (result.isConfirmed) {
          const res = await fetch(`http://localhost:5000/api/lgbtqprofiling/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
          });
          if (res.ok) {
            Swal.fire("Deleted!", "Profile moved to recycle bin.", "success");
            fetchProfiles(); // Refresh table
          }
        }
      });
    });
  }

  // Add this function for pagination controls:
  function renderPagination(totalProfiles, totalPages) {
    const pagination = document.getElementById("pagination");
    pagination.innerHTML = "";

    if (totalPages <= 1) return;

    // Previous button
    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.textContent = "Prev";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderProfiles(allProfiles);
      }
    };
    pagination.appendChild(prevBtn);

    // Page numbers (show max 5 pages at a time)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.className = "pagination-btn" + (i === currentPage ? " active" : "");
      pageBtn.textContent = i;
      pageBtn.onclick = () => {
        currentPage = i;
        renderProfiles(allProfiles);
      };
      pagination.appendChild(pageBtn);
    }

    // Next button
    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.textContent = "Next";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderProfiles(allProfiles);
      }
    };
    pagination.appendChild(nextBtn);
  }

  // 🔹 Render profiles
  function renderProfiles(profiles) {
    const totalPages = Math.ceil(profiles.length / PROFILES_PER_PAGE);
    const startIdx = (currentPage - 1) * PROFILES_PER_PAGE;
    const endIdx = startIdx + PROFILES_PER_PAGE;
    const pageProfiles = profiles.slice(startIdx, endIdx);

    tableBody.innerHTML = "";
    if (!pageProfiles.length) {
      tableBody.innerHTML = `<tr><td colspan="7">No profiles found</td></tr>`;
      renderPagination(profiles.length, totalPages);
      return;
    }

    pageProfiles.forEach((p, i) => {
      const birthday = p.displayData?.birthday
        ? new Date(p.displayData.birthday).toLocaleDateString()
        : "N/A";
      const age = p.displayData?.age ?? "N/A";
      let formattedName = "N/A";
      if (p.lastname || p.firstname || p.middlename) {
        const last = p.lastname ? p.lastname.trim() : "";
        const first = p.firstname ? p.firstname.trim() : "";
        const middle = p.middlename && p.middlename.trim() !== ""
          ? p.middlename.trim()[0].toUpperCase() + "."
          : "";
        formattedName = [last, first].filter(Boolean).join(", ");
        if (middle) formattedName += " " + middle;
      } else if (p.displayData?.residentName) {
        formattedName = p.displayData.residentName;
      }
      const row = document.createElement("tr");
      row.className = p.isRead ? 'row-read' : 'row-unread';
      row.setAttribute('data-id', p._id); // Ensure this is set correctly
      row.innerHTML = `
        <td>${startIdx + i + 1}</td>
        <td>${formattedName}</td>
        <td>${age}</td>
        <td>${birthday}</td>
        <td>${p.displayData?.lgbtqClassification ?? "N/A"}</td>
        <td>${p.displayData?.sexAssignedAtBirth ?? "N/A"}</td>
        <td>
          <button class="view-btn" data-id="${p._id}" style="color: white;">
            <i class="fa-solid fa-eye" style="color: #ffffffff"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    renderPagination(profiles.length, totalPages);

    // Attach modal openers
    document.querySelectorAll(".view-btn").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const res = await fetch(
          `http://localhost:5000/api/lgbtqprofiling/${btn.dataset.id}`,
          {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            },
          }
        );
        const profile = await res.json();
        if (!profile || !profile._id) {
          Swal.fire("Error", profile.error || "Profile not found.", "error");
          return;
        }
        showProfileModal(profile);

        // After modal is opened and profile is fetched:
        const row = document.querySelector(`tr[data-id="${profile._id}"]`);
        if (row) {
          row.classList.remove('row-unread');
          row.classList.add('row-read');
        }
      })
    );

    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!id) {
          Swal.fire("Error", "Profile ID is missing. Please refresh the page.", "error");
          return;
        }
        const result = await Swal.fire({
          title: "Are you sure?",
          text: "Do you really want to delete this form?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#0A2C59",
          cancelButtonColor: "#d33",
          confirmButtonText: "Yes",
          cancelButtonText: "No"
        });
        if (result.isConfirmed) {
          const res = await fetch(`http://localhost:5000/api/lgbtqprofiling/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
          });
          if (res.ok) {
            Swal.fire("Deleted!", "Profile moved to recycle bin.", "success");
            fetchProfiles(); // Refresh table
          }
        }
      });
    });
  }

  // Add this function for pagination controls:
  function renderPagination(totalProfiles, totalPages) {
    const pagination = document.getElementById("pagination");
    pagination.innerHTML = "";

    if (totalPages <= 1) return;

    // Previous button
    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.textContent = "Prev";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderProfiles(allProfiles);
      }
    };
    pagination.appendChild(prevBtn);

    // Page numbers (show max 5 pages at a time)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.className = "pagination-btn" + (i === currentPage ? " active" : "");
      pageBtn.textContent = i;
      pageBtn.onclick = () => {
        currentPage = i;
        renderProfiles(allProfiles);
      };
      pagination.appendChild(pageBtn);
    }

    // Next button
    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.textContent = "Next";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderProfiles(allProfiles);
      }
    };
    pagination.appendChild(nextBtn);
  }

  // 🔹 Render profiles
  function renderProfiles(profiles) {
    const totalPages = Math.ceil(profiles.length / PROFILES_PER_PAGE);
    const startIdx = (currentPage - 1) * PROFILES_PER_PAGE;
    const endIdx = startIdx + PROFILES_PER_PAGE;
    const pageProfiles = profiles.slice(startIdx, endIdx);

    tableBody.innerHTML = "";
    if (!pageProfiles.length) {
      tableBody.innerHTML = `<tr><td colspan="7">No profiles found</td></tr>`;
      renderPagination(profiles.length, totalPages);
      return;
    }

    pageProfiles.forEach((p, i) => {
      const birthday = p.displayData?.birthday
        ? new Date(p.displayData.birthday).toLocaleDateString()
        : "N/A";
      const age = p.displayData?.age ?? "N/A";
      // Build name: Last Name, First Name M.
      let formattedName = "N/A";
      if (p.lastname || p.firstname || p.middlename) {
        const last = p.lastname ? p.lastname.trim() : "";
        const first = p.firstname ? p.firstname.trim() : "";
        const middle = p.middlename && p.middlename.trim() !== ""
          ? p.middlename.trim()[0].toUpperCase() + "."
          : "";
        formattedName = [last, first].filter(Boolean).join(", ");
        if (middle) formattedName += " " + middle;
      } else if (p.displayData?.residentName) {
        formattedName = p.displayData.residentName;
      }
      const row = document.createElement("tr");
      row.className = p.isRead ? 'row-read' : 'row-unread';
      row.setAttribute('data-id', p._id); // Ensure this is set correctly
      row.innerHTML = `
        <td>${startIdx + i + 1}</td>
        <td>${formattedName}</td>
        <td>${age}</td>
        <td>${birthday}</td>
        <td>${p.displayData?.lgbtqClassification ?? "N/A"}</td>
        <td>${p.displayData?.sexAssignedAtBirth ?? "N/A"}</td>
        <td>
          <button class="view-btn" data-id="${p._id}" style="color: white;">
            <i class="fa-solid fa-eye" style="color: #ffffffff"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    renderPagination(profiles.length, totalPages);

    // Attach modal openers
    document.querySelectorAll(".view-btn").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const res = await fetch(
          `http://localhost:5000/api/lgbtqprofiling/${btn.dataset.id}`,
          {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            },
          }
        );
        const profile = await res.json();
        if (!profile || !profile._id) {
          Swal.fire("Error", profile.error || "Profile not found.", "error");
          return;
        }
        showProfileModal(profile);

        // After modal is opened and profile is fetched:
        const row = document.querySelector(`tr[data-id="${profile._id}"]`);
        if (row) {
          row.classList.remove('row-unread');
          row.classList.add('row-read');
        }
      })
    );

    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!id) {
          Swal.fire("Error", "Profile ID is missing. Please refresh the page.", "error");
          return;
        }
        const result = await Swal.fire({
          title: "Are you sure?",
          text: "Do you really want to delete this form?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#0A2C59",
          cancelButtonColor: "#d33",
          confirmButtonText: "Yes",
          cancelButtonText: "No"
        });
        if (result.isConfirmed) {
          const res = await fetch(`http://localhost:5000/api/lgbtqprofiling/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
          });
          if (res.ok) {
            Swal.fire("Deleted!", "Profile moved to recycle bin.", "success");
            fetchProfiles(); // Refresh table
          }
        }
      });
    });
  }

  // Add this function for pagination controls:
  function renderPagination(totalProfiles, totalPages) {
    const pagination = document.getElementById("pagination");
    pagination.innerHTML = "";

    if (totalPages <= 1) return;

    // Previous button
    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.textContent = "Prev";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderProfiles(allProfiles);
      }
    };
    pagination.appendChild(prevBtn);

    // Page numbers (show max 5 pages at a time)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.className = "pagination-btn" + (i === currentPage ? " active" : "");
      pageBtn.textContent = i;
      pageBtn.onclick = () => {
        currentPage = i;
        renderProfiles(allProfiles);
      };
      pagination.appendChild(pageBtn);
    }

    // Next button
    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.textContent = "Next";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderProfiles(allProfiles);
      }
    };
    pagination.appendChild(nextBtn);
  }

  // 🔹 Show modal
  function showProfileModal(p) {
    if (!p || !p._id) {
      Swal.fire("Error", "Profile data is incomplete. Please refresh the page.", "error");
      return;
    }
    const modal = document.getElementById("profileModal");
    const header = document.getElementById("profileHeader");
    const details = document.getElementById("profileDetails");

    // Build full name from root-level fields, fallback to displayData.residentName
    let fullName = "N/A";
    if (p.firstname || p.middlename || p.lastname) {
      const firstname = p.firstname ? p.firstname.trim() : "";
      const middlename =
        p.middlename && p.middlename.trim() !== ""
        ? p.middlename.trim()[0].toUpperCase() + "."
        : "";
      const lastname = p.lastname ? p.lastname.trim() : "";
      fullName = [firstname, middlename, lastname]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    } else if (p.displayData?.residentName) {
      fullName = p.displayData.residentName;
    }

    const age = p.displayData?.age ?? p.demographics?.age ?? "N/A";
    const birthday = p.displayData?.birthday
      ? new Date(p.displayData.birthday).toLocaleDateString()
      : p.demographics?.birthday
      ? new Date(p.demographics.birthday).toLocaleDateString()
      : "N/A";
    const sexAssignedAtBirth =
      p.displayData?.sexAssignedAtBirth ?? p.sexAssignedAtBirth ?? "N/A";
    const lgbtqClassification =
      p.displayData?.lgbtqClassification ?? p.lgbtqClassification ?? "N/A";

    // Use Cloudinary URLs for ID images
    const idImageFront = p.idImageFront || null;
    const idImageBack = p.idImageBack || null;

    // Default profile image
    const defaultProfileImage = "/Frontend/assets/default-profile.jpg";

    // Modern modal header: include profile image and full name
    header.innerHTML = `
      <div class="profile-header">
        <img src="${defaultProfileImage}" alt="Profile" class="profile-image" />
        <div class="profile-name">${fullName || "N/A"}</div>
      </div>
    `;

    details.innerHTML = `
      <div class="profile-details-modal">
        <div class="profile-details-row">
          <div class="profile-detail">
            <span class="label">Age</span>
            <span class="value">${age}</span>
          </div>
          <div class="profile-detail">
            <span class="label">Birthday</span>
            <span class="value">${birthday}</span>
          </div>
        </div>
        <div class="profile-details-row">
          <div class="profile-detail">
            <span class="label">Sex Assigned at Birth</span>
            <span class="value">${sexAssignedAtBirth}</span>
          </div>
          <div class="profile-detail">
            <span class="label">LGBTQIA+ Classification</span>
            <span class="value">${lgbtqClassification}</span>
          </div>
        </div>
        ${
          idImageFront || idImageBack
            ? `
          <div class="profile-details-row">
            <div class="profile-detail">
              <span class="label">Valid ID (Front)</span>
              ${
                idImageFront
                  ? `<div class="id-image-container">
                  <img src="${idImageFront}" alt="Valid ID Front" class="id-image" onclick="openImageLightbox('${idImageFront}')"/>
                </div>`
                  : `<span class="value">No image available</span>`
              }
            </div>
            <div class="profile-detail">
              <span class="label">Valid ID (Back)</span>
              ${
                idImageBack
                  ? `<div class="id-image-container">
                  <img src="${idImageBack}" alt="Valid ID Back" class="id-image" onclick="openImageLightbox('${idImageBack}')"/>
                </div>`
                  : `<span class="value">No image available</span>`
              }
            </div>
          </div>
        `
            : ""
        }
      </div>
    `;

    details.innerHTML += `
  <div class="profile-details-row">
    <button id="deleteProfileBtn" class="modal-delete-btn" data-id="${p._id}">
      Delete Profile
    </button>
  </div>
`;

    // Modal delete logic (use p._id directly, not dataset.id)
    const deleteBtn = document.getElementById("deleteProfileBtn");
    deleteBtn.addEventListener("click", async () => {
      if (!p._id) {
        Swal.fire("Error", "Profile ID is missing. Please refresh the page.", "error");
        return;
      }
      const result = await Swal.fire({
        title: "Are you sure?",
        text: "Do you really want to delete this profile?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#0A2C59",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes",
        cancelButtonText: "No",
      });
      if (result.isConfirmed) {
        const res = await fetch(`http://localhost:5000/api/lgbtqprofiling/${p._id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        });
        if (res.ok) {
          Swal.fire("Deleted!", "Profile moved to recycle bin.", "success");
          fetchProfiles(); // Refresh table
          modal.style.display = "none"; // Close modal
        } else {
          Swal.fire("Error", "Failed to delete profile.", "error");
        }
      }
    });

    modal.style.display = "flex";
    document.body.classList.add("modal-open");
    const closeBtn = modal.querySelector(".modern-modal-close");
    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.style.display = "none";
        document.body.classList.remove("modal-open");
      };
    }

    // Add click event to images for lightbox functionality
    const images = modal.querySelectorAll(".clickable-image");
    images.forEach((image) => {
      image.addEventListener("click", (e) => {
        const imageUrl = e.target.getAttribute("data-image-src");
        openImageLightbox(imageUrl);
      });
    });
  }

  // 🔹 Filter button logic
  filterBtn.addEventListener("click", () => {
    // Use the values from the custom dropdown buttons
    const selectedYear = yearButton.textContent !== "Year" ? yearButton.textContent : "";
    const selectedCycle = cycleButton.textContent !== "Cycle" ? cycleButton.textContent.replace("Cycle ", "") : "";
    const selectedClassification = classificationButton.textContent !== "Classification" ? classificationButton.textContent : "";

    // Only allow filtering if year and cycle are selected
    if (!selectedYear || !selectedCycle) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing selection',
        text: 'Please select both year and cycle before filtering.',
        confirmButtonColor: '#0A2C59',
      });
      return;
    }

    currentFilters.year = selectedYear;
    currentFilters.cycle = selectedCycle;
    currentFilters.lgbtqClassification = selectedClassification;

    fetchProfiles(currentFilters);
  });

  // 🔹 Clear button logic
  clearFilterBtn.addEventListener("click", () => {
    yearButton.textContent = "Year";
    cycleButton.textContent = "Cycle";
    cycleButton.disabled = true;
    classificationButton.disabled = true;
    classificationButton.textContent = "Classification";
    yearContent.style.display = "none";
    cycleContent.style.display = "none";
    classificationContent.style.display = "none";
    currentFilters = {};
    fetchProfiles({});
  });

  // 🔹 Initial load
  fetchCycles();
  fetchProfiles({});

  // --- Real-time update with socket.io ---
  const socket = io("http://localhost:5000", { transports: ["websocket"] });

  socket.on("lgbtq-profile:newSubmission", () => {
    updateLGBTQNotifBadge();
    fetchNotifications();
    fetchProfiles({});
  });
  socket.on("lgbtq-profile:read", () => {
    updateLGBTQNotifBadge();
    fetchNotifications();
    fetchProfiles({});
  });
  socket.on("lgbtq-profile:deleted", () => {
    updateLGBTQNotifBadge();
    fetchNotifications();
    fetchProfiles({});
  });

  socket.on("educational-assistance:deleted", () => {
  updateNotifBadge();
  fetchApplicants(); // Refresh table
  fetchNotifications(); // Refresh notification list if open
});

socket.on("educational-assistance:newSubmission", () => {
    updateNotifBadge();
    Swal.fire({
      icon: 'info',
      title: 'New Educational Assistance Application',
      text: 'A new application has arrived!',
      timer: 8000,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
    fetchApplicants();
  });

  socket.on("educational-assistance:statusChanged", () => {
    updateNotifBadge();
    
  });
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (id && typeof showProfileModal === "function") {
    fetch(`http://localhost:5000/api/lgbtqprofiling/${id}`, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
    })
    .then(res => res.json())
    .then(profile => {
      if (profile && profile._id) showProfileModal(profile);
    });
  }
  
});



// Helper: Capitalize first letter
function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// --- Notification Bell Logic for LGBTQ ---
const notifBell = document.getElementById('notifBell');
const notifDropdown = document.getElementById('notifDropdown');
const notifTabs = notifDropdown.querySelectorAll('.notif-tab');
const notifListNew = document.getElementById('notifListNew');
const notifListUnread = document.getElementById('notifListUnread');

notifBell.addEventListener('click', () => {
  notifDropdown.style.display = notifDropdown.style.display === 'none' ? 'block' : 'none';
  fetchNotifications();
});

notifTabs.forEach(tab => {
  tab.addEventListener('click', function() {
    notifTabs.forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    notifListNew.style.display = this.dataset.tab === 'new' ? 'block' : 'none';
    notifListUnread.style.display = this.dataset.tab === 'unread' ? 'block' : 'none';
  });
});

async function fetchNotifications() {
  const token = sessionStorage.getItem("token");
  // Fetch new LGBTQ profiles (within 24 hours)
  const newRes = await fetch('http://localhost:5000/api/notifications/lgbtq/new', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const newNotifs = await newRes.json();

  // Fetch unread LGBTQ profiles (older than 24 hours, still unread)
  const unreadRes = await fetch('http://localhost:5000/api/notifications/lgbtq/unread', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const unreadNotifs = await unreadRes.json();

  renderNotifList(notifListNew, newNotifs, false);
  renderNotifList(notifListUnread, unreadNotifs, true);
}

function renderNotifList(container, notifs, isUnread) {
  container.innerHTML = '';
  if (!Array.isArray(notifs) || notifs.length === 0) {
    container.innerHTML = `<div class="notif-item">No notifications.</div>`;
    return;
  }
  notifs.forEach(n => {
    // Format name: Last, First M.
    const name = n.referenceId
      ? `${n.referenceId.lastname || ""}, ${n.referenceId.firstname || ""} ${n.referenceId.middlename ? n.referenceId.middlename[0].toUpperCase() + "." : ""}`.trim()
      : "Unknown";
    // Format date and time
    let dateStr = "";
    if (n.referenceId?.createdAt) {
      const dateObj = new Date(n.referenceId.createdAt);
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      const datePart = dateObj.toLocaleDateString(undefined, options);
      let hours = dateObj.getHours();
      const minutes = dateObj.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      const timePart = `${hours}:${minutes} ${ampm}`;
      dateStr = `${datePart} ${timePart}`;
    }
    // Status
    const status = n.referenceId && n.referenceId.isRead ? "Read" : "Unread";
    container.innerHTML += `
      <div class="notif-item" data-id="${n._id}">
        <div><b>${name}</b></div>
        <div class="notif-date">${dateStr}</div>
        <div class="notif-status">${status}</div>
      </div>
    `;
  });
}

// Hide dropdown when clicking outside
document.addEventListener('click', function(e) {
  if (!notifDropdown.contains(e.target) && !notifBell.contains(e.target)) {
    notifDropdown.style.display = 'none';
  }
});

// --- Badge update logic ---
async function updateNotifBadge() {
  const token = sessionStorage.getItem("token");
  try {
    const res = await fetch('http://localhost:5000/api/notifications/lgbtq/unread/count', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const count = data.count || 0;
    const badge = document.getElementById('notifBadge');
    const sidebarBadge = document.getElementById('sidebarLGBTQNotifBadge');
    // Debug log
    if (badge && sidebarBadge) {
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-block';
        sidebarBadge.textContent = count;
        sidebarBadge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
        sidebarBadge.style.display = 'none';
      }
    }
  } catch (err) {
    const badge = document.getElementById('notifBadge');
    const sidebarBadge = document.getElementById('sidebarLGBTQNotifBadge');
    if (badge) badge.style.display = 'none';
    if (sidebarBadge) sidebarBadge.style.display = 'none';
    console.error("Error updating LGBTQ notif badge:", err);
  }
}

// --- Real-time update with socket.io ---

// Real-time badge update function
async function updateLGBTQNotifBadge() {
  const token = sessionStorage.getItem("token");
  try {
    const res = await fetch('http://localhost:5000/api/notifications/lgbtq/unread/count', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const count = data.count || 0;
    const badge = document.getElementById('sidebarLGBTQNotifBadge');
    const bellBadge = document.getElementById('notifBadge'); // If you use same badge for all
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
    if (bellBadge) {
      bellBadge.textContent = count;
      bellBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  } catch (err) {
    const badge = document.getElementById('sidebarLGBTQNotifBadge');
    const bellBadge = document.getElementById('notifBadge');
    if (badge) badge.style.display = 'none';
    if (bellBadge) bellBadge.style.display = 'none';
  }
}

// Always show the unread notification badge on page load
document.addEventListener("DOMContentLoaded", updateNotifBadge);