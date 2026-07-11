import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bell, LogOut, type LucideIcon } from "lucide-react";
import logo from "@/public/EmpireCharme.png";
import type { ReactNode } from "react";
import { SalonContactsButton } from "@/components/salon-contacts-button";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

export function AppShell({
  title,
  nav,
  children,
}: {
  title: string;
  nav: NavItem[];
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  const isActive = (to: string) =>
    pathname === to || (to !== "/admin" && to !== "/app" && pathname.startsWith(to));

  // Hide notifications from the mobile bottom navigation
  const mobileNav = nav.filter((item) => item.to !== "/app/notifications");

  return (
    <div className="min-h-svh bg-muted/40">
      <div className="min-h-svh bg-background">
        {/* ===================== */}
        {/* Desktop Sidebar */}
        {/* ===================== */}
        <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-64 md:flex-col md:border-r md:border-muted/30 md:bg-background">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-muted/30 px-5 font-semibold">
            <img src={logo} alt="EmpireCharme" className="h-12 w-auto max-h-12 object-contain" />
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {nav.map((n) => {
              const active = isActive(n.to);
              const Icon = n.icon;

              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{n.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sign Out */}
          <div className="border-t border-muted/30 p-3 space-y-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-muted-foreground">Call the salon</span>
              <SalonContactsButton />
            </div>
            <Button variant="ghost" className="w-full justify-start gap-3" onClick={signOut}>
              <LogOut className="h-5 w-5" />
              Sign out
            </Button>
          </div>
        </aside>

        {/* ===================== */}
        {/* Main Content */}
        {/* ===================== */}
        <div className="flex min-h-svh flex-col md:ml-64">
          {/* Mobile Header */}
          <header className="sticky top-0 z-20 border-b border-muted/30 bg-background/85 backdrop-blur md:hidden">
            <div className="flex h-14 items-center justify-between px-4">
              <div className="flex items-center gap-3 font-semibold">
                <img src={logo} alt="EmpireCharme" className="h-10 w-auto object-contain" />
              </div>

              <div className="flex items-center gap-1">
                {/* Notification */}
                <Button asChild variant="ghost" size="icon" aria-label="Notifications">
                  <Link to="/app/notifications">
                    <Bell className="h-5 w-5" />
                  </Link>
                </Button>

                {/* Sign Out */}
                <div className="flex items-center gap-1">
                  <SalonContactsButton />
                  <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
                    <LogOut className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* Page */}
          <main className="flex-1 px-4 pt-4 pb-28 md:px-8 md:pt-8 md:pb-10">
            <div className="mx-auto w-full max-w-4xl">{children}</div>
          </main>
        </div>

        {/* ===================== */}
        {/* Mobile Bottom Nav */}
        {/* ===================== */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-muted/30 bg-background/95 backdrop-blur md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="overflow-x-auto scrollbar-hide">
            <ul className="flex min-w-max items-center justify-around px-3 py-1">
              {mobileNav.map((n) => {
                const active = isActive(n.to);
                const Icon = n.icon;

                return (
                  <li key={n.to} className="shrink-0">
                    <Link
                      to={n.to}
                      className={`flex min-w-18 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 transition-colors ${
                        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                          active ? "bg-primary/10" : ""
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>

                      <span className="max-w-18 truncate text-[11px] font-medium">
                        {n.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </div>
    </div>
  );
}
