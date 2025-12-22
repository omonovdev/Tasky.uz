// Generic CSV importer into Supabase table using service role.
// Usage:
//   NEW_SUPABASE_URL="https://<project>.supabase.co" \
//   NEW_SUPABASE_SERVICE_ROLE_KEY="<service_role_key>" \
//   node scripts/import-csv.js <csv-file> <table-name>
//
// CSV delimiter auto-detected (; or ,). Header row must match table columns.

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEW_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;
const [csvFile, tableName] = process.argv.slice(2);

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Env yetishmayapti: NEW_SUPABASE_URL va NEW_SUPABASE_SERVICE_ROLE_KEY ni set qiling.");
  process.exit(1);
}
if (!csvFile || !tableName) {
  console.error("Usage: node scripts/import-csv.js <csv-file> <table-name>");
  process.exit(1);
}
if (!fs.existsSync(csvFile)) {
  console.error(`CSV topilmadi: ${csvFile}`);
  process.exit(1);
}

function detectDelimiter(line) {
  const semi = line.split(";").length;
  const comma = line.split(",").length;
  return semi > comma ? ";" : ",";
}

function parseCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8").trim();
  const lines = text.split(/\r?\n/);
  const delim = detectDelimiter(lines[0]);
  const headers = lines.shift().split(delim).map((h) => h.trim());
  const rows = lines.map((ln) => {
    const cols = ln.split(delim);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] === "" ? null : cols[idx];
    });
    return obj;
  });
  return { headers, rows };
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { rows } = parseCsv(csvFile);
  console.log(`Importing ${rows.length} rows into ${tableName}...`);
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(tableName).insert(chunk);
    if (error) {
      console.error(`Xato (batch ${i}-${i + chunk.length - 1}):`, error.message);
      process.exit(1);
    } else {
      console.log(`Inserted ${i + chunk.length} / ${rows.length}`);
    }
  }
  console.log("Import tugadi");
}

main().catch((err) => {
  console.error("Xato:", err);
  process.exit(1);
});
