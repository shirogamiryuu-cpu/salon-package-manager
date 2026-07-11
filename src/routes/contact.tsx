import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell, SectionDivider } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, Clock, Instagram, Facebook } from "lucide-react";

export const Route = createFileRoute("/contact")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Contact — EmpireCharme" },
      {
        name: "description",
        content:
          "Visit EmpireCharme at Far East Plaza, Singapore. Opening hours, phone and socials.",
      },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <PublicShell>
      <section className="mx-auto w-full max-w-4xl px-6 py-24 text-center">
        <p
          className="text-xs uppercase text-primary"
          style={{ letterSpacing: "0.4em" }}
        >
          Visit Us
        </p>
        <h1
          className="mt-6 font-serif text-4xl md:text-6xl"
          style={{ letterSpacing: "0.18em" }}
        >
          COME
          <br />
          <em className="text-primary font-light">by the atelier.</em>
        </h1>
        <div className="mx-auto mt-10 h-px w-16 bg-primary" />
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 md:grid-cols-2">
        <div className="space-y-8 border border-foreground/25 p-10">
          <Row icon={MapPin} title="Address">
            14 Scotts Road #04-105
            <br />
            Far East Plaza
            <br />
            Singapore 228 213
          </Row>
          <div className="h-px bg-foreground/15" />
          <Row icon={Phone} title="Phone">
            <a href="tel:+6567336958" className="hover:text-primary">
              (65) 6733 6958
            </a>
          </Row>
          <div className="h-px bg-foreground/15" />
          <Row icon={Clock} title="Opening Hours">
            Mon – Fri · 11:30 – 20:30
            <br />
            Sat, Sun, PH · 11:30 – 19:30
          </Row>
          <div className="h-px bg-foreground/15" />
          <Row icon={Instagram} title="Instagram">
            @bellusdecharme
          </Row>
          <div className="h-px bg-foreground/15" />
          <Row icon={Facebook} title="Facebook">
            /beautifullycharme
          </Row>
        </div>

        <div className="min-h-[420px] border border-foreground/25 overflow-hidden">
          <iframe
            title="EmpireCharme location"
            src="https://www.google.com/maps?q=Far+East+Plaza+Singapore+14+Scotts+Road&output=embed"
            className="h-full w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      <SectionDivider />

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 pb-16 text-center">
        <h2
          className="font-serif text-3xl md:text-4xl"
          style={{ letterSpacing: "0.18em" }}
        >
          ALREADY A GUEST?
        </h2>
        <p className="text-foreground/75">
          Sign in to view your packages, sessions and loyalty points.
        </p>
        <Link to="/auth">
          <Button
            className="rounded-none bg-primary text-primary-foreground uppercase px-10 py-6 hover:bg-primary/90"
            style={{ letterSpacing: "0.24em" }}
          >
            Client Portal
          </Button>
        </Link>
      </section>
    </PublicShell>
  );
}

function Row({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Phone;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-5">
      <span
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center border border-primary"
        style={{ transform: "rotate(20deg)" }}
      >
        <Icon
          className="h-4 w-4 text-primary"
          style={{ transform: "rotate(-20deg)" }}
          strokeWidth={1.5}
        />
      </span>
      <div>
        <p
          className="text-[11px] uppercase text-foreground/60"
          style={{ letterSpacing: "0.28em" }}
        >
          {title}
        </p>
        <div className="mt-2 text-sm text-foreground/85 leading-loose">
          {children}
        </div>
      </div>
    </div>
  );
}
