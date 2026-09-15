import "dotenv/config";
import { db } from "../src/lib/db";
import { changeStatus } from "../src/lib/orders";
async function main() {
  const orders = await db.order.findMany({
    where: { status: "NEW", expiresAt: { lt: new Date() } },
    select: { id: true },
  });
  for (const o of orders) {
    try {
      await changeStatus(
        o.id,
        "CANCELLED",
        "reservation-cleanup",
        "Təsdiqlənmə müddəti bitdi.",
        true,
      );
    } catch {
      console.error("Reservation cleanup needs retry", o.id);
    }
  }
}
main().finally(() => db.$disconnect());
