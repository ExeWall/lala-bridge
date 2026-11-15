-- =============================================================================
-- LALA Bridge — IA (similaridade semântica) e confiança (sinalizações)
-- =============================================================================

-- Similaridade de cosseno entre os pedidos e as doações da pessoa logada:
--   Lalíder: seus pedidos abertos × doações disponíveis da mesma categoria;
--   Doador: suas doações disponíveis × pedidos abertos da mesma categoria.
-- Só vale para itens que já têm embedding (Edge Function embed).
create or replace function public.semantic_scores()
returns table (need_id uuid, donation_id uuid, similarity double precision)
language sql
stable
security definer
set search_path = public
as $$
  select n.id, d.id, 1 - (n.embedding <=> d.embedding)
  from public.needs n
  join public.donations d on d.category = n.category
  where n.status = 'open' and d.status = 'available'
    and n.embedding is not null and d.embedding is not null
    and vector_dims(n.embedding) = vector_dims(d.embedding)
    and (n.lalider_id = auth.uid() or d.donor_id = auth.uid());
$$;

-- Pedidos de OUTRAS pessoas com texto quase idêntico (uso da Edge Function embed).
create or replace function public.similar_needs(p_need_id uuid, p_threshold double precision default 0.95)
returns table (id uuid, title text, similarity double precision)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.title, 1 - (o.embedding <=> n.embedding)
  from public.needs n
  join public.needs o on o.id <> n.id and o.lalider_id is distinct from n.lalider_id
  where n.id = p_need_id and n.embedding is not null and o.embedding is not null
    and vector_dims(o.embedding) = vector_dims(n.embedding)
    and 1 - (o.embedding <=> n.embedding) >= p_threshold;
$$;

grant execute on function public.semantic_scores() to authenticated;
revoke execute on function public.semantic_scores() from public, anon;
revoke execute on function public.similar_needs(uuid, double precision) from public, anon, authenticated;

-- ------------------------------------------------------------ sinalizações
-- Regras simples e explicáveis. Só criam sinalizações para revisão humana.
-- As mesmas regras rodam no navegador no modo local (js/trust.js).

create or replace function public.raise_flag(p_type text, p_id uuid, p_reason text, p_score numeric, p_evidence text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.flags (entity_type, entity_id, reason, score, details)
  values (p_type, p_id, p_reason, p_score, jsonb_build_object('evidence', p_evidence))
  on conflict (entity_type, entity_id, reason) do nothing;
$$;
revoke execute on function public.raise_flag(text, uuid, text, numeric, text) from public, anon, authenticated;

-- Padrões comuns em golpes de "doação" (pedir dinheiro, frete, pix, links externos).
create or replace function public.scam_pattern(p_text text)
returns text
language sql
immutable
as $$
  select substring(lower(unaccent(coalesce(p_text, ''))) from
    '(pix|taxa|frete (pago|antecipado)|pague o frete|deposito|transferencia|pagamento|sinal de|bit\.ly|wa\.me|whatsapp|telegram|cartao de credito)');
$$;

-- Telefone ou e-mail escrito no texto público (expõe a pessoa).
create or replace function public.contact_in_text(p_text text)
returns text
language sql
immutable
as $$
  select coalesce(
    substring(coalesce(p_text, '') from '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}'),
    substring(coalesce(p_text, '') from '\(?[0-9]{2}\)?[ ]?9?[0-9]{4}[- ]?[0-9]{4}')
  );
$$;

create or replace function public.trust_check_donation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare hit text;
begin
  hit := public.scam_pattern(new.title || ' ' || new.description);
  if hit is not null then
    perform public.raise_flag('donation', new.id, 'scam_pattern', 0.7, 'Trecho: "' || hit || '"');
  end if;
  if public.contact_in_text(new.title || ' ' || new.description) is not null then
    perform public.raise_flag('donation', new.id, 'contact_in_text', 0.6, 'Contato pessoal no texto da doação');
  end if;
  return new;
end;
$$;

create or replace function public.trust_check_need()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare recent integer;
begin
  if public.contact_in_text(new.title || ' ' || new.description || ' ' || new.intended_use) is not null then
    perform public.raise_flag('need', new.id, 'contact_in_text', 0.6, 'Contato pessoal no texto do pedido');
  end if;
  if tg_op = 'INSERT' then
    select count(*) into recent from public.needs
    where lalider_id = new.lalider_id and created_at > now() - interval '24 hours';
    if recent >= 3 then
      perform public.raise_flag('profile', new.lalider_id, 'many_requests', least(1, 0.3 + recent * 0.1),
        recent || ' pedidos nas últimas 24 horas');
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.trust_check_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare same integer;
begin
  if coalesce(new.device_id, '') = '' then return new; end if;
  select count(*) into same from public.profiles where device_id = new.device_id;
  if same >= 3 then
    perform public.raise_flag('profile', new.id, 'many_accounts_device', least(1, 0.3 + same * 0.1),
      same || ' contas criadas no mesmo dispositivo');
  end if;
  return new;
end;
$$;

create trigger trust_donation after insert or update of title, description on public.donations
  for each row execute function public.trust_check_donation();
create trigger trust_need after insert or update of title, description, intended_use on public.needs
  for each row execute function public.trust_check_need();
create trigger trust_profile after insert on public.profiles
  for each row execute function public.trust_check_profile();

revoke execute on function public.trust_check_donation() from public, anon, authenticated;
revoke execute on function public.trust_check_need() from public, anon, authenticated;
revoke execute on function public.trust_check_profile() from public, anon, authenticated;
