/**
 * LALA Bridge — script da página donate.html
 */

let selectedCategory = '';
let selectedPhotos = [];

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
  renderAnalyzeButton();
  document.addEventListener('lala:photos-changed', renderAnalyzeButton);
  // Specs escritas no título preenchem os campos vazios (o doador pode mudar).
  document.getElementById('donation-title').addEventListener('blur', (e) => {
    fillSpecs(LocalAI.parseSpecs(e.target.value), { onlyEmpty: true });
  });
  document.getElementById('donation-photos').addEventListener('change', (e) => {
    addPhotos([...e.target.files]);
    e.target.value = '';
  });

  // Começa com a localização do cadastro do doador; dá para mudar.
  const user = Auth.getCurrentUser();
  App.setupLocationFields('donation', {
    value: { country: user.country || 'BR', state: user.state, city: user.city },
  });
});

/** Adiciona fotos à seleção (máximo Photos.MAX_PHOTOS) e mostra as miniaturas. */
function addPhotos(files) {
  const images = files.filter((f) => /^image\//.test(f.type));
  if (selectedPhotos.length + images.length > Photos.MAX_PHOTOS) {
    App.showToast(I18n.t('donate.tooManyPhotos', { max: Photos.MAX_PHOTOS }), 'warning');
  }
  selectedPhotos = [...selectedPhotos, ...images].slice(0, Photos.MAX_PHOTOS);
  renderPhotoPreviews();
  document.dispatchEvent(new CustomEvent('lala:photos-changed', { detail: selectedPhotos }));
}

function renderPhotoPreviews() {
  const box = document.getElementById('photo-previews');
  box.querySelectorAll('img').forEach((img) => URL.revokeObjectURL(img.src));
  box.innerHTML = selectedPhotos
    .map(
      (_f, i) => `<figure class="photo-preview">
        <img alt="" />
        <button type="button" class="photo-preview__remove" data-action="remove-photo" data-index="${i}"
          aria-label="${App.escapeHTML(I18n.t('donate.removePhoto', { n: i + 1 }))}">&times;</button>
      </figure>`
    )
    .join('');
  box.querySelectorAll('img').forEach((img, i) => {
    img.src = URL.createObjectURL(selectedPhotos[i]);
  });
}

// ------------------------------------------------- análise de fotos (IA)
let aiDonation = null;

function renderAnalyzeButton() {
  const slot = document.getElementById('ai-photo-slot');
  if (!selectedPhotos.length) {
    slot.innerHTML = '';
    return;
  }
  if (slot.querySelector('#analyze-photos')) return;
  slot.innerHTML = `
    <button type="button" class="btn btn--outline btn--sm" id="analyze-photos" data-action="analyze-photos">✨ ${App.escapeHTML(I18n.t('donate.analyze'))}</button>
    <p class="form-hint">${App.escapeHTML(I18n.t('donate.analyzeHint'))}</p>
    <div id="analyze-result" aria-live="polite"></div>`;
}

function fillSpecs(specs = {}, { onlyEmpty = false } = {}) {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (value === undefined || value === null || value === '') return;
    if (onlyEmpty && el.value) return;
    el.value = value;
  };
  set('donation-ram', specs.ramGb);
  set('donation-storage', specs.storageGb);
  set('donation-os', specs.os);
}

function readSpecs() {
  const specs = {};
  const ram = Number(document.getElementById('donation-ram').value);
  const storage = Number(document.getElementById('donation-storage').value);
  const os = document.getElementById('donation-os').value.trim();
  if (ram > 0) specs.ramGb = ram;
  if (storage > 0) specs.storageGb = storage;
  if (os) specs.os = os;
  return specs;
}

async function analyzePhotos(btn) {
  btn.disabled = true;
  btn.textContent = I18n.t('donate.analyzing');
  const images = [];
  for (const file of selectedPhotos) {
    images.push(await Photos.compress(file, { maxSize: 768, quality: 0.75, output: 'dataURL' }));
  }
  const result = await AI.analyzeDonation(images, document.getElementById('donation-title').value);
  btn.disabled = false;
  btn.textContent = `✨ ${I18n.t('donate.analyze')}`;
  const box = document.getElementById('analyze-result');
  if (!result.success) {
    fillSpecs(result.specs, { onlyEmpty: true });
    box.innerHTML = `<div class="ai-note ai-note--local"><p>${App.escapeHTML(result.message)}</p></div>`;
    return;
  }
  const s = result.suggestion;
  aiDonation = s;
  if (s.category) selectCategory(s.category);
  const title = document.getElementById('donation-title');
  if (!title.value.trim() && s.model) title.value = s.model;
  if (s.condition) document.getElementById('donation-condition').value = s.condition;
  fillSpecs(s.specs);
  const uses = s.recommendedUses?.length
    ? `<p class="text-sm">${App.escapeHTML(I18n.t('donate.recommendedUses', { uses: s.recommendedUses.join(', ') }))}</p>`
    : '';
  box.innerHTML = `<div class="ai-note ai-note--ai">
    <p><strong>${App.escapeHTML(I18n.t('ai.badgeAi'))}</strong></p>
    <p>${App.escapeHTML(I18n.t('donate.analyzed'))}</p>
    ${uses}
    ${s.notes ? `<p class="text-sm">${App.escapeHTML(s.notes)}</p>` : ''}
    <p class="text-xs text-muted">${App.escapeHTML(I18n.t('donate.confidence', { pct: Math.round(s.confidence * 100) }))} · ${App.escapeHTML(I18n.t('ai.mayBeWrong'))}</p>
  </div>`;
}

App.registerActions({
  'analyze-photos': (el) => analyzePhotos(el),
  'remove-photo': (el) => {
    selectedPhotos.splice(Number(el.dataset.index), 1);
    renderPhotoPreviews();
    document.dispatchEvent(new CustomEvent('lala:photos-changed', { detail: selectedPhotos }));
  },
  'select-category': (el) => selectCategory(el.dataset.category),
  preview: () => showPreview(),
});

function selectCategory(id) {
  selectedCategory = id;
  document.getElementById('donation-category').value = id;
  document.querySelectorAll('#category-grid .tag').forEach((t) => {
    const on = t.dataset.category === id;
    t.classList.toggle('active', on);
    t.setAttribute('aria-pressed', String(on));
  });
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

async function handleDonation(e) {
  e.preventDefault();
  if (!selectedCategory) {
    App.showToast(I18n.t('donate.selectCategory'), 'error');
    return;
  }
  if (!Auth.isDonor()) {
    App.showToast(I18n.t('donate.onlyDonors'), 'error');
    return;
  }
  const submit = e.target.querySelector('button[type="submit"]');
  submit.disabled = true;
  let photos = [];
  if (selectedPhotos.length) {
    submit.textContent = I18n.t('donate.uploading');
    const upload = await Api.uploadDonationPhotos(selectedPhotos);
    if (!upload.success) {
      App.showToast(upload.message, 'error');
      submit.disabled = false;
      submit.textContent = I18n.t('donate.publish');
      return;
    }
    photos = upload.photos;
  }
  const result = await Api.createDonation({
    photos,
    specs: readSpecs(),
    aiSuggestion: aiDonation ? { source: 'ai', ...aiDonation } : null,
    category: selectedCategory,
    title: document.getElementById('donation-title').value,
    description: document.getElementById('donation-desc').value,
    condition: document.getElementById('donation-condition').value,
    ...App.readLocation('donation'),
  });
  App.showToast(result.message, result.success ? 'success' : 'error');
  if (!result.success) {
    submit.disabled = false;
    submit.textContent = I18n.t('donate.publish');
    return;
  }
  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 2000);
}
