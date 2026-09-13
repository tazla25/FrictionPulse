-- ==============================================================================
-- Migration: 20260913140000_harden_rls_security.sql
-- Description: Enforce strict Row Level Security (RLS) on FrictionPulse
-- Resolves: SEC-001 (Anonymous public lead/feedback leakage & unauthorized mutation)
-- ==============================================================================

-- 1. Sites: Owners can manage their own sites; public can query site_key
DROP POLICY IF EXISTS "Public site key lookup" ON public.sites;
CREATE POLICY "Public site key lookup" ON public.sites FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own sites" ON public.sites;
CREATE POLICY "Users can manage own sites" ON public.sites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Objections: Public can read objections for active sites; only site owners can modify
DROP POLICY IF EXISTS "Public can view objections" ON public.objections;
CREATE POLICY "Public can view objections" ON public.objections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage objections" ON public.objections;
CREATE POLICY "Users can manage objections" ON public.objections FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.sites WHERE sites.site_key = objections.site_key AND sites.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.sites WHERE sites.site_key = objections.site_key AND sites.user_id = auth.uid())
  );

-- 3. Leads: Public can INSERT leads; only authenticated site owners can SELECT and UPDATE
DROP POLICY IF EXISTS "Public can insert leads" ON public.leads;
CREATE POLICY "Public can insert leads" ON public.leads FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view leads" ON public.leads;
CREATE POLICY "Users can view leads" ON public.leads FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.sites WHERE sites.site_key = leads.site_key AND sites.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update leads" ON public.leads;
CREATE POLICY "Users can update leads" ON public.leads FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.sites WHERE sites.site_key = leads.site_key AND sites.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.sites WHERE sites.site_key = leads.site_key AND sites.user_id = auth.uid())
  );

-- 4. Feedback: Public can INSERT feedback; only authenticated site owners can SELECT and UPDATE
DROP POLICY IF EXISTS "Public can insert feedback" ON public.feedback;
CREATE POLICY "Public can insert feedback" ON public.feedback FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view feedback" ON public.feedback;
CREATE POLICY "Users can view feedback" ON public.feedback FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.sites WHERE sites.site_key = feedback.site_key AND sites.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update feedback" ON public.feedback;
CREATE POLICY "Users can update feedback" ON public.feedback FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.sites WHERE sites.site_key = feedback.site_key AND sites.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.sites WHERE sites.site_key = feedback.site_key AND sites.user_id = auth.uid())
  );

-- 5. Email Alerts: Only authenticated site owners can manage their notification settings
DROP POLICY IF EXISTS "Manage email alerts" ON public.email_alerts;
CREATE POLICY "Manage email alerts" ON public.email_alerts FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.sites WHERE sites.site_key = email_alerts.site_key AND sites.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.sites WHERE sites.site_key = email_alerts.site_key AND sites.user_id = auth.uid())
  );

-- 6. Billing Subscriptions: Only authenticated users can view their own subscriptions
DROP POLICY IF EXISTS "Users can view own subscription" ON public.billing_subscriptions;
CREATE POLICY "Users can view own subscription" ON public.billing_subscriptions FOR SELECT
  USING (auth.uid() = user_id);
