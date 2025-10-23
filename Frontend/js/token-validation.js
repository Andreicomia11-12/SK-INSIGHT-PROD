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
