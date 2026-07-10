import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Scissors, LogOut, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { SalonContactsButton } from "@/components/salon-contacts-button";

export type NavItem = { to: string; label: string; icon: LucideIcon };

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
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  const isActive = (to: string) =>
    pathname === to ||
    (to !== "/admin" && to !== "/app" && pathname.startsWith(to));

  return (
    <div className="min-h-svh bg-muted/40 md:flex md:justify-center">
      {/* Mobile: phone frame. Desktop: full app layout with sidebar */}
      <div className="relative w-full max-w-md md:max-w-6xl min-h-svh bg-background shadow-xl flex flex-col md:flex-row">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-background">
          <div className="flex h-16 items-center gap-2 px-5 border-b font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
              <Scissors className="h-4 w-4" />
            </span>
            <span className="truncate">{title}</span>
          </div>
          <nav className="flex-1 p-3 space-y-1">
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
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{n.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t space-y-1">
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

        {/* Main column */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Mobile top app bar */}
          <header className="md:hidden sticky top-0 z-20 bg-background/85 backdrop-blur border-b">
            <div className="flex h-14 items-center justify-between px-4">
              <div className="flex items-center gap-2 font-semibold min-w-0">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Scissors className="h-4 w-4" />
                </span>
                <span className="truncate">{title}</span>
              </div>
              <div className="flex items-center gap-1">
                <SalonContactsButton />
                <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 px-4 md:px-8 pt-4 md:pt-8 pb-28 md:pb-10">
            <div className="mx-auto w-full max-w-4xl">{children}</div>
          </main>
        </div>

        {/* Mobile bottom tab bar */}
        <nav
          className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md border-t bg-background/95 backdrop-blur z-30"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <ul className="grid" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0,1fr))` }}>
            {nav.map((n) => {
              const active = isActive(n.to);
              const Icon = n.icon;
              return (
                <li key={n.to}>
                  <Link
                    to={n.to}
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span
                      className={`grid h-9 w-12 place-items-center rounded-full transition-colors ${
                        active ? "bg-primary/10" : ""
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="truncate max-w-[80px]">{n.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
