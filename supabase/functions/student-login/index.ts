import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { admissionNumber, password } = await req.json();

    if (typeof admissionNumber !== "string" || typeof password !== "string" || !admissionNumber.trim() || !password) {
      return json({ error: "Admission number and password are required" }, 400);
    }

    const adm = admissionNumber.trim().toUpperCase();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const service = createClient(supabaseUrl, serviceKey);

    const { data: student } = await service
      .from("students")
      .select("user_id")
      .ilike("student_id", adm)
      .maybeSingle();

    // Generic error to avoid revealing which admission numbers exist
    const invalid = () => json({ error: "Invalid admission number or password" }, 401);

    if (!student?.user_id) return invalid();

    const { data: userRes } = await service.auth.admin.getUserById(student.user_id);
    const email = userRes?.user?.email;
    if (!email) return invalid();

    const anon = createClient(supabaseUrl, anonKey);
    const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({ email, password });

    if (signInError || !signIn.session) return invalid();

    return json({
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
    });
  } catch (error) {
    console.error("student-login error:", error);
    return json({ error: "An unexpected error occurred" }, 500);
  }
});
