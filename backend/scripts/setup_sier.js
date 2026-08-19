/**
 * Setup PT SIER Smart Office: registry + database tenant tunggal 'sier'.
 *
 * Yang dilakukan script ini (idempotent, aman dijalankan berulang):
 *   1. Membuat database registry (smart_energy_registry) + schema-nya
 *   2. Provisioning tenant 'sier' dengan database sendiri (smart_energy_sier)
 *   3. Menerapkan seed ruangan & perangkat SIER (seed_sier.sql) — Ruang Meeting
 *      Red/Green/Blue, Ruang Direksi RDP/RRW, Ruang Kadiv 1-11, Toilet Lt 5
 *   4. Membuat akun admin default: admin@sier.id / sier12345
 *
 * Jalankan: node scripts/setup_sier.js
 */

const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { applySqlFile } = require('../utils/sqlFile');

const REGISTRY_DB = process.env.REGISTRY_DB_NAME || 'smart_energy_registry';
const REGISTRY_SCHEMA = path.resolve(__dirname, '../database/registry_schema.sql');
const TENANT_SCHEMA = path.resolve(__dirname, '../database/tenant_schema.sql');
const SIER_SEED = path.resolve(__dirname, '../database/seed_sier.sql');

const TENANT = { code: 'sier', name: 'PT SIER (Persero)', dbName: process.env.DB_NAME || 'smart_energy_sier' };

async function connect(database) {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: Number(process.env.DB_PORT || 3306),
    database,
  });
}

async function main() {
  console.log('🏢 Setup PT SIER Smart Office — registry + database tenant\n');

  const conn = await connect();

  console.log(`1️⃣  Membuat registry '${REGISTRY_DB}'...`);
  await applySqlFile(conn, REGISTRY_SCHEMA);
  await conn.changeUser({ database: REGISTRY_DB });
  console.log('   ✅ Registry siap');

  console.log(`\n2️⃣  Tenant '${TENANT.code}' → database '${TENANT.dbName}'`);
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${TENANT.dbName}\` DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci`
  );
  await conn.changeUser({ database: TENANT.dbName });
  try {
    await applySqlFile(conn, TENANT_SCHEMA);
    console.log('   ✅ Database SIER dibuat + schema diterapkan');
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('   ℹ️  Schema sudah ada, dilewati');
    } else {
      throw err;
    }
  }

  console.log('\n3️⃣  Seed ruangan & perangkat SIER...');
  const [existingRooms] = await conn.query('SELECT COUNT(*) AS total FROM classes');
  if (existingRooms[0].total > 0) {
    console.log(`   ℹ️  ${existingRooms[0].total} ruangan sudah ada, seed dilewati`);
  } else {
    await applySqlFile(conn, SIER_SEED);
    console.log('   ✅ Ruangan & perangkat SIER diterapkan (dari bagan Smart Meeting Room ICT)');
  }

  await conn.changeUser({ database: REGISTRY_DB });
  await conn.query(
    `INSERT INTO tenants (code, name, type, db_name, status)
     VALUES (?, ?, 'unit', ?, 'active')
     ON DUPLICATE KEY UPDATE name = VALUES(name), db_name = VALUES(db_name)`,
    [TENANT.code, TENANT.name, TENANT.dbName]
  );
  console.log('   ✅ Terdaftar di registry');

  console.log('\n4️⃣  Akun admin default...');
  const adminPassword = process.env.SIER_ADMIN_DEFAULT_PASSWORD || 'sier12345';
  const hash = await bcrypt.hash(adminPassword, 10);
  const [tenantRow] = await conn.query('SELECT id FROM tenants WHERE code = ?', [TENANT.code]);
  const [seeded] = await conn.query(
    `INSERT IGNORE INTO users (full_name, email, password, role, is_active, tenant_id)
     VALUES ('Admin SIER', 'admin@sier.id', ?, 'superadmin', TRUE, NULL)`,
    [hash]
  );
  if (seeded.affectedRows) {
    console.log(`   ✅ Dibuat: admin@sier.id / ${adminPassword} (segera ganti password!)`);
  } else {
    console.log('   ℹ️  Sudah ada, dilewati');
  }

  const [tenantRows] = await conn.query('SELECT code, name, db_name, status FROM tenants ORDER BY code');
  const [userRows] = await conn.query(
    `SELECT u.email, u.role, COALESCE(t.code, 'sier (semua akses)') AS tenant
     FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id ORDER BY u.role, u.email`
  );

  console.log('\n📋 Ringkasan tenant:');
  console.table(tenantRows);
  console.log('👥 Users terpusat:');
  console.table(userRows);

  await conn.end();
  console.log('🎉 Setup SIER selesai.');
}

main().catch((err) => {
  console.error('❌ Setup gagal:', err.message);
  process.exit(1);
});
