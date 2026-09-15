import { getCatalog, getGifts } from "@/lib/catalog";
import { emptyConfig, money, priceConfiguration } from "@/lib/domain";
import { notFound } from "next/navigation";
import Link from "next/link";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const g = (await getGifts()).find((g) => g.slug === slug);
  return {
    title: g?.name || "Hədiyyə",
    alternates: { canonical: "/hediyyeler/" + slug },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [catalog, gifts] = await Promise.all([getCatalog(), getGifts()]);
  const g = gifts.find((g) => g.slug === slug);
  if (!g) notFound();
  const config = {
    ...emptyConfig(g.boxId),
    items: g.components.map((p) => ({
      productId: p.productId,
      quantity: p.quantity,
    })),
  };
  let priced;
  try {
    priced = priceConfiguration(config, catalog);
  } catch {}
  return (
    <section className="section gift-detail">
      {priced && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: g.name,
              description: g.description,
              image: new URL(
                g.image,
                process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
              ).toString(),
              offers: {
                "@type": "Offer",
                priceCurrency: "AZN",
                price: (priced.total / 100).toFixed(2),
                availability: "https://schema.org/InStock",
                url:
                  (process.env.NEXT_PUBLIC_SITE_URL ||
                    "http://localhost:3000") +
                  "/hediyyeler/" +
                  g.slug,
              },
            }).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <div>
        <img
          className="detail-main"
          src={g.image}
          alt={g.name}
          width="800"
          height="700"
        />
        <div className="detail-thumbs">
          {g.components.map((c) => {
            const p = catalog.products.find((p) => p.id === c.productId);
            return (
              p && (
                <img
                  key={p.id}
                  src={p.image}
                  alt={p.name}
                  width="150"
                  height="150"
                />
              )
            );
          })}
        </div>
      </div>
      <div>
        <Link href="/hediyyeler" className="text-link">
          ← Hədiyyələr
        </Link>
        <span className="eyebrow">{g.occasion}</span>
        <h1>{g.name}</h1>
        <p>{g.description}</p>
        <h3>{priced ? money(priced.total) : "Hazırda mövcud deyil"}</h3>
        <hr />
        <h4>Qutunun içində</h4>
        <ul className="contents-list">
          {g.components.map((c) => (
            <li key={c.id}>
              {catalog.products.find((p) => p.id === c.productId)?.name}{" "}
              <span>× {c.quantity}</span>
            </li>
          ))}
        </ul>
        <p>Qutu, lent, ipək kağız və şəxsi mesaj kartı daxildir.</p>
        {priced && (
          <Link className="button" href={"/qutunu-yarat?gift=" + slug}>
            Bu qutunu fərdiləşdir ↗
          </Link>
        )}
        <small className="muted">
          Çatdırılma seçimləri sifariş zamanı yoxlanılır. Foto illüstrativ
          nümunədir.
        </small>
      </div>
    </section>
  );
}
