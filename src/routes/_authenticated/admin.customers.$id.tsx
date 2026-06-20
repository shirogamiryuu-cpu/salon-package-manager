import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetCustomer, assignPackage, useSession } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MinusCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/customers/$id")({
  component: CustomerDetail,
});

function CustomerDetail() {
  const { id } = Route.useParams();
  const get = useServerFn(adminGetCustomer);
  const assign = useServerFn(assignPackage);
  const use = useServerFn(useSession);

  const [data, setData] = useState<any>(null);
  const [packages, setPackages] = useState<{ id: string; name: string }[]>([]);
  const [pickId, setPickId] = useState<string>("");

  const refresh = useCallback(async () => {
    const d = await get({ data: { id } });
    setData(d);
  }, [get, id]);

  useEffect(() => {
    refresh();
    supabase.from("packages").select("id,name").eq("is_active", true).then(({ data }) => setPackages(data ?? []));
  }, [refresh]);

  const doAssign = async () => {
    if (!pickId) return;
    try {
      await assign({ data: { customerId: id, packageId: pickId } });
      toast.success("Package assigned");
      setPickId("");
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const doUse = async (cpId: string) => {
    try {
      await use({ data: { customerPackageId: cpId } });
      toast.success("Session deducted");
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  if (!data) return <p className="text-muted-foreground">Loading...</p>;
  const { profile, customerPackages } = data;

  return (
    <div className="space-y-6">
      <Link to="/admin/customers" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Back
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{profile?.email}</h1>
          <p className="text-sm text-muted-foreground">{profile?.phone ?? "No phone"}</p>
        </div>
        <Badge variant="secondary" className="text-base">⭐ {profile?.points ?? 0} points</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>Assign a package</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Select value={pickId} onValueChange={setPickId}>
            <SelectTrigger className="max-w-xs"><SelectValue placeholder="Choose a package" /></SelectTrigger>
            <SelectContent>
              {packages.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={doAssign} disabled={!pickId}>Assign</Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Owned packages</h2>
        {customerPackages.length === 0 && <p className="text-muted-foreground">None yet.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {customerPackages.map((cp: any) => {
            const pct = (cp.sessions_remaining / cp.total_sessions) * 100;
            return (
              <Card key={cp.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{cp.packages?.name}</span>
                    <span className="text-sm text-muted-foreground">{cp.sessions_remaining}/{cp.total_sessions}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={pct} />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Purchased {new Date(cp.purchase_date).toLocaleDateString()}</span>
                    <Button size="sm" variant="outline" disabled={cp.sessions_remaining === 0} onClick={() => doUse(cp.id)}>
                      <MinusCircle className="h-3 w-3 mr-1" /> Use 1 session
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
