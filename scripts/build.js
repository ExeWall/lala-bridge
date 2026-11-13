/**
 * Monta a pasta dist/ com os arquivos estáticos do site.
 *
 * Os scripts são clássicos (sem módulos ES), então não passam pelo bundler
 * do Vite: basta copiar HTML, CSS, JS e as traduções. Usado pelo deploy
 * na Vercel (vercel.json) e por `npm run build` localmente.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';

const OUT = 'dist';
const DIRS = ['css', 'js', 'locales'];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);

readdirSync('.')
  .filter((f) => f.endsWith('.html'))
  .forEach((f) => cpSync(f, `${OUT}/${f}`));

DIRS.filter((d) => existsSync(d)).forEach((d) => cpSync(d, `${OUT}/${d}`, { recursive: true }));

console.log(`Site estático montado em ${OUT}/`);
