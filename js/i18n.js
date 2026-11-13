/**
 * LALA Bridge — internacionalização (i18n)
 *
 * - Os textos ficam em locales/<idioma>.json. PT-BR é o idioma padrão.
 * - No HTML: data-i18n="chave" troca o texto do elemento e
 *   data-i18n-attr="placeholder:chave;aria-label:outra" troca atributos.
 *   O HTML já vem escrito em PT-BR, então não há "piscar" de texto.
 * - No JS: I18n.t('chave', { nome: 'Ana' }) com interpolação de {nome}.
 *   Plural simples: I18n.t('chave', { count: 2 }) usa "chave.one"/"chave.other".
 * - Datas e números usam Intl no idioma ativo.
 *
 * As páginas devem renderizar dentro de App.ready(), que espera o idioma carregar.
 */

const I18n = {
  STORAGE_KEY: 'lala_bridge_locale',
  DEFAULT_LOCALE: 'pt-BR',
  SUPPORTED: [
    { code: 'pt-BR', label: 'Português' },
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
  ],

  locale: 'pt-BR',
  messages: {},
  fallback: {},
  ready: null,

  isSupported(code) {
    return this.SUPPORTED.some((l) => l.code === code);
  },

  detectLocale() {
    let stored;
    try {
      stored = localStorage.getItem(this.STORAGE_KEY);
    } catch {
      stored = null;
    }
    return this.isSupported(stored) ? stored : this.DEFAULT_LOCALE;
  },

  async _fetch(code) {
    const res = await fetch(`locales/${code}.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Falha ao carregar locales/${code}.json (${res.status})`);
    return res.json();
  },

  /**
   * Carrega o idioma ativo (e o PT-BR como reserva). Nunca rejeita: se algo
   * falhar, o app segue com o que tiver e o HTML continua em PT-BR.
   */
  init() {
    this.locale = this.detectLocale();
    document.documentElement.lang = this.locale;

    const preload = window.LALA_I18N_PRELOAD; // usado pelos testes
    if (preload) {
      this.locale = preload.locale || this.locale;
      this.messages = preload.messages || {};
      this.fallback = preload.fallback || preload.messages || {};
      document.documentElement.lang = this.locale;
      this.ready = Promise.resolve();
      return this.ready;
    }

    const codes = [...new Set([this.DEFAULT_LOCALE, this.locale])];
    this.ready = Promise.all(
      codes.map((c) =>
        this._fetch(c).catch((err) => {
          console.warn(err.message);
          return {};
        })
      )
    ).then(([fallback, active]) => {
      this.fallback = fallback;
      this.messages = active || fallback;
    });
    return this.ready;
  },

  _lookup(dict, key) {
    return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict);
  },

  has(key) {
    return typeof this._lookup(this.messages, key) === 'string';
  },

  /**
   * Traduz uma chave. Se não existir no idioma ativo, usa PT-BR; se também
   * não existir, devolve a própria chave (fácil de achar na tela).
   */
  t(key, params = {}) {
    let fullKey = key;
    if (typeof params.count === 'number') {
      const rule = new Intl.PluralRules(this.locale).select(params.count);
      const candidate = `${key}.${rule}`;
      fullKey =
        typeof this._lookup(this.messages, candidate) === 'string' ||
        typeof this._lookup(this.fallback, candidate) === 'string'
          ? candidate
          : `${key}.other`;
    }
    let text = this._lookup(this.messages, fullKey);
    if (typeof text !== 'string') text = this._lookup(this.fallback, fullKey);
    if (typeof text !== 'string') return key;
    return text.replace(/\{(\w+)\}/g, (match, name) =>
      params[name] !== undefined ? String(params[name]) : match
    );
  },

  /** Aplica as traduções aos elementos com data-i18n e data-i18n-attr. */
  apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      const value = this.t(el.dataset.i18n);
      if (value !== el.dataset.i18n) el.textContent = value;
    });
    root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      el.dataset.i18nAttr.split(';').forEach((pair) => {
        const [attr, key] = pair.split(':').map((s) => s.trim());
        if (!attr || !key) return;
        const value = this.t(key);
        if (value !== key) el.setAttribute(attr, value);
      });
    });
  },

  setLocale(code) {
    if (!this.isSupported(code)) return;
    try {
      localStorage.setItem(this.STORAGE_KEY, code);
    } catch {
      /* armazenamento indisponível: segue só nesta página */
    }
    window.location.reload();
  },

  // ---- Formatação com Intl ----

  formatNumber(value, options) {
    return new Intl.NumberFormat(this.locale, options).format(value);
  },

  formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(this.locale, options).format(date);
  },

  /** "hoje", "ontem", "há 3 dias"... e data completa depois de 30 dias. */
  formatRelativeDate(value, now = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const days = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
    if (days < 0 || days >= 30) return this.formatDate(date);
    const rtf = new Intl.RelativeTimeFormat(this.locale, { numeric: 'auto' });
    if (days < 7) return rtf.format(-days, 'day');
    return rtf.format(-Math.floor(days / 7), 'week');
  },

  /** Nome do país no idioma ativo a partir do código ISO (ex.: "BR"). */
  countryName(code) {
    if (!code) return '';
    if (!/^[A-Z]{2}$/.test(code)) return code; // dado antigo em texto livre
    try {
      return new Intl.DisplayNames([this.locale], { type: 'region' }).of(code) || code;
    } catch {
      return code;
    }
  },
};

I18n.init();

window.I18n = I18n;
