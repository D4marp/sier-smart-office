/**
 * Menjalankan satu file SQL migrasi ke SEMUA database tenant (fakultas).
 * Konsekuensi arsitektur database-per-fakultas: setiap perubahan schema
 * harus diterapkan ke N database — script ini yang mengurusnya.
 *
 * Jalankan: node scripts/migrate_all_tenants.js path/ke/migrasi.sql
 */

const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { applySqlFile } = require('../utils/sqlFile');

const REGISTRY_DB = process.env.REGISTRY_DB_NAME || 'smart_energy_registry';

async function main() {
  const sqlPath = process.argv[2];
  if (!sqlPath || !fs.existsSync(sqlPath)) {
    console.error('Pemakaian: node scripts/migrate_all_tenants.js <file.sql>');
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: Number(process.env.DB_PORT || 3306),
    database: REGISTRY_DB,
  });

  const [tenants] = await conn.query(
    "SELECT code, name, db_name FROM tenants WHERE status = 'active' ORDER BY code"
  );
  if (!tenants.length) {
    console.log('Tidak ada tenant aktif di registry.');
    await conn.end();
    return;
  }

  console.log(`Menerapkan '${path.basename(sqlPath)}' ke ${tenants.length} database fakultas:\n`);

  let failures = 0;
  for (const tenant of tenants) {
    process.stdout.write(`  ${tenant.code} (${tenant.db_name}) ... `);
    try {
      await conn.changeUser({ database: tenant.db_name });
      const count = await applySqlFile(conn, path.resolve(sqlPath));
      console.log(`✅ ${count} statement`);
    } catch (err) {
      failures += 1;
      console.log(`❌ ${err.message}`);
    }
    await conn.changeUser({ database: REGISTRY_DB });
  }

  await conn.end();

  if (failures) {
    console.error(`\n⚠️  Selesai dengan ${failures} kegagalan — periksa log di atas.`);
    process.exit(1);
  }
  console.log('\n🎉 Migrasi diterapkan ke semua tenant.');
}

main().catch((err) => {
  console.error('❌ Migrasi gagal:', err.message);
  process.exit(1);
});
