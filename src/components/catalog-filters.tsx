"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

const occasionLabels: Record<string, string> = {
  "Ad günü": "Ad günü",
  Təşəkkür: "Təşəkkür",
  Təbrik: "Təbrik",
  "Kiçik jest": "Kiçik jest",
};

const categoryLabels: Record<string, string> = {
  cup: "Fincanlar",
  candle: "Şamlar",
  tea: "Çay və qəhvə",
  chocolate: "Şokolad",
  small: "Kiçik hədiyyələr",
};

export function CatalogFilters({
  query,
  resultCount,
}: {
  query: Record<string, string>;
  resultCount: number;
}) {
  const [open, setOpen] = useState(false);
  const active = [query.occasion, query.category, query.max, query.sort].filter(
    Boolean,
  ).length;

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.classList.add("filter-open");
    window.addEventListener("keydown", close);
    return () => {
      document.body.classList.remove("filter-open");
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  function without(key: string) {
    const next = new URLSearchParams(query);
    next.delete(key);
    const value = next.toString();
    return value ? `/hediyyeler?${value}` : "/hediyyeler";
  }

  return (
    <>
      <div className="catalog-tools">
        <p>
          <strong>{resultCount}</strong> düşünülmüş seçim
        </p>
        <button
          type="button"
          className="filters-toggle"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="catalog-filter-panel"
        >
          <SlidersHorizontal size={17} /> Filtrlər
          {active > 0 && <span>{active}</span>}
        </button>
      </div>

      {active > 0 && (
        <div className="active-filters" aria-label="Aktiv filtrlər">
          {query.occasion && (
            <Link href={without("occasion")}>
              {occasionLabels[query.occasion] || query.occasion} <X size={13} />
            </Link>
          )}
          {query.category && (
            <Link href={without("category")}>
              {categoryLabels[query.category] || query.category} <X size={13} />
            </Link>
          )}
          {query.max && (
            <Link href={without("max")}>
              {query.max} ₼-dək <X size={13} />
            </Link>
          )}
          {query.sort && (
            <Link href={without("sort")}>
              {query.sort === "asc" ? "Əvvəl ucuz" : "Əvvəl bahalı"}{" "}
              <X size={13} />
            </Link>
          )}
          <Link href="/hediyyeler" className="clear-filters">
            Hamısını təmizlə
          </Link>
        </div>
      )}

      <div
        id="catalog-filter-panel"
        className={open ? "catalog-filter-panel open" : "catalog-filter-panel"}
      >
        <button
          type="button"
          className="filter-backdrop"
          aria-label="Filtrləri bağla"
          onClick={() => setOpen(false)}
        />
        <div className="filter-sheet">
          <div className="filter-sheet-heading">
            <div>
              <span>SEÇİMİNİ DƏQİQLƏŞDİR</span>
              <h2>Filtrlər</h2>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Filtrləri bağla"
              onClick={() => setOpen(false)}
            >
              <X />
            </button>
          </div>
          <form className="catalog-filters">
            <label>
              Səbəb
              <select name="occasion" defaultValue={query.occasion || ""}>
                <option value="">Bütün anlar</option>
                {Object.keys(occasionLabels).map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              İçindəkilər
              <select name="category" defaultValue={query.category || ""}>
                <option value="">Hamısı</option>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Maksimum qiymət
              <input
                name="max"
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="AZN"
                defaultValue={query.max}
              />
            </label>
            <label>
              Sıralama
              <select name="sort" defaultValue={query.sort || ""}>
                <option value="">Seçimlərimiz</option>
                <option value="asc">Qiymət: artan</option>
                <option value="desc">Qiymət: azalan</option>
              </select>
            </label>
            <button className="button">{resultCount} seçimi göstər</button>
            <Link href="/hediyyeler">Təmizlə</Link>
          </form>
        </div>
      </div>
    </>
  );
}
