import type { Metadata } from "next";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://it-world.example";
const title = "IT-World – IT Solutions";
const description =
  "IT-World verwandelt deine Idee in eine hochwirksame Webanwendung: SaaS, CRM/ERP, eCommerce und KI-gestützte Web-Apps.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  keywords: [
    "Webentwicklung",
    "SaaS",
    "CRM",
    "ERP",
    "eCommerce",
    "KI-Web-Apps",
    "PHP",
    "React",
    "Next.js",
  ],
  openGraph: {
    title,
    description,
    siteName: "IT-World",
    locale: "de_DE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
