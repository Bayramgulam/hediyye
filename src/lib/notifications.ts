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
