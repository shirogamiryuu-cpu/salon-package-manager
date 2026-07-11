import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@/lib/server-fn";
import { customerListPendingRequests, respondSessionRequest } from "@/lib/admin.functions";
import { Check, X, Clock, ChevronRight, Sparkles } from "lucide-react";
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
        .select(
          "id,sessions_remaining,total_sessions,purchase_date,deposit_paid,deposit_sessions_paid,packages(name,description,points_awarded)",
        )
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
    <div className="mx-auto max-w-4xl space-y-10">
      {/* Header */}
      <header className="border-b border-foreground/25 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className="text-xs uppercase text-primary"
              style={{ letterSpacing: "0.28em" }}
            >
              Your collection
            </p>
            <h1
              className="mt-3 font-serif text-4xl md:text-5xl italic"
              style={{ letterSpacing: "0.04em", lineHeight: 1.15 }}
            >
              My packages
            </h1>
          </div>
          <div className="text-right shrink-0">
            <div
              className="text-[10px] uppercase text-foreground/60"
              style={{ letterSpacing: "0.22em" }}
            >
              Points
            </div>
            <div
              className="mt-1 font-serif text-3xl text-primary"
              style={{ letterSpacing: "0.04em" }}
            >
              {points}
            </div>
          </div>
        </div>
      </header>

      {/* Pending */}
      {pending.length > 0 && (
        <section className="space-y-3">
          <h2
            className="text-xs uppercase text-foreground/70"
            style={{ letterSpacing: "0.28em" }}
          >
            Awaiting your approval
          </h2>
          {pending.map((r) => {
            const mins = Math.max(
              0,
              Math.round((new Date(r.expires_at).getTime() - Date.now()) / 60000),
            );
            const staffNames = r.staff
              .map((s) => s.name ?? s.email)
              .filter(Boolean)
              .join(", ");
            return (
              <div
                key={r.id}
                className="border border-primary/60 bg-primary/5 p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-serif text-lg">Approve your session?</div>
                    <div className="mt-1 text-sm text-foreground/70">
                      {r.package_name} · {r.remaining}/{r.total} left
                      {staffNames ? ` · with ${staffNames}` : ""}
                    </div>
                  </div>
                  <div
                    className="text-[10px] uppercase text-foreground/60 flex items-center gap-1 shrink-0"
                    style={{ letterSpacing: "0.18em" }}
                  >
                    <Clock className="h-3 w-3" /> {mins}m
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 uppercase"
                    style={{ letterSpacing: "0.18em" }}
                    disabled={busyId === r.id}
                    onClick={() => decide(r.id, true)}
                  >
                    <Check className="h-4 w-4 mr-2" /> Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 uppercase border-foreground/40"
                    style={{ letterSpacing: "0.18em" }}
                    disabled={busyId === r.id}
                    onClick={() => decide(r.id, false)}
                  >
                    <X className="h-4 w-4 mr-2" /> Decline
                  </Button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Packages list */}
      {loading ? (
        <div className="py-16 text-center text-foreground/60 italic">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="border border-foreground/25 p-12 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-4 font-serif italic text-lg">No packages yet.</p>
          <p className="mt-2 text-sm text-foreground/60">
            Ask the salon to add your first package.
          </p>
          <Button
            asChild
            variant="outline"
            className="mt-6 border-primary text-primary hover:bg-primary hover:text-primary-foreground uppercase"
            style={{ letterSpacing: "0.18em" }}
          >
            <Link to="/app/packages">Browse the menu</Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-foreground/20 border-y border-foreground/25">
          {rows.map((r, index) => {
            const remaining = r.sessions_remaining;
            const total = r.total_sessions;
            const used = total - remaining;
            const pct = total > 0 ? (remaining / total) * 100 : 0;
            return (
              <li key={r.id}>
                <Link
                  to="/app/mine/$id"
                  params={{ id: r.id }}
                  className="group block py-6 transition-colors hover:bg-primary/[0.03]"
                >
                  <div className="flex items-start gap-5">
                    <span
                      className="mt-1 font-serif text-2xl text-foreground/40"
                      style={{ letterSpacing: "0.04em" }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <div className="flex-1 min-w-0 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3
                            className="font-serif text-xl md:text-2xl truncate"
                            style={{ letterSpacing: "0.05em" }}
                          >
                            {r.packages?.name ?? "Package"}
                          </h3>
                          {r.packages?.description && (
                            <p className="mt-1 text-sm text-foreground/60 italic line-clamp-1">
                              {r.packages.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className="text-[10px] uppercase text-foreground/60"
                            style={{ letterSpacing: "0.22em" }}
                          >
                            Left
                          </div>
                          <div
                            className="mt-1 font-serif text-3xl text-primary"
                            style={{ letterSpacing: "0.04em" }}
                          >
                            {remaining}
                            <span className="text-base text-foreground/40">/{total}</span>
                          </div>
                        </div>
                      </div>

                      {/* Hairline progress */}
                      <div className="relative h-px w-full bg-foreground/15">
                        <div
                          className="absolute inset-y-0 left-0 bg-primary"
                          style={{ width: `${pct}%`, height: "1px" }}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span
                          className="text-[10px] uppercase text-foreground/50"
                          style={{ letterSpacing: "0.22em" }}
                        >
                          {used} used · Purchased{" "}
                          {new Date(r.purchase_date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <ChevronRight className="h-4 w-4 text-foreground/40 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
