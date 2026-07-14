const User = require('../models/User');

// Manajemen user terpusat (registry rektorat).
// superadmin: kelola semua user lintas fakultas.
// admin fakultas: hanya kelola user di fakultasnya sendiri.

function isSuperadmin(req) {
  return req.user?.role === 'superadmin';
}

function sanitize(user) {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
    tenant_code: user.tenant_code || null,
    tenant_name: user.tenant_name || null,
  };
}

class UserController {
  static async getAll(req, res) {
    try {
      let users = await User.findAll();
      if (!isSuperadmin(req)) {
        users = users.filter((u) => u.tenant_code === req.user?.tenant);
      }
      res.json({ success: true, data: users });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async create(req, res) {
    try {
      const { full_name, email, password, role, is_active } = req.body;
      let { tenant_code } = req.body;

      if (!full_name || !email || !password) {
        return res.status(400).json({ success: false, message: 'full_name, email, and password are required' });
      }

      if (!isSuperadmin(req)) {
        if (role === 'superadmin') {
          return res.status(403).json({ success: false, message: 'Hanya superadmin yang dapat membuat akun superadmin' });
        }
        tenant_code = req.user?.tenant;
      }

      if (role !== 'superadmin' && !tenant_code) {
        return res.status(400).json({ success: false, message: 'tenant_code wajib diisi untuk user non-superadmin' });
      }

      const result = await User.create({ full_name, email, password, role, is_active, tenant_code });
      const created = await User.findById(result.insertId);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: sanitize(created),
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;

      const target = await User.findById(id);
      if (!target) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const updates = { ...req.body };
      if (!isSuperadmin(req)) {
        if (target.tenant_code !== req.user?.tenant) {
          return res.status(403).json({ success: false, message: 'User berada di tenant lain' });
        }
        if (updates.role === 'superadmin') {
          return res.status(403).json({ success: false, message: 'Hanya superadmin yang dapat memberikan role superadmin' });
        }
        delete updates.tenant_code;
      }

      const result = await User.update(id, updates);
      if (!result.affectedRows) {
        return res.status(404).json({ success: false, message: 'User not found or no changes provided' });
      }

      const updated = await User.findById(id);
      res.json({
        success: true,
        message: 'User updated successfully',
        data: sanitize(updated),
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      if (String(req.user?.sub) === String(id)) {
        return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
      }

      const target = await User.findById(id);
      if (!target) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      if (!isSuperadmin(req) && target.tenant_code !== req.user?.tenant) {
        return res.status(403).json({ success: false, message: 'User berada di tenant lain' });
      }

      const result = await User.delete(id);
      if (!result.affectedRows) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = UserController;
