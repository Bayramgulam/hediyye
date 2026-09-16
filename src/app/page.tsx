import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Gift,
  PenLine,
  PackageCheck,
} from "lucide-react";
import { getCatalog, getGifts, getSettings } from "@/lib/catalog";
import { emptyConfig, priceConfiguration } from "@/lib/domain";
import { GiftCard } from "@/components/gift-card";
import { HeroArt } from "@/components/hero-art";
export default async function Home() {
  const [catalog, gifts, s] = await Promise.all([
    getCatalog(),
    getGifts(),
    getSettings(),
  ]);
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span /> DÜŞÜNÜLƏRƏK SEÇİLƏN HƏDİYYƏLƏR
          </span>
          <h1>
            <span className="title-mask">
              <span>Bir qutu.</span>
            </span>
            <span className="title-mask">
              <span>
                İçində <em>sənin</em>
              </span>
            </span>
            <span className="title-mask">
              <span>seçdiklərin.</span>
            </span>
          </h1>
          <p>{s.heroText}</p>
          <Link className="button" href="/qutunu-yarat">
            Öz qutunu yarat <ArrowUpRight size={18} />
          </Link>
          <Link className="text-link" href="/hediyyeler">
            Hazır hədiyyələrə bax <ArrowRight size={17} />
          </Link>
          <div className="hero-note">
            <span className="tiny-flower">✳</span> Birinə özəl. Tam sənin kimi.
          </div>
        </div>
        <HeroArt image={s.heroImage} />
        <span className="hero-bottom">HƏR DETALDA BİR DÜŞÜNCƏ</span>
      </section>
      <div className="benefit-strip">
        <span>
          <Gift size={18} /> Sənin seçdiyin detallar
        </span>
        <span>
          <PenLine size={18} /> Öz sözlərinlə bir mesaj
        </span>
        <span>
          <PackageCheck size={18} /> Zövqlə hazırlanmış qutu
        </span>
      </div>
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">BİZ SEÇDİK, SƏN SEVİNDİR</span>
            <h2>
              Kiçik qutular, <em>böyük hisslər.</em>
            </h2>
          </div>
          <Link className="text-link" href="/hediyyeler">
            Bütün hədiyyələr <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="gift-grid">
          {gifts
            .filter((g) => g.featured)
            .slice(0, 3)
            .map((g, i) => {
              const c = {
                ...emptyConfig(g.boxId),
                items: g.components.map((p) => ({
                  productId: p.productId,
                  quantity: p.quantity,
                })),
              };
              return (
                <GiftCard
                  key={g.id}
                  gift={g}
                  price={priceConfiguration(c, catalog, true, false).total}
                  index={i}
                />
              );
            })}
        </div>
      </section>
      <section className="builder-intro">
        <div className="intro-image">
          <img
            src="/images/product-5.webp"
            alt="Bordo lentlə bağlanmış hədiyyə qutusu"
            loading="lazy"
            width="600"
            height="600"
          />
          <span className="intro-caption">
            Bir qutu. Min cür “səni düşündüm”.
          </span>
        </div>
        <div className="intro-copy">
          <span className="eyebrow">BU DƏFƏ DİZAYNER SƏNSƏN</span>
          <h2>
            Onu ən yaxşı
            <br />
            <em>sən tanıyırsan.</em>
          </h2>
          <p>
            Sevdiyi fincan. Ən sevdiyi şokolad. Yalnız sizin anladığınız bir
            mesaj. Hamısını bir qutuda birləşdir.
          </p>
          <div className="mini-products">
            {catalog.products
              .filter((p) => ["p0", "p1", "p2"].includes(p.id))
              .map((p) => (
                <Link key={p.id} href={"/qutunu-yarat?product=" + p.id}>
                  <img src={p.image} alt="" width="80" height="80" />
                  <span>{p.name}</span>
                  <b>+</b>
                </Link>
              ))}
          </div>
          <Link className="button" href="/qutunu-yarat">
            Sənin qutun, sənin hekayən <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <section className="section occasions">
        <span className="eyebrow">HƏR AN ÜÇÜN BİR DÜŞÜNCƏ</span>
        <h2>
          Səbəb çoxdur.
          <br />
          <em>Bəzən səbəb də lazım deyil.</em>
        </h2>
        <div className="occasion-grid">
          {["Ad günü", "Təşəkkür", "Təbrik", "Kiçik jest"].map((o, i) => (
            <Link
              key={o}
              href={"/hediyyeler?occasion=" + encodeURIComponent(o)}
            >
              <span className="occasion-number">0{i + 1}</span>
              <h3>{o}</h3>
              <ArrowUpRight />
            </Link>
          ))}
        </div>
      </section>
      <section id="nece-isleyir" className="how section">
        <div>
          <span className="eyebrow">ÜÇ SADƏ ADDIM</span>
          <h2>
            Sevinc yaratmaq
            <br />
            <em>bu qədər asandır.</em>
          </h2>
        </div>
        <div className="steps-story">
          {[
            ["Qutunu seç", "Kiçik bir jest, yoxsa böyük bir sürpriz?"],
            ["İçini özün tamamla", "Sevdiyi detalları bir araya gətir."],
            ["Mesajını əlavə et", "Hədiyyəyə öz sözlərinlə nöqtə qoy."],
          ].map(([title, desc], i) => (
            <div key={title}>
              <span>0{i + 1}</span>
              <section>
                <h3>{title}</h3>
                <p>{desc}</p>
              </section>
            </div>
          ))}
        </div>
      </section>
      <section className="packaging-story">
        <img
          src="/images/hero.webp"
          alt="İpək lent və incə qablaşdırma detalları"
          loading="lazy"
          width="800"
          height="500"
        />
        <div>
          <span className="eyebrow">SON TOXUNUŞ DA ÖNƏMLİDİR</span>
          <h2>
            Hələ açılmadan
            <br />
            <em>xoşbəxt edən.</em>
          </h2>
          <p>
            Yumşaq kağız, zərif lent, səmimi bir qeyd. Hər detal hədiyyənin bir
            hissəsidir.
          </p>
        </div>
      </section>
      <section className="section faq">
        <div>
          <span className="eyebrow">AĞLINDA QALANLAR</span>
          <h2>
            Kiçik suallar,
            <br />
            <em>aydın cavablar.</em>
          </h2>
        </div>
        <div>
          {[
            [
              "Qutunun içini özüm seçə bilərəm?",
              "Bəli. Qutunun ölçüsünü, məhsulları, lent rəngini və şəxsi mesajını özün seçə bilərsən.",
            ],
            ["Çatdırılma necə təşkil olunur?", s.policies.catdirilma],
            [
              "Sifarişi özüm götürə bilərəm?",
              s.pickup
                ? "Sifariş zamanı mövcud təhvil tarixini seçə bilərsən."
                : "Mağazadan təhvil seçimi hazırda aktiv deyil.",
            ],
            [
              "Seçdiyim məhsul bitibsə nə olur?",
              "Məhsulların mövcudluğu sifariş təsdiqlənərkən yenidən yoxlanılır.",
            ],
            [
              "Sifarişimi dəyişə bilərəm?",
              "Şəxsi izləmə səhifəsindəki sifariş nömrəsi ilə əlaqə formasından bizə yaz. Dəyişiklik imkanını mağaza təsdiqləyir.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span>+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
