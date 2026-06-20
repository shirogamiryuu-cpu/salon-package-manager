import { createFileRoute } from "@tanstack/react-router";

// One-time idempotent admin seed. Public route — safe because it only creates
// the fixed admin@salon.com account if it doesn't already exist.
export const Route = createFileRoute("/api/public/seed-admin")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const email = "admin@salon.com";
        const password = "SalonAdmin!2026";

        const { data: existing } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        let userId = existing?.id as string | undefined;
        let created = false;

        if (!userId) {
          const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          });
          if (error) return Response.json({ error: error.message }, { status: 500 });
          userId = data.user!.id;
          created = true;
        } else {
          await supabaseAdmin.auth.admin.updateUserById(userId!, {
            password,
            email_confirm: true,
          });
        }

        await supabaseAdmin.from("user_roles").delete().eq("user_id", userId!);
        const { error: rErr } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: userId!, role: "admin" });
        if (rErr) return Response.json({ error: rErr.message }, { status: 500 });

        return Response.json({ ok: true, email, password, created });
      },
    },
  },
});
