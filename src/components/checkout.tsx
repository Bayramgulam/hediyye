"use client";
import { useEffect, useRef, useState } from "react";
import {
  Catalog,
  StoreSettings,
  money,
  priceConfiguration,
} from "@/lib/domain";
import { CartItem, readCart, writeCart } from "./cart-store";
import Link from "next/link";
import { useRouter } from "next/navigation";
export function Checkout({
  catalog,
  settings,
  zones,
  slots,
}: {
  catalog: Catalog;
  settings: StoreSettings;
  zones: { id: string; name: string; fee: number }[];
  slots: { id: string; date: string; label: string }[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [method, setMethod] = useState(
    settings.delivery ? "delivery" : "pickup",
  );
  const [zone, setZone] = useState(zones[0]?.id || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const key = useRef("");
  useEffect(() => {
    setItems(readCart());
    key.current =
      sessionStorage.getItem("luma-checkout-key") || crypto.randomUUID();
    sessionStorage.setItem("luma-checkout-key", key.current);
    setReady(true);
  }, []);
  let total = 0;
  try {
    total = items.reduce(
      (n, i) => n + priceConfiguration(i.config, catalog).total * i.quantity,
      0,
    );
  } catch {}
  const fee =
    method === "delivery" ? zones.find((z) => z.id === zone)?.fee || 0 : 0;
  const enabled =
    method === "delivery"
      ? settings.delivery && settings.cashDelivery
      : settings.pickup && settings.cashPickup;
  if (!ready)
    return (
      <section className="section inline-loading" role="status">
        <span />
        Sifariş məlumatları hazırlanır...
      </section>
    );
  if (!items.length)
    return (
      <section className="section checkout-page">
        <span className="eyebrow">SİFARİŞƏ BAŞLAMAQ ÜÇÜN</span>
        <h1>
          Əvvəlcə <em>hədiyyəni seç.</em>
        </h1>
        <div className="empty-state compact-empty">
          <p>Səbətin boşdur. Öz qutunu hazırla və ya hazır seçimlərə bax.</p>
          <div className="empty-actions">
            <Link className="button" href="/qutunu-yarat">
              Öz qutunu yarat →
            </Link>
            <Link className="text-link" href="/hediyyeler">
              Hazır hədiyyələr
            </Link>
          </div>
        </div>
      </section>
    );
  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const val = (k: string) => String(f.get(k) || "");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: key.current,
          items: items.map((i) => ({ config: i.config, quantity: i.quantity })),
          customer: {
            name: val("name"),
            phone: val("phone"),
            email: val("email"),
            recipient: val("recipient"),
            recipientPhone: val("recipientPhone"),
          },
          delivery: {
            method,
            zoneId: zone,
            address: val("address"),
            slotId: val("slot"),
          },
          note: val("note"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      writeCart([]);
      sessionStorage.removeItem("luma-checkout-key");
      router.push("/sifaris/tesdiq?token=" + data.token);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <section className="section checkout-page">
      <span className="eyebrow">GÖZƏL BİR SÜRPRİZƏ AZ QALDI</span>
      <h1>
        Son <em>detallar.</em>
      </h1>
      <form onSubmit={submit} className="checkout-layout">
        <div className="form-stack">
          <h3>Sənin məlumatların</h3>
          <div className="form-grid">
            <label>
              Ad və soyad
              <input name="name" required minLength={2} autoComplete="name" />
            </label>
            <label>
              Telefon
              <input
                name="phone"
                required
                type="tel"
                inputMode="tel"
                pattern="[+0-9\\s()\\-]{7,20}"
                title="Telefon nömrəsini düzgün formatda yaz"
                placeholder="+994 50 123 45 67"
                autoComplete="tel"
              />
            </label>
          </div>
          <label>
            <span>
              E-poçt <small>(istəyə görə)</small>
            </span>
            <input name="email" type="email" autoComplete="email" />
          </label>
          <h3>Hədiyyə kimə çatır?</h3>
          <div className="form-grid">
            <label>
              Alıcının adı
              <input name="recipient" required minLength={2} />
            </label>
            <label>
              Alıcının telefonu
              <input
                name="recipientPhone"
                type="tel"
                inputMode="tel"
                pattern="[+0-9\\s()\\-]{7,20}"
                title="Telefon nömrəsini düzgün formatda yaz"
                required={method === "delivery"}
                placeholder="+994 50 123 45 67"
              />
            </label>
          </div>
          <h3>Təhvil üsulu</h3>
          <div className="category-tabs">
            {settings.delivery && (
              <button
                type="button"
                className={method === "delivery" ? "active" : ""}
                onClick={() => setMethod("delivery")}
              >
                Çatdırılma
              </button>
            )}
            {settings.pickup && (
              <button
                type="button"
                className={method === "pickup" ? "active" : ""}
                onClick={() => setMethod("pickup")}
              >
                Özüm götürəcəyəm
              </button>
            )}
          </div>
          {method === "delivery" && (
            <>
              <label>
                Çatdırılma zonası
                <select
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  required
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} · {money(z.fee)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tam ünvan
                <textarea
                  name="address"
                  required
                  minLength={8}
                  autoComplete="street-address"
                />
              </label>
            </>
          )}
          {method === "pickup" && (
            <p>{settings.address || "Təhvil ünvanı hələ əlavə edilməyib."}</p>
          )}
          <label>
            Tarix və vaxt
            <select name="slot" required defaultValue="">
              <option value="" disabled>
                Mövcud vaxtı seç
              </option>
              {slots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.date} · {s.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>
              Əlavə qeyd <small>(istəyə görə)</small>
            </span>
            <textarea name="note" maxLength={1000} />
          </label>
          <p className="muted">
            Ünvan və əlaqə məlumatları brauzerin yerli yaddaşında saxlanmır.
          </p>
        </div>
        <aside className="order-summary">
          <h3>Sənin hədiyyən</h3>
          <div className="summary-gifts">
            {items.map((i) => {
              const box = catalog.boxes.find((b) => b.id === i.config.boxId);
              const pieces = i.config.items.reduce(
                (sum, item) => sum + item.quantity,
                0,
              );
              return (
                <div className="summary-gift-item" key={i.id}>
                  {box?.image && (
                    <img src={box.image} alt="" width="64" height="64" />
                  )}
                  <span>
                    <strong>{box?.name}</strong>
                    <small>
                      {pieces} məhsul · {i.quantity} qutu
                    </small>
                  </span>
                </div>
              );
            })}
          </div>
          <hr />
          <div>
            <span>Hədiyyələr</span>
            <span>{money(total)}</span>
          </div>
          <div>
            <span>Çatdırılma</span>
            <span>{money(fee)}</span>
          </div>
          <div className="summary-total">
            <span>Cəmi</span>
            <strong>{money(total + fee)}</strong>
          </div>
          <p>
            {enabled
              ? method === "pickup"
                ? "Təhvil zamanı nağd ödəniş"
                : "Çatdırılma zamanı nağd ödəniş"
              : "Mağaza sifariş qəbulunu hələ aktivləşdirməyib."}
          </p>
          {(!enabled || !slots.length) && (
            <p
              className="availability-note"
              role="status"
              id="checkout-unavailable"
            >
              {!enabled
                ? "Bu təhvil üsulu üçün sifariş qəbulu hazırda bağlıdır."
                : "Hazırda seçilə bilən təhvil vaxtı yoxdur. Yeni vaxt üçün bizimlə əlaqə saxla."}
            </p>
          )}
          <label className="check-label">
            <input type="checkbox" required />{" "}
            <span>
              <Link href="/sertler">Şərtləri</Link> və{" "}
              <Link href="/mexfilik">məxfilik məlumatını</Link> oxudum.
            </span>
          </label>
          <button
            className="button"
            disabled={busy || !enabled || !items.length || !slots.length}
            aria-describedby={
              !enabled || !slots.length ? "checkout-unavailable" : undefined
            }
          >
            {busy ? "Sifariş göndərilir..." : "Sifarişi tamamla →"}
          </button>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
        </aside>
      </form>
    </section>
  );
}
