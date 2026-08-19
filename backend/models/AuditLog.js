const db = require('../config/database');

class AuditLog {
  static async create({ user_id, action, entity_type, entity_id, old_values, new_values, ip_address }) {
    try {
      const [result] = await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id || null,
          action,
          entity_type || null,
          entity_id || null,
          old_values ? JSON.stringify(old_values) : null,
          new_values ? JSON.stringify(new_values) : null,
          ip_address || null,
        ]
      );
      return result;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Aktivitas "dari aplikasi": baris audit_logs untuk entity_type='device'.
  // Digabung dengan heuristik "manual": uplink IoT yang tidak punya audit
  // log app dalam window waktu tertentu di sekitar received_at-nya —
  // device tidak melaporkan siapa yang menekan tombol, jadi ini
  // pendekatan terbaik yang mungkin tanpa perubahan firmware.
  static async getDeviceActivity({ classId, deviceId, page = 1, limit = 20 } = {}) {
    try {
      const offset = (Math.max(1, page) - 1) * limit;

      const appParams = [];
      let appWhere = "WHERE al.entity_type = 'device'";
      if (deviceId) {
        appWhere += ' AND al.entity_id = ?';
        appParams.push(deviceId);
      }
      if (classId) {
        appWhere += ' AND d.class_id = ?';
        appParams.push(classId);
      }

      // Catatan: audit_logs.user_id merujuk ke tabel users di database
      // REGISTRY (user terpusat), bukan tabel lokal tenant ini — jadi tidak
      // di-JOIN di sini (beda database/koneksi). Nama user bisa ditambah
      // dari sisi frontend lewat usersAPI bila diperlukan.
      const [appRows] = await db.query(
        `SELECT al.id, al.action, al.entity_id AS device_id, al.new_values, al.created_at,
                al.user_id, d.device_name, d.location, 'app' AS source
         FROM audit_logs al
         LEFT JOIN devices d ON d.id = al.entity_id
         ${appWhere}
         ORDER BY al.created_at DESC
         LIMIT 500`,
        appParams
      );

      const manualParams = [];
      let manualWhere = '';
      if (deviceId) {
        manualWhere += ' AND m.device_id = ?';
        manualParams.push(deviceId);
      }
      if (classId) {
        manualWhere += ' AND d.class_id = ?';
        manualParams.push(classId);
      }

      const [manualRows] = await db.query(
        `SELECT m.id, 'status_change' AS action, m.device_id, m.decoded_payload AS new_values,
                m.received_at AS created_at, NULL AS user_id, d.device_name, d.location, 'manual' AS source
         FROM iot_uplink_messages m
         LEFT JOIN devices d ON d.id = m.device_id
         WHERE m.device_id IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM audit_logs al2
             WHERE al2.entity_type = 'device' AND al2.entity_id = m.device_id
               AND ABS(TIMESTAMPDIFF(SECOND, al2.created_at, m.received_at)) <= 30
           )
           ${manualWhere}
         ORDER BY m.received_at DESC
         LIMIT 500`,
        manualParams
      );

      const merged = [...appRows, ...manualRows].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      const total = merged.length;
      const pageItems = merged.slice(offset, offset + limit);

      return { items: pageItems, total, page: Number(page), limit: Number(limit) };
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = AuditLog;
