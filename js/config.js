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
