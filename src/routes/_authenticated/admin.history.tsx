import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@/lib/server-fn";
import {
  adminListHistory,
  adminListCustomers,
  adminListStaff,
} from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export const Route = createFileRoute("/_authenticated/admin/history")({
  component: AdminHistory,
});

type Row = Awaited<ReturnType<typeof adminListHistory>>[number];
type Opt = { id: string; label: string };

function AdminHistory() {
  const list = useServerFn(adminListHistory);
  const listCustomers = useServerFn(adminListCustomers);
  const listStaff = useServerFn(adminListStaff);

  const [rows, setRows] = useState<Row[] | null>(null);
  const [customers, setCustomers] = useState<Opt[]>([]);
  const [staff, setStaff] = useState<Opt[]>([]);
  const [packages, setPackages] = useState<Opt[]>([]);
  const [customerId, setCustomerId] = useState<string>("all");
  const [staffId, setStaffId] = useState<string>("all");
  const [packageId, setPackageId] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    (async () => {
      const [c, s, p] = await Promise.all([
        listCustomers(),
        listStaff(),
        supabase.from("packages").select("id,name").order("name"),
      ]);
      setCustomers((c as any[]).map((x) => ({ id: x.id, label: x.name ?? x.email ?? x.id })));
      setStaff((s as any[]).map((x) => ({ id: x.id, label: x.name ?? x.email ?? x.id })));

      setPackages((p.data ?? []).map((x: any) => ({ id: x.id, label: x.name })));
    })().catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"));
  }, [listCustomers, listStaff]);

  const load = useMemo(
    () => async () => {
      setRows(null);
      try {
        const data = await list({
          data: {
            customerId: customerId === "all" ? undefined : customerId,
            staffId: staffId === "all" ? undefined : staffId,
            packageId: packageId === "all" ? undefined : packageId,
            from: from ? new Date(from).toISOString() : undefined,
            to: to ? new Date(to + "T23:59:59").toISOString() : undefined,
          },
        });
        setRows(data as Row[]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load");
        setRows([]);
      }
    },
    [list, customerId, staffId, packageId, from, to],
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Session history</h1>
        <p className="text-sm text-muted-foreground">All recorded session deductions.</p>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-5">
          <div className="space-y-1">
            <Label className="text-xs">Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {customers.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Staff</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {staff.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Package</Label>
            <Select value={packageId} onValueChange={setPackageId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {packages.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="md:col-span-5 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCustomerId("all");
                setStaffId("all");
                setPackageId("all");
                setFrom("");
                setTo("");
              }}
            >
              Clear filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {rows === null ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-2">
            <History className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No sessions recorded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {rows.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-1">
                  <div className="font-medium">{r.customer_name ?? r.customer_email}</div>
                  <div className="text-sm">
                    {r.package_name}{r.variant_label ? ` · ${r.variant_label}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.used_at).toLocaleString()} · {r.sessions_deducted} session
                    {r.price_applied ? ` · MMK ${r.price_applied.toFixed(0)}` : ""}
                  </div>
                  <div className="text-xs">
                    Staff: {r.staff.length ? r.staff.map((s: any) => s.name ?? s.email).join(", ") : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    By: {r.admin_name ?? r.admin_email ?? "—"}
                    {(r as any).approved_by_admin ? " · admin approved" : ""}
                  </div>


                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead className="text-center">Sessions</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Deducted by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(r.used_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{r.customer_name ?? r.customer_email}</TableCell>
                      <TableCell>
                        {r.package_name}{r.variant_label ? ` · ${r.variant_label}` : ""}
                        {r.price_applied ? (
                          <span className="text-xs text-muted-foreground ml-2">
                            MMK {r.price_applied.toFixed(0)}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-center">{r.sessions_deducted}</TableCell>
                      <TableCell>
                        {r.staff.length ? r.staff.map((s: any) => s.name ?? s.email).join(", ") : "—"}
                      </TableCell>
                      <TableCell>
                        {r.admin_name ?? r.admin_email ?? "—"}
                        {(r as any).approved_by_admin ? (
                          <span className="text-xs text-muted-foreground ml-2">admin approved</span>
                        ) : null}
                      </TableCell>


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
