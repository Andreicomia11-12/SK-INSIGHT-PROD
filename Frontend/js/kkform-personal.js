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

document.addEventListener('DOMContentLoaded', async function () {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');

  const ageInput = document.getElementById('age');
  const birthdayInput = document.getElementById('birthday');
  const registeredNationalVoter = document.getElementById('registeredNationalVoter'); // Your select element

  function calculateAge(birthday) {
    if (!birthday) return '';
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }



  const form = document.getElementById('personalForm');
  const saved = JSON.parse(sessionStorage.getItem('kkProfileStep1') || '{}');

  document.getElementById('lastname').value = saved.lastname || '';
  document.getElementById('firstname').value = saved.firstname || '';
  document.getElementById('middlename').value = saved.middlename || '';
  document.getElementById('suffix').value = saved.suffix || '';
  document.getElementById('gender').value = saved.gender || '';
  if (birthdayInput && !birthdayInput.value) {
    // Prefer saved value in sessionStorage
    birthdayInput.value = saved.birthday || '';

    // If no saved birthday and we have a token, fetch from server (/api/users/me)
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if ((!birthdayInput.value || birthdayInput.value === '') && token) {
      fetch('http://localhost:5000/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(user => {
        if (user && (user.birthday || user.dateOfBirth)) {
          // Accept either `birthday` or `dateOfBirth` field if backend uses different name
          const raw = user.birthday || user.dateOfBirth;
          const val = (typeof raw === 'string' && raw.includes('T')) ? raw.split('T')[0] : raw;
          if (val && !birthdayInput.value) {
            birthdayInput.value = val;
            if (ageInput) {
              ageInput.value = calculateAge(birthdayInput.value);
              try { updateRegisteredNationalVoterEligibility(calculateAge(birthdayInput.value)); } catch(e) {}
            }
          }
        } else {
          if (ageInput) {
            ageInput.value = calculateAge(birthdayInput.value);
            try { updateRegisteredNationalVoterEligibility(calculateAge(birthdayInput.value)); } catch(e) {}
          }
        }
      })
      .catch(() => {
        if (ageInput) {
          ageInput.value = calculateAge(birthdayInput.value);
          try { updateRegisteredNationalVoterEligibility(calculateAge(birthdayInput.value)); } catch(e) {}
        }
      });
    } else {
      if (ageInput) {
        const age = calculateAge(birthdayInput.value);
        ageInput.value = age;
        try { updateRegisteredNationalVoterEligibility(age); } catch(e) {}
      }
    }
  }

  // If name fields are empty and we have a token, fetch user info from /api/users/me
  // and populate `lastname`, `firstname`, `middlename`, `suffix` when available.
  if (token) {
    try {
      fetch('http://localhost:5000/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.ok ? res.json() : null)
      .then(user => {
        if (!user) return;
        // Support multiple id variants used across templates
        const lastnameEl = document.getElementById('lastname') || document.getElementById('lastName') || document.getElementById('surname');
        const firstnameEl = document.getElementById('firstname') || document.getElementById('firstName');
        const middlenameEl = document.getElementById('middlename') || document.getElementById('middleName');
        const suffixEl = document.getElementById('suffix');

        // Only fill if the field is currently empty (do not overwrite saved/drafted values)
        if (lastnameEl && (!lastnameEl.value || lastnameEl.value === '')) {
          lastnameEl.value = user.lastname || user.lastName || user.surname || user.familyName || '';
        }
        if (firstnameEl && (!firstnameEl.value || firstnameEl.value === '')) {
          firstnameEl.value = user.firstname || user.firstName || user.givenName || '';
        }
        if (middlenameEl && (!middlenameEl.value || middlenameEl.value === '')) {
          middlenameEl.value = user.middlename || user.middleName || '';
        }
        if (suffixEl && (!suffixEl.value || suffixEl.value === '')) {
          suffixEl.value = user.suffix || '';
        }
      })
      .catch(() => {});
    } catch (e) {
      // ignore fetch errors silently
    }
  }

  // Determine youth age group from calculated age and persist as a suggestion for step3
  function determineYouthAgeGroup(age) {
    if (typeof age !== 'number' || isNaN(age)) return '';
    if (age >= 15 && age <= 17) return 'Child Youth';
    if (age >= 18 && age <= 24) return 'Core Youth';
    if (age >= 25 && age <= 30) return 'Young Youth';
    return '';
  }

  // Ensure registered national voter field is false/No and readonly for minors (age <= 17)
  function updateRegisteredNationalVoterEligibility(age) {
    if (!registeredNationalVoter) return;
    const numericAge = Number(age);
    const isMinor = !isNaN(numericAge) && numericAge <= 17;
    const opts = Array.from(registeredNationalVoter.options || []);
    let noOptionIndex = opts.findIndex(o => {
      const v = (o.value||'').toString().toLowerCase();
      const t = (o.text||'').toString().toLowerCase();
      return ['false','no','0','n','none'].includes(v) || t === 'no' || /(^|\s)no(\s|$)/i.test(t);
    });
    if (isMinor) {
      if (noOptionIndex >= 0) {
        registeredNationalVoter.selectedIndex = noOptionIndex;
      } else {
        // create an injected "No" option so there's a concrete selectable value
        let injected = registeredNationalVoter.querySelector('option[data-injected-no="1"]');
        if (!injected) {
          injected = document.createElement('option');
          injected.value = 'false';
          injected.text = 'No';
          injected.setAttribute('data-injected-no','1');
          registeredNationalVoter.insertBefore(injected, registeredNationalVoter.firstChild);
        }
        // select the injected option
        for (let i = 0; i < registeredNationalVoter.options.length; i++) {
          if (registeredNationalVoter.options[i].getAttribute('data-injected-no') === '1') {
            registeredNationalVoter.selectedIndex = i;
            break;
          }
        }
      }
      registeredNationalVoter.disabled = true;
      registeredNationalVoter.classList && registeredNationalVoter.classList.add('readonly');
    } else {
      // Re-enable and remove injected option if present
      registeredNationalVoter.disabled = false;
      registeredNationalVoter.classList && registeredNationalVoter.classList.remove('readonly');
      const injected = registeredNationalVoter.querySelector('option[data-injected-no="1"]');
      if (injected) {
        const wasSelected = injected.selected;
        injected.remove();
        if (wasSelected) {
          // choose a sensible default: first option with non-empty value
          let selectedIndex = -1;
          for (let i = 0; i < registeredNationalVoter.options.length; i++) {
            const v = (registeredNationalVoter.options[i].value || '').toString();
            if (v !== '') { selectedIndex = i; break; }
          }
          if (selectedIndex >= 0) registeredNationalVoter.selectedIndex = selectedIndex;
        }
      }
    }
  }

  // If we have an age now, set a suggested youthAgeGroup in kkProfileStep3 (do not overwrite existing value)
  try {
    const currentBirthday = (birthdayInput && birthdayInput.value) ? birthdayInput.value : saved.birthday;
    const currentAge = calculateAge(currentBirthday);
    // Ensure registered national voter state matches current age
    try { updateRegisteredNationalVoterEligibility(currentAge); } catch(e) {}
    const suggestedGroup = determineYouthAgeGroup(currentAge);
    if (suggestedGroup) {
      const step3 = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
      if (!step3.youthAgeGroup) {
        step3.youthAgeGroup = suggestedGroup;
        sessionStorage.setItem('kkProfileStep3', JSON.stringify(step3));
      }
    }
  } catch (e) {
    // ignore
  }



  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const data = {
      lastname: form.lastname.value.trim(),
      firstname: form.firstname.value.trim(),
      middlename: form.middlename.value.trim(),
      suffix: form.suffix.value.trim(),
      gender: form.gender.value,
      birthday: form.birthday.value
    };
    sessionStorage.setItem('kkProfileStep1', JSON.stringify(data));
    window.location.href = 'kkform-address.html';
  });

  // Autosave on any input change so data persists across reloads (but cleared on tab close)
  function saveStep1() {
    try {
      const data = {
        lastname: form.lastname.value.trim(),
        firstname: form.firstname.value.trim(),
        middlename: form.middlename.value.trim(),
        suffix: form.suffix.value.trim(),
        gender: form.gender.value,
        birthday: form.birthday.value
      };
      sessionStorage.setItem('kkProfileStep1', JSON.stringify(data));
      // Also persist suggested youthAgeGroup from this birthday into step3 if not set
      try {
        const age = calculateAge(data.birthday);
        const suggested = determineYouthAgeGroup(age);
        if (suggested) {
          const step3 = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
          if (!step3.youthAgeGroup) {
            step3.youthAgeGroup = suggested;
            sessionStorage.setItem('kkProfileStep3', JSON.stringify(step3));
          }
        }
      } catch (e) { /* ignore */ }
    } catch (e) {
      // ignore storage errors
    }
  }

  // Save as user types or changes fields
  form.addEventListener('input', saveStep1);

  // When birthday changes update age and enforce voter eligibility rules
  if (birthdayInput) {
    birthdayInput.addEventListener('change', function () {
      const newAge = calculateAge(this.value);
      if (ageInput) ageInput.value = newAge;
      try { updateRegisteredNationalVoterEligibility(newAge); } catch(e) {}
    });
  }
});

// Place this at the end of your HTML or in a JS file
document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.getElementById('navbarHamburger');
  const mobileMenu = document.getElementById('navbarMobileMenu');
  hamburger.addEventListener('click', function() {
    mobileMenu.classList.toggle('active');
  });
  document.addEventListener('click', function(e) {
    if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
      mobileMenu.classList.remove('active');
    }
  });
});

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
  if (window.checkAndPromptEducReapply) { try { window.checkAndPromptEducReapply({ event, redirectUrl: 'Educational-assistance-user.html' }); } catch (e) {} return; }
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
        title: `No Application found`,
        text: `You don't have a application yet. Please fill out the form to create one.`,
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

document.addEventListener('DOMContentLoaded', function() {
  // KK Profile
  document.getElementById('kkProfileNavBtnDesktop')?.addEventListener('click', handleKKProfileNavClick);
  document.getElementById('kkProfileNavBtnMobile')?.addEventListener('click', handleKKProfileNavClick);

  // LGBTQ+ Profile
  document.getElementById('lgbtqProfileNavBtnDesktop')?.addEventListener('click', handleLGBTQProfileNavClick);
  document.getElementById('lgbtqProfileNavBtnMobile')?.addEventListener('click', handleLGBTQProfileNavClick);

  // Educational Assistance - attach in capture phase so we can prevent navigation immediately
  document.getElementById('educAssistanceNavBtnDesktop')?.addEventListener('click', function(e){ try{ if (e && typeof e.preventDefault === 'function') e.preventDefault(); }catch(err){}; handleEducAssistanceNavClick(e); }, { capture: true });
  document.getElementById('educAssistanceNavBtnMobile')?.addEventListener('click', function(e){ try{ if (e && typeof e.preventDefault === 'function') e.preventDefault(); }catch(err){}; handleEducAssistanceNavClick(e); }, { capture: true });

    // Educational Assistance - prefer reusable helper when available
  function attachEducHandler(btn) {
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      try { if (e && typeof e.preventDefault === 'function') e.preventDefault(); } catch (err) {}
      if (window.checkAndPromptEducReapply) {
        try { window.checkAndPromptEducReapply({ event: e, redirectUrl: 'Educational-assistance-user.html' }); }
        catch (err) { handleEducAssistanceNavClick(e); }
      } else {
        handleEducAssistanceNavClick(e);
      }
    }, { capture: true });
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