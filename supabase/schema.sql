-- ============================================================================
-- WebClient Hunter AI — Production Supabase database initialization
--
-- Run once in the Supabase SQL Editor for a new project. The script is safe to
-- re-run: tables and indexes are created if missing, and trigger/policy
-- definitions are refreshed. It creates no application-user data.
-- ============================================================================

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ----------------------------------------------------------------------------
-- Shared timestamp trigger
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Profiles: non-sensitive application metadata. Identity credentials remain in
-- auth.users and must never be mirrored into public tables.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text check (char_length(full_name) between 1 and 160),
  company     text not null default '' check (char_length(company) <= 160),
  website     text not null default '' check (char_length(website) <= 2048),
  plan        text not null default 'free' check (plan in ('free', 'starter', 'pro', 'agency')),
  audits_used integer not null default 0 check (audits_used >= 0),
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do update
    set full_name = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- User-owned lead records
-- ----------------------------------------------------------------------------
create table if not exists public.leads (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null check (char_length(trim(name)) between 1 and 200),
  url          text not null check (char_length(url) between 1 and 2048),
  niche        text not null default '' check (char_length(niche) <= 120),
  location     text not null default '' check (char_length(location) <= 160),
  status       text not null default 'new'
               check (status in ('new', 'contacted', 'interested', 'proposal', 'won', 'lost')),
  notes        text not null default '' check (char_length(notes) <= 5000),
  seo_score    smallint check (seo_score between 0 and 100),
  speed_score  smallint check (speed_score between 0 and 100),
  mobile_score smallint check (mobile_score between 0 and 100),
  created_at   timestamptz not null default timezone('utc', now()),
  updated_at   timestamptz not null default timezone('utc', now())
);

create index if not exists leads_user_created_idx on public.leads (user_id, created_at desc);
create index if not exists leads_user_status_idx on public.leads (user_id, status);
create index if not exists leads_user_niche_idx on public.leads (user_id, niche);
create index if not exists leads_name_trgm_idx on public.leads using gin (lower(name) extensions.gin_trgm_ops);

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Audit snapshots. The raw audit details are stored as a JSON array so the UI
-- can render historical results without a schema change for every checker.
-- ----------------------------------------------------------------------------
create table if not exists public.audits (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  lead_id        uuid references public.leads(id) on delete set null,
  url            text not null check (char_length(url) between 1 and 2048),
  overall_score  smallint check (overall_score between 0 and 100),
  seo_score      smallint check (seo_score between 0 and 100),
  speed_score    smallint check (speed_score between 0 and 100),
  mobile_score   smallint check (mobile_score between 0 and 100),
  security_score smallint check (security_score between 0 and 100),
  load_time_ms   integer check (load_time_ms is null or load_time_ms >= 0),
  issues         jsonb not null default '[]'::jsonb check (jsonb_typeof(issues) = 'array'),
  created_at     timestamptz not null default timezone('utc', now())
);

create index if not exists audits_user_created_idx on public.audits (user_id, created_at desc);
create index if not exists audits_lead_created_idx on public.audits (lead_id, created_at desc) where lead_id is not null;

-- ----------------------------------------------------------------------------
-- Generated outreach drafts and their lifecycle
-- ----------------------------------------------------------------------------
create table if not exists public.outreach_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  lead_id    uuid references public.leads(id) on delete set null,
  subject    text not null default '' check (char_length(subject) <= 250),
  body       text not null check (char_length(body) between 1 and 20000),
  status     text not null default 'draft'
             check (status in ('draft', 'sent', 'replied', 'bounced')),
  sent_at    timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists outreach_user_created_idx on public.outreach_messages (user_id, created_at desc);
create index if not exists outreach_lead_created_idx on public.outreach_messages (lead_id, created_at desc) where lead_id is not null;

drop trigger if exists outreach_messages_set_updated_at on public.outreach_messages;
create trigger outreach_messages_set_updated_at
  before update on public.outreach_messages
  for each row execute function public.set_updated_at();

-- A service-role backend bypasses RLS, so preserve user/lead ownership at the
-- database layer as well. This prevents a mistaken backend call from linking a
-- user's audit or message to a different user's lead.
create or replace function public.enforce_related_lead_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.lead_id is not null and not exists (
    select 1 from public.leads
    where id = new.lead_id and user_id = new.user_id
  ) then
    raise exception 'lead_id must belong to the same user as the related record';
  end if;
  return new;
end;
$$;

drop trigger if exists audits_enforce_lead_owner on public.audits;
create trigger audits_enforce_lead_owner
  before insert or update of user_id, lead_id on public.audits
  for each row execute function public.enforce_related_lead_owner();

drop trigger if exists outreach_enforce_lead_owner on public.outreach_messages;
create trigger outreach_enforce_lead_owner
  before insert or update of user_id, lead_id on public.outreach_messages
  for each row execute function public.enforce_related_lead_owner();

-- ----------------------------------------------------------------------------
-- Row-level security. The Express service uses a service-role key for trusted
-- server-side work, but these policies protect any future direct browser access.
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.audits enable row level security;
alter table public.outreach_messages enable row level security;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists leads_select_own on public.leads;
drop policy if exists leads_insert_own on public.leads;
drop policy if exists leads_update_own on public.leads;
drop policy if exists leads_delete_own on public.leads;
create policy leads_select_own on public.leads
  for select using ((select auth.uid()) = user_id);
create policy leads_insert_own on public.leads
  for insert with check ((select auth.uid()) = user_id);
create policy leads_update_own on public.leads
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy leads_delete_own on public.leads
  for delete using ((select auth.uid()) = user_id);

drop policy if exists audits_select_own on public.audits;
drop policy if exists audits_insert_own on public.audits;
drop policy if exists audits_update_own on public.audits;
drop policy if exists audits_delete_own on public.audits;
create policy audits_select_own on public.audits
  for select using ((select auth.uid()) = user_id);
create policy audits_insert_own on public.audits
  for insert with check ((select auth.uid()) = user_id);
create policy audits_update_own on public.audits
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy audits_delete_own on public.audits
  for delete using ((select auth.uid()) = user_id);

drop policy if exists outreach_select_own on public.outreach_messages;
drop policy if exists outreach_insert_own on public.outreach_messages;
drop policy if exists outreach_update_own on public.outreach_messages;
drop policy if exists outreach_delete_own on public.outreach_messages;
create policy outreach_select_own on public.outreach_messages
  for select using ((select auth.uid()) = user_id);
create policy outreach_insert_own on public.outreach_messages
  for insert with check ((select auth.uid()) = user_id);
create policy outreach_update_own on public.outreach_messages
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy outreach_delete_own on public.outreach_messages
  for delete using ((select auth.uid()) = user_id);

commit;
