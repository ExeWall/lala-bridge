/**
 * LALA Bridge — Donations System
 *
 * Handles creating, listing and filtering donations and needs.
 * The matching flow lives in js/offers.js.
 * Uses localStorage for the MVP.
 */

const Donations = {
  STORAGE_KEY: 'lala_bridge_donations',
  NEEDS_KEY: 'lala_bridge_needs',

  /**
   * No modo demo, popula doações e pedidos de exemplo se estiverem vazios
   */
  init() {
    if (!LALA_CONFIG.DEMO_MODE || Store.mode !== 'local') return;
    if (!Store.has(this.STORAGE_KEY)) Store.set(this.STORAGE_KEY, MockDB.sampleDonations);
    if (!Store.has(this.NEEDS_KEY)) Store.set(this.NEEDS_KEY, MockDB.sampleNeeds);
  },

  /**
   * Get all donations
   */
  getAll() {
    return Store.get(this.STORAGE_KEY, []);
  },

  /**
   * Get available donations only
   */
  getAvailable() {
    return this.getAll().filter((d) => d.status === 'available');
  },

  /**
   * Get donations by donor
   */
  getByDonor(donorId) {
    return this.getAll().filter((d) => d.donorId === donorId);
  },

  /**
   * Create a new donation
   */
  create({
    donorId,
    donorName,
    category,
    title,
    description,
    condition,
    country,
    state = '',
    city = '',
  }) {
    if (!Auth.hasRole(donorId, 'donor')) {
      throw new Error(I18n.t('donations.onlyDonors'));
    }
    const donations = this.getAll();
    const donation = {
      id: newId('don'),
      donorId,
      donorName,
      category,
      title,
      description,
      condition,
      country,
      state,
      city,
      status: 'available',
      createdAt: new Date().toISOString(),
      image: null,
    };

    donations.unshift(donation);
    Store.set(this.STORAGE_KEY, donations);

    return donation;
  },

  getById(id) {
    return this.getAll().find((d) => d.id === id) || null;
  },

  /**
   * Atualiza campos de uma doação. Usado pelo fluxo de ofertas (Offers);
   * o match de verdade acontece em Offers.respond().
   */
  update(id, patch) {
    const donations = this.getAll();
    const idx = donations.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    donations[idx] = { ...donations[idx], ...patch, updatedAt: new Date().toISOString() };
    Store.set(this.STORAGE_KEY, donations);
    return donations[idx];
  },

  /**
   * Filter donations
   */
  filter(donations, { category, country, state, search, condition } = {}) {
    return donations.filter((d) => {
      if (category && category !== 'all' && d.category !== category) return false;
      if (country && String(d.country).toLowerCase() !== country.toLowerCase()) return false;
      if (state && d.state !== state) return false;
      if (condition && d.condition !== condition) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          d.title.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.donorName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  },

  // ---- Needs (Lalíder requests) ----

  /**
   * Get all needs
   */
  getAllNeeds() {
    return Store.get(this.NEEDS_KEY, []);
  },

  /**
   * Get open needs
   */
  getOpenNeeds() {
    return this.getAllNeeds().filter((n) => n.status === 'open');
  },

  /**
   * Get needs by Lalíder
   */
  getNeedsByLalider(laliderId) {
    return this.getAllNeeds().filter((n) => n.laliderId === laliderId);
  },

  getNeedById(id) {
    return this.getAllNeeds().find((n) => n.id === id) || null;
  },

  updateNeed(id, patch) {
    const needs = this.getAllNeeds();
    const idx = needs.findIndex((n) => n.id === id);
    if (idx === -1) return null;
    needs[idx] = { ...needs[idx], ...patch, updatedAt: new Date().toISOString() };
    Store.set(this.NEEDS_KEY, needs);
    return needs[idx];
  },

  /**
   * Create a new need
   */
  createNeed({
    laliderId,
    laliderName,
    camp,
    country,
    state = '',
    city = '',
    category,
    title,
    description,
    urgency,
  }) {
    if (!Auth.hasRole(laliderId, 'lalider')) {
      throw new Error(I18n.t('donations.onlyLalideres'));
    }
    const needs = this.getAllNeeds();
    const need = {
      id: newId('need'),
      laliderId,
      laliderName,
      camp,
      country,
      state,
      city,
      category,
      title,
      description,
      urgency: urgency || 'medium',
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    needs.unshift(need);
    Store.set(this.NEEDS_KEY, needs);

    return need;
  },

  /**
   * Get statistics
   */
  getStats() {
    const donations = this.getAll();
    const needs = this.getAllNeeds();

    return {
      totalDonations: donations.length,
      availableDonations: donations.filter((d) => d.status === 'available').length,
      matchedDonations: donations.filter((d) => d.status === 'matched').length,
      deliveredDonations: donations.filter((d) => d.status === 'delivered').length,
      totalNeeds: needs.length,
      openNeeds: needs.filter((n) => n.status === 'open').length,
      countries: [...new Set([...donations.map((d) => d.country), ...needs.map((n) => n.country)])]
        .length,
    };
  },
};

// Initialize
Donations.init();

// Make available globally
window.Donations = Donations;
