import Logo from "./Logo";
import FloatingIcon from "./FloatingIcon";
import { IconPaths } from "./iconPaths";

const bullets = [
  "SaaS-Plattformen, die mit dir wachsen",
  "eCommerce-Apps mit nahtlosen Zahlungen",
  "KI-gestützte Web-Apps, die Arbeit automatisieren",
];

const techStack = ["PHP", "React", "Next.js", "Laravel", "Node.js", "Tailwind"];

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden px-6 pb-24 pt-14 sm:pt-20">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
        <div>
          <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Deine Idee. Unser Code.
            <br />
            <span className="animate-shimmer text-gold-shimmer">Eine Webapp, die gewinnt.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/70">
            Bei <span className="text-gold-300 font-semibold">IT-World</span> programmieren wir
            nicht nur, wir erschaffen digitale Motoren, die dein Business antreiben. Unsere
            maßgeschneiderten Webanwendungen vereinfachen Abläufe, begeistern Nutzer und fördern
            Wachstum — egal ob MVP oder Skalierung auf Tausende von Nutzern.
          </p>

          <ul className="mt-8 space-y-3">
            {bullets.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-white/85 sm:text-base">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-gold-gradient shadow-glossy" />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            {techStack.map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-gold-500/30 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-gold-200"
              >
                {tech}
              </span>
            ))}
          </div>

          <a
            href="#kontakt"
            className="animate-glow mt-10 inline-flex items-center gap-2 rounded-full bg-gold-gradient px-7 py-3.5 text-sm font-bold text-ink-950 shadow-glossy transition-transform hover:scale-105"
          >
            Jetzt Projekt starten
            <span aria-hidden>→</span>
          </a>
        </div>

        <div className="relative mx-auto flex h-[420px] w-full max-w-md items-center justify-center">
          <div className="absolute h-72 w-72 animate-pulse rounded-full bg-gold-500/10 blur-3xl" />
          <Logo size={220} spin />

          <FloatingIcon size={62} className="left-2 top-6 animate-float">
            {IconPaths.gear}
          </FloatingIcon>
          <FloatingIcon size={54} className="right-4 top-2 animate-float-slow" >
            {IconPaths.brain}
          </FloatingIcon>
          <FloatingIcon size={58} className="bottom-8 left-0 animate-float-slow">
            {IconPaths.server}
          </FloatingIcon>
          <FloatingIcon size={54} className="bottom-2 right-2 animate-float">
            {IconPaths.phone}
          </FloatingIcon>
        </div>
      </div>
    </section>
  );
}
