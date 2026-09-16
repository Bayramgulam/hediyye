"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ShoppingBag, Menu, X, ArrowUpRight } from "lucide-react";
export function Header({ brand, logo }: { brand: string; logo?: string }) {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const update = () => {
      try {
        const c = JSON.parse(localStorage.getItem("luma-cart") || "{}");
        setCount(
          c.version === 1
            ? c.items.reduce(
                (n: number, i: { quantity: number }) => n + i.quantity,
                0,
              )
            : 0,
        );
      } catch {
        setCount(0);
      }
    };
    update();
    window.addEventListener("cart-change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("cart-change", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.classList.add("menu-open");
    window.addEventListener("keydown", close);
    return () => {
      document.body.classList.remove("menu-open");
      window.removeEventListener("keydown", close);
    };
  }, [open]);
  const links = [
    { href: "/hediyyeler", label: "Hədiyyələr" },
    { href: "/qutunu-yarat", label: "Öz qutunu yarat", featured: true },
    { href: "/#nece-isleyir", label: "Necə işləyir" },
    { href: "/elaqe", label: "Əlaqə" },
  ];
  if (pathname.startsWith("/admin")) return null;
  return (
    <>
      <div className="announcement">
        Böyük hisslər, düşünülmüş kiçik detallar.
      </div>
      <header className="header">
        <Link className="wordmark" href="/" aria-label="LUMA ana səhifə">
          {logo ? (
            <img
              src={logo}
              alt={brand}
              style={{ width: 130, height: 55, objectFit: "contain" }}
            />
          ) : (
            <>
              {brand.toLowerCase()}
              <span>düşünülərək hazırlanıb.</span>
            </>
          )}
        </Link>
        <nav
          id="primary-navigation"
          className={open ? "nav open" : "nav"}
          aria-label="Əsas naviqasiya"
        >
          {links.map(({ href, label, featured }) => {
            const route = href.split("#")[0];
            const current =
              route !== "/" &&
              (pathname === route || pathname.startsWith(route + "/"));
            return (
              <Link
                key={href}
                href={href}
                className={featured ? "nav-featured" : undefined}
                aria-current={current ? "page" : undefined}
              >
                {label}
                {featured && <ArrowUpRight size={14} />}
              </Link>
            );
          })}
        </nav>
        <div className="header-actions">
          <span className="locale">AZ / ₼</span>
          <Link
            href="/sebet"
            className="cart-link"
            aria-label={`Səbət, ${count} qutu`}
          >
            <ShoppingBag size={21} />
            <span key={count} className="cart-count" aria-live="polite">
              {count}
            </span>
          </Link>
          <button
            className="menu-toggle icon-button"
            aria-label={open ? "Menyunu bağla" : "Menyunu aç"}
            aria-expanded={open}
            aria-controls="primary-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
    </>
  );
}
