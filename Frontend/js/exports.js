document.addEventListener("DOMContentLoaded", () => {
  // Only check for token, not role
  const token = sessionStorage.getItem("token"); // <-- Use only sessionStorage

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

  // Initialize variables after auth check
  const modal = document.getElementById("exportModal");
  const closeModal = document.getElementById("closeModal");
  const exportForm = document.getElementById("exportForm");
  const modalTitle = document.getElementById("modalTitle");
  const yearSelect = document.getElementById("year");
  const cycleSelect = document.getElementById("cycle");
  let exportType = null;
  let cyclesData = [];

  // Map export type to formcycle endpoint
  const cycleEndpoints = {
    kk: "http://localhost:5000/api/formcycle/kk",
    educational: "http://localhost:5000/api/formcycle/educ",
    lgbtq: "http://localhost:5000/api/formcycle/lgbtq"
  };

  // Show modal when export button clicked
  document.querySelectorAll(".export-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      if (!btn.closest('.export-card')) return;
      exportType = btn.dataset.type;
      const cardTitle = btn.closest('.export-card').querySelector('h3').textContent;
      modalTitle.textContent = `Export ${cardTitle}`;
      yearSelect.innerHTML = `<option value="">Loading...</option>`;
      cycleSelect.innerHTML = `<option value="">Select cycle</option>`;
      modal.style.display = "flex";
      document.getElementById("confirmExportBtn").disabled = true;

      // Fetch available cycles for selected type
      try {
        Swal.fire({
          title: 'Loading cycles...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });
        const res = await fetch(cycleEndpoints[exportType], {
          headers: { Authorization: `Bearer ${token}` }
        });
        cyclesData = await res.json();
        Swal.close();
        if (!Array.isArray(cyclesData) || !cyclesData.length) {
          Swal.fire({
            icon: "warning",
            title: "No cycles found",
            text: "There are no cycles available for export.",
            confirmButtonColor: "#0A2C59"
          });
          modal.style.display = "none";
          return;
        }
        // Extract unique years
        const years = [...new Set(cyclesData.map(c => c.year))].sort((a, b) => b - a);
        yearSelect.innerHTML = `<option value="">Select year</option>` +
          years.map(y => `<option value="${y}">${y}</option>`).join("");
        cycleSelect.innerHTML = `<option value="">Select cycle</option>`;
      } catch (err) {
        Swal.close();
        Swal.fire({
          icon: "error",
          title: "Failed to load cycles",
          text: "Please try again later.",
          confirmButtonColor: "#0A2C59"
        });
        modal.style.display = "none";
      }
    });
  });

  // When year changes, update cycle options
  yearSelect.addEventListener("change", () => {
    const selectedYear = yearSelect.value;
    const cycles = cyclesData
      .filter(c => String(c.year) === selectedYear)
      .map(c => c.cycleNumber)
      .sort((a, b) => a - b);
    cycleSelect.innerHTML = `<option value="">Select cycle</option>` +
      cycles.map(cn => `<option value="${cn}">${cn}</option>`).join("");
    document.getElementById("confirmExportBtn").disabled = true;
  });

  // Enable export button only if both year and cycle are selected
  cycleSelect.addEventListener("change", () => {
    document.getElementById("confirmExportBtn").disabled = !(yearSelect.value && cycleSelect.value);
  });

  // Close modal
  closeModal.onclick = () => modal.style.display = "none";
  window.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };

  // Handle export form submit
  exportForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const year = yearSelect.value;
    const cycle = cycleSelect.value;

    if (!year || !cycle) {
      Swal.fire({
        icon: "warning",
        title: "Incomplete Selection",
        text: "Please select both year and cycle.",
        confirmButtonColor: "#0A2C59"
      });
      return;
    }

    let endpoint = "";
    if (exportType === "kk") {
      endpoint = `http://localhost:5000/api/kkprofiling/export?year=${year}&cycle=${cycle}`;
    } else if (exportType === "educational") {
      endpoint = `http://localhost:5000/api/educational-assistance/export?year=${year}&cycle=${cycle}`;
    } else if (exportType === "lgbtq") {
      endpoint = `http://localhost:5000/api/lgbtqprofiling/export/excel?year=${year}&cycle=${cycle}`;
    }

    try {
      Swal.fire({
        title: 'Exporting...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });
      const res = await fetch(endpoint, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        Swal.close();
        Swal.fire({
          icon: "error",
          title: "Export failed",
          text: data.error || "Export failed.",
          confirmButtonColor: "#0A2C59"
        });
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${exportType}_profiles_${year}_cycle${cycle}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      Swal.close();
      Swal.fire({
        icon: "success",
        title: "Export Successful",
        text: "Your Excel file has been downloaded.",
        confirmButtonColor: "#0A2C59"
      });
      modal.style.display = "none";
    } catch (err) {
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "Export failed",
        text: "Export failed.",
        confirmButtonColor: "#0A2C59"
      });
    }
  });

  // Tab switching logic
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('exportTab').style.display = tab.dataset.tab === 'export' ? '' : 'none';
      document.getElementById('formTab').style.display = tab.dataset.tab === 'form' ? '' : 'none';
      document.getElementById('deletedTab').style.display = tab.dataset.tab === 'deleted' ? '' : 'none';
      if (tab.dataset.tab === 'deleted') {
        // Always reset filter to "all" when opening the tab
        document.getElementById("deletedFilter").value = "all";
        fetchDeletedProfiles();
      }
    });
  });

  // If the Recently Deleted tab is active on page load, show all deleted
  if (document.querySelector('.settings-tab.active').dataset.tab === 'deleted') {
    document.getElementById("deletedFilter").value = "all";
    fetchDeletedProfiles();
  }

  // --- Form Cycle Status Logic ---
  const cycleStatusIds = {
    "KK Profiling": "kkCycleStatus",
    "LGBTQIA+ Profiling": "lgbtqCycleStatus",
    "Educational Assistance": "educCycleStatus"
  };

  const endpoints = {
    "KK Profiling": "http://localhost:5000/api/formcycle/kk",
    "LGBTQIA+ Profiling": "http://localhost:5000/api/formcycle/lgbtq",
    "Educational Assistance": "http://localhost:5000/api/formcycle/educ"
  };

  // Fetch current cycle status for all forms
  async function fetchCycleStatuses() {
    const token = sessionStorage.getItem("token");
    for (const [formName, endpoint] of Object.entries(endpoints)) {
      try {
        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const cycles = await res.json();
        const statusEl = document.getElementById(cycleStatusIds[formName]);
        const btn = document.querySelector(`.form-action-btn[data-form="${formName}"]`);
        if (res.ok && Array.isArray(cycles) && cycles.length) {
          let current = cycles.find(c => c.isOpen) ||
                        cycles.reduce((a, b) => (a.cycleNumber > b.cycleNumber ? a : b));
          if (current) {
            statusEl.textContent = current.isOpen
              ? `Open (Cycle ${current.cycleNumber})`
              : `Closed (Cycle ${current.cycleNumber})`;
            statusEl.style.color = current.isOpen ? "#07B0F2" : "#ef4444";
            statusEl.style.background = current.isOpen ? "#e6f7ff" : "#ffeaea";
            // Set button text/icon
            if (btn) {
              btn.innerHTML = current.isOpen
                ? `<i class="fas fa-lock"></i> Close`
                : `<i class="fas fa-lock-open"></i> Open`;
              btn.classList.toggle('close-btn', current.isOpen);
              btn.classList.toggle('open-btn', !current.isOpen);
            }
          }
        } else {
          statusEl.textContent = "Unavailable";
          statusEl.style.color = "#888";
          statusEl.style.background = "#f4f6f8";
        }
      } catch {
        const statusEl = document.getElementById(cycleStatusIds[formName]);
        statusEl.textContent = "Error";
        statusEl.style.color = "#888";
        statusEl.style.background = "#f4f6f8";
      }
    }
  }

  // Toggle cycle status for a form
  async function toggleCycle(formName) {
    const token = sessionStorage.getItem("token");
    // Fetch current cycles to determine state
    let cycles = [];
    try {
      const res = await fetch(endpoints[formName], {
        headers: { Authorization: `Bearer ${token}` }
      });
      cycles = await res.json();
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Could not fetch current cycle status.",
        confirmButtonColor: "#0A2C59"
      });
      return;
    }

    const openCycle = cycles.find(c => c.isOpen);
    const year = new Date().getFullYear();
    const yearCycleCount = cycles.filter(c => c.year === year).length;

    // If closing, show warning
    if (openCycle) {
      const result = await Swal.fire({
        icon: "warning",
        title: "<span style='font-size:1.25rem;'>Close Form?</span>",
        html: `
          <div style="text-align:left; font-size:1.05rem; margin-top:10px;">
            <b>Are you sure you want to close this form?</b>
            <ul style="margin: 1em 0 0 1.5em; padding-left:1em;">
              <li style="margin-bottom:8px;">No more submissions will be accepted for this cycle.</li>
              <li style="margin-bottom:8px;">This action cannot be undone.</li>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Yes, close it",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#0A2C59",
        customClass: {
          popup: 'swal2-theme-popup'
        }
      });
      if (!result.isConfirmed) return;
    } else if (yearCycleCount >= 3) {
      Swal.fire({
        icon: "error",
        title: "Cannot Open New Cycle",
        text: "Maximum of 3 cycles per year allowed. Please wait until next year to open a new cycle.",
        confirmButtonColor: "#0A2C59"
      });
      return;
    } else {
      // Opening a new cycle: warn user
      const result = await Swal.fire({
        icon: "info",
        title: "Open New Cycle?",
        html: `
          <b>Are you sure you want to open a new cycle?</b><br>
          <ul style="text-align:left; margin: 1em 0 0 1.5em;">
            <li>A new cycle will allow new submissions for this form.</li>
            <li>Only 3 cycles are allowed per year.</li>
          </ul>
        `,
        showCancelButton: true,
        confirmButtonText: "Yes, open it",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#07B0F2",
        cancelButtonColor: "#0A2C59"
      });
      if (!result.isConfirmed) return;
    }

    // Proceed with toggle
    try {
      Swal.fire({
        title: openCycle ? "Closing form..." : "Opening form...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });
      const res = await fetch("http://localhost:5000/api/formcycle/toggle", {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ formName })
      });
      Swal.close();
      if (res.ok) {
        await fetchCycleStatuses();
        Swal.fire({
          icon: "success",
          title: openCycle ? "Form Closed" : "Form Opened",
          text: openCycle
            ? "The form has been closed. No further submissions will be accepted."
            : "A new cycle has been opened. Submissions are now allowed.",
          confirmButtonColor: "#0A2C59"
        });
      } else {
        const data = await res.json().catch(() => ({}));
        Swal.fire({
          icon: "error",
          title: "Failed to toggle cycle",
          text: data.error || "Failed to toggle cycle.",
          confirmButtonColor: "#0A2C59"
        });
      }
    } catch {
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "Failed to toggle cycle",
        text: "Failed to toggle cycle.",
        confirmButtonColor: "#0A2C59"
      });
    }
  }

  // Attach event listeners to toggle buttons
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const formName = btn.dataset.form;
      toggleCycle(formName);
    });
  });
  document.querySelectorAll('.form-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const formName = btn.dataset.form;
      toggleCycle(formName);
    });
  });

  // Fetch statuses on page load and after tab switch
  document.addEventListener("DOMContentLoaded", () => {
    fetchCycleStatuses();
  });
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      if (tab.dataset.tab === 'form') {
        fetchCycleStatuses();
      }
    });
  });

  async function fetchDeletedProfiles() {
    const token = sessionStorage.getItem("token");
    const filter = document.getElementById("deletedFilter").value;
    let profiles = [];

    if (filter === "kk") {
      // Only KK deleted profiles
      const resKK = await fetch("http://localhost:5000/api/kkprofiling/deleted", {
        headers: { Authorization: `Bearer ${token}` }
      });
      profiles = (await resKK.json()).map(p => ({ ...p, type: "KK" }));
    } else if (filter === "lgbtq") {
      // Only LGBTQ deleted profiles
      const resLGBTQ = await fetch("http://localhost:5000/api/lgbtqprofiling/deleted", {
        headers: { Authorization: `Bearer ${token}` }
      });
      profiles = (await resLGBTQ.json()).map(p => ({ ...p, type: "LGBTQ" }));
    } else {
      // All deleted profiles (KK + LGBTQ)
      const [resKK, resLGBTQ] = await Promise.all([
        fetch("http://localhost:5000/api/kkprofiling/deleted", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch("http://localhost:5000/api/lgbtqprofiling/deleted", {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      const kk = (await resKK.json()).map(p => ({ ...p, type: "KK" }));
      const lgbtq = (await resLGBTQ.json()).map(p => ({ ...p, type: "LGBTQ" }));
      profiles = [...kk, ...lgbtq];
    }

    // Sort by deletedAt descending
    profiles.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

    const tbody = document.querySelector("#deletedTable tbody");
    tbody.innerHTML = "";
    profiles.forEach((p, i) => {
      // Build full name for KK and LGBTQ profiles
      let fullName = "N/A";
      if (p.type === "KK") {
        // For KK: use firstname, middlename, surname
        const mi = p.middlename ? p.middlename[0].toUpperCase() + "." : "";
        fullName = [p.firstname, mi, p.surname].filter(Boolean).join(" ");
      } else if (p.type === "LGBTQ") {
        // For LGBTQ: use firstname, middlename, lastname
        const mi = p.middlename ? p.middlename[0].toUpperCase() + "." : "";
        fullName = [p.firstname, mi, p.lastname].filter(Boolean).join(" ");
      } else {
        // Fallback to displayData or name
        fullName = p.displayData?.residentName || p.name || "N/A";
      }
      const deletedDate = p.deletedAt ? new Date(p.deletedAt).toLocaleDateString() : "—";
      tbody.innerHTML += `
        <tr>
          <td>${i + 1}</td>
          <td>${fullName}</td>
          <td>${p.type}</td>
          <td>${deletedDate}</td>
          <td>
            <button class="restore-btn" data-id="${p._id}" data-type="${p.type}">Restore</button>
            <button class="permanent-delete-btn" data-id="${p._id}" data-type="${p.type}">Delete</button>
          </td>
        </tr>
      `;
    });

    // Attach restore and permanent delete handlers
    document.querySelectorAll(".restore-btn").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const type = btn.dataset.type;
        const endpoint = type === "KK"
          ? `http://localhost:5000/api/kkprofiling/${id}/restore`
          : `http://localhost:5000/api/lgbtqprofiling/${id}/restore`;
        const result = await Swal.fire({
          title: "Restore Profile?",
          text: "Are you sure you want to restore this profile?",
          icon: "question",
          showCancelButton: true,
          confirmButtonColor: "#07B0F2",
          cancelButtonColor: "#d33",
          confirmButtonText: "Yes, restore",
          cancelButtonText: "Cancel"
        });
        if (result.isConfirmed) {
          const res = await fetch(endpoint, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            Swal.fire("Restored!", "Profile has been restored.", "success");
            fetchDeletedProfiles();
          }
        }
      };
    });

    document.querySelectorAll(".permanent-delete-btn").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const type = btn.dataset.type;
        const endpoint = type === "KK"
          ? `http://localhost:5000/api/kkprofiling/${id}/permanent`
          : `http://localhost:5000/api/lgbtqprofiling/${id}/permanent`;
        const result = await Swal.fire({
          title: "Delete ?",
          text: "This action cannot be undone. Are you sure?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#ef4444",
          cancelButtonColor: "#0A2C59",
          confirmButtonText: "Yes",
          cancelButtonText: "No"
        });
        if (result.isConfirmed) {
          const res = await fetch(endpoint, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            Swal.fire("Deleted!", "Profile permanently deleted.", "success");
            fetchDeletedProfiles();
          }
        }
      };
    });
  }

  // Filter dropdown change handler
  document.getElementById("deletedFilter").addEventListener("change", fetchDeletedProfiles);
});