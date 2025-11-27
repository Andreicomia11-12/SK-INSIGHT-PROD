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

document.addEventListener('DOMContentLoaded', () => {
    // Stepper logic
    const step1 = document.getElementById('signupStep1');
    const step2 = document.getElementById('signupStep2');
    const step1Indicator = document.getElementById('step1-indicator');
    const step2Indicator = document.getElementById('step2-indicator');
    const nextBtn = document.getElementById('nextStep');
    const prevBtn = document.getElementById('prevStep');
    const passwordField = document.getElementById('passwordField');
    const confirmPasswordField = document.getElementById('confirmPasswordField');
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

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
      step1Indicator.classList.add('active');
      step2Indicator.classList.remove('active');
      loadStep1FromSession();
      step1.elements['firstName'].focus();
      sessionStorage.setItem('signupStep2Active', 'false');
    }

    function goToStep2() {
      step1.classList.remove('active');
      step2.classList.add('active');
      step1Indicator.classList.remove('active');
      step2Indicator.classList.add('active');
      loadStep2FromSession();
      step2.elements['username'].focus();
      sessionStorage.setItem('signupStep2Active', 'true');
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

    // Previous button
    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      saveStep2ToSession();
      goToStep1();
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

    // On page load, restore step and values
    if (sessionStorage.getItem('signupStep2Active') === 'true') {
      goToStep2();
    } else {
      goToStep1();
    }

    // Final submit
    step2.addEventListener('submit', async (e) => {
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
      
      // Gather all data
      saveStep2ToSession();
      const step1Data = JSON.parse(sessionStorage.getItem('signupStep1') || '{}');
      const step2Data = JSON.parse(sessionStorage.getItem('signupStep2') || '{}');
      
      // Format birthday as YYYY-MM-DD
      const birthday = (step1Data.birthdayYear && step1Data.birthdayMonth && step1Data.birthdayDay)
        ? `${step1Data.birthdayYear}-${step1Data.birthdayMonth}-${step1Data.birthdayDay}` 
        : '';
      
      const payload = {
        firstName: step1Data.firstName || '',
        middleName: step1Data.middleName || '',
        lastName: step1Data.lastName || '',
        suffix: step1Data.suffix || '',
        birthday: birthday,
        username: step2Data.username || '',
        email: step2Data.email || '',
        password: step2Data.password || ''
      };

      // Validate payload
      if (!payload.firstName || !payload.lastName || !payload.birthday || !payload.username || !payload.email || !payload.password) {
        Swal.fire({ 
          icon: 'error', 
          title: 'Missing Fields', 
          text: 'Please complete all required fields in both steps.' 
        });
        console.error('Payload validation failed:', payload);
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
        const response = await fetch('http://localhost:5000/api/users/smart/register', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json().catch((err) => {
          console.error('JSON parse error:', err);
          return null;
        });

        Swal.close();

        if (response.ok && data) {
          sessionStorage.removeItem('signupStep1');
          sessionStorage.removeItem('signupStep2');
          sessionStorage.removeItem('signupStep2Active');
          Swal.fire({ 
            icon: 'success', 
            title: 'Registration Successful!', 
            text: 'You can now log in.', 
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
          if (data && data.code === 'age_not_allowed') alertText = 'Only users aged 15 to 30 are allowed to sign up.';

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