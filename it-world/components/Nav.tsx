"use client";

import { useState } from "react";
import Logo from "./Logo";

const links = [
  { href: "#leistungen", label: "Leistungen" },
  { href: "#warum-wir", label: "Warum wir" },
  { href: "#pakete", label: "Pakete" },
  { href: "#skills", label: "Tech-Stack" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-ink-950/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <a href="#top" className="flex items-center gap-2" aria-label="IT-World Startseite">
          <Logo size={40} showText={false} />
          <span className="hidden text-sm font-bold tracking-[0.2em] text-gold-gradient sm:inline">
            IT-WORLD
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Hauptnavigation">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-white/70 transition-colors hover:text-gold-300"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#kontakt"
            className="rounded-full bg-gold-gradient px-5 py-2 text-sm font-semibold text-ink-950 shadow-glossy transition-transform hover:scale-105"
          >
            Kontakt
          </a>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gold-500/25 text-gold-200 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Menü schließen" : "Menü öffnen"}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <nav
          id="mobile-menu"
          aria-label="Mobile Navigation"
          className="flex flex-col gap-1 border-t border-white/5 px-6 py-4 md:hidden"
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-2.5 text-sm text-white/75 hover:bg-white/5 hover:text-gold-300"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#kontakt"
            onClick={() => setOpen(false)}
            className="mt-2 rounded-full bg-gold-gradient px-5 py-2.5 text-center text-sm font-semibold text-ink-950 shadow-glossy"
          >
            Kontakt
          </a>
        </nav>
      )}
    </header>
  );
}
