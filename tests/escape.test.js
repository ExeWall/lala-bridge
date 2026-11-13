import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from './helpers/load-app.js';

const PAYLOAD = '<img src=x onerror=alert(1)>';

describe('App.escapeHTML', () => {
  let App;
  beforeEach(() => {
    ({ App } = loadApp());
    document.body.innerHTML = '';
  });

  it('escapa os caracteres especiais de HTML', () => {
    expect(App.escapeHTML(`<a href="x" onclick='y'>&\`</a>`)).toBe(
      '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&#96;&lt;/a&gt;'
    );
  });

  it('trata null, undefined e números', () => {
    expect(App.escapeHTML(null)).toBe('');
    expect(App.escapeHTML(undefined)).toBe('');
    expect(App.escapeHTML(42)).toBe('42');
  });

  it('renderDonationCard não injeta HTML de título, descrição ou país', () => {
    document.body.innerHTML = App.renderDonationCard({
      id: 'don-x',
      category: 'laptop',
      condition: 'good',
      title: PAYLOAD,
      description: PAYLOAD,
      country: PAYLOAD,
      status: 'available',
      createdAt: new Date().toISOString(),
    });
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('.donation-card__title').textContent).toBe(PAYLOAD);
  });

  it('renderNeedCard não injeta HTML de nome, turma, título ou descrição', () => {
    document.body.innerHTML = App.renderNeedCard({
      id: 'need-x',
      laliderId: 'lalider-x',
      laliderName: PAYLOAD,
      camp: PAYLOAD,
      country: 'BR',
      state: 'PE',
      city: 'Recife',
      category: 'laptop',
      title: PAYLOAD,
      description: PAYLOAD,
      urgency: '" onmouseover="alert(1)',
      status: 'open',
      createdAt: new Date().toISOString(),
    });
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('[onmouseover]')).toBeNull();
    expect(document.querySelector('.need-card__name').textContent).toBe(PAYLOAD);
  });

  it('showToast exibe a mensagem como texto', () => {
    App.showToast(PAYLOAD, 'info');
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('.toast__message').textContent).toBe(PAYLOAD);
  });

  it('showModal escapa o título', () => {
    App.showModal(PAYLOAD, '<p>ok</p>');
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('.modal__title').textContent).toBe(PAYLOAD);
  });
});

describe('App.renderOfferCard', () => {
  it('escapa a mensagem da oferta e os dados de contato', async () => {
    const { App, Auth, Donations, Offers } = loadApp();
    const { seedUsers } = await import('./helpers/fixtures.js');
    const users = seedUsers(Auth);
    const need = Donations.createNeed({
      laliderId: users.lalider.id,
      laliderName: 'Ana S.',
      camp: 'VLB32',
      country: 'BR',
      state: 'PE',
      city: 'Recife',
      category: 'laptop',
      title: PAYLOAD,
      description: 'x',
    });
    const { offer } = Offers.offerHelp({
      donorId: users.donor.id,
      needId: need.id,
      message: PAYLOAD,
    });
    Offers.respond(offer.id, users.lalider.id, 'accept');
    document.body.innerHTML = App.renderOfferCard(Offers.getById(offer.id), users.lalider);
    expect(document.querySelector('img')).toBeNull();
    expect(document.body.textContent).toContain(PAYLOAD);
    expect(document.body.textContent).toContain(users.donor.email);
  });
});

describe('App: localização exibida', () => {
  it('mostra Cidade/UF no Brasil e o país traduzido fora dele', () => {
    const { App } = loadApp();
    expect(App.formatLocation({ country: 'BR', state: 'PE', city: 'Recife' })).toBe('Recife/PE');
    expect(App.formatLocation({ country: 'CO', city: 'Medellín' })).toBe('Medellín, Colômbia');
  });

  it('a região pública do Lalíder nunca mostra a cidade', () => {
    const { App } = loadApp();
    expect(App.publicRegion({ country: 'BR', state: 'PE', city: 'Recife' })).toBe('PE');
    expect(App.publicRegion({ country: 'MX', state: 'CDMX', city: 'Coyoacán' })).toBe('México');
  });
});
