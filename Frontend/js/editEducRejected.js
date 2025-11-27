function getAppIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function fetchLatestRejectedId(token) {
  try {
    const res = await fetch("http://localhost:5000/api/educational-assistance/check-rejected", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json && json.applicationId ? String(json.applicationId) : null;
  } catch (e) {
    console.warn("check-rejected failed", e);
    return null;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
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

  const token = sessionStorage.getItem("token");
  if (!token) {
    Swal.fire({ icon: "warning", title: "Not logged in", text: "Please login to resubmit." });
    return;
  }

  let appId = getAppIdFromUrl();
  if (!appId) {
    appId = await fetchLatestRejectedId(token);
  }
  if (!appId) {
    Swal.fire({ icon: "error", title: "No rejected application", text: "No rejected application found to resubmit." });
    return;
  }

  // Fetch application by id
  // Always fetch the current user's application (populates user.birthday/email etc.)
  // This route returns the latest application in the present cycle for the authenticated user
  let app;
  try {
    const res = await fetch(`http://localhost:5000/api/educational-assistance/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("not found");
    app = await res.json();
    // If an id was provided in the URL, ensure it matches the fetched application
    if (getAppIdFromUrl() && String(getAppIdFromUrl()) !== String(app._id)) {
      // still allow -- but prefer fetched application
    }
    if (!app || app.status !== "rejected") throw new Error("not rejected");
  } catch (err) {
    Swal.fire({ icon: "error", title: "Application not found or not rejected" });
    return;
  }

  // debug: log fetched application expenses so we can confirm data from server
  try { console.debug('Fetched application (editEducRejected):', app); console.debug('Fetched expenses:', app.expenses); } catch(e) {}

  // Track removed files
  const removed = { front: false, back: false, coe: false, voter: false };

  // Keep track of temporary object URLs for newly selected files so view preview works
  const objectUrlMap = { front: null, back: null, coe: null, voter: null };
  
  // Utility to set input values using page input ids
  function setValue(id, val, readonly = false) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === "SELECT") {
      el.value = val ?? "";
    } else {
      el.value = val ?? "";
    }
    if (readonly) el.readOnly = true;
  }

  // Prefill basic fields (map backend keys -> frontend ids)
  setValue("surname", app.surname);
  setValue("firstName", app.firstname);
  setValue("middleName", app.middlename);
  setValue("suffix", app.suffix || "");
  // birthday/age might be stored on the populated user object — prefer that
  const birthdayVal = app.birthday ? app.birthday.split("T")[0] : (app.user?.birthday ? app.user.birthday.split("T")[0] : "");
  setValue("birthday", birthdayVal);
  setValue("placeOfBirth", app.placeOfBirth || "");
  const ageVal = (app.age !== undefined && app.age !== null) ? app.age : (app.user?.age ?? "");
  setValue("age", ageVal ?? "");
  setValue("gender", app.sex || "");
  setValue("civilstatus", app.civilStatus || "");
  setValue("religion", app.religion || "");
  setValue("email", app.email || "");
  setValue("contact", app.contactNumber || "");
  setValue("schoolname", app.school || "");
  setValue("schooladdress", app.schoolAddress || "");
  setValue("academicLevel", app.academicLevel || "");
  setValue("year", app.year || "");
  setValue("benefittype", app.typeOfBenefit || "");
  setValue("fathername", app.fatherName || "");
  setValue("fathercontact", app.fatherPhone || "");
  setValue("mothername", app.motherName || "");
  setValue("mothercontact", app.motherPhone || "");

  // Render siblings
  function createSiblingRow(sib = {}) {
    const isMobile = window.innerWidth <= 600;
    if (isMobile) {
      const wrapper = document.createElement('div');
      wrapper.className = 'sibling-card-wrapper';
      wrapper.innerHTML = `
        <div class="sibling-card">
          <div class="sibling-field"><label>Name</label><input type="text" class="sibling-name" value="${sib.name ?? ''}" required></div>
          <div class="sibling-field"><label>Age</label><input type="number" class="sibling-age" value="${sib.age ?? ''}" min="0" required></div>
          <div class="sibling-field"><label>Gender</label>
            <select class="sibling-gender" required>
              <option value="">Select</option>
              <option value="Male" ${sib.gender === 'Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${sib.gender === 'Female' ? 'selected' : ''}>Female</option>
            </select>
          </div>
          <div><button type="button" class="removeSiblingBtn">Remove</button></div>
        </div>`;
      // attach listeners for persistence
      wrapper.querySelectorAll('.sibling-name, .sibling-age, .sibling-gender').forEach(el => {
        if (el) el.addEventListener('input', () => { try { saveDraft(); } catch (e) {} });
        if (el) el.addEventListener('change', () => { try { saveDraft(); } catch (e) {} });
      });
      wrapper.querySelector('.removeSiblingBtn')?.addEventListener('click', () => { wrapper.remove(); try { saveDraft(); } catch (e) {} });
      return wrapper;
    }
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" class="sibling-name" value="${sib.name ?? ''}" required></td>
      <td><input type="number" class="sibling-age" value="${sib.age ?? ''}" min="0" required></td>
      <td>
        <select class="sibling-gender" required>
          <option value="">Select</option>
          <option value="Male" ${sib.gender === 'Male' ? 'selected' : ''}>Male</option>
          <option value="Female" ${sib.gender === 'Female' ? 'selected' : ''}>Female</option>
        </select>
      </td>
      <td><button type="button" class="removeSiblingBtn">Remove</button></td>
    `;
    // attach listeners for persistence
    tr.querySelectorAll('.sibling-name, .sibling-age, .sibling-gender').forEach(el => {
      if (el) el.addEventListener('input', () => { try { saveDraft(); } catch (e) {} });
      if (el) el.addEventListener('change', () => { try { saveDraft(); } catch (e) {} });
    });
    tr.querySelector('.removeSiblingBtn')?.addEventListener('click', () => { tr.remove(); try { saveDraft(); } catch (e) {} });
    return tr;
  }

  function renderSiblings(siblings = []) {
    const table = document.getElementById('siblingsTable');
    const tbody = document.getElementById('siblingsTableBody');
    const wrapperId = 'siblingsCardsWrapper';
    const isMobile = window.innerWidth <= 600;

    // ensure wrapper exists when mobile
    let wrapper = document.getElementById(wrapperId);
    if (isMobile) {
      if (table) table.style.display = 'none';
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = wrapperId;
        wrapper.className = 'siblings-cards';
        if (table && table.parentNode) table.parentNode.insertBefore(wrapper, table.nextSibling);
      }
      wrapper.innerHTML = '';
      siblings.forEach(sib => {
        const card = createSiblingRow(sib); // returns div on mobile
        wrapper.appendChild(card);
      });
    } else {
      // desktop: show table and remove any wrapper
      if (table) table.style.display = '';
      if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
      tbody.innerHTML = '';
      siblings.forEach(sib => {
        const row = createSiblingRow(sib); // returns tr on desktop
        tbody.appendChild(row);
      });
    }
  }
  renderSiblings(app.siblings || []);

  // Render expenses
  function createExpenseRow(exp = {}) {
    const isMobile = window.innerWidth <= 600;
    if (isMobile) {
      const wrapper = document.createElement('div');
      wrapper.className = 'expense-card-wrapper';
        if (exp && (exp._id || exp.id)) wrapper.dataset.id = exp._id || exp.id;
      wrapper.innerHTML = `
        <div class="expense-card">
          <div class="expense-field"><label>Fees and Other Expenses:</label><input type="text" class="expense-item" value="${exp.item ?? ''}" required></div>
          <div class="expense-field"><label>Expected Cost:</label>
            <div class="expense-cost-wrapper"><span class="peso-prefix">₱</span><input type="number" class="expense-cost" value="${exp.expectedCost ?? ''}" min="0" required><span class="peso-suffix">.00</span></div>
          </div>
          <div><button type="button" class="removeExpenseBtn">Remove</button></div>
        </div>`;
      wrapper.querySelectorAll('.expense-item, .expense-cost').forEach(el => {
        if (el) el.addEventListener('input', () => { try { saveDraft(); } catch (e) {} });
        if (el) el.addEventListener('change', () => { try { saveDraft(); } catch (e) {} });
      });
      wrapper.querySelector('.removeExpenseBtn')?.addEventListener('click', () => { wrapper.remove(); try { saveDraft(); } catch (e) {} });
      return wrapper;
    }
    const tr = document.createElement('tr');
    if (exp && (exp._id || exp.id)) tr.dataset.id = exp._id || exp.id;
    tr.innerHTML = `
      <td><input type="text" class="expense-item" value="${exp.item ?? ''}" required></td>
      <td>
        <div class="expense-cost-wrapper">
          <span class="peso-prefix">₱</span>
          <input type="number" class="expense-cost" value="${exp.expectedCost ?? ''}" min="0" required>
          <span class="peso-suffix">.00</span>
        </div>
      </td>
      <td><button type="button" class="removeExpenseBtn">Remove</button></td>
    `;
    tr.querySelectorAll('.expense-item, .expense-cost').forEach(el => {
      if (el) el.addEventListener('input', () => { try { saveDraft(); } catch (e) {} });
      if (el) el.addEventListener('change', () => { try { saveDraft(); } catch (e) {} });
    });
    tr.querySelector('.removeExpenseBtn')?.addEventListener('click', () => { tr.remove(); try { saveDraft(); } catch (e) {} });
    return tr;
  }

  function renderExpenses(expenses = []) {
    const table = document.getElementById('expensesTable');
    let tbody = document.getElementById('expensesTableBody');
    // if tbody missing in markup, create it as a fallback so rows can be appended
    if (!tbody && table) {
      tbody = document.createElement('tbody');
      tbody.id = 'expensesTableBody';
      table.appendChild(tbody);
    }
    const wrapperId = 'expensesCardsWrapper';
    // check existing DOM: if caller passed an empty expenses array but DOM already has entries, do not clear them
    const existingWrapper = document.getElementById(wrapperId);
    const existingRows = tbody && tbody.children && tbody.children.length > 0;
    const existingCards = existingWrapper && existingWrapper.children && existingWrapper.children.length > 0;
    if ((!expenses || expenses.length === 0) && (existingRows || existingCards)) {
      try { console.debug('renderExpenses: skipping empty render because existing DOM entries are present', { existingRows, existingCards }); } catch (e) {}
      return;
    }
    const isMobile = window.innerWidth <= 600;

    // debug
    try { console.debug('renderExpenses called, isMobile=', isMobile, 'expenses:', expenses); } catch(e) {}

    let wrapper = document.getElementById(wrapperId);
    if (isMobile) {
      if (table) table.style.display = 'none';
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = wrapperId;
        wrapper.className = 'expenses-cards';
        if (table && table.parentNode) table.parentNode.insertBefore(wrapper, table.nextSibling);
      }
      wrapper.innerHTML = '';
      expenses.forEach(exp => {
        const id = exp && (exp._id || exp.id) ? (exp._id || exp.id) : '';
        // skip if an identical card or id already exists
        if (id) {
          const exists = document.querySelector(`#${wrapperId} .expense-card-wrapper[data-id="${id}"]`);
          if (exists) return;
        } else {
          // compare by item+expectedCost
          const found = Array.from((wrapper || {}).children || []).some(n => {
            const it = n.querySelector('.expense-item')?.value || '';
            const cost = n.querySelector('.expense-cost')?.value || '';
            return (it === (exp.item || '')) && (String(cost) === String(exp.expectedCost || ''));
          });
          if (found) return;
        }
        const card = createExpenseRow(exp);
        wrapper.appendChild(card);
      });
    } else {
      // ensure table and tbody are visible and present
      if (table) {
        try { table.style.display = 'table'; table.style.visibility = 'visible'; } catch(e) {}
      }
      if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
      if (!tbody && table) {
        tbody = document.createElement('tbody');
        tbody.id = 'expensesTableBody';
        table.appendChild(tbody);
      }
      if (tbody) tbody.innerHTML = '';
      let appended = 0;
      expenses.forEach(exp => {
        const id = exp && (exp._id || exp.id) ? (exp._id || exp.id) : '';
        // skip if a row with same id exists
        if (id) {
          const existsRow = tbody ? tbody.querySelector(`tr[data-id="${id}"]`) : null;
          if (existsRow) return;
        } else if (tbody) {
          // for items without id, check for identical item+cost
          const foundRow = Array.from(tbody.children || []).some(n => {
            const it = n.querySelector('.expense-item')?.value || '';
            const cost = n.querySelector('.expense-cost')?.value || '';
            return (it === (exp.item || '')) && (String(cost) === String(exp.expectedCost || ''));
          });
          if (foundRow) return;
        }
        const row = createExpenseRow(exp);
        if (tbody) {
          tbody.appendChild(row);
          try { row.dataset.rendered = '1'; } catch(e) {}
          appended++;
          try { console.debug('Appended expense row', { _id: row.dataset.id || row.getAttribute('data-id'), item: exp.item, expectedCost: exp.expectedCost }); } catch(e) {}
        }
      });
      try { console.debug('renderExpenses appended count=', appended, 'tbodyExists=', !!tbody, 'tableExists=', !!table, 'wrapperExists=', !!wrapper); } catch(e) {}
    }
  }
  renderExpenses(app.expenses || []);

  // responsive re-render: when crossing the 600px breakpoint re-create rows/cards
  // preserves current input values by reading values before re-render
  function reRenderResponsiveLists() {
    try {
      const siblings = [];
      document.querySelectorAll('#siblingsTableBody tr, #siblingsCardsWrapper .sibling-card-wrapper, .sibling-card-wrapper').forEach(node => {
        const name = node.querySelector('.sibling-name')?.value || '';
        const age = node.querySelector('.sibling-age')?.value || '';
        const gender = node.querySelector('.sibling-gender')?.value || '';
        if (name || age || gender) siblings.push({ name, age, gender });
      });

      const expenses = [];
      document.querySelectorAll('#expensesTableBody tr, #expensesCardsWrapper .expense-card-wrapper, .expense-card-wrapper').forEach(node => {
        const id = node.dataset.id || node.getAttribute('data-id') || '';
        const item = node.querySelector('.expense-item')?.value || '';
        const expectedCost = node.querySelector('.expense-cost')?.value || '';
        if (item || expectedCost) expenses.push({ _id: id || undefined, item, expectedCost });
      });

      try { console.debug('reRenderResponsiveLists collected expenses:', expenses); } catch(e) {}

      renderSiblings(siblings);
      renderExpenses(expenses);
    } catch (e) { /* ignore */ }
  }

  // initialize previous width marker
  window._educ_prev_width = window.innerWidth;
  window.addEventListener('resize', () => {
    try {
      const prev = window._educ_prev_width || window.innerWidth;
      const now = window.innerWidth;
      const prevMobile = prev <= 600;
      const nowMobile = now <= 600;
      // only re-render when crossing the breakpoint to avoid excessive DOM churn
      if (prevMobile !== nowMobile) reRenderResponsiveLists();
      window._educ_prev_width = now;
    } catch (e) { /* ignore */ }
  });

  // File UI helpers: show file name + view/delete handlers
  function setFileUI(slot, url) {
    const label = document.getElementById(`${slot}Label`); // the plus label element
    const input = document.getElementById(`${slot}Image`) || document.getElementById(slot);
    const viewBtn = document.getElementById(`view${capitalize(slot)}`);
    const deleteBtn = document.getElementById(`delete${capitalize(slot)}`);
    const fileNameSpan = document.getElementById(`${slot}FileName`);
    const hiddenFieldId = `${slot}Url`;

    // ensure hidden URL field exists to keep server url if user doesn't upload new file
    let hidden = document.getElementById(hiddenFieldId);
    if (!hidden) {
      hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.id = hiddenFieldId;
      hidden.name = hiddenFieldId;
      const form = document.getElementById('editEducForm');
      if (form) form.appendChild(hidden);
    }
    hidden.value = url || '';

    function showPlus() {
      if (label) {
        label.style.display = ''; // show the plus label
        label.innerHTML = '<i class="fa-solid fa-plus"></i>';
        label.classList.remove('has-file');
      }
      if (fileNameSpan) {
        fileNameSpan.textContent = '';
        fileNameSpan.style.display = 'none';
      }
    }

    function showFilename(name) {
      if (label) {
        // keep the plus element hidden when filename is shown
        label.style.display = 'none';
        label.classList.add('has-file');
      }
      if (fileNameSpan) {
        fileNameSpan.textContent = name;
        fileNameSpan.title = name;
        fileNameSpan.style.display = 'block';
      }
    }

    // cleanup any previous object URL for this slot
    function revokeObjectUrl() {
      const prev = objectUrlMap[slot];
      if (prev) {
        try { URL.revokeObjectURL(prev); } catch (e) { /* ignore */ }
        objectUrlMap[slot] = null;
      }
    }

    if (url) {
      const fname = getFileNameFromUrl(url);
      showFilename(fname);
      if (viewBtn) {
        viewBtn.style.display = 'inline-block';
        viewBtn.onclick = () => openPreview(url); // server URL preview
      }
      if (deleteBtn) {
        deleteBtn.style.display = 'inline-block';
        deleteBtn.onclick = () => {
          // mark removed and clear server-side url; restore plus
          removed[slot] = true;
          revokeObjectUrl();
          hidden.value = '';
          if (input) input.value = '';
          showPlus();
          if (viewBtn) viewBtn.style.display = 'none';
          if (deleteBtn) deleteBtn.style.display = 'none';
          try { saveDraft(); } catch (e) { /* ignore */ }
        };
      }
    } else {
      showPlus();
      if (viewBtn) viewBtn.style.display = 'none';
      if (deleteBtn) deleteBtn.style.display = 'none';
    }

    // When user picks a new file, show filename and allow delete and keep view icon to preview local file
    if (input) {
      input.addEventListener('change', () => {
        const f = input.files?.[0];
        // revoke previous object URL if any
        revokeObjectUrl();
        if (f) {
          const objUrl = URL.createObjectURL(f);
          objectUrlMap[slot] = objUrl;
          showFilename(f.name);
          removed[slot] = false;
          hidden.value = ''; // clear server url because user selected a new file
          if (deleteBtn) deleteBtn.style.display = 'inline-block';
          if (viewBtn) {
            viewBtn.style.display = 'inline-block';
            viewBtn.onclick = () => openPreview(objUrl);
          }
          try { saveDraft(); } catch (e) { /* ignore */ }
        } else {
          showPlus();
          if (viewBtn) viewBtn.style.display = 'none';
          try { saveDraft(); } catch (e) { /* ignore */ }
        }
      });
    }
  }

  // --- Draft persistence (sessionStorage) ---
  const DRAFT_KEY = `educRejectedDraft_${appId}`;

  function collectDraft() {
    const draft = { fields: {}, siblings: [], expenses: [], removed: {}, files: {} };
    // fields
    const ids = [
      'surname','firstName','middleName','suffix','birthday','placeOfBirth','age','gender','civilstatus','religion','email','contact','schoolname','schooladdress','academicLevel','year','benefittype','fathername','fathercontact','mothername','mothercontact'
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) draft.fields[id] = el.value;
    });

    // siblings (support both table rows and mobile card wrappers)
    document.querySelectorAll('#siblingsTableBody tr, #siblingsCardsWrapper .sibling-card-wrapper, .sibling-card-wrapper').forEach(node => {
      const name = node.querySelector('.sibling-name')?.value || '';
      const age = node.querySelector('.sibling-age')?.value || '';
      const gender = node.querySelector('.sibling-gender')?.value || '';
      if (name || age || gender) draft.siblings.push({ name, age, gender });
    });

    // expenses (support table rows and mobile card wrappers)
    document.querySelectorAll('#expensesTableBody tr, #expensesCardsWrapper .expense-card-wrapper, .expense-card-wrapper').forEach(node => {
      const id = node.dataset.id || node.getAttribute('data-id') || '';
      const item = node.querySelector('.expense-item')?.value || '';
      const expectedCost = node.querySelector('.expense-cost')?.value || '';
      if (item || expectedCost) draft.expenses.push({ _id: id || undefined, item, expectedCost });
    });

    // removed flags and file names/hidden urls
    ['front','back','coe','voter'].forEach(slot => {
      draft.removed[slot] = !!removed[slot];
      const hidden = document.getElementById(`${slot}Url`);
      draft.files[slot] = {
        url: hidden ? (hidden.value || '') : '',
        name: (document.getElementById(`${slot}FileName`)?.textContent || '').trim()
      };
    });

    return draft;
  }

  function saveDraft() {
    try {
      const d = collectDraft();
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch (e) { console.warn('saveDraft failed', e); }
  }

  function loadDraft() {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (d.fields) {
        Object.keys(d.fields).forEach(id => { const el = document.getElementById(id); if (el) el.value = d.fields[id]; });
      }
      // Only apply draft arrays if they contain items; otherwise keep server values
      if (Array.isArray(d.siblings) && d.siblings.length > 0) {
        renderSiblings(d.siblings);
      } else {
        // if no draft siblings, ensure server siblings are shown
        try { renderSiblings(app.siblings || []); } catch(e) {}
      }
      if (Array.isArray(d.expenses) && d.expenses.length > 0) {
        renderExpenses(d.expenses);
      } else {
        // if no draft expenses, ensure server expenses are shown
        try { renderExpenses(app.expenses || []); } catch(e) {}
      }
      if (d.removed) Object.keys(d.removed).forEach(k => { removed[k] = !!d.removed[k]; });
      if (d.files) {
        ['front','back','coe','voter'].forEach(slot => {
          const info = d.files[slot] || {};
          const fileNameSpan = document.getElementById(`${slot}FileName`);
          const label = document.getElementById(`${slot}Label`);
          const hidden = document.getElementById(`${slot}Url`);
          if (info.name && fileNameSpan) {
            fileNameSpan.textContent = info.name;
            fileNameSpan.style.display = 'block';
            if (label) label.style.display = 'none';
          }
          if (hidden && info.url) hidden.value = info.url;
        });
      }
      return true;
    } catch (e) { console.warn('loadDraft failed', e); return false; }
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function getFileNameFromUrl(u) {
    try {
      const parts = u.split("/").pop().split("?")[0];
      return decodeURIComponent(parts);
    } catch { return "file"; }
  }

  function openPreview(url) {
    const modal = document.getElementById("imagePreviewModal");
    const img = document.getElementById("previewImg");
    if (img && modal) {
      img.src = url;
      modal.style.display = "flex";
    }
  }

  // Hook modal close
  document.getElementById("closePreviewBtn")?.addEventListener("click", () => {
    const modal = document.getElementById("imagePreviewModal");
    if (modal) modal.style.display = "none";
  });

  setFileUI("front", app.frontImage || null);
  setFileUI("back", app.backImage || null);
  setFileUI("coe", app.coeImage || null);
  setFileUI("voter", app.voter || null);

  // Restore any saved draft (do this after file UI wiring so filenames/hidden urls are present)
  try { loadDraft(); } catch (e) { /* ignore */ }
  try { if (typeof toggleRequirementRows === 'function') toggleRequirementRows(); } catch(e) {}

  // Validate required fields (exclude siblings) before allowing submit
  function humanizeId(id) {
    // convert camelCase / lower_snake to Title Case for user-friendly message
    return id
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .replace(/\b([a-z])/g, s => s.toUpperCase())
      .trim();
  }

  function validateForm() {
    const required = [
      'surname','firstName','middleName','birthday','placeOfBirth','age','gender','civilstatus','religion','email','contact','schoolname','schooladdress','academicLevel','year','benefittype','fathername','fathercontact','mothername','mothercontact'
    ];

    const missing = [];
    required.forEach(id => {
      const el = document.getElementById(id);
      if (!el) {
        // If element is not present in DOM treat as missing
        missing.push(humanizeId(id));
        return;
      }
      let val = el.value;
      if (el.tagName === 'SELECT') {
        val = el.options[el.selectedIndex]?.value || '';
      }
      if (typeof val === 'string') val = val.trim();
      // treat '' / null / undefined as missing
      if (!val && val !== 0) missing.push(humanizeId(id));
    });

    if (missing.length) {
      const listHtml = '<ul style="text-align:left;margin:0.25rem 0 0 1rem;">' + missing.map(m => `<li>${m}</li>`).join('') + '</ul>';
      Swal.fire({
        icon: 'warning',
        title: 'Missing fields',
        html: `Please fill the following fields:${listHtml}`
      });
      return false;
    }
    // Also validate requirement files (front, back, coe, voter) if their rows/controls are visible
    try {
      const reqSlots = {
        front: 'ID (front)',
        back: 'ID (back)',
        coe: 'Certificate of Enrollment (COE)',
        voter: 'Voter ID / Certificate'
      };
      // Only require voter for junior high applicants
      function isJuniorHighApplicant() {
        try {
          const academicEl = document.getElementById('academicLevel');
          const lvl = (academicEl?.value || app?.academicLevel || '').toString().toLowerCase();
          if (!lvl) return false;
          if (lvl.includes('junior')) return true;
          // also consider explicit grade years
          const yr = (document.getElementById('year')?.value || '').toString().toLowerCase();
          if (yr.includes('grade 7') || yr.includes('grade 8') || yr.includes('grade 9') || yr.includes('grade 10')) return true;
        } catch (e) { /* ignore */ }
        return false;
      }
      const reqMissing = [];
      Object.keys(reqSlots).forEach(slot => {
        // skip voter check unless junior high applicant
        if (slot === 'voter' && !isJuniorHighApplicant()) return;
        const fileInput = document.getElementById(`${slot}Image`) || document.getElementById(slot);
        const hidden = document.getElementById(`${slot}Url`);

        // Determine visibility: if there's a containing row, use its computed style; otherwise check element
        let visible = false;
        const probe = fileInput || document.getElementById(`${slot}Label`) || hidden;
        if (probe) {
          let row = probe.closest ? probe.closest('tr') : null;
          if (!row) row = probe;
          try {
            const cs = window.getComputedStyle(row);
            visible = cs && cs.display !== 'none' && cs.visibility !== 'hidden';
          } catch (e) { visible = true; }
        }

        if (visible) {
          const hasFile = (fileInput && fileInput.files && fileInput.files.length > 0);
          const hasUrl = hidden && hidden.value && String(hidden.value).trim() !== '';
          if (!hasFile && !hasUrl) reqMissing.push(reqSlots[slot]);
        }
      });
      if (reqMissing.length) {
        const listHtml2 = '<ul style="text-align:left;margin:0.25rem 0 0 1rem;">' + reqMissing.map(m => `<li>${m}</li>`).join('') + '</ul>';
        Swal.fire({ icon: 'warning', title: 'Missing requirement files', html: `Please upload or keep existing files for:${listHtml2}` });
        return false;
      }
    } catch (e) { /* ignore validation failures */ }
    return true;
  }

  // --- Year select options logic (mirror original form behavior) ---
  function updateYearOptions(selectedLevel, selectedYear) {
    const yearEl = document.getElementById("year");
    if (!yearEl) return;
    let options = [];
    const lvl = (selectedLevel || "").toString().toLowerCase();
    if (lvl.includes("senior")) {
      options = ["Grade 11", "Grade 12"];
    } else if (lvl.includes("junior") || lvl.includes("high") && lvl.includes("junior")) {
      options = ["Grade 7", "Grade 8", "Grade 9", "Grade 10"];
    } else if (lvl.includes("college") || lvl.includes("college")) {
      options = ["1st year", "2nd year", "3rd year", "4th year", "5th year", "6th year"];
    } else {
      // fallback: keep common set and ensure selectedYear is present
      options = ["Grade 11", "Grade 12", "1st year", "2nd year", "3rd year", "4th year"];
    }
    // populate year options; only restore previously-selected year if it's valid for this level
    yearEl.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join("");
    if (selectedYear && options.includes(selectedYear)) {
      yearEl.value = selectedYear;
    } else {
      // default to first available option
      yearEl.selectedIndex = 0;
    }
  }

  // attach handler to academicLevel so changing it updates year options
  const academicEl = document.getElementById("academicLevel");
  if (academicEl) {
    academicEl.addEventListener("change", () => { updateYearOptions(academicEl.value, document.getElementById("year")?.value); try { saveDraft(); } catch (e) {} ; try { toggleRequirementRows(); } catch(e) {} });
    // call once to populate correct year list and select current value
    updateYearOptions(academicEl.value || app.academicLevel, app.year);
    // ensure requirement rows reflect initial academic level
    try { toggleRequirementRows(); } catch(e) {}
  }

  // Hide/show requirement rows based on academic level
  function toggleRequirementRows() {
    try {
      // Show or hide the voter's certificate row depending on academic level
      const academicEl = document.getElementById('academicLevel');
      const yearEl = document.getElementById('year');
      const lvl = (academicEl?.value || app?.academicLevel || '').toString().toLowerCase();
      const yr = (yearEl?.value || '').toString().toLowerCase();
      // consider junior high when 'junior' in academicLevel or year is Grade 7-10
      const isJunior = lvl.includes('junior') || /grade\s*(7|8|9|10)/i.test(yr);

      // Find the voter row (try input first then label)
      const voterInput = document.getElementById('voter');
      let voterRow = null;
      if (voterInput) voterRow = voterInput.closest ? voterInput.closest('tr') : null;
      if (!voterRow) {
        const voterLabel = document.getElementById('voterLabel');
        if (voterLabel) voterRow = voterLabel.closest ? voterLabel.closest('tr') : null;
      }
      if (voterRow) {
        voterRow.style.display = isJunior ? '' : 'none';
      }
    } catch (e) { /* ignore */ }
  }

  // Add sibling/expense adders (responsive: row on desktop, card on mobile)
  document.getElementById('addSiblingBtn')?.addEventListener('click', function () {
    const tbody = document.getElementById('siblingsTableBody');
    const created = createSiblingRow({});
    if (created && created.tagName === 'TR') {
      tbody.appendChild(created);
    } else {
      // mobile wrapper path
      const table = document.getElementById('siblingsTable');
      if (table) table.style.display = 'none';
      let wrapper = document.getElementById('siblingsCardsWrapper');
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'siblingsCardsWrapper';
        wrapper.className = 'siblings-cards';
        if (table && table.parentNode) table.parentNode.insertBefore(wrapper, table.nextSibling);
      }
      wrapper.appendChild(created);
    }
    try { saveDraft(); } catch(e) {}
  });

  document.getElementById('addExpenseBtn')?.addEventListener('click', function () {
    const tbody = document.getElementById('expensesTableBody');
    const created = createExpenseRow({});
    if (created && created.tagName === 'TR') {
      tbody.appendChild(created);
    } else {
      const table = document.getElementById('expensesTable');
      if (table) table.style.display = 'none';
      let wrapper = document.getElementById('expensesCardsWrapper');
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'expensesCardsWrapper';
        wrapper.className = 'expenses-cards';
        if (table && table.parentNode) table.parentNode.insertBefore(wrapper, table.nextSibling);
      }
      wrapper.appendChild(created);
    }
    try { saveDraft(); } catch(e) {}
  });

  // Attach listeners to form fields to persist on change/input
  try {
    document.querySelectorAll('#editEducForm input, #editEducForm select, #editEducForm textarea').forEach(el => {
      el.addEventListener('input', () => { try { saveDraft(); } catch(e){} });
      el.addEventListener('change', () => { try { saveDraft(); } catch(e){} });
    });
  } catch (e) { /* ignore */ }

  // On submit: build FormData mapping front-end ids -> backend keys
  document.getElementById("editEducForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    // Validate required fields (siblings are excluded from this check)
    try { if (!validateForm()) return; } catch (err) { console.error('validateForm error', err); }

    const fd = new FormData();

    // Map inputs (frontend ids -> backend keys)
    const map = {
      surname: "surname",
      firstName: "firstname",
      middleName: "middlename",
      suffix: "suffix",
      birthday: "birthday",
      placeOfBirth: "placeOfBirth",
      age: "age",
      gender: "sex",
      civilstatus: "civilStatus",
      religion: "religion",
      email: "email",
      contact: "contactNumber",
      schoolname: "school",
      schooladdress: "schoolAddress",
      academicLevel: "academicLevel",
      year: "year",
      benefittype: "typeOfBenefit",
      fathername: "fatherName",
      fathercontact: "fatherPhone",
      mothername: "motherName",
      mothercontact: "motherPhone"
    };

    Object.keys(map).forEach(fid => {
      const el = document.getElementById(fid);
      if (!el) return;
      let val = el.value;
      // normalize empty strings to undefined (so backend doesn't treat as change)
      if (val === "") val = undefined;
      if (val !== undefined) fd.append(map[fid], val);
    });

    // Files: append only if user supplied a new file
    const frontFile = document.getElementById("frontImage")?.files?.[0];
    const backFile = document.getElementById("backImage")?.files?.[0];
    const coeFile = document.getElementById("coeImage")?.files?.[0];
    const voterFile = document.getElementById("voter")?.files?.[0];
    if (frontFile) fd.append("frontImage", frontFile);
    if (backFile) fd.append("backImage", backFile);
    if (coeFile) fd.append("coeImage", coeFile);
    if (voterFile) fd.append("voter", voterFile);

    // siblings (support both table rows and mobile card wrappers)
    const siblings = [];
    document.querySelectorAll('#siblingsTableBody tr, #siblingsCardsWrapper .sibling-card-wrapper, .sibling-card-wrapper').forEach(node => {
      const name = node.querySelector('.sibling-name')?.value || '';
      const age = node.querySelector('.sibling-age')?.value || '';
      const gender = node.querySelector('.sibling-gender')?.value || '';
      if (name || age || gender) siblings.push({ name, age: age ? Number(age) : undefined, gender });
    });
    fd.append('siblings', JSON.stringify(siblings));

    // expenses (support both table rows and mobile card wrappers)
    const expenses = [];
    document.querySelectorAll('#expensesTableBody tr, #expensesCardsWrapper .expense-card-wrapper, .expense-card-wrapper').forEach(node => {
      const id = node.dataset.id || node.getAttribute('data-id') || '';
      const item = node.querySelector('.expense-item')?.value || '';
      const expectedCost = node.querySelector('.expense-cost')?.value || '';
      if (item || expectedCost) expenses.push({ _id: id || undefined, item, expectedCost: expectedCost ? Number(expectedCost) : undefined });
    });
    fd.append('expenses', JSON.stringify(expenses));

    // removed files indicator
    fd.append("_removed", JSON.stringify({
      front: removed.front,
      back: removed.back,
      coe: removed.coe,
      voter: removed.voter
    }));

    Swal.fire({ title: "Submitting...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const res = await fetch(`http://localhost:5000/api/educational-assistance/me/resubmit/${appId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }, // don't set Content-Type for FormData
        body: fd
      });
      const json = await res.json().catch(() => ({}));
      Swal.close();
      if (res.ok) {
        Swal.fire({ icon: "success", title: "Resubmitted", text: "Your application is now pending." }).then(() => {
            try {
              // remove any temporary drafts that may conflict with the confirmation view
              sessionStorage.removeItem('educationalAssistanceFormData');
              sessionStorage.removeItem('educDraft');
              sessionStorage.removeItem('educationalDraft');
              try { sessionStorage.removeItem(DRAFT_KEY); } catch(e) {}
            } catch (e) { /* ignore */ }
          // Redirect to the confirmation page
          window.location.href = "/Frontend/html/user/confirmation/html/educConfirmation.html";
        });
      } else {
        Swal.fire({ icon: "error", title: "Failed", text: json.error || "Resubmission failed." });
      }
    } catch (err) {
      Swal.close();
      Swal.fire({ icon: "error", title: "Error", text: "Network or server error." });
    }
  });
});