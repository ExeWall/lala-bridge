import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { loadApp, readLocale } from './helpers/load-app.js';

const LOCALES = ['pt-BR', 'en', 'es'];

function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
}

/** Chaves usadas literalmente no HTML (data-i18n, data-i18n-attr) e no JS (I18n.t / t). */
function usedKeys() {
  const keys = new Set();
  const html = readdirSync('.').filter((f) => f.endsWith('.html'));
  html.forEach((file) => {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/data-i18n="([^"]+)"/g)) keys.add(m[1]);
    for (const m of src.matchAll(/data-i18n-attr="([^"]+)"/g)) {
      m[1].split(';').forEach((pair) => keys.add(pair.split(':')[1].trim()));
    }
  });
  const js = [
    ...readdirSync('js')
      .filter((f) => f.endsWith('.js'))
      .map((f) => `js/${f}`),
    ...readdirSync('js/pages').map((f) => `js/pages/${f}`),
  ];
  js.forEach((file) => {
    const src = readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line)) // ignora comentários
      .join('\n');
    for (const m of src.matchAll(/\b(?:I18n\.t|t)\(\s*'([a-zA-Z0-9.-]+)'/g)) keys.add(m[1]);
  });
  return [...keys];
}

describe('arquivos de idioma', () => {
  const flat = Object.fromEntries(LOCALES.map((l) => [l, flatten(readLocale(l)).sort()]));

  it('os três idiomas têm exatamente as mesmas chaves', () => {
    expect(flat.en).toEqual(flat['pt-BR']);
    expect(flat.es).toEqual(flat['pt-BR']);
  });

  it('toda chave usada no HTML e no JS existe', () => {
    const all = new Set(flat['pt-BR']);
    const pluralBases = new Set(flat['pt-BR'].map((k) => k.replace(/\.(one|other)$/, '')));
    const missing = usedKeys().filter((k) => !all.has(k) && !pluralBases.has(k));
    expect(missing).toEqual([]);
  });

  it('não há texto vazio', () => {
    LOCALES.forEach((l) => {
      const dict = readLocale(l);
      flat[l].forEach((key) => {
        const value = key.split('.').reduce((n, p) => n[p], dict);
        expect(value.trim(), `${l}:${key}`).not.toBe('');
      });
    });
  });
});

describe('I18n', () => {
  it('PT-BR é o padrão e interpola parâmetros', () => {
    const { I18n } = loadApp();
    expect(I18n.locale).toBe('pt-BR');
    expect(I18n.t('offer.helpTitle', { name: 'Ana' })).toBe('Ajudar Ana');
  });

  it('usa plural conforme o idioma', () => {
    const { I18n } = loadApp();
    expect(I18n.t('browse.donationsCount', { count: 1 })).toBe('1 doação disponível');
    expect(I18n.t('browse.donationsCount', { count: 3 })).toBe('3 doações disponíveis');
  });

  it('traduz para inglês e espanhol', () => {
    expect(loadApp({ locale: 'en' }).I18n.t('nav.donate')).toBe('Donate');
    expect(loadApp({ locale: 'es' }).I18n.t('nav.donate')).toBe('Donar');
  });

  it('cai para PT-BR e depois para a própria chave', () => {
    const { I18n } = loadApp();
    I18n.messages = {};
    expect(I18n.t('nav.donate')).toBe('Doar');
    expect(I18n.t('chave.inexistente')).toBe('chave.inexistente');
  });

  it('formata datas relativas e números no idioma ativo', () => {
    const { I18n } = loadApp();
    const now = new Date('2026-11-13T12:00:00');
    expect(I18n.formatRelativeDate('2026-11-13T08:00:00', now)).toBe('hoje');
    expect(I18n.formatRelativeDate('2026-11-12T08:00:00', now)).toBe('ontem');
    expect(I18n.formatRelativeDate('2026-11-10T08:00:00', now)).toBe('há 3 dias');
    expect(I18n.formatNumber(1234.5)).toBe('1.234,5');
    expect(I18n.countryName('BR')).toBe('Brasil');
    expect(I18n.countryName('Texto livre')).toBe('Texto livre');
  });

  it('apply() traduz textos e atributos marcados no HTML', () => {
    const { I18n } = loadApp({ locale: 'en' });
    document.body.innerHTML =
      '<a data-i18n="nav.donate">Doar</a><input data-i18n-attr="placeholder:browse.searchNeeds" placeholder="x">';
    I18n.apply();
    expect(document.querySelector('a').textContent).toBe('Donate');
    expect(document.querySelector('input').placeholder).toBe('Search requests...');
  });
});
