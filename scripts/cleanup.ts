import "dotenv/config";
import { db } from "../src/lib/db";
import { cleanupExpiredReservations } from "../src/lib/orders";
async function main() {
  console.log(
    "Expired reservations cleaned:",
    await cleanupExpiredReservations(),
  );
}
main().finally(() => db.$disconnect());
