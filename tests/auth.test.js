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
    expect(res.message).toMatch(/name/i);
  });

  it('permite pular a checagem de nome na verificação ao digitar', () => {
    expect(Auth.verifyLaliderCode('LALA-VLB32-003', null, { checkName: false }).valid).toBe(true);
  });

  it('impede reutilizar um código já cadastrado, mesmo após recarregar', async () => {
    const first = await Auth.registerLalider({ ...base, name: 'Ana Beatriz Silva' });
    expect(first.success).toBe(true);

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
