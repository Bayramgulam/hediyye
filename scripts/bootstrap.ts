import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { db } from "../src/lib/db";
async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12)
    throw Error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) in your environment.",
    );
  if (await db.user.count({ where: { role: "OWNER" } }))
    throw Error(
      "Owner already exists; use an existing owner to provision staff.",
    );
  const id = randomUUID();
  await db.user.create({
    data: {
      id,
      email,
      name: "Mağaza sahibi",
      role: "OWNER",
      emailVerified: true,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: id,
          providerId: "credential",
          password: await hashPassword(password),
        },
      },
    },
  });
  console.log("Owner created. Remove ADMIN_PASSWORD from your environment.");
}
main().finally(() => db.$disconnect());
