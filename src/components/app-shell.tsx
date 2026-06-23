import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Scissors, LogOut, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

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
    navigate({ to: "/auth", replace: true });
  };

  const isActive = (to: string) =>
    pathname === to ||
    (to !== "/admin" && to !== "/app" && pathname.startsWith(to));

  return (
    <div className="min-h-svh bg-muted/40 flex justify-center">
      <div className="relative w-full max-w-md min-h-svh bg-background shadow-xl flex flex-col">
        {/* Top app bar */}
        <header className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2 font-semibold">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground">
                <Scissors className="h-4 w-4" />
              </span>
              <span className="truncate">{title}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 pt-4 pb-28">{children}</main>

        {/* Bottom tab bar */}
        <nav
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md border-t bg-background/95 backdrop-blur z-30"
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
