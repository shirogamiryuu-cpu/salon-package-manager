import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminListHistory } from "@/lib/admin.functions";
import { useServerFn } from "@/lib/server-fn";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PackageRecordingTable } from "@/components/package-recording-table";

type PackageOwner = {
  id: string;
  customer_id: string;
  sessions_remaining: number;
  total_sessions: number;
  profiles: { name: string | null; email: string | null } | null;
};

type HistoryRow = {
  id: string;
  used_at: string;
  customer_package_id: string;
  package_name: string;
  price_applied?: number;
  staff: { name?: string | null; full_name?: string | null; email?: string | null }[];
};

interface PackageCustomersDialogProps {
  packageId: string;
  packageName: string;
  pricePerSession: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PackageCustomersDialog({
  packageId,
  packageName,
  pricePerSession,
  open,
  onOpenChange,
}: PackageCustomersDialogProps) {
  const listHistory = useServerFn(adminListHistory);
  const [owners, setOwners] = useState<PackageOwner[] | null>(null);
  const [selected, setSelected] = useState<PackageOwner | null>(null);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setOwners(null);
    supabase
      .from("customer_packages")
      .select("id,customer_id,sessions_remaining,total_sessions,profiles:customer_id(name,email)")
      .eq("package_id", packageId)
      .order("purchase_date", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setOwners((data as unknown as PackageOwner[]) ?? []);
      });
  }, [open, packageId]);

  useEffect(() => {
    if (!selected) return;
    setHistory(null);
    listHistory({ data: { customerId: selected.customer_id } })
      .then((rows) => {
        const all = rows as HistoryRow[];
        setHistory(all.filter((r) => r.customer_package_id === selected.id));
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Failed to load history");
        setHistory([]);
      });
  }, [selected, listHistory]);

  const labelOf = (o: PackageOwner) => o.profiles?.name ?? o.profiles?.email ?? "Customer";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selected ? `${labelOf(selected)} · ${packageName}` : `${packageName} customers`}
          </DialogTitle>
        </DialogHeader>

        {selected ? (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setSelected(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Customers
            </Button>
            {history === null ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <PackageRecordingTable
                rows={history.map((r) => ({
                  id: r.id,
                  purchase_id: r.customer_package_id,
                  used_at: r.used_at,
                  service: r.package_name ?? packageName,
                  value: r.price_applied && r.price_applied > 0 ? r.price_applied : pricePerSession,
                  staff: (r.staff ?? []).map((s) => s.name ?? s.full_name ?? s.email),
                  branch: "YGN",
                }))}
                emptyMessage="No sessions recorded yet."
              />
            )}
          </div>
        ) : owners === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : owners.length === 0 ? (
          <p className="text-sm text-muted-foreground">No customers have this package yet.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {owners.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setSelected(o)}
                className="flex w-full items-center justify-between gap-2 p-3 text-left hover:bg-muted/50"
              >
                <span className="font-medium">{labelOf(o)}</span>
                <span className="text-xs text-muted-foreground">
                  {o.sessions_remaining}/{o.total_sessions} left
                </span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
