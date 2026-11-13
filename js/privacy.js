/**
 * LALA Bridge — direitos do titular (LGPD, art. 18)
 *
 * - exportData: cópia de tudo o que está guardado sobre a pessoa (portabilidade).
 * - deleteAccount: exclui a conta e os dados pessoais. Para não prejudicar a
 *   outra parte de uma oferta:
 *     • ofertas pendentes são apagadas;
 *     • matches aceitos são cancelados (Offers.cancel), e os itens da outra
 *       pessoa voltam a ficar disponíveis;
 *     • entregas concluídas ficam só como estatística, sem dados pessoais.
 */

const Privacy = {
  DELETED_ID: 'deleted-user',

  /** Dados da pessoa, sem hash nem salt da senha. */
  exportData(userId) {
    const user = Auth.getUsers().find((u) => u.id === userId);
    if (!user) return null;
    const { passwordHash, passwordSalt, password, ...profile } = user;
    return {
      exportedAt: new Date().toISOString(),
      app: 'LALA Bridge',
      profile,
      donations: Donations.getByDonor(userId),
      needs: Donations.getNeedsByLalider(userId),
      offers: Offers.getForUser(userId),
    };
  },

  /** Baixa exportData como arquivo JSON. */
  downloadData(userId) {
    const data = this.exportData(userId);
    if (!data) return false;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lala-bridge-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  },

  deleteAccount(userId) {
    const user = Auth.getUsers().find((u) => u.id === userId);
    if (!user) return { success: false, message: I18n.t('auth.invalidLogin') };
    const gone = this.DELETED_ID;

    // 1. Matches aceitos: cancela, devolvendo os itens da outra parte.
    Offers.getForUser(userId)
      .filter((o) => o.status === 'accepted')
      .forEach((o) => Offers.cancel(o.id, userId));

    // 2. Ofertas: apaga as não concluídas; anonimiza as entregues.
    const offers = Offers.getAll()
      .filter((o) => {
        const involved = o.donorId === userId || o.laliderId === userId;
        return !involved || o.status === 'delivered';
      })
      .map((o) => {
        if (o.donorId !== userId && o.laliderId !== userId) return o;
        return {
          ...o,
          donorId: o.donorId === userId ? gone : o.donorId,
          laliderId: o.laliderId === userId ? gone : o.laliderId,
          message: '',
        };
      });
    Offers._save(offers);

    // 3. Doações e pedidos: apaga os não entregues; anonimiza os entregues.
    const donations = Donations.getAll()
      .filter((d) => d.donorId !== userId || d.status === 'delivered')
      .map((d) =>
        d.donorId === userId
          ? {
              ...d,
              donorId: gone,
              donorName: '',
              description: '',
              city: '',
              matchedTo: d.matchedTo,
            }
          : d.matchedTo === userId
            ? { ...d, matchedTo: gone }
            : d
      );
    localStorage.setItem(Donations.STORAGE_KEY, JSON.stringify(donations));

    const needs = Donations.getAllNeeds()
      .filter((n) => n.laliderId !== userId || n.status === 'delivered')
      .map((n) =>
        n.laliderId === userId
          ? { ...n, laliderId: gone, laliderName: '', title: '', description: '', city: '' }
          : n.matchedDonorId === userId
            ? { ...n, matchedDonorId: gone }
            : n
      );
    localStorage.setItem(Donations.NEEDS_KEY, JSON.stringify(needs));

    // 4. Conta e sessão.
    Auth.saveUsers(Auth.getUsers().filter((u) => u.id !== userId));
    Auth.logout();
    return { success: true, message: I18n.t('myData.deleted') };
  },
};

window.Privacy = Privacy;
