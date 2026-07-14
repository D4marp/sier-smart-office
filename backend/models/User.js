const registryPool = require('../config/registryPool');
const bcrypt = require('bcryptjs');

// Users terpusat di database registry (rektorat), bukan di database fakultas.
// tenant_id NULL + role superadmin = akun rektorat dengan akses lintas fakultas.

const SELECT_FIELDS = `
  u.id, u.full_name, u.email, u.role, u.is_active, u.last_login,
  u.created_at, u.updated_at, u.tenant_id,
  t.code AS tenant_code, t.name AS tenant_name
`;

class User {
  static async findAll() {
    try {
      const [rows] = await registryPool.query(
        `SELECT ${SELECT_FIELDS}
         FROM users u
         LEFT JOIN tenants t ON t.id = u.tenant_id
         ORDER BY u.created_at DESC`
      );
      return rows;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const [rows] = await registryPool.query(
        `SELECT ${SELECT_FIELDS}, u.password
         FROM users u
         LEFT JOIN tenants t ON t.id = u.tenant_id
         WHERE u.id = ?`,
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async findByEmail(email) {
    try {
      const [rows] = await registryPool.query(
        `SELECT ${SELECT_FIELDS}, u.password
         FROM users u
         LEFT JOIN tenants t ON t.id = u.tenant_id
         WHERE u.email = ?`,
        [email]
      );
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async resolveTenantId(tenantCode) {
    if (tenantCode === undefined || tenantCode === null || tenantCode === '') {
      return null;
    }
    const [rows] = await registryPool.query(
      'SELECT id FROM tenants WHERE code = ?',
      [String(tenantCode).trim().toLowerCase()]
    );
    if (!rows.length) {
      throw new Error(`Tenant '${tenantCode}' tidak ditemukan`);
    }
    return rows[0].id;
  }

  static async create(data) {
    try {
      const { full_name, email, password, role = 'viewer', is_active = true, tenant_code } = data;
      const hashedPassword = await bcrypt.hash(password, 10);
      const tenantId = role === 'superadmin' ? null : await User.resolveTenantId(tenant_code);
      const [result] = await registryPool.query(
        `INSERT INTO users (full_name, email, password, role, is_active, tenant_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [full_name, email, hashedPassword, role, is_active ? 1 : 0, tenantId]
      );
      return result;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async update(id, data) {
    try {
      const { full_name, email, password, role, is_active, tenant_code } = data;
      const fields = [];
      const values = [];

      if (full_name !== undefined) {
        fields.push('full_name = ?');
        values.push(full_name);
      }
      if (email !== undefined) {
        fields.push('email = ?');
        values.push(email);
      }
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        fields.push('password = ?');
        values.push(hashedPassword);
      }
      if (role !== undefined) {
        fields.push('role = ?');
        values.push(role);
      }
      if (is_active !== undefined) {
        fields.push('is_active = ?');
        values.push(is_active ? 1 : 0);
      }
      if (tenant_code !== undefined) {
        const tenantId = await User.resolveTenantId(tenant_code);
        fields.push('tenant_id = ?');
        values.push(tenantId);
      }

      if (!fields.length) {
        return { affectedRows: 0 };
      }

      values.push(id);
      const [result] = await registryPool.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      return result;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const [result] = await registryPool.query('DELETE FROM users WHERE id = ?', [id]);
      return result;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async recordLogin(id) {
    try {
      await registryPool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [id]);
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = User;
