// MrKing2025
document.addEventListener('DOMContentLoaded', () => {
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  const loginForm = document.getElementById('loginForm');
  const loginBtn = loginForm.querySelector('button[type="submit"]');

  // feedback
  const loginFeedbackEl = document.createElement('div');
  loginFeedbackEl.style.color = 'yellow';
  loginFeedbackEl.style.marginTop = '4px';
  usernameInput.parentNode.appendChild(loginFeedbackEl);

  // enable if both fields filled
  function updateButtonState() {
    loginBtn.disabled = !(usernameInput.value.trim() && passwordInput.value);
  }

  usernameInput.addEventListener('input', updateButtonState);
  passwordInput.addEventListener('input', updateButtonState);

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      alert('Please enter username and password.');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    loginFeedbackEl.textContent = '';

    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        loginFeedbackEl.style.color = '#28a745';
        loginFeedbackEl.textContent = 'Login successful! Redirecting...';
        // Redirect or reload page after login
        setTimeout(() => window.location.href = data.redirectUrl || '/', 1000);
      } else {
        loginFeedbackEl.style.color = '#dc3545';
        loginFeedbackEl.textContent = data.message || 'Login failed. Please try again.';
        loginBtn.disabled = false;
        loginBtn.textContent = 'Log In';
      }
    } catch (err) {
      loginFeedbackEl.style.color = '#ffc107';
      loginFeedbackEl.textContent = 'Error during login. Please try again.';
      loginBtn.disabled = false;
      loginBtn.textContent = 'Log In';
    }
  });

  // set initial state
  updateButtonState();

  // autofill fix
  setTimeout(() => {
    updateButtonState();
  }, 200);
});