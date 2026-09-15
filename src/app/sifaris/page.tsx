import { getCatalog, getSettings } from "@/lib/catalog";
import { db } from "@/lib/db";
import { validDeliveryDate } from "@/lib/domain";
import { Checkout } from "@/components/checkout";
export const metadata = {
  title: "Sifariş",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const [catalog, settings, zones, allSlots] = await Promise.all([
    getCatalog(),
    getSettings(),
    db.deliveryZone.findMany({ where: { active: true } }),
    db.deliverySlot.findMany({ orderBy: { date: "asc" } }),
  ]);
  return (
    <Checkout
      catalog={catalog}
      settings={settings}
      zones={zones}
      slots={allSlots.filter(
        (s) => s.reserved < s.capacity && validDeliveryDate(s.date, settings),
      )}
    />
  );
}
