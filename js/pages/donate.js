/**
 * LALA Bridge — script da página donate.html
 */

let selectedCategory = '';

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.isLoggedIn()) {
    document.getElementById('auth-required').style.display = 'block';
    return;
  }
  document.getElementById('donation-form-container').style.display = 'block';

  const grid = document.getElementById('category-grid');
  grid.innerHTML = MockDB.equipmentCategories
    .map(
      (cat) =>
        `<button type="button" class="tag" data-action="select-category" data-category="${App.escapeHTML(cat.id)}">${App.escapeHTML(cat.name)}</button>`
    )
    .join('');

  const condSelect = document.getElementById('donation-condition');
  MockDB.conditions.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.label + ' — ' + c.description;
    condSelect.appendChild(opt);
  });

  document.getElementById('donation-form').addEventListener('submit', handleDonation);

  const user = Auth.getCurrentUser();
  if (user.country) document.getElementById('donation-location').value = user.country;
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
    App.showToast('Fill in at least the category and title to preview.', 'warning');
    return;
  }
  const user = Auth.getCurrentUser();
  const previewData = {
    id: 'preview',
    donorId: user.id,
    donorName: user.name,
    category: selectedCategory,
    title,
    description: document.getElementById('donation-desc').value || 'No description provided.',
    condition: document.getElementById('donation-condition').value || 'good',
    country: document.getElementById('donation-location').value || user.country || 'Unknown',
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
    App.showToast('Please select a category.', 'error');
    return;
  }
  const user = Auth.getCurrentUser();
  Donations.create({
    donorId: user.id,
    donorName: user.organization || user.name,
    category: selectedCategory,
    title: document.getElementById('donation-title').value,
    description: document.getElementById('donation-desc').value,
    condition: document.getElementById('donation-condition').value,
    country: document.getElementById('donation-location').value,
  });
  App.showToast('Donation published successfully! Lalíderes can now see it.', 'success');
  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 2000);
}
