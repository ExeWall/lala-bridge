import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from './helpers/load-app.js';
import { seedUsers } from './helpers/fixtures.js';

describe('Impact', () => {
  let Auth, Donations, Offers, Impact, Api, users, offer;

  beforeEach(() => {
    ({ Auth, Donations, Offers, Impact, Api } = loadApp());
    users = seedUsers(Auth);
    const need = Donations.createNeed({
      laliderId: users.lalider.id,
      laliderName: 'Ana S.',
      camp: 'VLB32',
      country: 'BR',
      state: 'PE',
      category: 'laptop',
      title: 'Notebook',
      description: 'x',
    });
    const donation = Donations.create({
      donorId: users.donor.id,
      donorName: 'Empresa',
      category: 'laptop',
      title: 'Lenovo',
      description: '',
      condition: 'good',
      country: 'BR',
      state: 'PE',
      city: 'Recife',
    });
    offer = Offers.offerHelp({
      donorId: users.donor.id,
      needId: need.id,
      donationId: donation.id,
    }).offer;
    Offers.respond(offer.id, users.lalider.id, 'accept');
  });

  it('só o Lalíder da oferta, e só depois da entrega, pode enviar relato', () => {
    expect(Impact.add({ offerId: offer.id, authorId: users.lalider.id, text: 'oi' }).success).toBe(
      false
    );
    Offers.markDelivered(offer.id, users.donor.id);
    expect(Impact.add({ offerId: offer.id, authorId: users.donor.id, text: 'oi' }).success).toBe(
      false
    );
    expect(Impact.add({ offerId: offer.id, authorId: users.lalider.id, text: '  ' }).success).toBe(
      false
    );
    expect(
      Impact.add({ offerId: offer.id, authorId: users.lalider.id, text: 'Ajudou muito!' }).success
    ).toBe(true);
  });

  it('Api gera um resumo para o doador (sem IA: modelo com o relato)', async () => {
    Offers.markDelivered(offer.id, users.donor.id);
    Auth.startSession(users.lalider);
    const r = await Api.addImpactUpdate(offer.id, 'Terminei o curso de Python!');
    expect(r).toMatchObject({ success: true, source: 'local' });
    expect(Impact.getForOffer(offer.id)[0].summary).toBe(
      'Ana S. recebeu Lenovo e contou: “Terminei o curso de Python!”'
    );
  });

  it('estatísticas agregadas: entregas, UFs e peso estimado', () => {
    Offers.markDelivered(offer.id, users.donor.id);
    const s = Impact.stats();
    expect(s.delivered).toBe(1);
    expect(s.statesReached).toEqual(['PE']);
    expect(s.byCategory).toEqual({ laptop: 1 });
    expect(s.ewasteKg).toBe(2);
  });
});
