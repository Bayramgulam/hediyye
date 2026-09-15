import type { StoreSettings } from "./domain";
export interface PaymentProvider {
  id: string;
  isAvailable(settings: StoreSettings, method: "pickup" | "delivery"): boolean;
  initialStatus: "UNPAID";
}
export const cashPayment: PaymentProvider = {
  id: "cash",
  initialStatus: "UNPAID",
  isAvailable: (s, method) =>
    method === "pickup"
      ? s.pickup && s.cashPickup
      : s.delivery && s.cashDelivery,
};
// A future online adapter must create a provider session outside the order transaction,
// authenticate webhook signatures, and idempotently record settled amounts.
export const paymentProviders: PaymentProvider[] = [cashPayment];
