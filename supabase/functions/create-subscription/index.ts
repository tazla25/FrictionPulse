import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_IDS = {
  starter: Deno.env.get("RAZORPAY_PLAN_ID_STARTER") || "",
  pro: Deno.env.get("RAZORPAY_PLAN_ID_PRO") || ""
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
        const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const planIdKey = body.planId;


    const keyId = Deno.env.get("RAZORPAY_KEY_ID") || "";
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET") || "";

    const isTestMode = keyId.startsWith("rzp_test_");

    // In production, we assume RAZORPAY_PLAN_ID_STARTER and _PRO are correctly configured in Supabase Secrets.
    // If they aren't, or if we're in test mode, fallback to hardcoded test plan identifiers.
    let razorpayPlanId = PLAN_IDS[planIdKey as keyof typeof PLAN_IDS];

    // Identify the precise reason Razorpay returns "Invalid Plan ID" and fix it:
    // Mismatch between Test Mode (rzp_test_...) and Live Plan IDs (which usually start with 'plan_live' or don't match the test env).
    // Let's enforce that if we are in test mode and the configured plan ID doesn't look like a test plan (or is empty), we supply one.
    if (!razorpayPlanId || (isTestMode && !razorpayPlanId.includes('test'))) {
       // Fallback mock test plan IDs for Razorpay Test Mode
       if (planIdKey === 'starter') razorpayPlanId = 'plan_test_starter';
       if (planIdKey === 'pro') razorpayPlanId = 'plan_test_pro';
    }

    console.log("---- RAZORPAY DEBUG INFO ----");
    console.log("Requested planIdKey:", planIdKey);
    console.log("Resolved razorpayPlanId:", razorpayPlanId);
    console.log("Is Key ID configured?", !!keyId);
    console.log("Is Key ID starting with rzp_test or rzp_live?", isTestMode ? "rzp_test" : "rzp_live");
    console.log("Is Key Secret configured?", !!keySecret);
    console.log("-----------------------------");


    const rzpPayload = {
        plan_id: razorpayPlanId,
        total_count: 120, // 10 years
        customer_notify: 1
    };
    console.log("Razorpay Request Payload:", JSON.stringify(rzpPayload));


    // Create Subscription
    const rzpRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authString}`
      },
      body: JSON.stringify({
        plan_id: razorpayPlanId,
        total_count: 120, // 10 years
        customer_notify: 1
      })
    });

    const rzpData = await rzpRes.json();

    if (!rzpRes.ok) {
      console.error("Razorpay Error:", rzpData);
      return new Response(JSON.stringify({ error: "Failed to create subscription with Razorpay" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({
        id: rzpData.id,
        razorpay_key_id: keyId,
        mock: false
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
