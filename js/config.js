/**
 * LALA Bridge — configuração do front-end
 *
 * DEMO_MODE (padrão: true)
 *   - true: popula o navegador com dados fictícios de exemplo e mostra os
 *     botões "Entrar como demo" no login. As contas demo não têm senha e só
 *     podem ser acessadas por esses botões.
 *   - false: nenhum dado de exemplo é criado e o login de demonstração some.
 *     Use false em qualquer piloto com pessoas reais.
 *
 * DEMO_MODE e as credenciais públicas do Supabase vêm de js/env.js, gerado por
 * scripts/env.js a partir das variáveis de ambiente (LALA_DEMO_MODE,
 * SUPABASE_URL e SUPABASE_ANON_KEY).
 */
const LALA_ENV = window.LALA_ENV || {};

const LALA_CONFIG = Object.freeze({
  DEMO_MODE: LALA_ENV.DEMO_MODE === undefined ? true : LALA_ENV.DEMO_MODE,
  // 'supabase' quando a URL e a chave pública do projeto estão configuradas
  // (variáveis SUPABASE_URL e SUPABASE_ANON_KEY); senão, 'local' (localStorage).
  BACKEND: LALA_ENV.SUPABASE_URL && LALA_ENV.SUPABASE_ANON_KEY ? 'supabase' : 'local',
  SUPABASE_URL: LALA_ENV.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: LALA_ENV.SUPABASE_ANON_KEY || '',
  // Senha das contas demo do Supabase (só se DEMO_MODE; ver scripts/seed-demo.js).
  DEMO_PASSWORD: LALA_ENV.DEMO_PASSWORD || '',
  ...(window.LALA_CONFIG_OVERRIDE || {}),
});

window.LALA_CONFIG = LALA_CONFIG;

/**
 * Gera um id único com prefixo (ex.: 'don-1731461234567-k3j9x2a1').
 * Usa crypto.randomUUID quando disponível; o horário ajuda a ordenar.
 */
function newId(prefix) {
  const rand =
    globalThis.crypto && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}-${Date.now()}-${rand}`;
}

window.newId = newId;
