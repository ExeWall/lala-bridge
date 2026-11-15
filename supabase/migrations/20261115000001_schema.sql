-- =============================================================================
-- LALA Bridge — esquema do banco (Supabase / Postgres)
--
-- Tabelas: profiles, verification_codes, donations, needs, offers,
-- impact_updates, flags e ai_usage. As regras de acesso (RLS) ficam em
-- 20261115000002_rls.sql e as operações sensíveis em funções (…_functions.sql).
-- =============================================================================

create extension if not exists vector;
create extension if not exists unaccent;

-- Normaliza nomes para comparação: sem acento, minúsculo, espaços simples.
create or replace function public.normalize_name(value text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(trim(unaccent(coalesce(value, '')))), '\s+', ' ', 'g');
$$;

-- "Ana Beatriz Silva" -> "Ana S." (nome público dos Lalíderes)
create or replace function public.short_name(full_name text)
returns text
language sql
immutable
as $$
  select case
    when array_length(regexp_split_to_array(trim(full_name), '\s+'), 1) > 1 then
      split_part(trim(full_name), ' ', 1) || ' ' ||
      left((regexp_split_to_array(trim(full_name), '\s+'))[array_length(regexp_split_to_array(trim(full_name), '\s+'), 1)], 1) || '.'
    else trim(full_name)
  end;
$$;

-- -----------------------------------------------------------------------------
-- Perfis (1:1 com auth.users). Criados só pelo gatilho handle_new_user.
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('donor', 'lalider', 'admin')),
  full_name text not null check (length(trim(full_name)) > 0),
  display_name text not null,
  email text not null,
  organization text not null default '',
  country text not null default 'BR',
  state text not null default '',
  city text not null default '',
  camp text not null default '',
  area_of_interest text not null default '',
  shower_song text not null default '',
  verification_code text unique,
  verified boolean not null default false,
  consent_at timestamptz not null,
  consent_version text not null,
  device_id text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint br_needs_uf check (country <> 'BR' or state ~ '^[A-Z]{2}$')
);

-- Dados públicos de um perfil (sem e-mail, nome completo, cidade nem código).
create view public.public_profiles
with (security_invoker = false)
as
  select id, role, display_name,
         case when role = 'donor' then organization else '' end as organization,
         country, state, camp, verified
  from public.profiles;

-- -----------------------------------------------------------------------------
-- Códigos de verificação da LALA. Ninguém lê pelo app (só funções e admins).
-- -----------------------------------------------------------------------------
create table public.verification_codes (
  code text primary key check (code = upper(code)),
  registered_name text not null,
  camp text not null,
  country text not null default 'BR',
  used_by uuid references public.profiles (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Doações e pedidos
-- -----------------------------------------------------------------------------
create table public.donations (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid references public.profiles (id) on delete set null,
  donor_name text not null default '',
  category text not null check (category in ('laptop', 'phone', 'headphones', 'monitor', 'peripherals', 'books', 'other')),
  title text not null check (length(trim(title)) between 1 and 120),
  description text not null default '' check (length(description) <= 2000),
  condition text not null check (condition in ('new', 'like-new', 'good', 'fair')),
  specs jsonb not null default '{}'::jsonb,
  ai_suggestion jsonb,
  photos text[] not null default '{}',
  country text not null default 'BR',
  state text not null default '',
  city text not null default '',
  status text not null default 'available' check (status in ('available', 'matched', 'delivered')),
  matched_to uuid references public.profiles (id) on delete set null,
  offer_id uuid,
  matched_at timestamptz,
  delivered_at timestamptz,
  embedding vector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.needs (
  id uuid primary key default gen_random_uuid(),
  lalider_id uuid references public.profiles (id) on delete set null,
  lalider_name text not null default '',
  camp text not null default '',
  country text not null default 'BR',
  state text not null default '',
  category text not null check (category in ('laptop', 'phone', 'headphones', 'monitor', 'peripherals', 'books', 'other')),
  title text not null check (length(trim(title)) between 1 and 120),
  description text not null default '' check (length(description) <= 2000),
  intended_use text not null default '',
  requirements jsonb not null default '{}'::jsonb,
  ai_suggestion jsonb,
  urgency text not null default 'medium' check (urgency in ('high', 'medium', 'low')),
  status text not null default 'open' check (status in ('open', 'matched', 'delivered')),
  matched_donor_id uuid references public.profiles (id) on delete set null,
  matched_donation_id uuid references public.donations (id) on delete set null,
  offer_id uuid,
  matched_at timestamptz,
  delivered_at timestamptz,
  embedding vector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Ofertas (fluxo de match). Só mudam pelas funções offer_help, respond_offer…
-- -----------------------------------------------------------------------------
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  need_id uuid references public.needs (id) on delete set null,
  donation_id uuid references public.donations (id) on delete set null,
  donor_id uuid references public.profiles (id) on delete set null,
  lalider_id uuid references public.profiles (id) on delete set null,
  initiated_by text not null check (initiated_by in ('donor', 'lalider')),
  message text not null default '' check (length(message) <= 500),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'delivered')),
  closed_reason text check (closed_reason in ('declined', 'superseded', 'withdrawn', 'cancelled')),
  cancelled_by uuid,
  delivered_by uuid,
  accepted_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offer_has_item check (need_id is not null or donation_id is not null)
);

alter table public.donations
  add constraint donations_offer_fk foreign key (offer_id) references public.offers (id) on delete set null;
alter table public.needs
  add constraint needs_offer_fk foreign key (offer_id) references public.offers (id) on delete set null;

-- Relato de impacto depois da entrega
create table public.impact_updates (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  text text not null check (length(trim(text)) between 1 and 1000),
  photo text,
  summary text,
  created_at timestamptz not null default now()
);

-- Sinalizações para revisão humana (nunca bloqueiam nada sozinhas)
create table public.flags (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('profile', 'need', 'donation', 'offer')),
  entity_id uuid not null,
  reason text not null,
  score numeric not null default 0.5 check (score between 0 and 1),
  details jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'dismissed', 'confirmed')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (entity_type, entity_id, reason)
);

-- Registro de uso e custo de IA (por chamada), para o limite diário
create table public.ai_usage (
  id bigserial primary key,
  function_name text not null,
  user_id uuid,
  provider text not null default '',
  model text not null default '',
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  ok boolean not null default true,
  created_at timestamptz not null default now()
);

create index on public.donations (status, created_at desc);
create index on public.donations (donor_id);
create index on public.needs (status, created_at desc);
create index on public.needs (lalider_id);
create index on public.offers (donor_id);
create index on public.offers (lalider_id);
create index on public.ai_usage (created_at);
create index on public.flags (status, created_at desc);

-- updated_at automático
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger touch_profiles before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger touch_donations before update on public.donations
  for each row execute function public.touch_updated_at();
create trigger touch_needs before update on public.needs
  for each row execute function public.touch_updated_at();
create trigger touch_offers before update on public.offers
  for each row execute function public.touch_updated_at();
