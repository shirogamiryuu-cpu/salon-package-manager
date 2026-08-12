import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, Check, X, AlertCircle, Ban } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/notifications")({
  component: Notifications,
});

type Row = {
  id: string;
  customer_package_id: string;
  status: "pending" | "approved" | "rejected" | "expired" | "cancelled";
  created_at: string;
  expires_at: string;
  responded_at: string | null;
  manual_price: number | null;
  customer_packages: {
    id: string;
    sessions_remaining: number;
    total_sessions: number;
    packages: { name: string } | null;
  } | null;
};

const META: Record<Row["status"], { label: string; icon: any; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Awaiting your approval", icon: Clock, variant: "default" },
  approved: { label: "Approved", icon: Check, variant: "secondary" },
  rejected: { label: "Rejected", icon: X, variant: "outline" },
  expired: { label: "Expired", icon: AlertCircle, variant: "outline" },
  cancelled: { label: "Cancelled by salon", icon: Ban, variant: "outline" },
};

function Notifications() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase
      .from("session_deduction_requests")
      .select(
        "id,customer_package_id,status,created_at,expires_at,responded_at,manual_price,customer_packages(id,sessions_remaining,total_sessions,packages(name))",
      )
      .eq("customer_id", u.user.id)
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data ?? []) as any);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      channel = supabase
        .channel(`sdr-notifs-${u.user.id}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "session_deduction_requests", filter: `customer_id=eq.${u.user.id}` },
          () => load(),
        )
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5" />
        <h1 className="text-2xl font-semibold">Notifications</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Every approval request from the salon, newest first.
      </p>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No notifications yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const meta = META[r.status] ?? META.pending;
            const Icon = meta.icon;
            const pkgName = r.customer_packages?.packages?.name ?? "Package";
            const remaining = r.customer_packages?.sessions_remaining;
            const total = r.customer_packages?.total_sessions;
            const when = r.responded_at ?? r.created_at;
            const dt = new Date(when);
            return (
              <Card key={r.id} className="transition hover:shadow-sm">
                {r.customer_package_id ? (
                  <Link
                    to="/app/mine/$id"
                    params={{ id: r.customer_package_id }}
                    className="block focus:outline-none focus:ring-2 focus:ring-ring rounded-xl"
                  >
                    <NotifBody meta={meta} Icon={Icon} pkgName={pkgName} remaining={remaining} total={total} dt={dt} createdAt={new Date(r.created_at)} status={r.status} manualPrice={r.manual_price} />
                  </Link>
                ) : (
                  <NotifBody meta={meta} Icon={Icon} pkgName={pkgName} remaining={remaining} total={total} dt={dt} createdAt={new Date(r.created_at)} status={r.status} manualPrice={r.manual_price} />
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NotifBody({
  meta,
  Icon,
  pkgName,
  remaining,
  total,
  dt,
  createdAt,
  status,
  manualPrice,
}: {
  meta: { label: string; variant: "default" | "secondary" | "outline" | "destructive" };
  Icon: any;
  pkgName: string;
  remaining?: number;
  total?: number;
  dt: Date;
  createdAt: Date;
  status: Row["status"];
  manualPrice?: number | null;
}) {
  return (
    <CardContent className="p-4 flex items-start gap-3">
      <div className="mt-0.5 rounded-full bg-muted p-2">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="font-medium truncate">{pkgName}</div>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>
        <div className="text-sm text-muted-foreground truncate">
          Session deduction request
          {typeof remaining === "number" && typeof total === "number" ? ` · ${remaining}/${total} left` : ""}
        </div>
        {typeof manualPrice === "number" && (
          <div className="text-sm font-medium mt-1">
            Charge: MMK {manualPrice.toFixed(0)}
          </div>
        )}
        <div className="text-xs text-muted-foreground mt-1">
          {status === "pending" ? "Requested" : "Updated"} {dt.toLocaleString()}
          {status !== "pending" && dt.getTime() !== createdAt.getTime()
            ? ` · requested ${createdAt.toLocaleString()}`
            : ""}
        </div>
      </div>
    </CardContent>
  );
}
