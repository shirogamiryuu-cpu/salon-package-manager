import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/packages")({
  component: Available,
});

type Pkg = {
  id: string;
  name: string;
  total_sessions: number;
  points_awarded: number;
  image_url: string | null;
  category_id: string | null;
};

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
};

const UNCAT_ID = "__uncat__";

function Available() {
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [activeParent, setActiveParent] = useState<string>("__all__");

  useEffect(() => {
    (async () => {
      // Fetch packages
      const { data } = await supabase
        .from("packages")
        .select("id, name, total_sessions, points_awarded, image_url, category_id")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      setPkgs((data ?? []) as Pkg[]);

      // Fetch categories
      const { data: cs } = await supabase
        .from("package_categories")
        .select("id, name, parent_id, sort_order")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      setCats((cs ?? []) as Category[]);
    })();
  }, []);

  const parents = useMemo(() => cats.filter((c) => !c.parent_id), [cats]);
  const catById = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);

  const parentIdForPackage = (p: Pkg): string => {
    if (!p.category_id) return UNCAT_ID;
    const c = catById.get(p.category_id);
    if (!c) return UNCAT_ID;
    return c.parent_id ?? c.id;
  };

  const filteredPkgs = useMemo(() => {
    if (activeParent === "__all__") return pkgs;
    return pkgs.filter((p) => parentIdForPackage(p) === activeParent);
  }, [pkgs, activeParent, catById]);

  const grouped = useMemo(() => {
    const groups = new Map<string, { title: string; parentTitle?: string; items: Pkg[] }>();
    for (const p of filteredPkgs) {
      let groupId: string;
      let title: string;
      let parentTitle: string | undefined;

      if (!p.category_id) {
        groupId = UNCAT_ID;
        title = "Other Treatments";
      } else {
        const c = catById.get(p.category_id);
        if (!c) {
          groupId = UNCAT_ID;
          title = "Other Treatments";
        } else {
          groupId = c.id;
          title = c.name;
          if (c.parent_id) parentTitle = catById.get(c.parent_id)?.name;
        }
      }

      const g = groups.get(groupId) ?? { title, parentTitle, items: [] };
      g.items.push(p);
      groups.set(groupId, g);
    }

    return Array.from(groups.entries()).map(([id, g]) => ({ id, ...g }));
  }, [filteredPkgs, catById]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 space-y-10">
      {/* Header Banner */}
      <header className="text-center space-y-3 border-b border-foreground/15 pb-8">
        <span className="text-xs font-semibold tracking-[0.35em] uppercase text-primary">
          Exclusive Treatment Menu
        </span>
        <h1 className="font-serif text-4xl md:text-6xl tracking-wide italic font-light">
          Hair & Scalp Services
        </h1>
        <p className="mx-auto max-w-xl text-xs md:text-sm text-foreground/60 italic">
          Explore our signature salon remedies and specialized hair care services.
          Please consult our salon specialists to select your tailored regimen.
        </p>
      </header>

      {/* Navigation / Category Filter Pills */}
      {parents.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 md:gap-3">
          <button
            onClick={() => setActiveParent("__all__")}
            className={`px-5 py-2 text-xs uppercase tracking-widest transition-all duration-300 rounded-full border ${
              activeParent === "__all__"
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-foreground/20 text-foreground/70 hover:border-primary/50 hover:text-primary"
            }`}
          >
            All Services
          </button>
          {parents.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveParent(p.id)}
              className={`px-5 py-2 text-xs uppercase tracking-widest transition-all duration-300 rounded-full border ${
                activeParent === p.id
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-foreground/20 text-foreground/70 hover:border-primary/50 hover:text-primary"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      {pkgs.length === 0 ? (
        <div className="py-20 text-center text-foreground/50 italic font-serif text-lg">
          No services available at the moment.
        </div>
      ) : filteredPkgs.length === 0 ? (
        <div className="py-20 text-center text-foreground/50 italic font-serif text-lg">
          No treatments found in this category.
        </div>
      ) : (
        <div className="space-y-14">
          {grouped.map((group) => (
            <section key={group.id} className="space-y-6">
              {/* Category Header */}
              <div className="flex items-end justify-between border-b border-foreground/20 pb-3">
                <div>
                  {group.parentTitle && (
                    <span className="block text-[10px] font-bold tracking-[0.25em] uppercase text-primary/80 mb-1">
                      {group.parentTitle}
                    </span>
                  )}
                  <h2 className="font-serif text-2xl md:text-4xl italic tracking-wide text-foreground">
                    {group.title}
                  </h2>
                </div>
                <span className="text-[10px] tracking-[0.2em] uppercase text-foreground/50 pb-1">
                  {group.items.length} {group.items.length === 1 ? "Treatment" : "Treatments"}
                </span>
              </div>

              {/* Responsive Menu Items Grid Layout */}
              <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-2">
                {group.items.map((pkg) => (
                  <article
                    key={pkg.id}
                    className="group relative flex flex-col justify-between border border-foreground/15 bg-card/40 p-5 md:p-6 transition-all duration-300 hover:border-primary/60 hover:shadow-md hover:bg-card"
                  >
                    <div>
                      {/* Package Name */}
                      <h3 className="font-serif text-lg md:text-xl font-medium tracking-wide text-foreground uppercase group-hover:text-primary transition-colors">
                        {pkg.name}
                      </h3>
                    </div>

                    {/* 
                      =====================================================
                      POINTS & SESSIONS SECTION (COMMENTED OUT FOR LATER)
                      =====================================================
                      <div className="mt-4 pt-3 border-t border-foreground/10 flex flex-wrap items-center gap-2">
                        {pkg.total_sessions > 1 && (
                          <span className="inline-flex items-center border border-foreground/20 px-2.5 py-1 text-[10px] tracking-[0.18em] uppercase text-foreground/80">
                            {pkg.total_sessions} Sessions
                          </span>
                        )}
                        <span className="inline-flex items-center border border-primary/30 bg-primary/5 px-2.5 py-1 text-[10px] tracking-[0.18em] uppercase text-primary font-semibold">
                          +{pkg.points_awarded} Points
                        </span>
                      </div>
                    */}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}