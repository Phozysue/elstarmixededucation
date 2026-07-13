import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error } = await callerClient.auth.getClaims(token);
  if (error || !claimsData?.claims) return null;

  const callerId = claimsData.claims.sub;
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  const { data: roleData } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) return null;
  return { serviceClient, callerId };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return new Response(JSON.stringify({ error: "Unauthorized - admin only" }), {
        status: 403, headers: jsonHeaders,
      });
    }

    const { serviceClient } = admin;
    const body = await req.json();
    const { action, userId } = body;

    if (!userId || !action) {
      return new Response(JSON.stringify({ error: "userId and action are required" }), {
        status: 400, headers: jsonHeaders,
      });
    }

    switch (action) {
      case "update": {
        const { fullName, email } = body;
        const updates: any = {};
        if (email) updates.email = email.trim().toLowerCase();
        if (fullName) {
          updates.user_metadata = { full_name: fullName.trim() };
        }

        const { error: authError } = await serviceClient.auth.admin.updateUserById(userId, updates);
        if (authError) {
          return new Response(JSON.stringify({ error: authError.message }), {
            status: 400, headers: jsonHeaders,
          });
        }

        // Also update the profiles table
        const profileUpdates: any = {};
        if (fullName) profileUpdates.full_name = fullName.trim();
        if (email) profileUpdates.email = email.trim().toLowerCase();

        if (Object.keys(profileUpdates).length > 0) {
          await serviceClient.from("profiles").update(profileUpdates).eq("id", userId);
        }

        return new Response(JSON.stringify({ success: true, message: "User updated" }), {
          status: 200, headers: jsonHeaders,
        });
      }

      case "resetPassword": {
        const { password } = body;
        if (!password || password.length < 6) {
          return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
            status: 400, headers: jsonHeaders,
          });
        }

        const { error: pwError } = await serviceClient.auth.admin.updateUserById(userId, { password });
        if (pwError) {
          return new Response(JSON.stringify({ error: pwError.message }), {
            status: 400, headers: jsonHeaders,
          });
        }

        return new Response(JSON.stringify({ success: true, message: "Password updated" }), {
          status: 200, headers: jsonHeaders,
        });
      }

      case "delete": {
        // Delete from auth (cascade will handle profiles, etc.)
        const { error: delError } = await serviceClient.auth.admin.deleteUser(userId);
        if (delError) {
          return new Response(JSON.stringify({ error: delError.message }), {
            status: 400, headers: jsonHeaders,
          });
        }

        return new Response(JSON.stringify({ success: true, message: "User deleted" }), {
          status: 200, headers: jsonHeaders,
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: jsonHeaders,
        });
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500, headers: jsonHeaders,
    });
  }
});
