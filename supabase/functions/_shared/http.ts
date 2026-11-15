// Utilitários HTTP das Edge Functions: CORS, respostas JSON e erros.

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/** Erro com chave de tradução do front-end (ex.: 'ai.unavailable'). */
export class AppError extends Error {
  constructor(public key: string, public status = 400) {
    super(key);
  }
}

export function handleError(err: unknown): Response {
  if (err instanceof AppError) return json({ error: err.key }, err.status);
  console.error(err);
  return json({ error: 'remote.genericError' }, 500);
}

export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders }) : null;
}
