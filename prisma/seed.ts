import { PrismaClient } from "@prisma/client";
import { defaultSettings } from "../src/lib/domain";
const db = new PrismaClient();
async function main() {
  if (process.env.NODE_ENV === "production")
    throw Error("Development seed cannot run in production");
  const categories = [
    ["chocolate", "Şokolad"],
    ["tea", "Çay və qəhvə"],
    ["candle", "Şamlar"],
    ["cup", "Fincanlar"],
    ["small", "Kiçik hədiyyələr"],
  ];
  for (const [id, name] of categories)
    await db.category.upsert({
      where: { id },
      create: { id, name },
      update: {},
    });
  for (const [id, name, capacity, price, dimensions] of [
    ["small", "Kiçik bir sevinc", 5, 1000, "20 × 20 × 9 sm"],
    ["medium", "Gözəl bir düşüncə", 9, 1500, "28 × 24 × 10 sm"],
    ["large", "Böyük bir xoşbəxtlik", 14, 2200, "35 × 28 × 12 sm"],
  ] as const)
    await db.box.upsert({
      where: { id },
      create: {
        id,
        name,
        capacity,
        price,
        dimensions,
        image: "/images/product-5.webp",
        colors: ["#F0E5D5", "#D7B7AE", "#777B62"],
      },
      update: {},
    });
  const names = [
    ["Keramika fincan", "cup", 1800, 2, 0],
    ["Vanil şamı", "candle", 2200, 2, 1],
    ["Tünd şokolad", "chocolate", 900, 1, 2],
    ["Yasəmən çayı", "tea", 1400, 1, 3],
    ["Quru çiçək dəstəsi", "small", 800, 1, 4],
    ["Südlü şokolad", "chocolate", 850, 1, 2],
    ["Fındıqlı şokolad", "chocolate", 1100, 1, 2],
    ["Darçınlı şam", "candle", 2000, 2, 1],
    ["Səhər qəhvəsi", "tea", 1600, 1, 3],
    ["Yaşıl çay", "tea", 1200, 1, 3],
    ["Çəhrayı fincan", "cup", 1900, 2, 0],
    ["Zeytun fincanı", "cup", 1900, 2, 0],
    ["Lavanda şamı", "candle", 2100, 2, 1],
    ["Kiçik buket", "small", 1000, 1, 4],
    ["Nanəli çay", "tea", 1300, 1, 3],
    ["Duzlu karamel", "chocolate", 1200, 1, 2],
    ["Çiçəkli kart", "small", 500, 1, 4],
    ["Böyük keramika fincan", "cup", 2600, 3, 0],
  ] as const;
  for (let i = 0; i < names.length; i++) {
    const [name, categoryId, price, units, image] = names[i];
    await db.product.upsert({
      where: { id: "p" + i },
      create: {
        id: "p" + i,
        name,
        categoryId,
        price,
        units,
        stock: i === 16 ? 0 : 30,
        compatibleBoxes:
          i === 17 ? ["medium", "large"] : ["small", "medium", "large"],
        image: `/images/product-${image}.webp`,
        cutout: `/images/cutout-${image}.webp`,
        description:
          "İllüstrativ nümunə məhsul. Məhsul məlumatları mağaza tərəfindən yenilənə bilər.",
      },
      update: {},
    });
  }
  for (const [id, kind, name, color, price] of [
    ["ribbon-burgundy", "ribbon", "Bordo", "#642C3B", 0],
    ["ribbon-rose", "ribbon", "Pudra", "#D7B7AE", 0],
    ["ribbon-olive", "ribbon", "Zeytun", "#777B62", 0],
    ["tissue-ivory", "tissue", "Fil sümüyü", "#F7F3EC", 0],
    ["tissue-rose", "tissue", "Çəhrayı", "#E8D2CB", 0],
    ["extra-flower", "extra", "Quru çiçək bəzəyi", "#B99A70", 400],
  ] as const)
    await db.packaging.upsert({
      where: { id },
      create: { id, kind, name, color, price },
      update: {},
    });
  const gifts = [
    [
      "sakit-seher",
      "Sakit səhər",
      "Özünə bir az vaxt. Bir fincan çay, bir parça şokolad.",
      "Kiçik jest",
      [0, 2, 3],
    ],
    [
      "senin-ucun",
      "Sənin üçün",
      "İsti rənglər, incə detallar və səmimi bir düşüncə.",
      "Ad günü",
      [0, 1, 4],
    ],
    [
      "cox-sag-ol",
      "Çox sağ ol",
      "Sözlərin yanına kiçik bir təşəkkür.",
      "Təşəkkür",
      [2, 3, 4],
    ],
    [
      "isti-anlar",
      "İsti anlar",
      "Yavaşlayan axşamlar üçün seçilən detallar.",
      "Kiçik jest",
      [1, 2, 9],
    ],
    [
      "birlikde",
      "Birlikdə",
      "Paylaşmağa dəyər xoş anlar.",
      "Təbrik",
      [0, 5, 8],
    ],
    [
      "yeni-baslangic",
      "Yeni başlanğıc",
      "Yeni səhifələrə gözəl bir hədiyyə.",
      "Təbrik",
      [11, 12, 14],
    ],
  ] as const;
  for (let i = 0; i < gifts.length; i++) {
    const [slug, name, description, occasion, ids] = gifts[i];
    await db.gift.upsert({
      where: { slug },
      create: {
        slug,
        name,
        description,
        occasion,
        boxId: "medium",
        image: `/images/gift-${i % 3}.webp`,
        featured: i < 3,
        position: i,
        components: {
          create: ids.map((p) => ({ productId: "p" + p, quantity: 1 })),
        },
      },
      update: {},
    });
  }
  await db.settings.upsert({
    where: { id: "store" },
    create: { id: "store", data: defaultSettings },
    update: {},
  });
  console.log(
    "Development catalog seeded. Delivery and payment remain disabled until configured.",
  );
}
main().finally(() => db.$disconnect());
