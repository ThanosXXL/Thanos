import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/10 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <Logo size={36} showText={false} />
        <p className="text-xs text-white/40">© {year} IT-World – IT Solutions. Alle Rechte vorbehalten.</p>
        <Link href="/impressum" className="text-xs text-white/50 hover:text-gold-300">
          Impressum
        </Link>
      </div>
    </footer>
  );
}
