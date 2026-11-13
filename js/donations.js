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
    if (!LALA_CONFIG.DEMO_MODE) return;
    if (!localStorage.getItem(this.STORAGE_KEY)) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(MockDB.sampleDonations));
    }
    if (!localStorage.getItem(this.NEEDS_KEY)) {
      localStorage.setItem(this.NEEDS_KEY, JSON.stringify(MockDB.sampleNeeds));
    }
  },

  /**
   * Get all donations
   */
  getAll() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
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
   * Get donations matched to a Lalíder
   */
  getMatchedToLalider(laliderId) {
    return this.getAll().filter((d) => d.matchedTo === laliderId);
  },

  /**
   * Create a new donation
   */
  create({ donorId, donorName, category, title, description, condition, country }) {
    if (!Auth.hasRole(donorId, 'donor')) {
      throw new Error('Only donors can publish donations.');
    }
    const donations = this.getAll();
    const donation = {
      id: 'don-' + Date.now(),
      donorId,
      donorName,
      category,
      title,
      description,
      condition,
      country,
      status: 'available',
      createdAt: new Date().toISOString(),
      image: null,
    };

    donations.unshift(donation);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(donations));

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
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(donations));
    return donations[idx];
  },

  /**
   * Filter donations
   */
  filter(donations, { category, country, search, condition } = {}) {
    return donations.filter((d) => {
      if (category && category !== 'all' && d.category !== category) return false;
      if (country && d.country.toLowerCase() !== country.toLowerCase()) return false;
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
    return JSON.parse(localStorage.getItem(this.NEEDS_KEY) || '[]');
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
    localStorage.setItem(this.NEEDS_KEY, JSON.stringify(needs));
    return needs[idx];
  },

  /**
   * Create a new need
   */
  createNeed({ laliderId, laliderName, camp, country, category, title, description, urgency }) {
    if (!Auth.hasRole(laliderId, 'lalider')) {
      throw new Error('Only verified Lalíderes can create requests.');
    }
    const needs = this.getAllNeeds();
    const need = {
      id: 'need-' + Date.now(),
      laliderId,
      laliderName,
      camp,
      country,
      category,
      title,
      description,
      urgency: urgency || 'medium',
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    needs.unshift(need);
    localStorage.setItem(this.NEEDS_KEY, JSON.stringify(needs));

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
