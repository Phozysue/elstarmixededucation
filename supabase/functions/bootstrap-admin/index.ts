import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Refuse if any admin already exists
    const { data: existing } = await supabase
      .from("user_roles").select("id").eq("role", "admin").limit(1);
    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ error: "Admin already exists" }), { status: 409, headers: jsonHeaders });
    }

    const email = "admin@school.local";
    const password = "Admin@2026!";

    const { data: created, error } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: "School Administrator" },
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: jsonHeaders });

    await supabase.from("user_roles").insert({ user_id: created.user.id, role: "admin" });

    return new Response(JSON.stringify({ success: true, email, password }), { status: 200, headers: jsonHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: jsonHeaders });
  }
});
