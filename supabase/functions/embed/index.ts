// Edge Function "embed": calcula o embedding de um pedido ou doação recém-criado
// (para o matching semântico) e procura textos quase idênticos de outras
// pessoas, criando uma sinalização para revisão humana (nunca bloqueia).
import { handleError, json, preflight, AppError } from '../_shared/http.ts';
import { aiContext } from '../_shared/ai/context.ts';

const DUPLICATE_THRESHOLD = 0.95;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const { ai, db, userId } = await aiContext(req, 'embed');
    const { kind, id } = await req.json();
    if (!['need', 'donation'].includes(kind) || typeof id !== 'string') throw new AppError('ai.invalidInput');
    const table = kind === 'need' ? 'needs' : 'donations';
    const owner = kind === 'need' ? 'lalider_id' : 'donor_id';
    const { data: row } = await db.from(table).select('*').eq('id', id).maybeSingle();
    if (!row || row[owner] !== userId) throw new AppError('offers.notFound', 404);

    const text = [row.title, row.intended_use, row.description].filter(Boolean).join('. ');
    const [embedding] = await ai.embed([text]);
    await db.from(table).update({ embedding: JSON.stringify(embedding) }).eq('id', id);

    if (kind === 'need') {
      const { data: dupes } = await db.rpc('similar_needs', { p_need_id: id, p_threshold: DUPLICATE_THRESHOLD });
      for (const d of dupes ?? []) {
        await db.from('flags').upsert(
          {
            entity_type: 'need',
            entity_id: id,
            reason: 'duplicate_text',
            score: Math.min(1, d.similarity),
            details: { evidence: `Parecido (${Math.round(d.similarity * 100)}%) com o pedido "${d.title}"`, other_need: d.id },
          },
          { onConflict: 'entity_type,entity_id,reason', ignoreDuplicates: true },
        );
      }
    }
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
});
