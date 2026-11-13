/**
 * LALA Bridge — script da página dashboard.html
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth()) return;
  if (!Auth.getCurrentUser()) {
    Auth.logout();
    window.location.href = 'login.html';
    return;
  }
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
      <div class="stat-card__icon stat-card__icon--${color}">${icon}</div>
      <div><div class="stat-card__value">${value}</div><div class="stat-card__label">${label}</div></div>
    </div>`;
}

function section(title, bodyHTML) {
  return `<div style="margin-bottom: var(--s-7);"><h2 class="h-3" style="margin-bottom: var(--s-5);">${title}</h2>${bodyHTML}</div>`;
}

function grid(itemsHTML) {
  return `<div class="grid-auto">${itemsHTML.join('')}</div>`;
}

function emptyState(title, desc, actionHTML = '') {
  return `<div class="empty-state card card--flat">
    <div class="empty-state__icon">—</div>
    <h3 class="empty-state__title">${title}</h3>
    <p class="empty-state__desc">${desc}</p>
    ${actionHTML}
  </div>`;
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
  if (waiting.length)
    html += section(`Waiting for your answer (${waiting.length})`, cards(waiting));
  if (active.length) html += section('Active matches', cards(active));
  if (sent.length) html += section('Sent by you', cards(sent));
  if (history.length) html += section('History', cards(history));
  return html;
}

function renderLaliderDashboard(user) {
  const stats = Donations.getStats();
  const myNeeds = Donations.getNeedsByLalider(user.id);
  const received = Offers.getForUser(user.id).filter((o) =>
    ['accepted', 'delivered'].includes(o.status)
  );
  const available = Donations.getAvailable();
  const e = (v) => App.escapeHTML(v);

  document.getElementById('dashboard-header').innerHTML = `
    <div>
      <div class="dashboard__welcome">
        Welcome, ${e(user.name.split(' ')[0])}
        <span class="badge badge--lalider" style="margin-left: 8px; vertical-align: middle;">Verified Lalíder</span>
      </div>
      <p class="dashboard__subtitle">
        ${e(user.camp)} &middot; ${e(user.country)}${user.state ? ', ' + e(user.state) : ''} &middot; ${e(user.areaOfInterest || 'LALA Community')}
      </p>
      ${user.showerSong ? `<p class="text-sm text-muted" style="margin-top: 4px;">Shower song: "${e(user.showerSong)}"</p>` : ''}
    </div>
  `;

  document.getElementById('dashboard-stats').innerHTML = [
    statCard('&#9776;', 'gold', myNeeds.length, 'My Requests'),
    statCard('&#10003;', 'success', received.length, 'Donations Received'),
    statCard('&#9679;', 'violet', available.length, 'Available Donations'),
    statCard('&#9673;', 'orange', stats.countries, 'Countries Active'),
  ].join('');

  document.getElementById('dashboard-actions').innerHTML = `
    <div class="flex gap-4" style="flex-wrap: wrap;">
      <a href="browse.html" class="btn btn--primary">Browse Available Donations</a>
      <button type="button" class="btn btn--outline" data-action="new-request">Submit a New Request</button>
    </div>
  `;

  let html = renderOffersSections(user);

  html += section(
    'My Requests',
    myNeeds.length
      ? grid(myNeeds.map((n) => App.renderNeedCard(n)))
      : emptyState(
          'No Requests Yet',
          'Submit a request describing the equipment you need. Donors will see it and can offer to help.',
          '<button type="button" class="btn btn--primary" data-action="new-request">Submit a Request</button>'
        )
  );

  let availableHTML = available.length
    ? grid(available.slice(0, 4).map((d) => App.renderDonationCard(d)))
    : emptyState('No Donations Available', 'New donations will show up here.');
  if (available.length > 4) {
    availableHTML +=
      '<div style="margin-top: var(--s-5);"><a href="browse.html" class="link-underline">View all</a></div>';
  }
  html += section('Available Donations', availableHTML);

  document.getElementById('dashboard-content').innerHTML = html;
}

function renderDonorDashboard(user) {
  const stats = Donations.getStats();
  const myDonations = Donations.getByDonor(user.id);
  const openNeeds = Donations.getOpenNeeds();
  const e = (v) => App.escapeHTML(v);

  document.getElementById('dashboard-header').innerHTML = `
    <div>
      <div class="dashboard__welcome">
        Welcome, ${e(user.name.split(' ')[0])}
        <span class="badge badge--donor" style="margin-left: 8px; vertical-align: middle;">Donor</span>
      </div>
      <p class="dashboard__subtitle">
        ${user.organization ? e(user.organization) + ' &middot; ' : ''}${e(user.country)} &middot; Thank you for your generosity
      </p>
    </div>
  `;

  document.getElementById('dashboard-stats').innerHTML = [
    statCard('&#9679;', 'gold', myDonations.length, 'My Donations'),
    statCard(
      '&#10003;',
      'success',
      myDonations.filter((d) => ['matched', 'delivered'].includes(d.status)).length,
      'Matched'
    ),
    statCard('&#9776;', 'violet', openNeeds.length, 'Open Requests'),
    statCard('&#9673;', 'orange', stats.countries, 'Countries Active'),
  ].join('');

  document.getElementById('dashboard-actions').innerHTML = `
    <div class="flex gap-4" style="flex-wrap: wrap;">
      <a href="donate.html" class="btn btn--primary">Create New Donation</a>
      <a href="browse.html?view=needs" class="btn btn--outline">View Lalíder Requests</a>
    </div>
  `;

  let html = renderOffersSections(user);

  html += section(
    'My Donations',
    myDonations.length
      ? grid(myDonations.map((d) => App.renderDonationCard(d)))
      : emptyState(
          'No Donations Yet',
          "List equipment you'd like to donate. Lalíderes are waiting for your help.",
          '<a href="donate.html" class="btn btn--primary">Create Your First Donation</a>'
        )
  );

  let needsHTML = openNeeds.length
    ? grid(openNeeds.slice(0, 4).map((n) => App.renderNeedCard(n)))
    : emptyState('No Open Requests', 'New requests from Lalíderes will show up here.');
  if (openNeeds.length > 4) {
    needsHTML +=
      '<div style="margin-top: var(--s-5);"><a href="browse.html?view=needs" class="link-underline">View all requests</a></div>';
  }
  html += section('Lalíderes Need Your Help', needsHTML);

  document.getElementById('dashboard-content').innerHTML = html;
}

App.registerActions({
  'new-request': () => showRequestForm(),
});

function showRequestForm() {
  if (!Auth.isLalider()) {
    App.showToast('Only verified Lalíderes can submit requests.', 'error');
    return;
  }
  const categoriesHTML = MockDB.equipmentCategories
    .map((c) => `<option value="${App.escapeHTML(c.id)}">${App.escapeHTML(c.name)}</option>`)
    .join('');

  App.showModal(
    'Submit Equipment Request',
    `<form id="request-form" style="text-align: left;">
    <div class="form-group">
      <label class="form-label form-label--required">Category</label>
      <select class="form-select" id="request-category" required><option value="">Select category</option>${categoriesHTML}</select>
    </div>
    <div class="form-group">
      <label class="form-label form-label--required">Title</label>
      <input type="text" class="form-input" id="request-title" placeholder="e.g. Need a laptop for university" required>
    </div>
    <div class="form-group">
      <label class="form-label form-label--required">Description</label>
      <textarea class="form-textarea" id="request-desc" placeholder="Describe what you need and why..." required></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Priority Level</label>
      <select class="form-select" id="request-urgency">
        <option value="medium">Medium</option>
        <option value="high">High — Urgently needed</option>
        <option value="low">Low — No rush</option>
      </select>
    </div>
  </form>`,
    [{ label: 'Submit Request', class: 'btn--primary', onClick: submitRequest }]
  );
}

function submitRequest() {
  const user = Auth.getCurrentUser();
  if (!Auth.isLalider()) {
    App.showToast('Only verified Lalíderes can submit requests.', 'error');
    return;
  }
  const category = document.getElementById('request-category').value;
  const title = document.getElementById('request-title').value;
  const desc = document.getElementById('request-desc').value;
  const urgency = document.getElementById('request-urgency').value;
  if (!category || !title || !desc) {
    App.showToast('Please fill in all required fields.', 'error');
    return;
  }

  Donations.createNeed({
    laliderId: user.id,
    laliderName: App.displayName(user),
    camp: user.camp,
    country: user.country,
    category,
    title,
    description: desc,
    urgency,
  });

  App.closeModal();
  App.showToast('Request submitted successfully! Donors can now see your request.', 'success');
  App.refresh();
}
