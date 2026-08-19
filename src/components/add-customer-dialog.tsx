import { useState } from "react";
import { useServerFn } from "@/lib/server-fn";
import { adminCreateCustomer } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Download, UserPlus } from "lucide-react";
import { generateLoginSheetPdf } from "@/lib/login-sheet-pdf";

function genTempPassword() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6) + "!9";
}

export function AddCustomerDialog({ onCreated }: { onCreated?: () => void }) {
  const createCustomer = useServerFn(adminCreateCustomer);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [points, setPoints] = useState("");
  const [password, setPassword] = useState(genTempPassword());
  const [created, setCreated] = useState<{ phone: string; password: string; name?: string } | null>(
    null,
  );

  function reset() {
    setName("");
    setPhone("");
    setPoints("");
    setPassword(genTempPassword());
    setCreated(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return toast.error("Phone is required");
    setSaving(true);
    try {
      const res = await createCustomer({
        data: {
          phone: phone.trim(),
          name: name.trim() || undefined,
          password,
          points: points ? Number(points) : undefined,
        },
      });
      const tmp = (res as { tempPassword?: string })?.tempPassword ?? password;
      setCreated({ phone: phone.trim(), password: tmp, name: name.trim() || undefined });
      toast.success("Customer account created");
      onCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create customer");
    } finally {
      setSaving(false);
    }
  }

  const copy = () => {
    if (!created) return;
    navigator.clipboard
      ?.writeText(`Login: ${created.phone}\nPassword: ${created.password}`)
      .then(() => toast.success("Credentials copied"))
      .catch(() => toast.error("Copy failed"));
  };

  const downloadSheet = () => {
    if (!created) return;
    try {
      generateLoginSheetPdf({
        name: created.name,
        phone: created.phone,
        password: created.password,
        siteUrl: typeof window !== "undefined" ? window.location.origin : undefined,
      });
      toast.success("Login sheet downloaded");
    } catch {
      toast.error("Could not generate PDF");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </DialogTrigger>

      <DialogContent>
        {created ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Account ready</DialogTitle>
              <DialogDescription>
                Give these details to the customer. They can sign in with the phone number and this
                temporary password.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-md border p-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Login (phone)</span>
                <span className="font-medium">{created.phone}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Temporary password</span>
                <span className="font-mono font-medium">{created.password}</span>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={copy}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              <Button type="button" variant="outline" onClick={downloadSheet}>
                <Download className="mr-2 h-4 w-4" />
                Login sheet (PDF)
              </Button>
              <Button type="button" variant="secondary" onClick={reset}>
                Add another
              </Button>
              <Button type="button" onClick={() => setOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Create customer account</DialogTitle>
              <DialogDescription>
                Instantly create an account for a customer who can't sign up themselves. Only a phone
                number is required.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="acd-name">Name</Label>
                <Input
                  id="acd-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acd-phone">Phone</Label>
                <Input
                  id="acd-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09xxxxxxxxx"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acd-points">Starting points</Label>
                <Input
                  id="acd-points"
                  type="number"
                  min={0}
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acd-pass">Temporary password</Label>
                <div className="flex gap-2">
                  <Input
                    id="acd-pass"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button type="button" variant="outline" onClick={() => setPassword(genTempPassword())}>
                    New
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create account"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
