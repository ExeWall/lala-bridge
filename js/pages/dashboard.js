/**
 * LALA Bridge — script da página dashboard.html
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth()) return;
  const user = Auth.getCurrentUser();
  if (!user) {
    Auth.logout();
    window.location.href = 'login.html';
    return;
  }
  if (user.type === 'lalider') renderLaliderDashboard(user);
  else renderDonorDashboard(user);
});

function renderLaliderDashboard(user) {
  const stats = Donations.getStats();
  const myNeeds = Donations.getNeedsByLalider(user.id);
  const myDonations = Donations.getMatchedToLalider(user.id);
  const available = Donations.getAvailable();

  document.getElementById('dashboard-header').innerHTML = `
  <div>
    <div class="dashboard__welcome">
      Welcome, ${App.escapeHTML(user.name.split(' ')[0])}
      <span class="badge badge--lalider" style="margin-left: 8px; vertical-align: middle;">Verified Lalíder</span>
    </div>
    <p class="dashboard__subtitle">
      ${App.escapeHTML(user.camp)} &middot; ${App.escapeHTML(user.country)}${user.state ? ', ' + App.escapeHTML(user.state) : ''} &middot; ${App.escapeHTML(user.areaOfInterest || 'LALA Community')}
    </p>
    ${user.showerSong ? `<p class="text-sm text-muted" style="margin-top: 4px;">Shower song: "${App.escapeHTML(user.showerSong)}"</p>` : ''}
  </div>
`;

  document.getElementById('dashboard-stats').innerHTML = `
  <div class="card stat-card">
    <div class="stat-card__icon stat-card__icon--gold">&#9776;</div>
    <div><div class="stat-card__value">${myNeeds.length}</div><div class="stat-card__label">My Requests</div></div>
  </div>
  <div class="card stat-card">
    <div class="stat-card__icon stat-card__icon--success">&#10003;</div>
    <div><div class="stat-card__value">${myDonations.length}</div><div class="stat-card__label">Donations Received</div></div>
  </div>
  <div class="card stat-card">
    <div class="stat-card__icon stat-card__icon--violet">&#9679;</div>
    <div><div class="stat-card__value">${available.length}</div><div class="stat-card__label">Available Donations</div></div>
  </div>
  <div class="card stat-card">
    <div class="stat-card__icon stat-card__icon--orange">&#9673;</div>
    <div><div class="stat-card__value">${stats.countries}</div><div class="stat-card__label">Countries Active</div></div>
  </div>
`;

  document.getElementById('dashboard-actions').innerHTML = `
  <div class="flex gap-4" style="flex-wrap: wrap;">
    <a href="browse.html" class="btn btn--primary">Browse Available Donations</a>
    <button class="btn btn--outline" data-action="new-request">Submit a New Request</button>
  </div>
`;

  let html =
    '<div style="margin-bottom: var(--s-7);"><h2 class="h-3" style="margin-bottom: var(--s-5);">My Requests</h2>';
  if (myNeeds.length > 0) {
    html +=
      '<div class="grid-auto">' + myNeeds.map((n) => App.renderNeedCard(n)).join('') + '</div>';
  } else {
    html += `<div class="empty-state card card--flat">
    <div class="empty-state__icon">—</div>
    <h3 class="empty-state__title">No Requests Yet</h3>
    <p class="empty-state__desc">Submit a request describing the equipment you need. Donors will see it and can offer to help.</p>
    <button class="btn btn--primary" data-action="new-request">Submit a Request</button>
  </div>`;
  }
  html += '</div>';

  html += '<div><h2 class="h-3" style="margin-bottom: var(--s-5);">Available Donations</h2>';
  html +=
    '<div class="grid-auto">' +
    available
      .slice(0, 4)
      .map((d) => App.renderDonationCard(d))
      .join('') +
    '</div>';
  if (available.length > 4)
    html +=
      '<div style="margin-top: var(--s-5);"><a href="browse.html" class="link-underline">View all</a></div>';
  html += '</div>';

  document.getElementById('dashboard-content').innerHTML = html;
}

function renderDonorDashboard(user) {
  const stats = Donations.getStats();
  const myDonations = Donations.getByDonor(user.id);
  const openNeeds = Donations.getOpenNeeds();

  document.getElementById('dashboard-header').innerHTML = `
  <div>
    <div class="dashboard__welcome">
      Welcome, ${App.escapeHTML(user.name.split(' ')[0])}
      <span class="badge badge--donor" style="margin-left: 8px; vertical-align: middle;">Donor</span>
    </div>
    <p class="dashboard__subtitle">
      ${user.organization ? App.escapeHTML(user.organization) + ' &middot; ' : ''}${App.escapeHTML(user.country)} &middot; Thank you for your generosity
    </p>
  </div>
`;

  document.getElementById('dashboard-stats').innerHTML = `
  <div class="card stat-card">
    <div class="stat-card__icon stat-card__icon--gold">&#9679;</div>
    <div><div class="stat-card__value">${myDonations.length}</div><div class="stat-card__label">My Donations</div></div>
  </div>
  <div class="card stat-card">
    <div class="stat-card__icon stat-card__icon--success">&#10003;</div>
    <div><div class="stat-card__value">${myDonations.filter((d) => d.status === 'matched').length}</div><div class="stat-card__label">Matched</div></div>
  </div>
  <div class="card stat-card">
    <div class="stat-card__icon stat-card__icon--violet">&#9776;</div>
    <div><div class="stat-card__value">${openNeeds.length}</div><div class="stat-card__label">Open Requests</div></div>
  </div>
  <div class="card stat-card">
    <div class="stat-card__icon stat-card__icon--orange">&#9673;</div>
    <div><div class="stat-card__value">${stats.countries}</div><div class="stat-card__label">Countries Active</div></div>
  </div>
`;

  document.getElementById('dashboard-actions').innerHTML = `
  <div class="flex gap-4" style="flex-wrap: wrap;">
    <a href="donate.html" class="btn btn--primary">Create New Donation</a>
    <a href="browse.html?view=needs" class="btn btn--outline">View Lalíder Requests</a>
  </div>
`;

  let html =
    '<div style="margin-bottom: var(--s-7);"><h2 class="h-3" style="margin-bottom: var(--s-5);">My Donations</h2>';
  if (myDonations.length > 0) {
    html +=
      '<div class="grid-auto">' +
      myDonations.map((d) => App.renderDonationCard(d)).join('') +
      '</div>';
  } else {
    html += `<div class="empty-state card card--flat">
    <div class="empty-state__icon">—</div>
    <h3 class="empty-state__title">No Donations Yet</h3>
    <p class="empty-state__desc">List equipment you'd like to donate. Lalíderes across Latin America are waiting for your help.</p>
    <a href="donate.html" class="btn btn--primary">Create Your First Donation</a>
  </div>`;
  }
  html += '</div>';

  html += '<div><h2 class="h-3" style="margin-bottom: var(--s-5);">Lalíderes Need Your Help</h2>';
  html +=
    '<div class="grid-auto">' +
    openNeeds
      .slice(0, 4)
      .map((n) => App.renderNeedCard(n))
      .join('') +
    '</div>';
  if (openNeeds.length > 4)
    html +=
      '<div style="margin-top: var(--s-5);"><a href="browse.html?view=needs" class="link-underline">View all requests</a></div>';
  html += '</div>';

  document.getElementById('dashboard-content').innerHTML = html;
}

App.registerActions({
  'new-request': () => showRequestForm(),
});

function showRequestForm() {
  const categoriesHTML = MockDB.equipmentCategories
    .map((c) => `<option value="${c.id}">${c.name}</option>`)
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
    laliderName: user.name.split(' ')[0] + ' ' + user.name.split(' ').pop()[0] + '.',
    camp: user.camp,
    country: user.country,
    category,
    title,
    description: desc,
    urgency,
  });

  App.closeModal();
  App.showToast('Request submitted successfully! Donors can now see your request.', 'success');
  setTimeout(() => location.reload(), 1500);
}
