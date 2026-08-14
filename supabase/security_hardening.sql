-- WebClient Hunter AI — Supabase security hardening
-- Resolves security-advisor warnings after the initial schema deployment.

begin;

create schema if not exists extensions;

-- Keep pg_trgm out of public. Existing dependent indexes are updated by Postgres.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_trgm')
     and exists (
       select 1
       from pg_extension e
       join pg_namespace n on n.oid = e.extnamespace
       where e.extname = 'pg_trgm' and n.nspname <> 'extensions'
     ) then
    alter extension pg_trgm set schema extensions;
  elsif not exists (select 1 from pg_extension where extname = 'pg_trgm') then
    create extension pg_trgm with schema extensions;
  end if;
end;
$$;

-- This function is invoked only by the auth.users trigger. It must not be
-- callable through the public REST/RPC API by anonymous or signed-in users.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

commit;
