import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { staffListMyHistory } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/staff/history")({
  component: StaffHistory,
});

type Row = {
  id: string;
  used_at: string;
  customer_email: string;
  customer_name: string | null;
  package_name: string;
  sessions_deducted: number;
};


function StaffHistory() {
  const list = useServerFn(staffListMyHistory);
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
        <p className="text-sm text-muted-foreground">All sessions assigned to you.</p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-2">
            <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No sessions yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {rows.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-1">
                  <div className="font-medium">{r.customer_name ?? r.customer_email}</div>
                  <div className="text-sm">{r.package_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.used_at).toLocaleString()} · {r.sessions_deducted} session
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
                    <TableHead>Customer</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead className="text-center">Sessions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(r.used_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{r.customer_name ?? r.customer_email}</TableCell>
                      <TableCell>{r.package_name}</TableCell>
                      <TableCell className="text-center">{r.sessions_deducted}</TableCell>
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
