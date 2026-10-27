// Resets a mechanic's PIN or a manager's passcode from the command line.
// Useful when the only manager is locked out, or for first-time setup.
//
//   npm run set-passcode -- "Full Name" "new-pin-or-passcode"
//
// Mechanics: 4–6 digits. Managers: 6+ characters. Also clears any lockout.
// Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

config({ path: ".env.local" });

const [fullName, passcode] = process.argv.slice(2);
if (!fullName || !passcode) {
  console.error('Usage: npm run set-passcode -- "Full Name" "new-pin-or-passcode"');
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: matches, error: findError } = await supabase
  .from("staff")
  .select("id, full_name, role")
  .ilike("full_name", fullName);
if (findError) {
  console.error("Failed:", findError.message);
  process.exit(1);
}
if (!matches?.length) {
  console.error(`No one named "${fullName}". Names are matched exactly (case-insensitive).`);
  process.exit(1);
}
if (matches.length > 1) {
  console.error(`More than one "${fullName}" — rename one in the dashboard first.`);
  process.exit(1);
}
const person = matches[0];

if (person.role === "mechanic" && !/^\d{4,6}$/.test(passcode)) {
  console.error("Mechanic PINs must be 4–6 digits.");
  process.exit(1);
}
if (person.role === "manager" && passcode.length < 6) {
  console.error("Manager passcodes must be at least 6 characters.");
  process.exit(1);
}

const { error } = await supabase
  .from("staff")
  .update({ passcode_hash: await bcrypt.hash(passcode, 10), failed_attempts: 0, locked_until: null })
  .eq("id", person.id);
if (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}
console.log(`Updated ${person.role === "manager" ? "passcode" : "PIN"} for ${person.full_name}.`);
