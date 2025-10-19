document.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  // =========================
  // FETCH & POPULATE KK PROFILE DATA
  // =========================
  if (token) {
    try {
      const res = await fetch("http://localhost:5000/api/kkprofiling/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        document.getElementById("region").value = data.region || "";
        document.getElementById("province").value = data.province || "";
        document.getElementById("municipality").value = data.municipality || "";
        document.getElementById("barangay").value = data.barangay || "";
        document.getElementById("purok").value = data.purok || "";
        document.getElementById("email").value = data.email || "";
        document.getElementById("contactNumber").value = data.contactNumber || "";
        document.getElementById("civilStatus").value = data.civilStatus || "";
      }
    } catch (err) {
      console.error("Failed to fetch KKProfile data:", err);
    }
  }

  // =========================
  // NAVBAR TOGGLER (Hamburger)
  // =========================
  const hamburger = document.getElementById("navbarHamburger");
  const mobileMenu = document.getElementById("navbarMobileMenu");

  if (hamburger && mobileMenu) {
    console.log("✅ Navbar loaded");
    hamburger.addEventListener("click", function (e) {
      e.stopPropagation();
      mobileMenu.classList.toggle("active");
    });

    document.addEventListener("click", function (e) {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove("active");
      }
    });
  }

  // =========================
  // KK PROFILE NAVIGATION
  // =========================
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
          confirmButtonText: "Go to form"
        }).then(() => {
          window.location.href = "../../kkform-personal.html";
        });
        return;
      }
    })
    .catch(() => window.location.href = "../../kkform-personal.html");
  }

  // =========================
  // LGBTQ+ PROFILE NAVIGATION
  // =========================
  async function handleLGBTQProfileNavClick(event) {
    event.preventDefault();
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) {
      await Swal.fire({
        icon: "warning",
        title: "You need to log in first",
        text: "Please log in to access LGBTQ+ Profiling.",
        confirmButtonText: "OK",
      });
      window.location.href = "/html/user/login.html";
      return;
    }

    try {
      const [cycleRes, profileRes] = await Promise.all([
        fetch(
          "http://localhost:5000/api/formcycle/status?formName=LGBTQIA%2B%20Profiling",
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        fetch("http://localhost:5000/api/lgbtqprofiling/me/profile", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const cycleData = await cycleRes.json().catch(() => null);
      const profileData = await profileRes.json().catch(() => ({}));
      const latestCycle = Array.isArray(cycleData)
        ? cycleData[cycleData.length - 1]
        : cycleData;

      const formName = latestCycle?.formName || "LGBTQIA+ Profiling";
      const isFormOpen = latestCycle?.isOpen ?? false;
      const hasProfile = !!profileData?._id;

      if (!isFormOpen && hasProfile) {
        const result = await Swal.fire({
          icon: "info",
          title: `The ${formName} is currently closed`,
          text: `But you already have a ${formName} profile. Do you want to view your response?`,
          showCancelButton: true,
          confirmButtonText: "Yes, view my response",
          cancelButtonText: "No",
        });
        if (result.isConfirmed)
          window.location.href = "lgbtqconfirmation.html";
        return;
      }

      if (!isFormOpen && !hasProfile) {
        await Swal.fire({
          icon: "warning",
          title: `The ${formName} form is currently closed`,
          text: "You cannot submit a new response at this time.",
          confirmButtonText: "OK",
        });
        return;
      }

      if (isFormOpen && hasProfile) {
        const result = await Swal.fire({
          title: `You already answered ${formName} Form`,
          text: "Do you want to view your response?",
          icon: "info",
          showCancelButton: true,
          confirmButtonText: "Yes",
          cancelButtonText: "No",
        });
        if (result.isConfirmed)
          window.location.href = "lgbtqconfirmation.html";
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
          window.location.href = "../../lgbtqform.html";
        });
        return;
      }
    } catch (err) {
      console.error(err);
      window.location.href = "../../lgbtqform.html";
    }
  }

  // =========================
  // EDUCATIONAL ASSISTANCE NAVIGATION
  // =========================
  async function handleEducAssistanceNavClick(event) {
    event.preventDefault();
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) {
      await Swal.fire({
        icon: "warning",
        title: "You need to log in first",
        text: "Please log in to access Educational Assistance.",
        confirmButtonText: "OK",
      });
      window.location.href = "/html/user/login.html";
      return;
    }

    try {
      const [cycleRes, profileRes] = await Promise.all([
        fetch(
          "http://localhost:5000/api/formcycle/status?formName=Educational%20Assistance",
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        fetch("http://localhost:5000/api/educational-assistance/me", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const cycleData = await cycleRes.json().catch(() => null);
      const profileData = await profileRes.json().catch(() => ({}));
      const latestCycle = Array.isArray(cycleData)
        ? cycleData[cycleData.length - 1]
        : cycleData;

      const formName = latestCycle?.formName || "Educational Assistance";
      const isFormOpen = latestCycle?.isOpen ?? false;
      const hasProfile = profileData && profileData._id ? true : false;

      if (!isFormOpen && hasProfile) {
        const result = await Swal.fire({
          icon: "info",
          title: `The ${formName} is currently closed`,
          text: `But you already have an application. Do you want to view your response?`,
          showCancelButton: true,
          confirmButtonText: "Yes, view my response",
          cancelButtonText: "No",
        });
        if (result.isConfirmed)
          window.location.href = "educConfirmation.html";
        return;
      }

      if (!isFormOpen && !hasProfile) {
        await Swal.fire({
          icon: "warning",
          title: `The ${formName} form is currently closed`,
          text: "You cannot submit a new application at this time.",
          confirmButtonText: "OK",
        });
        return;
      }

      if (isFormOpen && hasProfile) {
        const result = await Swal.fire({
          title: `You already applied for ${formName}`,
          text: "Do you want to view your response?",
          icon: "info",
          showCancelButton: true,
          confirmButtonText: "Yes",
          cancelButtonText: "No",
        });
        if (result.isConfirmed)
          window.location.href = "educConfirmation.html";
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
          window.location.href = "../../Educational-assistance-user.html";
        });
        return;
      }
    } catch (err) {
      console.error(err);
      window.location.href = "../../Educational-assistance-user.html";
    }
  }

  // =========================
  // ATTACH EVENT LISTENERS
  // =========================
  const kkProfileNavBtnDesktop = document.getElementById("kkProfileNavBtnDesktop");
  const kkProfileNavBtnMobile = document.getElementById("kkProfileNavBtnMobile");

  if (kkProfileNavBtnDesktop) {
    console.log("✅ Desktop KK Profile button found");
    kkProfileNavBtnDesktop.addEventListener("click", handleKKProfileNavClick);
  } else {
    console.warn("⚠️ Desktop KK Profile button NOT found");
  }

  if (kkProfileNavBtnMobile) {
    console.log("✅ Mobile KK Profile button found");
    kkProfileNavBtnMobile.addEventListener("click", handleKKProfileNavClick);
  } else {
    console.warn("⚠️ Mobile KK Profile button NOT found");
  }

  document
    .getElementById("lgbtqProfileNavBtnDesktop")
    ?.addEventListener("click", handleLGBTQProfileNavClick);
  document
    .getElementById("lgbtqProfileNavBtnMobile")
    ?.addEventListener("click", handleLGBTQProfileNavClick);
  document
    .getElementById("educAssistanceNavBtnDesktop")
    ?.addEventListener("click", handleEducAssistanceNavClick);
  document
    .getElementById("educAssistanceNavBtnMobile")
    ?.addEventListener("click", handleEducAssistanceNavClick);
});
