import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Sparkles, ShoppingBag, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app")({
  component: () => (
    <AppShell
      title="Salon Manager"
      nav={[
        { to: "/app", label: "My packages", icon: Sparkles },
        { to: "/app/packages", label: "Available", icon: ShoppingBag },
        { to: "/app/profile", label: "Profile", icon: User },
      ]}
    >
      <Outlet />
    </AppShell>
  ),
});
