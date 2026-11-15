// Contexto comum das funções de IA: login, papel e provedor com log de uso.
import { adminClient, requireUser } from '../supabase.ts';
import { AppError } from '../http.ts';
import { AIProvider } from './provider.ts';

export async function aiContext(req: Request, functionName: string, roles?: string[]) {
  const { id } = await requireUser(req);
  const db = adminClient();
  const { data: profile } = await db.from('profiles').select('id, role, display_name').eq('id', id).maybeSingle();
  if (!profile) throw new AppError('auth.invalidLogin', 401);
  if (roles && !roles.includes(profile.role)) throw new AppError('admin.onlyAdmin', 403);
  return { userId: id, profile, db, ai: new AIProvider(db, functionName, id) };
}
