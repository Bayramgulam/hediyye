export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/sifaris", "/izle", "/sebet"],
    },
    sitemap:
      (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000") +
      "/sitemap.xml",
  };
}
