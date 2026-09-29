import { IconBadge } from "./FloatingIcon";
import { IconPaths } from "./iconPaths";

const reasons = [
  {
    icon: IconPaths.bolt,
    title: "Schneller Start",
    description: "Vom Prototyp bis zur Produktion schnell.",
  },
  {
    icon: IconPaths.shield,
    title: "Sicher & skalierbar",
    description: "Apps, die für heute und morgen gebaut sind.",
  },
  {
    icon: IconPaths.design,
    title: "Modernes UX/UI",
    description: "Sauber, intuitiv und auf Conversion ausgelegt.",
  },
  {
    icon: IconPaths.cloud,
    title: "Zukunftsorientiert",
    description: "Cloud-Deployment, API-first Architektur.",
  },
  {
    icon: IconPaths.smile,
    title: "Stressfrei",
    description: "Klare Prozesse, keine Fachbegriffe, keine Kopfschmerzen.",
  },
];

export default function WhyUs() {
  return (
    <section id="warum-wir" className="px-6 py-24">
      <div className="mx-auto max-w-6xl rounded-3xl glass-panel p-10 shadow-card sm:p-14">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Warum du <span className="text-gold-gradient">uns wählen</span> solltest
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {reasons.map((reason) => (
            <div key={reason.title} className="flex flex-col items-start gap-3">
              <IconBadge size={44}>{reason.icon}</IconBadge>
              <div className="font-bold">{reason.title}</div>
              <p className="text-sm leading-relaxed text-white/60">{reason.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
