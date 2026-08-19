const db = require('../config/database');

class RoomOccupant {
  static async getAll() {
    try {
      const [rows] = await db.query(
        `SELECT ro.*, c.name AS class_name
         FROM room_occupants ro
         LEFT JOIN classes c ON c.id = ro.class_id
         ORDER BY c.name, ro.full_name`
      );
      return rows;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async getByClass(classId) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM room_occupants WHERE class_id = ? ORDER BY full_name',
        [classId]
      );
      return rows;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async getById(id) {
    try {
      const [rows] = await db.query('SELECT * FROM room_occupants WHERE id = ?', [id]);
      return rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async create(data) {
    try {
      const { class_id, full_name, email, phone, notify_email } = data;
      const [result] = await db.query(
        'INSERT INTO room_occupants (class_id, full_name, email, phone, notify_email) VALUES (?, ?, ?, ?, ?)',
        [class_id, full_name, email || null, phone || null, notify_email !== false]
      );
      return result;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async update(id, data) {
    try {
      const { class_id, full_name, email, phone, notify_email } = data;
      const [result] = await db.query(
        'UPDATE room_occupants SET class_id = ?, full_name = ?, email = ?, phone = ?, notify_email = ? WHERE id = ?',
        [class_id, full_name, email || null, phone || null, notify_email !== false, id]
      );
      return result;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const [result] = await db.query('DELETE FROM room_occupants WHERE id = ?', [id]);
      return result;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = RoomOccupant;
