import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from './helpers/load-app.js';
import { seedUsers } from './helpers/fixtures.js';

describe('Donations', () => {
  let Auth, Donations, users;
  beforeEach(() => {
    ({ Auth, Donations } = loadApp());
    users = seedUsers(Auth);
  });

  const donation = (donorId) => ({
    donorId,
    donorName: 'Empresa Teste',
    category: 'laptop',
    title: 'Notebook Dell 8GB',
    description: 'Bom estado, com carregador',
    condition: 'good',
    country: 'BR',
    state: 'PE',
    city: 'Recife',
  });

  const need = (laliderId) => ({
    laliderId,
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

  it('doador publica doação disponível', () => {
    const d = Donations.create(donation(users.donor.id));
    expect(d.status).toBe('available');
    expect(Donations.getAvailable().map((x) => x.id)).toContain(d.id);
  });

  it('Lalíder não pode publicar doação', () => {
    expect(() => Donations.create(donation(users.lalider.id))).toThrow(/doadores/i);
    expect(Donations.getAll()).toHaveLength(0);
  });

  it('doador não pode criar pedido', () => {
    expect(() => Donations.createNeed(need(users.donor.id))).toThrow(/Lalíder/i);
  });

  it('Lalíder cria pedido aberto', () => {
    const n = Donations.createNeed(need(users.lalider.id));
    expect(n.status).toBe('open');
    expect(Donations.getNeedsByLalider(users.lalider.id)).toHaveLength(1);
  });

  it('o papel vem do cadastro, não da sessão', () => {
    Auth.startSession(users.lalider);
    const session = JSON.parse(localStorage.getItem(Auth.SESSION_KEY));
    session.type = 'donor';
    localStorage.setItem(Auth.SESSION_KEY, JSON.stringify(session));
    expect(Auth.isDonor()).toBe(false);
    expect(Auth.isLalider()).toBe(true);
  });

  describe('filter', () => {
    const items = [
      {
        title: 'Notebook Dell',
        description: 'x',
        donorName: 'A',
        category: 'laptop',
        country: 'BR',
        state: 'PE',
        city: 'Recife',
        condition: 'good',
      },
      {
        title: 'iPhone',
        description: 'celular',
        donorName: 'Tech Corp',
        category: 'phone',
        country: 'CA',
        condition: 'like-new',
      },
    ];

    it('filtra por categoria, país, condição e busca', () => {
      expect(Donations.filter(items, { category: 'phone' })).toHaveLength(1);
      expect(Donations.filter(items, { category: 'all' })).toHaveLength(2);
      expect(Donations.filter(items, { country: 'br' })[0].title).toBe('Notebook Dell');
      expect(Donations.filter(items, { state: 'PE' })[0].title).toBe('Notebook Dell');
      expect(Donations.filter(items, { state: 'SP' })).toHaveLength(0);
      expect(Donations.filter(items, { condition: 'like-new' })[0].title).toBe('iPhone');
      expect(Donations.filter(items, { search: 'tech' })[0].title).toBe('iPhone');
      expect(Donations.filter(items, { search: 'CELULAR' })).toHaveLength(1);
    });
  });
});
