import { z } from "zod";
import { db } from "@/lib/db";
import { readBody, rateLimit, apiError } from "@/lib/security";
export async function POST(r: Request) {
  try {
    await rateLimit(r, "contact", 5);
    const input = z
      .object({
        name: z.string().min(2).max(100),
        email: z.email(),
        message: z.string().min(10).max(3000),
        website: z.literal(""),
      })
      .parse(await readBody(r));
    await db.inquiry.create({
      data: { name: input.name, email: input.email, message: input.message },
    });
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
