/**
 * LALA Bridge — script da página index.html
 */

function renderNeedsPreview() {
  const container = document.getElementById('needs-preview');
  const needs = Donations.getOpenNeeds().slice(0, 3);
  container.innerHTML = needs.length
    ? needs.map((n) => App.renderNeedCard(n)).join('')
    : `<p class="text-center" style="color: var(--text-inverse-muted); grid-column: 1 / -1;">${App.escapeHTML(I18n.t('open.empty'))}</p>`;

  // Dark card override for this section
  container.querySelectorAll('.card').forEach((card) => {
    card.classList.add('card--dark');
  });
}

/** Métricas reais, calculadas a partir dos dados (não números inventados). */
function renderMetrics() {
  const stats = Donations.getStats();
  const values = {
    'metric-available': stats.availableDonations,
    'metric-open': stats.openNeeds,
    'metric-delivered': stats.deliveredDonations,
  };
  Object.entries(values).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.setAttribute('data-count', String(value));
  });
  App.animateCounters();
}

App.ready(() => {
  App.onDataChange = renderNeedsPreview;
  renderNeedsPreview();
  renderMetrics();
});
