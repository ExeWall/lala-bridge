-- =============================================================================
-- LALA Bridge — funções do servidor
--
-- As regras de negócio que não podem depender do navegador ficam aqui
-- (security definer, executam com privilégios do dono e validam auth.uid()).
-- Os erros usam como mensagem a chave de tradução do front-end
-- (ex.: 'offers.needClosed'), que o app traduz para o idioma da pessoa.
-- =============================================================================

-- ------------------------------------------------- cadastro e verificação
-- Checagem prévia do código LALA (chamada antes do cadastro, inclusive por anon).
create or replace function public.check_lalider_code(p_code text, p_name text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v public.verification_codes;
begin
  select * into v from public.verification_codes where code = upper(trim(p_code));
  if not found then
    return jsonb_build_object('valid', false, 'error', 'auth.invalidCode');
  end if;
  if v.used_by is not null then
    return jsonb_build_object('valid', false, 'error', 'auth.codeUsed');
  end if;
  if p_name is not null and public.normalize_name(p_name) <> public.normalize_name(v.registered_name) then
    return jsonb_build_object('valid', false, 'error', 'auth.nameMismatch');
  end if;
  return jsonb_build_object('valid', true, 'camp', v.camp, 'country', v.country);
end;
$$;

-- Cria o perfil quando a conta é criada no Supabase Auth. Os dados vêm de
-- options.data do signUp (raw_user_meta_data). Papel 'admin' nunca vem daqui.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role text := meta ->> 'role';
  v_name text := trim(coalesce(meta ->> 'full_name', ''));
  v_code text := upper(trim(coalesce(meta ->> 'verification_code', '')));
  v_entry public.verification_codes;
  v_country text := upper(coalesce(nullif(meta ->> 'country', ''), 'BR'));
  v_state text := coalesce(meta ->> 'state', '');
begin
  if v_role not in ('donor', 'lalider') then
    raise exception 'auth.invalidRole';
  end if;
  if coalesce((meta ->> 'consent')::boolean, false) is not true then
    raise exception 'consent.required';
  end if;
  if v_name = '' then
    raise exception 'auth.nameRequired';
  end if;
  if v_country = 'BR' then
    v_state := upper(v_state);
  end if;

  if v_role = 'lalider' then
    select * into v_entry from public.verification_codes where code = v_code for update;
    if not found then raise exception 'auth.invalidCode'; end if;
    if v_entry.used_by is not null then raise exception 'auth.codeUsed'; end if;
    if public.normalize_name(v_name) <> public.normalize_name(v_entry.registered_name) then
      raise exception 'auth.nameMismatch';
    end if;
    v_name := v_entry.registered_name; -- grafia oficial
  end if;

  insert into public.profiles (
    id, role, full_name, display_name, email, organization, country, state, city, camp,
    area_of_interest, shower_song, verification_code, verified, consent_at, consent_version, device_id
  ) values (
    new.id, v_role, v_name,
    case when v_role = 'lalider' then public.short_name(v_name)
         else coalesce(nullif(trim(meta ->> 'organization'), ''), v_name) end,
    coalesce(new.email, ''),
    case when v_role = 'donor' then coalesce(trim(meta ->> 'organization'), '') else '' end,
    v_country, v_state, trim(coalesce(meta ->> 'city', '')),
    case when v_role = 'lalider' then v_entry.camp else '' end,
    coalesce(meta ->> 'area_of_interest', ''),
    left(coalesce(meta ->> 'shower_song', ''), 120),
    case when v_role = 'lalider' then v_code end,
    v_role = 'lalider',
    now(),
    coalesce(meta ->> 'consent_version', ''),
    left(coalesce(meta ->> 'device_id', ''), 64)
  );

  if v_role = 'lalider' then
    update public.verification_codes set used_by = new.id, used_at = now() where code = v_code;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nome, turma e localização de doações e pedidos vêm do perfil (não do navegador).
create or replace function public.fill_donation_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = new.donor_id;
  new.donor_name := coalesce(nullif(p.organization, ''), p.display_name);
  new.status := 'available';
  if coalesce(new.country, '') = '' then new.country := p.country; end if;
  if coalesce(new.state, '') = '' then new.state := p.state; end if;
  if coalesce(new.city, '') = '' then new.city := p.city; end if;
  return new;
end;
$$;

create trigger fill_donation before insert on public.donations
  for each row execute function public.fill_donation_from_profile();

create or replace function public.fill_need_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = new.lalider_id;
  new.lalider_name := p.display_name;
  new.camp := p.camp;
  new.country := p.country;
  new.state := p.state;
  new.status := 'open';
  return new;
end;
$$;

create trigger fill_need before insert on public.needs
  for each row execute function public.fill_need_from_profile();

-- ------------------------------------------------------------- ofertas
create or replace function public.offer_help(p_need_id uuid, p_donation_id uuid default null, p_message text default '')
returns public.offers
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  n public.needs;
  d public.donations;
  o public.offers;
begin
  if public.my_role() is distinct from 'donor' then raise exception 'offers.onlyDonors'; end if;
  select * into n from public.needs where id = p_need_id;
  if not found then raise exception 'offers.needNotFound'; end if;
  if n.status <> 'open' then raise exception 'offers.needClosed'; end if;
  if p_donation_id is not null then
    select * into d from public.donations where id = p_donation_id;
    if not found or d.donor_id <> uid then raise exception 'offers.donationNotFound'; end if;
    if d.status <> 'available' then raise exception 'offers.donationUnavailable'; end if;
  end if;
  if exists (select 1 from public.offers where status = 'pending' and initiated_by = 'donor'
             and donor_id = uid and need_id = p_need_id) then
    raise exception 'offers.duplicateOffer';
  end if;
  insert into public.offers (need_id, donation_id, donor_id, lalider_id, initiated_by, message)
  values (p_need_id, p_donation_id, uid, n.lalider_id, 'donor', left(trim(coalesce(p_message, '')), 500))
  returning * into o;
  return o;
end;
$$;

create or replace function public.request_donation(p_donation_id uuid, p_need_id uuid default null, p_message text default '')
returns public.offers
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  n public.needs;
  d public.donations;
  o public.offers;
begin
  if public.my_role() is distinct from 'lalider' then raise exception 'offers.onlyLalideres'; end if;
  select * into d from public.donations where id = p_donation_id;
  if not found then raise exception 'offers.donationNotFound'; end if;
  if d.status <> 'available' then raise exception 'offers.donationUnavailable'; end if;
  if p_need_id is not null then
    select * into n from public.needs where id = p_need_id;
    if not found or n.lalider_id <> uid then raise exception 'offers.needNotFound'; end if;
    if n.status <> 'open' then raise exception 'offers.needClosed'; end if;
  end if;
  if exists (select 1 from public.offers where status = 'pending' and initiated_by = 'lalider'
             and lalider_id = uid and donation_id = p_donation_id) then
    raise exception 'offers.duplicateRequest';
  end if;
  insert into public.offers (need_id, donation_id, donor_id, lalider_id, initiated_by, message)
  values (p_need_id, p_donation_id, d.donor_id, uid, 'lalider', left(trim(coalesce(p_message, '')), 500))
  returning * into o;
  return o;
end;
$$;

create or replace function public.respond_offer(p_offer_id uuid, p_decision text)
returns public.offers
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  o public.offers;
  recipient uuid;
begin
  select * into o from public.offers where id = p_offer_id for update;
  if not found then raise exception 'offers.notFound'; end if;
  if o.status <> 'pending' then raise exception 'offers.alreadyAnswered'; end if;
  recipient := case when o.initiated_by = 'donor' then o.lalider_id else o.donor_id end;
  if recipient is distinct from uid then raise exception 'offers.onlyRecipient'; end if;

  if p_decision = 'decline' then
    update public.offers set status = 'declined', closed_reason = 'declined' where id = o.id returning * into o;
    return o;
  end if;
  if p_decision <> 'accept' then raise exception 'offers.invalidDecision'; end if;

  if o.need_id is not null and not exists (select 1 from public.needs where id = o.need_id and status = 'open' for update) then
    raise exception 'offers.needClosed';
  end if;
  if o.donation_id is not null and not exists (select 1 from public.donations where id = o.donation_id and status = 'available' for update) then
    raise exception 'offers.donationUnavailable';
  end if;

  update public.offers set status = 'accepted', accepted_at = now() where id = o.id returning * into o;
  if o.donation_id is not null then
    update public.donations set status = 'matched', matched_to = o.lalider_id, matched_at = now(), offer_id = o.id
    where id = o.donation_id;
  end if;
  if o.need_id is not null then
    update public.needs set status = 'matched', matched_donor_id = o.donor_id, matched_donation_id = o.donation_id,
      matched_at = now(), offer_id = o.id
    where id = o.need_id;
  end if;
  -- Encerra as outras ofertas pendentes para os mesmos itens.
  update public.offers set status = 'declined', closed_reason = 'superseded'
  where id <> o.id and status = 'pending'
    and ((o.need_id is not null and need_id = o.need_id) or (o.donation_id is not null and donation_id = o.donation_id));
  return o;
end;
$$;

create or replace function public.mark_delivered(p_offer_id uuid)
returns public.offers
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  o public.offers;
begin
  select * into o from public.offers where id = p_offer_id for update;
  if not found then raise exception 'offers.notFound'; end if;
  if uid is distinct from o.donor_id and uid is distinct from o.lalider_id then
    raise exception 'offers.onlyPartiesDeliver';
  end if;
  if o.status <> 'accepted' then raise exception 'offers.onlyAcceptedDeliver'; end if;
  update public.offers set status = 'delivered', delivered_at = now(), delivered_by = uid where id = o.id returning * into o;
  update public.donations set status = 'delivered', delivered_at = now() where id = o.donation_id;
  update public.needs set status = 'delivered', delivered_at = now() where id = o.need_id;
  return o;
end;
$$;

create or replace function public.cancel_offer(p_offer_id uuid)
returns public.offers
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  o public.offers;
  initiator uuid;
begin
  select * into o from public.offers where id = p_offer_id for update;
  if not found then raise exception 'offers.notFound'; end if;
  if uid is distinct from o.donor_id and uid is distinct from o.lalider_id then
    raise exception 'offers.onlyPartiesCancel';
  end if;
  if o.status = 'pending' then
    initiator := case when o.initiated_by = 'donor' then o.donor_id else o.lalider_id end;
    if initiator is distinct from uid then raise exception 'offers.useDecline'; end if;
    update public.offers set status = 'declined', closed_reason = 'withdrawn' where id = o.id returning * into o;
    return o;
  end if;
  if o.status = 'accepted' then
    update public.offers set status = 'declined', closed_reason = 'cancelled', cancelled_by = uid
    where id = o.id returning * into o;
    update public.donations set status = 'available', matched_to = null, matched_at = null, offer_id = null
    where id = o.donation_id;
    update public.needs set status = 'open', matched_donor_id = null, matched_donation_id = null,
      matched_at = null, offer_id = null
    where id = o.need_id;
    return o;
  end if;
  raise exception 'offers.cannotCancel';
end;
$$;

-- Contato da outra parte: só depois que a oferta é aceita.
create or replace function public.get_offer_contact(p_offer_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  o public.offers;
  other uuid;
  p public.profiles;
begin
  select * into o from public.offers where id = p_offer_id;
  if not found or o.status not in ('accepted', 'delivered') then return null; end if;
  if uid = o.donor_id then other := o.lalider_id;
  elsif uid = o.lalider_id then other := o.donor_id;
  else return null;
  end if;
  select * into p from public.profiles where id = other;
  if not found then return null; end if;
  return jsonb_build_object('name', p.full_name, 'email', p.email, 'organization', p.organization);
end;
$$;

-- ---------------------------------------------------------- impacto
create or replace function public.add_impact_update(p_offer_id uuid, p_text text, p_photo text default null)
returns public.impact_updates
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.offers;
  u public.impact_updates;
begin
  select * into o from public.offers where id = p_offer_id;
  if not found or o.lalider_id is distinct from auth.uid() then raise exception 'impact.onlyLalider'; end if;
  if o.status <> 'delivered' then raise exception 'impact.onlyDelivered'; end if;
  insert into public.impact_updates (offer_id, author_id, text, photo)
  values (p_offer_id, auth.uid(), left(trim(p_text), 1000), p_photo)
  returning * into u;
  return u;
end;
$$;

-- Peso médio estimado por categoria (kg), para "lixo eletrônico evitado".
-- Estimativa aproximada documentada em docs/impacto.md; livros não contam.
create or replace function public.category_weight_kg(p_category text)
returns numeric
language sql
immutable
as $$
  select case p_category
    when 'laptop' then 2.0 when 'phone' then 0.2 when 'headphones' then 0.3
    when 'monitor' then 4.0 when 'peripherals' then 0.5 when 'other' then 1.0
    else 0 end;
$$;

-- Números agregados de impacto (públicos; nenhum dado pessoal).
create or replace function public.impact_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'delivered', (select count(*) from public.donations where status = 'delivered'),
    'available', (select count(*) from public.donations where status = 'available'),
    'openNeeds', (select count(*) from public.needs where status = 'open'),
    'matched', (select count(*) from public.donations where status = 'matched'),
    'statesReached', (select coalesce(jsonb_agg(distinct n.state), '[]'::jsonb)
                      from public.offers o join public.needs n on n.id = o.need_id
                      where o.status = 'delivered' and n.state <> ''),
    'byCategory', (select coalesce(jsonb_object_agg(category, total), '{}'::jsonb) from (
                      select category, count(*) as total from public.donations
                      where status = 'delivered' group by category) c),
    'ewasteKg', (select coalesce(sum(public.category_weight_kg(category)), 0)
                 from public.donations where status = 'delivered')
  );
$$;

-- ---------------------------------------------------------- LGPD
create or replace function public.export_my_data()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'exportedAt', now(),
    'app', 'LALA Bridge',
    'profile', (select to_jsonb(p) - 'device_id' from public.profiles p where p.id = auth.uid()),
    'donations', (select coalesce(jsonb_agg(to_jsonb(d) - 'embedding'), '[]'::jsonb) from public.donations d where d.donor_id = auth.uid()),
    'needs', (select coalesce(jsonb_agg(to_jsonb(n) - 'embedding'), '[]'::jsonb) from public.needs n where n.lalider_id = auth.uid()),
    'offers', (select coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb) from public.offers o
               where o.donor_id = auth.uid() or o.lalider_id = auth.uid()),
    'impactUpdates', (select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb) from public.impact_updates i where i.author_id = auth.uid())
  );
$$;

-- Exclui a conta: cancela matches aceitos (devolvendo itens da outra parte),
-- apaga pendências e itens abertos, anonimiza entregas concluídas e remove o
-- usuário do Auth (o perfil cai junto, por cascata).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  r record;
begin
  if uid is null then raise exception 'auth.invalidLogin'; end if;

  for r in select id from public.offers where status = 'accepted' and (donor_id = uid or lalider_id = uid) loop
    perform public.cancel_offer(r.id);
  end loop;

  delete from public.offers where status in ('pending', 'declined') and (donor_id = uid or lalider_id = uid);
  update public.offers set message = '' where status = 'delivered' and (donor_id = uid or lalider_id = uid);
  delete from public.impact_updates where author_id = uid;

  delete from public.donations where donor_id = uid and status <> 'delivered';
  update public.donations set donor_name = '', description = '', city = '', photos = '{}', embedding = null
  where donor_id = uid;
  delete from public.needs where lalider_id = uid and status <> 'delivered';
  update public.needs set lalider_name = '', title = '[removido]', description = '', intended_use = '', embedding = null
  where lalider_id = uid;

  update public.verification_codes set used_by = null where used_by = uid;
  delete from auth.users where id = uid;
end;
$$;

-- ---------------------------------------------------------- permissões
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.fill_donation_from_profile() from public, anon, authenticated;
revoke all on function public.fill_need_from_profile() from public, anon, authenticated;
grant execute on function public.check_lalider_code(text, text) to anon, authenticated;
grant execute on function public.impact_stats() to anon, authenticated;
grant execute on function public.offer_help(uuid, uuid, text) to authenticated;
grant execute on function public.request_donation(uuid, uuid, text) to authenticated;
grant execute on function public.respond_offer(uuid, text) to authenticated;
grant execute on function public.mark_delivered(uuid) to authenticated;
grant execute on function public.cancel_offer(uuid) to authenticated;
grant execute on function public.get_offer_contact(uuid) to authenticated;
grant execute on function public.add_impact_update(uuid, text, text) to authenticated;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
revoke execute on function public.offer_help(uuid, uuid, text) from public, anon;
revoke execute on function public.request_donation(uuid, uuid, text) from public, anon;
revoke execute on function public.respond_offer(uuid, text) from public, anon;
revoke execute on function public.mark_delivered(uuid) from public, anon;
revoke execute on function public.cancel_offer(uuid) from public, anon;
revoke execute on function public.get_offer_contact(uuid) from public, anon;
revoke execute on function public.add_impact_update(uuid, text, text) from public, anon;
revoke execute on function public.export_my_data() from public, anon;
revoke execute on function public.delete_my_account() from public, anon;
