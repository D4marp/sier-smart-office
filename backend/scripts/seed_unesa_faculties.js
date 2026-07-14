/**
 * Provisioning SEMUA fakultas UNESA sebagai tenant, lengkap dengan lokasi kampus.
 *
 * Setiap fakultas mendapat database sendiri (smart_energy_<kode>) berisi schema
 * dari database/tenant_schema.sql, lalu didaftarkan di registry rektorat dengan
 * metadata kampus. Idempotent: tenant yang sudah ada hanya diperbarui nama &
 * metadata-nya (database & datanya tidak disentuh).
 *
 * Jalankan: node scripts/seed_unesa_faculties.js
 */

const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { applySqlFile } = require('../utils/sqlFile');

const REGISTRY_DB = process.env.REGISTRY_DB_NAME || 'smart_energy_registry';
const TENANT_SCHEMA = path.resolve(__dirname, '../database/tenant_schema.sql');

// Daftar 12 fakultas UNESA (per 2025) beserta kampusnya.
// psikologi memakai database lama smart_energy_dashboard (data existing).
const FACULTIES = [
  { code: 'fip',       name: 'Fakultas Ilmu Pendidikan',                    campus: 'Kampus Lidah Wetan',      address: 'Jl. Lidah Wetan, Lakarsantri, Surabaya' },
  { code: 'fbs',       name: 'Fakultas Bahasa dan Seni',                    campus: 'Kampus Lidah Wetan',      address: 'Jl. Lidah Wetan, Lakarsantri, Surabaya' },
  { code: 'fikk',      name: 'Fakultas Ilmu Keolahragaan dan Kesehatan',    campus: 'Kampus Lidah Wetan',      address: 'Jl. Lidah Wetan, Lakarsantri, Surabaya' },
  { code: 'psikologi', name: 'Fakultas Psikologi',                          campus: 'Kampus Lidah Wetan',      address: 'Jl. Lidah Wetan, Lakarsantri, Surabaya', dbName: process.env.DB_NAME || 'smart_energy_dashboard' },
  { code: 'fk',        name: 'Fakultas Kedokteran',                         campus: 'Kampus Lidah Wetan',      address: 'Jl. Lidah Wetan, Lakarsantri, Surabaya' },
  { code: 'ft',        name: 'Fakultas Teknik',                             campus: 'Kampus Ketintang',        address: 'Jl. Ketintang, Gayungan, Surabaya' },
  { code: 'feb',       name: 'Fakultas Ekonomika dan Bisnis',               campus: 'Kampus Ketintang',        address: 'Jl. Ketintang, Gayungan, Surabaya' },
  { code: 'fmipa',     name: 'Fakultas Matematika dan Ilmu Pengetahuan Alam', campus: 'Kampus Ketintang',      address: 'Jl. Ketintang, Gayungan, Surabaya' },
  { code: 'fisipol',   name: 'Fakultas Ilmu Sosial dan Ilmu Politik',       campus: 'Kampus Ketintang',        address: 'Jl. Ketintang, Gayungan, Surabaya' },
  { code: 'fv',        name: 'Fakultas Vokasi',                             campus: 'Kampus Ketintang',        address: 'Jl. Ketintang, Gayungan, Surabaya' },
  { code: 'fh',        name: 'Fakultas Hukum',                              campus: 'Kampus Ketintang',        address: 'Jl. Ketintang, Gayungan, Surabaya' },
  { code: 'fkp',       name: 'Fakultas Ketahanan Pangan',                   campus: 'Kampus 3 Moestopo',       address: 'Jl. Prof. Dr. Moestopo No. 4, Pacar Keling, Surabaya' },
  { code: 'magetan', name: 'Kampus Magetan', campus: 'Kampus Magetan', address: 'Kampus UNESA 5 Magetan, Magetan', type: 'unit' },
  { code: 'pascasarjana-psikologi', name: 'Pascasarjana Psikologi', campus: 'Kampus Lidah Wetan', address: 'Jl. Lidah Wetan, Lakarsantri, Surabaya (Gedung Pascasarjana)', type: 'unit', dbName: 'smart_energy_pascasarjana_psikologi' },
];

async function hasTables(conn, dbName) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS total FROM information_schema.tables
     WHERE table_schema = ? AND table_name = 'classes'`,
    [dbName]
  );
  return rows[0].total > 0;
}

async function main() {
  console.log(`🏛️  Provisioning ${FACULTIES.length} fakultas UNESA sebagai tenant\n`);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: Number(process.env.DB_PORT || 3306),
    database: REGISTRY_DB,
  });

  let created = 0;
  let updated = 0;

  for (const faculty of FACULTIES) {
    const dbName = faculty.dbName || `smart_energy_${faculty.code}`;
    process.stdout.write(`  ${faculty.code.padEnd(10)} ${faculty.campus.padEnd(20)} → ${dbName} ... `);

    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci`
    );

    if (await hasTables(conn, dbName)) {
      process.stdout.write('schema sudah ada, ');
    } else {
      await conn.changeUser({ database: dbName });
      await applySqlFile(conn, TENANT_SCHEMA);
      await conn.changeUser({ database: REGISTRY_DB });
      process.stdout.write('schema diterapkan, ');
    }

    const metadata = JSON.stringify({ campus: faculty.campus, address: faculty.address });
    const [result] = await conn.query(
      `INSERT INTO tenants (code, name, type, db_name, status, metadata)
       VALUES (?, ?, ?, ?, 'active', ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type), metadata = VALUES(metadata)`,
      [faculty.code, faculty.name, faculty.type || 'fakultas', dbName, metadata]
    );

    // affectedRows: 1 = insert baru, 2 = update baris existing
    if (result.affectedRows === 1) {
      created += 1;
      console.log('✅ terdaftar (baru)');
    } else {
      updated += 1;
      console.log('✅ diperbarui');
    }
  }

  const [tenants] = await conn.query(
    `SELECT code, name, JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.campus')) AS campus, db_name, status
     FROM tenants ORDER BY campus, code`
  );

  console.log(`\n📋 ${tenants.length} tenant terdaftar (${created} baru, ${updated} diperbarui):`);
  console.table(tenants);

  await conn.end();
  console.log('🎉 Seluruh fakultas UNESA siap.');
}

main().catch((err) => {
  console.error('❌ Seed gagal:', err.message);
  process.exit(1);
});
