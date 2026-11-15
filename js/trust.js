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
