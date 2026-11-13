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
      country: 'Brazil',
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
