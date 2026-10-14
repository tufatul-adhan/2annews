import 'dotenv/config';
import mysql from 'mysql2/promise';
import pg from 'pg';

const { Client } = pg;
const sourceUrl = process.env.MYSQL_SOURCE_URL;
const targetUrl = process.env.DATABASE_URL;

if (!sourceUrl || !sourceUrl.startsWith('mysql://')) {
  throw new Error('Set MYSQL_SOURCE_URL to the existing MySQL connection URL.');
}
if (!targetUrl || !/^postgres(ql)?:\/\//.test(targetUrl)) {
  throw new Error('Set DATABASE_URL to the PostgreSQL connection URL.');
}

const tables = [
  'Role', 'Permission', 'User', 'RolePermission', 'Category', 'Tag', 'Club',
  'League', 'Player', 'Article', 'ArticleTag', 'ArticleRevision', 'Match',
  'Standing', 'Transfer', 'Comment', 'Like', 'Bookmark', 'ArticleView', 'Media',
  'Notification', 'ActivityLog', 'Setting',
];

const quotePg = (name) => `"${name.replaceAll('"', '""')}"`;
const quoteMysql = (name) => `\`${name.replaceAll('`', '``')}\``;
const mysqlUrl = new URL(sourceUrl);
const source = await mysql.createConnection({
  host: mysqlUrl.hostname,
  port: Number(mysqlUrl.port || 3306),
  user: decodeURIComponent(mysqlUrl.username),
  password: decodeURIComponent(mysqlUrl.password),
  database: decodeURIComponent(mysqlUrl.pathname.slice(1)),
  dateStrings: true,
});
const target = new Client({ connectionString: targetUrl });

try {
  await target.connect();
  const migrationTable = await target.query("SELECT to_regclass('public.\"_prisma_migrations\"') AS name");
  if (!migrationTable.rows[0].name) {
    throw new Error('PostgreSQL schema is missing. Run `npx prisma migrate deploy` first.');
  }

  const [sourceTables] = await source.query('SHOW TABLES');
  const availableSourceTables = new Set(
    sourceTables.map((row) => String(Object.values(row)[0]).toLowerCase()),
  );
  const sourceCounts = new Map();
  for (const table of tables) {
    if (!availableSourceTables.has(table.toLowerCase())) {
      throw new Error(`MySQL table ${table} is missing.`);
    }
    const [[{ count }]] = await source.query(`SELECT COUNT(*) AS count FROM ${quoteMysql(table)}`);
    sourceCounts.set(table, Number(count));
  }

  for (const table of tables) {
    const { rows } = await target.query(`SELECT COUNT(*)::int AS count FROM ${quotePg(table)}`);
    if (rows[0].count !== 0) {
      throw new Error(`PostgreSQL table ${table} is not empty; refusing to overwrite data.`);
    }
  }

  await target.query('BEGIN');
  for (const table of tables) {
    const [rows] = await source.query(`SELECT * FROM ${quoteMysql(table)}`);
    const { rows: columnRows } = await target.query(
      'SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position',
      ['public', table],
    );
    const columns = columnRows.map((row) => row.column_name);
    if (!columns.length) throw new Error(`PostgreSQL table ${table} is missing.`);

    const insertRows = table === 'Comment' ? sortCommentsParentFirst(rows) : rows;
    for (const row of insertRows) {
      const names = Object.keys(row);
      if (names.length !== columns.length || names.some((name) => !columns.includes(name))) {
        throw new Error(`Column mismatch for ${table}; check the PostgreSQL migration schema.`);
      }
      const values = columns.map((name) => row[name]);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
      await target.query(
        `INSERT INTO ${quotePg(table)} (${columns.map(quotePg).join(', ')}) VALUES (${placeholders})`,
        values,
      );
    }
    console.log(`${table}: copied ${insertRows.length}`);
  }

  for (const table of tables) {
    if (['RolePermission', 'ArticleTag', 'Like', 'Bookmark'].includes(table)) continue;
    await target.query(
      `SELECT setval(pg_get_serial_sequence('"public"."${table}"', 'id'), GREATEST(COALESCE(MAX("id"), 1), 1), COUNT(*) > 0) FROM ${quotePg(table)}`,
    );
  }

  for (const table of tables) {
    const { rows } = await target.query(`SELECT COUNT(*)::int AS count FROM ${quotePg(table)}`);
    const actual = rows[0].count;
    const expected = sourceCounts.get(table);
    if (actual !== expected) {
      throw new Error(`Row count mismatch for ${table}: MySQL=${expected}, PostgreSQL=${actual}.`);
    }
  }

  await target.query('COMMIT');
  console.log('Migration complete. Every table row count matches the MySQL source.');
} catch (error) {
  try { await target.query('ROLLBACK'); } catch {}
  throw error;
} finally {
  await source.end();
  await target.end();
}

function sortCommentsParentFirst(rows) {
  const remaining = new Map(rows.map((row) => [row.id, row]));
  const ordered = [];
  const inserted = new Set();
  while (remaining.size) {
    let progressed = false;
    for (const [id, row] of remaining) {
      if (row.parentId == null || inserted.has(row.parentId)) {
        ordered.push(row);
        inserted.add(id);
        remaining.delete(id);
        progressed = true;
      }
    }
    if (!progressed) throw new Error('Comment parent links contain a cycle or a missing parent.');
  }
  return ordered;
}
