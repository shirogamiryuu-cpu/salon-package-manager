import { createServerFn } from "@tanstack/react-start";

// Idempotent admin seed: creates admin@salon.com with temp password if missing,
// and ensures the admin role is assigned.
export const seedAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = "admin@salon.com";
  const password = "Admin123!";

  // find existing user via profiles (created by trigger)
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let userId = existing?.id as string | undefined;

  if (!userId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    userId = data.user!.id;
  }

  // Ensure admin role (replace customer role from trigger)
  await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
  const { error: rErr } = await supabaseAdmin
    .from("user_roles")
    .insert({ user_id: userId, role: "admin" });
  if (rErr) throw new Error(rErr.message);

  return { ok: true, email, password, created: !existing };
});
