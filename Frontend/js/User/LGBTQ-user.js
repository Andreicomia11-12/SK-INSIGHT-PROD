document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ LGBTQ-user.js loaded");

  const form = document.getElementById("lgbtqForm");
  const birthdayInput = document.getElementById("birthday");
  const submitBtn = document.getElementById("submitBtn");

  if (!form) {
    console.error("❌ No form found!");
    return;
  }

  // Get token
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");

  // Autofill birthday
  if (token && birthdayInput) {
    fetch("http://localhost:5000/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => {
        if (user && user.birthday) {
          const d = new Date(user.birthday);
          birthdayInput.value = `${d.getFullYear()}-${String(
            d.getMonth() + 1
          ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        }
      })
      .catch((err) => console.error("❌ Fetch me error:", err));
  }

  // ✅ Handle submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // stop auto refresh
    e.stopPropagation(); // extra safety
    console.log("👉 Custom submit handler triggered");

    if (!token) {
      Swal.fire({
        icon: "error",
        title: "Unauthorized",
        text: "No token found",
      });
      return;
    }

    // disable button
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    try {
      const formData = new FormData(form);
      console.log("📦 FormData entries:", [...formData.entries()]);

      const res = await fetch("http://localhost:5000/api/lgbtqprofiling", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }, // let browser set multipart headers
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        console.log("✅ Submission success:", data);
        Swal.fire({
          icon: "success",
          title: "Profile submitted!",
          text: "Redirecting...",
          confirmButtonText: "OK",
        }).then(() => {
          window.location.href = "confirmation/html/lgbtqconfirmation.html";
        });
      } else {
        console.error("❌ Submission failed:", data);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.error || "Something went wrong.",
        });
      }
    } catch (err) {
      console.error("❌ Exception:", err);
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
      // CASE 4: Form open, no profile → Go to form
      window.location.href = "kkform-personal.html";
    })
    .catch(() => window.location.href = "kkform-personal.html");
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
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function () {
      mobileMenu.classList.toggle('active');
    });
    // Optional: close menu when clicking outside
    document.addEventListener('click', function (e) {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('active');
      }
    });
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
      // CASE 4: Form open, no profile → Go to form
      window.location.href = "lgbtqform.html";
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
  document.getElementById('educAssistanceNavBtnDesktop')?.addEventListener('click', handleEducAssistanceNavClick);
  document.getElementById('educAssistanceNavBtnMobile')?.addEventListener('click', handleEducAssistanceNavClick);
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
