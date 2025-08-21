// Session validation
async function validateSession() {
  try {
    const res = await fetch('/validate-session', {
      method: 'GET',
      credentials: 'include', // send cookies
    });

    if (!res.ok) {
      window.location.href = '/login.html';
      return;
    }

    const data = await res.json();

    if (!data.success) {
      window.location.href = '/login.html';
      return;
    }

    console.log('Session valid for user:', data.handle);
    // Expose handle globally for other scripts
    window.CURRENT_HANDLE = data.handle;
    document.dispatchEvent(new CustomEvent('ephemeral:session', { detail: { handle: data.handle } }));
  } catch (e) {
    console.error('Validation error', e);
    window.location.href = '/login.html';
  }
}

validateSession();

// Front-end logout
function parseJsonSafely(res) {
  return res
    .clone()
    .json()
    .catch(() => ({}));
}

async function logout({ redirectTo = '/login.html' } = {}) {
  let btn;
  try {
    btn = document.getElementById('logoutBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Logging out...';
    }

    const res = await fetch('/logout', {
      method: 'POST',
      credentials: 'include', // include cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (res.ok) {
      // Success: server invalidated the session and cleared cookie
      window.location.href = redirectTo;
      return;
    }
    
    // Handle non-2xx (rate limit, server error, etc.)
    const data = await parseJsonSafely(res);
    const msg =
      data?.message ||
      (res.status === 429
        ? 'Too many logout attempts. Please try again later.'
        : 'Logout failed. Please try again.');
    alert(msg);

    // If unauthorized, still redirect to login to force new auth
    if (res.status === 401 || res.status === 403) {
      window.location.href = redirectTo;
    }
  } catch (e) {
    console.error('Logout error:', e);
    alert('Network error during logout. Please check your connection and try again.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Logout';
    }
  }
}

// Optionally bind to a button with id="logoutBtn"
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('logoutBtn');
  if (btn) {

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();

      console.log("logged out!");
    });
  }
});

// Expose globally if you prefer inline handlers like <button onclick="logout()">Logout</button>
window.logout = logout;