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
    this.initNavbar();
    this.initScrollReveal();
    this.initMobileMenu();
    this.updateNavbarAuth();
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

      actionsContainer.innerHTML = `
        ${typeBadge}
        <a href="dashboard.html" class="btn btn--ghost btn--sm">Dashboard</a>
        <button class="btn btn--ghost btn--sm" id="logout-btn" onclick="App.handleLogout()">Log out</button>
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
    toast.innerHTML = `
      <span class="toast__message">${message}</span>
      <button class="toast__close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // =========================================================================
  // Modal
  // =========================================================================

  showModal(title, body, actions = []) {
    document.querySelector('.modal-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';

    const actionsHTML = actions
      .map(
        (a) =>
          `<button class="btn ${a.class || 'btn--outline'}" onclick="${a.onclick}">${a.label}</button>`
      )
      .join('');

    overlay.innerHTML = `
      <div class="modal">
        <h3 class="modal__title">${title}</h3>
        <div class="modal__body">${body}</div>
        <div class="modal__actions">
          <button class="btn btn--ghost" onclick="App.closeModal()">Cancel</button>
          ${actionsHTML}
        </div>
      </div>
    `;

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
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  },

  // =========================================================================
  // Card Renderers
  // =========================================================================

  renderDonationCard(donation) {
    const cat = this.getCategory(donation.category);
    const cond = this.getCondition(donation.condition);
    const statusBadge =
      donation.status === 'available'
        ? '<span class="badge badge--success">Available</span>'
        : '<span class="badge badge--warning">Matched</span>';

    return `
      <div class="card donation-card" data-id="${donation.id}">
        <div class="donation-card__category">
          <span class="donation-card__category-name">${cat.name}</span>
        </div>
        <h3 class="donation-card__title">${donation.title}</h3>
        <p class="donation-card__desc">${donation.description}</p>
        <div class="card__footer">
          <div class="donation-card__meta">
            <span class="donation-card__meta-item">${donation.country}</span>
            <span class="donation-card__meta-item">${this.formatDate(donation.createdAt)}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="badge badge--gold">${cond.label}</span>
            ${statusBadge}
          </div>
        </div>
      </div>
    `;
  },

  renderNeedCard(need) {
    const cat = this.getCategory(need.category);
    const urgencyClass = `need-card--${need.urgency}`;
    const urgencyBadge = {
      high: '<span class="badge badge--error">High Priority</span>',
      medium: '<span class="badge badge--warning">Medium</span>',
      low: '<span class="badge badge--success">Low</span>',
    };

    return `
      <div class="card need-card ${urgencyClass}" data-id="${need.id}">
        <div class="need-card__header">
          <div class="need-card__avatar">${this.getInitials(need.laliderName)}</div>
          <div class="need-card__info">
            <div class="need-card__name">${need.laliderName}</div>
            <div class="need-card__camp">${need.camp} · ${need.country}</div>
          </div>
          ${urgencyBadge[need.urgency] || ''}
        </div>
        <div class="donation-card__category">
          <span class="donation-card__category-name">${cat.name}</span>
        </div>
        <h3 class="donation-card__title">${need.title}</h3>
        <p class="donation-card__desc">${need.description}</p>
        <div class="card__footer">
          <span class="donation-card__meta-item">${this.formatDate(need.createdAt)}</span>
          ${Auth.isDonor() ? `<button class="btn btn--primary btn--sm" onclick="App.showMatchModal('${need.id}')">Offer to Help</button>` : ''}
        </div>
      </div>
    `;
  },

  showMatchModal(needId) {
    const need = Donations.getAllNeeds().find((n) => n.id === needId);
    if (!need) return;

    const cat = this.getCategory(need.category);
    this.showModal(
      `Help ${need.laliderName}`,
      `<p>You're offering to help with:</p>
       <p><strong>${need.title}</strong></p>
       <p class="text-sm text-muted" style="margin-top: var(--s-2);">${need.description}</p>
       <p style="margin-top: var(--s-4);">This will notify the Lalíder that you want to help. They'll receive your contact information to coordinate the donation.</p>`,
      [{ label: 'Confirm Offer', class: 'btn--primary', onclick: `App.confirmMatch('${needId}')` }]
    );
  },

  confirmMatch(needId) {
    this.closeModal();
    this.showToast('Your offer has been sent! The Lalíder will be notified.', 'success');
  },
};

// Initialize App on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

window.App = App;
