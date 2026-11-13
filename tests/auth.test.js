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
