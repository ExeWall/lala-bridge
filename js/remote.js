/**
 * LALA Bridge — backend Supabase
 *
 * Mesma interface do LocalApi (js/api.js), mas falando com o Supabase:
 *   - Auth do Supabase (e-mail e senha); o perfil é criado no servidor.
 *   - Leituras: Remote.pull() busca o que as regras de acesso (RLS) permitem
 *     e grava no Store em memória, no mesmo formato do modo local. Assim as
 *     telas não precisam saber de onde os dados vêm.
 *   - Escritas: funções do servidor (RPC) e, em seguida, um novo pull().
 *   - Erros do servidor vêm como chaves de tradução (ex.: 'offers.needClosed').
 *
 * Só é carregado quando LALA_CONFIG.BACKEND === 'supabase'.
 */

const Remote = {
  client: null,
  session: null,
  ready: null,
  PHOTO_BUCKET: 'donation-photos',
  IMPACT_BUCKET: 'impact-photos',

  // ------------------------------------------------------------- iniciar
  _loadSdk() {
    if (window.supabase?.createClient) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'js/vendor/supabase.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Falha ao carregar o SDK do Supabase'));
      document.head.appendChild(script);
    });
  },

  init() {
    if (this.ready) return this.ready;
    this.ready = (async () => {
      await this._loadSdk();
      this.client = window.supabase.createClient(
        LALA_CONFIG.SUPABASE_URL,
        LALA_CONFIG.SUPABASE_ANON_KEY,
        { auth: { persistSession: true, autoRefreshToken: true } }
      );
      const { data } = await this.client.auth.getSession();
      this.session = data.session;
      await this.pull();
      this.client.auth.onAuthStateChange(async (_event, session) => {
        const changed = session?.user?.id !== this.session?.user?.id;
        this.session = session;
        if (changed) {
          await this.pull();
          if (typeof App !== 'undefined') App.refresh();
        }
      });
    })().catch((err) => {
      console.error('Supabase indisponível:', err);
      if (typeof App !== 'undefined') App.showToast?.(I18n.t('remote.offline'), 'error');
    });
    return this.ready;
  },

  me() {
    return Auth.getCurrentUser();
  },

  // -------------------------------------------------------------- erros
  _message(error) {
    const raw = String(error?.message || error || '');
    const key = raw.match(/[a-zA-Z]+\.[a-zA-Z]+/)?.[0];
    if (key && I18n.has(key)) return I18n.t(key);
    if (/Invalid login credentials/i.test(raw)) return I18n.t('auth.invalidLogin');
    if (/already registered|already been registered/i.test(raw)) return I18n.t('auth.emailTaken');
    if (/Password should be/i.test(raw))
      return I18n.t('auth.passwordShort', { min: Auth.MIN_PASSWORD_LENGTH });
    return I18n.t('remote.genericError');
  },

  _fail(error) {
    return { success: false, message: this._message(error) };
  },

  async _rpc(name, params, successKey) {
    const { data, error } = await this.client.rpc(name, params);
    if (error) return this._fail(error);
    await this.pull();
    return { success: true, message: successKey ? I18n.t(successKey) : '', data };
  },

  /**
   * Chama uma Edge Function. Devolve { data } ou { errorKey } (chave de i18n).
   * Aceita JSON ou FormData no corpo.
   */
  async invoke(name, body) {
    try {
      const { data, error } = await this.client.functions.invoke(name, { body });
      if (!error) return { data };
      let key = 'ai.unavailable';
      try {
        const payload = await error.context?.json?.();
        if (payload?.error) key = payload.error;
      } catch {
        /* resposta sem JSON */
      }
      return { errorKey: key };
    } catch {
      return { errorKey: 'ai.unavailable' };
    }
  },

  // --------------------------------------------- conversão de formatos
  photoUrl(path) {
    if (!path || /^(data:|https?:)/.test(path)) return path;
    return this.client.storage.from(this.PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
  },

  mapProfile(p, full = false) {
    const base = {
      id: p.id,
      type: p.role,
      name: p.display_name,
      organization: p.organization || '',
      country: p.country,
      state: p.state,
      camp: p.camp,
      verified: p.verified,
    };
    if (!full) return base;
    return {
      ...base,
      name: p.full_name,
      email: p.email,
      city: p.city,
      areaOfInterest: p.area_of_interest,
      showerSong: p.shower_song,
      verificationCode: p.verification_code,
      consentAt: p.consent_at,
      consentVersion: p.consent_version,
      createdAt: p.created_at,
    };
  },

  mapDonation(d) {
    return {
      id: d.id,
      donorId: d.donor_id,
      donorName: d.donor_name,
      category: d.category,
      title: d.title,
      description: d.description,
      condition: d.condition,
      specs: d.specs || {},
      aiSuggestion: d.ai_suggestion,
      photos: (d.photos || []).map((p) => this.photoUrl(p)),
      country: d.country,
      state: d.state,
      city: d.city,
      status: d.status,
      matchedTo: d.matched_to,
      offerId: d.offer_id,
      matchedAt: d.matched_at,
      deliveredAt: d.delivered_at,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    };
  },

  mapNeed(n) {
    return {
      id: n.id,
      laliderId: n.lalider_id,
      laliderName: n.lalider_name,
      camp: n.camp,
      country: n.country,
      state: n.state,
      category: n.category,
      title: n.title,
      description: n.description,
      intendedUse: n.intended_use,
      requirements: n.requirements || {},
      aiSuggestion: n.ai_suggestion,
      urgency: n.urgency,
      status: n.status,
      matchedDonorId: n.matched_donor_id,
      matchedDonationId: n.matched_donation_id,
      offerId: n.offer_id,
      matchedAt: n.matched_at,
      deliveredAt: n.delivered_at,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    };
  },

  mapOffer(o) {
    return {
      id: o.id,
      needId: o.need_id,
      donationId: o.donation_id,
      donorId: o.donor_id,
      laliderId: o.lalider_id,
      initiatedBy: o.initiated_by,
      message: o.message,
      status: o.status,
      closedReason: o.closed_reason,
      acceptedAt: o.accepted_at,
      deliveredAt: o.delivered_at,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
    };
  },

  mapImpact(i) {
    return {
      id: i.id,
      offerId: i.offer_id,
      authorId: i.author_id,
      text: i.text,
      photo: i.photo,
      summary: i.summary,
      createdAt: i.created_at,
    };
  },

  // ------------------------------------------------------------- leitura
  /** Busca tudo o que a pessoa pode ver e grava no Store em memória. */
  async pull() {
    const db = this.client;
    const uid = this.session?.user?.id || null;
    const cols = '*';
    const [profiles, donations, needs] = await Promise.all([
      db.from('public_profiles').select('*'),
      db.from('donations').select(cols).order('created_at', { ascending: false }),
      db.from('needs').select(cols).order('created_at', { ascending: false }),
    ]);
    const users = (profiles.data || []).map((p) => this.mapProfile(p));

    let offers = [];
    let impact = [];
    if (uid) {
      const [mine, offerRows, impactRows] = await Promise.all([
        db.from('profiles').select('*').eq('id', uid).maybeSingle(),
        db.from('offers').select('*').order('updated_at', { ascending: false }),
        db.from('impact_updates').select('*').order('created_at', { ascending: false }),
      ]);
      if (mine.data) {
        const full = this.mapProfile(mine.data, true);
        const idx = users.findIndex((u) => u.id === uid);
        if (idx === -1) users.push(full);
        else users[idx] = full;
      }
      offers = (offerRows.data || []).map((o) => this.mapOffer(o));

      // Similaridade semântica (embeddings) dos meus pedidos/doações, para o matching.
      const { data: sims } = await db.rpc('semantic_scores');
      const simMap = {};
      (sims || []).forEach((r) => {
        simMap[`${r.need_id}|${r.donation_id}`] = r.similarity;
      });
      Store.set(Matching.SIMILARITY_KEY, simMap);
      impact = (impactRows.data || []).map((i) => this.mapImpact(i));

      // Contatos da outra parte, só nas ofertas aceitas ou entregues.
      const visible = offers.filter((o) => ['accepted', 'delivered'].includes(o.status));
      const contacts = await Promise.all(
        visible.map((o) => db.rpc('get_offer_contact', { p_offer_id: o.id }))
      );
      contacts.forEach(({ data }, i) => {
        if (!data) return;
        const o = visible[i];
        const otherId = o.donorId === uid ? o.laliderId : o.donorId;
        const user = users.find((u) => u.id === otherId);
        if (user) Object.assign(user, { name: data.name, email: data.email });
      });
    }

    Store.set(Auth.STORAGE_KEY, users);
    Store.set(
      Donations.STORAGE_KEY,
      (donations.data || []).map((d) => this.mapDonation(d))
    );
    Store.set(
      Donations.NEEDS_KEY,
      (needs.data || []).map((n) => this.mapNeed(n))
    );
    Store.set(Offers.STORAGE_KEY, offers);
    Store.set(Impact.STORAGE_KEY, impact);
    const me = users.find((u) => u.id === uid);
    if (me) Store.set(Auth.SESSION_KEY, { userId: me.id, type: me.type, name: me.name });
    else Store.remove(Auth.SESSION_KEY);
  },

  // --------------------------------------------------------------- conta
  async checkLaliderCode(code) {
    const { data, error } = await this.client.rpc('check_lalider_code', { p_code: code });
    if (error) return { valid: false, message: this._message(error) };
    if (!data.valid) return { valid: false, message: I18n.t(data.error) };
    return { valid: true, message: I18n.t('auth.codeVerified'), data };
  },

  async _signUp(data, meta) {
    const invalid = Auth._validateAccount(data);
    if (invalid) return { success: false, message: invalid };
    if (data.consent !== true) return { success: false, message: I18n.t('consent.required') };
    const { error: locationError, location } = Auth._validateLocation(data);
    if (locationError) return { success: false, message: locationError };

    const { data: res, error } = await this.client.auth.signUp({
      email: data.email.trim(),
      password: data.password,
      options: {
        data: {
          ...meta,
          ...location,
          full_name: data.name.trim(),
          consent: true,
          consent_version: Auth.PRIVACY_POLICY_VERSION,
          device_id: Trust.deviceId(),
        },
      },
    });
    if (error) return this._fail(error);
    this.session = res.session;
    if (!res.session) {
      // Projeto com confirmação de e-mail ativada.
      return { success: true, needsConfirmation: true, message: I18n.t('auth.checkEmail') };
    }
    await this.pull();
    return {
      success: true,
      user: this.me(),
      message: I18n.t(meta.role === 'lalider' ? 'auth.welcomeLalider' : 'auth.welcomeDonor'),
    };
  },

  async registerLalider(data) {
    const check = await this.client.rpc('check_lalider_code', {
      p_code: data.verificationCode,
      p_name: data.name,
    });
    if (check.error) return this._fail(check.error);
    if (!check.data.valid) return { success: false, message: I18n.t(check.data.error) };
    return this._signUp(data, {
      role: 'lalider',
      verification_code: data.verificationCode,
      area_of_interest: data.areaOfInterest || '',
      shower_song: data.showerSong || '',
    });
  },

  registerDonor(data) {
    return this._signUp(data, { role: 'donor', organization: data.organization || '' });
  },

  async login(email, password) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: String(email || '').trim(),
      password,
    });
    if (error) return this._fail(error);
    this.session = data.session;
    await this.pull();
    const user = this.me();
    return { success: true, user, message: I18n.t('auth.welcomeBack', { name: user?.name || '' }) };
  },

  /** Contas demo do Supabase (criadas por scripts/seed-demo.js). */
  getDemoAccounts() {
    if (!LALA_CONFIG.DEMO_MODE || !LALA_CONFIG.DEMO_PASSWORD) return [];
    return MockDB.demoUsers.filter((u) => u.demoLogin);
  },

  async loginAsDemo(userId) {
    const account = this.getDemoAccounts().find((u) => u.id === userId);
    if (!account) return { success: false, message: I18n.t('auth.demoUnavailable') };
    const result = await this.login(account.email, LALA_CONFIG.DEMO_PASSWORD);
    if (result.success) result.message = I18n.t('auth.demoSignedIn', { name: account.name });
    return result;
  },

  async logout() {
    await this.client.auth.signOut();
    this.session = null;
    await this.pull();
    return { success: true };
  },

  // ------------------------------------------------------ doações e pedidos
  async createDonation(fields) {
    const uid = this.session?.user?.id;
    const { data, error } = await this.client
      .from('donations')
      .insert({
        donor_id: uid,
        category: fields.category,
        title: fields.title,
        description: fields.description || '',
        condition: fields.condition,
        specs: fields.specs || {},
        ai_suggestion: fields.aiSuggestion || null,
        photos: fields.photos || [],
        country: fields.country,
        state: fields.state,
        city: fields.city,
      })
      .select()
      .single();
    if (error) return this._fail(error);
    await this.pull();
    AI.embed('donation', data.id);
    return { success: true, message: I18n.t('donate.published'), donation: this.mapDonation(data) };
  },

  async createNeed(fields) {
    const uid = this.session?.user?.id;
    const { data, error } = await this.client
      .from('needs')
      .insert({
        lalider_id: uid,
        category: fields.category,
        title: fields.title,
        description: fields.description || '',
        intended_use: fields.intendedUse || '',
        requirements: fields.requirements || {},
        ai_suggestion: fields.aiSuggestion || null,
        urgency: fields.urgency || 'medium',
      })
      .select()
      .single();
    if (error) return this._fail(error);
    await this.pull();
    AI.embed('need', data.id); // matching semântico e detecção de duplicados (segundo plano)
    return { success: true, message: I18n.t('request.submitted'), need: this.mapNeed(data) };
  },

  async uploadDonationPhotos(files) {
    const uid = this.session?.user?.id;
    const paths = [];
    for (const file of files) {
      const blob = await Photos.compress(file, Photos.REMOTE_OPTIONS);
      const path = `${uid}/${newId('foto')}.jpg`;
      const { error } = await this.client.storage
        .from(this.PHOTO_BUCKET)
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (error) return this._fail(error);
      paths.push(path);
    }
    return { success: true, photos: paths };
  },

  // ---------------------------------------------------------------- ofertas
  offerHelp({ needId, donationId = null, message = '' }) {
    return this._rpc(
      'offer_help',
      { p_need_id: needId, p_donation_id: donationId, p_message: message },
      'offers.sent'
    );
  },

  requestDonation({ donationId, needId = null, message = '' }) {
    return this._rpc(
      'request_donation',
      { p_donation_id: donationId, p_need_id: needId, p_message: message },
      'offers.requestSent'
    );
  },

  respondOffer(offerId, decision) {
    return this._rpc(
      'respond_offer',
      { p_offer_id: offerId, p_decision: decision },
      decision === 'accept' ? 'offers.accepted' : 'offers.declined'
    );
  },

  markDelivered(offerId) {
    return this._rpc('mark_delivered', { p_offer_id: offerId }, 'offers.delivered');
  },

  async cancelOffer(offerId) {
    const before = Offers.getById(offerId);
    return this._rpc(
      'cancel_offer',
      { p_offer_id: offerId },
      before?.status === 'accepted' ? 'offers.matchCancelled' : 'offers.withdrawn'
    );
  },

  // ----------------------------------------------------------------- admin
  async adminData() {
    if (!Auth.isAdmin()) return { success: false, message: I18n.t('admin.onlyAdmin') };
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [flags, codes, usage] = await Promise.all([
      this.client.from('flags').select('*').order('created_at', { ascending: false }),
      this.client.from('verification_codes').select('*').order('code'),
      this.client.from('ai_usage').select('*').gte('created_at', since),
    ]);
    const error = flags.error || codes.error || usage.error;
    if (error) return this._fail(error);
    return {
      success: true,
      flags: (flags.data || []).map((f) => ({
        id: f.id,
        entityType: f.entity_type,
        entityId: f.entity_id,
        reason: f.reason,
        score: Number(f.score),
        details: f.details || {},
        status: f.status,
        reviewedAt: f.reviewed_at,
        createdAt: f.created_at,
      })),
      codes: (codes.data || []).map((c) => ({
        code: c.code,
        name: c.registered_name,
        camp: c.camp,
        country: c.country,
        usedBy: c.used_by,
      })),
      aiUsage: (usage.data || []).map((u) => ({
        functionName: u.function_name,
        model: u.model,
        costUsd: Number(u.cost_usd),
        ok: u.ok,
        createdAt: u.created_at,
      })),
    };
  },

  async reviewFlag(flagId, status) {
    const { error } = await this.client
      .from('flags')
      .update({
        status,
        reviewed_by: this.session?.user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', flagId);
    if (error) return this._fail(error);
    return { success: true, message: I18n.t('admin.flagReviewed') };
  },

  async addVerificationCodes(rows) {
    const clean = rows
      .map((r) => ({
        code: String(r.code || '')
          .trim()
          .toUpperCase(),
        registered_name: String(r.name || '').trim(),
        camp: String(r.camp || '').trim(),
        country: String(r.country || 'BR')
          .trim()
          .toUpperCase(),
      }))
      .filter((r) => r.code && r.registered_name);
    const { data, error } = await this.client
      .from('verification_codes')
      .upsert(clean, { onConflict: 'code', ignoreDuplicates: true })
      .select();
    if (error) return this._fail(error);
    const count = data?.length || 0;
    return { success: true, added: count, message: I18n.t('admin.codesAdded', { count }) };
  },

  // ------------------------------------------------------------------ LGPD
  async exportMyData() {
    const { data, error } = await this.client.rpc('export_my_data');
    if (error) return this._fail(error);
    return { success: true, data };
  },

  async deleteMyAccount() {
    const { error } = await this.client.rpc('delete_my_account');
    if (error) return this._fail(error);
    await this.client.auth.signOut();
    this.session = null;
    Store.clearMemory();
    return { success: true, message: I18n.t('myData.deleted') };
  },
};

window.Remote = Remote;
