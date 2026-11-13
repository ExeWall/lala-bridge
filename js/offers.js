/**
 * LALA Bridge — Ofertas (fluxo de match)
 *
 * Uma oferta liga um doador a um Lalíder em torno de um pedido (need),
 * de uma doação (donation) ou dos dois:
 *   - Doador → "Offer to Help" em um pedido: initiatedBy = 'donor'.
 *   - Lalíder → "Request" em uma doação: initiatedBy = 'lalider'.
 *
 * Ciclo de vida: pending → accepted | declined; accepted → delivered.
 * Uma oferta pendente pode ser retirada por quem enviou, e um match aceito
 * pode ser cancelado por qualquer parte (ambos viram 'declined', com o
 * motivo em closedReason: declined | superseded | withdrawn | cancelled).
 * Quem recebe a oferta decide (humano no circuito). Os contatos das duas
 * partes só são revelados depois que a oferta é aceita.
 *
 * Formato: { id, needId, donationId, donorId, laliderId, initiatedBy,
 *            message, status, closedReason?, createdAt, updatedAt,
 *            acceptedAt?, deliveredAt? }
 */

const Offers = {
  STORAGE_KEY: 'lala_bridge_offers',
  STATUSES: ['pending', 'accepted', 'declined', 'delivered'],

  init() {
    if (LALA_CONFIG.DEMO_MODE && !localStorage.getItem(this.STORAGE_KEY)) {
      this._save(MockDB.sampleOffers.map((o) => ({ ...o })));
    }
  },

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  },

  _save(offers) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(offers));
  },

  _update(id, patch) {
    const offers = this.getAll();
    const idx = offers.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    offers[idx] = { ...offers[idx], ...patch, updatedAt: new Date().toISOString() };
    this._save(offers);
    return offers[idx];
  },

  _newId() {
    return newId('offer');
  },

  getById(id) {
    return this.getAll().find((o) => o.id === id) || null;
  },

  /** Ofertas em que o usuário é uma das partes. */
  getForUser(userId) {
    return this.getAll()
      .filter((o) => o.donorId === userId || o.laliderId === userId)
      .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
  },

  /** Id de quem precisa responder à oferta. */
  getRecipientId(offer) {
    return offer.initiatedBy === 'donor' ? offer.laliderId : offer.donorId;
  },

  /** Ofertas pendentes aguardando resposta deste usuário. */
  getPendingFor(userId) {
    return this.getForUser(userId).filter(
      (o) => o.status === 'pending' && this.getRecipientId(o) === userId
    );
  },

  /** Oferta pendente já enviada por este usuário para o mesmo item, se existir. */
  findPendingFrom(userId, { needId = null, donationId = null } = {}) {
    return (
      this.getAll().find((o) => {
        if (o.status !== 'pending') return false;
        const initiator = o.initiatedBy === 'donor' ? o.donorId : o.laliderId;
        if (initiator !== userId) return false;
        return (needId && o.needId === needId) || (donationId && o.donationId === donationId);
      }) || null
    );
  },

  _fail(message) {
    return { success: false, message };
  },

  _create(fields) {
    const now = new Date().toISOString();
    const offer = {
      id: this._newId(),
      needId: null,
      donationId: null,
      message: '',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      ...fields,
    };
    const offers = this.getAll();
    offers.unshift(offer);
    this._save(offers);
    return offer;
  },

  /**
   * Doador oferece ajuda a um pedido. `donationId` é opcional: se informado,
   * precisa ser uma doação disponível do próprio doador.
   */
  offerHelp({ donorId, needId, donationId = null, message = '' }) {
    if (!Auth.hasRole(donorId, 'donor')) return this._fail(I18n.t('offers.onlyDonors'));
    const need = Donations.getNeedById(needId);
    if (!need) return this._fail(I18n.t('offers.needNotFound'));
    if (need.status !== 'open') return this._fail(I18n.t('offers.needClosed'));

    if (donationId) {
      const donation = Donations.getById(donationId);
      if (!donation || donation.donorId !== donorId)
        return this._fail(I18n.t('offers.donationNotFound'));
      if (donation.status !== 'available') return this._fail(I18n.t('offers.donationUnavailable'));
    }
    if (this.findPendingFrom(donorId, { needId })) {
      return this._fail(I18n.t('offers.duplicateOffer'));
    }

    const offer = this._create({
      needId,
      donationId: donationId || null,
      donorId,
      laliderId: need.laliderId,
      initiatedBy: 'donor',
      message: String(message || '').trim(),
    });
    return { success: true, message: I18n.t('offers.sent'), offer };
  },

  /**
   * Lalíder solicita uma doação. `needId` é opcional: se informado, precisa
   * ser um pedido aberto do próprio Lalíder.
   */
  requestDonation({ laliderId, donationId, needId = null, message = '' }) {
    if (!Auth.hasRole(laliderId, 'lalider')) {
      return this._fail(I18n.t('offers.onlyLalideres'));
    }
    const donation = Donations.getById(donationId);
    if (!donation) return this._fail(I18n.t('offers.donationNotFound'));
    if (donation.status !== 'available') return this._fail(I18n.t('offers.donationUnavailable'));

    if (needId) {
      const need = Donations.getNeedById(needId);
      if (!need || need.laliderId !== laliderId) return this._fail(I18n.t('offers.needNotFound'));
      if (need.status !== 'open') return this._fail(I18n.t('offers.needClosed'));
    }
    if (this.findPendingFrom(laliderId, { donationId })) {
      return this._fail(I18n.t('offers.duplicateRequest'));
    }

    const offer = this._create({
      needId: needId || null,
      donationId,
      donorId: donation.donorId,
      laliderId,
      initiatedBy: 'lalider',
      message: String(message || '').trim(),
    });
    return { success: true, message: I18n.t('offers.requestSent'), offer };
  },

  /**
   * Quem recebeu a oferta aceita ou recusa. Ao aceitar, a doação e o pedido
   * viram 'matched' e as outras ofertas pendentes para os mesmos itens são
   * encerradas como recusadas (closedReason: 'superseded').
   */
  respond(offerId, actorId, decision) {
    const offer = this.getById(offerId);
    if (!offer) return this._fail(I18n.t('offers.notFound'));
    if (offer.status !== 'pending') return this._fail(I18n.t('offers.alreadyAnswered'));
    if (this.getRecipientId(offer) !== actorId) {
      return this._fail(I18n.t('offers.onlyRecipient'));
    }

    if (decision === 'decline') {
      const updated = this._update(offerId, { status: 'declined', closedReason: 'declined' });
      return { success: true, message: I18n.t('offers.declined'), offer: updated };
    }
    if (decision !== 'accept') return this._fail(I18n.t('offers.invalidDecision'));

    const need = offer.needId ? Donations.getNeedById(offer.needId) : null;
    const donation = offer.donationId ? Donations.getById(offer.donationId) : null;
    if (offer.needId && (!need || need.status !== 'open')) {
      return this._fail(I18n.t('offers.needClosed'));
    }
    if (offer.donationId && (!donation || donation.status !== 'available')) {
      return this._fail(I18n.t('offers.donationUnavailable'));
    }

    const now = new Date().toISOString();
    const updated = this._update(offerId, { status: 'accepted', acceptedAt: now });

    if (donation) {
      Donations.update(donation.id, {
        status: 'matched',
        matchedTo: offer.laliderId,
        matchedAt: now,
        offerId: offer.id,
      });
    }
    if (need) {
      Donations.updateNeed(need.id, {
        status: 'matched',
        matchedDonorId: offer.donorId,
        matchedDonationId: offer.donationId,
        matchedAt: now,
        offerId: offer.id,
      });
    }

    // Encerra as outras ofertas pendentes para os mesmos itens.
    const offers = this.getAll().map((o) => {
      const sameItem =
        (offer.needId && o.needId === offer.needId) ||
        (offer.donationId && o.donationId === offer.donationId);
      if (o.id !== offer.id && o.status === 'pending' && sameItem) {
        return { ...o, status: 'declined', closedReason: 'superseded', updatedAt: now };
      }
      return o;
    });
    this._save(offers);

    return {
      success: true,
      message: I18n.t('offers.accepted'),
      offer: updated,
    };
  },

  /** Qualquer uma das partes marca a oferta aceita como entregue. */
  markDelivered(offerId, actorId) {
    const offer = this.getById(offerId);
    if (!offer) return this._fail(I18n.t('offers.notFound'));
    if (offer.donorId !== actorId && offer.laliderId !== actorId) {
      return this._fail(I18n.t('offers.onlyPartiesDeliver'));
    }
    if (offer.status !== 'accepted') return this._fail(I18n.t('offers.onlyAcceptedDeliver'));

    const now = new Date().toISOString();
    const updated = this._update(offerId, {
      status: 'delivered',
      deliveredAt: now,
      deliveredBy: actorId,
    });
    if (offer.donationId) {
      Donations.update(offer.donationId, { status: 'delivered', deliveredAt: now });
    }
    if (offer.needId) {
      Donations.updateNeed(offer.needId, { status: 'delivered', deliveredAt: now });
    }
    return { success: true, message: I18n.t('offers.delivered'), offer: updated };
  },

  /**
   * Desfaz uma oferta:
   *   - pendente: quem enviou pode retirar (closedReason: 'withdrawn');
   *   - aceita: qualquer uma das partes pode cancelar o match, e a doação
   *     volta a 'available' e o pedido a 'open' (closedReason: 'cancelled').
   * Ofertas entregues ou já recusadas não mudam.
   */
  cancel(offerId, actorId) {
    const offer = this.getById(offerId);
    if (!offer) return this._fail(I18n.t('offers.notFound'));
    const isParty = offer.donorId === actorId || offer.laliderId === actorId;
    if (!isParty) return this._fail(I18n.t('offers.onlyPartiesCancel'));

    if (offer.status === 'pending') {
      if (this.getRecipientId(offer) === actorId) {
        return this._fail(I18n.t('offers.useDecline'));
      }
      const updated = this._update(offerId, { status: 'declined', closedReason: 'withdrawn' });
      return { success: true, message: I18n.t('offers.withdrawn'), offer: updated };
    }

    if (offer.status === 'accepted') {
      const updated = this._update(offerId, {
        status: 'declined',
        closedReason: 'cancelled',
        cancelledBy: actorId,
      });
      if (offer.donationId) {
        Donations.update(offer.donationId, {
          status: 'available',
          matchedTo: null,
          matchedAt: null,
          offerId: null,
        });
      }
      if (offer.needId) {
        Donations.updateNeed(offer.needId, {
          status: 'open',
          matchedDonorId: null,
          matchedDonationId: null,
          matchedAt: null,
          offerId: null,
        });
      }
      return {
        success: true,
        message: I18n.t('offers.matchCancelled'),
        offer: updated,
      };
    }

    return this._fail(I18n.t('offers.cannotCancel'));
  },

  /**
   * Contato da outra parte. Só é revelado depois que a oferta é aceita.
   * @returns {{ name, email, organization? } | null}
   */
  getContact(offer, viewerId) {
    if (!offer || !['accepted', 'delivered'].includes(offer.status)) return null;
    let otherId = null;
    if (viewerId === offer.donorId) otherId = offer.laliderId;
    else if (viewerId === offer.laliderId) otherId = offer.donorId;
    if (!otherId) return null;
    const other = Auth.getUsers().find((u) => u.id === otherId);
    if (!other) return null;
    return { name: other.name, email: other.email, organization: other.organization || '' };
  },
};

Offers.init();

window.Offers = Offers;
