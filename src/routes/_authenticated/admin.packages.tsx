import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { applyPromotion, fetchActivePromoMap, formatDiscountLabel, type Promotion } from "@/lib/promotions";

export const Route = createFileRoute("/_authenticated/admin/packages")({
  component: PackagesAdmin,
});

type Pkg = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  total_sessions: number;
  points_awarded: number;
  image_url: string | null;
  first_time_price: number | null;
  category_id: string | null;
};

type Category = { id: string; name: string; parent_id: string | null };

type Variant = {
  id?: string;
  label: string;
  price: number | string;
  first_time_price: number | string | null;
};

const empty = { name: "", description: "", price: 0, total_sessions: 1, points_awarded: 0, image_url: "", first_time_price: "", category_id: "__none__" };
const NONE = "__none__";


function PackagesAdmin() {
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [variantsByPkg, setVariantsByPkg] = useState<Record<string, Variant[]>>({});
  const [promoMap, setPromoMap] = useState<Map<string, Promotion>>(new Map());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Pkg | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [removedVariantIds, setRemovedVariantIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("packages").select("*").order("created_at", { ascending: false });
    const list = (data ?? []) as Pkg[];
    setPkgs(list);
    setPromoMap(await fetchActivePromoMap(list.map((p) => p.id)));
    const { data: vs } = await supabase
      .from("package_variants")
      .select("id,package_id,label,price,first_time_price,sort_order")
      .order("sort_order", { ascending: true });
    const map: Record<string, Variant[]> = {};
    for (const v of (vs ?? []) as any[]) {
      (map[v.package_id] ||= []).push({ id: v.id, label: v.label, price: v.price, first_time_price: v.first_time_price });
    }
    setVariantsByPkg(map);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null); setForm(empty); setImageFile(null);
    setVariants([]); setRemovedVariantIds([]);
    setOpen(true);
  };
  const openEdit = (p: Pkg) => {
    setEditing(p); setForm(p); setImageFile(null);
    setVariants((variantsByPkg[p.id] ?? []).map((v) => ({ ...v })));
    setRemovedVariantIds([]);
    setOpen(true);
  };

  const addVariant = () => setVariants((vs) => [...vs, { label: "", price: "", first_time_price: "" }]);
  const removeVariant = (idx: number) => {
    setVariants((vs) => {
      const v = vs[idx];
      if (v.id) setRemovedVariantIds((r) => [...r, v.id!]);
      return vs.filter((_, i) => i !== idx);
    });
  };
  const updateVariant = (idx: number, patch: Partial<Variant>) =>
    setVariants((vs) => vs.map((v, i) => (i === idx ? { ...v, ...patch } : v)));

  const save = async () => {
    setSaving(true);
    try {
      let image_url = form.image_url || null;
      if (imageFile) {
        const path = `${Date.now()}-${imageFile.name}`;
        const { error: upErr } = await supabase.storage.from("package-images").upload(path, imageFile);
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from("package-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
        image_url = signed?.signedUrl ?? null;
      }
      const ftp = form.first_time_price === "" || form.first_time_price === null || form.first_time_price === undefined
        ? null
        : Number(form.first_time_price);
      const payload = {
        name: form.name,
        description: form.description || null,
        price: Number(form.price),
        total_sessions: 1,
        points_awarded: Number(form.points_awarded),
        image_url,
        first_time_price: ftp,
      };
      let pkgId = editing?.id;
      if (editing) {
        const { error } = await supabase.from("packages").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: ins, error } = await supabase.from("packages").insert(payload).select("id").single();
        if (error) throw error;
        pkgId = ins.id;
      }

      // Sync variants
      if (removedVariantIds.length) {
        const { error } = await supabase.from("package_variants").delete().in("id", removedVariantIds);
        if (error) throw error;
      }
      const cleaned = variants
        .map((v, i) => ({ ...v, sort_order: i }))
        .filter((v) => v.label.trim() !== "" && v.price !== "" && v.price !== null);
      for (const v of cleaned) {
        const row = {
          package_id: pkgId!,
          label: v.label.trim(),
          price: Number(v.price),
          first_time_price:
            v.first_time_price === "" || v.first_time_price === null || v.first_time_price === undefined
              ? null
              : Number(v.first_time_price),
          sort_order: (v as any).sort_order,
        };
        if (v.id) {
          const { error } = await supabase.from("package_variants").update(row).eq("id", v.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("package_variants").insert(row);
          if (error) throw error;
        }
      }

      toast.success(editing ? "Package updated" : "Package created");
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this package?")) return;
    const { error } = await supabase.from("packages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Packages</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New package</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} package</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Price per session</Label><Input type="number" step="1000" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                <div><Label>Points</Label><Input type="number" value={form.points_awarded} onChange={(e) => setForm({ ...form, points_awarded: e.target.value })} /></div>
              </div>
              <div>
                <Label>First-time session price (optional)</Label>
                <Input
                  type="number"
                  step="1000"
                  placeholder="e.g. 200 — leave blank to use regular price"
                  value={form.first_time_price ?? ""}
                  onChange={(e) => setForm({ ...form, first_time_price: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">Used when no matching variant first-time price is set.</p>
              </div>

              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Length / size variants (optional)</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addVariant}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  e.g. Short MMK 408, Medium MMK 428, Long MMK 448. When set, admin picks a variant when assigning to a customer and its price overrides the base price.
                </p>
                {variants.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No variants — package uses the base price above.</p>
                )}
                {variants.map((v, i) => (
                  <div key={i} className="grid grid-cols-[1fr_100px_110px_auto] gap-2 items-center">
                    <Input
                      placeholder="Label (e.g. Short hair)"
                      value={v.label}
                      onChange={(e) => updateVariant(i, { label: e.target.value })}
                    />
                    <Input
                      type="number"
                      step="1000"
                      placeholder="Price"
                      value={v.price as any}
                      onChange={(e) => updateVariant(i, { price: e.target.value })}
                    />
                    <Input
                      type="number"
                      step="1000"
                      placeholder="1st-time MMK"
                      value={(v.first_time_price ?? "") as any}
                      onChange={(e) => updateVariant(i, { first_time_price: e.target.value })}
                    />
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeVariant(i)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div><Label>Image</Label><Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving || !form.name}>{saving ? "..." : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pkgs.map((p) => {
          const promo = promoMap.get(p.id);
          const pricing = promo ? applyPromotion(Number(p.price), promo) : null;
          const vs = variantsByPkg[p.id] ?? [];
          return (
          <Card key={p.id}>
            {p.image_url && <img src={p.image_url} alt={p.name} className="h-32 w-full object-cover rounded-t-md" />}
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span>{p.name}</span>
                {vs.length > 0 ? (
                  <span className="text-base">
                    MMK {Math.min(...vs.map((v) => Number(v.price))).toFixed(2)}
                    {" – "}
                    MMK {Math.max(...vs.map((v) => Number(v.price))).toFixed(2)}
                    <span className="text-xs text-muted-foreground font-normal"> / session</span>
                  </span>
                ) : pricing ? (
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground line-through">MMK {pricing.original.toFixed(2)}</div>
                    <div className="text-base text-primary">MMK {pricing.final.toFixed(2)}<span className="text-xs text-muted-foreground font-normal"> / session</span></div>
                  </div>
                ) : (
                  <span className="text-base">MMK {Number(p.price).toFixed(2)}<span className="text-xs text-muted-foreground font-normal"> / session</span></span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
              {vs.length > 0 && (
                <div className="flex flex-wrap gap-1 text-xs">
                  {vs.map((v, i) => (
                    <Badge key={i} variant="secondary">{v.label} MMK {Number(v.price).toFixed(2)}</Badge>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                {promo && <Badge className="bg-primary">{formatDiscountLabel(promo)} · {promo.name}</Badge>}
                <Badge variant="outline">+{p.points_awarded} pts</Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-3 w-3 mr-1" />Delete</Button>
              </div>
            </CardContent>
          </Card>
          );
        })}
        {pkgs.length === 0 && <p className="text-muted-foreground">No packages yet.</p>}
      </div>
    </div>
  );
}
