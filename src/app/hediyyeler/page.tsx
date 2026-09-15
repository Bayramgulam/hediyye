import { getCatalog, getGifts } from "@/lib/catalog";
import { emptyConfig, priceConfiguration } from "@/lib/domain";
import { GiftCard } from "@/components/gift-card";
import Link from "next/link";
export const metadata = {
  title: "Hədiyyələr",
  alternates: { canonical: "/hediyyeler" },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const q = await searchParams;
  const [catalog, gifts] = await Promise.all([getCatalog(), getGifts()]);
  let entries = gifts
    .map((g) => ({
      gift: g,
      price: priceConfiguration(
        {
          ...emptyConfig(g.boxId),
          items: g.components.map((p) => ({
            productId: p.productId,
            quantity: p.quantity,
          })),
        },
        catalog,
        true,
        false,
      ).total,
    }))
    .filter(
      ({ gift: g, price }) =>
        (!q.occasion || g.occasion === q.occasion) &&
        (!q.category ||
          g.components.some(
            (c) =>
              catalog.products.find((p) => p.id === c.productId)?.categoryId ===
              q.category,
          )) &&
        (!q.max || price <= Number(q.max) * 100),
    );
  if (q.sort === "asc") entries = entries.sort((a, b) => a.price - b.price);
  if (q.sort === "desc") entries = entries.sort((a, b) => b.price - a.price);
  return (
    <section className="section catalog-page">
      <span className="eyebrow">DÜŞÜNÜLƏRƏK BİR ARAYA GƏLDİ</span>
      <h1>
        Hər qutuda <em>bir hiss.</em>
      </h1>
      <p>Hazır seçimlərimizdən ilham al. Öz toxunuşunu əlavə et.</p>
      <form className="catalog-filters">
        <label>
          Səbəb
          <select name="occasion" defaultValue={q.occasion || ""}>
            <option value="">Bütün anlar</option>
            {["Ad günü", "Təşəkkür", "Təbrik", "Kiçik jest"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          İçindəkilər
          <select name="category" defaultValue={q.category || ""}>
            <option value="">Hamısı</option>
            <option value="cup">Fincanlar</option>
            <option value="candle">Şamlar</option>
            <option value="tea">Çay və qəhvə</option>
            <option value="chocolate">Şokolad</option>
          </select>
        </label>
        <label>
          Maksimum qiymət
          <input
            name="max"
            type="number"
            min="0"
            placeholder="AZN"
            defaultValue={q.max}
          />
        </label>
        <label>
          Sıralama
          <select name="sort" defaultValue={q.sort || ""}>
            <option value="">Seçimlərimiz</option>
            <option value="asc">Qiymət: artan</option>
            <option value="desc">Qiymət: azalan</option>
          </select>
        </label>
        <button className="button">Göstər</button>
        <Link href="/hediyyeler">Təmizlə</Link>
      </form>
      <div className="gift-grid">
        {entries.map(({ gift, price }, i) => (
          <GiftCard key={gift.id} gift={gift} price={price} index={i} />
        ))}
      </div>
      {!entries.length && (
        <div className="empty-state">
          <h2>Bu seçimə uyğun qutu tapılmadı.</h2>
          <Link href="/hediyyeler" className="text-link">
            Filtrləri təmizlə →
          </Link>
        </div>
      )}
    </section>
  );
}
