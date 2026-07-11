import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Sparkles, ShoppingBag, User, History, Bell, Home } from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";

function CustomerApp() {
  usePushNotifications();
  return (
    <AppShell
      title="Empire Charme"
      nav={[
        { to: "/home", label: "Home", icon: Home },
        { to: "/app", label: "My packages", icon: Sparkles },
        { to: "/app/notifications", label: "Notifications", icon: Bell },
        { to: "/app/history", label: "History", icon: History },
        { to: "/app/packages", label: "Available", icon: ShoppingBag },
        { to: "/app/profile", label: "Profile", icon: User },
      ]}
    >
      <Outlet />
    </AppShell>
  );
}

export const Route = createFileRoute("/_authenticated/app")({
  component: CustomerApp,
});
