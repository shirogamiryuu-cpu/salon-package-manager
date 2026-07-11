import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
    <div className="mx-auto max-w-4xl space-y-10">
      <header className="border-b border-foreground/25 pb-6">
        <p
          className="text-xs uppercase text-primary"
          style={{ letterSpacing: "0.28em" }}
        >
          Our Menu
        </p>
        <h1
          className="mt-3 font-serif text-4xl md:text-5xl italic"
          style={{ letterSpacing: "0.04em", lineHeight: 1.15 }}
        >
          Available packages
        </h1>
        <p className="mt-4 text-sm text-foreground/70 italic max-w-lg">
          Discover our curated treatments. Ask any staff member to add a package to your account.
        </p>
      </header>

      {pkgs.length === 0 ? (
        <div className="py-16 text-center text-foreground/60 italic">
          No packages available at the moment.
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2">
          {pkgs.map((p) => {
            const promo = promoMap.get(p.id);
            const pricing = promo ? applyPromotion(Number(p.price), promo) : null;
            const vs = variantsByPkg[p.id] ?? [];
            return (
              <article
                key={p.id}
                className="group border border-foreground/25 bg-background transition-colors hover:border-primary"
              >
                <div className="p-6 md:p-8 space-y-5">
                  <div>
                    <h2
                      className="font-serif text-2xl md:text-3xl"
                      style={{ letterSpacing: "0.06em", lineHeight: 1.25 }}
                    >
                      {p.name}
                    </h2>
                    {p.description && (
                      <p className="mt-3 text-sm text-foreground/70 italic line-clamp-3">
                        {p.description}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-foreground/20 pt-5">
                    {vs.length > 0 ? (
                      <div className="space-y-2">
                        <div
                          className="text-[10px] uppercase text-foreground/60"
                          style={{ letterSpacing: "0.22em" }}
                        >
                          From
                        </div>
                        <div
                          className="font-serif text-3xl text-primary"
                          style={{ letterSpacing: "0.04em" }}
                        >
                          MMK {Math.min(...vs.map((v) => v.price)).toLocaleString()}
                        </div>
                        <ul className="divide-y divide-foreground/15 pt-2">
                          {vs.map((v) => (
                            <li
                              key={v.id}
                              className="flex items-center justify-between py-2 text-sm"
                            >
                              <span className="text-foreground/70">{v.label}</span>
                              <span className="font-serif text-base">
                                MMK {v.price.toLocaleString()}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : pricing ? (
                      <div className="space-y-1">
                        <div
                          className="text-xs uppercase text-foreground/50 line-through"
                          style={{ letterSpacing: "0.18em" }}
                        >
                          MMK {pricing.original.toLocaleString()}
                        </div>
                        <div
                          className="font-serif text-3xl text-primary"
                          style={{ letterSpacing: "0.04em" }}
                        >
                          MMK {pricing.final.toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <div
                        className="font-serif text-3xl text-primary"
                        style={{ letterSpacing: "0.04em" }}
                      >
                        MMK {Number(p.price).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {promo && vs.length === 0 && (
                      <span
                        className="inline-flex items-center border border-primary bg-primary/10 px-3 py-1 text-[10px] uppercase text-primary"
                        style={{ letterSpacing: "0.2em" }}
                      >
                        {formatDiscountLabel(promo)}
                      </span>
                    )}
                    <span
                      className="inline-flex items-center border border-foreground/30 px-3 py-1 text-[10px] uppercase text-foreground/70"
                      style={{ letterSpacing: "0.2em" }}
                    >
                      +{p.points_awarded} points
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
