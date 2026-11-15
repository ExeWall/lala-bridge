/**
 * LALA Bridge — matching explicável entre pedidos e doações
 *
 * Score de 0 a 100, somando fatores simples que dá para explicar em uma frase:
 *
 *   requisitos  35  specs da doação ≥ requisitos mínimos do pedido
 *   localização 10  mesma UF (10), mesma região (6), mesmo país (3)
 *   urgência    15  alta (15), média (9), baixa (4)
 *   espera      15  dias com o pedido aberto (até 30), para ninguém ficar esquecido
 *   semântica   10  similaridade entre o uso pretendido e a descrição da doação
 *                   (embeddings do servidor quando há; senão, similaridade local)
 *   equidade    15  regiões que receberam menos doações sobem na lista
 *
 * Por que equidade: a checagem de justiça (scripts/fairness.js,
 * docs/matching-justica.md) mostrou que, com doações concentradas no Sudeste,
 * só a proximidade deixava o Centro-Oeste sem nenhum atendimento.
 *
 * Categoria diferente não gera match. O score só ordena sugestões: quem
 * decide oferecer, pedir e aceitar são as pessoas.
 */

const Matching = {
  WEIGHTS: { requirements: 35, location: 10, urgency: 15, waiting: 15, semantic: 10, equity: 15 },
  SIMILARITY_KEY: 'lala_bridge_similarity',

  REGIONS: {
    N: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
    NE: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
    CO: ['DF', 'GO', 'MT', 'MS'],
    SE: ['ES', 'MG', 'RJ', 'SP'],
    S: ['PR', 'RS', 'SC'],
  },

  regionOf(uf) {
    return Object.keys(this.REGIONS).find((r) => this.REGIONS[r].includes(uf)) || null;
  },

  // ------------------------------------------------ similaridade de texto
  STOPWORDS: new Set(
    'a o e de da do das dos em no na nos nas um uma para pra por com sem que se eu me meu minha muito mais mas como ja ou ao aos as os ter tem tenho esta este isso essa esse ele ela voce the and for with of to in'.split(
      ' '
    )
  ),

  tokens(text) {
    return String(text || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !this.STOPWORDS.has(w))
      .map((w) => (w.length > 4 ? w.replace(/(oes|aes|es|s)$/, '') : w));
  },

  /** Cosseno entre os vetores de frequência de termos de dois textos (0 a 1). */
  textSimilarity(a, b) {
    const count = (list) => list.reduce((m, w) => m.set(w, (m.get(w) || 0) + 1), new Map());
    const va = count(this.tokens(a));
    const vb = count(this.tokens(b));
    if (!va.size || !vb.size) return 0;
    let dot = 0;
    va.forEach((n, w) => {
      dot += n * (vb.get(w) || 0);
    });
    const norm = (v) => Math.sqrt([...v.values()].reduce((s, n) => s + n * n, 0));
    return dot / (norm(va) * norm(vb));
  },

  needText(need) {
    return [need.title, need.intendedUse, need.description].filter(Boolean).join('. ');
  },

  donationText(donation) {
    return [donation.title, donation.description, ...(donation.aiSuggestion?.recommendedUses || [])]
      .filter(Boolean)
      .join('. ');
  },

  /** Similaridade do servidor (embeddings) se houver; senão, a local. */
  similarity(need, donation) {
    const server = Store.get(this.SIMILARITY_KEY, {})[`${need.id}|${donation.id}`];
    if (typeof server === 'number') return { value: Math.max(0, server), source: 'embedding' };
    return {
      value: this.textSimilarity(this.needText(need), this.donationText(donation)),
      source: 'local',
    };
  },

  // ------------------------------------------------------------- fatores
  /** Specs da doação: as confirmadas pelo doador e, na falta, as do título. */
  donationSpecs(donation) {
    const parsed =
      typeof LocalAI !== 'undefined'
        ? LocalAI.parseSpecs(`${donation.title} ${donation.description || ''}`)
        : {};
    return { ...parsed, ...(donation.specs || {}) };
  },

  requirementsFactor(need, donation) {
    const max = this.WEIGHTS.requirements;
    const req = need.requirements || {};
    const specs = this.donationSpecs(donation);
    const keys = ['ramGb', 'storageGb', 'camera', 'os'].filter(
      (k) => req[k] !== undefined && req[k] !== ''
    );
    if (!keys.length)
      return { key: 'requirements', points: max * 0.8, max, label: 'match.noReq', params: {} };

    const met = [];
    const failed = [];
    let unknown = 0;
    keys.forEach((k) => {
      const want = req[k];
      const have = specs[k];
      if (have === undefined || have === '') {
        unknown++;
        return;
      }
      const ok =
        k === 'camera'
          ? !want || have === true
          : k === 'os'
            ? String(have).toLowerCase().includes(String(want).toLowerCase())
            : Number(have) >= Number(want);
      (ok ? met : failed).push(this.describeRequirement(k, want));
    });
    if (failed.length) {
      return {
        key: 'requirements',
        points: 0,
        max,
        label: 'match.reqFail',
        params: { list: failed.join(', ') },
        negative: true,
      };
    }
    const share = (met.length + unknown * 0.5) / keys.length;
    if (!met.length)
      return {
        key: 'requirements',
        points: max * share,
        max,
        label: 'match.reqUnknown',
        params: {},
      };
    return {
      key: 'requirements',
      points: max * share,
      max,
      label: 'match.reqMet',
      params: { list: met.join(', ') },
    };
  },

  describeRequirement(key, value) {
    if (key === 'ramGb') return I18n.t('match.ram', { gb: value });
    if (key === 'storageGb') return I18n.t('match.storage', { gb: value });
    if (key === 'camera') return I18n.t('match.camera');
    return String(value);
  },

  locationFactor(need, donation) {
    const max = this.WEIGHTS.location;
    if (need.country === 'BR' && donation.country === 'BR' && need.state && donation.state) {
      if (need.state === donation.state) {
        return {
          key: 'location',
          points: max,
          max,
          label: 'match.sameState',
          params: { uf: need.state },
        };
      }
      const region = this.regionOf(need.state);
      if (region && region === this.regionOf(donation.state)) {
        return {
          key: 'location',
          points: max * 0.6,
          max,
          label: 'match.sameRegion',
          params: { region: I18n.t(`match.region.${region}`) },
        };
      }
    }
    if (need.country && need.country === donation.country) {
      return { key: 'location', points: max * 0.3, max, label: 'match.sameCountry', params: {} };
    }
    return { key: 'location', points: 0, max, label: 'match.farAway', params: {} };
  },

  urgencyFactor(need) {
    const max = this.WEIGHTS.urgency;
    const points = { high: max, medium: max * 0.6, low: max * 0.27 }[need.urgency] ?? max * 0.6;
    return {
      key: 'urgency',
      points,
      max,
      label: need.urgency === 'high' ? 'match.urgent' : 'match.notUrgent',
      params: {},
    };
  },

  waitingFactor(need, now = new Date()) {
    const max = this.WEIGHTS.waiting;
    const days = Math.max(0, Math.floor((now - new Date(need.createdAt)) / 86400000));
    return {
      key: 'waiting',
      points: (Math.min(days, 30) / 30) * max,
      max,
      label: 'match.waiting',
      params: { days },
    };
  },

  semanticFactor(need, donation) {
    const max = this.WEIGHTS.semantic;
    const sim = this.similarity(need, donation);
    // Cossenos de texto curto raramente passam de 0,6; reescala para 0-1.
    const scaled = Math.min(1, sim.value / 0.6);
    return {
      key: 'semantic',
      points: scaled * max,
      max,
      label: 'match.similar',
      params: {},
      source: sim.source,
    };
  },

  /**
   * Parcela já atendida dos pedidos de cada região (matched + entregues sobre
   * o total), a partir de uma lista de pedidos. Usada pelo fator de equidade.
   */
  regionStats(needs = Donations.getAllNeeds()) {
    const stats = {};
    needs.forEach((n) => {
      const key = n.country === 'BR' ? this.regionOf(n.state) : n.country;
      if (!key) return;
      stats[key] ??= { total: 0, served: 0 };
      stats[key].total++;
      if (n.status !== 'open') stats[key].served++;
    });
    return stats;
  },

  equityFactor(need, regionStats) {
    const max = this.WEIGHTS.equity;
    const key = need.country === 'BR' ? this.regionOf(need.state) : need.country;
    const st = regionStats?.[key];
    const servedShare = st && st.total ? st.served / st.total : 0;
    const all = Object.values(regionStats || {}).reduce(
      (acc, r) => ({ total: acc.total + r.total, served: acc.served + r.served }),
      { total: 0, served: 0 }
    );
    const overall = all.total ? all.served / all.total : 0;
    // Só vira razão explícita quando a região está bem atrás da média.
    const behind = overall > 0 && servedShare < overall - 0.15;
    const label = need.country === 'BR' ? 'match.equity' : 'match.equityCountry';
    const region =
      need.country === 'BR' && key ? I18n.t(`match.region.${key}`) : I18n.countryName(need.country);
    return {
      key: 'equity',
      points: max * (1 - servedShare),
      max,
      label,
      params: { region },
      behind,
    };
  },

  /**
   * @returns {null | { score: number, factors: object[], reasons: string[] }}
   */
  score(need, donation, { now = new Date(), regionStats = null } = {}) {
    if (!need || !donation || need.category !== donation.category) return null;
    const factors = [
      this.requirementsFactor(need, donation),
      this.locationFactor(need, donation),
      this.urgencyFactor(need),
      this.waitingFactor(need, now),
      this.semanticFactor(need, donation),
      this.equityFactor(need, regionStats || this.regionStats()),
    ];
    const score = Math.round(factors.reduce((s, f) => s + f.points, 0));
    return { score, factors, reasons: this.explain(factors) };
  },

  /** As 2 ou 3 razões principais, em linguagem simples (inclui o alerta de requisito não atendido). */
  explain(factors) {
    const negative = factors.filter((f) => f.negative);
    const strong = factors
      .filter((f) => !f.negative && f.max > 0 && f.points / f.max >= 0.5)
      .filter((f) => f.key !== 'equity' || f.behind)
      .filter((f) => f.label !== 'match.noReq')
      // Ordena pelo quanto cada fator foi atendido (e, no empate, pelo peso),
      // para a localização aparecer mesmo valendo menos pontos.
      .sort((a, b) => b.points / b.max - a.points / a.max || b.max - a.max)
      .slice(0, 3 - Math.min(negative.length, 1));
    return [...negative.slice(0, 1), ...strong].map((f) => I18n.t(f.label, f.params));
  },

  /** Doações disponíveis que mais combinam com um pedido. */
  forNeed(need, donations, limit = 3) {
    const regionStats = this.regionStats();
    return donations
      .filter((d) => d.status === 'available' && d.donorId !== need.laliderId)
      .map((donation) => ({ donation, match: this.score(need, donation, { regionStats }) }))
      .filter((r) => r.match && r.match.score > 0)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, limit);
  },

  /** Pedidos abertos que uma doação pode atender. */
  forDonation(donation, needs, limit = 3) {
    const regionStats = this.regionStats();
    return needs
      .filter((n) => n.status === 'open')
      .map((need) => ({ need, match: this.score(need, donation, { regionStats }) }))
      .filter((r) => r.match && r.match.score > 0)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, limit);
  },
};

window.Matching = Matching;
