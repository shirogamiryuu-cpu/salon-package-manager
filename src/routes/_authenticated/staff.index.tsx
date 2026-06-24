import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { staffListMySessions } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, MinusCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/staff/")({
  component: StaffDash,
});

type Row = {
  id: string;
  used_at: string;
  package_name: string;
  customer_email: string;
  remaining: number;
  total: number;
};

function StaffDash() {
  const list = useServerFn(staffListMySessions);
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
        <h1 className="text-2xl font-semibold">My sessions</h1>
        <p className="text-sm text-muted-foreground">Recent sessions you were assigned to.</p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-2">
            <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No sessions yet</p>
            <p className="text-xs text-muted-foreground">
              When an admin assigns you to a deduction, it will show up here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.customer_email}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {r.package_name} · {new Date(r.used_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center justify-end gap-1 text-sm font-medium">
                    <MinusCircle className="h-3.5 w-3.5 text-primary" /> 1 session
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.remaining}/{r.total} left
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
