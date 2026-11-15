/**
 * Checagem de justiça do matching por região (Fase 4.3).
 *
 * Cenário sintético: pedidos de notebook distribuídos igualmente pelas 27 UFs
 * e doações concentradas no Sudeste (como costuma ser a oferta de doadores
 * empresariais). Simula alocações semanais: a cada semana chegam doações e
 * cada uma vai para o pedido aberto de maior score (o que o painel mostra
 * primeiro). Compara a parcela atendida por região com e sem o fator
 * "tempo de espera".
 *
 * Uso: node scripts/fairness.js            (imprime a tabela em Markdown)
 */
import { readFileSync } from 'node:fs';

function loadMatching() {
  const store = new Map();
  const sandbox = {
    Store: { get: (k, f) => (store.has(k) ? store.get(k) : f), set: (k, v) => store.set(k, v) },
    I18n: { t: (k) => k },
    LocalAI: { parseSpecs: () => ({}) },
    window: {},
  };
  const code = readFileSync('js/matching.js', 'utf8');
  return new Function(...Object.keys(sandbox), `${code}; return Matching;`)(
    ...Object.values(sandbox)
  );
}

const UFS = [
  'AC',
  'AP',
  'AM',
  'PA',
  'RO',
  'RR',
  'TO',
  'AL',
  'BA',
  'CE',
  'MA',
  'PB',
  'PE',
  'PI',
  'RN',
  'SE',
  'DF',
  'GO',
  'MT',
  'MS',
  'ES',
  'MG',
  'RJ',
  'SP',
  'PR',
  'RS',
  'SC',
];
// Origem das doações: 70% Sudeste, o resto espalhado.
const DONOR_UFS = [
  ...Array(9).fill('SP'),
  'SP',
  'RJ',
  'RJ',
  'MG',
  'MG',
  'PE',
  'BA',
  'CE',
  'RS',
  'PR',
  'AM',
];

// Gerador pseudoaleatório com semente, para o resultado ser reproduzível.
function rng(seed) {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
}

function simulate({
  waiting = true,
  equity = true,
  weeks = 12,
  needsPerUf = 4,
  donationsPerWeek = 4,
  seed = 42,
}) {
  const Matching = loadMatching();
  if (!waiting) Matching.WEIGHTS = { ...Matching.WEIGHTS, waiting: 0 };
  if (!equity) {
    // Versão anterior (sem equidade): localização 20 e semântica 15.
    Matching.WEIGHTS = { ...Matching.WEIGHTS, location: 20, semantic: 15, equity: 0 };
  }
  const rand = rng(seed);
  const start = new Date('2026-09-01T00:00:00Z');
  const needs = [];
  UFS.forEach((uf) => {
    for (let i = 0; i < needsPerUf; i++) {
      needs.push({
        id: `${uf}-${i}`,
        category: 'laptop',
        country: 'BR',
        state: uf,
        urgency: ['high', 'medium', 'low'][Math.floor(rand() * 3)],
        requirements: { ramGb: rand() < 0.5 ? 8 : 4 },
        status: 'open',
        createdAt: new Date(start.getTime() - Math.floor(rand() * 10) * 86400000).toISOString(),
        title: 'Notebook para estudar',
      });
    }
  });
  for (let w = 0; w < weeks; w++) {
    const now = new Date(start.getTime() + w * 7 * 86400000);
    for (let d = 0; d < donationsPerWeek; d++) {
      const donation = {
        id: `w${w}d${d}`,
        category: 'laptop',
        country: 'BR',
        state: DONOR_UFS[Math.floor(rand() * DONOR_UFS.length)],
        specs: { ramGb: rand() < 0.6 ? 8 : 4 },
        title: 'Notebook',
        status: 'available',
      };
      const stats = Matching.regionStats(
        needs.map((n) => ({ ...n, status: n.status === 'served' ? 'matched' : n.status }))
      );
      const best = needs
        .filter((n) => n.status === 'open')
        .map((need) => ({ need, m: Matching.score(need, donation, { now, regionStats: stats }) }))
        .filter((r) => r.m)
        .sort((a, b) => b.m.score - a.m.score)[0];
      if (best) best.need.status = 'served';
    }
  }
  const byRegion = {};
  needs.forEach((n) => {
    const r = Matching.regionOf(n.state);
    byRegion[r] ??= { total: 0, served: 0 };
    byRegion[r].total++;
    if (n.status === 'served') byRegion[r].served++;
  });
  return byRegion;
}

const before = simulate({ equity: false });
const after = simulate({ equity: true });
const names = { N: 'Norte', NE: 'Nordeste', CO: 'Centro-Oeste', SE: 'Sudeste', S: 'Sul' };
const pct = (r) => `${Math.round((r.served / r.total) * 100)}%`;
const total = (res) => Object.values(res).reduce((s, r) => s + r.served, 0);
const spread = (res) => {
  const shares = Object.values(res).map((r) => r.served / r.total);
  return Math.round((Math.max(...shares) - Math.min(...shares)) * 100);
};
console.log('| Região | Pedidos | Atendidos (sem equidade) | Atendidos (com equidade) |');
console.log('| --- | --- | --- | --- |');
Object.keys(names).forEach((k) => {
  console.log(`| ${names[k]} | ${after[k].total} | ${pct(before[k])} | ${pct(after[k])} |`);
});
console.log(
  `\nTotal atendido: ${total(before)} e ${total(after)} de ${Object.values(after).reduce((s, r) => s + r.total, 0)} pedidos.` +
    ` Diferença entre a região mais e a menos atendida: ${spread(before)} pontos (sem) e ${spread(after)} pontos (com equidade).`
);
