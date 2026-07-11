import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@/lib/server-fn";
import { customerListMyHistory } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarClock, Users, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/mine/$id")({
  component: PackageDetail,
});

type CP = {
  id: string;
  sessions_remaining: number;
  total_sessions: number;
  purchase_date: string;
  deposit_paid: boolean;
  deposit_paid_at: string | null;
  deposit_sessions_paid: number;
  deposit_amount: number;
  total_price: number;
  warranty_years: number;
  warranty_expires_at: string | null;
  variant_label?: string | null;
  packages: {
    name: string;
    description: string | null;
    price: number;
    points_awarded: number;
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

function PackageDetail() {
  const { id } = Route.useParams();
  const listHistory = useServerFn(customerListMyHistory);
  const [cp, setCp] = useState<CP | null>(null);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("customer_packages")
        .select(
          "id,sessions_remaining,total_sessions,purchase_date,deposit_paid,deposit_paid_at,deposit_sessions_paid,deposit_amount,total_price,warranty_years,warranty_expires_at,variant_label,packages(name,description,price,points_awarded)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) toast.error(error.message);
      setCp((data as any) ?? null);
    })();
    listHistory()
      .then((rows) =>
        setHistory((rows as HistoryRow[]).filter((r) => r.customer_package_id === id)),
      )
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Failed to load history");
        setHistory([]);
      });
  }, [id, listHistory]);

  if (!cp) {
    return (
      <div className="py-20 text-center text-foreground/60 italic">Loading…</div>
    );
  }

  const totalPrice = Number(cp.total_price ?? 0) || Number(cp.packages?.price ?? 0);
  const depositAmount = Number(cp.deposit_amount ?? 0);
  const outstanding = Math.max(0, totalPrice - depositAmount);
  const used = cp.total_sessions - cp.sessions_remaining;
  const pct = (cp.sessions_remaining / cp.total_sessions) * 100;
  const lastUsed = history && history.length ? history[0].used_at : null;

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 uppercase text-foreground/70 hover:text-primary"
        style={{ letterSpacing: "0.18em" }}
      >
        <Link to="/app">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Link>
      </Button>

      {/* Hero */}
      <header className="border-b border-foreground/25 pb-8">
        <p
          className="text-xs uppercase text-primary"
          style={{ letterSpacing: "0.28em" }}
        >
          Your package
        </p>
        <h1
          className="mt-3 font-serif text-4xl md:text-5xl italic"
          style={{ letterSpacing: "0.04em", lineHeight: 1.15 }}
        >
          {cp.packages?.name ?? "Package"}
          {cp.variant_label ? ` · ${cp.variant_label}` : ""}
        </h1>
        {cp.packages?.description && (
          <p className="mt-4 text-sm text-foreground/70 italic max-w-lg">
            {cp.packages.description}
          </p>
        )}
      </header>

      {/* Progress */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <span
            className="text-[10px] uppercase text-foreground/60"
            style={{ letterSpacing: "0.24em" }}
          >
            Sessions
          </span>
          <span
            className="font-serif text-2xl"
            style={{ letterSpacing: "0.04em" }}
          >
            <span className="text-primary">{cp.sessions_remaining}</span>
            <span className="text-foreground/40"> / {cp.total_sessions}</span>
          </span>
        </div>
        <div className="relative h-px w-full bg-foreground/20">
          <div
            className="absolute inset-y-0 left-0 bg-primary"
            style={{ width: `${pct}%`, height: "1px" }}
          />
        </div>
        <div
          className="text-[10px] uppercase text-foreground/50"
          style={{ letterSpacing: "0.22em" }}
        >
          {used} used · Purchased{" "}
          {new Date(cp.purchase_date).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </section>

      {/* Financial breakdown */}
      <section className="grid grid-cols-3 border-y border-foreground/25 divide-x divide-foreground/20">
        <PriceCell label="Total" value={totalPrice} />
        <PriceCell label="Paid" value={depositAmount} />
        <PriceCell label="Outstanding" value={outstanding} accent={outstanding > 0} />
      </section>

      {/* Meta grid */}
      <section className="space-y-6">
        {(cp.warranty_years > 0 || cp.warranty_expires_at) && (
          <div className="flex items-center gap-3 text-sm text-foreground/70">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>
              {cp.warranty_years > 0 ? `${cp.warranty_years}-year warranty` : "Warranty"}
              {cp.warranty_expires_at
                ? ` · valid until ${new Date(cp.warranty_expires_at).toLocaleDateString()}`
                : ""}
            </span>
          </div>
        )}
        <div className="flex items-center gap-3 text-sm text-foreground/70">
          <CalendarClock className="h-4 w-4 text-primary" />
          <span>
            Last session:{" "}
            <span className="text-foreground">
              {lastUsed ? new Date(lastUsed).toLocaleString() : "—"}
            </span>
          </span>
        </div>
      </section>

      {/* History */}
      <section className="space-y-4">
        <h2
          className="text-xs uppercase text-foreground/70 border-b border-foreground/25 pb-4"
          style={{ letterSpacing: "0.28em" }}
        >
          Session history
        </h2>

        {history === null ? (
          <p className="text-sm text-foreground/60 italic">Loading…</p>
        ) : history.length === 0 ? (
          <p className="py-8 text-center text-foreground/60 italic">
            No sessions used yet.
          </p>
        ) : (
          <ul className="divide-y divide-foreground/15">
            {history.map((r, i) => (
              <li key={r.id} className="py-4 flex items-start justify-between gap-4">
                <div>
                  <div
                    className="text-[10px] uppercase text-primary"
                    style={{ letterSpacing: "0.22em" }}
                  >
                    Session {String(history.length - i).padStart(2, "0")}
                  </div>
                  <div className="mt-1 font-serif text-lg">
                    {new Date(r.used_at).toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-foreground/60">
                    <Users className="h-3 w-3" />
                    {r.staff.length ? r.staff.join(", ") : "—"}
                  </div>
                </div>
                <div
                  className="text-[10px] uppercase text-foreground/60"
                  style={{ letterSpacing: "0.22em" }}
                >
                  −{r.sessions_deducted}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PriceCell({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="p-5 text-center">
      <div
        className="text-[10px] uppercase text-foreground/60"
        style={{ letterSpacing: "0.22em" }}
      >
        {label}
      </div>
      <div
        className={`mt-2 font-serif text-xl md:text-2xl ${accent ? "text-primary" : "text-foreground"}`}
        style={{ letterSpacing: "0.02em" }}
      >
        MMK {value.toLocaleString()}
      </div>
    </div>
  );
}
