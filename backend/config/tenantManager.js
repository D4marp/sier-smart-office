const mysql = require('mysql2/promise');
const registryPool = require('./registryPool');

// Cache daftar tenant dari registry + pool koneksi per tenant.
// Satu database per fakultas: pool dibuat lazy saat tenant pertama kali diakses.

const TENANT_CACHE_TTL_MS = 30 * 1000;

const tenantCache = new Map(); // code -> { tenant, fetchedAt }
const pools = new Map(); // code -> mysql pool

function normalizeCode(code) {
  return String(code || '').trim().toLowerCase();
}

async function fetchTenantFromRegistry(code) {
  const [rows] = await registryPool.query(
    `SELECT id, code, name, type, db_host, db_port, db_name, db_user, db_password, status
     FROM tenants WHERE code = ? LIMIT 1`,
    [code]
  );
  return rows[0] || null;
}

async function getTenant(code, { includeInactive = false } = {}) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;

  const cached = tenantCache.get(normalized);
  if (cached && Date.now() - cached.fetchedAt < TENANT_CACHE_TTL_MS) {
    const tenant = cached.tenant;
    if (!tenant) return null;
    return includeInactive || tenant.status === 'active' ? tenant : null;
  }

  const tenant = await fetchTenantFromRegistry(normalized);
  tenantCache.set(normalized, { tenant, fetchedAt: Date.now() });
  if (!tenant) return null;
  return includeInactive || tenant.status === 'active' ? tenant : null;
}

async function listTenants({ includeInactive = false } = {}) {
  const [rows] = await registryPool.query(
    `SELECT id, code, name, type, db_name, status, metadata, created_at, updated_at
     FROM tenants ${includeInactive ? '' : "WHERE status = 'active'"}
     ORDER BY name ASC`
  );
  return rows;
}

function buildPool(tenant) {
  return mysql.createPool({
    host: tenant.db_host || process.env.DB_HOST || 'localhost',
    user: tenant.db_user || process.env.DB_USER || 'root',
    password: tenant.db_password ?? process.env.DB_PASSWORD ?? '',
    database: tenant.db_name,
    port: Number(tenant.db_port || process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: Number(process.env.TENANT_POOL_LIMIT || 5),
    queueLimit: 0,
  });
}

function getTenantPool(tenant) {
  const code = normalizeCode(tenant.code);
  let pool = pools.get(code);
  if (!pool) {
    pool = buildPool(tenant);
    pools.set(code, pool);
  }
  return pool;
}

async function getPoolByCode(code) {
  const tenant = await getTenant(code);
  if (!tenant) return null;
  return getTenantPool(tenant);
}

// Panggil setelah menambah/mengubah tenant agar cache & pool dibuat ulang.
async function invalidate(code) {
  const normalized = normalizeCode(code);
  tenantCache.delete(normalized);
  const pool = pools.get(normalized);
  if (pool) {
    pools.delete(normalized);
    await pool.end().catch(() => {});
  }
}

async function init() {
  const conn = await registryPool.getConnection();
  try {
    const [rows] = await conn.query("SELECT COUNT(*) AS total FROM tenants WHERE status = 'active'");
    console.log(`✅ Registry rektorat terhubung — ${rows[0].total} tenant aktif`);
  } finally {
    conn.release();
  }
}

module.exports = {
  init,
  getTenant,
  listTenants,
  getTenantPool,
  getPoolByCode,
  invalidate,
  registryPool,
};
