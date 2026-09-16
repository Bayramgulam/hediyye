"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Minus,
  Search,
} from "lucide-react";
import {
  Catalog,
  Configuration,
  configSchema,
  emptyConfig,
  money,
  priceConfiguration,
} from "@/lib/domain";
import { BoxPreview } from "./box-preview";
import { readCart, writeCart } from "./cart-store";
export function Builder({
  catalog,
  initial,
}: {
  catalog: Catalog;
  initial?: Configuration;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const step = Math.max(1, Math.min(5, Number(params.get("step")) || 1));
  const [config, setConfig] = useState<Configuration>(() => {
    const product = params.get("product");
    return (
      initial ||
      (product
        ? {
            ...emptyConfig(),
            items: [{ productId: product, quantity: 1 }],
          }
        : emptyConfig())
    );
  });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [expand, setExpand] = useState(false);
  const [feedback, setFeedback] = useState("");
  const initialized = useRef(false);
  const controlsRef = useRef<HTMLDivElement>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      const edit = params.get("edit");
      const product = params.get("product");
      if (edit) {
        const found = readCart().find((i) => i.id === edit);
        if (found) setConfig(found.config);
      } else if (initial) setConfig(initial);
      else if (product) setError("");
      else {
        const saved = localStorage.getItem("luma-builder");
        if (saved) {
          const parsed = configSchema.parse(JSON.parse(saved));
          priceConfiguration(parsed, catalog, false);
          setConfig(parsed);
        }
      }
    } catch {
      setError(
        "Əvvəlki seçimlər yeniləndi. Qutunu yenidən hazırlaya bilərsən.",
      );
    }
    setReady(true);
  }, [catalog, initial, params]);
  useEffect(() => {
    if (ready) localStorage.setItem("luma-builder", JSON.stringify(config));
  }, [config, ready]);
  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    },
    [],
  );
  function update(next: Configuration) {
    try {
      priceConfiguration(next, catalog, false);
      setConfig(next);
      setError("");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  function go(n: number) {
    const q = new URLSearchParams(params);
    q.set("step", String(n));
    router.push("/qutunu-yarat?" + q, { scroll: false });
    if (window.matchMedia("(max-width: 767px)").matches) {
      window.setTimeout(
        () => controlsRef.current?.scrollIntoView({ behavior: "smooth" }),
        80,
      );
    }
  }
  let total = 0,
    units = 0;
  try {
    const p = priceConfiguration(config, catalog, false);
    total = p.total;
    units = p.units;
  } catch {}
  const box = catalog.boxes.find((b) => b.id === config.boxId)!;
  function changeProduct(id: string, delta: number) {
    const items = config.items.map((i) => ({ ...i }));
    const current = items.find((i) => i.productId === id);
    if (current) current.quantity += delta;
    else if (delta > 0) items.push({ productId: id, quantity: 1 });
    const changed = update({
      ...config,
      items: items.filter((i) => i.quantity > 0),
    });
    if (changed) {
      const product = catalog.products.find((p) => p.id === id);
      if (product) {
        setFeedback(
          delta > 0
            ? `${product.name} əlavə edildi.`
            : `${product.name} azaldıldı.`,
        );
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
        feedbackTimer.current = setTimeout(() => setFeedback(""), 1800);
      }
    }
  }
  function next() {
    if (step === 2 && !config.items.length) {
      setError("Ən azı bir hədiyyə seçin.");
      return;
    }
    if (step < 5) go(step + 1);
    else {
      try {
        priceConfiguration(config, catalog);
        const cart = readCart();
        const edit = params.get("edit");
        const existing = cart.find((i) => i.id === edit);
        if (existing) existing.config = config;
        else cart.push({ id: crypto.randomUUID(), config, quantity: 1 });
        writeCart(cart);
        router.push("/sebet");
      } catch (e) {
        setError((e as Error).message);
      }
    }
  }
  const titles = [
    "Qutunu seç",
    "İçini tamamla",
    "Son toxunuşlar",
    "Mesajını yaz",
    "Sənin hədiyyən",
  ];
  return (
    <section className="builder-page">
      <div className="builder-heading">
        <span className="eyebrow">SƏNİN QUTUN, SƏNİN HEKAYƏN</span>
        <h1>
          Bir az zövq. <em>Bir az sən.</em>
        </h1>
        <p>Hər seçimlə ona bir az daha özəl.</p>
      </div>
      <div className="builder-mobile-progress" role="status" aria-live="polite">
        <span>ADDIM {step} / 5</span>
        <strong>{titles[step - 1]}</strong>
        <div aria-hidden="true">
          <span style={{ width: `${step * 20}%` }} />
        </div>
      </div>
      <ol className="builder-steps">
        {titles.map((t, i) => (
          <li key={t}>
            <button
              onClick={() => go(i + 1)}
              aria-current={step === i + 1 ? "step" : undefined}
              aria-label={`${i + 1}. addım: ${t}`}
            >
              <span className="step-number">
                {step > i + 1 ? <Check size={14} /> : i + 1}
              </span>
              <span className="step-label">{t}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="builder-layout">
        <aside className="builder-preview">
          <button
            className="preview-toggle"
            onClick={() => setExpand(!expand)}
            aria-expanded={expand}
          >
            Qutunun görünüşü {expand ? "−" : "+"}
          </button>
          <div className={expand ? "" : "mobile-hidden"}>
            <BoxPreview config={config} catalog={catalog} />
          </div>
          <div className="capacity">
            <span>Qutunun doluluğu</span>
            <strong>
              {units} / {box?.capacity} vahid
            </strong>
            <div>
              <span
                style={{ width: `${(units / (box?.capacity || 1)) * 100}%` }}
              />
            </div>
            <small>
              {Math.max(0, (box?.capacity || 0) - units) > 0
                ? `${Math.max(0, (box?.capacity || 0) - units)} vahid yer qalıb`
                : "Qutu doludur"}
            </small>
          </div>
        </aside>
        <div
          className="builder-controls step-enter"
          key={step}
          ref={controlsRef}
        >
          <div className="step-title">
            <span>ADDIM 0{step} / 05</span>
            <h2>{titles[step - 1]}</h2>
            <p>
              {
                [
                  "Hər gözəl hədiyyə doğru qutudan başlayır.",
                  "Onun sevəcəyi kiçik detalları bir araya gətir.",
                  "Lent, kağız və sənə məxsus bir toxunuş.",
                  "Hədiyyənin ən şəxsi hissəsi sənin sözlərindir.",
                  "Hər şey hazırdır. Son bir dəfə nəzərdən keçir.",
                ][step - 1]
              }
            </p>
          </div>
          {step === 1 && (
            <>
              <div className="box-options">
                {catalog.boxes.map((b) => (
                  <button
                    className={
                      b.id === config.boxId
                        ? "box-option selected"
                        : "box-option"
                    }
                    key={b.id}
                    onClick={() =>
                      update({
                        ...config,
                        boxId: b.id,
                        color: b.colors.includes(config.color)
                          ? config.color
                          : b.colors[0],
                      })
                    }
                  >
                    <img src={b.image} alt="" width="72" height="72" />
                    <span>
                      <strong>{b.name}</strong>
                      <small>
                        {b.dimensions} · {b.capacity} vahid
                      </small>
                    </span>
                    <b>{money(b.price)}</b>
                    {b.id === config.boxId && <Check size={18} />}
                  </button>
                ))}
              </div>
              <h4>Qutunun rəngi</h4>
              <div className="swatches">
                {box?.colors.map((c, i) => (
                  <button
                    key={c}
                    style={{ background: c }}
                    aria-label={["Fil sümüyü", "Pudra", "Zeytun"][i] || c}
                    aria-pressed={config.color === c}
                    onClick={() => update({ ...config, color: c })}
                  >
                    {config.color === c && <Check size={20} />}
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              {config.items.length > 0 && (
                <div
                  className="selected-products"
                  aria-label="Seçilən məhsullar"
                >
                  <div className="selected-products-heading">
                    <span>QUTUDAKILAR</span>
                    <strong>{units} vahid</strong>
                  </div>
                  <div className="selected-products-list">
                    {config.items.map((item) => {
                      const product = catalog.products.find(
                        (candidate) => candidate.id === item.productId,
                      );
                      if (!product) return null;
                      return (
                        <div key={item.productId} className="selected-product">
                          <img
                            src={product.image}
                            alt=""
                            width="52"
                            height="52"
                          />
                          <span>
                            <strong>{product.name}</strong>
                            <small>{item.quantity} ədəd</small>
                          </span>
                          <button
                            type="button"
                            onClick={() => changeProduct(item.productId, -1)}
                            aria-label={`${product.name} azalt`}
                          >
                            <Minus size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <label className="search-field">
                <Search size={18} />
                <input
                  placeholder="Hədiyyə axtar"
                  aria-label="Hədiyyə axtar"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <div className="category-tabs">
                {[
                  ["", "Hamısı"],
                  ["chocolate", "Şokolad"],
                  ["tea", "Çay və qəhvə"],
                  ["candle", "Şamlar"],
                  ["cup", "Fincanlar"],
                  ["small", "Kiçik hədiyyələr"],
                ].map(([id, name]) => (
                  <button
                    className={category === id ? "active" : ""}
                    onClick={() => setCategory(id)}
                    key={id}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div className="product-picker">
                {catalog.products
                  .filter(
                    (p) =>
                      (!category || p.categoryId === category) &&
                      p.name
                        .toLocaleLowerCase("az")
                        .includes(search.toLocaleLowerCase("az")),
                  )
                  .map((p) => {
                    const qty =
                      config.items.find((i) => i.productId === p.id)
                        ?.quantity || 0;
                    return (
                      <article key={p.id} className={qty ? "selected" : ""}>
                        <img
                          src={p.image}
                          alt={p.name}
                          loading="lazy"
                          width="420"
                          height="330"
                        />
                        <h4>{p.name}</h4>
                        <div>
                          <span>{money(p.price)}</span>
                          {qty ? (
                            <div className="quantity">
                              <button
                                onClick={() => changeProduct(p.id, -1)}
                                aria-label={`${p.name} azalt`}
                              >
                                <Minus size={14} />
                              </button>
                              <span>{qty}</span>
                              <button
                                onClick={() => changeProduct(p.id, 1)}
                                aria-label={`${p.name} artır`}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              className="add-product"
                              disabled={!p.stock}
                              onClick={() => changeProduct(p.id, 1)}
                              aria-label={`${p.name} əlavə et`}
                            >
                              {p.stock ? <Plus size={18} /> : "Bitib"}
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              {[
                ["ribbon", "Lent rəngi"],
                ["tissue", "İpək kağız"],
                ["extra", "Bir az da özəllik"],
              ].map(([kind, title]) => (
                <section className="pack-options" key={kind}>
                  <h4>{title}</h4>
                  <div>
                    {catalog.packaging
                      .filter((p) => p.kind === kind)
                      .map((p) => (
                        <button
                          key={p.id}
                          className={
                            config.packaging.includes(p.id) ? "selected" : ""
                          }
                          onClick={() => {
                            const others =
                              kind === "extra"
                                ? config.packaging.filter((id) => id !== p.id)
                                : config.packaging.filter(
                                    (id) =>
                                      catalog.packaging.find((x) => x.id === id)
                                        ?.kind !== kind,
                                  );
                            update({
                              ...config,
                              packaging:
                                kind === "extra" &&
                                config.packaging.includes(p.id)
                                  ? others
                                  : [...others, p.id],
                            });
                          }}
                        >
                          <span style={{ background: p.color }} />
                          {p.name}
                          <small>
                            {p.price ? "+" + money(p.price) : "Daxildir"}
                          </small>
                          {config.packaging.includes(p.id) && (
                            <Check size={16} />
                          )}
                        </button>
                      ))}
                  </div>
                </section>
              ))}
            </>
          )}
          {step === 4 && (
            <div className="form-stack">
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={config.card.omit}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      card: { ...config.card, omit: e.target.checked },
                    })
                  }
                />{" "}
                Kart əlavə etmə
              </label>
              {!config.card.omit && (
                <>
                  <label>
                    Kimə?
                    <input
                      maxLength={60}
                      value={config.card.recipient}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          card: { ...config.card, recipient: e.target.value },
                        })
                      }
                      placeholder="Sevdiyinin adı"
                    />
                  </label>
                  <label>
                    Kimdən?
                    <input
                      maxLength={60}
                      value={config.card.sender}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          card: { ...config.card, sender: e.target.value },
                        })
                      }
                      placeholder="Sənin adın"
                    />
                  </label>
                  <label>
                    Ürəyindən keçənlər
                    <textarea
                      rows={5}
                      maxLength={300}
                      value={config.card.message}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          card: { ...config.card, message: e.target.value },
                        })
                      }
                      placeholder="Bəzən kiçik bir mesaj hər şeyi deyir..."
                    />
                    <small>{config.card.message.length} / 300</small>
                  </label>
                  <h4>Kartın üslubu</h4>
                  <div className="category-tabs">
                    {[
                      ["classic", "Klassik"],
                      ["rose", "Pudra"],
                      ["olive", "Zeytun"],
                    ].map(([id, name]) => (
                      <button
                        key={id}
                        className={config.card.style === id ? "active" : ""}
                        onClick={() =>
                          setConfig({
                            ...config,
                            card: {
                              ...config.card,
                              style: id as Configuration["card"]["style"],
                            },
                          })
                        }
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {step === 5 && (
            <div className="review">
              <div className="review-line">
                <h3>{box?.name}</h3>
                <button onClick={() => go(1)}>Dəyiş</button>
              </div>
              <ul>
                {config.items.map((i) => {
                  const p = catalog.products.find((p) => p.id === i.productId);
                  return (
                    <li key={i.productId}>
                      <span>
                        {p?.name} × {i.quantity}
                      </span>
                      <span>{money((p?.price || 0) * i.quantity)}</span>
                    </li>
                  );
                })}
              </ul>
              <button className="text-link" onClick={() => go(2)}>
                Məhsulları dəyiş
              </button>
              <hr />
              <p>
                {catalog.packaging
                  .filter((p) => config.packaging.includes(p.id))
                  .map((p) => p.name)
                  .join(" · ")}
              </p>
              <button className="text-link" onClick={() => go(3)}>
                Qablaşdırmanı dəyiş
              </button>
              <hr />
              <p>
                {config.card.omit
                  ? "Kartsız"
                  : config.card.message || "Mesajsız kart"}
              </p>
              <button className="text-link" onClick={() => go(4)}>
                Mesajı dəyiş
              </button>
              <hr />
              <div className="review-line">
                <span>Qutu</span>
                <span>{money(box?.price || 0)}</span>
              </div>
              <div className="review-line">
                <span>Məhsullar</span>
                <span>
                  {money(
                    config.items.reduce((sum, item) => {
                      const product = catalog.products.find(
                        (candidate) => candidate.id === item.productId,
                      );
                      return sum + (product?.price || 0) * item.quantity;
                    }, 0),
                  )}
                </span>
              </div>
              <div className="review-line">
                <span>Qablaşdırma əlavələri</span>
                <span>
                  {money(
                    catalog.packaging
                      .filter((p) => config.packaging.includes(p.id))
                      .reduce((n, p) => n + p.price, 0),
                  )}
                </span>
              </div>
              <div className="review-line review-total">
                <strong>Cəmi</strong>
                <strong>{money(total)}</strong>
              </div>
            </div>
          )}
          <p className="selection-feedback" aria-live="polite">
            {feedback}
          </p>
          {error && (
            <div role="alert" className="error-message">
              {error}
              {error.includes("doldu") && (
                <button onClick={() => go(1)}>Daha böyük qutu seç</button>
              )}
            </div>
          )}
          <div className="builder-bottom">
            <div aria-live="polite">
              <small>Sənin qutun</small>
              <strong>{money(total)}</strong>
            </div>
            {step > 1 && (
              <button
                className="icon-button"
                onClick={() => go(step - 1)}
                aria-label="Əvvəlki addım"
              >
                <ArrowLeft />
              </button>
            )}
            <button className="button" onClick={next}>
              {step === 5 ? "Səbətə əlavə et" : "Davam et"}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
