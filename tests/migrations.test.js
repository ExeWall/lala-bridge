import { describe, it, expect } from 'vitest';
import { loadApp } from './helpers/load-app.js';

describe('Migrations', () => {
  it('converte códigos de verificação em user.id em pedidos e doações', () => {
    localStorage.clear();
    localStorage.setItem(
      'lala_bridge_users',
      JSON.stringify([{ id: 'lalider-123', type: 'lalider', verificationCode: 'LALA-VLB32-003' }])
    );
    localStorage.setItem(
      'lala_bridge_needs',
      JSON.stringify([
        { id: 'need-1', laliderId: 'LALA-VLB32-003', status: 'open' },
        { id: 'need-2', laliderId: 'LALA-UNKNOWN', status: 'open' },
      ])
    );
    localStorage.setItem(
      'lala_bridge_donations',
      JSON.stringify([
        { id: 'don-1', status: 'matched', matchedTo: 'LALA-VLB32-003' },
        { id: 'don-2', status: 'available' },
      ])
    );

    const { Donations, Migrations } = loadApp({ keepStorage: true });

    expect(Migrations.getVersion()).toBe(Migrations.CURRENT_VERSION);
    expect(Donations.getAllNeeds().map((n) => n.laliderId)).toEqual([
      'lalider-123',
      'LALA-UNKNOWN',
    ]);
    expect(Donations.getAll()[0].matchedTo).toBe('lalider-123');
    expect(Donations.getAll()[1].matchedTo).toBeUndefined();
  });

  it('os dados de exemplo do modo demo já usam user.id', () => {
    const { Auth, Donations } = loadApp({ config: { DEMO_MODE: true } });
    const userIds = new Set(Auth.getUsers().map((u) => u.id));
    Donations.getAllNeeds().forEach((n) => expect(userIds.has(n.laliderId)).toBe(true));
    Donations.getAll()
      .filter((d) => d.matchedTo)
      .forEach((d) => expect(userIds.has(d.matchedTo)).toBe(true));
  });
});
