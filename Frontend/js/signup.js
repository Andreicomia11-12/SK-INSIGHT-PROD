document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
      ? window.API_BASE
      : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:5000'
        : 'https://sk-insight.online';
    // Stepper logic
    const step1 = document.getElementById('signupStep1');
    const step2 = document.getElementById('signupStep2');
    const step3 = document.getElementById('signupStep3');
    const step1Indicator = document.getElementById('step1-indicator');
    const step2Indicator = document.getElementById('step2-indicator');
    const step3Indicator = document.getElementById('step3-indicator');
    const nextBtn = document.getElementById('nextStep');
    const nextBtn2 = document.getElementById('nextStep2');
    const prevBtn = document.getElementById('prevStep');
    const prevBtn3 = document.getElementById('prevStep3');
    const passwordField = document.getElementById('passwordField');
    const confirmPasswordField = document.getElementById('confirmPasswordField');
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

    // ID Upload elements
    const idImageInput = document.getElementById('idImageInput');
    const idImagePreview = document.getElementById('idImagePreview');
    const previewImg = document.getElementById('previewImg');
    const removeImageBtn = document.getElementById('removeImage');
    let selectedIdFile = null;

    // Birthday selects
    const yearSelect = document.getElementById('birthdayYear');
    const monthSelect = document.getElementById('birthdayMonth');
    const daySelect = document.getElementById('birthdayDay');

    // Helper for custom selects
    function getCustom(field) {
      const wrapper = document.querySelector(`.custom-select[data-field="${field}"]`);
      if (!wrapper) return null;
      return {
        wrapper,
        trigger: wrapper.querySelector('.custom-select-trigger'),
        optionsContainer: wrapper.querySelector('.custom-options'),
        native: wrapper.querySelector('.native-select') || document.getElementById(field)
      };
    }

    // Birthday select population
    (function populateBirthdaySelects() {
        const now = new Date();
        const currentYear = now.getFullYear();
        const startYear = currentYear - 100;

        const yearCustom = getCustom('birthdayYear');
        const monthCustom = getCustom('birthdayMonth');
        const dayCustom = getCustom('birthdayDay');

        for (let y = currentYear; y >= startYear; y--) {
            const opt = document.createElement('option');
            opt.value = String(y);
            opt.textContent = String(y);
            yearSelect.appendChild(opt);

            if (yearCustom && yearCustom.optionsContainer) {
              const row = document.createElement('div');
              row.className = 'custom-option';
              row.tabIndex = 0;
              row.dataset.value = String(y);
              row.textContent = String(y);
              yearCustom.optionsContainer.appendChild(row);
            }
        }

        if (monthCustom && monthCustom.optionsContainer) {
          const monthOptions = Array.from(monthSelect.querySelectorAll('option')).slice(1);
          monthOptions.forEach(optEl => {
            const row = document.createElement('div');
            row.className = 'custom-option';
            row.tabIndex = 0;
            row.dataset.value = optEl.value;
            row.textContent = optEl.textContent;
            monthCustom.optionsContainer.appendChild(row);
          });
        }

        function setDays(count) {
            daySelect.innerHTML = '<option value="">Day</option>';
            if (dayCustom && dayCustom.optionsContainer) dayCustom.optionsContainer.innerHTML = '';
            for (let d = 1; d <= count; d++) {
                const v = d < 10 ? '0' + d : String(d);
                const opt = document.createElement('option');
                opt.value = v;
                opt.textContent = String(d);
                daySelect.appendChild(opt);

                if (dayCustom && dayCustom.optionsContainer) {
                  const row = document.createElement('div');
                  row.className = 'custom-option';
                  row.tabIndex = 0;
                  row.dataset.value = v;
                  row.textContent = String(d);
                  dayCustom.optionsContainer.appendChild(row);
                }
                }
        }
        setDays(31);

        function updateDaysFromNative() {
            const year = parseInt(yearSelect.value, 10);
            const month = parseInt(monthSelect.value, 10);
            if (!month || !year) {
                setDays(31);
                return;
            }
            const daysInMonth = new Date(year, month, 0).getDate();
            const prev = daySelect.value;
            setDays(daysInMonth);
            if (prev && parseInt(prev, 10) <= daysInMonth) daySelect.value = prev;
            const dayC = getCustom('birthdayDay');
            if (dayC && prev) updateTrigger(dayC, String(Number(prev)));
        }

        monthSelect.addEventListener('change', updateDaysFromNative);
        yearSelect.addEventListener('change', updateDaysFromNative);

        function updateTrigger(custom, text) {
          if (!custom) return;
          const trigger = custom.trigger;
          trigger.textContent = text || (custom.native && custom.native.querySelector('option')?.textContent) || '';
        }

        ['birthdayYear','birthdayMonth','birthdayDay'].forEach(field => {
          const custom = getCustom(field);
          if (!custom) return;

          const nativeEl = document.getElementById(field);
          if (nativeEl && nativeEl.value) {
            const selectedOpt = nativeEl.querySelector(`option[value="${nativeEl.value}"]`);
            if (selectedOpt) updateTrigger(custom, selectedOpt.textContent);
          }

          custom.trigger.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const isOpen = custom.wrapper.classList.contains('open');
            document.querySelectorAll('.custom-select.open').forEach(w => {
              if (w !== custom.wrapper) {
                w.classList.remove('open');
                const t = w.querySelector('.custom-select-trigger');
                if (t) t.setAttribute('aria-expanded','false');
              }
            });
            if (!isOpen) {
              custom.wrapper.classList.add('open');
              custom.trigger.setAttribute('aria-expanded','true');
              const first = custom.optionsContainer.querySelector('.custom-option');
              if (first) first.focus();
            } else {
              custom.wrapper.classList.remove('open');
              custom.trigger.setAttribute('aria-expanded','false');
            }
          });

          custom.optionsContainer.addEventListener('click', (ev) => {
            const opt = ev.target.closest('.custom-option');
            if (!opt) return;
            const val = opt.dataset.value;
            const native = document.getElementById(field);
            if (native) {
              native.value = val;
              updateTrigger(custom, opt.textContent);
              native.dispatchEvent(new Event('change', { bubbles: true }));
            }
            custom.optionsContainer.querySelectorAll('.custom-option').forEach(o => o.removeAttribute('aria-selected'));
            opt.setAttribute('aria-selected','true');
            custom.wrapper.classList.remove('open');
            custom.trigger.setAttribute('aria-expanded','false');
            custom.trigger.focus();
          });

          custom.optionsContainer.addEventListener('keydown', (ev) => {
            const items = Array.from(custom.optionsContainer.querySelectorAll('.custom-option'));
            const idx = items.indexOf(document.activeElement);
            if (ev.key === 'ArrowDown') {
              ev.preventDefault();
              const next = idx < items.length - 1 ? items[idx+1] : items[0];
              if (next) next.focus();
            } else if (ev.key === 'ArrowUp') {
              ev.preventDefault();
              const prev = idx > 0 ? items[idx-1] : items[items.length-1];
              if (prev) prev.focus();
            } else if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault();
              if (document.activeElement && document.activeElement.classList.contains('custom-option')) {
                document.activeElement.click();
              }
            } else if (ev.key === 'Escape') {
              custom.wrapper.classList.remove('open');
              custom.trigger.setAttribute('aria-expanded','false');
              custom.trigger.focus();
            }
          });
        });

        document.addEventListener('click', (e) => {
          if (!e.target.closest('.custom-select')) {
            document.querySelectorAll('.custom-select.open').forEach(w => {
              w.classList.remove('open');
              const t = w.querySelector('.custom-select-trigger');
              if (t) t.setAttribute('aria-expanded','false');
            });
          }
        });
    })();

    // Stepper navigation and sessionStorage
    function saveStep1ToSession() {
      const data = {
        firstName: step1.elements['firstName'].value,
        middleName: step1.elements['middleName'].value,
        lastName: step1.elements['lastName'].value,
        suffix: step1.elements['suffix'].value,
        birthdayYear: step1.elements['birthdayYear'].value,
        birthdayMonth: step1.elements['birthdayMonth'].value,
        birthdayDay: step1.elements['birthdayDay'].value,
      };
      sessionStorage.setItem('signupStep1', JSON.stringify(data));
    }
    function loadStep1FromSession() {
      const data = JSON.parse(sessionStorage.getItem('signupStep1') || '{}');
      if (!data) return;
      step1.elements['firstName'].value = data.firstName || '';
      step1.elements['middleName'].value = data.middleName || '';
      step1.elements['lastName'].value = data.lastName || '';
      step1.elements['suffix'].value = data.suffix || '';
      step1.elements['birthdayYear'].value = data.birthdayYear || '';
      step1.elements['birthdayMonth'].value = data.birthdayMonth || '';
      step1.elements['birthdayDay'].value = data.birthdayDay || '';
      ['birthdayYear','birthdayMonth','birthdayDay'].forEach(field => {
        const custom = getCustom(field);
        if (custom) {
          const native = custom.native;
          const selectedOpt = native && native.querySelector(`option[value="${native.value}"]`);
          if (selectedOpt) {
            custom.trigger.textContent = selectedOpt.textContent;
          }
        }
      });
    }

    function saveStep2ToSession() {
      const data = {
        username: step2.elements['username'].value,
        email: step2.elements['email'].value,
        password: step2.elements['password'].value,
        confirmPassword: step2.elements['confirmPassword'].value,
      };
      sessionStorage.setItem('signupStep2', JSON.stringify(data));
    }
    function loadStep2FromSession() {
      const data = JSON.parse(sessionStorage.getItem('signupStep2') || '{}');
      if (!data) return;
      step2.elements['username'].value = data.username || '';
      step2.elements['email'].value = data.email || '';
      step2.elements['password'].value = data.password || '';
      step2.elements['confirmPassword'].value = data.confirmPassword || '';
    }

    // Function to switch steps and update indicators
    function goToStep1() {
      step1.classList.add('active');
      step2.classList.remove('active');
      step3.classList.remove('active');
      step1Indicator.classList.add('active');
      step2Indicator.classList.remove('active');
      step3Indicator.classList.remove('active');
      loadStep1FromSession();
      step1.elements['firstName'].focus();
      sessionStorage.setItem('signupCurrentStep', '1');
    }

    function goToStep2() {
      step1.classList.remove('active');
      step2.classList.add('active');
      step3.classList.remove('active');
      step1Indicator.classList.remove('active');
      step2Indicator.classList.add('active');
      step3Indicator.classList.remove('active');
      loadStep2FromSession();
      step2.elements['username'].focus();
      sessionStorage.setItem('signupCurrentStep', '2');
    }

    function goToStep3() {
      step1.classList.remove('active');
      step2.classList.remove('active');
      step3.classList.add('active');
      step1Indicator.classList.remove('active');
      step2Indicator.classList.remove('active');
      step3Indicator.classList.add('active');
      step3.elements['idImageInput'].focus();
      sessionStorage.setItem('signupCurrentStep', '3');
    }

    // Next button
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Validate Step 1
      if (!step1.elements['firstName'].value.trim() ||
          !step1.elements['lastName'].value.trim() ||
          !step1.elements['birthdayYear'].value ||
          !step1.elements['birthdayMonth'].value ||
          !step1.elements['birthdayDay'].value) {
        Swal.fire({ icon: 'error', title: 'Missing Fields', text: 'Please fill all required fields.' });
        return;
      }
      saveStep1ToSession();
      goToStep2();
    });

    // Next button 2 (Step 2 -> Step 3)
    nextBtn2.addEventListener('click', (e) => {
      e.preventDefault();
      // Validate Step 2
      if (!step2.elements['username'].value.trim() ||
          !step2.elements['email'].value.trim() ||
          !step2.elements['password'].value ||
          !step2.elements['confirmPassword'].value) {
        Swal.fire({ icon: 'error', title: 'Missing Fields', text: 'Please fill all required fields.' });
        return;
      }
      if (step2.elements['password'].value !== step2.elements['confirmPassword'].value) {
        Swal.fire({ icon: 'error', title: 'Password Mismatch', text: 'Passwords do not match.' });
        return;
      }
      // Strong password requirement
      const pwd = step2.elements['password'].value || '';
      const strongPw = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
      if (!strongPw.test(pwd)) {
        Swal.fire({
          icon: 'warning',
          title: 'Weak password',
          html: 'Password must be at least 8 characters long and include at least one uppercase letter, one number, and one special character.'
        });
        return;
      }
      saveStep2ToSession();
      goToStep3();
    });

    // Previous button
    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      saveStep2ToSession();
      goToStep1();
    });

    // Previous button 3 (Step 3 -> Step 2)
    prevBtn3.addEventListener('click', (e) => {
      e.preventDefault();
      goToStep2();
    });

    // Password toggle
    togglePassword.addEventListener('click', (e) => {
      e.preventDefault();
      const isPassword = passwordField.type === 'password';
      passwordField.type = isPassword ? 'text' : 'password';
      togglePassword.innerHTML = isPassword
        ? '<i class="fa-solid fa-eye-slash"></i>'
        : '<i class="fa-solid fa-eye"></i>';
    });

    // Confirm Password toggle
    toggleConfirmPassword.addEventListener('click', (e) => {
      e.preventDefault();
      const isPassword = confirmPasswordField.type === 'password';
      confirmPasswordField.type = isPassword ? 'text' : 'password';
      toggleConfirmPassword.innerHTML = isPassword
        ? '<i class="fa-solid fa-eye-slash"></i>'
        : '<i class="fa-solid fa-eye"></i>';
    });

    // Password strength UI and live validation
    (function attachPasswordStrength() {
      if (!passwordField) return;
      // Create requirements container and insert before form-actions
      const step2Form = document.getElementById('signupStep2');
      const formActions = step2Form.querySelector('.form-actions');
      
      const reqHtml = `
        <div id="passwordRequirements" style="margin-bottom:16px;font-size:0.65rem;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;" aria-live="polite">
            <div id="pw-req-length" style="color:#c33"><i class="fa-solid fa-circle-xmark" style="color: #e64814;"></i> At least 8 characters</div>
            <div id="pw-req-special" style="color:#c33"><i class="fa-solid fa-circle-xmark" style="color: #e64814;"></i> At least one special character</div>
            <div id="pw-req-upper" style="color:#c33"><i class="fa-solid fa-circle-xmark" style="color: #e64814;"></i> At least one uppercase letter</div>
            <div id="pw-req-match" style="color:#c33"><i class="fa-solid fa-circle-xmark" style="color: #e64814;"></i> Passwords must match</div>
            <div id="pw-req-number" style="color:#c33"><i class="fa-solid fa-circle-xmark" style="color: #e64814;"></i> At least one number</div>
          </div>
        </div>
      `;
      if (formActions) {
        formActions.insertAdjacentHTML('beforebegin', reqHtml);
      }

      const reqLength = document.getElementById('pw-req-length');
      const reqUpper = document.getElementById('pw-req-upper');
      const reqNumber = document.getElementById('pw-req-number');
      const reqSpecial = document.getElementById('pw-req-special');
      const reqMatch = document.getElementById('pw-req-match');

      function checkPassword(pw) {
        return {
          length: pw.length >= 8,
          upper: /[A-Z]/.test(pw),
          number: /\d/.test(pw),
          special: /[\W_]/.test(pw)
        };
      }

      function updateUI() {
        const pw = passwordField.value || '';
        const cpw = confirmPasswordField ? confirmPasswordField.value || '' : '';
        const res = checkPassword(pw);

        // If no input, show plain text without icons
        if (!pw) {
          reqLength.textContent = 'At least 8 characters';
          reqLength.style.color = '#666';
          reqUpper.textContent = 'At least one uppercase letter';
          reqUpper.style.color = '#666';
          reqNumber.textContent = 'At least one number';
          reqNumber.style.color = '#666';
          reqSpecial.textContent = 'At least one special character';
          reqSpecial.style.color = '#666';
          reqMatch.textContent = 'Passwords must match';
          reqMatch.style.color = '#666';
        } else {
          // Show checkmarks/X icons when there's input
          if (res.length) { reqLength.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #25d443;"></i> At least 8 characters'; reqLength.style.color = '#1a8a1a'; } else { reqLength.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color: #e64814;"></i> At least 8 characters'; reqLength.style.color = '#c33'; }
          if (res.upper) { reqUpper.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #25d443;"></i> At least one uppercase letter'; reqUpper.style.color = '#1a8a1a'; } else { reqUpper.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color: #e64814;"></i> At least one uppercase letter'; reqUpper.style.color = '#c33'; }
          if (res.number) { reqNumber.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #25d443;"></i> At least one number'; reqNumber.style.color = '#1a8a1a'; } else { reqNumber.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color: #e64814;"></i> At least one number'; reqNumber.style.color = '#c33'; }
          if (res.special) { reqSpecial.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #25d443;"></i> At least one special character'; reqSpecial.style.color = '#1a8a1a'; } else { reqSpecial.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color: #e64814;"></i> At least one special character'; reqSpecial.style.color = '#c33'; }

          if (pw && cpw && pw === cpw) { reqMatch.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #25d443;"></i> Passwords match'; reqMatch.style.color = '#1a8a1a'; } else { reqMatch.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color: #e64814;"></i> Passwords must match'; reqMatch.style.color = '#c33'; }
        }

        const all = res.length && res.upper && res.number && res.special;
        const submitBtn = step2.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = !(all && pw && cpw && pw === cpw);
        }
      }

      passwordField.addEventListener('input', updateUI);
      if (confirmPasswordField) confirmPasswordField.addEventListener('input', updateUI);

      // initialize state on load
      setTimeout(updateUI, 0);
    })();

    // On page load, restore step and values
    const currentStep = sessionStorage.getItem('signupCurrentStep') || '1';
    if (currentStep === '3') {
      goToStep3();
    } else if (currentStep === '2') {
      goToStep2();
    } else {
      goToStep1();
    }

    // ===== ID IMAGE UPLOAD HANDLERS =====
    // Handle file input change
    idImageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          Swal.fire({ icon: 'error', title: 'Invalid File', text: 'Please select an image file.' });
          idImageInput.value = '';
          selectedIdFile = null;
          idImagePreview.style.display = 'none';
          return;
        }
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          Swal.fire({ icon: 'error', title: 'File Too Large', text: 'Please select an image smaller than 5MB.' });
          idImageInput.value = '';
          selectedIdFile = null;
          idImagePreview.style.display = 'none';
          return;
        }
        selectedIdFile = file;
        const reader = new FileReader();
        reader.onload = (event) => {
          previewImg.src = event.target.result;
          idImagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });

    // Handle drag and drop
    const idUploadLabel = document.querySelector('label[for="idImageInput"]');
    if (idUploadLabel) {
      idUploadLabel.addEventListener('dragover', (e) => {
        e.preventDefault();
        idUploadLabel.style.backgroundColor = '#e0ecff';
      });
      idUploadLabel.addEventListener('dragleave', () => {
        idUploadLabel.style.backgroundColor = '#f0f5ff';
      });
      idUploadLabel.addEventListener('drop', (e) => {
        e.preventDefault();
        idUploadLabel.style.backgroundColor = '#f0f5ff';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          idImageInput.files = files;
          const event = new Event('change', { bubbles: true });
          idImageInput.dispatchEvent(event);
        }
      });
    }

    // Remove image button
    removeImageBtn.addEventListener('click', (e) => {
      e.preventDefault();
      idImageInput.value = '';
      selectedIdFile = null;
      idImagePreview.style.display = 'none';
      previewImg.src = '';
    });

    // Final submit (Step 3)
    step3.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Validate that an ID image is selected
      if (!selectedIdFile) {
        Swal.fire({ icon: 'error', title: 'Missing ID Image', text: 'Please upload an ID image.' });
        return;
      }

      // Gather all data
      const step1Data = JSON.parse(sessionStorage.getItem('signupStep1') || '{}');
      const step2Data = JSON.parse(sessionStorage.getItem('signupStep2') || '{}');
      
      // Format birthday as YYYY-MM-DD
      const birthday = (step1Data.birthdayYear && step1Data.birthdayMonth && step1Data.birthdayDay)
        ? `${step1Data.birthdayYear}-${step1Data.birthdayMonth}-${step1Data.birthdayDay}` 
        : '';
      
      // Helper: Title-case a name
      function titleCase(str) {
        if (!str || typeof str !== 'string') return '';
        return str
          .trim()
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean)
          .map(s => s.charAt(0).toUpperCase() + s.slice(1))
          .join(' ');
      }

      // Create FormData for multipart/form-data (to handle file upload)
      const formData = new FormData();
      formData.append('firstName', titleCase(step1Data.firstName || ''));
      formData.append('middleName', titleCase(step1Data.middleName || ''));
      formData.append('lastName', titleCase(step1Data.lastName || ''));
      formData.append('suffix', titleCase(step1Data.suffix || ''));
      formData.append('birthday', birthday);
      formData.append('username', step2Data.username || '');
      formData.append('email', step2Data.email || '');
      formData.append('password', step2Data.password || '');
      formData.append('idImage', selectedIdFile);

      // Validate payload
      if (!step1Data.firstName || !step1Data.lastName || !birthday || !step2Data.username || !step2Data.email || !step2Data.password) {
        Swal.fire({ 
          icon: 'error', 
          title: 'Missing Fields', 
          text: 'Please complete all required fields in all steps.' 
        });
        return;
      }

      // Show loading
      Swal.fire({
        title: 'Registering...',
        text: 'Please wait while we process your registration.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      try {
        const response = await fetch(`${API_BASE}/api/users/smart/register`, {
          method: 'POST',
          body: formData
          // Don't set Content-Type header - browser will set it with boundary
        });

        const data = await response.json().catch((err) => {
          console.error('JSON parse error:', err);
          return null;
        });

        Swal.close();

        if (response.ok && data) {
          sessionStorage.removeItem('signupStep1');
          sessionStorage.removeItem('signupStep2');
          sessionStorage.removeItem('signupCurrentStep');
          Swal.fire({ 
            icon: 'success', 
            title: 'Registration Successful!', 
            text: 'Your ID has been submitted for verification. You will be notified once it is approved.', 
            timer: 2000, 
            showConfirmButton: false 
          }).then(() => {
            window.location.href = '/Frontend/html/user/login.html';
          });
        } else {
          let alertText = (data && (data.message || data.error)) || 'Registration failed. Please try again.';
          if (data && data.code === 'email_exists') alertText = 'This email is already registered.';
          if (data && data.code === 'username_exists') alertText = 'This username is already taken.';
          if (data && data.code === 'birthday_invalid') alertText = 'Invalid birthday format.';
          if (data && data.code === 'age_not_allowed') alertText = 'Only users aged 11 to 30 are allowed to sign up.';

          Swal.fire({ 
            icon: 'error', 
            title: 'Registration Failed', 
            text: alertText 
          });
        }
      } catch (error) {
        Swal.close();
        console.error('Fetch Error:', error);
        Swal.fire({ 
          icon: 'error', 
          title: 'Network Error', 
          text: 'An error occurred during registration: ' + error.message 
        });
      }
    });
});