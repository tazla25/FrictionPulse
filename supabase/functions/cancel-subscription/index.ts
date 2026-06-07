import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: existingSub, error: findError } = await supabaseAdmin
      .from('billing_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (findError) {
      console.error("Could not find subscription for user", findError);
      return new Response(JSON.stringify({ error: "Subscription not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!existingSub || !existingSub.razorpay_subscription_id) {
       // If no razorpay ID, just downgrade locally (might be a legacy or manual sub)
       await supabaseAdmin
         .from('billing_subscriptions')
         .update({ plan_tier: 'free', status: 'cancelled', razorpay_subscription_id: null, razorpay_customer_id: null })
         .eq('user_id', user.id);

       return new Response(JSON.stringify({ message: "Subscription downgraded to Free" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const keyId = Deno.env.get("RAZORPAY_KEY_ID") || "";
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET") || "";

    if (!keyId || !keySecret) {
      return new Response(JSON.stringify({ error: "Razorpay credentials not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authString = btoa(`${keyId}:${keySecret}`);

    // Cancel Subscription in Razorpay
    const rzpRes = await fetch(`https://api.razorpay.com/v1/subscriptions/${existingSub.razorpay_subscription_id}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authString}`
      },
      body: JSON.stringify({
        cancel_at_cycle_end: 0 // cancel immediately
      })
    });

    const rzpData = await rzpRes.json();

    if (!rzpRes.ok) {
      console.error("Razorpay Error:", rzpData);
      return new Response(JSON.stringify({ error: "Failed to cancel subscription with Razorpay" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update local database to immediately reflect the free tier
    await supabaseAdmin
      .from('billing_subscriptions')
      .update({ plan_tier: 'free', status: 'cancelled' })
      .eq('user_id', user.id);

    return new Response(JSON.stringify({ message: "Subscription downgraded to Free and cancelled in Razorpay" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred during cancellation." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
