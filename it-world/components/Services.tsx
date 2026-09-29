import TiltCard from "./TiltCard";
import { IconBadge } from "./FloatingIcon";
import { IconPaths } from "./iconPaths";

const services = [
  {
    icon: IconPaths.rocket,
    title: "SaaS-Plattformen",
    description: "Skalierbare Plattformen, die mit deinem Business mitwachsen.",
  },
  {
    icon: IconPaths.grid,
    title: "Business-CRMs & ERPs",
    description: "Maßgeschneiderte Systeme, die Arbeitsabläufe optimieren.",
  },
  {
    icon: IconPaths.cart,
    title: "eCommerce-Apps",
    description: "Online-Shops mit nahtlosen, sicheren Zahlungsprozessen.",
  },
  {
    icon: IconPaths.calendar,
    title: "Buchungs- & Verwaltungsportale",
    description: "Termine, Ressourcen und Kunden zentral verwalten – zeitsparend.",
  },
  {
    icon: IconPaths.brain,
    title: "KI-gestützte Web-Apps",
    description: "Intelligente Funktionen, die repetitive Arbeit automatisieren.",
  },
  {
    icon: IconPaths.flow,
    title: "Workflow-Automatisierung",
    description: "Intelligente Integrationen zwischen deinen Tools und Systemen.",
  },
];

export default function Services() {
  return (
    <section id="leistungen" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Was wir <span className="text-gold-gradient">liefern</span>
          </h2>
          <p className="mt-4 text-white/65">
            Egal ob du ein MVP validierst oder auf Tausende von Nutzern skalierst — wir setzen es um.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <TiltCard key={service.title}>
              <div className="flex h-full flex-col gap-4 rounded-2xl glass-panel p-6 shadow-card">
                <IconBadge>{service.icon}</IconBadge>
                <div className="font-bold">{service.title}</div>
                <p className="text-sm leading-relaxed text-white/65">{service.description}</p>
              </div>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  );
}
