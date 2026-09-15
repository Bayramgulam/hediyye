import "dotenv/config";
import { Client } from "pg";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
const url = new URL(process.env.DATABASE_URL!);
if (url.hostname !== "localhost") throw Error("Local database only");
const admin = new Client({ connectionString: url.toString() });
await admin.connect();
const name = "luma_migration_test_" + randomBytes(5).toString("hex");
await admin.query(`CREATE DATABASE "${name}"`);
try {
  url.pathname = "/" + name;
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    { env: { ...process.env, DATABASE_URL: url.toString() }, stdio: "inherit" },
  );
  const check = new Client({ connectionString: url.toString() });
  await check.connect();
  const constraints = await check.query(
    `SELECT conname FROM pg_constraint WHERE conname IN ('product_nonnegative','slot_capacity_valid','Gift_boxId_fkey')`,
  );
  if (constraints.rowCount !== 3)
    throw Error("Required integrity constraints missing");
  await check.end();
  console.log("Fresh database migrations and integrity constraints verified.");
} finally {
  await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin.end();
}
