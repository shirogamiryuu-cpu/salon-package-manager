import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@/lib/server-fn";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Package as PackageIcon,
  ShoppingBag,
  UserPlus,
  KeyRound,
  Lock,
  Scissors,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  adminCreateAdmin,
  adminCreateCustomer,
  adminCreateStaff,
  adminListAdmins,
  adminListCustomers,
  adminListStaff,
  adminRemoveStaffRole,
  adminResetPassword,
  adminSetStaffCategory,
} from "@/lib/admin.functions";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDash,
});

function genTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const arr = new Uint32Array(14);
  crypto.getRandomValues(arr);
  for (const n of arr) out += chars[n % chars.length];
  return out + "!9";
}

type PersonRow = { id: string; email: string | null; name: string | null; created_at: string; is_staff?: boolean; is_stylist?: boolean; category?: "staff" | "stylist" };
type CustomerRow = { id: string; email: string | null; name: string | null; phone: string | null; points: number | null };

function AdminDash() {
  const [stats, setStats] = useState({ customers: 0, packages: 0, sold: 0 });
  const [admins, setAdmins] = useState<PersonRow[]>([]);
  const [staff, setStaff] = useState<PersonRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [me, setMe] = useState<string | null>(null);

  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState(genTempPassword());
  const [saving, setSaving] = useState(false);

  const [staffEmail, setStaffEmail] = useState("");
  const [staffName, setStaffName] = useState("");
  const [staffPassword, setStaffPassword] = useState(genTempPassword());
  const [staffCategory, setStaffCategory] = useState<"staff" | "stylist">("staff");
  const [savingStaff, setSavingStaff] = useState(false);

  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [custName, setCustName] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custPoints, setCustPoints] = useState("");
  const [custPassword, setCustPassword] = useState(genTempPassword());
  const [savingCust, setSavingCust] = useState(false);


  const [resetFor, setResetFor] = useState<PersonRow | null>(null);
  const [resetPwd, setResetPwd] = useState(genTempPassword());
  const [resetting, setResetting] = useState(false);

  const [removeStaffFor, setRemoveStaffFor] = useState<PersonRow | null>(null);

  const [selfPwd, setSelfPwd] = useState("");
  const [selfSaving, setSelfSaving] = useState(false);

  const createAdmin = useServerFn(adminCreateAdmin);
  const createStaff = useServerFn(adminCreateStaff);
  const createCustomer = useServerFn(adminCreateCustomer);
  const listAdmins = useServerFn(adminListAdmins);
  const listStaff = useServerFn(adminListStaff);
  const listCustomers = useServerFn(adminListCustomers);
  const resetPassword = useServerFn(adminResetPassword);
  const removeStaffRole = useServerFn(adminRemoveStaffRole);
  const setStaffCat = useServerFn(adminSetStaffCategory);

  const refresh = useCallback(async () => {
    const [{ count: pCount }, { count: sCount }, a, s, c, u] = await Promise.all([
      supabase.from("packages").select("*", { count: "exact", head: true }),
      supabase.from("customer_packages").select("*", { count: "exact", head: true }),
      listAdmins(),
      listStaff(),
      listCustomers(),
      supabase.auth.getUser(),
    ]);
    const customerRows = (c as CustomerRow[]) ?? [];
    setStats({ customers: customerRows.length, packages: pCount ?? 0, sold: sCount ?? 0 });
    setAdmins(a as PersonRow[]);
    setStaff(s as PersonRow[]);
    setCustomers(customerRows);
    setMe(u.data.user?.id ?? null);
  }, [listAdmins, listStaff, listCustomers]);

  useEffect(() => {
    refresh().catch((e) => toast.error(e instanceof Error ? e.message : "Load failed"));
  }, [refresh]);

  async function onCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createAdmin({ data: { email: email.trim(), password, name: name.trim() || undefined } });
      toast.success(`Admin created. Temp password: ${password}`, { duration: 10000 });
      setEmail("");
      setName("");
      setPassword(genTempPassword());
      setAddAdminOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create admin");
    } finally {
      setSaving(false);
    }
  }


  async function onCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    setSavingStaff(true);
    try {
      await createStaff({ data: { email: staffEmail.trim(), password: staffPassword, name: staffName.trim() || undefined, category: staffCategory } });
      toast.success(`${staffCategory === "stylist" ? "Stylist" : "Staff"} created. Temp password: ${staffPassword}`, { duration: 10000 });
      setStaffEmail("");
      setStaffName("");
      setStaffPassword(genTempPassword());
      setStaffCategory("staff");
      setAddStaffOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create staff");
    } finally {
      setSavingStaff(false);
    }
  }

  async function onCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!custEmail.trim() && !custPhone.trim()) {
      return toast.error("Email or phone is required");
    }
    setSavingCust(true);
    try {
      const res = await createCustomer({
        data: {
          email: custEmail.trim() || undefined,
          phone: custPhone.trim() || undefined,
          name: custName.trim() || undefined,
          password: custPassword,
          points: custPoints ? Number(custPoints) : undefined,
        },
      });
      const tmp = (res as { tempPassword?: string })?.tempPassword ?? custPassword;
      toast.success(`Customer created. Temp password: ${tmp}`, { duration: 10000 });
      setCustName("");
      setCustEmail("");
      setCustPhone("");
      setCustPoints("");
      setCustPassword(genTempPassword());
      setAddCustomerOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create customer");
    } finally {
      setSavingCust(false);
    }
  }




  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetFor) return;
    setResetting(true);
    try {
      await resetPassword({ data: { userId: resetFor.id, password: resetPwd } });
      toast.success(`Password reset. Temp password: ${resetPwd}`, { duration: 10000 });
      setResetFor(null);
      setResetPwd(genTempPassword());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setResetting(false);
    }
  }

  async function onRemoveStaff() {
    if (!removeStaffFor) return;
    try {
      await removeStaffRole({ data: { userId: removeStaffFor.id } });
      toast.success("Staff role removed");
      setRemoveStaffFor(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    }
  }

  async function onSelfChange(e: React.FormEvent) {
    e.preventDefault();
    if (selfPwd.length < 8) return toast.error("Min 8 chars");
    setSelfSaving(true);
    const { error } = await supabase.auth.updateUser({ password: selfPwd });
    setSelfSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setSelfPwd("");
  }

  const cards = [
    { label: "Customers", value: stats.customers, icon: Users },
    { label: "Packages", value: stats.packages, icon: PackageIcon },
    { label: "Assigned", value: stats.sold, icon: ShoppingBag },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid gap-3 grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="customers">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-3 pt-4">
          <div className="flex justify-end">
            <Dialog open={addCustomerOpen} onOpenChange={setAddCustomerOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={onCreateCustomer}>
                  <DialogHeader>
                    <DialogTitle>Add customer manually</DialogTitle>
                    <DialogDescription>
                      For existing customers before the app launch. Provide email or phone (or both).
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="cust-name">Name</Label>
                      <Input id="cust-name" value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="Full name" />
                    </div>
                    <div className="space-y-2">

                    <div className="space-y-2">
                      <Label htmlFor="cust-phone">Phone</Label>
                      <Input id="cust-phone" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} placeholder="+1234567890" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cust-points">Starting points</Label>
                      <Input id="cust-points" type="number" min={0} value={custPoints} onChange={(e) => setCustPoints(e.target.value)} placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cust-pass">Temporary password</Label>
                      <div className="flex gap-2">
                        <Input id="cust-pass" required value={custPassword} onChange={(e) => setCustPassword(e.target.value)} />
                        <Button type="button" variant="outline" onClick={() => setCustPassword(genTempPassword())}>
                          New
                        </Button>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={savingCust}>
                      {savingCust ? "Creating..." : "Create customer"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {customers.length === 0 && (
            <p className="text-sm text-muted-foreground">No customers yet.</p>
          )}
          {customers.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.name ?? c.email ?? "—"}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.name ? `${c.email ?? ""} · ` : ""}
                    {c.phone ?? "no phone"} · {c.points ?? 0} pts
                  </div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to="/admin/customers/$id" params={{ id: c.id }}>
                    View
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}

        </TabsContent>

        <TabsContent value="admins" className="space-y-6 pt-4">
          {/* Admins section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Admins
              </h2>
              <Dialog open={addAdminOpen} onOpenChange={setAddAdminOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Admin
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={onCreateAdmin}>
                    <DialogHeader>
                      <DialogTitle>Add new admin</DialogTitle>
                      <DialogDescription>
                        Creates an admin with this temporary password. They can change it later.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="admin-name">Name</Label>
                        <Input
                          id="admin-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Full name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-email">Email</Label>
                        <Input
                          id="admin-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@salon.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="admin-pass">Temporary password</Label>
                        <div className="flex gap-2">
                          <Input
                            id="admin-pass"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPassword(genTempPassword())}
                          >
                            New
                          </Button>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={saving}>
                        {saving ? "Creating..." : "Create admin"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {admins.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{a.name ?? a.email ?? "—"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {a.name ? a.email ?? "" : a.id === me ? "You" : "Admin"}
                      {a.name && a.id === me ? " · You" : ""}
                    </div>

                  </div>
                  {a.id !== me && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setResetPwd(genTempPassword());
                        setResetFor(a);
                      }}
                    >
                      <KeyRound className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </section>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4" /> Change my password
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSelfChange} className="space-y-3">
                <Input
                  type="password"
                  placeholder="New password (min 8 chars)"
                  value={selfPwd}
                  onChange={(e) => setSelfPwd(e.target.value)}
                />
                <Button type="submit" disabled={selfSaving} className="w-full">
                  {selfSaving ? "Updating..." : "Update password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-6 pt-4">
          {/* Staff section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Staff
              </h2>
              <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="secondary">
                    <Scissors className="mr-2 h-4 w-4" />
                    Add Staff
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={onCreateStaff}>
                    <DialogHeader>
                      <DialogTitle>Add new staff member</DialogTitle>
                      <DialogDescription>
                        Creates a staff account with this temporary password. They can change it
                        after signing in.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="staff-name">Name</Label>
                        <Input
                          id="staff-name"
                          value={staffName}
                          onChange={(e) => setStaffName(e.target.value)}
                          placeholder="Full name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="staff-email">Email</Label>
                        <Input
                          id="staff-email"
                          type="email"
                          required
                          value={staffEmail}
                          onChange={(e) => setStaffEmail(e.target.value)}
                          placeholder="name@salon.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Category</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={staffCategory === "staff" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStaffCategory("staff")}
                            className="flex-1"
                          >
                            Staff
                          </Button>
                          <Button
                            type="button"
                            variant={staffCategory === "stylist" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStaffCategory("stylist")}
                            className="flex-1"
                          >
                            Stylist
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="staff-pass">Temporary password</Label>
                        <div className="flex gap-2">
                          <Input
                            id="staff-pass"
                            required
                            value={staffPassword}
                            onChange={(e) => setStaffPassword(e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setStaffPassword(genTempPassword())}
                          >
                            New
                          </Button>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={savingStaff}>
                        {savingStaff ? "Creating..." : "Create staff"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {staff.length === 0 && (
              <p className="text-sm text-muted-foreground">No staff members yet.</p>
            )}

            {(["stylist", "staff"] as const).map((cat) => {
              const rows = staff.filter((s) => (s.category ?? "staff") === cat);
              if (rows.length === 0) return null;
              return (
                <div key={cat} className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {cat === "stylist" ? "Stylists" : "General staff"}
                  </h3>
                  {rows.map((s) => {
                    const other = cat === "stylist" ? "staff" : "stylist";
                    return (
                      <Card key={s.id}>
                        <CardContent className="p-4 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{s.name ?? s.email ?? "—"}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {s.name ? s.email ?? "" : ""}
                            </div>
                            <div className="mt-1">
                              <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium">
                                {cat === "stylist" ? "Stylist" : "Staff"}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await setStaffCat({ data: { userId: s.id, category: other } });
                                  toast.success(`Moved to ${other}`);
                                  refresh();
                                } catch (err) {
                                  toast.error(err instanceof Error ? err.message : "Failed");
                                }
                              }}
                            >
                              Make {other === "stylist" ? "Stylist" : "Staff"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRemoveStaffFor(s)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              );
            })}
          </section>
        </TabsContent>
      </Tabs>

      <Dialog open={!!resetFor} onOpenChange={(o) => !o && setResetFor(null)}>
        <DialogContent>
          <form onSubmit={onReset}>
            <DialogHeader>
              <DialogTitle>Reset password</DialogTitle>
              <DialogDescription>
                Set a temporary password for {resetFor?.name ?? resetFor?.email}. Share it securely — they can change
                it after signing in.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="reset-pwd">Temporary password</Label>
              <div className="flex gap-2">
                <Input
                  id="reset-pwd"
                  required
                  value={resetPwd}
                  onChange={(e) => setResetPwd(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetPwd(genTempPassword())}
                >
                  New
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={resetting}>
                {resetting ? "Resetting..." : "Reset password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeStaffFor} onOpenChange={(o) => !o && setRemoveStaffFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove staff role?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeStaffFor?.name ?? removeStaffFor?.email} will no longer have access to the staff dashboard. Their
              customer account stays intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onRemoveStaff}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
