"use client";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Catalog, Configuration } from "@/lib/domain";
export function BoxPreview({
  config,
  catalog,
}: {
  config: Configuration;
  catalog: Catalog;
}) {
  const reduced = useReducedMotion();
  const ribbon = catalog.packaging.find(
    (p) => config.packaging.includes(p.id) && p.kind === "ribbon",
  );
  const tissue = catalog.packaging.find(
    (p) => config.packaging.includes(p.id) && p.kind === "tissue",
  );
  const products = config.items.flatMap((i) =>
    Array.from({ length: i.quantity }, (_, n) => ({
      product: catalog.products.find((p) => p.id === i.productId),
      key: i.productId + "-" + n,
    })),
  );
  return (
    <div className="preview-wrap">
      <div className="preview-top">
        <span>LUMA · SƏNİN QUTUN</span>
        <span>Üstdən görünüş</span>
      </div>
      <div
        className="gift-box"
        style={{ background: config.color, borderColor: config.color }}
      >
        <div className="box-tissue" style={{ background: tissue?.color }} />
        <div className="box-products">
          <AnimatePresence>
            {products.map(
              ({ product: p, key }) =>
                p && (
                  <motion.div
                    key={key}
                    initial={
                      reduced ? false : { opacity: 0, scale: 0.7, y: -15 }
                    }
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.25 }}
                  >
                    <img src={p.cutout || p.image} alt={p.name} />
                  </motion.div>
                ),
            )}
          </AnimatePresence>
          {!products.length && (
            <div className="empty-box">
              <span className="wordmark">luma</span>
              <p>Gözəl bir düşüncə ilə başla.</p>
            </div>
          )}
        </div>
        <div className="preview-ribbon" style={{ background: ribbon?.color }} />
        <span className="box-brand">luma</span>
      </div>
      {!config.card.omit && (
        <div className={"greeting-preview " + config.card.style}>
          <small>
            {config.card.recipient
              ? `${config.card.recipient} üçün`
              : "Sənin üçün"}
          </small>
          <p>{config.card.message || "Ən gözəl sözlər səndən gəlsin."}</p>
          <span>{config.card.sender}</span>
        </div>
      )}
      <p className="preview-disclaimer">
        Görünüş illüstrativdir. Qutudakı yerləşmə fərqli ola bilər.
      </p>
    </div>
  );
}
