import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@/lib/server-fn";
import { adminListHistory } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarClock, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute(
  "/_authenticated/admin/customers/$id/packages/$cpId",
)({
  component: AdminPackageDetail,
});

type CP = {
  id: string;
  sessions_remaining: number;
  total_sessions: number;
  purchase_date: string;
  deposit_paid: boolean;
  deposit_paid_at: string | null;
  deposit_sessions_paid: number;
  deposit_amount: number;
  total_price: number;
  warranty_years: number;
  warranty_expires_at: string | null;
  packages: {
    name: string;
    description: string | null;
    price: number;
    points_awarded: number;
  } | null;
  profiles: { name: string | null; email: string | null } | null;
};

type HistoryRow = {
  id: string;
  used_at: string;
  customer_package_id: string;
  package_name: string;
  sessions_deducted: number;
  staff: string[];
  customer_name?: string | null;
  customer_email?: string | null;
};

function AdminPackageDetail() {
  const { id, cpId } = Route.useParams();
  const listHistory = useServerFn(adminListHistory);
  const [cp, setCp] = useState<CP | null>(null);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("customer_packages")
        .select(
          "id,sessions_remaining,total_sessions,purchase_date,deposit_paid,deposit_paid_at,deposit_sessions_paid,deposit_amount,total_price,warranty_years,warranty_expires_at,packages(name,description,price,points_awarded),profiles:customer_id(name,email)",
        )
        .eq("id", cpId)
        .maybeSingle();
      if (error) toast.error(error.message);
      setCp((data as any) ?? null);
    })();
    listHistory({ data: { customerId: id } })
      .then((rows) =>
        setHistory(
          (rows as HistoryRow[]).filter((r) => r.customer_package_id === cpId),
        ),
      )
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Failed to load history");
        setHistory([]);
      });
  }, [id, cpId, listHistory]);

  if (!cp) return <p className="text-muted-foreground">Loading…</p>;

  const totalPrice = Number(cp.total_price ?? 0) || Number(cp.packages?.price ?? 0);
  const depositAmount = Number(cp.deposit_amount ?? 0);
  const outstanding = Math.max(0, totalPrice - depositAmount);
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
            <span>{cp.packages?.name ?? "Package"}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {cp.sessions_remaining}/{cp.total_sessions} left
            </span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">{customerLabel}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {cp.packages?.description && (
            <p className="text-sm text-muted-foreground">{cp.packages.description}</p>
          )}
          <Progress value={pct} />
          <div className="text-xs text-muted-foreground">
            {used} used · Purchased {new Date(cp.purchase_date).toLocaleDateString()}
          </div>
          {(cp.warranty_years > 0 || cp.warranty_expires_at) && (
            <div className="text-xs text-muted-foreground">
              🛡️ {cp.warranty_years > 0 ? `${cp.warranty_years} year warranty` : "Warranty"}
              {cp.warranty_expires_at
                ? ` · valid until ${new Date(cp.warranty_expires_at).toLocaleDateString()}`
                : ""}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Total price</div>
              <div className="text-base font-semibold">${price.toFixed(2)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Deposit paid</div>
              <div className="text-base font-semibold">${depositAmount.toFixed(2)}</div>
              <div className="text-[10px] text-muted-foreground">
                {depositSessions}/{cp.total_sessions} sessions
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Outstanding</div>
              <div className="text-base font-semibold">${outstanding.toFixed(2)}</div>
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
        <h2 className="text-lg font-semibold mb-2">Session history</h2>
        {history === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : history.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No sessions used yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {history.map((r, idx) => (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                        {history.length - idx}
                      </span>
                      {new Date(r.used_at).toLocaleString()}
                    </div>
                    <Badge variant="outline">−{r.sessions_deducted} session</Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    Staff attended: {r.staff.length ? r.staff.join(", ") : "—"}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
