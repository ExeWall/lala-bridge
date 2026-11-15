/**
 * LALA Bridge — script da página impacto.html (números agregados, públicos)
 */

App.ready(async () => {
  const stats = await Api.impactStats();
  const e = (v) => App.escapeHTML(v);
  const card = (value, label) =>
    `<div class="card stat-card"><div><div class="stat-card__value">${e(value)}</div><div class="stat-card__label">${e(label)}</div></div></div>`;
  const states = stats.statesReached || [];

  document.getElementById('impact-metrics').innerHTML = [
    card(I18n.formatNumber(stats.delivered), I18n.t('impactPage.delivered')),
    card(I18n.formatNumber(states.length), I18n.t('impactPage.states')),
    card(
      I18n.formatNumber(Number(stats.ewasteKg) || 0, { maximumFractionDigits: 1 }),
      I18n.t('impactPage.ewaste')
    ),
    card(I18n.formatNumber(stats.matched || 0), I18n.t('impactPage.inProgress')),
    card(I18n.formatNumber(stats.available), I18n.t('impactPage.available')),
    card(I18n.formatNumber(stats.openNeeds), I18n.t('impactPage.openNeeds')),
  ].join('');

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
