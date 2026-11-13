/**
 * LALA Bridge — script da página browse.html
 */

let currentCategoryFilter = 'all';
let currentUrgencyFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  const cf = document.getElementById('category-filters');
  cf.innerHTML =
    '<button class="tag active" data-action="filter-category" data-category="all">All</button>' +
    MockDB.equipmentCategories
      .map(
        (cat) =>
          `<button class="tag" data-action="filter-category" data-category="${App.escapeHTML(cat.id)}">${App.escapeHTML(cat.name)}</button>`
      )
      .join('');

  document.getElementById('search-donations').addEventListener('input', renderDonations);
  document.getElementById('search-needs').addEventListener('input', renderNeeds);

  renderDonations();
  renderNeeds();
  if (!Auth.isLoggedIn()) document.getElementById('browse-cta').style.display = 'block';

  const params = new URLSearchParams(window.location.search);
  if (params.get('view') === 'needs') switchView('needs');
});

function switchView(view) {
  document.getElementById('view-donations').style.display = view === 'donations' ? 'block' : 'none';
  document.getElementById('view-needs').style.display = view === 'needs' ? 'block' : 'none';
  document.getElementById('tab-donations').classList.toggle('active', view === 'donations');
  document.getElementById('tab-needs').classList.toggle('active', view === 'needs');
}

function setCategoryFilter(category) {
  currentCategoryFilter = category;
  document
    .querySelectorAll('#category-filters .tag')
    .forEach((t) => t.classList.toggle('active', t.dataset.category === category));
  renderDonations();
}

function setUrgencyFilter(urgency) {
  currentUrgencyFilter = urgency;
  document
    .querySelectorAll('#urgency-filters .tag')
    .forEach((t) => t.classList.toggle('active', t.dataset.urgency === urgency));
  renderNeeds();
}

App.registerActions({
  'switch-view': (el) => switchView(el.dataset.view),
  'filter-category': (el) => setCategoryFilter(el.dataset.category),
  'filter-urgency': (el) => setUrgencyFilter(el.dataset.urgency),
});

function renderDonations() {
  const search = document.getElementById('search-donations').value;
  let donations = Donations.filter(Donations.getAvailable(), {
    category: currentCategoryFilter,
    search,
  });
  const grid = document.getElementById('donations-grid');
  const empty = document.getElementById('donations-empty');
  document.getElementById('donations-count').textContent =
    donations.length + ' donation' + (donations.length !== 1 ? 's' : '') + ' available';
  if (donations.length > 0) {
    grid.innerHTML = donations.map((d) => App.renderDonationCard(d)).join('');
    grid.style.display = 'grid';
    empty.style.display = 'none';
  } else {
    grid.style.display = 'none';
    empty.style.display = 'block';
  }
}

function renderNeeds() {
  const search = document.getElementById('search-needs').value;
  let needs = Donations.getOpenNeeds();
  if (currentUrgencyFilter !== 'all')
    needs = needs.filter((n) => n.urgency === currentUrgencyFilter);
  if (search) {
    const q = search.toLowerCase();
    needs = needs.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q) ||
        n.laliderName.toLowerCase().includes(q)
    );
  }
  const grid = document.getElementById('needs-grid');
  const empty = document.getElementById('needs-empty');
  document.getElementById('needs-count').textContent =
    needs.length + ' request' + (needs.length !== 1 ? 's' : '') + ' open';
  if (needs.length > 0) {
    grid.innerHTML = needs.map((n) => App.renderNeedCard(n)).join('');
    grid.style.display = 'grid';
    empty.style.display = 'none';
  } else {
    grid.style.display = 'none';
    empty.style.display = 'block';
  }
}
