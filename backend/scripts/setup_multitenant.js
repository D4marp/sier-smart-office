/**
 * Setup multi-tenant: registry rektorat + satu database per fakultas.
 *
 * Yang dilakukan script ini (idempotent, aman dijalankan berulang):
 *   1. Membuat database registry (smart_energy_registry) + schema-nya
 *   2. Mendaftarkan tenant 'psikologi' menunjuk ke database lama
 *      (smart_energy_dashboard) — data existing tidak disentuh
 *   3. Provisioning tenant 'fbs' dengan database baru (smart_energy_fbs)
 *   4. Memindahkan users dari database lama ke registry
 *      (admin@unesa.ac.id menjadi superadmin rektorat, sisanya jadi user psikologi)
 *   5. Menambahkan akun rektorat baru: rektorat@unesa.ac.id / rektorat123
 *
 * Jalankan: node scripts/setup_multitenant.js
 */

const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { applySqlFile } = require('../utils/sqlFile');

const REGISTRY_DB = process.env.REGISTRY_DB_NAME || 'smart_energy_registry';
const LEGACY_DB = process.env.DB_NAME || 'smart_energy_dashboard';
const REGISTRY_SCHEMA = path.resolve(__dirname, '../database/registry_schema.sql');
const TENANT_SCHEMA = path.resolve(__dirname, '../database/tenant_schema.sql');

const TENANTS = [
  { code: 'psikologi', name: 'Fakultas Psikologi', dbName: LEGACY_DB, provision: false },
  { code: 'fbs', name: 'Fakultas Bahasa dan Seni', dbName: 'smart_energy_fbs', provision: true },
];

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
  console.log('🏛️  Setup multi-tenant Smart Energy — registry rektorat + database per fakultas\n');

  const conn = await connect();

  // 1. Registry rektorat
  console.log(`1️⃣  Membuat registry '${REGISTRY_DB}'...`);
  await applySqlFile(conn, REGISTRY_SCHEMA);
  await conn.changeUser({ database: REGISTRY_DB });
  console.log('   ✅ Registry siap');

  // 2 & 3. Daftarkan / provision tenant
  for (const tenant of TENANTS) {
    console.log(`\n2️⃣  Tenant '${tenant.code}' → database '${tenant.dbName}'`);

    if (tenant.provision) {
      await conn.query(
        `CREATE DATABASE IF NOT EXISTS \`${tenant.dbName}\` DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci`
      );
      await conn.changeUser({ database: tenant.dbName });
      try {
        await applySqlFile(conn, TENANT_SCHEMA);
        console.log('   ✅ Database fakultas dibuat + schema diterapkan');
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log('   ℹ️  Schema sudah ada, dilewati');
        } else {
          throw err;
        }
      }
      await conn.changeUser({ database: REGISTRY_DB });
    } else {
      const [dbs] = await conn.query('SHOW DATABASES LIKE ?', [tenant.dbName]);
      if (!dbs.length) {
        console.log(`   ⚠️  Database '${tenant.dbName}' belum ada — tenant tetap didaftarkan, buat database-nya nanti`);
      } else {
        console.log('   ✅ Menggunakan database existing (data tidak disentuh)');
      }
    }

    await conn.query(
      `INSERT INTO tenants (code, name, type, db_name, status)
       VALUES (?, ?, 'fakultas', ?, 'active')
       ON DUPLICATE KEY UPDATE name = VALUES(name), db_name = VALUES(db_name)`,
      [tenant.code, tenant.name, tenant.dbName]
    );
    console.log(`   ✅ Terdaftar di registry`);
  }

  // 4. Migrasi users dari database lama ke registry
  console.log(`\n3️⃣  Migrasi users dari '${LEGACY_DB}' ke registry...`);
  const [legacyDbExists] = await conn.query('SHOW DATABASES LIKE ?', [LEGACY_DB]);
  if (legacyDbExists.length) {
    const [legacyTables] = await conn.query(
      `SELECT COUNT(*) AS total FROM information_schema.tables
       WHERE table_schema = ? AND table_name = 'users'`,
      [LEGACY_DB]
    );
    if (legacyTables[0].total) {
      const [migrated] = await conn.query(
        `INSERT IGNORE INTO \`${REGISTRY_DB}\`.users
           (full_name, email, password, role, is_active, last_login, tenant_id)
         SELECT lu.full_name, lu.email, lu.password,
                CASE WHEN lu.email = 'admin@unesa.ac.id' THEN 'superadmin' ELSE lu.role END,
                lu.is_active, lu.last_login,
                CASE WHEN lu.email = 'admin@unesa.ac.id' THEN NULL
                     ELSE (SELECT id FROM \`${REGISTRY_DB}\`.tenants WHERE code = 'psikologi') END
         FROM \`${LEGACY_DB}\`.users lu`
      );
      console.log(`   ✅ ${migrated.affectedRows} user dipindahkan (admin@unesa.ac.id → superadmin rektorat)`);
    } else {
      console.log('   ℹ️  Tabel users tidak ada di database lama, dilewati');
    }
  } else {
    console.log('   ℹ️  Database lama tidak ditemukan, dilewati');
  }

  // 5. Akun rektorat default
  console.log('\n4️⃣  Akun rektorat default...');
  const rektoratPassword = process.env.REKTORAT_DEFAULT_PASSWORD || 'rektorat123';
  const hash = await bcrypt.hash(rektoratPassword, 10);
  const [seeded] = await conn.query(
    `INSERT IGNORE INTO users (full_name, email, password, role, is_active, tenant_id)
     VALUES ('Rektorat UNESA', 'rektorat@unesa.ac.id', ?, 'superadmin', TRUE, NULL)`,
    [hash]
  );
  if (seeded.affectedRows) {
    console.log(`   ✅ Dibuat: rektorat@unesa.ac.id / ${rektoratPassword} (segera ganti password!)`);
  } else {
    console.log('   ℹ️  Sudah ada, dilewati');
  }

  const [tenantRows] = await conn.query('SELECT code, name, db_name, status FROM tenants ORDER BY code');
  const [userRows] = await conn.query(
    `SELECT u.email, u.role, COALESCE(t.code, 'rektorat (semua)') AS tenant
     FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id ORDER BY u.role, u.email`
  );

  console.log('\n📋 Ringkasan tenant:');
  console.table(tenantRows);
  console.log('👥 Users terpusat:');
  console.table(userRows);

  await conn.end();
  console.log('🎉 Setup multi-tenant selesai.');
}

main().catch((err) => {
  console.error('❌ Setup gagal:', err.message);
  process.exit(1);
});
