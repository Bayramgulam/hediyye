import { cleanupExpiredReservations } from "../../src/lib/orders";
import { db } from "../../src/lib/db";

export default async () => {
  try {
    const cleaned = await cleanupExpiredReservations();
    return new Response(JSON.stringify({ ok: true, cleaned }), {
      headers: { "content-type": "application/json" },
    });
  } finally {
    await db.$disconnect();
  }
};

export const config = { schedule: "*/5 * * * *" };
