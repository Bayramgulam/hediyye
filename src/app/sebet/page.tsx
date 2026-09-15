import { getCatalog } from "@/lib/catalog";
import { Cart } from "@/components/cart";
export const metadata = {
  title: "Səbət",
  robots: { index: false, follow: false },
};
export default async function Page() {
  return <Cart catalog={await getCatalog()} />;
}
