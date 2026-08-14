-- WebClient Hunter AI legacy schema reset
-- Preconditions verified on 2026-08-14:
-- public.profiles, businesses, website_audits, leads, ai_reports,
-- outreach_campaigns, and activity_logs each contained zero rows.
--
-- The prior tables use an incompatible business-centric model. Removing them
-- avoids a partial migration and allows schema.sql to create the release model.

begin;

drop table if exists public.ai_reports cascade;
drop table if exists public.outreach_campaigns cascade;
drop table if exists public.website_audits cascade;
drop table if exists public.leads cascade;
drop table if exists public.businesses cascade;
drop table if exists public.activity_logs cascade;
drop table if exists public.profiles cascade;

commit;
