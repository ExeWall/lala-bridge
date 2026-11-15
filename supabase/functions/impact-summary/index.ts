// Edge Function "impact-summary": gera, para o doador, um resumo curto e
// verdadeiro do relato que o Lalíder escreveu depois da entrega.
import { handleError, json, preflight, AppError } from '../_shared/http.ts';
import { aiContext } from '../_shared/ai/context.ts';
import { redactPII } from '../_shared/ai/provider.ts';
import { normalizeImpactSummary } from '../_shared/ai/normalize.ts';
import { PROMPTS } from '../_shared/prompts.generated.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const { ai, db, userId } = await aiContext(req, 'impact-summary', ['lalider']);
    const { updateId } = await req.json();
    const { data: update } = await db.from('impact_updates').select('*').eq('id', updateId).maybeSingle();
    if (!update || update.author_id !== userId) throw new AppError('impact.onlyLalider', 403);
    const { data: offer } = await db.from('offers').select('donation_id, need_id').eq('id', update.offer_id).single();
    if (!offer) throw new AppError('offers.notFound', 404);
    const { data: donation } = offer.donation_id
      ? await db.from('donations').select('title').eq('id', offer.donation_id).single()
      : { data: null };
    const { data: profile } = await db.from('profiles').select('display_name').eq('id', userId).single();

    const raw = await ai.chatJSON([
      { role: 'system', content: PROMPTS.impactSummary },
      {
        role: 'user',
        content: `Equipamento: "${donation?.title ?? 'equipamento doado'}"\nLalíder: "${profile?.display_name}"\nRelato: "${redactPII(update.text)}"\nJSON:`,
      },
    ]);
    let summary: string;
    try {
      summary = normalizeImpactSummary(raw);
    } catch {
      throw new AppError('ai.invalidOutput', 502);
    }
    await db.from('impact_updates').update({ summary }).eq('id', updateId);
    return json({ summary });
  } catch (err) {
    return handleError(err);
  }
});
