import type { Metadata } from "next";
import { Header } from "@/components/header";
import { StorefrontMotion } from "@/components/storefront-motion";
import { OpeningScene } from "@/components/opening-scene";
import { getSettings } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/site-url";
import Link from "next/link";
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
        <footer>
          <div className="footer-top">
            <div>
              <Link href="/" className="wordmark">
                {s.brand.toLowerCase()}
              </Link>
              <p>
                Hədiyyənin ən gözəl tərəfi —<br />
                arxasındakı düşüncədir.
              </p>
            </div>
            <div>
              <small>KƏŞF ET</small>
              <Link href="/hediyyeler">Hazır hədiyyələr</Link>
              <Link href="/qutunu-yarat">Öz qutunu yarat</Link>
              <Link href="/elaqe">Bizimlə əlaqə</Link>
            </div>
            <div>
              <small>MƏLUMAT</small>
              <Link href="/catdirilma">Çatdırılma və təhvil</Link>
              <Link href="/mexfilik">Məxfilik</Link>
              <Link href="/sertler">İstifadə şərtləri</Link>
            </div>
            <div>
              <small>BİZƏ YAZ</small>
              {s.email ? (
                <a href={`mailto:${s.email}`}>{s.email}</a>
              ) : (
                <Link href="/elaqe">Sualını bizimlə bölüş</Link>
              )}
              {s.instagram && <a href={s.instagram}>Instagram ↗</a>}
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} {s.brand}. Düşünülərək hazırlanıb.
            </span>
            <span>Azərbaycan · AZN</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
