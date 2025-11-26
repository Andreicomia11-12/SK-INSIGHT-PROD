/*
  editEduc.js
  - Fetch Educational Assistance application for current user, populate the edit form
  - Fetch stored images (Cloudinary URLs) and allow preview/change/remove
  - Validate PNG/JPEG uploads
  - Send multipart PUT when images changed or removed, otherwise send JSON PUT
  - Confirm + show loading using SweetAlert2
*/

document.addEventListener('DOMContentLoaded', function () {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) return;

      // Hamburger menu code
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

  // simple helpers
  function base64ToFile(base64, filename) {
    const arr = base64.split(',');
    const mime = (arr[0].match(/:(.*?);/) || [])[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8 = new Uint8Array(n);
    while (n--) u8[n] = bstr.charCodeAt(n);
    return new File([u8], filename, { type: mime });
  }

  async function fetchImageAsBase64(url) {
    if (!url) return null;
    try {
      const r = await fetch(url);
      if (!r.ok) return null;
      const blob = await r.blob();
      return await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('fetchImageAsBase64 failed', e);
      return null;
    }
  }

  function setIfExists(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value ?? '';
  }

  function showFileName(id, txt) {
    const el = document.getElementById(id);
    if (!el) return;
    // truncate display but keep full name in title
    const full = txt || '';
    const max = 24;
    const display = full.length > max ? full.substring(0, max) + '...' : full;
    el.textContent = display;
    el.title = full;
    // ensure visible when a name is provided
    el.style.display = full ? 'inline-block' : 'none';
  }

  // detect mobile layout for siblings/expenses rendering (mutable so we can respond to resize)
  let isMobile = window.innerWidth <= 768;

  // Year options for academic levels
  const JHS_YEARS = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
  const SHS_YEARS = ['Grade 11', 'Grade 12'];

  function populateYearOptions(level, selectedYear) {
    const yearEl = document.getElementById('year');
    const yearWrapper = document.getElementById('yearWrapper');
    if (!yearEl) return;
    let options = [];
    const lvl = (level || '').toString().toLowerCase();
    if (lvl.includes('senior')) {
      options = SHS_YEARS.slice();
    } else if (lvl.includes('junior')) {
      options = JHS_YEARS.slice();
    } else if (lvl.includes('college')) {
      options = ['1st year', '2nd year', '3rd year', '4th year', '5th year', '6th year'];
    } else {
      options = [].concat(SHS_YEARS, ['1st year','2nd year','3rd year','4th year']);
    }

    // ensure selectedYear is present and selected only if it belongs to options
    if (selectedYear && !options.includes(selectedYear)) options.unshift(selectedYear);

    yearEl.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join('');
    if (selectedYear) yearEl.value = selectedYear;
    if (yearWrapper) yearWrapper.style.display = (level ? '' : 'none');
    return options;
  }

  // expose helper globally so other scopes/listeners can call it
  try { window.populateYearOptions = populateYearOptions; } catch (e) { /* ignore in restricted contexts */ }

  // image state
  const frontState = { base64: null, removed: false };
  const backState = { base64: null, removed: false };
  const coeState = { base64: null, removed: false };
  const voterState = { base64: null, removed: false };

  // track current application fetched from server (id + status)
  let currentApplication = { id: null, status: null };

  // inputs
  const frontInput = document.getElementById('frontImage');
  const backInput = document.getElementById('backImage');
  const coeInput = document.getElementById('coeImage');
  const voterInput = document.getElementById('voter');

  const viewFront = document.getElementById('viewFront');
  const viewBack = document.getElementById('viewBack');
  const viewCOE = document.getElementById('viewCOE');
  const viewVoter = document.getElementById('viewVoter');

  const deleteFront = document.getElementById('deleteFront');
  const deleteBack = document.getElementById('deleteBack');
  const deleteCOE = document.getElementById('deleteCOE');
  const deleteVoter = document.getElementById('deleteVoter');

  // validate file type
  function validateImageFile(file) {
    if (!file) return false;
    const allowed = ['image/png','image/jpeg','image/jpg'];
    return allowed.includes(file.type);
  }

  // render view handlers
  function setViewHandler(btnEl, state, fallbackTextId) {
    if (!btnEl) return;
    btnEl.style.cursor = 'pointer';
    btnEl.addEventListener('click', async () => {
      const src = state.base64;
      if (!src) return Swal.fire({ icon: 'info', title: 'No image', text: 'No image available.' });
      try { Swal.fire({ imageUrl: src, imageAlt: 'Preview', showCloseButton: true }); } catch (e) { window.open(src); }
    });
  }

  function setDeleteHandler(btnEl, state, inputEl, fileNameElId) {
    if (!btnEl) return;
    btnEl.style.cursor = 'pointer';
    btnEl.addEventListener('click', () => {
      state.removed = true;
      state.base64 = null;
      if (inputEl) {
        try { inputEl.value = ''; } catch (e) {}
        // show upload label again if present (try common id or label[for=...])
        let label = document.getElementById(`${inputEl.id}Label`);
        if (!label) label = document.querySelector(`label[for="${inputEl.id}"]`);
        if (!label) {
          // some templates use shorter ids like 'frontLabel'
          const short = inputEl.id.replace(/Image$/, '');
          label = document.getElementById(`${short}Label`) || document.getElementById(short + 'Label');
        }
        if (label) label.style.display = 'inline-flex';
        try { if (inputEl && inputEl.id === 'voter') sessionStorage.removeItem('educ_voter_filename'); } catch (e) {}
      }
      if (fileNameElId) {
        showFileName(fileNameElId, '');
        const fn = document.getElementById(fileNameElId);
        if (fn) fn.style.display = 'none';
      }
      Swal.fire({ icon: 'success', title: 'Removed', text: 'Image marked for removal.' });
    });
  }

  setViewHandler(viewFront, frontState, 'frontFileName');
  setViewHandler(viewBack, backState, 'backFileName');
  setViewHandler(viewCOE, coeState, 'coeFileName');
  setViewHandler(viewVoter, voterState, 'voterFileName');

  setDeleteHandler(deleteFront, frontState, frontInput, 'frontFileName');
  setDeleteHandler(deleteBack, backState, backInput, 'backFileName');
  setDeleteHandler(deleteCOE, coeState, coeInput, 'coeFileName');
  setDeleteHandler(deleteVoter, voterState, voterInput, 'voterFileName');

  // SIBLINGS & EXPENSES: rendering, add/remove
  const siblingsTableBody = document.getElementById('siblingsTableBody');
  const expensesTableBody = document.getElementById('expensesTableBody');
  const addSiblingBtn = document.getElementById('addSiblingBtn');
  const addExpenseBtn = document.getElementById('addExpenseBtn');

  // hide table headers on mobile for a cleaner card layout
  const sibHead = document.querySelector('#siblingsTable thead');
  const expHead = document.querySelector('#expensesTable thead');
  if (sibHead) sibHead.style.display = isMobile ? 'none' : '';
  if (expHead) expHead.style.display = isMobile ? 'none' : '';

  function renderSiblings(list) {
    if (!siblingsTableBody) return;
    siblingsTableBody.innerHTML = '';
    (list || []).forEach((s, idx) => {
      if (isMobile) {
        // render as card for mobile
        const card = document.createElement('div');
        card.className = 'sibling-card';
        card.innerHTML = `
          <div class="sibling-field"><label>Name</label><input type="text" class="sib-name" value="${(s.name||s.fullName||'')}"></div>
          <div class="sibling-field"><label>Gender</label>
            <select class="sib-gender">
              <option value="">Select</option>
              <option value="Male" ${s.gender==='Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${s.gender==='Female' ? 'selected' : ''}>Female</option>
            </select>
          </div>
          <div class="sibling-field"><label>Age</label><input type="number" class="sib-age" value="${s.age||''}" min="0"></div>
          <div><button type="button" class="remove-sib">Remove</button></div>
        `;
        siblingsTableBody.appendChild(card);
        card.querySelector('.remove-sib').addEventListener('click', () => card.remove());
      } else {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><input type="text" class="sib-name" value="${(s.name||s.fullName||'')}"></td>
          <td>
            <select class="sib-gender">
              <option value="">Select</option>
              <option value="Male" ${s.gender==='Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${s.gender==='Female' ? 'selected' : ''}>Female</option>
            </select>
          </td>
          <td><input type="number" class="sib-age" value="${s.age||''}" min="0"></td>
          <td><button type="button" class="remove-sib">Remove</button></td>
        `;
        siblingsTableBody.appendChild(tr);
        tr.querySelector('.remove-sib').addEventListener('click', () => tr.remove());
      }
    });
  }

  function renderExpenses(list) {
    if (!expensesTableBody) return;
    expensesTableBody.innerHTML = '';
    (list || []).forEach((e, idx) => {
      if (isMobile) {
        const card = document.createElement('div');
        card.className = 'expense-card';
        const descVal = e.description || e.desc || e.item || '';
        const costVal = e.cost || e.expectedCost || '';
        card.innerHTML = `
          <div class="expense-field"><label>Description</label><input type="text" class="exp-desc" value="${descVal}"></div>
          <div class="expense-field"><label>Expected Cost</label>
            <div class="expense-cost-wrapper">
              <span class="peso-prefix">₱</span>
              <input type="number" class="exp-cost" value="${costVal}" min="0" step="0.01">
              <span class="peso-suffix">.00</span>
            </div>
          </div>
          <div><button type="button" class="remove-exp">Remove</button></div>
        `;
        expensesTableBody.appendChild(card);
        card.querySelector('.remove-exp').addEventListener('click', () => card.remove());
      } else {
        const tr = document.createElement('tr');
        const descVal = e.description || e.desc || e.item || '';
        const costVal = e.cost || e.expectedCost || '';
        tr.innerHTML = `
          <td><input type="text" class="exp-desc" value="${descVal}"></td>
          <td>
            <div class="expense-cost-wrapper">
              <span class="peso-prefix">₱</span>
              <input type="number" class="exp-cost" value="${costVal}" min="0" step="0.01">
              <span class="peso-suffix">.00</span>
            </div>
          </td>
          <td><button type="button" class="remove-exp">Remove</button></td>
        `;
        expensesTableBody.appendChild(tr);
        tr.querySelector('.remove-exp').addEventListener('click', () => tr.remove());
      }
    });
  }

  // Basic styles for expense-cost wrapper (added via JS to avoid editing CSS files)
  (function injectExpenseCostStyles() {
    if (document.getElementById('edit-edu-expense-cost-styles')) return;
    const style = document.createElement('style');
    style.id = 'edit-edu-expense-cost-styles';
    style.textContent = `
      .expense-cost-wrapper{display:inline-flex;align-items:center;gap:6px}
      .expense-cost-wrapper .peso-prefix{font-weight:600}
      .expense-cost-wrapper .peso-suffix{color:#666}
      .expense-cost-wrapper input.exp-cost{width:120px}
      @media(max-width:480px){ .expense-cost-wrapper input.exp-cost{width:100px} }
    `;
    document.head.appendChild(style);
  })();

  if (addSiblingBtn) addSiblingBtn.addEventListener('click', () => {
    // preserve existing siblings, then append a blank one
    const existing = readSiblingsFromTable() || [];
    existing.push({ name: '', gender: '', age: '' });
    renderSiblings(existing);
  });

  if (addExpenseBtn) addExpenseBtn.addEventListener('click', () => {
    const existing = readExpensesFromTable() || [];
    existing.push({ description: '', cost: '' });
    renderExpenses(existing);
  });

  function readSiblingsFromTable() {
    if (!siblingsTableBody) return [];
    // support both table rows and mobile cards
    const cards = Array.from(siblingsTableBody.querySelectorAll('.sibling-card'));
    if (cards.length) {
      return cards.map(card => ({
        name: (card.querySelector('.sib-name')||{}).value || '',
        gender: (card.querySelector('.sib-gender')||{}).value || '',
        age: (card.querySelector('.sib-age')||{}).value || ''
      })).filter(s => s.name || s.gender || s.age);
    }
    return Array.from(siblingsTableBody.querySelectorAll('tr')).map(tr => ({
      name: (tr.querySelector('.sib-name')||{}).value || '',
      gender: (tr.querySelector('.sib-gender')||{}).value || '',
      age: (tr.querySelector('.sib-age')||{}).value || ''
    })).filter(s => s.name || s.gender || s.age);
  }

  function readExpensesFromTable() {
    if (!expensesTableBody) return [];
    const cards = Array.from(expensesTableBody.querySelectorAll('.expense-card'));
    if (cards.length) {
      return cards.map(card => ({
        description: (card.querySelector('.exp-desc')||{}).value || '',
        cost: (card.querySelector('.exp-cost')||{}).value || ''
      })).filter(e => e.description || e.cost);
    }
    return Array.from(expensesTableBody.querySelectorAll('tr')).map(tr => ({
      description: (tr.querySelector('.exp-desc')||{}).value || '',
      cost: (tr.querySelector('.exp-cost')||{}).value || ''
    })).filter(e => e.description || e.cost);
  }

  // Re-render siblings/expenses when window resizes between mobile/desktop
  window.addEventListener('resize', () => {
    const prev = isMobile;
    isMobile = window.innerWidth <= 768;
    if (prev !== isMobile) {
      // preserve current values
      const curSibs = readSiblingsFromTable();
      const curExps = readExpensesFromTable();
      renderSiblings(curSibs);
      renderExpenses(curExps);
      // hide or show table headers to match mobile layout
      const sibHead = document.querySelector('#siblingsTable thead');
      const expHead = document.querySelector('#expensesTable thead');
      if (sibHead) sibHead.style.display = isMobile ? 'none' : '';
      if (expHead) expHead.style.display = isMobile ? 'none' : '';
    }
  });

  if (frontInput) frontInput.addEventListener('change', function (e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!validateImageFile(f)) { Swal.fire({ icon: 'error', title: 'Invalid file', text: 'Only PNG and JPEG allowed.' }); frontInput.value = ''; return; }
    const fr = new FileReader();
    fr.onload = () => { frontState.base64 = fr.result; frontState.removed = false; showFileName('frontFileName', f.name); };
    fr.readAsDataURL(f);
    fr.onloadend = () => {
      // hide upload label and show filename
      const label = document.getElementById('frontLabel');
      if (label) label.style.display = 'none';
      const fn = document.getElementById('frontFileName');
      if (fn) fn.style.display = 'inline-block';
    };
  });

  if (backInput) backInput.addEventListener('change', function (e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!validateImageFile(f)) { Swal.fire({ icon: 'error', title: 'Invalid file', text: 'Only PNG and JPEG allowed.' }); backInput.value = ''; return; }
    const fr = new FileReader();
    fr.onload = () => { backState.base64 = fr.result; backState.removed = false; showFileName('backFileName', f.name); };
    fr.readAsDataURL(f);
    fr.onloadend = () => {
      const label = document.getElementById('backLabel');
      if (label) label.style.display = 'none';
      const fn = document.getElementById('backFileName');
      if (fn) fn.style.display = 'inline-block';
    };
  });
  if (coeInput) coeInput.addEventListener('change', function (e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!validateImageFile(f)) { Swal.fire({ icon: 'error', title: 'Invalid file', text: 'Only PNG and JPEG allowed.' }); coeInput.value = ''; return; }
    const fr = new FileReader();
    fr.onload = () => { coeState.base64 = fr.result; coeState.removed = false; showFileName('coeFileName', f.name); };
    fr.readAsDataURL(f);
    fr.onloadend = () => {
      const label = document.getElementById('coeLabel');
      if (label) label.style.display = 'none';
      const fn = document.getElementById('coeFileName');
      if (fn) fn.style.display = 'inline-block';
    };
  });
  if (voterInput) voterInput.addEventListener('change', function (e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!validateImageFile(f)) { Swal.fire({ icon: 'error', title: 'Invalid file', text: 'Only PNG and JPEG allowed.' }); voterInput.value = ''; return; }
    const fr = new FileReader();
    fr.onload = () => { voterState.base64 = fr.result; voterState.removed = false; showFileName('voterFileName', f.name); try { sessionStorage.setItem('educ_voter_filename', f.name); } catch(e) {} };
    fr.readAsDataURL(f);
    fr.onloadend = () => {
      const label = document.getElementById('voterLabel');
      if (label) label.style.display = 'none';
      const fn = document.getElementById('voterFileName');
      if (fn) fn.style.display = 'inline-block';
    };
  });

  // populate form from server
  async function populate() {
    try {
      const res = await fetch('http://localhost:5000/api/educational-assistance/me', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();

      // remember current application id/status for submit logic
      try { currentApplication.id = data._id || null; currentApplication.status = data.status || null; } catch (e) { /* ignore */ }

      setIfExists('surname', data.surname || data.lastname || '');
      setIfExists('firstName', data.firstname || data.firstName || '');
      setIfExists('middleName', data.middlename || data.middleName || '');
      setIfExists('suffix', data.suffix || '');
      const bd = data.birthday ? (data.birthday.split ? data.birthday.split('T')[0] : data.birthday) : '';
      setIfExists('birthday', bd);
      setIfExists('placeOfBirth', data.placeOfBirth || '');
      setIfExists('age', data.age || '');
      setIfExists('gender', data.gender || data.sex || '');
      setIfExists('civilstatus', data.civilstatus || '');
      setIfExists('religion', data.religion || '');
      setIfExists('email', data.email || '');
      setIfExists('contact', data.contact || '');
      setIfExists('schoolname', data.school || data.schoolname || '');
      setIfExists('schooladdress', data.schooladdress || '');
      // Display academic level if present
      if (data.academicLevel) setIfExists('academicLevel', data.academicLevel);
      // Populate year options based on academic level and restore saved year when possible
      try { populateYearOptions(data.academicLevel || '', data.year || ''); } catch (e) { /* ignore */ }
      setIfExists('benefittype', data.benefittype || data.typeOfBenefit || '');
      setIfExists('fathername', data.fathername || '');
      setIfExists('fathercontact', data.fathercontact || '');
      setIfExists('mothername', data.mothername || '');
      setIfExists('mothercontact', data.mothercontact || '');

      // Determine birthday preference similar to view-educ.js:
      // 1) application.user.birthday (if populated)
      // 2) application.birthday
      // 3) user's profile (/api/users/me)
      try {
        let birthday = '';
        if (data.user && data.user.birthday) birthday = data.user.birthday;
        else if (data.birthday) birthday = data.birthday;

        const birthdayInput = document.getElementById('birthday');
        if (birthdayInput) birthdayInput.value = birthday ? (birthday.split ? birthday.split('T')[0] : birthday) : '';

        // Fetch user profile to prefer its authoritative values (if any)
        const userRes = await fetch('http://localhost:5000/api/users/me', { headers: { Authorization: `Bearer ${token}` } });
        if (userRes && userRes.ok) {
          const userData = await userRes.json();

          // If user profile has birthday, prefer it
          const userBd = userData && userData.birthday ? (userData.birthday.split ? userData.birthday.split('T')[0] : userData.birthday) : '';
          if (userBd) setIfExists('birthday', userBd);

          // civil status (try multiple property name variants)
          const civ = userData.civilstatus || userData.civilStatus || data.civilstatus || data.civilStatus || (data.user && (data.user.civilstatus || data.user.civilStatus));
          if (civ) setIfExists('civilstatus', civ);

          // contact number
          const contactVal = userData.contact || userData.contactNumber || data.contact || data.contactNumber || (data.user && (data.user.contact || data.user.contactNumber));
          if (contactVal) setIfExists('contact', contactVal);

          // school address (and fallback to school/schoolname)
          const schoolAddr = userData.schooladdress || userData.schoolAddress || data.schooladdress || data.schoolAddress || data.school || data.schoolname || '';
          if (schoolAddr) setIfExists('schooladdress', schoolAddr);

          // parents' names & phones (try multiple keys used across views)
          const fName = userData.fathername || userData.fatherName || data.fathername || data.fatherName || (data.user && (data.user.fathername || data.user.fatherName));
          const fPhone = userData.fathercontact || userData.fatherPhone || data.fathercontact || data.fatherPhone || (data.user && (data.user.fathercontact || data.user.fatherPhone));
          const mName = userData.mothername || userData.motherName || data.mothername || data.motherName || (data.user && (data.user.mothername || data.user.motherName));
          const mPhone = userData.mothercontact || userData.motherPhone || data.mothercontact || data.motherPhone || (data.user && (data.user.mothercontact || data.user.motherPhone));
          if (fName) setIfExists('fathername', fName);
          if (fPhone) setIfExists('fathercontact', fPhone);
          if (mName) setIfExists('mothername', mName);
          if (mPhone) setIfExists('mothercontact', mPhone);
        }
      } catch (e) {
        console.warn('fetch user/profile values failed', e);
      }

      // images
      const frontUrl = data.frontImage || data.frontImagePath || data.front_id || null;
      const backUrl = data.backImage || data.backImagePath || null;
      const coeUrl = data.coeImage || null;
      const voterUrl = data.voter || null;

      if (frontUrl) {
        const b64 = await fetchImageAsBase64(frontUrl);
        if (b64) {
          frontState.base64 = b64;
          frontState.removed = false;
          // prefer original filename if URL provides it
          let fname = 'Current image';
          try { fname = frontUrl ? decodeURIComponent((new URL(frontUrl)).pathname.split('/').pop() || '') : 'Current image'; } catch (e) { fname = 'Current image'; }
          if (!fname) fname = 'Current image';
          showFileName('frontFileName', fname);
        }
      }
      if (backUrl) {
        const b64 = await fetchImageAsBase64(backUrl);
        if (b64) {
          backState.base64 = b64;
          backState.removed = false;
          let fname = 'Current image';
          try { fname = backUrl ? decodeURIComponent((new URL(backUrl)).pathname.split('/').pop() || '') : 'Current image'; } catch (e) { fname = 'Current image'; }
          if (!fname) fname = 'Current image';
          showFileName('backFileName', fname);
        }
      }
      if (coeUrl) {
        const b64 = await fetchImageAsBase64(coeUrl);
        if (b64) {
          coeState.base64 = b64;
          coeState.removed = false;
          let fname = 'Current image';
          try { fname = coeUrl ? decodeURIComponent((new URL(coeUrl)).pathname.split('/').pop() || '') : 'Current image'; } catch (e) { fname = 'Current image'; }
          if (!fname) fname = 'Current image';
          showFileName('coeFileName', fname);
        }
      }
      if (voterUrl) {
        const b64 = await fetchImageAsBase64(voterUrl);
        if (b64) {
          voterState.base64 = b64;
          voterState.removed = false;
          let fname = 'Current image';
          try { fname = voterUrl ? decodeURIComponent((new URL(voterUrl)).pathname.split('/').pop() || '') : 'Current image'; } catch (e) { fname = 'Current image'; }
          if (!fname) fname = 'Current image';
          showFileName('voterFileName', fname);
          try { sessionStorage.setItem('educ_voter_filename', fname); } catch (e) { /* ignore */ }
        }
      }

      // Toggle upload labels/file name visibility based on existing images
      const frontLabel = document.getElementById('frontLabel');
      const frontFN = document.getElementById('frontFileName');
      if (frontState.base64) { if (frontLabel) frontLabel.style.display = 'none'; if (frontFN) frontFN.style.display = 'inline-block'; }
      const backLabel = document.getElementById('backLabel');
      const backFN = document.getElementById('backFileName');
      if (backState.base64) { if (backLabel) backLabel.style.display = 'none'; if (backFN) backFN.style.display = 'inline-block'; }
      const coeLabel = document.getElementById('coeLabel');
      const coeFN = document.getElementById('coeFileName');
      if (coeState.base64) { if (coeLabel) coeLabel.style.display = 'none'; if (coeFN) coeFN.style.display = 'inline-block'; }
      const voterLabel = document.getElementById('voterLabel');
      const voterFN = document.getElementById('voterFileName');
      if (voterState.base64) { if (voterLabel) voterLabel.style.display = 'none'; if (voterFN) voterFN.style.display = 'inline-block'; }
      try {
        const storedVoter = sessionStorage.getItem('educ_voter_filename');
        if (!voterState.base64 && storedVoter) {
          if (voterLabel) voterLabel.style.display = 'none';
          showFileName('voterFileName', storedVoter);
          if (voterFN) voterFN.style.display = 'inline-block';
        }
      } catch (e) { /* ignore sessionStorage errors */ }

      // Hide voter row if academic level is Senior High
      function updateVoterRowVisibility(level) {
        try {
          const lvl = (level || document.getElementById('academicLevel')?.value || '').toString().toLowerCase();
          const hide = /senior/i.test(lvl);
          const voterInputEl = document.getElementById('voter');
          const voterLabelEl = document.getElementById('voterLabel');
          const voterFileNameEl = document.getElementById('voterFileName');
          const voterUploadColumn = document.getElementById('voterUploadColumn');

          // Determine if we already have a file displayed (base64 or stored filename or visible filename element)
          let hasDisplayedVoter = false;
          try {
            const stored = sessionStorage.getItem('educ_voter_filename');
            if (voterState.base64) hasDisplayedVoter = true;
            else if (stored) hasDisplayedVoter = true;
            else if (voterFileNameEl && voterFileNameEl.textContent && voterFileNameEl.style.display !== 'none') hasDisplayedVoter = true;
          } catch (e) { /* ignore sessionStorage errors */ }

          // If Senior High, hide the whole row/input elements regardless
          if (hide) {
            [voterInputEl, voterLabelEl, voterFileNameEl, voterUploadColumn].forEach(el => { if (el) el.style.display = 'none'; });
            const tr1 = voterInputEl && voterInputEl.closest ? voterInputEl.closest('tr') : null;
            const tr2 = voterUploadColumn && voterUploadColumn.closest ? voterUploadColumn.closest('tr') : null;
            const tr = tr1 || tr2;
            if (tr) tr.style.display = 'none';
            if (voterInputEl) voterInputEl.required = false;
            return;
          }

          // Not Senior High: show the row but decide whether to show the upload label.
          // Show voter input and upload column by default
          if (voterInputEl) voterInputEl.style.display = '';
          if (voterUploadColumn) voterUploadColumn.style.display = '';
          if (voterFileNameEl && hasDisplayedVoter) {
            // hide the upload label if a filename is displayed
            if (voterLabelEl) voterLabelEl.style.display = 'none';
            voterFileNameEl.style.display = 'inline-block';
          } else {
            // no file displayed: ensure upload label is visible and filename hidden
            if (voterLabelEl) voterLabelEl.style.display = '';
            if (voterFileNameEl) voterFileNameEl.style.display = 'none';
          }

          // Ensure enclosing row visible
          const tr1 = voterInputEl && voterInputEl.closest ? voterInputEl.closest('tr') : null;
          const tr2 = voterUploadColumn && voterUploadColumn.closest ? voterUploadColumn.closest('tr') : null;
          const tr = tr1 || tr2;
          if (tr) tr.style.display = '';
        } catch (e) { /* ignore */ }
      }

      // siblings (array of { name, gender, age })
      try {
        const siblings = Array.isArray(data.siblings) ? data.siblings : (data.siblings ? JSON.parse(data.siblings) : []);
        renderSiblings(siblings || []);
      } catch (e) { renderSiblings([]); }

      // expenses (array of { description, cost })
      try {
        const expenses = Array.isArray(data.expenses) ? data.expenses : (data.expenses ? JSON.parse(data.expenses) : []);
        renderExpenses(expenses || []);
      } catch (e) { renderExpenses([]); }

      // Apply voter row visibility based on academic level from DB
      try { updateVoterRowVisibility(data.academicLevel || ''); } catch (e) { /* ignore */ }

    } catch (e) {
      console.warn('populate educational failed', e);
    }
  }

  // submit handler
  const form = document.getElementById('educationalAssistanceForm');
  if (form) form.addEventListener('submit', async function (ev) {
    ev.preventDefault();

    try {
      const confirmed = await Swal.fire({ title: 'Save changes?', icon: 'question', showCancelButton: true, confirmButtonText: 'Save', cancelButtonText: 'Cancel', confirmButtonColor: '#0A2C59' });
      if (!confirmed || !confirmed.isConfirmed) return;
    } catch (e) { console.warn('Swal failed, proceeding'); }

    // NOTE: Do not show the 'Saving...' loading modal until validation passes

    // gather payload
    const payload = {
      surname: (document.getElementById('surname') || {}).value || '',
      firstname: (document.getElementById('firstName') || {}).value || '',
      middlename: (document.getElementById('middleName') || {}).value || '',
      suffix: (document.getElementById('suffix') || {}).value || '',
      birthday: (document.getElementById('birthday') || {}).value || '',
      placeOfBirth: (document.getElementById('placeOfBirth') || {}).value || '',
      age: (document.getElementById('age') || {}).value || '',
      gender: (document.getElementById('gender') || {}).value || '',
      civilstatus: (document.getElementById('civilstatus') || {}).value || '',
      religion: (document.getElementById('religion') || {}).value || '',
      email: (document.getElementById('email') || {}).value || '',
      contact: (document.getElementById('contact') || {}).value || '',
      schoolname: (document.getElementById('schoolname') || {}).value || '',
      schooladdress: (document.getElementById('schooladdress') || {}).value || '',
      academicLevel: (document.getElementById('academicLevel') || {}).value || '',
      year: (document.getElementById('year') || {}).value || '',
      benefittype: (document.getElementById('benefittype') || {}).value || '',
      fathername: (document.getElementById('fathername') || {}).value || '',
      fathercontact: (document.getElementById('fathercontact') || {}).value || '',
      mothername: (document.getElementById('mothername') || {}).value || '',
      mothercontact: (document.getElementById('mothercontact') || {}).value || ''
    };

    // Validation: if academic level is Junior High, require all documents (front/back/coe/voter)
    try {
      const lvl = (payload.academicLevel || '').toString().toLowerCase();
      const isJHS = /junior/i.test(lvl);
      if (isJHS) {
        const hasUploaded = (state, inputEl, fileNameElId) => {
          try {
            if (state && state.removed) return false;
            if (state && state.base64) return true;
            if (inputEl && inputEl.files && inputEl.files.length) return true;
            if (fileNameElId) {
              const fnEl = document.getElementById(fileNameElId);
              if (fnEl && fnEl.textContent && fnEl.style.display !== 'none') return true;
            }
            return false;
          } catch (e) { return false; }
        };

        const missing = [];
        if (!hasUploaded(frontState, frontInput, 'frontFileName')) missing.push('School ID (Front)');
        if (!hasUploaded(backState, backInput, 'backFileName')) missing.push('School ID (Back)');
        if (!hasUploaded(coeState, coeInput, 'coeFileName')) missing.push('Certificate of Enrollment');
        if (!hasUploaded(voterState, voterInput, 'voterFileName')) missing.push("Parent's Voter's Certificate");

        if (missing.length) {
          try { Swal.close(); } catch (e) {}
          await Swal.fire({
            icon: 'warning',
            title: 'Missing required documents',
            html: `For Junior High School the following documents are required:<br><ul style="text-align:left;">${missing.map(m=>`<li>${m}</li>`).join('')}</ul>`,
            confirmButtonText: 'OK',
            allowOutsideClick: true,
            allowEscapeKey: true,
            showCancelButton: false,
            confirmButtonColor: '#0A2C59'
          });
          return;
        }
      }
    } catch (e) { /* ignore validation errors */ }

    try {
      // collect siblings and expenses from table
      const siblings = readSiblingsFromTable();
      const expenses = readExpensesFromTable();

  const hasNewFront = !!frontState.base64 && String(frontState.base64).startsWith('data:');
      const hasNewBack = !!backState.base64 && String(backState.base64).startsWith('data:');
      const hasNewCOE = !!coeState.base64 && String(coeState.base64).startsWith('data:');
      const hasNewVoter = !!voterState.base64 && String(voterState.base64).startsWith('data:');

      const needFormData = hasNewFront || hasNewBack || hasNewCOE || hasNewVoter || frontState.removed || backState.removed || coeState.removed || voterState.removed;

      // Normalize keys to match backend model before sending
      const normalizeExpenses = (arr) => (arr || []).map(e => ({
        item: e.item || e.description || '',
        expectedCost: Number((e.expectedCost !== undefined ? e.expectedCost : e.cost) || 0)
      })).filter(ex => ex.item || ex.expectedCost);

      const normalizeSiblings = (arr) => (arr || []).map(s => ({
        name: s.name || s.fullName || '',
        gender: s.gender || '',
        age: Number(s.age || 0)
      })).filter(s => s.name || s.gender || s.age);

      const normalized = {
        // strings directly copied
        surname: payload.surname,
        firstname: payload.firstname,
        middlename: payload.middlename,
        suffix: payload.suffix,
        birthday: payload.birthday,
        placeOfBirth: payload.placeOfBirth,
        age: payload.age ? Number(payload.age) : undefined,
        // map frontend -> backend field names
        sex: payload.gender,
        civilStatus: payload.civilstatus,
        religion: payload.religion,
        email: payload.email,
        contactNumber: payload.contact ? (isNaN(Number(payload.contact)) ? payload.contact : Number(payload.contact)) : undefined,
        school: payload.schoolname,
        schoolAddress: payload.schooladdress,
        academicLevel: payload.academicLevel,
        year: payload.year,
        typeOfBenefit: payload.benefittype,
        fatherName: payload.fathername,
        fatherPhone: payload.fathercontact,
        motherName: payload.mothername,
        motherPhone: payload.mothercontact,
        siblings: normalizeSiblings(siblings),
        expenses: normalizeExpenses(expenses),
      };

      // Show 'Saving...' modal after validation and before network calls
      try { Swal.fire({ title: 'Saving...', allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading(), showConfirmButton: false }); } catch (e) {}

      if (needFormData) {
        const fd = new FormData();
        Object.entries(normalized).forEach(([k, v]) => {
          if (v === undefined || v === null) return;
          if (k === 'siblings' || k === 'expenses') {
            fd.append(k, JSON.stringify(v));
          } else {
            fd.append(k, String(v));
          }
        });
        const removed = {};
        if (frontState.removed) removed.front = true;
        if (backState.removed) removed.back = true;
        if (coeState.removed) removed.coe = true;
        if (voterState.removed) removed.voter = true;
        if (Object.keys(removed).length) fd.append('_removed', JSON.stringify(removed));
        if (hasNewFront) fd.append('frontImage', base64ToFile(frontState.base64, 'front.png'));
        if (hasNewBack) fd.append('backImage', base64ToFile(backState.base64, 'back.png'));
        if (hasNewCOE) fd.append('coeImage', base64ToFile(coeState.base64, 'coe.png'));
        if (hasNewVoter) fd.append('voter', base64ToFile(voterState.base64, 'voter.png'));

        // If editing a previously rejected application, call resubmit endpoint
        const isRejected = currentApplication.status === 'rejected' && currentApplication.id;
        const url = isRejected ? `http://localhost:5000/api/educational-assistance/me/resubmit/${currentApplication.id}` : 'http://localhost:5000/api/educational-assistance/me';
        const method = isRejected ? 'POST' : 'PUT';
        const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: fd });
        const txt = await res.text();
        if (!res.ok) throw new Error(txt || 'Update failed');
        try { Swal.close(); } catch (e) {}
        try { sessionStorage.removeItem('educ_voter_filename'); } catch (e) {}
        await Swal.fire({ icon: 'success', title: 'Saved', text: 'Application updated.' });
        window.location.href = 'educConfirmation.html';
        return;
      } else {
        // JSON PUT or resubmit (if rejected) - send normalized payload
        const isRejected = currentApplication.status === 'rejected' && currentApplication.id;
        const url = isRejected ? `http://localhost:5000/api/educational-assistance/me/resubmit/${currentApplication.id}` : 'http://localhost:5000/api/educational-assistance/me';
        const method = isRejected ? 'POST' : 'PUT';
        const jsonRes = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(normalized) });
        const j = await jsonRes.json().catch(()=>null);
        if (!jsonRes.ok) throw new Error((j && j.error) || 'Update failed');
        try { Swal.close(); } catch (e) {}
        try { sessionStorage.removeItem('educ_voter_filename'); } catch (e) {}
        await Swal.fire({ icon: 'success', title: 'Saved', text: 'Application updated.' });
        window.location.href = 'educConfirmation.html';
        return;
      }
    } catch (err) {
      console.error('Save failed', err);
      try { Swal.close(); } catch (e) {}
      await Swal.fire({ icon: 'error', title: 'Save failed', text: String(err.message || err) });
    }
  });

  populate();
});

// Attach academic level change listener to update voter row visibility dynamically
document.addEventListener('DOMContentLoaded', function () {
  const academicEl = document.getElementById('academicLevel');
  if (academicEl) {
    academicEl.addEventListener('change', function () {
      try {
        const lvl = academicEl.value || '';
        // update year options and get available options
        let options = [];
        try { options = (window.populateYearOptions ? window.populateYearOptions(lvl, '') : populateYearOptions(lvl, '')) || []; } catch (e) { options = []; }
        // set year to a sensible default if current value is empty or not in options
        try {
          const yearEl = document.getElementById('year');
          if (yearEl) {
            const cur = (yearEl.value || '').toString();
            if (!cur || !options.includes(cur)) {
              yearEl.value = options && options.length ? options[0] : '';
            }
          }
        } catch (e) { /* ignore */ }

        // toggle voter upload visibility for Senior High (respect any existing displayed filename)
        try {
          const voterInputEl = document.getElementById('voter');
          const voterLabelEl = document.getElementById('voterLabel');
          const voterFileNameEl = document.getElementById('voterFileName');
          const voterUploadColumn = document.getElementById('voterUploadColumn');
          const hide = /senior/i.test((lvl||'').toString().toLowerCase());
          // determine if filename is present (from state or sessionStorage)
          let hasDisplayedVoter = false;
          try { if (voterState.base64) hasDisplayedVoter = true; else if (sessionStorage.getItem('educ_voter_filename')) hasDisplayedVoter = true; else if (voterFileNameEl && voterFileNameEl.textContent && voterFileNameEl.style.display !== 'none') hasDisplayedVoter = true; } catch (e) {}
          if (hide) {
            [voterInputEl, voterLabelEl, voterFileNameEl, voterUploadColumn].forEach(el => { if (el) el.style.display = 'none'; });
            const tr1 = voterInputEl && voterInputEl.closest ? voterInputEl.closest('tr') : null;
            const tr2 = voterUploadColumn && voterUploadColumn.closest ? voterUploadColumn.closest('tr') : null;
            const tr = tr1 || tr2;
            if (tr) tr.style.display = 'none';
            if (voterInputEl) voterInputEl.required = false;
          } else {
            if (voterInputEl) voterInputEl.style.display = '';
            if (voterUploadColumn) voterUploadColumn.style.display = '';
            if (hasDisplayedVoter) {
              if (voterLabelEl) voterLabelEl.style.display = 'none';
              if (voterFileNameEl) voterFileNameEl.style.display = 'inline-block';
            } else {
              if (voterLabelEl) voterLabelEl.style.display = '';
              if (voterFileNameEl) voterFileNameEl.style.display = 'none';
            }
            const tr1 = voterInputEl && voterInputEl.closest ? voterInputEl.closest('tr') : null;
            const tr2 = voterUploadColumn && voterUploadColumn.closest ? voterUploadColumn.closest('tr') : null;
            const tr = tr1 || tr2;
            if (tr) tr.style.display = '';
          }
        } catch (e) { /* ignore */ }
      } catch (e) { /* ignore */ }
    });
    }
  });

  // ✅ Attach LGBTQ nav
  const lgbtqProfileNavBtnDesktop = document.getElementById('lgbtqProfileNavBtnDesktop');
  if (lgbtqProfileNavBtnDesktop) lgbtqProfileNavBtnDesktop.addEventListener('click', handleLGBTQProfileNavClick);

  const lgbtqProfileNavBtnMobile = document.getElementById('lgbtqProfileNavBtnMobile');
  if (lgbtqProfileNavBtnMobile) lgbtqProfileNavBtnMobile.addEventListener('click', handleLGBTQProfileNavClick);

  // ✅ Attach Educational Assistance nav
  const educAssistanceNavBtnDesktop = document.getElementById('educAssistanceNavBtnDesktop');
  if (educAssistanceNavBtnDesktop) educAssistanceNavBtnDesktop.addEventListener('click', handleEducAssistanceNavClick);

  const educAssistanceNavBtnMobile = document.getElementById('educAssistanceNavBtnMobile');
  if (educAssistanceNavBtnMobile) educAssistanceNavBtnMobile.addEventListener('click', handleEducAssistanceNavClick);

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
        if (result.isConfirmed) window.location.href = "kkcofirmation.html";
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
        if (result.isConfirmed) window.location.href = "kkcofirmation.html";
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
          window.location.href = "../../kkform-personal.html";
        } else if (result.dismiss === Swal.DismissReason.cancel) {
        }
      });
      return;
    }
  })
  .catch(() => window.location.href = "../../kkform-personal.html");
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
        if (result.isConfirmed) window.location.href = "lgbtqconfirmation.html";
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
        if (result.isConfirmed) window.location.href = "lgbtqconfirmation.html";
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
          window.location.href = "../../lgbtqform.html";
        } else if (result.dismiss === Swal.DismissReason.cancel) {
        }
      });
      return;
    }
  })
  .catch(() => window.location.href = "../../lgbtqform.html");
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
        if (result.isConfirmed) window.location.href = "educConfirmation.html";
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
        if (result.isConfirmed) window.location.href = "educConfirmation.html";
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
          window.location.href = "../../Educational-assistance-user.html";
        } else if (result.dismiss === Swal.DismissReason.cancel) {
        }
      });
      return;
    }
  })
  .catch(() => window.location.href = "../../Educational-assistance-user.html");
}