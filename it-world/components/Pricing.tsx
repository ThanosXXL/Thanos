import TiltCard from "./TiltCard";

type Tier = {
  name: string;
  tagline: string;
  price: string;
  description: string;
  revisions: string;
  delivery: string;
  recommended?: boolean;
};

const tiers: Tier[] = [
  {
    name: "Basic",
    tagline: "Prototyp-App",
    price: "460,90 €",
    description: "Klickbarer Prototyp zur Validierung deiner Idee.",
    revisions: "0 Revisionen",
    delivery: "14 Tage Lieferzeit",
  },
  {
    name: "Standard",
    tagline: "MVP-Start",
    price: "1.844 €",
    description: "Kernfunktionen + APIs, bereit für den Marktstart.",
    revisions: "3 Revisionen",
    delivery: "60 Tage Lieferzeit",
    recommended: true,
  },
  {
    name: "Premium",
    tagline: "Software-, Web- & Mobile-App",
    price: "9.218 €",
    description: "Vollwertige Web-, Mobile- und Desktop-Apps.",
    revisions: "5 Revisionen",
    delivery: "90 Tage Lieferzeit",
  },
];

export default function Pricing() {
  return (
    <section id="pakete" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            <span className="text-gold-gradient">Pakete</span> vergleichen
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/65">
            Vom klickbaren Prototyp bis zur vollwertigen Web-, Mobile- und Desktop-App — wähle das
            Paket, das zu deinem Vorhaben passt.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <TiltCard key={tier.name} className="h-full">
              <div
                className={`relative flex h-full flex-col rounded-2xl glass-panel p-8 shadow-card ${
                  tier.recommended ? "border-gold-400/60 md:-translate-y-3" : ""
                }`}
              >
                {tier.recommended && (
                  <span className="absolute -top-3 right-8 rounded-full bg-gold-gradient px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-950 shadow-glossy">
                    Für dich empfohlen
                  </span>
                )}

                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-300/80">
                  {tier.tagline}
                </div>
                <div className="mt-3 text-3xl font-extrabold text-gold-gradient">{tier.price}</div>
                <div className="mt-1 text-lg font-bold">{tier.name}</div>
                <p className="mt-4 text-sm leading-relaxed text-white/70">{tier.description}</p>

                <ul className="mt-6 flex-1 space-y-3 border-t border-white/10 pt-6 text-sm text-white/75">
                  <li className="flex items-center gap-2">
                    <span className="text-gold-400">✓</span> Quellcode integriert
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-gold-400">✓</span> {tier.revisions}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-gold-400">✓</span> {tier.delivery}
                  </li>
                </ul>

                <a
                  href="#kontakt"
                  className={`mt-8 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-bold transition-transform hover:scale-105 ${
                    tier.recommended
                      ? "bg-gold-gradient text-ink-950 shadow-glossy"
                      : "border border-gold-400/40 text-gold-200"
                  }`}
                >
                  Paket anfragen
                </a>
              </div>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  );
}
