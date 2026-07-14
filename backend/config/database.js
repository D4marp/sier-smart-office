const { getTenantContext } = require('./tenantContext');

// Proxy database per-tenant.
// Semua model memanggil `db.query(...)` / `db.getConnection()` seperti biasa;
// koneksi yang dipakai adalah pool milik tenant (fakultas) yang sedang aktif
// pada request ini, diisi oleh middleware resolveTenant.
// Arsitektur multi-tenant: satu database per fakultas, registry di rektorat.

function currentPool() {
  const ctx = getTenantContext();
  if (!ctx || !ctx.pool) {
    throw new Error(
      'Tidak ada tenant context. Route ini harus berjalan di belakang middleware resolveTenant, ' +
      'atau script harus memakai tenantManager.getPoolByCode() secara eksplisit.'
    );
  }
  return ctx.pool;
}

module.exports = {
  query(sql, values) {
    return currentPool().query(sql, values);
  },
  execute(sql, values) {
    return currentPool().execute(sql, values);
  },
  getConnection() {
    return currentPool().getConnection();
  },
};
