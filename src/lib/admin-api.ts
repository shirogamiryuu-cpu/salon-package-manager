import { supabase } from "@/integrations/supabase/client";

// Thin client for the admin-api edge function.
// All privileged operations (auth admin, role grants, cross-user reads)
// go through this single dispatcher so the service-role key stays server-side.
export async function callAdminApi<T = any>(action: string, payload: any = {}): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    // No signed-in user — don't fire the request (the anon key would be sent
    // as bearer and the edge function would 401 in a loop).
    throw new Error("Not authenticated");
  }
  const { data, error } = await supabase.functions.invoke("admin-api", {
    body: { action, payload },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) {
    let msg: string | undefined = (data as any)?.error;
    if (!msg && "context" in error && error.context) {
      try {
        const body = await (error.context as Response).json();
        msg = body?.error || body?.message;
      } catch {
        try {
          const text = await (error.context as Response).text();
          if (text) msg = text;
        } catch {
          // ignore
        }
      }
    }
    throw new Error(msg || error.message || "Request failed");
  }
  if (data && typeof data === "object" && "error" in data && (data as any).error) {
    throw new Error((data as any).error);
  }
  return data as T;
}
