import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/packages")({
  component: Available,
});

type Pkg = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  total_sessions: number;
  points_awarded: number;
  image_url: string | null;
};

function Available() {
  const [pkgs, setPkgs] = useState<Pkg[]>([]);

  useEffect(() => {
    supabase
      .from("packages")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => setPkgs((data ?? []) as Pkg[]));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Available packages</h1>
        <p className="text-sm text-muted-foreground">Ask the salon staff to add one of these to your account.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pkgs.map((p) => (
          <Card key={p.id} className="overflow-hidden">
            {p.image_url && <img src={p.image_url} alt={p.name} className="h-40 w-full object-cover" />}
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{p.name}</span>
                <span className="text-base font-semibold">${Number(p.price).toFixed(2)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
              <div className="flex gap-2 text-xs">
                <Badge variant="secondary">{p.total_sessions} sessions</Badge>
                <Badge variant="outline">+{p.points_awarded} points</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {pkgs.length === 0 && <p className="text-muted-foreground">No packages available yet.</p>}
      </div>
    </div>
  );
}
