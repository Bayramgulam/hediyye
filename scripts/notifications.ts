import "dotenv/config";
import { db } from "../src/lib/db";
import { sendPendingNotifications } from "../src/lib/notifications";
async function main() {
  if (!process.env.NOTIFICATION_WEBHOOK_URL) {
    console.log("Notifications disabled: no webhook configured.");
    return;
  }
  console.log("Notifications sent:", await sendPendingNotifications());
}
main().finally(() => db.$disconnect());
