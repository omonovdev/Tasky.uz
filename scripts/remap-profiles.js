// Remap profiles-export.csv id column using new-users.csv (email -> new id)
// Usage: node scripts/remap-profiles.js profiles-export.csv new-users.csv profiles-for-import.csv
import fs from "node:fs";

function detectDelimiter(line) {
  const semi = line.split(";").length;
  const comma = line.split(",").length;
  return semi > comma ? ";" : ",";
}

function loadMapping(file) {
  const txt = fs.readFileSync(file, "utf8").trim();
  const lines = txt.split(/\r?\n/);
  const delim = detectDelimiter(lines[0]);
  const header = lines.shift().split(delim).map((h) => h.trim().toLowerCase());
  const emailIdx = header.indexOf("email");
  const idIdx = header.indexOf("id");
  if (emailIdx === -1 || idIdx === -1) throw new Error("new-users.csv da email/id ustunlari topilmadi");
  const map = new Map();
  for (const ln of lines) {
    const cols = ln.split(delim).map((c) => c.trim());
    if (cols[emailIdx]) map.set(cols[emailIdx].toLowerCase(), cols[idIdx]);
  }
  return map;
}

function remapProfiles(profilesFile, mappingFile, outFile) {
  const profTxt = fs.readFileSync(profilesFile, "utf8").trim();
  const profLines = profTxt.split(/\r?\n/);
  const delim = detectDelimiter(profLines[0]);
  const header = profLines.shift().split(delim);
  const emailIdx = header.findIndex((h) => h.trim().toLowerCase() === "email");
  const idIdx = header.findIndex((h) => h.trim().toLowerCase() === "id");
  if (emailIdx === -1 || idIdx === -1) throw new Error("profiles CSV da email/id ustunlari topilmadi");

  const mapping = loadMapping(mappingFile);
  const outLines = [header.join(delim)];
  let replaced = 0;

  for (const ln of profLines) {
    const cols = ln.split(delim);
    const email = (cols[emailIdx] || "").trim().toLowerCase();
    if (mapping.has(email)) {
      cols[idIdx] = mapping.get(email);
      replaced++;
    }
    outLines.push(cols.join(delim));
  }

  fs.writeFileSync(outFile, outLines.join("\n"), "utf8");
  console.log(`Tayyor: ${outFile}, almashtirildi: ${replaced} ta id`);
}

const [profilesFile, mappingFile, outFile] = process.argv.slice(2);
if (!profilesFile || !mappingFile || !outFile) {
  console.error("Usage: node scripts/remap-profiles.js profiles-export.csv new-users.csv profiles-for-import.csv");
  process.exit(1);
}

remapProfiles(profilesFile, mappingFile, outFile);
