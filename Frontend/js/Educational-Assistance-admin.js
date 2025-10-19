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
      alert("Please select both year and cycle before filtering.");
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
    console.log("Fetching applicants with endpoint:", endpoint);

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
    pendingTable.innerHTML = "";
    approvedTable.innerHTML = "";
    rejectedTable.innerHTML = "";

    const searchTerm = searchInput.value.toLowerCase();

    data.forEach((app, index) => {
      const mi = app.middlename ? app.middlename[0].toUpperCase() + "." : "";
      const fullName = `${app.firstname} ${mi} ${app.surname}`.trim();
      if (!fullName.toLowerCase().includes(searchTerm)) return;

      let actionBtn = "";
      if (app.status === "pending") {
        actionBtn = `<button class="action-btn"><i class="fas fa-eye"></i></button>`;
      } else {
        actionBtn = `<button class="action-btn delete-btn"><i class="fas fa-trash"></i> Delete</button>`;
      }

      // Removed School column
      const row = `
        <tr data-id="${app._id}">
          <td>${index + 1}</td>
          <td>${fullName}</td>
          <td>${app.age ?? ""}</td>
          <td>${app.civilStatus || "N/A"}</td>
          <td>${app.religion || "N/A"}</td>
          <td>${app.year || app.grade || "N/A"}</td>
          <td>${app.sex || "N/A"}</td>
          <td>${actionBtn}</td>
        </tr>
      `;

      if (app.status === "pending") {
        pendingTable.innerHTML += row;
      } else if (app.status === "approved") {
        approvedTable.innerHTML += row;
      } else if (app.status === "rejected") {
        rejectedTable.innerHTML += row;
      }
    });

    // Attach modal openers and delete handlers after table rows are rendered
    attachModalOpeners();
    attachDeleteHandlers();
  }

  // Add this after renderTables function

  async function showApplicantModal(app) {
    const modal = document.getElementById("profileModal");
    let birthday = app.birthday;

    // If birthday is missing, fetch from user profile
    if (!birthday && app.user && app.user._id) {
      try {
        const token = sessionStorage.getItem("token");
        const res = await fetch(`http://localhost:5000/api/users/${app.user._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const userData = await res.json();
          birthday = userData.birthday;
        }
      } catch (err) {
        console.error("Failed to fetch user birthday:", err);
      }
    }

    const mi = app.middlename ? app.middlename[0].toUpperCase() + "." : "";

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header" style="display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #eee; margin-top:30px;">
          <div>
            ${app.status === "approved" ? `
              <button class="print-btn" id="printProfileBtn"><i class="fa-solid fa-print"></i> Print</button>
            ` : ""}
            <span class="close-btn" style="cursor:pointer;font-size:1.5em;margin-left:18px;">&times;</span>
          </div>
        </div>
        <div id="profileDetails">
          
          <div class="namee form-field">
            <label>Name:</label>
            <div class="form-box">${app.firstname} ${mi} ${app.surname}</div>
          </div>

          <div class="form-field row">
            <label>Birthday:</label>
            <div class="form-box">${birthday ? new Date(birthday).toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" }) : ""}</div>
            <label>Place of Birth:</label>
            <div class="form-box">${app.placeOfBirth || ""}</div>
          </div>

          <div class="form-field row">
            <label>Age:</label>
            <div class="form-box">${app.age ?? ""}</div>
            <label>Gender:</label>
            <div class="form-box">${app.sex || ""}</div>
          </div>
          
          <div class="form-field row">
            <label>Civil Status:</label>
            <div class="form-box">${app.civilStatus || ""}</div>
            <label>Religion:</label>
            <div class="form-box">${app.religion || ""}</div>
          </div>

          <div class="form-field">
            <label>Name of School:</label>
            <div class="form-box">${app.school || "-"}</div>
          </div>

          <div class="form-field">
            <label>School Address:</label>
            <div class="form-box">${app.schoolAddress || "-"}</div>
          </div>

          <div class="form-field row">
            <label>Year Level:</label>
            <div class="form-box">${app.year || "-"}</div>
          </div>


          <div class="form-field">
            <label>E-mail:</label>
            <div class="form-box">${app.user?.email || "-"}</div>
          </div>

          <div class="form-field">
            <label>Type of Benefit being Applied:</label>
            <div class="form-box">${app.typeOfBenefit || "Educational Assistance"}</div>
          </div>

          <hr>
          <table style="width:100%;border-collapse:collapse;margin-top:10px;">
            <tr>
              <td><b>Father's Name:</b></td>
              <td>${app.fatherName || ""}</td>
              <td><b>Contact Number:</b></td>
              <td>${app.fatherPhone || ""}</td>
            </tr>
            <tr>
              <td><b>Mother's Name:</b></td>
              <td>${app.motherName || ""}</td>
              <td><b>Contact Number:</b></td>
              <td>${app.motherPhone || ""}</td>
            </tr>
          </table>
          <hr>
          <div style="margin-top:10px;">
            <b>Names of Brother/s and Sister/s</b>
            <table style="width:100%;border-collapse:collapse;margin-top:5px;">
              <thead>
                <tr style="background:#f7f7f7;">
                  <th style="text-align:left;">Name</th>
                  <th style="text-align:left;">Gender</th>
                  <th style="text-align:left;">Age</th>
                </tr>
              </thead>
              <tbody>
                ${(app.siblings || []).map(sib => `
                  <tr>
                    <td>${sib.name}</td>
                    <td>${sib.gender}</td>
                    <td>${sib.age}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <hr>
          <div style="margin-top:10px;">
            <b>Fees and other Expenses to be Incurred</b>
            <table style="width:100%;border-collapse:collapse;margin-top:5px;">
              <thead>
                <tr style="background:#f7f7f7;">
                  <th style="text-align:left;">Expense</th>
                  <th style="text-align:left;">Expected Cost</th>
                </tr>
              </thead>
              <tbody>
                ${(app.expenses || []).map(exp => `
                  <tr>
                    <td>${exp.item}</td>
                    <td>${exp.expectedCost}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <div style="margin-top:18px; text-align:right;">
            ${app.status === "pending" ? `
              <button class="reject-btn" style="background:#e74c3c; color:#fff; border:none; border-radius:6px; padding:7px 16px; margin-right:8px; cursor:pointer;">Reject</button>
              <button class="approve-btn" style="background:#0A2C59; color:#fff; border:none; border-radius:6px; padding:7px 16px; cursor:pointer;">Accept</button>
            ` : ""}
          </div>


        </div>
      </div>
    `;

    modal.style.display = "flex";

    // Close modal
    modal.querySelector(".close-btn").onclick = () => (modal.style.display = "none");

    // Print
    if (app.status === "approved") {
      const printBtn = modal.querySelector("#printProfileBtn");
      if (printBtn) {
        printBtn.onclick = function () {
          const printContents = modal.querySelector(".modal-content").innerHTML;
          const originalContents = document.body.innerHTML;
          document.body.innerHTML = printContents;
          window.print();
          document.body.innerHTML = originalContents;
          window.location.reload();
        };
      }
    }
      //   modal.querySelector("#printProfileBtn").onclick = function () {
      //   const printWindow = window.open("", "_blank", "width=900,height=650");

      //   printWindow.document.write(`
      //     <html>
      //       <head>
      //         <title>Applicant Profile</title>
      //         <style>
      //           body { font-family: 'Poppins', sans-serif; margin: 40px; color: #222; }
      //           h1 { text-align: center; color: #0A2C59; }
      //           .section { margin-top: 20px; }
      //           .section b { display: inline-block; width: 180px; color: #0A2C59; }
      //           table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      //           th, td { border: 1px solid #ccc; padding: 8px; font-size: 14px; }
      //           th { background: #f7f7f7; }
      //         </style>
      //       </head>
      //       <body>
      //         <h1>Applicant Profile</h1>

      //         <div class="section">
      //           <b>Name:</b> ${app.firstname} ${app.middlename || ""} ${app.surname}<br>
      //           <b>Birthday:</b> ${app.birthday ? new Date(app.birthday).toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" }) : ""}<br>
      //           <b>Place of Birth:</b> ${app.placeOfBirth || ""}<br>
      //           <b>Age:</b> ${app.age ?? ""}<br>
      //           <b>Gender:</b> ${app.sex || ""}<br>
      //           <b>Civil Status:</b> ${app.civilStatus || ""}<br>
      //           <b>Religion:</b> ${app.religion || ""}<br>
      //           <b>Email:</b> ${app.user?.email || "-"}
      //         </div>

      //         <div class="section">
      //           <b>School:</b> ${app.school || "-"}<br>
      //           <b>School Address:</b> ${app.schoolAddress || "-"}<br>
      //           <b>Course:</b> ${app.course || "-"}<br>
      //           <b>Year Level:</b> ${app.yearLevel || "-"}<br>
      //           <b>Type of Benefit:</b> ${app.typeOfBenefit || "Educational Assistance"}
      //         </div>

      //         <div class="section">
      //           <b>Father’s Name:</b> ${app.fatherName || ""} (${app.fatherPhone || ""})<br>
      //           <b>Mother’s Name:</b> ${app.motherName || ""} (${app.motherPhone || ""})
      //         </div>

      //         <div class="section">
      //           <h3>Names of Brother/s and Sister/s</h3>
      //           <table>
      //             <thead>
      //               <tr><th>Name</th><th>Gender</th><th>Age</th></tr>
      //             </thead>
      //             <tbody>
      //               ${(app.siblings || []).map(sib => `
      //                 <tr>
      //                   <td>${sib.name}</td>
      //                   <td>${sib.gender}</td>
      //                   <td>${sib.age}</td>
      //                 </tr>
      //               `).join("")}
      //             </tbody>
      //           </table>
      //         </div>

      //         <div class="section">
      //           <h3>Fees and Other Expenses</h3>
      //           <table>
      //             <thead>
      //               <tr><th>Expense</th><th>Expected Cost</th></tr>
      //             </thead>
      //             <tbody>
      //               ${(app.expenses || []).map(exp => `
      //                 <tr>
      //                   <td>${exp.item}</td>
      //                   <td>${exp.expectedCost}</td>
      //                 </tr>
      //               `).join("")}
      //             </tbody>
      //           </table>
      //         </div>
      //       </body>
      //     </html>
      //   `);

      //   printWindow.document.close();
      //   printWindow.focus();
      //   printWindow.print();
      // };
  

  // Handle approve/reject clicks
  // Approve button
const approveBtn = modal.querySelector(".approve-btn");
if (approveBtn) {
  approveBtn.textContent = "Accept";
  approveBtn.onclick = async () => {
    modal.style.display = "none"; // Close modal first
    try {
      const token = sessionStorage.getItem("token");
      await fetch(`http://localhost:5000/api/educational-assistance/${app._id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: "approved" })
      });

      app.status = "approved";
      renderTables(applicants);
    } catch (err) {
      console.error("Error approving:", err);
      alert("Failed to approve application.");
    }
  };
}

const rejectBtn = modal.querySelector(".reject-btn");
if (rejectBtn) {
  rejectBtn.onclick = () => {
    modal.style.display = "none"; // Close modal first
    document.getElementById("rejectionModal").style.display = "flex";
    document.getElementById("rejectionReasonInput").value = "";
    document.getElementById("rejectionModal").dataset.appId = app._id;
  };
}

// Handle rejection modal close
document.getElementById("closeRejectionModal").onclick = function() {
  document.getElementById("rejectionModal").style.display = "none";
};

// Handle rejection modal submit
document.getElementById("submitRejectionBtn").onclick = async function() {
  const submitBtn = document.getElementById("submitRejectionBtn");
  const reason = document.getElementById("rejectionReasonInput").value.trim();
  if (!reason) {
    Swal.fire({
      icon: 'warning',
      title: 'Rejection Reason Required',
      text: 'Please enter a reason for rejection.',
      confirmButtonColor: '#0A2C59'
    });
    return;
  }
  submitBtn.disabled = true; // Prevent multiple clicks

  // Hide the rejection modal BEFORE showing the loading alert
  document.getElementById("rejectionModal").style.display = "none";

  Swal.fire({
    title: 'Processing...',
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  const appId = document.getElementById("rejectionModal").dataset.appId;
  try {
    const token = sessionStorage.getItem("token");
    await fetch(`http://localhost:5000/api/educational-assistance/${appId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        status: "rejected",
        rejectionReason: reason
      })
    });
    modal.style.display = "none";
    app.status = "rejected";
    renderTables(applicants);
    Swal.fire({
      icon: 'success',
      title: 'Application Rejected',
      text: 'The applicant has been notified.',
      confirmButtonColor: '#0A2C59'
    });
  } catch (err) {
    console.error("Error rejecting:", err);
    Swal.fire({
      icon: 'error',
      title: 'Failed to Reject',
      text: 'There was an error rejecting the application.',
      confirmButtonColor: '#0A2C59'
    });
  } finally {
    submitBtn.disabled = false; // Re-enable after process
  }
};
  }


  // After renderTables, attach modal openers for all .action-btn
  function attachModalOpeners() {
  document.querySelectorAll(".action-btn").forEach(btn => {
    btn.addEventListener("click", () => {
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
  searchInput.addEventListener("input", () => renderTables(applicants));


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
    // Fetch new applications
    const newRes = await fetch('http://localhost:5000/api/notifications/unread', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const newNotifs = await newRes.json();

    // Fetch overdue applications
    const overdueRes = await fetch('http://localhost:5000/api/notifications/overdue', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const overdueNotifs = await overdueRes.json();

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
      // Use flattened fullname and status from backend
      const name = n.fullname || 'unknown';
      const status = n.status || 'unknown';
      const date = new Date(n.createdAt).toLocaleString();
      container.innerHTML += `
        <div class="notif-item">
          <span><strong>${name}</strong>
            <span class="notif-status ${isOverdue ? 'notif-overdue' : ''}">${status}${isOverdue ? ' (Overdue)' : ''}</span>
          </span>
          <span class="notif-date">${date}</span>
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
});
