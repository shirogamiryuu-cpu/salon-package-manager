import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { phone } = await req.json();
    if (!phone || typeof phone !== "string") {
      return new Response(JSON.stringify({ error: "phone required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    let normalized = phone.trim().replace(/\s+/g, "").replace(/[-()]/g, "");
    if (normalized.startsWith("+959")) normalized = "09" + normalized.slice(4);
    else if (normalized.startsWith("959")) normalized = "09" + normalized.slice(3);
    else if (normalized.startsWith("9") && !normalized.startsWith("09"))
      normalized = "0" + normalized;

    const { data, error } = await admin
      .from("profiles")
      .select("email")
      .or(`phone.eq.${normalized},phone.eq.${phone.trim()}`)
      .maybeSingle();
    if (error) throw error;
    return new Response(JSON.stringify({ email: data?.email ?? null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
