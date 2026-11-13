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
   * Initialize the auth system
   */
  init() {
    // Seed with some demo users if empty
    if (!localStorage.getItem(this.STORAGE_KEY)) {
      const demoUsers = [
        {
          id: 'donor-001',
          type: 'donor',
          name: 'Tech Corp Foundation',
          email: 'techcorp@example.com',
          password: 'demo123',
          country: 'United States',
          organization: 'Tech Corp',
          createdAt: '2026-09-01T00:00:00Z',
        },
        {
          id: 'donor-002',
          type: 'donor',
          name: 'Sarah Mitchell',
          email: 'sarah@example.com',
          password: 'demo123',
          country: 'Canada',
          organization: '',
          createdAt: '2026-09-05T00:00:00Z',
        },
      ];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(demoUsers));
    }
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
      throw new Error('crypto.subtle indisponível: abra o app via http://localhost ou HTTPS.');
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
    // Verify the code first
    const verification = verifyLaliderCode(verificationCode, name);
    if (!verification.valid) {
      return { success: false, message: verification.message };
    }

    // Check if email already exists
    const users = this.getUsers();
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: 'An account with this email already exists.' };
    }

    // Check if code already used by a registered user
    if (users.find((u) => u.verificationCode === verificationCode.toUpperCase())) {
      return { success: false, message: 'This verification code has already been registered.' };
    }

    const user = {
      id: 'lalider-' + Date.now(),
      type: 'lalider',
      name,
      email,
      ...(await this._credentialsFor(password)),
      verificationCode: verificationCode.toUpperCase(),
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
    markCodeAsUsed(verificationCode);

    return { success: true, message: 'Welcome to LALA Bridge! 🎉', user };
  },

  /**
   * Register a new Donor
   */
  async registerDonor({ name, email, password, country, organization }) {
    const users = this.getUsers();

    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: 'An account with this email already exists.' };
    }

    const user = {
      id: 'donor-' + Date.now(),
      type: 'donor',
      name,
      email,
      ...(await this._credentialsFor(password)),
      country,
      organization: organization || '',
      createdAt: new Date().toISOString(),
    };

    users.push(user);
    this.saveUsers(users);

    return { success: true, message: 'Welcome, generous donor! 💝', user };
  },

  /**
   * Login a user
   */
  async login(email, password) {
    const users = this.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());

    if (!user || !(await this.verifyPassword(user, password))) {
      return { success: false, message: 'Invalid email or password.' };
    }
    this.saveUsers(users); // persiste a migração de senha legada, se houver

    // Create session
    const session = {
      userId: user.id,
      type: user.type,
      name: user.name,
      email: user.email,
      loginAt: new Date().toISOString(),
    };

    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));

    return { success: true, message: `Welcome back, ${user.name}!`, user };
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
    return this.getSession() !== null;
  },

  /**
   * Check if current user is a Lalíder
   */
  isLalider() {
    const session = this.getSession();
    return session?.type === 'lalider';
  },

  /**
   * Check if current user is a Donor
   */
  isDonor() {
    const session = this.getSession();
    return session?.type === 'donor';
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
