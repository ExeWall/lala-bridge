/**
 * LALA Bridge — impacto: relatos depois da entrega e números agregados
 *
 * Depois da entrega, o Lalíder pode contar como o equipamento ajudou
 * (texto curto, foto opcional). O doador vê o relato; a página inicial e
 * /impacto mostram só números agregados, sem dados pessoais.
 */

const Impact = {
  STORAGE_KEY: 'lala_bridge_impact',

  getAll() {
    return Store.get(this.STORAGE_KEY, []);
  },

  getForOffer(offerId) {
    return this.getAll().filter((u) => u.offerId === offerId);
  },

  /** Peso médio estimado por categoria, em kg (ver docs/impacto.md). */
  weightKg(category) {
    return MockDB.categoryWeightsKg[category] ?? 0;
  },

  /** Relato do Lalíder (modo local). No Supabase: add_impact_update. */
  add({ offerId, authorId, text, photo = null }) {
    const offer = Offers.getById(offerId);
    if (!offer || offer.laliderId !== authorId) {
      return { success: false, message: I18n.t('impact.onlyLalider') };
    }
    if (offer.status !== 'delivered') {
      return { success: false, message: I18n.t('impact.onlyDelivered') };
    }
    const clean = String(text || '')
      .trim()
      .slice(0, 1000);
    if (!clean) return { success: false, message: I18n.t('impact.textRequired') };
    const update = {
      id: newId('impact'),
      offerId,
      authorId,
      text: clean,
      photo,
      summary: null,
      createdAt: new Date().toISOString(),
    };
    Store.set(this.STORAGE_KEY, [update, ...this.getAll()]);
    return { success: true, message: I18n.t('impact.posted'), update };
  },

  setSummary(updateId, summary) {
    Store.set(
      this.STORAGE_KEY,
      this.getAll().map((u) => (u.id === updateId ? { ...u, summary } : u))
    );
  },

  /** Números agregados (mesma regra da função impact_stats do servidor). */
  stats() {
    const donations = Donations.getAll();
    const delivered = donations.filter((d) => d.status === 'delivered');
    const deliveredOffers = Offers.getAll().filter((o) => o.status === 'delivered');
    const states = new Set();
    deliveredOffers.forEach((o) => {
      const need = o.needId ? Donations.getNeedById(o.needId) : null;
      if (need?.state) states.add(need.state);
    });
    const byCategory = {};
    delivered.forEach((d) => {
      byCategory[d.category] = (byCategory[d.category] || 0) + 1;
    });
    return {
      delivered: delivered.length,
      available: donations.filter((d) => d.status === 'available').length,
      matched: donations.filter((d) => d.status === 'matched').length,
      openNeeds: Donations.getAllNeeds().filter((n) => n.status === 'open').length,
      statesReached: [...states].sort(),
      byCategory,
      ewasteKg: delivered.reduce((sum, d) => sum + this.weightKg(d.category), 0),
    };
  },
};

window.Impact = Impact;
