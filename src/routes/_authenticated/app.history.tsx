import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@/lib/server-fn";
import { customerListMyHistory } from "@/lib/admin.functions";
import { toast } from "sonner";
import { PackageRecordingTable } from "@/components/package-recording-table";

export const Route = createFileRoute("/_authenticated/app/history")({
  component: CustomerHistory,
});

type Row = {
  id: string;
  customer_package_id?: string;
  used_at: string;
  package_name: string;
  sessions_deducted: number;
  price_applied?: number;
  staff: string[];
};

function CustomerHistory() {
  const list = useServerFn(customerListMyHistory);
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    list()
      .then((d) => setRows(d as Row[]))
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Failed to load");
        setRows([]);
      });
  }, [list]);

  if (rows === null) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Package recording</h1>
        <p className="text-sm text-muted-foreground">
          All treatments and sessions recorded for your packages.
        </p>
      </div>

      <PackageRecordingTable
        showPurchaseId={true}
        rows={rows.map((r) => ({
          id: r.id,
          purchase_id: r.customer_package_id,
          used_at: r.used_at,
          service: r.package_name,
          value: r.price_applied,
          staff: r.staff,
          branch: "YGN",
        }))}
        emptyMessage="You haven't used any sessions yet."
      />
    </div>
  );
}
