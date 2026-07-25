const jwt = require('jsonwebtoken');
const tenantManager = require('../config/tenantManager');
const { runWithTenant } = require('../config/tenantContext');
const { extractToken } = require('./authMiddleware');

const HOST_DEFAULT_TENANTS = {
  '10.12.1.97': 'psikologi',
};

function normalizeHost(value) {
  if (!value) return null;
  let host = String(value).split(',')[0].trim().toLowerCase();
  if (!host) return null;

  try {
    if (host.startsWith('http://') || host.startsWith('https://')) {
      host = new URL(host).hostname;
    }
  } catch {
    return null;
  }

  return host.split(':')[0] || null;
}

function parseHostTenantDefaults() {
  const defaults = { ...HOST_DEFAULT_TENANTS };
  const raw = process.env.DEFAULT_TENANT_HOSTS || '';

  raw.split(',').forEach((entry) => {
    const [host, tenant] = entry.split('=').map((part) => part && part.trim().toLowerCase());
    if (host && tenant) {
      defaults[host] = tenant;
    }
  });

  return defaults;
}

function getHostDefaultTenant(req) {
  const defaults = parseHostTenantDefaults();
  const candidates = [
    normalizeHost(req.headers['x-forwarded-host']),
    normalizeHost(req.headers.host),
    normalizeHost(req.headers.origin),
    normalizeHost(req.hostname),
  ].filter(Boolean);

  for (const host of candidates) {
    if (defaults[host]) return defaults[host];
  }

  return null;
}

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
      getHostDefaultTenant(req) ||
      ''
    ).trim().toLowerCase();

    if (!requested) {
      return res.status(400).json({
        success: false,
        message: 'Tenant wajib dipilih. Kirim header X-Tenant atau akses dari host yang memiliki default tenant.',
      });
    }

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
