import { assertEquals, assertThrows, assertStringIncludes } from 'jsr:@std/assert@1';
import { normalizeDonationAnalysis, normalizeImpactSummary, normalizeStructuredNeed } from './normalize.ts';
import { AIProvider, redactPII } from './provider.ts';
import { PROMPTS } from '../prompts.generated.ts';

Deno.test('pedido estruturado: aceita o formato do prompt e descarta valores inválidos', () => {
  const ok = normalizeStructuredNeed({
    categoria: 'laptop',
    titulo: 'Notebook para curso de Python',
    uso_pretendido: 'Estudar Python',
    requisitos_minimos: { ram_gb: '8', armazenamento_gb: -1, so: 'Windows', camera: 'sim' },
    urgencia_sugerida: 'urgentissimo',
    justificativa: 'Programação pede 8 GB.',
  });
  assertEquals(ok.category, 'laptop');
  assertEquals(ok.requirements, { ramGb: 8, os: 'Windows' });
  assertEquals(ok.urgency, 'medium');
  assertEquals(normalizeStructuredNeed({ categoria: 'nave espacial', titulo: 'x' }).category, 'other');
  assertThrows(() => normalizeStructuredNeed('texto solto'));
  assertThrows(() => normalizeStructuredNeed({ categoria: 'laptop' }));
});

Deno.test('análise de foto: normaliza estado, specs, usos e confiança', () => {
  const a = normalizeDonationAnalysis({
    categoria: 'laptop',
    marca_modelo_provavel: 'Lenovo IdeaPad 3',
    estado_estimado: 'quebrado',
    specs_visiveis: { tela_pol: 15.6, ram_gb: 8 },
    usos_recomendados: ['estudos', '', 'aulas online', 'a', 'b', 'c'],
    confianca: 7,
  });
  assertEquals(a.condition, 'good');
  assertEquals(a.specs, { ramGb: 8, screenIn: 15.6 });
  assertEquals(a.recommendedUses.length, 4);
  assertEquals(a.confidence, 1);
});

Deno.test('resumo de impacto exige texto', () => {
  assertEquals(normalizeImpactSummary({ resumo: 'Obrigado!' }), 'Obrigado!');
  assertThrows(() => normalizeImpactSummary({}));
});

Deno.test('dados pessoais são removidos antes de ir para a IA', () => {
  const clean = redactPII('Meu zap é (81) 99876-5432, email ana@x.com, cpf 123.456.789-00, veja https://x.co/a');
  assertEquals(clean.includes('99876'), false);
  assertEquals(clean.includes('ana@x.com'), false);
  assertEquals(clean.includes('123.456'), false);
  assertStringIncludes(clean, '[telefone]');
});

Deno.test('prompts gerados existem e estão em PT-BR', () => {
  assertStringIncludes(PROMPTS.structureNeed, 'Responda **somente** com um objeto JSON');
  assertStringIncludes(PROMPTS.analyzeDonation, 'usos_recomendados');
  assertStringIncludes(PROMPTS.impactSummary, 'resumo');
});

// Banco falso só com o que o provedor usa (contagem diária e log).
function fakeDb(callsToday = 0) {
  const inserted: unknown[] = [];
  return {
    inserted,
    from: () => ({
      select: () => ({ gte: () => Promise.resolve({ count: callsToday }) }),
      insert: (row: unknown) => {
        inserted.push(row);
        return Promise.resolve({});
      },
    }),
  };
}

Deno.test('provedor: chama /chat/completions, lê JSON e registra uso e custo', async () => {
  Deno.env.set('AI_BASE_URL', 'https://ia.exemplo/v1');
  Deno.env.set('AI_API_KEY', 'chave');
  Deno.env.set('AI_CHAT_MODEL', 'modelo-x');
  Deno.env.set('AI_PRICE_INPUT_PER_MTOK', '1');
  Deno.env.set('AI_PRICE_OUTPUT_PER_MTOK', '2');
  let url = '';
  const fetchImpl = ((u: string) => {
    url = u;
    return Promise.resolve(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"ok": true}' } }],
          usage: { prompt_tokens: 1000, completion_tokens: 500 },
        }),
      ),
    );
  }) as unknown as typeof fetch;
  const db = fakeDb();
  // deno-lint-ignore no-explicit-any
  const ai = new AIProvider(db as any, 'teste', 'u1', fetchImpl);
  assertEquals(await ai.chatJSON([{ role: 'user', content: 'oi' }]), { ok: true });
  assertEquals(url, 'https://ia.exemplo/v1/chat/completions');
  const log = db.inserted[0] as { cost_usd: number; ok: boolean; model: string };
  assertEquals(log.ok, true);
  assertEquals(log.model, 'modelo-x');
  assertEquals(log.cost_usd, (1000 * 1 + 500 * 2) / 1_000_000);
});

Deno.test('provedor: respeita o limite diário', async () => {
  Deno.env.set('AI_DAILY_LIMIT', '10');
  // deno-lint-ignore no-explicit-any
  const ai = new AIProvider(fakeDb(10) as any, 'teste', null, (() => {
    throw new Error('não deveria chamar');
  }) as unknown as typeof fetch);
  let error = '';
  try {
    await ai.chatJSON([{ role: 'user', content: 'oi' }]);
  } catch (err) {
    error = (err as Error).message;
  }
  assertEquals(error, 'ai.limitReached');
});
