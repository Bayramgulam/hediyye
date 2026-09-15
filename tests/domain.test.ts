import { describe, it, expect } from "vitest";
import {
  emptyConfig,
  priceConfiguration,
  normalizePhone,
  validDeliveryDate,
  defaultSettings,
  canTransition,
  Catalog,
} from "../src/lib/domain";
const catalog: Catalog = {
  products: [
    {
      id: "p",
      name: "Fincan",
      price: 1800,
      stock: 2,
      units: 2,
      active: true,
      compatibleBoxes: ["medium"],
      image: "",
      categoryId: "cup",
    },
  ],
  boxes: [
    {
      id: "medium",
      name: "Qutu",
      price: 1500,
      capacity: 3,
      colors: ["#F0E5D5"],
      active: true,
      dimensions: "",
      image: "",
    },
  ],
  packaging: [
    {
      id: "ribbon-burgundy",
      kind: "ribbon",
      name: "Bordo",
      color: "",
      price: 0,
      active: true,
    },
    {
      id: "tissue-ivory",
      kind: "tissue",
      name: "Kağız",
      color: "",
      price: 0,
      active: true,
    },
  ],
};
describe("Pricing and capacity", () => {
  it("ignores tampered client prices", () => {
    const c = {
      ...emptyConfig(),
      items: [{ productId: "p", quantity: 1, price: 1 }],
      total: 1,
    };
    expect(priceConfiguration(c, catalog).total).toBe(3300);
  });
  it("rejects capacity overflow", () =>
    expect(() =>
      priceConfiguration(
        { ...emptyConfig(), items: [{ productId: "p", quantity: 2 }] },
        catalog,
      ),
    ).toThrow("doldu"));
  it("rejects incompatibility", () =>
    expect(() =>
      priceConfiguration(
        { ...emptyConfig(), items: [{ productId: "p", quantity: 1 }] },
        {
          ...catalog,
          products: catalog.products.map((p) => ({
            ...p,
            compatibleBoxes: [],
          })),
        },
      ),
    ).toThrow("uyğun"));
  it("rejects stock shortage", () =>
    expect(() =>
      priceConfiguration(
        { ...emptyConfig(), items: [{ productId: "p", quantity: 3 }] },
        catalog,
      ),
    ).toThrow("stok"));
  it("rejects duplicate product lines and ribbons", () => {
    expect(() =>
      priceConfiguration(
        {
          ...emptyConfig(),
          items: [
            { productId: "p", quantity: 1 },
            { productId: "p", quantity: 1 },
          ],
        },
        catalog,
      ),
    ).toThrow("Təkrarlanan");
    expect(() =>
      priceConfiguration(
        {
          ...emptyConfig(),
          packaging: ["ribbon-burgundy", "ribbon-burgundy"],
          items: [{ productId: "p", quantity: 1 }],
        },
        catalog,
      ),
    ).toThrow();
  });
});
describe("Fulfillment", () => {
  it("normalizes Azerbaijani phones", () => {
    expect(normalizePhone("050 123 45 67")).toBe("+994501234567");
    expect(() => normalizePhone("123")).toThrow();
  });
  it("honors Baku cutoff and disabled dates", () => {
    const now = new Date("2026-09-14T14:00:00Z");
    expect(validDeliveryDate("2026-09-15", defaultSettings, now)).toBe(false);
    expect(validDeliveryDate("2026-09-16", defaultSettings, now)).toBe(true);
    expect(
      validDeliveryDate(
        "2026-09-16",
        { ...defaultSettings, disabledDates: ["2026-09-16"] },
        now,
      ),
    ).toBe(false);
  });
  it("separates pickup and delivery paths", () => {
    expect(canTransition("READY", "OUT_FOR_DELIVERY", true)).toBe(false);
    expect(canTransition("READY", "DELIVERED", true)).toBe(true);
    expect(canTransition("READY", "DELIVERED", false)).toBe(false);
    expect(canTransition("CANCELLED", "CONFIRMED", false)).toBe(false);
  });
});
