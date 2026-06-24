import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Scissors, Sparkles, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Salon Package Manager" },
      { name: "description", content: "Manage salon service packages, sessions, and loyalty points." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setChecking(false);
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id);
      const isAdmin = roles?.some((r) => r.role === "admin");
      navigate({ to: isAdmin ? "/admin" : "/app", replace: true });
    })();
  }, [navigate]);

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold">
            <Scissors className="h-5 w-5" />
            Salon Manager
          </div>
          <Link to="/auth">
            <Button variant="outline" size="sm">Sign in</Button>
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold tracking-tight">Your salon, in your pocket</h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          See your remaining sessions, track loyalty points, and browse packages from your favourite salon.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/auth"><Button size="lg">Sign in / Sign up</Button></Link>
        </div>
        <div className="mt-20 grid gap-6 md:grid-cols-3 text-left">
          {[
            { icon: Sparkles, title: "Your packages", body: "Check how many sessions you have left at a glance." },
            { icon: Users, title: "Loyalty points", body: "Earn points with every package and watch them grow." },
            { icon: Scissors, title: "Browse offers", body: "Discover packages the salon currently offers." },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border bg-card p-6">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
