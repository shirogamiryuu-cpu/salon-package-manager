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
      .select("id,email,name,phone,points,avatar_url,created_at")
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
  .inputValidator((d: { customerPackageId: string; staffIds?: string[] }) =>
    z
      .object({
        customerPackageId: z.string().uuid(),
        staffIds: z.array(z.string().uuid()).optional().default([]),
      })
      .parse(d),
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
    const { data: log, error: lErr } = await supabaseAdmin
      .from("usage_logs")
      .insert({ customer_package_id: data.customerPackageId, admin_id: context.userId })
      .select("id")
      .single();
    if (lErr || !log) throw new Error(lErr?.message ?? "Failed to log");
    if (data.staffIds && data.staffIds.length) {
      // Verify each id has staff role
      const { data: validRoles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "staff")
        .in("user_id", data.staffIds);
      const valid = new Set((validRoles ?? []).map((r) => r.user_id));
      const rows = data.staffIds
        .filter((id) => valid.has(id))
        .map((staff_user_id) => ({ usage_log_id: log.id, staff_user_id }));
      if (rows.length) await supabaseAdmin.from("session_staff").insert(rows);
    }
    return { ok: true, remaining: cp.sessions_remaining - 1 };
  });

export const adminListStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "staff");
    if (error) throw new Error(error.message);
    const ids = (roles ?? []).map((r) => r.user_id);
    if (!ids.length) return [];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id,email,name,created_at")
      .in("id", ids)
      .order("created_at", { ascending: false });
    return profiles ?? [];
  });


export const adminCreateStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; password: string; name?: string }) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        password: z.string().min(8).max(72),
        name: z.string().trim().min(1).max(120).optional(),
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
      user_metadata: data.name ? { name: data.name } : undefined,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");
    const userId = created.user.id;
    // Replace any auto-assigned customer role with staff (single role for new staff accounts)
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "staff" });
    if (rErr) throw new Error(rErr.message);
    if (data.name) {
      await supabaseAdmin.from("profiles").update({ name: data.name }).eq("id", userId);
    }
    return { ok: true, email: data.email };
  });


export const adminPromoteToStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: "staff" });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const adminRemoveStaffRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "staff");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const staffListMySessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isStaff = (roles ?? []).some((r: { role: string }) => r.role === "staff");
    if (!isStaff) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: links, error } = await supabaseAdmin
      .from("session_staff")
      .select("usage_log_id, created_at")
      .eq("staff_user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    const logIds = (links ?? []).map((l) => l.usage_log_id);
    if (!logIds.length) return [];
    const { data: logs } = await supabaseAdmin
      .from("usage_logs")
      .select(
        "id, used_at, customer_package_id, customer_packages(id, sessions_remaining, total_sessions, customer_id, packages(name), profiles:customer_id(email))",
      )
      .in("id", logIds);
    // join manually to keep ordering by created_at desc
    const map = new Map((logs ?? []).map((l: any) => [l.id, l]));
    return (links ?? [])
      .map((link) => {
        const l: any = map.get(link.usage_log_id);
        if (!l) return null;
        const cp = l.customer_packages;
        return {
          id: l.id,
          used_at: l.used_at,
          package_name: cp?.packages?.name ?? "Package",
          customer_email: cp?.profiles?.email ?? "Customer",
          remaining: cp?.sessions_remaining ?? 0,
          total: cp?.total_sessions ?? 0,
        };
      })
      .filter(Boolean);
  });

export const adminCreateAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; password: string; name?: string }) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        password: z.string().min(8).max(72),
        name: z.string().trim().min(1).max(120).optional(),
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
      user_metadata: data.name ? { name: data.name } : undefined,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");
    const userId = created.user.id;
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (rErr) throw new Error(rErr.message);
    if (data.name) {
      await supabaseAdmin.from("profiles").update({ name: data.name }).eq("id", userId);
    }
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
      .select("id,email,name,created_at")
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

// ===== Session History =====

type HistoryRow = {
  id: string;
  used_at: string;
  customer_id: string;
  customer_email: string;
  package_id: string;
  package_name: string;
  customer_package_id: string;
  sessions_deducted: number;
  admin_id: string | null;
  admin_email: string;
  staff: { id: string; email: string }[];
};

export const adminListHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    customerId?: string;
    staffId?: string;
    packageId?: string;
    from?: string;
    to?: string;
  }) =>
    z
      .object({
        customerId: z.string().uuid().optional(),
        staffId: z.string().uuid().optional(),
        packageId: z.string().uuid().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let logIdsFilter: string[] | null = null;
    if (data.staffId) {
      const { data: links } = await supabaseAdmin
        .from("session_staff")
        .select("usage_log_id")
        .eq("staff_user_id", data.staffId);
      logIdsFilter = (links ?? []).map((l) => l.usage_log_id);
      if (!logIdsFilter.length) return [] as HistoryRow[];
    }

    let q = supabaseAdmin
      .from("usage_logs")
      .select(
        "id, used_at, admin_id, customer_package_id, customer_packages!inner(id, customer_id, package_id, packages(id,name), profiles:customer_id(id,email))",
      )
      .order("used_at", { ascending: false })
      .limit(500);

    if (data.from) q = q.gte("used_at", data.from);
    if (data.to) q = q.lte("used_at", data.to);
    if (data.customerId) q = q.eq("customer_packages.customer_id", data.customerId);
    if (data.packageId) q = q.eq("customer_packages.package_id", data.packageId);
    if (logIdsFilter) q = q.in("id", logIdsFilter);

    const { data: logs, error } = await q;
    if (error) throw new Error(error.message);
    const ids = (logs ?? []).map((l: any) => l.id);
    const adminIds = Array.from(
      new Set((logs ?? []).map((l: any) => l.admin_id).filter(Boolean) as string[]),
    );

    const [{ data: staffLinks }, { data: adminProfiles }] = await Promise.all([
      ids.length
        ? supabaseAdmin
            .from("session_staff")
            .select("usage_log_id, staff_user_id, profiles:staff_user_id(id,email)")
            .in("usage_log_id", ids)
        : Promise.resolve({ data: [] as any[] }),
      adminIds.length
        ? supabaseAdmin.from("profiles").select("id,email").in("id", adminIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const staffByLog = new Map<string, { id: string; email: string }[]>();
    for (const sl of (staffLinks ?? []) as any[]) {
      const arr = staffByLog.get(sl.usage_log_id) ?? [];
      arr.push({ id: sl.staff_user_id, email: sl.profiles?.email ?? sl.staff_user_id });
      staffByLog.set(sl.usage_log_id, arr);
    }
    const adminEmail = new Map(((adminProfiles ?? []) as any[]).map((p) => [p.id, p.email]));

    return (logs ?? []).map((l: any): HistoryRow => {
      const cp = l.customer_packages;
      return {
        id: l.id,
        used_at: l.used_at,
        customer_id: cp?.customer_id ?? "",
        customer_email: cp?.profiles?.email ?? "",
        package_id: cp?.package_id ?? "",
        package_name: cp?.packages?.name ?? "Package",
        customer_package_id: l.customer_package_id,
        sessions_deducted: 1,
        admin_id: l.admin_id,
        admin_email: l.admin_id ? (adminEmail.get(l.admin_id) ?? "") : "",
        staff: staffByLog.get(l.id) ?? [],
      };
    });
  });

export const customerListMyHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Use user-scoped client; RLS allows reading own usage_logs + session_staff
    const { data: cps } = await context.supabase
      .from("customer_packages")
      .select("id, package_id, packages(name)")
      .eq("customer_id", context.userId);
    const cpIds = (cps ?? []).map((c: any) => c.id);
    if (!cpIds.length) return [];
    const pkgByCp = new Map<string, string>(
      (cps ?? []).map((c: any) => [c.id, c.packages?.name ?? "Package"]),
    );
    const { data: logs, error } = await context.supabase
      .from("usage_logs")
      .select("id, used_at, customer_package_id")
      .in("customer_package_id", cpIds)
      .order("used_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const ids = (logs ?? []).map((l: any) => l.id);
    let staffByLog = new Map<string, string[]>();
    if (ids.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: links } = await supabaseAdmin
        .from("session_staff")
        .select("usage_log_id, profiles:staff_user_id(email)")
        .in("usage_log_id", ids);
      for (const l of (links ?? []) as any[]) {
        const arr = staffByLog.get(l.usage_log_id) ?? [];
        arr.push(l.profiles?.email ?? "Staff");
        staffByLog.set(l.usage_log_id, arr);
      }
    }
    return (logs ?? []).map((l: any) => ({
      id: l.id,
      used_at: l.used_at,
      package_name: pkgByCp.get(l.customer_package_id) ?? "Package",
      sessions_deducted: 1,
      staff: staffByLog.get(l.id) ?? [],
    }));
  });

export const staffListMyHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isStaff = (roles ?? []).some((r: { role: string }) => r.role === "staff");
    if (!isStaff) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: links, error } = await supabaseAdmin
      .from("session_staff")
      .select(
        "usage_log_id, created_at, usage_logs(id, used_at, customer_package_id, customer_packages(customer_id, packages(name), profiles:customer_id(email)))",
      )
      .eq("staff_user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (links ?? []).map((l: any) => {
      const ul = l.usage_logs;
      const cp = ul?.customer_packages;
      return {
        id: ul?.id ?? l.usage_log_id,
        used_at: ul?.used_at ?? l.created_at,
        customer_email: cp?.profiles?.email ?? "Customer",
        package_name: cp?.packages?.name ?? "Package",
        sessions_deducted: 1,
      };
    });
  });
