// Validação e normalização das respostas da IA. Nada que a IA devolve é
// confiado: valores fora do esperado são descartados ou trocados por padrões.

export const CATEGORIES = ['laptop', 'phone', 'headphones', 'monitor', 'peripherals', 'books', 'other'] as const;
export const CONDITIONS = ['new', 'like-new', 'good', 'fair'] as const;
export const URGENCIES = ['high', 'medium', 'low'] as const;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;
const positive = (v: unknown, max: number): number | undefined => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v);
  return Number.isFinite(n) && n > 0 && n <= max ? Math.round(n * 10) / 10 : undefined;
};

export type Requirements = { ramGb?: number; storageGb?: number; os?: string; camera?: boolean };

export function normalizeRequirements(raw: unknown): Requirements {
  const r = isObj(raw) ? raw : {};
  const out: Requirements = {};
  const ram = positive(r.ram_gb ?? r.ramGb, 128);
  const storage = positive(r.armazenamento_gb ?? r.storageGb, 8192);
  const os = text(r.so ?? r.os, 30);
  if (ram) out.ramGb = ram;
  if (storage) out.storageGb = storage;
  if (os) out.os = os;
  if (typeof r.camera === 'boolean') out.camera = r.camera;
  return out;
}

export function normalizeStructuredNeed(raw: unknown) {
  if (!isObj(raw)) throw new Error('ai.invalidOutput');
  const category = oneOf(raw.categoria ?? raw.category, CATEGORIES, 'other');
  const title = text(raw.titulo ?? raw.title, 80);
  if (!title) throw new Error('ai.invalidOutput');
  return {
    category,
    title,
    intendedUse: text(raw.uso_pretendido ?? raw.intendedUse, 200),
    requirements: normalizeRequirements(raw.requisitos_minimos ?? raw.requirements),
    urgency: oneOf(raw.urgencia_sugerida ?? raw.urgency, URGENCIES, 'medium'),
    justification: text(raw.justificativa ?? raw.justification, 300),
  };
}

export function normalizeDonationAnalysis(raw: unknown) {
  if (!isObj(raw)) throw new Error('ai.invalidOutput');
  const specsRaw = isObj(raw.specs_visiveis) ? raw.specs_visiveis : {};
  const specs: Requirements & { screenIn?: number; processor?: string } = normalizeRequirements(specsRaw);
  const screen = positive(specsRaw.tela_pol, 100);
  const cpu = text(specsRaw.processador, 60);
  if (screen) specs.screenIn = screen;
  if (cpu) specs.processor = cpu;
  const uses = Array.isArray(raw.usos_recomendados)
    ? raw.usos_recomendados.map((u) => text(u, 60)).filter(Boolean).slice(0, 4)
    : [];
  const confidence = Number(raw.confianca);
  return {
    category: oneOf(raw.categoria, CATEGORIES, 'other'),
    model: text(raw.marca_modelo_provavel, 80),
    condition: oneOf(raw.estado_estimado, CONDITIONS, 'good'),
    specs,
    recommendedUses: uses,
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.5,
    notes: text(raw.observacoes, 200),
  };
}

export function normalizeImpactSummary(raw: unknown): string {
  const summary = isObj(raw) ? text(raw.resumo ?? raw.summary, 300) : '';
  if (!summary) throw new Error('ai.invalidOutput');
  return summary;
}
