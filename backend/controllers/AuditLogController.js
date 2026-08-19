const AuditLog = require('../models/AuditLog');

class AuditLogController {
  static async getDeviceActivity(req, res) {
    try {
      const { classId, deviceId, page, limit } = req.query;
      const result = await AuditLog.getDeviceActivity({
        classId: classId || undefined,
        deviceId: deviceId || undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = AuditLogController;
