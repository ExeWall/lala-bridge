import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildPrompts } from '../scripts/build-prompts.js';

describe('prompts de IA', () => {
  it('o arquivo gerado para as Edge Functions está em dia com ai/prompts/*.md', () => {
    const current = readFileSync('supabase/functions/_shared/prompts.generated.ts', 'utf8');
    expect(current, 'rode: npm run ai:prompts').toBe(buildPrompts());
  });
});
