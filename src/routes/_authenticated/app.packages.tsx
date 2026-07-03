import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { applyPromotion, fetchActivePromoMap, formatDiscountLabel, type Promotion } from "@/lib/promotions";

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
  const [promoMap, setPromoMap] = useState<Map<string, Promotion>>(new Map());

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("packages")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      const list = (data ?? []) as Pkg[];
      setPkgs(list);
      setPromoMap(await fetchActivePromoMap(list.map((p) => p.id)));
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Available packages</h1>
        <p className="text-sm text-muted-foreground">Ask the salon staff to add one of these to your account.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pkgs.map((p) => {
          const promo = promoMap.get(p.id);
          const pricing = promo ? applyPromotion(Number(p.price), promo) : null;
          return (
            <Card key={p.id} className="overflow-hidden">
              {p.image_url && <img src={p.image_url} alt={p.name} className="h-40 w-full object-cover" />}
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{p.name}</span>
                  {pricing ? (
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground line-through">
                        ${pricing.original.toFixed(2)}
                      </div>
                      <div className="text-base font-semibold text-primary">
                        ${pricing.final.toFixed(2)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-base font-semibold">${Number(p.price).toFixed(2)}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                <div className="flex flex-wrap gap-2 text-xs">
                  {promo && <Badge className="bg-primary">{formatDiscountLabel(promo)}</Badge>}
                  <Badge variant="outline">+{p.points_awarded} points</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {pkgs.length === 0 && <p className="text-muted-foreground">No packages available yet.</p>}
      </div>
    </div>
  );
}
