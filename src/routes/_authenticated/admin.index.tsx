import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package as PackageIcon, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDash,
});

function AdminDash() {
  const [stats, setStats] = useState({ customers: 0, packages: 0, sold: 0 });

  useEffect(() => {
    (async () => {
      const [{ count: customers }, { count: packages }, { count: sold }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("packages").select("*", { count: "exact", head: true }),
        supabase.from("customer_packages").select("*", { count: "exact", head: true }),
      ]);
      setStats({ customers: customers ?? 0, packages: packages ?? 0, sold: sold ?? 0 });
    })();
  }, []);

  const cards = [
    { label: "Customers", value: stats.customers, icon: Users },
    { label: "Packages", value: stats.packages, icon: PackageIcon },
    { label: "Packages assigned", value: stats.sold, icon: ShoppingBag },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
