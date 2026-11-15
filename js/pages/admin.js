/**
 * LALA Bridge — script da página admin.html (só para a equipe)
 */

const ta = (key, params) => I18n.t(key, params);
const ea = (value) => App.escapeHTML(value);

App.ready(async () => {
  if (!Auth.isAdmin()) {
    document.getElementById('admin-denied').hidden = false;
    return;
  }
  document.getElementById('admin-content').hidden = false;
  document.getElementById('flags-show-all').addEventListener('change', renderAdmin);
  document.getElementById('codes-form').addEventListener('submit', submitCodes);
  App.onDataChange = renderAdmin;
  await renderAdmin();
});

async function renderAdmin() {
  const result = await Api.adminData();
  if (!result.success) {
    App.showToast(result.message, 'error');
    return;
  }
  renderMetrics(result);
  renderFlags(result.flags);
  renderCodes(result.codes);
}

function metric(value, label) {
  return `<div class="card stat-card"><div><div class="stat-card__value">${ea(value)}</div><div class="stat-card__label">${ea(label)}</div></div></div>`;
}

function renderMetrics({ aiUsage }) {
  const users = Auth.getUsers();
  const offers = Offers.getAll();
  const stats = Impact.stats();
  const cost = aiUsage.reduce((sum, u) => sum + (u.costUsd || 0), 0);
  document.getElementById('admin-metrics').innerHTML = [
    metric(
      I18n.formatNumber(users.filter((u) => u.type === 'donor').length),
      ta('admin.metricDonors')
    ),
    metric(
      I18n.formatNumber(users.filter((u) => u.type === 'lalider').length),
      ta('admin.metricLalideres')
    ),
    metric(I18n.formatNumber(Donations.getAll().length), ta('admin.metricDonations')),
    metric(I18n.formatNumber(Donations.getAllNeeds().length), ta('admin.metricNeeds')),
    metric(
      I18n.formatNumber(offers.filter((o) => o.status === 'pending').length),
      ta('admin.metricPending')
    ),
    metric(I18n.formatNumber(stats.delivered), ta('admin.metricDelivered')),
    metric(stats.statesReached.join(', ') || '—', ta('admin.metricStates')),
    metric(
      `${I18n.formatNumber(stats.ewasteKg, { maximumFractionDigits: 1 })} kg`,
      ta('admin.metricEwaste')
    ),
    metric(I18n.formatNumber(aiUsage.length), ta('admin.metricAiCalls')),
    metric(
      I18n.formatNumber(cost, { style: 'currency', currency: 'USD' }),
      ta('admin.metricAiCost')
    ),
  ].join('');
}

/** Texto curto que ajuda a revisar a entidade sinalizada. */
function describeEntity(flag) {
  if (flag.entityType === 'need') {
    const n = Donations.getNeedById(flag.entityId);
    return n ? `${n.title} — ${n.laliderName}` : flag.entityId;
  }
  if (flag.entityType === 'donation') {
    const d = Donations.getById(flag.entityId);
    return d ? `${d.title} — ${d.donorName}` : flag.entityId;
  }
  if (flag.entityType === 'profile') {
    const u = Auth.getUsers().find((x) => x.id === flag.entityId);
    return u ? App.displayName(u) : flag.entityId;
  }
  return flag.entityId;
}

function renderFlags(flags) {
  const showAll = document.getElementById('flags-show-all').checked;
  const list = showAll ? flags : flags.filter((f) => f.status === 'open');
  const box = document.getElementById('admin-flags');
  if (!list.length) {
    box.innerHTML = `<p class="text-muted">${ea(ta('admin.noFlags'))}</p>`;
    return;
  }
  box.innerHTML = list
    .map((f) => {
      const reasonKey = `trust.reason.${f.reason}`;
      const reason = I18n.has(reasonKey) ? ta(reasonKey) : f.reason;
      const evidence = f.details?.evidence
        ? `<p class="text-sm text-muted">${ea(f.details.evidence)}</p>`
        : '';
      const actions =
        f.status === 'open'
          ? `<button type="button" class="btn btn--ghost btn--sm" data-action="review-flag" data-flag-id="${ea(f.id)}" data-status="dismissed">${ea(ta('admin.dismiss'))}</button>
             <button type="button" class="btn btn--primary btn--sm" data-action="review-flag" data-flag-id="${ea(f.id)}" data-status="confirmed">${ea(ta('admin.confirm'))}</button>`
          : `<button type="button" class="btn btn--ghost btn--sm" data-action="review-flag" data-flag-id="${ea(f.id)}" data-status="open">${ea(ta('admin.reopen'))}</button>`;
      return `<div class="card">
        <div class="flex items-center gap-2" style="justify-content: space-between; flex-wrap: wrap;">
          <span class="badge badge--violet">${ea(ta(`admin.entity.${f.entityType}`))}</span>
          <span class="badge ${f.status === 'open' ? 'badge--warning' : 'badge--gold'}">${ea(ta(`admin.flagStatus.${f.status}`))}</span>
        </div>
        <h3 class="h-4" style="margin: var(--s-3) 0 var(--s-2);">${ea(reason)}</h3>
        <p class="text-sm"><strong>${ea(describeEntity(f))}</strong></p>
        ${evidence}
        <p class="text-xs text-muted" style="margin-top: var(--s-2);">${ea(ta('admin.flagScore', { score: Math.round(f.score * 100) }))} · ${ea(App.formatDate(f.createdAt))}</p>
        <div class="card__footer"><div class="flex gap-2">${actions}</div></div>
      </div>`;
    })
    .join('');
}

function renderCodes(codes) {
  const used = codes.filter((c) => c.usedBy).length;
  document.getElementById('codes-summary').textContent = ta('admin.codesTotal', {
    used,
    total: codes.length,
  });
  document.getElementById('codes-table').innerHTML = codes
    .map(
      (c) => `<tr>
        <td><code>${ea(c.code)}</code></td>
        <td>${ea(c.name)}</td>
        <td>${ea(c.camp)}</td>
        <td>${ea(c.usedBy ? ta('admin.codeUsed') : ta('admin.codeFree'))}</td>
      </tr>`
    )
    .join('');
}

/** Lê linhas "CÓDIGO;Nome;Turma;País" (aceita também vírgula ou tab). */
function parseCodes(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [code, name, camp = '', country = 'BR'] = line.split(/[;\t,]/).map((p) => p.trim());
      return { code, name, camp, country };
    })
    .filter((r) => r.code && r.name);
}

async function submitCodes(e) {
  e.preventDefault();
  const input = document.getElementById('codes-input');
  const rows = parseCodes(input.value);
  if (!rows.length) return;
  const result = await Api.addVerificationCodes(rows);
  App.showToast(result.message, result.success ? 'success' : 'error');
  if (result.success) {
    input.value = '';
    renderAdmin();
  }
}

App.registerActions({
  'review-flag': async (el) => {
    el.disabled = true;
    const result = await Api.reviewFlag(el.dataset.flagId, el.dataset.status);
    App.showToast(result.message, result.success ? 'success' : 'error');
    renderAdmin();
  },
});
