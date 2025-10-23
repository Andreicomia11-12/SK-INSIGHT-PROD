// kkprofile.js

// 🔹 Redirect to login if no token or token expired
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

let allProfiles = [];

document.addEventListener("DOMContentLoaded", () => {
  console.log("kkprofile.js loaded ✅");

  const tableBody = document.querySelector(".tables tbody");
  const yearDropdown = document.getElementById("yearDropdown");
  const yearButton = yearDropdown.querySelector(".dropdown-button");
  const yearContent = yearDropdown.querySelector(".dropdown-content");
  const cycleDropdown = document.getElementById("cycleDropdown");
  const cycleButton = cycleDropdown.querySelector(".dropdown-button");
  const cycleContent = cycleDropdown.querySelector(".dropdown-content");
  const filterBtn = document.getElementById("filterBtn");
  const searchInput = document.getElementById("searchInput");
  const classificationDropdown = document.getElementById("classificationDropdown");
  const classificationButton = classificationDropdown.querySelector(".dropdown-button");
  const classificationContent = classificationDropdown.querySelector(".dropdown-content");

  let yearMap = {};
  let sortedYears = [];
  let currentFilters = {};

  // Fetch cycles and populate year dropdown
  async function fetchCycles() {
    try {
      const res = await fetch("http://localhost:5000/api/formcycle/kk", {
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
          currentFilters.cycle = undefined;
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

  // Dropdown open/close logic
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

  // 🔹 Fetch profiles with filters
  async function fetchProfiles(params = {}) {
    try {
      // Build query string properly
      const query = new URLSearchParams(params).toString();
      const url = query
        ? `http://localhost:5000/api/kkprofiling?${query}`
        : `http://localhost:5000/api/kkprofiling`;

      console.log("🔎 Request URL:", url);

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`, // use sessionStorage only
        },
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      // Filter out deleted profiles
      const visibleProfiles = data.filter(p => !p.isDeleted);
      allProfiles = visibleProfiles;
      console.log("✅ Profiles fetched:", data);
      renderProfiles(visibleProfiles); // render table
    } catch (err) {
      console.error("❌ Error fetching profiles:", err);
    }
  }

  function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // 🔹 Render profiles into table
  function renderProfiles(profiles) {
    tableBody.innerHTML = "";
    if (!profiles.length) {
      tableBody.innerHTML = `<tr><td colspan="8">No profiles found</td></tr>`;
      return;
    }

    profiles.forEach((p, i) => {
      const lastname = p.lastname ? capitalize(p.lastname.trim()) : "";
      const firstname = p.firstname ? capitalize(p.firstname.trim()) : "";
      const middlename = p.middlename && p.middlename.trim() !== ""
        ? p.middlename.trim()[0].toUpperCase() + "."
        : "";
      const suffix = p.suffix && p.suffix.toLowerCase() !== "n/a" ? p.suffix : "";
      const fullName = (lastname || firstname)
        ? `${lastname}, ${firstname} ${middlename} ${suffix}`.replace(/\s+/g, " ").trim()
        : "N/A";

      const gender = p.gender || "-";
      const age = p.user?.age ?? "N/A";
      const purok = p.purok ? `Purok ${p.purok}` : "-";
      const civilStatus = p.civilStatus || "-";
      const workStatus = p.workStatus || "-";

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${i + 1}</td>
        <td>${fullName}</td>
        <td>${gender}</td>
        <td>${age}</td>
        <td>${purok}</td>
        <td>${civilStatus}</td>
        <td>${workStatus}</td>
        <td>
          <button class="view-btn" data-id="${p._id}">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button class="delete-btn" data-id="${p._id}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    // Attach modal openers
    document.querySelectorAll(".view-btn").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const res = await fetch(
          `http://localhost:5000/api/kkprofiling/${btn.dataset.id}`,
          {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            },
          }
        );
        const profile = await res.json();
        showProfileModal(profile);
      })
    );

    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
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
          const res = await fetch(`http://localhost:5000/api/kkprofiling/${id}`, {
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

  let currentProfileId = null; // Track the current profile ID

  // Modify showProfileModal to set currentProfileId and update download button
function showProfileModal(p) {
  currentProfileId = p._id; // Set the current profile ID

  const modal = document.getElementById("profileModal");
  const header = document.getElementById("profileHeader");
  const details = document.getElementById("profileDetails");

  const mi = p.middlename ? p.middlename[0].toUpperCase() + "." : "";
  const suffix = p.suffix && p.suffix.toLowerCase() !== "n/a" ? p.suffix : "";
  const fullName = `${p.lastname}, ${p.firstname} ${mi} ${suffix}`.trim();

  // ✅ Fetch profile image
  fetch(`http://localhost:5000/api/kkprofiling/image/${p._id}`, {
    headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
  })
    .then((res) => {
      if (!res.ok) throw new Error("Image not found");
      return res.blob();
    })
    .then((blob) => {
      const imgUrl = URL.createObjectURL(blob);
      header.innerHTML = `
        <img src="${imgUrl}" alt="Profile Image" />
        <div class="profile-name">${fullName}</div>
      `;
    })
    .catch(() => {
      header.innerHTML = `
        <img src="/Frontend/assets/default-profile.png" alt="Profile Image" />
        <div class="profile-name">${fullName}</div>
      `;
    });

  // ✅ Fill in modal details
  details.innerHTML = `
    <div class="profile-details-modal">
      <div class="profile-details-row full">
        <div class="profile-detail">
          <span class="label">Address</span>
          <span class="value">
            ${p.purok ? `Purok ${p.purok}` : ""}${p.barangay ? `, ${p.barangay}` : ""}${p.municipality ? `, ${p.municipality}` : ""}
          </span>
        </div>
      </div>
      <div class="profile-details-row">
        <div class="profile-detail">
          <span class="label">Age</span>
          <span class="value">${p.user?.age ?? "N/A"}</span>
        </div>
        <div class="profile-detail">
          <span class="label">Gender</span>
          <span class="value">${p.gender}</span>
        </div>
        <div class="profile-detail">
          <span class="label">Birthday</span>
          <span class="value">${p.user?.birthday ? new Date(p.user.birthday).toLocaleDateString() : "-"}</span>
        </div>
      </div>
      <div class="profile-details-row">
        <div class="profile-detail">
          <span class="label">Email</span>
          <span class="value">${p.email || "-"}</span>
        </div>
        <div class="profile-detail">
          <span class="label">Contact</span>
          <span class="value">${p.contactNumber || "-"}</span>
        </div>
      </div>
      <div class="profile-details-row">
        <div class="profile-detail">
          <span class="label">Civil Status</span>
          <span class="value">${p.civilStatus || "-"}</span>
        </div>
        <div class="profile-detail">
          <span class="label">Youth Age Group</span>
          <span class="value">${p.youthAgeGroup || "-"}</span>
        </div>
        <div class="profile-detail">
          <span class="label" style = "font-size: 14px">Youth Classification</span>
          <span class="value" style = "font-size: 14px">${p.youthClassification || "-"}</span>
        </div>
        ${p.youthClassification === "Youth with Specific Needs" ? `
          <div class="profile-detail">
            <span class="label" style = "font-size: 14px">Specific Needs Type</span>
            <span class="value" style = "font-size: 14px">${p.specificNeedType || "-"}</span>
          </div>
        ` : ""}
      </div>
      <div class="profile-details-row">
        <div class="profile-detail">
          <span class="label">Education</span>
        <span class="value" style = "font-size: 15px">${p.educationalBackground || "-"}</span>
        </div>
        <div class="profile-detail">
          <span class="label">Work Status</span>
          <span class="value">${p.workStatus || "-"}</span>
        </div>
        <div class="profile-detail">
          <span class="label">SK Voter</span>
          <span class="value">${p.registeredSKVoter ? "Yes" : "No"}</span>
        </div>
        <div class="profile-detail">
          <span class="label">National Voter</span>
          <span class="value">${p.registeredNationalVoter ? "Yes" : "No"}</span>
        </div>
      </div>
      <div class="profile-details-row">
        <div class="profile-detail">
          <span class="label">Attended KK Assembly</span>
          <span class="value">${p.attendedKKAssembly ? "Yes" : "No"}</span>
        </div>
        ${
          p.attendedKKAssembly
            ? `<div class="profile-detail">
                <span class="label">Times Attended</span>
                <span class="value">${p.attendanceCount || "-"}</span>
              </div>`
            : `<div class="profile-detail">
                <span class="label">Reason for Not Attending</span>
                <span class="value">${p.reasonDidNotAttend || "-"}</span>
              </div>`
        }
      </div>
    </div>
  `;

  // ✅ Download button
  const downloadBtn = document.getElementById("downloadBtn");
  if (downloadBtn) {
    downloadBtn.onclick = async function () {
      try {
        const token = sessionStorage.getItem("token");
        const res = await fetch(`http://localhost:5000/api/kkprofiling/export/${currentProfileId}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          Swal.fire("Error", "Failed to download profile.", "error");
          return;
        }
        const blob = await res.blob();
        let filename = "KKProfile.docx";
        const disposition = res.headers.get("Content-Disposition");
        if (disposition && disposition.includes("filename=")) {
          filename = disposition.split("filename=")[1].replace(/"/g, "");
        }
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          a.remove();
        }, 100);
      } catch (err) {
        Swal.fire("Error", "Error downloading profile.", "error");
      }
    };
  }

  modal.style.display = "flex";
  document.body.classList.add("modal-open");
  document.querySelector(".close-btn").onclick = () => {
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
  };
}


  // Download button logic
  document.addEventListener("DOMContentLoaded", function () {
    const downloadBtn = document.getElementById("downloadBtn");
    let currentProfileId = null;

    // Set currentProfileId when showing modal
    window.showProfileModal = function(profileId) {
      currentProfileId = profileId;
      // ...existing code to show modal...
    };

    if (downloadBtn) {
      downloadBtn.addEventListener("click", function () {
        if (!currentProfileId) return;
        downloadProfileDocx(currentProfileId);
      });
    }

    async function downloadProfileDocx(profileId) {
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const res = await fetch(`/api/kkprofiling/export/${profileId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) {
          alert("Failed to download profile.");
          return;
        }
        const blob = await res.blob();
        // Try to get filename from header
        let filename = "KKProfile.docx";
        const disposition = res.headers.get("Content-Disposition");
        if (disposition && disposition.indexOf("filename=") !== -1) {
          filename = disposition.split("filename=")[1].replace(/"/g, "");
        }
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          a.remove();
        }, 100);
      } catch (err) {
        alert("Error downloading profile.");
      }
    }
  });

  // 🔹 Cycle filter (year + cycle)
  filterBtn.addEventListener("click", () => {
    // Require year and cycle for any filter
    if (!currentFilters.year || !currentFilters.cycle) {
      alert("Please select both year and cycle before filtering.");
      return;
    }
    fetchProfiles(currentFilters);
  });

  // 🔹 Search filter
  searchInput.addEventListener("keyup", () => {
    const searchTerm = searchInput.value.trim().toLowerCase();

    const filteredProfiles = allProfiles.filter(p => {
      return (
        (p.firstname && p.firstname.toLowerCase().includes(searchTerm)) ||
        (p.middlename && p.middlename.toLowerCase().includes(searchTerm)) ||
        (p.lastname && p.lastname.toLowerCase().includes(searchTerm)) ||
        (p.barangay && p.barangay.toLowerCase().includes(searchTerm)) ||
        (p.purok && p.purok.toLowerCase().includes(searchTerm))
      );
    });

    renderProfiles(filteredProfiles);
  });

  // Helper to format date/time (used only for profile modal birthday)
  function formatDateTime(dt) {
    if (!dt) return "";
    const date = new Date(dt);

    const year = date.getFullYear();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const day = date.getDate();

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");

    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    return `${month} ${day}, ${year} ${hours}:${minutes} ${ampm}`;
  }

  // 🔹 Available filter options
  const filterOptions = {
    "Work Status": ["Employed", "Unemployed", "Self-Employed", "Currently looking for a Job", "Not interested in looking for a Job"],
    "Youth Age Group": ["Child Youth", "Core Youth", "Young Youth"],
    "Educational Background": ["Elementary Undergraduate", "Elementary Graduate", "High School Undergraduate", "High School Graduate", "Vocational Graduate", "College Undergraduate", "College Graduate", "Masters Graduate", "Doctorate Level", "Doctorate Graduate"],
    "Civil Status": ["Single", "Live-in", "Married", "Unknown", "Separated", "Annulled", "Divorced", "Widowed"],
    "Youth Classification": ["In School Youth","Out of School Youth","Working Youth","Youth with Specific Needs"],
    "Purok": ["1","2","3","4","5","6","7","8","9","10"],
    "Registered SK Voter": ["true", "false"],
    "Registered National Voter": ["true", "false"],
    "Voted Last SK Election": ["true", "false"],
  };

  // Classification logic (keep your existing submenu logic)
  // Only allow one classification filter at a time
  Object.keys(filterOptions).forEach((cat) => {
    filterOptions[cat].forEach((opt) => {
      setTimeout(() => {
        const links = Array.from(classificationDropdown.querySelectorAll(".submenu-content a"));
        links.forEach(link => {
          if (link.textContent === opt) {
            link.addEventListener("click", () => {
              // Clear all classification filters before setting a new one
              delete currentFilters.workStatus;
              delete currentFilters.youthAgeGroup;
              delete currentFilters.educationalBackground;
              delete currentFilters.civilStatus;
              delete currentFilters.youthClassification;
              delete currentFilters.purok;
              delete currentFilters.registeredSKVoter;
              delete currentFilters.registeredNationalVoter;
              delete currentFilters.votedLastSKElection;

              // Set only the selected classification filter
              if (cat === "Work Status") currentFilters.workStatus = opt;
              if (cat === "Youth Age Group") currentFilters.youthAgeGroup = opt;
              if (cat === "Educational Background") currentFilters.educationalBackground = opt;
              if (cat === "Civil Status") currentFilters.civilStatus = opt;
              if (cat === "Youth Classification") currentFilters.youthClassification = opt;
              if (cat === "Purok") currentFilters.purok = opt;
              if (cat === "Registered SK Voter") currentFilters.registeredSKVoter = opt;
              if (cat === "Registered National Voter") currentFilters.registeredNationalVoter = opt;
              if (cat === "Voted Last SK Election") currentFilters.votedLastSKElection = opt;

              // Change button text to selected classification
              classificationButton.textContent = opt;

              classificationContent.style.display = "none";
            });
          }
        });
      }, 500);
    });
  });

  // Build classification dropdown (submenu structure)
  classificationContent.innerHTML = ""; // Clear first
  Object.keys(filterOptions).forEach((cat) => {
    // Parent container
    const parent = document.createElement("div");
    parent.classList.add("submenu");

    // Top-level item (category)
    const catItem = document.createElement("a");
    catItem.textContent = cat;
    catItem.href = "#";
    parent.appendChild(catItem);

    // Submenu container
    const subMenu = document.createElement("div");
    subMenu.classList.add("submenu-content");

    // Build groups inside submenu
    filterOptions[cat].forEach((opt) => {
      const g = document.createElement("a");
      g.textContent = opt;
      g.href = "#";
      g.className = "dropdown-option";
      subMenu.appendChild(g);
    });

    parent.appendChild(subMenu);
    classificationContent.appendChild(parent);
  });

  // Only run filter when filter button is clicked
  filterBtn.addEventListener("click", () => {
    // Require year and cycle for any filter
    if (!currentFilters.year || !currentFilters.cycle) {
      alert("Please select both year and cycle before filtering.");
      return;
    }
    fetchProfiles(currentFilters);
  });

  // Clear filter resets everything
  document.getElementById("clearFilterBtn").addEventListener("click", () => {
    yearButton.textContent = "Year";
    cycleButton.textContent = "Cycle";
    cycleButton.disabled = true;
    classificationButton.disabled = true;
    classificationButton.textContent = "Classification";
    yearContent.style.display = "none";
    cycleContent.style.display = "none";
    classificationContent.style.display = "none";

    // Reset filters
    currentFilters = {};

    // Fetch all profiles (no filters)
    fetchProfiles({});
  });

  // 🔹 Initial load
  fetchCycles(); // load year + cycle dropdowns
  fetchProfiles(); // load profiles

  // Disable year and cycle selects initially
  yearDropdown.disabled = true;
  cycleDropdown.disabled = true;



  yearDropdown.disabled = false; // Year is a lways enabled
  cycleDropdown.disabled = true;
  classificationDropdown.querySelector('.dropdown-button').disabled = true;

  // Enable cycle after year is selected
  yearDropdown.addEventListener("change", () => {
    if (yearDropdown.value) {
      cycleDropdown.disabled = false;
      cycleDropdown.value = "";
      classificationDropdown.querySelector('.dropdown-button').disabled = true;

      // Repopulate cycle options for selected year ONLY
      const selectedYear = yearDropdown.value;
      cycleDropdown.querySelector(".dropdown-content").innerHTML = `<option value="">Select Cycle</option>`;
      if (selectedYear && yearMap[selectedYear]) {
        yearMap[selectedYear].forEach((cy) => {
          const opt = document.createElement("option");
          opt.value = cy;
          opt.textContent = `Cycle ${cy}`;
          cycleDropdown.querySelector(".dropdown-content").appendChild(opt);
        });
      }
    } else {
      cycleDropdown.disabled = true;
      cycleDropdown.value = "";
      classificationDropdown.querySelector('.dropdown-button').disabled = true;
    }
  });

  // Enable classification after cycle is selected
  cycleDropdown.addEventListener("change", () => {
    if (cycleDropdown.value) {
      classificationDropdown.querySelector('.dropdown-button').disabled = false;
    } else {
      classificationDropdown.querySelector('.dropdown-button').disabled = true;
    }
  });
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