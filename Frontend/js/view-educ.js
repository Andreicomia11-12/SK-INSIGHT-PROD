document.addEventListener('DOMContentLoaded', async function() {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) return;

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

  try {
    const res = await fetch('http://localhost:5000/api/educational-assistance/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();


    try {
      const userRes = await fetch('http://localhost:5000/api/kkprofiling/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userInfo = userRes.ok ? await userRes.json() : {};

      // Try to find birthday in different places
      let birthday = '';
      if (userInfo.birthday) {
        birthday = userInfo.birthday;
      } else if (userInfo.personalInfo && userInfo.personalInfo.birthday) {
        birthday = userInfo.personalInfo.birthday;
      } else if (data.birthday) {
        birthday = data.birthday;
      } else {
      }

      // Apply to input
      const bdayInput = document.getElementById('birthday');
      if (bdayInput) {
        bdayInput.value = birthday ? birthday.split('T')[0] : '';
      } else {
      }
    } catch (err) {
    }

    // Fill form fields with fetched data
    document.getElementById('surname').value = data.surname || '';
    document.getElementById('firstName').value = data.firstname || '';
    document.getElementById('middleName').value = data.middlename || '';
    document.getElementById('suffix').value = data.suffix || '';

    // Fetch birthday from user info (from sign-in) if available
    let birthday = "";
    if (data.user && data.user.birthday) {
      birthday = data.user.birthday;
    } else if (data.kkInfo && data.kkInfo.birthday) {
      birthday = data.kkInfo.birthday;
    } else if (data.birthday) {
      birthday = data.birthday;
    }
    const birthdayInput = document.getElementById('birthday');
if (birthdayInput && data.birthday) {
  const formattedBirthday = data.birthday.split('T')[0]; // ensure it's YYYY-MM-DD
  birthdayInput.disabled = false; // temporarily enable so Chrome will display it
  birthdayInput.value = formattedBirthday;
  birthdayInput.disabled = true; // disable again to prevent user editing
}

    document.getElementById('placeOfBirth').value = data.placeOfBirth || '';
    document.getElementById('age').value = data.age || '';
    document.getElementById('gender').value = data.sex || '';
    document.getElementById('civilStatus').value = data.civilStatus || '';
    document.getElementById('religion').value = data.religion || '';
    document.getElementById('email').value = data.email || '';
    document.getElementById('contact').value = data.contactNumber || '';
    document.getElementById('schoolname').value = data.school || '';
    document.getElementById('schooladdress').value = data.schoolAddress || '';
    document.getElementById('year').value = data.year || '';
    document.getElementById('benefittype').value = data.typeOfBenefit || '';
    document.getElementById('fathername').value = data.fatherName || '';
    document.getElementById('fathercontact').value = data.fatherPhone || '';
    document.getElementById('mothername').value = data.motherName || '';
    document.getElementById('mothercontact').value = data.motherPhone || '';

    // Siblings table
    const siblingsBody = document.getElementById('siblingsTableBody');
    siblingsBody.innerHTML = '';
    if (Array.isArray(data.siblings)) {
      data.siblings.forEach(sibling => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${sibling.name || ''}</td>
          <td>${sibling.gender || ''}</td>
          <td>${sibling.age || ''}</td>
        `;
        siblingsBody.appendChild(row);
      });
    }

    // Expenses table
    const expensesBody = document.getElementById('expensesTableBody');
    expensesBody.innerHTML = '';
    if (Array.isArray(data.expenses)) {
      data.expenses.forEach(expense => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${expense.item || ''}</td>
          <td>${expense.expectedCost || ''}</td>
        `;
        expensesBody.appendChild(row);
      });
    }

    // Requirements: Sedula, COE, Signature (show file name only, remove folder path)
    if (data.frontImage) {
      document.getElementById('frontImageUploadColumn').textContent = data.frontImage.replace(/^.*[\\/]/, '');
    }
    if (data.backImage) {
      document.getElementById('backImageUploadColumn').textContent = data.backImage.replace(/^.*[\\/]/, '');
    }
    if (data.coeImage) {
      document.getElementById('coeImageUploadColumn').textContent = data.coeImage.replace(/^.*[\\/]/, '');
    }
    if (data.voter) {
      document.getElementById('voterUploadColumn').textContent = data.voter.replace(/^.*[\\/]/, '');
    }

    // Optionally, add preview logic for images if you want
    // Example for Sedula:
    const viewFront = document.getElementById('viewFront');
if (viewFront) {
  viewFront.onclick = function() {
    if (data.frontImage) {
      document.getElementById('previewImg').src = data.frontImage;
      document.getElementById('imagePreviewModal').style.display = 'block';
    }
  };
}

    const viewBack = document.getElementById('viewBack');
if (viewBack) {
  viewBack.onclick = function() {
    if (data.backImage) {
      document.getElementById('previewImg').src = data.backImage;
      document.getElementById('imagePreviewModal').style.display = 'block';
    }
  };
}

// Handle COE preview
const viewCOE = document.getElementById('viewCOE');
if (viewCOE) {
  viewCOE.onclick = function() {
    if (data.coeImage) {
      document.getElementById('previewImg').src = `/uploads/${data.coeImage}`;
      document.getElementById('imagePreviewModal').style.display = 'block';
    }
  };
}

// Handle close preview button
const closePreviewBtn = document.getElementById('closePreviewBtn');
if (closePreviewBtn) {
  closePreviewBtn.onclick = function() {
    document.getElementById('imagePreviewModal').style.display = 'none';
  };
}

// Repeat for COE and Signature if needed
    const viewVoter = document.getElementById('viewVoter');
if (viewVoter) {
  viewVoter.onclick = function() {
    if (data.voter) {
      document.getElementById('previewImg').src = data.voter;
      document.getElementById('imagePreviewModal').style.display = 'block';
    }
  };
}
  } catch (err) {
    console.error('Failed to fetch Educational Assistance data:', err);
  }
});

document.addEventListener('DOMContentLoaded', function() {
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
        confirmButtonText: "Go to form"
      }).then(() => {
        window.location.href = "../../lgbtqform.html";
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
        confirmButtonText: "Go to form"
      }).then(() => {
        window.location.href = "../../Educational-assistance-user.html";
      });
      return;
    }
  })
  .catch(() => window.location.href = "../../Educational-assistance-user.html");
}

document.addEventListener('DOMContentLoaded', async function () {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch('http://localhost:5000/api/educational-assistance/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();

    // Populate the requirements table with Cloudinary URLs
    const requirements = [
      { id: 'viewFront', column: 'frontImage', label: 'Front ID', url: data.frontImage },
      { id: 'viewBack', column: 'backImage', label: 'Back ID', url: data.backImage },
      { id: 'viewCOE', column: 'coeImage', label: 'Certificate of Enrollment', url: data.coeImage },
      { id: 'viewVoter', column: 'voter', label: "Parent's Voter's Certificate", url: data.voter },
    ];

    requirements.forEach((req) => {
      console.log(`Checking ID: ${req.column}UploadColumn`);
      const column = document.getElementById(`${req.column}UploadColumn`);
      if (!column) {
        console.warn(`⚠️ Column with ID "${req.column}UploadColumn" not found in the DOM.`);
      }
    });
  } catch (err) {
    console.error('Failed to fetch Educational Assistance data:', err);
  }
});

// Helper function to show image preview in a modal
function showImagePreview(imageUrl) {
  const modal = document.getElementById('imagePreviewModal');
  const previewImg = document.getElementById('previewImg');
  if (modal && previewImg) {
    previewImg.src = imageUrl;
    modal.style.display = 'flex';
  }
}

// Close the preview modal
document.getElementById('closePreviewBtn').addEventListener('click', function () {
  const modal = document.getElementById('imagePreviewModal');
  if (modal) modal.style.display = 'none';
});

document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('educationalAssistanceForm');

  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();

      const formData = new FormData(form);

      // Append files manually if needed
      const maybeAppendFile = (id, key) => {
        const inp = document.getElementById(id);
        if (inp && inp.files && inp.files.length > 0) {
          formData.append(key, inp.files[0]);
        }
      };

      maybeAppendFile('voter', 'voter');
      maybeAppendFile('coeImage', 'coeImage');
      maybeAppendFile('frontImage', 'frontImage');
      maybeAppendFile('backImage', 'backImage');

      try {
        const res = await fetch('http://localhost:5000/api/educational-assistance', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`,
          },
          body: formData
        });

        const data = await res.json();

        if (!res.ok) {
          console.error('Submit failed', res.status, data);
          Swal.fire('Error', data.error || 'Failed to submit form', 'error');
          return;
        }

        Swal.fire('Success', 'Form submitted successfully!', 'success').then(() => {
          window.location.href = '../html/educConfirmation.html';
        });

      } catch (err) {
        console.error('Fetch error:', err);
        Swal.fire('Error', 'Network or server error', 'error');
      }
    });
  } else {
    console.error('Form element not found in DOM.');
  }
});