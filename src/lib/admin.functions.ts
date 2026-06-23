import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const adminListCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id,email,phone,points,avatar_url,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id,role");
    const adminIds = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
    return (profiles ?? []).filter((p) => !adminIds.has(p.id));
  });

export const adminGetCustomer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profile }, { data: pkgs }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", data.id).maybeSingle(),
      supabaseAdmin
        .from("customer_packages")
        .select("*, packages(name,description,points_awarded)")
        .eq("customer_id", data.id)
        .order("purchase_date", { ascending: false }),
    ]);
    return { profile, customerPackages: pkgs ?? [] };
  });

export const assignPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { customerId: string; packageId: string }) =>
    z.object({ customerId: z.string().uuid(), packageId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pkg, error: pErr } = await supabaseAdmin
      .from("packages")
      .select("total_sessions,points_awarded")
      .eq("id", data.packageId)
      .maybeSingle();
    if (pErr || !pkg) throw new Error("Package not found");
    const { error } = await supabaseAdmin.from("customer_packages").insert({
      customer_id: data.customerId,
      package_id: data.packageId,
      sessions_remaining: pkg.total_sessions,
      total_sessions: pkg.total_sessions,
    });
    if (error) throw new Error(error.message);
    if (pkg.points_awarded) {
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("points")
        .eq("id", data.customerId)
        .maybeSingle();
      await supabaseAdmin
        .from("profiles")
        .update({ points: (prof?.points ?? 0) + pkg.points_awarded })
        .eq("id", data.customerId);
    }
    return { ok: true };
  });

export const useSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { customerPackageId: string }) =>
    z.object({ customerPackageId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cp, error } = await supabaseAdmin
      .from("customer_packages")
      .select("sessions_remaining")
      .eq("id", data.customerPackageId)
      .maybeSingle();
    if (error || !cp) throw new Error("Not found");
    if (cp.sessions_remaining <= 0) throw new Error("No sessions left");
    const { error: uErr } = await supabaseAdmin
      .from("customer_packages")
      .update({ sessions_remaining: cp.sessions_remaining - 1 })
      .eq("id", data.customerPackageId);
    if (uErr) throw new Error(uErr.message);
    await supabaseAdmin
      .from("usage_logs")
      .insert({ customer_package_id: data.customerPackageId, admin_id: context.userId });
    return { ok: true, remaining: cp.sessions_remaining - 1 };
  });

export const adminCreateAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; password: string }) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        password: z.string().min(8).max(72),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");
    const userId = created.user.id;
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (rErr) throw new Error(rErr.message);
    return { ok: true, email: data.email };
  });

export const adminListAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    const ids = (roles ?? []).map((r) => r.user_id);
    if (!ids.length) return [];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id,email,created_at")
      .in("id", ids)
      .order("created_at", { ascending: false });
    return profiles ?? [];
  });

export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; password: string }) =>
    z
      .object({
        userId: z.string().uuid(),
        password: z.string().min(8).max(72),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Only allow resetting password of other admins
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) throw new Error("Target user is not an admin");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
