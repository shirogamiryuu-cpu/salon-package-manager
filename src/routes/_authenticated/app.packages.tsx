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

type Variant = { id: string; label: string; price: number };

function Available() {
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [variantsByPkg, setVariantsByPkg] = useState<Record<string, Variant[]>>({});
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
      const { data: vs } = await supabase
        .from("package_variants")
        .select("id,package_id,label,price,sort_order")
        .order("sort_order", { ascending: true });
      const map: Record<string, Variant[]> = {};
      for (const v of (vs ?? []) as any[]) {
        (map[v.package_id] ||= []).push({ id: v.id, label: v.label, price: Number(v.price) });
      }
      setVariantsByPkg(map);
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
          const vs = variantsByPkg[p.id] ?? [];
          return (
            <Card key={p.id} className="overflow-hidden">
              {p.image_url && <img src={p.image_url} alt={p.name} className="h-40 w-full object-cover" />}
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{p.name}</span>
                  {vs.length > 0 ? (
                    <span className="text-base font-semibold">
                      MMK {Math.min(...vs.map((v) => v.price)).toFixed(2)}
                      {" – "}
                      MMK {Math.max(...vs.map((v) => v.price)).toFixed(2)}
                    </span>
                  ) : pricing ? (
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground line-through">
                        MMK {pricing.original.toFixed(2)}
                      </div>
                      <div className="text-base font-semibold text-primary">
                        MMK {pricing.final.toFixed(2)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-base font-semibold">MMK {Number(p.price).toFixed(2)}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                {vs.length > 0 && (
                  <div className="space-y-1 text-sm">
                    {vs.map((v) => (
                      <div key={v.id} className="flex items-center justify-between border-b last:border-0 py-1">
                        <span className="text-muted-foreground">{v.label}</span>
                        <span className="font-medium">MMK {v.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 text-xs pt-1">
                  {promo && vs.length === 0 && <Badge className="bg-primary">{formatDiscountLabel(promo)}</Badge>}
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
