-- Testes do banco: cadastro, RLS, fluxo de ofertas, storage e LGPD.
-- Roda com scripts/test-db.sh. Qualquer "assert" falso derruba o teste.

create schema if not exists tst;
grant usage on schema tst to anon, authenticated;

create or replace function tst.signup(p_email text, p_meta jsonb) returns uuid
language plpgsql as $$
declare v uuid;
begin
  insert into auth.users (email, raw_user_meta_data) values (p_email, p_meta) returning id into v;
  return v;
end $$;

-- Executa um comando e confirma que ele falha com a mensagem esperada.
create or replace function tst.expect_error(p_sql text, p_expected text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if position(p_expected in sqlerrm) = 0 then
      raise exception 'esperava erro "%", veio "%" em: %', p_expected, sqlerrm, p_sql;
    end if;
    return;
  end;
  raise exception 'esperava erro "%", mas o comando funcionou: %', p_expected, p_sql;
end $$;

grant execute on all functions in schema tst to anon, authenticated;

create or replace function tst.uid(p_email text) returns uuid
language sql security definer as $$ select id from auth.users where email = p_email $$;

create or replace function tst.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, false);
$$;

-- --------------------------------------------------------------- cadastro
do $$
declare
  donor uuid; ana uuid; carlos uuid;
begin
  donor := tst.signup('doador@exemplo.org', '{"role":"donor","full_name":"Ipê Sistemas","organization":"Ipê Sistemas","country":"BR","state":"pe","city":"Recife","consent":true,"consent_version":"2026-11-13"}');
  ana := tst.signup('ana@exemplo.org', '{"role":"lalider","full_name":"ana beatriz silva","verification_code":"lala-vlb32-003","country":"BR","state":"PE","city":"Recife","consent":true}');
  carlos := tst.signup('carlos@exemplo.org', '{"role":"lalider","full_name":"Carlos Mendoza","verification_code":"LALA-VLB32-002","country":"CO","city":"Bogotá","consent":true}');

  assert (select state from public.profiles where id = donor) = 'PE', 'UF normalizada';
  assert (select full_name from public.profiles where id = ana) = 'Ana Beatriz Silva', 'grafia oficial do nome';
  assert (select display_name from public.profiles where id = ana) = 'Ana S.', 'nome público';
  assert (select verified and camp = 'VLB32' from public.profiles where id = ana), 'Lalíder verificado com turma do código';
  assert (select used_by from public.verification_codes where code = 'LALA-VLB32-003') = ana, 'código marcado como usado';

  perform tst.expect_error($q$select tst.signup('x@x.org', '{"role":"lalider","full_name":"Ana Beatriz Silva","verification_code":"LALA-VLB32-003","country":"BR","state":"PE","consent":true}')$q$, 'auth.codeUsed');
  perform tst.expect_error($q$select tst.signup('y@x.org', '{"role":"lalider","full_name":"Impostor","verification_code":"LALA-VLB32-004","country":"BR","state":"PE","consent":true}')$q$, 'auth.nameMismatch');
  perform tst.expect_error($q$select tst.signup('z@x.org', '{"role":"lalider","full_name":"X","verification_code":"NAO-EXISTE","consent":true}')$q$, 'auth.invalidCode');
  perform tst.expect_error($q$select tst.signup('w@x.org', '{"role":"donor","full_name":"Sem Consentimento","country":"BR","state":"PE"}')$q$, 'consent.required');
  perform tst.expect_error($q$select tst.signup('adm@x.org', '{"role":"admin","full_name":"Hacker","consent":true}')$q$, 'auth.invalidRole');
  perform tst.expect_error($q$select tst.signup('uf@x.org', '{"role":"donor","full_name":"Sem UF","country":"BR","state":"","consent":true}')$q$, 'br_needs_uf');
end $$;

-- ------------------------------------------------- checagem prévia (anon)
grant execute on all functions in schema tst to anon, authenticated;

set role anon;
do $$ begin
  assert (public.check_lalider_code('LALA-VLB32-004') ->> 'valid')::boolean, 'código livre é válido';
  assert public.check_lalider_code('LALA-VLB32-003') ->> 'error' = 'auth.codeUsed', 'código usado';
  assert public.check_lalider_code('LALA-VLB32-004', 'gabriel ferreira') ->> 'valid' = 'true', 'nome sem acento/caixa';
  assert public.check_lalider_code('LALA-VLB32-004', 'Outro') ->> 'error' = 'auth.nameMismatch', 'nome errado';
end $$;
reset role;

-- --------------------------------------------------- publicação e RLS
set role authenticated;
select tst.as_user(tst.uid('doador@exemplo.org'));
do $$ begin
  -- nome de doador falsificado é ignorado: vem do perfil
  insert into public.donations (donor_id, donor_name, category, title, description, condition)
  values (auth.uid(), 'Banco Famoso S.A.', 'laptop', 'Lenovo IdeaPad 3 8GB', 'Revisado', 'good');
  assert (select donor_name from public.donations where title = 'Lenovo IdeaPad 3 8GB') = 'Ipê Sistemas', 'donor_name do perfil';
  assert (select city from public.donations where title = 'Lenovo IdeaPad 3 8GB') = 'Recife', 'localização do perfil';
  -- não lê perfil de outra pessoa nem códigos
  assert (select count(*) from public.profiles) = 1, 'só o próprio perfil';
  assert (select count(*) from public.verification_codes) = 0, 'códigos invisíveis';
  assert (select count(*) from public.public_profiles where display_name = 'Ana S.') = 1, 'perfil público visível';
  -- doador não cria pedido
  perform tst.expect_error($q$insert into public.needs (lalider_id, category, title) values (auth.uid(), 'laptop', 'x')$q$, 'row-level security');
  -- não muda papel nem status direto
  perform tst.expect_error($q$update public.profiles set role = 'admin' where id = auth.uid()$q$, 'permission denied');
  perform tst.expect_error($q$update public.donations set status = 'delivered'$q$, 'permission denied');
end $$;

select tst.as_user(tst.uid('ana@exemplo.org'));
do $$ begin
  insert into public.needs (lalider_id, category, title, description, urgency)
  values (auth.uid(), 'laptop', 'Notebook para curso de Python', 'Estudo pelo celular', 'high');
  assert (select state from public.needs where title = 'Notebook para curso de Python') = 'PE', 'UF do perfil';
  assert (select lalider_name from public.needs where title = 'Notebook para curso de Python') = 'Ana S.', 'nome curto';
  perform tst.expect_error($q$insert into public.donations (donor_id, category, title, condition) values (auth.uid(), 'laptop', 'x', 'good')$q$, 'row-level security');
end $$;
reset role;

set role anon;
do $$ begin
  assert (select count(*) from public.donations) = 1, 'anon vê doação disponível';
  assert (select count(*) from public.needs) = 1, 'anon vê pedido aberto';
  perform tst.expect_error('select * from public.profiles', 'permission denied');
  perform tst.expect_error('select * from public.offers', 'permission denied');
  perform tst.expect_error($q$select public.offer_help(gen_random_uuid())$q$, 'permission denied');
end $$;
reset role;

-- ------------------------------------------------------- fluxo de oferta
set role authenticated;
select tst.as_user(tst.uid('doador@exemplo.org'));
do $$
declare o public.offers;
begin
  o := public.offer_help(
    (select id from public.needs where title = 'Notebook para curso de Python'),
    (select id from public.donations where title = 'Lenovo IdeaPad 3 8GB'),
    'Temos um notebook pra você');
  assert o.status = 'pending' and o.initiated_by = 'donor', 'oferta pendente';
  assert public.get_offer_contact(o.id) is null, 'sem contato antes do aceite';
  perform tst.expect_error(format('select public.offer_help(%L)', o.need_id), 'offers.duplicateOffer');
  perform tst.expect_error(format('select public.respond_offer(%L, %L)', o.id, 'accept'), 'offers.onlyRecipient');
end $$;

-- terceiro (Carlos) não vê a oferta
select tst.as_user(tst.uid('carlos@exemplo.org'));
do $$ begin
  assert (select count(*) from public.offers) = 0, 'terceiro não vê ofertas';
end $$;

select tst.as_user(tst.uid('ana@exemplo.org'));
do $$
declare o public.offers; c jsonb;
begin
  select * into o from public.offers limit 1;
  o := public.respond_offer(o.id, 'accept');
  assert o.status = 'accepted', 'aceita';
  assert (select status from public.needs where id = o.need_id) = 'matched', 'pedido matched';
  assert (select status from public.donations where id = o.donation_id) = 'matched', 'doação matched';
  c := public.get_offer_contact(o.id);
  assert c ->> 'email' = 'doador@exemplo.org', 'contato revelado após aceite';
  o := public.mark_delivered(o.id);
  assert o.status = 'delivered', 'entregue';
  perform public.add_impact_update(o.id, 'Já terminei o primeiro módulo de Python!');
  assert (public.impact_stats() ->> 'delivered')::int = 1, 'impacto agregado';
  assert (public.impact_stats() ->> 'ewasteKg')::numeric = 2.0, 'peso estimado do notebook';
end $$;

reset role;

set role authenticated;
select tst.as_user(tst.uid('doador@exemplo.org'));
insert into public.donations (donor_id, category, title, condition) values (auth.uid(), 'phone', 'Moto G 64GB', 'good');
select tst.as_user(tst.uid('carlos@exemplo.org'));
do $$
declare o public.offers;
begin
  -- Lalíder pede, não pode responder o próprio pedido e pode retirá-lo
  o := public.request_donation((select id from public.donations where title = 'Moto G 64GB'), null, 'Para estágio');
  assert o.initiated_by = 'lalider' and o.donor_id is not null, 'pedido de doação';
  perform tst.expect_error(format('select public.respond_offer(%L, %L)', o.id, 'accept'), 'offers.onlyRecipient');
  o := public.cancel_offer(o.id);
  assert o.closed_reason = 'withdrawn', 'retirada por quem enviou';
  -- pede de novo
  o := public.request_donation((select id from public.donations where title = 'Moto G 64GB'));
end $$;

select tst.as_user(tst.uid('doador@exemplo.org'));
do $$
declare o public.offers;
begin
  select * into o from public.offers where status = 'pending' and initiated_by = 'lalider';
  perform tst.expect_error(format('select public.cancel_offer(%L)', o.id), 'offers.useDecline');
  o := public.respond_offer(o.id, 'accept');
  assert (select status from public.donations where id = o.donation_id) = 'matched', 'doação matched';
  -- cancelar o match devolve a doação
  o := public.cancel_offer(o.id);
  assert o.closed_reason = 'cancelled', 'match cancelado';
  assert (select status from public.donations where id = o.donation_id) = 'available', 'doação disponível de novo';
  assert public.get_offer_contact(o.id) is null, 'contato some após cancelar';
end $$;
reset role;

-- --------------------------------------------------------------- storage
set role authenticated;
select tst.as_user(tst.uid('doador@exemplo.org'));
do $$ begin
  insert into storage.objects (bucket_id, name) values ('donation-photos', auth.uid()::text || '/foto1.jpg');
  perform tst.expect_error($q$insert into storage.objects (bucket_id, name) values ('donation-photos', '00000000-0000-0000-0000-000000000000/x.jpg')$q$, 'row-level security');
end $$;
reset role;

-- ------------------------------------------------------------------ LGPD
set role authenticated;
select tst.as_user(tst.uid('ana@exemplo.org'));
do $$ begin
  assert (public.export_my_data() -> 'profile' ->> 'email') = 'ana@exemplo.org', 'exporta os próprios dados';
  perform public.delete_my_account();
end $$;
reset role;

do $$ begin
  assert not exists (select 1 from public.profiles where email = 'ana@exemplo.org'), 'perfil removido';
  assert (select count(*) from public.needs where status = 'delivered' and lalider_id is null and description = '') = 1,
    'entrega concluída fica anônima';
  assert (select used_by from public.verification_codes where code = 'LALA-VLB32-003') is null, 'código liberado';
  assert (select count(*) from public.impact_updates) = 0, 'relatos apagados';
end $$;
