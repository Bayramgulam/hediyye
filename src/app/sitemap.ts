import { getGifts } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return [
    "",
    "/hediyyeler",
    "/qutunu-yarat",
    "/elaqe",
    ...(await getGifts()).map((g) => "/hediyyeler/" + g.slug),
  ].map((p) => ({ url: base + p }));
}
