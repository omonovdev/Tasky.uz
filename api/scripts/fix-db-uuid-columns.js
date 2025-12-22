/* eslint-disable no-console */
const path = require('path');
const { Client } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const requiredEnv = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing env var: ${key}`);
    process.exit(1);
  }
}

const targets = [
  { table: 'organization_members', columns: ['organization_id', 'user_id'] },
  {
    table: 'organization_invitations',
    columns: ['organization_id', 'employee_id'],
  },
  { table: 'subgroups', columns: ['organization_id', 'created_by'] },
  { table: 'subgroup_members', columns: ['subgroup_id', 'user_id'] },
  { table: 'task_assignments', columns: ['task_id', 'user_id'] },
  { table: 'task_stages', columns: ['task_id'] },
  { table: 'task_reports', columns: ['task_id', 'user_id'] },
  { table: 'task_attachments', columns: ['task_report_id'] },
  {
    table: 'task_subgroup_assignments',
    columns: ['task_id', 'subgroup_id'],
  },
  { table: 'organization_chat', columns: ['organization_id', 'user_id'] },
  {
    table: 'organization_chat_reactions',
    columns: ['message_id', 'user_id'],
  },
  { table: 'organization_chat_attachments', columns: ['message_id'] },
  {
    table: 'organization_chat_typing',
    columns: ['organization_id', 'user_id'],
  },
  { table: 'organization_ideas', columns: ['organization_id', 'user_id'] },
  { table: 'notification_reads', columns: ['user_id'] },
  { table: 'user_roles', columns: ['user_id'] },
  { table: 'user_goals', columns: ['user_id'] },
  { table: 'tasks', columns: ['assigned_by', 'assigned_to'] },
];

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  await client.connect();

  try {
    await client.query('BEGIN');
    for (const { table, columns } of targets) {
      for (const column of columns) {
        const meta = await client.query(
          `
          select data_type, udt_name
          from information_schema.columns
          where table_schema = 'public'
            and table_name = $1
            and column_name = $2
          `,
          [table, column],
        );

        if (!meta.rows.length) {
          continue;
        }

        const { data_type: dataType, udt_name: udtName } = meta.rows[0];
        if (udtName === 'uuid') {
          continue;
        }
        if (dataType !== 'character varying' && dataType !== 'text') {
          console.log(
            `Skip ${table}.${column}: unsupported type ${dataType} (${udtName})`,
          );
          continue;
        }

        console.log(`Converting ${table}.${column} (${dataType}) -> uuid`);
        await client.query(
          `alter table "${table}" alter column "${column}" type uuid using "${column}"::uuid`,
        );
      }
    }
    await client.query('COMMIT');
    console.log('Done.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed. Rolled back.');
    console.error(err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();

