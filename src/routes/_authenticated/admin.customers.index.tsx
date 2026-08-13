import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@/lib/server-fn";
import { adminListCustomers } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/customers/")({
  component: Customers,
});

type C = { id: string; name: string | null; phone: string | null; points: number; created_at: string };

function Customers() {
  const list = useServerFn(adminListCustomers);
  const navigate = useNavigate();
  const [rows, setRows] = useState<C[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    list().then((d) => setRows((d as C[]).map(({ id, name, phone, points, created_at }) => ({ id, name, phone, points, created_at })))).catch(() => setRows([]));
  }, [list]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return rows.filter(
      (r) =>
        (r.name ?? "").toLowerCase().includes(s) ||
        (r.phone ?? "").includes(s),
    );
  }, [rows, q]);

  return (
  <div className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl font-semibold">Customers</h1>

      <Input
        placeholder="Search by name or phone"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full sm:max-w-sm"
      />
    </div>

    <Card>
      <CardContent className="p-0">

        {/* Desktop Table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() =>
                    navigate({
                      to: "/admin/customers/$id",
                      params: { id: c.id },
                    })
                  }
                >
                  <TableCell className="font-medium">
                    {c.name ?? "—"}
                  </TableCell>

                  <TableCell>{c.phone ?? "—"}</TableCell>

                  <TableCell>
                    <Badge variant="secondary">{c.points}</Badge>
                  </TableCell>

                  <TableCell>
                    {new Date(c.created_at).toLocaleDateString()}
                  </TableCell>

                  <TableCell className="text-right">
                    <ChevronRight className="h-4 w-4 text-muted-foreground inline" />
                  </TableCell>
                </TableRow>
              ))}

              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No customers
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() =>
                navigate({
                  to: "/admin/customers/$id",
                  params: { id: c.id },
                })
              }
              className="p-4 active:bg-muted/50 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">
                    {c.name ?? "—"}
                  </p>

                  {/* phone only on mobile */}
                  <p className="text-sm text-muted-foreground">
                    {c.phone ?? "—"}
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>

              <div className="mt-3 flex items-center justify-between">
                <Badge variant="secondary">{c.points} pts</Badge>

                {/* email hidden on mobile? (not shown, per request) */}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No customers
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  </div>
);
}

