"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function SiteFooter({
  brand,
  email,
  instagram,
}: {
  brand: string;
  email?: string;
  instagram?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  if (pathname.startsWith("/admin")) return null;

  const columns = [
    {
      id: "discover",
      title: "KƏŞF ET",
      links: [
        ["Hazır hədiyyələr", "/hediyyeler"],
        ["Öz qutunu yarat", "/qutunu-yarat"],
        ["Bizimlə əlaqə", "/elaqe"],
      ],
    },
    {
      id: "info",
      title: "MƏLUMAT",
      links: [
        ["Çatdırılma və təhvil", "/catdirilma"],
        ["Məxfilik", "/mexfilik"],
        ["İstifadə şərtləri", "/sertler"],
      ],
    },
  ];

  return (
    <footer>
      <div className="footer-top">
        <div className="footer-brand">
          <Link href="/" className="wordmark">
            {brand.toLowerCase()}
          </Link>
          <p>
            Hədiyyənin ən gözəl tərəfi —<br />
            arxasındakı düşüncədir.
          </p>
        </div>
        {columns.map((column) => (
          <div className="footer-column" key={column.id}>
            <button
              type="button"
              className="footer-toggle"
              aria-expanded={open === column.id}
              onClick={() => setOpen(open === column.id ? null : column.id)}
            >
              {column.title} <ChevronDown size={15} />
            </button>
            <div
              className={
                open === column.id ? "footer-links open" : "footer-links"
              }
            >
              {column.links.map(([label, href]) => (
                <Link href={href} key={href}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
        <div className="footer-column footer-contact">
          <button
            type="button"
            className="footer-toggle"
            aria-expanded={open === "contact"}
            onClick={() => setOpen(open === "contact" ? null : "contact")}
          >
            BİZƏ YAZ <ChevronDown size={15} />
          </button>
          <div
            className={
              open === "contact" ? "footer-links open" : "footer-links"
            }
          >
            {email ? (
              <a href={`mailto:${email}`}>{email}</a>
            ) : (
              <Link href="/elaqe">Sualını bizimlə bölüş</Link>
            )}
            {instagram && <a href={instagram}>Instagram ↗</a>}
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {brand}. Düşünülərək hazırlanıb.
        </span>
        <span>Azərbaycan · AZN</span>
      </div>
    </footer>
  );
}
