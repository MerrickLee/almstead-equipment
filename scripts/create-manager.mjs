// Creates the first manager account so you can sign in and add everyone else
// from the dashboard.
//
//   npm run create-manager -- "Merrick Lee" "your-passcode" "New Rochelle, NY"
//
// Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

config({ path: ".env.local" });

const [fullName, passcode, branch] = process.argv.slice(2);

if (!fullName || !passcode) {
  console.error('Usage: npm run create-manager -- "Full Name" "passcode" ["Branch"]');
  process.exit(1);
}
if (passcode.length < 6) {
  console.error("Manager passcodes must be at least 6 characters.");
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const passcode_hash = await bcrypt.hash(passcode, 10);

const { data, error } = await supabase
  .from("staff")
  .insert({ full_name: fullName, role: "manager", branch: branch ?? null, passcode_hash })
  .select("id, full_name")
  .single();

if (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}
console.log(`Created manager ${data.full_name} (${data.id}). Sign in at /login.`);
