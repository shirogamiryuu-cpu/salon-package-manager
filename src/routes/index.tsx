import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Scissors, Sparkles, User, Baby } from "lucide-react";
import { PublicShell, SectionDivider } from "@/components/public-shell";
import logo from "@/public/EmpireCharme.png";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "EmpireCharme — Beautify with confidence" },
      {
        name: "description",
        content:
          "EmpireCharme is a Singapore hair, nails and beauty house. Discover our story, services and packages.",
      },
    ],
  }),
  component: Home,
});

const PILLARS = [
  { icon: Scissors, label: "Hair" },
  { icon: Sparkles, label: "Nails" },
  { icon: User, label: "Men" },
  { icon: Baby, label: "Kids" },
];

function Home() {
  return (
    <PublicShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <BackgroundPattern />
        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-6 py-28 text-center md:py-40">
          <img src={logo} alt="EmpireCharme" className="h-24 w-auto md:h-32 object-contain" />
          <p
            className="mt-10 text-xs uppercase text-primary"
            style={{ letterSpacing: "0.4em" }}
          >
            Est. Singapore
          </p>
          <h1
            className="mt-6 font-serif text-5xl leading-tight text-foreground md:text-7xl"
            style={{ letterSpacing: "0.18em" }}
          >
            BEAUTIFY
            <br />
            <span className="italic font-light text-primary">with confidence</span>
          </h1>
          <div className="mt-10 h-px w-24 bg-primary" />
          <p className="mt-8 max-w-xl text-base text-foreground/75 md:text-lg">
            An intimate atelier for hair, nails and quiet indulgence — where craftsmanship
            meets warm, unhurried service.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link to="/about">
              <Button
                className="rounded-none bg-primary text-primary-foreground uppercase px-8 py-6 hover:bg-primary/90"
                style={{ letterSpacing: "0.24em" }}
              >
                Our Story
              </Button>
            </Link>
            <Link to="/auth">
              <Button
                variant="outline"
                className="rounded-none border-foreground/40 text-foreground uppercase px-8 py-6 hover:bg-foreground hover:text-background"
                style={{ letterSpacing: "0.24em" }}
              >
                Client Portal
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* Pillars */}
      <section className="mx-auto w-full max-w-6xl px-6">
        <p
          className="text-center text-xs uppercase text-foreground/60"
          style={{ letterSpacing: "0.4em" }}
        >
          The House of Charme
        </p>
        <h2
          className="mt-4 text-center font-serif text-3xl md:text-4xl"
          style={{ letterSpacing: "0.18em" }}
        >
          FOUR DISCIPLINES
        </h2>
        <div className="mt-14 grid gap-px bg-foreground/20 md:grid-cols-4 border border-foreground/20">
          {PILLARS.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-6 bg-background px-6 py-14 text-center"
            >
              <span
                className="inline-flex h-16 w-16 items-center justify-center border border-primary"
                style={{ transform: "rotate(20deg)" }}
              >
                <Icon
                  className="h-6 w-6 text-primary"
                  style={{ transform: "rotate(-20deg)" }}
                  strokeWidth={1.25}
                />
              </span>
              <span
                className="text-sm uppercase text-foreground"
                style={{ letterSpacing: "0.32em" }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <SectionDivider />

      {/* Manifesto */}
      <section className="mx-auto grid w-full max-w-5xl gap-14 px-6 py-16 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-xs uppercase text-primary" style={{ letterSpacing: "0.32em" }}>
            About Us
          </p>
          <h2
            className="mt-4 font-serif text-4xl md:text-5xl"
            style={{ letterSpacing: "0.14em" }}
          >
            A quieter <br />
            <em className="text-primary font-light">kind of luxury.</em>
          </h2>
        </div>
        <div className="space-y-5 text-foreground/75">
          <p>
            EmpireCharme was founded on a simple belief: beauty should feel like a moment
            of clarity, never a performance. Every appointment is an invitation to slow
            down and be cared for by hands who know their craft.
          </p>
          <p>
            From a discreet address in Far East Plaza, our stylists compose treatments the
            way you would compose a wardrobe — with intention, restraint, and a signature
            you can call your own.
          </p>
          <Link
            to="/about"
            className="inline-block border-b border-primary pb-1 text-sm uppercase text-primary"
            style={{ letterSpacing: "0.28em" }}
          >
            Read our story →
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}

function BackgroundPattern() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]"
    >
      <defs>
        <pattern id="charme-dots" x="0" y="0" width="36" height="36" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">
          <circle cx="4" cy="4" r="1" fill="#B79A5C" />
          <line x1="18" y1="10" x2="26" y2="18" stroke="#B79A5C" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#charme-dots)" />
    </svg>
  );
}
