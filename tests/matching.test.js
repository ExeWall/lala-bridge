import { describe, it, expect } from 'vitest';
import { loadApp } from './helpers/load-app.js';

const now = new Date('2026-11-15T12:00:00Z');
const need = (over = {}) => ({
  id: 'n1',
  laliderId: 'l1',
  category: 'laptop',
  title: 'Notebook para curso de Python',
  intendedUse: 'Estudar programação em Python e enviar currículos',
  description: '',
  requirements: { ramGb: 8 },
  urgency: 'high',
  country: 'BR',
  state: 'PE',
  status: 'open',
  createdAt: '2026-11-05T12:00:00Z',
  ...over,
});
const donation = (over = {}) => ({
  id: 'd1',
  donorId: 'u1',
  category: 'laptop',
  title: 'Notebook Lenovo 8GB RAM SSD 256GB',
  description: 'Bom para programação, estudos e currículo',
  specs: {},
  country: 'BR',
  state: 'PE',
  status: 'available',
  ...over,
});

describe('Matching', () => {
  it('categoria diferente não gera match', () => {
    const { Matching } = loadApp();
    expect(Matching.score(need(), donation({ category: 'phone' }), { now })).toBeNull();
  });

  it('combina requisitos, localização, urgência, espera e semântica, e explica em linguagem simples', () => {
    const { Matching } = loadApp();
    const m = Matching.score(need(), donation(), { now });
    expect(m.score).toBeGreaterThanOrEqual(80);
    expect(m.reasons).toContain('Atende 8 GB de RAM');
    expect(m.reasons).toContain('Mesmo estado (PE)');
    expect(m.reasons.length).toBeLessThanOrEqual(3);
  });

  it('specs confirmadas pelo doador têm prioridade sobre o título', () => {
    const { Matching } = loadApp();
    const m = Matching.score(need(), donation({ title: 'Notebook', specs: { ramGb: 4 } }), { now });
    expect(m.reasons[0]).toBe('Atenção: não atende 8 GB de RAM');
    const good = Matching.score(need(), donation({ title: 'Notebook', specs: { ramGb: 8 } }), {
      now,
    });
    expect(good.score).toBeGreaterThan(m.score);
  });

  it('mesma UF > mesma região > outro estado', () => {
    const { Matching } = loadApp();
    const pe = Matching.score(need(), donation({ state: 'PE' }), { now }).score;
    const ba = Matching.score(need(), donation({ state: 'BA' }), { now }).score;
    const sp = Matching.score(need(), donation({ state: 'SP' }), { now }).score;
    expect(pe).toBeGreaterThan(ba);
    expect(ba).toBeGreaterThan(sp);
    const reasons = Matching.score(need(), donation({ state: 'BA' }), { now }).reasons;
    expect(reasons).toContain('Mesma região (Nordeste)');
  });

  it('pedidos esperando há mais tempo sobem (ninguém fica esquecido)', () => {
    const { Matching } = loadApp();
    const fresh = Matching.score(need({ createdAt: '2026-11-15T00:00:00Z' }), donation(), {
      now,
    }).score;
    const old = Matching.score(need({ createdAt: '2026-10-01T00:00:00Z' }), donation(), {
      now,
    }).score;
    expect(old).toBeGreaterThan(fresh);
  });

  it('usa a similaridade do servidor (embeddings) quando existe', () => {
    const { Matching, Store } = loadApp();
    const low = Matching.score(need(), donation({ description: 'xyz' }), { now }).score;
    Store.set(Matching.SIMILARITY_KEY, { 'n1|d1': 0.9 });
    const high = Matching.score(need(), donation({ description: 'xyz' }), { now });
    expect(high.score).toBeGreaterThan(low);
    expect(high.factors.find((f) => f.key === 'semantic').source).toBe('embedding');
  });

  it('forNeed ordena as doações disponíveis e ignora as do próprio pedido', () => {
    const { Matching } = loadApp();
    const list = Matching.forNeed(need(), [
      donation({ id: 'a', state: 'SP' }),
      donation({ id: 'b' }),
      donation({ id: 'c', status: 'matched' }),
      donation({ id: 'd', category: 'phone' }),
      donation({ id: 'e', donorId: 'l1' }),
    ]);
    expect(list.map((r) => r.donation.id)).toEqual(['b', 'a']);
  });

  it('similaridade de texto local ignora acentos e palavras vazias', () => {
    const { Matching } = loadApp();
    expect(Matching.textSimilarity('programação em Python', 'Programacao python')).toBeGreaterThan(
      0.9
    );
    expect(Matching.textSimilarity('notebook', 'livro de receitas')).toBe(0);
  });

  it('equidade: região bem menos atendida sobe e a razão aparece na explicação', () => {
    const { Matching } = loadApp();
    const regionStats = {
      SE: { total: 10, served: 8 },
      CO: { total: 10, served: 0 },
    };
    const go = need({ id: 'go', state: 'GO' });
    const sp = need({ id: 'sp', state: 'SP' });
    const d = donation({ state: 'MG' });
    const mGo = Matching.score(go, d, { now, regionStats });
    const mSp = Matching.score(sp, d, { now, regionStats });
    expect(mGo.score).toBeGreaterThan(mSp.score);
    expect(mGo.reasons).toContain('Prioridade: região Centro-Oeste recebeu menos doações');
    expect(mSp.reasons.join()).not.toMatch(/Prioridade/);
  });
});
