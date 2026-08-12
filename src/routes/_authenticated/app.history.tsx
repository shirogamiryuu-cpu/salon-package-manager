import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@/lib/server-fn";
import { customerListMyHistory } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { History } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/history")({
  component: CustomerHistory,
});

type Row = {
  id: string;
  used_at: string;
  package_name: string;
  sessions_deducted: number;
  variant_label?: string | null;
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
        <h1 className="text-2xl font-semibold">Session history</h1>
        <p className="text-sm text-muted-foreground">Sessions you've used across all packages.</p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-2">
            <History className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">You haven't used any sessions yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {rows.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-1">
                  <div className="font-medium">
                    {r.package_name}{r.variant_label ? ` · ${r.variant_label}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.used_at).toLocaleString()} · {r.sessions_deducted} session
                    {r.price_applied ? ` · MMK ${r.price_applied.toFixed(2)}` : ""}
                  </div>
                  <div className="text-xs">
                    Staff: {r.staff.length ? r.staff.join(", ") : "—"}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead className="text-center">Sessions</TableHead>
                    <TableHead>Staff</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(r.used_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {r.package_name}{r.variant_label ? ` · ${r.variant_label}` : ""}
                        {r.price_applied ? (
                          <span className="text-xs text-muted-foreground ml-2">
                            MMK {r.price_applied.toFixed(2)}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-center">{r.sessions_deducted}</TableCell>
                      <TableCell>{r.staff.length ? r.staff.join(", ") : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
