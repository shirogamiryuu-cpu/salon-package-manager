import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@/lib/server-fn";
import {
  adminAddSessions,
  adminDeleteCustomer,
  adminGetCustomer,
  adminListStaff,
  assignPackage,
  addDepositAmount,
  deleteCustomerPackage,
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPurchaseId } from "@/lib/utils";

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
import { ArrowLeft, Coins, MinusCircle, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  applyPromotion,
  fetchActivePromoMap,
  formatDiscountLabel,
  type Promotion,
} from "@/lib/promotions";

export const Route = createFileRoute("/_authenticated/admin/customers/$id/")({
  component: CustomerDetail,
});

type StaffOpt = {
  id: string;
  email: string | null;
  name: string | null;
  category: "staff" | "stylist" | null;
};

function CustomerDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const get = useServerFn(adminGetCustomer);
  const assign = useServerFn(assignPackage);
  const deductSessionFn = useServerFn(useSession);
  const listStaff = useServerFn(adminListStaff);
  const addDepositFn = useServerFn(addDepositAmount);
  const addSessionsFn = useServerFn(adminAddSessions);
  const deleteCpFn = useServerFn(deleteCustomerPackage);
  const deleteCustomerFn = useServerFn(adminDeleteCustomer);

  const [data, setData] = useState<any>(null);
  const [packages, setPackages] = useState<
    {
      id: string;
      name: string;
      total_sessions: number;
      price: number;
      category_id: string | null;
    }[]
  >([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [pkgSearch, setPkgSearch] = useState<string>("");
  const [pkgCategoryFilter, setPkgCategoryFilter] = useState<string>("all");
  const [promoMap, setPromoMap] = useState<Map<string, Promotion>>(new Map());
  const [pickId, setPickId] = useState<string>("");
  const [assignSessions, setAssignSessions] = useState<string>("1");
  const [assignDepositAmount, setAssignDepositAmount] = useState<string>("");
  const [assignManualPrice, setAssignManualPrice] = useState<string>("");
  const [assignSoldBy, setAssignSoldBy] = useState<Set<string>>(new Set());
  const [staffOpts, setStaffOpts] = useState<StaffOpt[]>([]);
  const [depositFor, setDepositFor] = useState<any | null>(null);
  const [depositAmountInput, setDepositAmountInput] = useState<string>("");
  const [savingDeposit, setSavingDeposit] = useState(false);

  const [deductFor, setDeductFor] = useState<any | null>(null);
  const [deductManualPrice, setDeductManualPrice] = useState<string>("");
  const [deductSkipApproval, setDeductSkipApproval] = useState(false);

  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
  const [deducting, setDeducting] = useState(false);

  const [addFor, setAddFor] = useState<any | null>(null);
  const [addSessions, setAddSessions] = useState<string>("1");
  const [addDeposit, setAddDeposit] = useState<string>("");
  const [addManualPrice, setAddManualPrice] = useState<string>("");
  const [adding, setAdding] = useState(false);

  const refresh = useCallback(async () => {
    const [d, staffList] = await Promise.all([get({ data: { id } }), listStaff()]);
    setData(d);
    setStaffOpts(staffList as StaffOpt[]);
  }, [get, id, listStaff]);

  useEffect(() => {
    refresh();
    (async () => {
      const [{ data }, { data: cats }] = await Promise.all([
        supabase
          .from("packages")
          .select("id,name,total_sessions,price,category_id")
          .eq("is_active", true),
        supabase
          .from("package_categories")
          .select("id,name")
          .order("sort_order", { ascending: true }),
      ]);
      const list = (data ?? []) as any[];
      setPackages(list);
      setCategories((cats ?? []) as any[]);
      setPromoMap(await fetchActivePromoMap(list.map((p) => p.id)));
    })();
  }, [refresh]);

  const selectedPkg = packages.find((p) => p.id === pickId);
  const selectedPromo = selectedPkg ? promoMap.get(selectedPkg.id) : undefined;
  const basePrice = selectedPkg ? Number(selectedPkg.price) : 0;
  const selectedPricing =
    selectedPkg && selectedPromo ? applyPromotion(basePrice, selectedPromo) : null;
  const selectedUnit = selectedPricing ? selectedPricing.final : basePrice;

  const effectiveAssignSessions = Math.max(1, Number(assignSessions) || 1);
  const computedTotal = selectedUnit * effectiveAssignSessions;
  const manualTotalNum = assignManualPrice === "" ? null : Number(assignManualPrice);
  const manualTotalValid =
    manualTotalNum != null && Number.isFinite(manualTotalNum) && manualTotalNum >= 0;
  const totalAmount = manualTotalValid ? manualTotalNum! : computedTotal;
  const assignDepositNum =
    assignDepositAmount === ""
      ? 0
      : Math.max(0, Math.min(totalAmount, Number(assignDepositAmount) || 0));
  const outstandingAmount = Math.max(0, totalAmount - assignDepositNum);
  const depositSessionsEq =
    selectedUnit > 0
      ? Math.max(0, Math.min(effectiveAssignSessions, Math.round(assignDepositNum / selectedUnit)))
      : 0;

  const doAssign = async () => {
    if (!pickId) return;
    try {
      const res: any = await assign({
        data: {
          customerId: id,
          packageId: pickId,
          sessions: effectiveAssignSessions,
          depositAmount: assignDepositNum,
          totalPrice: totalAmount,
          soldByStaffIds: [...assignSoldBy],
        },
      });
      toast.success(res?.merged ? "Added to existing package" : "Package assigned");
      setPickId("");
      setAssignSessions("1");
      setAssignDepositAmount("");
      setAssignManualPrice("");
      setAssignSoldBy(new Set());
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const doDelete = async (cpId: string) => {
    try {
      await deleteCpFn({ data: { customerPackageId: cpId } });
      toast.success("Package removed");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const openAdd = (cp: any) => {
    setAddSessions("1");
    setAddDeposit("");
    setAddManualPrice("");
    setAddFor(cp);
  };

  const confirmAdd = async () => {
    if (!addFor) return;
    setAdding(true);
    try {
      const unit =
        addFor.total_sessions > 0 ? Number(addFor.total_price ?? 0) / addFor.total_sessions : 0;
      const manualNum = addManualPrice === "" ? null : Number(addManualPrice);
      const manualValid = manualNum != null && Number.isFinite(manualNum) && manualNum >= 0;
      const addDepositNum = addDeposit === "" ? 0 : Math.max(0, Number(addDeposit) || 0);
      const effectiveAddSessions = Math.max(1, Number(addSessions) || 1);
      const addedPrice = manualValid
        ? Math.round(manualNum! * 100) / 100
        : Math.round(unit * effectiveAddSessions * 100) / 100;
      await addSessionsFn({
        data: {
          customerPackageId: addFor.id,
          sessions: effectiveAddSessions,
          depositAmount: addDepositNum,
          addedPrice,
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

  const openDeposit = (cp: any) => {
    const totalPrice = Number(cp.total_price ?? 0);
    const deposited = Number(cp.deposit_amount ?? 0);
    const outstanding = Math.max(0, totalPrice - deposited);
    setDepositAmountInput(outstanding > 0 ? String(outstanding) : "");
    setDepositFor(cp);
  };

  const confirmDeposit = async () => {
    if (!depositFor) return;
    const amount = Number(depositAmountInput) || 0;
    if (amount <= 0) {
      toast.error("Please enter a valid deposit amount");
      return;
    }
    setSavingDeposit(true);
    try {
      await addDepositFn({ data: { customerPackageId: depositFor.id, amount } });
      toast.success(`Added MMK ${amount.toLocaleString()} deposit`);
      setDepositFor(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingDeposit(false);
    }
  };

  const openDeduct = (cp: any) => {
    setSelectedStaff(new Set());
    setDeductManualPrice("");
    setDeductSkipApproval(false);
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
    let manualPrice: number | null = null;
    if (deductManualPrice !== "") {
      const n = Number(deductManualPrice);
      if (!Number.isFinite(n) || n < 0) {
        toast.error("Custom price must be a non-negative number");
        return;
      }
      manualPrice = Math.round(n * 100) / 100;
    }
    setDeducting(true);
    try {
      await deductSessionFn({
        data: {
          customerPackageId: deductFor.id,
          staffIds: Array.from(selectedStaff),
          manualPrice,
          skipApproval: deductSkipApproval,
        },
      });
      toast.success(
        deductSkipApproval
          ? "Session deducted (admin approved)"
          : "Approval request sent to customer (expires in 15 min)",
      );
      setDeductFor(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeducting(false);
    }
  };

  const doDeleteCustomer = async () => {
    try {
      await deleteCustomerFn({ data: { customerId: id } });
      toast.success("Customer deleted");
      navigate({ to: "/admin/customers" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (!data) return <p className="text-muted-foreground">Loading...</p>;
  const { profile, customerPackages } = data;

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
            {profile?.name ? `${profile?.email} · ` : ""}
            {profile?.phone ?? "No phone"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive">
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this customer?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes {profile?.name ?? profile?.email}, their packages,
                  session history and login. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={doDeleteCustomer}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Assign a package</CardTitle>
          <p className="text-xs text-muted-foreground">
            Select a package or treatment to credit to this customer.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1 — pick the package */}
          {(() => {
            const q = pkgSearch.trim().toLowerCase();
            const filtered = packages.filter((p) => {
              if (pkgCategoryFilter === "none" && p.category_id) return false;
              if (
                pkgCategoryFilter !== "all" &&
                pkgCategoryFilter !== "none" &&
                p.category_id !== pkgCategoryFilter
              )
                return false;
              if (q && !p.name.toLowerCase().includes(q)) return false;
              return true;
            });
            return (
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    type="search"
                    placeholder="Search packages…"
                    value={pkgSearch}
                    onChange={(e) => setPkgSearch(e.target.value)}
                    className="h-9"
                  />
                  {categories.length > 0 && (
                    <Select value={pkgCategoryFilter} onValueChange={setPkgCategoryFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        <SelectItem value="none">Uncategorised</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <Select
                  value={pickId}
                  onValueChange={(v) => {
                    setPickId(v);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue
                      placeholder={
                        filtered.length === 0 ? "No packages match" : "Choose a package…"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {filtered.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No packages match your filter.
                      </div>
                    ) : (
                      filtered.map((p) => {
                        const promo = promoMap.get(p.id);
                        const pr = promo
                          ? applyPromotion(Number(p.price), promo).final
                          : Number(p.price);
                        return (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="font-medium">{p.name}</span>
                            <span className="text-muted-foreground text-xs ml-2">
                              — MMK {pr.toLocaleString()} ({p.total_sessions} sess)
                            </span>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
            );
          })()}

          {selectedPkg && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                <div className="space-y-0.5">
                  <div className="font-semibold text-sm">{selectedPkg.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Base rate: MMK {selectedUnit.toLocaleString()} / session ·{" "}
                    {selectedPkg.total_sessions} sessions base
                    {selectedPromo && (
                      <span className="ml-1 text-primary font-medium">
                        ({formatDiscountLabel(selectedPromo)} · {selectedPromo.name})
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPickId("")}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              </div>

              {/* Essentials 3-col grid */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Sessions</label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="1"
                    value={assignSessions}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        setAssignSessions("");
                        return;
                      }
                      const val = parseInt(raw, 10);
                      if (isNaN(val)) setAssignSessions("");
                      else setAssignSessions(String(Math.max(1, val)));
                    }}
                    onBlur={() => {
                      if (!assignSessions || Number(assignSessions) < 1) {
                        setAssignSessions("1");
                      }
                    }}
                    className="h-9"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Sessions to credit to customer
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Total Price (MMK)</label>
                  <Input
                    type="number"
                    min={0}
                    step="1000"
                    placeholder={
                      computedTotal > 0 ? `auto MMK ${computedTotal.toLocaleString()}` : "0"
                    }
                    value={assignManualPrice}
                    onChange={(e) => setAssignManualPrice(e.target.value)}
                    className="h-9"
                  />
                  <p className="text-[11px] text-muted-foreground truncate">
                    {manualTotalValid ? (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        Manual override
                      </span>
                    ) : (
                      `Auto: MMK ${computedTotal.toLocaleString()}`
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Deposit Paid (MMK)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step="1000"
                    max={totalAmount || undefined}
                    placeholder="0"
                    value={assignDepositAmount}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") return setAssignDepositAmount("");
                      const n = Math.max(0, Math.min(totalAmount, Number(raw) || 0));
                      setAssignDepositAmount(String(n));
                    }}
                    className="h-9"
                  />
                  <div className="flex items-center gap-2 pt-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setAssignDepositAmount(String(totalAmount))}
                      className="text-primary hover:underline font-medium"
                    >
                      Full payment
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button
                      type="button"
                      onClick={() => setAssignDepositAmount("0")}
                      className="text-muted-foreground hover:underline"
                    >
                      No deposit (0)
                    </button>
                  </div>
                </div>
              </div>

              {/* Sold by */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Sold by{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    (Staff / Stylists who made the sale)
                  </span>
                </label>
                {staffOpts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No staff members yet.</p>
                ) : (
                  <div className="space-y-2">
                    <Select
                      value=""
                      onValueChange={(id) => setAssignSoldBy((prev) => new Set(prev).add(id))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Add staff member…" />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const groups: Record<string, StaffOpt[]> = {};
                          for (const s of staffOpts) {
                            if (assignSoldBy.has(s.id)) continue;
                            const key = s.category ?? "staff";
                            (groups[key] ??= []).push(s);
                          }
                          const order = ["stylist", "staff"];
                          const sorted = Object.entries(groups).sort(
                            (a, b) => order.indexOf(a[0]) - order.indexOf(b[0]),
                          );
                          if (sorted.length === 0)
                            return (
                              <div className="px-2 py-2 text-sm text-muted-foreground">
                                Everyone selected
                              </div>
                            );
                          return sorted.map(([category, members]) => (
                            <SelectGroup key={category}>
                              <SelectLabel>
                                {category === "stylist" ? "Stylists" : "Staff"}
                              </SelectLabel>
                              {members.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name ?? s.email}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ));
                        })()}
                      </SelectContent>
                    </Select>

                    {assignSoldBy.size > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {[...assignSoldBy].map((id) => {
                          const s = staffOpts.find((o) => o.id === id);
                          return (
                            <Badge key={id} variant="secondary" className="gap-1 text-xs">
                              {s?.name ?? s?.email ?? "Staff"}
                              <button
                                type="button"
                                aria-label="Remove"
                                onClick={() =>
                                  setAssignSoldBy((prev) => {
                                    const next = new Set(prev);
                                    next.delete(id);
                                    return next;
                                  })
                                }
                                className="ml-0.5 opacity-60 hover:opacity-100"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Summary and assign button */}
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3 flex-wrap">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold">
                    Total: MMK {totalAmount.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Deposit: MMK {assignDepositNum.toLocaleString()} · Remaining due: MMK{" "}
                    {outstandingAmount.toLocaleString()}
                  </div>
                </div>
                <Button onClick={doAssign} className="h-9">
                  Assign Package
                </Button>
              </div>
            </div>
          )}

          {!selectedPkg && (
            <p className="text-xs text-muted-foreground">
              Please choose a package above to configure sessions, pricing, and staff.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Owned packages</h2>
          <span className="text-xs text-muted-foreground">
            {customerPackages.length} package{customerPackages.length === 1 ? "" : "s"}
          </span>
        </div>
        {customerPackages.length === 0 && (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No packages owned by this customer yet. Assign one above.
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {[...customerPackages]
            .sort((a: any, b: any) => {
              const aZero = (a.sessions_remaining ?? 0) === 0 ? 1 : 0;
              const bZero = (b.sessions_remaining ?? 0) === 0 ? 1 : 0;
              return aZero - bZero;
            })
            .map((cp: any) => {
              const pct = (cp.sessions_remaining / cp.total_sessions) * 100;
              const depleted = (cp.sessions_remaining ?? 0) === 0;
              const used = (cp.total_sessions ?? 0) - (cp.sessions_remaining ?? 0);
              const totalPrice = Number(cp.total_price ?? 0);
              const deposited = Number(cp.deposit_amount ?? 0);
              const outstanding = Math.max(0, totalPrice - deposited);
              const unit = cp.total_sessions > 0 ? totalPrice / cp.total_sessions : 0;
              const needed = unit * (used + 1);
              const depositExhausted = deposited + 0.005 < needed;

              return (
                <Card
                  key={cp.id}
                  className={
                    depleted
                      ? "opacity-60 bg-muted/15 border-dashed"
                      : "shadow-xs border-border/80 hover:border-primary/40 transition-colors"
                  }
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Title & Purchase ID */}
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to="/admin/customers/$id/packages/$cpId"
                            params={{ id, cpId: cp.id }}
                            className="text-base font-semibold hover:underline truncate"
                          >
                            {cp.packages?.name ?? "Package"}
                          </Link>
                          {depleted && (
                            <Badge variant="secondary" className="text-xs">
                              Completed
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                          <span
                            className="font-mono bg-muted/70 px-2 py-0.5 rounded text-[11px] font-medium"
                            title={cp.id}
                          >
                            Purchase ID: {formatPurchaseId(cp.id)}
                          </span>
                          {Array.isArray(cp.sold_by_staff_ids) &&
                            cp.sold_by_staff_ids.length > 0 && (
                              <span>
                                · Sold by:{" "}
                                {cp.sold_by_staff_ids
                                  .map((sid: string) => {
                                    const s = staffOpts.find((o) => o.id === sid);
                                    return s?.name ?? s?.email ?? "Staff";
                                  })
                                  .join(", ")}
                              </span>
                            )}
                        </div>
                      </div>

                      {/* Right: Prominent High-Contrast Session Counter */}
                      <div className="text-right shrink-0">
                        <div
                          className={
                            depleted
                              ? "inline-flex items-baseline gap-1 rounded-lg bg-muted px-3 py-1.5 text-muted-foreground border"
                              : "inline-flex items-baseline gap-1.5 rounded-lg bg-primary/10 px-3.5 py-1.5 text-primary border border-primary/20"
                          }
                        >
                          <span className="text-2xl font-bold leading-none tracking-tight">
                            {cp.sessions_remaining}
                          </span>
                          <span className="text-xs font-semibold leading-none opacity-80">
                            / {cp.total_sessions} {cp.total_sessions === 1 ? "session" : "sessions"}{" "}
                            left
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3.5 pt-0">
                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Session progress</span>
                        <span>
                          {used} of {cp.total_sessions} used
                        </span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>

                    {/* Financial status bar */}
                    <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Deposit Paid: </span>
                        <span className="font-semibold text-foreground">
                          MMK {deposited.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          / MMK {totalPrice.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        {outstanding > 0 ? (
                          <Badge
                            variant="outline"
                            className="border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-medium"
                          >
                            Remaining: MMK {outstanding.toLocaleString()}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium"
                          >
                            ✓ Fully Paid
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t">
                      {/* Primary actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          disabled={depleted || depositExhausted}
                          onClick={() => openDeduct(cp)}
                          title={
                            depositExhausted
                              ? "Deposit exhausted — record payment first"
                              : undefined
                          }
                          className="gap-1.5 font-medium"
                        >
                          <MinusCircle className="h-4 w-4" />
                          {depositExhausted ? "Deposit needed" : "Deduct session"}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAdd(cp)}
                          className="gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add sessions
                        </Button>

                        {outstanding > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDeposit(cp)}
                            className="gap-1.5"
                          >
                            <Coins className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /> Add
                            deposit
                          </Button>
                        )}
                      </div>

                      {/* Secondary actions */}
                      <div className="flex items-center gap-1 ml-auto">
                        <Button
                          size="sm"
                          variant="ghost"
                          asChild
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Link
                            to="/admin/customers/$id/packages/$cpId"
                            params={{ id, cpId: cp.id }}
                          >
                            History
                          </Link>
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                              title="Delete package"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this package?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Removes {cp.packages?.name} (Purchase ID: {formatPurchaseId(cp.id)})
                                from this customer along with its session history. This cannot be
                                undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => doDelete(cp.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
              {profile?.name ?? profile?.email} · {addFor?.packages?.name} (Purchase ID:{" "}
              {formatPurchaseId(addFor?.id)}). Extend this package with more sessions and/or
              deposit.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Sessions to add</span>
              <Input
                type="number"
                min={1}
                placeholder="1"
                value={addSessions}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    setAddSessions("");
                    return;
                  }
                  const val = parseInt(raw, 10);
                  if (isNaN(val)) setAddSessions("");
                  else setAddSessions(String(Math.max(1, val)));
                }}
                onBlur={() => {
                  if (!addSessions || Number(addSessions) < 1) {
                    setAddSessions("1");
                  }
                }}
                className="w-24 h-8"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Extra deposit (MMK)</span>
              <Input
                type="number"
                min={0}
                step="1000"
                value={addDeposit}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") return setAddDeposit("");
                  setAddDeposit(String(Math.max(0, Number(raw) || 0)));
                }}
                className="w-24 h-8"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Manual added price (MMK)</span>
              <Input
                type="number"
                min={0}
                step="1000"
                placeholder={
                  addFor && addFor.total_sessions > 0
                    ? `auto ${((Number(addFor.total_price ?? 0) / addFor.total_sessions) * (Number(addSessions) || 1)).toFixed(0)}`
                    : "auto"
                }
                value={addManualPrice}
                onChange={(e) => setAddManualPrice(e.target.value)}
                className="w-32 h-8"
                title="Leave blank to charge the normal per-session rate."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFor(null)}>
              Cancel
            </Button>
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
              {profile?.name ?? profile?.email} · {deductFor?.packages?.name} (Purchase ID:{" "}
              {formatPurchaseId(deductFor?.id)})
            </DialogDescription>
          </DialogHeader>
          {(() => {
            if (!deductFor) return null;
            return (
              <div className="py-2 space-y-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    Custom price for this session (optional, MMK)
                  </div>
                  <Input
                    type="number"
                    min={0}
                    step="1000"
                    placeholder="auto"
                    value={deductManualPrice}
                    onChange={(e) => setDeductManualPrice(e.target.value)}
                    className="h-9"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Leave blank to charge the normal rate.
                  </p>
                </div>
                <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                  <Checkbox
                    checked={deductSkipApproval}
                    onCheckedChange={(v) => setDeductSkipApproval(v === true)}
                  />
                  <span className="text-sm">
                    Deduct now without customer approval
                    <span className="block text-[11px] text-muted-foreground">
                      Use only when the customer has no phone or app. Recorded as admin approved.
                    </span>
                  </span>
                </label>
                <div className="text-xs text-muted-foreground">
                  Select the staff who performed the service (optional).
                </div>

                <div className="space-y-3 max-h-56 overflow-y-auto">
                  {staffOpts.length === 0 && (
                    <p className="text-sm text-muted-foreground">No staff members yet.</p>
                  )}
                  {(() => {
                    const groups: Record<string, StaffOpt[]> = {};
                    for (const s of staffOpts) {
                      const key = s.category ?? "staff";
                      (groups[key] ??= []).push(s);
                    }
                    const order = ["stylist", "staff"];
                    const sorted = Object.entries(groups).sort(
                      (a, b) => order.indexOf(a[0]) - order.indexOf(b[0]),
                    );
                    return sorted.map(([category, members]) => (
                      <div key={category} className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {category === "stylist" ? "Stylists" : "Staff"}
                        </p>
                        <div className="space-y-2">
                          {members.map((s) => (
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
                      </div>
                    ));
                  })()}
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeductFor(null)}>
              Cancel
            </Button>
            <Button onClick={confirmDeduct} disabled={deducting}>
              {deducting ? "Deducting..." : deductSkipApproval ? "Deduct now" : "Request approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!depositFor} onOpenChange={(o) => !o && setDepositFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add deposit</DialogTitle>
            <DialogDescription>
              {profile?.name ?? profile?.email} · {depositFor?.packages?.name} (Purchase ID:{" "}
              {formatPurchaseId(depositFor?.id)})
            </DialogDescription>
          </DialogHeader>
          {depositFor &&
            (() => {
              const totalPrice = Number(depositFor.total_price ?? 0);
              const deposited = Number(depositFor.deposit_amount ?? 0);
              const outstanding = Math.max(0, totalPrice - deposited);
              return (
                <div className="py-2 space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 bg-muted/30">
                    <div>
                      <span className="text-xs text-muted-foreground block">Already Paid</span>
                      <span className="font-semibold text-foreground">
                        MMK {deposited.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block">Remaining Amount</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        MMK {outstanding.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Deposit amount to add (MMK)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      step="1000"
                      placeholder={`e.g. ${outstanding}`}
                      value={depositAmountInput}
                      onChange={(e) => setDepositAmountInput(e.target.value)}
                      className="h-9"
                    />
                    {outstanding > 0 && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setDepositAmountInput(String(outstanding))}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Pay full remaining amount (MMK {outstanding.toLocaleString()})
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepositFor(null)}>
              Cancel
            </Button>
            <Button onClick={confirmDeposit} disabled={savingDeposit || !depositAmountInput}>
              {savingDeposit ? "Saving..." : "Add deposit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
