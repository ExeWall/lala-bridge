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

App.registerActions({
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
