import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
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
  adminCreateStaff,
  adminListAdmins,
  adminListCustomers,
  adminListStaff,
  adminRemoveStaffRole,
  adminResetPassword,
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

type PersonRow = { id: string; email: string | null; created_at: string };
type CustomerRow = { id: string; email: string | null; phone: string | null; points: number | null };

function AdminDash() {
  const [stats, setStats] = useState({ customers: 0, packages: 0, sold: 0 });
  const [admins, setAdmins] = useState<PersonRow[]>([]);
  const [staff, setStaff] = useState<PersonRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [me, setMe] = useState<string | null>(null);

  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(genTempPassword());
  const [saving, setSaving] = useState(false);

  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState(genTempPassword());
  const [savingStaff, setSavingStaff] = useState(false);

  const [resetFor, setResetFor] = useState<PersonRow | null>(null);
  const [resetPwd, setResetPwd] = useState(genTempPassword());
  const [resetting, setResetting] = useState(false);

  const [removeStaffFor, setRemoveStaffFor] = useState<PersonRow | null>(null);

  const [selfPwd, setSelfPwd] = useState("");
  const [selfSaving, setSelfSaving] = useState(false);

  const createAdmin = useServerFn(adminCreateAdmin);
  const createStaff = useServerFn(adminCreateStaff);
  const listAdmins = useServerFn(adminListAdmins);
  const listStaff = useServerFn(adminListStaff);
  const listCustomers = useServerFn(adminListCustomers);
  const resetPassword = useServerFn(adminResetPassword);
  const removeStaffRole = useServerFn(adminRemoveStaffRole);

  const refresh = useCallback(async () => {
    const [{ count: cCount }, { count: pCount }, { count: sCount }, a, s, c, u] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("packages").select("*", { count: "exact", head: true }),
      supabase.from("customer_packages").select("*", { count: "exact", head: true }),
      listAdmins(),
      listStaff(),
      listCustomers(),
      supabase.auth.getUser(),
    ]);
    setStats({ customers: cCount ?? 0, packages: pCount ?? 0, sold: sCount ?? 0 });
    setAdmins(a as PersonRow[]);
    setStaff(s as PersonRow[]);
    setCustomers(c as CustomerRow[]);
    setMe(u.data.user?.id ?? null);
  }, [listAdmins, listStaff, listCustomers]);

  useEffect(() => {
    refresh().catch((e) => toast.error(e instanceof Error ? e.message : "Load failed"));
  }, [refresh]);

  async function onCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createAdmin({ data: { email: email.trim(), password } });
      toast.success(`Admin created. Temp password: ${password}`, { duration: 10000 });
      setEmail("");
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
      await createStaff({ data: { email: staffEmail.trim(), password: staffPassword } });
      toast.success(`Staff created. Temp password: ${staffPassword}`, { duration: 10000 });
      setStaffEmail("");
      setStaffPassword(genTempPassword());
      setAddStaffOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create staff");
    } finally {
      setSavingStaff(false);
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-3 pt-4">
          {customers.length === 0 && (
            <p className="text-sm text-muted-foreground">No customers yet.</p>
          )}
          {customers.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.email ?? "—"}</div>
                  <div className="text-xs text-muted-foreground truncate">
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

        <TabsContent value="team" className="space-y-6 pt-4">
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
                    <div className="font-medium truncate">{a.email ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.id === me ? "You" : "Admin"}
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
            {staff.map((s) => (
              <Card key={s.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.email ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">Staff</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRemoveStaffFor(s)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
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
      </Tabs>

      <Dialog open={!!resetFor} onOpenChange={(o) => !o && setResetFor(null)}>
        <DialogContent>
          <form onSubmit={onReset}>
            <DialogHeader>
              <DialogTitle>Reset password</DialogTitle>
              <DialogDescription>
                Set a temporary password for {resetFor?.email}. Share it securely — they can change
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
              {removeStaffFor?.email} will no longer have access to the staff dashboard. Their
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
