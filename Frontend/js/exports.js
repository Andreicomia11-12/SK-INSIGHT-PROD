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
        const res = await fetch(cycleEndpoints[exportType], {
          headers: { Authorization: `Bearer ${token}` }
        });
        cyclesData = await res.json();
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
        yearSelect.innerHTML = `<option value="">Select Year</option>` +
          years.map(y => `<option value="${y}">${y}</option>`).join("");
        cycleSelect.innerHTML = `<option value="">Select Cycle</option>`;
      } catch (err) {
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
      // Updated KK Profiling Export API
      endpoint = `http://localhost:5000/api/kkprofiling/export-template?year=${year}&cycle=${cycle}`;
    } else if (exportType === "educational") {
      endpoint = `http://localhost:5000/api/educational-assistance/export/excel?year=${year}&cycle=${cycle}`;
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
      } else if (tab.dataset.tab === 'form') {
        // fetch history for all forms
        fetchFormHistory("KK Profiling", "formHistoryKK");
        fetchFormHistory("LGBTQIA+ Profiling", "formHistoryLGBTQ");
        fetchFormHistory("Educational Assistance", "formHistoryEduc");
      }
    });
  });

  // If the Recently Deleted tab is active on page load, show all deleted
  if (document.querySelector('.settings-tab.active').dataset.tab === 'deleted') {
    document.getElementById("deletedFilter").value = "all";
    fetchDeletedProfiles();
  } else if (document.querySelector('.settings-tab.active').dataset.tab === 'form') {
    fetchFormHistory("KK Profiling", "formHistoryKK");
    fetchFormHistory("LGBTQIA+ Profiling", "formHistoryLGBTQ");
    fetchFormHistory("Educational Assistance", "formHistoryEduc");
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
        confirmButtonText: "Yes",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#0A2C59",
        customClass: {
          popup: 'swal2-theme-popup'
        }
      });
      if (!result.isConfirmed) return;
    } else {
      // Opening a new cycle: warn user (no per-year limit)
      const result = await Swal.fire({
        icon: "info",
        title: "Open New Cycle?",
        html: `
          <b>Are you sure you want to open a new cycle?</b><br>
          <ul style="text-align:left; margin: 1em 0 0 1.5em;">
            <li>A new cycle will allow new submissions for this form.</li>
          </ul>
        `,
        showCancelButton: true,
        confirmButtonText: "Yes",
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

        // --- Trigger prediction for just opened cycle ---
        if (!openCycle && formName === "KK Profiling") {
          const newYear = year;
          const newCycleNumber = yearCycleCount + 1;
          await fetch("http://localhost:5000/api/cycle-predict", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              year: newYear,
              cycle: newCycleNumber
            })
          });
        }

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

  // New helper: fetch and render form history
  async function fetchFormHistory(formName, targetElId) {
    // guard: if target element not present, skip silently
    const ul = document.getElementById(targetElId);
    if (!ul) return;

    const token = sessionStorage.getItem("token") || "";
    try {
      const res = await fetch(`http://localhost:5000/api/formcycle/history?formName=${encodeURIComponent(formName)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        ul.innerHTML = `<li class="muted">No history</li>`;
        return;
      }
      const events = await res.json();
      ul.innerHTML = "";
      if (!Array.isArray(events) || events.length === 0) {
        ul.innerHTML = `<li class="muted">No history available</li>`;
        return;
      }
      // build content safely
      const frag = document.createDocumentFragment();
      for (const ev of events) {
        const d = new Date(ev.at);
        const timeStr = d.toLocaleString();
        const actor = ev.actorName ? `by ${ev.actorName}` : "";
        const li = document.createElement("li");
        li.innerHTML = `<strong>${ev.action.toUpperCase()}</strong> — Cycle ${ev.cycleNumber} (${ev.year}) — ${timeStr} ${actor}`;
        frag.appendChild(li);
      }
      ul.appendChild(frag);
    } catch (err) {
      ul.innerHTML = `<li class="muted">Failed to load history</li>`;
    }
  }

  // Call history fetch when form tab is opened
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      if (tab.dataset.tab === 'form') {
        // fetch history for all forms
        fetchFormHistory("KK Profiling", "formHistoryKK");
        fetchFormHistory("LGBTQIA+ Profiling", "formHistoryLGBTQ");
        fetchFormHistory("Educational Assistance", "formHistoryEduc");
      }
    });
  });

  // Also load history on initial page load if form tab active
  if (document.querySelector('.settings-tab.active').dataset.tab === 'form') {
    fetchFormHistory("KK Profiling", "formHistoryKK");
    fetchFormHistory("LGBTQIA+ Profiling", "formHistoryLGBTQ");
    fetchFormHistory("Educational Assistance", "formHistoryEduc");
  }

  // ---- SOCKET init (guarded) ----
  // Initialize socket.io client pointing to backend and send JWT for auth
  let socket = null;
  if (typeof io !== "undefined") {
    try {
      // ensure this URL matches your backend (port 5000)
      socket = io("http://localhost:5000", {
        // send token to server if you validate sockets
        auth: { token: sessionStorage.getItem("token") || "" },
        transports: ["websocket", "polling"],
        path: "/socket.io"
      });
      socket.on("connect_error", (err) => console.warn("socket connect_error:", err));
    } catch (e) {
      console.warn("socket.io init failed:", e);
      socket = null;
    }
  } else {
    console.warn("socket.io client not loaded. Make sure socket.io client script is included.");
  }
  
  // --- HISTORY modal renderer (table view) ---
  /* REPLACED fetchAndRenderHistoryModal with client-side filter/render approach.
     Stores fetched cycles in window._historyData for fast client-side filtering/searching. */
  async function fetchAndRenderHistoryModal() {
    const token = sessionStorage.getItem("token");
    const tbody = document.getElementById("historyTableBody");
    const emptyEl = document.getElementById("historyEmptyModal");
    if (!tbody || !emptyEl) return;

    tbody.innerHTML = `<tr><td colspan="7" style="padding:18px; text-align:center; color:#6b7280;">Loading…</td></tr>`;
    emptyEl.style.display = "none";

    const endpoints = [
      { key: "kk", form: "KK Profiling", url: "http://localhost:5000/api/formcycle/kk" },
      { key: "lgbtq", form: "LGBTQIA+ Profiling", url: "http://localhost:5000/api/formcycle/lgbtq" },
      { key: "educ", form: "Educational Assistance", url: "http://localhost:5000/api/formcycle/educ" }
    ];

    try {
      const results = await Promise.all(endpoints.map(async e => {
        const r = await fetch(e.url, { headers: { Authorization: `Bearer ${token}` } }).catch(err => ({ ok:false, _err: err }));
        if (!r || !r.ok) return { key: e.key, form: e.form, cycles: [] };
        const cycles = await r.json().catch(() => []);
        return { key: e.key, form: e.form, cycles: Array.isArray(cycles) ? cycles : [] };
      }));

      // Flatten into a single array of cycle objects with form key
      const allCycles = results.flatMap(r => (r.cycles || []).map(c => ({ key: r.key, form: r.form, cycle: c })));

      // store globally for client-side filtering/search
      window._historyData = allCycles;

      // initialize filter UI and render default view (All)
      setupHistoryControls();
      renderHistoryTable(); // default: all
    } catch (err) {
      console.error("history modal fetch error:", err);
      tbody.innerHTML = `<tr><td colspan="7" style="padding:16px; color:#ef4444;">Error loading history. See console for details.</td></tr>`;
    }
  }

  /* Render a filtered + searched set of rows. */
  function renderHistoryTable({ filter = "all", query = "" } = {}) {
    const tbody = document.getElementById("historyTableBody");
    const emptyEl = document.getElementById("historyEmptyModal");
    if (!tbody || !emptyEl) return;

    const data = Array.isArray(window._historyData) ? window._historyData.slice() : [];
    // map filter key to form names
    const keyToForm = { kk: "KK Profiling", lgbtq: "LGBTQIA+ Profiling", educ: "Educational Assistance" };

    let rows = data;
    if (filter !== "all") {
      const formName = keyToForm[filter];
      rows = rows.filter(r => r.form === formName);
    }

    // apply search query: match username (opened/closed), year, cycleNumber, or form
    const q = (query || "").trim().toLowerCase();
    if (q) {
      rows = rows.filter(item => {
        const c = item.cycle || {};
        const history = Array.isArray(c.history) ? c.history : [];
        const opened = history.find(h => h.action === "open") || {};
        const closed = (history.slice().reverse().find(h => h.action === "close")) || {};
        const openedBy = (opened.actorName || "").toLowerCase();
        const closedBy = (closed.actorName || "").toLowerCase();
        return (
          (item.form || "").toLowerCase().includes(q) ||
          String(c.year || "").includes(q) ||
          String(c.cycleNumber || "").includes(q) ||
          openedBy.includes(q) ||
          closedBy.includes(q)
        );
      });
    }

    if (!rows.length) {
      tbody.innerHTML = "";
      emptyEl.style.display = "";
      return;
    }
    emptyEl.style.display = "none";
    // sort by latest touched timestamp (most recent history event) then fallback to year/cycle
    rows.sort((a, b) => {
      const latestDate = (item) => {
        const hist = Array.isArray(item.cycle?.history) ? item.cycle.history : [];
        if (!hist.length) return 0;
        return Math.max(...hist.map(h => new Date(h.at).getTime()));
      };
      const da = latestDate(a);
      const db = latestDate(b);
      if (db !== da) return db - da; // newest first
      // fallback: year desc, cycleNumber desc
      if ((b.cycle?.year ?? 0) !== (a.cycle?.year ?? 0)) return (b.cycle?.year ?? 0) - (a.cycle?.year ?? 0);
      return (b.cycle?.cycleNumber ?? 0) - (a.cycle?.cycleNumber ?? 0);
    });

    const displayActor = raw => {
      if (!raw) return "-";
      if (typeof raw !== "string") return String(raw);
      return raw.includes("@") ? raw.split("@")[0] : raw;
    };

    tbody.innerHTML = "";
    for (const item of rows) {
      const c = item.cycle || {};
      const history = Array.isArray(c.history) ? c.history : [];
      const openEv = history.find(h => h.action === "open") || null;
      const closeEv = (() => { for (let i=history.length-1;i>=0;i--) if (history[i].action==="close") return history[i]; return null; })();

      const openedTime = openEv ? (new Date(openEv.at).toLocaleString()) : "-";
      const openedUser = openEv ? displayActor(openEv.actorName) : "-";
      const closedTime = closeEv ? (new Date(closeEv.at).toLocaleString()) : "-";
      const closedUser = closeEv ? displayActor(closeEv.actorName) : "-";

      const formLabel = (() => {
        // use the same circular icon style as the Form Configuration header
        const iconClass = item.key === "kk" ? "fa-id-badge" : item.key === "lgbtq" ? "fa-rainbow" : "fa-graduation-cap";
        // add a small colored icon (uses .icon-bg styles defined for form header)
        return `<span class="icon-bg history-icon small ${item.key}"><i class="fas ${iconClass}"></i></span> ${item.form}`;
      })();

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td title="${item.form}" style="padding:10px 12px;">${formLabel}</td>
        <td style="padding:10px 12px;">${c.year ?? "-"}</td>
        <td style="padding:10px 12px;">${c.cycleNumber ?? "-"}</td>
        <td style="padding:10px 12px; white-space:nowrap;" title="${openedTime}">${openedTime}</td>
        <td style="padding:10px 12px;" title="${openedUser}">${openedUser}</td>
        <td style="padding:10px 12px; white-space:nowrap;" title="${closedTime}">${closedTime}</td>
        <td style="padding:10px 12px;" title="${closedUser}">${closedUser}</td>
      `;
      tbody.appendChild(tr);
    }
  }

  /* Wire filter/select/search UI once per modal open. */
  function setupHistoryControls() {
    const filterEl = document.getElementById("historyFilter");
    const searchEl = document.getElementById("historySearch");
    const reloadBtn = document.getElementById("historyReloadBtn");

    function applyControls() {
      const filter = filterEl?.value || "all";
      const query = searchEl?.value || "";
      renderHistoryTable({ filter, query });
    }

    if (filterEl) {
      filterEl.onchange = applyControls;
    }
    if (searchEl) {
      // search on Enter or blur for keyboard friendly behavior
      searchEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") applyControls();
      });
      searchEl.addEventListener("blur", () => {
        // optional: update on blur
      });
    }
    if (reloadBtn) {
      reloadBtn.onclick = () => fetchAndRenderHistoryModal();
    }
  }

  if (socket) {
    socket.on("formcycle:changed", data => {
      // refresh modal if open
      if (document.getElementById("historyModal")?.style.display === "flex") {
        fetchAndRenderHistoryModal();
      }
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: `${data.formName} ${data.action === 'open' ? 'opened' : 'closed'} (Cycle ${data.cycleNumber})`,
        showConfirmButton: false,
        timer: 3500
      });
    });

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
    });
  }
  
  // refresh history when form tab opens and after toggles
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      if (tab.dataset.tab === 'form') {
        fetchFormHistory("KK Profiling", "formHistoryKK");
        fetchFormHistory("LGBTQIA+ Profiling", "formHistoryLGBTQ");
        fetchFormHistory("Educational Assistance", "formHistoryEduc");
        // don't auto-open modal; if user has it open, refresh
        if (document.getElementById("historyModal")?.style.display === "flex") fetchAndRenderHistoryModal();
      }
    });
  });
  
  // call once if form tab active on load
  if (document.querySelector('.settings-tab.active')?.dataset.tab === 'form') {
    if (document.getElementById("historyModal")?.style.display === "flex") fetchAndRenderHistoryModal();
   }
  
  // ensure we refresh the panel after a successful toggle
  const originalToggleCycle = toggleCycle;
  toggleCycle = async function(formName) {
    await originalToggleCycle(formName);
    // refresh modal if open
    if (document.getElementById("historyModal")?.style.display === "flex") fetchAndRenderHistoryModal();
  };

  // --- ADD: wire history open/close inside DOMContentLoaded so elements exist ---
  (function wireHistoryModalButtons() {
    const formHistoryBtn = document.getElementById("formHistoryBtn");
    const historyModalEl = document.getElementById("historyModal");
    const closeHistoryBtn = document.getElementById("closeHistoryModal");
    const filterEl = document.getElementById("historyFilter");
    const searchEl = document.getElementById("historySearch");

    if (formHistoryBtn) {
      formHistoryBtn.addEventListener("click", () => {
        if (historyModalEl) historyModalEl.style.display = "flex";
        // reset controls for predictable UX
        if (filterEl) filterEl.value = "all";
        if (searchEl) searchEl.value = "";
        // fetch & render fresh data
        if (typeof fetchAndRenderHistoryModal === "function") fetchAndRenderHistoryModal();
      });
    }

    if (closeHistoryBtn) {
      closeHistoryBtn.addEventListener("click", () => {
        if (historyModalEl) historyModalEl.style.display = "none";
      });
    }

    // click outside to close
    window.addEventListener("click", (e) => {
      if (e.target === historyModalEl) {
        historyModalEl.style.display = "none";
      }
    });
  })();

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

    // Sort by deletedAt descending (most recent first)
    profiles.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

    const tbody = document.querySelector("#deletedTable tbody");
    tbody.innerHTML = "";
    profiles.forEach((p, i) => {
      // Build full name for KK and LGBTQ profiles
      let fullName = "N/A";
      if (p.type === "KK") {
        const mi = p.middlename ? p.middlename[0].toUpperCase() + "." : "";
        fullName = [p.firstname, mi, p.surname].filter(Boolean).join(" ");
      } else if (p.type === "LGBTQ") {
        const mi = p.middlename ? p.middlename[0].toUpperCase() + "." : "";
        fullName = [p.firstname, mi, p.lastname].filter(Boolean).join(" ");
      } else {
        fullName = p.displayData?.residentName || p.name || "N/A";
      }
      // Show both date and time
      const deletedDateTime = p.deletedAt
        ? new Date(p.deletedAt).toLocaleString()
        : "—";
      tbody.innerHTML += `
        <tr>
          <td>${i + 1}</td>
          <td>${fullName}</td>
          <td>${p.type}</td>
          <td>${deletedDateTime}</td>
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
          confirmButtonText: "Yes",
          cancelButtonText: "Cancel"
        });
        if (result.isConfirmed) {
          const res = await fetch(endpoint, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (!res.ok && res.status === 409) {
            Swal.fire({
              icon: "error",
              title: "Restoration Failed",
              text: data.error
            });
            return;
          }
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

});  // document.addEventListener("DOMContentLoaded")