// Edge Function "structure-need": transforma o texto livre (ou transcrição do
// áudio) de um Lalíder em um pedido estruturado, que ele revisa antes de publicar.
import { handleError, json, preflight, AppError } from '../_shared/http.ts';
import { aiContext } from '../_shared/ai/context.ts';
import { redactPII } from '../_shared/ai/provider.ts';
import { normalizeStructuredNeed } from '../_shared/ai/normalize.ts';
import { PROMPTS } from '../_shared/prompts.generated.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const { ai } = await aiContext(req, 'structure-need', ['lalider']);
    const { text } = await req.json();
    const input = redactPII(String(text ?? '')).trim();
    if (input.length < 5) throw new AppError('ai.textTooShort');
    const raw = await ai.chatJSON([
      { role: 'system', content: PROMPTS.structureNeed },
      { role: 'user', content: `Texto: "${input.slice(0, 1500)}"\nJSON:` },
    ]);
    try {
      return json({ suggestion: normalizeStructuredNeed(raw), source: 'ai' });
    } catch {
      throw new AppError('ai.invalidOutput', 502);
    }
  } catch (err) {
    return handleError(err);
  }
});
