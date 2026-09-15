import { z } from "zod";
export const money = (value: number) =>
  (value / 100).toFixed(2).replace(".", ",") + " ₼";
export const configSchema = z.object({
  version: z.literal(1),
  boxId: z.string(),
  color: z.string(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .max(30),
  packaging: z.array(z.string()).max(10),
  card: z.object({
    omit: z.boolean(),
    recipient: z.string().max(60),
    sender: z.string().max(60),
    message: z.string().max(300),
    style: z.enum(["classic", "rose", "olive"]),
  }),
});
export type Configuration = z.infer<typeof configSchema>;
export type ProductData = {
  id: string;
  name: string;
  price: number;
  stock: number;
  units: number;
  active: boolean;
  compatibleBoxes: string[];
  image: string;
  cutout?: string | null;
  categoryId: string;
};
export type BoxData = {
  id: string;
  name: string;
  price: number;
  capacity: number;
  colors: string[];
  active: boolean;
  dimensions: string;
  image: string;
};
export type PackagingData = {
  id: string;
  name: string;
  kind: string;
  color: string;
  price: number;
  active: boolean;
};
export type Catalog = {
  products: ProductData[];
  boxes: BoxData[];
  packaging: PackagingData[];
};
export const emptyConfig = (boxId = "medium"): Configuration => ({
  version: 1,
  boxId,
  color: "#F0E5D5",
  items: [],
  packaging: ["ribbon-burgundy", "tissue-ivory"],
  card: {
    omit: false,
    recipient: "",
    sender: "",
    message: "",
    style: "classic",
  },
});
export function priceConfiguration(
  input: unknown,
  catalog: Catalog,
  requireItems = true,
  checkStock = true,
) {
  const config = configSchema.parse(input);
  const box = catalog.boxes.find((b) => b.id === config.boxId && b.active);
  if (!box) throw Error("Qutu mövcud deyil.");
  if (!box.colors.includes(config.color))
    throw Error("Qutu rəngi mövcud deyil.");
  if (requireItems && !config.items.length)
    throw Error("Ən azı bir hədiyyə seçin.");
  if (
    new Set(config.items.map((i) => i.productId)).size !== config.items.length
  )
    throw Error("Təkrarlanan məhsul.");
  const items = config.items.map((i) => {
    const p = catalog.products.find((p) => p.id === i.productId && p.active);
    if (!p) throw Error("Məhsul mövcud deyil.");
    if (!p.compatibleBoxes.includes(box.id))
      throw Error(`${p.name} bu qutuya uyğun deyil.`);
    if (checkStock && p.stock < i.quantity)
      throw Error(`${p.name}: kifayət qədər stok yoxdur.`);
    return {
      ...i,
      name: p.name,
      price: p.price,
      units: p.units,
      image: p.image,
    };
  });
  const units = items.reduce((n, i) => n + i.units * i.quantity, 0);
  if (units > box.capacity)
    throw Error("Bu qutu doldu. Daha böyük qutu seçin.");
  if (new Set(config.packaging).size !== config.packaging.length)
    throw Error("Təkrarlanan qablaşdırma.");
  const packaging = config.packaging.map((id) => {
    const p = catalog.packaging.find((p) => p.id === id && p.active);
    if (!p) throw Error("Qablaşdırma mövcud deyil.");
    return p;
  });
  for (const kind of ["ribbon", "tissue"])
    if (packaging.filter((p) => p.kind === kind).length !== 1)
      throw Error("Lent və kağız seçin.");
  const subtotal = items.reduce((n, i) => n + i.price * i.quantity, 0);
  const packagingTotal = packaging.reduce((n, p) => n + p.price, 0);
  return {
    config,
    box,
    items,
    packaging,
    units,
    subtotal,
    packagingTotal,
    total: box.price + subtotal + packagingTotal,
  };
}
export function normalizePhone(s: string) {
  const n = s.replace(/[\s()-]/g, "").replace(/^00/, "+");
  const phone = n.startsWith("0")
    ? "+994" + n.slice(1)
    : n.startsWith("994")
      ? "+" + n
      : n;
  if (!/^\+994(?:10|50|51|55|60|70|77|99|12)\d{7}$/.test(phone))
    throw Error("Telefon nümunəsi: +994 50 123 45 67");
  return phone;
}
export function bakuDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baku",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function validDeliveryDate(
  date: string,
  settings: StoreSettings,
  now = new Date(),
) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Baku",
      hour: "2-digit",
      hour12: false,
    }).format(now),
  );
  const earliest = new Date(bakuDate(now) + "T00:00:00Z");
  earliest.setUTCDate(
    earliest.getUTCDate() +
      settings.leadDays +
      (hour >= settings.cutoffHour ? 1 : 0),
  );
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    date >= earliest.toISOString().slice(0, 10) &&
    !settings.disabledDates.includes(date)
  );
}
export const transitions: Record<string, string[]> = {
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};
export function canTransition(from: string, to: string, pickup: boolean) {
  return (
    (transitions[from] ?? []).includes(to) &&
    !(pickup && to === "OUT_FOR_DELIVERY") &&
    !(!pickup && from === "READY" && to === "DELIVERED")
  );
}
export const settingsSchema = z.object({
  brand: z.string().min(1).max(40),
  logo: z.string().max(500).default(""),
  heroImage: z.string().max(500).default("/images/hero.webp"),
  email: z.union([z.email().max(100), z.literal("")]),
  phone: z.string().max(30),
  address: z.string().max(300),
  instagram: z.union([
    z
      .url()
      .max(200)
      .refine((s) => s.startsWith("https://")),
    z.literal(""),
  ]),
  heroText: z.string().max(200),
  pickup: z.boolean(),
  delivery: z.boolean(),
  cashDelivery: z.boolean(),
  cashPickup: z.boolean(),
  leadDays: z.number().int().min(0).max(30),
  cutoffHour: z.number().int().min(0).max(23),
  disabledDates: z.array(z.string()),
  reservationHours: z.number().int().min(1).max(168),
  policies: z.record(z.string(), z.string().max(20000)),
});
export type StoreSettings = z.infer<typeof settingsSchema>;
export const defaultSettings: StoreSettings = {
  brand: "LUMA",
  logo: "",
  heroImage: "/images/hero.webp",
  email: "",
  phone: "",
  address: "",
  instagram: "",
  heroText:
    "Sevdiyi detalları bir araya gətir. Qalanını biz zövqlə hazırlayaq.",
  pickup: false,
  delivery: false,
  cashDelivery: false,
  cashPickup: false,
  leadDays: 1,
  cutoffHour: 17,
  disabledDates: [],
  reservationHours: 24,
  policies: {
    catdirilma:
      "Çatdırılma və təhvil şərtləri mağaza tərəfindən hazırlanır. Sifarişdən əvvəl mövcud seçimləri yoxlayın.",
    mexfilik:
      "Qaralama: sifarişin hazırlanması üçün ad, əlaqə və çatdırılma məlumatları işlənir. Saxlanma müddəti və məlumat hüquqları mağaza tərəfindən tamamlanmalıdır.",
    sertler:
      "Qaralama: sifariş, dəyişiklik, ləğv və qaytarma şərtləri mağaza tərəfindən nəzərdən keçirilməli və təsdiqlənməlidir.",
  },
};
