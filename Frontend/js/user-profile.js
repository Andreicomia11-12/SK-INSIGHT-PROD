import { setupVerifyEmail } from './verify-email.js';

// Load `check-rejected.js` dynamically from JS so pages don't need an HTML include.
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

// Token validation helper function

document.addEventListener("DOMContentLoaded", function () {
  // OTP lockout check on page load
  const unlockAt = localStorage.getItem('otpLockoutUntil');
  if (unlockAt && Date.now() < unlockAt) {
    const seconds = Math.ceil((Number(unlockAt) - Date.now()) / 1000);
    showOtpLockoutModal(Number(unlockAt));
    disableVerifyBtn(seconds);
  }

  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  let user = null; // keep user data so we can use birthday later
  let prevProfileImageUrl = null; // if we load a previous profile, store its image url
  let otpLockoutUntil = null;
  let verificationOtpLockoutUntil = null;

  // --- Apply stored verification OTP lockout ---
  const storedLockout = localStorage.getItem('verificationOtpLockoutUntil');
  if (storedLockout && Date.now() < Number(storedLockout)) {
    window.verificationOtpLockoutUntil = Number(storedLockout);
    updateVerificationOtpButtons();
    if (window.verificationOtpInterval) clearInterval(window.verificationOtpInterval);
    window.verificationOtpInterval = setInterval(() => {
      updateVerificationOtpButtons();
      if (!window.verificationOtpLockoutUntil || Date.now() >= window.verificationOtpLockoutUntil) {
        clearInterval(window.verificationOtpInterval);
        window.verificationOtpInterval = null;
        localStorage.removeItem('verificationOtpLockoutUntil');
      }
    }, 1000);
  }

  const changeEmailLockout = localStorage.getItem('changeEmailOtpLockoutUntil');
  if (changeEmailLockout && Date.now() < Number(changeEmailLockout)) {
    otpLockoutUntil = Number(changeEmailLockout);
    updateOtpSendButtons();
    const interval = setInterval(() => {
      updateOtpSendButtons();
      if (Date.now() >= otpLockoutUntil) {
        clearInterval(interval);
        otpLockoutUntil = null;
        localStorage.removeItem('changeEmailOtpLockoutUntil');
        updateOtpSendButtons();
      }
    }, 1000);
  }

  // Fetch User Info
  (async function () {
    try {
      const res = await fetch("http://localhost:5000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;

      user = await res.json();

      // Username
      const usernameElem = document.querySelector(".profile-container h3");
      if (usernameElem) {
        usernameElem.textContent = user.username || "";
      }

      // Email
      const emailElem = document.querySelector(".profile-container p");
      if (emailElem) {
        emailElem.textContent = user.email || "";
      }

      // Verified status
      const verifiedElem = document.querySelector(".profile-container .verified");
      if (verifiedElem) {
        if (user.isVerified) {
          verifiedElem.innerHTML = `Verified <i class="fa-solid fa-circle-check" style="color: #4caf50"></i>`;
        } else {
          verifiedElem.innerHTML = `Not Verified <i class="fa-solid fa-circle-check" style="color: #d4d4d4"></i>`;
        }
      }

      // Show verification-strip banner when user is NOT verified
      const verificationStrip = document.getElementById('verification-strip');
      if (verificationStrip) {
        if (user && !user.isVerified) {
          // make it visible (uses flex layout in CSS)
          verificationStrip.style.display = 'flex';

          // Wire the Verify Now link to open the verification modal or trigger verify flow
          const verifyNowLink = verificationStrip.querySelector('a');
          if (verifyNowLink) {
            verifyNowLink.addEventListener('click', function (ev) {
              ev.preventDefault();
              // Only open the verification modal (do NOT open settings modal behind it)
              try {
                const verifyBtn = document.querySelector('.verify-btn');
                if (verifyBtn) {
                  verifyBtn.click();
                  return;
                }
              } catch (e) {
                // ignore and fallback to opening modal directly
              }

              // Fallback: open verify modal directly if verify button isn't present
              const verifyEmailModal = document.getElementById('verifyEmailModal');
              const verifyEmailInput = document.getElementById('verifyEmailInput');
              if (verifyEmailModal) {
                // populate email if available
                if (verifyEmailInput && user && user.email) verifyEmailInput.value = user.email;
                verifyEmailModal.classList.add('active');
                // ensure OTP section is hidden and send button visible (match verify-email.js open behavior)
                const verifyOtpSection = document.getElementById('verifyOtpSection');
                const sendVerifyOtpBtn = document.getElementById('sendVerifyOtpBtn');
                const verifyResendOtp = document.getElementById('verifyResendOtp');
                const verifyResendInfo = document.getElementById('verifyResendInfo');
                if (verifyOtpSection) verifyOtpSection.style.display = 'none';
                if (sendVerifyOtpBtn) sendVerifyOtpBtn.style.display = '';
                if (verifyResendOtp) verifyResendOtp.style.display = '';
                if (verifyResendInfo) verifyResendInfo.style.display = 'none';
              }
            });
          }
        } else {
          verificationStrip.style.display = 'none';
        }
      }

      // Disable navigation buttons when account is not verified
      (function toggleNavDisabledForUnverified() {
        const navIds = [
          'kkProfileNavBtnDesktop',
          'lgbtqProfileNavBtnDesktop',
          'educAssistanceNavBtnDesktop',
          'kkProfileNavBtnMobile',
          'lgbtqProfileNavBtnMobile',
          'educAssistanceNavBtnMobile'
        ];
        const shouldDisable = user && !user.isVerified;
        navIds.forEach(id => {
          const el = document.getElementById(id);
          if (!el) return;
          if (shouldDisable) {
            el.classList.add('disabled');
            el.setAttribute('aria-disabled', 'true');
            // For anchors, prevent navigation via href by setting role/button
            el.style.pointerEvents = 'auto'; // keep pointer to allow click handler to show warning
          } else {
            el.classList.remove('disabled');
            el.removeAttribute('aria-disabled');
            el.style.pointerEvents = '';
          }
        });
      })();

      // Birthday input (from User)
      const birthdayInput = document.getElementById("birthday");
      if (birthdayInput && user.birthday) {
        birthdayInput.value = user.birthday.split("T")[0]; // format yyyy-mm-dd
        birthdayInput.readOnly = true;
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Server Error",
        text: "Could not fetch user profile. Please try again.",
        confirmButtonColor: "#0A2C59"
      });
    }

    // Ensure age is always computed from the account `user.birthday` (from /api/users/me)
    // This guarantees the age increments correctly over time even when showing previous-cycle profile data.
    function displayComputedAge(birthday) {
      if (!birthday) return;
      const noteId = 'computed-age-note';
      let noteEl = document.getElementById(noteId);
      const age = calculateAge(birthday);
      const dateStr = birthday.split('T')[0];
      if (!noteEl) {
        const ageInput = document.getElementById('age');
        if (!ageInput || !ageInput.parentNode) return;
        noteEl = document.createElement('div');
        noteEl.id = noteId;
        noteEl.style.fontSize = '12px';
        noteEl.style.color = '#555';
        noteEl.style.marginTop = '4px';
        noteEl.style.fontStyle = 'italic';
        ageInput.parentNode.insertBefore(noteEl, ageInput.nextSibling);
      }
      // Update note text every time so it reflects the current computed age
      noteEl.textContent = `Age computed from account birthday (${dateStr}): ${age}`;
    }

    if (user && user.birthday) {
      setValue('age', calculateAge(user.birthday));
      displayComputedAge(user.birthday);
    }

    // Helper: set input value
    function setValue(id, value) {
      const el = document.getElementById(id);
      if (el) el.value = value || "";
    }

    // Helper: calculate age from birthday
    function calculateAge(birthday) {
      if (!birthday) return "";
      const birthDate = new Date(birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }

    // Fetch KKProfile Data (Full Name, Gender, etc.)
    try {
      const kkRes = await fetch("http://localhost:5000/api/kkprofiling/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (kkRes.ok) {
        const kkProfile = await kkRes.json();

        // Construct full name: firstname middle initial lastname
        const middleInitial = kkProfile.middlename
          ? kkProfile.middlename.charAt(0).toUpperCase() + "."
          : "";
        const fullName = [
          kkProfile.firstname || "",
          middleInitial,
          kkProfile.lastname || ""
        ]
          .filter(Boolean)
          .join(" ");
        setValue("fullName", fullName);

        // ✅ Age comes from User's birthday
        if (user && user.birthday) {
          setValue("age", calculateAge(user.birthday));
        }

        setValue("gender", kkProfile.gender);
        setValue("youthClassification", kkProfile.youthClassification);
        setValue("civilStatus", kkProfile.civilStatus);
        setValue("purok", kkProfile.purok);
      } else {
        // If no KK profile for current cycle (404), try to fetch the user's most recent previous profile
        if (kkRes.status === 404) {
          console.info('No KK profile for current cycle; attempting to fetch previous cycle profile');
          try {
            const prevRes = await fetch('http://localhost:5000/api/kkprofiling/me/previous', { headers: { Authorization: `Bearer ${token}` } });
            if (prevRes.ok) {
              const prev = await prevRes.json();
              // populate fields from previous profile
              const middleInitial = prev.middlename ? prev.middlename.charAt(0).toUpperCase() + '.' : '';
              const fullName = [prev.firstname || '', middleInitial, prev.lastname || ''].filter(Boolean).join(' ');
              if (fullName) setValue('fullName', fullName);
              if (user && user.birthday) setValue('age', calculateAge(user.birthday));
              if (prev.gender) setValue('gender', prev.gender);
              if (prev.youthClassification) setValue('youthClassification', prev.youthClassification);
              if (prev.civilStatus) setValue('civilStatus', prev.civilStatus);
              if (prev.purok) setValue('purok', prev.purok);
              // If profileImage is present, set profile image immediately
              const profileImg = document.getElementById('profile-img');
              if (profileImg && prev.profileImage) {
                const imageUrl = prev.profileImage;
                const resolved = imageUrl.startsWith('http') ? imageUrl : `http://localhost:5000/${imageUrl}`;
                prevProfileImageUrl = resolved;
                profileImg.src = resolved;
              }
            } else {
              console.info('No previous KK profile available; falling back to user data');
              if (user) {
                const firstNameFallback = user.firstname || user.firstName || user.givenName || '';
                const lastNameFallback = user.lastname || user.lastName || user.familyName || user.surname || '';
                const middleInitialFromUser = (user.middlename || user.middleName) ? (user.middlename || user.middleName).charAt(0).toUpperCase() + '.' : '';
                const fullName = [firstNameFallback, middleInitialFromUser, lastNameFallback].filter(Boolean).join(' ');
                if (fullName) setValue('fullName', fullName);
                if (user.birthday) setValue('age', calculateAge(user.birthday));
                if (user.gender || user.sex) setValue('gender', user.gender || user.sex);
                if (user.purok) setValue('purok', user.purok);
                if (user.civilstatus || user.civilStatus) setValue('civilStatus', user.civilstatus || user.civilStatus);
              }
            }
          } catch (e) {
            console.warn('Failed to fetch previous KK profile', e);
            if (user) {
              const firstNameFallback = user.firstname || user.firstName || user.givenName || '';
              const lastNameFallback = user.lastname || user.lastName || user.familyName || user.surname || '';
              const middleInitialFromUser = (user.middlename || user.middleName) ? (user.middlename || user.middleName).charAt(0).toUpperCase() + '.' : '';
              const fullName = [firstNameFallback, middleInitialFromUser, lastNameFallback].filter(Boolean).join(' ');
              if (fullName) setValue('fullName', fullName);
              if (user.birthday) setValue('age', calculateAge(user.birthday));
              if (user.gender || user.sex) setValue('gender', user.gender || user.sex);
            }
          }
        } else {
          console.warn('Failed to fetch KK profile:', kkRes.status, kkRes.statusText);
        }
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Server Error",
        text: "Could not fetch user profile. Please try again.",
        confirmButtonColor: "#0A2C59"
      });
    }

    // Fetch profile image
    try {
      const profileImg = document.getElementById("profile-img");
      // If we already resolved a previous profile image, prefer it and skip calling /me/image
      if (prevProfileImageUrl && profileImg) {
        profileImg.src = prevProfileImageUrl;
      } else {
      const imgRes = await fetch("http://localhost:5000/api/kkprofiling/me/image", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (imgRes.ok) {
        const { imageUrl } = await imgRes.json();
        if (profileImg) {
          if (imageUrl) {
            profileImg.src = imageUrl.startsWith("http") ? imageUrl : `http://localhost:5000/${imageUrl}`;
          } else {
            // No KK profile image, use default
            profileImg.src = "../../assets/default-profile.jpg";
          }
        }
      } else if (profileImg) {
        // No KK profile image for current cycle — try to fall back to any existing profile image or user avatar
        console.info('No KK profile image for current cycle; falling back to user avatar or default');
        // Try to use a user.avatar or user.profileImage if available
        if (user && (user.avatar || user.profileImage)) {
          profileImg.src = user.avatar || user.profileImage;
        } else {
          profileImg.src = "../../assets/default-profile.jpg";
        }
      }
      }
    } catch (err) {
      const profileImg = document.getElementById("profile-img");
      if (profileImg) {
        profileImg.src = "../../assets/default-profile.jpg";
      }
    }

    // --- INITIALIZATION --- (moved here, after DOM/user is ready)
    const unverifiedEmailSection = document.getElementById("unverifiedEmailSection");
    const changeEmailForm = document.getElementById("changeEmailForm");

    if (user && !user.isVerified) {
      if (unverifiedEmailSection) unverifiedEmailSection.style.display = "";
      if (changeEmailForm) changeEmailForm.style.display = "none";
    } else {
      if (unverifiedEmailSection) unverifiedEmailSection.style.display = "none";
      if (changeEmailForm) changeEmailForm.style.display = "";
    }

    // Add the event handler for unverified email change here:
    const unverifiedChangeEmailBtn = document.getElementById("unverifiedChangeEmailBtn");
    if (unverifiedChangeEmailBtn) {
      unverifiedChangeEmailBtn.addEventListener("click", async function () {
        const newEmail = document.getElementById("unverifiedNewEmailInput").value?.trim();
        if (!newEmail) {
          Swal.fire({ icon: "error", title: "Invalid Email", text: "Please enter a valid new email.", confirmButtonColor: "#0A2C59" });
          return;
        }
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        try {
          const res = await fetch("http://localhost:5000/api/users/change-email/unverified", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ newEmail })
          });
          const data = await res.json();
          if (!res.ok) {
            Swal.fire({ icon: "error", title: "Change Failed", text: data.message || "Failed to change email.", confirmButtonColor: "#0A2C59" });
            return;
          }
          Swal.fire({ icon: "success", title: "Email Changed", text: "Your email has been updated.", confirmButtonColor: "#0A2C59" }).then(() => {
            document.getElementById("settingsModal").classList.remove("active");
            window.location.reload();
          });
        } catch (err) {
          Swal.fire({ icon: "error", title: "Server Error", text: "Could not change email. Please try again.", confirmButtonColor: "#0A2C59" });
        }
      });
    }

    // ✅ Use the new modular verify email logic
    setupVerifyEmail(user);

    // --- Place all code that references changeEmailForm below its initialization ---
    // For example, your changeEmailForm submit handler:
    if (changeEmailForm) {
      changeEmailForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const currentEmail = document.getElementById("currentEmail").value;
        const newEmail = document.getElementById("newEmailInput").value?.trim();
        const confirmEmail = document.getElementById("confirmNewEmailInput").value?.trim();
        if (newEmail !== confirmEmail) {
          Swal.fire({
            icon: "error",
            title: "Email Mismatch",
            text: "New emails do not match.",
            confirmButtonColor: "#0A2C59"
          });
          return;
        }
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        try {
          const res = await fetch("http://localhost:5000/api/users/change-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ currentEmail, newEmail })
          });
          const data = await res.json();
          if (res.ok) {
            Swal.fire({
              icon: "success",
              title: "Email Changed",
              text: "Your email has been updated. Please verify your new email.",
              confirmButtonColor: "#0A2C59"
            }).then(() => {
              document.getElementById("settingsModal").classList.remove("active");
              window.location.reload();
            });
          } else {
            Swal.fire({
              icon: "error",
              title: "Change Failed",
              text: data.message || "Failed to change email.",
              confirmButtonColor: "#0A2C59"
            });
          }
        } catch (err) {
          Swal.fire({
            icon: "error",
            title: "Server Error",
            text: "Could not change email. Please try again.",
            confirmButtonColor: "#0A2C59"
          });
        }
      });
    }

    // Place any other logic that uses changeEmailForm here.

  })();

  // Move this to the top, before updateOtpSendButtons and before any usage:
  const sendEmailOtpBtn = document.getElementById("sendEmailOtpBtn");

  function updateOtpSendButtons() {
    sendEmailOtpBtn.disabled = false;
    const now = Date.now();
    if (otpLockoutUntil && now < otpLockoutUntil) {
      sendEmailOtpBtn.disabled = true;
      if (resendAnchor) resendAnchor.style.pointerEvents = "none";
      const left = Math.ceil((otpLockoutUntil - now) / 1000);
      const m = Math.floor(left / 60);
      const s = left % 60;
      sendEmailOtpBtn.textContent = `Send OTP (${m}:${s.toString().padStart(2, "0")})`;
      if (resendAnchor) resendAnchor.textContent = `Resend OTP (${m}:${s.toString().padStart(2, "0")})`;
    } else {
      sendEmailOtpBtn.disabled = false;
      sendEmailOtpBtn.textContent = "Send OTP";
      if (resendAnchor) {
        resendAnchor.style.pointerEvents = "";
        resendAnchor.textContent = "Resend OTP";
      }
    }
  }

  function updateVerificationOtpButtons() {
    const now = Date.now();
    const verifyBtn = document.querySelector('.verify-btn');
    const resendAnchor = document.getElementById('verificationResendOtp');
    if (verificationOtpLockoutUntil && now < verificationOtpLockoutUntil) {
      const left = Math.ceil((verificationOtpLockoutUntil - now) / 1000);
      const m = Math.floor(left / 60);
      const s = left % 60;
      if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.textContent = `Verify Account (${m}:${s.toString().padStart(2, "0")})`;
      }
      if (resendAnchor) {
        resendAnchor.style.pointerEvents = "none";
        resendAnchor.textContent = `Resend OTP (${m}:${s.toString().padStart(2, "0")})`;
      }
    } else {
      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.textContent = "Verify Account";
      }
      if (resendAnchor) {
        resendAnchor.style.pointerEvents = "";
        resendAnchor.textContent = "Resend OTP";
      }
    }
  }

  // Call this after every OTP send or on modal open
  async function checkOtpSendLockout() {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    try {
      const res = await fetch("http://localhost:5000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const user = await res.json();
        if (
          user.emailChangeOtpSendWindowStart &&
          user.emailChangeOtpSendCount >= 2 &&
          Date.now() - user.emailChangeOtpSendWindowStart < 2 * 60 * 1000
        ) {
          otpLockoutUntil = user.emailChangeOtpSendWindowStart + 2 * 60 * 1000;
          localStorage.setItem('changeEmailOtpLockoutUntil', otpLockoutUntil);
          updateOtpSendButtons();
          // Start timer only if backend says so
          const interval = setInterval(() => {
            updateOtpSendButtons();
            if (Date.now() >= otpLockoutUntil) {
              clearInterval(interval);
              otpLockoutUntil = null;
              localStorage.removeItem('changeEmailOtpLockoutUntil');
              updateOtpSendButtons();
            }
          }, 1000);
        } else {
          otpLockoutUntil = null;
          localStorage.removeItem('changeEmailOtpLockoutUntil');
          updateOtpSendButtons();
        }
      }
    } catch (err) {
      // ignore
    }
  }

  async function checkVerificationOtpLockout(email) {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const user = await res.json();
        if (
          user.emailVerificationOtpSendWindowStart &&
          user.emailVerificationOtpSendCount >= 2 &&
          Date.now() - user.emailVerificationOtpSendWindowStart < 2 * 60 * 1000
        ) {
          verificationOtpLockoutUntil = user.emailVerificationOtpSendWindowStart + 2 * 60 * 1000;
          setVerificationLockout(verificationOtpLockoutUntil); // <-- persist lockout
          updateVerificationOtpButtons();
          if (window.verificationOtpInterval) clearInterval(window.verificationOtpInterval);
          window.verificationOtpInterval = setInterval(() => {
            updateVerificationOtpButtons();
            if (!verificationOtpLockoutUntil || Date.now() >= verificationOtpLockoutUntil) {
              clearInterval(window.verificationOtpInterval);
              window.verificationOtpInterval = null;
              clearVerificationLockout(); // clear when done
            }
          }, 1000);
        } else {
          verificationOtpLockoutUntil = null;
          updateVerificationOtpButtons();
          if (window.verificationOtpInterval) {
            clearInterval(window.verificationOtpInterval);
            window.verificationOtpInterval = null;
          }
          clearVerificationLockout(); // clear if no lockout
        }
      }
    } catch (err) {
      // ignore
    }
  }

  // Logout button functionality
  const logoutBtn = document.querySelector('.logout-btn');
  // ...existing code...
if (logoutBtn) {
  logoutBtn.addEventListener('click', function (e) {
    e.preventDefault();
    Swal.fire({
      title: 'Are you sure you want to log out?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, log out',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
          // Clear persistent localStorage completely (user intentionally logs out)
          try { localStorage.clear(); } catch (e) { /* ignore */ }

          // Remove common session keys used by multi-step forms and auth
          try {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('kkProfileStep1');
            sessionStorage.removeItem('kkProfileStep2');
            sessionStorage.removeItem('kkProfileStep3');
            sessionStorage.removeItem('lgbtqDraft');

            // Remove any other session keys that look like drafts or kkProfile data
            const toRemove = [];
            for (let i = 0; i < sessionStorage.length; i++) {
              const key = sessionStorage.key(i);
              if (!key) continue;
              const lower = key.toLowerCase();
              if (lower.includes('draft') || lower.includes('kkprofil') || lower.includes('kkprofile') || lower.startsWith('kkprofile')) {
                toRemove.push(key);
              }
            }
            toRemove.forEach(k => sessionStorage.removeItem(k));
          } catch (e) { /* ignore storage errors */ }

          // Finally redirect to home
          window.location.href = './index.html'; // Adjust path if needed
        }
    });
  });
}
// ...existing code...

  const hamburger = document.getElementById('navbarHamburger');
  const mobileMenu = document.getElementById('navbarMobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function (e) {
      e.stopPropagation();
      mobileMenu.classList.toggle('active');
    });
    // Ensure the dropdown menu hides when clicking outside of it
    document.addEventListener('click', function (e) {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('active');
      }
    });
  }

  // --- SETTINGS ICON & MODAL ---
  const settingsIcon = document.getElementById("settingsIcon");
  const settingsModal = document.getElementById("settingsModal");
  const closeSettings = document.querySelector(".close-settings");
  const tabs = document.querySelectorAll(".settings-tab");
  const tabContents = {
    password: document.getElementById("settingsTabPassword"),
    email: document.getElementById("settingsTabEmail")
  };

  // Open modal
  settingsIcon.addEventListener("click", () => {
    settingsModal.classList.add("active");
    document.getElementById("currentEmail").value =
      document.querySelector(".profile-container p").textContent || "";
    checkResendLockoutOnOpen();
    checkOtpSendLockout();
  });

  // Close modal
  closeSettings.addEventListener("click", () => {
    settingsModal.classList.remove("active");
    resetSettingsModal();
  });

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      Object.values(tabContents).forEach(c => (c.style.display = "none"));
      tabContents[tab.dataset.tab].style.display = "";
    });
  });

  // --- Password visibility toggles ---
  // Adds a small eye icon button to toggle password visibility for inputs
  function attachPasswordToggle(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    // Create or reuse a container that will hold the input and the toggle
    let container = input.closest('.pw-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'pw-container';
      // make the container take the same width as the input
      container.style.display = 'inline-block';
      container.style.width = input.style.width || getComputedStyle(input).width || '100%';
      container.style.position = 'relative';
      input.parentNode.insertBefore(container, input);
      container.appendChild(input);
    } else {
      if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    }

    // ensure input has right padding so the button doesn't overlap text
    const existingPadding = parseInt(window.getComputedStyle(input).paddingRight || '0', 10) || 0;
    input.style.paddingRight = Math.max(existingPadding, 44) + 'px';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pw-toggle';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', 'Show password');
    btn.style.position = 'absolute';
    btn.style.right = '10px';
    btn.style.top = '50%';
    btn.style.transform = 'translateY(-50%)';
    btn.style.border = 'none';
    btn.style.background = 'transparent';
    btn.style.cursor = 'pointer';
    btn.style.color = '#143d77';
    btn.style.fontSize = '1rem';
    btn.style.padding = '4px';
    btn.innerHTML = '<i class="fa-solid fa-eye" aria-hidden="true"></i>';

    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      if (input.type === 'password') {
        input.type = 'text';
        btn.setAttribute('aria-pressed', 'true');
        btn.setAttribute('aria-label', 'Hide password');
        btn.innerHTML = '<i class="fa-solid fa-eye-slash" aria-hidden="true"></i>';
      } else {
        input.type = 'password';
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', 'Show password');
        btn.innerHTML = '<i class="fa-solid fa-eye" aria-hidden="true"></i>';
      }
    });

    // Append the button inside the container so it overlays the input
    container.appendChild(btn);
  }

  // Attach toggles for change-password inputs if present
  ['currentPassword', 'newPassword', 'confirmNewPassword'].forEach(id => attachPasswordToggle(id));

  // --- Change Password ---
  document.getElementById("changePasswordForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmNewPassword = document.getElementById("confirmNewPassword").value;
    if (newPassword !== confirmNewPassword) {
      Swal.fire({
        icon: "error",
        title: "Password Mismatch",
        text: "New passwords do not match.",
        confirmButtonColor: "#0A2C59"
      });
      return;
    }
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    try {
      const res = await fetch("http://localhost:5000/api/users/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Password Changed",
          text: "Your password has been updated.",
          confirmButtonColor: "#0A2C59"
        });
        settingsModal.classList.remove("active");
        resetSettingsModal();
      } else {
        Swal.fire({
          icon: "error",
          title: "Change Failed",
          text: data.message || "Failed to change password.",
          confirmButtonColor: "#0A2C59"
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Server Error",
        text: "Could not change password. Please try again.",
        confirmButtonColor: "#0A2C59"
      });
    }
  });

  // --- Change Email ---
  const emailOtpSection = document.getElementById("emailOtpSection");
  const verifyEmailOtpBtn = document.getElementById("verifyEmailOtpBtn");
  const newEmailSection = document.getElementById("newEmailSection");
  const verifyResendInfo = document.getElementById("verifyResendInfo");

  let otpVerifiedForChange = false;
  let verifiedOtpValue = null;
  let otpTimerInterval = null;
  let otpExpiresAt = null;

  // Resend control: allow one immediate resend, then lock for 2 minutes
  let resendRemaining = 1;
  let resendLockUntil = null;
  let resendTimerInterval = null;
  const resendWrapper = document.getElementById("resendOtpLink");
  const resendAnchor = document.getElementById("changeResendOtp") || resendWrapper?.querySelector("a");
  const changeResendInfo = document.getElementById("changeResendInfo");

  function setResendVisible(visible) {
    if (!resendWrapper) return;
    resendWrapper.style.display = visible ? "" : "none";
  }

  function startResendCooldown(ms) {
    resendLockUntil = Date.now() + ms;
    if (resendAnchor) {
      resendAnchor.style.pointerEvents = "none";
    }
    updateResendCountdown();
    if (resendTimerInterval) clearInterval(resendTimerInterval);
    resendTimerInterval = setInterval(() => {
      updateResendCountdown();
    }, 1000);
  }

  function updateResendCountdown() {
    if (!resendWrapper) return;
    const now = Date.now();
    if (!resendLockUntil || now >= resendLockUntil) {
      if (resendTimerInterval) {
        clearInterval(resendTimerInterval);
        resendTimerInterval = null;
      }
      resendLockUntil = null;
      resendRemaining = 1;
      if (resendAnchor) {
        resendAnchor.textContent = "Resend OTP";
        resendAnchor.style.pointerEvents = "";
      }
      return;
    }
    const left = Math.ceil((resendLockUntil - now) / 1000);
    const m = Math.floor(left / 60);
    const s = left % 60;
    if (resendAnchor) resendAnchor.textContent = `Resend in ${m}:${s.toString().padStart(2, "0")}`;
  }

  // When OTP is sent
  sendEmailOtpBtn.addEventListener("click", async function () {
    const currentEmail = document.getElementById("currentEmail").value;

    // ✅ Always fetch latest user data
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    let userData;
    try {
      const res = await fetch("http://localhost:5000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        userData = await res.json();
      }
    } catch (err) {
      userData = null;
    }
    const isVerified = userData && userData.isVerified;

    if (isVerified) {
      const result = await Swal.fire({
        icon: "warning",
        title: "Change Verified Email?",
        html: "Are you sure you want to change your email? Your current email is already verified.<br><br><b>Note:</b> Changing your email will require you to re-verify your new email address.",
        showCancelButton: true,
        confirmButtonText: "Yes",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#0A2C59"
      });
      if (!result.isConfirmed) {
        sendEmailOtpBtn.disabled = false;
        return;
      }
    }

    sendEmailOtpBtn.disabled = true;
    Swal.fire({
      title: "Sending OTP...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const res = await fetch("http://localhost:5000/api/users/change-email/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      });

      let data;
      const raw = await res.text();
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (e) {
        data = { message: raw };
      }
      Swal.close();

      if (res.ok) {
        // Only reset UI on success
        Swal.fire({
          icon: "success",
          title: "OTP Sent",
          text: "Check your email for the OTP code.",
          confirmButtonColor: "#0A2C59"
        });
        // Hide current email input
        const currentEmailInput = document.getElementById("currentEmail");
        if (currentEmailInput) currentEmailInput.style.display = "none";

        // Hide ONLY the "Current Verified Email" label
        const emailForm = document.getElementById("changeEmailForm");
        if (emailForm) {
          const labels = emailForm.querySelectorAll("label");
          labels.forEach(label => {
            if (label.textContent.trim() === "Current Verified Email") {
              label.style.display = "none";
            }
          });
        }

        // Hide Send OTP button
        sendEmailOtpBtn.style.display = "none";

        // Show OTP section
        emailOtpSection.style.display = "";

        // Hide verified badge so only OTP UI shows
        const modalVerified = document.querySelector("#settingsModal .verified");
        if (modalVerified) modalVerified.style.display = "none";

        otpExpiresAt = Date.now() + 10 * 60 * 1000;
        startEmailOtpTimer();
        setupOtpInputs();
        resendRemaining = 1;
        setResendVisible(true);
        if (resendAnchor) {
          resendAnchor.textContent = "Resend OTP";
          resendAnchor.style.pointerEvents = "";
          resendAnchor.style.display = "";
        }
        if (verifyResendInfo) verifyResendInfo.style.display = "none";
      } else {
        // show info area; only permanently remove resend if server returns 429 (too many requests)
        if (changeResendInfo) changeResendInfo.style.display = "";

        if (res.status === 429) {
          // backend lockout -> hide resend link and show message (same behavior as verify-email)
          if (resendAnchor) resendAnchor.style.display = "none";
          if (changeResendInfo) changeResendInfo.textContent = data.message || "Too many OTP requests. Please wait 2 minutes.";
        } else {
          if (resendAnchor) {
            resendAnchor.style.display = "";
            resendAnchor.style.pointerEvents = "";
          }
        }

        Swal.fire({
          icon: "error",
          title: "Send Failed",
          text: data.message || "Failed to send OTP.",
          confirmButtonColor: "#0A2C59"
        });
      }
    } catch (err) {
      Swal.close();
      // network error: keep resend visible so user can try again
      if (changeResendInfo) changeResendInfo.style.display = "";
      if (resendAnchor) {
        resendAnchor.style.display = "";
        resendAnchor.style.pointerEvents = "";
      }
      Swal.fire({
        icon: "error",
        title: "Server Error",
        text: "Could not send OTP. Please try again.",
        confirmButtonColor: "#0A2C59"
      });
    } finally {
      // ensure button re-enabled if not hidden
      if (sendEmailOtpBtn && sendEmailOtpBtn.style.display !== "none") {
        sendEmailOtpBtn.disabled = false;
      }
    }
  });

  // Verify OTP (new behaviour: verify then reveal new-email form)
  verifyEmailOtpBtn.addEventListener("click", async function () {
    const otp = Array.from(document.querySelectorAll("#emailOtpInputs .otp-input"))
      .map(input => input.value)
      .join("");
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      Swal.fire({ icon: "error", title: "Invalid OTP", text: "Please enter the 6-digit OTP.", confirmButtonColor: "#0A2C59" });
      return;
    }
    verifyEmailOtpBtn.disabled = true;
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    try {
      const res = await fetch("http://localhost:5000/api/users/change-email/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ otp })
      });
      const data = await (res.headers.get("content-type")?.includes("application/json") ? res.json() : Promise.resolve({ message: await res.text() }));
      if (!res.ok) {
        Swal.fire({ icon: "error", title: "Verification Failed", text: data.message || "Invalid or expired OTP.", confirmButtonColor: "#0A2C59" });
        verifyEmailOtpBtn.disabled = false;
        return;
      }
      // success: reveal new email input
      otpVerifiedForChange = true;
      verifiedOtpValue = otp;
      emailOtpSection.style.display = "none";
      newEmailSection.style.display = "";
      Swal.fire({ icon: "success", title: "OTP Verified", text: "You may now enter a new email address.", confirmButtonColor: "#0A2C59" });
    } catch (err) {
      console.error("Change-email verify error:", err);
      Swal.fire({ icon: "error", title: "Server Error", text: "Could not verify OTP. Please try again.", confirmButtonColor: "#0A2C59" });
      verifyEmailOtpBtn.disabled = false;
    }
  });

  // Submit change email form
  changeEmailForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!otpVerifiedForChange) {
      Swal.fire({ icon: "warning", title: "OTP Required", text: "Please verify the OTP first.", confirmButtonColor: "#0A2C59" });
      return;
    }
    const newEmail = document.getElementById("newEmailInput").value?.trim();
    if (!newEmail) {
      Swal.fire({ icon: "error", title: "Invalid Email", text: "Please enter a valid new email.", confirmButtonColor: "#0A2C59" });
      return;
    }
    verifyEmailOtpBtn.disabled = true;
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/users/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newEmail, otp: verifiedOtpValue })
      });
      const data = await (res.headers.get("content-type")?.includes("application/json") ? res.json() : Promise.resolve({ message: await res.text() }));
      if (!res.ok) {
        Swal.fire({ icon: "error", title: "Change Failed", text: data.message || "Failed to change email.", confirmButtonColor: "#0A2C59" });
        verifyEmailOtpBtn.disabled = false;
        // Do NOT reload or reset modal here
        return;
      }
      Swal.fire({ icon: "success", title: "Email Changed", text: "Your email has been updated. Please verify your new email.", confirmButtonColor: "#0A2C59" }).then(() => {
        settingsModal.classList.remove("active");
        resetSettingsModal();
        window.location.reload();
      });
    } catch (err) {
      console.error("Change email submit error:", err);
      Swal.fire({ icon: "error", title: "Server Error", text: "Could not change email. Please try again.", confirmButtonColor: "#0A2C59" });
      verifyEmailOtpBtn.disabled = false;
      // Do NOT reload or reset modal here
    }
  });

  /**
   * Start email OTP countdown and update UI.
   * Uses otpExpiresAt and otpTimerInterval declared earlier.
   */
  function startEmailOtpTimer() {
    const timerEl = document.getElementById("emailOtpTimer");
    const resendWrapper = document.getElementById("resendOtpLink");
    const sendBtn = document.getElementById("sendEmailOtpBtn");

    // clear existing
    if (otpTimerInterval) {
      clearInterval(otpTimerInterval);
      otpTimerInterval = null;
    }

    if (!otpExpiresAt) {
      if (timerEl) timerEl.textContent = "";
      if (resendWrapper) resendWrapper.style.display = "";
      return;
    }

    // show timer but DO NOT permanently disable/hide the resend anchor here
    if (resendWrapper && resendAnchor) {
      // keep it visible; don't set pointerEvents to none so user can still click resend
      resendWrapper.style.display = "";
    }
    if (sendBtn) sendBtn.disabled = true;

    function update() {
      const msLeft = otpExpiresAt - Date.now();
      if (msLeft <= 0) {
        clearInterval(otpTimerInterval);
        otpTimerInterval = null;
        if (timerEl) timerEl.textContent = "OTP expired. You can resend.";
        if (resendWrapper && resendAnchor) {
          // allow clicking again after expiry
          resendAnchor.style.pointerEvents = "";
          resendAnchor.classList.remove('disabled');
        }
        if (sendBtn) sendBtn.disabled = false;
        return;
      }
      const sec = Math.ceil(msLeft / 1000);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      if (timerEl) timerEl.textContent = `OTP expires in ${m}:${s.toString().padStart(2, "0")}`;
    }

    update();
    otpTimerInterval = setInterval(update, 1000);
  }

  /**
   * Render/setup six OTP input boxes inside #emailOtpInputs and wire focus behavior.
   * If container not present, creates one inside newEmailSection (if exists).
   */
  function setupOtpInputs() {
    let container = document.getElementById("emailOtpInputs");
    const newEmailSection = document.getElementById("newEmailSection");

    if (!container) {
      // create container and append to newEmailSection or settings modal
      container = document.createElement("div");
      container.id = "emailOtpInputs";
      container.style.display = "flex";
      container.style.gap = "8px";
      container.style.justifyContent = "center";
      if (newEmailSection) newEmailSection.appendChild(container);
      else document.body.appendChild(container);
    }

    container.innerHTML = "";
    for (let i = 0; i < 6; i++) {
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 1;
      input.className = "otp-input";
      input.style.width = "40px";
      input.style.fontSize = "1.5rem";
      input.style.textAlign = "center";
      input.autocomplete = "off";
      input.inputMode = "numeric";
      input.pattern = "[0-9]*";

      // Auto-advance on input
      input.addEventListener("input", function (e) {
        if (this.value.length === 1 && i < 5) {
          container.querySelectorAll(".otp-input")[i + 1].focus();
        }
        // Paste support: fill all boxes if 6 digits pasted
        if (e.inputType === "insertFromPaste") {
          const val = this.value;
          if (/^\d{6}$/.test(val)) {
            val.split("").forEach((digit, idx) => {
              container.querySelectorAll(".otp-input")[idx].value = digit;
            });
            container.querySelectorAll(".otp-input")[5].focus();
          }
        }
      });
      // Backspace: go to previous
      input.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && this.value === "" && i > 0) {
          container.querySelectorAll(".otp-input")[i - 1].focus();
        }
      });
      container.appendChild(input);
    }
    container.querySelector(".otp-input").focus();
  }

  function resetSettingsModal() {
    document.getElementById("changePasswordForm").reset();
    document.getElementById("changeEmailForm").reset();
    emailOtpSection.style.display = "none";
    newEmailSection.style.display = "none";
    sendEmailOtpBtn.disabled = false;
    verifyEmailOtpBtn.disabled = false;
    otpVerifiedForChange = false; // <-- FIXED
    document.getElementById("currentEmail").style.display = "";
    // Restore ONLY the "Current Verified Email" label
    const emailForm = document.getElementById("changeEmailForm");
    if (emailForm) {
      const labels = emailForm.querySelectorAll("label");
      labels.forEach(label => {
        if (label.textContent.trim() === "Current Verified Email") {
          label.style.display = "";
        }
      });
    }
    tabs.forEach(t => t.classList.remove("active"));
    tabs[0].classList.add("active");
    Object.values(tabContents).forEach((c, i) => c.style.display = i === 0 ? "" : "none");
    document.getElementById("resendOtpLink").style.display = "none";
  }

  // --- Resend OTP logic ---
  function showResendTimer(secondsLeft) {
    let timerEl = document.getElementById("resendOtpTimer");
    if (!timerEl) {
      timerEl = document.createElement("div");
      timerEl.id = "resendOtpTimer";
      timerEl.style.color = "#0A2C59";
      timerEl.style.fontSize = "0.95rem";
      timerEl.style.textAlign = "center";
      resendWrapper.parentNode.insertBefore(timerEl, resendWrapper.nextSibling);
    }
    let left = secondsLeft;
    resendAnchor.style.pointerEvents = "none";
    resendAnchor.textContent = `Resend OTP (${Math.floor(left / 60)}:${(left % 60).toString().padStart(2, "0")})`;
    function update() {
      left--;
      if (left < 0) {
        clearInterval(window.resendOtpTimerInterval);
        timerEl.textContent = "";
        resendAnchor.style.pointerEvents = "";
        resendAnchor.textContent = "Resend OTP";
        return;
      }
      const m = Math.floor(left / 60);
      const s = left % 60;
      timerEl.textContent = `Resend available in ${m}:${s.toString().padStart(2, "0")}`;
      resendAnchor.textContent = `Resend OTP (${m}:${s.toString().padStart(2, "0")})`;
    }
    clearInterval(window.resendOtpTimerInterval);
    update();
    window.resendOtpTimerInterval = setInterval(update, 1000);
  }

  if (resendAnchor) {
    let hasResent = false; // Add this flag
    resendAnchor.addEventListener("click", async function (e) {
      e.preventDefault();
      // prevent double-click while request is in-flight
      if (hasResent) return;
      hasResent = true;
      resendAnchor.textContent = "Sending...";
      // temporarily block repeat clicks for this request
      resendAnchor.style.pointerEvents = "none";
      Swal.fire({
        title: "Sending OTP...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });
      try {
        const res = await fetch("http://localhost:5000/api/users/change-email/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
        });
        const raw = await res.text();
        let data;
        try { data = raw ? JSON.parse(raw) : {}; } catch (e) { data = { message: raw }; }
        Swal.close();

        // show info area; only permanently remove resend if server returns 429 (too many requests)
        if (changeResendInfo) changeResendInfo.style.display = "";

        if (res.status === 429) {
          // backend enforces lockout -> hide the link and show info (same UX as verify-email)
          if (resendAnchor) resendAnchor.style.display = "none";
          if (changeResendInfo) changeResendInfo.textContent = data.message || "Too many OTP requests. Please wait 2 minutes.";
          // keep hasResent true so user can't try again
        } else {
          // allow further resends after this request completes
          if (resendAnchor) {
            resendAnchor.style.display = "";
            resendAnchor.style.pointerEvents = "";
          }
          hasResent = false;
        }

        if (res.ok) {
          Swal.fire({
            icon: "success",
            title: "OTP Sent",
            text: "Check your email for the OTP code.",
            confirmButtonColor: "#0A2C59"
          });
          otpExpiresAt = Date.now() + 10 * 60 * 1000;
          startEmailOtpTimer();
          setupOtpInputs();
        } else if (res.status !== 429) {
          Swal.fire({
            icon: "error",
            title: "Send Failed",
            text: data.message || "Failed to send OTP.",
            confirmButtonColor: "#0A2C59"
          });
        }
      } catch (err) {
        Swal.close();
        // network error: restore clickability so user can retry
        if (changeResendInfo) changeResendInfo.style.display = "";
        if (resendAnchor) {
          resendAnchor.style.pointerEvents = "";
        }
        hasResent = false;
        Swal.fire({
          icon: "error",
          title: "Server Error",
          text: "Could not send OTP. Please try again.",
          confirmButtonColor: "#0A2C59"
        });
      } finally {
        // restore text/pointer unless backend hidden the control (429 case)
        if (resendAnchor && resendAnchor.style.display !== "none") {
          resendAnchor.textContent = "Resend OTP";
          resendAnchor.style.pointerEvents = "";
          resendAnchor.classList.remove('disabled');
          if (changeResendInfo) changeResendInfo.style.display = "none";
        }
      }
    });
  }

  async function checkResendLockoutOnOpen() {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    try {
      const res = await fetch("http://localhost:5000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const user = await res.json();
        if (user.emailChangeOtpLockedUntil && user.emailChangeOtpLockedUntil > Date.now()) {
          const secondsLeft = Math.ceil((user.emailChangeOtpLockedUntil - Date.now()) / 1000);
          resendAnchor.style.pointerEvents = "none";
          showResendTimer(secondsLeft);
        } else {
          resendAnchor.style.pointerEvents = "";
          document.getElementById("resendOtpTimer")?.remove();
        }
      }
    } catch (err) {
      // ignore
    }
  }

  function setVerificationLockout(untilTimestamp) {
    localStorage.setItem('verificationOtpLockoutUntil', untilTimestamp);
  }

  function clearVerificationLockout() {
    localStorage.removeItem('verificationOtpLockoutUntil');
  }

  // Connect to Socket.IO server
  const socket = io('http://localhost:5000'); // adjust port if needed

  // Join room for this user (use email or userId)
  const userEmail = user?.email; // get user's email from profile
  if (userEmail) {
    socket.emit('join', { email: userEmail });
  }

  // Listen for lockout events
  socket.on('otpLockout', (data) => {
    if (data.email !== userEmail) return; // Only update for this user

    let lockoutUntil = data.lockoutUntil;
    const verifyBtn = document.querySelector('.verify-btn');

    function updateBtnTimer() {
      const now = Date.now();
      if (now < lockoutUntil) {
        const left = Math.ceil((lockoutUntil - now) / 1000);
        const m = Math.floor(left / 60);
        const s = left % 60;
        verifyBtn.disabled = true;
        verifyBtn.textContent = `Verify Account (${m}:${s.toString().padStart(2, "0")})`;
      } else {
        verifyBtn.disabled = false;
        verifyBtn.textContent = "Verify Account";
        clearInterval(timerInterval);
      }
    }

    updateBtnTimer();
    const timerInterval = setInterval(updateBtnTimer, 1000);
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
  async function handleEducAssistanceNavClick(event) {
    event.preventDefault();
    if (window.checkAndPromptEducReapply) {
      try {
        const r = await window.checkAndPromptEducReapply({ event, redirectUrl: 'Educational-assistance-user.html' });
        if (r && r.redirected) return;
      } catch (e) {}
    }
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
