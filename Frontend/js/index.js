document.addEventListener('DOMContentLoaded', function() {
  console.log("✅ DOM fully loaded");

  const hamburger = document.getElementById('navbarHamburger');
  const mobileMenu = document.getElementById('navbarMobileMenu');

  // Handle mobile menu toggle
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

  // Show login strip if not logged in
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) {
    const loginStrip = document.getElementById('login-strip');
    if (loginStrip) {
      loginStrip.style.display = 'flex';
    }
    document.body.classList.add('has-login-strip');

    // Disable all navbar buttons for non-logged-in users
    const navSelectors = [
      '.navbar-center a',           // All main nav links
      '.navbar-right a',            // User profile, logout, etc.
      '.navbar-mobile-menu a',      // Mobile nav links
      '.announcement-btn',          // Announcement button (if it has this class or id)
      '#userProfileBtn',            // User profile button (if it has this id)
      '.prof',                      // Profile nav buttons
      '.nav-btn'                    // Mobile nav buttons
    ];
    navSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(btn => {
        btn.classList.add('disabled');
        btn.setAttribute('tabindex', '-1');
        btn.setAttribute('aria-disabled', 'true');
        btn.addEventListener('click', function(e) {
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

  // Add to the top of your user JS files (after DOMContentLoaded)
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

  // Fetch both form cycle status and user profile
  Promise.all([
    fetch('http://localhost:5000/api/formcycle/status?formName=KK Profiling', {
      headers: { Authorization: `Bearer ${token}` }
    }),
    fetch('http://localhost:5000/api/kkprofiling/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
  ])
.then(async ([cycleRes, profileRes]) => {
  let cycleData = null, profileData = {};
  try {
    cycleData = await cycleRes.json();
  } catch (e) {
    console.error("Cycle JSON error:", e);
  }
  try {
    profileData = await profileRes.json();
  } catch (e) {
    console.error("Profile JSON error:", e);
  }

  console.log("Profile response status:", profileRes.status, "Profile data:", profileData);

  // ✅ Handle both array and object response types
  const latestCycle = Array.isArray(cycleData)
    ? cycleData[cycleData.length - 1]
    : cycleData;

  const formName = latestCycle?.formName || "KK Profiling";
  const isFormOpen = latestCycle?.isOpen ?? false; // ✅ default to false, not true
  const hasProfile = profileRes.ok && profileData && profileData._id;


      // 🔹 CASE 1: Form closed, user already has profile
      if (!isFormOpen && hasProfile) {
        Swal.fire({
          icon: "info",
          title: `The ${formName} is currently closed`,
          text: `but you already have a ${formName} profile. Do you want to view your response?`,
          showCancelButton: true,
          confirmButtonText: "Yes, view my response",
          cancelButtonText: "No"
        }).then(result => {
          if (result.isConfirmed) {
            window.location.href = "confirmation/html/kkcofirmation.html";
          }
        });
        return;
      }

      // 🔹 CASE 2: Form closed, user has NO profile
      if (!isFormOpen && !hasProfile) {
        Swal.fire({
          icon: "warning",
          title: `The ${formName} form is currently closed`,
          text: "You cannot submit a new response at this time.",
          confirmButtonText: "OK"
        });
        return;
      }

      // 🔹 CASE 3: Form open, user already has a profile
      if (isFormOpen && hasProfile) {
        Swal.fire({
          title: `You already answered ${formName} Form`,
          text: "Do you want to view your response?",
          icon: "info",
          showCancelButton: true,
          confirmButtonText: "Yes",
          cancelButtonText: "No"
        }).then(result => {
          if (result.isConfirmed) {
            window.location.href = "confirmation/html/kkcofirmation.html";
          }
        });
        return;
      }

      // 🔹 CASE 4: Form open, no profile → Go to form
      window.location.href = "kkform-personal.html";
    })
    .catch(err => {
      console.error("Error checking form status or profile:", err);
      window.location.href = "kkform-personal.html";
    });
}


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
      let cycleData = null, profileData = {};
      try {
        cycleData = await cycleRes.json();
      } catch (e) {
        console.error("Cycle JSON error:", e);
      }
      try {
        profileData = await profileRes.json();
      } catch (e) {
        console.error("Profile JSON error:", e);
      }

      const latestCycle = Array.isArray(cycleData)
        ? cycleData[cycleData.length - 1]
        : cycleData;

      const formName = latestCycle?.formName || "LGBTQIA+ Profiling";
      const isFormOpen = latestCycle?.isOpen ?? false;
      const hasProfile = profileData && profileData._id ? true : false;

      console.log("Form open:", isFormOpen, "Has profile:", hasProfile);
      console.log("Cycle data:", cycleData);
console.log("Profile data:", profileData);



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
          if (result.isConfirmed) {
            window.location.href = "confirmation/html/lgbtqconfirmation.html";
          }
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
          if (result.isConfirmed) {
            window.location.href = "confirmation/html/lgbtqconfirmation.html";
          }
        });
        return;
      }

      // CASE 4: Form open, no profile → Go to form
      window.location.href = "lgbtqform.html";
    })
    .catch(err => {
      console.error("Error checking form status or profile:", err);
      window.location.href = "lgbtqform.html";
    });
  }

  function handleEducAssistanceNavClick(event) {
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

    Promise.all([
      fetch('http://localhost:5000/api/formcycle/status?formName=Educational%20Assistance', {
        headers: { Authorization: `Bearer ${token}` }
      }),
      fetch('http://localhost:5000/api/educational-assistance/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
    ])
    .then(async ([cycleRes, profileRes]) => {
      let cycleData = null, profileData = {};
      try {
        cycleData = await cycleRes.json();
      } catch (e) {
        console.error("Cycle JSON error:", e);
      }
      try {
        profileData = await profileRes.json();
      } catch (e) {
        console.error("Profile JSON error:", e);
      }

      const latestCycle = Array.isArray(cycleData)
        ? cycleData[cycleData.length - 1]
        : cycleData;

      const formName = latestCycle?.formName || "Educational Assistance";
      const isFormOpen = latestCycle?.isOpen ?? false;
      const hasProfile = profileData && profileData._id ? true : false;

      console.log("Form open:", isFormOpen, "Has profile:", hasProfile);

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
          if (result.isConfirmed) {
            window.location.href = "confirmation/html/educConfirmation.html";
          }
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
          if (result.isConfirmed) {
            window.location.href = "confirmation/html/educConfirmation.html";
          }
        });
        return;
      }

      // CASE 4: Form open, no profile → Go to form
      window.location.href = "Educational-assistance-user.html";
    })
    .catch(err => {
      console.error("Error checking form status or profile:", err);
      window.location.href = "Educational-assistance-user.html";
    });
  }

  // ✅ Attach event listeners properly
  const kkProfileNavBtn = document.querySelector('.navbar-center a[href="./kkform-personal.html"]');
  const kkProfileNavBtnMobile = document.getElementById('kkProfileNavBtnMobile');

  if (kkProfileNavBtn) {
    console.log("✅ Desktop KK Profile button found");
    kkProfileNavBtn.addEventListener('click', handleKKProfileNavClick);
  } else {
    console.warn("⚠️ Desktop KK Profile button NOT found");
  }

  if (kkProfileNavBtnMobile) {
    console.log("✅ Mobile KK Profile button found");
    kkProfileNavBtnMobile.addEventListener('click', handleKKProfileNavClick);
  } else {
    console.warn("⚠️ Mobile KK Profile button NOT found");
  }

  // Attach to desktop nav button
  const lgbtqProfileNavBtnDesktop = document.getElementById('lgbtqProfileNavBtnDesktop');
  if (lgbtqProfileNavBtnDesktop) {
    lgbtqProfileNavBtnDesktop.addEventListener('click', handleLGBTQProfileNavClick);
  }
  // Attach to mobile nav button
  const lgbtqProfileNavBtnMobile = document.getElementById('lgbtqProfileNavBtnMobile');
  if (lgbtqProfileNavBtnMobile) {
    lgbtqProfileNavBtnMobile.addEventListener('click', handleLGBTQProfileNavClick);
  }

  const educAssistanceNavBtnDesktop = document.querySelector('.navbar-center a[href="./Educational-assistance-user.html"]');
const educAssistanceNavBtnMobile = document.querySelector('.navbar-mobile-menu a[href="./Educational-assistance-user.html"]');

if (educAssistanceNavBtnDesktop) {
  educAssistanceNavBtnDesktop.addEventListener('click', handleEducAssistanceNavClick);
}
if (educAssistanceNavBtnMobile) {
  educAssistanceNavBtnMobile.addEventListener('click', handleEducAssistanceNavClick);
}
});
