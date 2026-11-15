// Edge Function "analyze-donation": sugere categoria, modelo provável, estado,
// specs visíveis e usos recomendados a partir de 1 a 3 fotos. O doador
// confirma ou corrige tudo antes de publicar.
import { handleError, json, preflight, AppError } from '../_shared/http.ts';
import { aiContext } from '../_shared/ai/context.ts';
import { redactPII } from '../_shared/ai/provider.ts';
import { normalizeDonationAnalysis } from '../_shared/ai/normalize.ts';
import { PROMPTS } from '../_shared/prompts.generated.ts';

const MAX_IMAGE_CHARS = 1_500_000; // ~1 MB por imagem em base64

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const { ai } = await aiContext(req, 'analyze-donation', ['donor', 'admin']);
    const { images, title } = await req.json();
    const list = Array.isArray(images) ? images.slice(0, 3) : [];
    const valid = list.filter(
      (img: unknown) =>
        typeof img === 'string' &&
        img.length < MAX_IMAGE_CHARS &&
        (/^data:image\/(jpeg|png|webp);base64,/.test(img) || /^https:\/\//.test(img)),
    );
    if (!valid.length) throw new AppError('ai.imagesMissing');
    const hint = title ? `Título escrito pelo doador: "${redactPII(String(title)).slice(0, 120)}"` : 'Sem título.';
    const raw = await ai.vision(PROMPTS.analyzeDonation, `${hint}\nAnalise as fotos e responda em JSON.`, valid);
    try {
      return json({ suggestion: normalizeDonationAnalysis(raw), source: 'ai' });
    } catch {
      throw new AppError('ai.invalidOutput', 502);
    }
  } catch (err) {
    return handleError(err);
  }
});
