// Frontend helper: check if user's latest Educational Assistance application was rejected
// If rejected, show SweetAlert with option to update and redirect to edit page

(function () {
  // Configure API base for development
  const API_BASE = (typeof window !== 'undefined' && window.API_BASE) ? window.API_BASE : 'http://localhost:5000';

  // New reusable API: check rejected, handle redirect when rejected,
  // otherwise invoke the provided continuation function.
  async function checkRejectedThen(event, continueFn) {
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const headers = { 'Accept': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      // If there's no token, prompt the user to log in
      if (!token) {
        Swal.fire({
          icon: 'warning',
          title: 'You need to log in first',
          text: 'Please log in to access Educational Assistance.',
          confirmButtonText: 'Log in'
        }).then(() => {
          window.location.href = '/Frontend/html/user/login.html';
        });
        return { handled: true, reason: 'no-token' };
      }

      const resp = await fetch(`${API_BASE}/api/educational-assistance/check-rejected`, {
        method: 'GET',
        headers
      });

      let data = null;
      try { data = await resp.json(); } catch (e) { /* ignore parse errors */ }

      if (resp.status === 401) {
        Swal.fire({
          icon: 'warning',
          title: 'Session expired',
          text: 'Please log in again to continue.',
          confirmButtonText: 'Log in'
        }).then(() => {
          window.location.href = '/Frontend/html/user/login.html';
        });
        return { handled: true, reason: 'unauthorized' };
      }

      if (!resp.ok) {
        // network error: do not block continuation — return handled=false so caller may continue
        console.error('checkRejected: network error', resp.status, data);
        return { handled: false, reason: 'network' };
      }

      const isRejected = data && (data.rejected === true || data.rejected === 'true' || data.rejected === '1');

      if (isRejected) {
        const reason = data.rejectionReason || 'Your application was rejected by the admin.';
        const target = data.applicationId
          ? `/Frontend/html/user/confirmation/html/editEducRejected.html?id=${data.applicationId}`
          : '/Frontend/html/user/confirmation/html/editEducRejected.html';
        await Swal.fire({
          title: 'Application Rejected',
          text: reason,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Update Response',
          cancelButtonText: 'Dismiss',
        }).then((result) => {
          if (result.isConfirmed) window.location.href = target;
        });
        return { handled: true, reason: 'rejected', data };
      }

      // Not rejected: call continuation (do not force navigation here)
      if (typeof continueFn === 'function') {
        try { await continueFn(event); } catch (err) { console.error('continueFn error', err); }
      }
      return { handled: false, reason: 'not-rejected', data };
    } catch (err) {
      console.error('checkRejected error:', err);
      // On error allow caller to continue
      return { handled: false, reason: 'exception' };
    }
  }

  // expose helper
  if (!window.checkRejectedThen) window.checkRejectedThen = checkRejectedThen;

  // keep legacy attachHandlers (optional) — they call the old flow that navigates directly
  function attachHandlers() {
    const desktop = document.getElementById('educAssistanceNavBtnDesktop');
    const mobile = document.getElementById('educAssistanceNavBtnMobile');

    function makeHandler(el) {
      if (!el) return;
      // preserve original href to use for navigation after checks
      const originalHref = el.getAttribute('href') || '/Frontend/html/user/Educational-assistance-user.html';
      const handler = function (e) {
        try { e.stopImmediatePropagation(); } catch (err) {}
        // prevent default navigation immediately (capture phase)
        if (e && typeof e.preventDefault === 'function') e.preventDefault();

        // run the check and only navigate if not rejected (or if helper allows)
        checkRejectedThen(e, function () {
          // navigate to the preserved href only when continuation runs
          window.location.href = originalHref;
        });
      };
      // attach in capture so this runs before default navigation
      el.addEventListener('click', handler, { capture: true });
    }

    makeHandler(desktop);
    makeHandler(mobile);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachHandlers);
  } else {
    attachHandlers();
  }
})();
