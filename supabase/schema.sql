-- ============================================================
--  WebClient Hunter AI — Supabase Schema
--  Run this in your Supabase SQL Editor to set up the database.
-- ============================================================

-- Enable UUID extension (already enabled on Supabase by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES — extends Supabase auth.users
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  company     TEXT,
  website     TEXT,
  plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'agency')),
  audits_used INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- LEADS — saved business leads
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leads (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  url          TEXT NOT NULL,
  niche        TEXT,
  location     TEXT,
  status       TEXT NOT NULL DEFAULT 'new'
               CHECK (status IN ('new','contacted','interested','proposal','won','lost')),
  notes        TEXT,
  seo_score    INTEGER CHECK (seo_score BETWEEN 0 AND 100),
  speed_score  INTEGER CHECK (speed_score BETWEEN 0 AND 100),
  mobile_score INTEGER CHECK (mobile_score BETWEEN 0 AND 100),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user-scoped queries
CREATE INDEX IF NOT EXISTS leads_user_id_idx ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS leads_status_idx  ON public.leads(status);
CREATE INDEX IF NOT EXISTS leads_niche_idx   ON public.leads(niche);

-- ============================================================
-- AUDITS — website audit reports
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audits (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id        UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  url            TEXT NOT NULL,
  overall_score  INTEGER CHECK (overall_score BETWEEN 0 AND 100),
  seo_score      INTEGER CHECK (seo_score BETWEEN 0 AND 100),
  speed_score    INTEGER CHECK (speed_score BETWEEN 0 AND 100),
  mobile_score   INTEGER CHECK (mobile_score BETWEEN 0 AND 100),
  security_score INTEGER CHECK (security_score BETWEEN 0 AND 100),
  load_time_ms   INTEGER,
  issues         JSONB DEFAULT '[]',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audits_user_id_idx ON public.audits(user_id);
CREATE INDEX IF NOT EXISTS audits_lead_id_idx ON public.audits(lead_id);

-- ============================================================
-- OUTREACH MESSAGES — generated email drafts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.outreach_messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id    UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  subject    TEXT,
  body       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'draft'
             CHECK (status IN ('draft','sent','replied','bounced')),
  sent_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS outreach_user_id_idx ON public.outreach_messages(user_id);
CREATE INDEX IF NOT EXISTS outreach_lead_id_idx ON public.outreach_messages(lead_id);

-- ============================================================
-- ROW LEVEL SECURITY — users can only see their own data
-- ============================================================
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_messages ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Leads
CREATE POLICY "Users can view own leads"   ON public.leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own leads" ON public.leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own leads" ON public.leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own leads" ON public.leads FOR DELETE USING (auth.uid() = user_id);

-- Audits
CREATE POLICY "Users can view own audits"   ON public.audits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own audits" ON public.audits FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Outreach
CREATE POLICY "Users can view own outreach"   ON public.outreach_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own outreach" ON public.outreach_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own outreach" ON public.outreach_messages FOR UPDATE USING (auth.uid() = user_id);
