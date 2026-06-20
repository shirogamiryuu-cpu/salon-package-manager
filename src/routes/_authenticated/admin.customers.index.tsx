import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListCustomers } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/customers/")({
  component: Customers,
});

type C = { id: string; email: string; phone: string | null; points: number; created_at: string };

function Customers() {
  const list = useServerFn(adminListCustomers);
  const [rows, setRows] = useState<C[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    list().then((d) => setRows(d as C[])).catch(() => setRows([]));
  }, [list]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return rows.filter((r) => r.email.toLowerCase().includes(s) || (r.phone ?? "").includes(s));
  }, [rows, q]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Customers</h1>
      <Input placeholder="Search by email or phone" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.email}</TableCell>
                  <TableCell>{c.phone ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{c.points}</Badge></TableCell>
                  <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Link to="/admin/customers/$id" params={{ id: c.id }} className="text-primary hover:underline text-sm">View</Link>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No customers</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
