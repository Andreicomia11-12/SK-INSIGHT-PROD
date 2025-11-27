/*
  editKK.js
  - Fetch KK profile from backend and populate forms when present on the page.
  - Make fields editable and provide a save handler that updates localStorage and attempts to send the update to the server.
  - Handles profile/signature preview and base64 storage.
*/

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

document.addEventListener('DOMContentLoaded', function () {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) return; // nothing to do when not logged in
  let _kkProfileId = null; // will hold existing profile id when fetched

  // Helper: convert base64 to File
  function base64ToFile(base64, filename) {
    const arr = base64.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  }

  // Helper: compute age (years) from a YYYY-MM-DD date string
  function computeAgeFromDateString(dateStr) {
    if (!dateStr) return '';
    // Ensure dateStr is YYYY-MM-DD (server may provide ISO)
    const dStr = dateStr.split('T')[0];
    const d = new Date(dStr);
    if (isNaN(d)) return '';
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age;
  }

  // Helper: apply or remove readonly-like behavior to Registered National Voter select
  function setNationalVoterReadonly(enableReadonly) {
    const rn = document.getElementById('registeredNationalVoter');
    if (!rn) return;

    // Remove existing handlers when toggling off
    if (!enableReadonly) {
      try {
        if (rn._kkPrevent) {
          rn.removeEventListener('change', rn._kkPrevent, { passive: false });
          rn.removeEventListener('keydown', rn._kkPrevent, { passive: false });
          rn.removeEventListener('mousedown', rn._kkPrevent, { passive: false });
          rn.removeEventListener('focus', rn._kkFocus);
          delete rn._kkPrevent;
          delete rn._kkFocus;
        }
      } catch (e) { /* ignore */ }
      delete rn.dataset.readonlyMinor;
      return;
    }

    // enableReadonly === true
    rn.value = 'No';
    rn.dataset.readonlyMinor = 'true';

    // prevent function stored on element so it can be removed later
    if (!rn._kkPrevent) {
      rn._kkPrevent = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        rn.value = 'No';
        try { rn.blur(); } catch (e) {}
        return false;
      };
      rn._kkFocus = function () { try { rn.blur(); } catch (e) {} };
      rn.addEventListener('change', rn._kkPrevent, { passive: false });
      rn.addEventListener('keydown', rn._kkPrevent, { passive: false });
      rn.addEventListener('mousedown', rn._kkPrevent, { passive: false });
      rn.addEventListener('focus', rn._kkFocus);
    }

    // persist into step3 sessionStorage
    try {
      const s3 = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
      s3.registeredNationalVoter = 'No';
      sessionStorage.setItem('kkProfileStep3', JSON.stringify(s3));
    } catch (e) { /* ignore storage errors */ }
  }

  // Helper: set value if element exists
  function setIfExists(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') el.value = value ?? '';
  }


    // Hamburger menu code
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

  

  // Populate fields using returned profile object
  async function populateFromServer() {
    try {
      const res = await fetch('http://localhost:5000/api/kkprofiling/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      // store profile id for update calls
      if (data && (data._id || data.id)) {
        _kkProfileId = data._id || data.id;
      }

      // Flatten keys commonly used in forms
      const birthdayVal = data.birthday ? data.birthday.split('T')[0] : data.birthday;
      const computedAge = computeAgeFromDateString(birthdayVal);

      const map = {
        lastname: data.lastname,
        firstname: data.firstname,
        middlename: data.middlename,
        suffix: data.suffix,
        gender: data.gender,
        birthday: birthdayVal,
        age: computedAge || (data.age || ''),
        region: data.region || '',
        province: data.province || '',
        municipality: data.municipality || '',
        barangay: data.barangay || '',
        purok: data.purok || '',
        email: data.email || '',
        contactNumber: data.contactNumber || data.contactNumber || '',
        civilStatus: data.civilStatus || '',
        youthAgeGroup: data.youthAgeGroup || '',
        youthClassification: data.youthClassification || '',
        specificNeedType: data.specificNeedType || '',
        educationalBackground: data.educationalBackground || '',
        workStatus: data.workStatus || '',
        registeredSKVoter: typeof data.registeredSKVoter === 'boolean' ? (data.registeredSKVoter ? 'Yes' : 'No') : data.registeredSKVoter || '',
        registeredNationalVoter: typeof data.registeredNationalVoter === 'boolean' ? (data.registeredNationalVoter ? 'Yes' : 'No') : data.registeredNationalVoter || '',
        votedLastSKElection: typeof data.votedLastSKElection === 'boolean' ? (data.votedLastSKElection ? 'Yes' : 'No') : data.votedLastSKElection || '',
        attendedKKAssembly: typeof data.attendedKKAssembly === 'boolean' ? (data.attendedKKAssembly ? 'Yes' : 'No') : data.attendedKKAssembly || '',
        attendanceCount: data.attendanceCount || '',
        reasonDidNotAttend: data.reasonDidNotAttend || ''
      };

      Object.entries(map).forEach(([k, v]) => setIfExists(k, v));

      // Show/hide specific needs dropdown when youthClassification is 'Youth with Specific Needs'
      try {
        const youthClsEl = document.getElementById('youthClassification');
        const specificNeedsGroup = document.getElementById('specificNeedsGroup');
        const specificNeedTypeEl = document.getElementById('specificNeedType');
        if (youthClsEl && specificNeedsGroup) {
          const checkAndToggle = (val) => {
              if (val === 'Youth with Specific Needs') {
                specificNeedsGroup.style.display = 'block';
                if (specificNeedTypeEl) specificNeedTypeEl.required = true;
              } else {
                specificNeedsGroup.style.display = 'none';
                if (specificNeedTypeEl) {
                  specificNeedTypeEl.required = false;
                  specificNeedTypeEl.value = '';
                }
              // persist cleared value
              try {
                const s3 = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
                delete s3.specificNeedType;
                sessionStorage.setItem('kkProfileStep3', JSON.stringify(s3));
              } catch (e) { /* ignore */ }
            }
          };

          // initial toggle based on populated value
          checkAndToggle(youthClsEl.value || map.youthClassification || '');

          // attach listener to keep UI in sync and persist selection
          youthClsEl.addEventListener('change', function () {
            const v = this.value;
            checkAndToggle(v);
            try {
              const s3 = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
              s3.youthClassification = v;
              // if switching to specific needs keep existing specificNeedType if present
              if (v !== 'Youth with Specific Needs') delete s3.specificNeedType;
              sessionStorage.setItem('kkProfileStep3', JSON.stringify(s3));
            } catch (e) { /* ignore */ }
          });
        }
      } catch (e) {
        // ignore UI wiring errors
      }

      // ensure required attributes for attendance groups are applied in edit mode as well
      try {
        const attendedEl = document.getElementById('attendedKKAssembly');
        const attendanceCountEl = document.getElementById('attendanceCount');
        const reasonEl = document.getElementById('reasonDidNotAttend');
        const attendanceCountGroup = document.getElementById('attendanceCountGroup');
        const reasonGroup = document.getElementById('reasonGroup');
        if (attendedEl && (attendanceCountGroup || reasonGroup)) {
          const checkAttendance = (val) => {
            if (val === 'Yes') {
              if (attendanceCountGroup) attendanceCountGroup.style.display = 'block';
              if (reasonGroup) reasonGroup.style.display = 'none';
              if (attendanceCountEl) attendanceCountEl.required = true;
              if (reasonEl) reasonEl.required = false;
            } else if (val === 'No') {
              if (attendanceCountGroup) attendanceCountGroup.style.display = 'none';
              if (reasonGroup) reasonGroup.style.display = 'block';
              if (attendanceCountEl) attendanceCountEl.required = false;
              if (reasonEl) reasonEl.required = true;
            } else {
              if (attendanceCountGroup) attendanceCountGroup.style.display = 'none';
              if (reasonGroup) reasonGroup.style.display = 'none';
              if (attendanceCountEl) attendanceCountEl.required = false;
              if (reasonEl) reasonEl.required = false;
            }
          };

          // initial toggle based on populated value
          checkAttendance(document.getElementById('attendedKKAssembly')?.value || '');

          attendedEl.addEventListener('change', function () {
            const v = this.value;
            checkAttendance(v);
            try {
              const s3 = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
              s3.attendedKKAssembly = v;
              if (v === 'Yes') {
                delete s3.reasonDidNotAttend;
              } else if (v === 'No') {
                delete s3.attendanceCount;
              }
              sessionStorage.setItem('kkProfileStep3', JSON.stringify(s3));
            } catch (e) { /* ignore */ }
          });
        }
      } catch (e) { /* ignore */ }

      // Show/hide attendance count / reason groups based on attendedKKAssembly value
      try {
        const attendedEl = document.getElementById('attendedKKAssembly');
        const attendanceCountGroup = document.getElementById('attendanceCountGroup');
        const reasonGroup = document.getElementById('reasonGroup');
        const attendanceCountEl = document.getElementById('attendanceCount');
        const reasonEl = document.getElementById('reasonDidNotAttend');

        if (attendedEl && (attendanceCountGroup || reasonGroup)) {
          const checkAttendance = (val) => {
            if (val === 'Yes') {
              if (attendanceCountGroup) attendanceCountGroup.style.display = 'block';
              if (reasonGroup) reasonGroup.style.display = 'none';
            } else if (val === 'No') {
              if (attendanceCountGroup) attendanceCountGroup.style.display = 'none';
              if (reasonGroup) reasonGroup.style.display = 'block';
            } else {
              if (attendanceCountGroup) attendanceCountGroup.style.display = 'none';
              if (reasonGroup) reasonGroup.style.display = 'none';
            }
          };

          // initial toggle based on populated value
          checkAttendance(attendedEl.value || map.attendedKKAssembly || '');

          attendedEl.addEventListener('change', function () {
            const v = this.value;
            checkAttendance(v);
            try {
              const s3 = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
              s3.attendedKKAssembly = v;
              // clear the opposite fields when toggling
              if (v === 'Yes') {
                delete s3.reasonDidNotAttend;
                // keep attendanceCount if selected
              } else if (v === 'No') {
                delete s3.attendanceCount;
              }
              sessionStorage.setItem('kkProfileStep3', JSON.stringify(s3));
            } catch (e) { /* ignore */ }
          });

          // also persist manual changes to the sub-fields
          if (attendanceCountEl) attendanceCountEl.addEventListener('change', function () {
            try { const s3 = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}'); s3.attendanceCount = this.value; sessionStorage.setItem('kkProfileStep3', JSON.stringify(s3)); } catch(e){}
          });
          if (reasonEl) reasonEl.addEventListener('change', function () {
            try { const s3 = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}'); s3.reasonDidNotAttend = this.value; sessionStorage.setItem('kkProfileStep3', JSON.stringify(s3)); } catch(e){}
          });
        }
      } catch (e) {
        // ignore
      }

      // Ensure age input is in sync with computed value
      const ageEl = document.getElementById('age');
      if (ageEl && (ageEl.value === '' || ageEl.value !== String(map.age))) {
        ageEl.value = map.age;
      }

      // If age implies minor, apply readonly-like behavior to registeredNationalVoter
      try {
        const rn = document.getElementById('registeredNationalVoter');
        const numericAge = Number(map.age);
        if (rn && !isNaN(numericAge) && numericAge <= 17) {
          setNationalVoterReadonly(true);
        } else {
          setNationalVoterReadonly(false);
        }
      } catch (e) {
        // ignore
      }

      // Images: if server provides image urls (including Cloudinary), fetch and convert to base64 and store/display
      async function fetchImageAsBase64(url) {
        try {
          const r = await fetch(url);
          if (!r.ok) throw new Error('image fetch failed ' + r.status);
          const blob = await r.blob();
          return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (err) {
          console.warn('Failed to fetch image as base64', err);
          return null;
        }
      }

      try {
        // backend may return a dedicated image endpoint or include URLs on the profile object
  let imageUrl = data.profileImageUrl || data.imageUrl || data.profileImage || data.image;
  // backend stores signature file name in `signatureImagePath` on the profile document
  let signatureUrl = data.signatureImageUrl || data.signatureImage || data.signature || data.signatureImagePath;

        // If no direct URL, try the dedicated endpoint
        if (!imageUrl) {
          try {
            const imgRes = await fetch('http://localhost:5000/api/kkprofiling/me/image', {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (imgRes.ok) {
              const json = await imgRes.json();
              imageUrl = json.imageUrl || imageUrl;
              signatureUrl = json.signatureUrl || signatureUrl || json.signatureImageUrl;
            }
          } catch (e) {
            /* ignore */
          }
        }

        // If server returned a plain filename (uploads) or a remote URL, resolve the proper preview URL like view-kkyouth.js
        if (imageUrl) {
          // If server returned something like 'uploads/profile/abc.jpg' or just 'abc.jpg', construct the public URL
          let resolved;
          if (imageUrl.startsWith('http')) {
            resolved = imageUrl;
          } else {
            // If the value looks like a path with uploads/..., use it as-is; otherwise assume it's the profile uploads filename
            if (imageUrl.includes('uploads')) {
              resolved = imageUrl.startsWith('/') ? (`http://localhost:5000${imageUrl}`) : (`http://localhost:5000/${imageUrl}`);
            } else {
              resolved = `http://localhost:5000/uploads/profile/${imageUrl}`;
            }
          }

          // Render the preview using the resolved public URL (matches view-kkyouth.js behaviour)
          const profilePreview = document.getElementById('profileImagePreview');
          const idPreview = document.getElementById('idImagePreview');
          // use renderPreview so edit controls (View/Change/Remove) are available
          if (profilePreview) renderPreview('profileImagePreview', resolved);
          if (idPreview) renderPreview('idImagePreview', resolved);

          // Also try to fetch as base64 and cache locally for edit flows (best-effort)
          try {
            const b64 = await fetchImageAsBase64(resolved);
            if (b64) {
              const s3 = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
              s3.profileImage = b64;
              sessionStorage.setItem('kkProfileStep3', JSON.stringify(s3));
            }
          } catch (e) { /* ignore */ }
        }

        if (signatureUrl) {
          let resolvedSig;
          if (signatureUrl.startsWith('http')) {
            resolvedSig = signatureUrl;
          } else {
            // strip any path and use uploads/signatures/<filename>
            const fname = signatureUrl.replace(/^.*[\\\/]/, '');
            resolvedSig = `http://localhost:5000/uploads/signatures/${fname}`;
          }

          const sigPreview = document.getElementById('signatureImagePreview');
          const sigPreviewAlt = document.getElementById('signaturePreview');
          // use renderPreview so edit controls are available
          if (sigPreview) renderPreview('signatureImagePreview', resolvedSig);
          if (sigPreviewAlt) renderPreview('signaturePreview', resolvedSig);

          try {
            const b64sig = await fetchImageAsBase64(resolvedSig);
            if (b64sig) {
              const s3 = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
              s3.signatureImage = b64sig;
              sessionStorage.setItem('kkProfileStep3', JSON.stringify(s3));
            }
          } catch (e) { /* ignore */ }
        }
      } catch (e) {
        // ignore image errors
        console.warn('image handling error', e);
      }

      // Persist into localStorage so other parts (modal or forms) can reuse
      const step1 = {
        lastname: map.lastname,
        firstname: map.firstname,
        middlename: map.middlename,
        suffix: map.suffix,
        gender: map.gender,
        birthday: map.birthday,
        age: map.age
      };
      const step2 = {
        region: map.region,
        province: map.province,
        municipality: map.municipality,
        barangay: map.barangay,
        purok: map.purok,
        email: map.email,
        contactNumber: map.contactNumber,
        civilStatus: map.civilStatus
      };
      const step3 = {
        youthAgeGroup: map.youthAgeGroup,
        youthClassification: map.youthClassification,
        specificNeedType: map.specificNeedType,
        educationalBackground: map.educationalBackground,
        workStatus: map.workStatus,
        registeredSKVoter: map.registeredSKVoter,
        registeredNationalVoter: map.registeredNationalVoter,
        votedLastSKElection: map.votedLastSKElection,
        attendedKKAssembly: map.attendedKKAssembly,
        attendanceCount: map.attendanceCount,
        reasonDidNotAttend: map.reasonDidNotAttend
      };

      sessionStorage.setItem('kkProfileStep1', JSON.stringify(step1));
      sessionStorage.setItem('kkProfileStep2', JSON.stringify(step2));
      // preserve any existing base64 images in step3
      const existing3 = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
      const merged3 = Object.assign({}, existing3, step3);
      sessionStorage.setItem('kkProfileStep3', JSON.stringify(merged3));

    } catch (err) {
      console.warn('Failed to fetch kk profile:', err);
    }
  }

  // Save changes: gather values from DOM and attempt to send to server
  async function saveChangesToServer() {
    // gather step1/2/3 from DOM if present, otherwise from localStorage
    const fromDomOrStorage = (idList, storageKey) => {
      const out = {};
      const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
      idList.forEach(id => {
        const el = document.getElementById(id);
        out[id] = el ? el.value : (stored[id] || '');
      });
      return out;
    };

    const step1 = fromDomOrStorage(['lastname','firstname','middlename','suffix','gender','birthday','age'],'kkProfileStep1');
    const step2 = fromDomOrStorage(['region','province','municipality','barangay','purok','email','contactNumber','civilStatus'],'kkProfileStep2');

    const step3Keys = ['youthAgeGroup','youthClassification','specificNeedType','educationalBackground','workStatus','registeredSKVoter','registeredNationalVoter','votedLastSKElection','attendedKKAssembly','attendanceCount','reasonDidNotAttend'];
    const step3 = fromDomOrStorage(step3Keys,'kkProfileStep3');

    // merge with existing step3 to preserve images
    const existing3 = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
    const finalStep3 = Object.assign({}, existing3, step3);

    // Update sessionStorage first
    sessionStorage.setItem('kkProfileStep1', JSON.stringify(step1));
    sessionStorage.setItem('kkProfileStep2', JSON.stringify(step2));
    sessionStorage.setItem('kkProfileStep3', JSON.stringify(finalStep3));

    // Attempt to send update to server. Use multipart/form-data similar to create path.
    try {
      // Build a plain object payload we can send as JSON for updates
      const payloadObj = Object.assign({}, step1, step2, finalStep3);

      // If we have an existing profile id, the backend's PUT handler expects JSON (no multipart middleware),
      // The backend now accepts multipart on PUT. If user changed images (we have base64 blobs), send FormData via PUT.
      if (_kkProfileId) {
        const hasNewProfileImage = finalStep3.profileImage && typeof finalStep3.profileImage === 'string' && finalStep3.profileImage.startsWith('data:');
        const hasNewSignatureImage = finalStep3.signatureImage && typeof finalStep3.signatureImage === 'string' && finalStep3.signatureImage.startsWith('data:');
        const hasNewIdImage = finalStep3.idImage && typeof finalStep3.idImage === 'string' && finalStep3.idImage.startsWith('data:');

        if (hasNewProfileImage || hasNewSignatureImage || hasNewIdImage) {
          // Build FormData and PUT to update (multer on server will handle files)
          const formData = new FormData();
          Object.entries(step1).forEach(([k, v]) => formData.append(k, v));
          Object.entries(step2).forEach(([k, v]) => formData.append(k, v));
          Object.entries(finalStep3).forEach(([k, v]) => {
            if (k === 'profileImage' || k === 'signatureImage' || k === 'idImage') return; // handled separately
            if (k === '_removed') return; // handled separately
            formData.append(k, v);
          });

          // include removed flags so server can act on them if desired
          if (finalStep3._removed) {
            formData.append('_removed', JSON.stringify(finalStep3._removed));
          }

          if (hasNewProfileImage) formData.append('profileImage', base64ToFile(finalStep3.profileImage, 'profile.png'));
          if (hasNewSignatureImage) formData.append('signatureImage', base64ToFile(finalStep3.signatureImage, 'signature.png'));
          if (hasNewIdImage) formData.append('idImage', base64ToFile(finalStep3.idImage, 'id.jpg'));

          const url = `http://localhost:5000/api/kkprofiling/${_kkProfileId}`;
          const res = await fetch(url, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });

          if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Updated', text: 'Profile updated successfully.', confirmButtonColor: '#0A2C59' });
            try { localStorage.removeItem('kkProfileStep1'); localStorage.removeItem('kkProfileStep2'); localStorage.removeItem('kkProfileStep3'); } catch (e) {}
            window.location.href = 'kkcofirmation.html';
            return true;
          } else {
            let errText = '';
            try { errText = await res.text(); } catch (e) { errText = String(e); }
            console.warn('Server update failed:', res.status, errText);
            Swal.fire({ icon: 'warning', title: 'Saved Locally', text: 'Changes saved locally. Server update failed.', confirmButtonColor: '#0A2C59' });
            return false;
          }
        }

        // No new images to upload: fall back to JSON PUT
        // Build a clean update payload: do not send base64 images here; coerce Yes/No to booleans
        const updatePayload = Object.assign({}, payloadObj);
        // remove large image blobs from JSON payload (server stores file paths)
        delete updatePayload.profileImage;
        delete updatePayload.signatureImage;

        // Coerce Yes/No fields to booleans expected by the schema
        ['registeredSKVoter','registeredNationalVoter','votedLastSKElection','attendedKKAssembly'].forEach(k => {
          if (k in updatePayload) {
            const v = updatePayload[k];
            updatePayload[k] = v === true || v === 'true' || String(v).toLowerCase() === 'yes' || v === 'Yes' || v === 'yes' ? true
                                : v === false || v === 'false' || String(v).toLowerCase() === 'no' || v === 'No' || v === 'no' ? false
                                : v;
          }
        });

        // If birthday exists as YYYY-MM-DD, convert to ISO string for the server
        if (updatePayload.birthday && typeof updatePayload.birthday === 'string') {
          const bd = new Date(updatePayload.birthday);
          if (!isNaN(bd)) updatePayload.birthday = bd.toISOString();
        }

        // Remove any empty-string values which would violate enum/required validations on the server
        Object.keys(updatePayload).forEach(k => {
          const v = updatePayload[k];
          // keep explicit booleans and numbers (including false/0)
          if (v === '' || v === null || v === undefined) {
            delete updatePayload[k];
          }
        });

        const url = `http://localhost:5000/api/kkprofiling/${_kkProfileId}`;
        const res = await fetch(url, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload)
        });

        if (res.ok) {
          await Swal.fire({ icon: 'success', title: 'Updated', text: 'Profile updated successfully.', confirmButtonColor: '#0A2C59' });
          try { localStorage.removeItem('kkProfileStep1'); localStorage.removeItem('kkProfileStep2'); localStorage.removeItem('kkProfileStep3'); } catch (e) {}
          window.location.href = 'kkcofirmation.html';
          return true;
        } else {
          let errText = '';
          try { errText = await res.text(); } catch (e) { errText = String(e); }
          console.warn('Server update failed:', res.status, errText);
          // Try to parse JSON error if available
          try {
            const j = JSON.parse(errText);
            if (j && j.error) {
              Swal.fire({ icon: 'error', title: 'Update failed', text: j.error, confirmButtonColor: '#0A2C59' });
            } else {
              Swal.fire({ icon: 'warning', title: 'Saved Locally', text: 'Changes saved locally. Server update failed.', confirmButtonColor: '#0A2C59' });
            }
          } catch (_) {
            Swal.fire({ icon: 'warning', title: 'Saved Locally', text: 'Changes saved locally. Server update failed.', confirmButtonColor: '#0A2C59' });
          }
          return false;
        }
      }

      // Otherwise, create a new profile using multipart/form-data (POST) because the creation endpoint expects file uploads
      const formData = new FormData();
      Object.entries(step1).forEach(([k, v]) => formData.append(k, v));
      Object.entries(step2).forEach(([k, v]) => formData.append(k, v));
      Object.entries(finalStep3).forEach(([k, v]) => {
        if (k === 'profileImage' || k === 'signatureImage') return; // handled separately
        formData.append(k, v);
      });

      // images: if base64 present in finalStep3, convert to File and append
      if (finalStep3.profileImage && typeof finalStep3.profileImage === 'string' && finalStep3.profileImage.startsWith('data:')) {
        formData.append('profileImage', base64ToFile(finalStep3.profileImage, 'profile.png'));
      }
      if (finalStep3.signatureImage && typeof finalStep3.signatureImage === 'string' && finalStep3.signatureImage.startsWith('data:')) {
        formData.append('signatureImage', base64ToFile(finalStep3.signatureImage, 'signature.png'));
      }

      const res = await fetch('http://localhost:5000/api/kkprofiling', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        await Swal.fire({ icon: 'success', title: 'Updated', text: 'Profile updated successfully.', confirmButtonColor: '#0A2C59' });
        // remove localStorage cached steps to reflect persisted state
        try { localStorage.removeItem('kkProfileStep1'); localStorage.removeItem('kkProfileStep2'); localStorage.removeItem('kkProfileStep3'); } catch (e) {}
        // redirect to confirmation page (same folder)
        window.location.href = 'kkcofirmation.html';
        return true;
      } else {
        // If server doesn't accept PUT here, just persist locally and inform user
        let errText = await res.text();
        console.warn('Server update failed:', res.status, errText);
        Swal.fire({ icon: 'warning', title: 'Saved Locally', text: 'Changes saved locally. Server update failed.', confirmButtonColor: '#0A2C59' });
        return false;
      }
    } catch (err) {
      console.warn('Failed to send update to server:', err);
      Swal.fire({ icon: 'warning', title: 'Saved Locally', text: 'Changes saved locally. Server update failed.', confirmButtonColor: '#0A2C59' });
      return false;
    }
  }

  // Attach save button if present
  const saveBtn = document.getElementById('saveChangesBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveChangesToServer);

  // Wire the Done / Next buttons (class .kk-next-btns) to trigger save-and-update
  const doneButtons = document.querySelectorAll('.kk-next-btns');
  if (doneButtons && doneButtons.length) {
    doneButtons.forEach(btn => {
      btn.addEventListener('click', async function (e) {
        e.preventDefault();
        // Confirm with the user before saving
        try {
          const result = await Swal.fire({
            title: 'Are you sure you want to save changes?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, save',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#0A2C59'
          });
          if (!result || !result.isConfirmed) return; // user cancelled
        } catch (swalErr) {
          // If SweetAlert fails for any reason, fall back to direct save
          console.warn('Confirmation dialog failed, proceeding to save:', swalErr);
        }

        // Show a loading indicator while saving
        try {
          Swal.fire({
            title: 'Saving changes...',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
              Swal.showLoading();
            },
            showConfirmButton: false
          });
        } catch (swalErr) {
          console.warn('Failed to show loading modal:', swalErr);
        }

        // disable to avoid double clicks while saving
        btn.dataset.disabledPrev = btn.disabled;
        try { btn.disabled = true; btn.classList.add('kk-btn-disabled'); } catch (er) {}
        await saveChangesToServer();
        // close loading modal if still present (saveChangesToServer shows its own Swal on success/failure)
        try { if (Swal.isVisible()) Swal.close(); } catch (e) {}
        try { btn.disabled = false; btn.classList.remove('kk-btn-disabled'); } catch (er) {}
      });
    });
  }

  // Attach image input handlers if present (for modal or page forms)
  const profileInput = document.getElementById('profileImage');
  const signatureInput = document.getElementById('signatureImage');

  function renderPreview(containerId, base64) {
    const c = document.getElementById(containerId);
    if (!c) return;
    // decide which storage key this preview represents
    const isProfile = /profile/i.test(containerId);
    const storageKey = isProfile ? 'profileImage' : 'signatureImage';
    const alt = isProfile ? 'Profile Image' : 'Signature Image';

    // Render image with a small 'x' remove icon at top-right; clicking the image opens a larger view
    c.innerHTML = `
      <div style="position:relative; display:inline-block; max-width:220px;">
        <img src="${base64}" style="width:100%; border-radius:10px; display:block; cursor:zoom-in;" alt="${alt}"/>
        <button data-remove="true" title="Remove" style="position:absolute; top:6px; right:6px; background:#e74c3c; color:#fff; border:none; border-radius:50%; width:28px; height:28px; cursor:pointer; font-size:16px; line-height:1; display:flex; align-items:center; justify-content:center;">×</button>
      </div>`;

    // Image click handler: open SweetAlert with the image (works for base64 or remote URLs)
    const imgEl = c.querySelector('img');
    if (imgEl) imgEl.addEventListener('click', function (ev) {
      ev.stopPropagation();
      try {
        Swal.fire({
          title: alt,
          imageUrl: base64,
          imageAlt: alt,
          showCloseButton: true,
          showConfirmButton: false,
          width: 'auto'
        });
      } catch (e) {
        // fallback: open in new tab
        try { window.open(base64, '_blank'); } catch (er) { console.warn('cannot open image', er); }
      }
    });

    // (Change button removed) -- users change images using the page Upload buttons or file inputs

    // Remove handler: clear preview(s) and mark _removed flag in localStorage
    const removeBtn = c.querySelector('button[data-remove]');
    if (removeBtn) removeBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      // clear both preview containers for profile (profileImagePreview + idImagePreview) or for signature
      if (isProfile) {
        const p1 = document.getElementById('profileImagePreview');
        const p2 = document.getElementById('idImagePreview');
        if (p1) p1.innerHTML = '';
        if (p2) p2.innerHTML = '';
      } else {
        const s1 = document.getElementById('signatureImagePreview');
        const s2 = document.getElementById('signaturePreview');
        if (s1) s1.innerHTML = '';
        if (s2) s2.innerHTML = '';
      }

      // update sessionStorage _removed flags and remove base64
      try {
        const s3 = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
        // ensure _removed object exists
        s3._removed = s3._removed || {};
        s3._removed[storageKey] = true;
        // remove the actual base64 payload so it won't be re-uploaded
        if (storageKey in s3) delete s3[storageKey];
        sessionStorage.setItem('kkProfileStep3', JSON.stringify(s3));
      } catch (e) {
        console.warn('Failed to update sessionStorage on image remove', e);
      }
    });
  }

  if (profileInput) {
    profileInput.addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;
      // Validate mime type: allow only png or jpeg
      const allowed = ['image/png', 'image/jpeg'];
      const nameLower = (file.name || '').toLowerCase();
      const extOK = nameLower.endsWith('.png') || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg');
      if (!allowed.includes(file.type) && !extOK) {
        try { Swal.fire({ icon: 'error', title: 'Unsupported file', text: 'Please upload PNG or JPG/JPEG images only.', confirmButtonColor: '#0A2C59' }); } catch (e) { alert('Please upload PNG or JPG/JPEG images only.'); }
        // reset the input so same file can be chosen again if needed
        try { profileInput.value = ''; } catch (er) {}
        return;
      }
      const reader = new FileReader();
      reader.onload = function (ev) {
        const b64 = ev.target.result;
        const s3 = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
        // clear any previous removed flag when user chooses a new image
        s3._removed = s3._removed || {};
        delete s3._removed.profileImage;
        s3.profileImage = b64;
        sessionStorage.setItem('kkProfileStep3', JSON.stringify(s3));
        // update both profile preview containers if present
        renderPreview('profileImagePreview', b64);
        const altPreview = document.getElementById('idImagePreview');
        if (altPreview) renderPreview('idImagePreview', b64);
      };
      reader.readAsDataURL(file);
    });
  }
  if (signatureInput) {
    signatureInput.addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;
      // Validate mime type: allow only png or jpeg
      const allowedS = ['image/png', 'image/jpeg'];
      const nameLowerS = (file.name || '').toLowerCase();
      const extOKs = nameLowerS.endsWith('.png') || nameLowerS.endsWith('.jpg') || nameLowerS.endsWith('.jpeg');
      if (!allowedS.includes(file.type) && !extOKs) {
        try { Swal.fire({ icon: 'error', title: 'Unsupported file', text: 'Please upload PNG or JPG/JPEG images only.', confirmButtonColor: '#0A2C59' }); } catch (e) { alert('Please upload PNG or JPG/JPEG images only.'); }
        try { signatureInput.value = ''; } catch (er) {}
        return;
      }
      const reader = new FileReader();
      reader.onload = function (ev) {
        const b64 = ev.target.result;
        const s3 = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
        // clear any previous removed flag when user chooses a new signature
        s3._removed = s3._removed || {};
        delete s3._removed.signatureImage;
        s3.signatureImage = b64;
        sessionStorage.setItem('kkProfileStep3', JSON.stringify(s3));
        // update both signature preview containers if present
        renderPreview('signatureImagePreview', b64);
        const altSig = document.getElementById('signaturePreview');
        if (altSig) renderPreview('signaturePreview', b64);
      };
      reader.readAsDataURL(file);
    });
  }

  // Wire the standalone upload buttons to hidden file inputs
  const customUploadBtn = document.getElementById('customUploadBtn');
  if (customUploadBtn && profileInput) {
    customUploadBtn.addEventListener('click', function () { profileInput.click(); });
  }
  const customSignatureBtn = document.getElementById('customSignatureBtn');
  if (customSignatureBtn && signatureInput) {
    customSignatureBtn.addEventListener('click', function () { signatureInput.click(); });
  }

  

  // When birthday changes on any page, update age field
  const birthdayEls = document.querySelectorAll('input[type="date"][id="birthday"]');
  birthdayEls.forEach(bd => bd.addEventListener('change', function () {
    const b = this.value; if (!b) return; const d = new Date(b); const today = new Date(); let age = today.getFullYear() - d.getFullYear(); const m = today.getMonth() - d.getMonth(); if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--; const ageEl = document.getElementById('age'); if (ageEl) ageEl.value = age; 
    // If national voter select exists, and age <=17, set to No and prevent change using helper
    try {
      if (age <= 17) setNationalVoterReadonly(true);
      else setNationalVoterReadonly(false);
    } catch (e) { /* ignore */ }
  }));

  // Initial population from server
  populateFromServer();
});

// -----------------------
// Navigation button wiring
// -----------------------
document.addEventListener('DOMContentLoaded', function () {
  // ✅ Attach KK Profiling nav
  const kkProfileNavBtn = document.getElementById('kkProfileNavBtn');
  if (kkProfileNavBtn) kkProfileNavBtn.addEventListener('click', handleKKProfileNavClick);

  const kkProfileNavBtnDesktop = document.getElementById('kkProfileNavBtnDesktop');
  if (kkProfileNavBtnDesktop) kkProfileNavBtnDesktop.addEventListener('click', handleKKProfileNavClick);

  const kkProfileNavBtnMobile = document.getElementById('kkProfileNavBtnMobile');
  if (kkProfileNavBtnMobile) kkProfileNavBtnMobile.addEventListener('click', handleKKProfileNavClick);

  // ✅ Attach LGBTQ nav
  const lgbtqProfileNavBtnDesktop = document.getElementById('lgbtqProfileNavBtnDesktop');
  if (lgbtqProfileNavBtnDesktop) lgbtqProfileNavBtnDesktop.addEventListener('click', handleLGBTQProfileNavClick);

  const lgbtqProfileNavBtnMobile = document.getElementById('lgbtqProfileNavBtnMobile');
  if (lgbtqProfileNavBtnMobile) lgbtqProfileNavBtnMobile.addEventListener('click', handleLGBTQProfileNavClick);

  // ✅ Attach Educational Assistance nav (capture-phase to prevent premature navigation)
  const educAssistanceNavBtnDesktop = document.getElementById('educAssistanceNavBtnDesktop');
  if (educAssistanceNavBtnDesktop) educAssistanceNavBtnDesktop.addEventListener('click', function(e){ try{ if (e && typeof e.preventDefault === 'function') e.preventDefault(); }catch(err){}; handleEducAssistanceNavClick(e); }, { capture: true });

  const educAssistanceNavBtnMobile = document.getElementById('educAssistanceNavBtnMobile');
  if (educAssistanceNavBtnMobile) educAssistanceNavBtnMobile.addEventListener('click', function(e){ try{ if (e && typeof e.preventDefault === 'function') e.preventDefault(); }catch(err){}; handleEducAssistanceNavClick(e); }, { capture: true });
   
  function attachEducHandler(btn) {
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      try { if (e && typeof e.preventDefault === 'function') e.preventDefault(); } catch (err) {}
      if (window.checkAndPromptEducReapply) {
        try { window.checkAndPromptEducReapply({ event: e, redirectUrl: '../../Educational-assistance-user.html' }); }
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
        redirectUrl = '../../Educational-assistance-user.html',
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
          if (res2 && res2.isConfirmed) { window.location.href = `educConfirmation.html`; return { redirected: true, isRejected, hasProfile, isFormOpen }; }
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
