-- ============================================================
-- ⚡ FRICTIONPULSE MASTER DATABASE SCHEMA & SECURITY POLICIES
-- Target Supabase Project: https://gfzwqiwrkfiyvlbulhuk.supabase.co
-- Date: 2026-09-13
-- ============================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Sites Table
CREATE TABLE IF NOT EXISTS public.sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    domain TEXT NOT NULL,
    site_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sites_site_key ON public.sites(site_key);
CREATE INDEX IF NOT EXISTS idx_sites_user_id ON public.sites(user_id);

-- 3. Objections Table
CREATE TABLE IF NOT EXISTS public.objections (
    id BIGSERIAL PRIMARY KEY,
    site_key TEXT NOT NULL REFERENCES public.sites(site_key) ON DELETE CASCADE,
    label TEXT NOT NULL,
    counter_message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_objections_site_key ON public.objections(site_key);

-- 4. Leads Table (with soft-lock quota support)
CREATE TABLE IF NOT EXISTS public.leads (
    id BIGSERIAL PRIMARY KEY,
    site_key TEXT NOT NULL REFERENCES public.sites(site_key) ON DELETE CASCADE,
    objection_id TEXT,
    email TEXT,
    phone TEXT,
    session_hash TEXT,
    page_url TEXT,
    status TEXT DEFAULT 'new',
    locked_by_plan BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leads_site_key ON public.leads(site_key);
CREATE INDEX IF NOT EXISTS idx_leads_locked_by_plan ON public.leads(locked_by_plan) WHERE locked_by_plan = TRUE;

-- 5. Feedback Table
CREATE TABLE IF NOT EXISTS public.feedback (
    id BIGSERIAL PRIMARY KEY,
    site_key TEXT NOT NULL REFERENCES public.sites(site_key) ON DELETE CASCADE,
    objection_id TEXT,
    message TEXT,
    rating INT,
    page_url TEXT,
    session_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_site_key ON public.feedback(site_key);

-- 6. Votes Table (Objection click tracking)
CREATE TABLE IF NOT EXISTS public.votes (
    id BIGSERIAL PRIMARY KEY,
    site_key TEXT NOT NULL REFERENCES public.sites(site_key) ON DELETE CASCADE,
    objection_id TEXT NOT NULL,
    session_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_votes_site_key ON public.votes(site_key);

-- 7. Widget Views Table (Impression tracking)
CREATE TABLE IF NOT EXISTS public.widget_views (
    id BIGSERIAL PRIMARY KEY,
    site_key TEXT NOT NULL REFERENCES public.sites(site_key) ON DELETE CASCADE,
    session_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_widget_views_site_key ON public.widget_views(site_key);

-- 8. Billing Subscriptions Table
CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    subscription_id TEXT,
    plan_tier TEXT DEFAULT 'free',
    status TEXT DEFAULT 'active',
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_sub_user_id ON public.billing_subscriptions(user_id);

-- 9. Processed Webhooks (Idempotency Store)
CREATE TABLE IF NOT EXISTS public.processed_webhooks (
    id BIGSERIAL PRIMARY KEY,
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Email Alerts Table
CREATE TABLE IF NOT EXISTS public.email_alerts (
    id BIGSERIAL PRIMARY KEY,
    site_key TEXT NOT NULL UNIQUE REFERENCES public.sites(site_key) ON DELETE CASCADE,
    email TEXT,
    notify_new_lead BOOLEAN DEFAULT TRUE,
    notify_new_feedback BOOLEAN DEFAULT TRUE,
    notify_daily_digest BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. RPC: validate_site_key (Used by widget.js)
CREATE OR REPLACE FUNCTION public.validate_site_key(site_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.sites WHERE sites.site_key = validate_site_key.site_key
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Soft-Lock Quota Trigger: check_lead_limit
CREATE OR REPLACE FUNCTION public.check_lead_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_plan_tier TEXT := 'free';
    v_lead_limit INT := 50;
    v_lead_count INT;
BEGIN
    SELECT user_id INTO v_user_id
    FROM public.sites
    WHERE site_key = NEW.site_key;

    IF v_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT plan_tier INTO v_plan_tier
    FROM public.billing_subscriptions
    WHERE user_id = v_user_id AND status = 'active'
    ORDER BY updated_at DESC LIMIT 1;

    IF v_plan_tier = 'pro' THEN
        v_lead_limit := 10000;
    ELSIF v_plan_tier = 'starter' THEN
        v_lead_limit := 500;
    ELSE
        v_lead_limit := 50;
    END IF;

    SELECT COUNT(*) INTO v_lead_count
    FROM public.leads l
    JOIN public.sites s ON s.site_key = l.site_key
    WHERE s.user_id = v_user_id
      AND l.created_at >= date_trunc('month', CURRENT_TIMESTAMP);

    IF v_lead_count >= v_lead_limit THEN
        NEW.locked_by_plan := TRUE;
    ELSE
        NEW.locked_by_plan := FALSE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_lead_limit ON public.leads;
CREATE TRIGGER trg_check_lead_limit
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.check_lead_limit();

-- 13. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_alerts ENABLE ROW LEVEL SECURITY;

-- 14. Row Level Security Policies
-- Sites
DROP POLICY IF EXISTS "Public site key lookup" ON public.sites;
CREATE POLICY "Public site key lookup" ON public.sites FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own sites" ON public.sites;
CREATE POLICY "Users can manage own sites" ON public.sites FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Objections
DROP POLICY IF EXISTS "Public can view objections" ON public.objections;
CREATE POLICY "Public can view objections" ON public.objections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage objections" ON public.objections;
CREATE POLICY "Users can manage objections" ON public.objections FOR ALL USING (true);

-- Leads
DROP POLICY IF EXISTS "Public can insert leads" ON public.leads;
CREATE POLICY "Public can insert leads" ON public.leads FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view leads" ON public.leads;
CREATE POLICY "Users can view leads" ON public.leads FOR SELECT USING (true);

-- Feedback
DROP POLICY IF EXISTS "Public can insert feedback" ON public.feedback;
CREATE POLICY "Public can insert feedback" ON public.feedback FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view feedback" ON public.feedback;
CREATE POLICY "Users can view feedback" ON public.feedback FOR SELECT USING (true);

-- Votes
DROP POLICY IF EXISTS "Public can insert votes" ON public.votes;
CREATE POLICY "Public can insert votes" ON public.votes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view votes" ON public.votes;
CREATE POLICY "Users can view votes" ON public.votes FOR SELECT USING (true);

-- Widget Views
DROP POLICY IF EXISTS "Public can insert views" ON public.widget_views;
CREATE POLICY "Public can insert views" ON public.widget_views FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view views" ON public.widget_views;
CREATE POLICY "Users can view views" ON public.widget_views FOR SELECT USING (true);

-- Subscriptions
DROP POLICY IF EXISTS "Users can view own subscription" ON public.billing_subscriptions;
CREATE POLICY "Users can view own subscription" ON public.billing_subscriptions FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Processed Webhooks
DROP POLICY IF EXISTS "Service role only webhooks" ON public.processed_webhooks;
CREATE POLICY "Service role only webhooks" ON public.processed_webhooks TO service_role USING (true) WITH CHECK (true);

-- Email Alerts
DROP POLICY IF EXISTS "Manage email alerts" ON public.email_alerts;
CREATE POLICY "Manage email alerts" ON public.email_alerts FOR ALL USING (true);

-- 15. Support Messages Table
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can insert support messages" ON public.support_messages;
CREATE POLICY "Public can insert support messages" ON public.support_messages FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can view own support messages" ON public.support_messages;
CREATE POLICY "Authenticated users can view own support messages" ON public.support_messages FOR SELECT USING (true);

-- 16. Usage Metrics Table
CREATE TABLE IF NOT EXISTS public.usage_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    billing_cycle_start TIMESTAMPTZ NOT NULL,
    leads_count INT DEFAULT 0,
    views_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_cycle ON public.usage_metrics(user_id, billing_cycle_start);

ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own usage metrics" ON public.usage_metrics;
CREATE POLICY "Users can view own usage metrics" ON public.usage_metrics FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);
DROP POLICY IF EXISTS "Users can manage own usage metrics" ON public.usage_metrics;
CREATE POLICY "Users can manage own usage metrics" ON public.usage_metrics FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL);

