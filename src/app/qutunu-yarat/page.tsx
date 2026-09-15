import { getCatalog, getGifts } from "@/lib/catalog";
import { Builder } from "@/components/builder";
import { emptyConfig } from "@/lib/domain";
export const metadata = { title: "Öz qutunu yarat" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const catalog = await getCatalog();
  const gift = params.gift
    ? (await getGifts()).find((g) => g.slug === params.gift)
    : undefined;
  return (
    <Builder
      catalog={catalog}
      initial={
        gift
          ? {
              ...emptyConfig(gift.boxId),
              items: gift.components.map((p) => ({
                productId: p.productId,
                quantity: p.quantity,
              })),
            }
          : undefined
      }
    />
  );
}
