import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@/lib/server-fn";
import {
  customerListMyHistory,
  customerListPendingRequests,
  respondSessionRequest,
} from "@/lib/admin.functions";
import { AppShell, type NavItem } from "@/components/app-shell";
import {
  Home as HomeIcon,
  History,
  Package,
  ShoppingBag,
  Sparkles,
  Bell,
  User,
  Check,
  X,
  Clock,
} from "lucide-react";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/home")({
  component: Home,
});

type Profile = {
  name: string | null;
  email: string | null;
};

type CustomerPackage = {
  id: string;
  purchase_date: string;
  sessions_remaining: number;
  total_sessions: number;
  warranty_expires_at: string | null;
  package_name: string | null;
  package_description: string | null;
  packages: {
    name: string;
    description: string | null;
    price: number;
  } | null;
};

type HistoryRow = {
  id: string;
  used_at: string;
  customer_package_id: string;
  package_name: string;
  sessions_deducted: number;
  staff: string[];
};

type PendingReq = {
  id: string;
  created_at: string;
  expires_at: string;
  package_name: string;
  remaining: number;
  total: number;
  staff: {
    name: string | null;
    email: string | null;
  }[];
};

const customerNav: NavItem[] = [
  { to: "/home", label: "Home", icon: HomeIcon },
  { to: "/app", label: "My packages", icon: Sparkles },
  { to: "/app/notifications", label: "Notifications", icon: Bell },
  { to: "/app/history", label: "History", icon: History },
  { to: "/app/packages", label: "Available", icon: ShoppingBag },
  { to: "/app/profile", label: "Profile", icon: User },
];

function Home() {
  const historyFn = useServerFn(customerListMyHistory);
  const listPending = useServerFn(customerListPendingRequests);
  const respond = useServerFn(respondSessionRequest);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pkg, setPkg] = useState<CustomerPackage | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [pending, setPending] = useState<PendingReq[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Load general data
  async function load() {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("name,email")
        .eq("id", userData.user.id)
        .maybeSingle();

      setProfile(profileData);

      const cpSelect = `
        id,
        purchase_date,
        sessions_remaining,
        total_sessions,
        warranty_expires_at,
        package_name,
        package_description,
        packages(name, description, price)
      `;


      const [latestPurchasedResult, historyRows] = await Promise.all([
        supabase
          .from("customer_packages")
          .select(cpSelect)
          .eq("customer_id", userData.user.id)
          .order("purchase_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
        historyFn(),
      ]);

      const latestPurchased = latestPurchasedResult.data;
      const h = (historyRows as HistoryRow[]) ?? [];
      const latestHistoryPackageId = h[0]?.customer_package_id;
      let chosen: any = latestPurchased ?? null;
      if (latestHistoryPackageId) {
        if (latestHistoryPackageId === latestPurchased?.id) {
          chosen = latestPurchased;
        } else {
          const { data: usedPkg } = await supabase
            .from("customer_packages")
            .select(cpSelect)
            .eq("id", latestHistoryPackageId)
            .maybeSingle();
          if (usedPkg) chosen = usedPkg;
        }
      }

      setPkg(chosen as any);
      setHistory(h);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load."
      );
    }
    setLoading(false);
  }

  // Load pending deduction requests
  const loadPending = useCallback(async () => {
    try {
      const d = await listPending();
      setPending((d as PendingReq[]) ?? []);
    } catch {
      setPending([]);
    }
  }, [listPending]);

  // Decide on a request (approve/reject)
  const decide = async (id: string, approve: boolean) => {
    setBusyId(id);

    try {
      await respond({
        data: {
          requestId: id,
          approve,
        },
      });

      toast.success(
        approve ? "Session approved" : "Request rejected"
      );

      await Promise.all([
        loadPending(),
        load(),
      ]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  // Initial load
  useEffect(() => {
    load();
    loadPending();
  }, [loadPending]);

  // Realtime subscription for pending requests
  useEffect(() => {
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

            if (newStatus && newStatus !== "pending") {
              if (newStatus === "approved")
                toast.success("Session approved");
              else if (newStatus === "rejected")
                toast("Request rejected");
              else if (newStatus === "expired")
                toast.warning("Request expired");
              else if (newStatus === "cancelled")
                toast("Request cancelled by salon");

              loadPending();
              load();
            }
          },
        )
        .subscribe();
    })();

    return () => {
      clearInterval(t);

      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadPending]);

  if (loading) {
    return (
      <AppShell title="Home" nav={customerNav}>
        <div className="py-20 text-center text-foreground/60 italic">
          Loading your salon…
        </div>
      </AppShell>
    );
  }

  const used = pkg ? pkg.total_sessions - pkg.sessions_remaining : 0;

  return (
    <AppShell title="Home" nav={customerNav}>
      <div className="mx-auto max-w-4xl space-y-12">
        {/* Greeting — editorial masthead */}
        <section className="border-b border-foreground/25 pb-8">
          <p
            className="text-xs uppercase text-primary"
            style={{ letterSpacing: "0.28em" }}
          >
            Welcome
          </p>
          <h1
            className="mt-3 font-serif text-4xl md:text-5xl italic text-foreground"
            style={{ letterSpacing: "0.04em", lineHeight: 1.15 }}
          >
            {profile?.name ?? "Beautiful"}
          </h1>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground/70">
              {profile?.email ?? "Your Empire Charme space."}
            </p>
            {pkg && (
              <Button
                asChild
                variant="outline"
                className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground sm:w-auto uppercase"
                style={{ letterSpacing: "0.18em" }}
              >
                <Link to="/app/mine/$id" params={{ id: pkg.id }}>
                  View my package →
                </Link>
              </Button>
            )}
          </div>
        </section>

        {/* Pending Session Approval Requests */}
        {pending.length > 0 && (
          <section className="space-y-3">
            <SectionLabel>Awaiting your approval</SectionLabel>
            {pending.map((r) => {
              const mins = Math.max(
                0,
                Math.round((new Date(r.expires_at).getTime() - Date.now()) / 60000),
              );
              const staffNames = r.staff.map((s) => s.name ?? s.email).filter(Boolean).join(", ");

              return (
                <div
                  key={r.id}
                  className="border border-primary/60 bg-primary/5 p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-serif text-lg">Approve your session?</div>
                      <p className="mt-1 text-sm text-foreground/70">
                        {r.package_name} · {r.remaining}/{r.total} left
                        {staffNames ? ` · with ${staffNames}` : ""}
                      </p>
                    </div>
                    <div
                      className="flex items-center gap-1.5 text-[10px] uppercase text-foreground/60 shrink-0"
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
                      <Check className="mr-2 h-4 w-4" /> Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 uppercase border-foreground/40"
                      style={{ letterSpacing: "0.18em" }}
                      disabled={busyId === r.id}
                      onClick={() => decide(r.id, false)}
                    >
                      <X className="mr-2 h-4 w-4" /> Decline
                    </Button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Active Package — editorial hero */}
        {pkg ? (
          <section className="space-y-6">
            <SectionLabel>Your active package</SectionLabel>
            <div className="border border-foreground/25 p-6 md:p-10">
              <div className="flex flex-col-reverse items-start gap-8 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <span
                    className="text-[10px] uppercase text-primary"
                    style={{ letterSpacing: "0.28em" }}
                  >
                    Active
                  </span>
                  <h2
                    className="mt-2 font-serif text-3xl md:text-4xl"
                    style={{ letterSpacing: "0.06em", lineHeight: 1.2 }}
                  >
                    {pkg.packages?.name ?? pkg.package_name}
                  </h2>
                  {(pkg.packages?.description ?? pkg.package_description) && (
                    <p className="mt-4 max-w-md text-sm text-foreground/70 italic">
                      {pkg.packages?.description ?? pkg.package_description}
                    </p>
                  )}
                </div>
                <CircleProgress value={used} total={pkg.total_sessions} />
              </div>

              <div className="mt-10 grid grid-cols-3 gap-6 border-t border-foreground/20 pt-8">
                <Stat label="Total" value={pkg.total_sessions} />
                <Stat label="Used" value={used} />
                <Stat label="Remaining" value={pkg.sessions_remaining} accent />
              </div>

              <div className="mt-8 grid gap-6 border-t border-foreground/20 pt-8 md:grid-cols-2">
                <MetaField
                  label="Purchased"
                  value={new Date(pkg.purchase_date).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                />
                <MetaField
                  label="Expires"
                  value={
                    pkg.warranty_expires_at
                      ? new Date(pkg.warranty_expires_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "No expiry"
                  }
                />
              </div>
            </div>
          </section>
        ) : (
          <section className="border border-foreground/25 p-10 text-center">
            <p className="font-serif italic text-lg text-foreground/80">
              No active package yet.
            </p>
            <p className="mt-2 text-sm text-foreground/60">
              Ask our staff to add a package to your account.
            </p>
            <Button
              asChild
              variant="outline"
              className="mt-6 border-primary text-primary hover:bg-primary hover:text-primary-foreground uppercase"
              style={{ letterSpacing: "0.18em" }}
            >
              <Link to="/app/packages">Browse packages</Link>
            </Button>
          </section>
        )}

        {/* Treatment History */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-foreground/25 pb-4">
            <SectionLabel>Treatment history</SectionLabel>
            <Link
              to="/app/history"
              className="text-xs uppercase text-primary hover:opacity-70"
              style={{ letterSpacing: "0.2em" }}
            >
              View all →
            </Link>
          </div>

          {history.length === 0 ? (
            <div className="py-12 text-center text-foreground/60 italic">
              Your journey begins with your first visit.
            </div>
          ) : (
            <ul className="divide-y divide-foreground/15">
              {history.slice(0, 5).map((item, index) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div
                      className="text-[10px] uppercase text-primary"
                      style={{ letterSpacing: "0.22em" }}
                    >
                      Session {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="mt-1 font-serif text-lg">{item.package_name}</div>
                    <div className="text-xs text-foreground/60">
                      {item.staff.length ? item.staff.join(", ") : "—"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-foreground/80">
                      {new Date(item.used_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <div
                      className="text-[10px] uppercase text-foreground/50"
                      style={{ letterSpacing: "0.18em" }}
                    >
                      −{item.sessions_deducted} session
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-xs uppercase text-foreground/70"
      style={{ letterSpacing: "0.28em" }}
    >
      {children}
    </h2>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <div
        className="text-[10px] uppercase text-foreground/60"
        style={{ letterSpacing: "0.22em" }}
      >
        {label}
      </div>
      <div
        className={`mt-2 font-serif text-3xl md:text-4xl ${accent ? "text-primary" : ""}`}
        style={{ letterSpacing: "0.02em" }}
      >
        {value}
      </div>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        className="text-[10px] uppercase text-foreground/60"
        style={{ letterSpacing: "0.22em" }}
      >
        {label}
      </div>
      <div className="mt-2 font-serif text-lg">{value}</div>
    </div>
  );
}

// CircleProgress component
type CircleProgressProps = {
  value: number;
  total: number;
};

function CircleProgress({ value, total }: CircleProgressProps) {
  const percentage = total === 0 ? 0 : (value / total) * 100;

  const size = 140;
  const stroke = 2;
  const radius = size / 2;
  const normalizedRadius = radius - stroke / 2 - 6;

  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset =
    circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0 w-full h-full -rotate-90"
        >
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-foreground/20"
          />
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="text-primary transition-all duration-700"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className="font-serif text-4xl leading-none"
            style={{ letterSpacing: "0.02em" }}
          >
            {total - value}
          </div>
          <div
            className="mt-2 text-[10px] uppercase text-foreground/60 leading-none"
            style={{ letterSpacing: "0.24em" }}
          >
            Remaining
          </div>
        </div>
      </div>
      <div
        className="mt-4 text-[10px] uppercase text-foreground/50"
        style={{ letterSpacing: "0.22em" }}
      >
        {Math.round(percentage)}% used
      </div>
    </div>
  );
}