import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
export const Route = createFileRoute("/_authenticated/admin/contacts")({
  component: ContactsAdmin,
});
type Contact = {
  id: string;
  label: string;
  phone: string;
  sort_order: number;
  is_active: boolean;
};
const empty = { label: "", phone: "", sort_order: 0, is_active: true };
function ContactsAdmin() {
  const [rows, setRows] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const load = async () => {
    const { data, error } = await supabase
      .from("salon_contacts")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) return toast.error(error.message);
    setRows((data ?? []) as Contact[]);
  };
  useEffect(() => {
    load();
  }, []);
  const openNew = () => {
    setEditing(null);
    setForm({ ...empty, sort_order: rows.length });
    setOpen(true);
  };
  const openEdit = (c: Contact) => {
    setEditing(c);
    setForm(c);
    setOpen(true);
  };
  const save = async () => {
    if (!form.label.trim() || !form.phone.trim()) {
      return toast.error("Label and phone required");
    }
    setSaving(true);
    const payload = {
      label: form.label.trim(),
      phone: form.phone.trim(),
      sort_order: Number(form.sort_order) || 0,
      is_active: !!form.is_active,
    };
    const { error } = editing
      ? await supabase.from("salon_contacts").update(payload).eq("id", editing.id)
      : await supabase.from("salon_contacts").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Updated" : "Added");
    setOpen(false);
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this contact?")) return;
    const { error } = await supabase.from("salon_contacts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Salon contacts</h1>
          <p className="text-sm text-muted-foreground">
            Phone numbers shown in the "Call the salon" dropdown.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" />
              New contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit" : "New"} contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Label</Label>
                <Input
                  placeholder="e.g. Reception"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  placeholder="+852 1234 5678"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label>Active</Label>
                <Switch
                  checked={!!form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-3">
        {rows.map((c) => (
          <Card key={c.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span>
                  {c.label}
                  {!c.is_active && (
                    <span className="ml-2 text-xs text-muted-foreground">(hidden)</span>
                  )}
                </span>
                <span className="text-sm font-normal text-muted-foreground">#{c.sort_order}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <a href={`tel:${c.phone.replace(/\s+/g, "")}`} className="text-primary">
                {c.phone}
              </a>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(c.id)}>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && <p className="text-muted-foreground">No contacts yet.</p>}
      </div>
    </div>
  );
}
