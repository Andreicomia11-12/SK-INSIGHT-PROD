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
(function() {
  const token = sessionStorage.getItem("token");
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
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  // Dropdown elements
  const yearDropdown = document.getElementById("yearDropdown");
  const yearButton = document.getElementById("yearButton");
  const yearContent = document.getElementById("yearContent");
  const cycleDropdown = document.getElementById("cycleDropdown");
  const cycleButton = document.getElementById("cycleButton");
  const cycleContent = document.getElementById("cycleContent");
  const filterBtn = document.getElementById("filterBtn");
  const clearFilterBtn = document.getElementById("clearFilterBtn");
  const searchInput = document.getElementById("searchInput");

  let yearMap = {};
  let selectedYear = null;
  let selectedCycle = null;

  const pendingTable = document.getElementById("pending");
const approvedTable = document.getElementById("approved");
const rejectedTable = document.getElementById("rejected");

  let currentPagePending = 1;
let currentPageApproved = 1;
let currentPageRejected = 1;
const ITEMS_PER_PAGE = 30;
let applicants = [];

  // ---------------- Tabs ----------------
  tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      tabButtons.forEach(btn => btn.classList.remove("active"));
      tabContents.forEach(tab => tab.classList.remove("active"));

      button.classList.add("active");
      document.querySelector(`.tab-content[data-tab="${button.dataset.tab}"]`).classList.add("active");
    });
  });

  // Fetch cycles and populate year dropdown
  async function fetchFormCycles() {
    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/formcycle/educ", {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      const formCycles = await res.json();

      // Group cycles by year
      yearMap = {};
      formCycles.forEach((c) => {
        if (!yearMap[c.year]) yearMap[c.year] = [];
        yearMap[c.year].push(c.cycleNumber);
      });

      // Populate year dropdown
      yearContent.innerHTML = "";
      Object.keys(yearMap).sort((a, b) => b - a).forEach(year => {
        const yearOption = document.createElement("a");
        yearOption.href = "#";
        yearOption.className = "dropdown-option";
        yearOption.textContent = year;
        yearOption.addEventListener("click", (e) => {
          e.preventDefault();
          yearButton.textContent = year;
          selectedYear = year;
          selectedCycle = null;
          cycleButton.textContent = "Cycle";
          cycleButton.disabled = false;
          // Populate cycle dropdown for selected year
          populateCycleDropdown(yearMap[year]);
          yearDropdown.classList.remove("open");
        });
        yearContent.appendChild(yearOption);
      });

      // Reset buttons on load
      yearButton.textContent = "Year";
      cycleButton.textContent = "Cycle";
      cycleButton.disabled = true;
    } catch (error) {
      console.error("Error fetching form cycles:", error);
    }
  }

  function populateCycleDropdown(cycles) {
    cycleContent.innerHTML = "";
    cycles.sort((a, b) => a - b).forEach(cycle => {
      const cycleOption = document.createElement("a");
      cycleOption.href = "#";
      cycleOption.className = "dropdown-option";
      cycleOption.textContent = `Cycle ${cycle}`;
      cycleOption.addEventListener("click", (e) => {
        e.preventDefault();
        cycleButton.textContent = `Cycle ${cycle}`;
        selectedCycle = cycle;
        cycleDropdown.classList.remove("open");
      });
      cycleContent.appendChild(cycleOption);
    });
  }

  // Dropdown open/close logic
  yearButton.addEventListener("click", (e) => {
    e.stopPropagation();
    yearDropdown.classList.toggle("open");
    cycleDropdown.classList.remove("open");
  });
  cycleButton.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!cycleButton.disabled) {
      cycleDropdown.classList.toggle("open");
      yearDropdown.classList.remove("open");
    }
  });
  window.addEventListener("click", () => {
    yearDropdown.classList.remove("open");
    cycleDropdown.classList.remove("open");
  });

  // Filter logic
  filterBtn.addEventListener("click", () => {
    if (!selectedYear || !selectedCycle) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing selection',
        text: 'Please select both year and cycle before filtering.',
        confirmButtonColor: '#0A2C59',
      });
      return;
    }
    // Call your fetchApplicants or filter logic here, passing selectedYear, selectedCycle, and searchInput.value
    fetchApplicants();
  });

  clearFilterBtn.addEventListener("click", () => {
    yearButton.textContent = "Year";
    cycleButton.textContent = "Cycle";
    cycleButton.disabled = true;
    selectedYear = null;
    selectedCycle = null;
    searchInput.value = "";
    // Call your fetchApplicants or clear logic here
    fetchApplicants();
  });

  // ---------------- Fetch Applicants ----------------
  async function fetchApplicants() {
    // Build query string for logging and fetching
    const params = [];
    if (selectedYear) params.push(`year=${selectedYear}`);
    if (selectedCycle) params.push(`cycle=${selectedCycle}`);
    if (searchInput.value) params.push(`search=${encodeURIComponent(searchInput.value)}`);
    const queryString = params.length ? `?${params.join('&')}` : '';
    const endpoint = `http://localhost:5000/api/educational-assistance/filter${queryString}`;

    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch applicants");
      const data = await res.json();

      // No need to filter here, backend does it
      applicants = data;
      renderTables(applicants);
    } catch (err) {
      console.error("Error fetching applicants:", err);
    }
  }

  // ---------------- Render Tables ----------------
  function renderTables(data) {
    // Sort by newest first (descending by createdAt)
    const sortByNewest = arr =>
      arr.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Filter by tab status and sort
    const pendingApps = sortByNewest(data.filter(app => app.status === "pending"));
    const approvedApps = sortByNewest(data.filter(app => app.status === "approved"));
    const rejectedApps = sortByNewest(data.filter(app => app.status === "rejected"));

    // Search filter
    const searchTerm = searchInput.value.toLowerCase();
    const filterBySearch = arr => arr.filter(app => {
      const mi = app.middlename ? app.middlename[0].toUpperCase() + "." : "";
      const fullName = `${app.firstname} ${mi} ${app.surname}`.trim().toLowerCase();
      return fullName.includes(searchTerm);
    });

    const filteredPending = filterBySearch(pendingApps);
    const filteredApproved = filterBySearch(approvedApps);
    const filteredRejected = filterBySearch(rejectedApps);

    // Pagination for each tab
    const totalPagesPending = Math.ceil(filteredPending.length / ITEMS_PER_PAGE);
    const totalPagesApproved = Math.ceil(filteredApproved.length / ITEMS_PER_PAGE);
    const totalPagesRejected = Math.ceil(filteredRejected.length / ITEMS_PER_PAGE);

    if (currentPagePending > totalPagesPending) currentPagePending = totalPagesPending || 1;
    if (currentPageApproved > totalPagesApproved) currentPageApproved = totalPagesApproved || 1;
    if (currentPageRejected > totalPagesRejected) currentPageRejected = totalPagesRejected || 1;

    const startPending = (currentPagePending - 1) * ITEMS_PER_PAGE;
    const endPending = startPending + ITEMS_PER_PAGE;
    const pagePending = filteredPending.slice(startPending, endPending);

    const startApproved = (currentPageApproved - 1) * ITEMS_PER_PAGE;
    const endApproved = startApproved + ITEMS_PER_PAGE;
    const pageApproved = filteredApproved.slice(startApproved, endApproved);

    const startRejected = (currentPageRejected - 1) * ITEMS_PER_PAGE;
    const endRejected = startRejected + ITEMS_PER_PAGE;
    const pageRejected = filteredRejected.slice(startRejected, endRejected);

    // Render Pending
    pendingTable.innerHTML = "";
    pagePending.forEach((app, idx) => {
      const mi = app.middlename ? app.middlename[0].toUpperCase() + "." : "";
      const fullName = `${app.firstname} ${mi} ${app.surname}`.trim();
      pendingTable.innerHTML += `
        <tr data-id="${app._id}" class="${app.isRead ? 'row-read' : 'row-unread'}">
          <td>${startPending + idx + 1}</td>
          <td>${fullName}</td>
          <td>${app.age ?? ""}</td>
          <td>${app.civilStatus || "N/A"}</td>
          <td>${app.religion || "N/A"}</td>
          <td>${app.year || app.grade || "N/A"}</td>
          <td>${app.sex || "N/A"}</td>
          <td><button class="action-btn"><i class="fas fa-eye"></i></button></td>
        </tr>
      `;
    });

    // Render Approved
    approvedTable.innerHTML = "";
    pageApproved.forEach((app, idx) => {
      const mi = app.middlename ? app.middlename[0].toUpperCase() + "." : "";
      const fullName = `${app.firstname} ${mi} ${app.surname}`.trim();
      approvedTable.innerHTML += `
        <tr data-id="${app._id}">
          <td>${startApproved + idx + 1}</td>
          <td>${fullName}</td>
          <td>${app.age ?? ""}</td>
          <td>${app.civilStatus || "N/A"}</td>
          <td>${app.religion || "N/A"}</td>
          <td>${app.year || app.grade || "N/A"}</td>
          <td>${app.sex || "N/A"}</td>
        </tr>
      `;
    });

    // Render Rejected
    rejectedTable.innerHTML = "";
    pageRejected.forEach((app, idx) => {
      const mi = app.middlename ? app.middlename[0].toUpperCase() + "." : "";
      const fullName = `${app.firstname} ${mi} ${app.surname}`.trim();
      rejectedTable.innerHTML += `
        <tr data-id="${app._id}">
          <td>${startRejected + idx + 1}</td>
          <td>${fullName}</td>
          <td>${app.age ?? ""}</td>
          <td>${app.civilStatus || "N/A"}</td>
          <td>${app.religion || "N/A"}</td>
          <td>${app.year || app.grade || "N/A"}</td>
          <td>${app.sex || "N/A"}</td>
          <td><button class="action-btn delete-btn"><i class="fas fa-trash"></i> Delete</button></td>
        </tr>
      `;
    });

    // Individual pagination for each tab
    renderPaginationTab('pagination-pending', currentPagePending, totalPagesPending, filteredPending.length, (page) => {
      currentPagePending = page;
      renderTables(applicants);
    });
    renderPaginationTab('pagination-approved', currentPageApproved, totalPagesApproved, filteredApproved.length, (page) => {
      currentPageApproved = page;
      renderTables(applicants);
    });
    renderPaginationTab('pagination-rejected', currentPageRejected, totalPagesRejected, filteredRejected.length, (page) => {
      currentPageRejected = page;
      renderTables(applicants);
    });

    attachModalOpeners();
    attachDeleteHandlers();
  }

  function renderPaginationTab(containerId, currentPage, totalPages, totalItems, onPageChange) {
    const pagination = document.getElementById(containerId);
    if (!pagination) return;
    pagination.innerHTML = "";

    if (totalItems <= ITEMS_PER_PAGE) return;

    // Prev
    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.textContent = "Prev";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        onPageChange(currentPage - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    pagination.appendChild(prevBtn);

    // Page numbers (max 5)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.className = "pagination-btn" + (i === currentPage ? " active" : "");
      pageBtn.textContent = i;
      pageBtn.onclick = () => {
        onPageChange(i);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
      pagination.appendChild(pageBtn);
    }

    // Next
    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.textContent = "Next";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        onPageChange(currentPage + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    pagination.appendChild(nextBtn);
  }

  // Add this after renderTables function

  async function showApplicantModal(app) {
    // Fetch latest data from backend to ensure isRead is updated
    const token = sessionStorage.getItem("token");
    const response = await fetch(
      `http://localhost:5000/api/educational-assistance/${app._id}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    const freshApp = await response.json();

    const modal = document.getElementById("profileModal");
    const nameDiv = document.getElementById("profileName");
    const details = document.getElementById("profileDetails");

    const mi = freshApp.middlename ? freshApp.middlename[0].toUpperCase() + "." : "";
    nameDiv.textContent = `${freshApp.firstname} ${mi} ${freshApp.surname}`;

    // Default image placeholders
    const defaultImage = "/Frontend/assets/default-profile.jpg";

    // Use Cloudinary URLs or default placeholders for images
    const frontImage = freshApp.frontImage || defaultImage;
    const backImage = freshApp.backImage || defaultImage;
    const coeImage = freshApp.coeImage || defaultImage;
    const voterImage = freshApp.voter || defaultImage;
    // Determine whether to show voter's ID in modal. Hide for Senior High School applicants.
    const academicLevelStr = (freshApp.academicLevel || '').toString();
    const hideVoter = /senior\s*high/i.test(academicLevelStr);

    details.innerHTML = `
      <div class="profile-details-modal">
        <!-- Personal Info -->
        <div class="profile-details-row">
          <div class="profile-detail">
            <div class="label">Age</div>
            <div class="value">${freshApp.age ?? "-"}</div>
          </div>
          <div class="profile-detail">
            <div class="label">Gender</div>
            <div class="value">${freshApp.sex || "-"}</div>
          </div>
          <div class="profile-detail">
            <div class="label">Birthday</div>
            <div class="value">${
              freshApp.user?.birthday
                ? new Date(freshApp.user.birthday).toLocaleDateString()
                : "-"
            }</div>
          </div>
        </div>

        <!-- Birth & Contact Info -->
        <div class="profile-details-row">
          <div class="profile-detail">
            <div class="label">Place of Birth</div>
            <div class="value">${freshApp.placeOfBirth || "-"}</div>
          </div>
          <div class="profile-detail">
            <div class="label">Email</div>
            <div class="value">${freshApp.user?.email || "-"}</div>
          </div>
          <div class="profile-detail">
            <div class="label">Contact Number</div>
            <div class="value">${freshApp.contactNumber || "-"}</div>
          </div>
        </div>

        <!-- Personal Details -->
        <div class="profile-details-row">
          <div class="profile-detail">
            <div class="label">Civil Status</div>
            <div class="value">${freshApp.civilStatus || "-"}</div>
          </div>
          <div class="profile-detail">
            <div class="label">Religion</div>
            <div class="value">${freshApp.religion || "-"}</div>
          </div>
          <div class="profile-detail">
            <div class="label">Type of Benefit</div>
            <div class="value">${freshApp.typeOfBenefit || "-"}</div>
          </div>
        </div>

        <!-- School Info -->
        <div class="profile-details-row">
          <div class="profile-detail">
            <div class="label">School</div>
            <div class="value">${freshApp.school || "-"}</div>
          </div>
          <div class="profile-detail">
            <div class="label">School Address</div>
            <div class="value">${freshApp.schoolAddress || "-"}</div>
          </div>
        </div>
        <div class="profile-details-row">
          <div class="profile-detail">
            <div class="label">Academic Level</div>
            <div class="value">${freshApp.academicLevel || "-"}</div>
          </div>
          <div class="profile-detail">
            <div class="label">Year Level</div>
            <div class="value">${freshApp.year || "-"}</div>
          </div>
        </div>

        <!-- Parents Info -->
        <div class="profile-details-row">
          <div class="profile-detail">
            <div class="label">Father's Name</div>
            <div class="value">${freshApp.fatherName || "-"}</div>
          </div>
          <div class="profile-detail">
            <div class="label">Father's Contact</div>
            <div class="value">${freshApp.fatherPhone || "-"}</div>
          </div>
        </div>
        
        <div class="profile-details-row">
          <div class="profile-detail">
            <div class="label">Mother's Name</div>
            <div class="value">${freshApp.motherName || "-"}</div>
          </div>
          <div class="profile-detail">
            <div class="label">Mother's Contact</div>
            <div class="value">${freshApp.motherPhone || "-"}</div>
          </div>
        </div>

        <!-- Siblings Table -->
        <div class="profile-details-row">
          <div class="profile-detail" style="flex:2;">
            <div class="label">Siblings</div>
            <table class="detail-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Gender</th>
                  <th>Age</th>
                </tr>
              </thead>
              <tbody>
                ${(freshApp.siblings || []).map(sib => `
                  <tr>
                    <td>${sib.name}</td>
                    <td>${sib.gender}</td>
                    <td>${sib.age}</td>
                  </tr>
                `).join("") || '<tr><td colspan="3">No siblings listed</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Educational Expenses Table -->
        <div class="profile-details-row">
          <div class="profile-detail" style="flex:2;">
            <div class="label">Educational Expenses</div>
            <table class="detail-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Expected Cost</th>
                </tr>
              </thead>
              <tbody>
                ${(freshApp.expenses || []).map(exp => `
                  <tr>
                    <td>${exp.item}</td>
                    <td>₱${(Number(exp.expectedCost) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                `).join("") || '<tr><td colspan="2">No expenses listed</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        



        <!-- ID and Document Images -->
        <div class="profile-details-row">
          <div class="profile-detail">
            <div class="label">Valid ID (Front)</div>
            <div class="id-image-container">
              <img src="${frontImage}" alt="Front of ID" class="id-image clickable-image" data-image-src="${frontImage}" onclick="openImageLightbox('${frontImage}')"/>
            </div>
          </div>
          <div class="profile-detail">
            <div class="label">Valid ID (Back)</div>
            <div class="id-image-container">
              <img src="${backImage}" alt="Back of ID" class="id-image clickable-image" data-image-src="${backImage}" onclick="openImageLightbox('${backImage}')"/>
            </div>
          </div>
        </div>
        <div class="profile-details-row">
          <div class="profile-detail">
            <div class="label">Certificate of Enrollment</div>
            <div class="id-image-container">
              <img src="${coeImage}" alt="Certificate of Enrollment" class="id-image clickable-image" data-image-src="${coeImage}" onclick="openImageLightbox('${coeImage}')"/>
            </div>
          </div>
          ${hideVoter ? '' : `
          <div class="profile-detail">
            <div class="label">Voter's ID</div>
            <div class="id-image-container">
              <img src="${voterImage}" alt="Voter's ID" class="id-image clickable-image" data-image-src="${voterImage}" onclick="openImageLightbox('${voterImage}')"/>
            </div>
          </div>
          `}
        </div>

        <!-- Action Buttons -->
        ${freshApp.status === "pending" ? `
          <div class="modal-actions">
            <button class="modal-btn modal-btn-danger reject-btn">Reject</button>
            <button class="modal-btn modal-btn-primary approve-btn">Accept</button>
          </div>
        ` : ''}
      </div>
    `;


    // Add event listeners for approve/reject buttons if status is pending
    if (freshApp.status === "pending") {
      const approveBtn = modal.querySelector(".modal-btn-primary");
      const rejectBtn = modal.querySelector(".modal-btn-danger");

      // Approve button logic remains unchanged
      approveBtn.addEventListener("click", async () => {
        modal.style.display = "none";
        const confirmed = await Swal.fire({
          title: 'Approve Application?',
          text: "Are you sure you want to approve this application?",
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#0A2C59',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Yes',
        });

        if (confirmed.isConfirmed) {
          // Show loading modal
          const loadingModal = document.getElementById("loadingModal");
          loadingModal.style.display = "flex";
          try {
            const res = await fetch(`http://localhost:5000/api/educational-assistance/${app._id}/status`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
              },
              body: JSON.stringify({ status: 'approved' })
            });

            loadingModal.style.display = "none";

            if (!res.ok) throw new Error('Failed to approve');

            await Swal.fire(
              'Approved!',
              'The application has been approved.',
              'success'
            );

            fetchApplicants(); // Refresh the table
          } catch (err) {
            loadingModal.style.display = "none";
            await Swal.fire(
              'Error!',
              'Failed to approve application.',
              'error'
            );
            modal.style.display = "flex";
          }
        } else {
          modal.style.display = "flex";
        }
      });

      // Reject button logic remains unchanged
      rejectBtn.addEventListener("click", async () => {
        const rejectionModal = document.getElementById("rejectionModal");
        const rejectionReasonSelect = document.getElementById("rejectionReasonSelect");
        const rejectionReasonInput = document.getElementById("rejectionReasonInput");
        const submitRejectionBtn = document.getElementById("submitRejectionBtn");
        const closeRejectionBtn = document.getElementById("closeRejectionModal");

        // Show rejection modal
        rejectionModal.style.display = "flex";

        // Close rejection modal handler
        closeRejectionBtn.onclick = () => {
          rejectionModal.style.display = "none";
          rejectionReasonSelect.value = "";
          rejectionReasonInput.value = "";
        };

        // Submit rejection handler
        submitRejectionBtn.onclick = async () => {
          const selectedReason = rejectionReasonSelect.value;
          const customMessage = rejectionReasonInput.value.trim();

          if (!selectedReason && !customMessage) {
            await Swal.fire('Error', 'Please select or specify a rejection reason.', 'error');
            return;
          }

          // Capitalize the first letter of the selected 
          // reason
          let formattedReason = selectedReason
            ? selectedReason.charAt(0).toUpperCase() + selectedReason.slice(1)
            : "";

          // Capitalize the first letter of the custom message
          let formattedMessage = customMessage
            ? customMessage.charAt(0).toUpperCase() + customMessage.slice(1)
            : "";

          // Combine for final rejectionReason
          let rejectionReason = formattedReason;
          if (formattedMessage) {
            rejectionReason += formattedReason ? `:\n${formattedMessage}` : formattedMessage;
          }

          rejectionModal.style.display = "none";
          modal.style.display = "none";

          // Show loading modal
          const loadingModal = document.getElementById("loadingModal");
          loadingModal.style.display = "flex";

          try {
            const res = await fetch(`http://localhost:5000/api/educational-assistance/${app._id}/status`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
              },
              body: JSON.stringify({
                status: 'rejected',
                rejectionReason
              })
            });

            loadingModal.style.display = "none";

            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || 'Failed to reject');
            }

            await Swal.fire({
              icon: 'success',
              title: 'Application Rejected',
              text: 'The application has been successfully rejected',
              confirmButtonColor: '#0A2C59'
            });

            fetchApplicants(); // Refresh table

          } catch (err) {
            loadingModal.style.display = "none";
            await Swal.fire({
              icon: 'error',
              title: 'Rejection Failed',
              text: err.message || 'Failed to reject the application. Please try again.',
              confirmButtonColor: '#0A2C59'
            });
            rejectionModal.style.display = "flex";
          }

          rejectionReasonSelect.value = "";
          rejectionReasonInput.value = "";
        };
      });
    }

    modal.style.display = "flex";

    // Close button handler
    modal.querySelector(".modern-modal-close").onclick = () => {
      modal.style.display = "none";
    };

    // Mark as read
    const row = document.querySelector(`tr[data-id="${app._id}"]`);
if (row) {
  row.classList.remove('row-unread');
  row.classList.add('row-read');
}
  }

  // After renderTables, attach modal openers for all .action-btn
  function attachModalOpeners() {
  document.querySelectorAll(".action-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      // Prevent modal if delete button was clicked
      if (btn.classList.contains("delete-btn")) return;
      // Prevent modal if event originated from inside a delete button
      if (e.target.closest(".delete-btn")) return;
      const row = btn.closest("tr");
      const appId = row.dataset.id;
      const app = applicants.find(a => a._id === appId);
      showApplicantModal(app);
    });
  });
}

function attachDeleteHandlers() {
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const row = btn.closest("tr");
      const appId = row.dataset.id;
      const confirm = await Swal.fire({
        icon: 'warning',
        title: 'Delete Application',
        text: 'Are you sure you want to delete this application?',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#0A2C59',
        confirmButtonText: 'Delete'
      });
      if (confirm.isConfirmed) {
        try {
          const token = sessionStorage.getItem("token");
          await fetch(`http://localhost:5000/api/educational-assistance/${appId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          // Remove from applicants array and re-render
          applicants = applicants.filter(a => a._id !== appId);
          renderTables(applicants);
          Swal.fire({
            icon: 'success',
            title: 'Deleted',
            text: 'Application deleted successfully.',
            confirmButtonColor: '#0A2C59'
          });
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'Delete Failed',
            text: 'Could not delete application.',
            confirmButtonColor: '#0A2C59'
          });
        }
      }
    });
  });
}

  // ---------------- Event Listeners ----------------
  searchInput.addEventListener("input", () => {
  currentPagePending = 1;
  currentPageApproved = 1;
  currentPageRejected = 1;
  renderTables(applicants);
});
filterBtn.addEventListener("click", () => {
  currentPagePending = 1;
  currentPageApproved = 1;
  currentPageRejected = 1;
  fetchApplicants();
});
clearFilterBtn.addEventListener("click", () => {
  currentPagePending = 1;
  currentPageApproved = 1;
  currentPageRejected = 1;
  fetchApplicants();
});

  // ---------------- Initial Load ----------------
  fetchFormCycles().then(fetchApplicants);

  // ---------------- Notification Dropdown Logic ----------------
  const notifBell = document.getElementById('notifBell');
  const notifDropdown = document.getElementById('notifDropdown');
  const notifTabs = notifDropdown.querySelectorAll('.notif-tab');
  const notifListNew = document.getElementById('notifListNew');
  const notifListOverdue = document.getElementById('notifListOverdue');

  notifBell.addEventListener('click', () => {
    notifDropdown.style.display = notifDropdown.style.display === 'none' ? 'block' : 'none';
    fetchNotifications();
  });

  // Tab switching
  notifTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      notifTabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      notifListNew.style.display = this.dataset.tab === 'new' ? 'block' : 'none';
      notifListOverdue.style.display = this.dataset.tab === 'overdue' ? 'block' : 'none';
    });
  });

  // Fetch notifications from backend
  async function fetchNotifications() {
    const token = sessionStorage.getItem("token");
    // Fetch all pending notifications (regardless of read)
    const res = await fetch('http://localhost:5000/api/notifications/educational/pending', {
      headers: { Authorization: `Bearer ${token}` }
    });
    let allNotifs = await res.json();

    // Filter: only pending and within last 24 hours for "New"
    const now = Date.now();
    const newNotifs = allNotifs.filter(n => {
      const created = new Date(n.createdAt).getTime();
      return (now - created) <= 24 * 60 * 60 * 1000;
    });

    // Filter: only pending and more than 2 days old for "Overdue"  
    const overdueNotifs = allNotifs.filter(n => {
      const created = new Date(n.createdAt).getTime();
      return (now - created) > 2 * 24 * 60 * 60 * 1000;
    });

    // --- Update summary counts ---
    document.getElementById('notifNewToday').textContent = newNotifs.length;
    document.getElementById('notifOverdueTotal').textContent = overdueNotifs.length;

    // --- Render lists as before ---
    renderNotifList(notifListNew, newNotifs, false);
    renderNotifList(notifListOverdue, overdueNotifs, true);
  }

  function renderNotifList(container, notifs, isOverdue) {
    container.innerHTML = '';
    if (!Array.isArray(notifs) || notifs.length === 0) {
      container.innerHTML = `<div class="notif-item">No ${isOverdue ? 'Overdue' : 'New'} Applications</div>`;
      return;
    }
    notifs.forEach(n => {
      const name = n.fullname || 'Unknown';
      const status = n.status || 'Unknown';
      const dateObj = new Date(n.createdAt);
      const date = dateObj.toLocaleDateString();
      const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      container.innerHTML += `
        <div class="notif-card${isOverdue ? ' notif-card-overdue' : ''}">
          <div class="notif-card-header">
            <span class="notif-card-name">${name}</span>
            <span class="notif-card-status ${isOverdue ? 'notif-status-overdue' : 'notif-status-pending'}">
              ${status}${isOverdue ? ' (Overdue)' : ''}
            </span>
          </div>
          <div class="notif-card-footer">
            <span class="notif-card-label">Submitted:</span>
            <span class="notif-card-date">${date} ${time}</span>
          </div>
        </div>
      `;
    });
  }

  // Helper to format date/time
  
  // Optional: Hide dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!notifDropdown.contains(e.target) && !notifBell.contains(e.target)) {
      notifDropdown.style.display = 'none';
    }
  });

  // --- SOCKET.IO REALTIME ARRIVAL ---
  // Only ONE socket connection and listeners!
  const socket = io("http://localhost:5000", { transports: ["websocket"] });

  // Real-time badge update and toast
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

  // Call badge update on page load
  updateNotifBadge();

    const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (id && typeof showApplicantModal === "function") {
    fetch(`http://localhost:5000/api/educational-assistance/${id}`, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
    })
    .then(res => res.json())
    .then(app => {
      if (app && app._id) showApplicantModal(app);
    });
  }
});

// Remove any duplicate socket initializations and listeners below this point!

// --- Add or ensure this function exists ---
async function updateNotifBadge() {
  const token = sessionStorage.getItem("token");
  try {
    const res = await fetch('http://localhost:5000/api/notifications/educational/pending/count', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const count = data.count || 0;
    const badge = document.getElementById('notifBadge');
    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch (err) {
    const badge = document.getElementById('notifBadge');
    if (badge) badge.style.display = 'none';
  }
}
