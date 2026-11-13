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
 * Na Fase 3 (Vite + Supabase) esta flag passa a vir de variável de ambiente.
 */
const LALA_CONFIG = Object.freeze({
  DEMO_MODE: true,
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
