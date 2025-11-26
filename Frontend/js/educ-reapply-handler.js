// Shared handler to check "rejected" status and redirect to edit/resubmit flow
(function attachEducReapplyHandler(){
  async function onEducClick(e) {
    try { e.preventDefault(); } catch(e) {}
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    // If not logged in, don't attempt check here (other handlers may show login)
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5000/api/educational-assistance/check-rejected', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json && json.rejected && json.applicationId) {
          const reason = json.rejectionReason || 'No reason provided';
          const result = await Swal.fire({
            icon: 'warning',
            title: 'Application Rejected',
            html: `<p>Your Educational Assistance application was rejected.</p><p><strong>Reason:</strong> ${reason}</p><p>Do you want to edit and resubmit?</p>`,
            showCancelButton: true,
            confirmButtonText: 'Edit & Resubmit',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#07B0F2',
            cancelButtonColor: '#0A2C59'
          });
          if (result.isConfirmed) {
            window.location.href = `/Frontend/html/user/confirmation/html/editEducRejected.html?id=${json.applicationId}`;
            return;
          }
          return;
        }
      }
    } catch (err) {
      // ignore network errors and fall through to normal navigation
      console.debug('educ-reapply check failed', err);
    }
    // Normal fallback: go to the educational assistance form/listing
    try { window.location.href = '/Frontend/html/user/Educational-assistance-user.html'; } catch(e) {}
  }

  function bindButtons() {
    try {
      const desktopBtn = document.getElementById('educAssistanceNavBtnDesktop');
      const mobileBtn = document.getElementById('educAssistanceNavBtnMobile');
      if (desktopBtn) desktopBtn.addEventListener('click', function (e) { try { e.stopImmediatePropagation(); } catch (err) {} ; onEducClick(e); });
      if (mobileBtn) mobileBtn.addEventListener('click', function (e) { try { e.stopImmediatePropagation(); } catch (err) {} ; onEducClick(e); });
    } catch (e) { /* ignore */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindButtons);
  } else {
    bindButtons();
  }
})();
