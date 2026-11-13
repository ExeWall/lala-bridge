/**
 * LALA Bridge — Authentication System
 *
 * Handles user registration, login, session management,
 * and Lalíder code verification.
 *
 * Uses localStorage for the MVP. In production, replace with
 * proper backend authentication (JWT, sessions, etc.)
 *
 * ATENÇÃO: o hash de senha abaixo (PBKDF2-SHA256 com salt via crypto.subtle)
 * é um PALIATIVO para não guardar senhas em texto puro no localStorage.
 * Isto NÃO é segurança de produção: tudo roda no navegador e qualquer pessoa
 * com acesso ao dispositivo pode ler ou alterar os dados. A autenticação real
 * chega na Fase 3 (Supabase Auth).
 */

const Auth = {
  STORAGE_KEY: 'lala_bridge_users',
  SESSION_KEY: 'lala_bridge_session',

  /**
   * Inicializa o sistema. No modo demo, cria as contas fictícias se ainda não existirem.
   */
  init() {
    if (!LALA_CONFIG.DEMO_MODE) return;
    // Garante as contas demo também em navegadores que já tinham dados de uma
    // versão anterior (que guardava as contas demo com senha em texto puro).
    const users = this.getUsers();
    let changed = false;
    MockDB.demoUsers.forEach((demo) => {
      const idx = users.findIndex((u) => u.id === demo.id);
      if (idx === -1) {
        if (users.some((u) => u.email?.toLowerCase() === demo.email.toLowerCase())) return;
        users.push({ ...demo });
        changed = true;
      } else if (!users[idx].demo) {
        users[idx] = { ...users[idx], ...demo };
        delete users[idx].password;
        changed = true;
      }
    });
    if (changed) this.saveUsers(users);
  },

  /**
   * Contas que podem entrar pelo botão "Entrar como demo".
   */
  getDemoAccounts() {
    if (!LALA_CONFIG.DEMO_MODE) return [];
    return this.getUsers().filter((u) => u.demo && u.demoLogin);
  },

  /**
   * Entra como uma conta demo, sem senha. Só funciona com DEMO_MODE ativo.
   */
  loginAsDemo(userId) {
    const user = this.getDemoAccounts().find((u) => u.id === userId);
    if (!user) return { success: false, message: I18n.t('auth.demoUnavailable') };
    this.startSession(user);
    return { success: true, message: I18n.t('auth.demoSignedIn', { name: user.name }), user };
  },

  startSession(user) {
    const session = {
      userId: user.id,
      type: user.type,
      name: user.name,
      email: user.email,
      loginAt: new Date().toISOString(),
    };
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
  },

  PBKDF2_ITERATIONS: 100000,

  // ---- Hash de senha (paliativo, ver aviso no topo) ----

  _bytesToHex(bytes) {
    return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
  },

  generateSalt() {
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    return this._bytesToHex(salt);
  },

  /**
   * Gera o hash PBKDF2-SHA256 de uma senha com o salt informado (hex).
   * @returns {Promise<string>} hash em hexadecimal
   */
  async hashPassword(password, salt) {
    if (!globalThis.crypto?.subtle) {
      throw new Error(I18n.t('auth.cryptoUnavailable'));
    }
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
      'deriveBits',
    ]);
    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt: enc.encode(salt),
        iterations: this.PBKDF2_ITERATIONS,
      },
      key,
      256
    );
    return this._bytesToHex(bits);
  },

  async _credentialsFor(password) {
    const passwordSalt = this.generateSalt();
    const passwordHash = await this.hashPassword(password, passwordSalt);
    return { passwordHash, passwordSalt };
  },

  /**
   * Confere a senha. Aceita contas antigas com `password` em texto puro e,
   * nesse caso, já migra para hash (o chamador deve salvar o usuário).
   */
  async verifyPassword(user, password) {
    if (user.passwordHash && user.passwordSalt) {
      const hash = await this.hashPassword(password, user.passwordSalt);
      return hash === user.passwordHash;
    }
    if (typeof user.password === 'string' && user.password === password) {
      Object.assign(user, await this._credentialsFor(password));
      delete user.password;
      return true;
    }
    return false;
  },

  // ---- Verificação de código LALA ----

  /**
   * Normaliza um nome para comparação: sem acentos, minúsculo e com espaços simples.
   */
  normalizeName(name) {
    return String(name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  },

  /**
   * Indica se um código já foi usado por alguma conta cadastrada.
   */
  isCodeRegistered(code) {
    const normalized = String(code || '')
      .trim()
      .toUpperCase();
    return this.getUsers().some((u) => u.verificationCode === normalized);
  },

  /**
   * Verifica um código LALA e, se `checkName` for true, confere se o nome
   * informado corresponde ao nome registrado (ignorando acentos e caixa).
   * @returns {{ valid: boolean, message: string, data?: object }}
   */
  verifyLaliderCode(code, name, { checkName = true } = {}) {
    const normalized = String(code || '')
      .trim()
      .toUpperCase();
    const entry = MockDB.verificationCodes.find((v) => v.code.toUpperCase() === normalized);

    if (!entry) {
      return {
        valid: false,
        message: I18n.t('auth.invalidCode'),
      };
    }

    if (this.isCodeRegistered(normalized)) {
      return {
        valid: false,
        message: I18n.t('auth.codeUsed'),
      };
    }

    if (checkName && this.normalizeName(name) !== this.normalizeName(entry.name)) {
      return {
        valid: false,
        message: I18n.t('auth.nameMismatch'),
      };
    }

    return {
      valid: true,
      message: I18n.t('auth.codeVerified'),
      data: {
        code: entry.code,
        camp: entry.camp,
        country: entry.country,
        // O nome oficial só é devolvido a quem já provou que o conhece.
        ...(checkName ? { registeredName: entry.name } : {}),
      },
    };
  },

  /**
   * Get all registered users
   */
  getUsers() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
  },

  /**
   * Save users to storage
   */
  saveUsers(users) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
  },

  MIN_PASSWORD_LENGTH: 6,

  /**
   * Validação básica dos dados de cadastro (os formulários também validam,
   * mas a camada de dados não deve confiar só no HTML).
   * @returns {string|null} mensagem de erro ou null
   */
  _validateAccount({ name, email, password }) {
    if (!String(name || '').trim()) return I18n.t('auth.nameRequired');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())) {
      return I18n.t('auth.emailInvalid');
    }
    if (String(password || '').length < this.MIN_PASSWORD_LENGTH) {
      return I18n.t('auth.passwordShort', { min: this.MIN_PASSWORD_LENGTH });
    }
    return null;
  },

  _emailTaken(users, email) {
    return users.some((u) => u.email?.toLowerCase() === email.toLowerCase());
  },

  /**
   * Register a new Lalíder
   */
  async registerLalider({
    name,
    email,
    password,
    verificationCode,
    camp,
    country,
    state,
    showerSong,
    areaOfInterest,
    needDescription,
  }) {
    const invalid = this._validateAccount({ name, email, password });
    if (invalid) return { success: false, message: invalid };
    name = name.trim();
    email = email.trim();

    // O hash é assíncrono: calcula antes de ler os usuários, para que a
    // checagem de duplicidade e a gravação aconteçam sem intervalo entre si.
    const credentials = await this._credentialsFor(password);

    const verification = this.verifyLaliderCode(verificationCode, name);
    if (!verification.valid) {
      return { success: false, message: verification.message };
    }

    // Guarda o nome com a grafia registrada na LALA (acentos e maiúsculas).
    name = verification.data.registeredName;

    const users = this.getUsers();
    if (this._emailTaken(users, email)) {
      return { success: false, message: I18n.t('auth.emailTaken') };
    }

    const user = {
      id: 'lalider-' + Date.now(),
      type: 'lalider',
      name,
      email,
      ...credentials,
      verificationCode: verificationCode.trim().toUpperCase(),
      camp,
      country,
      state: state || '',
      showerSong: showerSong || '',
      areaOfInterest: areaOfInterest || '',
      needDescription: needDescription || '',
      verified: true,
      createdAt: new Date().toISOString(),
    };

    users.push(user);
    this.saveUsers(users);

    return { success: true, message: I18n.t('auth.welcomeLalider'), user };
  },

  /**
   * Register a new Donor
   */
  async registerDonor({ name, email, password, country, organization }) {
    const invalid = this._validateAccount({ name, email, password });
    if (invalid) return { success: false, message: invalid };
    name = name.trim();
    email = email.trim();

    const credentials = await this._credentialsFor(password);

    const users = this.getUsers();
    if (this._emailTaken(users, email)) {
      return { success: false, message: I18n.t('auth.emailTaken') };
    }

    const user = {
      id: 'donor-' + Date.now(),
      type: 'donor',
      name,
      email,
      ...credentials,
      country,
      organization: organization || '',
      createdAt: new Date().toISOString(),
    };

    users.push(user);
    this.saveUsers(users);

    return { success: true, message: I18n.t('auth.welcomeDonor'), user };
  },

  /**
   * Login a user
   */
  async login(email, password) {
    const wanted = String(email || '')
      .trim()
      .toLowerCase();
    const candidate = this.getUsers().find((u) => u.email?.toLowerCase() === wanted);
    const hadLegacyPassword = typeof candidate?.password === 'string';

    if (!candidate || !(await this.verifyPassword(candidate, password))) {
      return { success: false, message: I18n.t('auth.invalidLogin') };
    }

    const user = candidate;
    if (hadLegacyPassword) {
      // Persiste a migração da senha legada relendo os dados após o await.
      const users = this.getUsers();
      const idx = users.findIndex((u) => u.id === candidate.id);
      if (idx !== -1) {
        users[idx] = candidate;
        this.saveUsers(users);
      }
    }

    this.startSession(user);

    return { success: true, message: I18n.t('auth.welcomeBack', { name: user.name }), user };
  },

  /**
   * Logout current user
   */
  logout() {
    localStorage.removeItem(this.SESSION_KEY);
  },

  /**
   * Get current session
   */
  getSession() {
    const session = localStorage.getItem(this.SESSION_KEY);
    return session ? JSON.parse(session) : null;
  },

  /**
   * Get current logged-in user data
   */
  getCurrentUser() {
    const session = this.getSession();
    if (!session) return null;

    const users = this.getUsers();
    return users.find((u) => u.id === session.userId) || null;
  },

  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    // Uma sessão que aponta para uma conta inexistente não conta como login.
    return this.getCurrentUser() !== null;
  },

  /**
   * Check if current user is a Lalíder
   */
  isLalider() {
    return this.getCurrentUser()?.type === 'lalider';
  },

  /**
   * Check if current user is a Donor
   */
  isDonor() {
    return this.getCurrentUser()?.type === 'donor';
  },

  /**
   * Indica se o usuário com esse id existe e tem o papel informado.
   * O papel vem do cadastro, não da sessão (que é editável no DevTools).
   */
  hasRole(userId, role) {
    return this.getUsers().some((u) => u.id === userId && u.type === role);
  },

  /**
   * Require authentication — redirect to login if not logged in
   */
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },
};

// Initialize on load
Auth.init();

// Make available globally
window.Auth = Auth;
