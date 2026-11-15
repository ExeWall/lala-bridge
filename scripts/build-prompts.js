/**
 * Gera supabase/functions/_shared/prompts.generated.ts a partir de ai/prompts/*.md.
 * Os .md são a fonte (legíveis e versionados); as Edge Functions importam o .ts.
 * Rode depois de editar um prompt: npm run ai:prompts (o teste avisa se esquecer).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

export function buildPrompts() {
  const entries = readdirSync('ai/prompts')
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => {
      const key = f.replace(/\.md$/, '').replace(/-(\w)/g, (_, c) => c.toUpperCase());
      const text = readFileSync(`ai/prompts/${f}`, 'utf8')
        .replace(/<!--[\s\S]*?-->\s*/g, '')
        .trim();
      return `  ${key}: ${JSON.stringify(text)},`;
    });
  return `// Gerado por scripts/build-prompts.js a partir de ai/prompts/*.md. Não edite.\nexport const PROMPTS = {\n${entries.join('\n')}\n} as const;\n`;
}

if (process.argv[1]?.endsWith('build-prompts.js')) {
  writeFileSync('supabase/functions/_shared/prompts.generated.ts', buildPrompts());
  console.log('prompts.generated.ts atualizado');
}
