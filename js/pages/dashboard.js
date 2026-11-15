/**
 * LALA Bridge — script da página dashboard.html
 */

const t = (key, params) => I18n.t(key, params);
const esc = (value) => App.escapeHTML(value);

App.ready(() => {
  if (!Auth.requireAuth()) return;
  App.onDataChange = renderDashboard;
  renderDashboard();
});

function renderDashboard() {
  const user = Auth.getCurrentUser();
  if (!user) return;
  if (user.type === 'admin') {
    window.location.href = 'admin.html';
    return;
  }
  if (user.type === 'lalider') renderLaliderDashboard(user);
  else renderDonorDashboard(user);
}

function statCard(icon, color, value, label) {
  return `
    <div class="card stat-card">
      <div class="stat-card__icon stat-card__icon--${color}" aria-hidden="true">${icon}</div>
      <div><div class="stat-card__value">${I18n.formatNumber(value)}</div><div class="stat-card__label">${esc(label)}</div></div>
    </div>`;
}

function section(title, bodyHTML) {
  return `<section style="margin-bottom: var(--s-7);"><h2 class="h-3" style="margin-bottom: var(--s-5);">${esc(title)}</h2>${bodyHTML}</section>`;
}

function grid(itemsHTML) {
  return `<div class="grid-auto">${itemsHTML.join('')}</div>`;
}

function emptyState(title, desc, actionHTML = '') {
  return `<div class="empty-state card card--flat">
    <div class="empty-state__icon" aria-hidden="true">—</div>
    <h3 class="empty-state__title">${esc(title)}</h3>
    <p class="empty-state__desc">${esc(desc)}</p>
    ${actionHTML}
  </div>`;
}

function viewAllLink(href, label) {
  return `<div style="margin-top: var(--s-5);"><a href="${href}" class="link-underline">${esc(label)}</a></div>`;
}

/**
 * Seções de ofertas comuns aos dois papéis: aguardando resposta, matches
 * ativos (com contatos), enviadas e histórico.
 */
function renderOffersSections(user) {
  const offers = Offers.getForUser(user.id);
  const waiting = offers.filter(
    (o) => o.status === 'pending' && Offers.getRecipientId(o) === user.id
  );
  const active = offers.filter((o) => o.status === 'accepted');
  const sent = offers.filter((o) => o.status === 'pending' && Offers.getRecipientId(o) !== user.id);
  const history = offers.filter((o) => ['delivered', 'declined'].includes(o.status));
  const cards = (list) => grid(list.map((o) => App.renderOfferCard(o, user)));

  let html = '';
  if (waiting.length) {
    html += section(t('dashboard.sectionWaiting', { count: waiting.length }), cards(waiting));
  }
  if (active.length) html += section(t('dashboard.sectionActive'), cards(active));
  if (sent.length) html += section(t('dashboard.sectionSent'), cards(sent));
  if (history.length) html += section(t('dashboard.sectionHistory'), cards(history));
  return html;
}

function welcomeHeader(user, badgeClass, badgeLabel, subtitleHTML, extraHTML = '') {
  return `
    <div>
      <h1 class="dashboard__welcome">
        ${esc(t('dashboard.welcome', { name: user.name.split(' ')[0] }))}
        <span class="badge ${badgeClass}" style="margin-left: 8px; vertical-align: middle;">${esc(badgeLabel)}</span>
      </h1>
      <p class="dashboard__subtitle">${subtitleHTML}</p>
      ${extraHTML}
    </div>`;
}

function renderLaliderDashboard(user) {
  const stats = Donations.getStats();
  const myNeeds = Donations.getNeedsByLalider(user.id);
  const received = Offers.getForUser(user.id).filter((o) =>
    ['accepted', 'delivered'].includes(o.status)
  );
  const available = Donations.getAvailable();

  const subtitle = [
    esc(user.camp),
    esc(App.formatLocation(user)),
    esc(App.areaName(user.areaOfInterest) || t('dashboard.community')),
  ]
    .filter(Boolean)
    .join(' &middot; ');
  const song = user.showerSong
    ? `<p class="text-sm text-muted" style="margin-top: 4px;">${esc(t('dashboard.showerSong', { song: user.showerSong }))}</p>`
    : '';

  document.getElementById('dashboard-header').innerHTML = welcomeHeader(
    user,
    'badge--lalider',
    t('dashboard.verifiedLalider'),
    subtitle,
    song
  );

  document.getElementById('dashboard-stats').innerHTML = [
    statCard('&#9776;', 'gold', myNeeds.length, t('dashboard.statMyRequests')),
    statCard('&#10003;', 'success', received.length, t('dashboard.statReceived')),
    statCard('&#9679;', 'violet', available.length, t('dashboard.statAvailable')),
    statCard('&#9673;', 'orange', stats.countries, t('dashboard.statCountries')),
  ].join('');

  document.getElementById('dashboard-actions').innerHTML = `
    <div class="flex gap-4" style="flex-wrap: wrap;">
      <a href="browse.html" class="btn btn--primary">${esc(t('dashboard.browseDonations'))}</a>
      <button type="button" class="btn btn--outline" data-action="new-request">${esc(t('dashboard.newRequest'))}</button>
    </div>
  `;

  let html = renderOffersSections(user);
  html += renderRecommendationsForLalider(myNeeds);

  html += section(
    t('dashboard.sectionMyRequests'),
    myNeeds.length
      ? grid(myNeeds.map((n) => App.renderNeedCard(n)))
      : emptyState(
          t('dashboard.noRequestsTitle'),
          t('dashboard.noRequestsDesc'),
          `<button type="button" class="btn btn--primary" data-action="new-request">${esc(t('dashboard.noRequestsButton'))}</button>`
        )
  );

  let availableHTML = available.length
    ? grid(available.slice(0, 4).map((d) => App.renderDonationCard(d)))
    : emptyState(t('dashboard.noAvailableTitle'), t('dashboard.noAvailableDesc'));
  if (available.length > 4) availableHTML += viewAllLink('browse.html', t('dashboard.viewAll'));
  html += section(t('dashboard.sectionAvailable'), availableHTML);

  html += renderMyDataSection(user);
  document.getElementById('dashboard-content').innerHTML = html;
}

function renderDonorDashboard(user) {
  const stats = Donations.getStats();
  const myDonations = Donations.getByDonor(user.id);
  const openNeeds = Donations.getOpenNeeds();

  const subtitle = [
    esc(user.organization),
    esc(App.formatLocation(user)),
    esc(t('dashboard.donorThanks')),
  ]
    .filter(Boolean)
    .join(' &middot; ');
  document.getElementById('dashboard-header').innerHTML = welcomeHeader(
    user,
    'badge--donor',
    t('roles.donor'),
    subtitle
  );

  document.getElementById('dashboard-stats').innerHTML = [
    statCard('&#9679;', 'gold', myDonations.length, t('dashboard.statMyDonations')),
    statCard(
      '&#10003;',
      'success',
      myDonations.filter((d) => ['matched', 'delivered'].includes(d.status)).length,
      t('dashboard.statMatched')
    ),
    statCard('&#9776;', 'violet', openNeeds.length, t('dashboard.statOpenRequests')),
    statCard('&#9673;', 'orange', stats.countries, t('dashboard.statCountries')),
  ].join('');

  document.getElementById('dashboard-actions').innerHTML = `
    <div class="flex gap-4" style="flex-wrap: wrap;">
      <a href="donate.html" class="btn btn--primary">${esc(t('dashboard.createDonation'))}</a>
      <a href="browse.html?view=needs" class="btn btn--outline">${esc(t('dashboard.viewRequests'))}</a>
    </div>
  `;

  let html = renderOffersSections(user);
  html += renderRecommendationsForDonor(myDonations);

  html += section(
    t('dashboard.sectionMyDonations'),
    myDonations.length
      ? grid(myDonations.map((d) => App.renderDonationCard(d)))
      : emptyState(
          t('dashboard.noDonationsTitle'),
          t('dashboard.noDonationsDesc'),
          `<a href="donate.html" class="btn btn--primary">${esc(t('dashboard.noDonationsButton'))}</a>`
        )
  );

  let needsHTML = openNeeds.length
    ? grid(openNeeds.slice(0, 4).map((n) => App.renderNeedCard(n)))
    : emptyState(t('dashboard.noOpenTitle'), t('dashboard.noOpenDesc'));
  if (openNeeds.length > 4) {
    needsHTML += viewAllLink('browse.html?view=needs', t('dashboard.viewAllRequests'));
  }
  html += section(t('dashboard.sectionNeedHelp'), needsHTML);

  html += renderMyDataSection(user);
  document.getElementById('dashboard-content').innerHTML = html;
}

// ------------------------------------------------------------ matching
function sectionWithIntro(title, intro, body) {
  return section(
    title,
    `<p class="text-muted" style="margin: calc(-1 * var(--s-3)) 0 var(--s-5);">${esc(intro)}</p>${body}`
  );
}

/** Lalíder: as doações mais compatíveis com seus pedidos abertos. */
function renderRecommendationsForLalider(myNeeds) {
  const open = myNeeds.filter((n) => n.status === 'open');
  if (!open.length) return '';
  const best = new Map();
  open.forEach((need) => {
    Matching.forNeed(need, Donations.getAvailable(), 3).forEach(({ donation, match }) => {
      const current = best.get(donation.id);
      if (!current || current.match.score < match.score) best.set(donation.id, { donation, match });
    });
  });
  const top = [...best.values()].sort((a, b) => b.match.score - a.match.score).slice(0, 4);
  const body = top.length
    ? grid(top.map(({ donation, match }) => App.renderDonationCard(donation, { match })))
    : `<p class="text-muted">${esc(t('match.none'))}</p>`;
  return sectionWithIntro(t('match.forYou'), t('match.forYouDesc'), body);
}

/** Doador: para cada doação disponível, os pedidos que ela pode atender. */
function renderRecommendationsForDonor(myDonations) {
  const available = myDonations.filter((d) => d.status === 'available');
  if (!available.length) return '';
  const groups = available
    .map((donation) => ({
      donation,
      results: Matching.forDonation(donation, Donations.getOpenNeeds(), 3),
    }))
    .filter((g) => g.results.length);
  const body = groups.length
    ? groups
        .map(
          ({
            donation,
            results,
          }) => `<h3 class="h-4 match-group__title">${esc(t('match.forDonation', { title: donation.title }))}</h3>
          ${grid(results.map(({ need, match }) => App.renderNeedCard(need, { match })))}`
        )
        .join('')
    : `<p class="text-muted">${esc(t('match.none'))}</p>`;
  return sectionWithIntro(t('match.forDonations'), t('match.forDonationsDesc'), body);
}

/**
 * LGPD: baixar os próprios dados e excluir a conta.
 */
function renderMyDataSection(user) {
  const consent = user.consentAt
    ? `<p class="text-sm text-muted" style="margin-top: var(--s-2);">${esc(t('myData.consentOn', { date: I18n.formatDate(user.consentAt) }))}</p>`
    : '';
  return section(
    t('myData.title'),
    `<div class="card card--flat my-data">
      <p>${esc(t('myData.desc'))}</p>
      ${consent}
      <div class="flex gap-4" style="flex-wrap: wrap; margin-top: var(--s-5);">
        <button type="button" class="btn btn--outline" data-action="download-data">${esc(t('myData.download'))}</button>
        <button type="button" class="btn btn--ghost btn--danger" data-action="delete-account">${esc(t('myData.delete'))}</button>
        <a href="privacidade.html" class="link-underline" style="align-self: center;">${esc(t('myData.privacyLink'))}</a>
      </div>
    </div>`
  );
}

function showDeleteAccountModal() {
  const user = Auth.getCurrentUser();
  if (!user) return;
  const word = t('myData.deleteWord');
  App.showModal(
    t('myData.deleteTitle'),
    `<p>${esc(t('myData.deleteBody'))}</p>
     <div class="form-group" style="margin-top: var(--s-4); text-align: left;">
       <label class="form-label" for="delete-confirm">${esc(t('myData.deleteConfirmLabel'))}</label>
       <input type="text" class="form-input" id="delete-confirm" autocomplete="off" autocapitalize="characters">
     </div>`,
    [
      {
        label: t('myData.deleteButton'),
        class: 'btn--danger',
        onClick: async () => {
          const typed = document.getElementById('delete-confirm').value.trim();
          if (typed.toUpperCase() !== word.toUpperCase()) {
            App.showToast(t('myData.deleteMismatch'), 'error');
            return;
          }
          const result = await Api.deleteMyAccount();
          App.closeModal();
          App.showToast(result.message, result.success ? 'success' : 'error');
          if (result.success) {
            setTimeout(() => {
              window.location.href = 'index.html';
            }, 1200);
          }
        },
      },
    ]
  );
}

App.registerActions({
  'new-request': () => showRequestForm(),
  'download-data': async () => {
    const result = await Api.exportMyData();
    if (result.success) Privacy.downloadJson(result.data);
    else App.showToast(result.message, 'error');
  },
  'delete-account': () => showDeleteAccountModal(),
});

function showRequestForm() {
  if (!Auth.isLalider()) {
    App.showToast(t('request.onlyLalideres'), 'error');
    return;
  }
  const categoriesHTML = MockDB.equipmentCategories
    .map((c) => `<option value="${esc(c.id)}">${esc(App.getCategory(c.id).name)}</option>`)
    .join('');
  const urgencyHTML = ['medium', 'high', 'low']
    .map((u) => `<option value="${u}">${esc(t(`urgency.option.${u}`))}</option>`)
    .join('');
  const canVoice =
    (AI.remote && window.MediaRecorder && navigator.mediaDevices) || AI.browserSpeech();

  App.showModal(
    t('request.modalTitle'),
    `<div class="assistant" style="text-align: left;">
      <h3 class="h-4">${esc(t('assistant.title'))}</h3>
      <div class="form-group">
        <label class="form-label" for="assistant-text">${esc(t('assistant.label'))}</label>
        <textarea class="form-textarea" id="assistant-text" maxlength="1500" placeholder="${esc(t('assistant.placeholder'))}"></textarea>
      </div>
      <div class="flex gap-2" style="flex-wrap: wrap;">
        ${canVoice ? `<button type="button" class="btn btn--outline btn--sm" id="assistant-mic" aria-pressed="false">🎤 ${esc(t('assistant.record'))}</button>` : ''}
        <button type="button" class="btn btn--primary btn--sm" id="assistant-organize">✨ ${esc(t('assistant.organize'))}</button>
      </div>
      <p class="form-hint">${esc(t(AI.remote ? 'assistant.privacyAi' : 'assistant.privacyLocal'))}</p>
      <div id="assistant-result" aria-live="polite"></div>
    </div>
    <p class="assistant__divider">${esc(t('assistant.or'))}</p>
    <form id="request-form" style="text-align: left;">
    <div class="form-group">
      <label class="form-label form-label--required" for="request-category">${esc(t('request.category'))}</label>
      <select class="form-select" id="request-category" required><option value="">${esc(t('request.selectCategory'))}</option>${categoriesHTML}</select>
    </div>
    <div class="form-group">
      <label class="form-label form-label--required" for="request-title">${esc(t('request.titleLabel'))}</label>
      <input type="text" class="form-input" id="request-title" maxlength="120" placeholder="${esc(t('request.titlePlaceholder'))}" required>
    </div>
    <div class="form-group">
      <label class="form-label" for="request-use">${esc(t('request.intendedUse'))}</label>
      <input type="text" class="form-input" id="request-use" maxlength="200" placeholder="${esc(t('request.intendedUsePlaceholder'))}">
    </div>
    <div class="form-group">
      <label class="form-label form-label--required" for="request-desc">${esc(t('request.description'))}</label>
      <textarea class="form-textarea" id="request-desc" maxlength="1000" placeholder="${esc(t('request.descriptionPlaceholder'))}" required></textarea>
    </div>
    <fieldset class="form-group fieldset">
      <legend class="form-label">${esc(t('request.requirements'))}</legend>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="request-ram">${esc(t('request.ram'))}</label>
          <input type="number" min="1" max="128" inputmode="numeric" class="form-input" id="request-ram">
        </div>
        <div class="form-group">
          <label class="form-label" for="request-storage">${esc(t('request.storage'))}</label>
          <input type="number" min="1" max="8192" inputmode="numeric" class="form-input" id="request-storage">
        </div>
      </div>
      <div class="form-check">
        <input type="checkbox" id="request-camera">
        <label for="request-camera">${esc(t('request.camera'))}</label>
      </div>
    </fieldset>
    <div class="form-group">
      <label class="form-label" for="request-urgency">${esc(t('request.priority'))}</label>
      <select class="form-select" id="request-urgency">${urgencyHTML}</select>
    </div>
  </form>`,
    [{ label: t('request.submit'), class: 'btn--primary', onClick: submitRequest }]
  );
  lastSuggestion = null;
  document.getElementById('assistant-organize').addEventListener('click', organizeRequest);
  document
    .getElementById('assistant-mic')
    ?.addEventListener('click', (e) => toggleVoice(e.currentTarget));
}

/** Última sugestão aplicada (guardada no pedido, para auditoria). */
let lastSuggestion = null;

async function organizeRequest() {
  const btn = document.getElementById('assistant-organize');
  const text = document.getElementById('assistant-text').value;
  btn.disabled = true;
  btn.textContent = t('assistant.organizing');
  const result = await AI.structureNeed(text);
  btn.disabled = false;
  btn.textContent = `✨ ${t('assistant.organize')}`;
  if (!result.success) {
    App.showToast(result.message, 'error');
    return;
  }
  applySuggestion(result.suggestion, result.source, text);
}

function applySuggestion(s, source, originalText) {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) el.value = value;
  };
  set('request-category', s.category);
  set('request-title', s.title);
  set('request-use', s.intendedUse);
  if (!document.getElementById('request-desc').value.trim())
    set('request-desc', originalText.trim());
  set('request-ram', s.requirements?.ramGb ?? '');
  set('request-storage', s.requirements?.storageGb ?? '');
  document.getElementById('request-camera').checked = s.requirements?.camera === true;
  set('request-urgency', s.urgency);
  lastSuggestion = { source, ...s };

  document.getElementById('assistant-result').innerHTML = `
    <div class="ai-note ai-note--${source}">
      <p><strong>${esc(t(source === 'ai' ? 'ai.badgeAi' : 'ai.badgeLocal'))}</strong></p>
      <p>${esc(t('assistant.filled'))}</p>
      ${s.justification ? `<p class="text-sm">${esc(t('request.justification', { text: s.justification }))}</p>` : ''}
    </div>`;
  document.getElementById('request-title').focus();
}

// ------------------------------------------------------------ voz
let recorder = null;
let speech = null;

async function toggleVoice(btn) {
  const textarea = document.getElementById('assistant-text');
  const append = (text) => {
    textarea.value = [textarea.value.trim(), text.trim()].filter(Boolean).join(' ');
  };
  const reset = () => {
    btn.textContent = `🎤 ${t('assistant.record')}`;
    btn.setAttribute('aria-pressed', 'false');
    btn.disabled = false;
  };

  // Parar uma gravação em andamento.
  if (recorder?.state === 'recording') {
    recorder.stop();
    return;
  }
  if (speech) {
    speech.stop();
    return;
  }

  // 1) Com servidor: grava e transcreve com a IA.
  if (AI.remote && window.MediaRecorder && navigator.mediaDevices?.getUserMedia) {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      App.showToast(t('assistant.micDenied'), 'error');
      return;
    }
    const chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach((tr) => tr.stop());
      clearTimeout(recorder._limit);
      btn.disabled = true;
      btn.textContent = t('assistant.transcribing');
      const result = await AI.transcribe(
        new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
      );
      reset();
      if (result.success) append(result.text);
      else App.showToast(result.message, 'error');
    };
    recorder.start();
    recorder._limit = setTimeout(() => recorder?.state === 'recording' && recorder.stop(), 60000);
    btn.textContent = `⏹ ${t('assistant.stop')}`;
    btn.setAttribute('aria-pressed', 'true');
    App.showToast(t('assistant.listening'), 'info', 2500);
    return;
  }

  // 2) Sem servidor: ditado do próprio navegador, se existir.
  const Rec = AI.browserSpeech();
  if (!Rec) {
    App.showToast(t('assistant.voiceUnavailable'), 'warning');
    return;
  }
  speech = new Rec();
  speech.lang = I18n.locale;
  speech.interimResults = false;
  speech.onresult = (e) => append([...e.results].map((r) => r[0].transcript).join(' '));
  speech.onerror = () => App.showToast(t('assistant.micDenied'), 'error');
  speech.onend = () => {
    speech = null;
    reset();
  };
  speech.start();
  btn.textContent = `⏹ ${t('assistant.stop')}`;
  btn.setAttribute('aria-pressed', 'true');
  App.showToast(t('assistant.browserVoice'), 'info', 3500);
}

async function submitRequest() {
  if (!Auth.isLalider()) {
    App.showToast(t('request.onlyLalideres'), 'error');
    return;
  }
  const value = (id) => document.getElementById(id).value.trim();
  const category = value('request-category');
  const title = value('request-title');
  const desc = value('request-desc');
  if (!category || !title || !desc) {
    App.showToast(t('request.fillRequired'), 'error');
    return;
  }
  const requirements = {};
  if (Number(value('request-ram')) > 0) requirements.ramGb = Number(value('request-ram'));
  if (Number(value('request-storage')) > 0)
    requirements.storageGb = Number(value('request-storage'));
  if (document.getElementById('request-camera').checked) requirements.camera = true;

  const result = await Api.createNeed({
    category,
    title,
    description: desc,
    intendedUse: value('request-use'),
    requirements,
    urgency: value('request-urgency'),
    aiSuggestion: lastSuggestion,
  });
  App.closeModal();
  App.showToast(result.message, result.success ? 'success' : 'error');
  App.refresh();
}
