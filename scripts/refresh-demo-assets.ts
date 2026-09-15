import "dotenv/config";
import { db } from "../src/lib/db";
if (
  process.env.NODE_ENV === "production" ||
  !process.env.DATABASE_URL?.includes("localhost")
)
  throw Error("Local demo only");
const products = await db.product.findMany({
  where: { id: { in: Array.from({ length: 18 }, (_, i) => "p" + i) } },
});
for (const p of products) {
  const match = p.image.match(/^\/images\/product-(\d)\.webp$/);
  if (match)
    await db.product.update({
      where: { id: p.id },
      data: { cutout: `/images/cutout-${match[1]}.webp` },
    });
}
const gifts = await db.gift.findMany({
  where: { image: "/images/hero.webp" },
  orderBy: { position: "asc" },
});
for (let i = 0; i < gifts.length; i++)
  await db.gift.update({
    where: { id: gifts[i].id },
    data: { image: `/images/gift-${i % 3}.webp` },
  });
await db.box.updateMany({
  where: { image: "/images/hero.webp" },
  data: { image: "/images/product-5.webp" },
});
await db.$disconnect();
