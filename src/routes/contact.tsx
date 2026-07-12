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
          "Visit EmpireCharme in Yankin, Yangon. Find our location, opening hours and contact information.",
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
          WE LOOK
          <br />
          <em className="font-light text-primary">forward to welcoming you.</em>
        </h1>

        <div className="mx-auto mt-10 h-px w-16 bg-primary" />

        <p className="mx-auto mt-10 max-w-2xl text-foreground/75 leading-loose">
          Visit EmpireCharme for premium hair, scalp, nail and beauty services.
          Our experienced team is ready to help you achieve healthy, beautiful
          results in a relaxing and welcoming environment.
        </p>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 md:grid-cols-2">
        <div className="space-y-8 border border-foreground/25 p-10">
          <Row icon={MapPin} title="Address">
            EmpireCharme
            <br />
            R5HC+H78, Moe Kaung Road
            <br />
            Yankin Township, Yangon
          </Row>

          <div className="h-px bg-foreground/15" />

          <Row icon={Phone} title="Phone">
            <a href="tel:+959779980556" className="hover:text-primary">
              09 779 980556
            </a>
          </Row>

          <div className="h-px bg-foreground/15" />

          <Row icon={Clock} title="Opening Hours">
            Daily · 10:00 AM – Until Close
          </Row>

          <div className="h-px bg-foreground/15" />

          <Row icon={Instagram} title="Instagram">
            Contact us for our latest updates.
          </Row>

          <div className="h-px bg-foreground/15" />

          <Row icon={Facebook} title="Facebook">
            Empire Charme
          </Row>
        </div>

        <div className="min-h-[420px] overflow-hidden border border-foreground/25">
          <iframe
            title="EmpireCharme"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3818.9485215174864!2d96.16813777461525!3d16.828909718654597!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30c19348fcb1d3d7%3A0x3eca2c155c1ce7d0!2sEmpire%20Charme!5e0!3m2!1sen!2smm!4v1783820595125!5m2!1sen!2smm"
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
          Sign in to your EmpireCharme packages and loyalty rewards.
        </p>

        <Link to="/auth">
          <Button
            className="rounded-none bg-primary px-10 py-6 uppercase text-primary-foreground hover:bg-primary/90"
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

        <div className="mt-2 text-sm leading-loose text-foreground/85">
          {children}
        </div>
      </div>
    </div>
  );
}