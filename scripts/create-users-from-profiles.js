// Create users in the new project from a profiles CSV (email -> new auth user).
// Usage:
//   export NEW_SUPABASE_URL="https://<new>.supabase.co"
//   export NEW_SUPABASE_SERVICE_ROLE_KEY="<new_service_role_key>"
//   node scripts/create-users-from-profiles.js profiles-export.csv
//
// The script writes new-users.csv with email,id mapping.

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const NEW_URL = process.env.NEW_SUPABASE_URL;
const NEW_SERVICE_ROLE = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;
const CSV_PATH = process.argv[2] ?? "profiles-export.csv";

if (!NEW_URL || !NEW_SERVICE_ROLE) {
  console.error("Env yetishmayapti: NEW_SUPABASE_URL va NEW_SUPABASE_SERVICE_ROLE_KEY ni set qiling.");
  process.exit(1);
}

if (!fs.existsSync(CSV_PATH)) {
  console.error(`CSV topilmadi: ${CSV_PATH}`);
  process.exit(1);
}

const newAdmin = createClient(NEW_URL, NEW_SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function parseCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8").trim();
  const lines = text.split(/\r?\n/);
  // Avval ajratuvchini aniqlaymiz: ; yoki , dan qaysi biri ko‘p ishlatilganiga qarab
  const detectDelimiter = (hdrLine) => {
    const semi = hdrLine.split(";").length;
    const comma = hdrLine.split(",").length;
    return semi > comma ? ";" : ",";
  };
  const delimiter = detectDelimiter(lines[0]);
  const header = lines.shift().split(delimiter).map((h) => h.trim().toLowerCase());
  const emailIdx = header.indexOf("email");
  if (emailIdx === -1) throw new Error("CSV da email ustuni yo'q");
  return lines.map((ln) => {
    const cols = ln.split(delimiter).map((c) => c.trim());
    return { email: cols[emailIdx] || "" };
  }).filter((r) => r.email);
}

function saveMapping(mapping, filename) {
  const header = "email,id\n";
  const body = mapping.map((m) => `${m.email},${m.id}`).join("\n");
  fs.writeFileSync(filename, header + body, "utf8");
  console.log(`Saved ${fiTempPaslename} (${mapping.length} rows)`);
}

async function main() {
  const rows = parseCsv(CSV_PATH);
  console.log(`CSVdan ${rows.length} ta email topildi.`);
  const mapping = [];
  for (const r of rows) {
    const { data, error } = await newAdmin.auth.admin.createUser({
      email: r.email,
      password: "s123!", // foydalanuvchi keyin reset qiladi
      email_confirm: true,
    });
    if (error) {
      console.log(`Create fail ${r.email}: ${error.message}`);
    } else {
      console.log(`Created ${r.email}`);
      mapping.push({ email: r.email, id: data.user.id });
    }
  }
  saveMapping(mapping, "new-users.csv");
  console.log("Tayyor: new-users.csv da email -> new id bor.");
}

main().catch((err) => {
  console.error("Xato:", err);
  process.exit(1);
});
