import Logo from "./Logo";

export default function Contact() {
  return (
    <section id="kontakt" className="px-6 pb-28 pt-10">
      <div className="mx-auto flex max-w-4xl flex-col items-center rounded-3xl glass-panel p-10 text-center shadow-card sm:p-16">
        <Logo size={72} showText={false} />
        <h2 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Bereit, dein Business auf das{" "}
          <span className="text-gold-gradient">nächste Level</span> zu bringen?
        </h2>
        <p className="mt-4 max-w-xl text-white/65">
          Lass uns eine Webapp bauen, die mehr macht als nur funktionieren. Sie gewinnt. Schreib
          uns noch heute, um loszulegen.
        </p>
        <a
          href="mailto:kontakt@it-world.dev"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold-gradient px-8 py-4 text-sm font-bold text-ink-950 shadow-glossy transition-transform hover:scale-105"
        >
          Jetzt Kontakt aufnehmen
          <span aria-hidden>→</span>
        </a>
      </div>
    </section>
  );
}
