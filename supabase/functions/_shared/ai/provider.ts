// Camada única de IA (chat, visão, embeddings e transcrição), compatível com
// a API da OpenAI. Troque de provedor só com variáveis de ambiente:
//
//   AI_BASE_URL       ex.: https://api.openai.com/v1 | https://api.groq.com/openai/v1
//                          | https://openrouter.ai/api/v1 | http://localhost:11434/v1 (Ollama)
//   AI_API_KEY        chave do provedor (segredo; nunca vai para o front-end)
//   AI_CHAT_MODEL     modelo de texto (JSON)          ex.: gpt-4o-mini
//   AI_VISION_MODEL   modelo com visão (fotos)        ex.: gpt-4o-mini
//   AI_EMBED_MODEL    modelo de embeddings            ex.: text-embedding-3-small
//   AI_STT_MODEL      modelo de fala para texto       ex.: whisper-1
//   AI_DAILY_LIMIT    máximo de chamadas por dia (padrão 300)
//   AI_PRICE_INPUT_PER_MTOK / AI_PRICE_OUTPUT_PER_MTOK  preço em US$ por 1M tokens
//                     (só para estimar o custo registrado em ai_usage)
//
// Toda chamada é registrada em public.ai_usage (função, modelo, tokens, custo).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { AppError } from '../http.ts';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<Record<string, unknown>>;
};

type Usage = { prompt_tokens?: number; completion_tokens?: number };

const env = (name: string, fallback = '') => Deno.env.get(name) ?? fallback;

export function aiConfigured(): boolean {
  return Boolean(env('AI_BASE_URL') && env('AI_API_KEY') && env('AI_CHAT_MODEL'));
}

/** Remove e-mails, telefones, CPFs e links antes de mandar texto à IA. */
export function redactPII(text: string): string {
  return String(text ?? '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[cpf]')
    .replace(/(\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/g, '[telefone]')
    .replace(/https?:\/\/\S+/g, '[link]')
    .slice(0, 4000);
}

export class AIProvider {
  constructor(
    private db: SupabaseClient,
    private functionName: string,
    private userId: string | null,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  private async checkDailyLimit() {
    const limit = Number(env('AI_DAILY_LIMIT', '300'));
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await this.db
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since);
    if ((count ?? 0) >= limit) throw new AppError('ai.limitReached', 429);
  }

  private async log(model: string, usage: Usage | undefined, ok: boolean) {
    const input = usage?.prompt_tokens ?? 0;
    const output = usage?.completion_tokens ?? 0;
    const cost =
      (input * Number(env('AI_PRICE_INPUT_PER_MTOK', '0')) +
        output * Number(env('AI_PRICE_OUTPUT_PER_MTOK', '0'))) / 1_000_000;
    await this.db.from('ai_usage').insert({
      function_name: this.functionName,
      user_id: this.userId,
      provider: new URL(env('AI_BASE_URL', 'http://local')).host,
      model,
      input_tokens: input,
      output_tokens: output,
      cost_usd: cost,
      ok,
    });
  }

  private async request(path: string, init: RequestInit, model: string): Promise<Response> {
    if (!aiConfigured()) throw new AppError('ai.notConfigured', 503);
    await this.checkDailyLimit();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await this.fetchImpl(`${env('AI_BASE_URL').replace(/\/$/, '')}${path}`, {
        ...init,
        signal: controller.signal,
        headers: { Authorization: `Bearer ${env('AI_API_KEY')}`, ...(init.headers ?? {}) },
      });
      if (!res.ok) {
        console.error(`IA ${path} ${res.status}:`, (await res.text()).slice(0, 500));
        await this.log(model, undefined, false);
        throw new AppError('ai.unavailable', 502);
      }
      return res;
    } catch (err) {
      if (err instanceof AppError) throw err;
      await this.log(model, undefined, false);
      throw new AppError('ai.unavailable', 502);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Chat que devolve JSON (response_format json_object). */
  async chatJSON(messages: ChatMessage[], model = env('AI_CHAT_MODEL')): Promise<unknown> {
    const res = await this.request(
      '/chat/completions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      },
      model,
    );
    const data = await res.json();
    await this.log(model, data.usage, true);
    const content = data.choices?.[0]?.message?.content ?? '';
    try {
      return JSON.parse(String(content).replace(/^```(json)?|```$/g, '').trim());
    } catch {
      throw new AppError('ai.invalidOutput', 502);
    }
  }

  /** Visão: texto + até 3 imagens (data URLs ou URLs públicas). */
  vision(system: string, text: string, images: string[]): Promise<unknown> {
    const content = [
      { type: 'text', text },
      ...images.slice(0, 3).map((url) => ({ type: 'image_url', image_url: { url, detail: 'low' } })),
    ];
    return this.chatJSON(
      [
        { role: 'system', content: system },
        { role: 'user', content },
      ],
      env('AI_VISION_MODEL', env('AI_CHAT_MODEL')),
    );
  }

  async embed(texts: string[]): Promise<number[][]> {
    const model = env('AI_EMBED_MODEL');
    if (!model) throw new AppError('ai.notConfigured', 503);
    const res = await this.request(
      '/embeddings',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, input: texts.map(redactPII) }),
      },
      model,
    );
    const data = await res.json();
    await this.log(model, { prompt_tokens: data.usage?.prompt_tokens ?? data.usage?.total_tokens }, true);
    return (data.data ?? []).map((d: { embedding: number[] }) => d.embedding);
  }

  async transcribe(audio: Blob, language = 'pt'): Promise<string> {
    const model = env('AI_STT_MODEL');
    if (!model) throw new AppError('ai.notConfigured', 503);
    const form = new FormData();
    form.append('file', audio, 'audio.webm');
    form.append('model', model);
    form.append('language', language);
    const res = await this.request('/audio/transcriptions', { method: 'POST', body: form }, model);
    const data = await res.json();
    await this.log(model, undefined, true);
    return String(data.text ?? '').trim();
  }
}
