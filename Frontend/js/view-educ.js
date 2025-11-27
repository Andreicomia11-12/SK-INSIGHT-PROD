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

document.addEventListener('DOMContentLoaded', async function() {
  // if (!validateTokenAndRedirect("Educational Assistance Profile")) {
  //   return;
  // }
  
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');

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


    // try {
    //   const userRes = await fetch('http://localhost:5000/api/kkprofiling/me', {
    //     headers: { Authorization: `Bearer ${token}` }
    //   });
    //   const userInfo = userRes.ok ? await userRes.json() : {};

    //   // Try to find birthday in different places
    //   let birthday = '';
    //   if (userInfo.birthday) {
    //     birthday = userInfo.birthday;
    //   } else if (userInfo.personalInfo && userInfo.personalInfo.birthday) {
    //     birthday = userInfo.personalInfo.birthday;
    //   } else if (data.birthday) {
    //     birthday = data.birthday;
    //   } else {
    //   }

    //   // Apply to input
    //   const bdayInput = document.getElementById('birthday');
    //   if (bdayInput) {
    //     bdayInput.value = birthday ? birthday.split('T')[0] : '';
    //   } else {
    //   }
    // } catch (err) {
    // }

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
    // Display academic level stored in DB
    const academicEl = document.getElementById('academicLevel');
    if (academicEl) academicEl.value = data.academicLevel || '';
    // Ensure year options match academic level (Junior High -> Grade 7-10)
    const yearEl = document.getElementById('year');
    if (yearEl) {
      const lvl = (data.academicLevel || '').toString().toLowerCase();
      let options = [];
      if (lvl.includes('junior')) {
        options = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
      } else if (lvl.includes('senior')) {
        options = ['Grade 11', 'Grade 12'];
      } else {
        options = ['Grade 11', 'Grade 12'];
      }
      yearEl.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join('');
      yearEl.value = data.year || '';
    }
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
          <td>${formatCurrency(expense.expectedCost)}</td>
        `;
        expensesBody.appendChild(row);
      });
    }

    // Requirements: Sedula, COE, Signature (show truncated file name only, remove folder path)
    if (data.frontImage) {
      const fileName = data.frontImage.replace(/^.*[\\/]/, '');
      const truncatedName = truncateFileName(fileName);
      const element = document.getElementById('frontImageUploadColumn');
      if (element) {
        element.textContent = truncatedName;
        element.title = fileName; // Show full name on hover
      }
    }
    if (data.backImage) {
      const fileName = data.backImage.replace(/^.*[\\/]/, '');
      const truncatedName = truncateFileName(fileName);
      const element = document.getElementById('backImageUploadColumn');
      if (element) {
        element.textContent = truncatedName;
        element.title = fileName; // Show full name on hover
      }
    }
    if (data.coeImage) {
      const fileName = data.coeImage.replace(/^.*[\\/]/, '');
      const truncatedName = truncateFileName(fileName);
      const element = document.getElementById('coeImageUploadColumn');
      if (element) {
        element.textContent = truncatedName;
        element.title = fileName; // Show full name on hover
      }
    }
    if (data.voter) {
      const fileName = data.voter.replace(/^.*[\\/]/, '');
      const truncatedName = truncateFileName(fileName);
      const element = document.getElementById('voterUploadColumn');
      if (element) {
        element.textContent = truncatedName;
        element.title = fileName; // Show full name on hover
      }
    }

    // Optionally, add preview logic for images if you want
    // Example for Sedula:
    const viewFront = document.getElementById('viewFront');
if (viewFront) {
  viewFront.onclick = function() {
    if (data.frontImage) {
      showImagePreview(data.frontImage);
    }
  };
}

    const viewBack = document.getElementById('viewBack');
if (viewBack) {
  viewBack.onclick = function() {
    if (data.backImage) {
      showImagePreview(data.backImage);
    }
  };
}

// Handle COE preview
const viewCOE = document.getElementById('viewCOE');
if (viewCOE) {
  viewCOE.onclick = function() {
    if (data.coeImage) {
      // Use Cloudinary URL directly if it's already a full URL
      const imageUrl = data.coeImage.startsWith('http') ? data.coeImage : `/uploads/${data.coeImage}`;
      showImagePreview(imageUrl);
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
      showImagePreview(data.voter);
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
  document.getElementById('educAssistanceNavBtnDesktop')?.addEventListener('click', function(e){ try{ if (e && typeof e.preventDefault === 'function') e.preventDefault(); }catch(err){}; handleEducAssistanceNavClick(e); }, { capture: true });
  document.getElementById('educAssistanceNavBtnMobile')?.addEventListener('click', function(e){ try{ if (e && typeof e.preventDefault === 'function') e.preventDefault(); }catch(err){}; handleEducAssistanceNavClick(e); }, { capture: true });
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

// Helper function to truncate file names
function truncateFileName(fileName, maxLength = 6) {
  if (fileName.length <= maxLength) {
    return fileName;
  }
  
  // Always show first 6 characters + "..." for files longer than 6 characters
  return fileName.substring(0, maxLength) + "...";
}

document.addEventListener('DOMContentLoaded', async function () {
  // if (!validateTokenAndRedirect("Educational Assistance Profile")) {
  //   return;
  // }
  
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');

  try {
    // Fetch Educational Assistance data
    const res = await fetch('http://localhost:5000/api/educational-assistance/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();

    // Fetch user data (to get birthday from sign-up)
    const userRes = await fetch('http://localhost:5000/api/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const userInfo = userRes.ok ? await userRes.json() : {};

    // Use the birthday from the user data
    const birthday = userInfo.birthday || ''; // Default to empty string if not found
    const birthdayInput = document.getElementById('birthday');
    if (birthdayInput) {
      birthdayInput.value = birthday ? birthday.split('T')[0] : ''; // Format as YYYY-MM-DD
      birthdayInput.disabled = true; // Make it read-only
    }

    // Populate other fields with fetched data
    document.getElementById('surname').value = data.surname || '';
    document.getElementById('firstName').value = data.firstname || '';
    document.getElementById('middleName').value = data.middlename || '';
    document.getElementById('suffix').value = data.suffix || '';
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

    // Populate siblings table
    const siblingsBody = document.getElementById('siblingsTableBody');
    siblingsBody.innerHTML = '';
    if (Array.isArray(data.siblings)) {
      data.siblings.forEach((sibling) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${sibling.name || ''}</td>
          <td>${sibling.gender || ''}</td>
          <td>${sibling.age || ''}</td>
        `;
        siblingsBody.appendChild(row);
      });
    }

    // Populate expenses table
    const expensesBody = document.getElementById('expensesTableBody');
    expensesBody.innerHTML = '';
    if (Array.isArray(data.expenses)) {
      data.expenses.forEach((expense) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${expense.item || ''}</td>
          <td>${formatCurrency(expense.expectedCost)}</td>
        `;
        expensesBody.appendChild(row);
      });
    }

    // Populate requirements (e.g., uploaded files)
    const requirements = [
      { id: 'viewFront', column: 'frontImage', label: 'Front ID', url: data.frontImage },
      { id: 'viewBack', column: 'backImage', label: 'Back ID', url: data.backImage },
      { id: 'viewCOE', column: 'coeImage', label: 'Certificate of Enrollment', url: data.coeImage },
      { id: 'viewVoter', column: 'voter', label: "Parent's Voter's Certificate", url: data.voter },
    ];

    requirements.forEach((req) => {
      const column = document.getElementById(`${req.column}UploadColumn`);
      if (column) {
        const fileName = req.url ? req.url.replace(/^.*[\\/]/, '') : '';
        const truncatedName = truncateFileName(fileName);
        column.textContent = truncatedName;
        column.title = fileName; // Show full name on hover
      }
    });

    // Hide voter certificate display for Senior High applicants (hide whole row if present)
    try {
      const lvl = (data.academicLevel || '').toString().toLowerCase();
      const hideVoter = /senior/i.test(lvl);
      const voterColumn = document.getElementById('voterUploadColumn');
      const viewVoterBtn = document.getElementById('viewVoter');
      if (voterColumn) {
        voterColumn.style.display = hideVoter ? 'none' : '';
        const tr = voterColumn.closest && voterColumn.closest('tr');
        if (tr) tr.style.display = hideVoter ? 'none' : '';
      }
      if (viewVoterBtn) viewVoterBtn.style.display = hideVoter ? 'none' : '';
    } catch (e) { /* ignore */ }

    // Add preview logic for images
    const viewFront = document.getElementById('viewFront');
    if (viewFront) {
      viewFront.onclick = function () {
        if (data.frontImage) {
          showImagePreview(data.frontImage);
        }
      };
    }

    const viewBack = document.getElementById('viewBack');
    if (viewBack) {
      viewBack.onclick = function () {
        if (data.backImage) {
          showImagePreview(data.backImage);
        }
      };
    }

    const viewCOE = document.getElementById('viewCOE');
    if (viewCOE) {
      viewCOE.onclick = function () {
        if (data.coeImage) {
          showImagePreview(data.coeImage);
        }
      };
    }

    const viewVoter = document.getElementById('viewVoter');
    if (viewVoter) {
      viewVoter.onclick = function () {
        if (data.voter) {
          showImagePreview(data.voter);
        }
      };
    }
  } catch (err) {
    console.error('Failed to fetch Educational Assistance data:', err);
  }
});

// Helper function to truncate file names
function truncateFileName(fileName, maxLength = 6) {
  if (fileName.length <= maxLength) {
    return fileName;
  }
  return fileName.substring(0, maxLength) + '...';
}

// Format number as Philippine peso with two decimal places
function formatCurrency(amount) {
  if (amount === undefined || amount === null || amount === '') return '';
  const num = Number(amount);
  if (Number.isNaN(num)) return '';
  // Use toLocaleString to add thousand separators and fixed two decimals
  return '₱' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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

// Attach Done button handler (shows confirmation then go to educConfirmation.html)
// ...existing code...

// Attach Done button handler — remove SweetAlert, redirect immediately
document.addEventListener('DOMContentLoaded', () => {
  const doneSelector = [
    '#doneBtn',
    '.done-btn',
    'button[data-action="done"]',
    'input[type="submit"][value="Done"]',
    'button[type="submit"].done'
  ];

  let doneBtn = null;
  for (const sel of doneSelector) {
    try { doneBtn = document.querySelector(sel); } catch (e) {}
    if (doneBtn) break;
  }

  // Fallback: find a button whose visible text/value is "Done"
  if (!doneBtn) {
    const btns = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
    doneBtn = btns.find(b => ((b.innerText || b.value || '').trim().toLowerCase() === 'done'));
  }

  const goToConfirmation = () => {
    window.location.href = '/Frontend/html/user/confirmation/html/educConfirmation.html';
  };

  if (doneBtn) {
    doneBtn.addEventListener('click', (e) => {
      if (e && e.preventDefault) e.preventDefault();
      goToConfirmation();
    });
  } else {
    document.body.addEventListener('click', (e) => {
      const target = e.target.closest('[data-done]');
      if (target) {
        e.preventDefault();
        goToConfirmation();
      }
    });
  }
});

