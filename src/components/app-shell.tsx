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
    <div className="min-h-svh bg-background">
      <div className="min-h-svh bg-background">
        {/* ===================== */}
        {/* Desktop Sidebar */}
        {/* ===================== */}
        <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-64 md:flex-col md:border-r md:border-foreground/15 md:bg-background">
          {/* Logo */}
          <div className="flex h-20 items-center gap-3 border-b border-foreground/15 px-6">
            <img src={logo} alt="EmpireCharme" className="h-12 w-auto max-h-12 object-contain" />
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {nav.map((n) => {
              const active = isActive(n.to);
              const Icon = n.icon;

              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-3 rounded-none border-l-2 px-4 py-3 text-sm uppercase transition-colors ${
                    active
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-foreground/70 hover:border-foreground/30 hover:text-foreground"
                  }`}
                  style={{ letterSpacing: "0.18em" }}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{n.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sign Out */}
          <div className="border-t border-foreground/15 p-4 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs uppercase text-foreground/60" style={{ letterSpacing: "0.18em" }}>
                Call the salon
              </span>
              <SalonContactsButton />
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 uppercase text-foreground/70 hover:text-foreground"
              style={{ letterSpacing: "0.16em" }}
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </aside>

        {/* ===================== */}
        {/* Main Content */}
        {/* ===================== */}
        <div className="flex min-h-svh flex-col md:ml-64">
          {/* Mobile Header */}
          <header className="sticky top-0 z-20 border-b border-foreground/15 bg-background/95 backdrop-blur md:hidden">
            <div className="flex h-16 items-center justify-between px-5">
              <div className="flex items-center gap-3">
                <img src={logo} alt="EmpireCharme" className="h-10 w-auto object-contain" />
              </div>

              <div className="flex items-center gap-1">
                <Button asChild variant="ghost" size="icon" aria-label="Notifications">
                  <Link to="/app/notifications">
                    <Bell className="h-5 w-5" />
                  </Link>
                </Button>
                <SalonContactsButton />
                <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </header>

          {/* Page */}
          <main className="flex-1 px-5 pt-6 pb-32 md:px-10 md:pt-10 md:pb-12">
            <div className="mx-auto w-full max-w-4xl">{children}</div>
          </main>
        </div>

        {/* ===================== */}
        {/* Mobile Bottom Nav */}
        {/* ===================== */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-foreground/15 bg-background/98 backdrop-blur md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="overflow-x-auto scrollbar-hide">
            <ul className="flex min-w-max items-stretch justify-around px-2 py-2">
              {mobileNav.map((n) => {
                const active = isActive(n.to);
                const Icon = n.icon;

                return (
                  <li key={n.to} className="shrink-0">
                    <Link
                      to={n.to}
                      className={`flex min-w-16 flex-col items-center justify-center gap-1 px-3 py-1.5 transition-colors ${
                        active ? "text-primary" : "text-foreground/55 hover:text-foreground"
                      }`}
                    >
                      <span className="flex h-9 w-9 items-center justify-center">
                        <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.5} />
                      </span>
                      <span
                        className="max-w-16 truncate text-[10px] uppercase"
                        style={{ letterSpacing: "0.16em" }}
                      >
                        {n.label}
                      </span>
                      {active && <span className="mt-0.5 h-px w-6 bg-primary" />}
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
