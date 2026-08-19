/**
 * Menerapkan satu file migrasi SQL ke database tenant SIER saja
 * (bukan ke semua tenant seperti migrate_all_tenants.js — SIER
 * hanya punya satu tenant aktif yang sungguhan dipakai).
 *
 * Jalankan: node scripts/migrate_sier.js database/migrations/002_static_features.sql
 */

const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { applySqlFile } = require('../utils/sqlFile');

async function main() {
  const sqlPath = process.argv[2];
  if (!sqlPath || !fs.existsSync(sqlPath)) {
    console.error('Pemakaian: node scripts/migrate_sier.js <file.sql>');
    process.exit(1);
  }

  const dbName = process.env.DB_NAME || 'smart_energy_sier';
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: Number(process.env.DB_PORT || 3306),
    database: dbName,
  });

  console.log(`Menerapkan '${path.basename(sqlPath)}' ke '${dbName}'...`);
  const count = await applySqlFile(conn, path.resolve(sqlPath));
  console.log(`✅ ${count} statement diterapkan.`);

  await conn.end();
}

main().catch((err) => {
  console.error('❌ Migrasi gagal:', err.message);
  process.exit(1);
});
