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

describe('Migrations v4: dados demo brasileiros', () => {
  it('troca os dados demo antigos e preserva contas reais e o que criaram', () => {
    localStorage.clear();
    localStorage.setItem('lala_bridge_schema_version', '3');
    localStorage.setItem(
      'lala_bridge_users',
      JSON.stringify([
        { id: 'donor-001', type: 'donor', name: 'Tech Corp Foundation', demo: true },
        { id: 'lalider-sample-maria', type: 'lalider', name: 'María', demo: true },
        { id: 'donor-real', type: 'donor', name: 'Doador Real', email: 'r@example.com' },
      ])
    );
    localStorage.setItem(
      'lala_bridge_donations',
      JSON.stringify([
        { id: 'don-001', donorId: 'donor-001', title: 'Old', country: 'US' },
        { id: 'don-real', donorId: 'donor-real', title: 'Minha doação', status: 'available' },
      ])
    );
    localStorage.setItem(
      'lala_bridge_needs',
      JSON.stringify([{ id: 'need-001', laliderId: 'lalider-sample-maria', status: 'open' }])
    );
    localStorage.setItem(
      'lala_bridge_offers',
      JSON.stringify([
        { id: 'o-real', donorId: 'donor-real', laliderId: 'lalider-demo-ana', status: 'pending' },
        {
          id: 'o-orfa',
          donorId: 'donor-real',
          laliderId: 'lalider-sample-maria',
          status: 'pending',
        },
      ])
    );

    const { Auth, Donations, Offers, MockDB } = loadApp({
      keepStorage: true,
      config: { DEMO_MODE: true },
    });
    const ids = Auth.getUsers().map((u) => u.id);
    expect(ids).not.toContain('lalider-sample-maria');
    expect(ids).toContain('donor-real');
    expect(ids).toContain('lalider-sample-yara');
    expect(Donations.getById('don-001').title).toBe(MockDB.sampleDonations[0].title);
    expect(Donations.getById('don-real').title).toBe('Minha doação');
    expect(Donations.getNeedById('need-001').laliderId).toBe('lalider-sample-larissa');
    expect(Offers.getById('o-real')).not.toBeNull();
    expect(Offers.getById('o-orfa')).toBeNull();
  });

  it('com DEMO_MODE desligado não mexe em nada', () => {
    localStorage.clear();
    localStorage.setItem('lala_bridge_schema_version', '3');
    localStorage.setItem(
      'lala_bridge_users',
      JSON.stringify([{ id: 'donor-001', type: 'donor', name: 'Tech Corp', demo: true }])
    );
    const { Auth } = loadApp({ keepStorage: true, config: { DEMO_MODE: false } });
    expect(Auth.getUsers()[0].name).toBe('Tech Corp');
  });

  it('todos os dados demo são brasileiros e consistentes entre si', () => {
    const { Auth, Donations, Offers } = loadApp({ config: { DEMO_MODE: true } });
    const users = Auth.getUsers();
    const ufs = new Set(users.filter((u) => u.type === 'lalider').map((u) => u.state));
    ['PE', 'BA', 'SP', 'AM'].forEach((uf) => expect(ufs.has(uf)).toBe(true));
    users.forEach((u) => expect(u.country).toBe('BR'));
    const ids = new Set(users.map((u) => u.id));
    Donations.getAll().forEach((d) => expect(ids.has(d.donorId)).toBe(true));
    Donations.getAllNeeds().forEach((n) => expect(ids.has(n.laliderId)).toBe(true));
    Offers.getAll().forEach((o) => {
      expect(ids.has(o.donorId) && ids.has(o.laliderId)).toBe(true);
    });
    // cada Lalíder demo usa um código de verificação real da lista e com o nome certo
    users
      .filter((u) => u.type === 'lalider')
      .forEach((u) => {
        const { MockDB } = loadApp({ keepStorage: true, config: { DEMO_MODE: true } });
        const entry = MockDB.verificationCodes.find((c) => c.code === u.verificationCode);
        expect(entry.name).toBe(u.name);
      });
  });
});
