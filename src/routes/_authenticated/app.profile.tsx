import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { normalizeMyanmarPhone } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/profile")({
  component: Profile,
});

function Profile() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("email,name,phone")
        .eq("id", u.user.id)
        .maybeSingle();
      setEmail(data?.email ?? u.user.email ?? "");
      setName(data?.name ?? "");
      setPhone(data?.phone ?? "");
    })();
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const cleanPhone = phone.trim() ? normalizeMyanmarPhone(phone) : null;
    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim() || null, phone: cleanPhone })
      .eq("id", u.user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      if (cleanPhone) setPhone(cleanPhone);
      toast.success("Profile updated");
    }
  };

  const changePassword = async () => {
    if (password.length < 6) return toast.error("Min 6 chars");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return toast.error(error.message);
    toast.success("Password changed");
    setPassword("");
  };

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>Contact info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={email} disabled />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09xxxxxxxxx"
            />
          </div>
          <Button onClick={saveProfile} disabled={saving}>
            Save
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>New password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button onClick={changePassword}>Update password</Button>
        </CardContent>
      </Card>
    </div>
  );
}
