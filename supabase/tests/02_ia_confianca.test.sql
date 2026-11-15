-- Testes: similaridade semântica e sinalizações automáticas para revisão.
create schema if not exists tst;
create or replace function tst.signup2(p_email text, p_meta jsonb) returns uuid
language plpgsql security definer as $$
declare v uuid;
begin
  insert into auth.users (email, raw_user_meta_data) values (p_email, p_meta) returning id into v;
  return v;
end $$;
create or replace function tst.as_user2(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, false);
$$;
create or replace function tst.uid(p_email text) returns uuid
language sql security definer as $$ select id from auth.users where email = p_email $$;
grant usage on schema tst to authenticated;
grant execute on all functions in schema tst to authenticated;

do $$
declare
  donor uuid; yara uuid; joao uuid; d1 uuid; n1 uuid; n2 uuid;
begin
  donor := tst.signup2('ia-doador@exemplo.org', '{"role":"donor","full_name":"Mandacaru Labs","organization":"Mandacaru Labs","country":"BR","state":"CE","city":"Fortaleza","consent":true,"device_id":"dev-1"}');
  yara := tst.signup2('yara@exemplo.org', '{"role":"lalider","full_name":"Yara Batista","verification_code":"LALA-BLB10-003","country":"BR","state":"AM","city":"Manaus","consent":true,"device_id":"dev-1"}');
  joao := tst.signup2('joao@exemplo.org', '{"role":"lalider","full_name":"João Pedro Santos","verification_code":"LALA-BLB10-001","country":"BR","state":"BA","city":"Salvador","consent":true,"device_id":"dev-1"}');

  -- três contas no mesmo dispositivo → sinalização na terceira
  assert exists (select 1 from public.flags where entity_id = joao and reason = 'many_accounts_device'), 'muitas contas no dispositivo';

  insert into public.donations (donor_id, category, title, description, condition)
  values (donor, 'laptop', 'Notebook 8GB', 'Para retirar, pague o frete antecipado via PIX', 'good') returning id into d1;
  assert exists (select 1 from public.flags where entity_id = d1 and reason = 'scam_pattern'), 'padrão de golpe';

  insert into public.needs (lalider_id, category, title, description)
  values (yara, 'laptop', 'Notebook para ciência de dados', 'Me chama no (92) 99123-4567') returning id into n1;
  assert exists (select 1 from public.flags where entity_id = n1 and reason = 'contact_in_text'), 'contato no texto';

  insert into public.needs (lalider_id, category, title) values (joao, 'laptop', 'Notebook para ciência de dados') returning id into n2;

  -- embeddings fictícios (3 dimensões) para testar a similaridade
  update public.needs set embedding = '[1,0,0]' where id = n1;
  update public.needs set embedding = '[0.99,0.05,0]' where id = n2;
  update public.donations set embedding = '[0.9,0.1,0]' where id = d1;

  assert (select count(*) from public.similar_needs(n2, 0.95)) = 1, 'texto quase idêntico de outra pessoa';
  assert (select count(*) from public.similar_needs(n2, 0.9999)) = 0, 'limiar alto não acusa';

  -- muitos pedidos em 24h
  insert into public.needs (lalider_id, category, title) values (yara, 'phone', 'Celular 1'), (yara, 'phone', 'Celular 2');
  assert exists (select 1 from public.flags where entity_id = yara and reason = 'many_requests'), 'muitos pedidos';
end $$;

-- a Lalíder vê a similaridade dos próprios pedidos; outras funções são internas
set role authenticated;
select tst.as_user2(tst.uid('yara@exemplo.org'));
do $$ begin
  assert (select count(*) from public.semantic_scores()) = 1, 'similaridade do próprio pedido';
  assert (select similarity from public.semantic_scores()) > 0.9, 'valor de cosseno';
  assert (select count(*) from public.flags) = 0, 'Lalíder não vê sinalizações';
end $$;
do $$
begin
  begin
    perform public.similar_needs(gen_random_uuid(), 0.5);
    raise exception 'similar_needs deveria ser interno';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
