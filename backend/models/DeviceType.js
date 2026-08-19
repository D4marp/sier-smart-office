const db = require('../config/database');

class DeviceType {
  static async getAll() {
    try {
      const [rows] = await db.query('SELECT * FROM device_types ORDER BY label');
      return rows;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async getById(id) {
    try {
      const [rows] = await db.query('SELECT * FROM device_types WHERE id = ?', [id]);
      return rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async create(data) {
    try {
      const { code, label, category, icon, controllable } = data;
      const [result] = await db.query(
        'INSERT INTO device_types (code, label, category, icon, controllable) VALUES (?, ?, ?, ?, ?)',
        [code, label, category || null, icon || null, !!controllable]
      );
      return result;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async update(id, data) {
    try {
      const { code, label, category, icon, controllable, status } = data;
      const [result] = await db.query(
        'UPDATE device_types SET code = ?, label = ?, category = ?, icon = ?, controllable = ?, status = ? WHERE id = ?',
        [code, label, category || null, icon || null, !!controllable, status || 'active', id]
      );
      return result;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const [result] = await db.query('DELETE FROM device_types WHERE id = ?', [id]);
      return result;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = DeviceType;
