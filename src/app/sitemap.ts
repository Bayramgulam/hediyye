import { getGifts } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/site-url";
export const dynamic = "force-dynamic";
export default async function sitemap() {
  const base = getSiteUrl();
  return [
    "",
    "/hediyyeler",
    "/qutunu-yarat",
    "/elaqe",
    ...(await getGifts()).map((g) => "/hediyyeler/" + g.slug),
  ].map((p) => ({ url: base + p }));
}
