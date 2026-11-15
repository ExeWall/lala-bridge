import { describe, it, expect } from 'vitest';
import { loadApp } from './helpers/load-app.js';

describe('LocalAI (alternativa sem IA)', () => {
  it('organiza o pedido do roteiro do Demo Day', () => {
    const { LocalAI } = loadApp();
    const s = LocalAI.structureNeed(
      'preciso de um notebook pra fazer curso de Python e mandar currículo, hoje só tenho o celular'
    );
    expect(s.category).toBe('laptop');
    expect(s.requirements.ramGb).toBe(8);
    expect(s.urgency).toBe('high');
    expect(s.intendedUse).toBe('Fazer curso de Python e mandar currículo');
    expect(s.title).toBe('Notebook para fazer curso de Python e mandar currículo');
  });

  it('lê specs escritas de vários jeitos', () => {
    const { LocalAI } = loadApp();
    expect(LocalAI.parseSpecs('Dell Inspiron 15 — 8GB RAM, SSD 256GB, Windows 11')).toEqual({
      ramGb: 8,
      storageGb: 256,
      os: 'Windows',
    });
    expect(LocalAI.parseSpecs('memória de 16 GB e HD de 1 TB')).toMatchObject({ ramGb: 16 });
    expect(LocalAI.parseSpecs('celular com câmera boa pra videochamada').camera).toBe(true);
  });

  it('detecta categoria e urgência baixa', () => {
    const { LocalAI } = loadApp();
    const s = LocalAI.structureNeed('queria um fone pra assistir aula, sem pressa');
    expect(s.category).toBe('headphones');
    expect(s.urgency).toBe('low');
  });

  it('AI.structureNeed no modo local usa as regras e avisa a origem', async () => {
    const { AI } = loadApp();
    const r = await AI.structureNeed('preciso de celular para estágio remoto');
    expect(r).toMatchObject({ success: true, source: 'local' });
    expect(r.suggestion.category).toBe('phone');
    expect((await AI.structureNeed('oi')).success).toBe(false);
  });
});
