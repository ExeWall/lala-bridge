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
        onClick: () => {
          const typed = document.getElementById('delete-confirm').value.trim();
          if (typed.toUpperCase() !== word.toUpperCase()) {
            App.showToast(t('myData.deleteMismatch'), 'error');
            return;
          }
          const result = Privacy.deleteAccount(user.id);
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
  'download-data': () => {
    const user = Auth.getCurrentUser();
    if (user) Privacy.downloadData(user.id);
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

  App.showModal(
    t('request.modalTitle'),
    `<form id="request-form" style="text-align: left;">
    <div class="form-group">
      <label class="form-label form-label--required" for="request-category">${esc(t('request.category'))}</label>
      <select class="form-select" id="request-category" required><option value="">${esc(t('request.selectCategory'))}</option>${categoriesHTML}</select>
    </div>
    <div class="form-group">
      <label class="form-label form-label--required" for="request-title">${esc(t('request.titleLabel'))}</label>
      <input type="text" class="form-input" id="request-title" maxlength="120" placeholder="${esc(t('request.titlePlaceholder'))}" required>
    </div>
    <div class="form-group">
      <label class="form-label form-label--required" for="request-desc">${esc(t('request.description'))}</label>
      <textarea class="form-textarea" id="request-desc" maxlength="1000" placeholder="${esc(t('request.descriptionPlaceholder'))}" required></textarea>
    </div>
    <div class="form-group">
      <label class="form-label" for="request-urgency">${esc(t('request.priority'))}</label>
      <select class="form-select" id="request-urgency">${urgencyHTML}</select>
    </div>
  </form>`,
    [{ label: t('request.submit'), class: 'btn--primary', onClick: submitRequest }]
  );
}

function submitRequest() {
  const user = Auth.getCurrentUser();
  if (!Auth.isLalider()) {
    App.showToast(t('request.onlyLalideres'), 'error');
    return;
  }
  const category = document.getElementById('request-category').value;
  const title = document.getElementById('request-title').value.trim();
  const desc = document.getElementById('request-desc').value.trim();
  const urgency = document.getElementById('request-urgency').value;
  if (!category || !title || !desc) {
    App.showToast(t('request.fillRequired'), 'error');
    return;
  }

  Donations.createNeed({
    laliderId: user.id,
    laliderName: App.displayName(user),
    camp: user.camp,
    country: user.country,
    state: user.state,
    city: user.city,
    category,
    title,
    description: desc,
    urgency,
  });

  App.closeModal();
  App.showToast(t('request.submitted'), 'success');
  App.refresh();
}
