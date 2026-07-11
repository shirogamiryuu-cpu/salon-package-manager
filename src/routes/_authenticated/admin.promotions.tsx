import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Power } from "lucide-react";
import { toast } from "sonner";
import { promotionStatus, type Promotion, type PromoStatus } from "@/lib/promotions";

export const Route = createFileRoute("/_authenticated/admin/promotions")({
  component: PromotionsAdmin,
});

type Pkg = { id: string; name: string };

type PromoRow = Promotion & { package_promotions: { package_id: string }[] };

const toLocal = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const emptyForm = () => ({
  name: "",
  description: "",
  discount_type: "percentage" as "percentage" | "fixed",
  discount_value: 10,
  start_date: toLocal(new Date().toISOString()),
  end_date: toLocal(new Date(Date.now() + 7 * 86400000).toISOString()),
  is_active: true,
  package_ids: [] as string[],
});

const statusVariant: Record<PromoStatus, "default" | "secondary" | "outline" | "destructive"> = {
  Active: "default",
  Scheduled: "secondary",
  Expired: "outline",
  Disabled: "destructive",
};

function PromotionsAdmin() {
  const [rows, setRows] = useState<PromoRow[]>([]);
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PromoRow | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const pkgMap = useMemo(() => new Map(pkgs.map((p) => [p.id, p.name])), [pkgs]);

  const load = async () => {
    const [{ data: promos }, { data: pkgData }] = await Promise.all([
      supabase
        .from("promotions")
        .select("*, package_promotions(package_id)")
        .order("created_at", { ascending: false }),
      supabase.from("packages").select("id,name").order("name"),
    ]);
    setRows((promos ?? []) as any);
    setPkgs((pkgData ?? []) as Pkg[]);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };
  const openEdit = (r: PromoRow) => {
    setEditing(r);
    setForm({
      name: r.name,
      description: r.description ?? "",
      discount_type: r.discount_type,
      discount_value: Number(r.discount_value),
      start_date: toLocal(r.start_date),
      end_date: toLocal(r.end_date),
      is_active: r.is_active,
      package_ids: r.package_promotions.map((pp) => pp.package_id),
    });
    setOpen(true);
  };

  const togglePkg = (id: string) => {
    setForm((f) => ({
      ...f,
      package_ids: f.package_ids.includes(id)
        ? f.package_ids.filter((x) => x !== id)
        : [...f.package_ids, id],
    }));
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (new Date(form.end_date) < new Date(form.start_date)) return toast.error("End date must be after start date");
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        is_active: form.is_active,
      };
      let promoId = editing?.id;
      if (editing) {
        const { error } = await supabase.from("promotions").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("promotions").insert(payload).select("id").single();
        if (error) throw error;
        promoId = data.id;
      }
      // Sync package assignments
      const existing = new Set(editing?.package_promotions.map((p) => p.package_id) ?? []);
      const next = new Set(form.package_ids);
      const toAdd = [...next].filter((id) => !existing.has(id));
      const toRemove = [...existing].filter((id) => !next.has(id));
      if (toRemove.length) {
        const { error } = await supabase
          .from("package_promotions")
          .delete()
          .eq("promotion_id", promoId!)
          .in("package_id", toRemove);
        if (error) throw error;
      }
      if (toAdd.length) {
        const { error } = await supabase
          .from("package_promotions")
          .insert(toAdd.map((package_id) => ({ promotion_id: promoId!, package_id })));
        if (error) throw error;
      }
      toast.success(editing ? "Promotion updated" : "Promotion created");
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally { setSaving(false); }
  };

  const toggleActive = async (r: PromoRow) => {
    const { error } = await supabase.from("promotions").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(!r.is_active ? "Enabled" : "Disabled");
    load();
  };

  const remove = async (r: PromoRow) => {
    if (!confirm(`Delete promotion "${r.name}"?`)) return;
    const { error } = await supabase.from("promotions").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Promotions</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Create discounts and assign them to packages.
        </p>
      </div>

      <Button className="w-full sm:w-auto" onClick={openNew}>
        <Plus className="h-4 w-4 mr-2" />
        Create Promotion
      </Button>
    </div>

    {/* Table Card */}
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="w-full overflow-x-auto">
          <Table className="min-w-[900px] sm:min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Packages</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((r) => {
                const status = promotionStatus(r);

                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {r.name}
                    </TableCell>

                    <TableCell className="capitalize whitespace-nowrap">
                      {r.discount_type}
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      {r.discount_type === "percentage"
                        ? `${Number(r.discount_value)}%`
                        : Number(r.discount_value).toLocaleString()}
                    </TableCell>

                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(r.start_date).toLocaleDateString()}
                    </TableCell>

                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(r.end_date).toLocaleDateString()}
                    </TableCell>

                    <TableCell>
                      <Badge variant={statusVariant[status]}>
                        {status}
                      </Badge>
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      <span className="text-sm">
                        {r.package_promotions.length}
                      </span>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 flex-wrap sm:flex-nowrap">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(r)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleActive(r)}
                        >
                          <Power className="h-4 w-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => remove(r)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground py-8"
                  >
                    No promotions yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    {/* Dialog */}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit promotion" : "Create promotion"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Promotion Name</Label>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Discount Type</Label>
            <RadioGroup
              className="flex flex-col sm:flex-row gap-3 mt-2"
              value={form.discount_type}
              onValueChange={(v) =>
                setForm({ ...form, discount_type: v as any })
              }
            >
              <label className="flex items-center gap-2">
                <RadioGroupItem value="percentage" />
                Percentage
              </label>

              <label className="flex items-center gap-2">
                <RadioGroupItem value="fixed" />
                Fixed Amount
              </label>
            </RadioGroup>
          </div>

          <div>
            <Label>
              Discount Value{" "}
              {form.discount_type === "percentage" ? "(%)" : ""}
            </Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.discount_value}
              onChange={(e) =>
                setForm({
                  ...form,
                  discount_value: Number(e.target.value),
                })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Input
                type="datetime-local"
                value={form.start_date}
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
              />
            </div>

            <div>
              <Label>End Date</Label>
              <Input
                type="datetime-local"
                value={form.end_date}
                onChange={(e) =>
                  setForm({ ...form, end_date: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">
                Only active promotions in date range apply.
              </p>
            </div>

            <Switch
              checked={form.is_active}
              onCheckedChange={(v) =>
                setForm({ ...form, is_active: v })
              }
            />
          </div>

          <div>
            <Label>Assign to Packages</Label>

            <div className="mt-2 rounded-md border divide-y max-h-56 overflow-y-auto">
              {pkgs.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">
                  No packages yet.
                </p>
              )}

              {pkgs.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox
                    checked={form.package_ids.includes(p.id)}
                    onCheckedChange={() => togglePkg(p.id)}
                  />
                  <span className="text-sm">{p.name}</span>
                </label>
              ))}
            </div>

            <p className="text-xs text-muted-foreground mt-1">
              A package can only be part of one active promotion in the
              same date range.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>

          <Button
            className="w-full sm:w-auto"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
);
}
