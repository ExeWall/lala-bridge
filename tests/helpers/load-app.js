import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';

// Mesma ordem em que as páginas HTML carregam os scripts.
export const SCRIPTS = [
  'js/config.js',
  'js/mock-data.js',
  'js/auth.js',
  'js/donations.js',
  'js/offers.js',
  'js/migrations.js',
  'js/app.js',
];

/**
 * Carrega os scripts clássicos do app em um escopo novo e devolve os módulos.
 * Cada chamada cria instâncias novas; o localStorage é limpo antes, a menos
 * que `keepStorage` seja true (útil para testar migrações). `config` sobrescreve
 * LALA_CONFIG (o padrão nos testes é DEMO_MODE: false).
 */
export function loadApp({ keepStorage = false, config } = {}) {
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  }
  if (!keepStorage) localStorage.clear();
  // Por padrão os testes rodam sem dados de exemplo (DEMO_MODE desligado).
  window.LALA_CONFIG_OVERRIDE = { DEMO_MODE: false, ...config };

  const code = SCRIPTS.map((file) => resolve(process.cwd(), file))
    .filter((path) => existsSync(path))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n;\n');

  const names = ['LALA_CONFIG', 'MockDB', 'Auth', 'Donations', 'Offers', 'Migrations', 'App'];
  const exportsCode = `return { ${names
    .map((n) => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`)
    .join(', ')} };`;

  return new Function(`${code}\n${exportsCode}`)();
}
