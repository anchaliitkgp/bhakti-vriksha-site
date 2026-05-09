// Applies each .sql file in supabase/migrations/ in filename order,
// to the Supabase Postgres via its Connection Pooler.
//
// Uses SUPABASE_DB_URL if set (full Postgres connection string).
// Otherwise prompts to set it.

import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error(
    "SUPABASE_DB_URL is not set. Export it from the Supabase dashboard:\n" +
      "  Settings → Database → Connection string → URI (use the 'Session' or 'Transaction' pooler)\n" +
      "Then: export SUPABASE_DB_URL='postgres://...'",
  );
  process.exit(1);
}

const migrationsDir = join(__dirname, "migrations");
const files = (await readdir(migrationsDir))
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`Applying ${files.length} migrations against ${new URL(dbUrl).host}`);

const client = new pg.Client({ connectionString: dbUrl });
await client.connect();

for (const f of files) {
  const sql = await readFile(join(migrationsDir, f), "utf8");
  process.stdout.write(`· ${f} ... `);
  try {
    await client.query(sql);
    console.log("ok");
  } catch (e) {
    console.log("FAILED");
    console.error(e.message);
    process.exit(1);
  }
}

await client.end();
console.log("All migrations applied.");
