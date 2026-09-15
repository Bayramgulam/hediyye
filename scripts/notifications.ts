import "dotenv/config";
import { db } from "../src/lib/db";
import { WebhookNotificationAdapter } from "../src/lib/notifications";
async function main() {
  if (!process.env.NOTIFICATION_WEBHOOK_URL) {
    console.log("Notifications disabled: no webhook configured.");
    return;
  }
  const adapter = new WebhookNotificationAdapter();
  const rows = await db.notification.findMany({
    where: { sentAt: null, nextAttemptAt: { lte: new Date() } },
    take: 50,
    orderBy: { createdAt: "asc" },
  });
  for (const row of rows) {
    try {
      await adapter.send(
        { reference: row.reference, event: "ORDER_CREATED" },
        row.id,
      );
      await db.notification.update({
        where: { id: row.id },
        data: { sentAt: new Date(), attempts: { increment: 1 } },
      });
    } catch {
      await db.notification.update({
        where: { id: row.id },
        data: {
          attempts: { increment: 1 },
          nextAttemptAt: new Date(
            Date.now() +
              Math.min(86400, 60 * 2 ** Math.min(row.attempts, 10)) * 1000,
          ),
        },
      });
      console.error("notification_retry", { id: row.id });
    }
  }
}
main().finally(() => db.$disconnect());
