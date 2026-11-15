/**
 * LALA Bridge — confiança: sinais para revisão humana
 *
 * Nada aqui bloqueia ninguém. Os sinais viram sinalizações (flags) que uma
 * pessoa da equipe revisa no painel admin.
 */

const Trust = {
  DEVICE_KEY: 'lala_bridge_device',

  /**
   * Identificador aleatório deste navegador (não identifica a pessoa). Serve
   * só para notar muitas contas criadas no mesmo dispositivo.
   */
  deviceId() {
    try {
      let id = localStorage.getItem(this.DEVICE_KEY);
      if (!id) {
        id = newId('dev');
        localStorage.setItem(this.DEVICE_KEY, id);
      }
      return id;
    } catch {
      return '';
    }
  },
  // ------------------------------------------------------------- regras
  // As mesmas regras rodam no servidor (supabase/migrations/…_ia_confianca.sql).

  SCAM_RE:
    /\b(pix|taxa|frete (pago|antecipado)|pague o frete|deposito|transferencia|pagamento|sinal de|bit\.ly|wa\.me|whatsapp|telegram|cartao de credito)\b/,
  EMAIL_RE: /[\w.%+-]+@[\w.-]+\.[a-z]{2,}/i,
  PHONE_RE: /\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/,
  DUPLICATE_THRESHOLD: 0.9,

  _norm(text) {
    return String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  },

  scamPattern(text) {
    return this._norm(text).match(this.SCAM_RE)?.[0] || null;
  },

  hasContact(text) {
    return this.EMAIL_RE.test(text || '') || this.PHONE_RE.test(text || '');
  },

  scanDonation(donation) {
    const text = `${donation.title} ${donation.description || ''}`;
    const scam = this.scamPattern(text);
    if (scam) {
      this.addFlag({
        entityType: 'donation',
        entityId: donation.id,
        reason: 'scam_pattern',
        score: 0.7,
        details: { evidence: `Trecho: "${scam}"` },
      });
    }
    if (this.hasContact(text)) {
      this.addFlag({
        entityType: 'donation',
        entityId: donation.id,
        reason: 'contact_in_text',
        score: 0.6,
        details: { evidence: 'Contato pessoal no texto da doação' },
      });
    }
  },

  scanNeed(need) {
    const text = `${need.title} ${need.description || ''} ${need.intendedUse || ''}`;
    if (this.hasContact(text)) {
      this.addFlag({
        entityType: 'need',
        entityId: need.id,
        reason: 'contact_in_text',
        score: 0.6,
        details: { evidence: 'Contato pessoal no texto do pedido' },
      });
    }
    const dayAgo = Date.now() - 24 * 3600 * 1000;
    const recent = Donations.getNeedsByLalider(need.laliderId).filter(
      (n) => new Date(n.createdAt) > dayAgo
    );
    if (recent.length >= 3) {
      this.addFlag({
        entityType: 'profile',
        entityId: need.laliderId,
        reason: 'many_requests',
        score: Math.min(1, 0.3 + recent.length * 0.1),
        details: { evidence: `${recent.length} pedidos nas últimas 24 horas` },
      });
    }
    const mine = Matching.needText(need);
    Donations.getAllNeeds()
      .filter((o) => o.id !== need.id && o.laliderId !== need.laliderId)
      .forEach((other) => {
        const sim = Matching.textSimilarity(mine, Matching.needText(other));
        if (sim >= this.DUPLICATE_THRESHOLD) {
          this.addFlag({
            entityType: 'need',
            entityId: need.id,
            reason: 'duplicate_text',
            score: Math.min(1, sim),
            details: {
              evidence: `Parecido (${Math.round(sim * 100)}%) com o pedido "${other.title}"`,
              otherNeed: other.id,
            },
          });
        }
      });
  },

  scanProfile(user) {
    if (!user?.deviceId) return;
    const same = Auth.getUsers().filter((u) => u.deviceId === user.deviceId).length;
    if (same >= 3) {
      this.addFlag({
        entityType: 'profile',
        entityId: user.id,
        reason: 'many_accounts_device',
        score: Math.min(1, 0.3 + same * 0.1),
        details: { evidence: `${same} contas criadas no mesmo dispositivo` },
      });
    }
  },

  // ------------------------------------------------- sinalizações (flags)
  FLAGS_KEY: 'lala_bridge_flags',

  getFlags() {
    return Store.get(this.FLAGS_KEY, []);
  },

  /** Cria uma sinalização para revisão; não duplica (mesma entidade e motivo). */
  addFlag({ entityType, entityId, reason, score = 0.5, details = {} }) {
    const flags = this.getFlags();
    if (
      flags.some(
        (f) => f.entityType === entityType && f.entityId === entityId && f.reason === reason
      )
    ) {
      return null;
    }
    const flag = {
      id: newId('flag'),
      entityType,
      entityId,
      reason,
      score: Math.max(0, Math.min(1, score)),
      details,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    Store.set(this.FLAGS_KEY, [flag, ...flags]);
    return flag;
  },

  /** Decisão humana: 'dismissed' (falso alarme) ou 'confirmed' (problema real). */
  reviewFlag(flagId, status, reviewerId) {
    if (!['dismissed', 'confirmed', 'open'].includes(status)) return null;
    let updated = null;
    Store.set(
      this.FLAGS_KEY,
      this.getFlags().map((f) => {
        if (f.id !== flagId) return f;
        updated = { ...f, status, reviewedBy: reviewerId, reviewedAt: new Date().toISOString() };
        return updated;
      })
    );
    return updated;
  },
};

window.Trust = Trust;
