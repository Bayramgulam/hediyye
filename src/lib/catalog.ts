import { cache } from "react";
import { db } from "./db";
import { defaultSettings, settingsSchema } from "./domain";
export const getCatalog = cache(async () => {
  const [products, boxes, packaging] = await Promise.all([
    db.product.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.box.findMany({ where: { active: true }, orderBy: { capacity: "asc" } }),
    db.packaging.findMany({ where: { active: true } }),
  ]);
  return { products, boxes, packaging };
});
export const getSettings = cache(async () => {
  const row = await db.settings.findUnique({ where: { id: "store" } });
  return row ? settingsSchema.parse(row.data) : defaultSettings;
});
export const getGifts = cache(() =>
  db.gift.findMany({
    where: {
      active: true,
      box: { active: true },
      components: { every: { product: { active: true } } },
    },
    include: { components: true },
    orderBy: { position: "asc" },
  }),
);
