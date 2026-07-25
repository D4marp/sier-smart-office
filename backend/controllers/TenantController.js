const path = require('path');
const mysql = require('mysql2/promise');
const tenantManager = require('../config/tenantManager');
const registryPool = require('../config/registryPool');
const { applySqlFile } = require('../utils/sqlFile');

const TENANT_SCHEMA_PATH = path.resolve(__dirname, '../database/tenant_schema.sql');

function isSuperadmin(req) {
  return req.user?.role === 'superadmin';
}

async function auditRegistry(req, action, tenantCode, details) {
  try {
    await registryPool.query(
      `INSERT INTO registry_audit_logs (user_id, tenant_code, action, details, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user?.sub || null, tenantCode, action, JSON.stringify(details || {}), req.ip || null]
    );
  } catch (error) {
    console.error('Registry audit error:', error.message);
  }
}

class TenantController {
  // GET /tenants — daftar tenant untuk switcher & manajemen
  static async getAll(req, res) {
    try {
      const superadmin = isSuperadmin(req);
      const tenants = await tenantManager.listTenants({ includeInactive: superadmin });
      const visibleTenants = superadmin
        ? tenants
        : tenants.filter((t) => t.code === req.user?.tenant);

      if (!superadmin && !req.user?.tenant) {
        return res.status(403).json({ success: false, message: 'Tenant akun tidak tersedia' });
      }

      const data = visibleTenants.map((t) => {
        const metadata = typeof t.metadata === 'string' ? JSON.parse(t.metadata || '{}') : (t.metadata || {});
        return {
          id: t.id,
          code: t.code,
          name: t.name,
          type: t.type,
          status: t.status,
          campus: metadata.campus || null,
          address: metadata.address || null,
          ...(superadmin ? { db_name: t.db_name, created_at: t.created_at, updated_at: t.updated_at } : {}),
        };
      });
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /tenants — provisioning fakultas baru: buat database + schema + daftarkan
  static async create(req, res) {
    try {
      const { code, name, type = 'fakultas', campus, address } = req.body;
      if (!code || !name) {
        return res.status(400).json({ success: false, message: 'code dan name wajib diisi' });
      }

      const normalizedCode = String(code).trim().toLowerCase();
      if (!/^[a-z][a-z0-9_-]{1,49}$/.test(normalizedCode)) {
        return res.status(400).json({
          success: false,
          message: 'code harus diawali huruf dan hanya boleh berisi huruf kecil, angka, - atau _',
        });
      }

      const existing = await tenantManager.getTenant(normalizedCode, { includeInactive: true });
      if (existing) {
        return res.status(409).json({ success: false, message: `Tenant '${normalizedCode}' sudah terdaftar` });
      }

      const dbName = req.body.db_name || `smart_energy_${normalizedCode.replace(/-/g, '_')}`;
      if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
        return res.status(400).json({ success: false, message: 'db_name hanya boleh berisi huruf, angka, dan _' });
      }

      // Buat database fakultas dan terapkan schema tenant
      const adminConn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: Number(process.env.DB_PORT || 3306),
        multipleStatements: false,
      });

      try {
        await adminConn.query(
          `CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci`
        );
        await adminConn.changeUser({ database: dbName });
        await applySqlFile(adminConn, TENANT_SCHEMA_PATH);
      } finally {
        await adminConn.end().catch(() => {});
      }

      const metadata = JSON.stringify({ campus: campus || null, address: address || null });
      const [result] = await registryPool.query(
        `INSERT INTO tenants (code, name, type, db_name, status, metadata) VALUES (?, ?, ?, ?, 'active', ?)`,
        [normalizedCode, name, type, dbName, metadata]
      );

      await tenantManager.invalidate(normalizedCode);
      await auditRegistry(req, 'tenant.provision', normalizedCode, { db_name: dbName, name, campus });

      res.status(201).json({
        success: true,
        message: `Tenant '${normalizedCode}' berhasil di-provision dengan database '${dbName}'`,
        data: { id: result.insertId, code: normalizedCode, name, type, db_name: dbName, status: 'active', campus: campus || null },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // PUT /tenants/:code — update nama/status tenant
  static async update(req, res) {
    try {
      const code = String(req.params.code).trim().toLowerCase();
      const { name, status, type } = req.body;

      const fields = [];
      const values = [];
      if (name !== undefined) { fields.push('name = ?'); values.push(name); }
      if (status !== undefined) {
        if (!['active', 'inactive'].includes(status)) {
          return res.status(400).json({ success: false, message: "status harus 'active' atau 'inactive'" });
        }
        fields.push('status = ?');
        values.push(status);
      }
      if (type !== undefined) { fields.push('type = ?'); values.push(type); }

      if (!fields.length) {
        return res.status(400).json({ success: false, message: 'Tidak ada perubahan yang diberikan' });
      }

      values.push(code);
      const [result] = await registryPool.query(
        `UPDATE tenants SET ${fields.join(', ')} WHERE code = ?`,
        values
      );
      if (!result.affectedRows) {
        return res.status(404).json({ success: false, message: `Tenant '${code}' tidak ditemukan` });
      }

      await tenantManager.invalidate(code);
      await auditRegistry(req, 'tenant.update', code, req.body);

      const tenant = await tenantManager.getTenant(code, { includeInactive: true });
      res.json({ success: true, message: 'Tenant updated', data: tenant });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /tenants/overview — rollup rektorat: agregasi fan-out ke semua database fakultas
  static async overview(req, res) {
    try {
      const tenants = await tenantManager.listTenants();
      const today = req.query.date || new Date().toISOString().slice(0, 10);

      const results = await Promise.allSettled(
        tenants.map(async (tenant) => {
          const pool = await tenantManager.getPoolByCode(tenant.code);
          const [[classCount], [deviceStats], [consumptionToday], [alertCount]] = await Promise.all([
            pool.query("SELECT COUNT(*) AS total FROM classes WHERE status = 'active'").then(([r]) => r),
            pool.query(
              `SELECT COUNT(*) AS total,
                      SUM(status = 'active') AS active,
                      SUM(status = 'offline') AS offline,
                      SUM(status = 'maintenance') AS maintenance,
                      COALESCE(SUM(CASE WHEN status = 'active' THEN current_power ELSE 0 END), 0) AS live_kw,
                      COUNT(DISTINCT location) AS rooms
               FROM devices`
            ).then(([r]) => r),
            pool.query(
              `SELECT COALESCE(SUM(consumption), 0) AS total_kwh
               FROM device_consumption WHERE consumption_date = ?`,
              [today]
            ).then(([r]) => r),
            pool.query(
              "SELECT COUNT(*) AS total FROM alerts WHERE status = 'active'"
            ).then(([r]) => r),
          ]);

          const metadata = typeof tenant.metadata === 'string'
            ? JSON.parse(tenant.metadata || '{}')
            : (tenant.metadata || {});

          return {
            code: tenant.code,
            name: tenant.name,
            campus: metadata.campus || null,
            classes: classCount.total,
            rooms: Number(deviceStats.rooms || 0),
            devices: {
              total: deviceStats.total,
              active: Number(deviceStats.active || 0),
              offline: Number(deviceStats.offline || 0),
              maintenance: Number(deviceStats.maintenance || 0),
            },
            live_kw: Number(deviceStats.live_kw || 0),
            consumption_today_kwh: Number(consumptionToday.total_kwh),
            active_alerts: alertCount.total,
          };
        })
      );

      const faculties = results.map((r, i) =>
        r.status === 'fulfilled'
          ? { ...r.value, reachable: true }
          : { code: tenants[i].code, name: tenants[i].name, reachable: false, error: r.reason?.message }
      );

      const reachable = faculties.filter((f) => f.reachable);
      res.json({
        success: true,
        data: {
          date: today,
          total_faculties: tenants.length,
          reachable_faculties: reachable.length,
          total_live_kw: reachable.reduce((sum, f) => sum + f.live_kw, 0),
          total_consumption_today_kwh: reachable.reduce((sum, f) => sum + f.consumption_today_kwh, 0),
          total_devices: reachable.reduce((sum, f) => sum + f.devices.total, 0),
          total_active_devices: reachable.reduce((sum, f) => sum + f.devices.active, 0),
          total_classes: reachable.reduce((sum, f) => sum + f.classes, 0),
          total_active_alerts: reachable.reduce((sum, f) => sum + f.active_alerts, 0),
          faculties,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = TenantController;
