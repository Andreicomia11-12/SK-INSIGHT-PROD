document.addEventListener('DOMContentLoaded', async function() {
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

  const form = document.getElementById('educationalAssistanceForm');
  if (!form) return; // Prevents error if form is missing

  // Fetch birthday and set it in the form
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) {
    try {
      const res = await fetch('http://localhost:5000/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const user = await res.json();
        const birthdayInput = document.getElementById('birthday');
        if (birthdayInput && user.birthday) {
          birthdayInput.value = user.birthday.split('T')[0]; // format as yyyy-mm-dd
          birthdayInput.readOnly = true; // make it non-editable
        }

        // After fetching user data
        if (user.email) {
          const emailInput = document.getElementById('email');
          if (emailInput) {
            emailInput.value = user.email;
            emailInput.readOnly = true; // Optional: make email not editable
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch birthday:', err);
    }
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = new FormData();

    // Map form fields to backend model fields
    formData.append('surname', document.getElementById('surname').value);
    formData.append('firstname', document.getElementById('firstName').value);
    formData.append('middlename', document.getElementById('middleName').value);
    formData.append('birthday', document.getElementById('birthday').value); // This is now auto-filled
    formData.append('sex', document.getElementById('gender').value);
    formData.append('civilStatus', document.getElementById('civilstatus').value);
    formData.append('religion', document.getElementById('religion').value);
    formData.append('school', document.getElementById('schoolname').value);
    formData.append('schoolAddress', document.getElementById('schooladdress').value);
    formData.append('year', document.getElementById('year').value);
    formData.append('fatherName', document.getElementById('fathername').value);
    formData.append('fatherPhone', document.getElementById('fathercontact').value);
    formData.append('motherName', document.getElementById('mothername').value);
    formData.append('motherPhone', document.getElementById('mothercontact').value);
    formData.append('placeOfBirth', document.getElementById('placeOfBirth').value);
    formData.append('age', document.getElementById('age').value);
    formData.append('contactNumber', document.getElementById('contact').value);
    formData.append('email', document.getElementById('email').value);
    // ...add other fields as needed...

    // Siblings (collect from input fields)
    const siblings = [];
    document.querySelectorAll('#siblingsTableBody tr').forEach(row => {
      siblings.push({
        name: row.querySelector('.sibling-name').value,
        gender: row.querySelector('.sibling-gender').value,
        age: Number(row.querySelector('.sibling-age').value)
      });
    });
    formData.append('siblings', JSON.stringify(siblings));

    // Expenses (collect from input fields)
    const expenses = [];
    document.querySelectorAll('#expensesTableBody tr').forEach(row => {
      expenses.push({
        item: row.querySelector('.expense-item').value,
        expectedCost: Number(row.querySelector('.expense-cost').value)
      });
    });
    formData.append('expenses', JSON.stringify(expenses));

    // Signature file (if you have a file input for signature)
    const signatureInput = document.querySelector('input[type="file"][name="signature"]');
    if (signatureInput && signatureInput.files.length > 0) {
      formData.append('signature', signatureInput.files[0]);
    }

    // Sedula image
    const sedulaInput = document.getElementById('sedulaImage');
    if (sedulaInput && sedulaInput.files.length > 0) {
      formData.append('sedulaImage', sedulaInput.files[0]);
    }
    const coeInput = document.getElementById('coeImage');
    if (coeInput && coeInput.files.length > 0) {
      formData.append('coeImage', coeInput.files[0]);
    }
    const schoolIdInput = document.getElementById('schoolIdImage');
    if (schoolIdInput && schoolIdInput.files.length > 0) {
      formData.append('schoolIdImage', schoolIdInput.files[0]);
    }

    // Send to backend
    try {
      const res = await fetch('http://localhost:5000/api/educational-assistance', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        Swal.fire("✅ Success", "Form submitted successfully!", "success").then(() => {
          window.location.href = "confirmation/html/educConfirmation.html";
        });
        form.reset();
      } else {
        if (res.status === 409) {
          Swal.fire("❌ Error", data.error || "You already submitted for this cycle.", "error");
          return;
        }
        Swal.fire("❌ Error", data.message || "Submission failed.", "error");
      }
    } catch (err) {
      console.error("🚨 Fetch error:", err);
      Swal.fire("Error", "Something went wrong. Try again later.", "error");
    }
  });

  // Siblings: Add Row
  document.getElementById('addSiblingBtn').addEventListener('click', function() {
    const tbody = document.getElementById('siblingsTableBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" class="sibling-name" required></td>
      <td>
        <select class="sibling-gender" required>
          <option value="">Select</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
      </td>
      <td><input type="number" class="sibling-age" min="0" required></td>
      <td><button type="button" class="removeSiblingBtn">Remove</button></td>
    `;
    tbody.appendChild(tr);
  });

  // Siblings: Remove Row
  document.getElementById('siblingsTableBody').addEventListener('click', function(e) {
    if (e.target.classList.contains('removeSiblingBtn')) {
      e.target.closest('tr').remove();
    }
  });

  // Expenses: Add Row
  document.getElementById('addExpenseBtn').addEventListener('click', function() {
    const tbody = document.getElementById('expensesTableBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" class="expense-item" required></td>
      <td><input type="number" class="expense-cost" min="0" required></td>
      <td><button type="button" class="removeExpenseBtn">Remove</button></td>
    `;
    tbody.appendChild(tr);
  });

  // Expenses: Remove Row
  document.getElementById('expensesTableBody').addEventListener('click', function(e) {
    if (e.target.classList.contains('removeExpenseBtn')) {
      e.target.closest('tr').remove();
    }
  });

  // Image preview modal logic
  function showImagePreview(fileInputId) {
    const input = document.getElementById(fileInputId);
    if (input && input.files.length > 0) {
      const file = input.files[0];
      const url = URL.createObjectURL(file);
      const modal = document.getElementById('imagePreviewModal');
      const img = document.getElementById('previewImg');
      img.src = url;
      modal.style.display = 'flex';
      // Remove object URL after modal closes to avoid memory leak
      modal.onclick = function() {
        modal.style.display = 'none';
        img.src = '';
        URL.revokeObjectURL(url);
      };
    } else {
      Swal.fire("No file selected", "Please upload an image first.", "info");
    }
  }

  // Eye icon click listeners
  document.getElementById('viewSedula').addEventListener('click', function() {
    showImagePreview('sedulaImage');
  });
  document.getElementById('viewCOE').addEventListener('click', function() {
    showImagePreview('coeImage');
  });
  document.getElementById('viewSchoolId').addEventListener('click', function() {
    showImagePreview('schoolIdImage');
  });

  // Navbar: Mobile menu toggle
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

  function handleFileInput(inputId, labelId, fileNameId, viewId, deleteId) {
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);
    const fileNameSpan = document.getElementById(fileNameId);
    const viewIcon = document.getElementById(viewId);
    const deleteIcon = document.getElementById(deleteId);

    function updateIcons() {
      const hasFile = input && input.files && input.files.length > 0;
      if (viewIcon) viewIcon.classList.toggle('disabled', !hasFile);
      if (deleteIcon) deleteIcon.classList.toggle('disabled', !hasFile);
      if (viewIcon) viewIcon.style.pointerEvents = hasFile ? 'auto' : 'none';
      if (deleteIcon) deleteIcon.style.pointerEvents = hasFile ? 'auto' : 'none';
      if (viewIcon) viewIcon.style.opacity = hasFile ? '1' : '0.5';
      if (deleteIcon) deleteIcon.style.opacity = hasFile ? '1' : '0.5';
    }

    if (input && label && fileNameSpan) {
      input.addEventListener('change', function() {
        if (input.files && input.files.length > 0) {
          label.style.display = 'none';
          fileNameSpan.textContent = input.files[0].name;
          fileNameSpan.style.display = 'inline-block';
        } else {
          label.style.display = 'inline-flex';
          fileNameSpan.textContent = '';
          fileNameSpan.style.display = 'none';
        }
        updateIcons();
      });
      updateIcons(); // Initial state
    }
  }

  function handleFileDelete(inputId, labelId, fileNameId) {
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);
    const fileNameSpan = document.getElementById(fileNameId);

    if (input && label && fileNameSpan) {
      // Clear the file input, show the label, hide the filename
      input.value = '';
      label.style.display = 'inline-flex';
      fileNameSpan.textContent = '';
      fileNameSpan.style.display = 'none';
    }
  }

  // Sedula delete
  document.getElementById('deleteSedula').addEventListener('click', function() {
    handleFileDelete('sedulaImage', 'sedulaLabel', 'sedulaFileName');
  });

  // COE delete
  document.getElementById('deleteCOE').addEventListener('click', function() {
    handleFileDelete('coeImage', 'coeLabel', 'coeFileName');
  });

  // Signature delete
  document.getElementById('deleteSchoolId').addEventListener('click', function() {
    handleFileDelete('signature', 'signatureLabel', 'signatureFileName');
  });

  // Call for each file input
  handleFileInput('sedulaImage', 'sedulaLabel', 'sedulaFileName', 'viewSedula', 'deleteSedula');
  handleFileInput('coeImage', 'coeLabel', 'coeFileName', 'viewCOE', 'deleteCOE');
  handleFileInput('signature', 'signatureLabel', 'signatureFileName', 'viewSchoolId', 'deleteSchoolId');

  // Set age when birthday is loaded from backend
  const birthdayInput = document.getElementById('birthday');
  const ageInput = document.getElementById('age');
  if (birthdayInput && ageInput) {
    // When birthday is fetched from backend
    if (birthdayInput.value) {
      ageInput.value = calculateAge(birthdayInput.value);
    }
    // When user changes birthday manually
    birthdayInput.addEventListener('change', function() {
      ageInput.value = calculateAge(birthdayInput.value);
    });
  }

  // Close preview button
  document.getElementById('closePreviewBtn').addEventListener('click', function() {
    document.getElementById('imagePreviewModal').style.display = 'none';
  });

  // Get user data from localStorage or sessionStorage
  let userData = JSON.parse(localStorage.getItem('user')) || JSON.parse(sessionStorage.getItem('user')) || {};
  const emailInput = document.getElementById('email');
  if (emailInput && userData.email) {
    emailInput.value = userData.email;
    emailInput.readOnly = true; // Optional: make it not editable
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
    // CASE 4: Form open, no profile → Go to form
    window.location.href = "Educational-assistance-user.html";
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

  // Educational Assistance
  document.getElementById('educAssistanceNavBtnDesktop')?.addEventListener('click', handleEducAssistanceNavClick);
  document.getElementById('educAssistanceNavBtnMobile')?.addEventListener('click', handleEducAssistanceNavClick);
});