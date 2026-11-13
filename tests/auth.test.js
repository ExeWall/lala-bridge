import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from './helpers/load-app.js';

describe('Auth: senhas', () => {
  let Auth;
  beforeEach(() => {
    ({ Auth } = loadApp());
  });

  it('não guarda a senha em texto puro', async () => {
    const res = await Auth.registerDonor({
      name: 'Empresa Teste',
      email: 'empresa@example.com',
      password: 'segredo123',
      country: 'Brazil',
    });
    expect(res.success).toBe(true);
    const stored = localStorage.getItem(Auth.STORAGE_KEY);
    expect(stored).not.toContain('segredo123');
    const user = Auth.getUsers().find((u) => u.email === 'empresa@example.com');
    expect(user.password).toBeUndefined();
    expect(user.passwordHash).toMatch(/^[0-9a-f]{64}$/);
    expect(user.passwordSalt).toMatch(/^[0-9a-f]{32}$/);
  });

  it('usa salts diferentes para a mesma senha', async () => {
    const a = await Auth._credentialsFor('igual');
    const b = await Auth._credentialsFor('igual');
    expect(a.passwordSalt).not.toBe(b.passwordSalt);
    expect(a.passwordHash).not.toBe(b.passwordHash);
  });

  it('faz login com a senha certa e recusa a errada', async () => {
    await Auth.registerDonor({
      name: 'D',
      email: 'd@example.com',
      password: 'certa123',
      country: 'Brazil',
    });
    expect((await Auth.login('d@example.com', 'errada')).success).toBe(false);
    expect((await Auth.login('D@EXAMPLE.COM', 'certa123')).success).toBe(true);
    expect(Auth.isLoggedIn()).toBe(true);
  });

  it('migra contas antigas com senha em texto puro no primeiro login', async () => {
    Auth.saveUsers([
      { id: 'donor-old', type: 'donor', name: 'Old', email: 'old@example.com', password: 'abc123' },
    ]);
    expect((await Auth.login('old@example.com', 'abc123')).success).toBe(true);
    const user = Auth.getUsers()[0];
    expect(user.password).toBeUndefined();
    expect(user.passwordHash).toBeTruthy();
    Auth.logout();
    expect((await Auth.login('old@example.com', 'abc123')).success).toBe(true);
  });
});

describe('Auth: verificação do código LALA', () => {
  let Auth;
  const base = {
    email: 'ana@example.com',
    password: 'senha123',
    verificationCode: 'lala-vlb32-003',
    camp: 'VLB32',
    country: 'Brazil',
  };
  beforeEach(() => {
    ({ Auth } = loadApp());
  });

  it('recusa código inexistente', () => {
    expect(Auth.verifyLaliderCode('LALA-XXX-999', 'Qualquer').valid).toBe(false);
  });

  it('valida o nome ignorando acentos, caixa e espaços extras', () => {
    expect(Auth.verifyLaliderCode('LALA-VLB32-003', '  ana  BEATRIZ silva ').valid).toBe(true);
    expect(Auth.verifyLaliderCode('LALA-VLB32-001', 'maria gonzalez').valid).toBe(true);
  });

  it('recusa nome diferente do registrado', () => {
    const res = Auth.verifyLaliderCode('LALA-VLB32-003', 'Outra Pessoa');
    expect(res.valid).toBe(false);
    expect(res.message).toMatch(/nome/i);
  });

  it('permite pular a checagem de nome na verificação ao digitar', () => {
    expect(Auth.verifyLaliderCode('LALA-VLB32-003', null, { checkName: false }).valid).toBe(true);
  });

  it('impede reutilizar um código já cadastrado, mesmo após recarregar', async () => {
    const first = await Auth.registerLalider({ ...base, name: 'ana beatriz silva' });
    expect(first.success).toBe(true);
    expect(first.user.name).toBe('Ana Beatriz Silva'); // grafia registrada

    // Simula recarregar a página: novas instâncias, mesmo localStorage.
    ({ Auth } = loadApp({ keepStorage: true }));
    expect(Auth.isCodeRegistered('LALA-VLB32-003')).toBe(true);
    const second = await Auth.registerLalider({
      ...base,
      email: 'outra@example.com',
      name: 'Ana Beatriz Silva',
    });
    expect(second.success).toBe(false);
  });

  it('não cadastra Lalíder com nome divergente', async () => {
    const res = await Auth.registerLalider({ ...base, name: 'Impostor' });
    expect(res.success).toBe(false);
    expect(Auth.getUsers().some((u) => u.email === base.email)).toBe(false);
  });
});

describe('Auth: modo demo', () => {
  it('com DEMO_MODE ativo, cria contas demo e permite entrar sem senha', () => {
    const { Auth } = loadApp({ config: { DEMO_MODE: true } });
    const accounts = Auth.getDemoAccounts();
    expect(accounts.map((u) => u.type).sort()).toEqual(['donor', 'lalider']);
    expect(Auth.loginAsDemo(accounts[0].id).success).toBe(true);
    expect(Auth.getCurrentUser().id).toBe(accounts[0].id);
  });

  it('contas demo não aceitam login por senha', async () => {
    const { Auth } = loadApp({ config: { DEMO_MODE: true } });
    expect((await Auth.login('techcorp@example.com', 'demo123')).success).toBe(false);
  });

  it('com DEMO_MODE desligado, não há dados de exemplo nem login demo', () => {
    const { Auth, Donations } = loadApp({ config: { DEMO_MODE: false } });
    expect(Auth.getUsers()).toEqual([]);
    expect(Donations.getAll()).toEqual([]);
    expect(Auth.getDemoAccounts()).toEqual([]);
    expect(Auth.loginAsDemo('donor-001').success).toBe(false);
  });
});

describe('Auth: validação e sessão', () => {
  let Auth;
  beforeEach(() => {
    ({ Auth } = loadApp());
  });

  it('recusa nome vazio, e-mail inválido e senha curta', async () => {
    const ok = { name: 'D', email: 'd@example.com', password: 'abcdef', country: 'Brazil' };
    expect((await Auth.registerDonor({ ...ok, name: '  ' })).success).toBe(false);
    expect((await Auth.registerDonor({ ...ok, email: 'sem-arroba' })).success).toBe(false);
    expect((await Auth.registerDonor({ ...ok, password: '123' })).success).toBe(false);
    expect(Auth.getUsers()).toHaveLength(0);
  });

  it('não cria duas contas quando o mesmo cadastro é enviado em paralelo', async () => {
    const data = { name: 'D', email: 'd@example.com', password: 'abcdef', country: 'Brazil' };
    const results = await Promise.all([Auth.registerDonor(data), Auth.registerDonor(data)]);
    expect(results.filter((r) => r.success)).toHaveLength(1);
    expect(Auth.getUsers()).toHaveLength(1);
  });

  it('ignora espaços e caixa no e-mail', async () => {
    await Auth.registerDonor({
      name: 'D',
      email: '  D@Example.com ',
      password: 'abcdef',
      country: 'Brazil',
    });
    expect(Auth.getUsers()[0].email).toBe('D@Example.com');
    expect((await Auth.login(' d@example.com ', 'abcdef')).success).toBe(true);
  });

  it('sessão que aponta para conta inexistente não conta como login', () => {
    localStorage.setItem(Auth.SESSION_KEY, JSON.stringify({ userId: 'fantasma', type: 'donor' }));
    expect(Auth.isLoggedIn()).toBe(false);
    expect(Auth.isDonor()).toBe(false);
  });
});

describe('Auth: contas demo em navegador com dados antigos', () => {
  it('converte as contas demo antigas (com senha em texto puro) e cria as que faltam', () => {
    localStorage.clear();
    localStorage.setItem(
      'lala_bridge_users',
      JSON.stringify([
        {
          id: 'donor-001',
          type: 'donor',
          name: 'Tech Corp Foundation',
          email: 'techcorp@example.com',
          password: 'demo123',
        },
        {
          id: 'donor-999',
          type: 'donor',
          name: 'Real',
          email: 'real@example.com',
          passwordHash: 'x',
          passwordSalt: 'y',
        },
      ])
    );
    localStorage.setItem(
      'lala_bridge_needs',
      JSON.stringify([{ id: 'need-001', laliderId: 'LALA-VLB32-001', status: 'open' }])
    );
    const { Auth, Donations } = loadApp({ keepStorage: true, config: { DEMO_MODE: true } });
    const tech = Auth.getUsers().find((u) => u.id === 'donor-001');
    expect(tech.password).toBeUndefined();
    expect(tech.demoLogin).toBe(true);
    expect(Auth.getUsers().find((u) => u.id === 'donor-999').passwordHash).toBe('x');
    expect(Auth.getDemoAccounts()).toHaveLength(2);
    expect(Donations.getNeedById('need-001').laliderId).toBe('lalider-sample-maria');
  });
});
