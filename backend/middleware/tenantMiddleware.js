const jwt = require('jsonwebtoken');
const tenantManager = require('../config/tenantManager');
const { runWithTenant } = require('../config/tenantContext');
const { extractToken } = require('./authMiddleware');

// Menentukan tenant (fakultas) aktif untuk request ini, lalu menjalankan
// sisa pipeline di dalam AsyncLocalStorage context berisi pool database tenant.
//
// Prioritas penentuan tenant:
//   1. Header X-Tenant (atau query ?tenant=) — dipakai frontend & Node-RED
//   2. Klaim `tenant` di JWT user yang login
//   3. DEFAULT_TENANT dari env (kompatibilitas dengan integrasi lama)
//
// Penegakan isolasi: user non-superadmin yang terikat pada satu fakultas
// tidak boleh mengakses tenant lain — request ditolak 403.
async function resolveTenant(req, res, next) {
  try {
    // Soft-decode token bila ada, agar isolasi tetap ditegakkan pada
    // route data yang tidak memakai requireAuth.
    if (!req.user) {
      const token = extractToken(req);
      if (token) {
        try {
          req.user = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_change_this');
        } catch {
          // Token invalid dibiarkan; route yang butuh auth akan menolak sendiri.
        }
      }
    }

    const requested = String(
      req.headers['x-tenant'] ||
      req.query.tenant ||
      req.user?.tenant ||
      process.env.DEFAULT_TENANT ||
      'psikologi'
    ).trim().toLowerCase();

    const user = req.user;
    if (user && user.role !== 'superadmin' && user.tenant && user.tenant !== requested) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak: akun Anda terdaftar pada tenant '${user.tenant}', bukan '${requested}'`,
      });
    }

    const tenant = await tenantManager.getTenant(requested);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: `Tenant '${requested}' tidak ditemukan atau tidak aktif`,
      });
    }

    const pool = tenantManager.getTenantPool(tenant);
    req.tenant = { code: tenant.code, name: tenant.name };

    return runWithTenant(tenant.code, pool, () => next());
  } catch (error) {
    return next(error);
  }
}

module.exports = { resolveTenant };
