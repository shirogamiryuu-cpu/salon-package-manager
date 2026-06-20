import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/app")({
  component: () => (
    <AppShell
      title="Salon Manager"
      nav={[
        { to: "/app", label: "My packages" },
        { to: "/app/packages", label: "Available" },
        { to: "/app/profile", label: "Profile" },
      ]}
    >
      <Outlet />
    </AppShell>
  ),
});
