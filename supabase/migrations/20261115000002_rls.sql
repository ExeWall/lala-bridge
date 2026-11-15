-- =============================================================================
-- LALA Bridge — regras de acesso (Row Level Security)
--
-- Princípios:
--   - Cada pessoa só altera o que é seu, e só as colunas permitidas.
--   - Papel (role), verificação e status de doação/pedido/oferta nunca são
--     alterados direto pelo app: só pelas funções do servidor.
--   - Contatos (e-mail, nome completo) só são lidos pela função
--     get_offer_contact, depois de uma oferta aceita.
-- =============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table public.profiles enable row level security;
alter table public.verification_codes enable row level security;
alter table public.donations enable row level security;
alter table public.needs enable row level security;
alter table public.offers enable row level security;
alter table public.impact_updates enable row level security;
alter table public.flags enable row level security;
alter table public.ai_usage enable row level security;

-- Começa sem nenhum privilégio e libera só o necessário.
revoke all on all tables in schema public from anon, authenticated;

-- ---------------------------------------------------------------- profiles
grant select on public.profiles to authenticated;
grant update (organization, state, city, area_of_interest, shower_song) on public.profiles to authenticated;
grant select on public.public_profiles to anon, authenticated;

create policy "perfil: dono lê o próprio" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "perfil: dono edita campos permitidos" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ------------------------------------------------------ verification_codes
grant select, insert, update, delete on public.verification_codes to authenticated;
create policy "códigos: só admin" on public.verification_codes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- --------------------------------------------------------------- donations
grant select on public.donations to anon, authenticated;
grant insert (donor_id, donor_name, category, title, description, condition, specs, ai_suggestion, photos, country, state, city)
  on public.donations to authenticated;
grant update (title, description, condition, specs, photos) on public.donations to authenticated;

create policy "doações: disponíveis são públicas" on public.donations
  for select to anon, authenticated using (status = 'available');
create policy "doações: partes e admin veem as suas" on public.donations
  for select to authenticated using (
    donor_id = auth.uid() or matched_to = auth.uid() or public.is_admin()
    or exists (select 1 from public.offers o where o.donation_id = donations.id
               and (o.donor_id = auth.uid() or o.lalider_id = auth.uid()))
  );
create policy "doações: só doador publica" on public.donations
  for insert to authenticated with check (donor_id = auth.uid() and public.my_role() = 'donor');
create policy "doações: dono edita enquanto disponível" on public.donations
  for update to authenticated using (donor_id = auth.uid() and status = 'available')
  with check (donor_id = auth.uid());

-- ------------------------------------------------------------------- needs
grant select on public.needs to anon, authenticated;
grant insert (lalider_id, lalider_name, camp, country, state, category, title, description, intended_use, requirements, ai_suggestion, urgency)
  on public.needs to authenticated;
grant update (title, description, intended_use, requirements, urgency) on public.needs to authenticated;

create policy "pedidos: abertos são públicos" on public.needs
  for select to anon, authenticated using (status = 'open');
create policy "pedidos: partes e admin veem os seus" on public.needs
  for select to authenticated using (
    lalider_id = auth.uid() or matched_donor_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.offers o where o.need_id = needs.id
               and (o.donor_id = auth.uid() or o.lalider_id = auth.uid()))
  );
create policy "pedidos: só Lalíder verificado cria" on public.needs
  for insert to authenticated with check (lalider_id = auth.uid() and public.my_role() = 'lalider');
create policy "pedidos: dono edita enquanto aberto" on public.needs
  for update to authenticated using (lalider_id = auth.uid() and status = 'open')
  with check (lalider_id = auth.uid());

-- ------------------------------------------------------------------ offers
grant select on public.offers to authenticated;
create policy "ofertas: só as partes e admin" on public.offers
  for select to authenticated using (
    donor_id = auth.uid() or lalider_id = auth.uid() or public.is_admin()
  );

-- ----------------------------------------------------------- impact_updates
grant select on public.impact_updates to authenticated;
create policy "impacto: partes da oferta e admin" on public.impact_updates
  for select to authenticated using (
    public.is_admin() or exists (
      select 1 from public.offers o where o.id = impact_updates.offer_id
      and (o.donor_id = auth.uid() or o.lalider_id = auth.uid())
    )
  );

-- ------------------------------------------------------------------- flags
grant select, update (status, reviewed_by, reviewed_at) on public.flags to authenticated;
create policy "sinalizações: só admin" on public.flags
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- ai_usage
grant select on public.ai_usage to authenticated;
create policy "uso de IA: só admin lê" on public.ai_usage
  for select to authenticated using (public.is_admin());
