// Seeds the `sessions` table from data/schedule.ts into Supabase.
// Uses the REST API with the service-role key (bypasses RLS).
//
// Run via: npm run seed:sessions
// Env:     reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
//          from .env.local (loaded by `node --env-file=.env.local`).

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    "Missing env vars. Expected NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

// Parse data/schedule.ts without importing TS. The file is a plain object
// literal; we extract the `schedule` array by regex + JSON eval.
const schedulePath = join(__dirname, "..", "..", "data", "schedule.ts");
const src = readFileSync(schedulePath, "utf8");
const match = src.match(
  /export const schedule:\s*Session\[\]\s*=\s*(\[[\s\S]*?\n\]);/,
);
if (!match) {
  console.error("Could not locate `schedule` export in data/schedule.ts");
  process.exit(1);
}

// Convert the TS object-literal array into JSON-parseable text.
// (TS uses unquoted keys and trailing-comma-friendly syntax. Switch to quoted
// keys and strip trailing commas.)
const toJson = match[1]
  // Single-line comments (// ...) inside the array
  .replace(/\/\/[^\n]*/g, "")
  // Quote unquoted keys: { week: 1, date: "..." } → { "week": 1, ... }
  .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
  // Replace JS single-quoted strings with double-quoted (none in our file, but be safe)
  .replace(/'([^']*)'/g, '"$1"')
  // Strip any trailing commas before `]` or `}`
  .replace(/,\s*([\]}])/g, "$1");

let schedule;
try {
  schedule = JSON.parse(toJson);
} catch (e) {
  console.error("Failed to parse schedule array:", e.message);
  console.error("Converted text (first 400 chars):\n", toJson.slice(0, 400));
  process.exit(1);
}

console.log(`Parsed ${schedule.length} sessions from data/schedule.ts`);

// Map TS camelCase → DB snake_case
const rows = schedule.map((s) => ({
  week: s.week,
  date: s.date,
  category: s.category,
  title: s.title,
  suggested_level: s.suggestedLevel,
  suggested_speaker: s.suggestedSpeaker,
  notes: s.notes,
}));

// Upsert — idempotent so re-running is safe.
const res = await fetch(`${supabaseUrl}/rest/v1/sessions?on_conflict=week`, {
  method: "POST",
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  },
  body: JSON.stringify(rows),
});

if (!res.ok) {
  console.error("Seed failed:", res.status, await res.text());
  process.exit(1);
}

console.log(`Seeded ${rows.length} sessions.`);
