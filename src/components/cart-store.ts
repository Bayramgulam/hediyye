import { configSchema, Configuration } from "@/lib/domain";
import { z } from "zod";
const schema = z.object({
  version: z.literal(1),
  items: z
    .array(
      z.object({
        id: z.string(),
        config: configSchema,
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .max(20),
});
export type CartItem = { id: string; config: Configuration; quantity: number };
export function readCart(): CartItem[] {
  try {
    return schema.parse(JSON.parse(localStorage.getItem("luma-cart") || "{}"))
      .items;
  } catch {
    return [];
  }
}
export function writeCart(items: CartItem[]) {
  localStorage.setItem("luma-cart", JSON.stringify({ version: 1, items }));
  window.dispatchEvent(new Event("cart-change"));
}
