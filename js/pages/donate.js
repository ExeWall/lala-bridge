/**
 * LALA Bridge — script da página donate.html
 */

let selectedCategory = '';

App.ready(() => {
  if (!Auth.isLoggedIn()) {
    document.getElementById('auth-required').style.display = 'block';
    return;
  }
  if (!Auth.isDonor()) {
    document.getElementById('donor-only').style.display = 'block';
    return;
  }
  document.getElementById('donation-form-container').style.display = 'block';

  const grid = document.getElementById('category-grid');
  grid.innerHTML = MockDB.equipmentCategories
    .map(
      (cat) =>
        `<button type="button" class="tag" data-action="select-category" data-category="${App.escapeHTML(cat.id)}" aria-pressed="false">${App.escapeHTML(App.getCategory(cat.id).name)}</button>`
    )
    .join('');

  const condSelect = document.getElementById('donation-condition');
  MockDB.conditions.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.id;
    const cond = App.getCondition(c.id);
    opt.textContent = `${cond.label} — ${cond.description}`;
    condSelect.appendChild(opt);
  });

  document.getElementById('donation-form').addEventListener('submit', handleDonation);

  // Começa com a localização do cadastro do doador; dá para mudar.
  const user = Auth.getCurrentUser();
  App.setupLocationFields('donation', {
    value: { country: user.country || 'BR', state: user.state, city: user.city },
  });
});

App.registerActions({
  'select-category': (el) => selectCategory(el.dataset.category),
  preview: () => showPreview(),
});

function selectCategory(id) {
  selectedCategory = id;
  document.getElementById('donation-category').value = id;
  document
    .querySelectorAll('#category-grid .tag')
    .forEach((t) => t.classList.toggle('active', t.dataset.category === id));
}

function showPreview() {
  const title = document.getElementById('donation-title').value;
  if (!selectedCategory || !title) {
    App.showToast(I18n.t('donate.fillToPreview'), 'warning');
    return;
  }
  const user = Auth.getCurrentUser();
  const previewData = {
    id: 'preview',
    donorId: user.id,
    donorName: user.name,
    category: selectedCategory,
    title,
    description: document.getElementById('donation-desc').value || I18n.t('donate.noDescription'),
    condition: document.getElementById('donation-condition').value || 'good',
    ...App.readLocation('donation'),
    status: 'available',
    createdAt: new Date().toISOString(),
  };
  document.getElementById('preview-card').innerHTML = App.renderDonationCard(previewData);
  document.getElementById('donation-preview').style.display = 'block';
  document
    .getElementById('donation-preview')
    .scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function handleDonation(e) {
  e.preventDefault();
  if (!selectedCategory) {
    App.showToast(I18n.t('donate.selectCategory'), 'error');
    return;
  }
  const user = Auth.getCurrentUser();
  if (!Auth.isDonor()) {
    App.showToast(I18n.t('donate.onlyDonors'), 'error');
    return;
  }
  Donations.create({
    donorId: user.id,
    donorName: user.organization || user.name,
    category: selectedCategory,
    title: document.getElementById('donation-title').value,
    description: document.getElementById('donation-desc').value,
    condition: document.getElementById('donation-condition').value,
    ...App.readLocation('donation'),
  });
  App.showToast(I18n.t('donate.published'), 'success');
  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 2000);
}
