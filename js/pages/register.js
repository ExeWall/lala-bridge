/**
 * LALA Bridge — script da página register.html
 */

App.ready(() => {
  const campSelect = document.getElementById('lalider-camp');
  MockDB.camps.forEach((camp) => {
    const opt = document.createElement('option');
    opt.value = camp;
    opt.textContent = camp + (camp.startsWith('VLB') ? ' (Virtual)' : ' (In-person)');
    campSelect.appendChild(opt);
  });

  const countrySelect = document.getElementById('lalider-country');
  MockDB.countries.forEach((country) => {
    const opt = document.createElement('option');
    opt.value = country;
    opt.textContent = country;
    countrySelect.appendChild(opt);
  });

  const donorCountrySelect = document.getElementById('donor-country');
  MockDB.countries.forEach((country) => {
    const opt = document.createElement('option');
    opt.value = country;
    opt.textContent = country;
    donorCountrySelect.appendChild(opt);
  });

  const needCategorySelect = document.getElementById('lalider-need-category');
  MockDB.equipmentCategories.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.name;
    needCategorySelect.appendChild(opt);
  });

  const areaSelect = document.getElementById('lalider-area');
  MockDB.areasOfInterest.forEach((area) => {
    const opt = document.createElement('option');
    opt.value = area;
    opt.textContent = area;
    areaSelect.appendChild(opt);
  });

  document
    .getElementById('lalider-code')
    .addEventListener('input', (e) => handleCodeInput(e.target.value));
  document.getElementById('lalider-form').addEventListener('submit', handleLaliderRegister);
  document.getElementById('donor-form').addEventListener('submit', handleDonorRegister);

  const params = new URLSearchParams(window.location.search);
  if (params.get('type') === 'donor') switchTab('donor');

  if (Auth.isLoggedIn()) window.location.href = 'dashboard.html';
});

App.registerActions({
  'switch-tab': (el) => switchTab(el.dataset.tab),
});

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('form-' + tab).classList.add('active');
}

let codeVerified = false;

function handleCodeInput(value) {
  const widget = document.getElementById('verification-widget');
  const status = document.getElementById('code-status');
  const submitBtn = document.getElementById('lalider-submit');
  const input = document.getElementById('lalider-code');

  if (!value.trim()) {
    widget.className = 'verification-widget';
    status.innerHTML = '';
    submitBtn.disabled = true;
    input.className = 'form-input form-input--code';
    codeVerified = false;
    return;
  }

  widget.className = 'verification-widget verifying';
  status.innerHTML = '<span class="spinner"></span> <span>Verifying code...</span>';

  clearTimeout(window._codeTimeout);
  window._codeTimeout = setTimeout(() => {
    const result = Auth.verifyLaliderCode(value, null, { checkName: false });

    if (result.valid) {
      widget.className = 'verification-widget verified';
      input.className = 'form-input form-input--code form-input--success';
      status.innerHTML =
        '<span style="color: var(--success); font-weight: 600;">Code found. Enter your full name as registered with LALA.</span>';
      submitBtn.disabled = false;
      codeVerified = true;

      if (result.data) {
        document.getElementById('lalider-camp').value = result.data.camp;
        document.getElementById('lalider-country').value = result.data.country;
      }
    } else {
      widget.className = 'verification-widget failed';
      input.className = 'form-input form-input--code form-input--error';
      status.innerHTML =
        '<span style="color: var(--error); font-weight: 600;">' +
        App.escapeHTML(result.message) +
        '</span>';
      submitBtn.disabled = true;
      codeVerified = false;
    }
  }, 800);
}

async function handleLaliderRegister(e) {
  e.preventDefault();
  if (!codeVerified) {
    App.showToast('Please verify your LALA code first.', 'error');
    return;
  }

  const password = document.getElementById('lalider-password').value;
  const confirm = document.getElementById('lalider-password-confirm').value;
  if (password !== confirm) {
    App.showToast('Passwords do not match.', 'error');
    return;
  }

  const needDesc = document.getElementById('lalider-need').value.trim();
  const needCategory = document.getElementById('lalider-need-category').value;
  if (needDesc && !needCategory) {
    App.showToast('Please choose the equipment category for your need.', 'error');
    return;
  }

  const submitBtn = document.getElementById('lalider-submit');
  submitBtn.disabled = true; // evita envio duplo enquanto o hash é calculado
  const result = await safeRegister(() =>
    Auth.registerLalider({
      name: document.getElementById('lalider-name').value,
      email: document.getElementById('lalider-email').value,
      password,
      verificationCode: document.getElementById('lalider-code').value,
      camp: document.getElementById('lalider-camp').value,
      country: document.getElementById('lalider-country').value,
      state: document.getElementById('lalider-state').value,
      showerSong: document.getElementById('lalider-shower-song').value,
      areaOfInterest: document.getElementById('lalider-area').value,
      needDescription: needDesc,
    })
  );

  if (result.success) {
    Auth.startSession(result.user);
    App.showToast(result.message, 'success');
    if (needDesc) {
      const cat = MockDB.equipmentCategories.find((c) => c.id === needCategory);
      Donations.createNeed({
        laliderId: result.user.id,
        laliderName: App.displayName(result.user),
        camp: result.user.camp,
        country: result.user.country,
        category: needCategory,
        title: `${cat ? cat.name : 'Equipment'} needed for studies`,
        description: needDesc,
        urgency: 'medium',
      });
    }
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1500);
  } else {
    App.showToast(result.message, 'error');
    submitBtn.disabled = false;
  }
}

/** Executa o cadastro e transforma exceções (ex.: crypto indisponível) em mensagem. */
async function safeRegister(fn) {
  try {
    return await fn();
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async function handleDonorRegister(e) {
  e.preventDefault();
  const password = document.getElementById('donor-password').value;
  const confirm = document.getElementById('donor-password-confirm').value;
  if (password !== confirm) {
    App.showToast('Passwords do not match.', 'error');
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  const result = await safeRegister(() =>
    Auth.registerDonor({
      name: document.getElementById('donor-name').value,
      email: document.getElementById('donor-email').value,
      password,
      country: document.getElementById('donor-country').value,
      organization: document.getElementById('donor-org').value,
    })
  );

  if (result.success) {
    Auth.startSession(result.user);
    App.showToast(result.message, 'success');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1500);
  } else {
    App.showToast(result.message, 'error');
    submitBtn.disabled = false;
  }
}
