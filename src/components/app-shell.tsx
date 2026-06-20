import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Scissors, LogOut } from "lucide-react";
import type { ReactNode } from "react";

export function AppShell({
  title,
  nav,
  children,
}: {
  title: string;
  nav: { to: string; label: string }[];
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 font-semibold">
              <Scissors className="h-4 w-4" />
              {title}
            </div>
            <nav className="hidden md:flex gap-1">
              {nav.map((n) => {
                const active = pathname === n.to || (n.to !== "/admin" && n.to !== "/app" && pathname.startsWith(n.to));
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`px-3 py-1.5 rounded-md text-sm ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
        <nav className="md:hidden border-t flex gap-1 px-2 py-2 overflow-x-auto">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="px-3 py-1.5 rounded-md text-sm whitespace-nowrap hover:bg-accent">
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
