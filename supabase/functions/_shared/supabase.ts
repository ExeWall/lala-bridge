// Clientes do Supabase dentro das Edge Functions.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { AppError } from './http.ts';

/** Cliente com a chave de serviço (ignora RLS). Use só para tarefas do servidor. */
export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
}

/** Cliente agindo como a pessoa que chamou (respeita RLS). */
export function userClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
}

/** Exige login e devolve o id da pessoa. */
export async function requireUser(req: Request): Promise<{ id: string; client: SupabaseClient }> {
  const client = userClient(req);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new AppError('auth.invalidLogin', 401);
  return { id: data.user.id, client };
}
