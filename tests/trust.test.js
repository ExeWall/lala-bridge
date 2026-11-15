import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from './helpers/load-app.js';
import { seedUsers } from './helpers/fixtures.js';

describe('Trust (sinalizações para revisão humana, modo local)', () => {
  let Auth, Api, Trust, users;
  beforeEach(() => {
    ({ Auth, Api, Trust } = loadApp());
    users = seedUsers(Auth);
  });

  const need = (title, description = '') => ({
    category: 'laptop',
    title,
    description,
    urgency: 'medium',
  });

  it('golpe e contato no texto da doação viram sinalização, e a doação continua publicada', async () => {
    Auth.startSession(users.donor);
    const r = await Api.createDonation({
      category: 'laptop',
      title: 'Notebook',
      description: 'Para retirar, pague o frete antecipado no PIX. Zap (81) 99876-5432',
      condition: 'good',
      country: 'BR',
      state: 'PE',
      city: 'Recife',
    });
    expect(r.success).toBe(true);
    const reasons = Trust.getFlags()
      .map((f) => f.reason)
      .sort();
    expect(reasons).toEqual(['contact_in_text', 'scam_pattern']);
  });

  it('pedido quase idêntico ao de outra pessoa é sinalizado', async () => {
    Auth.startSession(users.lalider);
    await Api.createNeed(need('Notebook para ciência de dados', 'Quero estudar Python e Jupyter'));
    Auth.startSession(users.lalider2);
    await Api.createNeed(need('Notebook para ciência de dados', 'Quero estudar Python e Jupyter'));
    const dup = Trust.getFlags().find((f) => f.reason === 'duplicate_text');
    expect(dup.entityType).toBe('need');
  });

  it('o mesmo texto da mesma pessoa não conta como duplicado, mas muitos pedidos em 24h sim', async () => {
    Auth.startSession(users.lalider);
    for (let i = 0; i < 3; i++) await Api.createNeed(need(`Pedido ${i}`));
    const reasons = Trust.getFlags().map((f) => f.reason);
    expect(reasons).toContain('many_requests');
    expect(reasons).not.toContain('duplicate_text');
  });

  it('a terceira conta no mesmo dispositivo é sinalizada', async () => {
    for (const n of [1, 2, 3]) {
      await Auth.registerDonor({
        name: `D${n}`,
        email: `d${n}@example.com`,
        password: 'abcdef',
        consent: true,
        country: 'BR',
        state: 'PE',
        city: 'Recife',
      });
    }
    expect(Trust.getFlags().filter((f) => f.reason === 'many_accounts_device')).toHaveLength(1);
  });

  it('revisão humana muda o status e não apaga nada', async () => {
    Auth.startSession(users.donor);
    await Api.createDonation({
      category: 'phone',
      title: 'Celular, só pagar a taxa',
      condition: 'good',
      country: 'BR',
      state: 'PE',
      city: 'Recife',
    });
    const [flag] = Trust.getFlags();
    expect(Trust.reviewFlag(flag.id, 'dismissed', 'admin').status).toBe('dismissed');
    expect(Trust.reviewFlag(flag.id, 'apagar', 'admin')).toBeNull();
  });
});
