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
import { Plus, Pencil, Trash2, FolderTree } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: CategoriesAdmin,
});

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
};

const NONE = "__none__";

function CategoriesAdmin() {
  const [cats, setCats] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<{ name: string; parent_id: string; sort_order: number }>({
    name: "",
    parent_id: NONE,
    sort_order: 0,
  });
  const [saving, setSaving] = useState(false);
  const [countsByCat, setCountsByCat] = useState<Record<string, number>>({});

  const load = async () => {
    const { data } = await supabase
      .from("package_categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    setCats((data ?? []) as Category[]);

    const { data: pkgs } = await supabase.from("packages").select("category_id");
    const counts: Record<string, number> = {};
    for (const p of pkgs ?? []) {
      if (p.category_id) counts[p.category_id] = (counts[p.category_id] ?? 0) + 1;
    }
    setCountsByCat(counts);
  };
  useEffect(() => {
    load();
  }, []);

  const openNew = (parent_id?: string | null) => {
    setEditing(null);
    setForm({ name: "", parent_id: parent_id ?? NONE, sort_order: 0 });
    setOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, parent_id: c.parent_id ?? NONE, sort_order: c.sort_order });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        parent_id: form.parent_id === NONE ? null : form.parent_id,
        sort_order: Number(form.sort_order) || 0,
      };
      if (editing) {
        if (payload.parent_id === editing.id) {
          throw new Error("A category cannot be its own parent");
        }
        const { error } = await supabase
          .from("package_categories")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("package_categories").insert(payload);
        if (error) throw error;
      }
      toast.success(editing ? "Category updated" : "Category created");
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Category) => {
    const childCount = cats.filter((x) => x.parent_id === c.id).length;
    const pkgCount = countsByCat[c.id] ?? 0;
    const msg =
      childCount || pkgCount
        ? `Delete "${c.name}"? ${childCount} subcategor${childCount === 1 ? "y" : "ies"} will also be removed and ${pkgCount} package(s) will be uncategorized.`
        : `Delete "${c.name}"?`;
    if (!confirm(msg)) return;
    const { error } = await supabase.from("package_categories").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const parents = cats.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => cats.filter((c) => c.parent_id === id);

  const parentOptions = cats.filter((c) => (editing ? c.id !== editing.id : true));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Service Categories</h1>
          <p className="text-sm text-muted-foreground">
            Organize your services into categories and subcategories. Assign them to packages on the
            Packages page.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openNew(null)}>
              <Plus className="h-4 w-4 mr-2" />
              New category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit" : "New"} category</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Hair, Chemicals, Scalp Rescue"
                />
              </div>
              <div>
                <Label>Parent category (optional)</Label>
                <Select
                  value={form.parent_id}
                  onValueChange={(v) => setForm({ ...form, parent_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None (top-level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None (top-level)</SelectItem>
                    {parentOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.parent_id
                          ? `${cats.find((p) => p.id === c.parent_id)?.name ?? ""} / ${c.name}`
                          : c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving || !form.name.trim()}>
                {saving ? "..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {parents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FolderTree className="mx-auto mb-3 h-8 w-8 opacity-60" />
            No categories yet. Create your first one to start grouping services.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {parents.map((p) => {
            const kids = childrenOf(p.id);
            return (
              <Card key={p.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span>{p.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {countsByCat[p.id] ?? 0} pkg
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(p)}>
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openNew(p.id)}>
                      <Plus className="h-3 w-3 mr-1" />
                      Sub
                    </Button>
                  </div>
                  {kids.length > 0 && (
                    <ul className="divide-y divide-border rounded-md border">
                      {kids.map((k) => (
                        <li
                          key={k.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                        >
                          <span>
                            {k.name}{" "}
                            <span className="text-xs text-muted-foreground">
                              ({countsByCat[k.id] ?? 0} pkg)
                            </span>
                          </span>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(k)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => remove(k)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
