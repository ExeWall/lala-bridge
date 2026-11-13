/**
 * LALA Bridge — Main Application Logic
 *
 * Handles navigation, scroll effects, animations,
 * toast notifications, and shared UI utilities.
 */

const App = {
  /**
   * Initialize the app — call on every page
   */
  init() {
    this.initActions();
    this.initNavbar();
    this.initScrollReveal();
    this.initMobileMenu();
    this.updateNavbarAuth();
  },

  // =========================================================================
  // Roteador de ações (substitui onclick="..." em string)
  // =========================================================================

  actions: {},

  /**
   * Registra handlers para elementos com `data-action="nome"`.
   * O handler recebe (elemento, evento).
   */
  registerActions(map) {
    Object.assign(this.actions, map);
  },

  initActions() {
    if (document.__lalaActionHandler) {
      document.removeEventListener('click', document.__lalaActionHandler);
    }
    const handler = (event) => {
      const el = event.target.closest?.('[data-action]');
      if (!el || el.disabled) return;
      const action = this.actions[el.dataset.action];
      if (action) action(el, event);
    };
    document.__lalaActionHandler = handler;
    document.addEventListener('click', handler);
  },

  // =========================================================================
  // Navbar
  // =========================================================================

  initNavbar() {
    const navbar = document.querySelector('.nav');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });

    if (window.scrollY > 50) navbar.classList.add('scrolled');
  },

  initMobileMenu() {
    const hamburger = document.querySelector('.nav__hamburger');
    const links = document.querySelector('.nav__links');

    if (!hamburger) return;

    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      links?.classList.toggle('mobile-open');
    });
  },

  /**
   * Update navbar to show user state
   */
  updateNavbarAuth() {
    const actionsContainer = document.querySelector('.nav__actions');
    if (!actionsContainer) return;

    if (Auth.isLoggedIn()) {
      const user = Auth.getCurrentUser();
      const typeBadge =
        user?.type === 'lalider'
          ? '<span class="badge badge--lalider">Lalíder</span>'
          : '<span class="badge badge--donor">Donor</span>';

      const pending = user ? Offers.getPendingFor(user.id).length : 0;
      const pendingBadge = pending
        ? ` <span class="badge badge--error" aria-label="${pending} offers waiting for your answer">${pending}</span>`
        : '';

      actionsContainer.innerHTML = `
        ${typeBadge}
        <a href="dashboard.html" class="btn btn--ghost btn--sm">Dashboard${pendingBadge}</a>
        <button class="btn btn--ghost btn--sm" id="logout-btn" data-action="logout">Log out</button>
      `;
    } else {
      actionsContainer.innerHTML = `
        <a href="login.html" class="btn btn--ghost btn--sm">Log In</a>
        <a href="register.html" class="btn btn--primary btn--sm">Get Started</a>
      `;
    }
  },

  handleLogout() {
    Auth.logout();
    window.location.href = 'index.html';
  },

  // =========================================================================
  // Scroll Reveal Animation
  // =========================================================================

  initScrollReveal() {
    const elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    elements.forEach((el) => observer.observe(el));
  },

  // =========================================================================
  // Counter Animation (for stats)
  // =========================================================================

  animateCounters() {
    const counters = document.querySelectorAll('[data-count]');

    counters.forEach((counter) => {
      const target = parseInt(counter.getAttribute('data-count'), 10);
      const duration = 2000;
      const start = 0;
      const startTime = Date.now();
      const suffix = counter.getAttribute('data-suffix') || '';

      function update() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (target - start) * eased);
        counter.textContent = current.toLocaleString() + suffix;

        if (progress < 1) {
          requestAnimationFrame(update);
        }
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            update();
            observer.disconnect();
          }
        },
        { threshold: 0.5 }
      );

      observer.observe(counter);
    });
  },

  // =========================================================================
  // Segurança: escape de HTML
  // =========================================================================

  /**
   * Escapa um valor para inserção segura em HTML (conteúdo ou atributo entre aspas).
   * Use em TODO dado vindo do usuário ou do armazenamento antes de interpolar
   * em template strings atribuídas a `innerHTML`.
   */
  escapeHTML(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/`/g, '&#96;');
  },

  // =========================================================================
  // Toast Notifications
  // =========================================================================

  showToast(message, type = 'info', duration = 4000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    const messageEl = document.createElement('span');
    messageEl.className = 'toast__message';
    messageEl.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast__close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => toast.remove());

    toast.append(messageEl, closeBtn);

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // =========================================================================
  // Modal
  // =========================================================================

  /**
   * Abre um modal.
   * @param {string} title - texto puro (é escapado aqui)
   * @param {string} body - HTML confiável; quem chama deve escapar dados de usuário
   */
  showModal(title, body, actions = []) {
    document.querySelector('.modal-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';

    overlay.innerHTML = `
      <div class="modal">
        <h3 class="modal__title">${App.escapeHTML(title)}</h3>
        <div class="modal__body">${body}</div>
        <div class="modal__actions">
          <button type="button" class="btn btn--ghost" data-action="close-modal">Cancel</button>
        </div>
      </div>
    `;

    const actionsContainer = overlay.querySelector('.modal__actions');
    actions.forEach((a) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `btn ${a.class || 'btn--outline'}`;
      btn.textContent = a.label;
      if (typeof a.onClick === 'function') btn.addEventListener('click', (ev) => a.onClick(ev));
      actionsContainer.appendChild(btn);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) App.closeModal();
    });

    document.body.appendChild(overlay);
  },

  closeModal() {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 250);
    }
  },

  // =========================================================================
  // Utility Helpers
  // =========================================================================

  formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  getCategory(id) {
    return (
      MockDB.equipmentCategories.find((c) => c.id === id) || {
        id: 'other',
        name: 'Other',
        icon: '',
      }
    );
  },

  getCondition(id) {
    return MockDB.conditions.find((c) => c.id === id) || { id: 'unknown', label: 'Unknown' };
  },

  getInitials(name) {
    return String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  },

  // =========================================================================
  // Card Renderers
  // =========================================================================

  renderDonationCard(donation) {
    const e = (v) => this.escapeHTML(v);
    const cat = this.getCategory(donation.category);
    const cond = this.getCondition(donation.condition);
    const statusBadge = this.renderStatusBadge(donation.status);
    const viewer = Auth.getCurrentUser();
    let action = '';
    if (viewer?.type === 'lalider' && donation.status === 'available') {
      action = Offers.findPendingFrom(viewer.id, { donationId: donation.id })
        ? '<button type="button" class="btn btn--outline btn--sm" disabled>Requested</button>'
        : `<button type="button" class="btn btn--primary btn--sm" data-action="request-donation" data-donation-id="${e(donation.id)}">Request</button>`;
    }

    return `
      <div class="card donation-card" data-id="${e(donation.id)}">
        <div class="donation-card__category">
          <span class="donation-card__category-name">${e(cat.name)}</span>
        </div>
        <h3 class="donation-card__title">${e(donation.title)}</h3>
        <p class="donation-card__desc">${e(donation.description)}</p>
        <div class="card__footer">
          <div class="donation-card__meta">
            <span class="donation-card__meta-item">${e(donation.country)}</span>
            <span class="donation-card__meta-item">${this.formatDate(donation.createdAt)}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="badge badge--gold">${e(cond.label)}</span>
            ${statusBadge}
            ${action}
          </div>
        </div>
      </div>
    `;
  },

  renderNeedCard(need) {
    const e = (v) => this.escapeHTML(v);
    const cat = this.getCategory(need.category);
    const urgencyClass = ['high', 'medium', 'low'].includes(need.urgency)
      ? `need-card--${need.urgency}`
      : '';
    const viewer = Auth.getCurrentUser();
    let needAction = '';
    if (viewer?.type === 'donor' && need.status === 'open') {
      needAction = Offers.findPendingFrom(viewer.id, { needId: need.id })
        ? '<button type="button" class="btn btn--outline btn--sm" disabled>Offer sent</button>'
        : `<button type="button" class="btn btn--primary btn--sm" data-action="offer-help" data-need-id="${e(need.id)}">Offer to Help</button>`;
    }
    const urgencyBadge = {
      high: '<span class="badge badge--error">High Priority</span>',
      medium: '<span class="badge badge--warning">Medium</span>',
      low: '<span class="badge badge--success">Low</span>',
    };

    return `
      <div class="card need-card ${urgencyClass}" data-id="${e(need.id)}">
        <div class="need-card__header">
          <div class="need-card__avatar">${e(this.getInitials(need.laliderName))}</div>
          <div class="need-card__info">
            <div class="need-card__name">${e(need.laliderName)}</div>
            <div class="need-card__camp">${e(need.camp)} · ${e(need.country)}</div>
          </div>
          ${urgencyBadge[need.urgency] || ''}
        </div>
        <div class="donation-card__category">
          <span class="donation-card__category-name">${e(cat.name)}</span>
        </div>
        <h3 class="donation-card__title">${e(need.title)}</h3>
        <p class="donation-card__desc">${e(need.description)}</p>
        <div class="card__footer">
          <span class="donation-card__meta-item">${this.formatDate(need.createdAt)}</span>
          ${need.status && need.status !== 'open' ? this.renderStatusBadge(need.status) : ''}
          ${needAction}
        </div>
      </div>
    `;
  },

  renderStatusBadge(status) {
    const badges = {
      available: '<span class="badge badge--success">Available</span>',
      open: '<span class="badge badge--success">Open</span>',
      pending: '<span class="badge badge--warning">Pending</span>',
      matched: '<span class="badge badge--warning">Matched</span>',
      accepted: '<span class="badge badge--warning">Accepted</span>',
      declined: '<span class="badge badge--error">Declined</span>',
      delivered: '<span class="badge badge--gold">Delivered</span>',
    };
    return badges[status] || '';
  },

  /** Nome exibido publicamente: Lalíder vira "Ana S."; doador, organização ou nome. */
  displayName(user) {
    if (!user) return 'Unknown';
    if (user.type === 'lalider') {
      const parts = String(user.name || '')
        .trim()
        .split(/\s+/);
      return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
    }
    return user.organization || user.name;
  },

  _messageField(id, placeholder) {
    return `<div class="form-group" style="margin-top: var(--s-4); text-align: left;">
      <label class="form-label" for="${id}">Message (optional)</label>
      <textarea class="form-textarea" id="${id}" maxlength="500" placeholder="${this.escapeHTML(placeholder)}"></textarea>
      <p class="form-hint">Do not share phone numbers or addresses here. Contact details are shown to both sides only after the offer is accepted.</p>
    </div>`;
  },

  /** Doador → "Offer to Help" em um pedido. */
  showMatchModal(needId) {
    const need = Donations.getNeedById(needId);
    const user = Auth.getCurrentUser();
    if (!need || !user) return;
    if (user.type !== 'donor') {
      this.showToast('Only donors can offer help.', 'error');
      return;
    }

    const e = (v) => this.escapeHTML(v);
    const myDonations = Donations.getByDonor(user.id).filter((d) => d.status === 'available');
    const suggested = myDonations.find((d) => d.category === need.category);
    const donationSelect = myDonations.length
      ? `<div class="form-group" style="margin-top: var(--s-4); text-align: left;">
          <label class="form-label" for="offer-donation">Link one of your donations (optional)</label>
          <select class="form-select" id="offer-donation">
            <option value="">No specific listing</option>
            ${myDonations.map((d) => `<option value="${e(d.id)}" ${d.id === suggested?.id ? 'selected' : ''}>${e(d.title)}</option>`).join('')}
          </select>
        </div>`
      : '';

    this.showModal(
      `Help ${need.laliderName}`,
      `<p>You're offering to help with:</p>
       <p><strong>${e(need.title)}</strong></p>
       <p class="text-sm text-muted" style="margin-top: var(--s-2);">${e(need.description)}</p>
       ${donationSelect}
       ${this._messageField('offer-message', 'Tell the Lalíder how you can help')}`,
      [
        {
          label: 'Send Offer',
          class: 'btn--primary',
          onClick: () =>
            this._submitOffer(() =>
              Offers.offerHelp({
                donorId: user.id,
                needId,
                donationId: document.getElementById('offer-donation')?.value || null,
                message: document.getElementById('offer-message')?.value || '',
              })
            ),
        },
      ]
    );
  },

  /** Lalíder → "Request" em uma doação. */
  showRequestModal(donationId) {
    const donation = Donations.getById(donationId);
    const user = Auth.getCurrentUser();
    if (!donation || !user) return;
    if (user.type !== 'lalider') {
      this.showToast('Only verified Lalíderes can request donations.', 'error');
      return;
    }

    const e = (v) => this.escapeHTML(v);
    const myNeeds = Donations.getNeedsByLalider(user.id).filter((n) => n.status === 'open');
    const suggested = myNeeds.find((n) => n.category === donation.category);
    const needSelect = myNeeds.length
      ? `<div class="form-group" style="margin-top: var(--s-4); text-align: left;">
          <label class="form-label" for="request-need">Which of your requests does it answer? (optional)</label>
          <select class="form-select" id="request-need">
            <option value="">None</option>
            ${myNeeds.map((n) => `<option value="${e(n.id)}" ${n.id === suggested?.id ? 'selected' : ''}>${e(n.title)}</option>`).join('')}
          </select>
        </div>`
      : '';

    this.showModal(
      'Request this donation',
      `<p><strong>${e(donation.title)}</strong></p>
       <p class="text-sm text-muted" style="margin-top: var(--s-2);">${e(donation.description)}</p>
       ${needSelect}
       ${this._messageField('request-message', 'Tell the donor how this would help you')}`,
      [
        {
          label: 'Send Request',
          class: 'btn--primary',
          onClick: () =>
            this._submitOffer(() =>
              Offers.requestDonation({
                laliderId: user.id,
                donationId,
                needId: document.getElementById('request-need')?.value || null,
                message: document.getElementById('request-message')?.value || '',
              })
            ),
        },
      ]
    );
  },

  _submitOffer(fn) {
    const result = fn();
    this.closeModal();
    this.showToast(result.message, result.success ? 'success' : 'error');
    if (result.success) this.refresh();
  },

  /** Re-renderiza a página atual depois de uma mudança de dados. */
  refresh() {
    this.updateNavbarAuth();
    if (typeof this.onDataChange === 'function') this.onDataChange();
  },

  /**
   * Card de oferta para o dashboard, do ponto de vista de `viewer`.
   */
  renderOfferCard(offer, viewer) {
    const e = (v) => this.escapeHTML(v);
    const need = offer.needId ? Donations.getNeedById(offer.needId) : null;
    const donation = offer.donationId ? Donations.getById(offer.donationId) : null;
    const otherId = viewer.id === offer.donorId ? offer.laliderId : offer.donorId;
    const other = Auth.getUsers().find((u) => u.id === otherId);
    const isRecipient = Offers.getRecipientId(offer) === viewer.id;

    let direction;
    if (offer.initiatedBy === 'donor') {
      direction = isRecipient
        ? `${this.displayName(other)} offered to help`
        : `You offered help to ${this.displayName(other)}`;
    } else {
      direction = isRecipient
        ? `${this.displayName(other)} asked for your donation`
        : `You asked ${this.displayName(other)} for a donation`;
    }

    const items = [
      donation ? `<p class="text-sm"><strong>Donation:</strong> ${e(donation.title)}</p>` : '',
      need ? `<p class="text-sm"><strong>Request:</strong> ${e(need.title)}</p>` : '',
    ].join('');

    const message = offer.message
      ? `<p class="donation-card__desc" style="margin-top: var(--s-2);">“${e(offer.message)}”</p>`
      : '';

    const contact = Offers.getContact(offer, viewer.id);
    const contactHTML = contact
      ? `<div class="card card--flat" style="margin-top: var(--s-3); padding: var(--s-3);">
          <p class="text-xs" style="color: var(--text-2);">Contact</p>
          <p class="text-sm"><strong>${e(contact.name)}</strong>${contact.organization ? ` · ${e(contact.organization)}` : ''}</p>
          <p class="text-sm"><a href="mailto:${e(contact.email)}">${e(contact.email)}</a></p>
        </div>`
      : '';

    let actions = '';
    if (offer.status === 'pending' && isRecipient) {
      actions = `
        <button type="button" class="btn btn--ghost btn--sm" data-action="decline-offer" data-offer-id="${e(offer.id)}">Decline</button>
        <button type="button" class="btn btn--primary btn--sm" data-action="accept-offer" data-offer-id="${e(offer.id)}">Accept</button>`;
    } else if (offer.status === 'pending') {
      actions = '<span class="text-sm text-muted">Waiting for an answer</span>';
    } else if (offer.status === 'accepted') {
      actions = `<button type="button" class="btn btn--primary btn--sm" data-action="deliver-offer" data-offer-id="${e(offer.id)}">Mark as delivered</button>`;
    } else if (offer.closedReason === 'superseded') {
      actions = '<span class="text-sm text-muted">Closed: matched with someone else</span>';
    }

    return `
      <div class="card offer-card" data-id="${e(offer.id)}">
        <div class="flex items-center gap-2" style="justify-content: space-between; margin-bottom: var(--s-3);">
          <span class="text-sm"><strong>${e(direction)}</strong></span>
          ${this.renderStatusBadge(offer.status)}
        </div>
        ${items}
        ${message}
        ${contactHTML}
        <div class="card__footer">
          <span class="donation-card__meta-item">${this.formatDate(offer.updatedAt || offer.createdAt)}</span>
          <div class="flex items-center gap-2">${actions}</div>
        </div>
      </div>
    `;
  },

  _offerAction(fn) {
    const user = Auth.getCurrentUser();
    if (!user) return;
    const result = fn(user);
    this.showToast(result.message, result.success ? 'success' : 'error');
    this.refresh();
  },
};

App.registerActions({
  logout: () => App.handleLogout(),
  'close-modal': () => App.closeModal(),
  'offer-help': (el) => App.showMatchModal(el.dataset.needId),
  'request-donation': (el) => App.showRequestModal(el.dataset.donationId),
  'accept-offer': (el) =>
    App._offerAction((user) => Offers.respond(el.dataset.offerId, user.id, 'accept')),
  'decline-offer': (el) =>
    App._offerAction((user) => Offers.respond(el.dataset.offerId, user.id, 'decline')),
  'deliver-offer': (el) => {
    if (!window.confirm('Confirm that this item was delivered?')) return;
    App._offerAction((user) => Offers.markDelivered(el.dataset.offerId, user.id));
  },
});

// Initialize App on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

window.App = App;
