import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell, SectionDivider } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
import {
  Scissors,
  Sparkles,
  Droplets,
  HeartPulse,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/services")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Services — EmpireCharme Yankin" },
      {
        name: "description",
        content:
          "Discover EmpireCharme Yankin services including professional hair styling, coloring, rebonding, perming and scalp treatments in Yangon.",
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
    body:
      "Professional hair services designed to enhance your personal style while maintaining healthy, beautiful hair.",
    items: [
      "Hair Cut & Styling",
      "Hair Coloring",
      "Hair Treatment",
      "Hair Transformation",
    ],
  },

  {
    icon: Sparkles,
    title: "Hair Heresy Treatments",
    body:
      "Advanced repair and nourishing treatments created to restore damaged hair and bring back shine, softness and strength.",
    items: [
      "Hair Repair Treatments",
      "Moisture Treatments",
      "Smoothing Treatments",
      "Premium Hair Care",
    ],
  },

  {
    icon: Droplets,
    title: "Chemical Services",
    body:
      "Expert chemical services using professional techniques to create beautiful, long-lasting results.",
    items: [
      "Hair Color",
      "Highlight",
      "Root Touch Up",
      "Rebond & Perm",
    ],
  },

  {
    icon: HeartPulse,
    title: "Scalp Rescue",
    body:
      "Specialized scalp care focused on improving scalp condition and supporting healthier hair growth.",
    items: [
      "Scalp Detox",
      "Scalp Facial",
      "Ginseng Scalp Therapy",
      "Scalp Nourishing Treatments",
    ],
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
          What We Offer
        </p>

        <h1
          className="mt-6 font-serif text-4xl md:text-6xl"
          style={{ letterSpacing: "0.18em" }}
        >
          BEAUTY SERVICES,
          <br />
          <em className="text-primary font-light">
            thoughtfully crafted.
          </em>
        </h1>

        <div className="mx-auto mt-10 h-px w-16 bg-primary" />

        <p className="mx-auto mt-10 max-w-xl text-foreground/75 leading-loose">
          At EmpireCharme Yankin, every service is designed with care,
          precision and professional expertise to help you achieve healthy,
          beautiful results.
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
                  style={{ letterSpacing: "0.18em" }}
                >
                  {title.toUpperCase()}
                </h2>
              </div>

              <p className="text-foreground/75 leading-loose">
                {body}
              </p>

              <ul className="mt-2 divide-y divide-foreground/15 border-t border-foreground/15">
                {items.map((item) => (
                  <li
                    key={item}
                    className="py-3 text-sm text-foreground/80"
                    style={{ letterSpacing: "0.12em" }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center gap-6 text-center">
          <p className="max-w-xl text-foreground/75">
            Visit EmpireCharme Yankin for professional consultation and
            personalized beauty services.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/contact">
              <Button
                className="rounded-none bg-primary text-primary-foreground uppercase px-8 py-6 hover:bg-primary/90"
                style={{ letterSpacing: "0.24em" }}
              >
                Contact Salon
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}