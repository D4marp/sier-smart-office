const DeviceType = require('../models/DeviceType');

class DeviceTypeController {
  static async getAll(req, res) {
    try {
      const data = await DeviceType.getAll();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async create(req, res) {
    try {
      const { code, label, category, icon, controllable } = req.body;
      if (!code || !label) {
        return res.status(400).json({ success: false, message: 'code dan label wajib diisi' });
      }
      const result = await DeviceType.create({ code, label, category, icon, controllable });
      res.status(201).json({ success: true, message: 'Tipe perangkat dibuat', data: { id: result.insertId } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const existing = await DeviceType.getById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Tipe perangkat tidak ditemukan' });
      }
      await DeviceType.update(id, req.body);
      res.json({ success: true, message: 'Tipe perangkat diperbarui' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const existing = await DeviceType.getById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Tipe perangkat tidak ditemukan' });
      }
      await DeviceType.delete(id);
      res.json({ success: true, message: 'Tipe perangkat dihapus' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = DeviceTypeController;
