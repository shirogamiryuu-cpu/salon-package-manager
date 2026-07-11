import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell, SectionDivider } from "@/components/public-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "About — EmpireCharme" },
      {
        name: "description",
        content:
          "The story, values and people behind EmpireCharme — a Singapore atelier for hair, nails and considered beauty.",
      },
    ],
  }),
  component: About,
});

const VALUES = [
  {
    title: "Craftsmanship",
    body: "Every stylist trains for years before they hold shears in our chairs. Precision is not negotiable.",
  },
  {
    title: "Intimacy",
    body: "Small rooms. Quiet music. Time that belongs to you. We keep our floor deliberately unhurried.",
  },
  {
    title: "Longevity",
    body: "We tend to hair and nails so they grow stronger between visits — not thinner, not tired.",
  },
];

function About() {
  return (
    <PublicShell>
      <section className="mx-auto w-full max-w-4xl px-6 py-24 text-center">
        <p
          className="text-xs uppercase text-primary"
          style={{ letterSpacing: "0.4em" }}
        >
          Our Story
        </p>
        <h1
          className="mt-6 font-serif text-4xl md:text-6xl"
          style={{ letterSpacing: "0.18em" }}
        >
          A HOUSE BUILT ON
          <br />
          <em className="text-primary font-light">quiet detail.</em>
        </h1>
        <div className="mx-auto mt-10 h-px w-16 bg-primary" />
        <p className="mx-auto mt-10 max-w-2xl text-foreground/75 leading-loose">
          EmpireCharme began in 2015 with a small team, one address, and a conviction
          that Singapore deserved a beauty house that treated its guests the way a
          couturier treats a client — with time, discretion and a signature.
        </p>
      </section>

      <SectionDivider />

      {/* Values */}
      <section className="mx-auto w-full max-w-5xl px-6">
        <h2
          className="text-center font-serif text-3xl md:text-4xl"
          style={{ letterSpacing: "0.2em" }}
        >
          WHAT WE STAND FOR
        </h2>
        <div className="mt-16 grid gap-12 md:grid-cols-3">
          {VALUES.map((v, i) => (
            <div key={v.title} className="text-center">
              <span
                className="font-serif text-3xl text-primary italic"
                style={{ letterSpacing: "0.1em" }}
              >
                0{i + 1}
              </span>
              <div className="mx-auto mt-4 h-px w-10 bg-primary" />
              <h3
                className="mt-6 text-sm uppercase"
                style={{ letterSpacing: "0.28em" }}
              >
                {v.title}
              </h3>
              <p className="mt-4 text-sm text-foreground/70 leading-loose">
                {v.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <SectionDivider />

      {/* Founder */}
      <section className="mx-auto grid w-full max-w-5xl gap-14 px-6 py-16 md:grid-cols-[1fr_2fr] md:items-center">
        <div
          className="aspect-[3/4] w-full border border-foreground/30 bg-secondary"
          aria-hidden
        >
          <div className="flex h-full items-center justify-center">
            <span
              className="font-serif text-5xl italic text-primary/60"
              style={{ letterSpacing: "0.2em" }}
            >
              EB
            </span>
          </div>
        </div>
        <div>
          <p
            className="text-xs uppercase text-primary"
            style={{ letterSpacing: "0.32em" }}
          >
            Founder
          </p>
          <h2
            className="mt-4 font-serif text-4xl"
            style={{ letterSpacing: "0.16em" }}
          >
            Eve Bong
          </h2>
          <p
            className="mt-2 text-xs uppercase text-foreground/60"
            style={{ letterSpacing: "0.24em" }}
          >
            Co-Founder & CEO
          </p>
          <div className="mt-6 h-px w-16 bg-primary" />
          <p className="mt-6 text-foreground/75 leading-loose">
            "I wanted a room where clients could exhale — where the treatment was as
            considered as the conversation. That is the room we built, and the one we
            protect every single day."
          </p>
          <Link to="/services" className="mt-8 inline-block">
            <Button
              variant="outline"
              className="rounded-none border-primary text-primary hover:bg-primary hover:text-primary-foreground uppercase"
              style={{ letterSpacing: "0.24em" }}
            >
              Explore Services
            </Button>
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
