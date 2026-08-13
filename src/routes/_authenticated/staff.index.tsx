import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@/lib/server-fn";
import { staffDashboard } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  MinusCircle,
  Users,
  CalendarDays,
  ShoppingBag,
  Clock,
  Phone,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/staff/")({
  component: StaffDash,
});

type Dash = {
  scope?: "mine" | "all";
  stats: {
    today: number;
    week: number;
    month: number;
    total: number;
    uniqueCustomers: number;
    monthRevenue: number;
    packagesSold: number;
  };
  recent: Array<{
    id: string;
    used_at: string;
    customer_email: string;
    customer_name: string | null;
    customer_phone: string | null;
    package_name: string;
    variant_label: string | null;
    price_applied: number;
    remaining: number;
    total: number;
  }>;
  pending: Array<{
    id: string;
    created_at: string;
    expires_at: string;
    variant_label: string | null;
    package_name: string;
    customer_name: string | null;
    customer_email: string;
  }>;
  sold: Array<{
    id: string;
    purchase_date: string;
    total_price: number;
    package_name: string;
    customer_name: string | null;
    customer_email: string;
  }>;
  topCustomers: Array<{
    name: string | null;
    email: string;
    sessions: number;
    last_at: string;
  }>;
};

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest">
          <Icon className="h-3.5 w-3.5" /> {label}
        </div>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function StaffDash() {
  const load = useServerFn(staffDashboard);
  const [data, setData] = useState<Dash | null>(null);

  useEffect(() => {
    load()
      .then((d) => setData(d as Dash))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"));
  }, [load]);

  if (!data) return <p className="text-muted-foreground">Loading…</p>;

  const { stats, recent, pending, sold, topCustomers } = data;
  const isAll = data.scope === "all";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{isAll ? "Salon dashboard" : "My dashboard"}</h1>
        <p className="text-sm text-muted-foreground">
          {isAll
            ? "Admin preview: sessions, customers and package sales across the salon."
            : "Your sessions, customers and package sales at a glance."}
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat icon={CalendarDays} label="Today" value={stats.today} />
        <Stat icon={ClipboardList} label="This week" value={stats.week} />
        <Stat icon={ClipboardList} label="This month" value={stats.month} />
        <Stat icon={Users} label="Customers served" value={stats.uniqueCustomers} />
        <Stat icon={MinusCircle} label="Total sessions" value={stats.total} />
        <Stat icon={ShoppingBag} label="Packages sold" value={stats.packagesSold} />
        <Stat
          icon={ShoppingBag}
          label="Month revenue"
          value={`MMK ${stats.monthRevenue.toFixed(0)}`}
        />
      </div>

      {pending.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Waiting for customer approval
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.customer_name ?? p.customer_email}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {p.package_name}
                    {p.variant_label ? ` · ${p.variant_label}` : ""}
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  Pending
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent sessions</CardTitle>
            <Link to="/staff/history" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sessions yet.</p>
            ) : (
              recent.map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {r.customer_name ?? r.customer_email}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.package_name}
                      {r.variant_label ? ` · ${r.variant_label}` : ""} ·{" "}
                      {new Date(r.used_at).toLocaleString()}
                    </div>
                    {r.customer_phone ? (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {r.customer_phone}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-right shrink-0">
                    {r.price_applied ? (
                      <div className="text-sm font-medium">
                        MMK {r.price_applied.toFixed(0)}
                      </div>
                    ) : null}
                    <div className="text-xs text-muted-foreground">
                      {r.remaining}/{r.total} left
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top customers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No customers yet.</p>
              ) : (
                topCustomers.map((c) => (
                  <div key={c.email} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.name ?? c.email}</div>
                      <div className="text-xs text-muted-foreground">
                        Last visit {new Date(c.last_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="shrink-0 text-muted-foreground">
                      {c.sessions} session{c.sessions === 1 ? "" : "s"}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Packages I sold</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sold.length === 0 ? (
                <p className="text-sm text-muted-foreground">No package sales recorded.</p>
              ) : (
                sold.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{s.package_name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {s.customer_name ?? s.customer_email} ·{" "}
                        {new Date(s.purchase_date).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="shrink-0">MMK {s.total_price.toFixed(0)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
