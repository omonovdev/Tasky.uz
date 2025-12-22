// Remap user IDs in *-clean.csv files using mapping from profiles-export.csv + new-users.csv
// Usage: node scripts/remap-user-ids-clean.js
// Output files: profiles-clean-final.csv, organization_members-clean-final.csv, task_assignments-clean-final.csv, task_stages-clean-final.csv,
//               organization_ideas-clean-final.csv, user_goals-clean-final.csv, organization_chat-clean-final.csv,
//               organization_invitations-clean-final.csv
import fs from "node:fs";

const MAP_PROFILE = "profiles-export.csv"; // old id + email
const MAP_NEW = "new-users.csv"; // email + new id

function detectDelimiter(line) {
  const semi = line.split(";").length;
  const comma = line.split(",").length;
  return semi > comma ? ";" : ",";
}

function readCsv(path) {
  const text = fs.readFileSync(path, "utf8").trim();
  const lines = text.split(/\r?\n/);
  const delim = detectDelimiter(lines[0]);
  const header = lines.shift().split(delim).map((h) => h.trim().toLowerCase());
  const rows = lines.map((ln) => ln.split(delim));
  return { header, rows, delim };
}

function writeCsv(path, headers, rows) {
  const delim = ";";
  const out = [headers.join(delim), ...rows.map((r) => r.map((v) => v ?? "").join(delim))];
  fs.writeFileSync(path, out.join("\n"), "utf8");
  console.log(`Saved ${path} (${rows.length} rows)`);
}

function idx(header, name) {
  const i = header.indexOf(name);
  return i === -1 ? null : i;
}

function buildOldToNewMap() {
  if (!fs.existsSync(MAP_PROFILE) || !fs.existsSync(MAP_NEW)) {
    throw new Error("Mapping uchun profiles-export.csv yoki new-users.csv topilmadi");
  }
  const prof = readCsv(MAP_PROFILE);
  const newu = readCsv(MAP_NEW);
  const pEmailIdx = idx(prof.header, "email");
  const pIdIdx = idx(prof.header, "id");
  const nEmailIdx = idx(newu.header, "email");
  const nIdIdx = idx(newu.header, "id");
  if (pEmailIdx === null || pIdIdx === null || nEmailIdx === null || nIdIdx === null) {
    throw new Error("Mapping fayllarda email/id ustunlari topilmadi");
  }
  const emailToNew = new Map();
  for (const r of newu.rows) {
    const email = (r[nEmailIdx] || "").trim().toLowerCase();
    if (email) emailToNew.set(email, r[nIdIdx]);
  }
  const oldToNew = new Map();
  for (const r of prof.rows) {
    const email = (r[pEmailIdx] || "").trim().toLowerCase();
    const oldId = r[pIdIdx];
    if (email && oldId && emailToNew.has(email)) {
      oldToNew.set(oldId, emailToNew.get(email));
    }
  }
  console.log(`Mapping old->new: ${oldToNew.size} ta`);
  return oldToNew;
}

function remapFile(inFile, outFile, columnsToRemap) {
  if (!fs.existsSync(inFile)) return;
  const { header, rows } = readCsv(inFile);
  const headerLower = header.map((h) => h.toLowerCase());
  const indices = columnsToRemap.map((c) => idx(headerLower, c)).filter((i) => i !== null);
  const outRows = rows.map((r) => {
    const copy = [...r];
    for (const i of indices) {
      const val = copy[i];
      if (val && map.has(val)) copy[i] = map.get(val);
    }
    return copy;
  });
  writeCsv(outFile, header, outRows);
}

const map = buildOldToNewMap();

// Remap relevant files
remapFile("profiles-clean.csv", "profiles-clean-final.csv", ["id"]);
remapFile("organization_members-clean.csv", "organization_members-clean-final.csv", ["user_id"]);
remapFile("task_assignments-clean.csv", "task_assignments-clean-final.csv", ["user_id"]);
remapFile("organization_ideas-clean.csv", "organization_ideas-clean-final.csv", ["user_id"]);
remapFile("user_goals-clean.csv", "user_goals-clean-final.csv", ["user_id"]);
remapFile("organization_chat-clean.csv", "organization_chat-clean-final.csv", ["sender_id", "user_id"]);
remapFile("organization_invitations-clean.csv", "organization_invitations-clean-final.csv", ["employee_id"]);
remapFile("notification_reads-clean.csv", "notification_reads-clean-final.csv", ["user_id"]);
remapFile("organizations-clean.csv", "organizations-clean-final.csv", ["created_by"]);
remapFile("tasks-clean.csv", "tasks-clean-final.csv", ["assigned_by"]);
remapFile("task_reports-clean.csv", "task_reports-clean-final.csv", ["user_id"]);
remapFile("organization_chat_reactions-clean.csv", "organization_chat_reactions-clean-final.csv", ["user_id"]);
remapFile("organization_chat_typing-clean.csv", "organization_chat_typing-clean-final.csv", ["user_id"]);

// Copy-only files (no user_id mapping needed)
["task_attachments-clean.csv"].forEach((f) => {
  if (fs.existsSync(f)) {
    const out = f.replace("-clean.csv", "-clean-final.csv");
    fs.copyFileSync(f, out);
    console.log(`Copied ${out}`);
  }
});
// task_stages-clean.csv has no user_id; just copy over
if (fs.existsSync("task_stages-clean.csv")) {
  fs.copyFileSync("task_stages-clean.csv", "task_stages-clean-final.csv");
  console.log("Copied task_stages-clean-final.csv");
}
