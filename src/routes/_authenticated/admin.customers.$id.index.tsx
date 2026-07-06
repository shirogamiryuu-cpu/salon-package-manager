import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@/lib/server-fn";
import {
  adminAddSessions,
  adminGetCustomer,
  adminListStaff,
  adminPromoteToStaff,
  assignPackage,
  setDepositSessions,
  useSession,
} from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
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
import { ArrowLeft, MinusCircle, Scissors, Check, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { applyPromotion, fetchActivePromoMap, formatDiscountLabel, type Promotion } from "@/lib/promotions";

export const Route = createFileRoute("/_authenticated/admin/customers/$id/")({
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
  const setDeposit = useServerFn(setDepositSessions);
  const addSessionsFn = useServerFn(adminAddSessions);

  const [data, setData] = useState<any>(null);
  const [packages, setPackages] = useState<{ id: string; name: string; total_sessions: number; price: number }[]>([]);
  const [promoMap, setPromoMap] = useState<Map<string, Promotion>>(new Map());
  const [pickId, setPickId] = useState<string>("");
  const [assignSessions, setAssignSessions] = useState<number>(1);
  const [assignDeposit, setAssignDeposit] = useState<number>(0);
  const [assignWarranty, setAssignWarranty] = useState<number>(0);
  const [staffOpts, setStaffOpts] = useState<StaffOpt[]>([]);
  const [customerRoles, setCustomerRoles] = useState<string[]>([]);
  const [depositDrafts, setDepositDrafts] = useState<Record<string, number>>({});

  const [deductFor, setDeductFor] = useState<any | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
  const [deducting, setDeducting] = useState(false);

  const [addFor, setAddFor] = useState<any | null>(null);
  const [addSessions, setAddSessions] = useState<number>(1);
  const [addDeposit, setAddDeposit] = useState<number>(0);
  const [addWarranty, setAddWarranty] = useState<number>(0);
  const [adding, setAdding] = useState(false);

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
      .select("id,name,total_sessions,price")
      .eq("is_active", true)
      .then(async ({ data }) => {
        const list = (data ?? []) as any[];
        setPackages(list);
        setPromoMap(await fetchActivePromoMap(list.map((p) => p.id)));
      });
  }, [refresh]);

  const selectedPkg = packages.find((p) => p.id === pickId);
  const selectedPromo = selectedPkg ? promoMap.get(selectedPkg.id) : undefined;
  const selectedPricing = selectedPkg && selectedPromo
    ? applyPromotion(Number(selectedPkg.price), selectedPromo)
    : null;
  const selectedUnit = selectedPkg
    ? (selectedPricing ? selectedPricing.final : Number(selectedPkg.price))
    : 0;

  const doAssign = async () => {
    if (!pickId) return;
    try {
      const res: any = await assign({
        data: {
          customerId: id,
          packageId: pickId,
          sessions: assignSessions,
          depositSessionsPaid: assignDeposit,
          warrantyYears: assignWarranty,
        },
      });
      toast.success(res?.merged ? "Added to existing package" : "Package assigned");
      setPickId("");
      setAssignSessions(1);
      setAssignDeposit(0);
      setAssignWarranty(0);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const openAdd = (cp: any) => {
    setAddSessions(1);
    setAddDeposit(0);
    setAddWarranty(0);
    setAddFor(cp);
  };

  const confirmAdd = async () => {
    if (!addFor) return;
    setAdding(true);
    try {
      await addSessionsFn({
        data: {
          customerPackageId: addFor.id,
          sessions: addSessions,
          depositSessionsPaid: addDeposit,
          warrantyYears: addWarranty,
        },
      });
      toast.success("Sessions added");
      setAddFor(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAdding(false);
    }
  };

  const saveDeposit = async (cp: any) => {
    const val = depositDrafts[cp.id] ?? cp.deposit_sessions_paid ?? 0;
    try {
      await setDeposit({ data: { customerPackageId: cp.id, sessions: val } });
      toast.success("Deposit updated");
      setDepositDrafts((d) => {
        const n = { ...d };
        delete n[cp.id];
        return n;
      });
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
      toast.success("Approval request sent to customer (expires in 15 min)");
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
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
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
          </div>
          {selectedPkg && (
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Sessions:</span>
                <Input
                  type="number"
                  min={1}
                  value={assignSessions}
                  onChange={(e) => setAssignSessions(Math.max(1, Number(e.target.value) || 1))}
                  className="w-20 h-8"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Deposit sessions paid:</span>
                <Input
                  type="number"
                  min={0}
                  max={assignSessions}
                  value={assignDeposit}
                  onChange={(e) => setAssignDeposit(Math.max(0, Math.min(assignSessions, Number(e.target.value) || 0)))}
                  className="w-20 h-8"
                />
                <span className="text-muted-foreground">/ {assignSessions}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Warranty years:</span>
                <Input
                  type="number"
                  min={0}
                  value={assignWarranty}
                  onChange={(e) => setAssignWarranty(Math.max(0, Number(e.target.value) || 0))}
                  className="w-20 h-8"
                />
              </div>
              <div className="w-full rounded-md border p-2 flex items-center justify-between">
                <span className="text-muted-foreground">
                  ${Number(selectedPkg.price).toFixed(2)} × {assignSessions} session{assignSessions === 1 ? "" : "s"}
                </span>
                <span className="font-semibold">
                  Total ${(Number(selectedPkg.price) * assignSessions).toFixed(2)}
                </span>
              </div>
              {assignDeposit > 0 && (
                <div className="text-xs text-muted-foreground">
                  Deposit: ${(Number(selectedPkg.price) * assignDeposit).toFixed(2)} · Outstanding: ${(Number(selectedPkg.price) * (assignSessions - assignDeposit)).toFixed(2)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Owned packages</h2>
        {customerPackages.length === 0 && <p className="text-muted-foreground">None yet.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {customerPackages.map((cp: any, idx: number) => {
            const pct = (cp.sessions_remaining / cp.total_sessions) * 100;
            return (
              <Card key={cp.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base gap-2">
                    <Link
                      to="/admin/customers/$id/packages/$cpId"
                      params={{ id, cpId: cp.id }}
                      className="flex items-center gap-2 hover:underline min-w-0"
                    >
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {idx + 1}
                      </span>
                      <span className="truncate">{cp.packages?.name}</span>
                    </Link>
                    <span className="text-sm text-muted-foreground shrink-0">
                      {cp.sessions_remaining}/{cp.total_sessions}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={pct} />
                  {(() => {
                    const draft = depositDrafts[cp.id] ?? cp.deposit_sessions_paid ?? 0;
                    const dirty = draft !== (cp.deposit_sessions_paid ?? 0);
                    const pricePer = cp.packages?.price
                      ? Number(cp.packages.price) / cp.total_sessions
                      : 0;
                    return (
                      <div className="rounded-md border p-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Badge variant={draft > 0 ? "default" : "secondary"}>
                            Deposit: {draft}/{cp.total_sessions} sessions
                          </Badge>
                          {pricePer > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ~${(pricePer * draft).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={cp.total_sessions}
                            value={draft}
                            onChange={(e) => {
                              const v = Math.max(
                                0,
                                Math.min(cp.total_sessions, Number(e.target.value) || 0),
                              );
                              setDepositDrafts((d) => ({ ...d, [cp.id]: v }));
                            }}
                            className="h-8"
                          />
                          <Button
                            size="sm"
                            variant={dirty ? "default" : "ghost"}
                            disabled={!dirty}
                            onClick={() => saveDeposit(cp)}
                          >
                            <Check className="h-3 w-3 mr-1" /> Save
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                  {(cp.warranty_years > 0 || cp.warranty_expires_at) && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>
                        {cp.warranty_years > 0 ? `${cp.warranty_years} yr warranty` : "Warranty"}
                        {cp.warranty_expires_at
                          ? ` · until ${new Date(cp.warranty_expires_at).toLocaleDateString()}`
                          : ""}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      Purchased {new Date(cp.purchase_date).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => openAdd(cp)}>
                        <Plus className="h-3 w-3 mr-1" /> Add sessions
                      </Button>
                      {(() => {
                        const used = (cp.total_sessions ?? 0) - (cp.sessions_remaining ?? 0);
                        const dep = cp.deposit_sessions_paid ?? 0;
                        const depositExhausted = used + 1 > dep;
                        return (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={cp.sessions_remaining === 0 || depositExhausted}
                            title={depositExhausted ? "Deposit exhausted — collect more deposit first" : undefined}
                            onClick={() => openDeduct(cp)}
                          >
                            <MinusCircle className="h-3 w-3 mr-1" /> {depositExhausted ? "Deposit needed" : "Deduct"}
                          </Button>
                        );
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={!!addFor} onOpenChange={(o) => !o && setAddFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add sessions</DialogTitle>
            <DialogDescription>
              {profile?.name ?? profile?.email} · {addFor?.packages?.name}. Extend this package with more
              sessions, deposit, and/or warranty.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Sessions to add</span>
              <Input
                type="number"
                min={1}
                value={addSessions}
                onChange={(e) => setAddSessions(Math.max(1, Number(e.target.value) || 1))}
                className="w-24 h-8"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Extra deposit sessions paid</span>
              <Input
                type="number"
                min={0}
                value={addDeposit}
                onChange={(e) => setAddDeposit(Math.max(0, Number(e.target.value) || 0))}
                className="w-24 h-8"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Extra warranty years</span>
              <Input
                type="number"
                min={0}
                value={addWarranty}
                onChange={(e) => setAddWarranty(Math.max(0, Number(e.target.value) || 0))}
                className="w-24 h-8"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFor(null)}>Cancel</Button>
            <Button onClick={confirmAdd} disabled={adding}>
              {adding ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
