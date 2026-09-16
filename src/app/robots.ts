import { getSiteUrl } from "@/lib/site-url";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/sifaris", "/izle", "/sebet"],
    },
    sitemap: getSiteUrl() + "/sitemap.xml",
  };
}
