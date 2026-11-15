// Edge Function "transcribe": recebe um áudio curto (até ~1 min, 3 MB) e
// devolve o texto. O áudio não é guardado.
import { handleError, json, preflight, AppError } from '../_shared/http.ts';
import { aiContext } from '../_shared/ai/context.ts';

const MAX_BYTES = 3 * 1024 * 1024;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const { ai } = await aiContext(req, 'transcribe', ['lalider']);
    const form = await req.formData();
    const audio = form.get('audio');
    if (!(audio instanceof Blob) || audio.size === 0) throw new AppError('ai.audioMissing');
    if (audio.size > MAX_BYTES) throw new AppError('ai.audioTooLong');
    const text = await ai.transcribe(audio, String(form.get('language') ?? 'pt'));
    return json({ text });
  } catch (err) {
    return handleError(err);
  }
});
