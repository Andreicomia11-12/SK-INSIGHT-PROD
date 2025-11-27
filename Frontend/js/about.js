document.addEventListener('DOMContentLoaded', function () {
  const hamburger = document.getElementById('navbarHamburger');
  const mobileMenu = document.getElementById('navbarMobileMenu');

  // Handle mobile menu toggle
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function (e) {
      e.stopPropagation();
      mobileMenu.classList.toggle('active');
    });
    document.addEventListener('click', function (e) {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('active');
      }
    });
  }

  // Check user verification status
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  let isVerified = false;

  if (token) {
    fetch('http://localhost:5000/api/users/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => response.json())
      .then(user => {
        isVerified = user.isVerified || false;

        if (!isVerified) {
          // Show verification strip
          const verificationStrip = document.getElementById('verification-strip');
          if (verificationStrip) {
            verificationStrip.style.display = 'flex';
          }
          document.body.classList.add('has-verification-strip');

          // Disable navigation buttons for forms and announcements
          const navSelectors = [
            '#kkProfileNavBtnDesktop',
            '#kkProfileNavBtnMobile',
            '#lgbtqProfileNavBtnDesktop',
            '#lgbtqProfileNavBtnMobile',
            '#educAssistanceNavBtnDesktop',
            '#educAssistanceNavBtnMobile',
            '.announcement-btn'
          ];
          navSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(btn => {
              btn.classList.add('disabled');
              btn.setAttribute('tabindex', '-1');
              btn.setAttribute('aria-disabled', 'true');
              btn.addEventListener('click', function (e) {
                e.preventDefault();
                Swal.fire({
                  icon: 'warning',
                  title: 'Account Verification Required',
                  text: 'Please verify your account to access this feature.',
                  confirmButtonText: 'OK'
                });
              });
            });
          });
        }
      })
      .catch(() => {
        console.error('Failed to fetch user verification status.');
      });
  } else {
    // If no token, show login strip
    const loginStrip = document.getElementById('login-strip');
    if (loginStrip) {
      loginStrip.style.display = 'flex';
    }
    document.body.classList.add('has-login-strip');

    // Disable all navbar buttons for non-logged-in users
    const navSelectors = [
      '.navbar-center a',
      '.navbar-right a',
      '.navbar-mobile-menu a',
      '.announcement-btn',
      '#userProfileBtn',
      '.prof',
      '.nav-btn'
    ];
    navSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(btn => {
        btn.classList.add('disabled');
        btn.setAttribute('tabindex', '-1');
        btn.setAttribute('aria-disabled', 'true');
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          Swal.fire({
            icon: 'warning',
            title: 'You need to log in first',
            text: 'Please log in to access this feature.',
            confirmButtonText: 'OK'
          });
        });
      });
    });
  }

  // KK Profile Navigation
  function handleKKProfileNavClick(event) {
    event.preventDefault();
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) {
      Swal.fire({
        icon: 'warning',
        title: 'You need to log in first',
        text: 'Please log in to access KK Profiling.',
        confirmButtonText: 'OK'
      }).then(() => {
        window.location.href = '/Frontend/html/user/login.html';
      });
      return;
    }
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
          if (result.isConfirmed) window.location.href = "./confirmation/html/kkcofirmation.html";
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
          if (result.isConfirmed) window.location.href = "./confirmation/html/kkcofirmation.html";
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
    if (!token) {
      Swal.fire({
        icon: 'warning',
        title: 'You need to log in first',
        text: 'Please log in to access LGBTQ+ Profiling.',
        confirmButtonText: 'OK'
      }).then(() => {
        window.location.href = '/Frontend/html/user/login.html';
      });
      return;
    }
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
  async function handleEducAssistanceNavClick(event) {
    event.preventDefault();
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) {
      Swal.fire({
        icon: 'warning',
        title: 'You need to log in first',
        text: 'Please log in to access Educational Assistance.',
        confirmButtonText: 'OK'
      }).then(() => {
        window.location.href = '/Frontend/html/user/login.html';
      });
      return;
    }
    // Early check: see if the user's latest application was rejected.
    // If rejected, prompt to update and redirect to the edit page.
    try {
      const apiBase = 'http://localhost:5000';
      const checkUrl = `${apiBase}/api/educational-assistance/check-rejected`;
      const checkRes = await fetch(checkUrl, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (checkRes && checkRes.ok) {
        const checkData = await checkRes.json().catch(() => ({}));
        const rejected = checkData && (checkData.rejected === true || checkData.rejected === 'true' || checkData.rejected === '1' || /reject/i.test(String(checkData.status || checkData.result || '')));
        if (rejected) {
          const reason = checkData.rejectionReason || checkData.reason || 'Your previous application was rejected by the admin.';
          const result = await Swal.fire({
            icon: 'warning',
            title: 'Previous Application Rejected',
            text: reason,
            showCancelButton: true,
            confirmButtonText: 'Update Response',
            cancelButtonText: 'Cancel'
          });
          if (result && result.isConfirmed) {
            // Clear any draft keys to avoid stale data
            try { sessionStorage.removeItem('educDraft'); sessionStorage.removeItem('educationalDraft'); } catch (e) {}
            // Redirect to edit page (relative to this page)
            window.location.href = 'confirmation/html/editEduc.html';
            return;
          }
        }
      }
    } catch (err) {
      console.debug('earlyRejectedCheck error', err);
      // If the check fails, continue to the normal flow below
    }
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
        title: `No profile found`,
        text: `You don't have a profile yet. Please fill out the form to create one.`,
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

  // KK Profile
  document.getElementById('kkProfileNavBtnDesktop')?.addEventListener('click', handleKKProfileNavClick);
  document.getElementById('kkProfileNavBtnMobile')?.addEventListener('click', handleKKProfileNavClick);

  // LGBTQ+ Profile
  document.getElementById('lgbtqProfileNavBtnDesktop')?.addEventListener('click', handleLGBTQProfileNavClick);
  document.getElementById('lgbtqProfileNavBtnMobile')?.addEventListener('click', handleLGBTQProfileNavClick);

  // Educational Assistance - attach via helper if available
  function attachEducHandler(btn) {
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      if (window.checkAndPromptEducReapply) {
        try {
          window.checkAndPromptEducReapply({ event: e, redirectUrl: 'Educational-assistance-user.html' });
        } catch (err) {
          handleEducAssistanceNavClick(e);
        }
      } else {
        handleEducAssistanceNavClick(e);
      }
    });
  }

  attachEducHandler(document.getElementById('educAssistanceNavBtnDesktop'));
  attachEducHandler(document.getElementById('educAssistanceNavBtnMobile'));

  // Embed educRejected helper so pages without separate script still have access
  // Replace previous educational-assistance attach logic with a single reliable handler
(function attachEducReapplyHandler() {
  const desktopBtn = document.getElementById('educAssistanceNavBtnDesktop');
  const mobileBtn = document.getElementById('educAssistanceNavBtnMobile');

  async function onEducClick(e) {
    e.preventDefault();
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    // If not logged in, delegate to existing handler (which will show login)
    if (!token) return handleEducAssistanceNavClick(e);

    // Try check-rejected first
    try {
      const res = await fetch('http://localhost:5000/api/educational-assistance/check-rejected', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json && json.rejected && json.applicationId) {
          const reason = json.rejectionReason || 'No reason provided';
          const result = await Swal.fire({
            icon: 'warning',
            title: 'Application Rejected',
            html: `<p>Your Educational Assistance application was rejected.</p><p><strong>Reason:</strong> ${reason}</p><p>Do you want to edit and resubmit?</p>`,
            showCancelButton: true,
            confirmButtonText: 'Edit & Resubmit',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#07B0F2',
            cancelButtonColor: '#0A2C59'
          });
          if (result.isConfirmed) {
            // Redirect to resubmit page with id
            window.location.href = `/Frontend/html/user/confirmation/html/editEducRejected.html?id=${json.applicationId}`;
            return;
          }
          // user cancelled; do nothing
          return;
        }
      }
    } catch (err) {
      console.debug('check-rejected failed', err);
      // fallthrough to normal behavior
    }

    // If not rejected or check failed, proceed with normal flow
    handleEducAssistanceNavClick(e);
  }

  if (desktopBtn) desktopBtn.addEventListener('click', onEducClick, { capture: true });
  if (mobileBtn) mobileBtn.addEventListener('click', onEducClick, { capture: true });
})();
})();
