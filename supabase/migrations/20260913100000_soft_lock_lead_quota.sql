-- Migration: 20260913100000_soft_lock_lead_quota.sql
-- Description: Replace hard LeadLimitExceeded exception with soft-lock (locked_by_plan = true)
-- This prevents dropped visitor leads on quota exceed and unlocks organic plan upgrades.

-- 1. Add locked_by_plan column to leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS locked_by_plan BOOLEAN DEFAULT FALSE;

-- 2. Create index for efficient locked lead querying
CREATE INDEX IF NOT EXISTS idx_leads_locked_by_plan ON public.leads(locked_by_plan) WHERE locked_by_plan = TRUE;

-- 3. Update check_lead_limit trigger function to soft-lock instead of aborting transaction
CREATE OR REPLACE FUNCTION public.check_lead_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_plan_tier TEXT := 'free';
    v_lead_limit INT := 50;
    v_lead_count INT;
BEGIN
    -- Resolve owner of the site
    SELECT user_id INTO v_user_id
    FROM public.sites
    WHERE site_key = NEW.site_key;

    IF v_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Determine active plan tier
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

    -- Count leads in current monthly billing cycle
    SELECT COUNT(*) INTO v_lead_count
    FROM public.leads l
    JOIN public.sites s ON s.site_key = l.site_key
    WHERE s.user_id = v_user_id
      AND l.created_at >= date_trunc('month', CURRENT_TIMESTAMP);

    -- Soft-lock lead if limit is reached
    IF v_lead_count >= v_lead_limit THEN
        NEW.locked_by_plan := TRUE;
    ELSE
        NEW.locked_by_plan := FALSE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
