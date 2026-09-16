import type { Metadata } from "next";
import { Header } from "@/components/header";
import { StorefrontMotion } from "@/components/storefront-motion";
import { OpeningScene } from "@/components/opening-scene";
import { SiteFooter } from "@/components/site-footer";
import { getSettings } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/site-url";
import "@fontsource/noto-serif/latin-400.css";
import "@fontsource/noto-serif/latin-ext-400.css";
import "@fontsource/noto-serif/latin-400-italic.css";
import "@fontsource/noto-serif/latin-ext-400-italic.css";
import "@fontsource/noto-sans/latin-400.css";
import "@fontsource/noto-sans/latin-ext-400.css";
import "./globals.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "LUMA — Düşünülərək seçilən hədiyyələr",
    template: "%s · LUMA",
  },
  description: "Öz hədiyyə qutunu yarat. Sevdiyi detalları bir araya gətir.",
  openGraph: {
    images: ["/images/hero.webp"],
    locale: "az_AZ",
    type: "website",
  },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await getSettings();
  return (
    <html lang="az" data-scroll-behavior="smooth">
      <body>
        <OpeningScene />
        <a className="skip" href="#main">
          Məzmuna keç
        </a>
        <Header brand={s.brand} logo={s.logo} />
        <main id="main">
          <StorefrontMotion>{children}</StorefrontMotion>
        </main>
        <SiteFooter brand={s.brand} email={s.email} instagram={s.instagram} />
      </body>
    </html>
  );
}
