import { sendPendingNotifications } from "../../src/lib/notifications";
import { db } from "../../src/lib/db";

export default async () => {
  try {
    const sent = await sendPendingNotifications();
    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { "content-type": "application/json" },
    });
  } finally {
    await db.$disconnect();
  }
};

export const config = { schedule: "*/5 * * * *" };
