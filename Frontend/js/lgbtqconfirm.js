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

  // Hide edit button if the LGBTQ+ Profiling form is closed
  (async function(){
    try {
      const res = await fetch('http://localhost:5000/api/formcycle/status?formName=LGBTQIA%2B%20Profiling');
      const status = await res.json().catch(()=>null);
      const latest = Array.isArray(status)? status[status.length-1] : status;
      const isOpen = latest?.isOpen ?? false;
      if (!isOpen) {
        document.querySelectorAll('.kk-upload-row .edit').forEach(el => el.remove());
      }
    } catch (e) {
      console.warn('Could not determine LGBTQ form status to hide edit button', e);
    }
  })();
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
    if (!isFormOpen && !hasProfile) {
      Swal.fire({
        icon: "warning",
        title: `The ${formName} form is currently closed`,
        text: "You cannot submit a new response at this time.",
        confirmButtonText: "OK"
      });
      return;
    }
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
    // Added Case 4 SweetAlert
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
    if (!isFormOpen && !hasProfile) {
      Swal.fire({
        icon: "warning",
        title: `The ${formName} form is currently closed`,
        text: "You cannot submit a new response at this time.",
        confirmButtonText: "OK"
      });
      return;
    }
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
    // Added Case 4 SweetAlert
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
    if (!isFormOpen && !hasProfile) {
      Swal.fire({
        icon: "warning",
        title: `The ${formName} form is currently closed`,
        text: "You cannot submit a new application at this time.",
        confirmButtonText: "OK"
      });
      return;
    }
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
    // Added Case 4 SweetAlert
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

     
  function attachEducHandler(btn) {
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      try { if (e && typeof e.preventDefault === 'function') e.preventDefault(); } catch (err) {}
      if (window.checkAndPromptEducReapply) {
        try { window.checkAndPromptEducReapply({ event: e, redirectUrl: '../../Educational-assistance-user.html' }); }
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
        redirectUrl = '../../Educational-assistance-user.html',
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
          if (res2 && res2.isConfirmed) { window.location.href = `educConfirmation.html`; return { redirected: true, isRejected, hasProfile, isFormOpen }; }
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