import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Scissors, Sparkles, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Salon Package Manager" },
      { name: "description", content: "Manage salon service packages, sessions, and loyalty points." },
    ],
  }),
  component: Landing,
});

function Landing() {
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
        <h1 className="text-5xl font-bold tracking-tight">Manage your salon packages, beautifully</h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Sell service packages, track customer sessions, and reward loyalty — all in one place.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/auth"><Button size="lg">Get started</Button></Link>
        </div>
        <div className="mt-20 grid gap-6 md:grid-cols-3 text-left">
          {[
            { icon: Sparkles, title: "Service packages", body: "Create packages with sessions and loyalty points." },
            { icon: Users, title: "Customer profiles", body: "Track each customer's remaining sessions and points." },
            { icon: Scissors, title: "Session tracking", body: "One click to deduct a session when a customer visits." },
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
