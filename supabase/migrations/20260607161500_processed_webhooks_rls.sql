CREATE POLICY "Service Role Only" ON public.processed_webhooks TO service_role USING (true) WITH CHECK (true);
