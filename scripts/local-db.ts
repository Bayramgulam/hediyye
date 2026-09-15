import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
async function main() {
  const dir = resolve(".local/postgres");
  const pg = new EmbeddedPostgres({
    databaseDir: dir,
    user: "luma",
    password: "luma_local_only",
    port: 5432,
    persistent: true,
    postgresFlags: ["-h", "127.0.0.1"],
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });
  if (!existsSync(resolve(dir, "PG_VERSION"))) await pg.initialise();
  await pg.start();
  const client = pg.getPgClient();
  await client.connect();
  const exists = await client.query(
    "SELECT 1 FROM pg_database WHERE datname='luma'",
  );
  await client.end();
  if (!exists.rowCount) await pg.createDatabase("luma");
  console.log("LUMA PostgreSQL ready on localhost:5432");
  process.on("SIGINT", async () => {
    await pg.stop();
    process.exit();
  });
  setInterval(() => {}, 60000);
}
main();
