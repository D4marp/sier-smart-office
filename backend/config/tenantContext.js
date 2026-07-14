const { AsyncLocalStorage } = require('async_hooks');

// Context per-request yang membawa tenant aktif beserta pool database-nya.
// Diisi oleh middleware resolveTenant; dibaca oleh config/database.js
// sehingga seluruh model tetap bisa memakai `db.query(...)` tanpa perubahan.
const storage = new AsyncLocalStorage();

function runWithTenant(tenantCode, pool, callback) {
  return storage.run({ tenantCode, pool }, callback);
}

function getTenantContext() {
  return storage.getStore() || null;
}

module.exports = { runWithTenant, getTenantContext };
