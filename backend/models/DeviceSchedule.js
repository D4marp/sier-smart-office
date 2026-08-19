const db = require('../config/database');

class DeviceSchedule {
  static async getAll() {
    try {
      const [rows] = await db.query(
        `SELECT ds.*, d.device_name, d.location
         FROM device_schedules ds
         LEFT JOIN devices d ON d.id = ds.device_id
         ORDER BY ds.time_of_day`
      );
      return rows;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async getByDevice(deviceId) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM device_schedules WHERE device_id = ? ORDER BY time_of_day',
        [deviceId]
      );
      return rows;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async getById(id) {
    try {
      const [rows] = await db.query('SELECT * FROM device_schedules WHERE id = ?', [id]);
      return rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Dipakai scheduler cron: jadwal aktif yang jam-nya cocok dengan menit
  // sekarang (dibandingkan sampai ketelitian menit) dan hari ini termasuk
  // di days_of_week, serta belum dijalankan pada menit yang sama.
  static async getDueSchedules(now = new Date()) {
    try {
      const isoDay = now.getDay() === 0 ? 7 : now.getDay(); // 1=Senin..7=Minggu
      const hhmm = now.toTimeString().slice(0, 5);
      const [rows] = await db.query(
        `SELECT ds.*, d.device_name, d.location
         FROM device_schedules ds
         LEFT JOIN devices d ON d.id = ds.device_id
         WHERE ds.is_active = TRUE
           AND TIME_FORMAT(ds.time_of_day, '%H:%i') = ?
           AND FIND_IN_SET(?, ds.days_of_week)
           AND (ds.last_run_at IS NULL OR ds.last_run_at < ?)`,
        [hhmm, isoDay, new Date(now.getTime() - 55 * 1000)]
      );
      return rows;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async markRun(id, when = new Date()) {
    try {
      await db.query('UPDATE device_schedules SET last_run_at = ? WHERE id = ?', [when, id]);
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async create(data) {
    try {
      const { device_id, action, time_of_day, days_of_week, is_active } = data;
      const [result] = await db.query(
        'INSERT INTO device_schedules (device_id, action, time_of_day, days_of_week, is_active) VALUES (?, ?, ?, ?, ?)',
        [device_id, action, time_of_day, days_of_week || '1,2,3,4,5,6,7', is_active !== false]
      );
      return result;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async update(id, data) {
    try {
      const { action, time_of_day, days_of_week, is_active } = data;
      const [result] = await db.query(
        'UPDATE device_schedules SET action = ?, time_of_day = ?, days_of_week = ?, is_active = ? WHERE id = ?',
        [action, time_of_day, days_of_week || '1,2,3,4,5,6,7', is_active !== false, id]
      );
      return result;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const [result] = await db.query('DELETE FROM device_schedules WHERE id = ?', [id]);
      return result;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = DeviceSchedule;
