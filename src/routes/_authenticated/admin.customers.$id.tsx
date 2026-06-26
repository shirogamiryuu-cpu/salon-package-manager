import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminGetCustomer,
  adminListStaff,
  adminPromoteToStaff,
  assignPackage,
  setDepositPaid,
  useSession,
} from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, MinusCircle, Scissors } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/customers/$id")({
  component: CustomerDetail,
});

type StaffOpt = { id: string; email: string | null; name: string | null };

function CustomerDetail() {
  const { id } = Route.useParams();
  const get = useServerFn(adminGetCustomer);
  const assign = useServerFn(assignPackage);
  const use = useServerFn(useSession);
  const listStaff = useServerFn(adminListStaff);
  const promote = useServerFn(adminPromoteToStaff);
  const setDeposit = useServerFn(setDepositPaid);

  const [data, setData] = useState<any>(null);
  const [packages, setPackages] = useState<{ id: string; name: string }[]>([]);
  const [pickId, setPickId] = useState<string>("");
  const [assignDeposit, setAssignDeposit] = useState(false);
  const [staffOpts, setStaffOpts] = useState<StaffOpt[]>([]);
  const [customerRoles, setCustomerRoles] = useState<string[]>([]);

  const [deductFor, setDeductFor] = useState<any | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
  const [deducting, setDeducting] = useState(false);

  const refresh = useCallback(async () => {
    const [d, staffList, { data: roles }] = await Promise.all([
      get({ data: { id } }),
      listStaff(),
      supabase.from("user_roles").select("role").eq("user_id", id),
    ]);
    setData(d);
    setStaffOpts(staffList as StaffOpt[]);
    setCustomerRoles((roles ?? []).map((r: any) => r.role));
  }, [get, id, listStaff]);

  useEffect(() => {
    refresh();
    supabase
      .from("packages")
      .select("id,name")
      .eq("is_active", true)
      .then(({ data }) => setPackages(data ?? []));
  }, [refresh]);

  const doAssign = async () => {
    if (!pickId) return;
    try {
      await assign({ data: { customerId: id, packageId: pickId } });
      toast.success("Package assigned");
      setPickId("");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const openDeduct = (cp: any) => {
    setSelectedStaff(new Set());
    setDeductFor(cp);
  };

  const toggleStaff = (sid: string) => {
    setSelectedStaff((prev) => {
      const n = new Set(prev);
      if (n.has(sid)) n.delete(sid);
      else n.add(sid);
      return n;
    });
  };

  const confirmDeduct = async () => {
    if (!deductFor) return;
    setDeducting(true);
    try {
      await use({
        data: {
          customerPackageId: deductFor.id,
          staffIds: Array.from(selectedStaff),
        },
      });
      toast.success("Session deducted");
      setDeductFor(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeducting(false);
    }
  };

  const doPromote = async () => {
    try {
      await promote({ data: { userId: id } });
      toast.success("Promoted to staff");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (!data) return <p className="text-muted-foreground">Loading...</p>;
  const { profile, customerPackages } = data;
  const isStaff = customerRoles.includes("staff");

  return (
    <div className="space-y-6">
      <Link
        to="/admin/customers"
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        <ArrowLeft className="h-3 w-3" /> Back
      </Link>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{profile?.name ?? profile?.email}</h1>
          <p className="text-sm text-muted-foreground">
            {profile?.name ? `${profile?.email} · ` : ""}{profile?.phone ?? "No phone"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isStaff && <Badge>Staff</Badge>}
          <Badge variant="secondary" className="text-base">
            ⭐ {profile?.points ?? 0} points
          </Badge>
          {!isStaff && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Scissors className="h-3.5 w-3.5 mr-1" /> Make Staff
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Promote to staff?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {profile?.name ?? profile?.email} will gain access to the staff dashboard and can be assigned to
                    session deductions. Their customer account stays intact.

                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={doPromote}>Promote</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assign a package</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Select value={pickId} onValueChange={setPickId}>
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Choose a package" />
            </SelectTrigger>
            <SelectContent>
              {packages.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={doAssign} disabled={!pickId}>
            Assign
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Owned packages</h2>
        {customerPackages.length === 0 && <p className="text-muted-foreground">None yet.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {customerPackages.map((cp: any) => {
            const pct = (cp.sessions_remaining / cp.total_sessions) * 100;
            return (
              <Card key={cp.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{cp.packages?.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {cp.sessions_remaining}/{cp.total_sessions}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={pct} />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Purchased {new Date(cp.purchase_date).toLocaleDateString()}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={cp.sessions_remaining === 0}
                      onClick={() => openDeduct(cp)}
                    >
                      <MinusCircle className="h-3 w-3 mr-1" /> Deduct session
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={!!deductFor} onOpenChange={(o) => !o && setDeductFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deduct a session</DialogTitle>
            <DialogDescription>
              {profile?.name ?? profile?.email} · {deductFor?.packages?.name}. Select the staff who performed the
              service (optional).

            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2 max-h-72 overflow-y-auto">
            {staffOpts.length === 0 && (
              <p className="text-sm text-muted-foreground">No staff members yet.</p>
            )}
            {staffOpts.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50"
              >
                <Checkbox
                  checked={selectedStaff.has(s.id)}
                  onCheckedChange={() => toggleStaff(s.id)}
                />
                <span className="text-sm">{s.name ?? s.email}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeductFor(null)}>
              Cancel
            </Button>
            <Button onClick={confirmDeduct} disabled={deducting}>
              {deducting ? "Deducting..." : "Deduct"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
