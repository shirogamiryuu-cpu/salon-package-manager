import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/")({
  component: MyPackages,
});

type Row = {
  id: string;
  sessions_remaining: number;
  total_sessions: number;
  purchase_date: string;
  deposit_paid: boolean;
  packages: { name: string; description: string | null; points_awarded: number } | null;
};

function MyPackages() {
  const [rows, setRows] = useState<Row[]>([]);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [{ data: cp }, { data: p }] = await Promise.all([
        supabase
          .from("customer_packages")
          .select("id,sessions_remaining,total_sessions,purchase_date,deposit_paid,packages(name,description,points_awarded)")
          .eq("customer_id", u.user.id)
          .order("purchase_date", { ascending: false }),
        supabase.from("profiles").select("points").eq("id", u.user.id).maybeSingle(),
      ]);
      setRows((cp ?? []) as any);
      setPoints(p?.points ?? 0);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My packages</h1>
        <Badge variant="secondary" className="text-sm">⭐ {points} points</Badge>
      </div>
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
                      <Badge variant={r.deposit_paid ? "default" : "secondary"}>
                        {r.deposit_paid ? "Half deposit paid" : "Deposit unpaid"}
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
