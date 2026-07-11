import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell, SectionDivider } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
import { Scissors, Sparkles, User, Baby, type LucideIcon } from "lucide-react";

export const Route = createFileRoute("/services")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Services — EmpireCharme" },
      {
        name: "description",
        content:
          "Hair, nails, men's grooming and children's care at EmpireCharme. Signature treatments composed by our senior stylists.",
      },
    ],
  }),
  component: Services,
});

type Service = {
  icon: LucideIcon;
  title: string;
  body: string;
  items: string[];
};

const SERVICES: Service[] = [
  {
    icon: Scissors,
    title: "Hair",
    body: "Precision cutting, colour composition and restorative rituals for hair that behaves itself between visits.",
    items: ["Signature Cut", "Colour Composition", "Keratin Restoration", "Bridal Styling"],
  },
  {
    icon: Sparkles,
    title: "Nails",
    body: "A slow, seated ritual — hands and feet treated with the same reverence as a couture fitting.",
    items: ["Classic Manicure", "Gel Extension", "Spa Pedicure", "Nail Art Atelier"],
  },
  {
    icon: User,
    title: "Men",
    body: "A private corner for the discerning gentleman. Sharp lines, hot towels, and no small talk unless invited.",
    items: ["Executive Cut", "Beard Sculpting", "Hot Towel Shave", "Scalp Therapy"],
  },
  {
    icon: Baby,
    title: "Kids",
    body: "First haircuts and playful trims in a room that welcomes small guests without disturbing the atelier's calm.",
    items: ["First Haircut", "Junior Trim", "Party Braids", "Gentle Wash"],
  },
];

function Services() {
  return (
    <PublicShell>
      <section className="mx-auto w-full max-w-4xl px-6 py-24 text-center">
        <p
          className="text-xs uppercase text-primary"
          style={{ letterSpacing: "0.4em" }}
        >
          What We Do
        </p>
        <h1
          className="mt-6 font-serif text-4xl md:text-6xl"
          style={{ letterSpacing: "0.18em" }}
        >
          FOUR ROOMS,
          <br />
          <em className="text-primary font-light">one signature.</em>
        </h1>
        <div className="mx-auto mt-10 h-px w-16 bg-primary" />
        <p className="mx-auto mt-10 max-w-xl text-foreground/75 leading-loose">
          Every service is composed by a senior stylist and delivered on your schedule —
          never rushed, never repeated by rote.
        </p>
      </section>

      <SectionDivider />

      <section className="mx-auto w-full max-w-6xl px-6">
        <div className="grid gap-px border border-foreground/20 bg-foreground/20 md:grid-cols-2">
          {SERVICES.map(({ icon: Icon, title, body, items }) => (
            <article
              key={title}
              className="flex flex-col gap-6 bg-background p-10"
            >
              <div className="flex items-center gap-5">
                <span
                  className="inline-flex h-14 w-14 items-center justify-center border border-primary"
                  style={{ transform: "rotate(20deg)" }}
                >
                  <Icon
                    className="h-6 w-6 text-primary"
                    style={{ transform: "rotate(-20deg)" }}
                    strokeWidth={1.25}
                  />
                </span>
                <h2
                  className="font-serif text-3xl"
                  style={{ letterSpacing: "0.2em" }}
                >
                  {title.toUpperCase()}
                </h2>
              </div>
              <p className="text-foreground/75 leading-loose">{body}</p>
              <ul className="mt-2 divide-y divide-foreground/15 border-t border-foreground/15">
                {items.map((it) => (
                  <li
                    key={it}
                    className="flex items-center justify-between py-3 text-sm text-foreground/80"
                  >
                    <span style={{ letterSpacing: "0.14em" }}>{it}</span>
                    <span
                      className="text-xs uppercase text-primary"
                      style={{ letterSpacing: "0.28em" }}
                    >
                      Signature
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center gap-6 text-center">
          <p className="max-w-xl text-foreground/75">
            Ready to become a house guest? Sign in to view your packages, or write to us
            for a first appointment.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/auth">
              <Button
                className="rounded-none bg-primary text-primary-foreground uppercase px-8 py-6 hover:bg-primary/90"
                style={{ letterSpacing: "0.24em" }}
              >
                Client Portal
              </Button>
            </Link>
            <Link to="/contact">
              <Button
                variant="outline"
                className="rounded-none border-foreground/40 uppercase px-8 py-6 hover:bg-foreground hover:text-background"
                style={{ letterSpacing: "0.24em" }}
              >
                Contact the Salon
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
