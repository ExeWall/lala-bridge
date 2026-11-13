/**
 * LALA Bridge — script da página login.html
 */

document.addEventListener('DOMContentLoaded', () => {
  if (Auth.isLoggedIn()) window.location.href = 'dashboard.html';
  document.getElementById('login-form').addEventListener('submit', handleLogin);
});

App.registerActions({
  'fill-demo': (el) => fillDemo(el.dataset.email, 'demo123'),
});

function fillDemo(email, password) {
  document.getElementById('login-email').value = email;
  document.getElementById('login-password').value = password;
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Logging in...';

  setTimeout(() => {
    const result = Auth.login(email, password);
    if (result.success) {
      App.showToast(result.message, 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
    } else {
      errorEl.textContent = result.message;
      errorEl.classList.add('visible');
      btn.disabled = false;
      btn.innerHTML = 'Log In';
    }
  }, 600);
}
