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

type FcmServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

let cachedFcmAccessToken: { token: string; expiresAt: number } | null = null;

function base64Url(input: Uint8Array | string) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToArrayBuffer(pem: string) {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getFcmAccessToken(sa: FcmServiceAccount) {
  if (cachedFcmAccessToken && cachedFcmAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedFcmAccessToken.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claim}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error_description ?? body?.error ?? "FCM auth failed");

  cachedFcmAccessToken = {
    token: body.access_token,
    expiresAt: Date.now() + Math.max(1, Number(body.expires_in ?? 3600) - 120) * 1000,
  };
  return cachedFcmAccessToken.token;
}

async function sendSessionApprovalPush(args: {
  customerId: string;
  requestId: string;
  packageName?: string | null;
}) {
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
  if (!raw) {
    console.warn("[push] FCM_SERVICE_ACCOUNT_JSON is not configured");
    return;
  }

  const sa = JSON.parse(raw) as FcmServiceAccount;
  if (!sa.project_id || !sa.client_email || !sa.private_key) {
    throw new Error("Invalid FCM_SERVICE_ACCOUNT_JSON");
  }

  const sb = admin();
  const { data: tokens, error } = await sb
    .from("device_tokens")
    .select("token")
    .eq("user_id", args.customerId);
  if (error) throw new Error(error.message);
  const uniqueTokens = Array.from(new Set((tokens ?? []).map((row: any) => row.token).filter(Boolean)));
  if (!uniqueTokens.length) return;

  const accessToken = await getFcmAccessToken(sa);
  const title = "Session approval request";
  const body = `Please approve the deduction for ${args.packageName || "your package"}.`;

  await Promise.all(uniqueTokens.map(async (token) => {
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data: {
            type: "session_deduction_request",
            requestId: args.requestId,
            route: "/app/notifications",
          },
          android: {
            priority: "HIGH",
            notification: {
              channel_id: "session_requests",
              click_action: "OPEN_SESSION_REQUESTS",
            },
          },
          apns: {
            headers: { "apns-priority": "10" },
            payload: {
              aps: {
                sound: "default",
                category: "SESSION_REQUEST",
              },
            },
          },
        },
      }),
    });
    const text = await response.text();
    if (!response.ok) {
      console.error("[push] FCM send failed", response.status, text);
      if (text.includes("UNREGISTERED") || text.includes("INVALID_ARGUMENT")) {
        await sb.from("device_tokens").delete().eq("token", token);
      }
    }
  }));
}

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
    const nonCustomerIds = new Set(
      (roles ?? [])
        .filter((r) => r.role === "admin" || r.role === "staff" || r.role === "stylist")
        .map((r) => r.user_id),
    );
    return (profiles ?? []).filter((p) => !nonCustomerIds.has(p.id));
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

  async assignPackage({ customerId, packageId, variantId, sessions, depositAmount, totalPrice, warrantyYears, purchaseDate, warrantyExpiresAt }, { userId }) {
    await assertAdmin(userId);
    const sb = admin();
    const { data: pkg, error: pErr } = await sb
      .from("packages")
      .select("total_sessions,points_awarded,price")
      .eq("id", packageId)
      .maybeSingle();
    if (pErr || !pkg) throw new Error("Package not found");

    let variantLabel: string | null = null;
    let variantUnit: number | null = null;
    if (variantId) {
      const { data: v, error: vErr } = await sb
        .from("package_variants")
        .select("id,label,price,package_id")
        .eq("id", variantId)
        .maybeSingle();
      if (vErr || !v) throw new Error("Variant not found");
      if (v.package_id !== packageId) throw new Error("Variant does not belong to this package");
      variantLabel = v.label;
      variantUnit = Number(v.price) || 0;
    }

    const totalSessions = Math.max(1, Number(sessions) || pkg.total_sessions || 1);
    const defaultUnit = variantUnit != null
      ? variantUnit
      : (Number(pkg.price) || 0) / Math.max(1, pkg.total_sessions || 1);
    const addPrice = Number.isFinite(Number(totalPrice))
      ? Math.max(0, Number(totalPrice))
      : Math.round(defaultUnit * totalSessions * 100) / 100;
    const addDep = Math.max(0, Math.min(Number(depositAmount) || 0, addPrice));
    const unitPrice = addPrice / totalSessions;
    const depSessionsEq = unitPrice > 0
      ? Math.max(0, Math.min(totalSessions, Math.round(addDep / unitPrice)))
      : 0;
    const yrs = Math.max(0, Number(warrantyYears) || 0);
    const nowIso = new Date().toISOString();
    const purchaseIso = purchaseDate ? new Date(purchaseDate).toISOString() : nowIso;
    const explicitExp = warrantyExpiresAt ? new Date(warrantyExpiresAt).toISOString() : null;
    const expiresAt = explicitExp
      ? explicitExp
      : (yrs > 0
        ? new Date(new Date(purchaseIso).getTime() + yrs * 365 * 24 * 60 * 60 * 1000).toISOString()
        : null);

    let existingQ = sb
      .from("customer_packages")
      .select("id, sessions_remaining, total_sessions, deposit_sessions_paid, deposit_amount, total_price, warranty_years, warranty_expires_at")
      .eq("customer_id", customerId)
      .eq("package_id", packageId);
    existingQ = variantId ? existingQ.eq("variant_id", variantId) : existingQ.is("variant_id", null);
    const { data: existing } = await existingQ
      .order("purchase_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const newTotal = existing.total_sessions + totalSessions;
      const newRemaining = existing.sessions_remaining + totalSessions;
      const newTotalPrice = Number(existing.total_price ?? 0) + addPrice;
      const newDepAmount = Math.min(newTotalPrice, Number(existing.deposit_amount ?? 0) + addDep);
      const newDepSessions = Math.min(newTotal, (existing.deposit_sessions_paid ?? 0) + depSessionsEq);
      const newYears = (existing.warranty_years ?? 0) + yrs;
      const currentExp = existing.warranty_expires_at ? new Date(existing.warranty_expires_at).getTime() : 0;
      const candidateExp = expiresAt ? new Date(expiresAt).getTime() : 0;
      const newExp = Math.max(currentExp, candidateExp);
      const { error } = await sb.from("customer_packages").update({
        total_sessions: newTotal,
        sessions_remaining: newRemaining,
        total_price: newTotalPrice,
        deposit_amount: newDepAmount,
        deposit_sessions_paid: newDepSessions,
        deposit_paid: newDepAmount > 0,
        deposit_paid_at: newDepAmount > 0 ? nowIso : null,
        warranty_years: newYears,
        warranty_expires_at: newExp ? new Date(newExp).toISOString() : null,
      }).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb.from("customer_packages").insert({
        customer_id: customerId,
        package_id: packageId,
        variant_id: variantId ?? null,
        variant_label: variantLabel,
        sessions_remaining: totalSessions,
        total_sessions: totalSessions,
        total_price: addPrice,
        deposit_amount: addDep,
        deposit_sessions_paid: depSessionsEq,
        deposit_paid: addDep > 0,
        deposit_paid_at: addDep > 0 ? purchaseIso : null,
        warranty_years: yrs,
        warranty_expires_at: expiresAt,
        purchase_date: purchaseIso,
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

  async adminAddSessions({ customerPackageId, sessions, depositAmount, addedPrice, warrantyYears }, { userId }) {
    await assertAdmin(userId);
    const add = Math.max(1, Number(sessions) || 0);
    const yrs = Math.max(0, Number(warrantyYears) || 0);
    const sb = admin();
    const { data: cp, error: cErr } = await sb
      .from("customer_packages")
      .select("package_id, total_sessions, sessions_remaining, deposit_sessions_paid, deposit_amount, total_price, warranty_years, warranty_expires_at, packages(price,total_sessions)")
      .eq("id", customerPackageId).maybeSingle();
    if (cErr || !cp) throw new Error("Not found");
    const pkgPrice = Number((cp as any).packages?.price ?? 0);
    const pkgTotal = Math.max(1, Number((cp as any).packages?.total_sessions ?? 1));
    const defaultUnit = pkgPrice / pkgTotal;
    const addPrice = Number.isFinite(Number(addedPrice))
      ? Math.max(0, Number(addedPrice))
      : Math.round(defaultUnit * add * 100) / 100;
    const addDep = Math.max(0, Math.min(Number(depositAmount) || 0, addPrice));
    const unitPrice = add > 0 ? addPrice / add : 0;
    const depSessionsEq = unitPrice > 0 ? Math.round(addDep / unitPrice) : 0;
    const newTotal = cp.total_sessions + add;
    const newRemaining = cp.sessions_remaining + add;
    const newTotalPrice = Number(cp.total_price ?? 0) + addPrice;
    const newDepAmount = Math.min(newTotalPrice, Number(cp.deposit_amount ?? 0) + addDep);
    const newDepSessions = Math.min(newTotal, (cp.deposit_sessions_paid ?? 0) + depSessionsEq);
    const newYears = (cp.warranty_years ?? 0) + yrs;
    const currentExp = cp.warranty_expires_at ? new Date(cp.warranty_expires_at).getTime() : 0;
    const candidateExp = yrs > 0 ? Date.now() + yrs * 365 * 24 * 60 * 60 * 1000 : 0;
    const newExp = Math.max(currentExp, candidateExp);
    const nowIso = new Date().toISOString();
    const { error } = await sb.from("customer_packages").update({
      total_sessions: newTotal,
      sessions_remaining: newRemaining,
      total_price: newTotalPrice,
      deposit_amount: newDepAmount,
      deposit_sessions_paid: newDepSessions,
      deposit_paid: newDepAmount > 0,
      deposit_paid_at: newDepAmount > 0 ? nowIso : null,
      warranty_years: newYears,
      warranty_expires_at: newExp ? new Date(newExp).toISOString() : null,
    }).eq("id", customerPackageId);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async addDepositAmount({ customerPackageId, amount }, { userId }) {
    await assertAdmin(userId);
    const inc = Math.max(0, Number(amount) || 0);
    if (inc <= 0) throw new Error("Amount must be greater than 0");
    const sb = admin();
    const { data: cp, error: cErr } = await sb
      .from("customer_packages")
      .select("total_sessions, total_price, deposit_amount, deposit_sessions_paid")
      .eq("id", customerPackageId).maybeSingle();
    if (cErr || !cp) throw new Error("Not found");
    const total = Number(cp.total_price ?? 0);
    const current = Number(cp.deposit_amount ?? 0);
    const newDep = Math.min(total, current + inc);
    const unit = cp.total_sessions > 0 ? total / cp.total_sessions : 0;
    const depSessions = unit > 0
      ? Math.max(0, Math.min(cp.total_sessions, Math.round(newDep / unit)))
      : 0;
    const nowIso = new Date().toISOString();
    const { error } = await sb.from("customer_packages").update({
      deposit_amount: newDep,
      deposit_sessions_paid: depSessions,
      deposit_paid: newDep > 0,
      deposit_paid_at: newDep > 0 ? nowIso : null,
    }).eq("id", customerPackageId);
    if (error) throw new Error(error.message);
    return { ok: true, deposit_amount: newDep };
  },

  async setDepositAmount({ customerPackageId, amount }, { userId }) {
    await assertAdmin(userId);
    const sb = admin();
    const { data: cp, error: cErr } = await sb
      .from("customer_packages").select("total_sessions, total_price")
      .eq("id", customerPackageId).maybeSingle();
    if (cErr || !cp) throw new Error("Not found");
    const total = Number(cp.total_price ?? 0);
    const dep = Math.max(0, Math.min(Number(amount) || 0, total));
    const unit = cp.total_sessions > 0 ? total / cp.total_sessions : 0;
    const depSessions = unit > 0
      ? Math.max(0, Math.min(cp.total_sessions, Math.round(dep / unit)))
      : 0;
    const { error } = await sb
      .from("customer_packages")
      .update({
        deposit_amount: dep,
        deposit_sessions_paid: depSessions,
        deposit_paid: dep > 0,
        deposit_paid_at: dep > 0 ? new Date().toISOString() : null,
      })
      .eq("id", customerPackageId);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async deleteCustomerPackage({ customerPackageId }, { userId }) {
    await assertAdmin(userId);
    const sb = admin();
    await sb.from("session_deduction_requests").delete().eq("customer_package_id", customerPackageId);
    const { data: logs } = await sb.from("usage_logs").select("id").eq("customer_package_id", customerPackageId);
    const logIds = (logs ?? []).map((l: any) => l.id);
    if (logIds.length) {
      await sb.from("session_staff").delete().in("usage_log_id", logIds);
      await sb.from("usage_logs").delete().in("id", logIds);
    }
    const { error } = await sb.from("customer_packages").delete().eq("id", customerPackageId);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async useSession({ customerPackageId, staffIds, variantId, manualPrice }, { userId }) {
    await assertAdmin(userId);
    const sb = admin();
    const { data: cp, error } = await sb
      .from("customer_packages")
      .select("id, customer_id, package_id, package_name, sessions_remaining, total_sessions, deposit_amount, total_price, packages(name)")
      .eq("id", customerPackageId).maybeSingle();
    if (error || !cp) throw new Error("Not found");
    if (cp.sessions_remaining <= 0) throw new Error("No sessions left");
    const used = (cp.total_sessions ?? 0) - (cp.sessions_remaining ?? 0);
    const unit = cp.total_sessions > 0 ? Number(cp.total_price ?? 0) / cp.total_sessions : 0;
    let mp: number | null = null;
    if (manualPrice !== undefined && manualPrice !== null && manualPrice !== "") {
      const n = Number(manualPrice);
      if (!Number.isFinite(n) || n < 0) throw new Error("Manual price must be a non-negative number");
      mp = Math.round(n * 100) / 100;
    }
    const thisNeed = mp != null ? mp : unit;
    const needed = unit * used + thisNeed;
    if (Number(cp.deposit_amount ?? 0) + 0.005 < needed)
      throw new Error("Deposit exhausted — collect more deposit before deducting another session");

    // Resolve variant (must belong to this package if given).
    let variantLabel: string | null = null;
    let resolvedVariantId: string | null = null;
    if (variantId) {
      const { data: v, error: vErr } = await sb
        .from("package_variants")
        .select("id,label,package_id")
        .eq("id", variantId).maybeSingle();
      if (vErr || !v) throw new Error("Variant not found");
      if (v.package_id !== cp.package_id) throw new Error("Variant does not belong to this package");
      resolvedVariantId = v.id;
      variantLabel = v.label;
    }

    // Cancel any stale pending requests on this package before creating a new one.
    await sb.from("session_deduction_requests")
      .update({ status: "cancelled", responded_at: new Date().toISOString() })
      .eq("customer_package_id", customerPackageId).eq("status", "pending");

    const staffArr = Array.isArray(staffIds) ? staffIds.filter((s) => typeof s === "string") : [];
    const { data: reqRow, error: rErr } = await sb
      .from("session_deduction_requests")
      .insert({
        customer_package_id: customerPackageId,
        customer_id: cp.customer_id,
        admin_id: userId,
        staff_ids: staffArr,
        variant_id: resolvedVariantId,
        variant_label: variantLabel,
        manual_price: mp,
      })
      .select("id, expires_at").single();
    if (rErr || !reqRow) throw new Error(rErr?.message ?? "Failed to create request");
    try {
      await sendSessionApprovalPush({
        customerId: cp.customer_id,
        requestId: reqRow.id,
        packageName: (cp as any).packages?.name ?? cp.package_name,
      });
    } catch (pushError) {
      console.error("[push] session approval notification failed", pushError);
    }
    return { ok: true, pending: true, requestId: reqRow.id, expiresAt: reqRow.expires_at };
  },

  async customerListPendingRequests(_p, { userId }) {
    const sb = admin();
    const nowIso = new Date().toISOString();
    // Expire stale ones first.
    await sb.from("session_deduction_requests")
      .update({ status: "expired", responded_at: nowIso })
      .eq("customer_id", userId).eq("status", "pending").lt("expires_at", nowIso);
    const { data, error } = await sb
      .from("session_deduction_requests")
      .select("id, created_at, expires_at, staff_ids, customer_package_id, customer_packages(id, sessions_remaining, total_sessions, packages(name))")
      .eq("customer_id", userId).eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const staffIds = Array.from(new Set((data ?? []).flatMap((r: any) => r.staff_ids ?? [])));
    let staffMap = new Map<string, { name: string | null; email: string | null }>();
    if (staffIds.length) {
      const { data: sp } = await sb.from("profiles").select("id,name,email").in("id", staffIds);
      staffMap = new Map((sp ?? []).map((s: any) => [s.id, { name: s.name, email: s.email }]));
    }
    return (data ?? []).map((r: any) => ({
      id: r.id,
      created_at: r.created_at,
      expires_at: r.expires_at,
      package_name: r.customer_packages?.packages?.name ?? "Package",
      remaining: r.customer_packages?.sessions_remaining ?? 0,
      total: r.customer_packages?.total_sessions ?? 0,
      staff: (r.staff_ids ?? []).map((id: string) => staffMap.get(id) ?? { name: null, email: null }),
    }));
  },


  async respondSessionRequest({ requestId, approve }, { userId }) {
    const sb = admin();
    const { data: req, error } = await sb
      .from("session_deduction_requests")
      .select("id, customer_id, customer_package_id, staff_ids, status, expires_at, admin_id, variant_id, variant_label, manual_price")
      .eq("id", requestId).maybeSingle();
    if (error || !req) throw new Error("Request not found");
    if (req.customer_id !== userId) throw new Error("Forbidden");
    if (req.status !== "pending") throw new Error("Request already handled");
    const nowIso = new Date().toISOString();
    if (new Date(req.expires_at).getTime() < Date.now()) {
      await sb.from("session_deduction_requests")
        .update({ status: "expired", responded_at: nowIso }).eq("id", req.id);
      throw new Error("Request expired");
    }

    if (!approve) {
      await sb.from("session_deduction_requests")
        .update({ status: "rejected", responded_at: nowIso }).eq("id", req.id);
      return { ok: true, status: "rejected" };
    }

    // Approve: run the actual deduction.
    const { data: cp, error: cpErr } = await sb
      .from("customer_packages")
      .select("customer_id, package_id, sessions_remaining, total_sessions, deposit_amount, total_price, packages(price,first_time_price)")
      .eq("id", req.customer_package_id).maybeSingle();
    if (cpErr || !cp) throw new Error("Package not found");
    if (cp.sessions_remaining <= 0) throw new Error("No sessions left");
    const used = (cp.total_sessions ?? 0) - (cp.sessions_remaining ?? 0);
    const unit = cp.total_sessions > 0 ? Number(cp.total_price ?? 0) / cp.total_sessions : 0;
    const manualPrice = (req as any).manual_price == null ? null : Number((req as any).manual_price);
    const thisSessionCost = manualPrice != null ? manualPrice : unit;
    const needed = unit * used + thisSessionCost;
    if (Number(cp.deposit_amount ?? 0) + 0.005 < needed) throw new Error("Deposit exhausted");

    // Compute price for THIS session, based on the chosen variant + first-time eligibility.
    let variantPrice: number | null = null;
    let variantFirstTime: number | null = null;
    if (req.variant_id) {
      const { data: v } = await sb.from("package_variants")
        .select("price,first_time_price").eq("id", req.variant_id).maybeSingle();
      if (v) {
        variantPrice = Number(v.price);
        variantFirstTime = v.first_time_price == null ? null : Number(v.first_time_price);
      }
    }
    const pkgPrice = Number((cp as any).packages?.price ?? 0);
    const pkgFirstTime = (cp as any).packages?.first_time_price;
    const basePrice = variantPrice != null ? variantPrice : pkgPrice;
    const firstTimePrice = variantFirstTime != null
      ? variantFirstTime
      : (pkgFirstTime == null ? null : Number(pkgFirstTime));

    // First-time eligibility: no session has ever been deducted on any customer_packages row
    // this customer has for the same package_id (any variant).
    let isFirstTimeEligible = false;
    if (firstTimePrice != null) {
      const { data: siblingCps } = await sb
        .from("customer_packages").select("id")
        .eq("customer_id", cp.customer_id).eq("package_id", cp.package_id);
      const siblingIds = (siblingCps ?? []).map((r: any) => r.id);
      if (siblingIds.length) {
        const { count } = await sb.from("usage_logs")
          .select("id", { count: "exact", head: true })
          .in("customer_package_id", siblingIds);
        isFirstTimeEligible = (count ?? 0) === 0;
      }
    }

    // Manual price overrides first-time pricing entirely.
    const wasFirstTime = manualPrice == null && isFirstTimeEligible && firstTimePrice != null;
    const priceApplied = manualPrice != null
      ? manualPrice
      : (wasFirstTime ? firstTimePrice! : basePrice);

    const { error: uErr } = await sb.from("customer_packages")
      .update({ sessions_remaining: cp.sessions_remaining - 1 })
      .eq("id", req.customer_package_id);
    if (uErr) throw new Error(uErr.message);
    const { data: log, error: lErr } = await sb.from("usage_logs")
      .insert({
        customer_package_id: req.customer_package_id,
        admin_id: req.admin_id,
        variant_id: req.variant_id,
        variant_label: req.variant_label,
        price_applied: priceApplied,
        was_first_time: wasFirstTime,
      })
      .select("id").single();
    if (lErr || !log) throw new Error(lErr?.message ?? "Failed to log");
    if (Array.isArray(req.staff_ids) && req.staff_ids.length) {
      const { data: validRoles } = await sb.from("user_roles")
        .select("user_id").in("role", ["staff", "stylist"]).in("user_id", req.staff_ids);
      const valid = new Set((validRoles ?? []).map((r: any) => r.user_id));
      const rows = req.staff_ids.filter((id: string) => valid.has(id))
        .map((staff_user_id: string) => ({ usage_log_id: log.id, staff_user_id }));
      if (rows.length) await sb.from("session_staff").insert(rows);
    }
    await sb.from("session_deduction_requests")
      .update({ status: "approved", responded_at: nowIso, usage_log_id: log.id })
      .eq("id", req.id);
    return { ok: true, status: "approved", remaining: cp.sessions_remaining - 1 };
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

  async adminCreateCustomer({ email, phone, name, password, points }, { userId }) {
    await assertAdmin(userId);
    const sb = admin();
    const cleanEmail = (email ?? "").trim() || null;
    const cleanPhone = (phone ?? "").trim().replace(/\s+/g, "") || null;
    if (!cleanEmail && !cleanPhone) throw new Error("Email or phone is required");
    // Supabase auth requires an email; synthesize one from phone if missing.
    const finalEmail = cleanEmail ?? `phone_${cleanPhone!.replace(/[^0-9]/g, "")}@placeholder.local`;
    const finalPassword = (password ?? "").trim() || (crypto.randomUUID().replace(/-/g, "") + "!9");
    const { data: created, error } = await sb.auth.admin.createUser({
      email: finalEmail,
      password: finalPassword,
      email_confirm: true,
      phone: cleanPhone ?? undefined,
      phone_confirm: cleanPhone ? true : undefined,
      user_metadata: {
        ...(name ? { name } : {}),
        ...(cleanPhone ? { phone: cleanPhone } : {}),
      },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");
    const uid = created.user.id;
    // handle_new_user trigger already inserts profile + customer role. Patch fields.
    const patch: Record<string, unknown> = {};
    if (name) patch.name = name;
    if (cleanPhone) patch.phone = cleanPhone;
    if (cleanEmail) patch.email = cleanEmail;
    if (Number.isFinite(Number(points))) patch.points = Math.max(0, Math.floor(Number(points)));
    if (Object.keys(patch).length) await sb.from("profiles").update(patch).eq("id", uid);
    return { ok: true, id: uid, tempPassword: finalPassword };
  },

  async adminDeleteCustomer({ customerId }, { userId }) {
    await assertAdmin(userId);
    if (!customerId) throw new Error("customerId required");
    if (customerId === userId) throw new Error("You cannot delete your own account");
    const sb = admin();
    // Refuse to delete admins via this action.
    const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", customerId);
    if ((roles ?? []).some((r: any) => r.role === "admin")) {
      throw new Error("Cannot delete an admin account here");
    }
    // Clean dependent rows that don't cascade.
    const { data: cps } = await sb
      .from("customer_packages").select("id").eq("customer_id", customerId);
    const cpIds = (cps ?? []).map((c: any) => c.id);
    if (cpIds.length) {
      await sb.from("session_deduction_requests").delete().in("customer_package_id", cpIds);
      const { data: logs } = await sb.from("usage_logs").select("id").in("customer_package_id", cpIds);
      const logIds = (logs ?? []).map((l: any) => l.id);
      if (logIds.length) {
        await sb.from("session_staff").delete().in("usage_log_id", logIds);
        await sb.from("usage_logs").delete().in("id", logIds);
      }
      await sb.from("customer_packages").delete().in("id", cpIds);
    }
    await sb.from("session_deduction_requests").delete().eq("customer_id", customerId);
    await sb.from("device_tokens").delete().eq("user_id", customerId);
    await sb.from("user_roles").delete().eq("user_id", customerId);
    // Deleting the auth user cascades to profiles (FK on auth.users).
    const { error } = await sb.auth.admin.deleteUser(customerId);
    if (error) throw new Error(error.message);
    return { ok: true };
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
        "id, used_at, admin_id, customer_package_id, variant_label, price_applied, was_first_time, customer_packages!inner(id, customer_id, package_id, packages(id,name), profiles:customer_id(id,email,name))",
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
        variant_label: l.variant_label ?? null,
        price_applied: Number(l.price_applied ?? 0),
        was_first_time: !!l.was_first_time,
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
      .select("id, used_at, customer_package_id, variant_label, price_applied, was_first_time")
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
      variant_label: l.variant_label ?? null,
      price_applied: Number(l.price_applied ?? 0),
      was_first_time: !!l.was_first_time,
      staff: staffByLog.get(l.id) ?? [],
    }));
  },

  async staffListMyHistory(_p, { userId }) {
    await assertStaff(userId);
    const sb = admin();
    const { data: links, error } = await sb
      .from("session_staff")
      .select(
        "usage_log_id, created_at, usage_logs(id, used_at, customer_package_id, variant_label, price_applied, was_first_time, customer_packages(customer_id, packages(name), profiles:customer_id(email,name)))",
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
        variant_label: ul?.variant_label ?? null,
        price_applied: Number(ul?.price_applied ?? 0),
        was_first_time: !!ul?.was_first_time,
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
