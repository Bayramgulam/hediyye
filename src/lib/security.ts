import { createHash } from "node:crypto";
import { db } from "./db";
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export async function readBody(request: Request) {
  if (
    request.headers.get("origin") !==
    new URL(process.env.BETTER_AUTH_URL || "http://localhost:3000").origin
  )
    throw Error("FORBIDDEN");
  if (Number(request.headers.get("content-length")) > 32768)
    throw Error("Sorğu çox böyükdür.");
  const reader = request.body?.getReader();
  if (!reader) throw Error("Sorğu boşdur.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 32768) {
      await reader.cancel();
      throw Error("Sorğu çox böyükdür.");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export async function rateLimit(request: Request, scope: string, limit = 15) {
  const ip = request.headers.get("x-real-ip") || "local";
  const key = hash(scope + ip);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`INSERT INTO "RateLimit" (key,count,"expiresAt") VALUES (${key},1,NOW()+INTERVAL '10 minutes') ON CONFLICT (key) DO UPDATE SET count=CASE WHEN "RateLimit"."expiresAt"<NOW() THEN 1 ELSE "RateLimit".count+1 END,"expiresAt"=CASE WHEN "RateLimit"."expiresAt"<NOW() THEN NOW()+INTERVAL '10 minutes' ELSE "RateLimit"."expiresAt" END`;
    const row = await tx.rateLimit.findUniqueOrThrow({ where: { key } });
    if (row.count > limit)
      throw Error("Çox sayda sorğu. Bir az sonra yenidən sınayın.");
  });
}
export function apiError(e: unknown) {
  const message = e instanceof Error ? e.message : "";
  const status =
    message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
  const safe =
    message.length < 200 &&
    !/prisma|database|connection|Invalid|P20|constraint/i.test(message)
      ? message
      : "Əməliyyat tamamlanmadı. Məlumatları yoxlayıb yenidən sınayın.";
  return Response.json({ error: safe }, { status });
}
