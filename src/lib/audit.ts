import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget audit log writer. Never throws — failures are logged to console
 * so they don't break the user-facing flow.
 */
export async function logAudit(params: {
  action: string;
  entity_type: string;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return;

    await supabase.from("audit_logs" as any).insert({
      actor_id: user.id,
      actor_email: user.email ?? null,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id ?? null,
      metadata: params.metadata ?? {},
    } as any);
  } catch (err) {
    console.warn("[audit] failed to write log", err);
  }
}
