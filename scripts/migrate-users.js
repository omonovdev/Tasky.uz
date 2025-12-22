// Migrate auth.users from an old Supabase project to a new one (no Docker).
// This creates new users with a temporary password; IDs will be new.
// Set env vars before running:
//   OLD_SUPABASE_URL
//   OLD_SUPABASE_SERVICE_ROLE_KEY
//   NEW_SUPABASE_URL
//   NEW_SUPABASE_SERVICE_ROLE_KEY
//
// Run: node scripts/migrate-users.js

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const OLD_URL = process.env.OLD_SUPABASE_URL;
const OLD_SERVICE_ROLE = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY;
const NEW_URL = process.env.NEW_SUPABASE_URL;
const NEW_SERVICE_ROLE = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;

if (!OLD_URL || !OLD_SERVICE_ROLE || !NEW_URL || !NEW_SERVICE_ROLE) {
  console.error(
    "Env yetishmayapti. OLD_SUPABASE_URL, OLD_SUPABASE_SERVICE_ROLE_KEY, NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_ROLE_KEY ni sozlang."
  );
  process.exit(1);
}

const oldAdmin = createClient(OLD_URL, OLD_SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const newAdmin = createClient(NEW_URL, NEW_SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function listAllUsers(client) {
  let page = 1;
  const perPage = 200;
  const all = [];
  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    all.push(...data.users);
    if (data.users.length < perPage) break;
    page++;
  }
  return all;
}

async function createUserInNew(u) {
  const { error } = await newAdmin.auth.admin.createUser({
    email: u.email,
    password: "TempPass123!", // foydalanuvchi keyin reset qiladi
    email_confirm: true,
    phone: u.phone ?? undefined,
    user_metadata: u.user_metadata ?? {},
    app_metadata: u.app_metadata ?? {},
  });
  if (error) {
    console.log(`Create fail ${u.email}: ${error.message}`);
    return false;
  }
  console.log(`Created ${u.email}`);
  return true;
}

function saveCsv(filename, rows) {
  const header = "email,id\n";
  const body = rows.map((r) => `${r.email ?? ""},${r.id ?? ""}`).join("\n");
  fs.writeFileSync(filename, header + body, "utf8");
  console.log(`Saved ${filename} (${rows.length} rows)`);
}

async function main() {
  console.log("Old projectdan userlarni o‘qiyapman...");
  const oldUsers = await listAllUsers(oldAdmin);
  console.log(`Topildi: ${oldUsers.length} user`);

  for (const u of oldUsers) {
    if (!u.email) continue;
    await createUserInNew(u);
  }

  console.log("Yangi projectdan user mapping olinyapti...");
  const newUsers = await listAllUsers(newAdmin);
  saveCsv("new-users.csv", newUsers);
  console.log("Tayyor. new-users.csv da email → new id mapping bor.");
}

main().catch((err) => {
  console.error("Xato:", err);
  process.exit(1);
});
