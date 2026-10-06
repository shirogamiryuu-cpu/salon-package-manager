import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@/lib/server-fn";
import { adminListHistory } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { PackageRecordingTable } from "@/components/package-recording-table";
import { formatPurchaseId } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/customers/$id/packages/$cpId")({
  component: AdminPackageDetail,
});

type CP = {
  id: string;
  sessions_remaining: number;
  total_sessions: number;
  deposit_paid: boolean;
  deposit_paid_at: string | null;
  deposit_sessions_paid: number;
  packages: {
    name: string;
    description: string | null;
    price: number;
  } | null;
  profiles: { name: string | null; email: string | null } | null;
};

type HistoryRow = {
  id: string;
  used_at: string;
  customer_package_id: string;
  package_name: string;
  sessions_deducted: number;
  price_applied?: number;
  staff: {
    id?: string;
    name?: string | null;
    full_name?: string | null;
    email?: string | null;
  }[];
  customer_name?: string | null;
  customer_email?: string | null;
};

function AdminPackageDetail() {
  const { id, cpId } = Route.useParams();
  const listHistory = useServerFn(adminListHistory);
  const [cp, setCp] = useState<CP | null>(null);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadCp = async () => {
      const { data, error } = await supabase
        .from("customer_packages")
        .select(
          "id,sessions_remaining,total_sessions,deposit_paid,deposit_paid_at,deposit_sessions_paid,packages(name,description,price),profiles:customer_id(name,email)",
        )
        .eq("id", cpId)
        .maybeSingle();
      if (cancelled) return;
      if (error) toast.error(error.message);
      setCp((data as any) ?? null);
    };
    const loadHistory = () =>
      listHistory({ data: { customerId: id } })
        .then((rows) => {
          if (cancelled) return;
          setHistory((rows as HistoryRow[]).filter((r) => r.customer_package_id === cpId));
        })
        .catch((e) => {
          if (cancelled) return;
          toast.error(e instanceof Error ? e.message : "Failed to load history");
          setHistory([]);
        });

    loadCp();
    loadHistory();

    const channel = supabase
      .channel(`admin-cp-${cpId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "customer_packages", filter: `id=eq.${cpId}` },
        () => {
          loadCp();
          loadHistory();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "usage_logs",
          filter: `customer_package_id=eq.${cpId}`,
        },
        () => {
          loadCp();
          loadHistory();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "session_deduction_requests",
          filter: `customer_package_id=eq.${cpId}`,
        },
        () => {
          loadCp();
          loadHistory();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [id, cpId, listHistory]);

  if (!cp) return <p className="text-muted-foreground">Loading…</p>;

  const price = Number(cp.packages?.price ?? 0);
  const pricePer = cp.total_sessions > 0 ? price / cp.total_sessions : 0;
  const depositSessions = cp.deposit_sessions_paid ?? 0;
  const depositAmount = pricePer * depositSessions;
  const outstanding = Math.max(0, price - depositAmount);
  const used = cp.total_sessions - cp.sessions_remaining;
  const pct = (cp.sessions_remaining / cp.total_sessions) * 100;
  const lastUsed = history && history.length ? history[0].used_at : null;
  const customerLabel = cp.profiles?.name ?? cp.profiles?.email ?? "Customer";

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin/customers/$id" params={{ id }}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to {customerLabel}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <div>
              <span>{cp.packages?.name ?? "Package"}</span>
              <div
                className="font-mono text-xs font-normal text-muted-foreground mt-0.5"
                title={cp.id}
              >
                Purchase ID: {formatPurchaseId(cp.id)}
              </div>
            </div>
            <span className="text-sm font-normal text-muted-foreground">
              {cp.sessions_remaining}/{cp.total_sessions} left
            </span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">{customerLabel}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={pct} />
          <div className="text-xs text-muted-foreground">{used} used</div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Total price</div>
              <div className="text-base font-semibold">MMK {price.toFixed(0)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Deposit paid</div>
              <div className="text-base font-semibold">MMK {depositAmount.toFixed(0)}</div>
              <div className="text-[10px] text-muted-foreground">
                {depositSessions}/{cp.total_sessions} sessions
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Remaining Amount</div>
              <div className="text-base font-semibold">MMK {outstanding.toFixed(0)}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Last session used:</span>
            <span className="font-medium">
              {lastUsed ? new Date(lastUsed).toLocaleString() : "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Package recording</h2>
        {history === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <PackageRecordingTable
            rows={history.map((r) => {
              const staffNames = (r.staff ?? [])
                .map((s: any) =>
                  typeof s === "string" ? s : (s.name ?? s.full_name ?? s.email ?? ""),
                )
                .filter(Boolean);
              return {
                id: r.id,
                purchase_id: r.customer_package_id || cpId,
                used_at: r.used_at,
                service: cp.packages?.name ?? r.package_name ?? "Treatment",
                value: r.price_applied && r.price_applied > 0 ? r.price_applied : pricePer,
                staff: staffNames,
                branch: "YGN",
              };
            })}
            emptyMessage="No sessions recorded yet."
          />
        )}
      </div>
    </div>
  );
}
