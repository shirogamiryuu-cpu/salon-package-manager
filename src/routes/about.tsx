import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell, SectionDivider } from "@/components/public-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "About — EmpireCharme Yankin" },
      {
        name: "description",
        content:
          "Discover EmpireCharme Yankin, a trusted beauty destination in Yangon specializing in healthy hair, scalp care, nail services and premium beauty experiences.",
      },
    ],
  }),
  component: About,
});

const VALUES = [
  {
    title: "Healthy Hair",
    body: "We believe beautiful hair starts with a healthy foundation. Our signature scalp and hair treatments are tailored to restore strength, shine and long-term hair health.",
  },
  {
    title: "Personalized Care",
    body: "Every guest receives a professional consultation before every service, allowing our team to recommend treatments that best suit your hair, style and lifestyle.",
  },
  {
    title: "Professional Excellence",
    body: "From Korean-style perms and vibrant coloring to precision cuts and nail services, our experienced beauty professionals are committed to delivering exceptional results.",
  },
];

function About() {
  return (
    <PublicShell>
      {/* Hero */}
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
          HEALTHY HAIR,
          <br />
          <em className="font-light text-primary">beautiful confidence.</em>
        </h1>

        <div className="mx-auto mt-10 h-px w-16 bg-primary" />

        <p className="mx-auto mt-10 max-w-2xl text-foreground/75 leading-loose">
          Located on Moe Kaung Road in Yankin Township, EmpireCharme is a trusted
          beauty destination in Yangon offering premium hair, scalp, nail and
          beauty services. Our experienced team combines professional expertise,
          premium products and personalized care to help every guest achieve
          healthy, beautiful and lasting results.
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
          {VALUES.map((value, index) => (
            <div key={value.title} className="text-center">
              <span
                className="font-serif text-3xl italic text-primary"
                style={{ letterSpacing: "0.1em" }}
              >
                0{index + 1}
              </span>

              <div className="mx-auto mt-4 h-px w-10 bg-primary" />

              <h3
                className="mt-6 text-sm uppercase"
                style={{ letterSpacing: "0.28em" }}
              >
                {value.title}
              </h3>

              <p className="mt-4 text-sm leading-loose text-foreground/70">
                {value.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <SectionDivider />

      {/* Philosophy */}
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
              EC
            </span>
          </div>
        </div>

        <div>
          <p
            className="text-xs uppercase text-primary"
            style={{ letterSpacing: "0.32em" }}
          >
            Our Philosophy
          </p>

          <h2
            className="mt-4 font-serif text-4xl"
            style={{ letterSpacing: "0.16em" }}
          >
            Beauty Begins With Care
          </h2>

          <div className="mt-6 h-px w-16 bg-primary" />

          <p className="mt-6 text-foreground/75 leading-loose">
            At EmpireCharme Yankin, we believe healthy hair is the foundation of
            lasting beauty. Every appointment begins with understanding your
            hair, scalp and personal style before recommending treatments that
            suit your individual needs.
          </p>

          <p className="mt-6 text-foreground/75 leading-loose">
            From our signature scalp therapies and restorative hair treatments
            to Korean-style wave perms, professional coloring, elegant nail
            services and everyday styling, our experienced team is dedicated to
            helping every guest look and feel their best in a welcoming,
            relaxing environment.
          </p>

          <p className="mt-6 text-foreground/75 leading-loose">
            Over the years, EmpireCharme has become a trusted destination for
            clients who value healthy, beautiful hair and personalized service.
            Our commitment remains the same—to provide exceptional care,
            beautiful results and an experience that brings confidence with
            every visit.
          </p>

          <Link to="/services" className="mt-8 inline-block">
            <Button
              variant="outline"
              className="rounded-none border-primary uppercase text-primary hover:bg-primary hover:text-primary-foreground"
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