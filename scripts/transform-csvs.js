// Transform raw CSVs to match current schema.
// Run: node scripts/transform-csvs.js
import fs from "node:fs";

const files = {
  profiles: { in: "profiles-for-import.csv", out: "profiles-clean.csv" },
  organization_members: { in: "organization_members.csv", out: "organization_members-clean.csv" },
  task_assignments: { in: "task_assignments.csv", out: "task_assignments-clean.csv" },
  task_stages: { in: "task_stages.csv", out: "task_stages-clean.csv" },
  organization_ideas: { in: "organization_ideas.csv", out: "organization_ideas-clean.csv" },
  user_goals: { in: "user_goals.csv", out: "user_goals-clean.csv" },
  organization_chat: { in: "organization_chat.csv", out: "organization_chat-clean.csv" },
  organization_invitations: { in: "organization_invitations.csv", out: "organization_invitations-clean.csv" },
  notification_reads: { in: "notification_reads.csv", out: "notification_reads-clean.csv" },
  organizations: { in: "organizations.csv", out: "organizations-clean.csv" },
  tasks: { in: "tasks.csv", out: "tasks-clean.csv" },
  organization_chat_reactions: { in: "organization_chat_reactions.csv", out: "organization_chat_reactions-clean.csv" },
  organization_chat_typing: { in: "organization_chat_typing.csv", out: "organization_chat_typing-clean.csv" },
  task_reports: { in: "task_reports.csv", out: "task_reports-clean.csv" },
  task_attachments: { in: "task_attachments.csv", out: "task_attachments-clean.csv" },
};

function detectDelimiter(line) {
  const semi = line.split(";").length;
  const comma = line.split(",").length;
  return semi > comma ? ";" : ",";
}

function isUuid(val) {
  if (!val) return false;
  return /^[0-9a-fA-F-]{36}$/.test(val.trim());
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

function run() {
  // profiles
  if (fs.existsSync(files.profiles.in)) {
    const { header, rows } = readCsv(files.profiles.in);
    const hId = idx(header, "id");
    const hFn = idx(header, "first_name");
    const hLn = idx(header, "last_name");
    const hPos = idx(header, "position");
    const hAv = idx(header, "avatar_url");
    const hDob = idx(header, "date_of_birth");
    const hCa = idx(header, "created_at");
    const clean = rows.map((r) => [
      r[hId] ?? "",
      r[hFn] ?? "",
      r[hLn] ?? "",
      r[hPos] ?? "",
      r[hAv] ?? "",
      r[hDob] ?? "",
      r[hCa] ?? "",
    ]);
    writeCsv(files.profiles.out, ["id", "first_name", "last_name", "position", "avatar_url", "date_of_birth", "created_at"], clean);
  }

  // organization_members
  if (fs.existsSync(files.organization_members.in)) {
    const { header, rows } = readCsv(files.organization_members.in);
    const hId = idx(header, "id");
    const hOrg = idx(header, "organization_id");
    const hUser = idx(header, "user_id");
    const hPos = idx(header, "position");
    const hAdded = idx(header, "added_at") ?? idx(header, "created_at");
    const clean = rows.map((r) => [
      r[hId] ?? "",
      r[hOrg] ?? "",
      r[hUser] ?? "",
      r[hPos] ?? "",
      r[hAdded] ?? "",
    ]);
    writeCsv(files.organization_members.out, ["id", "organization_id", "user_id", "position", "added_at"], clean);
  }

  // task_assignments
  if (fs.existsSync(files.task_assignments.in)) {
    const { header, rows } = readCsv(files.task_assignments.in);
    const hTask = idx(header, "task_id");
    const hUser = idx(header, "user_id");
    const hCa = idx(header, "created_at");
    const clean = rows.map((r) => [r[hTask] ?? "", r[hUser] ?? "", r[hCa] ?? ""]);
    writeCsv(files.task_assignments.out, ["task_id", "user_id", "created_at"], clean);
  }

  // task_stages
  if (fs.existsSync(files.task_stages.in)) {
    const { header, rows } = readCsv(files.task_stages.in);
    const hId = idx(header, "id");
    const hTask = idx(header, "task_id");
    const hName = idx(header, "title") ?? idx(header, "name");
    const hStatus = idx(header, "status");
    const hOrder = idx(header, "order_index") ?? idx(header, "sort_order");
    const hCa = idx(header, "created_at");
    const clean = rows.map((r) => [
      r[hId] ?? "",
      r[hTask] ?? "",
      r[hName] ?? "",
      r[hStatus] ?? "",
      r[hOrder] ?? "",
      r[hCa] ?? "",
    ]);
    writeCsv(files.task_stages.out, ["id", "task_id", "name", "status", "sort_order", "created_at"], clean);
  }

  // organization_ideas
  if (fs.existsSync(files.organization_ideas.in)) {
    const { header, rows } = readCsv(files.organization_ideas.in);
    const hId = idx(header, "id");
    const hOrg = idx(header, "organization_id");
    const hUser = idx(header, "user_id");
    const hTitle = idx(header, "title");
    const hDesc = idx(header, "description");
    const hCa = idx(header, "created_at");
    const clean = rows.map((r) => {
      const idea = [r[hTitle], r[hDesc]].filter(Boolean).join(" ").trim();
      return [r[hId] ?? "", r[hOrg] ?? "", r[hUser] ?? "", idea, r[hCa] ?? ""];
    });
    writeCsv(files.organization_ideas.out, ["id", "organization_id", "user_id", "idea", "created_at"], clean);
  }

  // user_goals
  if (fs.existsSync(files.user_goals.in)) {
    const { header, rows } = readCsv(files.user_goals.in);
    const hId = idx(header, "id");
    const hUser = idx(header, "user_id");
    const hOrg = idx(header, "organization_id"); // bo'lmasa null bo'ladi
    const hTitle = idx(header, "goal_text") ?? idx(header, "title");
    const hDesc = idx(header, "description");
    const hStatus = idx(header, "status");
    const hDue = idx(header, "deadline") ?? idx(header, "due_date");
    const hCa = idx(header, "created_at");
    const clean = rows.map((r) => [
      r[hId] ?? "",
      r[hUser] ?? "",
      r[hOrg] ?? "",
      r[hTitle] ?? "",
      r[hDesc] ?? "",
      r[hStatus] ?? "pending",
      r[hDue] ?? "",
      r[hCa] ?? "",
    ]);
    writeCsv(files.user_goals.out, ["id", "user_id", "organization_id", "title", "description", "status", "due_date", "created_at"], clean);
  }

  // organization_chat
  if (fs.existsSync(files.organization_chat.in)) {
    const { header, rows } = readCsv(files.organization_chat.in);
    const hId = idx(header, "id");
    const hOrg = idx(header, "organization_id");
    const hSender = idx(header, "user_id") ?? idx(header, "sender_id");
    const hMsg = idx(header, "message");
    const hCa = idx(header, "created_at");
    const clean = rows.map((r) => [
      r[hId] ?? "",
      r[hOrg] ?? "",
      r[hSender] ?? "",
      r[hMsg] ?? "",
      r[hCa] ?? "",
    ]);
    writeCsv(files.organization_chat.out, ["id", "organization_id", "sender_id", "message", "created_at"], clean);
  }

  // organization_invitations
  if (fs.existsSync(files.organization_invitations.in)) {
    const { header, rows } = readCsv(files.organization_invitations.in);
    const hId = idx(header, "id");
    const hOrg = idx(header, "organization_id");
    const hEmp = idx(header, "employee_id");
    const hMsg = idx(header, "invitation_message");
    const hDur = idx(header, "contract_duration");
    const hStatus = idx(header, "status");
    const hCa = idx(header, "created_at");
    const hAa = idx(header, "accepted_at");
    const hDa = idx(header, "declined_at");
    const clean = rows.map((r) => [
      r[hId] ?? "",
      r[hOrg] ?? "",
      r[hEmp] ?? "",
      r[hMsg] ?? "",
      r[hDur] ?? "",
      r[hStatus] ?? "",
      r[hCa] ?? "",
      r[hAa] ?? "",
      r[hDa] ?? "",
    ]);
    writeCsv(
      files.organization_invitations.out,
      ["id", "organization_id", "employee_id", "invitation_message", "contract_duration", "status", "created_at", "accepted_at", "declined_at"],
      clean,
    );
  }

  // notification_reads
  if (fs.existsSync(files.notification_reads.in)) {
    const { header, rows } = readCsv(files.notification_reads.in);
    const hId = idx(header, "id");
    const hUser = idx(header, "user_id");
    const hNotifId = idx(header, "notification_id") ?? idx(header, "message_id") ?? idx(header, "chat_id");
    const hType = idx(header, "notification_type");
    const hRead = idx(header, "read_at");
    const hCa = idx(header, "created_at");
    const clean = rows.map((r) => [
      r[hId] ?? "",
      r[hUser] ?? "",
      r[hType] ?? "",
      r[hNotifId] ?? "",
      r[hRead] ?? "",
      r[hCa] ?? "",
    ]);
    writeCsv(
      files.notification_reads.out,
      ["id", "user_id", "notification_type", "notification_id", "read_at", "created_at"],
      clean,
    );
  }

  // organizations
  if (fs.existsSync(files.organizations.in)) {
    const { header, rows } = readCsv(files.organizations.in);
    const hId = idx(header, "id");
    const hName = idx(header, "name");
    const hSub = idx(header, "subheadline");
    const hDesc = idx(header, "description");
    const hMotto = idx(header, "motto");
    const hPhoto = idx(header, "photo_url");
    const hCreatedBy = idx(header, "created_by");
    const hCa = idx(header, "created_at");
    const clean = rows.map((r) => [
      r[hId] ?? "",
      r[hName] ?? "",
      r[hSub] ?? "",
      r[hDesc] ?? "",
      r[hMotto] ?? "",
      r[hPhoto] ?? "",
      r[hCreatedBy] ?? "",
      r[hCa] ?? "",
    ]);
    writeCsv(
      files.organizations.out,
      ["id", "name", "subheadline", "description", "motto", "photo_url", "created_by", "created_at"],
      clean,
    );
  }

  // tasks
  if (fs.existsSync(files.tasks.in)) {
    const { header, rows } = readCsv(files.tasks.in);
    const hId = idx(header, "id");
    const hOrg = idx(header, "organization_id");
    const hAssign = idx(header, "assigned_by");
    const hTitle = idx(header, "title");
    const hDesc = idx(header, "description");
    const hStatus = idx(header, "status");
    const hDeadline = idx(header, "deadline");
    const hCa = idx(header, "created_at");
    const hUa = idx(header, "updated_at");
    const clean = [];
    for (const r of rows) {
      const idVal = r[hId];
      const orgVal = r[hOrg];
      if (!isUuid(idVal) || !isUuid(orgVal)) continue;
      clean.push([
        idVal,
        orgVal,
        isUuid(r[hAssign]) ? r[hAssign] : "", // assigned_by noto'g'ri bo'lsa bo'sh
        r[hTitle] ?? "",
        r[hDesc] ?? "",
        r[hStatus] ?? "",
        r[hDeadline] ?? "",
        r[hCa] ?? "",
        r[hUa] ?? "",
      ]);
    }
    writeCsv(
      files.tasks.out,
      ["id", "organization_id", "assigned_by", "title", "description", "status", "deadline", "created_at", "updated_at"],
      clean,
    );
  }

  // organization_chat_reactions
  if (fs.existsSync(files.organization_chat_reactions.in)) {
    const { header, rows } = readCsv(files.organization_chat_reactions.in);
    const hId = idx(header, "id");
    const hChat = idx(header, "chat_id") ?? idx(header, "message_id");
    const hUser = idx(header, "user_id");
    const hReaction = idx(header, "reaction");
    const hCa = idx(header, "created_at");
    const clean = rows.map((r) => [
      r[hId] ?? "",
      r[hChat] ?? "",
      r[hUser] ?? "",
      r[hReaction] ?? "",
      r[hCa] ?? "",
    ]);
    writeCsv(
      files.organization_chat_reactions.out,
      ["id", "chat_id", "user_id", "reaction", "created_at"],
      clean,
    );
  }

  // organization_chat_typing
  if (fs.existsSync(files.organization_chat_typing.in)) {
    const { header, rows } = readCsv(files.organization_chat_typing.in);
    const hId = idx(header, "id");
    const hOrg = idx(header, "organization_id");
    const hUser = idx(header, "user_id");
    const hTyped = idx(header, "last_typed_at") ?? idx(header, "updated_at");
    const clean = rows.map((r) => [
      r[hId] ?? "",
      r[hOrg] ?? "",
      r[hUser] ?? "",
      "true", // is_typing default true
      r[hTyped] ?? "",
    ]);
    writeCsv(
      files.organization_chat_typing.out,
      ["id", "organization_id", "user_id", "is_typing", "updated_at"],
      clean,
    );
  }

  // task_reports
  if (fs.existsSync(files.task_reports.in)) {
    const { header, rows } = readCsv(files.task_reports.in);
    const hId = idx(header, "id");
    const hTask = idx(header, "task_id");
    const hUser = idx(header, "user_id");
    const hText = idx(header, "report_text");
    const hCa = idx(header, "created_at");
    const clean = rows.map((r) => [
      r[hId] ?? "",
      r[hTask] ?? "",
      r[hUser] ?? "",
      r[hText] ?? "",
      r[hCa] ?? "",
    ]);
    writeCsv(
      files.task_reports.out,
      ["id", "task_id", "user_id", "report_text", "created_at"],
      clean,
    );
  }

  // task_attachments
  if (fs.existsSync(files.task_attachments.in)) {
    const { header, rows } = readCsv(files.task_attachments.in);
    const hId = idx(header, "id");
    const hReport = idx(header, "task_report_id") ?? idx(header, "report_id");
    const hUrl = idx(header, "file_url");
    const hName = idx(header, "file_name");
    const hType = idx(header, "file_type");
    const hCa = idx(header, "created_at");
    const clean = rows.map((r) => [
      r[hId] ?? "",
      r[hReport] ?? "",
      r[hUrl] ?? "",
      r[hName] ?? "",
      r[hType] ?? "",
      r[hCa] ?? "",
    ]);
    writeCsv(
      files.task_attachments.out,
      ["id", "task_report_id", "file_url", "file_name", "file_type", "created_at"],
      clean,
    );
  }
}

run();
