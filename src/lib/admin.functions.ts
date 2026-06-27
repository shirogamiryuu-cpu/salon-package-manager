// SPA wrappers around the admin-api edge function.
// Call shape matches the previous TanStack Start server-fn API
// (`fn({ data: {...} })`) so route files don't need to change.
import { callAdminApi } from "./admin-api";

type Arg<T> = { data: T } | undefined;
const payload = <T,>(a: Arg<T>): T => (a?.data ?? ({} as T));

export const adminListCustomers = (_a?: Arg<undefined>) =>
  callAdminApi("adminListCustomers");

export const adminGetCustomer = (a: { data: { id: string } }) =>
  callAdminApi("adminGetCustomer", payload(a));

export const assignPackage = (a: {
  data: { customerId: string; packageId: string; depositPaid?: boolean };
}) => callAdminApi("assignPackage", payload(a));

export const setDepositPaid = (a: {
  data: { customerPackageId: string; paid: boolean };
}) => callAdminApi("setDepositPaid", payload(a));

export const useSession = (a: {
  data: { customerPackageId: string; staffIds?: string[] };
}) => callAdminApi("useSession", payload(a));

export const adminListStaff = (_a?: Arg<undefined>) =>
  callAdminApi("adminListStaff");

export const adminCreateStaff = (a: {
  data: { email: string; password: string; name?: string };
}) => callAdminApi("adminCreateStaff", payload(a));

export const adminPromoteToStaff = (a: { data: { userId: string } }) =>
  callAdminApi("adminPromoteToStaff", payload(a));

export const adminRemoveStaffRole = (a: { data: { userId: string } }) =>
  callAdminApi("adminRemoveStaffRole", payload(a));

export const staffListMySessions = (_a?: Arg<undefined>) =>
  callAdminApi("staffListMySessions");

export const adminCreateAdmin = (a: {
  data: { email: string; password: string; name?: string };
}) => callAdminApi("adminCreateAdmin", payload(a));

export const adminListAdmins = (_a?: Arg<undefined>) =>
  callAdminApi("adminListAdmins");

export const adminResetPassword = (a: {
  data: { userId: string; password: string };
}) => callAdminApi("adminResetPassword", payload(a));

export const adminListHistory = (a: {
  data: {
    customerId?: string;
    staffId?: string;
    packageId?: string;
    from?: string;
    to?: string;
  };
}) => callAdminApi("adminListHistory", payload(a));

export const customerListMyHistory = (_a?: Arg<undefined>) =>
  callAdminApi("customerListMyHistory");

export const staffListMyHistory = (_a?: Arg<undefined>) =>
  callAdminApi("staffListMyHistory");
