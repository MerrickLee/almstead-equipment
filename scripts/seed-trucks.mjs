// Bulk-loads trucks from a CSV so mechanics can pick from a list on day one.
//
//   npm run seed-trucks -- trucks.csv
//
// CSV columns (header row required): truck_number,description,branch[,kind][,asset_id]
//   kind is "vehicle" (default) or "equipment".
// Existing truck numbers are updated, new ones inserted.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run seed-trucks -- trucks.csv");
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  process.exit(1);
}

const lines = readFileSync(file, "utf8").split(/\r?\n/).filter((l) => l.trim());
const header = lines.shift().split(",").map((h) => h.trim().toLowerCase());
const col = (name) => header.indexOf(name);
if (col("truck_number") === -1) {
  console.error("CSV needs a truck_number column.");
  process.exit(1);
}

const rows = lines.map((line) => {
  const cells = line.split(",").map((c) => c.trim());
  const kind = col("kind") >= 0 ? (cells[col("kind")] || "vehicle").toLowerCase() : "vehicle";
  return {
    truck_number: cells[col("truck_number")],
    description: col("description") >= 0 ? cells[col("description")] || null : null,
    branch: col("branch") >= 0 ? cells[col("branch")] || null : null,
    kind: kind === "equipment" ? "equipment" : "vehicle",
    asset_id: col("asset_id") >= 0 ? cells[col("asset_id")] || null : null,
    source: "manual",
    active: true,
  };
});

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { error } = await supabase.from("trucks").upsert(rows, { onConflict: "truck_number" });
if (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}
console.log(`Upserted ${rows.length} trucks.`);
