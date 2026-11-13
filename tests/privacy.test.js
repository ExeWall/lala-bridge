import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from './helpers/load-app.js';
import { seedUsers } from './helpers/fixtures.js';

describe('Privacy (LGPD)', () => {
  let Auth, Donations, Offers, Privacy, users;

  const newNeed = (laliderId) =>
    Donations.createNeed({
      laliderId,
      laliderName: 'Ana S.',
      camp: 'VLB32',
      country: 'BR',
      state: 'PE',
      city: 'Recife',
      category: 'laptop',
      title: 'Notebook',
      description: 'Meu texto pessoal',
    });
  const newDonation = (donorId) =>
    Donations.create({
      donorId,
      donorName: 'Empresa',
      category: 'laptop',
      title: 'Dell',
      description: 'x',
      condition: 'good',
      country: 'BR',
      state: 'PE',
      city: 'Recife',
    });

  beforeEach(() => {
    ({ Auth, Donations, Offers, Privacy } = loadApp());
    users = seedUsers(Auth);
    Auth.saveUsers(Auth.getUsers().map((u) => ({ ...u, passwordHash: 'h', passwordSalt: 's' })));
  });

  it('exportData traz perfil, pedidos e ofertas, sem hash nem salt', () => {
    const need = newNeed(users.lalider.id);
    Offers.offerHelp({ donorId: users.donor.id, needId: need.id });
    const data = Privacy.exportData(users.lalider.id);
    expect(data.profile.email).toBe(users.lalider.email);
    expect(data.profile.passwordHash).toBeUndefined();
    expect(data.profile.passwordSalt).toBeUndefined();
    expect(data.needs).toHaveLength(1);
    expect(data.offers).toHaveLength(1);
  });

  it('excluir a conta apaga conta, sessão, pedidos abertos e ofertas pendentes', () => {
    Auth.startSession(users.lalider);
    const need = newNeed(users.lalider.id);
    Offers.offerHelp({ donorId: users.donor.id, needId: need.id });

    expect(Privacy.deleteAccount(users.lalider.id).success).toBe(true);
    expect(Auth.getUsers().some((u) => u.id === users.lalider.id)).toBe(false);
    expect(Auth.isLoggedIn()).toBe(false);
    expect(Donations.getNeedById(need.id)).toBeNull();
    expect(Offers.getForUser(users.lalider.id)).toHaveLength(0);
    expect(JSON.stringify(localStorage)).not.toContain(users.lalider.email);
  });

  it('match aceito é cancelado e a doação volta a ficar disponível para o doador', () => {
    const need = newNeed(users.lalider.id);
    const donation = newDonation(users.donor.id);
    const { offer } = Offers.offerHelp({
      donorId: users.donor.id,
      needId: need.id,
      donationId: donation.id,
    });
    Offers.respond(offer.id, users.lalider.id, 'accept');

    Privacy.deleteAccount(users.lalider.id);
    expect(Donations.getById(donation.id).status).toBe('available');
    expect(Donations.getById(donation.id).matchedTo).toBeNull();
  });

  it('entregas concluídas ficam só como estatística, sem dados pessoais', () => {
    const need = newNeed(users.lalider.id);
    const donation = newDonation(users.donor.id);
    const { offer } = Offers.offerHelp({
      donorId: users.donor.id,
      needId: need.id,
      donationId: donation.id,
      message: 'mensagem pessoal',
    });
    Offers.respond(offer.id, users.lalider.id, 'accept');
    Offers.markDelivered(offer.id, users.donor.id);

    Privacy.deleteAccount(users.lalider.id);
    expect(Donations.getStats().deliveredDonations).toBe(1);
    const storedNeed = Donations.getNeedById(need.id);
    expect(storedNeed).toMatchObject({ laliderId: Privacy.DELETED_ID, description: '' });
    expect(Offers.getById(offer.id)).toMatchObject({
      laliderId: Privacy.DELETED_ID,
      message: '',
      status: 'delivered',
    });
    expect(Donations.getById(donation.id).matchedTo).toBe(Privacy.DELETED_ID);
    expect(JSON.stringify(localStorage)).not.toContain('Meu texto pessoal');
    expect(JSON.stringify(localStorage)).not.toContain('mensagem pessoal');
  });

  it('doador excluído: doações abertas somem, as do outro lado continuam', () => {
    const mine = newDonation(users.donor.id);
    const theirs = newDonation(users.donor2.id);
    Privacy.deleteAccount(users.donor.id);
    expect(Donations.getById(mine.id)).toBeNull();
    expect(Donations.getById(theirs.id)).not.toBeNull();
  });
});
