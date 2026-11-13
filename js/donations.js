/**
 * LALA Bridge — Donations System
 *
 * Handles creating, listing, filtering, and matching donations.
 * Uses localStorage for the MVP.
 */

const Donations = {
  STORAGE_KEY: 'lala_bridge_donations',
  NEEDS_KEY: 'lala_bridge_needs',

  /**
   * Initialize donations with sample data if empty
   */
  init() {
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

  /**
   * Match a donation to a Lalíder
   */
  match(donationId, laliderId) {
    const donations = this.getAll();
    const idx = donations.findIndex((d) => d.id === donationId);
    if (idx === -1) return false;

    donations[idx].status = 'matched';
    donations[idx].matchedTo = laliderId;
    donations[idx].matchedAt = new Date().toISOString();

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(donations));
    return true;
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

  /**
   * Create a new need
   */
  createNeed({ laliderId, laliderName, camp, country, category, title, description, urgency }) {
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
