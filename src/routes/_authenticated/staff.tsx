import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { ClipboardList, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/staff")({
  component: StaffLayout,
});

function StaffLayout() {
  const navigate = useNavigate();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return navigate({ to: "/auth" });
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      const isStaff = data?.some((r) => r.role === "staff");
      const isAdmin = data?.some((r) => r.role === "admin");
      if (!isStaff && !isAdmin) {
        navigate({ to: "/app" });
        return;
      }
      setOk(true);
    })();
  }, [navigate]);

  if (!ok) return <div className="p-8 text-muted-foreground">Checking access...</div>;

  return (
    <AppShell
      title="My Work"
      nav={[
        { to: "/staff", label: "Sessions", icon: ClipboardList },
        { to: "/app/profile", label: "Profile", icon: User },
      ]}
    >
      <Outlet />
    </AppShell>
  );
}
