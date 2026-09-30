import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Impressum – IT-World",
  description: "Impressum / Anbieterkennzeichnung von IT-World.",
};

export default function ImpressumPage() {
  return (
    <main>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gold-300 hover:text-gold-200">
          ← Zurück zur Startseite
        </Link>

        <div className="mt-8 flex justify-center">
          <Logo size={64} showText={false} />
        </div>

        <h1 className="mt-6 text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
          <span className="text-gold-gradient">Impressum</span>
        </h1>

        <div className="mt-8 rounded-2xl border border-gold-500/40 bg-gold-500/5 p-5 text-sm leading-relaxed text-gold-200">
          ⚠️ <strong>Platzhalter-Angaben.</strong> Dieses Impressum enthält noch keine echten Daten.
          Bitte vor Veröffentlichung der Seite alle Felder unten durch deine tatsächlichen Angaben
          ersetzen (in <code>app/impressum/page.tsx</code>) — ein fehlendes oder fehlerhaftes
          Impressum kann in Deutschland abgemahnt werden.
        </div>

        <div className="mt-10 space-y-8 text-white/80">
          <section>
            <h2 className="text-lg font-bold text-white">Angaben gemäß § 5 DDG</h2>
            <p className="mt-3">
              [Vollständiger Name / Firmenname]
              <br />
              [Straße und Hausnummer]
              <br />
              [PLZ und Ort]
              <br />
              [Land]
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">Kontakt</h2>
            <p className="mt-3">
              Telefon: [Telefonnummer]
              <br />
              E-Mail: [E-Mail-Adresse]
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">Umsatzsteuer-ID</h2>
            <p className="mt-3">
              Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz: [USt-IdNr., falls
              vorhanden]
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">
              Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
            </h2>
            <p className="mt-3">
              [Name]
              <br />
              [Anschrift wie oben]
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">Haftungshinweis</h2>
            <p className="mt-3 text-white/65">
              Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte
              externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren
              Betreiber verantwortlich.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
