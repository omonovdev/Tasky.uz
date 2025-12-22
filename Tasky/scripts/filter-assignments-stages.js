// tasks-clean-final.csv dagi task_id lar bo'yicha
// task_assignments-clean-final.csv va task_stages-clean-final.csv ni filtrlash.
// Ishlatish:
//   node scripts/filter-assignments-stages.js
// Natija:
//   task_assignments-filtered.csv
//   task_stages-filtered.csv

import fs from "node:fs";

function detectDelimiter(line) {
  const semi = line.split(";").length;
  const comma = line.split(",").length;
  return semi > comma ? ";" : ",";
}

function readCsv(path) {
  const text = fs.readFileSync(path, "utf8").trim();
  const lines = text.split(/\r?\n/);
  const delim = detectDelimiter(lines[0]);
  const header = lines.shift().split(delim).map((h) => h.trim());
  const rows = lines.map((ln) => ln.split(delim));
  return { header, rows, delim };
}

function writeCsv(path, header, rows) {
  const delim = ";";
  const out = [header.join(delim), ...rows.map((r) => r.join(delim))];
  fs.writeFileSync(path, out.join("\n"), "utf8");
  console.log(`Saved ${path} (${rows.length} rows)`);
}

function idx(header, name) {
  const i = header.findIndex((h) => h.toLowerCase() === name);
  return i === -1 ? null : i;
}

function main() {
  if (!fs.existsSync("tasks-clean-final.csv")) {
    console.error("tasks-clean-final.csv topilmadi");
    process.exit(1);
  }
  const tasks = readCsv("tasks-clean-final.csv");
  const taskIdIdx = idx(tasks.header, "id");
  const validTaskIds = new Set(tasks.rows.map((r) => r[taskIdIdx]));
  console.log(`Valid task IDs: ${validTaskIds.size}`);

  // task_assignments
  if (fs.existsSync("task_assignments-clean-final.csv")) {
    const ta = readCsv("task_assignments-clean-final.csv");
    const tIdx = idx(ta.header, "task_id");
    const filtered = ta.rows.filter((r) => validTaskIds.has(r[tIdx]));
    writeCsv("task_assignments-filtered.csv", ta.header, filtered);
  }

  // task_stages
  if (fs.existsSync("task_stages-clean-final.csv")) {
    const ts = readCsv("task_stages-clean-final.csv");
    const tIdx = idx(ts.header, "task_id");
    const filtered = ts.rows.filter((r) => validTaskIds.has(r[tIdx]));
    writeCsv("task_stages-filtered.csv", ts.header, filtered);
  }
}

main();
