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
    I18n.apply();
    this.initActions();
    this.initNavbar();
    this.initScrollReveal();
    this.initMobileMenu();
    this.initTabsKeyboard();
    this.updateNavbarAuth();
    this.initLanguageSelector();
    this.initDemoNotice();
  },

  /**
   * Seletor de idioma no navbar (fica visível também no celular).
   */
  initLanguageSelector() {
    const inner = document.querySelector('.nav__inner');
    if (!inner || inner.querySelector('.nav__lang')) return;
    const select = document.createElement('select');
    select.className = 'nav__lang';
    select.setAttribute('aria-label', I18n.t('nav.language'));
    I18n.SUPPORTED.forEach(({ code, label, short }) => {
      const opt = document.createElement('option');
      opt.value = code;
      // Sigla curta para caber no navbar do celular; o nome completo vai no title.
      opt.textContent = short;
      opt.title = label;
      opt.lang = code;
      opt.selected = code === I18n.locale;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => I18n.setLocale(select.value));
    const hamburger = inner.querySelector('.nav__hamburger');
    inner.insertBefore(select, hamburger || null);
  },

  /**
   * No modo demo, avisa que os dados são fictícios e ficam só no navegador.
   */
  initDemoNotice() {
    if (!LALA_CONFIG.DEMO_MODE || document.querySelector('.demo-notice')) return;
    const notice = document.createElement('p');
    notice.className = 'demo-notice';
    notice.setAttribute('role', 'note');
    notice.textContent = I18n.t('demo.notice');
    // Nas telas de cadastro e login o aviso fica no topo do cartão (é onde a
    // pessoa digitaria dados reais); nas demais, no rodapé. Nunca flutuante,
    // para não cobrir conteúdo no celular.
    const authCard = document.querySelector('.auth-card');
    const footer = document.querySelector('.footer__bottom');
    if (authCard) authCard.prepend(notice);
    else if (footer) footer.prepend(notice);
    else document.body.appendChild(notice);
  },

  /**
   * Executa `fn` quando o DOM e o idioma estiverem prontos. Use no lugar de
   * DOMContentLoaded nos scripts de página. App.init roda antes de todos.
   */
  ready(fn) {
    if (!this._readyPromise) {
      const dom =
        document.readyState === 'loading'
          ? new Promise((resolve) =>
              document.addEventListener('DOMContentLoaded', resolve, { once: true })
            )
          : Promise.resolve();
      this._readyPromise = Promise.all([dom, I18n.ready]).then(() => this.init());
    }
    return this._readyPromise.then(() => fn && fn());
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
    const nav = document.querySelector('.nav');
    const links = document.querySelector('.nav__links');
    if (!hamburger || !nav) return;

    const setOpen = (open) => {
      hamburger.classList.toggle('active', open);
      links?.classList.toggle('mobile-open', open);
      nav.classList.toggle('nav--menu-open', open);
      document.body.classList.toggle('no-scroll', open);
      hamburger.setAttribute('aria-expanded', String(open));
    };

    hamburger.addEventListener('click', () => {
      setOpen(hamburger.getAttribute('aria-expanded') !== 'true');
    });
    // Esc fecha o menu e devolve o foco ao botão.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && hamburger.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        hamburger.focus();
      }
    });
    // Clicar em um link do menu fecha o menu.
    nav.addEventListener('click', (e) => {
      if (e.target.closest('.nav__links a, .nav__actions a')) setOpen(false);
    });
  },

  /**
   * Abas acessíveis (padrão WAI-ARIA): atualiza aria-selected/tabindex e
   * permite trocar de aba com as setas, Home e End.
   */
  selectTab(tab) {
    const list = tab.closest('[role="tablist"]');
    if (!list) return;
    list.querySelectorAll('[role="tab"]').forEach((t) => {
      const selected = t === tab;
      t.classList.toggle('active', selected);
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
    });
  },

  initTabsKeyboard() {
    document.addEventListener('keydown', (e) => {
      const tab = e.target.closest?.('[role="tab"]');
      if (!tab) return;
      const tabs = [...tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]')];
      const i = tabs.indexOf(tab);
      const next = {
        ArrowRight: tabs[(i + 1) % tabs.length],
        ArrowLeft: tabs[(i - 1 + tabs.length) % tabs.length],
        Home: tabs[0],
        End: tabs[tabs.length - 1],
      }[e.key];
      if (!next) return;
      e.preventDefault();
      next.focus();
      next.click();
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
          ? `<span class="badge badge--lalider">${I18n.t('roles.lalider')}</span>`
          : `<span class="badge badge--donor">${I18n.t('roles.donor')}</span>`;

      const pending = user ? Offers.getPendingFor(user.id).length : 0;
      const pendingBadge = pending
        ? ` <span class="badge badge--error" aria-label="${this.escapeHTML(I18n.t('nav.pendingOffers', { count: pending }))}">${pending}</span>`
        : '';

      actionsContainer.innerHTML = `
        ${typeBadge}
        <a href="dashboard.html" class="btn btn--ghost btn--sm">${I18n.t('nav.dashboard')}${pendingBadge}</a>
        <button type="button" class="btn btn--ghost btn--sm" id="logout-btn" data-action="logout">${I18n.t('nav.logout')}</button>
      `;
    } else {
      actionsContainer.innerHTML = `
        <a href="login.html" class="btn btn--ghost btn--sm">${I18n.t('nav.login')}</a>
        <a href="register.html" class="btn btn--primary btn--sm">${I18n.t('nav.getStarted')}</a>
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
        counter.textContent = I18n.formatNumber(current) + suffix;

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
      // Região ao vivo: leitores de tela anunciam as mensagens.
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('role', 'status');
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    if (type === 'error') toast.setAttribute('role', 'alert');
    const messageEl = document.createElement('span');
    messageEl.className = 'toast__message';
    messageEl.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast__close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', I18n.t('common.close'));
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
    // Guarda quem abriu o modal para devolver o foco ao fechar.
    if (!this._modalOpener) this._modalOpener = document.activeElement;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';

    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 class="modal__title" id="modal-title">${App.escapeHTML(title)}</h2>
        <div class="modal__body">${body}</div>
        <div class="modal__actions">
          <button type="button" class="btn btn--ghost" data-action="close-modal">${App.escapeHTML(I18n.t('common.cancel'))}</button>
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

    // Teclado: Esc fecha; Tab fica preso dentro do modal.
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        App.closeModal();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = [
        ...overlay.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ),
      ].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    document.body.appendChild(overlay);
    document.body.classList.add('no-scroll');

    // Foco inicial: primeiro campo do formulário ou, se não houver, o primeiro botão de ação.
    const firstField = overlay.querySelector(
      '.modal__body input, .modal__body select, .modal__body textarea'
    );
    const firstAction = overlay.querySelector('.modal__actions .btn:last-child');
    (firstField || firstAction)?.focus();
  },

  closeModal() {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.setAttribute('aria-hidden', 'true');
      setTimeout(() => overlay.remove(), 250);
    }
    document.body.classList.remove('no-scroll');
    const opener = this._modalOpener;
    this._modalOpener = null;
    if (opener && document.contains(opener) && typeof opener.focus === 'function') opener.focus();
  },

  // =========================================================================
  // Utility Helpers
  // =========================================================================

  /** Data relativa no idioma ativo ("hoje", "há 3 dias"...). */
  formatDate(dateStr) {
    return I18n.formatRelativeDate(dateStr);
  },

  /** Categoria com nome e descrição traduzidos. */
  getCategory(id) {
    const cat = MockDB.equipmentCategories.find((c) => c.id === id) || { id: 'other', icon: '' };
    return {
      ...cat,
      name: I18n.t(`categories.${cat.id}.name`),
      description: I18n.t(`categories.${cat.id}.description`),
    };
  },

  getCondition(id) {
    const known = MockDB.conditions.some((c) => c.id === id);
    const key = known ? id : 'unknown';
    return {
      id: key,
      label: I18n.t(`conditions.${key}.label`),
      description: known ? I18n.t(`conditions.${key}.description`) : '',
    };
  },

  /**
   * Localização curta e pública: "Recife/PE" no Brasil, "Cidade, Estado,
   * País" nos demais. Aceita usuários, doações e pedidos.
   */
  formatLocation({ country, state, city } = {}) {
    if (country === 'BR') {
      if (city && state) return `${city}/${state}`;
      return state || city || I18n.countryName('BR');
    }
    return [city, state, I18n.countryName(country)].filter(Boolean).join(', ');
  },

  // =========================================================================
  // Campos de localização (país → UF + cidade no Brasil; região + cidade fora)
  // =========================================================================

  /** Países ordenados pelo nome no idioma ativo, com o Brasil primeiro. */
  sortedCountries(codes) {
    const rest = codes
      .filter((c) => c !== 'BR')
      .map((code) => ({ code, name: I18n.countryName(code) }))
      .sort((a, b) => a.name.localeCompare(b.name, I18n.locale));
    return [
      ...(codes.includes('BR') ? [{ code: 'BR', name: I18n.countryName('BR') }] : []),
      ...rest,
    ];
  },

  /**
   * Prepara um bloco .location-fields[data-location="prefix"].
   * @param {string} prefix - prefixo dos ids (ex.: 'donor' → #donor-country)
   * @param {{ countries?: string[], value?: { country, state, city } }} options
   */
  setupLocationFields(prefix, { countries, value = {} } = {}) {
    const root = document.querySelector(`[data-location="${prefix}"]`);
    if (!root) return;
    const country = document.getElementById(`${prefix}-country`);
    const uf = document.getElementById(`${prefix}-uf`);
    const region = document.getElementById(`${prefix}-region`);
    const city = document.getElementById(`${prefix}-city`);

    const list = countries || [...MockDB.latinAmericaCountries, ...MockDB.otherCountries];
    this.sortedCountries(list).forEach(({ code, name }) => {
      country.appendChild(new Option(name, code));
    });
    MockDB.brazilStates.forEach(({ uf: code, name }) => {
      uf.appendChild(new Option(`${name} (${code})`, code));
    });

    const sync = () => {
      const isBrazil = country.value === 'BR';
      root.querySelector('[data-location-br]').hidden = !isBrazil;
      root.querySelector('[data-location-other]').hidden = isBrazil;
      uf.required = isBrazil;
    };
    country.addEventListener('change', sync);

    if (value.country) country.value = value.country;
    if (value.country === 'BR') uf.value = value.state || '';
    else if (value.state) region.value = value.state;
    if (value.city) city.value = value.city;
    sync();
  },

  /** Lê um bloco de localização: { country, state, city }. */
  readLocation(prefix) {
    const country = document.getElementById(`${prefix}-country`)?.value || '';
    const state =
      country === 'BR'
        ? document.getElementById(`${prefix}-uf`)?.value || ''
        : (document.getElementById(`${prefix}-region`)?.value || '').trim();
    const city = (document.getElementById(`${prefix}-city`)?.value || '').trim();
    return { country, state, city };
  },

  /** Muda o país de um bloco já preparado (ex.: preenchido pelo código LALA). */
  setLocationCountry(prefix, code) {
    const country = document.getElementById(`${prefix}-country`);
    if (!country || !code) return;
    country.value = code;
    country.dispatchEvent(new Event('change'));
  },

  /**
   * Região pública de um Lalíder (LGPD: sem cidade): só a UF no Brasil e
   * só o país fora dele.
   */
  publicRegion({ country, state } = {}) {
    if (country === 'BR') return state || I18n.countryName('BR');
    return I18n.countryName(country);
  },

  /** Nome da área de interesse no idioma ativo (aceita id ou texto antigo). */
  areaName(value) {
    if (!value) return '';
    const key = `areas.${value}`;
    return I18n.has(key) ? I18n.t(key) : value;
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
        ? `<button type="button" class="btn btn--outline btn--sm" disabled>${I18n.t('card.requested')}</button>`
        : `<button type="button" class="btn btn--primary btn--sm" data-action="request-donation" data-donation-id="${e(donation.id)}">${I18n.t('card.request')}</button>`;
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
            <span class="donation-card__meta-item">${e(this.formatLocation(donation))}</span>
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
        ? `<button type="button" class="btn btn--outline btn--sm" disabled>${I18n.t('card.offerSent')}</button>`
        : `<button type="button" class="btn btn--primary btn--sm" data-action="offer-help" data-need-id="${e(need.id)}">${I18n.t('card.offerHelp')}</button>`;
    }
    const urgencyBadge = {
      high: `<span class="badge badge--error">${I18n.t('urgency.high')}</span>`,
      medium: `<span class="badge badge--warning">${I18n.t('urgency.medium')}</span>`,
      low: `<span class="badge badge--success">${I18n.t('urgency.low')}</span>`,
    };

    return `
      <div class="card need-card ${urgencyClass}" data-id="${e(need.id)}">
        <div class="need-card__header">
          <div class="need-card__avatar">${e(this.getInitials(need.laliderName))}</div>
          <div class="need-card__info">
            <div class="need-card__name">${e(need.laliderName)}</div>
            <div class="need-card__camp">${[need.camp, this.publicRegion(need)].filter(Boolean).map(e).join(' · ')}</div>
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
    const variants = {
      available: 'success',
      open: 'success',
      pending: 'warning',
      matched: 'warning',
      accepted: 'warning',
      declined: 'error',
      delivered: 'gold',
    };
    if (!variants[status]) return '';
    return `<span class="badge badge--${variants[status]}">${I18n.t(`status.${status}`)}</span>`;
  },

  /** Nome exibido publicamente: Lalíder vira "Ana S."; doador, organização ou nome. */
  displayName(user) {
    if (!user) return I18n.t('common.unknown');
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
      <label class="form-label" for="${id}">${I18n.t('offer.messageLabel')}</label>
      <textarea class="form-textarea" id="${id}" maxlength="500" placeholder="${this.escapeHTML(placeholder)}"></textarea>
      <p class="form-hint">${I18n.t('offer.messageHint')}</p>
    </div>`;
  },

  /** Doador → "Offer to Help" em um pedido. */
  showMatchModal(needId) {
    const need = Donations.getNeedById(needId);
    const user = Auth.getCurrentUser();
    if (!need || !user) return;
    if (user.type !== 'donor') {
      this.showToast(I18n.t('offers.onlyDonors'), 'error');
      return;
    }

    const e = (v) => this.escapeHTML(v);
    const myDonations = Donations.getByDonor(user.id).filter((d) => d.status === 'available');
    const suggested = myDonations.find((d) => d.category === need.category);
    const donationSelect = myDonations.length
      ? `<div class="form-group" style="margin-top: var(--s-4); text-align: left;">
          <label class="form-label" for="offer-donation">${I18n.t('offer.linkDonation')}</label>
          <select class="form-select" id="offer-donation">
            <option value="">${I18n.t('offer.noListing')}</option>
            ${myDonations.map((d) => `<option value="${e(d.id)}" ${d.id === suggested?.id ? 'selected' : ''}>${e(d.title)}</option>`).join('')}
          </select>
        </div>`
      : '';

    this.showModal(
      I18n.t('offer.helpTitle', { name: need.laliderName }),
      `<p>${I18n.t('offer.helpIntro')}</p>
       <p><strong>${e(need.title)}</strong></p>
       <p class="text-sm text-muted" style="margin-top: var(--s-2);">${e(need.description)}</p>
       ${donationSelect}
       ${this._messageField('offer-message', I18n.t('offer.helpPlaceholder'))}`,
      [
        {
          label: I18n.t('offer.send'),
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
      this.showToast(I18n.t('offers.onlyLalideres'), 'error');
      return;
    }

    const e = (v) => this.escapeHTML(v);
    const myNeeds = Donations.getNeedsByLalider(user.id).filter((n) => n.status === 'open');
    const suggested = myNeeds.find((n) => n.category === donation.category);
    const needSelect = myNeeds.length
      ? `<div class="form-group" style="margin-top: var(--s-4); text-align: left;">
          <label class="form-label" for="request-need">${I18n.t('offer.whichNeed')}</label>
          <select class="form-select" id="request-need">
            <option value="">${I18n.t('offer.noNeed')}</option>
            ${myNeeds.map((n) => `<option value="${e(n.id)}" ${n.id === suggested?.id ? 'selected' : ''}>${e(n.title)}</option>`).join('')}
          </select>
        </div>`
      : '';

    this.showModal(
      I18n.t('offer.requestTitle'),
      `<p><strong>${e(donation.title)}</strong></p>
       <p class="text-sm text-muted" style="margin-top: var(--s-2);">${e(donation.description)}</p>
       ${needSelect}
       ${this._messageField('request-message', I18n.t('offer.requestPlaceholder'))}`,
      [
        {
          label: I18n.t('offer.sendRequest'),
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

    const directionKey =
      offer.initiatedBy === 'donor'
        ? isRecipient
          ? 'offerCard.offeredYou'
          : 'offerCard.youOffered'
        : isRecipient
          ? 'offerCard.askedYou'
          : 'offerCard.youAsked';
    const direction = I18n.t(directionKey, { name: this.displayName(other) });
    const t = (key) => I18n.t(key);

    const items = [
      donation
        ? `<p class="text-sm"><strong>${t('offerCard.donation')}</strong> ${e(donation.title)}</p>`
        : '',
      need
        ? `<p class="text-sm"><strong>${t('offerCard.request')}</strong> ${e(need.title)}</p>`
        : '',
    ].join('');

    const message = offer.message
      ? `<p class="donation-card__desc" style="margin-top: var(--s-2);">“${e(offer.message)}”</p>`
      : '';

    const contact = Offers.getContact(offer, viewer.id);
    const contactHTML = contact
      ? `<div class="card card--flat" style="margin-top: var(--s-3); padding: var(--s-3);">
          <p class="text-xs" style="color: var(--text-2);">${t('offerCard.contact')}</p>
          <p class="text-sm"><strong>${e(contact.name)}</strong>${contact.organization ? ` · ${e(contact.organization)}` : ''}</p>
          <p class="text-sm"><a href="mailto:${e(contact.email)}">${e(contact.email)}</a></p>
        </div>`
      : '';

    let actions = '';
    if (offer.status === 'pending' && isRecipient) {
      actions = `
        <button type="button" class="btn btn--ghost btn--sm" data-action="decline-offer" data-offer-id="${e(offer.id)}">${t('offerCard.decline')}</button>
        <button type="button" class="btn btn--primary btn--sm" data-action="accept-offer" data-offer-id="${e(offer.id)}">${t('offerCard.accept')}</button>`;
    } else if (offer.status === 'pending') {
      actions = `<span class="text-sm text-muted">${t('offerCard.waiting')}</span>
        <button type="button" class="btn btn--ghost btn--sm" data-action="cancel-offer" data-offer-id="${e(offer.id)}">${t('offerCard.withdraw')}</button>`;
    } else if (offer.status === 'accepted') {
      actions = `<button type="button" class="btn btn--ghost btn--sm" data-action="cancel-offer" data-offer-id="${e(offer.id)}">${t('offerCard.cancelMatch')}</button>
        <button type="button" class="btn btn--primary btn--sm" data-action="deliver-offer" data-offer-id="${e(offer.id)}">${t('offerCard.markDelivered')}</button>`;
    } else if (offer.status === 'declined') {
      const reasons = {
        superseded: t('offerCard.reasonSuperseded'),
        withdrawn: t('offerCard.reasonWithdrawn'),
        cancelled: t('offerCard.reasonCancelled'),
      };
      const reason = reasons[offer.closedReason];
      actions = reason ? `<span class="text-sm text-muted">${reason}</span>` : '';
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
  'cancel-offer': (el) => {
    if (!window.confirm(I18n.t('offerCard.confirmCancel'))) return;
    App._offerAction((user) => Offers.cancel(el.dataset.offerId, user.id));
  },
  'deliver-offer': (el) => {
    if (!window.confirm(I18n.t('offerCard.confirmDelivered'))) return;
    App._offerAction((user) => Offers.markDelivered(el.dataset.offerId, user.id));
  },
});

// Inicializa o App quando DOM e idioma estiverem prontos.
App.ready();

window.App = App;
