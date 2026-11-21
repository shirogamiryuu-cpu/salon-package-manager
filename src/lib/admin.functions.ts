// SPA wrappers around the admin-api edge function.
// Call shape matches the previous TanStack Start server-fn API
// (`fn({ data: {...} })`) so route files don't need to change.
import { callAdminApi } from "./admin-api";
import { supabase } from "@/integrations/supabase/client";
import { normalizeMyanmarPhone } from "./utils";

type Arg<T> = { data: T } | undefined;
const payload = <T>(a: Arg<T>): T => a?.data ?? ({} as T);

export const adminListCustomers = (_a?: Arg<undefined>) => callAdminApi("adminListCustomers");

export const adminGetCustomer = (a: { data: { id: string } }) =>
  callAdminApi("adminGetCustomer", payload(a));

export const assignPackage = (a: {
  data: {
    customerId: string;
    packageId: string;
    variantId?: string | null;
    sessions?: number;
    depositAmount?: number;
    totalPrice?: number;
    warrantyYears?: number;
    purchaseDate?: string;
    warrantyExpiresAt?: string;
    soldByStaffIds?: string[];
  };
}) => callAdminApi("assignPackage", payload(a));

export const deleteCustomerPackage = (a: { data: { customerPackageId: string } }) =>
  callAdminApi("deleteCustomerPackage", payload(a));

export const adminAddSessions = (a: {
  data: {
    customerPackageId: string;
    sessions: number;
    depositAmount?: number;
    addedPrice?: number;
    warrantyYears?: number;
  };
}) => callAdminApi("adminAddSessions", payload(a));

export const setDepositAmount = (a: { data: { customerPackageId: string; amount: number } }) =>
  callAdminApi("setDepositAmount", payload(a));

export const addDepositAmount = (a: { data: { customerPackageId: string; amount: number } }) =>
  callAdminApi("addDepositAmount", payload(a));

export const useSession = (a: {
  data: {
    customerPackageId: string;
    staffIds?: string[];
    variantId?: string | null;
    manualPrice?: number | null;
    skipApproval?: boolean;
  };
}) => callAdminApi("useSession", payload(a));

export const customerListPendingRequests = (_a?: Arg<undefined>) =>
  callAdminApi("customerListPendingRequests");

export const respondSessionRequest = (a: { data: { requestId: string; approve: boolean } }) =>
  callAdminApi("respondSessionRequest", payload(a));

export const adminListStaff = (_a?: Arg<undefined>) => callAdminApi("adminListStaff");

export const adminCreateStaff = (a: {
  data: {
    name: string;
    category?: "staff" | "stylist";
    phone?: string;
    email?: string;
    password?: string;
  };
}) => {
  const d = { ...payload(a) };
  if (!d.email || !d.email.trim()) {
    const randomHex = Math.random().toString(36).slice(2, 10);
    d.email = `staff_${Date.now()}_${randomHex}@internal.local`;
  }
  return callAdminApi("adminCreateStaff", d);
};

export const adminUpdateStaff = (a: {
  data: {
    userId: string;
    name?: string;
    category?: "staff" | "stylist";
    phone?: string;
    email?: string;
  };
}) => callAdminApi("adminUpdateStaff", payload(a));

export const adminDeleteStaff = async (a: { data: { userId: string } }) => {
  try {
    return await callAdminApi("adminDeleteStaff", payload(a));
  } catch (err: any) {
    if (err?.message?.includes("Unknown action")) {
      return await callAdminApi("adminRemoveStaffRole", payload(a));
    }
    throw err;
  }
};

export const adminCreateCustomer = async (a: {
  data: { email?: string; phone?: string; name?: string; password?: string };
}) => {
  const d = { ...payload(a) };
  const rawPhone = (d.phone ?? "").trim();
  const cleanPhone = rawPhone ? normalizeMyanmarPhone(rawPhone) : null;
  const digits = cleanPhone ? cleanPhone.replace(/[^0-9]/g, "") : "";

  // Check duplicate phone locally before calling to give clear feedback
  if (cleanPhone) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, phone")
      .not("phone", "is", null);
    const dup = (existing ?? []).some(
      (p: any) => normalizeMyanmarPhone(p.phone) === cleanPhone,
    );
    if (dup) throw new Error("A customer with this phone number already exists");
  }

  // Synthesize internal email placeholder for GoTrue
  const finalEmail =
    d.email?.trim() ||
    (digits ? `phone_${digits}@placeholder.local` : `cust_${Date.now()}@placeholder.local`);

  // We deliberately omit `phone` from the payload sent to adminCreateCustomer action
  // because the deployed edge function in the cloud passes phone to auth.admin.createUser(),
  // which causes Supabase GoTrue to throw "Invalid phone number format (E.164 required)".
  const res = await callAdminApi<{ ok: boolean; id: string; tempPassword?: string }>(
    "adminCreateCustomer",
    {
      name: d.name?.trim() || undefined,
      email: finalEmail,
      password: d.password,
    },
  );

  // Directly persist the local 09 phone format to the customer's profile
  if (res?.id && cleanPhone) {
    const { error: pErr } = await supabase
      .from("profiles")
      .update({ phone: cleanPhone })
      .eq("id", res.id);
    if (pErr) console.warn("Failed to patch profile phone:", pErr.message);
  }

  return res;
};

export const adminDeleteCustomer = (a: { data: { customerId: string } }) =>
  callAdminApi("adminDeleteCustomer", payload(a));

export const adminPromoteToStaff = (a: { data: { userId: string } }) =>
  callAdminApi("adminPromoteToStaff", payload(a));

export const adminRemoveStaffRole = (a: { data: { userId: string } }) =>
  callAdminApi("adminRemoveStaffRole", payload(a));

export const adminSetStaffCategory = (a: {
  data: { userId: string; category: "staff" | "stylist" };
}) => callAdminApi("adminSetStaffCategory", payload(a));

export const staffListMySessions = (_a?: Arg<undefined>) => callAdminApi("staffListMySessions");

export const staffDashboard = (_a?: Arg<undefined>) => callAdminApi("staffDashboard");

export const adminCreateAdmin = (a: { data: { email: string; password: string; name?: string } }) =>
  callAdminApi("adminCreateAdmin", payload(a));

export const adminListAdmins = (_a?: Arg<undefined>) => callAdminApi("adminListAdmins");

export const adminResetPassword = (a: { data: { userId: string; password: string } }) =>
  callAdminApi("adminResetPassword", payload(a));

export const adminListHistory = (a: {
  data: {
    customerId?: string;
    staffId?: string;
    packageId?: string;
    from?: string;
    to?: string;
  };
}) => callAdminApi("adminListHistory", payload(a));

export const customerListMyHistory = (_a?: Arg<undefined>) => callAdminApi("customerListMyHistory");

export const staffListMyHistory = (_a?: Arg<undefined>) => callAdminApi("staffListMyHistory");
