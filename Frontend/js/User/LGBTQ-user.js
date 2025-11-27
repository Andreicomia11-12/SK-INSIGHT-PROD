document.addEventListener("DOMContentLoaded", () => {
  // if (!validateTokenAndRedirect("LGBTQ+ Form")) {
  //   return;
  // }
  
  const form = document.getElementById("lgbtqForm");
  const birthdayInput = document.getElementById("birthday");
  const submitBtn = document.getElementById("submitBtn");

  if (!form) {
    console.error("❌ No form found!");
    return;
  }

  // Get token
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");

  // --- SessionStorage draft key ---
  const DRAFT_KEY = 'lgbtqDraft';

  // Restore draft if present (persists across reloads, cleared on tab close)
  const savedDraft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
  if (savedDraft && Object.keys(savedDraft).length) {
    try {
      // Fill simple inputs
      for (const [k, v] of Object.entries(savedDraft)) {
        if (!v) continue;
        const el = document.getElementById(k);
        if (!el) continue;
        // For file/image previews we set src elsewhere
        if (el.type === 'file') continue;
        if (el.tagName === 'SELECT' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.value = v;
        }
      }

        // Ensure filename placeholders are hidden when there's no image/file
        (function initFilenamePlaceholders() {
          try {
            const inputs = ['idImageFront','idImageBack','profileImage','signatureImage'];
            inputs.forEach(inputId => {
              const fileInput = document.getElementById(inputId);
              const filenameEl = document.getElementById(`${inputId}Filename`);
              const previewImg = document.getElementById((inputId === 'idImageFront' ? 'imagePreviewFront' : inputId === 'idImageBack' ? 'imagePreviewBack' : inputId === 'profileImage' ? 'imagePreviewProfile' : 'imagePreviewSignature'));

              const hasFile = (fileInput && fileInput.files && fileInput.files.length > 0);
              const hasPreview = (previewImg && previewImg.src && previewImg.src.trim() !== '');
              const saved = (savedDraft && (savedDraft[`${inputId}Name`] || savedDraft[inputId]));

              if (filenameEl) {
                if (hasFile || hasPreview || saved) {
                  filenameEl.classList.add('visible');
                  // if there's a saved name, fill it
                  if (!filenameEl.textContent && savedDraft && savedDraft[`${inputId}Name`]) filenameEl.textContent = savedDraft[`${inputId}Name`];
                } else {
                  filenameEl.textContent = '';
                  filenameEl.classList.remove('visible');
                }
              }
            });
          } catch (e) { /* ignore */ }
        })();

      // Restore image previews if base64 saved
      if (savedDraft.idImageFront) {
        const preview = document.getElementById('imagePreviewFront');
        const container = document.getElementById('imagePreviewContainerFront');
        if (preview && container) { preview.src = savedDraft.idImageFront; preview.style.display = 'block'; container.style.display = 'block'; }
      }
      if (savedDraft.idImageBack) {
        const preview = document.getElementById('imagePreviewBack');
        const container = document.getElementById('imagePreviewContainerBack');
        if (preview && container) { preview.src = savedDraft.idImageBack; preview.style.display = 'block'; container.style.display = 'block'; }
      }
      if (savedDraft.profileImage) {
        const preview = document.getElementById('imagePreviewProfile');
        const container = document.getElementById('imagePreviewContainerProfile');
        if (preview && container) { preview.src = savedDraft.profileImage; preview.style.display = 'block'; container.style.display = 'block'; }
      }
      if (savedDraft.signatureImage) {
        const preview = document.getElementById('imagePreviewSignature');
        const container = document.getElementById('imagePreviewContainerSignature');
        if (preview && container) { preview.src = savedDraft.signatureImage; preview.style.display = 'block'; container.style.display = 'block'; }
      }
      // Restore saved filenames (if any) and show filename elements
      try {
        const frontNameEl = document.getElementById('idImageFrontFilename');
        if (frontNameEl) {
          if (savedDraft.idImageFrontName) { frontNameEl.textContent = savedDraft.idImageFrontName; frontNameEl.classList.add('visible'); }
          else { frontNameEl.textContent = ''; frontNameEl.classList.remove('visible'); }
        }
        const backNameEl = document.getElementById('idImageBackFilename');
        if (backNameEl) {
          if (savedDraft.idImageBackName) { backNameEl.textContent = savedDraft.idImageBackName; backNameEl.classList.add('visible'); }
          else { backNameEl.textContent = ''; backNameEl.classList.remove('visible'); }
        }
      } catch (e) { /* ignore */ }
    } catch (e) {
      console.warn('Failed to restore LGBTQ draft:', e);
    }
  }

  // Save current form state into sessionStorage
  function saveDraft() {
    try {
      const draft = {};
      const els = form.querySelectorAll('input, select, textarea');
      els.forEach(el => {
        if (!el.id) return;
        if (el.type === 'file') return; // files handled separately as base64
        draft[el.id] = el.value;
      });
      // Preserve existing base64 images if present
      const existing = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
      draft.idImageFront = existing.idImageFront || document.getElementById('imagePreviewFront')?.src || '';
      draft.idImageBack = existing.idImageBack || document.getElementById('imagePreviewBack')?.src || '';
      draft.profileImage = existing.profileImage || document.getElementById('imagePreviewProfile')?.src || '';
      draft.signatureImage = existing.signatureImage || document.getElementById('imagePreviewSignature')?.src || '';
      // Preserve filenames so they survive reloads
      draft.idImageFrontName = existing.idImageFrontName || document.getElementById('idImageFront')?.files?.[0]?.name || '';
      draft.idImageBackName = existing.idImageBackName || document.getElementById('idImageBack')?.files?.[0]?.name || '';
      draft.profileImageName = existing.profileImageName || document.getElementById('profileImage')?.files?.[0]?.name || '';
      draft.signatureImageName = existing.signatureImageName || document.getElementById('signatureImage')?.files?.[0]?.name || '';
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('Failed to save LGBTQ draft:', e);
    }
  }

  // Hook into form changes
  form.addEventListener('input', saveDraft);
  form.addEventListener('change', saveDraft);

  // Autofill birthday and name fields from /api/users/me when token is available
  if (token && birthdayInput) {
    fetch("http://localhost:5000/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => {
        if (!user) return;

        // Populate birthday if available and the field is empty
        if (user.birthday) {
          try {
            const d = new Date(user.birthday);
            if (d && !isNaN(d.getTime()) && (!birthdayInput.value || birthdayInput.value === '')) {
              birthdayInput.value = `${d.getFullYear()}-${String(
                d.getMonth() + 1
              ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            }
          } catch (e) { /* ignore */ }
        }

        // Populate name fields if empty (do not overwrite existing/drafted values)
        try {
          // Support multiple possible id names used across templates
          const lastnameEl = document.getElementById('lastname') || document.getElementById('lastName') || document.getElementById('surname');
          const firstnameEl = document.getElementById('firstname') || document.getElementById('firstName');
          const middlenameEl = document.getElementById('middlename') || document.getElementById('middleName');
          const suffixEl = document.getElementById('suffix');

          if (lastnameEl && (!lastnameEl.value || lastnameEl.value === '')) {
            lastnameEl.value = user.lastname || user.surname || user.lastName || '';
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
        } catch (e) { /* ignore DOM errors */ }
      })
      .catch((err) => console.error("❌ Fetch me error:", err));
  }

  // ✅ Handle submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!token) {
      Swal.fire({
        icon: "error",
        title: "Unauthorized",
        text: "No token found",
      });
      return;
    }

    // Show confirmation dialog
    const confirmation = await Swal.fire({
      title: "Are you sure?",
      text: 'Are you sure you want to submit your profile? Please confirm that all information is correct.',
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#0A2C59",
      cancelButtonColor: "#d33",
    });

    if (!confirmation.isConfirmed) {
      return; // Stop submission if user cancels
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    Swal.fire({
      title: "Submitting...",
      text: "Please wait while we process your profile.",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const formData = new FormData(form);
      const res = await fetch("http://localhost:5000/api/lgbtqprofiling", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      Swal.close();

      if (res.status === 403 && (data?.error?.includes("age") || data?.error?.includes("eligible"))) {
        Swal.fire({
          icon: "error",
          title: "Not Eligible",
          text: data?.error || "You are not eligible to submit this form due to age restrictions.",
          confirmButtonColor: "#0A2C59",
        });
        return;
      }

      if (res.ok && data.success) {
        Swal.fire({
          icon: "success",
          title: "Profile submitted!",
          text: "Redirecting...",
          confirmButtonText: "OK",
        }).then(() => {
          try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) {}
          window.location.href = "confirmation/html/lgbtqconfirmation.html";
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.error || "Something went wrong.",
        });
      }
    } catch (err) {
      Swal.close();
      Swal.fire({ icon: "error", title: "Error", text: "Server error." });
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
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

  // Attach to desktop nav button
  const kkProfileNavBtnDesktop = document.getElementById("kkProfileNavBtnDesktop");
  if (kkProfileNavBtnDesktop) {
    kkProfileNavBtnDesktop.addEventListener("click", handleKKProfileNavClick);
  }
  // Attach to mobile nav button
  const kkProfileNavBtnMobile = document.getElementById("kkProfileNavBtnMobile");
  if (kkProfileNavBtnMobile) {
    kkProfileNavBtnMobile.addEventListener("click", handleKKProfileNavClick);
  }

  // Hamburger menu toggle
  const hamburger = document.getElementById('navbarHamburger');
  const mobileMenu = document.getElementById('navbarMobileMenu');

  hamburger.addEventListener('click', function() {

      mobileMenu.classList.toggle('active');
  });

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

  // KK Profile
  document.getElementById('kkProfileNavBtnDesktop')?.addEventListener('click', handleKKProfileNavClick);
  document.getElementById('kkProfileNavBtnMobile')?.addEventListener('click', handleKKProfileNavClick);

  // LGBTQ+ Profile
  document.getElementById('lgbtqProfileNavBtnDesktop')?.addEventListener('click', handleLGBTQProfileNavClick);
  document.getElementById('lgbtqProfileNavBtnMobile')?.addEventListener('click', handleLGBTQProfileNavClick);

  // Educational Assistance
  document.getElementById('educAssistanceNavBtnDesktop')?.addEventListener('click', function(e){ try{ if (e && typeof e.preventDefault === 'function') e.preventDefault(); }catch(err){}; handleEducAssistanceNavClick(e); }, { capture: true });
  document.getElementById('educAssistanceNavBtnMobile')?.addEventListener('click', function(e){ try{ if (e && typeof e.preventDefault === 'function') e.preventDefault(); }catch(err){}; handleEducAssistanceNavClick(e); }, { capture: true });

  /* ✅ IMAGE PREVIEW + VALIDATION + REMOVE */
  function handleImageInputChange(inputId, previewContainerId, previewImgId, allowedTypes = ['image/png', 'image/jpeg']) {
    const input = document.getElementById(inputId);
    const previewContainer = document.getElementById(previewContainerId);
    const previewImg = document.getElementById(previewImgId);

    if (input && previewContainer && previewImg) {
      input.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
          // Validate file type
          if (!allowedTypes.includes(file.type)) {
            Swal.fire({
              icon: 'error',
              title: 'Invalid File Type',
              text: 'Only PNG and JPG files are allowed.',
              confirmButtonText: 'OK',
              confirmButtonColor: '#0A2C59',
            });

            // Automatically remove invalid file
            input.value = ''; // Clear the file input
            previewImg.src = ''; // Clear the preview image
            previewContainer.style.display = 'none'; // Hide the preview container
            return; // Stop further processing
          }

          // File is valid, show the preview
          const reader = new FileReader();
          reader.onload = function (evt) {
            previewImg.src = evt.target.result; // Set the preview image source
            previewImg.style.display = 'block'; // show the image element
            previewContainer.style.display = 'block'; // Show the preview container
            try {
              const existing = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
              existing[inputId] = evt.target.result;
              // save filename if available
                if (file && file.name) {
                  existing[`${inputId}Name`] = file.name;
                  const nameEl = document.getElementById(`${inputId}Filename`);
                  if (nameEl) { nameEl.textContent = file.name; nameEl.classList.add('visible'); }
                }
              sessionStorage.setItem(DRAFT_KEY, JSON.stringify(existing));
            } catch (e) {
              console.warn('Failed to save image draft for', inputId, e);
            }
          };
          reader.readAsDataURL(file);
        } else {
          // No file selected, hide the preview
          previewImg.src = ''; // Clear the preview image
          previewImg.style.display = 'none';
          previewContainer.style.display = 'none'; // Hide the preview container
          try {
            const existing = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
            delete existing[inputId];
            // delete saved filename as well
            delete existing[`${inputId}Name`];
            const nameEl = document.getElementById(`${inputId}Filename`);
            if (nameEl) { nameEl.textContent = ''; nameEl.classList.remove('visible'); }
            sessionStorage.setItem(DRAFT_KEY, JSON.stringify(existing));
          } catch (e) { /* ignore */ }
        }
      });
    }
  }

  function handleImageRemove(inputId, previewContainerId, previewImgId) {
    const input = document.getElementById(inputId);
    const previewContainer = document.getElementById(previewContainerId);
    const previewImg = document.getElementById(previewImgId);

    if (input && previewContainer && previewImg) {
      const removeBtn = document.getElementById(`remove${inputId}`);
      if (removeBtn) {
        removeBtn.addEventListener('click', function () {
          input.value = ''; // Clear the file input
          previewImg.src = ''; // Clear the preview image
          previewContainer.style.display = 'none'; // Hide the preview container
          try {
            const existing = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
            delete existing[inputId];
            delete existing[`${inputId}Name`];
            sessionStorage.setItem(DRAFT_KEY, JSON.stringify(existing));
          } catch (e) { /* ignore */ }
          const nameEl = document.getElementById(`${inputId}Filename`);
          if (nameEl) { nameEl.textContent = ''; nameEl.classList.remove('visible'); }
        });
      }
    }
  }

  // Apply the logic to all relevant image inputs in the LGBTQ+ form
  handleImageInputChange('idImageFront', 'imagePreviewContainerFront', 'imagePreviewFront');
  handleImageRemove('idImageFront', 'imagePreviewContainerFront', 'imagePreviewFront');

  handleImageInputChange('idImageBack', 'imagePreviewContainerBack', 'imagePreviewBack');
  handleImageRemove('idImageBack', 'imagePreviewContainerBack', 'imagePreviewBack');

  handleImageInputChange('profileImage', 'imagePreviewContainerProfile', 'imagePreviewProfile');
  handleImageRemove('profileImage', 'imagePreviewContainerProfile', 'imagePreviewProfile');

  handleImageInputChange('signatureImage', 'imagePreviewContainerSignature', 'imagePreviewSignature');
  handleImageRemove('signatureImage', 'imagePreviewContainerSignature', 'imagePreviewSignature');
  
  // Wire custom choose buttons (if present) to trigger hidden native inputs
  const customFrontBtn = document.getElementById('customIdFrontBtn');
  if (customFrontBtn) {
    customFrontBtn.addEventListener('click', () => document.getElementById('idImageFront')?.click());
  }
  const customBackBtn = document.getElementById('customIdBackBtn');
  if (customBackBtn) {
    customBackBtn.addEventListener('click', () => document.getElementById('idImageBack')?.click());
  }
});

// ✅ Image preview + remove logic
const idImageInput = document.getElementById("idImage");
const imagePreview = document.getElementById("imagePreview");
const imagePreviewContainer = document.getElementById("imagePreviewContainer");
const removeImageBtn = document.getElementById("removeImageBtn");

if (idImageInput && imagePreview && removeImageBtn) {
  // Hide preview by default
  imagePreviewContainer.style.display = "none";

  // When user selects a file
  idImageInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview.src = e.target.result;
        imagePreviewContainer.style.display = "inline-block";
      };
      reader.readAsDataURL(file);
    }
  });

  // When user clicks the X button
  removeImageBtn.addEventListener("click", () => {
    idImageInput.value = ""; // clear file input
    imagePreview.src = "";
    imagePreviewContainer.style.display = "none";
  });
}

// Front ID image preview
document.getElementById('idImageFront').addEventListener('change', function(e) {
  const file = e.target.files[0];
  const previewContainer = document.getElementById('imagePreviewContainerFront');
  const previewImg = document.getElementById('imagePreviewFront');

  if (file) {
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid File Type',
        text: 'Only PNG and JPG files are allowed.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#0A2C59',
      });

      // Automatically remove invalid file
      e.target.value = ''; // Clear the file input
      previewImg.src = ''; // Clear the preview image
      previewContainer.style.display = 'none'; // Hide the preview container
      return; // Stop further processing
    }

    // File is valid, show the preview
    const reader = new FileReader();
    reader.onload = function (evt) {
      previewImg.src = evt.target.result;
      previewImg.style.display = 'block';
      previewContainer.style.display = 'block';
      try {
        const existing = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
        existing.idImageFront = evt.target.result;
        // store original filename too
        if (file && file.name) {
          existing.idImageFrontName = file.name;
          const nameEl = document.getElementById('idImageFrontFilename');
          if (nameEl) { nameEl.textContent = file.name; nameEl.classList.add('visible'); }
        }
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(existing));
      } catch (e) { /* ignore */ }
    };
    reader.readAsDataURL(file);
  } else {
    // No file selected, hide the preview
    previewImg.src = '';
    previewImg.style.display = 'none';
    previewContainer.style.display = 'none';
    const nameEl = document.getElementById('idImageFrontFilename');
    if (nameEl) { nameEl.textContent = ''; nameEl.classList.remove('visible'); }
  }
});

// Remove front image
document.getElementById('removeImageBtnFront').addEventListener('click', function () {
  document.getElementById('idImageFront').value = ''; // Clear the file input
  document.getElementById('imagePreviewFront').src = ''; // Clear the preview image
  document.getElementById('imagePreviewContainerFront').style.display = 'none'; // Hide the preview container
  try { const existing = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}'); delete existing.idImageFront; delete existing.idImageFrontName; sessionStorage.setItem(DRAFT_KEY, JSON.stringify(existing)); } catch (e) {}
  const nameEl = document.getElementById('idImageFrontFilename'); if (nameEl) { nameEl.textContent = ''; nameEl.style.display = 'none'; }
});

// Back ID image preview
document.getElementById('idImageBack').addEventListener('change', function (e) {
  const file = e.target.files[0];
  const previewContainer = document.getElementById('imagePreviewContainerBack');
  const previewImg = document.getElementById('imagePreviewBack');

  if (file) {
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid File Type',
        text: 'Only PNG and JPG files are allowed.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#0A2C59',
      });

      // Automatically remove invalid file
      e.target.value = ''; // Clear the file input
      previewImg.src = ''; // Clear the preview image
      previewContainer.style.display = 'none'; // Hide the preview container
      return; // Stop further processing
    }

    // File is valid, show the preview
    const reader = new FileReader();
    reader.onload = function (evt) {
      previewImg.src = evt.target.result;
      previewImg.style.display = 'block';
      previewContainer.style.display = 'block';
      try {
        const existing = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
        existing.idImageBack = evt.target.result;
        if (file && file.name) {
          existing.idImageBackName = file.name;
          const nameEl = document.getElementById('idImageBackFilename');
          if (nameEl) { nameEl.textContent = file.name; nameEl.classList.add('visible'); }
        }
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(existing));
      } catch (e) { /* ignore */ }
    };
    reader.readAsDataURL(file);
  } else {
    // No file selected, hide the preview
    previewImg.src = '';
    previewImg.style.display = 'none';
    previewContainer.style.display = 'none';
    const nameEl = document.getElementById('idImageBackFilename');
    if (nameEl) { nameEl.textContent = ''; nameEl.classList.remove('visible'); }
  }
});

// Remove back image
document.getElementById('removeImageBtnBack').addEventListener('click', function () {
  document.getElementById('idImageBack').value = ''; // Clear the file input
  document.getElementById('imagePreviewBack').src = ''; // Clear the preview image
  document.getElementById('imagePreviewContainerBack').style.display = 'none'; // Hide the preview container
  try { const existing = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}'); delete existing.idImageBack; delete existing.idImageBackName; sessionStorage.setItem(DRAFT_KEY, JSON.stringify(existing)); } catch (e) {}
  const nameEl = document.getElementById('idImageBackFilename'); if (nameEl) { nameEl.textContent = ''; nameEl.style.display = 'none'; }
});

// --- View (enlarge) previews using SweetAlert (adds a close button) ---
function attachPreviewViewer(imgId) {
  const img = document.getElementById(imgId);
  if (!img) return;
  img.style.cursor = 'pointer';
  img.addEventListener('click', function () {
    const src = img.src;
    if (!src) return;
    Swal.fire({ imageUrl: src, imageAlt: 'Image preview', showConfirmButton: false, showCloseButton: true, width: 'auto', customClass: { popup: 'swal2-image-popup' } });
  });
}

// Attach viewers to all preview images used in the form
['imagePreview', 'imagePreviewFront', 'imagePreviewBack', 'imagePreviewProfile', 'imagePreviewSignature'].forEach(attachPreviewViewer);
