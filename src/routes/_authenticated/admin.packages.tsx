import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
};

const empty = { name: "", description: "", price: 0, total_sessions: 1, points_awarded: 0, image_url: "" };


function PackagesAdmin() {
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Pkg | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("packages").select("*").order("created_at", { ascending: false });
    setPkgs((data ?? []) as Pkg[]);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setImageFile(null); setOpen(true); };
  const openEdit = (p: Pkg) => { setEditing(p); setForm(p); setImageFile(null); setOpen(true); };

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
      const payload = {
        name: form.name,
        description: form.description || null,
        price: Number(form.price),
        total_sessions: Number(form.total_sessions),
        points_awarded: Number(form.points_awarded),
        image_url,
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
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} package</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Price</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                <div><Label>Sessions</Label><Input type="number" value={form.total_sessions} onChange={(e) => setForm({ ...form, total_sessions: e.target.value })} /></div>
                <div><Label>Points</Label><Input type="number" value={form.points_awarded} onChange={(e) => setForm({ ...form, points_awarded: e.target.value })} /></div>
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
        {pkgs.map((p) => (
          <Card key={p.id}>
            {p.image_url && <img src={p.image_url} alt={p.name} className="h-32 w-full object-cover rounded-t-md" />}
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{p.name}</span>
                <span className="text-base">${Number(p.price).toFixed(2)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
              <div className="flex gap-2 text-xs">
                <Badge variant="secondary">{p.total_sessions} sessions</Badge>
                <Badge variant="outline">+{p.points_awarded} pts</Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-3 w-3 mr-1" />Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {pkgs.length === 0 && <p className="text-muted-foreground">No packages yet.</p>}
      </div>
    </div>
  );
}
