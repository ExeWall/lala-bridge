/**
 * LALA Bridge — interface única de dados para as páginas
 *
 * As páginas chamam sempre Api.* (assíncrono). Por baixo:
 *   - modo local: LocalApi usa Auth, Donations, Offers e Privacy (localStorage);
 *   - modo Supabase: Remote (js/remote.js) chama o servidor e atualiza o cache.
 *
 * Toda operação devolve { success, message, ...dados }. As leituras continuam
 * síncronas (Donations.getAll, Offers.getForUser...), lendo o Store.
 */

const LocalApi = {
  ready: Promise.resolve(),

  me() {
    return Auth.getCurrentUser();
  },

  _wrap(fn) {
    try {
      return Promise.resolve(fn());
    } catch (err) {
      return Promise.resolve({ success: false, message: err.message });
    }
  },

  // ---------------------------------------------------------------- conta
  checkLaliderCode(code) {
    return this._wrap(() => Auth.verifyLaliderCode(code, null, { checkName: false }));
  },

  async registerLalider(data) {
    const result = await Auth.registerLalider(data);
    if (result.success) Auth.startSession(result.user);
    return result;
  },

  async registerDonor(data) {
    const result = await Auth.registerDonor(data);
    if (result.success) Auth.startSession(result.user);
    return result;
  },

  login(email, password) {
    return Auth.login(email, password);
  },

  loginAsDemo(userId) {
    return this._wrap(() => Auth.loginAsDemo(userId));
  },

  getDemoAccounts() {
    return Auth.getDemoAccounts();
  },

  logout() {
    Auth.logout();
    return Promise.resolve({ success: true });
  },

  // ------------------------------------------------------ doações e pedidos
  createDonation(fields) {
    return this._wrap(() => {
      const user = this.me();
      const donation = Donations.create({
        ...fields,
        donorId: user?.id,
        donorName: user?.organization || user?.name,
      });
      Trust.scanDonation(donation);
      return { success: true, message: I18n.t('donate.published'), donation };
    });
  },

  createNeed(fields) {
    return this._wrap(() => {
      const user = this.me();
      const need = Donations.createNeed({
        ...fields,
        laliderId: user?.id,
        laliderName: App.displayName(user),
        camp: user?.camp,
        country: user?.country,
        state: user?.state,
        city: user?.city,
      });
      Trust.scanNeed(need);
      return { success: true, message: I18n.t('request.submitted'), need };
    });
  },

  /** Comprime as fotos e devolve data URLs (no modo local ficam no navegador). */
  async uploadDonationPhotos(files) {
    const photos = [];
    for (const file of files) photos.push(await Photos.compress(file, Photos.LOCAL_OPTIONS));
    return { success: true, photos };
  },

  // ---------------------------------------------------------------- ofertas
  offerHelp({ needId, donationId = null, message = '' }) {
    return this._wrap(() =>
      Offers.offerHelp({ donorId: this.me()?.id, needId, donationId, message })
    );
  },

  requestDonation({ donationId, needId = null, message = '' }) {
    return this._wrap(() =>
      Offers.requestDonation({ laliderId: this.me()?.id, donationId, needId, message })
    );
  },

  respondOffer(offerId, decision) {
    return this._wrap(() => Offers.respond(offerId, this.me()?.id, decision));
  },

  markDelivered(offerId) {
    return this._wrap(() => Offers.markDelivered(offerId, this.me()?.id));
  },

  cancelOffer(offerId) {
    return this._wrap(() => Offers.cancel(offerId, this.me()?.id));
  },

  // ----------------------------------------------------------------- admin
  _requireAdmin() {
    if (!Auth.isAdmin()) throw new Error(I18n.t('admin.onlyAdmin'));
  },

  adminData() {
    return this._wrap(() => {
      this._requireAdmin();
      const users = Auth.getUsers();
      const usedBy = new Map(
        users.filter((u) => u.verificationCode).map((u) => [u.verificationCode, u])
      );
      return {
        success: true,
        flags: Trust.getFlags(),
        codes: Auth.getVerificationCodes().map((c) => ({
          ...c,
          usedBy: usedBy.get(c.code.toUpperCase())?.id || null,
        })),
        aiUsage: Store.get('lala_bridge_ai_usage', []),
      };
    });
  },

  reviewFlag(flagId, status) {
    return this._wrap(() => {
      this._requireAdmin();
      const flag = Trust.reviewFlag(flagId, status, this.me().id);
      return flag
        ? { success: true, message: I18n.t('admin.flagReviewed'), flag }
        : { success: false, message: I18n.t('remote.genericError') };
    });
  },

  addVerificationCodes(rows) {
    return this._wrap(() => {
      this._requireAdmin();
      const added = Auth.addVerificationCodes(rows);
      return {
        success: true,
        added: added.length,
        message: I18n.t('admin.codesAdded', { count: added.length }),
      };
    });
  },

  // ------------------------------------------------------------------ LGPD
  exportMyData() {
    return this._wrap(() => {
      const data = Privacy.exportData(this.me()?.id);
      return data
        ? { success: true, data }
        : { success: false, message: I18n.t('auth.invalidLogin') };
    });
  },

  deleteMyAccount() {
    return this._wrap(() => Privacy.deleteAccount(this.me()?.id));
  },
};

/** Implementação ativa, escolhida pela configuração (LALA_CONFIG.BACKEND). */
const Api = new Proxy(
  {},
  {
    get(_target, prop) {
      const impl =
        LALA_CONFIG.BACKEND === 'supabase' && typeof Remote !== 'undefined' ? Remote : LocalApi;
      const value = impl[prop];
      return typeof value === 'function' ? value.bind(impl) : value;
    },
  }
);

window.LocalApi = LocalApi;
window.Api = Api;
