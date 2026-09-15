"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Catalog, money, priceConfiguration } from "@/lib/domain";
import { CartItem, readCart, writeCart } from "./cart-store";
export function Cart({ catalog }: { catalog: Catalog }) {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setItems(readCart());
    setReady(true);
  }, []);
  function update(next: CartItem[]) {
    setItems(next);
    writeCart(next);
  }
  let total = 0;
  const rows = items.map((i) => {
    try {
      const price = priceConfiguration(i.config, catalog).total;
      total += price * i.quantity;
      return { ...i, price, error: "" };
    } catch (e) {
      return { ...i, price: 0, error: (e as Error).message };
    }
  });
  async function proceed() {
    const res = await fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else router.push("/sifaris");
  }
  return (
    <section className="section cart-page">
      <span className="eyebrow">SEVİNCƏ BİR ADDIM YAXIN</span>
      <h1>
        Sənin <em>səbətin.</em>
      </h1>
      {!ready ? (
        <p>Yüklənir...</p>
      ) : !items.length ? (
        <div className="empty-state">
          <h2>İlk gözəl düşüncəni əlavə et.</h2>
          <Link className="button" href="/qutunu-yarat">
            Öz qutunu yarat ↗
          </Link>
        </div>
      ) : (
        <div className="checkout-layout">
          <div>
            {rows.map((i) => (
              <article className="cart-row" key={i.id}>
                <img
                  src="/images/product-5.webp"
                  alt="Hədiyyə qutusu"
                  width="150"
                  height="150"
                />
                <div>
                  <h3>
                    {catalog.boxes.find((b) => b.id === i.config.boxId)?.name}
                  </h3>
                  <p>
                    {i.config.items
                      .map(
                        (x) =>
                          `${catalog.products.find((p) => p.id === x.productId)?.name} × ${x.quantity}`,
                      )
                      .join(" · ")}
                  </p>
                  {i.error && <p role="alert">{i.error}</p>}
                  <div className="cart-row-actions">
                    <Link href={"/qutunu-yarat?edit=" + i.id}>Dəyiş</Link>
                    <button
                      onClick={() => update(items.filter((x) => x.id !== i.id))}
                    >
                      Sil
                    </button>
                    <label>
                      Say{" "}
                      <select
                        value={i.quantity}
                        onChange={(e) =>
                          update(
                            items.map((x) =>
                              x.id === i.id
                                ? { ...x, quantity: Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                      >
                        {Array.from({ length: 10 }, (_, n) => (
                          <option key={n}>{n + 1}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
                <strong>{money(i.price * i.quantity)}</strong>
              </article>
            ))}
          </div>
          <aside className="order-summary">
            <h3>Sifarişin xülasəsi</h3>
            <div>
              <span>Hədiyyələr</span>
              <strong>{money(total)}</strong>
            </div>
            <p>Çatdırılma haqqı növbəti addımda hesablanır.</p>
            <button
              className="button"
              disabled={rows.some((r) => !!r.error)}
              onClick={proceed}
            >
              Sifarişə keç →
            </button>
            {error && (
              <p role="alert" className="error-message">
                {error}
              </p>
            )}
            <Link className="text-link" href="/hediyyeler">
              Seçməyə davam et
            </Link>
          </aside>
        </div>
      )}
    </section>
  );
}
