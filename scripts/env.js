/**
 * Gera js/env.js com as variáveis PÚBLICAS do front-end e copia o SDK do
 * Supabase para js/vendor/. Roda antes de `npm run dev` e de `npm run build`.
 *
 * Só entram aqui valores que podem ir para o navegador: a URL do projeto e a
 * chave "anon" do Supabase (protegida pelas regras de RLS do banco). Chaves
 * secretas (service role, IA, e-mail) ficam só nas Edge Functions.
 *
 * Fontes, nesta ordem: variáveis de ambiente do processo (ex.: Vercel) e o
 * arquivo .env na raiz.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const PUBLIC_VARS = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'LALA_DEMO_MODE', 'LALA_DEMO_PASSWORD'];

function readDotEnv(path = '.env') {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}

const fileEnv = readDotEnv();
const env = {};
for (const name of PUBLIC_VARS) {
  const value = process.env[name] ?? fileEnv[name];
  if (value !== undefined && value !== '') env[name] = value;
}

const publicEnv = {
  SUPABASE_URL: env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY || '',
  DEMO_MODE: env.LALA_DEMO_MODE === undefined ? true : env.LALA_DEMO_MODE === 'true',
  // Só para as contas FICTÍCIAS de demonstração; nunca use para contas reais.
  DEMO_PASSWORD: env.LALA_DEMO_MODE === 'false' ? '' : env.LALA_DEMO_PASSWORD || '',
};

mkdirSync('js/vendor', { recursive: true });
writeFileSync(
  'js/env.js',
  `/* Gerado por scripts/env.js — não edite nem faça commit. */\nwindow.LALA_ENV = ${JSON.stringify(publicEnv, null, 2)};\n`
);
copyFileSync('node_modules/@supabase/supabase-js/dist/umd/supabase.js', 'js/vendor/supabase.js');

const mode = publicEnv.SUPABASE_URL && publicEnv.SUPABASE_ANON_KEY ? 'supabase' : 'local';
console.log(`js/env.js gerado (backend: ${mode}, DEMO_MODE: ${publicEnv.DEMO_MODE})`);
