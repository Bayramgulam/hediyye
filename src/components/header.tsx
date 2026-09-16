"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingBag, Menu, X, ArrowUpRight } from "lucide-react";
export function Header({ brand, logo }: { brand: string; logo?: string }) {
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
        <nav className={open ? "nav open" : "nav"} aria-label="Əsas naviqasiya">
          <Link onClick={() => setOpen(false)} href="/hediyyeler">
            Hədiyyələr
          </Link>
          <Link onClick={() => setOpen(false)} href="/qutunu-yarat">
            Öz qutunu yarat <ArrowUpRight size={14} />
          </Link>
          <Link onClick={() => setOpen(false)} href="/#nece-isleyir">
            Necə işləyir
          </Link>
          <Link onClick={() => setOpen(false)} href="/elaqe">
            Əlaqə
          </Link>
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
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
    </>
  );
}
