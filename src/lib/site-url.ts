function httpOrigin(value: string | undefined) {
  if (!value) return;

  try {
    const url = new URL(value.trim());
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.origin;
    }
  } catch {}
}

export function getSiteUrl() {
  return (
    httpOrigin(process.env.NEXT_PUBLIC_SITE_URL) ||
    httpOrigin(process.env.URL) ||
    httpOrigin(process.env.DEPLOY_PRIME_URL) ||
    "http://localhost:3000"
  );
}

export function getAuthUrl() {
  return httpOrigin(process.env.BETTER_AUTH_URL) || getSiteUrl();
}
