/**
 * LALA Bridge — script da página login.html
 */

App.ready(() => {
  if (Auth.isLoggedIn()) window.location.href = 'dashboard.html';
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  renderDemoAccounts();
});

App.registerActions({
  'demo-login': (el) => {
    const result = Auth.loginAsDemo(el.dataset.userId);
    App.showToast(result.message, result.success ? 'success' : 'error');
    if (result.success) {
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 600);
    }
  },
});

function renderDemoAccounts() {
  const accounts = Auth.getDemoAccounts();
  if (!accounts.length) return;
  document.getElementById('demo-accounts').innerHTML = accounts
    .map((u) => {
      const role = I18n.t(u.type === 'lalider' ? 'roles.lalider' : 'roles.donor');
      const badge = u.type === 'lalider' ? 'badge--lalider' : 'badge--donor';
      return `<button type="button" class="btn btn--ghost btn--sm btn--wrap" data-action="demo-login" data-user-id="${App.escapeHTML(u.id)}" style="justify-content: flex-start">
        <span class="badge ${badge}">${role}</span>
        <span style="margin-left: 8px">${App.escapeHTML(I18n.t('login.demoAs', { name: u.name }))}</span>
      </button>`;
    })
    .join('');
  document.getElementById('demo-login').style.display = 'block';
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  btn.disabled = true;
  btn.innerHTML = `<span class="spinner" aria-hidden="true"></span> ${App.escapeHTML(I18n.t('login.loading'))}`;

  const result = await Auth.login(email, password).catch((err) => ({
    success: false,
    message: err.message,
  }));
  if (result.success) {
    App.showToast(result.message, 'success');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
  } else {
    errorEl.textContent = result.message;
    errorEl.classList.add('visible');
    btn.disabled = false;
    btn.textContent = I18n.t('login.submit');
  }
}
