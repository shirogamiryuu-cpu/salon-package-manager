import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  applyPromotion,
  fetchActivePromoMap,
  formatDiscountLabel,
  type Promotion,
} from "@/lib/promotions";

export const Route = createFileRoute("/_authenticated/admin/packages")({
  component: PackagesAdmin,
});

type Pkg = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  total_sessions: number;
  points_awarded?: number;
  category_id: string | null;
};

type Category = { id: string; name: string; parent_id: string | null };

const empty = { name: "", price: 0, total_sessions: 1, category_id: "__none__" };
const NONE = "__none__";

function PackagesAdmin() {
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [promoMap, setPromoMap] = useState<Map<string, Promotion>>(new Map());
  const [cats, setCats] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Pkg | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const load = async () => {
    const { data } = await supabase
      .from("packages")
      .select("*")
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Pkg[];
    setPkgs(list);
    setPromoMap(await fetchActivePromoMap(list.map((p) => p.id)));
    const { data: cs } = await supabase
      .from("package_categories")
      .select("id,name,parent_id")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    setCats((cs ?? []) as Category[]);
  };
  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (p: Pkg) => {
    setEditing(p);
    setForm({ ...p, category_id: p.category_id ?? NONE });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: null,
        price: Number(form.price),
        total_sessions: 1,
        points_awarded: 0,
        image_url: null,
        category_id: form.category_id && form.category_id !== NONE ? form.category_id : null,
      };
      if (editing) {
        const { error } = await supabase.from("packages").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("packages").insert(payload);
        if (error) throw error;
      }

      toast.success(editing ? "Package updated" : "Package created");
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
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
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" />
              New package
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit" : "New"} package</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={form.category_id ?? NONE}
                  onValueChange={(v) => setForm({ ...form, category_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Uncategorized" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Uncategorized</SelectItem>
                    {cats.map((c) => {
                      const parent = c.parent_id ? cats.find((p) => p.id === c.parent_id) : null;
                      return (
                        <SelectItem key={c.id} value={c.id}>
                          {parent ? `${parent.name} / ${c.name}` : c.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Price per session</Label>
                <Input
                  type="number"
                  step="1000"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving || !form.name}>
                {saving ? "..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          type="search"
          placeholder="Search packages…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64 h-9"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-56 h-9">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="none">Uncategorized</SelectItem>
            {cats.map((c) => {
              const parent = c.parent_id ? cats.find((p) => p.id === c.parent_id) : null;
              return (
                <SelectItem key={c.id} value={c.id}>
                  {parent ? `${parent.name} / ${c.name}` : c.name}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {(search || categoryFilter !== "all") && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearch("");
              setCategoryFilter("all");
            }}
          >
            Clear
          </Button>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(() => {
          const q = search.trim().toLowerCase();
          const filtered = pkgs.filter((p) => {
            if (categoryFilter === "none" && p.category_id) return false;
            if (
              categoryFilter !== "all" &&
              categoryFilter !== "none" &&
              p.category_id !== categoryFilter
            )
              return false;
            if (q && !p.name.toLowerCase().includes(q)) return false;
            return true;
          });
          if (filtered.length === 0) {
            return <p className="text-muted-foreground">No packages match your filter.</p>;
          }
          return filtered.map((p) => {
            const promo = promoMap.get(p.id);
            const pricing = promo ? applyPromotion(Number(p.price), promo) : null;
            return (
              <Card key={p.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span>{p.name}</span>
                    {pricing ? (
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground line-through">
                          MMK {pricing.original.toFixed(0)}
                        </div>
                        <div className="text-base text-primary">
                          MMK {pricing.final.toFixed(0)}
                          <span className="text-xs text-muted-foreground font-normal">
                            {" "}
                            / session
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-base">
                        MMK {Number(p.price).toFixed(0)}
                        <span className="text-xs text-muted-foreground font-normal">
                          {" "}
                          / session
                        </span>
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {(() => {
                      const c = p.category_id ? cats.find((x) => x.id === p.category_id) : null;
                      const parent = c?.parent_id ? cats.find((x) => x.id === c.parent_id) : null;
                      return c ? (
                        <Badge variant="secondary">
                          {parent ? `${parent.name} / ${c.name}` : c.name}
                        </Badge>
                      ) : null;
                    })()}
                    {promo && (
                      <Badge className="bg-primary">
                        {formatDiscountLabel(promo)} · {promo.name}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          });
        })()}
      </div>
    </div>
  );
}
