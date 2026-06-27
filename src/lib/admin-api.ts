import { supabase } from "@/integrations/supabase/client";

// Thin client for the admin-api edge function.
// All privileged operations (auth admin, role grants, cross-user reads)
// go through this single dispatcher so the service-role key stays server-side.
export async function callAdminApi<T = any>(action: string, payload: any = {}): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const { data, error } = await supabase.functions.invoke("admin-api", {
    body: { action, payload },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (error) {
    const msg = (data as any)?.error ?? error.message ?? "Request failed";
    throw new Error(msg);
  }
  if (data && typeof data === "object" && "error" in data && (data as any).error) {
    throw new Error((data as any).error);
  }
  return data as T;
}
