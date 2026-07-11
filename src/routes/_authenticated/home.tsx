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
  packages: {
    name: string;
    description: string | null;
    price: number;
  } | null;
};

type HistoryRow = {
  id: string;
  used_at: string;
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

      const { data: packageData } = await supabase
        .from("customer_packages")
        .select(`
          id,
          purchase_date,
          sessions_remaining,
          total_sessions,
          warranty_expires_at,
          packages(
            name,
            description,
            price
          )
        `)
        .eq("customer_id", userData.user.id)
        .order("purchase_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      setPkg(packageData as any);

      const h = await historyFn();
      setHistory(h as HistoryRow[]);
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

            if (oldStatus === "pending" && newStatus !== "pending") {
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
        <div className="py-20 text-center text-muted-foreground">
          Loading...
        </div>
      </AppShell>
    );
  }

  const used = pkg ? pkg.total_sessions - pkg.sessions_remaining : 0;
  const percent = pkg ? (used / pkg.total_sessions) * 100 : 0;

  return (
    <AppShell title="Home" nav={customerNav}>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Greeting */}
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl">
                  {profile?.name?.charAt(0).toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-muted-foreground">Hello,</p>
                <h1 className="text-3xl font-bold">
                  {profile?.name ?? "Customer"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {profile?.email}
                </p>
              </div>
            </div>
            <Button asChild>
              <Link
                to="/app/mine/$id"
                params={{ id: pkg?.id ?? "" }}
              >
                My Active Package
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Pending Session Approval Requests */}
        {pending.length > 0 && (
          <div className="space-y-2">
            {pending.map((r) => {
              const mins = Math.max(
                0,
                Math.round(
                  (new Date(r.expires_at).getTime() - Date.now()) / 60000
                )
              );

              const staffNames = r.staff
                .map((s) => s.name ?? s.email)
                .filter(Boolean)
                .join(", ");

              return (
                <Card
                  key={r.id}
                  className="border-primary/40 bg-primary/5"
                >
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">
                          Approve session deduction?
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {r.package_name} · {r.remaining}/{r.total} left
                          {staffNames ? ` · ${staffNames}` : ""}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {mins}m left
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        disabled={busyId === r.id}
                        onClick={() => decide(r.id, true)}
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Approve
                      </Button>

                      <Button
                        variant="outline"
                        className="flex-1"
                        disabled={busyId === r.id}
                        onClick={() => decide(r.id, false)}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Active Package */}
        {pkg && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-bold">
                    {pkg.packages?.name}
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    {pkg.packages?.description}
                  </p>
                  <Badge className="mt-4">ACTIVE</Badge>
                </div>
                <CircleProgress value={used} total={pkg.total_sessions} />
              </div>

              <div className="mt-8 grid grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <h3 className="mt-1 text-3xl font-bold">{pkg.total_sessions}</h3>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Used Sessions</p>
                  <h3 className="mt-1 text-3xl font-bold">{used}</h3>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <h3 className="mt-1 text-3xl font-bold">{pkg.sessions_remaining}</h3>
                </div>
              </div>

              {/* Purchase & Expiry */}
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="p-5">
                    <p className="text-sm text-muted-foreground">Purchase Date</p>
                    <h4 className="mt-2 text-lg font-semibold">
                      {new Date(pkg.purchase_date).toLocaleDateString()}
                    </h4>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-sm text-muted-foreground">Expire Date</p>
                    <h4 className="mt-2 text-lg font-semibold">
                      {pkg.warranty_expires_at
                        ? new Date(pkg.warranty_expires_at).toLocaleDateString()
                        : "No Expiry"}
                    </h4>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Treatment History */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Treatment History</h2>
              <Button variant="outline" asChild>
                <Link to="/app/history">View All</Link>
              </Button>
            </div>

            {history.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                No treatment history.
              </div>
            ) : (
              <div className="space-y-4">
                {history.slice(0, 5).map((item, index) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="font-semibold">Session {index + 1}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.package_name}
                      </div>
                    </div>
                    <div className="text-sm">
                      {new Date(item.used_at).toLocaleDateString()}
                    </div>
                    <div className="text-sm">-{item.sessions_deducted}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.staff.length ? item.staff.join(", ") : "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Package Details */}
        {pkg && (
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-6 text-2xl font-bold">Package Details</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Package Name</p>
                  <h3 className="mt-2 text-xl font-semibold">{pkg.packages?.name}</h3>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <h3 className="mt-2 text-xl font-semibold">
                    MMK {Number(pkg.packages?.price ?? 0).toFixed(2)}
                  </h3>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className="mt-2">Active</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Remaining Sessions</p>
                  <h3 className="mt-2 text-xl font-semibold">{pkg.sessions_remaining}</h3>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <h3 className="mt-2 text-xl font-semibold">{pkg.total_sessions}</h3>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Used Sessions</p>
                  <h3 className="mt-2 text-xl font-semibold">{used}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

// CircleProgress component
type CircleProgressProps = {
  value: number;
  total: number;
};

function CircleProgress({ value, total }: CircleProgressProps) {
  const percentage = total === 0 ? 0 : (value / total) * 100;

  const size = 130;
  const stroke = 10;
  const radius = size / 2;
  const normalizedRadius = radius - stroke / 2;

  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset =
    circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      {/* Circle */}
      <div className="relative w-32.5 h-32.5">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0 w-full h-full -rotate-90"
        >
          {/* Background */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted"
          />

          {/* Progress */}
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

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold leading-none">{value}</div>
          <div className="mt-1 text-xs leading-none text-muted-foreground">
            Used
          </div>
        </div>
      </div>

      {/* Percentage */}
      <div className="mt-3 text-sm text-muted-foreground">
        {Math.round(percentage)}%
      </div>
    </div>
  );
}