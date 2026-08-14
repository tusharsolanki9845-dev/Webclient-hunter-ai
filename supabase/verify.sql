-- WebClient Hunter AI — post-deployment Supabase verification
-- Run in the Supabase SQL Editor after schema.sql. This script is read-only.

-- 1. Required application tables and RLS enabled status.
select
  c.relname as table_name,
  c.relrowsecurity as row_level_security_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('profiles', 'leads', 'audits', 'outreach_messages')
order by c.relname;

-- 2. Expected indexes supporting user-scoped reads and search.
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('leads', 'audits', 'outreach_messages')
order by tablename, indexname;

-- 3. RLS policies. Every table should only contain user-scoped policies.
select
  tablename,
  policyname,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'leads', 'audits', 'outreach_messages')
order by tablename, policyname;

-- 4. Required trigger bindings.
select
  event_object_table as table_name,
  trigger_name,
  event_manipulation as event,
  action_timing
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in ('profiles', 'leads', 'audits', 'outreach_messages')
order by table_name, trigger_name, event;

-- 5. Confirm no application data was seeded accidentally.
select
  'profiles' as table_name, count(*) as row_count from public.profiles
union all
select 'leads', count(*) from public.leads
union all
select 'audits', count(*) from public.audits
union all
select 'outreach_messages', count(*) from public.outreach_messages
order by table_name;
