const DeviceSchedule = require('../models/DeviceSchedule');

class DeviceScheduleController {
  static async getAll(req, res) {
    try {
      const { deviceId } = req.query;
      const data = deviceId ? await DeviceSchedule.getByDevice(deviceId) : await DeviceSchedule.getAll();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async create(req, res) {
    try {
      const { device_id, action, time_of_day, days_of_week, is_active } = req.body;
      if (!device_id || !action || !time_of_day) {
        return res.status(400).json({ success: false, message: 'device_id, action, dan time_of_day wajib diisi' });
      }
      if (!['on', 'off'].includes(action)) {
        return res.status(400).json({ success: false, message: 'action harus on atau off' });
      }
      const result = await DeviceSchedule.create({ device_id, action, time_of_day, days_of_week, is_active });
      res.status(201).json({ success: true, message: 'Jadwal dibuat', data: { id: result.insertId } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const existing = await DeviceSchedule.getById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan' });
      }
      await DeviceSchedule.update(id, req.body);
      res.json({ success: true, message: 'Jadwal diperbarui' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const existing = await DeviceSchedule.getById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan' });
      }
      await DeviceSchedule.delete(id);
      res.json({ success: true, message: 'Jadwal dihapus' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = DeviceScheduleController;
