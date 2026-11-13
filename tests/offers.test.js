import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from './helpers/load-app.js';
import { seedUsers } from './helpers/fixtures.js';

describe('Offers', () => {
  let Auth, Donations, Offers, users, need, donation;

  beforeEach(() => {
    ({ Auth, Donations, Offers } = loadApp());
    users = seedUsers(Auth);
    need = Donations.createNeed({
      laliderId: users.lalider.id,
      laliderName: 'Ana S.',
      camp: 'VLB32',
      country: 'BR',
      state: 'PE',
      city: 'Recife',
      category: 'laptop',
      title: 'Notebook para curso de Python',
      description: 'Preciso para estudar',
      urgency: 'high',
    });
    donation = Donations.create({
      donorId: users.donor.id,
      donorName: 'Empresa Teste',
      category: 'laptop',
      title: 'Notebook Dell 8GB',
      description: 'Bom estado',
      condition: 'good',
      country: 'BR',
      state: 'PE',
      city: 'Recife',
    });
  });

  describe('doador oferece ajuda a um pedido', () => {
    it('cria oferta pendente para o Lalíder dono do pedido', () => {
      const res = Offers.offerHelp({ donorId: users.donor.id, needId: need.id, message: 'Oi!' });
      expect(res.success).toBe(true);
      expect(res.offer).toMatchObject({
        needId: need.id,
        donorId: users.donor.id,
        laliderId: users.lalider.id,
        initiatedBy: 'donor',
        status: 'pending',
        message: 'Oi!',
      });
      expect(Offers.getPendingFor(users.lalider.id)).toHaveLength(1);
      expect(Offers.getPendingFor(users.donor.id)).toHaveLength(0);
    });

    it('não revela contatos enquanto a oferta está pendente', () => {
      const { offer } = Offers.offerHelp({ donorId: users.donor.id, needId: need.id });
      expect(Offers.getContact(offer, users.lalider.id)).toBeNull();
      expect(Offers.getContact(offer, users.donor.id)).toBeNull();
    });

    it('impede oferta duplicada e oferta de quem não é doador', () => {
      Offers.offerHelp({ donorId: users.donor.id, needId: need.id });
      expect(Offers.offerHelp({ donorId: users.donor.id, needId: need.id }).success).toBe(false);
      expect(Offers.offerHelp({ donorId: users.lalider.id, needId: need.id }).success).toBe(false);
    });

    it('só aceita vincular uma doação disponível do próprio doador', () => {
      const other = Offers.offerHelp({
        donorId: users.donor2.id,
        needId: need.id,
        donationId: donation.id,
      });
      expect(other.success).toBe(false);
      const own = Offers.offerHelp({
        donorId: users.donor.id,
        needId: need.id,
        donationId: donation.id,
      });
      expect(own.success).toBe(true);
    });
  });

  describe('Lalíder solicita uma doação', () => {
    it('cria oferta pendente para o doador', () => {
      const res = Offers.requestDonation({ laliderId: users.lalider.id, donationId: donation.id });
      expect(res.success).toBe(true);
      expect(res.offer).toMatchObject({ donorId: users.donor.id, initiatedBy: 'lalider' });
      expect(Offers.getPendingFor(users.donor.id)).toHaveLength(1);
    });

    it('doador não pode solicitar doação', () => {
      const res = Offers.requestDonation({ laliderId: users.donor2.id, donationId: donation.id });
      expect(res.success).toBe(false);
    });

    it('só vincula pedido aberto do próprio Lalíder', () => {
      const res = Offers.requestDonation({
        laliderId: users.lalider2.id,
        donationId: donation.id,
        needId: need.id,
      });
      expect(res.success).toBe(false);
    });
  });

  describe('resposta e entrega', () => {
    it('só quem recebeu a oferta pode responder', () => {
      const { offer } = Offers.offerHelp({ donorId: users.donor.id, needId: need.id });
      expect(Offers.respond(offer.id, users.donor.id, 'accept').success).toBe(false);
      expect(Offers.respond(offer.id, users.lalider2.id, 'accept').success).toBe(false);
      expect(Offers.getById(offer.id).status).toBe('pending');
    });

    it('aceitar marca doação e pedido como matched e revela os contatos', () => {
      const { offer } = Offers.offerHelp({
        donorId: users.donor.id,
        needId: need.id,
        donationId: donation.id,
      });
      const res = Offers.respond(offer.id, users.lalider.id, 'accept');
      expect(res.success).toBe(true);
      expect(Offers.getById(offer.id).status).toBe('accepted');
      expect(Donations.getById(donation.id)).toMatchObject({
        status: 'matched',
        matchedTo: users.lalider.id,
      });
      expect(Donations.getNeedById(need.id).status).toBe('matched');
      expect(Donations.getOpenNeeds().map((n) => n.id)).not.toContain(need.id);
      expect(Donations.getAvailable().map((d) => d.id)).not.toContain(donation.id);

      const accepted = Offers.getById(offer.id);
      expect(Offers.getContact(accepted, users.lalider.id).email).toBe(users.donor.email);
      expect(Offers.getContact(accepted, users.donor.id).email).toBe(users.lalider.email);
      expect(Offers.getContact(accepted, users.donor2.id)).toBeNull();
    });

    it('aceitar encerra as outras ofertas pendentes para o mesmo pedido', () => {
      const a = Offers.offerHelp({ donorId: users.donor.id, needId: need.id }).offer;
      const b = Offers.offerHelp({ donorId: users.donor2.id, needId: need.id }).offer;
      Offers.respond(a.id, users.lalider.id, 'accept');
      expect(Offers.getById(b.id)).toMatchObject({
        status: 'declined',
        closedReason: 'superseded',
      });
    });

    it('recusar não altera doação nem pedido', () => {
      const { offer } = Offers.requestDonation({
        laliderId: users.lalider.id,
        donationId: donation.id,
        needId: need.id,
      });
      expect(Offers.respond(offer.id, users.donor.id, 'decline').success).toBe(true);
      expect(Offers.getById(offer.id).status).toBe('declined');
      expect(Donations.getById(donation.id).status).toBe('available');
      expect(Donations.getNeedById(need.id).status).toBe('open');
    });

    it('não aceita oferta para doação que já foi para outra pessoa', () => {
      const a = Offers.requestDonation({ laliderId: users.lalider.id, donationId: donation.id });
      const b = Offers.requestDonation({ laliderId: users.lalider2.id, donationId: donation.id });
      Offers.respond(a.offer.id, users.donor.id, 'accept');
      expect(Offers.respond(b.offer.id, users.donor.id, 'accept').success).toBe(false);
    });

    it('fluxo completo: oferta → aceite → entrega', () => {
      const { offer } = Offers.offerHelp({
        donorId: users.donor.id,
        needId: need.id,
        donationId: donation.id,
      });
      expect(Offers.markDelivered(offer.id, users.donor.id).success).toBe(false); // ainda pendente
      Offers.respond(offer.id, users.lalider.id, 'accept');
      expect(Offers.markDelivered(offer.id, users.donor2.id).success).toBe(false); // terceiro
      expect(Offers.markDelivered(offer.id, users.lalider.id).success).toBe(true);

      expect(Offers.getById(offer.id).status).toBe('delivered');
      expect(Donations.getById(donation.id).status).toBe('delivered');
      expect(Donations.getNeedById(need.id).status).toBe('delivered');
      expect(Donations.getStats().deliveredDonations).toBe(1);
    });
  });
});

describe('Offers.cancel', () => {
  let Auth, Donations, Offers, users, need, donation;

  beforeEach(() => {
    ({ Auth, Donations, Offers } = loadApp());
    users = seedUsers(Auth);
    need = Donations.createNeed({
      laliderId: users.lalider.id,
      laliderName: 'Ana S.',
      camp: 'VLB32',
      country: 'BR',
      state: 'PE',
      city: 'Recife',
      category: 'laptop',
      title: 'Notebook',
      description: 'x',
    });
    donation = Donations.create({
      donorId: users.donor.id,
      donorName: 'Empresa Teste',
      category: 'laptop',
      title: 'Dell',
      description: 'x',
      condition: 'good',
      country: 'BR',
      state: 'PE',
      city: 'Recife',
    });
  });

  const offerWithBoth = () =>
    Offers.offerHelp({ donorId: users.donor.id, needId: need.id, donationId: donation.id }).offer;

  it('quem enviou pode retirar uma oferta pendente; quem recebeu, não', () => {
    const offer = offerWithBoth();
    expect(Offers.cancel(offer.id, users.lalider.id).success).toBe(false);
    expect(Offers.cancel(offer.id, users.donor2.id).success).toBe(false);
    expect(Offers.cancel(offer.id, users.donor.id).success).toBe(true);
    expect(Offers.getById(offer.id)).toMatchObject({
      status: 'declined',
      closedReason: 'withdrawn',
    });
    // Depois de retirar, o doador pode ofertar de novo.
    expect(Offers.offerHelp({ donorId: users.donor.id, needId: need.id }).success).toBe(true);
  });

  it('cancelar um match aceito devolve doação e pedido e esconde os contatos', () => {
    const offer = offerWithBoth();
    Offers.respond(offer.id, users.lalider.id, 'accept');
    expect(Offers.cancel(offer.id, users.lalider.id).success).toBe(true);

    expect(Offers.getById(offer.id).closedReason).toBe('cancelled');
    expect(Donations.getById(donation.id)).toMatchObject({ status: 'available', matchedTo: null });
    expect(Donations.getNeedById(need.id).status).toBe('open');
    expect(Offers.getContact(Offers.getById(offer.id), users.lalider.id)).toBeNull();
  });

  it('não cancela oferta já entregue', () => {
    const offer = offerWithBoth();
    Offers.respond(offer.id, users.lalider.id, 'accept');
    Offers.markDelivered(offer.id, users.donor.id);
    expect(Offers.cancel(offer.id, users.donor.id).success).toBe(false);
    expect(Donations.getById(donation.id).status).toBe('delivered');
  });
});
