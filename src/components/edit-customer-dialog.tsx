import { useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { normalizeMyanmarPhone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface EditCustomerDialogProps {
  customer: { id: string; name: string | null; phone: string | null };
  onSaved: () => void;
}

export function EditCustomerDialog({ customer, onSaved }: EditCustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(customer.name ?? "");
  const [phone, setPhone] = useState(customer.phone ?? "");

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setName(customer.name ?? "");
      setPhone(customer.phone ?? "");
    }
    setOpen(next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = normalizeMyanmarPhone(phone);
    if (cleanPhone && cleanPhone.length < 5) {
      return toast.error("Please enter a valid phone number (09...)");
    }
    setSaving(true);
    try {
      if (cleanPhone) {
        const digits = cleanPhone.replace(/[^0-9]/g, "");
        const { data: others, error: lookupError } = await supabase
          .from("profiles")
          .select("id,phone")
          .not("phone", "is", null)
          .neq("id", customer.id);
        if (lookupError) throw lookupError;
        const taken = (others ?? []).some(
          (p) => String(p.phone ?? "").replace(/[^0-9]/g, "") === digits,
        );
        if (taken) throw new Error("A customer with this phone number already exists");
      }
      const { error } = await supabase
        .from("profiles")
        .update({ name: name.trim() || null, phone: cleanPhone || null })
        .eq("id", customer.id);
      if (error) throw error;
      toast.success("Customer updated");
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          title="Edit customer"
          onClick={(e) => e.stopPropagation()}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Edit customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`edit-name-${customer.id}`}>Name</Label>
            <Input
              id={`edit-name-${customer.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-phone-${customer.id}`}>Phone</Label>
            <Input
              id={`edit-phone-${customer.id}`}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
