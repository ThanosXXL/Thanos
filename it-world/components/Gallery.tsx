import Logo from "./Logo";
import TiltCard from "./TiltCard";

const shots = [
  {
    src: "/gig/02-services.webp",
    alt: "Leistungen im Überblick: SaaS, CRM & ERP, eCommerce, Buchungsportale, KI-Apps, Workflow-Automatisierung",
    caption: "Leistungen im Überblick",
  },
  {
    src: "/gig/03-techstack.webp",
    alt: "Tech-Stack: PHP, React, Next.js, Laravel, Node.js, Tailwind",
    caption: "Unser Tech-Stack",
  },
  {
    src: "/gig/04-pakete.webp",
    alt: "Pakete: Basic, Standard (empfohlen), Premium",
    caption: "Pakete im Vergleich",
  },
  {
    src: "/gig/05-cta.webp",
    alt: "Let's build something that wins – jetzt Kontakt aufnehmen",
    caption: "Bereit loszulegen",
  },
];

export default function Gallery() {
  return (
    <section id="galerie" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center text-center">
          <Logo size={56} showText={false} />
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Gig-<span className="text-gold-gradient">Galerie</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/65">
            Ein Blick auf unseren Fiverr-Gig — Cover, Leistungen, Tech-Stack und Pakete im
            schwarz-goldenen 3D-Hochglanz-Design.
          </p>
        </div>

        <div className="mt-12">
          <TiltCard>
            <figure className="overflow-hidden rounded-2xl glass-panel shadow-card">
              <img
                src="/gig/01-cover.webp"
                alt="IT-World Gig-Cover: Custom Web App Development"
                width={1280}
                height={720}
                loading="lazy"
                decoding="async"
                className="block w-full"
              />
            </figure>
          </TiltCard>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {shots.map((shot) => (
            <TiltCard key={shot.src}>
              <figure className="overflow-hidden rounded-2xl glass-panel shadow-card">
                <img
                  src={shot.src}
                  alt={shot.alt}
                  width={1280}
                  height={720}
                  loading="lazy"
                  decoding="async"
                  className="block w-full"
                />
                <figcaption className="border-t border-white/10 px-5 py-3 text-sm text-white/65">
                  {shot.caption}
                </figcaption>
              </figure>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  );
}
