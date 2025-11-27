// Token validation helper function for user features
function validateTokenAndRedirect(featureName = "this feature") {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) {
    Swal.fire({
      icon: 'warning',
      title: 'Authentication Required',
      text: `You need to log in first to access ${featureName}.`,
      confirmButtonText: 'Go to Login',
      confirmButtonColor: '#0A2C59',
      allowOutsideClick: false,
      allowEscapeKey: false,
    }).then(() => {
      window.location.href = '/Frontend/html/user/login.html';
    });
    return false;
  }
  return true;
}

// Check if token exists and is valid
function hasValidToken() {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      // Token expired
      sessionStorage.removeItem('token');
      localStorage.removeItem('token');
      return false;
    }
    return true;
  } catch (e) {
    // Invalid token
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
    return false;
  }
}

// Automatically validate on page load for any file that includes this script.
// If you need some pages to be public, hide the validation there or remove the script tag.
document.addEventListener('DOMContentLoaded', () => {
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

  // Only run if the validation function and SweetAlert (Swal) are available
  if (typeof validateTokenAndRedirect === 'function' && typeof Swal !== 'undefined') {
    validateTokenAndRedirect();
  }
});
