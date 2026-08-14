-- WebClient Hunter AI — RLS query-planning optimization
-- Supabase recommends wrapping auth.uid() in a SELECT so it is evaluated once
-- per query rather than once for every checked row.

begin;

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
