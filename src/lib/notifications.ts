// Deliberately no simulated email/SMS delivery. Integrations are opt-in.
export interface OrderNotification {
  reference: string;
  event: "ORDER_CREATED";
}
export interface NotificationAdapter {
  send(notification: OrderNotification, idempotencyKey: string): Promise<void>;
}
export class WebhookNotificationAdapter implements NotificationAdapter {
  async send(notification: OrderNotification, idempotencyKey: string) {
    const endpoint = process.env.NOTIFICATION_WEBHOOK_URL;
    if (!endpoint) throw Error("Notification integration is disabled");
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NOTIFICATION_WEBHOOK_SECRET}`,
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(notification),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw Error("Notification endpoint rejected request");
  }
}

export async function sendPendingNotifications(limit = 50) {
  if (!process.env.NOTIFICATION_WEBHOOK_URL) return 0;
  const { db } = await import("./db");
  const adapter = new WebhookNotificationAdapter();
  const rows = await db.notification.findMany({
    where: { sentAt: null, nextAttemptAt: { lte: new Date() } },
    take: limit,
    orderBy: { createdAt: "asc" },
  });
  let sent = 0;
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
      sent += 1;
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
  return sent;
}
