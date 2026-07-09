import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@/lib/server-fn";
import { customerListPendingRequests, respondSessionRequest } from "@/lib/admin.functions";
import { Check, X, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/")({
  component: MyPackages,
});

type Row = {
  id: string;
  sessions_remaining: number;
  total_sessions: number;
  purchase_date: string;
  deposit_paid: boolean;
  deposit_sessions_paid: number;
  deposit_amount: number;
  total_price: number;
  packages: { name: string; description: string | null; points_awarded: number } | null;
};

type PendingReq = {
  id: string;
  created_at: string;
  expires_at: string;
  package_name: string;
  remaining: number;
  total: number;
  staff: { name: string | null; email: string | null }[];
};

function MyPackages() {
  const [rows, setRows] = useState<Row[]>([]);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingReq[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const listPending = useServerFn(customerListPendingRequests);
  const respond = useServerFn(respondSessionRequest);

  const loadPending = useCallback(async () => {
    try {
      const d = await listPending();
      setPending((d as PendingReq[]) ?? []);
    } catch {
      setPending([]);
    }
  }, [listPending]);

  const loadPackages = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const [{ data: cp }, { data: p }] = await Promise.all([
      supabase
        .from("customer_packages")
        .select("id,sessions_remaining,total_sessions,purchase_date,deposit_paid,deposit_sessions_paid,packages(name,description,points_awarded)")
        .eq("customer_id", u.user.id)
        .order("purchase_date", { ascending: false }),
      supabase.from("profiles").select("points").eq("id", u.user.id).maybeSingle(),
    ]);
    setRows((cp ?? []) as any);
    setPoints(p?.points ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPackages();
    loadPending();
    const t = setInterval(loadPending, 15000);

    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      channel = supabase
        .channel(`sdr-customer-${u.user.id}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "session_deduction_requests",
            filter: `customer_id=eq.${u.user.id}`,
          },
          () => {
            toast.info("New session approval request from the salon", {
              description: "Review and approve or reject below.",
            });
            loadPending();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "session_deduction_requests",
            filter: `customer_id=eq.${u.user.id}`,
          },
          (payload: any) => {
            const oldStatus = payload.old?.status;
            const newStatus = payload.new?.status;
            if (oldStatus === "pending" && newStatus !== "pending") {
              if (newStatus === "approved") toast.success("Session approved");
              else if (newStatus === "rejected") toast("Request rejected");
              else if (newStatus === "expired") toast.warning("Request expired");
              else if (newStatus === "cancelled") toast("Request cancelled by salon");
              loadPending();
              loadPackages();
            }
          },
        )
        .subscribe();
    })();

    return () => {
      clearInterval(t);
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadPackages, loadPending]);


  const decide = async (id: string, approve: boolean) => {
    setBusyId(id);
    try {
      await respond({ data: { requestId: id, approve } });
      toast.success(approve ? "Session approved" : "Request rejected");
      await Promise.all([loadPending(), loadPackages()]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My packages</h1>
        <Badge variant="secondary" className="text-sm">⭐ {points} points</Badge>
      </div>

      {pending.length > 0 && (
        <div className="space-y-2">
          {pending.map((r) => {
            const mins = Math.max(0, Math.round((new Date(r.expires_at).getTime() - Date.now()) / 60000));
            const staffNames = r.staff.map((s) => s.name ?? s.email).filter(Boolean).join(", ");
            return (
              <Card key={r.id} className="border-primary/40 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">Approve session deduction?</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {r.package_name} · {r.remaining}/{r.total} left
                        {staffNames ? ` · with ${staffNames}` : ""}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                      <Clock className="h-3 w-3" /> {mins}m left
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" disabled={busyId === r.id} onClick={() => decide(r.id, true)}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" disabled={busyId === r.id} onClick={() => decide(r.id, false)}>
                      <X className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No packages yet. Ask the salon to assign one!</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((r) => {
            const used = r.total_sessions - r.sessions_remaining;
            const pct = (r.sessions_remaining / r.total_sessions) * 100;
            return (
              <Card key={r.id} className="transition hover:shadow-md">
                <Link
                  to="/app/mine/$id"
                  params={{ id: r.id }}
                  className="block focus:outline-none focus:ring-2 focus:ring-ring rounded-xl"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{r.packages?.name ?? "Package"}</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {r.sessions_remaining}/{r.total_sessions} left
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {r.packages?.description && <p className="text-sm text-muted-foreground">{r.packages.description}</p>}
                    <Progress value={pct} />
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={r.deposit_sessions_paid > 0 ? "default" : "secondary"}>
                        Deposit {r.deposit_sessions_paid}/{r.total_sessions} paid
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {used} used · {new Date(r.purchase_date).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
