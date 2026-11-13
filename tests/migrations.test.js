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

describe('Migrations v3: localização e áreas', () => {
  it('converte país, estado, cidade em texto livre e área de interesse', () => {
    localStorage.clear();
    localStorage.setItem('lala_bridge_schema_version', '2');
    localStorage.setItem(
      'lala_bridge_users',
      JSON.stringify([
        {
          id: 'u1',
          type: 'lalider',
          country: 'Brazil',
          state: 'Pernambuco',
          areaOfInterest: 'Data Science & AI',
        },
        { id: 'u2', type: 'donor', country: 'Mexico', state: 'CDMX' },
        { id: 'u3', type: 'donor', country: 'Narnia' },
      ])
    );
    localStorage.setItem(
      'lala_bridge_donations',
      JSON.stringify([
        { id: 'd1', country: 'Recife, Brazil' },
        { id: 'd2', country: 'Canada' },
      ])
    );
    localStorage.setItem(
      'lala_bridge_needs',
      JSON.stringify([{ id: 'n1', laliderId: 'u1', country: 'Brazil', state: 'são paulo' }])
    );

    const { Auth, Donations } = loadApp({ keepStorage: true });
    const [u1, u2, u3] = Auth.getUsers();
    expect(u1).toMatchObject({ country: 'BR', state: 'PE', areaOfInterest: 'data' });
    expect(u2).toMatchObject({ country: 'MX', state: 'CDMX' });
    expect(u3.country).toBe('Narnia'); // desconhecido: mantém
    expect(Donations.getById('d1')).toMatchObject({ country: 'BR', city: 'Recife' });
    expect(Donations.getById('d2').country).toBe('CA');
    expect(Donations.getNeedById('n1')).toMatchObject({ country: 'BR', state: 'SP' });
  });
});
