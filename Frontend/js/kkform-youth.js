console.log("✅ kkform-youth.js loaded");

document.addEventListener('DOMContentLoaded', function() {
  if (!validateTokenAndRedirect("KK Youth Form")) {
    return;
  }
  
  console.log("✅ DOM ready");

  const educationalBackground = document.getElementById('educationalBackground');
  console.log("🎯 Found dropdown:", educationalBackground);

  if (!educationalBackground) {
    console.error("❌ No element with id='educationalBackground' found!");
    return;
  }

  const saved = JSON.parse(localStorage.getItem('kkProfileStep3') || '{}');

  // Restore value
  if (saved.educationalBackground) {
    educationalBackground.value = saved.educationalBackground;
    console.log("🔁 Restored:", saved.educationalBackground);
  }

  // Save on change
  educationalBackground.addEventListener('change', function () {
    const current = JSON.parse(localStorage.getItem('kkProfileStep3') || '{}');
    current.educationalBackground = this.value;
    localStorage.setItem('kkProfileStep3', JSON.stringify(current));
    console.log("💾 Saved educational background:", this.value);
  });
});

document.addEventListener('DOMContentLoaded', function() {
  // Restore youth step data if available
  const saved = JSON.parse(localStorage.getItem('kkProfileStep3') || '{}');
  document.getElementById('youthAgeGroup').value = saved.youthAgeGroup || '';
  document.getElementById('youthClassification').value = saved.youthClassification || '';
  document.getElementById('educationalBackground').value = saved.educationalBackground || '';
  document.getElementById('workStatus').value = saved.workStatus || '';
  document.getElementById('registeredSKVoter').value = saved.registeredSKVoter || '';
  document.getElementById('registeredNationalVoter').value = saved.registeredNationalVoter || '';
  document.getElementById('votedLastSKElection').value = saved.votedLastSKElection || '';
  document.getElementById('attendedKKAssembly').value = saved.attendedKKAssembly || '';
  document.getElementById('attendanceCount').value = saved.attendanceCount || '';
  document.getElementById('reasonDidNotAttend').value = saved.reasonDidNotAttend || '';

  // Restore specific needs dropdown visibility and value
  const youthClassification = document.getElementById('youthClassification');
  const specificNeedsGroup = document.getElementById('specificNeedsGroup');
  const specificNeedType = document.getElementById('specificNeedType');
  specificNeedType.value = saved.specificNeedType || '';

  // Always show the specific needs dropdown if a value is present or "Youth with Specific Needs" is selected
  if (
    saved.youthClassification === 'Youth with Specific Needs' ||
    saved.specificNeedType
  ) {
    specificNeedsGroup.style.display = 'block';
  } else {
    specificNeedsGroup.style.display = 'none';
    document.getElementById('specificNeedType').value = '';
  }

  // Show/hide dropdown for Youth with Specific Needs on change
  youthClassification.addEventListener('change', function () {
    if (this.value === 'Youth with Specific Needs') {
      specificNeedsGroup.style.display = 'block';
    } else {
      specificNeedsGroup.style.display = 'none';
      document.getElementById('specificNeedType').value = '';
    }
    saveStep3(); // Save state when changed
  });

  // Separate preview containers
  const profileImagePreview = document.getElementById('profileImagePreview');
  const signatureImagePreview = document.getElementById('signatureImagePreview');
  const profileImage = document.getElementById('profileImage');
  const signatureImage = document.getElementById('signatureImage');

  // ✅ Restore saved image if exists
  if (saved.profileImage) {
    renderProfileImage(saved.profileImage);
  }
  if (saved.signatureImage) {
    renderSignatureImage(saved.signatureImage);
  }

  // Attendance logic
  const attendedKKAssembly = document.getElementById('attendedKKAssembly');
  const attendanceCountGroup = document.getElementById('attendanceCountGroup');
  const reasonGroup = document.getElementById('reasonGroup');

  // Show/hide attendanceCountGroup and reasonGroup based on saved value
  if (saved.attendedKKAssembly === 'Yes') {
    attendanceCountGroup.style.display = 'block';
    reasonGroup.style.display = 'none';
  } else if (saved.attendedKKAssembly === 'No') {
    attendanceCountGroup.style.display = 'none';
    reasonGroup.style.display = 'block';
  } else {
    attendanceCountGroup.style.display = 'none';
    reasonGroup.style.display = 'none';
  }

  attendedKKAssembly.addEventListener('change', function () {
    if (this.value === 'Yes') {
      attendanceCountGroup.style.display = 'block';
      reasonGroup.style.display = 'none';
    } else if (this.value === 'No') {
      attendanceCountGroup.style.display = 'none';
      reasonGroup.style.display = 'block';
    } else {
      attendanceCountGroup.style.display = 'none';
      reasonGroup.style.display = 'none';
    }
  });

  // Profile image preview
  profileImage.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        renderProfileImage(e.target.result);
        // Save to localStorage
        const current = JSON.parse(localStorage.getItem('kkProfileStep3') || '{}');
        current.profileImage = e.target.result;
        localStorage.setItem('kkProfileStep3', JSON.stringify(current));
      };
      reader.readAsDataURL(file);
    } else {
      profileImagePreview.innerHTML = '';
    }
  });

  function renderProfileImage(base64Image) {
    profileImagePreview.innerHTML = `
      <div style="position: relative; display: inline-block; max-width: 220px;">
        <img src="${base64Image}" alt="Profile Preview" style="width:100%; border-radius:10px; cursor:pointer;" id="viewProfileImage">
        <button id="removeProfileImageBtn" style="
          position:absolute;
          top:5px;
          right:5px;
          background:red;
          color:white;
          border:none;
          border-radius:50%;
          width:24px;
          height:24px;
          cursor:pointer;
        ">×</button>
      </div>
    `;
    document.getElementById('removeProfileImageBtn').addEventListener('click', () => {
      profileImagePreview.innerHTML = "";
      profileImage.value = "";
      const current = JSON.parse(localStorage.getItem('kkProfileStep3') || '{}');
      delete current.profileImage;
      localStorage.setItem('kkProfileStep3', JSON.stringify(current));
    });
    // View feature
    document.getElementById('viewProfileImage').addEventListener('click', function() {
      Swal.fire({
        imageUrl: base64Image,
        imageAlt: 'Profile Image',
        showConfirmButton: false,
        width: 400
      });
    });
  }

  // Signature image preview
  signatureImage.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        renderSignatureImage(e.target.result);
        // Save to localStorage
        const current = JSON.parse(localStorage.getItem('kkProfileStep3') || '{}');
        current.signatureImage = e.target.result;
        localStorage.setItem('kkProfileStep3', JSON.stringify(current));
      };
      reader.readAsDataURL(file);
    } else {
      signatureImagePreview.innerHTML = '';
    }
  });

  function renderSignatureImage(base64Image) {
    signatureImagePreview.innerHTML = `
      <div style="position: relative; display: inline-block; max-width: 220px;">
        <img src="${base64Image}" alt="Signature Preview" style="width:100%; border-radius:10px; cursor:pointer;" id="viewSignatureImage">
        <button id="removeSignatureImageBtn" style="
          position:absolute;
          top:5px;
          right:5px;
          background:red;
          color:white;
          border:none;
          border-radius:50%;
          width:24px;
          height:24px;
          cursor:pointer;
        ">×</button>
      </div>
    `;
    document.getElementById('removeSignatureImageBtn').addEventListener('click', () => {
      signatureImagePreview.innerHTML = "";
      signatureImage.value = "";
      const current = JSON.parse(localStorage.getItem('kkProfileStep3') || '{}');
      delete current.signatureImage;
      localStorage.setItem('kkProfileStep3', JSON.stringify(current));
    });
    // View feature
    document.getElementById('viewSignatureImage').addEventListener('click', function() {
      Swal.fire({
        imageUrl: base64Image,
        imageAlt: 'Signature Image',
        showConfirmButton: false,
        width: 400
      });
    });
  }

  const youthForm = document.getElementById('youthForm');

  // 🔹 Autosave on any input change
  youthForm.addEventListener('input', saveStep3);

  // Save step3 data including specificNeedType
  function saveStep3() {
    const step3Data = {
      youthAgeGroup: document.getElementById('youthAgeGroup').value,
      youthClassification: document.getElementById('youthClassification').value,
      educationalBackground: document.getElementById('educationalBackground').value,
      workStatus: document.getElementById('workStatus').value,
      specificNeedType: document.getElementById('specificNeedType').value,
      registeredSKVoter: document.getElementById('registeredSKVoter').value,
      registeredNationalVoter: document.getElementById('registeredNationalVoter').value,
      votedLastSKElection: document.getElementById('votedLastSKElection').value,
      attendedKKAssembly: document.getElementById('attendedKKAssembly').value,
      attendanceCount: document.getElementById('attendanceCount').value,
      reasonDidNotAttend: document.getElementById('reasonDidNotAttend').value
    };

    // Keep existing saved images
    const existing = JSON.parse(localStorage.getItem('kkProfileStep3') || '{}');
    if (existing.profileImage) {
      step3Data.profileImage = existing.profileImage;
    }
    if (existing.signatureImage) {
      step3Data.signatureImage = existing.signatureImage;
    }

    localStorage.setItem('kkProfileStep3', JSON.stringify(step3Data));
  }

  // ✅ Automatically restore educational background value from localStorage
  const educationalBackground = document.getElementById('educationalBackground');

  // Restore saved value
  if (educationalBackground && saved.educationalBackground) {
    educationalBackground.value = saved.educationalBackground;
  }

  // Save value when changed
  if (educationalBackground) {
    educationalBackground.addEventListener('change', function () {
      const current = JSON.parse(localStorage.getItem('kkProfileStep3') || '{}');
      current.educationalBackground = this.value;
      localStorage.setItem('kkProfileStep3', JSON.stringify(current));
      console.log('✅ Saved educational background:', this.value);
    });
  }

  // 🔹 Helper: Convert Base64 -> File
  function base64ToFile(base64, filename) {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  // Final submit
  youthForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Always save before confirmation
    saveStep3();

    // SweetAlert confirmation before actual submit
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to submit your KKProfile?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, submit",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    // Show loading while submitting
    Swal.fire({
      title: 'Submitting...',
      text: 'Please wait while we submit your form',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => { Swal.showLoading(); }
    });

    // Check if profile image is present (either in file input or localStorage)
    const hasImage = form.profileImage.files.length > 0 || (JSON.parse(localStorage.getItem('kkProfileStep3') || '{}').profileImage);

    if (!hasImage) {
      await Swal.fire("Missing Image", "Please upload a profile image before submitting.", "warning");
      return;
    }

    // Collect all data from localStorage and this page
    const step1 = JSON.parse(localStorage.getItem('kkProfileStep1') || '{}');
    const step2 = JSON.parse(localStorage.getItem('kkProfileStep2') || '{}');
    const step3 = JSON.parse(localStorage.getItem('kkProfileStep3') || '{}');

    // In your submit handler, after loading step3:
    const booleanFields = [
      'registeredSKVoter',
      'registeredNationalVoter',
      'votedLastSKElection',
      'attendedKKAssembly'
    ];

    booleanFields.forEach(field => {
      if (field in step3) {
        step3[field] = step3[field] === 'Yes' ? true
                      : step3[field] === 'No' ? false
                      : '';
      }
    });

    // Validate image presence
    if (
      form.profileImage.files.length === 0 &&
      !step3.profileImage
    ) {
      await Swal.fire("Missing Image", "Please upload a profile image before submitting.", "warning");
      return;
    }

    // Check if signature image is present (either in file input or localStorage)
    const hasSignature =
      form.signatureImage.files.length > 0 ||
      (JSON.parse(localStorage.getItem('kkProfileStep3') || '{}').signatureImage);

    if (!hasSignature) {
      await Swal.fire("Missing Signature", "Please upload a signature image before submitting.", "warning");
      return;
    }

    const formData = new FormData();

    // Step 1
    Object.entries(step1).forEach(([k, v]) => formData.append(k, v));
    // Step 2
    Object.entries(step2).forEach(([k, v]) => formData.append(k, v));
    // Step 3 (excluding profileImage)
    Object.entries(step3).forEach(([k, v]) => {
      // Only send attendanceCount if attended
      if (k === 'attendanceCount' && step3.attendedKKAssembly) {
        formData.append(k, v);
      }
      // Only send reasonDidNotAttend if NOT attended
      else if (k === 'reasonDidNotAttend' && !step3.attendedKKAssembly) {
        formData.append(k, v);
      }
      // Send other fields
      else if (k !== 'profileImage' && k !== 'attendanceCount' && k !== 'reasonDidNotAttend') {
        formData.append(k, v);
      }
    });

    // ✅ Add actual image file if selected
    if (form.profileImage.files.length > 0) {
      formData.append('profileImage', form.profileImage.files[0]);
    } else if (step3.profileImage) {
      // ✅ Fallback: convert Base64 from localStorage into a File
      const file = base64ToFile(step3.profileImage, "profile.png");
      formData.append('profileImage', file);
    }

    // ✅ Add signature image file if selected
    if (form.signatureImage && form.signatureImage.files.length > 0) {
      formData.append('signatureImage', form.signatureImage.files[0]);
    } else if (step3.signatureImage) {
      const file = base64ToFile(step3.signatureImage, "signature.png");
      formData.append('signatureImage', file);
    }

    // Show loading while submitting
    Swal.fire({
      title: 'Submitting...',
      text: 'Please wait while we submit your form',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/kkprofiling', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }, // don't set Content-Type manually
        body: formData
      });
      if (response.ok) {
        Swal.close();
        await Swal.fire("Submitted!", "Form submitted successfully!", "success");
        localStorage.removeItem('kkProfileStep1');
        localStorage.removeItem('kkProfileStep2');
        localStorage.removeItem('kkProfileStep3');
        window.location.href = '../../html/user/confirmation/html/kkcofirmation.html';
      } else if (response.status === 409) {
        Swal.close();
        Swal.fire("Already Submitted", "You already submitted a KKProfile for this cycle.", "error");
        return;
      } else {
        let error;
        try {
          error = await response.json();
        } catch {
          error = { message: await response.text() };
        }
        Swal.close();
        Swal.fire("Error", error.message || 'Something went wrong', "error");
      }
    } catch (error) {
      Swal.close();
      Swal.fire("Error", "Failed to submit form", "error");
    }
  });

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

  // KK Profile Navigation
  function handleKKProfileNavClick(event) {
    event.preventDefault();
    if (!validateTokenAndRedirect("KK Youth Form")) {
      return;
    }
    
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
          if (result.isConfirmed) window.location.href = "confirmation/html/kkconfirmation.html";
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
          if (result.isConfirmed) window.location.href = "confirmation/html/kkconfirmation.html";
        });
        return;
      }
      // CASE 4: Form open, no profile → Show SweetAlert and go to form
      if (isFormOpen && !hasProfile) {
        Swal.fire({
          icon: "info",
          title: `No profile found`,
          text: `You don't have a profile yet. Please fill out the form to create one.`,
          confirmButtonText: "Go to form"
        }).then(() => {
          window.location.href = "kkform-personal.html";
        });
        return;
      }
    })
    .catch(() => window.location.href = "kkform-personal.html");
  }

  // LGBTQ+ Profile Navigation
  function handleLGBTQProfileNavClick(event) {
    event.preventDefault();
    if (!validateTokenAndRedirect("KK Youth Form")) {
      return;
    }
    
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
          confirmButtonText: "Go to form"
        }).then(() => {
          window.location.href = "lgbtqform.html";
        });
        return;
      }
    })
    .catch(() => window.location.href = "lgbtqform.html");
  }

  // Educational Assistance Navigation
  function handleEducAssistanceNavClick(event) {
    event.preventDefault();
    if (!validateTokenAndRedirect("KK Youth Form")) {
      return;
    }
    
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
          confirmButtonText: "Go to form"
        }).then(() => {
          window.location.href = "Educational-assistance-user.html";
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

  // Educational Assistance
  document.getElementById('educAssistanceNavBtnDesktop')?.addEventListener('click', handleEducAssistanceNavClick);
  document.getElementById('educAssistanceNavBtnMobile')?.addEventListener('click', handleEducAssistanceNavClick);

  // When submitting the form
  const form = document.getElementById('youthForm');
  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Always save before confirmation
    saveStep3();

    // SweetAlert confirmation before actual submit
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to submit your KKProfile?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, submit",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    // Show loading SweetAlert after confirmation
    Swal.fire({
      title: "Submitting...",
      text: "Please wait...",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Check if profile image is present (either in file input or localStorage)
    const hasImage = form.profileImage.files.length > 0 || (JSON.parse(localStorage.getItem('kkProfileStep3') || '{}').profileImage);

    if (!hasImage) {
      Swal.close();
      await Swal.fire("Missing Image", "Please upload a profile image before submitting.", "warning");
      return;
    }

    // Collect all data from localStorage and this page
    const step1 = JSON.parse(localStorage.getItem('kkProfileStep1') || '{}');
    const step2 = JSON.parse(localStorage.getItem('kkProfileStep2') || '{}');
    const step3 = JSON.parse(localStorage.getItem('kkProfileStep3') || '{}');

    // In your submit handler, after loading step3:
    const booleanFields = [
      'registeredSKVoter',
      'registeredNationalVoter',
      'votedLastSKElection',
      'attendedKKAssembly'
    ];

    booleanFields.forEach(field => {
      if (field in step3) {
        step3[field] = step3[field] === 'Yes' ? true
                      : step3[field] === 'No' ? false
                      : '';
      }
    });

    // Validate image presence
    if (
      form.profileImage.files.length === 0 &&
      !step3.profileImage
    ) {
      Swal.close();
      await Swal.fire("Missing Image", "Please upload a profile image before submitting.", "warning");
      return;
    }

    // Check if signature image is present (either in file input or localStorage)
    const hasSignature =
      form.signatureImage.files.length > 0 ||
      (JSON.parse(localStorage.getItem('kkProfileStep3') || '{}').signatureImage);

    if (!hasSignature) {
      Swal.close();
      await Swal.fire("Missing Signature", "Please upload a signature image before submitting.", "warning");
      return;
    }

    const formData = new FormData();

    // Step 1
    Object.entries(step1).forEach(([k, v]) => formData.append(k, v));
    // Step 2
    Object.entries(step2).forEach(([k, v]) => formData.append(k, v));
    // Step 3 (excluding profileImage)
    Object.entries(step3).forEach(([k, v]) => {
      // Only send attendanceCount if attended
      if (k === 'attendanceCount' && step3.attendedKKAssembly) {
        formData.append(k, v);
      }
      // Only send reasonDidNotAttend if NOT attended
      else if (k === 'reasonDidNotAttend' && !step3.attendedKKAssembly) {
        formData.append(k, v);
      }
      // Send other fields
      else if (k !== 'profileImage' && k !== 'attendanceCount' && k !== 'reasonDidNotAttend') {
        formData.append(k, v);
      }
    });

    // Add actual image file if selected
    if (form.profileImage.files.length > 0) {
      formData.append('profileImage', form.profileImage.files[0]);
    } else if (step3.profileImage) {
      // Fallback: convert Base64 from localStorage into a File
      const file = base64ToFile(step3.profileImage, "profile.png");
      formData.append('profileImage', file);
    }

    // Add signature image file if selected
    if (form.signatureImage && form.signatureImage.files.length > 0) {
      formData.append('signatureImage', form.signatureImage.files[0]);
    } else if (step3.signatureImage) {
      const file = base64ToFile(step3.signatureImage, "signature.png");
      formData.append('signatureImage', file);
    }

    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/kkprofiling', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }, // don't set Content-Type manually
        body: formData
      });
      Swal.close();
      if (response.ok) {
        await Swal.fire("Submitted!", "Form submitted successfully!", "success");
        localStorage.removeItem('kkProfileStep1');
        localStorage.removeItem('kkProfileStep2');
        localStorage.removeItem('kkProfileStep3');
        window.location.href = '../../html/user/confirmation/html/kkcofirmation.html';
      } else if (response.status === 409) {
        Swal.fire("Already Submitted", "You already submitted a KKProfile for this cycle.", "error");
        return;
      } else {
        let error;
        try {
          error = await response.json();
        } catch {
          error = { message: await response.text() };
        }
        Swal.fire("Error", error.message || 'Something went wrong', "error");
      }
    } catch (error) {
      Swal.close();
      Swal.fire("Error", "Failed to submit form", "error");
    }
  });

  document.getElementById('previousBtn')?.addEventListener('click', function(e) {
    saveStep3(); // Save all current values to localStorage
    // Optionally, navigate to the previous page here:
    // window.location.href = 'your-previous-page.html';
  });

  document.getElementById('customUploadBtn').addEventListener('click', function() {
    document.getElementById('profileImage').click();
  });

  document.getElementById('profileImage').addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        renderProfileImage(e.target.result);
        // Save to localStorage
        const current = JSON.parse(localStorage.getItem('kkProfileStep3') || '{}');
        current.profileImage = e.target.result;
        localStorage.setItem('kkProfileStep3', JSON.stringify(current));
      };
      reader.readAsDataURL(file);
    } else {
      profileImagePreview.innerHTML = '';
    }
  });

  function renderProfileImage(base64Image) {
    profileImagePreview.innerHTML = `
      <div style="position: relative; display: inline-block; max-width: 220px;">
        <img src="${base64Image}" alt="Profile Preview" style="width:100%; border-radius:10px; cursor:pointer;" id="viewProfileImage">
        <button id="removeProfileImageBtn" style="
          position:absolute;
          top:5px;
          right:5px;
          background:red;
          color:white;
          border:none;
          border-radius:50%;
          width:24px;
          height:24px;
          cursor:pointer;
        ">×</button>
      </div>
    `;
    document.getElementById('removeProfileImageBtn').addEventListener('click', () => {
      profileImagePreview.innerHTML = "";
      profileImage.value = "";
      const current = JSON.parse(localStorage.getItem('kkProfileStep3') || '{}');
      delete current.profileImage;
      localStorage.setItem('kkProfileStep3', JSON.stringify(current));
    });
    // View feature
    document.getElementById('viewProfileImage').addEventListener('click', function() {
      Swal.fire({
        imageUrl: base64Image,
        imageAlt: 'Profile Image',
        showConfirmButton: false,
        width: 400
      });
    });
  }

  // Signature image
  document.getElementById('signatureImage').addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        renderSignatureImage(e.target.result);
        // Save to localStorage
        const current = JSON.parse(localStorage.getItem('kkProfileStep3') || '{}');
        current.signatureImage = e.target.result;
        localStorage.setItem('kkProfileStep3', JSON.stringify(current));
      };
      reader.readAsDataURL(file);
    } else {
      signatureImagePreview.innerHTML = '';
    }
  });

  function renderSignatureImage(base64Image) {
    signatureImagePreview.innerHTML = `
      <div style="position: relative; display: inline-block; max-width: 220px;">
        <img src="${base64Image}" alt="Signature Preview" style="width:100%; border-radius:10px; cursor:pointer;" id="viewSignatureImage">
        <button id="removeSignatureImageBtn" style="
          position:absolute;
          top:5px;
          right:5px;
          background:red;
          color:white;
          border:none;
          border-radius:50%;
          width:24px;
          height:24px;
          cursor:pointer;
        ">×</button>
      </div>
    `;
    document.getElementById('removeSignatureImageBtn').addEventListener('click', () => {
      signatureImagePreview.innerHTML = "";
      signatureImage.value = "";
      const current = JSON.parse(localStorage.getItem('kkProfileStep3') || '{}');
      delete current.signatureImage;
      localStorage.setItem('kkProfileStep3', JSON.stringify(current));
    });
    // View feature
    document.getElementById('viewSignatureImage').addEventListener('click', function() {
      Swal.fire({
        imageUrl: base64Image,
        imageAlt: 'Signature Image',
        showConfirmButton: false,
        width: 400
      });
    });
  }

  document.getElementById('customSignatureBtn').addEventListener('click', function() {
    document.getElementById('signatureImage').click();
  });
});