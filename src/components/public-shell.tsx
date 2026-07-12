import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import logo from "@/public/EmpireCharme.png";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/contact", label: "Contact" },
] as const;

export function PublicShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        if (mounted) setChecking(false);
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id);

      const isAdmin = roles?.some((r) => r.role === "admin");
      const isStaff = roles?.some((r) => r.role === "staff");

      const to = isAdmin ? "/admin" : isStaff ? "/staff" : "/app";

      if (mounted) navigate({ to, replace: true });
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (checking) {
    return (
      <div
        className="min-h-svh flex items-center justify-center text-foreground/60"
        style={{ letterSpacing: "0.2em" }}
      >
        Loading EmpireCharme...
      </div>
    );
  }

  return (
    <div className="min-h-svh flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-foreground/20 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logo}
              alt="EmpireCharme"
              className="h-12 w-auto object-contain"
            />
          </Link>

          <nav className="hidden items-center gap-10 md:flex">
            {NAV.map((n) => {
              const active = pathname === n.to;

              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`text-xs uppercase transition-colors ${
                    active
                      ? "text-primary"
                      : "text-foreground/70 hover:text-foreground"
                  }`}
                  style={{ letterSpacing: "0.24em" }}
                >
                  <span className="inline-flex flex-col items-center">
                    {n.label}
                    <span
                      className={`mt-1 h-px w-full ${
                        active ? "bg-primary" : "bg-transparent"
                      }`}
                    />
                  </span>
                </Link>
              );
            })}
          </nav>

          <Link to="/auth">
            <Button
              variant="outline"
              className="rounded-none border-primary uppercase text-primary hover:bg-primary hover:text-primary-foreground"
              style={{ letterSpacing: "0.22em" }}
            >
              Sign In
            </Button>
          </Link>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex items-center justify-center gap-6 border-t border-foreground/15 py-3 md:hidden">
          {NAV.map((n) => {
            const active = pathname === n.to;

            return (
              <Link
                key={n.to}
                to={n.to}
                className={`text-[10px] uppercase ${
                  active ? "text-primary" : "text-foreground/60"
                }`}
                style={{ letterSpacing: "0.22em" }}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="mt-24 border-t border-foreground/20">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-14 md:grid-cols-4">
          <div>
            <img
              src={logo}
              alt="EmpireCharme"
              className="h-14 w-auto object-contain"
            />

            <p
              className="mt-4 text-xs uppercase text-foreground/60"
              style={{ letterSpacing: "0.24em" }}
            >
              healthy hair • beautiful confidence
            </p>
          </div>

          <FooterCol title="Visit">
            EmpireCharme
            <br />
            R5HC+H78, Moe Kaung Road
            <br />
            Yankin Township, Yangon
          </FooterCol>

          <FooterCol title="Hours">
            Daily · Opens 10:00 AM
            <br />
            Premium Hair & Beauty Services
          </FooterCol>

          <FooterCol title="Contact">
            09 779 980556
            <br />
            Yangon, Myanmar
            <br />
            Hair • Nails • Beauty
          </FooterCol>
        </div>

        <div
          className="border-t border-foreground/15 py-5 text-center text-[10px] uppercase text-foreground/50"
          style={{ letterSpacing: "0.3em" }}
        >
          © {new Date().getFullYear()} EmpireCharme · All rights reserved
        </div>
      </footer>
    </div>
  );
}

function FooterCol({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h4
        className="text-[11px] uppercase text-primary"
        style={{ letterSpacing: "0.28em" }}
      >
        {title}
      </h4>

      <div className="mt-4 h-px w-8 bg-primary" />

      <p className="mt-4 text-sm leading-loose text-foreground/75">
        {children}
      </p>
    </div>
  );
}

export function SectionDivider() {
  return (
    <div className="mx-auto my-16 flex w-full max-w-6xl items-center gap-6 px-6">
      <div className="h-px flex-1 bg-foreground/25" />

      <div
        className="h-6 w-px bg-primary"
        style={{ transform: "rotate(20deg)" }}
        aria-hidden
      />

      <div className="h-px flex-1 bg-foreground/25" />
    </div>
  );
}