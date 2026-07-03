import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { LayoutDashboard, Package, Users, History, Tag } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return navigate({ to: "/auth" });
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      const isAdmin = data?.some((r) => r.role === "admin");
      const isStaff = data?.some((r) => r.role === "staff");
      if (!isAdmin) {
        navigate({ to: isStaff ? "/staff" : "/app" });
        return;
      }
      setOk(true);
    })();
  }, [navigate]);

  if (!ok) return <div className="p-8 text-muted-foreground">Checking access...</div>;

  return (
    <AppShell
      title="Salon Admin"
      nav={[
        { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { to: "/admin/packages", label: "Packages", icon: Package },
        { to: "/admin/customers", label: "Customers", icon: Users },
        { to: "/admin/promotions", label: "Promotions", icon: Tag },
        { to: "/admin/history", label: "History", icon: History },
      ]}
    >
      <Outlet />
    </AppShell>
  );
}
