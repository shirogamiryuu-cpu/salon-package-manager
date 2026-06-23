import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Package as PackageIcon, ShoppingBag, UserPlus, KeyRound, Lock } from "lucide-react";
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
import { toast } from "sonner";
import {
  adminCreateAdmin,
  adminListAdmins,
  adminListCustomers,
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

type AdminRow = { id: string; email: string | null; created_at: string };
type CustomerRow = { id: string; email: string | null; phone: string | null; points: number | null };

function AdminDash() {
  const [stats, setStats] = useState({ customers: 0, packages: 0, sold: 0 });
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [me, setMe] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(genTempPassword());
  const [saving, setSaving] = useState(false);

  const [resetFor, setResetFor] = useState<AdminRow | null>(null);
  const [resetPwd, setResetPwd] = useState(genTempPassword());
  const [resetting, setResetting] = useState(false);

  const [selfPwd, setSelfPwd] = useState("");
  const [selfSaving, setSelfSaving] = useState(false);

  const createAdmin = useServerFn(adminCreateAdmin);
  const listAdmins = useServerFn(adminListAdmins);
  const listCustomers = useServerFn(adminListCustomers);
  const resetPassword = useServerFn(adminResetPassword);

  const refresh = useCallback(async () => {
    const [{ count: cCount }, { count: pCount }, { count: sCount }, a, c, u] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("packages").select("*", { count: "exact", head: true }),
      supabase.from("customer_packages").select("*", { count: "exact", head: true }),
      listAdmins(),
      listCustomers(),
      supabase.auth.getUser(),
    ]);
    setStats({ customers: cCount ?? 0, packages: pCount ?? 0, sold: sCount ?? 0 });
    setAdmins(a as AdminRow[]);
    setCustomers(c as CustomerRow[]);
    setMe(u.data.user?.id ?? null);
  }, [listAdmins, listCustomers]);

  useEffect(() => {
    refresh().catch((e) => toast.error(e instanceof Error ? e.message : "Load failed"));
  }, [refresh]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createAdmin({ data: { email: email.trim(), password } });
      toast.success(`Admin created. Temp password: ${password}`, { duration: 10000 });
      setEmail("");
      setPassword(genTempPassword());
      setAddOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create admin");
    } finally {
      setSaving(false);
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
          <TabsTrigger value="admins">Admins</TabsTrigger>
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

        <TabsContent value="admins" className="space-y-3 pt-4">
          <div className="flex justify-end">
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Admin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={onCreate}>
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
    </div>
  );
}
