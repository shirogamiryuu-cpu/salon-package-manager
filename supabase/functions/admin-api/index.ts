// Single dispatcher edge function. Replaces the old TanStack Start server
// functions. Holds all logic that requires the service-role key.
//
// Auth model:
//  - The handler verifies the caller's bearer token via supabase.auth.getUser.
//  - For admin-only actions it checks the `has_role(uid, 'admin')` RPC.
//  - For staff-only actions it checks `has_role(uid, 'staff')`.

// @ts-nocheck — Deno runtime; type-checked at deploy time by Supabase.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...cors },
  });
}

function admin() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireUser(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Unauthorized");
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");
  return { userId: data.user.id, userClient, token };
}

async function hasRole(userId: string, role: "admin" | "staff" | "customer" | "stylist") {
  const sb = admin();
  const { data, error } = await sb.rpc("has_role", { _user_id: userId, _role: role });
  if (error) throw new Error(error.message);
  return !!data;
}

async function assertAdmin(userId: string) {
  if (!(await hasRole(userId, "admin"))) throw new Error("Forbidden");
}

async function assertStaff(userId: string) {
  const [s, st] = await Promise.all([hasRole(userId, "staff"), hasRole(userId, "stylist")]);
  if (!s && !st) throw new Error("Forbidden");
}

// ============== Action handlers ==============

const actions: Record<string, (payload: any, ctx: { userId: string }) => Promise<unknown>> = {
  async adminListCustomers(_p, { userId }) {
    await assertAdmin(userId);
    const sb = admin();
    const { data: profiles, error } = await sb
      .from("profiles")
      .select("id,email,name,phone,points,avatar_url,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: roles } = await sb.from("user_roles").select("user_id,role");
    const adminIds = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
    return (profiles ?? []).filter((p) => !adminIds.has(p.id));
  },

  async adminGetCustomer({ id }, { userId }) {
    await assertAdmin(userId);
    const sb = admin();
    const [{ data: profile }, { data: pkgs }] = await Promise.all([
      sb.from("profiles").select("*").eq("id", id).maybeSingle(),
      sb.from("customer_packages")
        .select("*, packages(name,description,points_awarded)")
        .eq("customer_id", id)
        .order("purchase_date", { ascending: false }),
    ]);
    return { profile, customerPackages: pkgs ?? [] };
  },

  async assignPackage({ customerId, packageId, depositSessionsPaid, warrantyYears }, { userId }) {
    await assertAdmin(userId);
    const sb = admin();
    const { data: pkg, error: pErr } = await sb
      .from("packages")
      .select("total_sessions,points_awarded")
      .eq("id", packageId)
      .maybeSingle();
    if (pErr || !pkg) throw new Error("Package not found");
    const addDep = Math.max(0, Math.min(Number(depositSessionsPaid) || 0, pkg.total_sessions));
    const yrs = Math.max(0, Number(warrantyYears) || 0);
    const nowIso = new Date().toISOString();
    const expiresAt = yrs > 0
      ? new Date(Date.now() + yrs * 365 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // If the customer already owns this package, top it up instead of duplicating.
    const { data: existing } = await sb
      .from("customer_packages")
      .select("id, sessions_remaining, total_sessions, deposit_sessions_paid, warranty_years, warranty_expires_at")
      .eq("customer_id", customerId)
      .eq("package_id", packageId)
      .order("purchase_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const newTotal = existing.total_sessions + pkg.total_sessions;
      const newRemaining = existing.sessions_remaining + pkg.total_sessions;
      const newDep = Math.min(newTotal, (existing.deposit_sessions_paid ?? 0) + addDep);
      const newYears = (existing.warranty_years ?? 0) + yrs;
      const currentExp = existing.warranty_expires_at ? new Date(existing.warranty_expires_at).getTime() : 0;
      const candidateExp = expiresAt ? new Date(expiresAt).getTime() : 0;
      const newExp = Math.max(currentExp, candidateExp);
      const { error } = await sb.from("customer_packages").update({
        total_sessions: newTotal,
        sessions_remaining: newRemaining,
        deposit_sessions_paid: newDep,
        deposit_paid: newDep > 0,
        deposit_paid_at: newDep > 0 ? nowIso : null,
        warranty_years: newYears,
        warranty_expires_at: newExp ? new Date(newExp).toISOString() : null,
      }).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb.from("customer_packages").insert({
        customer_id: customerId,
        package_id: packageId,
        sessions_remaining: pkg.total_sessions,
        total_sessions: pkg.total_sessions,
        deposit_sessions_paid: addDep,
        deposit_paid: addDep > 0,
        deposit_paid_at: addDep > 0 ? nowIso : null,
        warranty_years: yrs,
        warranty_expires_at: expiresAt,
      });
      if (error) throw new Error(error.message);
    }

    if (pkg.points_awarded) {
      const { data: prof } = await sb
        .from("profiles").select("points").eq("id", customerId).maybeSingle();
      await sb.from("profiles")
        .update({ points: (prof?.points ?? 0) + pkg.points_awarded })
        .eq("id", customerId);
    }
    return { ok: true, merged: !!existing };
  },

  async adminAddSessions({ customerPackageId, sessions, depositSessionsPaid, warrantyYears }, { userId }) {
    await assertAdmin(userId);
    const add = Math.max(1, Number(sessions) || 0);
    const addDep = Math.max(0, Number(depositSessionsPaid) || 0);
    const yrs = Math.max(0, Number(warrantyYears) || 0);
    const sb = admin();
    const { data: cp, error: cErr } = await sb
      .from("customer_packages")
      .select("total_sessions, sessions_remaining, deposit_sessions_paid, warranty_years, warranty_expires_at")
      .eq("id", customerPackageId).maybeSingle();
    if (cErr || !cp) throw new Error("Not found");
    const newTotal = cp.total_sessions + add;
    const newRemaining = cp.sessions_remaining + add;
    const newDep = Math.min(newTotal, (cp.deposit_sessions_paid ?? 0) + addDep);
    const newYears = (cp.warranty_years ?? 0) + yrs;
    const currentExp = cp.warranty_expires_at ? new Date(cp.warranty_expires_at).getTime() : 0;
    const candidateExp = yrs > 0 ? Date.now() + yrs * 365 * 24 * 60 * 60 * 1000 : 0;
    const newExp = Math.max(currentExp, candidateExp);
    const nowIso = new Date().toISOString();
    const { error } = await sb.from("customer_packages").update({
      total_sessions: newTotal,
      sessions_remaining: newRemaining,
      deposit_sessions_paid: newDep,
      deposit_paid: newDep > 0,
      deposit_paid_at: newDep > 0 ? nowIso : null,
      warranty_years: newYears,
      warranty_expires_at: newExp ? new Date(newExp).toISOString() : null,
    }).eq("id", customerPackageId);
    if (error) throw new Error(error.message);
    return { ok: true };
  },


  async setDepositSessions({ customerPackageId, sessions }, { userId }) {
    await assertAdmin(userId);
    const sb = admin();
    const { data: cp, error: cErr } = await sb
      .from("customer_packages").select("total_sessions")
      .eq("id", customerPackageId).maybeSingle();
    if (cErr || !cp) throw new Error("Not found");
    const dep = Math.max(0, Math.min(Number(sessions) || 0, cp.total_sessions));
    const { error } = await sb
      .from("customer_packages")
      .update({
        deposit_sessions_paid: dep,
        deposit_paid: dep > 0,
        deposit_paid_at: dep > 0 ? new Date().toISOString() : null,
      })
      .eq("id", customerPackageId);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async useSession({ customerPackageId, staffIds }, { userId }) {
    await assertAdmin(userId);
    const sb = admin();
    const { data: cp, error } = await sb
      .from("customer_packages").select("sessions_remaining")
      .eq("id", customerPackageId).maybeSingle();
    if (error || !cp) throw new Error("Not found");
    if (cp.sessions_remaining <= 0) throw new Error("No sessions left");
    const { error: uErr } = await sb
      .from("customer_packages")
      .update({ sessions_remaining: cp.sessions_remaining - 1 })
      .eq("id", customerPackageId);
    if (uErr) throw new Error(uErr.message);
    const { data: log, error: lErr } = await sb
      .from("usage_logs")
      .insert({ customer_package_id: customerPackageId, admin_id: userId })
      .select("id").single();
    if (lErr || !log) throw new Error(lErr?.message ?? "Failed to log");
    if (Array.isArray(staffIds) && staffIds.length) {
      const { data: validRoles } = await sb
        .from("user_roles").select("user_id")
        .in("role", ["staff", "stylist"]).in("user_id", staffIds);
      const valid = new Set((validRoles ?? []).map((r) => r.user_id));
      const rows = staffIds
        .filter((id: string) => valid.has(id))
        .map((staff_user_id: string) => ({ usage_log_id: log.id, staff_user_id }));
      if (rows.length) await sb.from("session_staff").insert(rows);
    }
    return { ok: true, remaining: cp.sessions_remaining - 1 };
  },

  async adminListStaff(_p, { userId }) {
    await assertAdmin(userId);
    const sb = admin();
    const { data: roles, error } = await sb
      .from("user_roles").select("user_id,role").in("role", ["staff", "stylist"]);
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
    if (!ids.length) return [];
    const byUser = new Map<string, Set<string>>();
    for (const r of roles ?? []) {
      const s = byUser.get(r.user_id) ?? new Set<string>();
      s.add(r.role);
      byUser.set(r.user_id, s);
    }
    const { data: profiles } = await sb
      .from("profiles").select("id,email,name,created_at")
      .in("id", ids).order("created_at", { ascending: false });
    return (profiles ?? []).map((p: any) => {
      const set = byUser.get(p.id) ?? new Set();
      return {
        ...p,
        is_staff: set.has("staff"),
        is_stylist: set.has("stylist"),
        category: set.has("stylist") ? "stylist" : "staff",
      };
    });
  },

  async adminCreateStaff({ email, password, name, category }, { userId }) {
    await assertAdmin(userId);
    const sb = admin();
    const { data: created, error } = await sb.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: name ? { name } : undefined,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");
    const uid = created.user.id;
    await sb.from("user_roles").delete().eq("user_id", uid);
    const role = category === "stylist" ? "stylist" : "staff";
    const { error: rErr } = await sb.from("user_roles").insert({ user_id: uid, role });
    if (rErr) throw new Error(rErr.message);
    if (name) await sb.from("profiles").update({ name }).eq("id", uid);
    return { ok: true, email };
  },

  async adminPromoteToStaff({ userId: targetId }, { userId }) {
    await assertAdmin(userId);
    const sb = admin();
    const { error } = await sb.from("user_roles").insert({ user_id: targetId, role: "staff" });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  },

  async adminRemoveStaffRole({ userId: targetId }, { userId }) {
    await assertAdmin(userId);
    const sb = admin();
    const { error } = await sb
      .from("user_roles").delete()
      .eq("user_id", targetId).in("role", ["staff", "stylist"]);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async adminSetStaffCategory({ userId: targetId, category }, { userId }) {
    await assertAdmin(userId);
    if (category !== "staff" && category !== "stylist") throw new Error("Invalid category");
    const sb = admin();
    await sb.from("user_roles").delete()
      .eq("user_id", targetId).in("role", ["staff", "stylist"]);
    const { error } = await sb.from("user_roles").insert({ user_id: targetId, role: category });
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async adminCreateAdmin({ email, password, name }, { userId }) {
    await assertAdmin(userId);
    const sb = admin();
    const { data: created, error } = await sb.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: name ? { name } : undefined,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");
    const uid = created.user.id;
    await sb.from("user_roles").delete().eq("user_id", uid);
    const { error: rErr } = await sb.from("user_roles").insert({ user_id: uid, role: "admin" });
    if (rErr) throw new Error(rErr.message);
    if (name) await sb.from("profiles").update({ name }).eq("id", uid);
    return { ok: true, email };
  },

  async adminListAdmins(_p, { userId }) {
    await assertAdmin(userId);
    const sb = admin();
    const { data: roles, error } = await sb
      .from("user_roles").select("user_id").eq("role", "admin");
    if (error) throw new Error(error.message);
    const ids = (roles ?? []).map((r) => r.user_id);
    if (!ids.length) return [];
    const { data: profiles } = await sb
      .from("profiles").select("id,email,name,created_at")
      .in("id", ids).order("created_at", { ascending: false });
    return profiles ?? [];
  },

  async adminResetPassword({ userId: targetId, password }, { userId }) {
    await assertAdmin(userId);
    const sb = admin();
    const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", targetId);
    if (!(roles ?? []).some((r) => r.role === "admin")) {
      throw new Error("Target user is not an admin");
    }
    const { error } = await sb.auth.admin.updateUserById(targetId, { password });
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async staffListMySessions(_p, { userId }) {
    await assertStaff(userId);
    const sb = admin();
    const { data: links, error } = await sb
      .from("session_staff")
      .select("usage_log_id, created_at")
      .eq("staff_user_id", userId)
      .order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    const logIds = (links ?? []).map((l) => l.usage_log_id);
    if (!logIds.length) return [];
    const { data: logs } = await sb
      .from("usage_logs")
      .select(
        "id, used_at, customer_package_id, customer_packages(id, sessions_remaining, total_sessions, customer_id, packages(name), profiles:customer_id(email,name))",
      )
      .in("id", logIds);
    const map = new Map((logs ?? []).map((l: any) => [l.id, l]));
    return (links ?? []).map((link) => {
      const l: any = map.get(link.usage_log_id);
      if (!l) return null;
      const cp = l.customer_packages;
      return {
        id: l.id,
        used_at: l.used_at,
        package_name: cp?.packages?.name ?? "Package",
        customer_email: cp?.profiles?.email ?? "Customer",
        customer_name: cp?.profiles?.name ?? null,
        remaining: cp?.sessions_remaining ?? 0,
        total: cp?.total_sessions ?? 0,
      };
    }).filter(Boolean);
  },

  async adminListHistory(p, { userId }) {
    await assertAdmin(userId);
    const sb = admin();
    let logIdsFilter: string[] | null = null;
    if (p.staffId) {
      const { data: links } = await sb
        .from("session_staff").select("usage_log_id")
        .eq("staff_user_id", p.staffId);
      logIdsFilter = (links ?? []).map((l) => l.usage_log_id);
      if (!logIdsFilter.length) return [];
    }
    let q = sb.from("usage_logs")
      .select(
        "id, used_at, admin_id, customer_package_id, customer_packages!inner(id, customer_id, package_id, packages(id,name), profiles:customer_id(id,email,name))",
      )
      .order("used_at", { ascending: false }).limit(500);
    if (p.from) q = q.gte("used_at", p.from);
    if (p.to) q = q.lte("used_at", p.to);
    if (p.customerId) q = q.eq("customer_packages.customer_id", p.customerId);
    if (p.packageId) q = q.eq("customer_packages.package_id", p.packageId);
    if (logIdsFilter) q = q.in("id", logIdsFilter);

    const { data: logs, error } = await q;
    if (error) throw new Error(error.message);
    const ids = (logs ?? []).map((l: any) => l.id);
    const adminIds = Array.from(
      new Set((logs ?? []).map((l: any) => l.admin_id).filter(Boolean) as string[]),
    );
    const [{ data: staffLinks }, { data: adminProfiles }] = await Promise.all([
      ids.length
        ? sb.from("session_staff")
            .select("usage_log_id, staff_user_id, profiles:staff_user_id(id,email,name)")
            .in("usage_log_id", ids)
        : Promise.resolve({ data: [] as any[] }),
      adminIds.length
        ? sb.from("profiles").select("id,email,name").in("id", adminIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const staffByLog = new Map<string, any[]>();
    for (const sl of (staffLinks ?? []) as any[]) {
      const arr = staffByLog.get(sl.usage_log_id) ?? [];
      arr.push({
        id: sl.staff_user_id,
        email: sl.profiles?.email ?? sl.staff_user_id,
        name: sl.profiles?.name ?? null,
      });
      staffByLog.set(sl.usage_log_id, arr);
    }
    const adminInfo = new Map(
      ((adminProfiles ?? []) as any[]).map((p) => [p.id, { email: p.email, name: p.name }]),
    );
    return (logs ?? []).map((l: any) => {
      const cp = l.customer_packages;
      const a = l.admin_id ? adminInfo.get(l.admin_id) : null;
      return {
        id: l.id,
        used_at: l.used_at,
        customer_id: cp?.customer_id ?? "",
        customer_email: cp?.profiles?.email ?? "",
        customer_name: cp?.profiles?.name ?? null,
        package_id: cp?.package_id ?? "",
        package_name: cp?.packages?.name ?? "Package",
        customer_package_id: l.customer_package_id,
        sessions_deducted: 1,
        admin_id: l.admin_id,
        admin_email: a?.email ?? "",
        admin_name: a?.name ?? null,
        staff: staffByLog.get(l.id) ?? [],
      };
    });
  },

  async customerListMyHistory(_p, { userId }) {
    const sb = admin();
    const { data: cps } = await sb
      .from("customer_packages")
      .select("id, package_id, packages(name)")
      .eq("customer_id", userId);
    const cpIds = (cps ?? []).map((c: any) => c.id);
    if (!cpIds.length) return [];
    const pkgByCp = new Map<string, string>(
      (cps ?? []).map((c: any) => [c.id, c.packages?.name ?? "Package"]),
    );
    const { data: logs, error } = await sb
      .from("usage_logs")
      .select("id, used_at, customer_package_id")
      .in("customer_package_id", cpIds)
      .order("used_at", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    const ids = (logs ?? []).map((l: any) => l.id);
    const staffByLog = new Map<string, string[]>();
    if (ids.length) {
      const { data: links } = await sb
        .from("session_staff")
        .select("usage_log_id, profiles:staff_user_id(email,name)")
        .in("usage_log_id", ids);
      for (const l of (links ?? []) as any[]) {
        const arr = staffByLog.get(l.usage_log_id) ?? [];
        arr.push(l.profiles?.name ?? l.profiles?.email ?? "Staff");
        staffByLog.set(l.usage_log_id, arr);
      }
    }
    return (logs ?? []).map((l: any) => ({
      id: l.id,
      used_at: l.used_at,
      customer_package_id: l.customer_package_id,
      package_name: pkgByCp.get(l.customer_package_id) ?? "Package",
      sessions_deducted: 1,
      staff: staffByLog.get(l.id) ?? [],
    }));
  },

  async staffListMyHistory(_p, { userId }) {
    await assertStaff(userId);
    const sb = admin();
    const { data: links, error } = await sb
      .from("session_staff")
      .select(
        "usage_log_id, created_at, usage_logs(id, used_at, customer_package_id, customer_packages(customer_id, packages(name), profiles:customer_id(email,name)))",
      )
      .eq("staff_user_id", userId)
      .order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    return (links ?? []).map((l: any) => {
      const ul = l.usage_logs;
      const cp = ul?.customer_packages;
      return {
        id: ul?.id ?? l.usage_log_id,
        used_at: ul?.used_at ?? l.created_at,
        customer_email: cp?.profiles?.email ?? "Customer",
        customer_name: cp?.profiles?.name ?? null,
        package_name: cp?.packages?.name ?? "Package",
        sessions_deducted: 1,
      };
    });
  },

  async seedAdmin() {
    // Idempotent: creates or repairs admin@salon.com.
    const sb = admin();
    const email = "admin@salon.com";
    const password = "SalonAdmin!2026";
    const { data: existing } = await sb.from("profiles").select("id").eq("email", email).maybeSingle();
    let uid = existing?.id as string | undefined;
    let created = false;
    if (!uid) {
      const { data, error } = await sb.auth.admin.createUser({
        email, password, email_confirm: true,
      });
      if (error) throw new Error(error.message);
      uid = data.user!.id;
      created = true;
    } else {
      await sb.auth.admin.updateUserById(uid, { password, email_confirm: true });
    }
    await sb.from("user_roles").delete().eq("user_id", uid);
    await sb.from("user_roles").insert({ user_id: uid, role: "admin" });
    return { ok: true, email, password, created };
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;
    const payload = body?.payload ?? {};
    if (!action || !(action in actions)) return json({ error: "Unknown action" }, 400);

    // `seedAdmin` is intentionally unauthenticated (one-shot setup).
    if (action === "seedAdmin") {
      const result = await actions.seedAdmin(payload, { userId: "" });
      return json(result);
    }

    const { userId } = await requireUser(req);
    const result = await actions[action](payload, { userId });
    return json(result);
  } catch (e) {
    const msg = (e as Error).message ?? "Internal error";
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 400;
    return json({ error: msg }, status);
  }
});
