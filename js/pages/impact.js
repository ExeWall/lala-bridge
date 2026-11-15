/**
 * LALA Bridge — script da página impacto.html (números agregados, públicos)
 */

App.ready(async () => {
  const stats = await Api.impactStats();
  const e = (v) => App.escapeHTML(v);
  const states = stats.statesReached || [];

  const values = {
    delivered: I18n.formatNumber(stats.delivered),
    states: I18n.formatNumber(states.length),
    ewaste: I18n.formatNumber(Number(stats.ewasteKg) || 0, { maximumFractionDigits: 1 }),
    inProgress: I18n.formatNumber(stats.matched || 0),
    available: I18n.formatNumber(stats.available),
    openNeeds: I18n.formatNumber(stats.openNeeds),
  };
  Object.entries(values).forEach(([key, value]) => {
    document.getElementById(`impact-${key}`).textContent = value;
  });

  document.getElementById('impact-states').textContent = states.length
    ? states.join(' · ')
    : I18n.t('impactPage.none');

  const entries = Object.entries(stats.byCategory || {}).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, n]) => n));
  document.getElementById('impact-categories').innerHTML = entries.length
    ? entries
        .map(
          ([cat, n]) => `<li>
            <span>${e(App.getCategory(cat).name)}</span>
            <span class="impact-bars__bar" style="width: ${Math.round((n / max) * 100)}%" aria-hidden="true"></span>
            <strong>${e(I18n.formatNumber(n))}</strong>
          </li>`
        )
        .join('')
    : `<li>${e(I18n.t('impactPage.none'))}</li>`;
});
